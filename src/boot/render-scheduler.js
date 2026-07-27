// FoxBear render scheduler - v1.4.21
(function attachFoxBearRenderScheduler(global) {
    'use strict';

    const SERVICE_VERSION = '1.6.10-incident-readiness-contract-csp-cache-hardening';
    const DEFAULT_ANALYSIS_DELAY_MS = 90;
    const DEFAULT_BULK_DELAY_MS = 180;

    const state = {
        rafId: 0,
        timerId: 0,
        pending: false,
        inRender: false,
        reasons: new Set(),
        options: {},
        requestedAt: 0,
        lastRenderAt: 0,
        lastReason: '',
        scheduledCount: 0,
        flushedCount: 0,
        delayMs: 0
    };

    let renderCallback = null;
    let contextProvider = null;

    function mergeRenderOptions(base = {}, next = {}) {
        return {
            ...base,
            ...next,
            keepDetailAudio: Boolean(base.keepDetailAudio || next.keepDetailAudio),
            keepPlaying: Boolean(base.keepPlaying || next.keepPlaying),
            autoPlay: Boolean(base.autoPlay || next.autoPlay)
        };
    }

    function getContext() {
        try { return typeof contextProvider === 'function' ? (contextProvider() || {}) : {}; }
        catch (error) { return {}; }
    }

    function getDelay(reason = '', options = {}) {
        if (Number.isFinite(Number(options.delayMs))) return Math.max(0, Number(options.delayMs));
        const text = String(reason || '').toLowerCase();
        const context = getContext();
        if (options.throttle === false || options.immediate) return 0;
        if (context.largeImportActive) return DEFAULT_BULK_DELAY_MS;
        if (text.includes('analysis') || text.includes('import')) return DEFAULT_ANALYSIS_DELAY_MS;
        return 0;
    }

    function getSnapshot() {
        return Object.freeze({
            version: SERVICE_VERSION,
            pending: Boolean(state.pending),
            inRender: Boolean(state.inRender),
            reasons: Array.from(state.reasons),
            scheduledCount: state.scheduledCount,
            flushedCount: state.flushedCount,
            delayMs: state.delayMs,
            lastReason: state.lastReason,
            lastRenderAt: state.lastRenderAt,
            ageMs: state.requestedAt ? Date.now() - state.requestedAt : 0,
            context: getContext()
        });
    }

    function clearTimers() {
        if (state.rafId) {
            global.cancelAnimationFrame(state.rafId);
            state.rafId = 0;
        }
        if (state.timerId) {
            global.clearTimeout(state.timerId);
            state.timerId = 0;
        }
    }

    function flush(reason = 'flush') {
        if (state.inRender) return getSnapshot();
        const options = state.options || {};
        const reasons = Array.from(state.reasons);
        clearTimers();
        state.pending = false;
        state.reasons.clear();
        state.options = {};
        state.delayMs = 0;
        state.inRender = true;
        state.flushedCount += 1;
        state.lastReason = reason || reasons.join(',') || 'scheduled';
        try {
            if (typeof renderCallback === 'function') renderCallback(options);
        } finally {
            state.inRender = false;
            state.lastRenderAt = Date.now();
        }
        return getSnapshot();
    }

    function schedule(reason = 'scheduled', options = {}) {
        if (options.immediate) {
            state.reasons.add(String(reason || 'immediate'));
            state.options = mergeRenderOptions(state.options, options);
            return flush(reason || 'immediate');
        }
        state.pending = true;
        state.scheduledCount += 1;
        state.requestedAt = Date.now();
        state.reasons.add(String(reason || 'scheduled'));
        state.options = mergeRenderOptions(state.options, options);
        const delay = getDelay(reason, options);
        state.delayMs = Math.max(state.delayMs || 0, delay);
        if (state.rafId || state.timerId) return getSnapshot();
        const requestFlush = () => {
            state.timerId = 0;
            state.rafId = global.requestAnimationFrame(() => {
                state.rafId = 0;
                flush(reason || 'scheduled');
            });
        };
        if (delay > 0) state.timerId = global.setTimeout(requestFlush, delay);
        else requestFlush();
        return getSnapshot();
    }

    function register(renderFn, contextFn) {
        renderCallback = typeof renderFn === 'function' ? renderFn : null;
        contextProvider = typeof contextFn === 'function' ? contextFn : null;
        return getSnapshot();
    }

    global.FoxBearRenderScheduler = Object.freeze({
        version: SERVICE_VERSION,
        register,
        schedule,
        flush,
        getSnapshot
    });
})(window);
