// FoxBear incident diagnostics DOM rendering and status event helpers - v1.6.113
(function attachFoxBearIncidentDiagnosticsView(global) {
    'use strict';

    const support = global.FoxBearIncidentSupport;
    if (!support) throw new Error('FoxBear incident support module is not loaded.');
    const { cleanText } = support;

    function applyItem(documentObject, id, item) {
        const node = documentObject?.getElementById?.(id);
        if (!node || !item) return false;
        node.textContent = cleanText(item.text || '', 320);
        if (node.dataset) node.dataset.tone = cleanText(item.tone || 'neutral', 20) || 'neutral';
        const title = cleanText(item.title || '', 240);
        if (title) node.title = title;
        else node.removeAttribute?.('title');
        return true;
    }

    function renderService(documentObject, model = {}) {
        const rows = Object.freeze({
            incidentServiceStatus: model.server,
            incidentFunctionStatus: model.functionStatus,
            incidentEndpointStatus: model.endpointStatus,
            incidentSameOriginStatus: model.sameOriginStatus,
            incidentDirectStatus: model.directStatus,
            incidentCspStatus: model.cspStatus,
            incidentAppCheckStatus: model.appCheckStatus
        });
        let rendered = 0;
        for (const [id, item] of Object.entries(rows)) rendered += applyItem(documentObject, id, item) ? 1 : 0;
        return Object.freeze({ rendered, total: Object.keys(rows).length });
    }

    function buildQueueStatus(metrics = {}, coordination = {}) {
        const last = metrics.last && typeof metrics.last === 'object' ? metrics.last : null;
        const queueCount = Math.max(0, Number(coordination.queueCount || 0));
        const peerShardCount = Math.max(0, Number(coordination.peerShardCount || 0));
        const recovered = Math.max(0, Number(metrics.queueRecovered || 0));
        const lastText = last?.at
            ? ` · 최근 ${cleanText(last.phase || '확인', 40)} ${last.ok ? '성공' : '실패'} (${cleanText(last.transport || 'unknown', 48)})`
            : '';
        const peerText = peerShardCount > 0 ? ` · 다른 탭 대기열 ${peerShardCount}개 동기화` : '';
        const ownerText = coordination.lockOwnedByPeer ? ' · 다른 탭 복구 중' : '';
        const fallbackText = coordination.syncMode === 'storage-polling' ? ' · 호환 동기화 사용 중' : '';
        const takeoverText = Number(coordination.staleLeaseTakeovers || 0) > 0 ? ` · 강제 종료 인계 ${Math.max(0, Number(coordination.staleLeaseTakeovers || 0))}회` : '';
        return Object.freeze({
            text: `로컬 대기열 복구 ${recovered}건 · 현재 ${queueCount}건${peerText}${ownerText}${fallbackText}${takeoverText}${lastText}`,
            tone: queueCount > 0 || coordination.lockOwnedByPeer ? 'warning' : (recovered > 0 ? 'ok' : 'neutral')
        });
    }

    function renderQueue(documentObject, metrics = {}, coordination = {}) {
        const node = documentObject?.getElementById?.('incidentTransportQueue');
        const status = buildQueueStatus(metrics, coordination);
        if (!node) return Object.freeze({ rendered: false, ...status });
        node.textContent = status.text;
        if (node.dataset) node.dataset.tone = status.tone;
        return Object.freeze({ rendered: true, ...status });
    }

    function emitStatus(globalObject, eventName, detail = {}) {
        const type = cleanText(eventName || '', 120);
        if (!type) return false;
        try {
            const safeDetail = Object.freeze({ ...detail, reason: cleanText(detail.reason || 'status', 100) });
            const event = typeof globalObject?.CustomEvent === 'function'
                ? new globalObject.CustomEvent(type, { detail: safeDetail })
                : { type, detail: safeDetail };
            globalObject?.dispatchEvent?.(event);
            return true;
        } catch (error) {
            return false;
        }
    }

    global.FoxBearIncidentDiagnosticsView = Object.freeze({
        version: '1.6.113',
        applyItem,
        renderService,
        buildQueueStatus,
        renderQueue,
        emitStatus
    });
})(typeof window !== 'undefined' ? window : globalThis);
