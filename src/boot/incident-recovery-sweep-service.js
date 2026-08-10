// FoxBear incident lifecycle recovery sweep coordinator - v1.6.85
(function attachFoxBearIncidentRecoverySweep(global) {
    'use strict';

    const DEFAULT_MAX_REASONS = 6;
    const DEFAULT_MAX_ERRORS = 4;

    function safeNow(now) {
        const value = Number(typeof now === 'function' ? now() : Date.now());
        return Number.isFinite(value) ? value : Date.now();
    }

    function cleanText(value, limit = 120) {
        return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, Math.max(0, Number(limit) || 0));
    }

    function mergeRequests(current = null, incoming = {}, maxReasons = DEFAULT_MAX_REASONS) {
        const previous = current && typeof current === 'object' ? current : {};
        const incomingReasons = Array.isArray(incoming.reasons) ? incoming.reasons : [incoming.reason || 'lifecycle'];
        const reasons = new Set([
            ...(Array.isArray(previous.reasons) ? previous.reasons : []),
            ...incomingReasons.map(reason => cleanText(reason || 'lifecycle', 80))
        ].filter(Boolean));
        return Object.freeze({
            reasons: Object.freeze(Array.from(reasons).slice(-Math.max(1, Number(maxReasons) || DEFAULT_MAX_REASONS))),
            forceService: previous.forceService === true || incoming.forceService === true,
            checkDeployment: previous.checkDeployment === true || incoming.checkDeployment === true
        });
    }

    function normalizeError(error) {
        return cleanText(error?.code || error?.name || error?.message || error || 'recovery-sweep-failed', 120);
    }

    function createController(options = {}) {
        const now = typeof options.now === 'function' ? options.now : Date.now;
        const maxReasons = Math.max(1, Number(options.maxReasons || DEFAULT_MAX_REASONS));
        const maxErrors = Math.max(1, Number(options.maxErrors || DEFAULT_MAX_ERRORS));
        let disposed = false;
        let inFlight = null;
        let pending = null;
        let lastRunAt = 0;
        let lastResult = null;
        let runCount = 0;

        function notifyError(phase, error) {
            if (typeof options.onError !== 'function') return;
            const detail = Object.freeze({ phase: cleanText(phase || 'recovery-sweep', 80), error: normalizeError(error) });
            try {
                const result = options.onError(detail, error);
                if (result && typeof result.catch === 'function') result.catch(() => {});
            } catch (handlerError) {}
        }

        function recordError(errors, phase, error) {
            const normalized = normalizeError(error);
            if (normalized && !errors.includes(normalized) && errors.length < maxErrors) errors.push(normalized);
            notifyError(phase, error);
            return normalized;
        }

        function notifyResult(result) {
            if (typeof options.onResult !== 'function') return;
            try {
                const notified = options.onResult(result);
                if (notified && typeof notified.catch === 'function') notified.catch(error => notifyError('result-handler', error));
            } catch (error) { notifyError('result-handler', error); }
        }

        function readOnline(errors = null) {
            try {
                if (typeof options.isOnline === 'function') return options.isOnline() !== false;
                return global.navigator?.onLine !== false;
            } catch (error) {
                if (Array.isArray(errors)) recordError(errors, 'online-state', error);
                else notifyError('online-state', error);
                return false;
            }
        }

        function readDecision(name, callback, request, fallback, errors) {
            if (typeof callback !== 'function') return fallback === true;
            try { return callback(request) === true; }
            catch (error) {
                recordError(errors, name, error);
                return false;
            }
        }

        function normalizeCount(value, fallback = 0) {
            const numeric = Number(value);
            if (Number.isFinite(numeric)) return Math.max(0, numeric);
            const safeFallback = Number(fallback);
            return Number.isFinite(safeFallback) ? Math.max(0, safeFallback) : 0;
        }

        function readCount(name, callback, fallback, errors) {
            if (typeof callback !== 'function') return normalizeCount(fallback);
            try {
                return normalizeCount(callback(), fallback);
            } catch (error) {
                if (Array.isArray(errors)) recordError(errors, name, error);
                else notifyError(name, error);
                return normalizeCount(fallback);
            }
        }

        async function runPhase(name, enabled, callback, errors) {
            if (!enabled || typeof callback !== 'function') return null;
            try { return await callback(); }
            catch (error) {
                recordError(errors, name, error);
                return null;
            }
        }

        async function executeCycle(request) {
            const startedAt = safeNow(now);
            const reason = request.reasons.join('+') || 'lifecycle';
            const errors = [];
            let queueResult = null;
            let historyResult = null;
            let serviceResult = null;
            let readinessResult = null;
            let serviceChecked = false;
            let readinessChecked = false;
            const online = readOnline(errors);

            if (online) {
                queueResult = await runPhase('queue', true, () => options.flushQueue?.(request), errors);
                historyResult = await runPhase('history', true, () => options.syncHistory?.(request), errors);
                serviceChecked = readDecision('service-decision', options.shouldRefreshService, request, request.forceService === true, errors);
                serviceResult = await runPhase('service', serviceChecked, () => options.refreshService?.(request), errors);
                readinessChecked = readDecision('deployment-decision', options.shouldCheckDeployment, request, request.checkDeployment === true, errors);
                readinessResult = await runPhase('deployment', readinessChecked, () => options.checkDeployment?.(request), errors);
            }

            const completedAt = safeNow(now);
            const queueDelivered = normalizeCount(queueResult?.delivered, 0);
            const queueRemaining = queueResult?.remaining != null
                ? normalizeCount(queueResult.remaining, 0)
                : readCount('queue-count', options.getQueueLength, 0, errors);
            const historyCount = Array.isArray(historyResult)
                ? historyResult.length
                : readCount('history-count', options.getHistoryCount, 0, errors);
            const result = Object.freeze({
                ok: online && errors.length === 0,
                reason,
                mergedReasons: request.reasons,
                checkedAt: new Date(completedAt).toISOString(),
                durationMs: Math.max(0, completedAt - startedAt),
                offline: !online,
                queueDelivered,
                queueRemaining,
                historyCount,
                serviceChecked,
                readinessChecked,
                readinessOk: readinessResult?.ok === true,
                errors: Object.freeze(errors.slice(0, maxErrors))
            });
            lastRunAt = completedAt;
            lastResult = result;
            runCount += 1;
            notifyResult(result);
            return result;
        }

        function run(request = {}) {
            const merged = mergeRequests(null, request, maxReasons);
            if (disposed) {
                const timestamp = safeNow(now);
                return Promise.resolve(Object.freeze({
                    ok: false,
                    disposed: true,
                    offline: !readOnline(),
                    reason: merged.reasons.join('+') || 'lifecycle',
                    mergedReasons: merged.reasons,
                    checkedAt: new Date(timestamp).toISOString(),
                    durationMs: 0,
                    queueDelivered: 0,
                    queueRemaining: readCount('queue-count', options.getQueueLength, 0),
                    historyCount: readCount('history-count', options.getHistoryCount, 0),
                    serviceChecked: false,
                    readinessChecked: false,
                    readinessOk: false,
                    errors: Object.freeze(['recovery-sweep-disposed'])
                }));
            }
            if (inFlight) {
                pending = mergeRequests(pending, request, maxReasons);
                return inFlight;
            }
            const task = (async () => {
                let current = merged;
                let finalResult = null;
                do {
                    pending = null;
                    finalResult = await executeCycle(current);
                    current = disposed ? null : pending;
                } while (current);
                return finalResult;
            })().finally(() => {
                if (inFlight === task) inFlight = null;
                pending = null;
            });
            inFlight = task;
            return task;
        }

        function getState() {
            return Object.freeze({
                inFlight: Boolean(inFlight),
                pendingReasons: Object.freeze([...(pending?.reasons || [])]),
                lastRunAt,
                lastResult,
                runCount,
                disposed
            });
        }

        function dispose() {
            disposed = true;
            pending = null;
        }

        return Object.freeze({ run, getState, dispose, mergeRequests: (current, incoming) => mergeRequests(current, incoming, maxReasons) });
    }

    global.FoxBearIncidentRecoverySweep = Object.freeze({
        version: '1.6.85',
        defaultMaxReasons: DEFAULT_MAX_REASONS,
        defaultMaxErrors: DEFAULT_MAX_ERRORS,
        mergeRequests,
        createController
    });
})(typeof window !== 'undefined' ? window : globalThis);
