// FoxBear import queue service v1.4.28 - reusable analysis queue controller and track orchestration
'use strict';

(function attachFoxBearImportQueueService(global) {
    function createImportAnalysisQueue(options = {}) {
        const queue = [];
        const queuedIds = new Set();
        const activeIds = new Set();
        const activeNames = new Map();
        const concurrency = Math.max(1, Math.min(4, Number(options.concurrency || 1)));
        const yieldMs = Math.max(0, Number(options.yieldMs || 90));
        const setTimer = options.setTimeout || global.setTimeout.bind(global);
        const clearTimer = options.clearTimeout || global.clearTimeout.bind(global);
        let timer = 0;
        let lastBatchSize = 0;
        let completedCount = 0;
        let failedCount = 0;
        let lastStatus = 'idle';

        function getId(item) {
            return String(item?.id || item?.name || Math.random().toString(16).slice(2));
        }

        function getSnapshot() {
            return Object.freeze({
                version: '1.4.28-app-slimdown',
                active: activeIds.size,
                pending: queue.length,
                queuedIds: queuedIds.size,
                activeIds: Array.from(activeIds),
                activeNames: Array.from(activeNames.values()),
                concurrency,
                yieldMs,
                lastBatchSize,
                completedCount,
                failedCount,
                lastStatus
            });
        }

        function schedule(delay = yieldMs) {
            if (timer) return getSnapshot();
            timer = setTimer(runPump, Math.max(0, delay));
            return getSnapshot();
        }

        function queueItems(items) {
            const list = Array.isArray(items) ? items.filter(Boolean) : [];
            lastBatchSize = list.length;
            let added = 0;
            list.forEach(item => {
                const id = getId(item);
                if (queuedIds.has(id) || activeIds.has(id)) return;
                queuedIds.add(id);
                queue.push(item);
                added += 1;
            });
            if (added) {
                lastStatus = 'queued';
                schedule(0);
            }
            return getSnapshot();
        }

        async function runOne(item) {
            const id = getId(item);
            queuedIds.delete(id);
            activeIds.add(id);
            activeNames.set(id, item?.name || id);
            lastStatus = 'active';
            try {
                if (typeof options.runItem === 'function') await options.runItem(item, getSnapshot());
                completedCount += 1;
                lastStatus = 'done';
            } catch (error) {
                failedCount += 1;
                lastStatus = 'error';
                if (typeof options.onError === 'function') options.onError(error, item, getSnapshot());
            } finally {
                activeIds.delete(id);
                activeNames.delete(id);
                if (queue.length) schedule(yieldMs);
            }
        }

        function runPump() {
            timer = 0;
            while (activeIds.size < concurrency && queue.length) {
                const item = queue.shift();
                runOne(item);
            }
            if (queue.length && activeIds.size < concurrency) schedule(yieldMs);
            return getSnapshot();
        }

        function clear() {
            if (timer) clearTimer(timer);
            timer = 0;
            queue.length = 0;
            queuedIds.clear();
            lastStatus = activeIds.size ? 'active' : 'idle';
            return getSnapshot();
        }

        return Object.freeze({
            queueItems,
            schedule,
            runPump,
            clear,
            getSnapshot
        });
    }

    function createTrackAnalysisQueue(options = {}) {
        const queue = [];
        const queuedIds = new Set();
        const concurrency = Math.max(1, Math.min(4, Number(options.concurrency || 1)));
        const largeBatchThreshold = Math.max(1, Number(options.largeBatchThreshold || 12));
        const yieldMs = Math.max(0, Number(options.yieldMs || 90));
        const setTimer = options.setTimeout || global.setTimeout.bind(global);
        const clearTimer = options.clearTimeout || global.clearTimeout.bind(global);
        let activeCount = 0;
        let timer = null;
        let lastBatchSize = 0;
        let completedCount = 0;
        let failedCount = 0;
        let lastStatus = 'idle';

        function getSnapshot() {
            return Object.freeze({
                version: '1.4.28-app-slimdown',
                active: activeCount,
                pending: queue.length,
                queuedIds: queuedIds.size,
                lastBatchSize,
                completedCount,
                failedCount,
                lastStatus,
                concurrency,
                largeBatchThreshold,
                yieldMs,
                renderQueue: typeof options.getRenderQueue === 'function' ? options.getRenderQueue() : null
            });
        }

        function emitStatus(context = '') {
            const snapshot = getSnapshot();
            if (typeof options.onStatus === 'function') options.onStatus(snapshot, context);
            return snapshot;
        }

        function schedule(delayMs = yieldMs) {
            if (timer != null) return getSnapshot();
            timer = setTimer(runPump, Math.max(0, delayMs));
            return getSnapshot();
        }

        function queueTrack(track) {
            if (!track || queuedIds.has(track.id) || track.analysisPromise) return false;
            queuedIds.add(track.id);
            queue.push(track);
            if (!track.status || track.status === 'queued') {
                track.status = 'queued';
                track.progress = Math.max(0, Math.min(9, Number(track.progress) || 0));
                track.report = track.report || 'Analysis queue registered';
            }
            return true;
        }

        function queueTracks(tracks, queueOptions = {}) {
            const items = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
            if (!items.length) return getSnapshot();
            lastBatchSize = items.length;
            let queued = 0;
            items.forEach(track => {
                if (queueTrack(track)) queued += 1;
            });
            if (queued) {
                lastStatus = 'queued';
                const message = queueOptions.largeBatch
                    ? `${queued} tracks registered in the safe analysis queue. concurrency=${concurrency}.`
                    : `${queued} tracks registered in the analysis queue.`;
                emitStatus(message);
                schedule(0);
            }
            return getSnapshot();
        }

        function runPump() {
            timer = null;
            while (activeCount < concurrency && queue.length) {
                const track = queue.shift();
                if (!track) continue;
                queuedIds.delete(track.id);
                if (typeof options.isTrackStillImported === 'function' && !options.isTrackStillImported(track)) continue;
                activeCount += 1;
                lastStatus = 'active';
                const job = Promise.resolve()
                    .then(() => {
                        if (typeof options.runTrack !== 'function') throw new Error('Import analysis runTrack callback missing');
                        return options.runTrack(track);
                    });
                track.analysisPromise = job;
                job.then(() => {
                    completedCount += 1;
                    lastStatus = 'done';
                }).catch(error => {
                    failedCount += 1;
                    lastStatus = 'error';
                    if (typeof options.reportTrackAnalysisError === 'function') options.reportTrackAnalysisError(track, error);
                }).catch(error => {
                    if (global.console && console.warn) console.warn('Analysis error handler failed:', error);
                }).finally(() => {
                    if (track.analysisPromise === job) track.analysisPromise = null;
                    activeCount = Math.max(0, activeCount - 1);
                    const snapshot = getSnapshot();
                    if (snapshot.active || snapshot.pending) {
                        emitStatus('next-track');
                        schedule(yieldMs);
                    } else {
                        emitStatus('complete');
                    }
                });
            }
            if (queue.length && activeCount < concurrency) schedule(yieldMs);
            return getSnapshot();
        }

        function clear() {
            if (timer != null) clearTimer(timer);
            timer = null;
            queue.length = 0;
            queuedIds.clear();
            lastStatus = activeCount ? 'active' : 'idle';
            return getSnapshot();
        }

        return Object.freeze({
            queueTrack,
            queueTracks,
            schedule,
            runPump,
            clear,
            getSnapshot
        });
    }

    global.FoxBearImportQueueService = Object.freeze({
        version: '1.4.28-app-slimdown',
        createImportAnalysisQueue,
        createTrackAnalysisQueue
    });
})(window);
