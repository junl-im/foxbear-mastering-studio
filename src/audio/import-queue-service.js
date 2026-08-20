// FoxBear import queue service v1.4.28 - reusable analysis queue controller and track orchestration
'use strict';

(function attachFoxBearImportQueueService(global) {
    function normalizeInteger(value, fallback, min, max) {
        const number = Number(value);
        const safe = Number.isFinite(number) ? Math.trunc(number) : fallback;
        return Math.max(min, Math.min(max, safe));
    }

    function normalizeDelay(value, fallback = 90) {
        const number = Number(value);
        return Math.max(0, Number.isFinite(number) ? number : fallback);
    }

    function createImportAnalysisQueue(options = {}) {
        const queue = [];
        const queuedIds = new Set();
        const activeIds = new Set();
        const activeNames = new Map();
        const concurrency = normalizeInteger(options.concurrency, 1, 1, 4);
        const yieldMs = normalizeDelay(options.yieldMs, 90);
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
        const concurrency = normalizeInteger(options.concurrency, 1, 1, 4);
        const largeBatchThreshold = normalizeInteger(options.largeBatchThreshold, 12, 1, 100000);
        const yieldMs = normalizeDelay(options.yieldMs, 90);
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
                version: '1.6.110-ui-mode-early-boot-recovery',
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
            const id = String(track?.id || '');
            if (!track || !id || queuedIds.has(id) || activeTasks.has(id) || track.analysisPromise) return false;
            queuedIds.add(id);
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
                queuedIds.delete(id);
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
                        const taskYieldMs = normalizeInteger(track?.importQueueYieldMs, yieldMs, yieldMs, 5000);
                        schedule(taskYieldMs);
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

    function createImportMemoryPolicy(options = {}) {
        const maxFiles = normalizeInteger(options.maxFiles, 35, 1, 1000);
        const maxFileSize = Math.max(1, Number(options.maxFileSize) || 220 * 1024 * 1024);
        const lowMemoryMaxFiles = normalizeInteger(options.lowMemoryMaxFiles, 10, 1, maxFiles);
        const lowMemoryMaxFileSize = Math.max(32 * 1024 * 1024, Math.min(maxFileSize, Number(options.lowMemoryMaxFileSize) || 128 * 1024 * 1024));
        const lowMemoryBatchBytes = Math.max(lowMemoryMaxFileSize, Number(options.lowMemoryBatchBytes) || 400 * 1024 * 1024);
        const normalYieldMs = normalizeDelay(options.normalYieldMs, 90);
        const lowMemoryYieldMs = Math.max(normalYieldMs, normalizeDelay(options.lowMemoryYieldMs, 200));
        const userAgent = String(options.userAgent ?? global.navigator?.userAgent ?? '');
        const deviceMemoryGb = Math.max(0, Number(options.deviceMemory ?? global.navigator?.deviceMemory ?? 0) || 0);
        const coarsePointer = options.coarsePointer === true;
        const mobile = coarsePointer || /Android|iPhone|iPad|iPod|Mobile|KAKAOTALK/i.test(userAgent);
        const lowMemory = mobile || (deviceMemoryGb > 0 && deviceMemoryGb <= 4);
        return Object.freeze({ lowMemory, mobile, deviceMemoryGb, maxFiles: lowMemory ? lowMemoryMaxFiles : maxFiles, maxFileSize: lowMemory ? lowMemoryMaxFileSize : maxFileSize, maxBatchBytes: lowMemory ? lowMemoryBatchBytes : Number.MAX_SAFE_INTEGER, queueYieldMs: lowMemory ? lowMemoryYieldMs : normalYieldMs, largeBatchThreshold: normalizeInteger(options.largeBatchThreshold, 12, 1, maxFiles), lowMemoryBatchBytes, label: lowMemory ? 'low-memory' : 'standard' });
    }

    function planImportFiles(fileList, currentTrackCount = 0, options = {}, validateFile = () => ({ ok: true })) {
        const policy = createImportMemoryPolicy(options);
        const incoming = Array.from(fileList || []).filter(Boolean);
        const room = Math.max(0, policy.maxFiles - Math.max(0, Number(currentTrackCount) || 0));
        const limited = incoming.slice(0, room);
        const accepted = [], invalidEntries = [], memoryRejected = [];
        let acceptedBytes = 0;
        limited.forEach(file => {
            const validation = validateFile(file, policy) || { ok: false, reason: '파일 검증에 실패했습니다.' };
            if (!validation.ok) return invalidEntries.push({ file, validation });
            const nextBytes = acceptedBytes + Math.max(0, Number(file.size || 0));
            if (nextBytes > policy.maxBatchBytes) return memoryRejected.push(file);
            acceptedBytes = nextBytes;
            accepted.push({ file, validation });
        });
        return Object.freeze({ policy, incoming, accepted, invalidEntries, memoryRejected, acceptedBytes, skippedByLimit: Math.max(0, incoming.length - limited.length), skippedByMemory: memoryRejected.length, largeBatch: accepted.length >= policy.largeBatchThreshold || policy.lowMemory || acceptedBytes >= policy.lowMemoryBatchBytes });
    }

    global.FoxBearImportQueueService = Object.freeze({
        version: '1.6.110-ui-mode-early-boot-recovery',
        createImportAnalysisQueue,
        createTrackAnalysisQueue,
        createImportMemoryPolicy,
        planImportFiles
    });
})(window);
