// FoxBear Pro finalizer worker v1.5.0 quality-gate carry-forward / v1.5.50 - limiter correctness, bounded quality fingerprints, and performance telemetry.
'use strict';

self.onmessage = event => {
    const jobStartedAt = nowMs();
    let stageStartedAt = jobStartedAt;
    const stageTimings = {};
    const markStage = label => {
        const current = nowMs();
        stageTimings[label] = Math.max(0, current - stageStartedAt);
        stageStartedAt = current;
    };
    try {
        const payload = event.data || {};
        const jobId = String(payload.__foxbearJobId || '');
        postProgress(jobId, 2, '파이널라이저 준비', '채널과 처리 설정을 검증합니다.');
        const sampleRate = normalizeFiniteInteger(payload.sampleRate ?? 44100, 3000, 384000, '샘플레이트');
        const channels = normalizeFiniteInteger(payload.channels ?? 1, 1, 2, '채널 수');
        const requestedLength = normalizeFiniteInteger(payload.length ?? 1, 1, 0x7fffffff, '샘플 길이');
        const targetLufs = normalizeFiniteNumber(payload.targetLufs ?? -14, -36, 0, '목표 LUFS');
        const ceilingDb = normalizeFiniteNumber(payload.ceilingDb ?? -1.0, -12, 0, '출력 ceiling');
        const requestedQualityMode = String(payload.qualityMode || 'balanced');
        const qualityMode = ['fast', 'balanced', 'max'].includes(requestedQualityMode) ? requestedQualityMode : 'balanced';
        const truePeak = payload.truePeak !== false;
        const analysis = normalizeAnalysis(payload.analysis || {});
        const rawBuffers = Array.isArray(payload.channelBuffers) ? payload.channelBuffers.slice(0, channels) : [];
        const channelBuffers = rawBuffers.map((buf, index) => {
            if (!buf || typeof buf.byteLength !== 'number' || buf.byteLength < 4) throw new Error(`파이널라이저 ${index + 1}번 채널 데이터가 잘못되었습니다.`);
            return new Float32Array(buf);
        });
        if (channelBuffers.length < channels) throw new Error('마스터 파이널라이저 채널 입력이 부족합니다.');
        const length = Math.max(1, Math.min(requestedLength, ...channelBuffers.map(buf => buf.length)));

        const oversample = truePeak ? 4 : 1;
        const maxGainDb = qualityMode === 'max' ? 9 : qualityMode === 'fast' ? 5 : 7;
        const data = channelBuffers.map(src => src.slice(0, length));
        const qualityBefore = makeQualityFingerprint(data, length);
        postProgress(jobId, 8, '입력 정리', '샘플 복사와 비정상 값 정리를 시작합니다.');
        const inputHealth = inspectInputSignal(data, length, sampleRate);
        if (!inputHealth.ok) {
            const inputError = new Error(inputHealth.message);
            inputError.name = 'MasteringInputError';
            inputError.code = inputHealth.code;
            throw inputError;
        }
        sanitizeBuffers(data, length);
        removeDcOffset(data, length);
        markStage('inputPreparation');
        postProgress(jobId, 18, '공진 보호', '모바일 공진과 치찰음 위험을 줄입니다.');
        const mobileInfo = applyMobileSpeakerResonanceGuard(data, length, sampleRate, qualityMode, analysis);
        const deEsserInfo = applyDynamicDeEsser(data, length, sampleRate, qualityMode, analysis);
        postProgress(jobId, 32, '다이나믹 정리', '멀티밴드와 다이내믹 디에서를 적용합니다.');
        const multibandInfo = applyGentleMultibandDynamics(data, length, sampleRate, qualityMode, analysis);
        markStage('toneDynamics');

        postProgress(jobId, 48, '라우드니스 분석', 'K-weighted LUFS와 피크를 측정합니다.');
        const loudnessBefore = measureKWeightedGatedLoudness(data, sampleRate, length, channels);
        const peakBefore = truePeak ? measureFirTruePeak(data, length, oversample) : measureSamplePeak(data, length);
        markStage('preMeasurement');
        const targetGainDb = clamp(targetLufs - loudnessBefore, -8, maxGainDb);
        const gain = Math.pow(10, targetGainDb / 20);
        applyGain(data, length, gain);
        postProgress(jobId, 62, '목표 레벨 적용', '목표 LUFS에 맞춰 게인을 조정했습니다.');

        const ceiling = Math.pow(10, ceilingDb / 20);
        const preLimiterPeak = truePeak ? measureFirTruePeak(data, length, oversample) : measureSamplePeak(data, length);
        postProgress(jobId, 72, '리미터 처리', '룩어헤드 리미터와 출력 ceiling을 적용합니다.');
        const limiterInfo = applyLookaheadLimiter(data, length, ceiling, sampleRate, qualityMode);
        applySoftCeiling(data, length, ceiling);
        removeDcOffset(data, length);
        sanitizeBuffers(data, length);
        markStage('gainLimiter');

        postProgress(jobId, 84, '최종 안전 검사', 'True Peak와 잔여 클리핑을 다시 확인합니다.');
        let peakAfter = truePeak ? measureFirTruePeak(data, length, oversample) : measureSamplePeak(data, length);
        let finalSafetyGain = 1;
        if (peakAfter > ceiling * 1.001) {
            finalSafetyGain = ceiling / Math.max(1e-9, peakAfter);
            applyGain(data, length, finalSafetyGain);
            peakAfter = truePeak ? measureFirTruePeak(data, length, oversample) : measureSamplePeak(data, length);
        }
        postProgress(jobId, 92, '최종 측정', '완성 LUFS와 단기 라우드니스를 계산합니다.');
        const loudnessAfter = measureKWeightedGatedLoudness(data, sampleRate, length, channels);
        const shortTermLufs = measureShortTermLufsStatsBuffers(data, sampleRate, length, channels);
        const finalPeak = truePeak ? measureFirTruePeak(data, length, oversample) : measureSamplePeak(data, length);
        markStage('finalMeasurement');
        const qualityAfter = makeQualityFingerprint(data, length);
        const qualityFingerprint = { before: qualityBefore, after: qualityAfter, delta: { highActivityDb: dbRatio(qualityAfter.highActivity, qualityBefore.highActivity), lowActivityDb: dbRatio(qualityAfter.lowActivity, qualityBefore.lowActivity), crestDb: qualityAfter.crestDb - qualityBefore.crestDb, stereoCorrelation: qualityAfter.stereoCorrelation - qualityBefore.stereoCorrelation } };
        const processingMs = Math.max(0, nowMs() - jobStartedAt);
        const audioDurationMs = length / Math.max(1, sampleRate) * 1000;
        const realtimeFactor = processingMs > 0 ? audioDurationMs / processingMs : 0;

        postProgress(jobId, 99, '파이널라이저 완료', '완성 버퍼를 메인 화면으로 전달합니다.');
        const transfers = data.map(arr => arr.buffer);
        self.postMessage({
            ok: true,
            __foxbearJobId: jobId,
            sampleRate,
            channels,
            length,
            channelBuffers: transfers,
            info: {
                mode: truePeak ? '2-pass K-weighted multiband + 4x FIR true peak' : '2-pass K-weighted multiband + sample peak',
                qualityMode,
                targetLufs,
                ceilingDb,
                loudnessBefore,
                loudnessAfter,
                shortTermLufs,
                peakBefore,
                peakAfter: finalPeak,
                gainDb: targetGainDb + 20 * Math.log10(Math.max(1e-9, finalSafetyGain)),
                limiterReductionDb: limiterInfo.reductionDb,
                limiterActivePct: limiterInfo.activePct,
                limiterMeanReductionDb: limiterInfo.meanReductionDb,
                limiterGainMovement: limiterInfo.gainMovement,
                limiterMode: limiterInfo.mode,
                lookaheadMs: limiterInfo.lookaheadMs,
                lookaheadSamples: limiterInfo.lookaheadSamples,
                preLimiterPeak,
                oversample,
                oversampleMode: truePeak ? '4x windowed-sinc FIR true peak' : 'sample peak',
                multibandMode: multibandInfo.mode,
                multibandReductionDb: multibandInfo.reductionDb,
                multibandBands: multibandInfo.bands,
                mobileSpeakerMode: mobileInfo.mode,
                mobileSpeakerRisk: mobileInfo.risk,
                mobileSpeakerCuts: mobileInfo.cuts,
                dynamicDeEsserMode: deEsserInfo.mode,
                dynamicDeEsserRisk: deEsserInfo.risk,
                dynamicDeEsserReductionDb: deEsserInfo.reductionDb,
                dynamicDeEsserBands: deEsserInfo.bands,
                loudnessStandard: 'ITU-R BS.1770 K-weighting + EBU R128 gates',
                performance: { processingMs, audioDurationMs, realtimeFactor, stageMs: stageTimings },
                qualityFingerprint,
                inputHealth
            }
        }, transfers);
    } catch (error) {
        self.postMessage({
            ok: false,
            error: error.message || String(error),
            code: String(error.code || ''),
            errorName: String(error.name || 'Error'),
            __foxbearJobId: String(event.data?.__foxbearJobId || '')
        });
    }
};


function postProgress(jobId, percent, stage, detail = '') {
    try {
        self.postMessage({
            type: 'progress',
            __foxbearProgress: true,
            __foxbearJobId: String(jobId || ''),
            percent: Math.max(0, Math.min(100, Number(percent) || 0)),
            stage: String(stage || '마스터 파이널라이저'),
            detail: String(detail || '')
        });
    } catch (error) {}
}

function normalizeFiniteNumber(value, min, max, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} 값이 유효하지 않습니다.`);
    return Math.min(max, Math.max(min, number));
}

function normalizeFiniteInteger(value, min, max, label) {
    return Math.trunc(normalizeFiniteNumber(value, min, max, label));
}



function nowMs() {
    return Date.now();
}

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


function measureShortTermLufsStatsBuffers(buffers, sampleRate, length, channels) {
    if (!buffers || !buffers.length || length <= 0) return { min: -90, max: -90, mean: -90, range: 0, count: 0, windowSec: 0, hopSec: 0 };
    const safeRate = Math.max(3000, Math.min(384000, Number(sampleRate || 44100)));
    const usableChannels = Math.max(1, Math.min(channels || buffers.length || 1, buffers.length));
    const filtered = filterKWeightedBuffers(buffers, safeRate, length, usableChannels);
    const chunkSize = Math.max(256, Math.round(safeRate * 0.100));
    const chunkCount = Math.max(1, Math.ceil(length / chunkSize));
    const chunkPowers = new Array(chunkCount).fill(0);
    for (let chunk = 0; chunk < chunkCount; chunk += 1) {
        const start = chunk * chunkSize;
        const end = Math.min(length, start + chunkSize);
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
        chunkPowers[chunk] = sum / Math.max(1, count);
    }
    const chunkSec = chunkSize / safeRate;
    const windowChunks = Math.max(1, Math.min(chunkCount, Math.round(3.0 / Math.max(0.001, chunkSec))));
    const hopChunks = Math.max(1, Math.round(1.0 / Math.max(0.001, chunkSec)));
    const values = [];
    for (let start = 0; start < chunkCount; start += hopChunks) {
        const end = Math.min(chunkCount, start + windowChunks);
        let sum = 0;
        for (let i = start; i < end; i += 1) sum += chunkPowers[i] || 0;
        const db = loudnessDbFromPower(sum / Math.max(1, end - start));
        if (db > -70) values.push(db);
        if (end >= chunkCount) break;
    }
    if (!values.length) return { min: -90, max: -90, mean: -90, range: 0, count: 0, windowSec: Number((windowChunks * chunkSec).toFixed(2)), hopSec: Number((hopChunks * chunkSec).toFixed(2)) };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    return { min: Number(min.toFixed(2)), max: Number(max.toFixed(2)), mean: Number(mean.toFixed(2)), range: Number((max - min).toFixed(2)), count: values.length, windowSec: Number((windowChunks * chunkSec).toFixed(2)), hopSec: Number((hopChunks * chunkSec).toFixed(2)) };
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

function measureFirTruePeak(buffers, length, factor = 4) {
    const safeFactor = Math.max(1, Math.min(8, Math.round(Number(factor || 1))));
    const samplePeak = measureSamplePeak(buffers, length);
    if (safeFactor <= 1 || samplePeak <= 0) return samplePeak;
    const radius = 6;
    const kernels = getFirTruePeakKernels(safeFactor, radius);
    const candidateFloor = samplePeak * 0.28;
    let peak = samplePeak;
    for (const data of buffers) {
        for (let i = 0; i < length - 1; i += 1) {
            const a = Math.abs(data[i] || 0);
            const b = Math.abs(data[i + 1] || 0);
            if (Math.max(a, b) < candidateFloor) continue;
            for (let phase = 1; phase < safeFactor; phase += 1) {
                const kernel = kernels[phase];
                let value = 0;
                let norm = 0;
                for (let k = 0; k < kernel.coeffs.length; k += 1) {
                    const n = i + kernel.offsets[k];
                    if (n < 0 || n >= length) continue;
                    const coeff = kernel.coeffs[k];
                    value += (data[n] || 0) * coeff;
                    norm += coeff;
                }
                const candidate = Math.abs(norm ? value / norm : value);
                if (candidate > peak) peak = candidate;
            }
        }
    }
    return peak;
}



function getFirTruePeakKernels(factor, radius) {
    const key = `${factor}:${radius}`;
    const cache = getFirTruePeakKernels.cache || (getFirTruePeakKernels.cache = new Map());
    if (cache.has(key)) return cache.get(key);
    const kernels = [null];
    for (let phase = 1; phase < factor; phase += 1) {
        const frac = phase / factor;
        const offsets = [];
        const coeffs = [];
        for (let offset = -radius + 1; offset <= radius; offset += 1) {
            const t = frac - offset;
            const coeff = sinc(t) * blackmanWindow(t / radius);
            if (Math.abs(coeff) > 1e-8) {
                offsets.push(offset);
                coeffs.push(coeff);
            }
        }
        kernels[phase] = { offsets, coeffs };
    }
    cache.set(key, kernels);
    return kernels;
}

function sinc(x) {
    if (Math.abs(x) < 1e-8) return 1;
    const pix = Math.PI * x;
    return Math.sin(pix) / pix;
}

function blackmanWindow(x) {
    const ax = Math.abs(x);
    if (ax >= 1) return 0;
    const phase = Math.PI * ax;
    return 0.42 + 0.5 * Math.cos(phase) + 0.08 * Math.cos(2 * phase);
}

function applyGain(buffers, length, gain) {
    for (const data of buffers) {
        for (let i = 0; i < length; i += 1) data[i] = (data[i] || 0) * gain;
    }
}



function normalizeAnalysis(analysis) {
    const source = analysis && typeof analysis === 'object' ? analysis : {};
    const bands = source.spectrumBands && typeof source.spectrumBands === 'object' ? source.spectrumBands : {};
    const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const unit = (value, fallback) => clamp(finite(value, fallback), 0, 1);
    const detailSource = source.mobileSpeakerDetail && typeof source.mobileSpeakerDetail === 'object' ? source.mobileSpeakerDetail : {};
    return {
        bassRatio: unit(source.bassRatio ?? bands.low, 0.25),
        lowMidRatio: unit(source.lowMidRatio ?? bands.lowMid, 0.22),
        midRatio: unit(source.midRatio ?? bands.mid, 0.25),
        highRatio: unit(source.highRatio ?? bands.high, 0.22),
        presenceRatio: unit(source.presenceRatio ?? bands.presence, 0.16),
        airRatio: unit(source.airRatio ?? bands.air, 0.10),
        brightness: unit(source.brightness, 0.45),
        metallicHint: unit(source.metallicHint, 0.35),
        transientDensity: unit(source.transientDensity, 0.35),
        spatialExcessRisk: unit(source.spatialExcessRisk, 0),
        lowMonoScore: clamp(finite(source.lowMonoScore, 100), 0, 100),
        mobileSpeakerRisk: unit(source.mobileSpeakerRisk, 0),
        mobileSpeakerDetail: {
            boom: unit(detailSource.boom, 0),
            box: unit(detailSource.box, 0),
            honk: unit(detailSource.honk, 0),
            harsh: unit(detailSource.harsh, 0),
            density: unit(detailSource.density, 0)
        },
        harshPeakHz: clamp(finite(source.harshPeakHz ?? source.targetDynamicFreq, 6200), 1800, 16000),
        targetDynamicFreq: clamp(finite(source.targetDynamicFreq ?? source.harshPeakHz, 6200), 1800, 16000),
        vocalMetallicRisk: unit(source.vocalMetallicRisk, 0),
        dynamicDeEsserRisk: unit(source.dynamicDeEsserRisk, 0)
    };
}

function inspectInputSignal(buffers, length, sampleRate) {
    const durationSec = length / Math.max(1, sampleRate);
    if (durationSec < 0.10) {
        return { ok: false, code: 'MASTERING_INPUT_TOO_SHORT', message: '오디오가 0.10초보다 짧아 안정적으로 마스터링할 수 없습니다.', durationSec, peak: 0, rms: 0, invalidSamples: 0, sampledSamples: 0, invalidRatio: 0 };
    }
    let peak = 0;
    let sumSquares = 0;
    let sampledSamples = 0;
    let invalidSamples = 0;
    for (const data of buffers) {
        for (let i = 0; i < length; i += 1) {
            const value = Number(data[i]);
            sampledSamples += 1;
            if (!Number.isFinite(value)) {
                invalidSamples += 1;
                continue;
            }
            const absolute = Math.abs(value);
            if (absolute > peak) peak = absolute;
            sumSquares += value * value;
        }
    }
    const finiteSamples = Math.max(0, sampledSamples - invalidSamples);
    const invalidRatio = sampledSamples ? invalidSamples / sampledSamples : 1;
    const rms = finiteSamples ? Math.sqrt(sumSquares / finiteSamples) : 0;
    const metrics = { durationSec, peak, rms, invalidSamples, sampledSamples, invalidRatio };
    if (!finiteSamples || invalidRatio > 0.01) {
        return { ok: false, code: 'MASTERING_INPUT_CORRUPT', message: '오디오 샘플에 비정상 값이 너무 많아 안전하게 마스터링할 수 없습니다.', ...metrics };
    }
    if (peak < 0.0005 || rms < 0.00008) {
        return { ok: false, code: 'MASTERING_INPUT_SILENT', message: '무음 또는 신호가 너무 작은 파일은 마스터링할 수 없습니다.', ...metrics };
    }
    return { ok: true, code: 'MASTERING_INPUT_OK', message: '입력 신호 정상', ...metrics, nearSilent: peak < 0.002 || rms < 0.0002 };
}


function applyMobileSpeakerResonanceGuard(buffers, length, sampleRate, qualityMode, analysis) {
    if (!buffers || !buffers.length || length < 16) return { mode: 'bypass', risk: 0, cuts: {} };
    const safeRate = Math.max(3000, Math.min(384000, Number(sampleRate || 44100)));
    const fallbackRisk = estimateMobileSpeakerRisk(analysis || {});
    const detail = analysis.mobileSpeakerDetail || {};
    const risk = clamp01(Number(analysis.mobileSpeakerRisk || 0) || fallbackRisk.risk);
    if (risk < 0.16) return { mode: 'bypass', risk, cuts: {} };
    const amount = qualityMode === 'fast' ? 0.74 : qualityMode === 'max' ? 1.08 : 0.92;
    const cuts = {
        lowShelfDb: clamp(-(Math.max(0, analysis.bassRatio - 0.35) * 0.72 + Number(detail.boom || fallbackRisk.boom) * 0.42) * amount, -1.05, 0),
        mudDb: clamp(-(Math.max(0, analysis.lowMidRatio - 0.25) * 1.05 + Number(detail.box || fallbackRisk.box) * 0.62) * amount, -1.35, 0),
        boxDb: clamp(-(Number(detail.box || fallbackRisk.box) * 0.55 + Math.max(0, analysis.lowMidRatio - 0.31) * 0.40) * amount, -1.05, 0),
        phoneDb: clamp(-(Number(detail.harsh || fallbackRisk.harsh) * 0.58 + Math.max(0, analysis.presenceRatio - 0.20) * 0.72) * amount, -1.15, 0)
    };
    const filterSets = buffers.map(() => [
        createBiquadLowShelfGeneric(safeRate, 105, 0.707, cuts.lowShelfDb),
        createBiquadPeakingGeneric(safeRate, 285, 0.86, cuts.mudDb),
        createBiquadPeakingGeneric(safeRate, 465, 1.12, cuts.boxDb),
        createBiquadPeakingGeneric(safeRate, 4150, 1.45, cuts.phoneDb)
    ]);
    for (let i = 0; i < length; i += 1) {
        for (let ch = 0; ch < buffers.length; ch += 1) {
            let x = Number.isFinite(buffers[ch][i]) ? buffers[ch][i] : 0;
            for (const filter of filterSets[ch]) x = processBiquad(filter, x);
            buffers[ch][i] = x;
        }
    }
    return { mode: 'mobileSpeakerResonanceGuard', risk, cuts };
}

function estimateMobileSpeakerRisk(analysis) {
    if (!analysis) return { risk: 0, boom: 0, box: 0, honk: 0, harsh: 0, density: 0, label: 'safe' };
    const bass = clamp01(Number(analysis.bassRatio ?? 0.25));
    const lowMid = clamp01(Number(analysis.lowMidRatio ?? 0.22));
    const mid = clamp01(Number(analysis.midRatio ?? 0.28));
    const presence = clamp01(Number(analysis.presenceRatio ?? 0.16));
    const high = clamp01(Number(analysis.highRatio ?? 0.22));
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const loudness = 0.52;
    const crest = 4;
    const detail = analysis.mobileSpeakerDetail || {};
    const boom = clamp01(Number(detail.boom ?? 0) || (Math.max(0, bass - 0.36) * 1.15 + Math.max(0, lowMid - 0.28) * 1.75));
    const box = clamp01(Number(detail.box ?? 0) || (Math.max(0, lowMid - 0.25) * 1.85 + Math.max(0, mid - 0.33) * 0.72));
    const honk = clamp01(Number(detail.honk ?? 0) || Math.max(0, mid - 0.36) * 1.20);
    const harsh = clamp01(Number(detail.harsh ?? 0) || (Math.max(0, presence - 0.18) * 2.15 + Math.max(0, high - 0.34) * 0.85 + Math.max(0, brightness - 0.58) * 1.05 + Math.max(0, metallic - 0.46) * 0.82));
    const density = clamp01(Number(detail.density ?? 0) || (Math.max(0, loudness - 0.50) * 0.55 + Math.max(0, 4.2 - crest) * 0.12));
    const risk = clamp01(boom * 0.24 + box * 0.30 + honk * 0.16 + harsh * 0.21 + density * 0.16);
    const label = risk > 0.58 ? 'risk' : risk > 0.34 ? 'watch' : 'safe';
    return { risk, boom, box, honk, harsh, density, label };
}

function estimateDynamicDeEsserNeed(analysis) {
    if (!analysis) return { risk: 0, sibilance: 0, harsh: 0, vocalRisk: 0, targetHz: 6500, mode: 'bypass' };
    const vocalRisk = clamp01(Number(analysis.vocalMetallicRisk || 0) || (Math.max(0, analysis.metallicHint - 0.42) * 1.35 + Math.max(0, analysis.presenceRatio - 0.18) * 1.45));
    const sibilance = clamp01(Math.max(0, analysis.airRatio - 0.105) * 2.55 + Math.max(0, analysis.highRatio - 0.30) * 1.10 + Math.max(0, analysis.brightness - 0.56) * 0.95);
    const harsh = clamp01(Math.max(0, analysis.presenceRatio - 0.165) * 2.45 + Math.max(0, analysis.metallicHint - 0.42) * 1.15 + Math.max(0, analysis.brightness - 0.60) * 0.75);
    const mobileHarsh = clamp01(Number(analysis.mobileSpeakerDetail?.harsh || 0) || Math.max(0, analysis.mobileSpeakerRisk - 0.25));
    const precomputed = clamp01(Number(analysis.dynamicDeEsserRisk || 0));
    const risk = Math.max(precomputed, clamp01(vocalRisk * 0.42 + sibilance * 0.27 + harsh * 0.23 + mobileHarsh * 0.13));
    const targetHz = clamp(Number(analysis.targetDynamicFreq || analysis.harshPeakHz || 6500), 2600, 8800);
    const mode = risk > 0.55 ? 'strong' : risk > 0.30 ? 'active' : risk > 0.16 ? 'light' : 'bypass';
    return { risk, sibilance, harsh, vocalRisk, mobileHarsh, targetHz, mode };
}

function applyDynamicDeEsser(buffers, length, sampleRate, qualityMode, analysis) {
    if (!buffers || !buffers.length || length < 16) return { mode: 'bypass', risk: 0, reductionDb: 0, bands: {} };
    const need = estimateDynamicDeEsserNeed(analysis || {});
    if (need.risk < 0.16) return { mode: 'bypass', risk: need.risk, reductionDb: 0, bands: {} };
    const safeRate = Math.max(3000, Math.min(384000, Number(sampleRate || 44100)));
    const amount = (qualityMode === 'fast' ? 0.78 : qualityMode === 'max' ? 1.12 : 0.94) * clamp(0.72 + need.risk * 0.72, 0.76, 1.26);
    const target = clamp(Number(need.targetHz || 6500), 3000, 8800);
    const presenceTop = clamp(target * 0.78, 4300, 6200);
    const sibilanceBottom = clamp(target * 0.82, 4800, 7200);
    const sibilanceTop = clamp(target * 1.28, 7200, 9800);
    const harshHp = buffers.map(() => createBiquadHighpassGeneric(safeRate, 2300, 0.707));
    const harshLp = buffers.map(() => createBiquadLowpass(safeRate, presenceTop, 0.707));
    const sibilanceHp = buffers.map(() => createBiquadHighpassGeneric(safeRate, sibilanceBottom, 0.707));
    const sibilanceLp = buffers.map(() => createBiquadLowpass(safeRate, sibilanceTop, 0.707));
    const airHp = buffers.map(() => createBiquadHighpassGeneric(safeRate, 9200, 0.707));
    const harshDetector = createEnvelopeFollower(safeRate, 2.2, 70);
    const sibilanceDetector = createEnvelopeFollower(safeRate, 1.1, 62);
    const airDetector = createEnvelopeFollower(safeRate, 3.5, 95);
    const harshThresh = dbToAmp(clamp(-26.5 + need.harsh * 3.8 - need.risk * 3.6, -33, -20));
    const sibilanceThresh = dbToAmp(clamp(-31.5 + need.sibilance * 3.4 - need.risk * 4.2, -39, -23));
    const airThresh = dbToAmp(clamp(-35.0 + need.sibilance * 4.2 - need.risk * 2.0, -42, -25));
    const maxHarshDb = clamp(0.55 + need.harsh * 2.75 + need.vocalRisk * 1.0, 0.55, 4.6) * amount;
    const maxSibDb = clamp(0.70 + need.sibilance * 3.30 + need.vocalRisk * 1.15, 0.65, 5.8) * amount;
    const maxAirDb = clamp(0.35 + need.sibilance * 1.35, 0.30, 2.35) * amount;
    const wetHarsh = clamp(0.20 + need.risk * 0.20, 0.18, 0.42);
    const wetSib = clamp(0.24 + need.risk * 0.26, 0.20, 0.52);
    const wetAir = clamp(0.12 + need.risk * 0.10, 0.10, 0.24);
    let minHarsh = 1, minSibilance = 1, minAir = 1, activeSamples = 0;
    const scratch = buffers.map(() => ({ x: 0, harsh: 0, sib: 0, air: 0 }));
    for (let i = 0; i < length; i += 1) {
        let harshAbs = 0, sibAbs = 0, airAbs = 0;
        for (let ch = 0; ch < buffers.length; ch += 1) {
            const x = Number.isFinite(buffers[ch][i]) ? buffers[ch][i] : 0;
            const harsh = processBiquad(harshLp[ch], processBiquad(harshHp[ch], x));
            const sib = processBiquad(sibilanceLp[ch], processBiquad(sibilanceHp[ch], x));
            const air = processBiquad(airHp[ch], x);
            scratch[ch].x = x;
            scratch[ch].harsh = harsh;
            scratch[ch].sib = sib;
            scratch[ch].air = air;
            harshAbs = Math.max(harshAbs, Math.abs(harsh));
            sibAbs = Math.max(sibAbs, Math.abs(sib));
            airAbs = Math.max(airAbs, Math.abs(air));
        }
        const harshGain = computeBandGain(updateEnvelope(harshDetector, harshAbs), harshThresh, 1.85, maxHarshDb);
        const sibGain = computeBandGain(updateEnvelope(sibilanceDetector, sibAbs), sibilanceThresh, 2.45, maxSibDb);
        const airGain = computeBandGain(updateEnvelope(airDetector, airAbs), airThresh, 1.55, maxAirDb);
        minHarsh = Math.min(minHarsh, harshGain);
        minSibilance = Math.min(minSibilance, sibGain);
        minAir = Math.min(minAir, airGain);
        if (harshGain < 0.999 || sibGain < 0.999 || airGain < 0.999) activeSamples += 1;
        for (let ch = 0; ch < buffers.length; ch += 1) {
            const item = scratch[ch];
            buffers[ch][i] = item.x
                - item.harsh * (1 - harshGain) * wetHarsh
                - item.sib * (1 - sibGain) * wetSib
                - item.air * (1 - airGain) * wetAir;
        }
    }
    const bands = {
        presence: gainToReductionDb(minHarsh),
        sibilance: gainToReductionDb(minSibilance),
        air: gainToReductionDb(minAir),
        activePct: Math.round(activeSamples / Math.max(1, length) * 1000) / 10,
        targetHz: Math.round(target)
    };
    return { mode: 'dynamicDeEsserHarshSuppressor', risk: need.risk, reductionDb: Math.min(0, bands.presence, bands.sibilance, bands.air), bands };
}

function applyGentleMultibandDynamics(buffers, length, sampleRate, qualityMode, analysis) {
    if (!buffers || !buffers.length || length < 16) return { mode: 'bypass', reductionDb: 0, bands: {} };
    const safeRate = Math.max(3000, Math.min(384000, Number(sampleRate || 44100)));
    const amount = qualityMode === 'fast' ? 0.72 : qualityMode === 'max' ? 1.08 : 0.92;
    const lowNeed = clamp01(Math.max(0, analysis.bassRatio - 0.31) * 2.2 + Math.max(0, 78 - analysis.lowMonoScore) / 78 * 0.80 + analysis.spatialExcessRisk * 0.30);
    const midNeed = clamp01(Math.max(0, analysis.lowMidRatio - 0.30) * 1.3 + Math.max(0, 0.48 - analysis.midRatio) * 0.35 + Math.max(0, analysis.transientDensity - 0.58) * 0.25);
    const highNeed = clamp01(Math.max(0, analysis.presenceRatio - 0.18) * 2.0 + Math.max(0, analysis.airRatio - 0.14) * 1.8 + Math.max(0, analysis.metallicHint - 0.45) * 1.1 + Math.max(0, analysis.brightness - 0.60) * 0.75);
    const wetLow = clamp((0.16 + lowNeed * 0.18) * amount, 0.10, 0.34);
    const wetMid = clamp((0.08 + midNeed * 0.13) * amount, 0.05, 0.22);
    const wetHigh = clamp((0.10 + highNeed * 0.20) * amount, 0.06, 0.30);
    const maxLowDb = 0.7 + lowNeed * 2.2;
    const maxMidDb = 0.45 + midNeed * 1.25;
    const maxHighDb = 0.55 + highNeed * 1.85;
    const lowFilters = buffers.map(() => createBiquadLowpass(safeRate, 170, 0.707));
    const midHp = buffers.map(() => createBiquadHighpassGeneric(safeRate, 180, 0.707));
    const midLp = buffers.map(() => createBiquadLowpass(safeRate, 4200, 0.707));
    const highFilters = buffers.map(() => createBiquadHighpassGeneric(safeRate, 5200, 0.707));
    const lowDetector = createEnvelopeFollower(safeRate, 7, 155);
    const midDetector = createEnvelopeFollower(safeRate, 12, 115);
    const highDetector = createEnvelopeFollower(safeRate, 4, 82);
    const lowThresh = dbToAmp(-18.5 + lowNeed * 2.0);
    const midThresh = dbToAmp(-16.0 + midNeed * 1.6);
    const highThresh = dbToAmp(-25.0 + highNeed * 2.4);
    let minLowGain = 1;
    let minMidGain = 1;
    let minHighGain = 1;
    let activeSamples = 0;
    const scratch = buffers.map(() => ({ low: 0, mid: 0, high: 0, x: 0 }));
    for (let i = 0; i < length; i += 1) {
        let lowAbs = 0;
        let midAbs = 0;
        let highAbs = 0;
        for (let ch = 0; ch < buffers.length; ch += 1) {
            const x = Number.isFinite(buffers[ch][i]) ? buffers[ch][i] : 0;
            const low = processBiquad(lowFilters[ch], x);
            const mid = processBiquad(midLp[ch], processBiquad(midHp[ch], x));
            const high = processBiquad(highFilters[ch], x);
            scratch[ch].x = x;
            scratch[ch].low = low;
            scratch[ch].mid = mid;
            scratch[ch].high = high;
            lowAbs = Math.max(lowAbs, Math.abs(low));
            midAbs = Math.max(midAbs, Math.abs(mid));
            highAbs = Math.max(highAbs, Math.abs(high));
        }
        const lowEnv = updateEnvelope(lowDetector, lowAbs);
        const midEnv = updateEnvelope(midDetector, midAbs);
        const highEnv = updateEnvelope(highDetector, highAbs);
        const lowGain = computeBandGain(lowEnv, lowThresh, 2.0, maxLowDb);
        const midGain = computeBandGain(midEnv, midThresh, 1.55, maxMidDb);
        const highGain = computeBandGain(highEnv, highThresh, 2.15, maxHighDb);
        minLowGain = Math.min(minLowGain, lowGain);
        minMidGain = Math.min(minMidGain, midGain);
        minHighGain = Math.min(minHighGain, highGain);
        if (lowGain < 0.999 || midGain < 0.999 || highGain < 0.999) activeSamples += 1;
        for (let ch = 0; ch < buffers.length; ch += 1) {
            const item = scratch[ch];
            buffers[ch][i] = item.x
                - item.low * (1 - lowGain) * wetLow
                - item.mid * (1 - midGain) * wetMid
                - item.high * (1 - highGain) * wetHigh;
        }
    }
    const bands = {
        low: gainToReductionDb(minLowGain),
        mid: gainToReductionDb(minMidGain),
        high: gainToReductionDb(minHighGain),
        activePct: Math.round(activeSamples / Math.max(1, length) * 1000) / 10
    };
    const reductionDb = Math.min(0, Math.min(bands.low, bands.mid, bands.high));
    return { mode: 'gentle3BandDynamicControl', reductionDb, bands };
}

function createEnvelopeFollower(sampleRate, attackMs, releaseMs) {
    return {
        value: 0,
        attack: Math.exp(-1 / Math.max(1, sampleRate * attackMs / 1000)),
        release: Math.exp(-1 / Math.max(1, sampleRate * releaseMs / 1000))
    };
}

function updateEnvelope(detector, input) {
    const coeff = input > detector.value ? detector.attack : detector.release;
    detector.value = coeff * detector.value + (1 - coeff) * input;
    return detector.value;
}

function computeBandGain(env, threshold, ratio, maxReductionDb) {
    if (!(env > threshold)) return 1;
    const overDb = 20 * Math.log10(Math.max(1e-9, env / Math.max(1e-9, threshold)));
    const reductionDb = Math.min(Math.max(0, overDb * (1 - 1 / Math.max(1.01, ratio))), Math.max(0, maxReductionDb));
    return dbToAmp(-reductionDb);
}

function gainToReductionDb(gain) {
    return gain < 1 ? 20 * Math.log10(Math.max(1e-9, gain)) : 0;
}

function dbToAmp(db) {
    return Math.pow(10, Number(db || 0) / 20);
}

function createBiquadLowpass(sampleRate, frequency, q) {
    const w0 = 2 * Math.PI * clamp(frequency, 1, sampleRate * 0.45) / sampleRate;
    const cos = Math.cos(w0);
    const sin = Math.sin(w0);
    const alpha = sin / (2 * Math.max(0.001, q));
    const b0 = (1 - cos) / 2;
    const b1 = 1 - cos;
    const b2 = (1 - cos) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cos;
    const a2 = 1 - alpha;
    return normalizeBiquad(b0, b1, b2, a0, a1, a2);
}


function createBiquadPeakingGeneric(sampleRate, frequency, q, gainDb) {
    const a = Math.pow(10, Number(gainDb || 0) / 40);
    const w0 = 2 * Math.PI * clamp(frequency, 1, sampleRate * 0.45) / sampleRate;
    const cos = Math.cos(w0);
    const sin = Math.sin(w0);
    const alpha = sin / (2 * Math.max(0.001, q));
    const b0 = 1 + alpha * a;
    const b1 = -2 * cos;
    const b2 = 1 - alpha * a;
    const a0 = 1 + alpha / a;
    const a1 = -2 * cos;
    const a2 = 1 - alpha / a;
    return normalizeBiquad(b0, b1, b2, a0, a1, a2);
}

function createBiquadLowShelfGeneric(sampleRate, frequency, q, gainDb) {
    const a = Math.pow(10, Number(gainDb || 0) / 40);
    const w0 = 2 * Math.PI * clamp(frequency, 1, sampleRate * 0.45) / sampleRate;
    const cos = Math.cos(w0);
    const sin = Math.sin(w0);
    const sqrtA = Math.sqrt(a);
    const shelfSlope = Math.max(0.1, Number(q || 0.707));
    const alpha = sin / 2 * Math.sqrt((a + 1 / a) * (1 / shelfSlope - 1) + 2);
    const b0 = a * ((a + 1) - (a - 1) * cos + 2 * sqrtA * alpha);
    const b1 = 2 * a * ((a - 1) - (a + 1) * cos);
    const b2 = a * ((a + 1) - (a - 1) * cos - 2 * sqrtA * alpha);
    const a0 = (a + 1) + (a - 1) * cos + 2 * sqrtA * alpha;
    const a1 = -2 * ((a - 1) + (a + 1) * cos);
    const a2 = (a + 1) + (a - 1) * cos - 2 * sqrtA * alpha;
    return normalizeBiquad(b0, b1, b2, a0, a1, a2);
}

function createBiquadHighpassGeneric(sampleRate, frequency, q) {
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

function clamp01(value) {
    return clamp(Number.isFinite(value) ? value : 0, 0, 1);
}

function getLimiterLookaheadMs(qualityMode) {
    return qualityMode === 'max' ? 5 : qualityMode === 'fast' ? 1.5 : 3;
}

function applyLookaheadLimiter(buffers, length, ceiling, sampleRate, qualityMode) {
    const safeCeiling = Math.max(1e-9, ceiling);
    const releaseMs = qualityMode === 'max' ? 105 : qualityMode === 'fast' ? 42 : 68;
    const release = Math.exp(-1 / Math.max(1, sampleRate * releaseMs / 1000));
    const lookaheadMs = getLimiterLookaheadMs(qualityMode);
    const lookaheadSamples = Math.max(1, Math.round(sampleRate * lookaheadMs / 1000));
    const peaks = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
        let peak = 0;
        for (const data of buffers) {
            const abs = Math.abs(data[i] || 0);
            if (abs > peak) peak = abs;
        }
        peaks[i] = peak;
    }

    const deque = new Int32Array(length);
    let head = 0;
    let tail = 0;
    let addedUntil = -1;
    let gain = 1;
    let minGain = 1;
    let activeSamples = 0;
    let gainSum = 0;
    let gainMovement = 0;
    let previousGain = 1;

    for (let i = 0; i < length; i += 1) {
        const futureEnd = Math.min(length - 1, i + lookaheadSamples);
        while (addedUntil < futureEnd) {
            addedUntil += 1;
            const peak = peaks[addedUntil];
            while (tail > head && peaks[deque[tail - 1]] <= peak) tail -= 1;
            deque[tail] = addedUntil;
            tail += 1;
        }
        while (head < tail && deque[head] < i) head += 1;
        const futurePeak = head < tail ? peaks[deque[head]] : peaks[i];
        const desired = futurePeak > safeCeiling ? safeCeiling / Math.max(1e-9, futurePeak) : 1;
        if (desired <= gain) gain = desired;
        else gain = Math.min(1, gain * release + (1 - release));
        if (gain < minGain) minGain = gain;
        gainSum += gain;
        gainMovement += Math.abs(gain - previousGain);
        previousGain = gain;
        if (gain < 0.999999) {
            activeSamples += 1;
            for (const data of buffers) data[i] = (data[i] || 0) * gain;
        }
    }
    return {
        mode: 'lookaheadLimiter',
        lookaheadMs,
        lookaheadSamples,
        activeSamples,
        activePct: activeSamples / Math.max(1, length) * 100,
        minGain,
        meanReductionDb: 20 * Math.log10(Math.max(1e-9, gainSum / Math.max(1, length))),
        gainMovement: gainMovement / Math.max(1, length),
        reductionDb: minGain < 1 ? 20 * Math.log10(Math.max(1e-9, minGain)) : 0
    };
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

function dbRatio(after, before) { return 20 * Math.log10(Math.max(1e-9, after) / Math.max(1e-9, before)); }
function makeQualityFingerprint(data, length) {
    const maxSamples = 65536;
    const step = Math.max(1, Math.ceil(length / maxSamples));
    let n = 0, sumSq = 0, peak = 0, diffSq = 0, lowSq = 0, lr = 0, ll = 0, rr = 0;
    let prev = 0, low = 0;
    const left = data[0], right = data[1] || left;
    for (let i = 0; i < length; i += step) {
        const l = Number.isFinite(left[i]) ? left[i] : 0;
        const r = Number.isFinite(right[i]) ? right[i] : 0;
        const x = (l + r) * 0.5;
        low += 0.025 * (x - low);
        const d = x - prev; prev = x;
        sumSq += x * x; diffSq += d * d; lowSq += low * low; peak = Math.max(peak, Math.abs(l), Math.abs(r));
        lr += l * r; ll += l * l; rr += r * r; n += 1;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, n));
    return { samples: n, peak, rms, crestDb: 20 * Math.log10(Math.max(1e-9, peak) / Math.max(1e-9, rms)), highActivity: Math.sqrt(diffSq / Math.max(1, n)) / Math.max(1e-9, rms), lowActivity: Math.sqrt(lowSq / Math.max(1, n)) / Math.max(1e-9, rms), stereoCorrelation: lr / Math.sqrt(Math.max(1e-12, ll * rr)) };
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
