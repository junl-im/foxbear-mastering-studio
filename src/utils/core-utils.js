// FoxBear AI Mastering Studio Pro v1.6.111 - cooperative PCM utility module
(function registerFoxBearCoreUtils(global) {
    'use strict';

    const DEFAULT_WAVEFORM_BINS = 96;

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function clamp01(value) {
        return clamp(value, 0, 1);
    }

    function map(value, inMin, inMax, outMin, outMax) {
        return outMin + (Number(value) - inMin) * (outMax - outMin) / (inMax - inMin);
    }

    function dbToAmp(db) {
        return Math.pow(10, db / 20);
    }

    function median(values) {
        if (!Array.isArray(values) || !values.length) return 0;
        const sorted = values.slice().sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    function normalizeWaveformValues(values = [], targetBins = DEFAULT_WAVEFORM_BINS) {
        if (!Array.isArray(values) || !values.length) return [];
        const bins = Math.max(8, Math.round(Number(targetBins) || DEFAULT_WAVEFORM_BINS));
        const out = [];
        for (let i = 0; i < bins; i += 1) {
            const index = Math.min(values.length - 1, Math.floor((i / bins) * values.length));
            out.push(clamp01(Number(values[index]) || 0));
        }
        const max = Math.max(...out, 0.001);
        return out.map(value => clamp01(value / max));
    }

    function sampleMarkersFromValues(values = []) {
        if (!Array.isArray(values) || !values.length) return [];
        return values.map(value => {
            const normalized = clamp01(Number(value) || 0);
            if (normalized >= 0.985) return 'clip';
            if (normalized >= 0.92) return 'hot';
            return 'ok';
        });
    }

    function getWaveformMarkerForIndex(markers = [], index = 0, total = 1, value = 0) {
        const list = Array.isArray(markers) ? markers : [];
        let marker = '';
        if (list.length) {
            const mappedIndex = list.length === total
                ? index
                : Math.round(index / Math.max(1, total - 1) * Math.max(0, list.length - 1));
            marker = String(list[mappedIndex] || '').toLowerCase();
        }
        if (marker === 'clip' || marker === 'hot' || marker === 'ok') return marker;
        const normalized = clamp01(Number(value) || 0);
        if (normalized >= 0.985) return 'clip';
        if (normalized >= 0.92) return 'hot';
        return 'ok';
    }

    function createWaveformOverview(beforeBuffer, afterBuffer, bins = DEFAULT_WAVEFORM_BINS) {
        const original = sampleWaveformOverview(beforeBuffer, bins);
        const mastered = sampleWaveformOverview(afterBuffer, bins);
        const originalPeaks = sampleMarkersFromValues(original);
        const masteredPeaks = sampleMarkersFromValues(mastered);
        return {
            // New canonical names.
            original,
            mastered,
            originalPeaks,
            masteredPeaks,
            // Legacy aliases still used by detail/Dock panels.
            before: original,
            after: mastered,
            peakMarkers: masteredPeaks
        };
    }

    function sampleWaveformOverview(buffer, bins = DEFAULT_WAVEFORM_BINS) {
        if (!buffer || !buffer.length || typeof buffer.getChannelData !== 'function') return [];
        const length = buffer.length;
        const channels = Math.min(buffer.numberOfChannels || 1, 2);
        const output = [];
        for (let i = 0; i < bins; i += 1) {
            const start = Math.floor((i / bins) * length);
            const end = Math.max(start + 1, Math.floor(((i + 1) / bins) * length));
            let peak = 0;
            for (let ch = 0; ch < channels; ch += 1) {
                const data = buffer.getChannelData(ch);
                for (let index = start; index < end; index += 1) {
                    const value = Math.abs(data[index] || 0);
                    if (value > peak) peak = value;
                }
            }
            output.push(clamp01(peak));
        }
        const max = Math.max(...output, 0.001);
        return output.map(value => clamp01(value / max));
    }

    function samplePeakMarkers(buffer, bins = DEFAULT_WAVEFORM_BINS) {
        const values = sampleWaveformOverview(buffer, bins);
        return sampleMarkersFromValues(values);
    }

    function nowMs() {
        return global.performance && typeof global.performance.now === 'function' ? global.performance.now() : Date.now();
    }

    function createCooperativeWork(options = {}) {
        return {
            budgetMs: Math.max(0, Number.isFinite(Number(options.budgetMs)) ? Number(options.budgetMs) : 10),
            chunkSamples: Math.max(32768, Math.floor(Number(options.chunkSamples) || 65536)),
            lastYieldAt: nowMs(),
            yieldFn: typeof options.yieldFn === 'function' ? options.yieldFn : () => new Promise(resolve => setTimeout(resolve, 0)),
            onProgress: typeof options.onProgress === 'function' ? options.onProgress : null,
            throwIfCancelled: typeof options.throwIfCancelled === 'function' ? options.throwIfCancelled : null
        };
    }

    function emitCooperativeProgress(work, percent, stage, detail = '') {
        work.throwIfCancelled?.();
        if (work.onProgress) work.onProgress({ percent: clamp(Number(percent) || 0, 0, 100), stage: stage || 'PCM 처리', detail });
    }

    function maybeYieldCooperativeWork(work, percent, stage, detail = '') {
        work.throwIfCancelled?.();
        const current = nowMs();
        if (current - work.lastYieldAt < work.budgetMs) return null;
        emitCooperativeProgress(work, percent, stage, detail);
        const pause = Promise.resolve(work.yieldFn());
        return pause.then(() => { work.lastYieldAt = nowMs(); });
    }

    function ampToDbFloor(value) {
        return 20 * Math.log10(Math.max(0.000001, Math.abs(Number(value) || 0)));
    }

    async function removeDcOffsetAudioBufferCooperative(buffer, options = {}) {
        if (!buffer || !buffer.length || !buffer.numberOfChannels) return { applied: false, offsets: [], maxOffset: 0, maxOffsetDb: -120 };
        const work = createCooperativeWork(options);
        const channels = Math.max(1, Number(buffer.numberOfChannels) || 1);
        const length = Math.max(1, Number(buffer.length) || 1);
        const samplesPerPass = channels * length;
        const offsets = [];
        let maxOffset = 0;
        for (let ch = 0; ch < channels; ch += 1) {
            const data = buffer.getChannelData(ch);
            let sum = 0;
            let nextCheckpoint = work.chunkSamples;
            for (let i = 0; i < data.length; i += 1) {
                sum += Number.isFinite(data[i]) ? data[i] : 0;
                if (i + 1 >= nextCheckpoint) {
                    const processed = ch * length + i + 1;
                    const pause = maybeYieldCooperativeWork(work, processed / samplesPerPass * 50, 'DC offset 측정', `${ch + 1}/${channels}ch`);
                    if (pause) await pause;
                    nextCheckpoint += work.chunkSamples;
                }
            }
            const mean = sum / Math.max(1, data.length);
            offsets.push(mean);
            maxOffset = Math.max(maxOffset, Math.abs(mean));
        }
        const threshold = 1e-6;
        if (maxOffset <= threshold) {
            emitCooperativeProgress(work, 100, 'DC offset 측정 완료');
            return { applied: false, offsets, maxOffset, maxOffsetDb: ampToDbFloor(maxOffset) };
        }
        for (let ch = 0; ch < channels; ch += 1) {
            const data = buffer.getChannelData(ch);
            const mean = offsets[ch] || 0;
            let nextCheckpoint = work.chunkSamples;
            for (let i = 0; i < data.length; i += 1) {
                data[i] = (Number.isFinite(data[i]) ? data[i] : 0) - mean;
                if (i + 1 >= nextCheckpoint) {
                    const processed = ch * length + i + 1;
                    const pause = maybeYieldCooperativeWork(work, 50 + processed / samplesPerPass * 50, 'DC offset 제거', `${ch + 1}/${channels}ch`);
                    if (pause) await pause;
                    nextCheckpoint += work.chunkSamples;
                }
            }
        }
        emitCooperativeProgress(work, 100, 'DC offset 제거 완료');
        return { applied: true, offsets, maxOffset, maxOffsetDb: ampToDbFloor(maxOffset) };
    }

    async function sanitizeAudioBufferCooperative(buffer, label = 'audio', options = {}) {
        if (!buffer || !buffer.numberOfChannels || !buffer.length) return { repaired: 0, clipped: 0, peakBefore: 0, peakAfter: 0 };
        const work = createCooperativeWork(options);
        const channels = Math.max(1, Number(buffer.numberOfChannels) || 1);
        const length = Math.max(1, Number(buffer.length) || 1);
        const samplesPerPass = channels * length;
        let repaired = 0;
        let clipped = 0;
        let peak = 0;
        const hardLimit = 8;
        for (let ch = 0; ch < channels; ch += 1) {
            const data = buffer.getChannelData(ch);
            let nextCheckpoint = work.chunkSamples;
            for (let i = 0; i < data.length; i += 1) {
                let value = data[i];
                if (!Number.isFinite(value)) {
                    value = 0;
                    repaired += 1;
                }
                if (value > hardLimit || value < -hardLimit) {
                    value = clamp(value, -hardLimit, hardLimit);
                    clipped += 1;
                }
                data[i] = value;
                const abs = Math.abs(value);
                if (abs > peak) peak = abs;
                if (i + 1 >= nextCheckpoint) {
                    const processed = ch * length + i + 1;
                    const pause = maybeYieldCooperativeWork(work, processed / samplesPerPass * 70, 'PCM 안전 점검', `${ch + 1}/${channels}ch`);
                    if (pause) await pause;
                    nextCheckpoint += work.chunkSamples;
                }
            }
        }
        const peakBefore = peak;
        if (peak > 4) {
            const gain = 4 / peak;
            for (let ch = 0; ch < channels; ch += 1) {
                const data = buffer.getChannelData(ch);
                let nextCheckpoint = work.chunkSamples;
                for (let i = 0; i < data.length; i += 1) {
                    data[i] *= gain;
                    if (i + 1 >= nextCheckpoint) {
                        const processed = ch * length + i + 1;
                        const pause = maybeYieldCooperativeWork(work, 70 + processed / samplesPerPass * 15, 'PCM 안전 게인 보정', `${ch + 1}/${channels}ch`);
                        if (pause) await pause;
                        nextCheckpoint += work.chunkSamples;
                    }
                }
            }
            clipped += 1;
            peak = 0;
            for (let ch = 0; ch < channels; ch += 1) {
                const data = buffer.getChannelData(ch);
                let nextCheckpoint = work.chunkSamples;
                for (let i = 0; i < data.length; i += 1) {
                    peak = Math.max(peak, Math.abs(data[i]));
                    if (i + 1 >= nextCheckpoint) {
                        const processed = ch * length + i + 1;
                        const pause = maybeYieldCooperativeWork(work, 85 + processed / samplesPerPass * 15, 'PCM 피크 재검증', `${ch + 1}/${channels}ch`);
                        if (pause) await pause;
                        nextCheckpoint += work.chunkSamples;
                    }
                }
            }
        }
        emitCooperativeProgress(work, 100, 'PCM 안전 점검 완료');
        if (repaired || clipped) console.warn(`Audio safety repair applied (${label}):`, { repaired, clipped, peakBefore, peakAfter: peak });
        return { repaired, clipped, peakBefore, peakAfter: peak };
    }

    async function sampleWaveformOverviewAsync(buffer, bins = DEFAULT_WAVEFORM_BINS, options = {}) {
        if (!buffer || !buffer.length || typeof buffer.getChannelData !== 'function') return [];
        const work = createCooperativeWork(options);
        const length = buffer.length;
        const channels = Math.min(buffer.numberOfChannels || 1, 2);
        const output = [];
        for (let i = 0; i < bins; i += 1) {
            const start = Math.floor((i / bins) * length);
            const end = Math.max(start + 1, Math.floor(((i + 1) / bins) * length));
            let peak = 0;
            for (let ch = 0; ch < channels; ch += 1) {
                const data = buffer.getChannelData(ch);
                for (let index = start; index < end; index += 1) {
                    const value = Math.abs(data[index] || 0);
                    if (value > peak) peak = value;
                }
            }
            output.push(clamp01(peak));
            const pause = maybeYieldCooperativeWork(work, (i + 1) / bins * 100, '파형 요약', `${i + 1}/${bins}`);
            if (pause) await pause;
        }
        const max = Math.max(...output, 0.001);
        emitCooperativeProgress(work, 100, '파형 요약 완료');
        return output.map(value => clamp01(value / max));
    }

    async function createWaveformOverviewAsync(beforeBuffer, afterBuffer, bins = DEFAULT_WAVEFORM_BINS, options = {}) {
        const original = await sampleWaveformOverviewAsync(beforeBuffer, bins, {
            ...options,
            onProgress: options.onProgress ? progress => options.onProgress({ ...progress, percent: progress.percent * 0.5, stage: '원본 파형 요약' }) : null
        });
        const mastered = await sampleWaveformOverviewAsync(afterBuffer, bins, {
            ...options,
            onProgress: options.onProgress ? progress => options.onProgress({ ...progress, percent: 50 + progress.percent * 0.5, stage: '마스터 파형 요약' }) : null
        });
        const originalPeaks = sampleMarkersFromValues(original);
        const masteredPeaks = sampleMarkersFromValues(mastered);
        if (options.onProgress) options.onProgress({ percent: 100, stage: 'A/B 파형 요약 완료', detail: '' });
        return { original, mastered, originalPeaks, masteredPeaks, before: original, after: mastered, peakMarkers: masteredPeaks };
    }

    global.FoxBearCoreUtils = Object.freeze({
        clamp,
        clamp01,
        map,
        dbToAmp,
        median,
        normalizeWaveformValues,
        sampleMarkersFromValues,
        getWaveformMarkerForIndex,
        // Backward-compatible alias for accidental lowercase-l typo reports.
        getWaveformMarkerForlndex: getWaveformMarkerForIndex,
        createWaveformOverview,
        createWaveformOverviewAsync,
        sampleWaveformOverview,
        sampleWaveformOverviewAsync,
        samplePeakMarkers,
        removeDcOffsetAudioBufferCooperative,
        sanitizeAudioBufferCooperative
    });
})(typeof window !== 'undefined' ? window : globalThis);
