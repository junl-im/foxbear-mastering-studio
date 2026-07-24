// FoxBear mastering memory diagnostics and adaptive governor service v1.5.99.
'use strict';

(function attachFoxBearMasteringMemoryDiagnosticsService(global) {
    const BUILD_INFO = global.FoxBearBuildInfo || {};
    const VERSION = BUILD_INFO.assetVersion || '1.5.99-kakao-adaptive-memory-governor';
    const MB = 1024 * 1024;
    const MAX_SAMPLES = 18;

    function finite(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function round(value, digits = 1) {
        const scale = 10 ** digits;
        return Math.round(finite(value, 0) * scale) / scale;
    }


    function pressureRank(level) {
        return ({ normal: 0, elevated: 1, high: 2, critical: 3 })[String(level || 'normal')] || 0;
    }

    function classifyPressureLevel(ratio, restricted = false) {
        const value = Math.max(0, finite(ratio, 0));
        if (value >= 1) return 'critical';
        if (value >= (restricted ? 0.82 : 0.9)) return 'high';
        if (value >= (restricted ? 0.65 : 0.75)) return 'elevated';
        return 'normal';
    }

    function lowerQualityMode(sourceMode, level, restricted) {
        const mode = ['fast', 'balanced', 'max'].includes(String(sourceMode)) ? String(sourceMode) : 'balanced';
        if (level === 'critical') return 'fast';
        if (level === 'high' && restricted) return 'fast';
        if ((level === 'high' || level === 'elevated') && mode === 'max') return 'balanced';
        return mode;
    }

    function audioBufferBytes(buffer) {
        if (!buffer) return 0;
        return Math.max(1, finite(buffer.numberOfChannels, 1)) * Math.max(0, finite(buffer.length, 0)) * 4;
    }

    function blobBytes(blob) {
        return Math.max(0, finite(blob?.size, 0));
    }

    function heapSnapshot() {
        const memory = global.performance?.memory;
        if (!memory) return null;
        return Object.freeze({
            usedBytes: Math.max(0, finite(memory.usedJSHeapSize, 0)),
            totalBytes: Math.max(0, finite(memory.totalJSHeapSize, 0)),
            limitBytes: Math.max(0, finite(memory.jsHeapSizeLimit, 0))
        });
    }

    function normalizeBuffers(buffers = {}) {
        const entries = [];
        Object.entries(buffers || {}).forEach(([key, value]) => {
            const bytes = value instanceof Blob ? blobBytes(value) : audioBufferBytes(value);
            if (bytes > 0) entries.push(Object.freeze({ key: String(key), bytes }));
        });
        return entries;
    }

    function createPerformanceInfo() {
        const now = global.performance?.now ? global.performance.now() : Date.now();
        return { running: true, startedAt: new Date().toISOString(), startMs: now, lastMs: now, stages: [], memoryStages: [], totalMs: 0, realtimeRatio: 0, outputSize: 0 };
    }

    function markStage(track, label, buffers = {}) {
        if (!track?.performanceInfo) return null;
        const now = global.performance?.now ? global.performance.now() : Date.now();
        const elapsed = Math.max(0, now - Number(track.performanceInfo.lastMs || now));
        const existing = track.performanceInfo.stages.find(stage => stage.label === label);
        if (existing) existing.ms += elapsed;
        else track.performanceInfo.stages.push({ label, ms: elapsed });
        track.performanceInfo.lastMs = now;
        return capture(track, label, buffers, { elapsedMs: elapsed });
    }

    function capture(track, label, buffers = {}, options = {}) {
        if (!track) return null;
        if (!track.performanceInfo) track.performanceInfo = { stages: [] };
        if (!Array.isArray(track.performanceInfo.memoryStages)) track.performanceInfo.memoryStages = [];
        const entries = normalizeBuffers(buffers);
        const knownBufferBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
        const heap = heapSnapshot();
        const sample = Object.freeze({
            label: String(label || 'stage'),
            at: Date.now(),
            elapsedMs: Math.max(0, finite(options.elapsedMs, 0)),
            knownBufferBytes,
            knownBufferMB: round(knownBufferBytes / MB, 1),
            buffers: Object.freeze(entries),
            heap,
            heapUsedMB: heap ? round(heap.usedBytes / MB, 1) : 0,
            heapLimitMB: heap ? round(heap.limitBytes / MB, 1) : 0,
            projectedPeakMB: round(track.inAppSafetyInfo?.projectedPeakMb, 1),
            memoryBudgetMB: round(track.inAppSafetyInfo?.memoryBudgetMb, 1),
            pressureRatio: round(track.inAppSafetyInfo?.pressureRatio, 2),
            environment: String(track.inAppSafetyInfo?.label || '')
        });
        track.performanceInfo.memoryStages.push(sample);
        while (track.performanceInfo.memoryStages.length > MAX_SAMPLES) track.performanceInfo.memoryStages.shift();
        return sample;
    }


    function createGovernorDecision(track, sample = null, options = {}) {
        const safety = track?.inAppSafetyInfo || {};
        const selectedSample = sample || (Array.isArray(track?.performanceInfo?.memoryStages) ? track.performanceInfo.memoryStages[track.performanceInfo.memoryStages.length - 1] : null) || {};
        const budgetMb = Math.max(0, finite(selectedSample.memoryBudgetMB, safety.memoryBudgetMb));
        const projectedRatio = Math.max(0, finite(selectedSample.pressureRatio, safety.pressureRatio));
        const knownRatio = budgetMb > 0 ? Math.max(0, finite(selectedSample.knownBufferMB, 0)) / budgetMb : 0;
        const heapRatio = finite(selectedSample.heapLimitMB, 0) > 0
            ? Math.max(0, finite(selectedSample.heapUsedMB, 0)) / finite(selectedSample.heapLimitMB, 1)
            : 0;
        const observedRatio = Math.max(projectedRatio, knownRatio, heapRatio);
        const restricted = Boolean(safety.restricted || safety.kakao);
        const level = classifyPressureLevel(observedRatio, restricted);
        const sourceQualityMode = String(options.sourceQualityMode || safety.sourceQualityMode || 'balanced');
        const qualityMode = lowerQualityMode(sourceQualityMode, level, restricted);
        const requestedTruePeak = options.requestedTruePeak !== false;
        const truePeak = requestedTruePeak && !(level === 'critical' || (restricted && level === 'high'));
        const outputFormat = String(options.outputFormat || 'wav24');
        const previous = track?.memoryGovernorInfo || null;
        const escalated = pressureRank(level) > pressureRank(previous?.level);
        const reasons = [];
        if (qualityMode !== sourceQualityMode) reasons.push(`${sourceQualityMode} → ${qualityMode}`);
        if (requestedTruePeak && !truePeak) reasons.push('True Peak 경량화');
        if (level === 'high' || level === 'critical') reasons.push('선택 PCM 조기 해제');
        if (level === 'critical' && outputFormat.startsWith('mp3')) reasons.push('WAV 24bit 권장');
        if (!reasons.length) reasons.push('현재 품질 유지');
        const decision = Object.freeze({
            version: VERSION,
            stage: String(selectedSample.label || options.stage || ''),
            level,
            observedRatio: round(observedRatio, 2),
            projectedRatio: round(projectedRatio, 2),
            knownBufferRatio: round(knownRatio, 2),
            heapRatio: round(heapRatio, 2),
            memoryBudgetMB: round(budgetMb, 1),
            sourceQualityMode,
            qualityMode,
            requestedTruePeak,
            truePeak,
            releaseAggressively: level === 'high' || level === 'critical',
            compactWaveform: level === 'high' || level === 'critical',
            recommendedOutputFormat: level === 'critical' && outputFormat.startsWith('mp3') ? 'wav24' : outputFormat,
            preserveFirstRender: restricted && pressureRank(level) >= pressureRank('high'),
            escalated,
            reasons: Object.freeze(reasons)
        });
        if (track) {
            track.memoryGovernorInfo = decision;
            if (track.performanceInfo) {
                if (!Array.isArray(track.performanceInfo.memoryGovernorHistory)) track.performanceInfo.memoryGovernorHistory = [];
                const history = track.performanceInfo.memoryGovernorHistory;
                const last = history[history.length - 1];
                if (!last || last.level !== decision.level || last.qualityMode !== decision.qualityMode || last.truePeak !== decision.truePeak) {
                    history.push(decision);
                    while (history.length > 10) history.shift();
                }
                track.performanceInfo.memoryGovernor = decision;
            }
        }
        return decision;
    }

    function summarize(performanceInfo) {
        const samples = Array.isArray(performanceInfo?.memoryStages) ? performanceInfo.memoryStages : [];
        if (!samples.length) return Object.freeze({ samples: [], peakKnownBufferBytes: 0, peakHeapUsedBytes: 0, peakStage: '' });
        const peakKnown = samples.reduce((best, item) => Number(item.knownBufferBytes || 0) > Number(best.knownBufferBytes || 0) ? item : best, samples[0]);
        const peakHeap = samples.reduce((best, item) => Number(item.heap?.usedBytes || 0) > Number(best.heap?.usedBytes || 0) ? item : best, samples[0]);
        return Object.freeze({
            samples: Object.freeze(samples.map(item => Object.freeze({ ...item }))),
            peakKnownBufferBytes: Number(peakKnown.knownBufferBytes || 0),
            peakKnownBufferMB: round(Number(peakKnown.knownBufferBytes || 0) / MB, 1),
            peakHeapUsedBytes: Number(peakHeap.heap?.usedBytes || 0),
            peakHeapUsedMB: round(Number(peakHeap.heap?.usedBytes || 0) / MB, 1),
            peakStage: String(peakKnown.label || ''),
            projectedPeakMB: round(Math.max(...samples.map(item => Number(item.projectedPeakMB || 0))), 1),
            memoryBudgetMB: round(Math.max(...samples.map(item => Number(item.memoryBudgetMB || 0))), 1),
            pressureRatio: round(Math.max(...samples.map(item => Number(item.pressureRatio || 0))), 2),
            governor: performanceInfo?.memoryGovernor || null,
            governorHistory: Object.freeze((performanceInfo?.memoryGovernorHistory || []).map(item => Object.freeze({ ...item })))
        });
    }

    global.FoxBearMasteringMemoryDiagnostics = Object.freeze({
        version: VERSION,
        audioBufferBytes,
        createPerformanceInfo,
        markStage,
        capture,
        createGovernorDecision,
        classifyPressureLevel,
        pressureRank,
        summarize
    });
})(typeof window !== 'undefined' ? window : globalThis);
