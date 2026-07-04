// FoxBear Pro finalizer worker v1.3.27 - K-weighted LUFS 2-pass loudness target + DC-safe transparent limiter
'use strict';

self.onmessage = event => {
    try {
        const payload = event.data || {};
        const sampleRate = Math.max(3000, Math.min(384000, Number(payload.sampleRate || 44100)));
        const channels = Math.max(1, Math.min(2, Number(payload.channels || 1)));
        const requestedLength = Math.max(1, Number(payload.length || 1));
        const targetLufs = Number(payload.targetLufs ?? -14);
        const ceilingDb = Number(payload.ceilingDb ?? -1.0);
        const qualityMode = String(payload.qualityMode || 'balanced');
        const truePeak = payload.truePeak !== false;
        const channelBuffers = (payload.channelBuffers || []).slice(0, channels).map(buf => new Float32Array(buf));
        if (channelBuffers.length < channels) throw new Error('마스터 파이널라이저 채널 입력이 부족합니다.');
        const length = Math.max(1, Math.min(requestedLength, ...channelBuffers.map(buf => buf.length)));

        const oversample = qualityMode === 'max' ? 12 : qualityMode === 'fast' ? 2 : 6;
        const maxGainDb = qualityMode === 'max' ? 9 : qualityMode === 'fast' ? 5 : 7;
        const data = channelBuffers.map(src => new Float32Array(src.slice(0, length)));
        sanitizeBuffers(data, length);
        removeDcOffset(data, length);

        const loudnessBefore = measureKWeightedGatedLoudness(data, sampleRate, length, channels);
        const peakBefore = truePeak ? measureInterpolatedPeak(data, length, oversample) : measureSamplePeak(data, length);
        const targetGainDb = clamp(targetLufs - loudnessBefore, -8, maxGainDb);
        const gain = Math.pow(10, targetGainDb / 20);
        applyGain(data, length, gain);

        const ceiling = Math.pow(10, ceilingDb / 20);
        const preCeilingPeak = truePeak ? measureInterpolatedPeak(data, length, oversample) : measureSamplePeak(data, length);
        const ceilingGain = preCeilingPeak > ceiling ? ceiling / Math.max(1e-9, preCeilingPeak) : 1;
        if (ceilingGain < 1) applyGain(data, length, ceilingGain);
        const limiterInfo = applyTransparentLimiter(data, length, ceiling, sampleRate, qualityMode);
        applySoftCeiling(data, length, ceiling);
        removeDcOffset(data, length);
        sanitizeBuffers(data, length);

        const peakAfter = truePeak ? measureInterpolatedPeak(data, length, oversample) : measureSamplePeak(data, length);
        if (peakAfter > ceiling * 1.001) {
            applyGain(data, length, ceiling / Math.max(1e-9, peakAfter));
        }
        const loudnessAfter = measureKWeightedGatedLoudness(data, sampleRate, length, channels);
        const finalPeak = truePeak ? measureInterpolatedPeak(data, length, oversample) : measureSamplePeak(data, length);

        const transfers = data.map(arr => arr.buffer);
        self.postMessage({
            ok: true,
            sampleRate,
            channels,
            length,
            channelBuffers: transfers,
            info: {
                mode: truePeak ? '2-pass K-weighted true peak' : '2-pass K-weighted sample peak',
                qualityMode,
                targetLufs,
                ceilingDb,
                loudnessBefore,
                loudnessAfter,
                peakBefore,
                peakAfter: finalPeak,
                gainDb: targetGainDb + 20 * Math.log10(Math.max(1e-9, ceilingGain)),
                limiterReductionDb: limiterInfo.reductionDb,
                oversample,
                loudnessStandard: 'ITU-R BS.1770 K-weighting + EBU R128 gates'
            }
        }, transfers);
    } catch (error) {
        self.postMessage({ ok: false, error: error.message || String(error) });
    }
};


function sanitizeBuffers(buffers, length) {
    const hardLimit = 8;
    for (const data of buffers) {
        for (let i = 0; i < length; i += 1) {
            let value = data[i];
            if (!Number.isFinite(value)) value = 0;
            if (value > hardLimit) value = hardLimit;
            else if (value < -hardLimit) value = -hardLimit;
            data[i] = value;
        }
    }
}

function removeDcOffset(buffers, length) {
    for (const data of buffers) {
        let sum = 0;
        for (let i = 0; i < length; i += 1) sum += data[i] || 0;
        const mean = sum / Math.max(1, length);
        if (Math.abs(mean) < 1e-7) continue;
        for (let i = 0; i < length; i += 1) data[i] = (data[i] || 0) - mean;
    }
}

function measureKWeightedGatedLoudness(buffers, sampleRate, length, channels) {
    if (!buffers || !buffers.length || length <= 0) return -90;
    const safeRate = Math.max(3000, Math.min(384000, Number(sampleRate || 44100)));
    const usableChannels = Math.max(1, Math.min(channels || buffers.length || 1, buffers.length));
    const filtered = filterKWeightedBuffers(buffers, safeRate, length, usableChannels);
    const frameSize = Math.max(1024, Math.round(safeRate * 0.400));
    const hopSize = Math.max(512, Math.round(frameSize / 4));
    const powers = [];
    for (let start = 0; start < length; start += hopSize) {
        const end = Math.min(length, start + frameSize);
        let sum = 0;
        let count = 0;
        for (let i = start; i < end; i += 1) {
            let channelPower = 0;
            for (let ch = 0; ch < usableChannels; ch += 1) {
                const sample = filtered[ch][i] || 0;
                channelPower += sample * sample;
            }
            sum += channelPower;
            count += 1;
        }
        const power = sum / Math.max(1, count);
        const db = loudnessDbFromPower(power);
        if (db > -70) powers.push(power);
    }
    if (!powers.length) return -90;
    const ungatedMean = powers.reduce((sum, item) => sum + item, 0) / powers.length;
    const relativeGate = loudnessDbFromPower(ungatedMean) - 10;
    const gated = powers.filter(power => loudnessDbFromPower(power) >= relativeGate);
    const selected = gated.length ? gated : powers;
    const mean = selected.reduce((sum, item) => sum + item, 0) / Math.max(1, selected.length);
    return loudnessDbFromPower(mean);
}

function filterKWeightedBuffers(buffers, sampleRate, length, channels) {
    const output = [];
    for (let ch = 0; ch < channels; ch += 1) {
        const input = buffers[ch] || buffers[0];
        const filtered = new Float32Array(length);
        const shelf = createHighShelfFilter(sampleRate, 1681.974450955533, 4.0);
        const highpass = createHighpassFilter(sampleRate, 38.13547087613982, 0.5);
        for (let i = 0; i < length; i += 1) {
            const x = Number.isFinite(input[i]) ? input[i] : 0;
            filtered[i] = processBiquad(highpass, processBiquad(shelf, x));
        }
        output.push(filtered);
    }
    return output;
}

function loudnessDbFromPower(power) {
    return -0.691 + 10 * Math.log10(Math.max(1e-12, power));
}

function createHighpassFilter(sampleRate, frequency, q) {
    const w0 = 2 * Math.PI * clamp(frequency, 1, sampleRate * 0.45) / sampleRate;
    const cos = Math.cos(w0);
    const sin = Math.sin(w0);
    const alpha = sin / (2 * Math.max(0.001, q));
    const b0 = (1 + cos) / 2;
    const b1 = -(1 + cos);
    const b2 = (1 + cos) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cos;
    const a2 = 1 - alpha;
    return normalizeBiquad(b0, b1, b2, a0, a1, a2);
}

function createHighShelfFilter(sampleRate, frequency, gainDb) {
    const a = Math.pow(10, gainDb / 40);
    const w0 = 2 * Math.PI * clamp(frequency, 1, sampleRate * 0.45) / sampleRate;
    const cos = Math.cos(w0);
    const sin = Math.sin(w0);
    const sqrtA = Math.sqrt(a);
    const alpha = sin / 2 * Math.sqrt(2);
    const b0 = a * ((a + 1) + (a - 1) * cos + 2 * sqrtA * alpha);
    const b1 = -2 * a * ((a - 1) + (a + 1) * cos);
    const b2 = a * ((a + 1) + (a - 1) * cos - 2 * sqrtA * alpha);
    const a0 = (a + 1) - (a - 1) * cos + 2 * sqrtA * alpha;
    const a1 = 2 * ((a - 1) - (a + 1) * cos);
    const a2 = (a + 1) - (a - 1) * cos - 2 * sqrtA * alpha;
    return normalizeBiquad(b0, b1, b2, a0, a1, a2);
}

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

function measureSamplePeak(buffers, length) {
    let peak = 0;
    for (const data of buffers) {
        for (let i = 0; i < length; i += 1) peak = Math.max(peak, Math.abs(data[i] || 0));
    }
    return peak;
}

function measureInterpolatedPeak(buffers, length, factor) {
    if (factor <= 1) return measureSamplePeak(buffers, length);
    let peak = 0;
    const inv = 1 / factor;
    for (const data of buffers) {
        for (let i = 0; i < length - 1; i += 1) {
            const a = data[i] || 0;
            const b = data[i + 1] || 0;
            const delta = b - a;
            const absA = Math.abs(a);
            if (absA > peak) peak = absA;
            for (let k = 1; k < factor; k += 1) {
                const candidate = Math.abs(a + delta * k * inv);
                if (candidate > peak) peak = candidate;
            }
        }
        const last = Math.abs(data[length - 1] || 0);
        if (last > peak) peak = last;
    }
    return peak;
}

function applyGain(buffers, length, gain) {
    for (const data of buffers) {
        for (let i = 0; i < length; i += 1) data[i] = (data[i] || 0) * gain;
    }
}


function applyTransparentLimiter(buffers, length, ceiling, sampleRate, qualityMode) {
    const releaseMs = qualityMode === 'max' ? 90 : qualityMode === 'fast' ? 36 : 58;
    const release = Math.exp(-1 / Math.max(1, sampleRate * releaseMs / 1000));
    let gain = 1;
    let minGain = 1;
    for (let i = 0; i < length; i += 1) {
        let peak = 0;
        for (const data of buffers) {
            const abs = Math.abs(data[i] || 0);
            if (abs > peak) peak = abs;
        }
        const desired = peak > ceiling ? ceiling / Math.max(1e-9, peak) : 1;
        if (desired < gain) gain = desired;
        else gain = Math.min(1, gain * release + (1 - release));
        if (gain < minGain) minGain = gain;
        if (gain < 0.999999) {
            for (const data of buffers) data[i] = (data[i] || 0) * gain;
        }
    }
    return { minGain, reductionDb: minGain < 1 ? 20 * Math.log10(Math.max(1e-9, minGain)) : 0 };
}

function applySoftCeiling(buffers, length, ceiling) {
    const knee = ceiling * 0.985;
    const room = Math.max(1e-9, ceiling - knee);
    for (const data of buffers) {
        for (let i = 0; i < length; i += 1) {
            const value = data[i] || 0;
            const sign = Math.sign(value);
            const abs = Math.abs(value);
            if (abs > knee) {
                const limited = knee + Math.tanh((abs - knee) / room) * room * 0.98;
                data[i] = sign * Math.min(ceiling, limited);
            }
        }
    }
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
