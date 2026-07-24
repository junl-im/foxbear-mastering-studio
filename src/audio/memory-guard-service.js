// FoxBear memory guard service v1.6.1 - release-after-encode PCM retention policy and diagnostics
'use strict';

(function attachFoxBearMemoryGuardService(global) {
    const VERSION = 'v1.6.1-transient-performance-diagnostics';
    const LEGACY_POLICY_VERSION = 'v1.4.29-memory-stabilization';
    const MB = 1024 * 1024;

    function toNumber(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function getAudioBufferBytes(buffer) {
        if (!buffer) return 0;
        const channels = Math.max(1, toNumber(buffer.numberOfChannels, 1));
        const length = Math.max(0, toNumber(buffer.length, 0));
        return channels * length * 4;
    }

    function getBlobBytes(blob) {
        return Math.max(0, toNumber(blob?.size, 0));
    }

    function getTrackBufferBytes(track) {
        return getAudioBufferBytes(track?.masteredBuffer);
    }

    function getTrackOutputBytes(track) {
        return getBlobBytes(track?.outBlob) + getBlobBytes(track?.masterPreviewBlob);
    }

    function getTrackSortTime(track) {
        return Math.max(
            Date.parse(track?.performanceInfo?.completedAt || '') || 0,
            toNumber(track?.performanceInfo?.completedAt, 0),
            toNumber(track?.updatedAt, 0),
            toNumber(track?.createdAt, 0),
            toNumber(track?.memoryPolicyTouchedAt, 0)
        );
    }

    function getDeviceMemoryGb() {
        return toNumber(global.navigator?.deviceMemory, 0);
    }

    function isProbablyMobile() {
        const ua = String(global.navigator?.userAgent || '').toLowerCase();
        const coarse = Boolean(global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
        return coarse || /android|iphone|ipad|ipod|mobile|kakaotalk|naver|instagram|fbav|samsungbrowser/.test(ua);
    }

    function normalizePolicy(tracks, options = {}) {
        const list = Array.isArray(tracks) ? tracks : [];
        const completedCount = list.filter(track => track && track.status === 'done').length;
        const batchSize = Math.max(
            completedCount,
            toNumber(options.batchSize, 0),
            ...list.map(track => toNumber(track?.bulkMasteringTotal, 0))
        );
        const deviceMemoryGb = options.deviceMemoryGb != null ? toNumber(options.deviceMemoryGb, 0) : getDeviceMemoryGb();
        const mobile = options.mobile != null ? Boolean(options.mobile) : isProbablyMobile();
        const largeBatch = Boolean(options.largeBatch) || batchSize >= 12;
        const lowMemory = Boolean(options.lowMemory) || mobile || (deviceMemoryGb > 0 && deviceMemoryGb <= 4) || batchSize >= 24;
        const forceReleaseAll = options.forceReleaseAll === true;
        const retainCompletedPcm = !forceReleaseAll && options.retainCompletedPcm === true;
        const defaultMaxBuffers = retainCompletedPcm ? (lowMemory || largeBatch ? 1 : 2) : 0;
        const defaultKeepRecent = retainCompletedPcm ? (lowMemory || largeBatch ? 0 : 1) : 0;
        const defaultBudgetMb = retainCompletedPcm ? (lowMemory ? 96 : largeBatch ? 160 : 256) : 0;
        const maxRetainedBuffers = Math.max(0, Math.floor(toNumber(options.maxRetainedBuffers, defaultMaxBuffers)));
        const maxMasteredBufferBytes = Math.max(0, Math.floor(toNumber(options.maxMasteredBufferBytes, defaultBudgetMb * MB)));
        return Object.freeze({
            version: VERSION,
            legacyVersion: LEGACY_POLICY_VERSION,
            retentionMode: retainCompletedPcm ? 'bounded-reencode-cache' : 'release-after-encode',
            retainCompletedPcm,
            forceReleaseAll,
            selectedId: String(options.selectedId || ''),
            keepSelected: retainCompletedPcm && options.keepSelected !== false,
            keepRecent: retainCompletedPcm ? Math.max(0, Math.floor(toNumber(options.keepRecent, defaultKeepRecent))) : 0,
            maxRetainedBuffers: retainCompletedPcm ? maxRetainedBuffers : 0,
            maxMasteredBufferBytes: retainCompletedPcm ? maxMasteredBufferBytes : 0,
            largeBatch,
            lowMemory,
            mobile,
            deviceMemoryGb,
            batchSize,
            reason: options.reason || 'release-after-encode'
        });
    }

    function buildRetentionPlan(tracks, policy) {
        const completedWithBuffers = tracks
            .filter(track => track && track.status === 'done' && track.masteredBuffer && track.outBlob)
            .map(track => ({ track, bytes: getTrackBufferBytes(track), sortTime: getTrackSortTime(track) }))
            .sort((a, b) => b.sortTime - a.sortTime);

        if (!policy.retainCompletedPcm || policy.maxRetainedBuffers <= 0 || policy.maxMasteredBufferBytes <= 0) {
            return Object.freeze({ retained: [], release: completedWithBuffers, retainedBytes: 0 });
        }

        const keepIds = new Set();
        if (policy.keepSelected && policy.selectedId) keepIds.add(policy.selectedId);
        completedWithBuffers.slice(0, policy.keepRecent).forEach(item => keepIds.add(item.track.id));

        const retained = [];
        const release = [];
        let retainedBytes = 0;
        for (const item of completedWithBuffers) {
            const protectedById = keepIds.has(item.track.id);
            const underCount = retained.length < policy.maxRetainedBuffers;
            const underBudget = retainedBytes + item.bytes <= policy.maxMasteredBufferBytes;
            if (protectedById && underBudget && retained.length < policy.maxRetainedBuffers) {
                retained.push(item);
                retainedBytes += item.bytes;
            } else if (underCount && underBudget) {
                retained.push(item);
                retainedBytes += item.bytes;
            } else {
                release.push(item);
            }
        }

        return Object.freeze({ retained, release, retainedBytes });
    }

    function releaseCompletedMasteredBuffers(tracks, options = {}) {
        const list = Array.isArray(tracks) ? tracks : [];
        const policy = normalizePolicy(list, options);
        const plan = buildRetentionPlan(list, policy);
        let released = 0;
        let releasedBytes = 0;
        const releasedIds = [];
        plan.release.forEach(({ track, bytes }) => {
            releasedBytes += bytes;
            releasedIds.push(track.id || '');
            track.masteredBuffer = null;
            track.memoryPolicyTouchedAt = Date.now();
            track.memoryPolicyReleasedAt = track.memoryPolicyTouchedAt;
            track.memoryPolicyReleaseReason = policy.reason;
            track.memoryPolicyRetentionMode = policy.retentionMode;
            released += 1;
        });
        plan.retained.forEach(({ track }) => {
            track.memoryPolicyTouchedAt = Date.now();
            track.memoryPolicyRetentionMode = policy.retentionMode;
        });
        return Object.freeze({
            version: VERSION,
            legacyVersion: LEGACY_POLICY_VERSION,
            retentionMode: policy.retentionMode,
            retainCompletedPcm: policy.retainCompletedPcm,
            released,
            releasedBytes,
            releasedIds,
            retainedBuffers: plan.retained.length,
            retainedBytes: plan.retainedBytes,
            selectedId: policy.selectedId,
            keepRecent: policy.keepRecent,
            maxRetainedBuffers: policy.maxRetainedBuffers,
            maxMasteredBufferBytes: policy.maxMasteredBufferBytes,
            largeBatch: policy.largeBatch,
            lowMemory: policy.lowMemory,
            mobile: policy.mobile,
            deviceMemoryGb: policy.deviceMemoryGb,
            batchSize: policy.batchSize,
            reason: policy.reason
        });
    }

    function summarizeTrack(track) {
        return Object.freeze({
            id: track?.id || '',
            name: track?.name || '',
            status: track?.status || '',
            hasMasteredBuffer: Boolean(track?.masteredBuffer),
            masteredBufferBytes: getTrackBufferBytes(track),
            outBlobBytes: getBlobBytes(track?.outBlob),
            previewBlobBytes: getBlobBytes(track?.masterPreviewBlob),
            memoryPolicyReleasedAt: toNumber(track?.memoryPolicyReleasedAt, 0),
            memoryPolicyReleaseReason: track?.memoryPolicyReleaseReason || '',
            memoryPolicyRetentionMode: track?.memoryPolicyRetentionMode || '',
            completedAt: track?.performanceInfo?.completedAt || ''
        });
    }

    function classifyPressure(masteredBufferBytes, heap, policy) {
        const heapLimit = toNumber(heap?.jsHeapSizeLimit, 0);
        const heapUsed = toNumber(heap?.usedJSHeapSize, 0);
        if (masteredBufferBytes > 0 && !policy.retainCompletedPcm) return 'high';
        if (policy.lowMemory && masteredBufferBytes > policy.maxMasteredBufferBytes) return 'high';
        if (heapLimit && heapUsed / heapLimit > 0.82) return 'high';
        if (policy.maxMasteredBufferBytes > 0 && masteredBufferBytes > policy.maxMasteredBufferBytes * 0.85) return 'medium';
        if (heapLimit && heapUsed / heapLimit > 0.68) return 'medium';
        return 'normal';
    }

    function getSnapshot(tracks, options = {}) {
        const list = Array.isArray(tracks) ? tracks : [];
        const policy = normalizePolicy(list, options);
        const completed = list.filter(track => track && track.status === 'done');
        const masteredBuffers = completed.filter(track => track.masteredBuffer);
        const masteredBufferBytes = masteredBuffers.reduce((sum, track) => sum + getTrackBufferBytes(track), 0);
        const outBlobBytes = completed.reduce((sum, track) => sum + getBlobBytes(track.outBlob), 0);
        const previewBlobBytes = list.reduce((sum, track) => sum + getBlobBytes(track?.masterPreviewBlob), 0);
        const heap = global.performance && performance.memory ? {
            jsHeapSizeLimit: toNumber(performance.memory.jsHeapSizeLimit, 0),
            totalJSHeapSize: toNumber(performance.memory.totalJSHeapSize, 0),
            usedJSHeapSize: toNumber(performance.memory.usedJSHeapSize, 0)
        } : null;
        const largestMasteredBuffers = masteredBuffers
            .slice()
            .sort((a, b) => getTrackBufferBytes(b) - getTrackBufferBytes(a))
            .slice(0, 5)
            .map(summarizeTrack);
        const releasedCount = completed.filter(track => track.memoryPolicyReleasedAt && !track.masteredBuffer && track.outBlob).length;
        const pressure = classifyPressure(masteredBufferBytes, heap, policy);
        return Object.freeze({
            version: VERSION,
            legacyVersion: LEGACY_POLICY_VERSION,
            trackCount: list.length,
            completedCount: completed.length,
            masteredBufferCount: masteredBuffers.length,
            masteredBufferBytes,
            outBlobBytes,
            previewBlobBytes,
            totalRetainedBytes: masteredBufferBytes + outBlobBytes + previewBlobBytes,
            releasedCompletedBufferCount: releasedCount,
            selectedId: policy.selectedId,
            pressure,
            policy: Object.freeze({
                retentionMode: policy.retentionMode,
                retainCompletedPcm: policy.retainCompletedPcm,
                keepSelected: policy.keepSelected,
                keepRecent: policy.keepRecent,
                maxRetainedBuffers: policy.maxRetainedBuffers,
                maxMasteredBufferBytes: policy.maxMasteredBufferBytes,
                largeBatch: policy.largeBatch,
                lowMemory: policy.lowMemory,
                mobile: policy.mobile,
                batchSize: policy.batchSize
            }),
            largestMasteredBuffers,
            heap
        });
    }

    function diagnoseCompletedBatch(tracks, options = {}) {
        const before = getSnapshot(tracks, options);
        const policyResult = releaseCompletedMasteredBuffers(tracks, Object.assign({}, options, {
            reason: options.reason || 'batch-memory-diagnostic'
        }));
        const after = getSnapshot(tracks, options);
        const warnings = [];
        if (after.masteredBufferCount > after.policy.maxRetainedBuffers) warnings.push('masteredBuffer retention count above policy');
        if (after.masteredBufferBytes > after.policy.maxMasteredBufferBytes) warnings.push('masteredBuffer bytes above policy budget');
        if (after.pressure === 'high') warnings.push('memory pressure remains high after sweep');
        return Object.freeze({
            version: VERSION,
            legacyVersion: LEGACY_POLICY_VERSION,
            before,
            policyResult,
            after,
            warnings,
            ok: warnings.length === 0
        });
    }

    global.FoxBearMemoryGuardService = Object.freeze({
        version: VERSION,
        legacyVersion: LEGACY_POLICY_VERSION,
        getAudioBufferBytes,
        getTrackOutputBytes,
        normalizePolicy,
        releaseCompletedMasteredBuffers,
        getSnapshot,
        diagnoseCompletedBatch
    });
})(window);
