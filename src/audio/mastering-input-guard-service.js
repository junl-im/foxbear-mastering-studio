// FoxBear Mastering Input Guard v1.5.96 - rejects silent, corrupt, or unusably short decoded audio before DSP.
'use strict';

(function attachFoxBearMasteringInputGuard(global) {
    const DEFAULTS = Object.freeze({
        minDurationSec: 0.10,
        silencePeak: 0.0005,
        silenceRms: 0.00008,
        nearSilentPeak: 0.002,
        nearSilentRms: 0.0002,
        maxInvalidRatio: 0.01,
        maxSampleBudgetPerChannel: 1000000
    });

    function finiteNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }


    function normalizeAnalysis(analysis = {}) {
        const source = analysis && typeof analysis === 'object' ? analysis : {};
        const bands = source.spectrumBands && typeof source.spectrumBands === 'object' ? source.spectrumBands : {};
        const unit = (value, fallback) => Math.min(1, Math.max(0, finiteNumber(value, fallback)));
        const detailSource = source.mobileSpeakerDetail && typeof source.mobileSpeakerDetail === 'object' ? source.mobileSpeakerDetail : {};
        return Object.freeze({
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
            lowMonoScore: Math.min(100, Math.max(0, finiteNumber(source.lowMonoScore, 100))),
            mobileSpeakerRisk: unit(source.mobileSpeakerRisk, 0),
            mobileSpeakerDetail: Object.freeze({
                boom: unit(detailSource.boom, 0), box: unit(detailSource.box, 0), honk: unit(detailSource.honk, 0),
                harsh: unit(detailSource.harsh, 0), density: unit(detailSource.density, 0)
            }),
            harshPeakHz: Math.min(16000, Math.max(1800, finiteNumber(source.harshPeakHz ?? source.targetDynamicFreq, 6200))),
            targetDynamicFreq: Math.min(16000, Math.max(1800, finiteNumber(source.targetDynamicFreq ?? source.harshPeakHz, 6200))),
            vocalMetallicRisk: unit(source.vocalMetallicRisk, 0),
            dynamicDeEsserRisk: unit(source.dynamicDeEsserRisk, 0)
        });
    }

    function makeResult(ok, code, message, metrics, warnings = []) {
        return Object.freeze({ ok, code, message, warnings: Object.freeze(warnings.slice()), ...metrics });
    }

    function inspect(buffer, analysis = {}, options = {}) {
        const rules = { ...DEFAULTS, ...(options || {}) };
        const channels = Math.max(0, Math.trunc(finiteNumber(buffer?.numberOfChannels, 0)));
        const length = Math.max(0, Math.trunc(finiteNumber(buffer?.length, 0)));
        const sampleRate = Math.max(1, finiteNumber(buffer?.sampleRate, 44100));
        const durationSec = Math.max(0, finiteNumber(buffer?.duration, length / sampleRate));
        if (!buffer || typeof buffer.getChannelData !== 'function' || channels < 1 || length < 1) {
            return makeResult(false, 'MASTERING_INPUT_INVALID', '오디오 채널 데이터가 비어 있어 마스터링할 수 없습니다.', {
                channels, length, sampleRate, durationSec, peak: 0, rms: 0, invalidSamples: 0, sampledSamples: 0, invalidRatio: 0, analysisSilence: Boolean(analysis?.silence), nearSilent: true
            });
        }

        const stride = Math.max(1, Math.ceil(length / Math.max(1, Math.trunc(rules.maxSampleBudgetPerChannel))));
        let peak = 0;
        let sumSquares = 0;
        let sampledSamples = 0;
        let invalidSamples = 0;
        for (let channel = 0; channel < channels; channel += 1) {
            const data = buffer.getChannelData(channel);
            if (!data || typeof data.length !== 'number') continue;
            for (let index = 0; index < Math.min(length, data.length); index += stride) {
                const value = Number(data[index]);
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
        const rms = finiteSamples ? Math.sqrt(sumSquares / finiteSamples) : 0;
        const invalidRatio = sampledSamples ? invalidSamples / sampledSamples : 1;
        const analysisSilence = Boolean(analysis?.silence);
        const silent = peak < rules.silencePeak || rms < rules.silenceRms;
        const nearSilent = peak < rules.nearSilentPeak || rms < rules.nearSilentRms;
        const metrics = Object.freeze({ channels, length, sampleRate, durationSec, peak, rms, invalidSamples, sampledSamples, invalidRatio, analysisSilence, nearSilent });

        if (durationSec < rules.minDurationSec) {
            return makeResult(false, 'MASTERING_INPUT_TOO_SHORT', `오디오가 ${rules.minDurationSec.toFixed(2)}초보다 짧아 안정적으로 마스터링할 수 없습니다.`, metrics);
        }
        if (!finiteSamples || invalidRatio > rules.maxInvalidRatio) {
            return makeResult(false, 'MASTERING_INPUT_CORRUPT', '오디오 샘플에 비정상 값이 너무 많아 안전하게 마스터링할 수 없습니다.', metrics);
        }
        if (silent) {
            return makeResult(false, 'MASTERING_INPUT_SILENT', '무음 또는 신호가 너무 작은 파일입니다. 실제 소리가 포함된 원본을 선택해 주세요.', metrics);
        }

        const warnings = [];
        if (nearSilent) warnings.push('입력 신호가 매우 작아 노이즈가 함께 커질 수 있습니다.');
        if (analysisSilence && !silent) warnings.push('분석 결과와 실제 신호 레벨이 달라 입력 신호를 우선 적용했습니다.');
        return makeResult(true, 'MASTERING_INPUT_OK', warnings[0] || '마스터링 가능한 입력 신호입니다.', metrics, warnings);
    }

    function assertMasterable(buffer, analysis = {}, options = {}) {
        const result = inspect(buffer, analysis, options);
        if (result.ok) return result;
        const error = new Error(result.message);
        error.name = 'MasteringInputError';
        error.code = result.code;
        error.inputGuard = result;
        throw error;
    }

    global.FoxBearMasteringInputGuard = Object.freeze({
        version: '1.5.96-modal-focus-memory-diagnostics',
        defaults: DEFAULTS,
        inspect,
        assertMasterable,
        normalizeAnalysis
    });
})(typeof window !== 'undefined' ? window : globalThis);
