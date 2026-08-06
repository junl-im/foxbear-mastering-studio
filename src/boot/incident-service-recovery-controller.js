// FoxBear incident service auto-recovery controller - v1.6.71
(function attachFoxBearIncidentServiceRecovery(global) {
    'use strict';

    const DEFAULT_DELAYS_MS = Object.freeze([5000, 15000, 45000]);
    const DEFAULT_PHASE_TIMEOUTS_MS = Object.freeze({
        service: 22000,
        queue: 30000,
        deployment: 45000
    });
    const DEFAULT_SLOW_PHASE_MS = 4000;
    const TRANSIENT_STATUSES = new Set([
        'client-offline',
        'server-response-blocked',
        'server-network-blocked',
        'server-api-unavailable',
        'server-api-internal',
        'authentication-failed'
    ]);

    function cleanText(value, limit = 160) {
        return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, Math.max(0, Number(limit) || 0));
    }

    function safeNow(now) {
        const value = Number(typeof now === 'function' ? now() : Date.now());
        return Number.isFinite(value) ? value : Date.now();
    }

    function normalizeTimeouts(value = {}) {
        return Object.freeze(Object.fromEntries(Object.entries(DEFAULT_PHASE_TIMEOUTS_MS).map(([phase, fallback]) => {
            const timeout = Number(value?.[phase]);
            return [phase, Number.isFinite(timeout) && timeout > 0 ? Math.max(1, timeout) : fallback];
        })));
    }

    function makeAbortError(reason = 'recovery-aborted', phase = '') {
        const error = new Error(cleanText(reason || 'Incident recovery aborted', 240));
        error.name = 'AbortError';
        error.code = 'FOXBEAR_INCIDENT_RECOVERY_ABORTED';
        error.phase = cleanText(phase, 40);
        return error;
    }

    function makeTimeoutError(phase, timeoutMs) {
        const upper = cleanText(phase || 'phase', 40).replace(/[^a-z0-9]+/gi, '_').toUpperCase();
        const error = new Error(`Incident recovery ${phase} phase timed out after ${timeoutMs}ms`);
        error.name = 'TimeoutError';
        error.code = `FOXBEAR_INCIDENT_RECOVERY_${upper}_TIMEOUT`;
        error.phase = cleanText(phase, 40);
        error.timeoutMs = timeoutMs;
        return error;
    }

    function createFallbackAbortController() {
        const listeners = new Set();
        const signal = {
            aborted: false,
            reason: undefined,
            addEventListener(type, listener, options = {}) {
                if (type !== 'abort' || typeof listener !== 'function') return;
                const wrapped = options?.once
                    ? function onceListener(event) { listeners.delete(wrapped); listener(event); }
                    : listener;
                listeners.add(wrapped);
            },
            removeEventListener(type, listener) {
                if (type === 'abort') listeners.delete(listener);
            }
        };
        return {
            signal,
            abort(reason) {
                if (signal.aborted) return;
                signal.aborted = true;
                signal.reason = reason;
                for (const listener of [...listeners]) {
                    try { listener({ type: 'abort', target: signal }); } catch (error) {}
                }
                listeners.clear();
            }
        };
    }

    function createAbortController(options = {}) {
        const AbortControllerCtor = options.AbortController || global.AbortController;
        try {
            if (typeof AbortControllerCtor === 'function') return new AbortControllerCtor();
        } catch (error) {}
        return createFallbackAbortController();
    }

    function createController(options = {}) {
        const now = typeof options.now === 'function' ? options.now : Date.now;
        const setTimer = options.setTimeout || global.setTimeout?.bind(global);
        const clearTimer = options.clearTimeout || global.clearTimeout?.bind(global);
        const delays = Object.freeze((Array.isArray(options.delaysMs) && options.delaysMs.length ? options.delaysMs : DEFAULT_DELAYS_MS)
            .map(value => Math.max(1, Number(value) || 1)));
        const phaseTimeouts = normalizeTimeouts(options.phaseTimeoutsMs);
        const slowPhaseMs = Math.max(1, Number(options.slowPhaseMs || DEFAULT_SLOW_PHASE_MS));
        let disposed = false;
        let timer = 0;
        let attempt = 0;
        let nextAt = 0;
        let reason = '';
        let inFlight = null;
        let activeAbortController = null;
        let scheduledOptions = null;
        let waitingForOnline = false;
        let suspended = false;
        let lastResult = null;
        let lastProgress = null;
        let runCount = 0;
        let scheduleCount = 0;
        let timeoutCount = 0;
        let abortCount = 0;

        function notifyError(phase, error) {
            if (typeof options.onError !== 'function') return;
            const detail = Object.freeze({
                phase: cleanText(phase || error?.phase || 'service-recovery', 80),
                code: cleanText(error?.code || error?.name || 'recovery-failed', 100),
                message: cleanText(error?.message || error || 'Incident recovery failed', 240)
            });
            try {
                const result = options.onError(detail, error);
                if (result && typeof result.catch === 'function') result.catch(() => {});
            } catch (handlerError) {}
        }

        function notifyProgress(phase, detail = {}) {
            lastProgress = Object.freeze({
                at: new Date(safeNow(now)).toISOString(),
                phase: cleanText(phase || 'idle', 40),
                ...detail
            });
            if (typeof options.onProgress !== 'function') return lastProgress;
            try {
                const result = options.onProgress(lastProgress);
                if (result && typeof result.catch === 'function') result.catch(error => notifyError('progress-handler', error));
            } catch (error) { notifyError('progress-handler', error); }
            return lastProgress;
        }

        function notifyResult(result) {
            lastResult = result;
            if (typeof options.onResult !== 'function') return;
            try {
                const notified = options.onResult(result);
                if (notified && typeof notified.catch === 'function') notified.catch(error => notifyError('result-handler', error));
            } catch (error) { notifyError('result-handler', error); }
        }

        function isOnline() {
            try {
                return typeof options.isOnline === 'function'
                    ? options.isOnline() !== false
                    : global.navigator?.onLine !== false;
            } catch (error) {
                notifyError('online-state', error);
                return false;
            }
        }

        function canRunScheduled() {
            try { return typeof options.shouldRun !== 'function' || options.shouldRun() !== false; }
            catch (error) {
                notifyError('schedule-decision', error);
                return false;
            }
        }

        function isTransient(status = '') {
            if (typeof options.isTransient === 'function') {
                try { return options.isTransient(status) === true; }
                catch (error) { notifyError('transient-decision', error); return false; }
            }
            return TRANSIENT_STATUSES.has(String(status || ''));
        }

        function clearScheduledTimer() {
            if (timer && clearTimer) clearTimer(timer);
            timer = 0;
            nextAt = 0;
            scheduledOptions = null;
        }

        function cancel(cancelOptions = {}) {
            clearScheduledTimer();
            waitingForOnline = false;
            suspended = false;
            if (cancelOptions.abortInFlight === true && activeAbortController && !activeAbortController.signal?.aborted) {
                abortCount += 1;
                activeAbortController.abort(makeAbortError(cancelOptions.reason || 'recovery-cancelled', 'controller'));
            }
            if (cancelOptions.resetAttempt === true) {
                attempt = 0;
                reason = '';
            }
            notifyProgress('cancelled', { resetAttempt: cancelOptions.resetAttempt === true });
            return true;
        }

        function schedule(status = '', scheduleReason = '', runOptions = {}) {
            if (disposed || !isTransient(status) || timer || inFlight) return false;
            reason = cleanText(scheduleReason || status, 120);
            scheduledOptions = Object.freeze({ ...runOptions, automatic: true });
            suspended = false;
            if (!isOnline()) {
                waitingForOnline = true;
                nextAt = 0;
                notifyProgress('waiting-online', { attempt, maxAttempts: delays.length, reason });
                return true;
            }
            waitingForOnline = false;
            if (attempt >= delays.length || typeof setTimer !== 'function') return false;
            const delayMs = delays[attempt];
            attempt += 1;
            scheduleCount += 1;
            nextAt = safeNow(now) + delayMs;
            notifyProgress('scheduled', { attempt, maxAttempts: delays.length, delayMs, nextAt, reason });
            timer = setTimer(() => {
                timer = 0;
                nextAt = 0;
                const nextOptions = scheduledOptions || {};
                scheduledOptions = null;
                if (disposed) return;
                if (!isOnline()) {
                    attempt = Math.max(0, attempt - 1);
                    waitingForOnline = true;
                    notifyProgress('waiting-online', { attempt, maxAttempts: delays.length, reason });
                    return;
                }
                if (!canRunScheduled()) {
                    suspended = true;
                    attempt = 0;
                    reason = '';
                    notifyProgress('suspended', { reason: 'recovery-surface-hidden' });
                    return;
                }
                run({ ...nextOptions, automatic: true }).catch(() => {});
            }, delayMs) || 0;
            return Boolean(timer);
        }

        async function runPhase(phase, callback, context, phaseDurations, slowPhases) {
            if (typeof callback !== 'function') return null;
            if (context.signal?.aborted) throw context.signal.reason || makeAbortError('recovery-aborted', phase);
            const startedAt = safeNow(now);
            const timeoutMs = phaseTimeouts[phase] || DEFAULT_PHASE_TIMEOUTS_MS[phase] || 30000;
            notifyProgress(phase, { state: 'active', timeoutMs });
            let timeoutTimer = 0;
            let abortListener = null;
            let settled = false;
            const work = Promise.resolve().then(() => callback(Object.freeze({ ...context, phase, timeoutMs })));
            const guarded = new Promise((resolve, reject) => {
                const finish = (handler, value) => {
                    if (settled) return;
                    settled = true;
                    if (timeoutTimer && clearTimer) clearTimer(timeoutTimer);
                    if (abortListener && context.signal?.removeEventListener) context.signal.removeEventListener('abort', abortListener);
                    handler(value);
                };
                abortListener = () => finish(reject, context.signal?.reason || makeAbortError('recovery-aborted', phase));
                context.signal?.addEventListener?.('abort', abortListener, { once: true });
                if (setTimer) {
                    timeoutTimer = setTimer(() => {
                        const error = makeTimeoutError(phase, timeoutMs);
                        timeoutCount += 1;
                        if (!context.signal?.aborted) context.abortController.abort(error);
                        finish(reject, error);
                    }, timeoutMs) || 0;
                }
                work.then(value => finish(resolve, value), error => finish(reject, error));
            });
            try {
                const value = await guarded;
                const durationMs = Math.max(0, safeNow(now) - startedAt);
                phaseDurations[phase] = durationMs;
                if (durationMs >= slowPhaseMs) slowPhases.push(phase);
                notifyProgress(phase, { state: 'ok', durationMs });
                return value;
            } catch (error) {
                const durationMs = Math.max(0, safeNow(now) - startedAt);
                phaseDurations[phase] = durationMs;
                if (durationMs >= slowPhaseMs && !slowPhases.includes(phase)) slowPhases.push(phase);
                notifyProgress(phase, { state: 'error', durationMs, code: cleanText(error?.code || error?.name || '', 100) });
                throw error;
            }
        }

        function classifyFailure(error) {
            const code = cleanText(error?.code || error?.name || 'recovery-failed', 100);
            const message = cleanText(error?.message || error || 'Incident recovery failed', 240);
            let status = '';
            try {
                status = typeof options.classifyFailure === 'function'
                    ? cleanText(options.classifyFailure(code, code, message), 80)
                    : '';
            } catch (classificationError) { notifyError('failure-classification', classificationError); }
            return { code, message, status };
        }

        function run(runOptions = {}) {
            if (disposed) return Promise.reject(makeAbortError('recovery-controller-disposed', 'controller'));
            if (inFlight) return inFlight;
            if (runOptions.manual === true) attempt = 0;
            clearScheduledTimer();
            waitingForOnline = false;
            suspended = false;
            const startedAt = safeNow(now);
            const phaseDurations = {};
            const slowPhases = [];
            const abortController = createAbortController(options);
            activeAbortController = abortController;
            let retryRequest = null;
            const task = (async () => {
                runCount += 1;
                if (!isOnline()) throw Object.assign(new Error('Browser is offline'), { code: 'FOXBEAR_INCIDENT_CLIENT_OFFLINE' });
                const context = Object.freeze({
                    signal: abortController.signal,
                    abortController,
                    automatic: runOptions.automatic === true,
                    manual: runOptions.manual === true,
                    checkDeployment: runOptions.checkDeployment !== false
                });
                const service = await runPhase('service', options.refreshService, context, phaseDurations, slowPhases);
                const queue = await runPhase('queue', options.flushQueue, context, phaseDurations, slowPhases);
                let readiness = null;
                if (runOptions.checkDeployment !== false) {
                    readiness = await runPhase('deployment', options.checkDeployment, context, phaseDurations, slowPhases);
                }
                attempt = 0;
                reason = '';
                const completedAt = safeNow(now);
                const result = Object.freeze({
                    ok: true,
                    checkedAt: new Date(completedAt).toISOString(),
                    durationMs: Math.max(0, completedAt - startedAt),
                    queueDelivered: Math.max(0, Number(queue?.delivered || 0)),
                    queueRemaining: Math.max(0, Number(queue?.remaining || 0)),
                    readinessOk: readiness?.ok === true,
                    phaseDurations: Object.freeze({ ...phaseDurations }),
                    slowPhases: Object.freeze([...slowPhases]),
                    timedOutPhase: '',
                    aborted: false,
                    service,
                    queue,
                    readiness
                });
                notifyResult(result);
                notifyProgress('complete', { state: 'ok', durationMs: result.durationMs });
                return result;
            })().catch(error => {
                const failure = classifyFailure(error);
                const completedAt = safeNow(now);
                const timedOutPhase = error?.name === 'TimeoutError' ? cleanText(error?.phase || '', 40) : '';
                const aborted = error?.name === 'AbortError' || failure.code === 'FOXBEAR_INCIDENT_RECOVERY_ABORTED';
                let queueRemaining = 0;
                try { queueRemaining = Math.max(0, Number(options.getQueueLength?.() || 0)); }
                catch (queueCountError) { notifyError('queue-count', queueCountError); }
                const result = Object.freeze({
                    ok: false,
                    checkedAt: new Date(completedAt).toISOString(),
                    durationMs: Math.max(0, completedAt - startedAt),
                    code: failure.code,
                    reason: failure.message,
                    status: failure.status,
                    timedOutPhase,
                    aborted,
                    queueDelivered: 0,
                    queueRemaining,
                    phaseDurations: Object.freeze({ ...phaseDurations }),
                    slowPhases: Object.freeze([...slowPhases])
                });
                notifyResult(result);
                notifyError(timedOutPhase ? `${timedOutPhase}-timeout` : 'run', error);
                if (!aborted && runOptions.schedule !== false && isTransient(failure.status)) {
                    retryRequest = { status: failure.status, reason: failure.code || failure.message, options: { checkDeployment: runOptions.checkDeployment !== false } };
                }
                throw error;
            }).finally(() => {
                if (inFlight === task) inFlight = null;
                if (activeAbortController === abortController) activeAbortController = null;
                if (retryRequest && !disposed) schedule(retryRequest.status, retryRequest.reason, retryRequest.options);
            });
            inFlight = task;
            return task;
        }

        function resumeOnline(runOptions = {}) {
            if (disposed || !waitingForOnline || !isOnline()) return false;
            waitingForOnline = false;
            return run({ ...runOptions, automatic: true }).catch(() => {}) || true;
        }

        function getState() {
            return Object.freeze({
                attempt,
                maxAttempts: delays.length,
                nextAt,
                reason,
                inFlight: Boolean(inFlight),
                scheduled: Boolean(timer),
                waitingForOnline,
                suspended,
                disposed,
                lastResult,
                lastProgress,
                runCount,
                scheduleCount,
                timeoutCount,
                abortCount,
                phaseTimeouts
            });
        }

        function dispose() {
            if (disposed) return;
            disposed = true;
            cancel({ abortInFlight: true, resetAttempt: true, reason: 'recovery-controller-disposed' });
        }

        return Object.freeze({
            schedule,
            run,
            resumeOnline,
            cancel,
            dispose,
            getState,
            isTransient
        });
    }

    global.FoxBearIncidentServiceRecovery = Object.freeze({
        version: '1.6.71',
        defaultDelaysMs: DEFAULT_DELAYS_MS,
        defaultPhaseTimeoutsMs: DEFAULT_PHASE_TIMEOUTS_MS,
        defaultSlowPhaseMs: DEFAULT_SLOW_PHASE_MS,
        transientStatuses: Object.freeze([...TRANSIENT_STATUSES]),
        createController
    });
})(typeof window !== 'undefined' ? window : globalThis);
