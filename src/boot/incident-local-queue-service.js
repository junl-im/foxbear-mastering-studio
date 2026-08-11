// FoxBear bounded incident local queue with conflict-safe flush commits - v1.6.88
(function attachFoxBearIncidentLocalQueue(global) {
    'use strict';

    const support = global.FoxBearIncidentSupport;
    if (!support) throw new Error('FoxBear incident support module is not loaded.');

    const DEFAULT_KEY = 'foxbear-incident-reporter-v1:queue';
    const DEFAULT_MAX_ITEMS = 8;
    const DEFAULT_MAX_SERIALIZED_BYTES = 96 * 1024;

    function byteLength(value = '') {
        const text = String(value ?? '');
        try {
            if (typeof global.TextEncoder === 'function') return new global.TextEncoder().encode(text).byteLength;
        } catch (error) {}
        try { return unescape(encodeURIComponent(text)).length; }
        catch (error) { return text.length * 2; }
    }

    function normalizeLimits(options = {}) {
        return Object.freeze({
            maxItems: Math.max(1, Math.min(100, Math.floor(Number(options.maxItems || DEFAULT_MAX_ITEMS)))),
            maxSerializedBytes: Math.max(4096, Math.min(1024 * 1024, Math.floor(Number(options.maxSerializedBytes || DEFAULT_MAX_SERIALIZED_BYTES))))
        });
    }

    function normalizeEntry(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const fingerprint = support.cleanText(value.fingerprint || '', 64);
        if (!fingerprint) return null;
        return Object.freeze({ ...value, fingerprint });
    }

    function normalizeItems(items, options = {}) {
        const { maxItems, maxSerializedBytes } = normalizeLimits(options);
        const source = Array.isArray(items) ? items : [];
        const newest = [];
        const seen = new Set();
        for (let index = source.length - 1; index >= 0; index -= 1) {
            const entry = normalizeEntry(source[index]);
            if (!entry || seen.has(entry.fingerprint)) continue;
            seen.add(entry.fingerprint);
            newest.push(entry);
        }
        newest.reverse();
        let safe = newest.slice(-maxItems);
        let dropped = Math.max(0, source.length - safe.length);
        let serialized = JSON.stringify(safe);
        while (safe.length && byteLength(serialized) > maxSerializedBytes) {
            safe = safe.slice(1);
            dropped += 1;
            serialized = JSON.stringify(safe);
        }
        return Object.freeze({ items: Object.freeze(safe), serialized, bytes: byteLength(serialized), dropped });
    }

    function createStore(options = {}) {
        const key = support.cleanText(options.key || DEFAULT_KEY, 180) || DEFAULT_KEY;
        const limits = normalizeLimits(options);
        const { maxItems, maxSerializedBytes } = limits;
        const storageGet = typeof options.storageGet === 'function' ? options.storageGet : support.storageGet;
        const storageSet = typeof options.storageSet === 'function' ? options.storageSet : support.storageSet;
        const stats = {
            loads: 0,
            writes: 0,
            parseErrors: 0,
            oversizeLoads: 0,
            storageFailures: 0,
            dropped: 0,
            duplicateSkips: 0,
            conflictSafeCommits: 0,
            lastStoredCount: 0,
            lastSerializedBytes: 2
        };

        function normalize(items) {
            return normalizeItems(items, limits);
        }

        function readRaw() {
            try { return String(storageGet(key, '[]') || '[]'); }
            catch (error) { return '[]'; }
        }

        function load() {
            stats.loads += 1;
            const raw = readRaw();
            if (byteLength(raw) > maxSerializedBytes * 4) {
                stats.oversizeLoads += 1;
                stats.lastStoredCount = 0;
                stats.lastSerializedBytes = byteLength(raw);
                return [];
            }
            try {
                const normalized = normalize(JSON.parse(raw));
                stats.lastStoredCount = normalized.items.length;
                stats.lastSerializedBytes = normalized.bytes;
                return normalized.items;
            } catch (error) {
                stats.parseErrors += 1;
                stats.lastStoredCount = 0;
                stats.lastSerializedBytes = byteLength(raw);
                return [];
            }
        }

        function save(items) {
            let normalized = normalize(items);
            let dropped = normalized.dropped;
            while (true) {
                let stored = false;
                try { stored = storageSet(key, normalized.serialized) === true; }
                catch (error) { stored = false; }
                if (stored) {
                    stats.writes += 1;
                    stats.dropped += dropped;
                    stats.lastStoredCount = normalized.items.length;
                    stats.lastSerializedBytes = normalized.bytes;
                    return Object.freeze({ ok: true, items: normalized.items, count: normalized.items.length, dropped, bytes: normalized.bytes });
                }
                stats.storageFailures += 1;
                if (!normalized.items.length) {
                    stats.dropped += dropped;
                    stats.lastStoredCount = 0;
                    stats.lastSerializedBytes = normalized.bytes;
                    return Object.freeze({ ok: false, items: [], count: 0, dropped, bytes: normalized.bytes });
                }
                normalized = normalize(normalized.items.slice(1));
                dropped += 1 + normalized.dropped;
            }
        }

        function enqueue(payload) {
            const entry = normalizeEntry(payload);
            if (!entry) return Object.freeze({ ok: false, added: false, duplicate: false, count: load().length, dropped: 0, bytes: stats.lastSerializedBytes });
            const current = load();
            if (current.some(item => item.fingerprint === entry.fingerprint)) {
                stats.duplicateSkips += 1;
                return Object.freeze({ ok: true, added: false, duplicate: true, count: current.length, dropped: 0, bytes: stats.lastSerializedBytes });
            }
            const saved = save([...current, entry]);
            return Object.freeze({ ...saved, added: saved.items.some(item => item.fingerprint === entry.fingerprint), duplicate: false });
        }

        function snapshot() {
            const items = load();
            return Object.freeze({
                items: Object.freeze([...items]),
                fingerprints: Object.freeze(items.map(item => item.fingerprint)),
                count: items.length
            });
        }

        function removeFingerprints(values = []) {
            const fingerprints = new Set((Array.isArray(values) ? values : []).map(value => support.cleanText(value || '', 64)).filter(Boolean));
            const current = load();
            if (!fingerprints.size) return Object.freeze({ ok: true, items: current, count: current.length, removed: 0, dropped: 0, bytes: stats.lastSerializedBytes });
            const remaining = current.filter(item => !fingerprints.has(item.fingerprint));
            const removed = current.length - remaining.length;
            const saved = save(remaining);
            stats.conflictSafeCommits += 1;
            return Object.freeze({ ...saved, removed });
        }

        function count() {
            return load().length;
        }

        function clear() {
            return save([]);
        }

        function getState() {
            return Object.freeze({ key, maxItems, maxSerializedBytes, ...stats });
        }

        return Object.freeze({ load, save, enqueue, snapshot, removeFingerprints, count, clear, getState });
    }

    global.FoxBearIncidentLocalQueue = Object.freeze({
        version: '1.6.88',
        defaultKey: DEFAULT_KEY,
        defaultMaxItems: DEFAULT_MAX_ITEMS,
        defaultMaxSerializedBytes: DEFAULT_MAX_SERIALIZED_BYTES,
        byteLength,
        normalizeEntry,
        normalizeItems,
        createStore
    });
})(typeof window !== 'undefined' ? window : globalThis);
