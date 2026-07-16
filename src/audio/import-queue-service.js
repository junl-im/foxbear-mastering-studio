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
        const activeTasks = new Map();
        const concurrency = Math.max(1, Math.min(4, Number(options.concurrency || 1)));
        const largeBatchThreshold = Math.max(1, Number(options.largeBatchThreshold || 12));
        const yieldMs = Math.max(0, Number(options.yieldMs || 90));
        const setTimer = options.setTimeout || global.setTimeout.bind(global);
        const clearTimer = options.clearTimeout || global.clearTimeout.bind(global);
        let timer = null;
        let lastBatchSize = 0;
        let completedCount = 0;
        let failedCount = 0;
        let cancelledCount = 0;
        let generation = 0;
        let lastStatus = 'idle';

        function makeAbortController() {
            if (typeof global.AbortController === 'function') return new global.AbortController();
            const listeners = new Set();
            const signal = {
                aborted: false,
                reason: undefined,
                addEventListener(type, listener) { if (type === 'abort' && typeof listener === 'function') listeners.add(listener); },
                removeEventListener(type, listener) { if (type === 'abort') listeners.delete(listener); }
            };
            return {
                signal,
                abort(reason) {
                    if (signal.aborted) return;
                    signal.aborted = true;
                    signal.reason = reason;
                    listeners.forEach(listener => { try { listener.call(signal, { type: 'abort', target: signal }); } catch (error) {} });
                    listeners.clear();
                }
            };
        }

        function makeAbortError(reason = 'analysis-cancelled') {
            const error = new Error(String(reason || 'analysis-cancelled'));
            error.name = 'AbortError';
            error.code = 'FOXBEAR_ANALYSIS_CANCELLED';
            return error;
        }

        function isAbortError(error) {
            return Boolean(error && (error.name === 'AbortError' || error.code === 'FOXBEAR_ANALYSIS_CANCELLED'));
        }

        function createTask(track) {
            const controller = makeAbortController();
            const id = String(track?.id || track?.name || Math.random().toString(16).slice(2));
            const taskGeneration = generation;
            const task = {
                id,
                track,
                generation: taskGeneration,
                controller,
                signal: controller.signal,
                startedAt: Date.now(),
                cancelled: false,
                cancelReason: '',
                cancel(reason = 'analysis-cancelled') {
                    if (task.cancelled) return false;
                    task.cancelled = true;
                    task.cancelReason = String(reason || 'analysis-cancelled');
                    try { controller.abort(makeAbortError(task.cancelReason)); } catch (error) { controller.abort(); }
                    return true;
                },
                throwIfCancelled() {
                    if (task.cancelled || task.signal?.aborted || task.generation !== generation) throw makeAbortError(task.cancelReason || 'analysis-cancelled');
                }
            };
            return task;
        }

        function getSnapshot() {
            const activeEntries = Array.from(activeTasks.entries());
            return Object.freeze({
                version: '1.5.29-analysis-update-lifecycle',
                active: activeEntries.length,
                pending: queue.length,
                queuedIds: queuedIds.size,
                activeIds: activeEntries.map(([id]) => id),
                activeNames: activeEntries.map(([, task]) => task.track?.name || task.id),
                lastBatchSize,
                completedCount,
                failedCount,
                cancelledCount,
                generation,
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
            if (!track || queuedIds.has(track.id) || activeTasks.has(String(track.id)) || track.analysisPromise) return false;
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

        function cancelTask(task, reason) {
            if (!task || typeof task.cancel !== 'function') return false;
            const changed = task.cancel(reason);
            if (changed && typeof options.onCancel === 'function') {
                try { options.onCancel(task.track, task, getSnapshot()); } catch (error) {}
            }
            return changed;
        }

        function cancelTrack(trackOrId, reason = 'track-removed') {
            const id = String(typeof trackOrId === 'object' ? trackOrId?.id : trackOrId || '');
            if (!id) return getSnapshot();
            let removedPending = 0;
            for (let index = queue.length - 1; index >= 0; index -= 1) {
                if (String(queue[index]?.id || '') !== id) continue;
                queue.splice(index, 1);
                removedPending += 1;
            }
            queuedIds.delete(id);
            const active = activeTasks.get(id);
            if (active) cancelTask(active, reason);
            if (removedPending || active) {
                cancelledCount += removedPending;
                lastStatus = activeTasks.size ? 'cancelling' : (queue.length ? 'queued' : 'idle');
                emitStatus('cancel-track');
            }
            return getSnapshot();
        }

        function cancelAll(reason = 'queue-cleared') {
            generation += 1;
            const pending = queue.length;
            if (timer != null) clearTimer(timer);
            timer = null;
            queue.length = 0;
            queuedIds.clear();
            let activeCancelled = 0;
            activeTasks.forEach(task => { if (cancelTask(task, reason)) activeCancelled += 1; });
            cancelledCount += pending;
            lastStatus = activeTasks.size ? 'cancelling' : 'idle';
            emitStatus('cancel-all');
            return Object.freeze({ ...getSnapshot(), cancelledNow: pending + activeCancelled });
        }

        function runPump() {
            timer = null;
            while (activeTasks.size < concurrency && queue.length) {
                const track = queue.shift();
                if (!track) continue;
                const id = String(track.id);
                queuedIds.delete(track.id);
                if (typeof options.isTrackStillImported === 'function' && !options.isTrackStillImported(track)) continue;
                const task = createTask(track);
                activeTasks.set(id, task);
                lastStatus = 'active';
                const job = Promise.resolve()
                    .then(() => {
                        task.throwIfCancelled();
                        if (typeof options.runTrack !== 'function') throw new Error('Import analysis runTrack callback missing');
                        // Compatibility anchor retained for historical orchestration checks: runTrack(track)
                        return options.runTrack(track, task);
                    });
                track.analysisPromise = job;
                track.analysisTask = task;
                job.then(() => {
                    task.throwIfCancelled();
                    completedCount += 1;
                    lastStatus = 'done';
                }).catch(error => {
                    if (task.cancelled || task.signal?.aborted || isAbortError(error)) {
                        cancelledCount += 1;
                        lastStatus = 'cancelled';
                        return;
                    }
                    failedCount += 1;
                    lastStatus = 'error';
                    if (typeof options.reportTrackAnalysisError === 'function') options.reportTrackAnalysisError(track, error);
                }).catch(error => {
                    if (global.console && console.warn) console.warn('Analysis error handler failed:', error);
                }).finally(() => {
                    if (track.analysisPromise === job) track.analysisPromise = null;
                    if (track.analysisTask === task) track.analysisTask = null;
                    activeTasks.delete(id);
                    const snapshot = getSnapshot();
                    if (snapshot.active || snapshot.pending) {
                        emitStatus('next-track');
                        schedule(yieldMs);
                    } else {
                        lastStatus = 'idle';
                        emitStatus('complete');
                    }
                });
            }
            if (queue.length && activeTasks.size < concurrency) schedule(yieldMs);
            return getSnapshot();
        }

        function clear(reason = 'queue-cleared') {
            return cancelAll(reason);
        }

        return Object.freeze({
            queueTrack,
            queueTracks,
            schedule,
            runPump,
            cancelTrack,
            cancelAll,
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
