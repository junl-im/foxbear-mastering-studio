// FoxBear adaptive incident transport route policy - v1.6.20
(function attachFoxBearIncidentRoutePolicy(global) {
    'use strict';

    const STORAGE_KEY = 'foxbear-incident-reporter-v1:route-health';
    const SCHEMA_VERSION = 2;
    const ROUTES = Object.freeze(['callable', 'hosting-rewrite']);
    const FAILURE_THRESHOLD = 2;
    const BASE_COOLDOWN_MS = 2 * 60 * 1000;
    const MAX_COOLDOWN_MS = 15 * 60 * 1000;
    const NETWORK_DECAY_FACTOR = 0.5;

    function clean(value, max = 80) { return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
    function storageGet() { try { return global.localStorage?.getItem?.(STORAGE_KEY) || ''; } catch (error) { return ''; } }
    function storageSet(value) { try { global.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(value)); return true; } catch (error) { return false; } }
    function blankRoute() { return { successes: 0, failures: 0, consecutiveTransientFailures: 0, cooldownUntil: 0, lastSuccessAt: '', lastFailureAt: '', lastFailureCode: '' }; }
    function safeCount(value) { const number = Number(value || 0); return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0; }
    function normalizeRoute(value) {
        const source = value && typeof value === 'object' ? value : {};
        return { successes: safeCount(source.successes), failures: safeCount(source.failures), consecutiveTransientFailures: safeCount(source.consecutiveTransientFailures), cooldownUntil: Math.max(0, Number(source.cooldownUntil || 0) || 0), lastSuccessAt: clean(source.lastSuccessAt, 40), lastFailureAt: clean(source.lastFailureAt, 40), lastFailureCode: clean(source.lastFailureCode, 80) };
    }
    function currentNetworkKey() {
        const connection = global.navigator?.connection || global.navigator?.mozConnection || global.navigator?.webkitConnection;
        return clean([global.navigator?.onLine === false ? 'offline' : 'online', connection?.type || '', connection?.effectiveType || '', connection?.saveData ? 'save-data' : 'normal-data'].join('|'), 100);
    }
    function blankState() { return { schemaVersion: SCHEMA_VERSION, updatedAt: '', networkKey: currentNetworkKey(), networkChangedAt: '', routes: Object.fromEntries(ROUTES.map(route => [route, blankRoute()])) }; }
    function load() {
        try {
            const parsed = JSON.parse(storageGet() || 'null');
            const state = blankState();
            state.updatedAt = clean(parsed?.updatedAt, 40);
            state.networkKey = clean(parsed?.networkKey, 100) || currentNetworkKey();
            state.networkChangedAt = clean(parsed?.networkChangedAt, 40);
            for (const route of ROUTES) state.routes[route] = normalizeRoute(parsed?.routes?.[route]);
            return state;
        } catch (error) { return blankState(); }
    }
    function save(state) {
        const safe = blankState();
        safe.updatedAt = new Date().toISOString();
        safe.networkKey = clean(state?.networkKey, 100) || currentNetworkKey();
        safe.networkChangedAt = clean(state?.networkChangedAt, 40);
        for (const route of ROUTES) safe.routes[route] = normalizeRoute(state?.routes?.[route]);
        storageSet(safe);
        return safe;
    }
    function decayForNetworkChange(state) {
        const nextKey = currentNetworkKey();
        if (!nextKey || !state.networkKey || nextKey === state.networkKey) return state;
        for (const route of ROUTES) {
            const item = normalizeRoute(state.routes[route]);
            item.successes = Math.floor(item.successes * NETWORK_DECAY_FACTOR);
            item.failures = Math.floor(item.failures * NETWORK_DECAY_FACTOR);
            item.consecutiveTransientFailures = 0;
            item.cooldownUntil = 0;
            state.routes[route] = item;
        }
        state.networkKey = nextKey;
        state.networkChangedAt = new Date().toISOString();
        save(state);
        return state;
    }
    function normalizeRouteName(route) { const value = clean(route, 40).toLowerCase(); return ROUTES.includes(value) ? value : ''; }
    function errorCode(error) { return clean(error?.code || error?.name || error || '', 80); }
    function isTransientFailure(error) {
        const evidence = `${errorCode(error)} ${clean(error?.message || '', 180)}`;
        return /unavailable|timeout|timed out|network|failed to fetch|load failed|cors|response blocked|same.origin|resource-exhausted|aborted|connection/i.test(evidence) && !/permission|unauthenticated|invalid-argument|not-found|unimplemented|secret|smtp-auth/i.test(evidence);
    }
    function getHealth(now = Date.now()) {
        const state = decayForNetworkChange(load());
        const routes = {};
        for (const route of ROUTES) {
            const item = normalizeRoute(state.routes[route]);
            const remainingMs = Math.max(0, item.cooldownUntil - Number(now || Date.now()));
            routes[route] = Object.freeze({ ...item, coolingDown: remainingMs > 0, remainingMs, remainingSeconds: Math.ceil(remainingMs / 1000) });
        }
        return Object.freeze({ schemaVersion: SCHEMA_VERSION, updatedAt: state.updatedAt, networkKey: state.networkKey, networkChangedAt: state.networkChangedAt, routes: Object.freeze(routes) });
    }
    function shouldAttempt(route, now = Date.now()) { const key = normalizeRouteName(route); return !key || getHealth(now).routes[key].coolingDown !== true; }
    function recordSuccess(route) {
        const key = normalizeRouteName(route); if (!key) return getHealth();
        const state = decayForNetworkChange(load()); const item = normalizeRoute(state.routes[key]);
        item.successes += 1; item.consecutiveTransientFailures = 0; item.cooldownUntil = 0; item.lastSuccessAt = new Date().toISOString(); state.routes[key] = item; save(state); return getHealth();
    }
    function recordFailure(route, error) {
        const key = normalizeRouteName(route); if (!key) return getHealth();
        const state = decayForNetworkChange(load()); const item = normalizeRoute(state.routes[key]); const transient = isTransientFailure(error);
        item.failures += 1; item.lastFailureAt = new Date().toISOString(); item.lastFailureCode = errorCode(error); item.consecutiveTransientFailures = transient ? item.consecutiveTransientFailures + 1 : 0;
        if (transient && item.consecutiveTransientFailures >= FAILURE_THRESHOLD) { const exponent = Math.min(3, item.consecutiveTransientFailures - FAILURE_THRESHOLD); item.cooldownUntil = Date.now() + Math.min(MAX_COOLDOWN_MS, BASE_COOLDOWN_MS * (2 ** exponent)); }
        else if (!transient) item.cooldownUntil = 0;
        state.routes[key] = item; save(state); return getHealth();
    }
    function successRate(item = {}) { const successes = safeCount(item.successes); const failures = safeCount(item.failures); const attempts = successes + failures; return attempts > 0 ? successes / attempts : 0; }
    function getPreferredRoutes(now = Date.now()) {
        const health = getHealth(now); const callable = health.routes.callable || blankRoute(); const hosting = health.routes['hosting-rewrite'] || blankRoute();
        if (callable.coolingDown) return Object.freeze(['hosting-rewrite', 'callable']);
        const callableAttempts = safeCount(callable.successes) + safeCount(callable.failures); const hostingAttempts = safeCount(hosting.successes) + safeCount(hosting.failures);
        if (callableAttempts >= 3 && hostingAttempts >= 3 && successRate(hosting) - successRate(callable) >= 0.35) return Object.freeze(['hosting-rewrite', 'callable']);
        return Object.freeze(['callable', 'hosting-rewrite']);
    }
    function clear() { save(blankState()); return getHealth(); }
    global.FoxBearIncidentRoutePolicy = Object.freeze({ version: '1.6.20', failureThreshold: FAILURE_THRESHOLD, networkDecayFactor: NETWORK_DECAY_FACTOR, getHealth, getPreferredRoutes, shouldAttempt, recordSuccess, recordFailure, isTransientFailure, currentNetworkKey, clear });
})(typeof window !== 'undefined' ? window : globalThis);
