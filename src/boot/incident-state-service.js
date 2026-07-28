// FoxBear incident local state storage and normalization - v1.6.20
(function attachFoxBearIncidentState(global) {
    'use strict';

    const support = global.FoxBearIncidentSupport;
    if (!support) throw new Error('FoxBear incident support module is not loaded.');
    const { storageGet, storageSet, cleanText, redactSensitiveText } = support;

    const STORAGE_PREFIX = 'foxbear-incident-reporter-v1';
    const TEST_HISTORY_KEY = `${STORAGE_PREFIX}:test-history`;
    const DEPLOYMENT_READINESS_KEY = `${STORAGE_PREFIX}:deployment-readiness`;
    const DEPLOYMENT_HISTORY_KEY = `${STORAGE_PREFIX}:deployment-history`;
    const MAX_TEST_HISTORY = 5;
    const MAX_DEPLOYMENT_HISTORY = 3;
    const DEPLOYMENT_CHECK_KEYS = Object.freeze(['csp', 'functions', 'firestore', 'smtpSecret', 'smtpConnection']);
    const DEPLOYMENT_CHECK_KEY_SET = new Set(DEPLOYMENT_CHECK_KEYS);

    function safeCount(value, fallback = 0, max = 999) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.min(max, Math.max(0, Math.floor(number)));
    }

    function safeIso(value = '') {
        const text = cleanText(value || '', 40);
        return Number.isFinite(Date.parse(text)) ? text : '';
    }

    function normalizeTestHistoryEntry(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const at = safeIso(value.at);
        const reportId = cleanText(value.reportId || '', 180);
        if (!at && !reportId) return null;
        return Object.freeze({
            at,
            status: cleanText(value.status || 'failed', 60),
            label: cleanText(value.label || '', 60),
            detail: redactSensitiveText(value.detail || '', 180),
            reportId,
            messageId: redactSensitiveText(value.messageId || '', 120),
            attemptCount: safeCount(value.attemptCount, 0, 20),
            nextRetryAt: safeIso(value.nextRetryAt),
            terminal: value.terminal === true,
            userRetryCount: safeCount(value.userRetryCount, 0, 20),
            userRetryLimit: Math.max(1, safeCount(value.userRetryLimit, 2, 20)),
            userRetryRequestedAt: safeIso(value.userRetryRequestedAt),
            userRetryAvailableAt: safeIso(value.userRetryAvailableAt),
            checkedAt: safeIso(value.checkedAt)
        });
    }

    function loadTestHistory() {
        try {
            const parsed = JSON.parse(storageGet(TEST_HISTORY_KEY, '[]'));
            return Array.isArray(parsed) ? parsed.map(normalizeTestHistoryEntry).filter(Boolean).slice(0, MAX_TEST_HISTORY) : [];
        } catch (error) {
            return [];
        }
    }

    function saveTestHistory(items) {
        const safe = Array.isArray(items) ? items.map(normalizeTestHistoryEntry).filter(Boolean).slice(0, MAX_TEST_HISTORY) : [];
        storageSet(TEST_HISTORY_KEY, JSON.stringify(safe));
        return safe;
    }

    function clearTestHistory() {
        return saveTestHistory([]);
    }

    function normalizeDeploymentCheck(value = {}) {
        return Object.freeze({
            ok: value?.ok === true,
            status: cleanText(value?.status || (value?.ok ? 'ready' : 'unknown'), 24),
            code: cleanText(value?.code || '', 80),
            reason: cleanText(value?.reason || '', 80),
            message: redactSensitiveText(value?.message || '', 240)
        });
    }

    function normalizeDeploymentReadinessSnapshot(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const sourceChecks = value.checks && typeof value.checks === 'object' ? value.checks : {};
        const checks = Object.fromEntries(DEPLOYMENT_CHECK_KEYS.map(key => [key, normalizeDeploymentCheck(sourceChecks[key])]));
        const checkedAt = safeIso(value.checkedAt);
        const service = Object.freeze({
            status: cleanText(value?.service?.status || '', 20),
            productVersion: cleanText(value?.service?.productVersion || '', 24),
            region: cleanText(value?.service?.region || '', 40),
            functionsOrigin: cleanText(value?.service?.functionsOrigin || '', 180)
        });
        const contractValid = Boolean(
            checkedAt
            && service.productVersion
            && service.functionsOrigin
            && DEPLOYMENT_CHECK_KEYS.every(key => Object.prototype.hasOwnProperty.call(sourceChecks, key) && typeof sourceChecks[key]?.ok === 'boolean')
        );
        if (!contractValid && checks.functions.ok) {
            checks.functions = Object.freeze({
                ok: false,
                status: 'error',
                code: 'FOXBEAR_INCIDENT_READINESS_CONTRACT_INVALID',
                reason: 'response-contract-invalid',
                message: '배포 점검 응답 형식이 불완전합니다. Callable Functions를 다시 배포하세요.'
            });
        }
        const frozenChecks = Object.freeze(checks);
        return Object.freeze({
            ok: value.ok === true && contractValid && DEPLOYMENT_CHECK_KEYS.every(key => frozenChecks[key].ok === true),
            cached: value.cached === true || value.localCached === true,
            localCached: value.localCached === true,
            checkedAt,
            lastHealthyAt: safeIso(value.lastHealthyAt),
            nextCheckAt: safeIso(value.nextCheckAt),
            contractValid,
            contractCode: contractValid ? '' : 'FOXBEAR_INCIDENT_READINESS_CONTRACT_INVALID',
            checks: frozenChecks,
            service
        });
    }

    function loadDeploymentReadiness() {
        try {
            return normalizeDeploymentReadinessSnapshot(JSON.parse(storageGet(DEPLOYMENT_READINESS_KEY, 'null')));
        } catch (error) {
            return null;
        }
    }

    function normalizeDeploymentHistoryEntry(value) {
        if (!value || typeof value !== 'object') return null;
        const checkedAt = safeIso(value.checkedAt);
        if (!checkedAt) return null;
        return Object.freeze({
            checkedAt,
            ok: value.ok === true,
            cached: value.cached === true,
            failed: Array.isArray(value.failed)
                ? value.failed.map(key => cleanText(key, 32)).filter(key => DEPLOYMENT_CHECK_KEY_SET.has(key)).slice(0, DEPLOYMENT_CHECK_KEYS.length)
                : [],
            serverVersion: cleanText(value.serverVersion || '', 24),
            lastHealthyAt: safeIso(value.lastHealthyAt)
        });
    }

    function loadDeploymentHistory() {
        try {
            const parsed = JSON.parse(storageGet(DEPLOYMENT_HISTORY_KEY, '[]'));
            return Array.isArray(parsed)
                ? parsed.map(normalizeDeploymentHistoryEntry).filter(Boolean).slice(0, MAX_DEPLOYMENT_HISTORY)
                : [];
        } catch (error) {
            return [];
        }
    }

    function saveDeploymentHistory(items) {
        const safe = Array.isArray(items)
            ? items.map(normalizeDeploymentHistoryEntry).filter(Boolean).slice(0, MAX_DEPLOYMENT_HISTORY)
            : [];
        storageSet(DEPLOYMENT_HISTORY_KEY, JSON.stringify(safe));
        return safe;
    }

    function readinessFailureKeys(value = {}) {
        return DEPLOYMENT_CHECK_KEYS.filter(key => value?.checks?.[key]?.ok !== true);
    }

    function appendDeploymentHistory(value = {}) {
        const checkedAt = safeIso(value?.checkedAt);
        if (!checkedAt) return loadDeploymentHistory();
        const entry = {
            checkedAt,
            ok: value?.ok === true,
            cached: value?.cached === true || value?.localCached === true,
            failed: readinessFailureKeys(value),
            serverVersion: cleanText(value?.service?.productVersion || '', 24),
            lastHealthyAt: safeIso(value?.lastHealthyAt)
        };
        const history = loadDeploymentHistory().filter(item => item.checkedAt !== checkedAt);
        history.unshift(entry);
        return saveDeploymentHistory(history);
    }

    function saveDeploymentReadiness(value) {
        const safe = normalizeDeploymentReadinessSnapshot(value);
        if (!safe) return null;
        storageSet(DEPLOYMENT_READINESS_KEY, JSON.stringify(safe));
        appendDeploymentHistory(safe);
        return safe;
    }

    function clearDeploymentHistory() {
        return saveDeploymentHistory([]);
    }

    global.FoxBearIncidentState = Object.freeze({
        version: '1.6.20',
        deploymentCheckKeys: DEPLOYMENT_CHECK_KEYS,
        normalizeTestHistoryEntry,
        loadTestHistory,
        saveTestHistory,
        clearTestHistory,
        normalizeDeploymentCheck,
        normalizeDeploymentReadinessSnapshot,
        loadDeploymentReadiness,
        saveDeploymentReadiness,
        normalizeDeploymentHistoryEntry,
        loadDeploymentHistory,
        saveDeploymentHistory,
        appendDeploymentHistory,
        clearDeploymentHistory,
        readinessFailureKeys
    });
})(typeof window !== 'undefined' ? window : globalThis);
