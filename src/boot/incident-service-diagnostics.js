// FoxBear incident service diagnostics classification and UI view-model - v1.6.74
(function attachFoxBearIncidentServiceDiagnostics(global) {
    'use strict';

    const support = global.FoxBearIncidentSupport;
    if (!support) throw new Error('FoxBear incident support module is not loaded.');
    const { cleanText, compareVersions } = support;

    function classifyFailure(input = {}) {
        const originalCode = cleanText(input.originalCode || input.code || '', 80);
        const originalMessage = cleanText(input.originalMessage || input.message || '', 240);
        const probe = input.probe && typeof input.probe === 'object' ? input.probe : null;
        const csp = input.csp && typeof input.csp === 'object' ? input.csp : { ok: true };
        const online = input.online !== false;
        let code = originalCode;
        let message = originalMessage || '서버 상태 확인에 실패했습니다.';

        if (!online || probe?.classification === 'client-offline') {
            code = 'FOXBEAR_INCIDENT_CLIENT_OFFLINE';
            message = '브라우저가 오프라인 상태입니다. 연결 복구 후 자동으로 다시 확인합니다.';
        } else if (probe?.deployed === false || /functions\/(?:not-found|unimplemented)/i.test(originalCode)) {
            code = 'functions/not-found';
            message = 'getIncidentServiceStatus Callable 함수가 배포되지 않았거나 현재 region에 없습니다.';
        } else if (csp.ok === false || probe?.reachable === false) {
            code = 'FOXBEAR_INCIDENT_CALLABLE_NETWORK_BLOCKED';
            message = csp.ok === false
                ? 'Hosting CSP connect-src에 Firebase Functions origin이 포함되지 않았습니다.'
                : 'Firebase Functions endpoint 직접 HTTP 도달성 확인에 실패했습니다.';
        } else if (probe?.reachable === true && probe?.corsReadable === false) {
            code = 'FOXBEAR_INCIDENT_CALLABLE_RESPONSE_BLOCKED';
            message = 'Functions endpoint에는 도달했지만 브라우저가 응답 내용을 읽지 못했습니다. Callable CORS 응답을 확인하세요.';
        } else if (probe?.reachable === true && /functions\/internal/i.test(originalCode)) {
            code = 'functions/internal';
            message = 'Functions endpoint는 응답했지만 Callable 내부 처리에서 오류가 발생했습니다.';
        }

        return Object.freeze({ code: cleanText(code, 80), message: cleanText(message, 240) });
    }

    function item(text, tone = 'neutral', title = '') {
        return Object.freeze({ text: cleanText(text, 320), tone: cleanText(tone, 20) || 'neutral', title: cleanText(title, 240) });
    }

    function buildViewModel(input = {}) {
        const service = input.service && typeof input.service === 'object' ? input.service : null;
        const bridge = input.bridge && typeof input.bridge === 'object' ? input.bridge : {};
        const probe = input.probe && typeof input.probe === 'object' ? input.probe : null;
        const csp = input.csp && typeof input.csp === 'object' ? input.csp : { ok: true, message: '' };
        const clientVersion = cleanText(input.clientVersion || '', 24);
        const errorCode = cleanText(input.errorCode || '', 80);
        const errorMessage = cleanText(input.errorMessage || '', 240);
        const classify = typeof input.classifyFailure === 'function' ? input.classifyFailure : (() => '');
        const functionName = cleanText(bridge.incidentStatusFunctionName || 'getIncidentServiceStatus', 80);
        const origin = cleanText(service?.functionsOrigin || bridge.incidentFunctionsOrigin || input.serviceEndpoint || '', 180).replace(/\/+$/, '');
        const endpoint = origin ? `${origin}/${functionName}` : '';
        const sameOriginPath = cleanText(bridge.incidentSameOriginStatusPath || '/api/incident/status', 120);
        const classification = cleanText(classify(errorCode, errorCode, errorMessage), 80);
        let server;

        if (service?.status === 'ready') {
            const comparison = compareVersions(service.productVersion, clientVersion);
            const versionText = comparison === -1
                ? `서버 v${service.productVersion || '?'} · 업데이트 필요`
                : comparison === 1
                    ? `서버 v${service.productVersion || '?'} · 웹보다 새 버전`
                    : `서버 v${service.productVersion || clientVersion} · 연결 정상`;
            server = item(`${versionText} · ${service.region || 'region 확인 중'}`, comparison === -1 ? 'warning' : 'ok');
        } else if (errorMessage) {
            const concise = classification === 'client-offline'
                ? '브라우저가 오프라인 상태입니다.'
                : classification === 'server-response-blocked'
                    ? 'Endpoint 도달 후 브라우저 응답 읽기가 차단됐습니다.'
                    : classification === 'server-api-not-deployed'
                        ? 'Callable 함수가 배포되지 않았거나 이름이 일치하지 않습니다.'
                        : classification === 'server-network-blocked'
                            ? 'Functions origin에 도달하지 못했습니다.'
                            : classification === 'server-api-internal'
                                ? 'Functions endpoint는 응답했지만 서버 내부 오류가 발생했습니다.'
                                : '서버 상태 확인에 실패했습니다.';
            server = item(`${concise}${errorCode ? ` (${errorCode})` : ''}`, 'error');
        } else {
            server = item('서버 상태를 확인하지 않았습니다.', 'neutral');
        }

        const transport = cleanText(service?.transport || bridge.incidentTransport || '', 80);
        const sameOrigin = service?.status === 'ready' && transport === 'hosting-rewrite'
            ? item(`Hosting same-origin 복구: 사용 중 · ${sameOriginPath}`, 'ok')
            : sameOriginPath
                ? item(`Hosting same-origin 복구: 대기 · ${sameOriginPath}`, 'neutral')
                : item('Hosting same-origin 복구: 설정 없음', 'warning');

        let direct;
        if (service?.status === 'ready') {
            direct = transport === 'hosting-rewrite'
                ? item('Callable 기본 경로 실패 후 Hosting same-origin 복구 성공', 'ok')
                : item('Callable 응답: 정상 · 직접 HTTP 진단 불필요', 'ok');
        } else if (probe?.reachable === true) {
            direct = probe.corsReadable === false
                ? item('직접 HTTP 도달 확인 · 응답 읽기 제한(CORS/브라우저 정책)', 'warning')
                : probe.deployed === false
                    ? item(`직접 HTTP 응답: ${probe.status || 404} · 함수 미배포 가능성`, 'warning')
                    : item(`직접 HTTP 응답: ${probe.status || '응답 수신'} · endpoint 도달 확인`, 'ok');
        } else if (probe) {
            direct = item(`직접 HTTP 도달 실패 · ${cleanText(probe.classification || probe.code || 'network-blocked', 80)}`, 'error');
        } else {
            direct = item('직접 HTTP 도달성: 오류 발생 시 자동 확인', 'neutral');
        }

        const appCheckEnforced = service?.appCheckEnforced === true;
        const appCheckTokenPresent = service?.appCheckTokenPresent === true;
        const clientAppCheck = service?.clientAppCheck && typeof service.clientAppCheck === 'object' ? service.clientAppCheck : {};
        const serverPolicyVersion = Math.max(0, Number(service?.appCheckPolicyVersion || 0));
        const clientPolicyVersion = Math.max(0, Number(clientAppCheck.contractVersion || 0));
        const serverPolicyMode = cleanText(service?.appCheckMode || '', 20);
        const clientPolicyMode = cleanText(clientAppCheck.mode || '', 20);
        const serverPolicyReason = cleanText(service?.appCheckPolicyReason || '', 80);
        const clientPolicyReason = cleanText(clientAppCheck.reason || '', 80);
        const policyComparable = service?.status === 'ready' && clientPolicyVersion > 0;
        const appCheckPolicyMismatch = policyComparable && (
            serverPolicyVersion !== clientPolicyVersion
            || serverPolicyMode !== clientPolicyMode
            || serverPolicyReason !== clientPolicyReason
        );
        const appCheck = appCheckPolicyMismatch
            ? item(`App Check 정책 불일치 · client v${clientPolicyVersion}/${clientPolicyMode || 'unknown'} · server v${serverPolicyVersion}/${serverPolicyMode || 'unknown'}`, 'warning')
            : appCheckEnforced
                ? appCheckTokenPresent
                    ? item('App Check: 강제 적용 · 토큰 확인', 'ok')
                    : item('App Check: 강제 적용 · 토큰 미확인', 'warning')
                : appCheckTokenPresent
                    ? item('App Check: 미사용 정책 · 비강제 토큰 감지', 'neutral')
                    : item('App Check: 미사용 정책 · Firebase Auth/Rules 사용', 'neutral');

        return Object.freeze({
            functionName,
            origin,
            endpoint,
            sameOriginPath,
            classification,
            server,
            functionStatus: item(`호출 함수: ${functionName}`, functionName === 'getIncidentServiceStatus' ? 'ok' : 'warning'),
            endpointStatus: item(endpoint ? `Functions endpoint: ${endpoint}` : 'Functions endpoint: 확인 불가', endpoint ? 'neutral' : 'error', endpoint),
            sameOriginStatus: sameOrigin,
            directStatus: direct,
            cspStatus: csp.ok ? item('Hosting CSP: Functions origin 포함됨', 'ok') : item(`Hosting CSP: ${csp.message}`, 'error'),
            appCheckStatus: appCheck
        });
    }

    global.FoxBearIncidentServiceDiagnostics = Object.freeze({
        version: '1.6.74',
        classifyFailure,
        buildViewModel
    });
})(typeof window !== 'undefined' ? window : globalThis);
