// FoxBear memory guard service v1.4.27 - completed-batch buffer policy and diagnostics
'use strict';

(function attachFoxBearMemoryGuardService(global) {
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

    function getTrackBufferBytes(track) {
        return getAudioBufferBytes(track?.masteredBuffer);
    }

    function getBlobBytes(blob) {
        return Math.max(0, toNumber(blob?.size, 0));
    }

    function getTrackSortTime(track) {
        return Math.max(
            toNumber(track?.performanceInfo?.completedAt, 0),
            toNumber(track?.updatedAt, 0),
            toNumber(track?.createdAt, 0)
        );
    }

    function releaseCompletedMasteredBuffers(tracks, options = {}) {
        const list = Array.isArray(tracks) ? tracks : [];
        const selectedId = options.selectedId || '';
        const keepRecent = Math.max(0, Math.floor(toNumber(options.keepRecent, 1)));
        const maxRetainedBuffers = Math.max(1, Math.floor(toNumber(options.maxRetainedBuffers, 2)));
        const completedWithBuffers = list
            .filter(track => track && track.status === 'done' && track.masteredBuffer && track.outBlob)
            .sort((a, b) => getTrackSortTime(b) - getTrackSortTime(a));
        const keepIds = new Set();
        if (selectedId) keepIds.add(selectedId);
        completedWithBuffers.slice(0, keepRecent).forEach(track => keepIds.add(track.id));
        const retainedBefore = completedWithBuffers.length;
        let released = 0;
        let releasedBytes = 0;
        completedWithBuffers.forEach((track, index) => {
            const mustReleaseByCount = index >= maxRetainedBuffers;
            if (!mustReleaseByCount && keepIds.has(track.id)) return;
            if (!mustReleaseByCount && retainedBefore <= maxRetainedBuffers) return;
            releasedBytes += getTrackBufferBytes(track);
            track.masteredBuffer = null;
            track.memoryPolicyReleasedAt = Date.now();
            released += 1;
        });
        return Object.freeze({
            released,
            releasedBytes,
            retainedBuffers: completedWithBuffers.length - released,
            selectedId,
            keepRecent,
            maxRetainedBuffers,
            reason: options.reason || 'completed-batch-policy'
        });
    }

    function getSnapshot(tracks, options = {}) {
        const list = Array.isArray(tracks) ? tracks : [];
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
        return Object.freeze({
            version: '1.4.27-release-cleanup',
            trackCount: list.length,
            completedCount: completed.length,
            masteredBufferCount: masteredBuffers.length,
            masteredBufferBytes,
            outBlobBytes,
            previewBlobBytes,
            selectedId: options.selectedId || '',
            policy: Object.freeze({
                keepSelected: options.keepSelected !== false,
                keepRecent: Math.max(0, Math.floor(toNumber(options.keepRecent, 1))),
                maxRetainedBuffers: Math.max(1, Math.floor(toNumber(options.maxRetainedBuffers, 2)))
            }),
            heap
        });
    }

    global.FoxBearMemoryGuardService = Object.freeze({
        version: '1.4.27-release-cleanup',
        getAudioBufferBytes,
        releaseCompletedMasteredBuffers,
        getSnapshot
    });
})(window);
