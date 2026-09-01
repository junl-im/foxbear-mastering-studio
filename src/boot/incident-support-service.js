// FoxBear incident support utilities and privacy-safe transport metrics - v1.7.4
(function attachFoxBearIncidentSupport(global) {
    'use strict';

    const METRICS_KEY = 'foxbear-incident-reporter-v1:transport-metrics';
    const METRICS_SCHEMA_VERSION = 1;
    const TRANSPORT_KEYS = Object.freeze(['callable', 'hosting-rewrite', 'firestore', 'unresolved']);

    function cleanText(value, maxLength = 300) {
        return String(value ?? '')
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, maxLength);
    }

    function storageGet(key, fallback = '') {
        try { return global.localStorage?.getItem?.(key) ?? fallback; }
        catch (error) { global.FoxBearRuntimeFaultCounters?.record?.('incident-storage', 'read-failed'); return fallback; }
    }

    function storageSet(key, value) {
        try { global.localStorage?.setItem?.(key, value); return true; }
        catch (error) { global.FoxBearRuntimeFaultCounters?.record?.('incident-storage', 'write-failed'); return false; }
    }

    function redactSensitiveText(value, maxLength = 1200) {
        let text = String(value ?? '');
        text = text.replace(/([?&](?:token|key|code|secret|password|auth|credential)=)[^&#\s]+/gi, '$1[redacted]');
        text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]');
        text = text.replace(/\b(?:Bearer\s+)?[A-Za-z0-9_-]{32,}\b/g, '[token]');
        text = text.replace(/(?:file:\/\/\/|[A-Za-z]:\\|\/Users\/|\/home\/)[^\s)]+/g, '[local-path]');
        text = text.replace(/https?:\/\/([^/\s]+)(\/[^?\s#]*)?(?:\?[^\s#]*)?/gi, (_match, host, path = '') => `${host}${path}`);
        return cleanText(text, maxLength);
    }

    function normalizeError(error, fallbackMessage = 'Unknown incident') {
        if (error && typeof error === 'object') {
            return Object.freeze({
                message: redactSensitiveText(error.message || fallbackMessage, 500),
                code: cleanText(error.code || error.name || '', 80),
                stack: redactSensitiveText(error.stack || '', 1400)
            });
        }
        return Object.freeze({ message: redactSensitiveText(error || fallbackMessage, 500), code: '', stack: '' });
    }

    function fnv1a(value) {
        let hash = 0x811c9dc5;
        const text = String(value || '');
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 0x01000193);
        }
        return (hash >>> 0).toString(16).padStart(8, '0');
    }

    function classifyBrowser() {
        const ua = String(global.navigator?.userAgent || '');
        if (/Edg\//.test(ua)) return 'edge';
        if (/OPR\//.test(ua)) return 'opera';
        if (/Firefox\//.test(ua)) return 'firefox';
        if (/CriOS\//.test(ua)) return 'chrome-ios';
        if (/Chrome\//.test(ua)) return 'chrome';
        if (/Safari\//.test(ua)) return 'safari';
        return 'unknown';
    }

    function classifyPlatform() {
        const ua = String(global.navigator?.userAgent || '');
        if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
        if (/Android/.test(ua)) return 'android';
        if (/Windows/.test(ua)) return 'windows';
        if (/Macintosh|Mac OS X/.test(ua)) return 'macos';
        if (/Linux/.test(ua)) return 'linux';
        return cleanText(global.navigator?.platform || 'unknown', 40).toLowerCase() || 'unknown';
    }

    function parseVersion(value) {
        const match = String(value || '').trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
        return match ? match.slice(1).map(Number) : null;
    }

    function compareVersions(left, right) {
        const a = parseVersion(left);
        const b = parseVersion(right);
        if (!a || !b) return null;
        for (let index = 0; index < 3; index += 1) {
            if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
        }
        return 0;
    }

    function blankRouteStats() {
        return { attempts: 0, successful: 0, failed: 0 };
    }

    function blankMetrics() {
        return {
            schemaVersion: METRICS_SCHEMA_VERSION,
            updatedAt: '',
            totalAttempts: 0,
            successful: 0,
            failed: 0,
            fallbackSuccessful: 0,
            queueRecovered: 0,
            queueRemaining: 0,
            byTransport: Object.fromEntries(TRANSPORT_KEYS.map(key => [key, blankRouteStats()])),
            last: null
        };
    }

    function normalizeTransport(value = '') {
        const raw = cleanText(value || '', 40).toLowerCase();
        if (/hosting|same-origin|rewrite/.test(raw)) return 'hosting-rewrite';
        if (/firestore/.test(raw)) return 'firestore';
        if (/callable|firebase/.test(raw)) return 'callable';
        return 'unresolved';
    }

    function safeCount(value) {
        const number = Number(value || 0);
        return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
    }

    function normalizeMetrics(value) {
        const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        const metrics = blankMetrics();
        metrics.updatedAt = cleanText(source.updatedAt || '', 40);
        metrics.totalAttempts = safeCount(source.totalAttempts);
        metrics.successful = safeCount(source.successful);
        metrics.failed = safeCount(source.failed);
        metrics.fallbackSuccessful = safeCount(source.fallbackSuccessful);
        metrics.queueRecovered = safeCount(source.queueRecovered);
        metrics.queueRemaining = safeCount(source.queueRemaining);
        for (const key of TRANSPORT_KEYS) {
            const route = source.byTransport?.[key] || {};
            metrics.byTransport[key] = {
                attempts: safeCount(route.attempts),
                successful: safeCount(route.successful),
                failed: safeCount(route.failed)
            };
        }
        if (source.last && typeof source.last === 'object') {
            metrics.last = {
                at: cleanText(source.last.at || '', 40),
                phase: cleanText(source.last.phase || '', 30),
                transport: normalizeTransport(source.last.transport),
                ok: source.last.ok === true,
                code: cleanText(source.last.code || '', 80)
            };
        }
        return metrics;
    }

    function getTransportMetrics() {
        try { return Object.freeze(normalizeMetrics(JSON.parse(storageGet(METRICS_KEY, 'null')))); }
        catch (error) { return Object.freeze(blankMetrics()); }
    }

    function saveTransportMetrics(value) {
        const metrics = normalizeMetrics(value);
        metrics.updatedAt = new Date().toISOString();
        storageSet(METRICS_KEY, JSON.stringify(metrics));
        return Object.freeze(metrics);
    }

    function recordTransportOutcome(detail = {}) {
        const metrics = normalizeMetrics(getTransportMetrics());
        const transport = normalizeTransport(detail.transport);
        const ok = detail.ok === true;
        const route = metrics.byTransport[transport] || (metrics.byTransport[transport] = blankRouteStats());
        metrics.totalAttempts += 1;
        route.attempts += 1;
        if (ok) {
            metrics.successful += 1;
            route.successful += 1;
            if (transport === 'hosting-rewrite' || transport === 'firestore') metrics.fallbackSuccessful += 1;
        } else {
            metrics.failed += 1;
            route.failed += 1;
        }
        metrics.last = {
            at: new Date().toISOString(),
            phase: cleanText(detail.phase || 'unknown', 30),
            transport,
            ok,
            code: redactSensitiveText(detail.code || '', 80)
        };
        return saveTransportMetrics(metrics);
    }

    function recordQueueRecovery(detail = {}) {
        const metrics = normalizeMetrics(getTransportMetrics());
        metrics.queueRecovered += safeCount(detail.delivered);
        metrics.queueRemaining = safeCount(detail.remaining);
        metrics.last = {
            at: new Date().toISOString(),
            phase: cleanText(detail.phase || 'queue-flush', 30),
            transport: normalizeTransport(detail.transport || 'unresolved'),
            ok: detail.ok === true,
            code: redactSensitiveText(detail.code || '', 80)
        };
        return saveTransportMetrics(metrics);
    }

    function clearTransportMetrics() {
        return saveTransportMetrics(blankMetrics());
    }

    global.FoxBearIncidentSupport = Object.freeze({
        version: '1.7.4',
        cleanText,
        storageGet,
        storageSet,
        redactSensitiveText,
        normalizeError,
        fnv1a,
        classifyBrowser,
        classifyPlatform,
        parseVersion,
        compareVersions,
        normalizeTransport,
        getTransportMetrics,
        recordTransportOutcome,
        recordQueueRecovery,
        clearTransportMetrics
    });
})(typeof window !== 'undefined' ? window : globalThis);
