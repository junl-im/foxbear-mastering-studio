// FoxBear adaptive incident transport route policy - v1.6.70
(function attachFoxBearIncidentRoutePolicy(global) {
    'use strict';

    const STORAGE_KEY = 'foxbear-incident-reporter-v1:route-health';
    const SCHEMA_VERSION = 5;
    const ROUTES = Object.freeze(['callable', 'hosting-rewrite']);
    const FAILURE_THRESHOLD = 2;
    const BASE_COOLDOWN_MS = 2 * 60 * 1000;
    const MAX_COOLDOWN_MS = 15 * 60 * 1000;
    const NETWORK_DECAY_FACTOR = 0.5;
    const EXPLORATION_ATTEMPTS = 4;
    const TIME_DECAY_INTERVAL_MS = 24 * 60 * 60 * 1000;
    const TIME_DECAY_FACTOR = 0.85;

    function clean(value, max = 80) { return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
    function storageGet() { try { return global.localStorage?.getItem?.(STORAGE_KEY) || ''; } catch (error) { return ''; } }
    function storageSet(value) { try { global.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(value)); return true; } catch (error) { return false; } }
    function resolveNow(now = Date.now()) { const value = Number(now); return Number.isFinite(value) && value >= 0 ? value : Date.now(); }
    function isoAt(now = Date.now()) { return new Date(resolveNow(now)).toISOString(); }
    function blankRoute() { return { successes: 0, failures: 0, consecutiveTransientFailures: 0, cooldownUntil: 0, lastSuccessAt: '', lastFailureAt: '', lastFailureCode: '' }; }
    function blankExploration() { return { remaining: 0, nextRoute: 'callable', startedAt: '', lastAttemptAt: '', reason: '' }; }
    function safeCount(value) { const number = Number(value || 0); return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0; }
    function normalizeRoute(value) {
        const source = value && typeof value === 'object' ? value : {};
        return { successes: safeCount(source.successes), failures: safeCount(source.failures), consecutiveTransientFailures: safeCount(source.consecutiveTransientFailures), cooldownUntil: Math.max(0, Number(source.cooldownUntil || 0) || 0), lastSuccessAt: clean(source.lastSuccessAt, 40), lastFailureAt: clean(source.lastFailureAt, 40), lastFailureCode: clean(source.lastFailureCode, 80) };
    }
    function normalizeRouteName(route) { const value = clean(route, 40).toLowerCase(); return ROUTES.includes(value) ? value : ''; }
    function normalizeExploration(value) {
        const source = value && typeof value === 'object' ? value : {};
        return {
            remaining: Math.min(EXPLORATION_ATTEMPTS, safeCount(source.remaining)),
            nextRoute: normalizeRouteName(source.nextRoute) || 'callable',
            startedAt: clean(source.startedAt, 40),
            lastAttemptAt: clean(source.lastAttemptAt, 40),
            reason: clean(source.reason, 80)
        };
    }
    function currentNetworkKey() {
        const connection = global.navigator?.connection || global.navigator?.mozConnection || global.navigator?.webkitConnection;
        return clean([global.navigator?.onLine === false ? 'offline' : 'online', connection?.type || '', connection?.effectiveType || '', connection?.saveData ? 'save-data' : 'normal-data'].join('|'), 100);
    }
    function blankState() { return { schemaVersion: SCHEMA_VERSION, updatedAt: '', lastDecayAt: '', networkKey: currentNetworkKey(), networkChangedAt: '', exploration: blankExploration(), routes: Object.fromEntries(ROUTES.map(route => [route, blankRoute()])) }; }
    function load() {
        try {
            const parsed = JSON.parse(storageGet() || 'null');
            const state = blankState();
            state.updatedAt = clean(parsed?.updatedAt, 40);
            state.lastDecayAt = clean(parsed?.lastDecayAt, 40);
            state.networkKey = clean(parsed?.networkKey, 100) || currentNetworkKey();
            state.networkChangedAt = clean(parsed?.networkChangedAt, 40);
            state.exploration = normalizeExploration(parsed?.exploration);
            for (const route of ROUTES) state.routes[route] = normalizeRoute(parsed?.routes?.[route]);
            return state;
        } catch (error) { return blankState(); }
    }
    function save(state, now = Date.now()) {
        const safe = blankState();
        safe.updatedAt = isoAt(now);
        safe.lastDecayAt = clean(state?.lastDecayAt, 40);
        safe.networkKey = clean(state?.networkKey, 100) || currentNetworkKey();
        safe.networkChangedAt = clean(state?.networkChangedAt, 40);
        safe.exploration = normalizeExploration(state?.exploration);
        for (const route of ROUTES) safe.routes[route] = normalizeRoute(state?.routes?.[route]);
        storageSet(safe);
        return safe;
    }
    function startExploration(state, reason = 'network-change', now = Date.now()) {
        state.exploration = {
            remaining: EXPLORATION_ATTEMPTS,
            nextRoute: 'callable',
            startedAt: isoAt(now),
            lastAttemptAt: '',
            reason: clean(reason, 80)
        };
        return state;
    }
    function decayForElapsedTime(state, now = Date.now()) {
        const timestamp = resolveNow(now);
        const previous = Date.parse(String(state?.lastDecayAt || state?.updatedAt || ''));
        if (!Number.isFinite(previous)) {
            state.lastDecayAt = isoAt(timestamp);
            return true;
        }
        const elapsed = Math.max(0, timestamp - previous);
        const steps = Math.min(8, Math.floor(elapsed / TIME_DECAY_INTERVAL_MS));
        if (steps <= 0) return false;
        const factor = TIME_DECAY_FACTOR ** steps;
        for (const route of ROUTES) {
            const item = normalizeRoute(state.routes[route]);
            item.successes = Math.floor(item.successes * factor);
            item.failures = Math.floor(item.failures * factor);
            state.routes[route] = item;
        }
        state.lastDecayAt = isoAt(timestamp);
        return true;
    }
    function decayForNetworkChange(state, now = Date.now()) {
        const nextKey = currentNetworkKey();
        if (!nextKey || !state.networkKey || nextKey === state.networkKey) return false;
        for (const route of ROUTES) {
            const item = normalizeRoute(state.routes[route]);
            item.successes = Math.floor(item.successes * NETWORK_DECAY_FACTOR);
            item.failures = Math.floor(item.failures * NETWORK_DECAY_FACTOR);
            item.consecutiveTransientFailures = 0;
            item.cooldownUntil = 0;
            state.routes[route] = item;
        }
        state.networkKey = nextKey;
        state.networkChangedAt = isoAt(now);
        startExploration(state, 'network-change', now);
        return true;
    }
    function prepareState(now = Date.now()) {
        const timestamp = resolveNow(now);
        let state = load();
        const timeChanged = decayForElapsedTime(state, timestamp);
        const networkChanged = decayForNetworkChange(state, timestamp);
        if (timeChanged || networkChanged) state = save(state, timestamp);
        return state;
    }
    function errorCode(error) { return clean(error?.code || error?.name || error || '', 80); }
    function isTransientFailure(error) {
        const evidence = `${errorCode(error)} ${clean(error?.message || '', 180)}`;
        return /unavailable|timeout|timed out|network|failed to fetch|load failed|cors|response blocked|same.origin|resource-exhausted|aborted|connection/i.test(evidence) && !/permission|unauthenticated|invalid-argument|not-found|unimplemented|secret|smtp-auth/i.test(evidence);
    }
    function getHealth(now = Date.now()) {
        const timestamp = resolveNow(now);
        const state = prepareState(timestamp);
        const routes = {};
        for (const route of ROUTES) {
            const item = normalizeRoute(state.routes[route]);
            const remainingMs = Math.max(0, item.cooldownUntil - timestamp);
            routes[route] = Object.freeze({ ...item, coolingDown: remainingMs > 0, remainingMs, remainingSeconds: Math.ceil(remainingMs / 1000) });
        }
        const exploration = normalizeExploration(state.exploration);
        return Object.freeze({
            schemaVersion: SCHEMA_VERSION,
            updatedAt: state.updatedAt,
            lastDecayAt: state.lastDecayAt,
            networkKey: state.networkKey,
            networkChangedAt: state.networkChangedAt,
            exploration: Object.freeze({ ...exploration, active: exploration.remaining > 0 }),
            routes: Object.freeze(routes)
        });
    }
    function shouldAttempt(route, now = Date.now()) { const key = normalizeRouteName(route); return !key || getHealth(now).routes[key].coolingDown !== true; }
    function recordAttempt(route, now = Date.now()) {
        const key = normalizeRouteName(route); if (!key) return getHealth(now);
        const timestamp = resolveNow(now);
        let state = prepareState(timestamp);
        const exploration = normalizeExploration(state.exploration);
        if (exploration.remaining > 0) {
            exploration.remaining = Math.max(0, exploration.remaining - 1);
            exploration.nextRoute = key === 'callable' ? 'hosting-rewrite' : 'callable';
            exploration.lastAttemptAt = isoAt(timestamp);
            state.exploration = exploration;
            state = save(state, timestamp);
        }
        return getHealth(timestamp);
    }
    function recordSuccess(route, now = Date.now()) {
        const key = normalizeRouteName(route); if (!key) return getHealth(now);
        const timestamp = resolveNow(now);
        let state = prepareState(timestamp); const item = normalizeRoute(state.routes[key]);
        item.successes += 1; item.consecutiveTransientFailures = 0; item.cooldownUntil = 0; item.lastSuccessAt = isoAt(timestamp); state.routes[key] = item; state = save(state, timestamp); return getHealth(timestamp);
    }
    function recordFailure(route, error, now = Date.now()) {
        const key = normalizeRouteName(route); if (!key) return getHealth(now);
        const timestamp = resolveNow(now);
        let state = prepareState(timestamp); const item = normalizeRoute(state.routes[key]); const transient = isTransientFailure(error);
        item.failures += 1; item.lastFailureAt = isoAt(timestamp); item.lastFailureCode = errorCode(error); item.consecutiveTransientFailures = transient ? item.consecutiveTransientFailures + 1 : 0;
        if (transient && item.consecutiveTransientFailures >= FAILURE_THRESHOLD) { const exponent = Math.min(3, item.consecutiveTransientFailures - FAILURE_THRESHOLD); item.cooldownUntil = timestamp + Math.min(MAX_COOLDOWN_MS, BASE_COOLDOWN_MS * (2 ** exponent)); }
        else if (!transient) item.cooldownUntil = 0;
        state.routes[key] = item; state = save(state, timestamp); return getHealth(timestamp);
    }
    function successRate(item = {}) { const successes = safeCount(item.successes); const failures = safeCount(item.failures); const attempts = successes + failures; return attempts > 0 ? successes / attempts : 0; }
    function getPreferredRoutes(now = Date.now()) {
        const health = getHealth(now); const callable = health.routes.callable || blankRoute(); const hosting = health.routes['hosting-rewrite'] || blankRoute();
        const exploration = health.exploration || blankExploration();
        if (exploration.active) {
            const next = normalizeRouteName(exploration.nextRoute) || 'callable';
            const other = next === 'callable' ? 'hosting-rewrite' : 'callable';
            if (!health.routes[next]?.coolingDown) return Object.freeze([next, other]);
            return Object.freeze([other, next]);
        }
        if (callable.coolingDown) return Object.freeze(['hosting-rewrite', 'callable']);
        const callableAttempts = safeCount(callable.successes) + safeCount(callable.failures); const hostingAttempts = safeCount(hosting.successes) + safeCount(hosting.failures);
        if (callableAttempts >= 3 && hostingAttempts >= 3 && successRate(hosting) - successRate(callable) >= 0.35) return Object.freeze(['hosting-rewrite', 'callable']);
        return Object.freeze(['callable', 'hosting-rewrite']);
    }
    function observeNetworkChange(now = Date.now()) { return getHealth(now); }
    function clear(now = Date.now()) { const timestamp = resolveNow(now); save(blankState(), timestamp); return getHealth(timestamp); }
    global.FoxBearIncidentRoutePolicy = Object.freeze({
        version: '1.6.70',
        failureThreshold: FAILURE_THRESHOLD,
        networkDecayFactor: NETWORK_DECAY_FACTOR,
        explorationAttempts: EXPLORATION_ATTEMPTS,
        timeDecayIntervalMs: TIME_DECAY_INTERVAL_MS,
        timeDecayFactor: TIME_DECAY_FACTOR,
        getHealth,
        getPreferredRoutes,
        shouldAttempt,
        recordAttempt,
        recordSuccess,
        recordFailure,
        isTransientFailure,
        currentNetworkKey,
        observeNetworkChange,
        clear
    });
})(typeof window !== 'undefined' ? window : globalThis);
