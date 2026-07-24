// FoxBear Pro pitch/time worker - phase-coherent SOLA/WSOLA pitch-speed preparation
'use strict';

self.onmessage = event => {
    const payload = event.data || {}, jobId = String(payload.__foxbearJobId || '');
    try {
        postProgress(jobId, 4, '피치/BPM 변환', 'PCM 입력과 변환 계획을 준비합니다.');
        const sampleRate = Number(payload.sampleRate || 44100);
        const channels = Math.max(1, Math.min(2, Number(payload.channels || 1)));
        const length = Math.max(1, Number(payload.length || 1));
        const transform = payload.transform || { pitchSemitones: 0, speedRatio: 1 };
        const qualityMode = String(payload.qualityMode || 'balanced');
        const inputBuffers = (payload.channelBuffers || []).map(buf => new Float32Array(buf));
        if (!inputBuffers.length) throw new Error('피치/속도 워커 입력이 비어 있습니다.');

        const pitchSemitones = clamp(Number(transform.pitchSemitones || 0), -12, 12);
        const speedRatio = clamp(Number(transform.speedRatio || 1), 0.5, 1.5);
        const pitchFactor = Math.pow(2, pitchSemitones / 12);
        const pitchLength = Math.max(1, Math.round(length / pitchFactor));
        const targetLength = Math.max(1, Math.round(length / speedRatio));

        const afterPitch = inputBuffers.map(src => Math.abs(pitchSemitones) > 0.01 ? resampleChannel(src, pitchLength) : new Float32Array(src));
        postProgress(jobId, 36, '피치 변환', '위상 보존 리샘플링을 완료했습니다.');
        const output = Math.abs(afterPitch[0].length - targetLength) > 4 ? solaStretchBuffers(afterPitch, targetLength, sampleRate, qualityMode, jobId) : afterPitch.map(src => resampleChannel(src, targetLength));
        postProgress(jobId, 92, '피치/BPM 변환', '출력 길이와 경계 페이드를 정리합니다.');
        applyEdgeFade(output, sampleRate, 0.006);

        const transfers = output.map(arr => arr.buffer);
        self.postMessage({ ok: true, sampleRate, channels, length: targetLength, channelBuffers: transfers, __foxbearJobId: jobId }, transfers);
    } catch (error) {
        self.postMessage({ ok: false, error: error.message || String(error), __foxbearJobId: jobId });
    }
};


function postProgress(jobId, percent, stage, detail = '') {
    self.postMessage({ type: 'progress', __foxbearProgress: true, __foxbearJobId: String(jobId || ''), percent: Math.max(0, Math.min(100, Number(percent) || 0)), stage: String(stage || '피치/BPM 변환'), detail: String(detail || '') });
}

function resampleChannel(input, targetLength) {
    const output = new Float32Array(Math.max(1, targetLength));
    if (output.length === 1) {
        output[0] = input[0] || 0;
        return output;
    }
    if (input.length < 4) {
        const ratio = (input.length - 1) / Math.max(1, output.length - 1);
        for (let i = 0; i < output.length; i += 1) {
            const position = i * ratio;
            const index = Math.floor(position);
            const fraction = position - index;
            output[i] = (input[index] || 0) * (1 - fraction) + (input[Math.min(input.length - 1, index + 1)] || 0) * fraction;
        }
        return output;
    }
    const ratio = (input.length - 1) / Math.max(1, output.length - 1);
    for (let i = 0; i < output.length; i += 1) {
        const position = i * ratio;
        const index = Math.floor(position);
        const t = position - index;
        output[i] = cubicInterpolate(
            input[Math.max(0, index - 1)] || 0,
            input[index] || 0,
            input[Math.min(input.length - 1, index + 1)] || 0,
            input[Math.min(input.length - 1, index + 2)] || 0,
            t
        );
    }
    return output;
}

function cubicInterpolate(y0, y1, y2, y3, t) {
    const a0 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
    const a1 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    const a2 = -0.5 * y0 + 0.5 * y2;
    const a3 = y1;
    return clamp(a0 * t * t * t + a1 * t * t + a2 * t + a3, -1.2, 1.2);
}

function solaStretchBuffers(inputBuffers, targetLength, sampleRate, qualityMode, jobId = '') {
    if (!inputBuffers.length || targetLength <= 0) return [new Float32Array(Math.max(1, targetLength))];
    if (Math.abs(targetLength - inputBuffers[0].length) < 8) return inputBuffers.map(src => resampleChannel(src, targetLength));

    const reference = createMonoReference(inputBuffers);
    const plan = buildSolaPlan(reference, targetLength, sampleRate, qualityMode);
    postProgress(jobId, 72, 'WSOLA 시간 변환', `${plan.frames.length.toLocaleString()}개 프레임의 위상 정렬 계획을 완료했습니다.`);
    return inputBuffers.map(src => renderSolaFromPlan(src, plan, targetLength));
}

function createMonoReference(buffers) {
    const length = buffers[0].length;
    const out = new Float32Array(length);
    const channels = Math.max(1, buffers.length);
    for (let i = 0; i < length; i += 1) {
        let sum = 0;
        for (let ch = 0; ch < channels; ch += 1) sum += buffers[ch][i] || 0;
        out[i] = sum / channels;
    }
    return out;
}

function buildSolaPlan(input, targetLength, sampleRate, qualityMode) {
    const quality = qualityMode === 'max' ? 'max' : qualityMode === 'fast' ? 'fast' : 'balanced';
    const stretch = targetLength / Math.max(1, input.length);
    const windowSeconds = quality === 'max' ? 0.100 : quality === 'fast' ? 0.060 : 0.080;
    const windowSize = makeEven(clamp(Math.round(sampleRate * windowSeconds), quality === 'max' ? 4096 : 2048, quality === 'max' ? 12288 : 8192));
    const overlap = Math.round(windowSize * (quality === 'max' ? 0.62 : quality === 'fast' ? 0.48 : 0.55));
    const hopOut = Math.max(192, windowSize - overlap);
    const hopIn = hopOut / Math.max(0.01, stretch);
    const searchRadius = Math.round(sampleRate * (quality === 'max' ? 0.026 : quality === 'fast' ? 0.010 : 0.016));
    const output = new Float32Array(targetLength + windowSize + searchRadius + 4);
    const weights = new Float32Array(output.length);
    const window = makeHannWindow(windowSize);
    const frames = [];
    let frame = 0;

    for (let outPos = 0; outPos < targetLength; outPos += hopOut) {
        const expectedIn = Math.round(frame * hopIn);
        const inPos = findBestSolaOffset(input, output, expectedIn, outPos, overlap, searchRadius, quality);
        frames.push({ outPos, inPos, windowSize });
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
    return { frames, window, windowSize };
}

function renderSolaFromPlan(input, plan, targetLength) {
    const output = new Float32Array(targetLength + plan.windowSize + 4);
    const weights = new Float32Array(output.length);
    for (const frame of plan.frames) {
        for (let i = 0; i < frame.windowSize; i += 1) {
            const sourceIndex = frame.inPos + i;
            const outIndex = frame.outPos + i;
            if (sourceIndex >= input.length || outIndex >= output.length) break;
            const weight = plan.window[i];
            output[outIndex] += (input[sourceIndex] || 0) * weight;
            weights[outIndex] += weight;
        }
    }
    const result = new Float32Array(targetLength);
    for (let i = 0; i < targetLength; i += 1) result[i] = weights[i] > 1e-5 ? output[i] / weights[i] : 0;
    return result;
}

function findBestSolaOffset(input, output, expectedIn, outPos, overlap, searchRadius, qualityMode) {
    if (outPos <= 0) return clamp(expectedIn, 0, Math.max(0, input.length - 1));
    const minPos = clamp(expectedIn - searchRadius, 0, Math.max(0, input.length - overlap - 2));
    const maxPos = clamp(expectedIn + searchRadius, minPos, Math.max(minPos, input.length - overlap - 2));
    let bestPos = clamp(expectedIn, minPos, maxPos);
    let bestScore = -Infinity;
    const step = qualityMode === 'max' ? 1 : qualityMode === 'fast' ? 5 : 3;
    const corrStep = qualityMode === 'max' ? 1 : qualityMode === 'fast' ? 3 : 2;
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
