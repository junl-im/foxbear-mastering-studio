// FoxBear incident settings controls rendering and binding helpers - v1.6.83
(function attachFoxBearIncidentControlsView(global) {
    'use strict';

    const support = global.FoxBearIncidentSupport;
    if (!support) throw new Error('FoxBear incident support module is not loaded.');
    const { cleanText } = support;

    const IDS = Object.freeze({
        toggle: 'incidentReportingToggle',
        testButton: 'incidentReportingTest',
        retryButton: 'incidentServiceRetry',
        recoveryButton: 'incidentAutoRecovery',
        diagnosticsButton: 'incidentDiagnosticsCopy',
        recoveryStatus: 'incidentAutoRecoveryStatus',
        deploymentButton: 'incidentDeploymentCheck',
        deployCopyButton: 'incidentDeployCopy',
        historyClear: 'incidentHistoryClear',
        transportMetricsClear: 'incidentTransportMetricsClear',
        deploymentHistoryClear: 'incidentDeploymentHistoryClear',
        deploymentChecks: 'incidentDeploymentChecks',
        recoveryActions: 'incidentRecoveryActions',
        status: 'incidentReportingStatus'
    });

    function collect(documentObject) {
        return Object.freeze(Object.fromEntries(Object.entries(IDS).map(([name, id]) => [name, documentObject?.getElementById?.(id) || null])));
    }

    function setBusy(node, busy) {
        if (!node) return;
        node.setAttribute?.('aria-busy', busy ? 'true' : 'false');
    }

    function recoveryStatusModel(recovery = {}, nowValue = Date.now()) {
        const now = Number(nowValue) || Date.now();
        const remainingSeconds = Number(recovery.nextAt || 0) > now ? Math.max(1, Math.ceil((Number(recovery.nextAt) - now) / 1000)) : 0;
        if (recovery.inFlight) return Object.freeze({ text: '서버 연결·로컬 대기열·배포 상태를 순서대로 복구 중입니다.', tone: 'active' });
        if (recovery.waitingForOnline) return Object.freeze({ text: '오프라인 상태 · 연결 복구 시 자동 재확인', tone: 'warning' });
        if (remainingSeconds) return Object.freeze({ text: `일시적 연결 오류 감지 · ${remainingSeconds}초 후 자동 재확인 (${Math.max(0, Number(recovery.attempt || 0))}/${Math.max(0, Number(recovery.maxAttempts || 0))})`, tone: 'warning' });
        if (recovery.lastResult?.ok === true) return Object.freeze({ text: `최근 자동 복구 성공 · 대기열 ${Math.max(0, Number(recovery.lastResult.queueRemaining || 0))}건`, tone: 'ok' });
        if (recovery.lastResult?.ok === false) return Object.freeze({ text: `최근 자동 복구 실패 · ${cleanText(recovery.lastResult.code || recovery.lastResult.status || '확인 필요', 80)}`, tone: 'error' });
        return Object.freeze({ text: '일시적 네트워크·인증 오류는 최대 3회 자동 재확인하며, 실패 신고는 로컬 대기열에 보관합니다.', tone: 'neutral' });
    }

    function render(documentObject, model = {}) {
        const nodes = collect(documentObject);
        const recovery = model.recovery || {};
        const deployment = model.deployment || {};
        if (nodes.toggle) {
            nodes.toggle.textContent = model.enabled ? '자동 신고 켜짐' : '자동 신고 꺼짐';
            nodes.toggle.setAttribute?.('aria-pressed', model.enabled ? 'true' : 'false');
        }
        if (nodes.testButton) {
            nodes.testButton.disabled = !model.enabled || model.testInFlight === true;
            setBusy(nodes.testButton, model.testInFlight === true);
        }
        if (nodes.retryButton) {
            nodes.retryButton.disabled = model.testInFlight === true || model.serviceCheckInFlight === true || recovery.inFlight === true;
            setBusy(nodes.retryButton, model.serviceCheckInFlight === true);
        }
        if (nodes.recoveryButton) {
            nodes.recoveryButton.disabled = model.testInFlight === true || model.serviceCheckInFlight === true || recovery.inFlight === true;
            nodes.recoveryButton.textContent = recovery.inFlight ? '자동 복구 실행 중…' : '연결 자동 복구';
            setBusy(nodes.recoveryButton, recovery.inFlight === true);
        }
        if (nodes.diagnosticsButton) nodes.diagnosticsButton.disabled = recovery.inFlight === true;
        if (nodes.recoveryStatus) {
            const status = recoveryStatusModel(recovery, model.now);
            nodes.recoveryStatus.textContent = status.text;
            if (nodes.recoveryStatus.dataset) nodes.recoveryStatus.dataset.tone = status.tone;
        }
        if (nodes.deploymentButton) {
            nodes.deploymentButton.disabled = model.testInFlight === true || deployment.inFlight === true || deployment.ready !== true;
            nodes.deploymentButton.textContent = deployment.inFlight ? '배포 상태 점검 중…' : deployment.ready ? '배포 상태 자체 점검' : `다시 점검 ${Math.max(0, Number(deployment.remainingSeconds || 0))}초 후`;
            setBusy(nodes.deploymentButton, deployment.inFlight === true);
        }
        if (nodes.deployCopyButton?.dataset) nodes.deployCopyButton.dataset.command = cleanText(model.deployCommand || '', 500);
        if (nodes.status) {
            nodes.status.textContent = cleanText(model.message || `대기 ${Math.max(0, Number(model.queued || 0))}건 · 오늘 자동 제출 ${Math.max(0, Number(model.dailyCount || 0))}/${Math.max(0, Number(model.maxDaily || 0))}`, 320);
            if (nodes.status.dataset) nodes.status.dataset.tone = /완료|켜짐|대기 0건/.test(nodes.status.textContent) ? 'ok' : (/오류|실패|권한|중단/.test(nodes.status.textContent) ? 'error' : 'neutral');
        }
        return nodes;
    }

    function bindOnce(node, key, eventName, listener) {
        if (!node || typeof listener !== 'function') return false;
        const safeKey = cleanText(key || eventName || 'default', 40).replace(/[^a-z0-9_-]/gi, '') || 'default';
        const marker = `bound${safeKey.charAt(0).toUpperCase()}${safeKey.slice(1)}`;
        if (node.dataset?.[marker]) return false;
        if (node.dataset) node.dataset[marker] = 'true';
        node.addEventListener?.(eventName || 'click', listener);
        return true;
    }

    function flashButton(globalObject, button, text, fallbackText, delayMs = 1600) {
        if (!button) return false;
        const previous = cleanText(button.textContent || fallbackText || '', 120);
        button.textContent = cleanText(text || '', 120);
        globalObject?.setTimeout?.(() => { button.textContent = previous || cleanText(fallbackText || '', 120); }, Math.max(100, Math.min(10000, Number(delayMs) || 1600)));
        return true;
    }

    global.FoxBearIncidentControlsView = Object.freeze({
        version: '1.6.83',
        ids: IDS,
        collect,
        recoveryStatusModel,
        render,
        bindOnce,
        flashButton
    });
})(typeof window !== 'undefined' ? window : globalThis);
