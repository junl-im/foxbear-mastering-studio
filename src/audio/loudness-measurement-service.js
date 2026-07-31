// FoxBear K-weighted loudness measurement service v1.6.47.
'use strict';

(function exposeFoxBearLoudnessMeasurementService(global) {
    const emptyShortTerm = () => ({ min: -90, max: -90, mean: -90, range: 0, count: 0, windowSec: 0, hopSec: 0 });
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const loudnessDbFromPower = power => -0.691 + 10 * Math.log10(Math.max(1e-12, power));

    function normalizeBiquad(b0, b1, b2, a0, a1, a2) {
        const inv = 1 / Math.max(1e-12, a0);
        return { b0: b0 * inv, b1: b1 * inv, b2: b2 * inv, a1: a1 * inv, a2: a2 * inv, x1: 0, x2: 0, y1: 0, y2: 0 };
    }

    function processBiquad(state, x) {
        const y = state.b0 * x + state.b1 * state.x1 + state.b2 * state.x2 - state.a1 * state.y1 - state.a2 * state.y2;
        state.x2 = state.x1;
        state.x1 = x;
        state.y2 = state.y1;
        state.y1 = Number.isFinite(y) ? y : 0;
        return state.y1;
    }

    function createHighpass(sampleRate, frequency, q) {
        const w0 = 2 * Math.PI * clamp(frequency, 1, sampleRate * 0.45) / sampleRate;
        const cos = Math.cos(w0), sin = Math.sin(w0), alpha = sin / (2 * Math.max(0.001, q));
        return normalizeBiquad((1 + cos) / 2, -(1 + cos), (1 + cos) / 2, 1 + alpha, -2 * cos, 1 - alpha);
    }

    function createHighShelf(sampleRate, frequency, gainDb) {
        const a = Math.pow(10, gainDb / 40);
        const w0 = 2 * Math.PI * clamp(frequency, 1, sampleRate * 0.45) / sampleRate;
        const cos = Math.cos(w0), sin = Math.sin(w0), sqrtA = Math.sqrt(a), alpha = sin / 2 * Math.sqrt(2);
        return normalizeBiquad(
            a * ((a + 1) + (a - 1) * cos + 2 * sqrtA * alpha),
            -2 * a * ((a - 1) + (a + 1) * cos),
            a * ((a + 1) + (a - 1) * cos - 2 * sqrtA * alpha),
            (a + 1) - (a - 1) * cos + 2 * sqrtA * alpha,
            2 * ((a - 1) - (a + 1) * cos),
            (a + 1) - (a - 1) * cos - 2 * sqrtA * alpha
        );
    }

    function makePower(buffer) {
        if (!buffer || !buffer.length) return null;
        const sampleRate = Math.max(3000, Math.min(384000, Number(buffer.sampleRate || 44100)));
        const length = Math.max(1, Number(buffer.length || 1));
        const channels = Math.max(1, Math.min(2, Number(buffer.numberOfChannels || 1)));
        const powerBySample = new Float64Array(length);
        for (let ch = 0; ch < channels; ch += 1) {
            const input = buffer.getChannelData(ch);
            const shelf = createHighShelf(sampleRate, 1681.974450955533, 4.0);
            const highpass = createHighpass(sampleRate, 38.13547087613982, 0.5);
            for (let i = 0; i < length; i += 1) {
                const x = Number.isFinite(input[i]) ? input[i] : 0;
                const filtered = Math.fround(processBiquad(highpass, processBiquad(shelf, x)));
                powerBySample[i] += filtered * filtered;
            }
        }
        return { powerBySample, sampleRate, length };
    }

    function measureIntegratedFromPower(powerBySample, sampleRate, length) {
        const frameSize = Math.max(1024, Math.round(sampleRate * 0.400));
        const hopSize = Math.max(512, Math.round(frameSize / 4));
        const powers = [];
        for (let start = 0; start < length; start += hopSize) {
            const end = Math.min(length, start + frameSize);
            let sum = 0;
            for (let i = start; i < end; i += 1) sum += powerBySample[i];
            const power = sum / Math.max(1, end - start);
            if (loudnessDbFromPower(power) > -70) powers.push(power);
        }
        if (!powers.length) return -90;
        const ungatedMean = powers.reduce((sum, value) => sum + value, 0) / powers.length;
        const relativeGate = loudnessDbFromPower(ungatedMean) - 10;
        const gated = powers.filter(power => loudnessDbFromPower(power) >= relativeGate);
        const selected = gated.length ? gated : powers;
        return loudnessDbFromPower(selected.reduce((sum, value) => sum + value, 0) / selected.length);
    }

    function measureShortTermFromPower(powerBySample, sampleRate, length, options = {}) {
        const chunkSize = Math.max(256, Math.round(sampleRate * 0.100));
        const chunkCount = Math.max(1, Math.ceil(length / chunkSize));
        const chunkPowers = new Array(chunkCount).fill(0);
        for (let chunk = 0; chunk < chunkCount; chunk += 1) {
            const start = chunk * chunkSize, end = Math.min(length, start + chunkSize);
            let sum = 0;
            for (let i = start; i < end; i += 1) sum += powerBySample[i];
            chunkPowers[chunk] = sum / Math.max(1, end - start);
        }
        const chunkSec = chunkSize / sampleRate;
        const windowChunks = Math.max(1, Math.min(chunkCount, Math.round(Number(options.windowSec || 3) / Math.max(0.001, chunkSec))));
        const hopChunks = Math.max(1, Math.round(Number(options.hopSec || 1) / Math.max(0.001, chunkSec)));
        const values = [];
        for (let start = 0; start < chunkCount; start += hopChunks) {
            const end = Math.min(chunkCount, start + windowChunks);
            let sum = 0;
            for (let i = start; i < end; i += 1) sum += chunkPowers[i] || 0;
            const db = loudnessDbFromPower(sum / Math.max(1, end - start));
            if (db > -70) values.push(db);
            if (end >= chunkCount) break;
        }
        const windowSec = Number((windowChunks * chunkSec).toFixed(2)), hopSec = Number((hopChunks * chunkSec).toFixed(2));
        if (!values.length) return { ...emptyShortTerm(), windowSec, hopSec };
        const min = Math.min(...values), max = Math.max(...values), mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        return { min: Number(min.toFixed(2)), max: Number(max.toFixed(2)), mean: Number(mean.toFixed(2)), range: Number((max - min).toFixed(2)), count: values.length, windowSec, hopSec };
    }

    function measureBundle(buffer, options = {}) {
        const power = makePower(buffer);
        if (!power) return { integrated: -90, shortTerm: emptyShortTerm() };
        return {
            integrated: measureIntegratedFromPower(power.powerBySample, power.sampleRate, power.length),
            shortTerm: measureShortTermFromPower(power.powerBySample, power.sampleRate, power.length, options)
        };
    }

    global.FoxBearLoudnessMeasurementService = Object.freeze({
        version: '1.6.47-k-weighted-power-fastpath',
        measureBundle,
        measureIntegrated(buffer) { return measureBundle(buffer).integrated; },
        measureShortTerm(buffer, options = {}) { return measureBundle(buffer, options).shortTerm; }
    });
})(typeof window !== 'undefined' ? window : globalThis);
