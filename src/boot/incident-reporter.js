// FoxBear automatic incident reporter - v1.5.95
(function attachFoxBearIncidentReporter(global) {
    'use strict';

    const BUILD_INFO = global.FoxBearBuildInfo || {};
    const VERSION = BUILD_INFO.assetVersion || '1.5.95-popup-settings-mail-test-recovery';
    const STORAGE_PREFIX = 'foxbear-incident-reporter-v1';
    const ENABLED_KEY = `${STORAGE_PREFIX}:enabled`;
    const QUEUE_KEY = `${STORAGE_PREFIX}:queue`;
    const DAILY_KEY = `${STORAGE_PREFIX}:daily`;
    const MAX_QUEUE = 8;
    const MAX_AUTOMATIC_PER_SESSION = 5;
    const MAX_AUTOMATIC_PER_DAY = 12;
    const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;
    const SEND_TIMEOUT_MS = 12000;
    const FIREBASE_READY_TIMEOUT_MS = 15000;
    const DELIVERY_STATUS_TIMEOUT_MS = 45000;
    const ALLOWED_SEVERITIES = new Set(['warning', 'error', 'fatal']);
    const ALLOWED_CATEGORIES = new Set([
        'runtime', 'resource', 'boot', 'mastering', 'mastering-memory', 'quality-recovery', 'export',
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
        flushing: false,
        testInFlight: false
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
        return new Promise((resolve, reject) => {
            const timer = global.setTimeout(() => reject(Object.assign(new Error('Incident delivery timeout'), { code: 'FOXBEAR_INCIDENT_TIMEOUT' })), timeoutMs);
            Promise.resolve(promise).then(
                value => { global.clearTimeout(timer); resolve(value); },
                error => { global.clearTimeout(timer); reject(error); }
            );
        });
    }

    function waitForFirebaseBridge(timeoutMs = FIREBASE_READY_TIMEOUT_MS) {
        const current = global.FoxBearFirebase;
        if (current?.ready === true && current?.logIncident && current?.getIncidentDelivery) return Promise.resolve(current);
        return new Promise((resolve, reject) => {
            let settled = false;
            let timer = 0;
            const cleanup = () => {
                if (timer) global.clearTimeout(timer);
                global.removeEventListener('foxbear:firebase-ready', onReady);
                global.removeEventListener('foxbear:firebase-error', onError);
            };
            const finish = (callback, value) => {
                if (settled) return;
                settled = true;
                cleanup();
                callback(value);
            };
            const onReady = () => {
                const bridge = global.FoxBearFirebase;
                if (bridge?.ready === true && bridge?.logIncident && bridge?.getIncidentDelivery) finish(resolve, bridge);
            };
            const onError = event => {
                const message = cleanText(event?.detail?.error || global.FoxBearFirebase?.error || 'Firebase initialization failed', 300);
                const error = Object.assign(new Error(message), { code: 'FOXBEAR_INCIDENT_FIREBASE_ERROR' });
                finish(reject, error);
            };
            global.addEventListener('foxbear:firebase-ready', onReady);
            global.addEventListener('foxbear:firebase-error', onError);
            timer = global.setTimeout(() => {
                const message = cleanText(global.FoxBearFirebase?.error || 'Firebase incident bridge unavailable', 300);
                finish(reject, Object.assign(new Error(message), { code: 'FOXBEAR_INCIDENT_BRIDGE_UNAVAILABLE' }));
            }, Math.max(1000, Number(timeoutMs || FIREBASE_READY_TIMEOUT_MS)));
            onReady();
        });
    }

    async function deliver(payload) {
        const bridge = await waitForFirebaseBridge();
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
            return Object.freeze({ ok: false, queued: true, fingerprint: payload.fingerprint, code: cleanText(error?.code || error?.name || 'FOXBEAR_INCIDENT_DELIVERY_FAILED', 80), reason: state.lastError });
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

    async function waitForDelivery(reportId, timeoutMs = DELIVERY_STATUS_TIMEOUT_MS) {
        if (!reportId) return { status: 'submitted', reason: 'delivery-status-unavailable' };
        let bridge;
        try {
            bridge = await waitForFirebaseBridge();
        } catch (error) {
            return { status: 'status-check-failed', reason: cleanText(error?.message || error, 160), code: cleanText(error?.code || error?.name || '', 80) };
        }
        const startedAt = Date.now();
        let lastCheckError = null;
        while (Date.now() - startedAt < timeoutMs) {
            try {
                const delivery = await bridge.getIncidentDelivery(reportId);
                lastCheckError = null;
                if (['emailed', 'failed', 'dead-letter', 'suppressed-duplicate', 'suppressed-rate-limit'].includes(delivery.status)) return delivery;
            } catch (error) {
                lastCheckError = error;
            }
            await new Promise(resolve => global.setTimeout(resolve, 1800));
        }
        if (lastCheckError) {
            return { status: 'status-check-failed', reason: cleanText(lastCheckError?.message || lastCheckError, 160), code: cleanText(lastCheckError?.code || lastCheckError?.name || '', 80) };
        }
        return { status: 'pending', reason: 'function-not-finished' };
    }

    async function test() {
        const testId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
        const submission = await report({
            category: 'manual-test',
            severity: 'warning',
            reason: 'manual-test',
            message: 'AI마스터링 스튜디오 실제 메일 발송 테스트',
            fingerprint: `manual-test-${testId}`,
            context: `사용자가 직접 실행한 실제 Gmail SMTP 발송 검증입니다. 테스트 ID=${testId}. 오디오 데이터와 파일명은 포함되지 않습니다.`
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
        if (testButton) {
            testButton.disabled = !current.enabled || state.testInFlight;
            testButton.setAttribute('aria-busy', state.testInFlight ? 'true' : 'false');
        }
        if (status) {
            status.textContent = message || `대기 ${current.queued}건 · 오늘 자동 제출 ${current.dailyCount}/${MAX_AUTOMATIC_PER_DAY}`;
            status.dataset.tone = /완료|켜짐|대기 0건/.test(status.textContent) ? 'ok' : (/오류|실패|권한|중단/.test(status.textContent) ? 'error' : 'neutral');
        }
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
                if (state.testInFlight) return;
                state.testInFlight = true;
                renderControls('실제 테스트 메일을 발송하고 Gmail SMTP 접수 상태를 확인 중입니다…');
                let finalMessage = '메일 테스트를 완료하지 못했습니다.';
                try {
                    let result;
                    try { result = await test(); }
                    catch (error) { result = { ok: false, code: cleanText(error?.code || error?.name || 'failed', 80), reason: cleanText(error?.message || error, 180) }; }
                    const rawStatus = result?.delivery?.status || (result?.ok ? 'submitted' : result?.code || 'failed');
                    const failureCode = cleanText(result?.delivery?.code || result?.code || '', 80);
                    const failureReason = cleanText(result?.delivery?.message || result?.delivery?.reason || result?.reason || '', 180);
                    const permissionFailure = /permission-denied|PERMISSION_DENIED|Missing or insufficient permissions/i.test(`${rawStatus} ${failureCode} ${failureReason}`);
                    const status = permissionFailure ? 'permission-denied' : rawStatus;
                    const messages = {
                        emailed: 'Gmail SMTP 접수 완료: 받은편지함과 스팸함을 확인하세요.',
                        pending: '신고는 저장됐지만 45초 안에 메일 함수 완료를 확인하지 못했습니다.',
                        submitted: '신고 저장 완료. 메일 함수 배포 상태를 확인하세요.',
                        'status-check-failed': '신고 저장 후 메일 상태 조회에 실패했습니다.',
                        'permission-denied': 'Firebase 권한 오류입니다. 익명 인증과 최신 Firestore 규칙·Functions 배포를 확인하세요. 신고는 로컬 대기열에 보관했습니다.',
                        FOXBEAR_INCIDENT_BRIDGE_UNAVAILABLE: 'Firebase 연결이 준비되지 않아 테스트 신고를 로컬 대기열에 저장했습니다.',
                        FOXBEAR_INCIDENT_FIREBASE_ERROR: 'Firebase 초기화 오류로 테스트 신고를 로컬 대기열에 저장했습니다.',
                        'suppressed-duplicate': '동일 테스트가 중복 억제됐습니다.',
                        'suppressed-rate-limit': '이전 버전의 일일 한도 상태입니다. 서버가 다음 KST 발송 구간에 자동 복구합니다.',
                        failed: '메일 발송 함수가 실패했습니다. 자동 재시도 상태를 확인하세요.',
                        'dead-letter': '메일 발송이 최대 재시도 횟수를 초과했습니다. 관리자 화면에서 강제 재전송하세요.'
                    };
                    const detail = cleanText(result?.delivery?.message || result?.delivery?.reason || result?.reason || '', 140);
                    const baseMessage = messages[status] || `테스트 결과: ${status}`;
                    if (status === 'emailed') {
                        const subject = cleanText(result?.delivery?.subject || '', 120);
                        const sender = cleanText(result?.delivery?.senderName || 'AI마스터링 스튜디오', 60);
                        const acceptedAt = cleanText(result?.delivery?.smtpAcceptedAt || result?.delivery?.checkedAt || '', 40);
                        const receipt = [sender, subject, acceptedAt ? `접수 ${acceptedAt}` : '', result?.delivery?.messageId ? `ID ${cleanText(result.delivery.messageId, 80)}` : ''].filter(Boolean).join(' · ');
                        finalMessage = `${baseMessage}${receipt ? ` · ${receipt}` : ''}`;
                    } else {
                        finalMessage = detail && status !== 'suppressed-duplicate' ? `${baseMessage} · ${detail}` : baseMessage;
                    }
                } finally {
                    state.testInFlight = false;
                    renderControls(finalMessage);
                }
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
        bindControls,
        renderControls,
        waitForDelivery,
        waitForFirebaseBridge
    });
})(window);
