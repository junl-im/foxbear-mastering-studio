// FoxBear AI Mastering Studio Pro v1.6.10 - settings persistence service
'use strict';

(function attachFoxBearSettingsService(global) {
    const STORAGE_KEY = 'foxbear-settings-v1.4.0';
    const SCHEMA_VERSION = 1;

    const DEFAULTS = Object.freeze({
        autoCacheClean: true,
        smartPerformanceGuard: true,
        hapticsEnabled: true,
        wakeLockDesired: false,
        storagePersistRequested: false
    });

    const BOOLEAN_KEYS = Object.freeze(Object.keys(DEFAULTS));
    const STATE_KEYS = Object.freeze([
        'autoCacheClean',
        'smartPerformanceGuard',
    ]);
    const MOBILE_KEYS = Object.freeze([
        'hapticsEnabled',
        'wakeLockDesired',
        'storagePersistRequested'
    ]);

    function canUseStorage(storage = global.localStorage) {
        try {
            if (!storage) return false;
            const probe = `${STORAGE_KEY}:probe`;
            storage.setItem(probe, '1');
            storage.removeItem(probe);
            return true;
        } catch (error) {
            return false;
        }
    }

    function coerceBoolean(value, fallback) {
        if (value === true || value === false) return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return Boolean(fallback);
    }

    function sanitize(raw = {}) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const settings = {};
        BOOLEAN_KEYS.forEach(key => {
            settings[key] = coerceBoolean(source[key], DEFAULTS[key]);
        });
        return settings;
    }

    function load(storage = global.localStorage) {
        if (!canUseStorage(storage)) return { ...DEFAULTS };
        try {
            const raw = storage.getItem(STORAGE_KEY);
            if (!raw) return { ...DEFAULTS };
            const parsed = JSON.parse(raw);
            return sanitize(parsed?.settings || parsed);
        } catch (error) {
            console.warn('FoxBear settings load failed:', error);
            return { ...DEFAULTS };
        }
    }

    function save(settings, storage = global.localStorage) {
        const next = sanitize(settings);
        if (!canUseStorage(storage)) return next;
        try {
            storage.setItem(STORAGE_KEY, JSON.stringify({
                schemaVersion: SCHEMA_VERSION,
                savedAt: new Date().toISOString(),
                settings: next
            }));
        } catch (error) {
            console.warn('FoxBear settings save failed:', error);
        }
        return next;
    }

    function reset(storage = global.localStorage) {
        if (canUseStorage(storage)) {
            try { storage.removeItem(STORAGE_KEY); } catch (error) {}
        }
        return { ...DEFAULTS };
    }

    function captureFromContext(context = {}) {
        const state = context.state || {};
        const mobile = context.mobile || {};
        return sanitize({
            autoCacheClean: state.autoCacheClean,
            smartPerformanceGuard: state.smartPerformanceGuard,
            hapticsEnabled: mobile.hapticsEnabled,
            wakeLockDesired: mobile.wakeLockDesired,
            storagePersistRequested: mobile.storagePersistRequested
        });
    }

    function applyToContext(context = {}, settings = load()) {
        const next = sanitize(settings);
        const state = context.state;
        const mobile = context.mobile;
        if (state && typeof state === 'object') {
            STATE_KEYS.forEach(key => { state[key] = next[key]; });
        }
        if (mobile && typeof mobile === 'object') {
            MOBILE_KEYS.forEach(key => { mobile[key] = next[key]; });
        }
        return next;
    }

    function saveFromContext(context = {}) {
        return save(captureFromContext(context));
    }

    function setValue(context = {}, key, value) {
        if (!BOOLEAN_KEYS.includes(key)) return captureFromContext(context);
        const current = captureFromContext(context);
        current[key] = Boolean(value);
        applyToContext(context, current);
        return save(current);
    }

    function getStateLabel(value) {
        return Boolean(value) ? 'ON' : 'OFF';
    }

    global.FoxBearSettingsService = Object.freeze({
        STORAGE_KEY,
        DEFAULTS,
        STATE_KEYS,
        MOBILE_KEYS,
        load,
        save,
        reset,
        sanitize,
        captureFromContext,
        applyToContext,
        saveFromContext,
        setValue,
        getStateLabel
    });
})(window);
