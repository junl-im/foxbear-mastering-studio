// FoxBear analysis worker v1.3.41 - FFT analyzer, K-weighted LUFS, mobile translation, engine QA bench coverage
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
    const totalSamples = Math.max(0, Number(length || 0));
    const safeRate = Math.max(3000, Math.min(384000, Number(sampleRate || 44100)));
    const usableChannels = Math.max(1, Math.min(Number(channels || 1), Array.isArray(channelBuffers) ? channelBuffers.length : 1));
    const channelData = Array.from({ length: usableChannels }, (_, ch) => new Float32Array(channelBuffers[ch] || channelBuffers[0] || totalSamples));
    const time = measureTimeDomainFeatures(channelData, safeRate, totalSamples, usableChannels);
    const spectrum = measureFftSpectrumFeatures(channelData, safeRate, totalSamples, usableChannels);

    const brightness = spectrum.valid ? clamp01(spectrum.brightness * 0.78 + time.brightness * 0.22) : time.brightness;
    const metallicHint = spectrum.valid ? clamp01(spectrum.metallicHint * 0.74 + time.metallicHint * 0.26) : time.metallicHint;
    const bassRatio = spectrum.valid ? spectrum.bassRatio : time.bassRatio;
    const lowMidRatio = spectrum.valid ? spectrum.lowMidRatio : time.lowMidRatio;
    const midRatio = spectrum.valid ? spectrum.midRatio : time.midRatio;
    const highRatio = spectrum.valid ? spectrum.highRatio : time.highRatio;
    const transientDensity = spectrum.valid ? clamp01(time.transientDensity * 0.48 + spectrum.spectralFlux * 0.52) : time.transientDensity;
    const loudnessIntegrated = measureKWeightedGatedLoudness(channelData, safeRate, totalSamples, usableChannels);
    const loudnessHint = 20 * Math.log10(Math.max(0.000001, time.rms));
    const peakDb = 20 * Math.log10(Math.max(0.000001, time.peak));
    const headroomDb = -1.0 - peakDb;
    const silence = time.rms < 0.00008 || time.peak < 0.0005;
    const lowMonoScore = usableChannels >= 2 ? Math.round(clamp(((time.lowMonoCorrelation + 1) * 0.5) * 72 + (1 - clamp01(time.lowSideRatio)) * 28, 0, 100)) : 100;
    const lowMonoRisk = lowMonoScore >= 82 ? 'safe' : lowMonoScore >= 64 ? 'watch' : 'risk';
    const spatialExcessRisk = usableChannels >= 2 ? clamp01(Math.max(0, time.stereoWidth - 0.58) * 1.25 + Math.max(0, time.lowSideRatio - 0.34) * 1.10 + Math.max(0, (spectrum.spectrumBands?.air || 0) - 0.16) * 0.72) : 0;
    const estimatedTargetFreq = spectrum.valid ? spectrum.harshPeakHz : estimateTargetFrequency(time.zeroCrossRate);
    const mobileSpeaker = estimateMobileSpeakerRisk({ bassRatio, lowMidRatio, midRatio, highRatio, brightness, metallicHint, transientDensity, loudnessIntegrated, loudnessHint, crest: time.crest, presenceRatio: spectrum.spectrumBands?.presence || 0, airRatio: spectrum.spectrumBands?.air || 0, spectrumBands: spectrum.spectrumBands, spectrumProfile: spectrum.spectrumProfile });

    return {
        duration, sampleRate: safeRate, channels: usableChannels, totalSamples, peak: time.peak, peakDb, rms: time.rms, loudnessHint,
        loudnessIntegrated, headroomDb, crest: time.crest, brightness, stereoWidth: time.stereoWidth, metallicHint,
        zeroCrossRate: time.zeroCrossRate, bassRatio, lowMidRatio, midRatio, highRatio,
        transientDensity, lowMonoCorrelation: time.lowMonoCorrelation, lowSideRatio: time.lowSideRatio, lowMonoScore, lowMonoRisk, silence,
        spectralCentroidHz: spectrum.spectralCentroidHz, spectralRolloffHz: spectrum.spectralRolloffHz, spectralFlatness: spectrum.spectralFlatness,
        spectralFlux: spectrum.spectralFlux, spectrumBands: spectrum.spectrumBands, spectrumProfile: spectrum.spectrumProfile,
        subRatio: spectrum.spectrumBands?.sub || 0, presenceRatio: spectrum.spectrumBands?.presence || 0, airRatio: spectrum.spectrumBands?.air || 0,
        spatialExcessRisk, widthRecommendationLimit: spatialExcessRisk > 0.52 || lowMonoScore < 70 ? 52 : spatialExcessRisk > 0.28 ? 60 : 72,
        mobileSpeakerRisk: mobileSpeaker.risk, mobileSpeakerRiskLabel: mobileSpeaker.label,
        mobileSpeakerDetail: { boom: mobileSpeaker.boom, box: mobileSpeaker.box, honk: mobileSpeaker.honk, harsh: mobileSpeaker.harsh, density: mobileSpeaker.density },
        loudnessStandard: 'ITU-R BS.1770 K-weighting + EBU R128 gates', analysisMethod: '4096-point FFT, Hann window, 75% overlap frame sampling, 24-band reference profile', targetDynamicFreq: estimatedTargetFreq
    };
}

function measureTimeDomainFeatures(channelData, sampleRate, totalSamples, channels) {
    const step = Math.max(1, Math.floor(totalSamples / 240000));
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
    const metallicHint = clamp01(brightness * 0.65 + (highFreqEnergy / Math.max(1, midHighEnergy)) * 0.3 + zcr * 1.5);
    const spectralTotal = Math.max(1e-9, bassSq + lowMidSq + midBandSq + highBandSq);
    const lowMonoCorrelation = channels >= 2 && stereoCount ? clamp(lowCrossSq / Math.sqrt(Math.max(1e-12, lowLeftSq * lowRightSq)), -1, 1) : 1;
    const lowSideRatio = channels >= 2 && stereoCount ? Math.sqrt(lowSideMonoSq / Math.max(1, stereoCount)) / Math.max(0.000001, Math.sqrt(lowMidMonoSq / Math.max(1, stereoCount))) : 0;
    return { peak, rms, crest, zeroCrossRate: zcr, brightness, stereoWidth, metallicHint, bassRatio: clamp01(bassSq / spectralTotal), lowMidRatio: clamp01(lowMidSq / spectralTotal), midRatio: clamp01(midBandSq / spectralTotal), highRatio: clamp01(highBandSq / spectralTotal), transientDensity: clamp01(transientHits / Math.max(1, bandCount) * 4.0), lowMonoCorrelation, lowSideRatio };
}

function measureFftSpectrumFeatures(channelData, sampleRate, totalSamples, channels) {
    const fftSize = chooseFftSize(sampleRate, totalSamples);
    if (totalSamples < 128 || fftSize < 512) return makeEmptySpectrumFeatures();
    const half = fftSize >> 1;
    const hop = Math.max(128, fftSize >> 2);
    const availableFrames = totalSamples <= fftSize ? 1 : Math.floor((totalSamples - fftSize) / hop) + 1;
    const maxFrames = 320;
    const frameStride = Math.max(1, Math.ceil(availableFrames / maxFrames));
    const window = makeHannWindow(fftSize);
    const real = new Float32Array(fftSize);
    const imag = new Float32Array(fftSize);
    const avgPower = new Float64Array(half);
    const prevMag = new Float32Array(half);
    const bandEnergy = { sub: 0, bass: 0, lowMid: 0, mid: 0, presence: 0, high: 0, air: 0 };
    let totalPower = 0, centroidNum = 0, logMagSum = 0, magMeanSum = 0, fluxSum = 0, fluxFrames = 0, frameCount = 0;
    let harshPeakPower = -Infinity, harshPeakHz = 5200;

    for (let frame = 0; frame < availableFrames; frame += frameStride) {
        const start = Math.min(Math.max(0, frame * hop), Math.max(0, totalSamples - fftSize));
        real.fill(0);
        imag.fill(0);
        for (let i = 0; i < fftSize; i += 1) {
            const index = start + i;
            let mono = 0;
            if (index < totalSamples) {
                for (let ch = 0; ch < channels; ch += 1) mono += (channelData[ch][index] || 0) / channels;
            }
            real[i] = mono * window[i];
        }
        fftRadix2(real, imag);
        let frameMagSum = 0;
        let frameFlux = 0;
        for (let bin = 1; bin < half; bin += 1) {
            const re = real[bin], im = imag[bin];
            const power = re * re + im * im;
            const mag = Math.sqrt(power);
            const freq = bin * sampleRate / fftSize;
            avgPower[bin] += power;
            totalPower += power;
            centroidNum += freq * power;
            logMagSum += Math.log(Math.max(1e-12, mag));
            frameMagSum += mag;
            if (frameCount > 0) frameFlux += Math.max(0, mag - prevMag[bin]);
            prevMag[bin] = mag;
            const band = getSpectrumBand(freq);
            if (band) bandEnergy[band] += power;
            if (freq >= 2600 && freq <= 8200 && power > harshPeakPower) {
                harshPeakPower = power;
                harshPeakHz = freq;
            }
        }
        magMeanSum += frameMagSum / Math.max(1, half - 1);
        if (frameCount > 0) {
            fluxSum += frameFlux / Math.max(1e-9, frameMagSum);
            fluxFrames += 1;
        }
        frameCount += 1;
    }
    if (!frameCount || totalPower <= 1e-12) return makeEmptySpectrumFeatures();
    const total = Math.max(1e-12, Object.values(bandEnergy).reduce((sum, value) => sum + value, 0));
    const bands = {};
    Object.keys(bandEnergy).forEach(key => { bands[key] = clamp01(bandEnergy[key] / total); });
    const bassRatio = clamp01((bandEnergy.sub + bandEnergy.bass) / total);
    const lowMidRatio = clamp01(bandEnergy.lowMid / total);
    const midRatio = clamp01((bandEnergy.mid + bandEnergy.presence * 0.35) / total);
    const highRatio = clamp01((bandEnergy.presence * 0.65 + bandEnergy.high + bandEnergy.air) / total);
    const centroid = centroidNum / totalPower;
    const rolloff = findSpectralRolloff(avgPower, sampleRate, fftSize, totalPower * 0.85);
    const geometricMean = Math.exp(logMagSum / Math.max(1, frameCount * (half - 1)));
    const arithmeticMean = magMeanSum / Math.max(1, frameCount);
    const flatness = clamp01(geometricMean / Math.max(1e-12, arithmeticMean));
    const brightness = clamp01(normalizeLogFrequency(centroid, 380, 5600) * 0.62 + normalizeLogFrequency(rolloff, 1800, 15000) * 0.18 + highRatio * 0.48 + bands.air * 0.25);
    const metallicHint = clamp01(bands.presence * 1.45 + bands.high * 0.95 + flatness * 0.32 + normalizeLogFrequency(harshPeakHz, 2800, 8200) * 0.12);
    const spectralFlux = clamp01((fluxSum / Math.max(1, fluxFrames)) * 9.5);
    const spectrumProfile = makeCompactSpectrumProfile(avgPower, sampleRate, fftSize, totalPower);
    return { valid: true, bassRatio, lowMidRatio, midRatio, highRatio, spectralCentroidHz: Math.round(centroid), spectralRolloffHz: Math.round(rolloff), spectralFlatness: Number(flatness.toFixed(4)), spectralFlux, brightness, metallicHint, spectrumBands: bands, spectrumProfile, harshPeakHz: Math.round(clamp(harshPeakHz, 2600, 8200)) };
}

function chooseFftSize(sampleRate, totalSamples) {
    if (totalSamples < 2048) return 1024;
    if (sampleRate >= 88200 && totalSamples >= 8192) return 8192;
    return 4096;
}

function makeEmptySpectrumFeatures() {
    return { valid: false, bassRatio: 0.25, lowMidRatio: 0.25, midRatio: 0.25, highRatio: 0.25, spectralCentroidHz: 0, spectralRolloffHz: 0, spectralFlatness: 0, spectralFlux: 0, brightness: 0.45, metallicHint: 0.35, spectrumBands: { sub: 0, bass: 0, lowMid: 0, mid: 0, presence: 0, high: 0, air: 0 }, spectrumProfile: [], harshPeakHz: 5200 };
}

function makeHannWindow(size) {
    const window = new Float32Array(size);
    const denom = Math.max(1, size - 1);
    for (let i = 0; i < size; i += 1) window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / denom));
    return window;
}

function fftRadix2(real, imag) {
    const n = real.length;
    for (let i = 1, j = 0; i < n; i += 1) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            const tr = real[i]; real[i] = real[j]; real[j] = tr;
            const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
        }
    }
    for (let len = 2; len <= n; len <<= 1) {
        const angle = -2 * Math.PI / len;
        const wLenR = Math.cos(angle);
        const wLenI = Math.sin(angle);
        for (let i = 0; i < n; i += len) {
            let wr = 1, wi = 0;
            for (let j = 0; j < len / 2; j += 1) {
                const uR = real[i + j], uI = imag[i + j];
                const vR = real[i + j + len / 2] * wr - imag[i + j + len / 2] * wi;
                const vI = real[i + j + len / 2] * wi + imag[i + j + len / 2] * wr;
                real[i + j] = uR + vR;
                imag[i + j] = uI + vI;
                real[i + j + len / 2] = uR - vR;
                imag[i + j + len / 2] = uI - vI;
                const nextWr = wr * wLenR - wi * wLenI;
                wi = wr * wLenI + wi * wLenR;
                wr = nextWr;
            }
        }
    }
}

function getSpectrumBand(freq) {
    if (freq < 20 || freq > 22000) return null;
    if (freq < 60) return 'sub';
    if (freq < 160) return 'bass';
    if (freq < 500) return 'lowMid';
    if (freq < 2500) return 'mid';
    if (freq < 6000) return 'presence';
    if (freq < 12000) return 'high';
    return 'air';
}

function findSpectralRolloff(avgPower, sampleRate, fftSize, threshold) {
    let cumulative = 0;
    for (let bin = 1; bin < avgPower.length; bin += 1) {
        cumulative += avgPower[bin];
        if (cumulative >= threshold) return bin * sampleRate / fftSize;
    }
    return sampleRate * 0.5;
}

function normalizeLogFrequency(freq, low, high) {
    const value = Math.log10(Math.max(1, Number(freq || 0)));
    const min = Math.log10(Math.max(1, low));
    const max = Math.log10(Math.max(low + 1, high));
    return clamp01((value - min) / Math.max(1e-9, max - min));
}

const SPECTRUM_PROFILE_24_RANGES = [
    [20, 32], [32, 45], [45, 63], [63, 90], [90, 125], [125, 180],
    [180, 250], [250, 355], [355, 500], [500, 710], [710, 1000], [1000, 1400],
    [1400, 2000], [2000, 2800], [2800, 4000], [4000, 5600], [5600, 7100], [7100, 9000],
    [9000, 11200], [11200, 14000], [14000, 16000], [16000, 18000], [18000, 20000], [20000, 22000]
];

function makeCompactSpectrumProfile(avgPower, sampleRate, fftSize, totalPower) {
    const denom = Math.max(1e-12, totalPower);
    return SPECTRUM_PROFILE_24_RANGES.map(([from, to]) => {
        let sum = 0;
        const start = Math.max(1, Math.floor(from * fftSize / sampleRate));
        const end = Math.min(avgPower.length - 1, Math.ceil(to * fftSize / sampleRate));
        for (let bin = start; bin <= end; bin += 1) sum += avgPower[bin];
        return Number(clamp01(sum / denom).toFixed(5));
    });
}



function sumProfileBins(profile, indices) {
    if (!Array.isArray(profile) || !profile.length) return 0;
    return indices.reduce((sum, index) => sum + Number(profile[index] || 0), 0);
}

function getProfileRegionEnergy(profile, region) {
    if (!Array.isArray(profile) || !profile.length) return 0;
    const is24 = profile.length >= 24;
    const map24 = {
        lowBody: [6, 7, 8, 9],
        phoneBand: [14, 15],
        sibilance: [16, 17, 18],
        air: [19, 20, 21, 22, 23]
    };
    const map12 = {
        lowBody: [3, 4, 5],
        phoneBand: [8, 9],
        sibilance: [9, 10],
        air: [10, 11]
    };
    return sumProfileBins(profile, (is24 ? map24 : map12)[region] || []);
}

function estimateMobileSpeakerRisk(analysis) {
    if (!analysis) return { risk: 0, boom: 0, box: 0, honk: 0, harsh: 0, density: 0, label: 'safe' };
    const bands = analysis.spectrumBands || {};
    const profile = Array.isArray(analysis.spectrumProfile) ? analysis.spectrumProfile : [];
    const bass = clamp01(Number(analysis.bassRatio ?? 0.25));
    const lowMid = clamp01(Number(analysis.lowMidRatio ?? bands.lowMid ?? 0.22));
    const mid = clamp01(Number(analysis.midRatio ?? bands.mid ?? 0.28));
    const presence = clamp01(Number(analysis.presenceRatio ?? bands.presence ?? 0.16));
    const high = clamp01(Number(analysis.highRatio ?? 0.22));
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const loudness = clamp01(((Number(analysis.loudnessIntegrated ?? analysis.loudnessHint ?? -18) + 24) / 14));
    const crest = Number.isFinite(Number(analysis.crest)) ? Number(analysis.crest) : 4;
    const lowBody = clamp01(getProfileRegionEnergy(profile, 'lowBody') * (profile.length >= 24 ? 5.2 : 4.2));
    const phoneBand = clamp01(getProfileRegionEnergy(profile, 'phoneBand') * (profile.length >= 24 ? 6.2 : 4.8));
    const boom = clamp01(Math.max(0, bass - 0.36) * 1.15 + Math.max(0, lowMid - 0.28) * 1.75 + Math.max(0, lowBody - 0.40) * 0.85);
    const box = clamp01(Math.max(0, lowMid - 0.25) * 1.85 + Math.max(0, mid - 0.33) * 0.72 + Math.max(0, lowBody - 0.34) * 0.95);
    const honk = clamp01(Math.max(0, mid - 0.36) * 1.20 + Math.max(0, phoneBand - 0.25) * 1.10);
    const harsh = clamp01(Math.max(0, presence - 0.18) * 2.15 + Math.max(0, high - 0.34) * 0.85 + Math.max(0, brightness - 0.58) * 1.05 + Math.max(0, metallic - 0.46) * 0.82);
    const density = clamp01(Math.max(0, loudness - 0.50) * 0.55 + Math.max(0, 4.2 - crest) * 0.12);
    const risk = clamp01(boom * 0.24 + box * 0.30 + honk * 0.16 + harsh * 0.21 + density * 0.16);
    const label = risk > 0.58 ? 'risk' : risk > 0.34 ? 'watch' : 'safe';
    return { risk, boom, box, honk, harsh, density, label };
}

function estimateTargetFrequency(zcr) {
    if (zcr > 0.42) return 7400;
    if (zcr < 0.18) return 3100;
    return 5200;
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
