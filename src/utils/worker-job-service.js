// FoxBear worker job service v1.6.90 - cancellable jobs, health levels, recovery controls, and stale-result isolation
'use strict';

(function attachFoxBearWorkerJobService(global) {
    const VERSION = '1.6.90-engine-control-overlay-isolation-header-contract-recovery';
    let sequence = 0;
    let runSequence = 0;
    const activeJobs = new Map();
    const recentJobs = [];
    const MAX_RECENT_JOBS = 24;
    const STALL_THRESHOLD_MS = 15000;
    const WATCH_THRESHOLD_MS = 8000;
    const TRANSFER_WATCH_BYTES = 128 * 1024 * 1024;
    const TRANSFER_DANGER_BYTES = 256 * 1024 * 1024;
    let peakActiveCount = 0;
    let peakActiveTransferBytes = 0;

    function createJobId(label = 'worker') {
        sequence = (sequence + 1) % 0x7fffffff;
        return `${String(label || 'worker')}:${Date.now().toString(36)}:${sequence.toString(36)}`;
    }

    function makeAbortError(reason = 'worker-job-cancelled') {
        if (reason instanceof Error) return reason;
        const error = new Error(String(reason || 'worker-job-cancelled'));
        error.name = 'AbortError';
        error.code = 'FOXBEAR_WORKER_JOB_CANCELLED';
        return error;
    }

    function isAbortError(error) {
        return Boolean(error && (error.name === 'AbortError' || error.code === 'FOXBEAR_WORKER_JOB_CANCELLED'));
    }

    function normalizeTimeout(value, fallback = 45000) {
        const number = Number(value);
        return Math.max(1000, Math.min(10 * 60 * 1000, Number.isFinite(number) ? number : fallback));
    }

    function estimateRemainingMs(percent, elapsedMs) {
        const value = Math.max(0, Math.min(100, Number(percent) || 0));
        if (value < 1 || value >= 100) return 0;
        return Math.max(0, Math.round((Math.max(0, Number(elapsedMs) || 0) * (100 - value)) / value));
    }

    function normalizeTransferList(values) {
        const unique = [];
        const seen = new Set();
        (Array.isArray(values) ? values : []).forEach(value => {
            if (!value || seen.has(value)) return;
            seen.add(value);
            unique.push(value);
        });
        return unique;
    }

    function getTransferBytes(values) {
        return (Array.isArray(values) ? values : []).reduce((sum, value) => {
            if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) return sum + Math.max(0, Number(value.byteLength || 0));
            if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView?.(value)) return sum + Math.max(0, Number(value.byteLength || 0));
            return sum;
        }, 0);
    }

    function updatePeaks() {
        peakActiveCount = Math.max(peakActiveCount, activeJobs.size);
        const activeBytes = Array.from(activeJobs.values()).reduce((sum, item) => sum + Math.max(0, Number(item.transferBytes || 0)), 0);
        peakActiveTransferBytes = Math.max(peakActiveTransferBytes, activeBytes);
        return activeBytes;
    }

    function rememberCompleted(record, status, detail = {}) {
        const completedAt = Date.now();
        const lastProgressAt = Number(record.lastProgressAt || 0);
        recentJobs.push(Object.freeze({
            runId: record.runId, jobId: record.jobId, label: record.label, status,
            startedAt: record.startedAt, completedAt, elapsedMs: Math.max(0, completedAt - record.startedAt),
            percent: record.percent, stage: record.stage, detail: record.detail,
            lastProgressAt, progressAgeMs: Math.max(0, completedAt - (lastProgressAt || record.startedAt)),
            estimatedRemainingMs: record.estimatedRemainingMs,
            transferCount: record.transferCount, transferBytes: record.transferBytes, ...detail
        }));
        while (recentJobs.length > MAX_RECENT_JOBS) recentJobs.shift();
    }

    function getProgressAge(record, now = Date.now()) {
        return Math.max(0, now - (record.lastProgressAt || record.startedAt));
    }

    function classifyJobHealth(record, now = Date.now()) {
        const progressAgeMs = getProgressAge(record, now);
        if (progressAgeMs >= STALL_THRESHOLD_MS || Number(record.transferBytes || 0) >= TRANSFER_DANGER_BYTES) return 'danger';
        if (progressAgeMs >= WATCH_THRESHOLD_MS || Number(record.transferBytes || 0) >= TRANSFER_WATCH_BYTES) return 'watch';
        return 'normal';
    }

    function classifyOverallHealth(jobs, activeTransferBytes) {
        if (jobs.some(item => item.healthLevel === 'danger') || activeTransferBytes >= TRANSFER_DANGER_BYTES) return 'danger';
        if (jobs.some(item => item.healthLevel === 'watch') || activeTransferBytes >= TRANSFER_WATCH_BYTES || jobs.length >= 3) return 'watch';
        return 'normal';
    }

    function getDiagnostics() {
        const now = Date.now();
        const jobs = Array.from(activeJobs.values()).map(record => {
            const ageMs = Math.max(0, now - record.startedAt);
            const progressAgeMs = getProgressAge(record, now);
            const healthLevel = classifyJobHealth(record, now);
            return Object.freeze({
                runId: record.runId, jobId: record.jobId, label: record.label, status: 'running',
                startedAt: record.startedAt, ageMs, percent: record.percent,
                stage: record.stage, detail: record.detail, estimatedRemainingMs: record.estimatedRemainingMs,
                lastProgressAt: record.lastProgressAt, progressAgeMs, stalled: progressAgeMs >= STALL_THRESHOLD_MS,
                healthLevel, canCancel: typeof record.cancel === 'function',
                transferCount: record.transferCount, transferBytes: record.transferBytes
            });
        });
        const activeTransferBytes = jobs.reduce((sum, item) => sum + Math.max(0, Number(item.transferBytes || 0)), 0);
        const healthLevel = classifyOverallHealth(jobs, activeTransferBytes);
        return Object.freeze({
            version: VERSION, stallThresholdMs: STALL_THRESHOLD_MS, watchThresholdMs: WATCH_THRESHOLD_MS,
            transferWatchBytes: TRANSFER_WATCH_BYTES, transferDangerBytes: TRANSFER_DANGER_BYTES,
            healthLevel, activeCount: jobs.length, activeTransferBytes,
            peakActiveCount, peakActiveTransferBytes, stalledCount: jobs.filter(item => item.stalled).length,
            watchCount: jobs.filter(item => item.healthLevel === 'watch').length,
            dangerCount: jobs.filter(item => item.healthLevel === 'danger').length,
            active: Object.freeze(jobs), recent: Object.freeze(recentJobs.slice())
        });
    }

    function cancelJob(identifier, reason = 'worker-job-manual-cancel') {
        const target = String(identifier || '');
        if (!target) return false;
        const record = Array.from(activeJobs.values()).find(item => item.runId === target || item.jobId === target);
        if (!record || typeof record.cancel !== 'function') return false;
        return record.cancel(reason) !== false;
    }

    function makeRecoveryJobSnapshot(record, now = Date.now()) {
        return Object.freeze({
            runId: record.runId,
            jobId: record.jobId,
            label: record.label,
            stage: record.stage,
            percent: record.percent,
            progressAgeMs: getProgressAge(record, now),
            transferBytes: record.transferBytes,
            healthLevel: classifyJobHealth(record, now)
        });
    }

    function cancelStalledJob(identifier, options = {}) {
        const target = String(identifier || '');
        if (!target) return Object.freeze({ cancelled: false, reason: 'missing-identifier', job: null });
        const now = Date.now();
        const record = Array.from(activeJobs.values()).find(item => item.runId === target || item.jobId === target);
        if (!record) return Object.freeze({ cancelled: false, reason: 'job-not-found', job: null });
        const minimumAgeMs = Math.max(STALL_THRESHOLD_MS, Number(options.minimumAgeMs) || STALL_THRESHOLD_MS);
        if (getProgressAge(record, now) < minimumAgeMs) return Object.freeze({ cancelled: false, reason: 'job-not-stalled', job: makeRecoveryJobSnapshot(record, now) });
        if (typeof record.cancel !== 'function') return Object.freeze({ cancelled: false, reason: 'job-not-cancellable', job: makeRecoveryJobSnapshot(record, now) });
        const reason = String(options.reason || 'performance-diagnostics-stalled-worker-recovery');
        const job = makeRecoveryJobSnapshot(record, now);
        const cancelled = record.cancel(reason) !== false;
        return Object.freeze({ cancelled, reason, job });
    }

    function cancelStalledJobs(options = {}) {
        const now = Date.now();
        const requestedMinimumAgeMs = Number(options.minimumAgeMs);
        const minimumAgeMs = Math.max(STALL_THRESHOLD_MS, Number.isFinite(requestedMinimumAgeMs) ? requestedMinimumAgeMs : STALL_THRESHOLD_MS);
        const reason = String(options.reason || 'performance-diagnostics-stalled-worker-recovery');
        const stalled = Array.from(activeJobs.values()).filter(record => getProgressAge(record, now) >= minimumAgeMs && typeof record.cancel === 'function');
        const cancelled = [];
        stalled.forEach(record => {
            const job = makeRecoveryJobSnapshot(record, now);
            if (record.cancel(reason) !== false) cancelled.push(job);
        });
        return Object.freeze({ cancelledCount: cancelled.length, reason, jobs: Object.freeze(cancelled) });
    }

    function run(options = {}) {
        const createWorker = options.createWorker;
        if (typeof createWorker !== 'function') return Promise.reject(new Error('워커 생성 함수가 없습니다.'));
        const signal = options.signal || null;
        if (signal?.aborted) return Promise.reject(makeAbortError(signal.reason));
        const jobId = String(options.jobId || createJobId(options.label));
        const timeoutMs = normalizeTimeout(options.timeoutMs, 45000);
        const runId = `${jobId}@${(++runSequence).toString(36)}`;
        const label = String(options.label || '오디오 워커');
        let worker;
        try { worker = createWorker(); }
        catch (error) { return Promise.reject(error); }
        if (!worker) return Promise.reject(new Error('워커를 생성하지 못했습니다.'));
        const transferList = normalizeTransferList(options.transfer);
        const record = { runId, jobId, label, startedAt: Date.now(), lastProgressAt: 0, percent: 0, stage: label, detail: '', estimatedRemainingMs: 0, transferCount: transferList.length, transferBytes: getTransferBytes(transferList), cancel: null };
        activeJobs.set(runId, record);
        updatePeaks();

        return new Promise((resolve, reject) => {
            let settled = false;
            let timer = 0;
            let lastProgressPercent = 0;
            const startedAt = record.startedAt;
            const finish = (callback, value, status = callback === resolve ? 'completed' : 'failed') => {
                if (settled) return false;
                settled = true;
                record.cancel = null;
                if (timer) global.clearTimeout(timer);
                try { signal?.removeEventListener?.('abort', abort); } catch (error) {}
                try { worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; } catch (error) {}
                try { worker.terminate(); } catch (error) {}
                activeJobs.delete(runId);
                const failureDetail = status === 'completed' ? {} : {
                    error: String(value?.message || value || ''),
                    errorName: String(value?.name || ''),
                    errorCode: String(value?.code || ''),
                    reason: status === 'cancelled' ? String(signal?.reason?.message || signal?.reason || value?.message || 'worker-job-cancelled') : ''
                };
                rememberCompleted(record, status, failureDetail);
                callback(value);
                return true;
            };
            const abort = () => finish(reject, makeAbortError(signal?.reason), 'cancelled');
            record.cancel = reason => finish(reject, makeAbortError(reason), 'cancelled');
            timer = global.setTimeout(() => {
                const error = new Error(`${options.label || '워커'} 시간이 ${Math.round(timeoutMs / 1000)}초를 초과했습니다.`);
                error.code = 'FOXBEAR_WORKER_JOB_TIMEOUT';
                error.jobId = jobId;
                finish(reject, error, 'timeout');
            }, timeoutMs);
            signal?.addEventListener?.('abort', abort, { once: true });
            worker.onmessage = event => {
                const data = event?.data;
                const responseJobId = data?.__foxbearJobId;
                if (responseJobId && String(responseJobId) !== jobId) return;
                if (data?.type === 'progress' || data?.__foxbearProgress === true) {
                    const rawPercent = Number(data.percent);
                    const normalizedPercent = Math.max(0, Math.min(100, Number.isFinite(rawPercent) ? rawPercent : 0));
                    lastProgressPercent = Math.max(lastProgressPercent, normalizedPercent);
                    const elapsedMs = Math.max(0, Date.now() - startedAt);
                    record.percent = lastProgressPercent;
                    record.stage = String(data.stage || options.label || '워커 작업');
                    record.detail = String(data.detail || '');
                    record.lastProgressAt = Date.now();
                    record.estimatedRemainingMs = estimateRemainingMs(lastProgressPercent, elapsedMs);
                    const progress = Object.freeze({
                        jobId,
                        percent: lastProgressPercent,
                        stage: record.stage,
                        detail: record.detail,
                        elapsedMs,
                        estimatedRemainingMs: record.estimatedRemainingMs
                    });
                    try { options.onProgress?.(progress); } catch (error) { console.warn('FoxBear worker progress callback failed:', error); }
                    return;
                }
                if (data?.ok === false) {
                    const error = new Error(String(data.error || data.message || `${label} 실행 실패`));
                    error.name = String(data.errorName || 'Error');
                    if (data.code) error.code = String(data.code);
                    error.jobId = jobId;
                    error.workerData = data;
                    finish(reject, error, 'failed');
                    return;
                }
                record.percent = 100;
                record.stage = String(data?.stage || record.stage || label);
                record.estimatedRemainingMs = 0;
                finish(resolve, Object.freeze({ jobId, runId, startedAt, completedAt: Date.now(), data }), 'completed');
            };
            worker.onerror = error => {
                const next = new Error(error?.message || `${options.label || '워커'} 실행 오류`);
                next.cause = error;
                next.jobId = jobId;
                finish(reject, next);
            };
            worker.onmessageerror = () => {
                const error = new Error(`${options.label || '워커'} 응답을 읽지 못했습니다.`);
                error.jobId = jobId;
                finish(reject, error);
            };
            if (signal?.aborted) {
                abort();
                return;
            }
            try {
                const payload = Object.assign({}, options.payload || {}, { __foxbearJobId: jobId });
                worker.postMessage(payload, transferList);
            } catch (error) {
                finish(reject, error);
            }
        });
    }

    global.FoxBearWorkerJobService = Object.freeze({
        version: VERSION,
        createJobId,
        makeAbortError,
        isAbortError,
        getDiagnostics,
        cancelJob,
        cancelStalledJob,
        cancelStalledJobs,
        run
    });
})(window);
