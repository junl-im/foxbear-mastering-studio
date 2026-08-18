// FoxBear recoverable runtime fault counters - v1.6.106
// Privacy-safe: only bounded category/code/count/timestamps are kept in memory.
(function attachFoxBearRuntimeFaultCounters(global) {
    'use strict';

    const VERSION = '1.6.106-browser-geometry-history-recovery';
    const MAX_KEYS = 48;
    const RECENT_WINDOW_MS = 5 * 60 * 1000;
    const MAX_RECENT_EVENTS = 96;
    const counters = new Map();
    const recentEvents = [];

    const clean = (value, fallback = 'unknown') => {
        const text = String(value || fallback).toLowerCase().replace(/[^a-z0-9:_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
        return text || fallback;
    };

    function trimOldest() {
        if (counters.size < MAX_KEYS) return;
        let oldestKey = '';
        let oldestAt = Infinity;
        counters.forEach((entry, key) => {
            const at = Number(entry.lastAt || 0);
            if (at < oldestAt) { oldestAt = at; oldestKey = key; }
        });
        if (oldestKey) counters.delete(oldestKey);
    }

    function record(category = 'runtime', code = 'recoverable') {
        const safeCategory = clean(category, 'runtime');
        const safeCode = clean(code, 'recoverable');
        const key = `${safeCategory}:${safeCode}`;
        const now = Date.now();
        const current = counters.get(key);
        if (!current) trimOldest();
        const next = Object.freeze({
            category: safeCategory,
            code: safeCode,
            count: Math.min(999999, Math.max(0, Number(current?.count || 0)) + 1),
            firstAt: Number(current?.firstAt || now),
            lastAt: now
        });
        counters.set(key, next);
        recentEvents.push(Object.freeze({ at: now, key }));
        while (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.shift();
        return next;
    }

    function getSnapshot(now = Date.now()) {
        const entries = Array.from(counters.values())
            .sort((a, b) => Number(b.lastAt || 0) - Number(a.lastAt || 0))
            .map(entry => Object.freeze({ ...entry }));
        const totalCount = entries.reduce((sum, item) => sum + Number(item.count || 0), 0);
        const recentCutoff = Number(now) - RECENT_WINDOW_MS;
        while (recentEvents.length && Number(recentEvents[0]?.at || 0) < recentCutoff) recentEvents.shift();
        const recentCount = recentEvents.length;
        const recentByKey = new Map();
        recentEvents.forEach(event => recentByKey.set(event.key, (recentByKey.get(event.key) || 0) + 1));
        const repeatedKeys = [...recentByKey.entries()]
            .filter(([, count]) => count >= 2)
            .sort((left, right) => right[1] - left[1])
            .slice(0, 8)
            .map(([key, count]) => Object.freeze({ key, count }));
        const maxRecentKeyCount = repeatedKeys.length ? Number(repeatedKeys[0].count || 0) : (recentCount ? 1 : 0);
        return Object.freeze({
            version: VERSION,
            totalCount,
            uniqueCount: entries.length,
            recentCount,
            maxRecentKeyCount,
            repeatedKeys: Object.freeze(repeatedKeys),
            recentWindowMs: RECENT_WINDOW_MS,
            entries: Object.freeze(entries.slice(0, MAX_KEYS))
        });
    }

    function clear() {
        const count = counters.size;
        counters.clear();
        recentEvents.length = 0;
        return count;
    }

    global.FoxBearRuntimeFaultCounters = Object.freeze({ version: VERSION, record, getSnapshot, clear });
})(typeof window !== 'undefined' ? window : globalThis);
