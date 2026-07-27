// FoxBear automatic incident reporter - v1.6.10
(function attachFoxBearIncidentReporter(global) {
    'use strict';

    const BUILD_INFO = global.FoxBearBuildInfo || {};
    const VERSION = BUILD_INFO.assetVersion || '1.6.10-incident-readiness-contract-csp-cache-hardening';
    const CLIENT_PRODUCT_VERSION = String(BUILD_INFO.productVersion || document.body?.dataset?.build || '1.6.10').trim();
    const STORAGE_PREFIX = 'foxbear-incident-reporter-v1';
    const ENABLED_KEY = `${STORAGE_PREFIX}:enabled`;
    const QUEUE_KEY = `${STORAGE_PREFIX}:queue`;
    const DAILY_KEY = `${STORAGE_PREFIX}:daily`;
    const TEST_HISTORY_KEY = `${STORAGE_PREFIX}:test-history`;
    const DEPLOYMENT_READINESS_KEY = `${STORAGE_PREFIX}:deployment-readiness`;
    const DEPLOYMENT_HISTORY_KEY = `${STORAGE_PREFIX}:deployment-history`;
    const DEPLOY_COMMAND = 'npm run deploy:incident';
    const MAX_QUEUE = 8;
    const MAX_TEST_HISTORY = 5;
    const MAX_DEPLOYMENT_HISTORY = 3;
    const MAX_AUTOMATIC_PER_SESSION = 5;
    const MAX_AUTOMATIC_PER_DAY = 12;
    const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;
    const SEND_TIMEOUT_MS = 12000;
    const FIREBASE_READY_TIMEOUT_MS = 15000;
    const DELIVERY_STATUS_TIMEOUT_MS = 45000;
    const DEPLOYMENT_CHECK_COOLDOWN_MS = 60 * 1000;
    const READINESS_SUMMARY_FRESH_MS = 24 * 60 * 60 * 1000;
    const INCIDENT_STATUS_EVENT = 'foxbear:incident-status-change';
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
        testInFlight: false,
        serviceStatus: null,
        serviceError: '',
        serviceErrorCode: '',
        serviceEndpoint: '',
        serviceCheckInFlight: null,
        lastTestResult: null,
        historyRetryReportId: '',
        historyRefreshTimer: 0,
        historySyncInFlight: null,
        lastHistorySyncAt: 0,
        deploymentCheckInFlight: null,
        deploymentReadiness: null,
        deploymentRefreshTimer: 0
    };

    function storageGet(key, fallback = '') {
        try { return global.localStorage?.getItem?.(key) ?? fallback; }
        catch (error) { return fallback; }
    }

    function storageSet(key, value) {
        try { global.localStorage?.setItem?.(key, value); return true; }
        catch (error) { return false; }
    }


    function loadTestHistory() {
        try {
            const parsed = JSON.parse(storageGet(TEST_HISTORY_KEY, '[]'));
            return Array.isArray(parsed) ? parsed.slice(0, MAX_TEST_HISTORY) : [];
        } catch (error) {
            return [];
        }
    }

    function saveTestHistory(items) {
        const safe = Array.isArray(items) ? items.slice(0, MAX_TEST_HISTORY) : [];
        storageSet(TEST_HISTORY_KEY, JSON.stringify(safe));
        return safe;
    }

    function clearTestHistory() {
        saveTestHistory([]);
        renderTestHistory();
    }

    const DEPLOYMENT_CHECK_KEYS = Object.freeze(['csp', 'functions', 'firestore', 'smtpSecret', 'smtpConnection']);
    const DEPLOYMENT_CHECK_KEY_SET = new Set(DEPLOYMENT_CHECK_KEYS);

    function normalizeDeploymentCheck(value = {}) {
        return Object.freeze({
            ok: value?.ok === true,
            status: cleanText(value?.status || (value?.ok ? 'ready' : 'unknown'), 24),
            code: cleanText(value?.code || '', 80),
            reason: cleanText(value?.reason || '', 80),
            message: cleanText(value?.message || '', 240)
        });
    }

    function normalizeDeploymentReadinessSnapshot(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const sourceChecks = value.checks && typeof value.checks === 'object' ? value.checks : {};
        const checks = Object.fromEntries(DEPLOYMENT_CHECK_KEYS.map(key => [key, normalizeDeploymentCheck(sourceChecks[key])]));
        const checkedAt = cleanText(value.checkedAt || '', 40);
        const service = Object.freeze({
            status: cleanText(value?.service?.status || '', 20),
            productVersion: cleanText(value?.service?.productVersion || '', 24),
            region: cleanText(value?.service?.region || '', 40),
            functionsOrigin: cleanText(value?.service?.functionsOrigin || '', 180)
        });
        const contractValid = Boolean(
            Number.isFinite(Date.parse(checkedAt))
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
            lastHealthyAt: cleanText(value.lastHealthyAt || '', 40),
            nextCheckAt: cleanText(value.nextCheckAt || '', 40),
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
        if (!value || typeof value !== 'object' || !Number.isFinite(Date.parse(String(value.checkedAt || '')))) return null;
        return Object.freeze({
            checkedAt: cleanText(value.checkedAt || '', 40),
            ok: value.ok === true,
            cached: value.cached === true,
            failed: Array.isArray(value.failed) ? value.failed.map(key => cleanText(key, 32)).filter(key => DEPLOYMENT_CHECK_KEY_SET.has(key)).slice(0, 5) : [],
            serverVersion: cleanText(value.serverVersion || '', 24),
            lastHealthyAt: cleanText(value.lastHealthyAt || '', 40)
        });
    }

    function loadDeploymentHistory() {
        try {
            const parsed = JSON.parse(storageGet(DEPLOYMENT_HISTORY_KEY, '[]'));
            return Array.isArray(parsed) ? parsed.map(normalizeDeploymentHistoryEntry).filter(Boolean).slice(0, MAX_DEPLOYMENT_HISTORY) : [];
        } catch (error) {
            return [];
        }
    }

    function saveDeploymentHistory(items) {
        const safe = Array.isArray(items) ? items.map(normalizeDeploymentHistoryEntry).filter(Boolean).slice(0, MAX_DEPLOYMENT_HISTORY) : [];
        storageSet(DEPLOYMENT_HISTORY_KEY, JSON.stringify(safe));
        return safe;
    }

    function readinessFailureKeys(value = {}) {
        return DEPLOYMENT_CHECK_KEYS.filter(key => value?.checks?.[key]?.ok !== true);
    }

    function appendDeploymentHistory(value = {}) {
        const checkedAt = cleanText(value?.checkedAt || '', 40);
        if (!checkedAt) return loadDeploymentHistory();
        const entry = {
            checkedAt,
            ok: value?.ok === true,
            cached: value?.cached === true || value?.localCached === true,
            failed: readinessFailureKeys(value),
            serverVersion: cleanText(value?.service?.productVersion || '', 24),
            lastHealthyAt: cleanText(value?.lastHealthyAt || '', 40)
        };
        const history = loadDeploymentHistory().filter(item => item?.checkedAt !== checkedAt);
        history.unshift(entry);
        return saveDeploymentHistory(history);
    }

    function clearDeploymentHistory() {
        saveDeploymentHistory([]);
        renderDeploymentHistory();
    }

    function emitIncidentStatusChange(reason = 'status') {
        const summary = getSettingsSummary();
        try {
            const detail = Object.freeze({ reason, summary, readiness: state.deploymentReadiness || loadDeploymentReadiness() });
            const event = typeof global.CustomEvent === 'function' ? new global.CustomEvent(INCIDENT_STATUS_EVENT, { detail }) : { type: INCIDENT_STATUS_EVENT, detail };
            global.dispatchEvent?.(event);
        } catch (error) {}
        return summary;
    }

    function saveDeploymentReadiness(value) {
        const safe = normalizeDeploymentReadinessSnapshot(value);
        if (safe) {
            storageSet(DEPLOYMENT_READINESS_KEY, JSON.stringify(safe));
            appendDeploymentHistory(safe);
        }
        state.deploymentReadiness = safe;
        renderDeploymentHistory();
        syncSettingsSummary();
        emitIncidentStatusChange('deployment-readiness');
        return safe;
    }

    function formatCheckTime(value = '') {
        const parsed = Date.parse(String(value || ''));
        return Number.isFinite(parsed) ? new Date(parsed).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    }

    function getDeploymentCheckAvailability(result = state.deploymentReadiness, now = Date.now()) {
        const nextAt = Date.parse(String(result?.nextCheckAt || ''));
        const remainingMs = Number.isFinite(nextAt) ? Math.max(0, nextAt - Number(now || Date.now())) : 0;
        return Object.freeze({ ready: remainingMs <= 0, remainingMs, remainingSeconds: Math.max(0, Math.ceil(remainingMs / 1000)) });
    }

    function deploymentRecoveryInfo(key = '', item = {}) {
        if (item?.ok === true) return Object.freeze({ message: '', command: '' });
        const map = {
            csp: ['Hosting CSP를 포함해 전체 오류 신고 배포를 다시 실행하세요.', DEPLOY_COMMAND],
            functions: ['Callable Functions를 최신 웹 버전에 맞게 다시 배포하세요.', DEPLOY_COMMAND],
            firestore: ['Firebase 프로젝트와 Firestore Admin 연결을 확인한 뒤 다시 배포하세요.', DEPLOY_COMMAND],
            smtpSecret: ['FIREBASE_SETUP.md의 Gmail 앱 비밀번호 Secret 등록 절차를 확인하세요.', 'FIREBASE_SETUP.md'],
            smtpConnection: ['Gmail 2단계 인증·앱 비밀번호·Functions 네트워크 상태를 확인하세요.', 'FIREBASE_SETUP.md']
        };
        const [message, command] = map[key] || ['배포 문서와 Functions 로그를 확인하세요.', DEPLOY_COMMAND];
        return Object.freeze({ message, command });
    }

    function getSettingsSummary() {
        const readiness = state.deploymentReadiness || loadDeploymentReadiness();
        if (!isEnabled()) return Object.freeze({ label: '꺼짐', tone: 'off' });
        if (readiness?.ok === true) {
            const checkedAt = Date.parse(String(readiness.checkedAt || ''));
            const fresh = Number.isFinite(checkedAt) && Date.now() - checkedAt <= READINESS_SUMMARY_FRESH_MS;
            const serverOld = compareVersions(readiness?.service?.productVersion, CLIENT_PRODUCT_VERSION) === -1;
            return Object.freeze(serverOld ? { label: '업데이트', tone: 'danger' } : fresh ? { label: '정상', tone: 'ok' } : { label: '재확인', tone: 'neutral' });
        }
        if (readiness && readiness.ok === false) return Object.freeze({ label: '확인 필요', tone: 'danger' });
        if (state.serviceStatus?.status === 'ready') return Object.freeze({ label: '연결됨', tone: 'ok' });
        return Object.freeze({ label: '미확인', tone: 'neutral' });
    }

    function syncSettingsSummary() {
        const summary = getSettingsSummary();
        const button = document.querySelector?.('[data-native-action="incident-reporting"]');
        if (!button) return summary;
        button.dataset.incidentTone = summary.tone;
        const node = button.querySelector?.('[data-setting-state]');
        if (node) node.textContent = summary.label;
        return summary;
    }

    function historyStatusLabel(status = '') {
        const labels = {
            emailed: 'SMTP 접수 완료', pending: '처리 지연', submitted: '대기열 저장', retrying: '자동 재시도 중', sending: 'SMTP 전송 중',
            'status-check-failed': '상태 조회 실패', 'server-api-not-deployed': '서버 미배포',
            'server-network-blocked': '연결 차단', 'server-api-unavailable': '서버 연결 실패',
            'server-api-internal': '서버 내부 오류', 'authentication-failed': '인증 실패',
            'permission-denied': '권한 오류', 'smtp-secret-invalid': 'SMTP Secret 오류',
            'smtp-auth-failed': 'Gmail 인증 실패', 'smtp-recipient-rejected': '수신 거부',
            'smtp-rate-limited': '발송 한도', 'smtp-network-failed': 'SMTP 연결 실패',
            failed: '발송 실패', 'dead-letter': '최종 실패'
        };
        return labels[status] || cleanText(status || '결과 미확인', 40);
    }

    function formatRetryCountdown(value, now = Date.now()) {
        const retryAt = Date.parse(String(value || ''));
        if (!Number.isFinite(retryAt)) return '';
        const remainingMs = retryAt - Number(now || Date.now());
        if (remainingMs <= 0) return '자동 재시도 가능';
        const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
        if (minutes < 60) return `자동 재시도까지 약 ${minutes}분`;
        const hours = Math.floor(minutes / 60);
        const rest = minutes % 60;
        return `자동 재시도까지 약 ${hours}시간${rest ? ` ${rest}분` : ''}`;
    }

    function getHistoryRetryAvailability(item = {}, now = Date.now()) {
        const retryCount = Math.max(0, Number(item.userRetryCount || 0));
        const retryLimit = Math.max(1, Number(item.userRetryLimit || 2));
        const status = String(item.status || '');
        const visible = Boolean(item.reportId && !item.terminal && retryCount < retryLimit
            && !['emailed', 'pending', 'submitted', 'retrying', 'sending', 'dead-letter'].includes(status));
        const availableAt = Date.parse(String(item.userRetryAvailableAt || ''));
        const remainingMs = Number.isFinite(availableAt) ? Math.max(0, availableAt - Number(now || Date.now())) : 0;
        return Object.freeze({ visible, ready: visible && remainingMs <= 0, remainingMs, remainingSeconds: Math.max(0, Math.ceil(remainingMs / 1000)), retryCount, retryLimit });
    }

    function canRetryHistoryItem(item = {}) {
        return getHistoryRetryAvailability(item).ready;
    }

    function scheduleHistoryRefresh(history = loadTestHistory()) {
        if (state.historyRefreshTimer) global.clearTimeout(state.historyRefreshTimer);
        state.historyRefreshTimer = 0;
        const now = Date.now();
        const activeStatuses = new Set(['pending', 'submitted', 'failed', 'retrying', 'sending', 'status-check-failed']);
        const active = history.some(item => item?.reportId && !item?.terminal && activeStatuses.has(String(item?.status || '')));
        const nextTimes = history.flatMap(item => [item?.nextRetryAt, item?.userRetryAvailableAt])
            .map(value => Date.parse(String(value || ''))).filter(value => Number.isFinite(value) && value > now).sort((a, b) => a - b);
        const hasCooldown = history.some(item => getHistoryRetryAvailability(item, now).remainingMs > 0);
        if (!active && !nextTimes.length && !hasCooldown) return;
        let delay = active ? 15000 : 30000;
        if (nextTimes.length) delay = Math.min(delay, Math.max(1000, nextTimes[0] - now));
        if (hasCooldown) delay = Math.min(delay, 1000);
        state.historyRefreshTimer = global.setTimeout(async () => {
            state.historyRefreshTimer = 0;
            const shouldSync = active && Date.now() - state.lastHistorySyncAt >= 14000;
            if (shouldSync) await refreshTestHistoryFromServer({ silent: true }).catch(() => renderTestHistory());
            else renderTestHistory();
        }, delay);
    }

    function appendTestHistory(status, result = {}, message = '') {
        const delivery = result?.delivery || {};
        const reportId = cleanText(result?.result?.reportId || result?.reportId || '', 180);
        const entry = {
            at: new Date().toISOString(),
            status: cleanText(status || 'failed', 60),
            label: historyStatusLabel(status),
            detail: cleanText(message || delivery.message || delivery.reason || '', 180),
            reportId,
            messageId: cleanText(delivery.messageId || '', 120),
            attemptCount: Math.max(0, Number(delivery.attemptCount || 0)),
            nextRetryAt: cleanText(delivery.nextRetryAt || '', 40),
            terminal: delivery.terminal === true,
            userRetryCount: Math.max(0, Number(delivery.userRetryCount || 0)),
            userRetryLimit: Math.max(1, Number(delivery.userRetryLimit || 2)),
            userRetryRequestedAt: cleanText(delivery.userRetryRequestedAt || '', 40),
            userRetryAvailableAt: cleanText(delivery.userRetryAvailableAt || '', 40),
            checkedAt: cleanText(delivery.checkedAt || '', 40)
        };
        const history = loadTestHistory().filter(item => item?.reportId !== reportId || !reportId);
        history.unshift(entry);
        saveTestHistory(history);
        state.lastTestResult = entry;
        renderTestHistory();
        return entry;
    }

    function renderTestHistory() {
        const list = document.getElementById('incidentReportingHistory');
        const clear = document.getElementById('incidentHistoryClear');
        if (!list) return;
        const history = loadTestHistory();
        list.replaceChildren();
        if (!history.length) {
            const empty = document.createElement('li');
            empty.className = 'incident-history-empty';
            empty.textContent = '아직 실행한 메일 테스트가 없습니다.';
            list.appendChild(empty);
            if (clear) clear.hidden = true;
            scheduleHistoryRefresh([]);
            return;
        }
        if (clear) clear.hidden = false;
        history.forEach(item => {
            const row = document.createElement('li');
            row.dataset.state = item.status === 'emailed' ? 'ok' : ['pending', 'submitted', 'retrying', 'sending'].includes(item.status) ? 'warning' : 'error';
            const head = document.createElement('div');
            const label = document.createElement('strong');
            const time = document.createElement('time');
            label.textContent = cleanText(item.label || historyStatusLabel(item.status), 60);
            time.dateTime = cleanText(item.at || '', 40);
            const parsed = Date.parse(item.at || '');
            time.textContent = Number.isFinite(parsed) ? new Date(parsed).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '시간 미확인';
            head.append(label, time);
            const detail = document.createElement('span');
            detail.textContent = cleanText(item.detail || item.messageId || item.reportId || '상세 정보 없음', 180);
            const meta = document.createElement('div');
            meta.className = 'incident-history-meta';
            const attempt = document.createElement('small');
            const retryLabel = formatRetryCountdown(item.nextRetryAt);
            const attemptLabel = Number(item.attemptCount || 0) > 0 ? `SMTP 시도 ${Number(item.attemptCount)}회` : 'SMTP 시도 전';
            const userRetryLabel = Number(item.userRetryCount || 0) > 0 ? `직접 재시도 ${Number(item.userRetryCount)}/${Math.max(1, Number(item.userRetryLimit || 2))}` : '';
            attempt.textContent = [attemptLabel, retryLabel, userRetryLabel].filter(Boolean).join(' · ');
            meta.appendChild(attempt);
            const availability = getHistoryRetryAvailability(item);
            if (availability.visible) {
                const retry = document.createElement('button');
                retry.type = 'button';
                retry.className = 'incident-history-retry';
                retry.dataset.cooldown = availability.remainingSeconds > 0 ? 'true' : 'false';
                retry.textContent = state.historyRetryReportId === item.reportId ? '재시도 중…' : availability.remainingSeconds > 0 ? `다시 시도 ${availability.remainingSeconds}초 후` : '지금 다시 시도';
                retry.disabled = Boolean(state.testInFlight || state.historyRetryReportId || !availability.ready);
                retry.addEventListener('click', () => retryHistoryItem(item, retry));
                meta.appendChild(retry);
            }
            row.append(head, detail, meta);
            list.appendChild(row);
        });
        scheduleHistoryRefresh(history);
    }

    async function retryHistoryItem(item = {}, button = null) {
        const reportId = cleanText(item.reportId || '', 180);
        const availability = getHistoryRetryAvailability(item);
        if (!reportId || !availability.ready || state.testInFlight || state.historyRetryReportId) return false;
        state.historyRetryReportId = reportId;
        renderControls('실패한 메일 테스트를 안전하게 다시 전송합니다…');
        if (button) button.disabled = true;
        try {
            const bridge = await waitForFirebaseBridge();
            if (typeof bridge.retryOwnIncidentReport !== 'function') throw Object.assign(new Error('재시도 서버 기능이 아직 배포되지 않았습니다.'), { code: 'functions/not-found' });
            const delivery = await bridge.retryOwnIncidentReport(reportId);
            const status = classifyMailTestFailure(delivery?.status || delivery?.outcome || 'failed', delivery?.code || '', `${delivery?.reason || ''} ${delivery?.message || ''}`);
            const message = status === 'emailed'
                ? '재시도 SMTP 접수 완료: 받은편지함과 스팸함을 확인하세요.'
                : `${historyStatusLabel(status)} · ${cleanText(delivery?.message || delivery?.reason || delivery?.outcome || '처리 결과를 확인하세요.', 140)}`;
            appendTestHistory(status, { reportId, result: { reportId }, delivery }, message);
            renderRecoveryGuidance(status, delivery?.code || '', delivery?.message || delivery?.reason || '');
            renderControls(message);
            return status === 'emailed';
        } catch (error) {
            const code = cleanText(error?.code || error?.name || 'retry-failed', 80);
            const reason = cleanText(error?.message || error, 180);
            const status = classifyMailTestFailure(code, code, reason);
            renderRecoveryGuidance(status, code, reason);
            renderControls(`메일 재시도 실패 · ${code} · ${reason}`);
            return false;
        } finally {
            state.historyRetryReportId = '';
            renderTestHistory();
        }
    }

    function mergeHistoryDelivery(item = {}, delivery = {}) {
        const rawStatus = cleanText(delivery.status || item.status || 'failed', 60);
        const status = classifyMailTestFailure(rawStatus, delivery.code || '', `${delivery.reason || ''} ${delivery.message || ''}`);
        return {
            ...item,
            status,
            label: historyStatusLabel(status),
            detail: cleanText(delivery.message || delivery.reason || item.detail || '', 180),
            messageId: cleanText(delivery.messageId || item.messageId || '', 120),
            attemptCount: Math.max(0, Number(delivery.attemptCount ?? item.attemptCount ?? 0)),
            nextRetryAt: cleanText(delivery.nextRetryAt || '', 40),
            terminal: delivery.terminal === true,
            userRetryCount: Math.max(0, Number(delivery.userRetryCount ?? item.userRetryCount ?? 0)),
            userRetryLimit: Math.max(1, Number(delivery.userRetryLimit ?? item.userRetryLimit ?? 2)),
            userRetryRequestedAt: cleanText(delivery.userRetryRequestedAt || item.userRetryRequestedAt || '', 40),
            userRetryAvailableAt: cleanText(delivery.userRetryAvailableAt || item.userRetryAvailableAt || '', 40),
            checkedAt: cleanText(delivery.checkedAt || new Date().toISOString(), 40)
        };
    }

    async function refreshTestHistoryFromServer(options = {}) {
        if (state.historySyncInFlight) return state.historySyncInFlight;
        const task = (async () => {
            const history = loadTestHistory();
            const candidates = history.filter(item => item?.reportId && !item?.terminal && !['emailed', 'dead-letter'].includes(String(item.status || '')));
            if (!candidates.length) return history;
            const bridge = await waitForFirebaseBridge();
            if (typeof bridge.getIncidentDelivery !== 'function') return history;
            const updates = new Map();
            for (const item of candidates) {
                try { updates.set(item.reportId, await bridge.getIncidentDelivery(item.reportId)); }
                catch (error) { if (!options.silent) throw error; }
            }
            const next = history.map(item => updates.has(item.reportId) ? mergeHistoryDelivery(item, updates.get(item.reportId)) : item);
            saveTestHistory(next);
            state.lastHistorySyncAt = Date.now();
            renderTestHistory();
            return next;
        })().finally(() => { if (state.historySyncInFlight === task) state.historySyncInFlight = null; });
        state.historySyncInFlight = task;
        return task;
    }

    function setDeploymentCheckState(key, stateName = 'idle', message = '확인 전', item = null) {
        const row = document.querySelector?.(`[data-deploy-check="${key}"]`);
        if (!row) return;
        row.dataset.state = stateName;
        const text = row.querySelector?.('span');
        if (text) text.textContent = cleanText(message, 180);
        const info = deploymentRecoveryInfo(key, item || { ok: stateName === 'ok' });
        const recovery = row.querySelector?.('[data-deploy-recovery]');
        if (recovery) {
            recovery.textContent = info.message;
            recovery.hidden = !info.message;
            recovery.dataset.command = info.command;
        }
        const copy = row.querySelector?.('[data-deploy-copy]');
        if (copy) {
            copy.hidden = !info.message;
            copy.dataset.command = info.command;
            copy.textContent = info.command === DEPLOY_COMMAND ? '복구 명령 복사' : '설정 안내 복사';
        }
    }

    function normalizeHttpOrigin(value = '') {
        const text = cleanText(value, 180).replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(text)) return '';
        try {
            const parsed = typeof global.URL === 'function' ? new global.URL(text) : null;
            return parsed?.origin ? cleanText(parsed.origin, 180).replace(/\/+$/, '') : text.match(/^https?:\/\/[^/]+/i)?.[0] || '';
        } catch (error) {
            return text.match(/^https?:\/\/[^/]+/i)?.[0] || '';
        }
    }

    function inspectClientCsp(endpoint = '') {
        const origin = normalizeHttpOrigin(endpoint || state.serviceEndpoint || global.FoxBearFirebase?.incidentFunctionsOrigin || '');
        const policy = document.querySelector?.('meta[http-equiv="Content-Security-Policy"]')?.getAttribute?.('content') || '';
        const connectDirective = String(policy).split(';').map(item => item.trim()).find(item => /^connect-src(?:\s|$)/i.test(item)) || '';
        const sources = connectDirective.split(/\s+/).slice(1).map(normalizeHttpOrigin).filter(Boolean);
        const ok = Boolean(origin && sources.includes(origin));
        const code = origin ? 'FOXBEAR_INCIDENT_CSP_ORIGIN_MISSING' : 'FOXBEAR_INCIDENT_FUNCTIONS_ORIGIN_INVALID';
        const message = ok ? 'Callable 주소가 웹 CSP에 정확히 포함되어 있습니다.' : origin ? 'Callable 주소가 웹 CSP connect-src에 없습니다.' : 'Callable Functions 주소 형식이 올바르지 않습니다.';
        return Object.freeze({ ok, status: ok ? 'ready' : 'error', message, code: ok ? '' : code });
    }

    function renderDeploymentReadiness(result = null) {
        const checks = result?.checks || {};
        const mapping = { functions: 'functions', firestore: 'firestore', smtpSecret: 'smtpSecret', smtpConnection: 'smtpConnection', csp: 'csp' };
        Object.entries(mapping).forEach(([key, checkKey]) => {
            const item = checks[checkKey];
            if (!item) return;
            const stateName = item.ok === true ? 'ok' : item.status === 'checking' ? 'active' : item.status === 'blocked' ? 'warning' : 'error';
            setDeploymentCheckState(key, stateName, item.message || item.code || item.status || '확인 결과 없음', item);
        });
        const meta = document.getElementById('incidentDeploymentMeta');
        if (meta) {
            const checked = formatCheckTime(result?.checkedAt);
            const healthy = formatCheckTime(result?.lastHealthyAt);
            const checkedMs = Date.parse(String(result?.checkedAt || ''));
            const stale = Number.isFinite(checkedMs) && Date.now() - checkedMs > READINESS_SUMMARY_FRESH_MS;
            const parts = [checked ? `최근 점검 ${checked}` : '최근 점검 기록 없음', healthy ? `마지막 정상 ${healthy}` : '', result?.cached ? '서버 캐시 사용' : '', stale ? '24시간 경과 · 재점검 필요' : ''];
            meta.textContent = parts.filter(Boolean).join(' · ');
            meta.dataset.tone = result?.ok === true && !stale ? 'ok' : result ? 'warning' : 'neutral';
        }
        syncSettingsSummary();
    }

    function renderDeploymentHistory() {
        const list = document.getElementById('incidentDeploymentHistory');
        const clear = document.getElementById('incidentDeploymentHistoryClear');
        if (!list) return;
        const history = loadDeploymentHistory();
        list.replaceChildren();
        if (clear) clear.hidden = !history.length;
        if (!history.length) {
            const empty = document.createElement('li');
            empty.className = 'incident-readiness-history-empty';
            empty.textContent = '아직 배포 점검 기록이 없습니다.';
            list.appendChild(empty);
            return;
        }
        const names = { csp: '웹 CSP', functions: '서버 API', firestore: 'Firestore', smtpSecret: 'Gmail Secret', smtpConnection: 'SMTP 연결' };
        history.forEach(item => {
            const row = document.createElement('li');
            row.dataset.state = item.ok ? 'ok' : 'error';
            const head = document.createElement('div');
            const label = document.createElement('strong');
            const time = document.createElement('time');
            label.textContent = item.ok ? '전체 정상' : '확인 필요';
            time.dateTime = cleanText(item.checkedAt || '', 40);
            time.textContent = formatCheckTime(item.checkedAt) || '시간 미확인';
            head.append(label, time);
            const detail = document.createElement('span');
            const failures = (item.failed || []).map(key => names[key] || key).filter(Boolean);
            detail.textContent = item.ok ? `서버 v${item.serverVersion || CLIENT_PRODUCT_VERSION}${item.cached ? ' · 캐시 결과' : ''}` : `${failures.join(' · ') || '점검 실패'}${item.cached ? ' · 캐시 결과' : ''}`;
            row.append(head, detail);
            list.appendChild(row);
        });
    }

    async function copyText(value = '') {
        const text = String(value || '').trim();
        if (!text) return false;
        let copied = false;
        try {
            if (global.navigator?.clipboard?.writeText) {
                await global.navigator.clipboard.writeText(text);
                copied = true;
            }
        } catch (error) {}
        if (!copied) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try { copied = document.execCommand?.('copy') === true; } catch (error) {}
            textarea.remove();
        }
        return copied;
    }

    async function copyDeploymentRecovery(key = '', button = null) {
        const item = state.deploymentReadiness?.checks?.[key] || loadDeploymentReadiness()?.checks?.[key] || { ok: false };
        const info = deploymentRecoveryInfo(key, item);
        const text = info.command === DEPLOY_COMMAND ? DEPLOY_COMMAND : [info.message, info.command].filter(Boolean).join('\n');
        const copied = await copyText(text);
        if (button) {
            const previous = button.textContent;
            button.textContent = copied ? '복사됨' : '복사 실패';
            global.setTimeout(() => { button.textContent = previous || '복구 안내 복사'; }, 1600);
        }
        return copied;
    }

    function scheduleDeploymentRefresh() {
        if (state.deploymentRefreshTimer) global.clearTimeout(state.deploymentRefreshTimer);
        state.deploymentRefreshTimer = 0;
        const availability = getDeploymentCheckAvailability();
        if (availability.ready) return;
        state.deploymentRefreshTimer = global.setTimeout(() => { state.deploymentRefreshTimer = 0; renderControls(); }, Math.min(1000, Math.max(250, availability.remainingMs)));
    }

    async function runDeploymentSelfCheck() {
        if (state.deploymentCheckInFlight) return state.deploymentCheckInFlight;
        const cached = state.deploymentReadiness || loadDeploymentReadiness();
        if (cached && !getDeploymentCheckAvailability(cached).ready) {
            const localCached = normalizeDeploymentReadinessSnapshot({ ...cached, cached: true, localCached: true });
            saveDeploymentReadiness(localCached);
            renderDeploymentReadiness(localCached);
            return localCached;
        }
        ['csp', 'functions', 'firestore', 'smtpSecret', 'smtpConnection'].forEach(key => setDeploymentCheckState(key, 'active', '확인 중…'));
        const task = (async () => {
            const bridge = await waitForFirebaseBridge();
            if (typeof bridge.checkIncidentDeploymentReadiness !== 'function') throw Object.assign(new Error('배포 자체 점검 서버 기능이 아직 배포되지 않았습니다.'), { code: 'functions/not-found' });
            const remote = await bridge.checkIncidentDeploymentReadiness();
            const csp = inspectClientCsp(remote?.service?.functionsOrigin || bridge.incidentFunctionsOrigin || '');
            const combined = Object.freeze({ ...remote, ok: remote?.ok === true && csp.ok, checks: Object.freeze({ ...remote?.checks, csp }) });
            saveDeploymentReadiness(combined);
            if (remote?.service) state.serviceStatus = remote.service;
            renderDeploymentReadiness(combined);
            return combined;
        })().catch(error => {
            const code = cleanText(error?.code || error?.name || 'deployment-check-failed', 80);
            const message = cleanText(error?.message || error, 220);
            const csp = inspectClientCsp();
            const failed = { ok: false, status: 'error', code, message };
            const checkedAt = new Date().toISOString();
            const combined = { ok: false, checkedAt, nextCheckAt: new Date(Date.now() + DEPLOYMENT_CHECK_COOLDOWN_MS).toISOString(), checks: { csp, functions: failed, firestore: failed, smtpSecret: failed, smtpConnection: failed } };
            saveDeploymentReadiness(combined);
            renderDeploymentReadiness(combined);
            throw error;
        }).finally(() => { if (state.deploymentCheckInFlight === task) state.deploymentCheckInFlight = null; });
        state.deploymentCheckInFlight = task;
        return task;
    }

    async function copyDeployCommand() {
        return copyText(DEPLOY_COMMAND);
    }

    function isEnabled() {
        return storageGet(ENABLED_KEY, 'on') !== 'off';
    }

    function setEnabled(value) {
        storageSet(ENABLED_KEY, value ? 'on' : 'off');
        syncSettingsSummary();
        emitIncidentStatusChange('enabled');
        return isEnabled();
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

    const PIPELINE_STAGE_IDS = Object.freeze({
        auth: 'incidentStageAuth',
        api: 'incidentStageApi',
        queue: 'incidentStageQueue',
        mail: 'incidentStageMail'
    });

    function updatePipelineStage(stage, tone = 'idle', message = '') {
        const element = document.getElementById(PIPELINE_STAGE_IDS[stage] || '');
        if (!element) return;
        const item = element.closest?.('[data-incident-stage]');
        if (item) item.dataset.state = tone;
        element.textContent = message || '확인 전';
    }

    function resetPipelineStages() {
        updatePipelineStage('auth', 'idle', '확인 전');
        updatePipelineStage('api', 'idle', '확인 전');
        updatePipelineStage('queue', 'idle', '테스트 대기');
        updatePipelineStage('mail', 'idle', '테스트 대기');
    }

    function renderServiceDiagnostics(service = state.serviceStatus, errorMessage = state.serviceError, errorCode = state.serviceErrorCode) {
        const server = document.getElementById('incidentServiceStatus');
        const appCheck = document.getElementById('incidentAppCheckStatus');
        const bridge = global.FoxBearFirebase?.getStatus?.() || global.FoxBearFirebase || {};
        if (server) {
            if (service?.status === 'ready') {
                const comparison = compareVersions(service.productVersion, CLIENT_PRODUCT_VERSION);
                const versionText = comparison === -1
                    ? `서버 v${service.productVersion || '?'} · 웹 v${CLIENT_PRODUCT_VERSION}보다 오래됨`
                    : comparison === 1
                        ? `서버 v${service.productVersion || '?'} · 웹보다 새 버전`
                        : `서버 v${service.productVersion || CLIENT_PRODUCT_VERSION} · 동기화됨`;
                server.textContent = `${versionText} · ${service.region || 'region 확인 중'}`;
                state.serviceEndpoint = cleanText(service.functionsOrigin || global.FoxBearFirebase?.incidentFunctionsOrigin || '', 180);
                server.dataset.tone = comparison === -1 ? 'warning' : 'ok';
            } else if (errorMessage) {
                const codeText = cleanText(errorCode || '', 80);
                server.textContent = `서버 상태 확인 실패${codeText ? ` (${codeText})` : ''} · ${cleanText(errorMessage, 150)}`;
                server.dataset.tone = 'error';
            } else {
                server.textContent = '서버 상태를 확인하지 않았습니다.';
                server.dataset.tone = 'neutral';
            }
        }
        if (appCheck) {
            const local = service?.clientAppCheck || bridge.appCheck || {};
            const configured = local.configured === true;
            const ready = local.ready === true;
            const tokenPresent = service?.appCheckTokenPresent === true;
            const enforced = service?.appCheckEnforced === true;
            appCheck.textContent = enforced
                ? `App Check 강제 적용 · ${tokenPresent ? '토큰 확인' : '토큰 없음'}`
                : configured
                    ? `App Check 감시 모드 · ${ready && tokenPresent ? '토큰 확인' : '토큰 준비 중'}`
                    : 'App Check 선택 설정 · 현재는 익명 인증으로 동작';
            appCheck.dataset.tone = enforced && !tokenPresent ? 'error' : (configured && ready ? 'ok' : 'neutral');
        }
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

    function classifyMailTestFailure(rawStatus = '', failureCode = '', failureReason = '') {
        const evidence = `${rawStatus} ${failureCode} ${failureReason}`;
        if (/functions\/(?:not-found|unimplemented)|FOXBEAR_INCIDENT_SERVICE_STATUS_UNAVAILABLE/i.test(evidence)) return 'server-api-not-deployed';
        if (/FOXBEAR_INCIDENT_CALLABLE_NETWORK_BLOCKED|failed to fetch|networkerror|network request failed|load failed|content security policy|refused to connect|csp/i.test(evidence)) return 'server-network-blocked';
        if (/FOXBEAR_INCIDENT_CALLABLE_UNAVAILABLE|functions\/unavailable/i.test(evidence)) return 'server-api-unavailable';
        if (/functions\/internal/i.test(evidence)) return 'server-api-internal';
        if (/permission-denied|PERMISSION_DENIED|Missing or insufficient permissions/i.test(evidence)) return 'permission-denied';
        if (/unauthenticated|FOXBEAR_INCIDENT_AUTH_NOT_READY/i.test(evidence)) return 'authentication-failed';
        if (/FOXBEAR_GMAIL_SECRET_INVALID|secret-invalid|16-character Google app password/i.test(evidence)) return 'smtp-secret-invalid';
        if (/smtp-auth-failed|EAUTH|\b535\b|\b534\b|invalid login|username and password not accepted|bad credentials/i.test(evidence)) return 'smtp-auth-failed';
        if (/recipient-rejected|FOXBEAR_SMTP_NO_ACCEPTED_RECIPIENT|EENVELOPE|\b550\b|\b553\b|recipient.*reject/i.test(evidence)) return 'smtp-recipient-rejected';
        if (/daily-email-limit|smtp-rate-limited|rate.?limit|quota|\b421\b|\b450\b|\b454\b/i.test(evidence)) return 'smtp-rate-limited';
        if (/smtp-connection-failed|ETIMEDOUT|ESOCKET|ECONNECTION|ECONNRESET|ENOTFOUND|smtp.*timeout/i.test(evidence)) return 'smtp-network-failed';
        return rawStatus || failureCode || 'failed';
    }

    function renderRecoveryGuidance(status = '', code = '', detail = '') {
        const guidance = document.getElementById('incidentReportingGuidance');
        if (!guidance) return;
        const endpoint = cleanText(state.serviceEndpoint || global.FoxBearFirebase?.incidentFunctionsOrigin || '', 160);
        const messages = {
            'server-network-blocked': `서버 API 연결이 브라우저 보안정책 또는 네트워크에서 차단됐습니다. npm run deploy:incident로 Hosting CSP와 Functions를 함께 배포하세요.${endpoint ? ` endpoint: ${endpoint}` : ''}`,
            'server-api-not-deployed': 'Callable Functions가 아직 배포되지 않았습니다. npm run deploy:incident를 실행한 뒤 다시 확인하세요.',
            'server-api-unavailable': 'Firebase Functions 초기화가 완료되지 않았습니다. 네트워크 연결과 Firebase SDK 로드를 확인하세요.',
            'server-api-internal': 'Callable Functions 내부 오류입니다. Firebase Functions 로그와 Secret 설정을 확인하세요.',
            'permission-denied': '익명 인증 또는 Firestore 규칙이 현재 웹 빌드와 맞지 않습니다. npm run deploy:incident로 규칙과 Functions를 함께 갱신하세요.',
            'authentication-failed': '익명 인증이 실패했습니다. Firebase Authentication의 익명 로그인을 활성화했는지 확인하세요.',
            'smtp-secret-invalid': 'Gmail 앱 비밀번호 Secret이 없거나 16자리 형식이 아닙니다. Secret을 다시 등록한 뒤 Functions를 배포하세요.',
            'smtp-auth-failed': 'Gmail이 앱 비밀번호 인증을 거부했습니다. 2단계 인증과 앱 비밀번호 상태를 확인하고 Secret을 교체하세요.',
            'smtp-recipient-rejected': 'Gmail SMTP가 수신 주소를 승인하지 않았습니다. 수신 주소와 Gmail 정책을 확인하세요.',
            'smtp-rate-limited': 'Gmail 또는 앱의 일일 발송 한도에 도달했습니다. 표시된 재시도 시각 이후 다시 확인하세요.',
            'smtp-network-failed': 'Firebase Functions에서 Gmail SMTP 연결에 실패했습니다. 잠시 후 다시 시도하고 Functions 로그를 확인하세요.'
        };
        const codeText = cleanText(code || '', 80);
        const detailText = cleanText(detail || '', 180);
        guidance.textContent = messages[status] || '단계별 상태에서 실패 지점을 확인할 수 있습니다.';
        if (codeText || detailText) guidance.textContent += ` 진단: ${[codeText, detailText].filter(Boolean).join(' · ')}`;
        guidance.dataset.tone = messages[status] ? 'error' : 'neutral';
    }

    async function refreshServiceStatus(options = {}) {
        if (state.serviceCheckInFlight && options.force !== true) return state.serviceCheckInFlight;
        let authComplete = false;
        const task = (async () => {
            updatePipelineStage('auth', 'active', '익명 인증 확인 중');
            const bridge = await waitForFirebaseBridge();
            if (!bridge.authReady && typeof bridge.signInGuest === 'function') await bridge.signInGuest();
            const bridgeStatus = bridge.getStatus?.() || bridge;
            if (!bridgeStatus.authReady && !bridgeStatus.uid) throw Object.assign(new Error('익명 인증 상태를 확인하지 못했습니다.'), { code: 'FOXBEAR_INCIDENT_AUTH_NOT_READY' });
            updatePipelineStage('auth', 'ok', '익명 인증 완료');
            authComplete = true;
            updatePipelineStage('api', 'active', '서버 버전 확인 중');
            if (typeof bridge.getIncidentServiceStatus !== 'function') throw Object.assign(new Error('서버 상태 API가 현재 웹 빌드에 없습니다.'), { code: 'FOXBEAR_INCIDENT_SERVICE_STATUS_UNAVAILABLE' });
            const service = await bridge.getIncidentServiceStatus();
            state.serviceStatus = service;
            state.serviceError = '';
            state.serviceErrorCode = '';
            state.serviceEndpoint = cleanText(service?.functionsOrigin || bridge?.incidentFunctionsOrigin || '', 180);
            const comparison = compareVersions(service?.productVersion, CLIENT_PRODUCT_VERSION);
            updatePipelineStage('api', comparison === -1 ? 'warning' : 'ok', comparison === -1
                ? `서버 v${service?.productVersion || '?'} · 업데이트 필요`
                : `서버 v${service?.productVersion || CLIENT_PRODUCT_VERSION} 연결 완료`);
            renderServiceDiagnostics(service, '');
            return service;
        })().catch(error => {
            state.serviceStatus = null;
            state.serviceError = cleanText(error?.message || error, 240);
            state.serviceErrorCode = cleanText(error?.code || error?.name || '', 80);
            state.serviceEndpoint = cleanText(error?.endpoint || global.FoxBearFirebase?.incidentFunctionsOrigin || '', 180);
            if (authComplete) updatePipelineStage('api', 'error', '서버 상태 확인 실패');
            else updatePipelineStage('auth', 'error', '익명 인증 또는 Firebase 연결 실패');
            renderServiceDiagnostics(null, state.serviceError, state.serviceErrorCode);
            renderRecoveryGuidance(classifyMailTestFailure(state.serviceErrorCode, state.serviceErrorCode, state.serviceError), state.serviceErrorCode, state.serviceError);
            throw error;
        }).finally(() => {
            if (state.serviceCheckInFlight === task) state.serviceCheckInFlight = null;
        });
        state.serviceCheckInFlight = task;
        return task;
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

    async function test(options = {}) {
        const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
        const testId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
        onProgress('queue', 'active', '서버 대기열에 저장 중');
        const submission = await report({
            category: 'manual-test',
            severity: 'warning',
            reason: 'manual-test',
            message: 'AI마스터링 스튜디오 실제 메일 발송 테스트',
            fingerprint: `manual-test-${testId}`,
            context: `사용자가 직접 실행한 실제 Gmail SMTP 발송 검증입니다. 테스트 ID=${testId}. 오디오 데이터와 파일명은 포함되지 않습니다.`
        }, { automatic: false, manual: true, force: true });
        const reportId = submission?.result?.reportId || '';
        if (!submission.ok || !reportId) {
            onProgress('queue', 'error', '대기열 저장 실패');
            return submission;
        }
        const transport = submission?.result?.transport === 'firestore' ? 'Firestore 호환 경로' : 'Callable 서버';
        onProgress('queue', 'ok', `${transport} 저장 완료`);
        onProgress('mail', 'active', 'SMTP 처리 결과 확인 중');
        const delivery = await waitForDelivery(reportId);
        const classified = classifyMailTestFailure(delivery?.status || '', delivery?.code || '', `${delivery?.reason || ''} ${delivery?.message || ''}`);
        const mailTone = delivery?.status === 'emailed' ? 'ok' : ['pending', 'submitted'].includes(delivery?.status) ? 'warning' : 'error';
        const mailLabels = {
            emailed: 'SMTP 접수 완료', pending: '처리 지연', 'status-check-failed': '상태 조회 실패',
            'smtp-secret-invalid': 'SMTP Secret 오류', 'smtp-auth-failed': 'Gmail 인증 실패',
            'smtp-recipient-rejected': '수신 거부', 'smtp-rate-limited': '발송 한도',
            'smtp-network-failed': 'SMTP 연결 실패', failed: '발송 실패', 'dead-letter': '최종 실패'
        };
        onProgress('mail', mailTone, mailLabels[classified] || `결과 ${delivery?.status || 'unknown'}`);
        return Object.freeze({ ...submission, delivery });
    }

    function renderControls(message = '') {
        const toggle = document.getElementById('incidentReportingToggle');
        const testButton = document.getElementById('incidentReportingTest');
        const retryButton = document.getElementById('incidentServiceRetry');
        const deploymentButton = document.getElementById('incidentDeploymentCheck');
        const copyButton = document.getElementById('incidentDeployCopy');
        const historyClear = document.getElementById('incidentHistoryClear');
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
        if (retryButton) {
            retryButton.disabled = state.testInFlight || Boolean(state.serviceCheckInFlight);
            retryButton.setAttribute('aria-busy', state.serviceCheckInFlight ? 'true' : 'false');
        }
        if (deploymentButton) {
            const availability = getDeploymentCheckAvailability();
            deploymentButton.disabled = state.testInFlight || Boolean(state.deploymentCheckInFlight) || !availability.ready;
            deploymentButton.textContent = state.deploymentCheckInFlight ? '배포 상태 점검 중…' : availability.ready ? '배포 상태 자체 점검' : `다시 점검 ${availability.remainingSeconds}초 후`;
            deploymentButton.setAttribute('aria-busy', state.deploymentCheckInFlight ? 'true' : 'false');
        }
        if (copyButton) copyButton.dataset.command = DEPLOY_COMMAND;
        if (status) {
            status.textContent = message || `대기 ${current.queued}건 · 오늘 자동 제출 ${current.dailyCount}/${MAX_AUTOMATIC_PER_DAY}`;
            status.dataset.tone = /완료|켜짐|대기 0건/.test(status.textContent) ? 'ok' : (/오류|실패|권한|중단/.test(status.textContent) ? 'error' : 'neutral');
        }
        renderServiceDiagnostics();
        renderDeploymentReadiness(state.deploymentReadiness || loadDeploymentReadiness());
        renderDeploymentHistory();
        renderTestHistory();
        scheduleDeploymentRefresh();
        syncSettingsSummary();
    }

    function bindControls() {
        if (!state.deploymentReadiness) state.deploymentReadiness = loadDeploymentReadiness();
        const toggle = document.getElementById('incidentReportingToggle');
        const testButton = document.getElementById('incidentReportingTest');
        const retryButton = document.getElementById('incidentServiceRetry');
        const deploymentButton = document.getElementById('incidentDeploymentCheck');
        const copyButton = document.getElementById('incidentDeployCopy');
        const historyClear = document.getElementById('incidentHistoryClear');
        const deploymentHistoryClear = document.getElementById('incidentDeploymentHistoryClear');
        const deploymentChecks = document.getElementById('incidentDeploymentChecks');
        if (toggle && !toggle.dataset.bound) {
            toggle.dataset.bound = 'true';
            toggle.addEventListener('click', () => {
                const enabled = setEnabled(!isEnabled());
                renderControls(enabled ? '자동 문제 신고를 켰습니다.' : '자동 문제 신고를 껐습니다.');
                if (enabled) flushQueue().then(() => renderControls()).catch(() => renderControls());
            });
        }
        if (retryButton && !retryButton.dataset.bound) {
            retryButton.dataset.bound = 'true';
            retryButton.addEventListener('click', async () => {
                retryButton.disabled = true;
                renderControls('서버 연결과 배포 버전을 다시 확인합니다…');
                try {
                    const service = await refreshServiceStatus({ force: true });
                    const comparison = compareVersions(service?.productVersion, CLIENT_PRODUCT_VERSION);
                    renderControls(comparison === -1 ? `서버 v${service?.productVersion || '?'}가 웹보다 오래됐습니다.` : '오류 신고 서버 연결이 정상입니다.');
                    renderRecoveryGuidance('', '', '');
                } catch (error) {
                    const code = cleanText(error?.code || error?.name || '', 80);
                    const reason = cleanText(error?.message || error, 180);
                    const status = classifyMailTestFailure(code, code, reason);
                    renderRecoveryGuidance(status, code, reason);
                    renderControls(`서버 연결 재확인 실패 · ${code || reason}`);
                }
            });
        }
        if (deploymentButton && !deploymentButton.dataset.bound) {
            deploymentButton.dataset.bound = 'true';
            deploymentButton.addEventListener('click', async () => {
                renderControls('웹·서버·Firestore·Gmail SMTP 배포 상태를 점검합니다…');
                try {
                    const result = await runDeploymentSelfCheck();
                    renderControls(result.ok ? '배포 상태 자체 점검 완료 · 모든 항목 정상' : '배포 상태 자체 점검에서 확인이 필요한 항목이 있습니다.');
                    renderRecoveryGuidance(result.ok ? '' : 'server-api-internal', '', result.ok ? '' : '점검 결과의 오류 항목을 확인하세요.');
                } catch (error) {
                    const code = cleanText(error?.code || error?.name || '', 80);
                    const reason = cleanText(error?.message || error, 180);
                    renderRecoveryGuidance(classifyMailTestFailure(code, code, reason), code, reason);
                    renderControls(`배포 상태 자체 점검 실패 · ${code || reason}`);
                }
            });
        }
        if (copyButton && !copyButton.dataset.bound) {
            copyButton.dataset.bound = 'true';
            copyButton.addEventListener('click', async () => {
                const copied = await copyDeployCommand();
                const previous = copyButton.textContent;
                copyButton.textContent = copied ? '배포 명령 복사됨' : '복사 실패';
                global.setTimeout(() => { copyButton.textContent = previous || '배포 명령 복사'; }, 1800);
            });
        }
        if (deploymentChecks && !deploymentChecks.dataset.copyBound) {
            deploymentChecks.dataset.copyBound = 'true';
            deploymentChecks.addEventListener('click', event => {
                const button = event.target?.closest?.('[data-deploy-copy]');
                const row = button?.closest?.('[data-deploy-check]');
                if (button && row) copyDeploymentRecovery(row.dataset.deployCheck || '', button);
            });
        }
        if (deploymentHistoryClear && !deploymentHistoryClear.dataset.bound) {
            deploymentHistoryClear.dataset.bound = 'true';
            deploymentHistoryClear.addEventListener('click', clearDeploymentHistory);
        }
        if (historyClear && !historyClear.dataset.bound) {
            historyClear.dataset.bound = 'true';
            historyClear.addEventListener('click', clearTestHistory);
        }
        if (testButton && !testButton.dataset.bound) {
            testButton.dataset.bound = 'true';
            testButton.addEventListener('click', async () => {
                if (state.testInFlight) return;
                state.testInFlight = true;
                resetPipelineStages();
                renderControls('인증·서버·대기열·SMTP 순서로 메일 경로를 확인합니다…');
                let finalMessage = '메일 테스트를 완료하지 못했습니다.';
                try {
                    try { await refreshServiceStatus({ force: true }); } catch (error) {}
                    let result;
                    try { result = await test({ onProgress: updatePipelineStage }); }
                    catch (error) { result = { ok: false, code: cleanText(error?.code || error?.name || 'failed', 80), reason: cleanText(error?.message || error, 180) }; }
                    const rawStatus = result?.delivery?.status || (result?.ok ? 'submitted' : result?.code || 'failed');
                    const failureCode = cleanText(result?.delivery?.code || result?.code || '', 80);
                    const failureReason = cleanText(result?.delivery?.message || result?.delivery?.reason || result?.reason || '', 180);
                    const status = classifyMailTestFailure(rawStatus, failureCode, failureReason);
                    const messages = {
                        emailed: 'Gmail SMTP 접수 완료: 받은편지함과 스팸함을 확인하세요.',
                        pending: '신고는 저장됐지만 45초 안에 메일 함수 완료를 확인하지 못했습니다.',
                        submitted: '서버 대기열 저장 완료. 메일 처리 상태를 확인하세요.',
                        'status-check-failed': '신고는 저장됐지만 서버의 메일 상태를 확인하지 못했습니다.',
                        'permission-denied': '오류 신고 서버가 요청을 허용하지 않았습니다. 익명 인증과 최신 서버 기능 배포를 확인하세요. 신고는 로컬 대기열에 보관했습니다.',
                        'server-api-not-deployed': '최신 오류 신고 서버 기능이 아직 배포되지 않았습니다. npm run deploy:incident 실행 후 다시 테스트하세요.',
                        'server-network-blocked': 'Firebase Callable 연결이 브라우저 CSP 또는 네트워크에서 차단됐습니다. Hosting과 Functions를 함께 배포하세요.',
                        'server-api-unavailable': 'Firebase Functions 연결이 초기화되지 않았습니다. 네트워크와 SDK 로드를 확인하세요.',
                        'server-api-internal': 'Firebase Callable 내부 오류가 발생했습니다. Functions 로그와 Secret 설정을 확인하세요.',
                        'authentication-failed': 'Firebase 익명 인증에 실패했습니다. Authentication 설정을 확인하세요.',
                        'smtp-secret-invalid': 'SMTP Secret이 없거나 Google 앱 비밀번호 형식이 잘못됐습니다.',
                        'smtp-auth-failed': 'Gmail이 앱 비밀번호 인증을 거부했습니다.',
                        'smtp-recipient-rejected': 'Gmail SMTP가 수신 주소를 승인하지 않았습니다.',
                        'smtp-rate-limited': '메일 발송 한도에 도달했습니다. 재시도 시각 이후 다시 확인하세요.',
                        'smtp-network-failed': 'Firebase Functions에서 Gmail SMTP 연결에 실패했습니다.',
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
                        const retryAt = cleanText(result?.delivery?.nextRetryAt || '', 40);
                        if (retryAt && ['smtp-rate-limited', 'failed'].includes(status)) finalMessage += ` · 재시도 ${retryAt}`;
                    }
                    renderRecoveryGuidance(status, failureCode, failureReason);
                    if (compareVersions(state.serviceStatus?.productVersion, CLIENT_PRODUCT_VERSION) === -1) {
                        finalMessage += ` · 서버 v${state.serviceStatus.productVersion}를 웹 v${CLIENT_PRODUCT_VERSION}에 맞게 배포하세요.`;
                    }
                    appendTestHistory(status, result, finalMessage);
                } finally {
                    state.testInFlight = false;
                    renderControls(finalMessage);
                }
            });
        }
        renderControls();
        const dialogVisible = document.getElementById('incidentReportingDialog')?.classList?.contains('show');
        if (dialogVisible) {
            refreshServiceStatus().catch(() => {});
            refreshTestHistoryFromServer({ silent: true }).catch(() => {});
        }
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
            lastDeliveredAt: state.lastDeliveredAt,
            serviceStatus: state.serviceStatus,
            serviceError: state.serviceError,
            serviceErrorCode: state.serviceErrorCode,
            serviceEndpoint: state.serviceEndpoint,
            recentTests: loadTestHistory(),
            deploymentReadiness: state.deploymentReadiness || loadDeploymentReadiness(),
            deploymentHistory: loadDeploymentHistory(),
            settingsSummary: getSettingsSummary(),
            deployCommand: DEPLOY_COMMAND
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
        waitForFirebaseBridge,
        refreshServiceStatus,
        compareVersions,
        updatePipelineStage,
        classifyMailTestFailure,
        renderRecoveryGuidance,
        loadTestHistory,
        clearTestHistory,
        renderTestHistory,
        refreshTestHistoryFromServer,
        getHistoryRetryAvailability,
        runDeploymentSelfCheck,
        inspectClientCsp,
        appendTestHistory,
        copyDeployCommand,
        formatRetryCountdown,
        canRetryHistoryItem,
        retryHistoryItem,
        loadDeploymentReadiness,
        saveDeploymentReadiness,
        loadDeploymentHistory,
        clearDeploymentHistory,
        renderDeploymentHistory,
        copyDeploymentRecovery,
        emitIncidentStatusChange,
        getDeploymentCheckAvailability,
        deploymentRecoveryInfo,
        getSettingsSummary,
        syncSettingsSummary,
        normalizeDeploymentReadinessSnapshot,
        normalizeHttpOrigin
    });
})(window);
