// FoxBear Pro finalizer worker v1.3.19 - 2-pass loudness target + DC-safe transparent limiter
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

        const loudnessBefore = measureGatedLoudness(data, sampleRate, length, channels);
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
        const loudnessAfter = measureGatedLoudness(data, sampleRate, length, channels);
        const finalPeak = truePeak ? measureInterpolatedPeak(data, length, oversample) : measureSamplePeak(data, length);

        const transfers = data.map(arr => arr.buffer);
        self.postMessage({
            ok: true,
            sampleRate,
            channels,
            length,
            channelBuffers: transfers,
            info: {
                mode: truePeak ? '2-pass true peak' : '2-pass sample peak',
                qualityMode,
                targetLufs,
                ceilingDb,
                loudnessBefore,
                loudnessAfter,
                peakBefore,
                peakAfter: finalPeak,
                gainDb: targetGainDb + 20 * Math.log10(Math.max(1e-9, ceilingGain)),
                limiterReductionDb: limiterInfo.reductionDb,
                oversample
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

function measureGatedLoudness(buffers, sampleRate, length, channels) {
    const frameSize = Math.max(1024, Math.round(sampleRate * 0.400));
    const hopSize = Math.max(512, Math.round(frameSize / 2));
    const powers = [];
    for (let start = 0; start < length; start += hopSize) {
        const end = Math.min(length, start + frameSize);
        let sum = 0;
        let count = 0;
        for (let i = start; i < end; i += 1) {
            let monoPower = 0;
            for (let ch = 0; ch < channels; ch += 1) {
                const sample = buffers[ch][i] || 0;
                monoPower += sample * sample;
            }
            sum += monoPower / channels;
            count += 1;
        }
        const power = sum / Math.max(1, count);
        const db = -0.691 + 10 * Math.log10(Math.max(1e-12, power));
        if (db > -70) powers.push(power);
    }
    if (!powers.length) return -90;
    const ungatedMean = powers.reduce((sum, item) => sum + item, 0) / powers.length;
    const relativeGate = -0.691 + 10 * Math.log10(Math.max(1e-12, ungatedMean)) - 10;
    const gated = powers.filter(power => (-0.691 + 10 * Math.log10(Math.max(1e-12, power))) >= relativeGate);
    const mean = (gated.length ? gated : powers).reduce((sum, item) => sum + item, 0) / Math.max(1, (gated.length ? gated : powers).length);
    return -0.691 + 10 * Math.log10(Math.max(1e-12, mean));
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
