// FoxBear worker job service v1.5.92 - cancellable jobs, progress, deadlines, and stale-result isolation
'use strict';

(function attachFoxBearWorkerJobService(global) {
    const VERSION = '1.5.92-python-bytecode-ci-hygiene-node24-cache';
    let sequence = 0;
    let runSequence = 0;
    const activeJobs = new Map();
    const recentJobs = [];
    const MAX_RECENT_JOBS = 24;

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

    function rememberCompleted(record, status, detail = {}) {
        const completedAt = Date.now();
        recentJobs.push(Object.freeze({
            runId: record.runId, jobId: record.jobId, label: record.label, status,
            startedAt: record.startedAt, completedAt, elapsedMs: Math.max(0, completedAt - record.startedAt),
            percent: record.percent, stage: record.stage, ...detail
        }));
        while (recentJobs.length > MAX_RECENT_JOBS) recentJobs.shift();
    }

    function getDiagnostics() {
        const now = Date.now();
        const jobs = Array.from(activeJobs.values()).map(record => Object.freeze({
            runId: record.runId, jobId: record.jobId, label: record.label, status: 'running',
            startedAt: record.startedAt, ageMs: Math.max(0, now - record.startedAt), percent: record.percent,
            stage: record.stage, detail: record.detail, estimatedRemainingMs: record.estimatedRemainingMs,
            lastProgressAt: record.lastProgressAt
        }));
        return Object.freeze({
            version: VERSION, activeCount: jobs.length,
            active: Object.freeze(jobs), recent: Object.freeze(recentJobs.slice())
        });
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
        const record = { runId, jobId, label, startedAt: Date.now(), lastProgressAt: 0, percent: 0, stage: label, detail: '', estimatedRemainingMs: 0 };
        activeJobs.set(runId, record);

        return new Promise((resolve, reject) => {
            let settled = false;
            let timer = 0;
            let lastProgressPercent = 0;
            const startedAt = record.startedAt;
            const finish = (callback, value, status = callback === resolve ? 'completed' : 'failed') => {
                if (settled) return;
                settled = true;
                if (timer) global.clearTimeout(timer);
                try { signal?.removeEventListener?.('abort', abort); } catch (error) {}
                try { worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; } catch (error) {}
                try { worker.terminate(); } catch (error) {}
                activeJobs.delete(runId);
                rememberCompleted(record, status, status === 'failed' ? { error: String(value?.message || value || '') } : {});
                callback(value);
            };
            const abort = () => finish(reject, makeAbortError(signal?.reason), 'cancelled');
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
                worker.postMessage(payload, Array.isArray(options.transfer) ? options.transfer : []);
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
        run
    });
})(window);
