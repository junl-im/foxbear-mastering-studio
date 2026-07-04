// FoxBear analysis worker v1.3.28 - spectral balance, K-weighted LUFS, genre features
'use strict';

self.onmessage = event => {
    try {
        const data = event.data || {};
        const analysis = analyze(data);
        self.postMessage({ ok: true, analysis });
    } catch (error) {
        self.postMessage({ ok: false, error: error.message || String(error) });
    }
};

function analyze({ sampleRate, duration, channels, length, channelBuffers }) {
    const totalSamples = length;
    const step = Math.max(1, Math.floor(totalSamples / 240000));
    const channelData = channelBuffers.map(buf => new Float32Array(buf));
    let peak = 0, sumSq = 0, count = 0, diffSum = 0, zeroCrossings = 0, prevMono = 0;
    let midSq = 0, sideSq = 0, stereoCount = 0, highFreqEnergy = 0, midHighEnergy = 0;
    let lowLeftLp = 0, lowRightLp = 0, lowLeftSq = 0, lowRightSq = 0, lowCrossSq = 0, lowMidMonoSq = 0, lowSideMonoSq = 0;
    const effectiveRate = Math.max(1000, sampleRate / step);
    const lpCoeff = freq => clamp(1 - Math.exp(-2 * Math.PI * freq / effectiveRate), 0.001, 0.98);
    const c120 = lpCoeff(120), c700 = lpCoeff(700), c3500 = lpCoeff(3500);
    let lp120 = 0, lp700 = 0, lp3500 = 0;
    let bassSq = 0, lowMidSq = 0, midBandSq = 0, highBandSq = 0, transientHits = 0, bandCount = 0;

    for (let i = 0; i < totalSamples; i += step) {
        let mono = 0;
        for (let ch = 0; ch < channels; ch += 1) {
            const sample = channelData[ch][i] || 0;
            const abs = Math.abs(sample);
            if (abs > peak) peak = abs;
            sumSq += sample * sample;
            mono += sample / channels;
            count += 1;
        }
        const delta = mono - prevMono;
        const absDelta = Math.abs(delta);
        diffSum += absDelta;
        if (absDelta > 0.15) highFreqEnergy += 1;
        if (absDelta > 0.05 && absDelta <= 0.15) midHighEnergy += 1;
        if (absDelta > 0.11) transientHits += 1;
        if ((mono >= 0 && prevMono < 0) || (mono < 0 && prevMono >= 0)) zeroCrossings += 1;

        lp120 += c120 * (mono - lp120);
        lp700 += c700 * (mono - lp700);
        lp3500 += c3500 * (mono - lp3500);
        const bassBand = lp120;
        const lowMidBand = lp700 - lp120;
        const midBand = lp3500 - lp700;
        const highBand = mono - lp3500;
        bassSq += bassBand * bassBand;
        lowMidSq += lowMidBand * lowMidBand;
        midBandSq += midBand * midBand;
        highBandSq += highBand * highBand;
        bandCount += 1;
        prevMono = mono;

        if (channels >= 2) {
            const left = channelData[0][i] || 0;
            const right = channelData[1][i] || 0;
            const mid = (left + right) * 0.5;
            const side = (left - right) * 0.5;
            midSq += mid * mid;
            sideSq += side * side;
            lowLeftLp += c120 * (left - lowLeftLp);
            lowRightLp += c120 * (right - lowRightLp);
            const lowMid = (lowLeftLp + lowRightLp) * 0.5;
            const lowSide = (lowLeftLp - lowRightLp) * 0.5;
            lowLeftSq += lowLeftLp * lowLeftLp;
            lowRightSq += lowRightLp * lowRightLp;
            lowCrossSq += lowLeftLp * lowRightLp;
            lowMidMonoSq += lowMid * lowMid;
            lowSideMonoSq += lowSide * lowSide;
            stereoCount += 1;
        }
    }

    const rms = Math.sqrt(sumSq / Math.max(1, count));
    const crest = peak / Math.max(0.000001, rms);
    const zcr = zeroCrossings / Math.max(1, totalSamples / step);
    const avgDiff = diffSum / Math.max(1, totalSamples / step);
    const brightness = clamp01((avgDiff / Math.max(0.0001, rms)) * 2.15 + zcr * 2.7);
    const stereoWidth = channels >= 2 ? clamp01(Math.sqrt(sideSq / Math.max(1, stereoCount)) / Math.max(0.0001, Math.sqrt(midSq / Math.max(1, stereoCount)))) : 0;
    const loudnessHint = 20 * Math.log10(Math.max(0.000001, rms));
    const peakDb = 20 * Math.log10(Math.max(0.000001, peak));
    const metallicHint = clamp01(brightness * 0.65 + (highFreqEnergy / Math.max(1, midHighEnergy)) * 0.3 + zcr * 1.5);
    const silence = rms < 0.00008 || peak < 0.0005;
    const loudnessIntegrated = measureKWeightedGatedLoudness(channelData, sampleRate, totalSamples, channels);
    const headroomDb = -1.0 - peakDb;
    const spectralTotal = Math.max(0.000000001, bassSq + lowMidSq + midBandSq + highBandSq);
    const bassRatio = clamp01(bassSq / spectralTotal);
    const lowMidRatio = clamp01(lowMidSq / spectralTotal);
    const midRatio = clamp01(midBandSq / spectralTotal);
    const highRatio = clamp01(highBandSq / spectralTotal);
    const transientDensity = clamp01(transientHits / Math.max(1, bandCount) * 4.0);
    const lowMonoCorrelation = channels >= 2 && stereoCount ? clamp(lowCrossSq / Math.sqrt(Math.max(1e-12, lowLeftSq * lowRightSq)), -1, 1) : 1;
    const lowSideRatio = channels >= 2 && stereoCount ? Math.sqrt(lowSideMonoSq / Math.max(1, stereoCount)) / Math.max(0.000001, Math.sqrt(lowMidMonoSq / Math.max(1, stereoCount))) : 0;
    const lowMonoScore = channels >= 2 ? Math.round(clamp(((lowMonoCorrelation + 1) * 0.5) * 72 + (1 - clamp01(lowSideRatio)) * 28, 0, 100)) : 100;
    const lowMonoRisk = lowMonoScore >= 82 ? 'safe' : lowMonoScore >= 64 ? 'watch' : 'risk';
    let estimatedTargetFreq = 5200;
    if (zcr > 0.42) estimatedTargetFreq = 7400;
    else if (zcr < 0.18) estimatedTargetFreq = 3100;
    return {
        duration, sampleRate, channels, totalSamples, peak, peakDb, rms, loudnessHint,
        loudnessIntegrated, headroomDb, crest, brightness, stereoWidth, metallicHint,
        zeroCrossRate: zcr, bassRatio, lowMidRatio, midRatio, highRatio,
        transientDensity, lowMonoCorrelation, lowSideRatio, lowMonoScore, lowMonoRisk, silence, loudnessStandard: 'ITU-R BS.1770 K-weighting + EBU R128 gates', targetDynamicFreq: estimatedTargetFreq
    };
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

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function clamp01(value) { return clamp(value, 0, 1); }
