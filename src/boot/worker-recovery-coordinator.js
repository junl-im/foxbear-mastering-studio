// FoxBear worker recovery coordinator v1.6.63 - safe high-level retries after stalled Worker cancellation
'use strict';

(function attachFoxBearWorkerRecoveryCoordinator(global) {
    const VERSION = '1.6.63-download-filename-review-hardening';
    const handlers = [];

    function normalizeJob(job) {
        if (typeof job === 'string') return Object.freeze({ jobId: job, runId: '', label: '' });
        const value = job && typeof job === 'object' ? job : {};
        return Object.freeze({
            jobId: String(value.jobId || ''),
            runId: String(value.runId || ''),
            label: String(value.label || ''),
            stage: String(value.stage || ''),
            reason: String(value.reason || '')
        });
    }

    function registerHandler(handler = {}) {
        if (typeof handler.match !== 'function' || typeof handler.retry !== 'function') {
            throw new TypeError('Worker 복구 처리기는 match와 retry 함수가 필요합니다.');
        }
        const id = String(handler.id || `handler-${handlers.length + 1}`);
        const next = Object.freeze({
            id,
            match: handler.match,
            canRetry: typeof handler.canRetry === 'function' ? handler.canRetry : () => true,
            retry: handler.retry,
            getKey: typeof handler.getKey === 'function' ? handler.getKey : job => job.jobId
        });
        const previous = handlers.findIndex(item => item.id === id);
        if (previous >= 0) handlers.splice(previous, 1, next);
        else handlers.push(next);
        return next;
    }

    function resolve(job) {
        const normalized = normalizeJob(job);
        if (!normalized.jobId) return null;
        for (const handler of handlers) {
            let match = null;
            try { match = handler.match(normalized); } catch (error) { match = null; }
            if (!match) continue;
            return Object.freeze({ handler, job: normalized, match });
        }
        return null;
    }

    function canRetry(job) {
        const resolved = resolve(job);
        if (!resolved) return false;
        try { return Boolean(resolved.handler.canRetry(resolved.match, resolved.job)); }
        catch (error) { return false; }
    }

    async function retryJob(job, context = {}) {
        const resolved = resolve(job);
        if (!resolved) return Object.freeze({ ok: false, skipped: true, reason: 'unsupported-job', job: normalizeJob(job) });
        if (!canRetry(resolved.job)) return Object.freeze({ ok: false, skipped: true, reason: 'retry-unavailable', job: resolved.job });
        try {
            const value = await resolved.handler.retry(resolved.match, resolved.job, context || {});
            return Object.freeze({ ok: value !== false, skipped: value === false, handlerId: resolved.handler.id, job: resolved.job, value });
        } catch (error) {
            return Object.freeze({ ok: false, skipped: false, handlerId: resolved.handler.id, job: resolved.job, error: String(error?.message || error || 'retry-failed'), errorCode: String(error?.code || '') });
        }
    }

    async function retryJobs(jobs, context = {}) {
        const incoming = Array.isArray(jobs) ? jobs : [];
        const unique = [];
        const seen = new Set();
        incoming.forEach(value => {
            const resolved = resolve(value);
            if (!resolved) {
                unique.push({ value, key: `unsupported:${normalizeJob(value).jobId}` });
                return;
            }
            let key = resolved.job.jobId;
            try { key = `${resolved.handler.id}:${String(resolved.handler.getKey(resolved.match, resolved.job) || resolved.job.jobId)}`; } catch (error) {}
            if (seen.has(key)) return;
            seen.add(key);
            unique.push({ value: resolved.job, key });
        });
        const results = [];
        for (const item of unique) results.push(await retryJob(item.value, context));
        return Object.freeze({
            requestedCount: incoming.length,
            uniqueCount: unique.length,
            startedCount: results.filter(item => item.ok).length,
            skippedCount: results.filter(item => item.skipped).length,
            failedCount: results.filter(item => !item.ok && !item.skipped).length,
            results: Object.freeze(results)
        });
    }

    global.FoxBearWorkerRecoveryCoordinator = Object.freeze({
        version: VERSION,
        registerHandler,
        canRetry,
        retryJob,
        retryJobs,
        getHandlerCount: () => handlers.length
    });
})(window);
