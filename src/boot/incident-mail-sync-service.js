// FoxBear incident mail history synchronization scheduler - v1.6.85
(function attachFoxBearIncidentMailSync(global) {
    'use strict';

    const ACTIVE_STATUSES = new Set(['pending', 'submitted', 'failed', 'retrying', 'sending', 'status-check-failed']);
    const ACTIVE_POLL_MS = 15000;
    const IDLE_POLL_MS = 30000;
    const HIDDEN_ACTIVE_POLL_MS = 60000;
    const HIDDEN_IDLE_POLL_MS = 120000;
    const MIN_DELAY_MS = 1000;
    const RESUME_MIN_SYNC_GAP_MS = 3000;

    function parseTime(value) {
        const parsed = Date.parse(String(value || ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function isHidden(context = {}) {
        if (typeof context.hidden === 'boolean') return context.hidden;
        return String(context.visibilityState || global.document?.visibilityState || 'visible') === 'hidden';
    }

    function plan(history = [], now = Date.now(), retryAvailability = () => ({ remainingMs: 0 }), context = {}) {
        const items = Array.isArray(history) ? history : [];
        const active = items.some(item => item?.reportId && !item?.terminal && ACTIVE_STATUSES.has(String(item?.status || '')));
        const nextTimes = items.flatMap(item => [item?.nextRetryAt, item?.userRetryAvailableAt])
            .map(parseTime).filter(value => value > now).sort((a, b) => a - b);
        const cooldownRemaining = items.reduce((minimum, item) => {
            const remaining = Math.max(0, Number(retryAvailability(item, now)?.remainingMs || 0));
            return remaining > 0 ? Math.min(minimum, remaining) : minimum;
        }, Number.POSITIVE_INFINITY);
        if (!active && !nextTimes.length && !Number.isFinite(cooldownRemaining)) {
            return Object.freeze({ scheduled: false, delayMs: 0, active: false, shouldSync: false, hidden: isHidden(context) });
        }
        const hidden = isHidden(context);
        let delayMs = active ? (hidden ? HIDDEN_ACTIVE_POLL_MS : ACTIVE_POLL_MS) : (hidden ? HIDDEN_IDLE_POLL_MS : IDLE_POLL_MS);
        if (nextTimes.length) delayMs = Math.min(delayMs, Math.max(MIN_DELAY_MS, nextTimes[0] - now));
        if (Number.isFinite(cooldownRemaining)) delayMs = Math.min(delayMs, Math.max(MIN_DELAY_MS, cooldownRemaining));
        return Object.freeze({ scheduled: true, delayMs, active, shouldSync: active, hidden });
    }

    function createController(options = {}) {
        let timer = 0;
        let latestHistory = [];
        let latestContext = {};
        let disposed = false;
        const setTimer = options.setTimeout || global.setTimeout?.bind(global);
        const clearTimer = options.clearTimeout || global.clearTimeout?.bind(global);
        const documentRef = options.document || global.document;
        function cancel() {
            if (timer && clearTimer) clearTimer(timer);
            timer = 0;
        }
        function schedule(history, context = {}) {
            cancel();
            latestHistory = Array.isArray(history) ? history : [];
            latestContext = context || {};
            const schedulePlan = plan(latestHistory, context.now || Date.now(), context.retryAvailability, {
                hidden: context.hidden,
                visibilityState: context.visibilityState || documentRef?.visibilityState
            });
            if (!schedulePlan.scheduled || !setTimer || disposed) return schedulePlan;
            timer = setTimer(async () => {
                timer = 0;
                const now = Date.now();
                const canSync = schedulePlan.shouldSync && now - Number(latestContext.lastSyncAt || 0) >= 14000;
                if (canSync) await latestContext.sync?.();
                else latestContext.render?.();
            }, schedulePlan.delayMs);
            return schedulePlan;
        }
        async function handleVisibilityChange() {
            if (disposed || documentRef?.visibilityState !== 'visible') return;
            cancel();
            const currentPlan = plan(latestHistory, Date.now(), latestContext.retryAvailability, { hidden: false });
            const elapsed = Date.now() - Number(latestContext.lastSyncAt || 0);
            if (currentPlan.active && elapsed >= RESUME_MIN_SYNC_GAP_MS) await latestContext.sync?.();
            else latestContext.render?.();
            if (!disposed) schedule(latestHistory, latestContext);
        }
        documentRef?.addEventListener?.('visibilitychange', handleVisibilityChange);
        function dispose() {
            disposed = true;
            cancel();
            documentRef?.removeEventListener?.('visibilitychange', handleVisibilityChange);
        }
        return Object.freeze({ schedule, cancel, dispose, hasTimer: () => Boolean(timer), handleVisibilityChange });
    }

    global.FoxBearIncidentMailSync = Object.freeze({
        version: '1.6.85', activeStatuses: ACTIVE_STATUSES, plan, createController,
        intervals: Object.freeze({ active: ACTIVE_POLL_MS, idle: IDLE_POLL_MS, hiddenActive: HIDDEN_ACTIVE_POLL_MS, hiddenIdle: HIDDEN_IDLE_POLL_MS })
    });
})(typeof window !== 'undefined' ? window : globalThis);
