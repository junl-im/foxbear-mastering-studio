// FoxBear Pro pitch/time worker - SOLA-style offline pitch/speed preparation
'use strict';

self.onmessage = event => {
    try {
        const payload = event.data || {};
        const sampleRate = Number(payload.sampleRate || 44100);
        const channels = Math.max(1, Math.min(2, Number(payload.channels || 1)));
        const length = Math.max(1, Number(payload.length || 1));
        const transform = payload.transform || { pitchSemitones: 0, speedRatio: 1 };
        const inputBuffers = (payload.channelBuffers || []).map(buf => new Float32Array(buf));
        if (!inputBuffers.length) throw new Error('피치/속도 워커 입력이 비어 있습니다.');

        const pitchSemitones = clamp(Number(transform.pitchSemitones || 0), -12, 12);
        const speedRatio = clamp(Number(transform.speedRatio || 1), 0.5, 1.5);
        const pitchFactor = Math.pow(2, pitchSemitones / 12);
        const pitchLength = Math.max(1, Math.round(length / pitchFactor));
        const targetLength = Math.max(1, Math.round(length / speedRatio));

        const afterPitch = inputBuffers.map(src => Math.abs(pitchSemitones) > 0.01 ? resampleChannel(src, pitchLength) : new Float32Array(src));
        const output = afterPitch.map(src => Math.abs(src.length - targetLength) > 4 ? solaStretchChannel(src, targetLength, sampleRate) : resampleChannel(src, targetLength));
        applyEdgeFade(output, sampleRate, 0.006);

        const transfers = output.map(arr => arr.buffer);
        self.postMessage({ ok: true, sampleRate, channels, length: targetLength, channelBuffers: transfers }, transfers);
    } catch (error) {
        self.postMessage({ ok: false, error: error.message || String(error) });
    }
};

function resampleChannel(input, targetLength) {
    const output = new Float32Array(Math.max(1, targetLength));
    if (output.length === 1) {
        output[0] = input[0] || 0;
        return output;
    }
    const ratio = (input.length - 1) / Math.max(1, output.length - 1);
    for (let i = 0; i < output.length; i += 1) {
        const position = i * ratio;
        const index = Math.floor(position);
        const fraction = position - index;
        output[i] = (input[index] || 0) * (1 - fraction) + (input[Math.min(input.length - 1, index + 1)] || 0) * fraction;
    }
    return output;
}

function solaStretchChannel(input, targetLength, sampleRate) {
    if (!input.length || targetLength <= 0) return new Float32Array(Math.max(1, targetLength));
    if (Math.abs(targetLength - input.length) < 8) return resampleChannel(input, targetLength);
    const stretch = targetLength / Math.max(1, input.length);
    const windowSize = makeEven(clamp(Math.round(sampleRate * 0.080), 2048, 8192));
    const overlap = Math.round(windowSize * 0.55);
    const hopOut = Math.max(256, windowSize - overlap);
    const hopIn = hopOut / Math.max(0.01, stretch);
    const searchRadius = Math.round(sampleRate * 0.016);
    const output = new Float32Array(targetLength + windowSize + searchRadius + 4);
    const weights = new Float32Array(output.length);
    const window = makeHannWindow(windowSize);
    let frame = 0;
    for (let outPos = 0; outPos < targetLength; outPos += hopOut) {
        const expectedIn = Math.round(frame * hopIn);
        const inPos = findBestSolaOffset(input, output, expectedIn, outPos, overlap, searchRadius);
        for (let i = 0; i < windowSize; i += 1) {
            const sourceIndex = inPos + i;
            const outIndex = outPos + i;
            if (sourceIndex >= input.length || outIndex >= output.length) break;
            const weight = window[i];
            output[outIndex] += (input[sourceIndex] || 0) * weight;
            weights[outIndex] += weight;
        }
        frame += 1;
    }
    const result = new Float32Array(targetLength);
    for (let i = 0; i < targetLength; i += 1) result[i] = weights[i] > 1e-5 ? output[i] / weights[i] : 0;
    return result;
}

function findBestSolaOffset(input, output, expectedIn, outPos, overlap, searchRadius) {
    if (outPos <= 0) return clamp(expectedIn, 0, Math.max(0, input.length - 1));
    const minPos = clamp(expectedIn - searchRadius, 0, Math.max(0, input.length - overlap - 2));
    const maxPos = clamp(expectedIn + searchRadius, minPos, Math.max(minPos, input.length - overlap - 2));
    let bestPos = clamp(expectedIn, minPos, maxPos);
    let bestScore = -Infinity;
    const step = 3;
    const corrStep = 2;
    for (let candidate = minPos; candidate <= maxPos; candidate += step) {
        let cross = 0;
        let a2 = 0;
        let b2 = 0;
        for (let i = 0; i < overlap; i += corrStep) {
            const a = output[outPos + i] || 0;
            const b = input[candidate + i] || 0;
            cross += a * b;
            a2 += a * a;
            b2 += b * b;
        }
        const score = cross / Math.sqrt(Math.max(1e-12, a2 * b2));
        if (score > bestScore) {
            bestScore = score;
            bestPos = candidate;
        }
    }
    return bestPos;
}

function applyEdgeFade(buffers, sampleRate, fadeSeconds) {
    const fadeSamples = Math.max(0, Math.round(sampleRate * fadeSeconds));
    for (const data of buffers) {
        const n = Math.min(fadeSamples, Math.floor(data.length / 3));
        for (let i = 0; i < n; i += 1) {
            const fadeIn = i / Math.max(1, n);
            const fadeOut = (n - i) / Math.max(1, n);
            data[i] *= fadeIn;
            data[data.length - 1 - i] *= fadeOut;
        }
    }
}

function makeHannWindow(length) {
    const window = new Float32Array(length);
    for (let i = 0; i < length; i += 1) window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / Math.max(1, length - 1)));
    return window;
}
function makeEven(value) { return value % 2 === 0 ? value : value + 1; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
