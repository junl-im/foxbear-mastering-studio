// FoxBear mastering memory diagnostics service v1.5.59.
'use strict';

(function attachFoxBearMasteringMemoryDiagnosticsService(global) {
    const BUILD_INFO = global.FoxBearBuildInfo || {};
    const VERSION = BUILD_INFO.assetVersion || '1.5.59-kakao-session-handoff-memory-diagnostics';
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
            pressureRatio: round(Math.max(...samples.map(item => Number(item.pressureRatio || 0))), 2)
        });
    }

    global.FoxBearMasteringMemoryDiagnostics = Object.freeze({
        version: VERSION,
        audioBufferBytes,
        createPerformanceInfo,
        markStage,
        capture,
        summarize
    });
})(typeof window !== 'undefined' ? window : globalThis);
