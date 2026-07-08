// FoxBear track lifecycle service v1.4.27 - track model and resource cleanup helpers
'use strict';

(function attachFoxBearTrackLifecycleService(global) {
    function fallbackClone(value) {
        if (!value || typeof value !== 'object') return value;
        try { return JSON.parse(JSON.stringify(value)); } catch (error) { return Array.isArray(value) ? value.slice() : Object.assign({}, value); }
    }

    function createId() {
        if (global.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
        return `track-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function createTrackModel(file, options = {}) {
        const cloneSettings = options.cloneSettings || fallbackClone;
        const cloneTransform = options.cloneTransform || fallbackClone;
        const cloneInstrumentLayer = options.cloneInstrumentLayer || fallbackClone;
        const customPreset = options.customPreset || {};
        const defaultTransform = options.defaultTransform || { pitchSemitones: 0, speedRatio: 1, snapSemitone: true, beatPreset: 'original' };
        const defaultInstrumentLayer = options.defaultInstrumentLayer || { mode: 'off', amount: 'light' };
        const urlFactory = options.createObjectURL || (blob => URL.createObjectURL(blob));
        const path = file.webkitRelativePath || file.name;
        const url = urlFactory(file);
        return {
            id: createId(),
            file,
            name: file.name,
            path,
            size: file.size,
            type: file.type || 'unknown',
            status: 'queued',
            progress: 0,
            preset: 'custom',
            recommendedPreset: 'custom',
            confidence: 0,
            genreReason: '',
            genreAlternatives: [],
            genreLocked: false,
            analysisCacheHit: false,
            comparison: null,
            settings: cloneSettings(customPreset),
            recommendedSettings: cloneSettings(customPreset),
            transform: cloneTransform(defaultTransform),
            analysis: null,
            instrument: cloneInstrumentLayer(defaultInstrumentLayer),
            instrumentInfo: null,
            abHighlightStartSec: null,
            trimInfo: null,
            albumApplied: null,
            truePeakInfo: null,
            finalizeInfo: null,
            dcInfo: null,
            masterReport: null,
            exportFallbackInfo: null,
            performanceInfo: null,
            snapshots: [],
            redoSnapshots: [],
            snapshotMeta: null,
            autoAiRecommendDialog: false,
            aiRecommendDialogShown: false,
            report: '대기 중',
            outBlob: null,
            outName: '',
            outFormat: null,
            originalUrl: url,
            masteredUrl: null,
            masteredBuffer: null,
            masteredDurationSec: 0,
            downloadAttention: false,
            error: null,
            masterPreviewBlob: null,
            masterPreviewUrl: null,
            masterPreviewInfo: null,
            masterPreviewStatus: 'idle',
            analysisPromise: null,
            bulkImportBatchId: '',
            bulkImportOrder: 0,
            bulkImportTotal: 0,
            bulkImportLargeBatch: false,
            bulkMasteringBatchId: '',
            bulkMasteringOrder: 0,
            bulkMasteringTotal: 0,
            bulkMasteringSource: '',
            memoryPolicyReleasedAt: 0
        };
    }

    function revokeUrl(url, revokeObjectURL) {
        if (!url) return false;
        try {
            (revokeObjectURL || URL.revokeObjectURL)(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    function releaseTrackResources(track, options = {}) {
        if (!track) return Object.freeze({ revoked: 0 });
        const revokeObjectURL = options.revokeObjectURL || (url => URL.revokeObjectURL(url));
        let revoked = 0;
        if (revokeUrl(track.originalUrl, revokeObjectURL)) revoked += 1;
        if (revokeUrl(track.masteredUrl, revokeObjectURL)) revoked += 1;
        if (revokeUrl(track.masterPreviewUrl, revokeObjectURL)) revoked += 1;
        track.originalUrl = null;
        track.masteredUrl = null;
        track.masterPreviewUrl = null;
        track.masteredBuffer = null;
        track.masterPreviewBlob = null;
        track.masterPreviewInfo = null;
        track.outBlob = null;
        return Object.freeze({ revoked });
    }

    global.FoxBearTrackLifecycleService = Object.freeze({
        version: '1.4.27-release-cleanup',
        createTrackModel,
        releaseTrackResources
    });
})(window);
