// FoxBear worker job service v1.5.42 - cancellable jobs, progress, deadlines, and stale-result isolation
'use strict';

(function attachFoxBearWorkerJobService(global) {
    const VERSION = '1.5.42-zip-worker-cancellation';
    let sequence = 0;

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

    function run(options = {}) {
        const createWorker = options.createWorker;
        if (typeof createWorker !== 'function') return Promise.reject(new Error('워커 생성 함수가 없습니다.'));
        const signal = options.signal || null;
        if (signal?.aborted) return Promise.reject(makeAbortError(signal.reason));
        const jobId = String(options.jobId || createJobId(options.label));
        const timeoutMs = normalizeTimeout(options.timeoutMs, 45000);
        let worker;
        try { worker = createWorker(); }
        catch (error) { return Promise.reject(error); }
        if (!worker) return Promise.reject(new Error('워커를 생성하지 못했습니다.'));

        return new Promise((resolve, reject) => {
            let settled = false;
            let timer = 0;
            let lastProgressPercent = 0;
            const startedAt = Date.now();
            const finish = (callback, value) => {
                if (settled) return;
                settled = true;
                if (timer) global.clearTimeout(timer);
                try { signal?.removeEventListener?.('abort', abort); } catch (error) {}
                try { worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; } catch (error) {}
                try { worker.terminate(); } catch (error) {}
                callback(value);
            };
            const abort = () => finish(reject, makeAbortError(signal?.reason));
            timer = global.setTimeout(() => {
                const error = new Error(`${options.label || '워커'} 시간이 ${Math.round(timeoutMs / 1000)}초를 초과했습니다.`);
                error.code = 'FOXBEAR_WORKER_JOB_TIMEOUT';
                error.jobId = jobId;
                finish(reject, error);
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
                    const progress = Object.freeze({
                        jobId,
                        percent: lastProgressPercent,
                        stage: String(data.stage || options.label || '워커 작업'),
                        detail: String(data.detail || ''),
                        elapsedMs: Math.max(0, Date.now() - startedAt)
                    });
                    try { options.onProgress?.(progress); } catch (error) { console.warn('FoxBear worker progress callback failed:', error); }
                    return;
                }
                finish(resolve, Object.freeze({ jobId, startedAt, completedAt: Date.now(), data }));
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
        run
    });
})(window);
