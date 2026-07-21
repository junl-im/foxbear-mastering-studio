// FoxBear automatic incident reporter - v1.5.56
(function attachFoxBearIncidentReporter(global) {
    'use strict';

    const BUILD_INFO = global.FoxBearBuildInfo || {};
    const VERSION = BUILD_INFO.assetVersion || '1.5.56-incident-operations-app-check';
    const STORAGE_PREFIX = 'foxbear-incident-reporter-v1';
    const ENABLED_KEY = `${STORAGE_PREFIX}:enabled`;
    const QUEUE_KEY = `${STORAGE_PREFIX}:queue`;
    const DAILY_KEY = `${STORAGE_PREFIX}:daily`;
    const MAX_QUEUE = 8;
    const MAX_AUTOMATIC_PER_SESSION = 5;
    const MAX_AUTOMATIC_PER_DAY = 12;
    const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;
    const SEND_TIMEOUT_MS = 9000;
    const ALLOWED_SEVERITIES = new Set(['warning', 'error', 'fatal']);
    const ALLOWED_CATEGORIES = new Set([
        'runtime', 'resource', 'boot', 'mastering', 'quality-recovery', 'export',
        'update-safety', 'release-mismatch', 'firebase', 'manual-test', 'unknown'
    ]);

    const state = {
        automaticSentThisSession: 0,
        attempted: 0,
        delivered: 0,
        queued: 0,
        suppressed: 0,
        failed: 0,
        lastError: '',
        lastFingerprint: '',
        lastDeliveredAt: 0,
        recent: new Map(),
        flushing: false
    };

    function storageGet(key, fallback = '') {
        try { return global.localStorage?.getItem?.(key) ?? fallback; }
        catch (error) { return fallback; }
    }

    function storageSet(key, value) {
        try { global.localStorage?.setItem?.(key, value); return true; }
        catch (error) { return false; }
    }

    function isEnabled() {
        return storageGet(ENABLED_KEY, 'on') !== 'off';
    }

    function setEnabled(value) {
        storageSet(ENABLED_KEY, value ? 'on' : 'off');
        return isEnabled();
    }

    function cleanText(value, maxLength = 300) {
        return String(value ?? '')
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, maxLength);
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
            return {
                message: redactSensitiveText(error.message || fallbackMessage, 500),
                code: cleanText(error.code || error.name || '', 80),
                stack: redactSensitiveText(error.stack || '', 1400)
            };
        }
        return { message: redactSensitiveText(error || fallbackMessage, 500), code: '', stack: '' };
    }

    function fnv1a(value) {
        let hash = 0x811c9dc5;
        const text = String(value || '');
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 0x01000193);
        }
        return (hash >>> 0).toString(36);
    }

    function classifyBrowser() {
        const ua = String(global.navigator?.userAgent || '');
        if (/Edg\//.test(ua)) return 'Edge';
        if (/Firefox\//.test(ua)) return 'Firefox';
        if (/CriOS\//.test(ua)) return 'Chrome iOS';
        if (/Chrome\//.test(ua)) return 'Chrome';
        if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari';
        return 'Other';
    }

    function classifyPlatform() {
        const ua = String(global.navigator?.userAgent || '');
        if (/Android/i.test(ua)) return 'Android';
        if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
        if (/Windows/i.test(ua)) return 'Windows';
        if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS';
        if (/Linux/i.test(ua)) return 'Linux';
        return cleanText(global.navigator?.platform || 'Other', 40);
    }

    function getDailyState() {
        const today = new Date().toISOString().slice(0, 10);
        try {
            const parsed = JSON.parse(storageGet(DAILY_KEY, '{}')) || {};
            if (parsed.date === today) return { date: today, count: Math.max(0, Number(parsed.count || 0)) };
        } catch (error) {}
        return { date: today, count: 0 };
    }

    function incrementDailyCount() {
        const daily = getDailyState();
        daily.count += 1;
        storageSet(DAILY_KEY, JSON.stringify(daily));
        return daily.count;
    }

    function loadQueue() {
        try {
            const parsed = JSON.parse(storageGet(QUEUE_KEY, '[]'));
            return Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE) : [];
        } catch (error) {
            return [];
        }
    }

    function saveQueue(queue) {
        const safe = Array.isArray(queue) ? queue.slice(-MAX_QUEUE) : [];
        storageSet(QUEUE_KEY, JSON.stringify(safe));
        state.queued = safe.length;
    }

    function queueIncident(payload) {
        const queue = loadQueue();
        if (!queue.some(item => item.fingerprint === payload.fingerprint)) queue.push(payload);
        saveQueue(queue);
    }

    function buildPayload(input = {}, options = {}) {
        const normalized = normalizeError(input.error || input.message || input.reason, input.message || input.reason || 'Unknown incident');
        const category = ALLOWED_CATEGORIES.has(input.category) ? input.category : 'unknown';
        const severity = ALLOWED_SEVERITIES.has(input.severity) ? input.severity : 'error';
        const reason = cleanText(input.reason || normalized.code || category, 100);
        const source = cleanText(input.source || 'foxbear-web-client', 80);
        const pagePath = cleanText(global.location?.pathname || '/', 160);
        const signature = [category, reason, normalized.code, normalized.message, normalized.stack.split(' ').slice(0, 18).join(' ')].join('|');
        const fingerprint = cleanText(input.fingerprint || fnv1a(signature), 64);
        const runtime = global.FoxBearRuntimeHealth?.getReport?.() || null;
        const viewport = `${Math.max(0, global.innerWidth || 0)}x${Math.max(0, global.innerHeight || 0)}`;
        return Object.freeze({
            schemaVersion: 1,
            clientAt: new Date().toISOString(),
            appVersion: cleanText(BUILD_INFO.productVersion || document.body?.dataset?.build || '', 24),
            assetVersion: cleanText(BUILD_INFO.assetVersion || VERSION, 80),
            severity,
            category,
            reason,
            message: normalized.message,
            code: normalized.code,
            stack: normalized.stack,
            fingerprint,
            source,
            pagePath,
            browser: classifyBrowser(),
            platform: classifyPlatform(),
            language: cleanText(global.navigator?.language || '', 24),
            viewport: cleanText(viewport, 32),
            online: global.navigator?.onLine !== false,
            visibility: cleanText(document.visibilityState || '', 20),
            memoryGb: Math.max(0, Math.min(64, Number(global.navigator?.deviceMemory || 0))),
            cpuCores: Math.max(0, Math.min(64, Number(global.navigator?.hardwareConcurrency || 0))),
            runtimeOk: runtime ? Boolean(runtime.ok) : true,
            resourceFailureCount: Math.max(0, Math.min(99, Number(runtime?.resourceFailures?.length || 0))),
            runtimeErrorCount: Math.max(0, Math.min(99, Number(runtime?.runtimeErrors?.length || 0))),
            runtimeWarningCount: Math.max(0, Math.min(99, Number(runtime?.runtimeWarnings?.length || 0))),
            bootFailed: Boolean(runtime?.bootFailed),
            bootStalled: Boolean(runtime?.bootStalled),
            automatic: options.automatic !== false,
            context: redactSensitiveText(input.context || '', 700)
        });
    }

    function shouldSuppress(payload, options = {}) {
        if (!isEnabled() && options.manual !== true) return 'disabled';
        if (payload.automatic) {
            if (state.automaticSentThisSession >= MAX_AUTOMATIC_PER_SESSION) return 'session-limit';
            if (getDailyState().count >= MAX_AUTOMATIC_PER_DAY) return 'daily-limit';
        }
        const last = Number(state.recent.get(payload.fingerprint) || 0);
        if (!options.force && Date.now() - last < DUPLICATE_WINDOW_MS) return 'duplicate';
        return '';
    }

    function withTimeout(promise, timeoutMs = SEND_TIMEOUT_MS) {
        return Promise.race([
            promise,
            new Promise((_, reject) => global.setTimeout(() => reject(Object.assign(new Error('Incident delivery timeout'), { code: 'FOXBEAR_INCIDENT_TIMEOUT' })), timeoutMs))
        ]);
    }

    async function deliver(payload) {
        const bridge = global.FoxBearFirebase;
        if (!bridge?.logIncident) throw Object.assign(new Error('Firebase incident bridge unavailable'), { code: 'FOXBEAR_INCIDENT_BRIDGE_UNAVAILABLE' });
        return withTimeout(bridge.logIncident(payload));
    }

    async function report(input = {}, options = {}) {
        const payload = buildPayload(input, options);
        const suppression = shouldSuppress(payload, options);
        if (suppression) {
            state.suppressed += 1;
            return Object.freeze({ ok: false, suppressed: true, reason: suppression, fingerprint: payload.fingerprint });
        }
        state.attempted += 1;
        state.lastFingerprint = payload.fingerprint;
        state.recent.set(payload.fingerprint, Date.now());
        try {
            const result = await deliver(payload);
            state.delivered += 1;
            state.lastDeliveredAt = Date.now();
            state.lastError = '';
            if (payload.automatic) {
                state.automaticSentThisSession += 1;
                incrementDailyCount();
            }
            return Object.freeze({ ok: true, fingerprint: payload.fingerprint, result: result || null });
        } catch (error) {
            state.failed += 1;
            state.lastError = cleanText(error?.message || error, 300);
            queueIncident(payload);
            return Object.freeze({ ok: false, queued: true, fingerprint: payload.fingerprint, reason: state.lastError });
        }
    }

    async function flushQueue() {
        if (state.flushing || global.navigator?.onLine === false || !isEnabled()) return Object.freeze({ ok: false, skipped: true });
        const queue = loadQueue();
        if (!queue.length) return Object.freeze({ ok: true, delivered: 0, remaining: 0 });
        state.flushing = true;
        const remaining = [];
        let delivered = 0;
        try {
            for (let index = 0; index < queue.length; index += 1) {
                const payload = queue[index];
                try {
                    await deliver(payload);
                    delivered += 1;
                    state.delivered += 1;
                    state.lastDeliveredAt = Date.now();
                    if (payload.automatic) {
                        state.automaticSentThisSession += 1;
                        incrementDailyCount();
                    }
                } catch (error) {
                    remaining.push(...queue.slice(index));
                    state.lastError = cleanText(error?.message || error, 300);
                    break;
                }
            }
            saveQueue(remaining);
            return Object.freeze({ ok: remaining.length === 0, delivered, remaining: remaining.length });
        } finally {
            state.flushing = false;
        }
    }

    function reportRuntimeIssue(detail = {}) {
        const issue = detail.issue || detail.failure || detail.error || detail;
        const category = detail.type === 'resource' || issue?.path ? 'resource' : detail.type === 'boot' ? 'boot' : 'runtime';
        return report({
            category,
            severity: category === 'boot' ? 'fatal' : 'error',
            reason: issue?.reason || detail.reason || category,
            message: issue?.message || (issue?.path ? `${issue.tag || 'asset'} load failure: ${issue.path}` : detail.message || 'Runtime issue'),
            code: issue?.code || '',
            error: issue,
            context: issue?.path ? `asset=${issue.path}; version=${issue.version || ''}` : ''
        }, { automatic: true });
    }

    function reportRuntimeHealth(reportDetail = {}) {
        const health = reportDetail?.detail || reportDetail;
        if (!health || health.ok) return;
        const firstResource = health.resourceFailures?.[0];
        const firstError = health.runtimeErrors?.[0];
        return report({
            category: health.bootFailed || health.bootStalled ? 'boot' : firstResource ? 'resource' : 'runtime',
            severity: health.bootFailed ? 'fatal' : 'error',
            reason: health.bootFailed ? 'boot-failed' : health.bootStalled ? 'boot-stalled' : firstResource?.reason || firstError?.reason || 'runtime-health-failed',
            message: firstError?.message || (firstResource ? `Resource failed: ${firstResource.path}` : 'Runtime health check failed'),
            error: firstError || null,
            context: `resources=${health.resourceFailures?.length || 0}; errors=${health.runtimeErrors?.length || 0}; warnings=${health.runtimeWarnings?.length || 0}`
        }, { automatic: true });
    }

    async function waitForDelivery(reportId, timeoutMs = 20000) {
        const bridge = global.FoxBearFirebase;
        if (!reportId || !bridge?.getIncidentDelivery) return { status: 'submitted', reason: 'delivery-status-unavailable' };
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
            const delivery = await bridge.getIncidentDelivery(reportId).catch(error => ({ status: 'unknown', reason: cleanText(error?.message || error, 120) }));
            if (['emailed', 'failed', 'suppressed-duplicate', 'suppressed-rate-limit'].includes(delivery.status)) return delivery;
            await new Promise(resolve => global.setTimeout(resolve, 1800));
        }
        return { status: 'pending', reason: 'function-not-finished' };
    }

    async function test() {
        const submission = await report({
            category: 'manual-test',
            severity: 'warning',
            reason: 'manual-test',
            message: 'FoxBear automatic incident email test',
            context: 'This is a user-triggered delivery verification. No audio data or file name is included.'
        }, { automatic: false, manual: true, force: true });
        const reportId = submission?.result?.reportId || '';
        if (!submission.ok || !reportId) return submission;
        return Object.freeze({ ...submission, delivery: await waitForDelivery(reportId) });
    }

    function renderControls(message = '') {
        const toggle = document.getElementById('incidentReportingToggle');
        const testButton = document.getElementById('incidentReportingTest');
        const status = document.getElementById('incidentReportingStatus');
        const current = getStatus();
        if (toggle) {
            toggle.textContent = current.enabled ? '자동 신고 켜짐' : '자동 신고 꺼짐';
            toggle.setAttribute('aria-pressed', current.enabled ? 'true' : 'false');
        }
        if (testButton) testButton.disabled = !current.enabled;
        if (status) status.textContent = message || `대기 ${current.queued}건 · 오늘 자동 제출 ${current.dailyCount}/${MAX_AUTOMATIC_PER_DAY}`;
    }

    function bindControls() {
        const toggle = document.getElementById('incidentReportingToggle');
        const testButton = document.getElementById('incidentReportingTest');
        if (toggle && !toggle.dataset.bound) {
            toggle.dataset.bound = 'true';
            toggle.addEventListener('click', () => {
                const enabled = setEnabled(!isEnabled());
                renderControls(enabled ? '자동 문제 신고를 켰습니다.' : '자동 문제 신고를 껐습니다.');
                if (enabled) flushQueue().then(() => renderControls()).catch(() => renderControls());
            });
        }
        if (testButton && !testButton.dataset.bound) {
            testButton.dataset.bound = 'true';
            testButton.addEventListener('click', async () => {
                testButton.disabled = true;
                renderControls('테스트 신고를 제출하고 메일 상태를 확인 중입니다…');
                const result = await test();
                const status = result?.delivery?.status || (result?.ok ? 'submitted' : result?.reason || 'failed');
                const messages = {
                    emailed: '테스트 메일 발송 완료: mcwoogi@gmail.com',
                    pending: '신고는 저장됐지만 메일 함수 완료를 아직 확인하지 못했습니다.',
                    submitted: '신고 저장 완료. 메일 함수 배포 상태를 확인하세요.',
                    'suppressed-duplicate': '동일 테스트가 중복 억제됐습니다.',
                    'suppressed-rate-limit': '서버 일일 메일 상한으로 억제됐습니다.',
                    failed: '메일 발송 함수가 실패했습니다. Firestore delivery 상태를 확인하세요.'
                };
                renderControls(messages[status] || `테스트 결과: ${status}`);
                testButton.disabled = !isEnabled();
            });
        }
        renderControls();
    }

    function getStatus() {
        return Object.freeze({
            version: VERSION,
            enabled: isEnabled(),
            destination: 'mcwoogi@gmail.com',
            automaticSentThisSession: state.automaticSentThisSession,
            dailyCount: getDailyState().count,
            queued: loadQueue().length,
            attempted: state.attempted,
            delivered: state.delivered,
            suppressed: state.suppressed,
            failed: state.failed,
            lastError: state.lastError,
            lastFingerprint: state.lastFingerprint,
            lastDeliveredAt: state.lastDeliveredAt
        });
    }

    global.addEventListener('foxbear:runtime-issue', event => { reportRuntimeIssue(event.detail || {}).catch(() => {}); });
    global.addEventListener('foxbear:update-safety-risk', event => {
        report({ category: 'update-safety', severity: 'error', reason: 'update-safety-risk', message: 'Update safety risk detected', context: JSON.stringify(event.detail || {}).slice(0, 650) }, { automatic: true }).catch(() => {});
    });
    global.addEventListener('foxbear:release-worker-mismatch', event => {
        report({ category: 'release-mismatch', severity: 'error', reason: 'service-worker-generation-mismatch', message: 'Service worker generation mismatch', context: JSON.stringify(event.detail || {}).slice(0, 650) }, { automatic: true }).catch(() => {});
    });
    global.addEventListener('foxbear:firebase-ready', () => { flushQueue().catch(() => {}); });
    global.addEventListener('online', () => { flushQueue().catch(() => {}); });

    document.addEventListener('DOMContentLoaded', () => {
        bindControls();
        global.setTimeout(() => {
            const health = global.FoxBearRuntimeHealth?.getReport?.();
            if (health && !health.ok) reportRuntimeHealth(health)?.catch?.(() => {});
            flushQueue().catch(() => {});
        }, 1800);
    });

    global.FoxBearIncidentReporter = Object.freeze({
        version: VERSION,
        report,
        reportRuntimeIssue,
        flushQueue,
        test,
        isEnabled,
        setEnabled,
        getStatus,
        waitForDelivery
    });
})(window);
