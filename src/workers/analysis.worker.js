// FoxBear analysis worker - spectral balance, loudness hint, genre features
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
    const loudnessIntegrated = loudnessHint - 0.691;
    const headroomDb = -1.0 - peakDb;
    const spectralTotal = Math.max(0.000000001, bassSq + lowMidSq + midBandSq + highBandSq);
    const bassRatio = clamp01(bassSq / spectralTotal);
    const lowMidRatio = clamp01(lowMidSq / spectralTotal);
    const midRatio = clamp01(midBandSq / spectralTotal);
    const highRatio = clamp01(highBandSq / spectralTotal);
    const transientDensity = clamp01(transientHits / Math.max(1, bandCount) * 4.0);
    let estimatedTargetFreq = 5200;
    if (zcr > 0.42) estimatedTargetFreq = 7400;
    else if (zcr < 0.18) estimatedTargetFreq = 3100;
    return {
        duration, sampleRate, channels, totalSamples, peak, peakDb, rms, loudnessHint,
        loudnessIntegrated, headroomDb, crest, brightness, stereoWidth, metallicHint,
        zeroCrossRate: zcr, bassRatio, lowMidRatio, midRatio, highRatio,
        transientDensity, silence, targetDynamicFreq: estimatedTargetFreq
    };
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function clamp01(value) { return clamp(value, 0, 1); }
