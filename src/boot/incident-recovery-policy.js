// FoxBear incident failure classification and recovery policy - v1.6.94
(function attachFoxBearIncidentRecoveryPolicy(global) {
    'use strict';

    const ACTION_LABELS = Object.freeze({
        retry: '서버 다시 확인',
        'auto-recovery': '자동 복구 실행',
        'deployment-check': '배포 상태 점검',
        'copy-deploy': '배포 명령 복사',
        'copy-diagnostics': '익명 진단 복사',
        'mail-test': '메일 테스트 재실행'
    });

    const ACTION_PLANS = Object.freeze({
        'client-offline': Object.freeze({ label: '인터넷 연결이 복구되면 자동 재전송됩니다. 연결 후 즉시 다시 확인할 수 있습니다.', actions: Object.freeze(['retry', 'copy-diagnostics']) }),
        'server-response-blocked': Object.freeze({ label: '서버에는 도달했습니다. 같은 출처 복구 경로와 배포 상태를 다시 확인하세요.', actions: Object.freeze(['auto-recovery', 'deployment-check']) }),
        'server-network-blocked': Object.freeze({ label: '기본 Callable과 Hosting 복구 경로를 함께 재확인합니다.', actions: Object.freeze(['auto-recovery', 'copy-deploy']) }),
        'server-api-not-deployed': Object.freeze({ label: 'Functions와 Hosting rewrite를 같은 릴리스로 배포해야 합니다.', actions: Object.freeze(['copy-deploy', 'deployment-check']) }),
        'server-api-unavailable': Object.freeze({ label: 'Firebase 초기화와 같은 출처 복구 경로를 순서대로 다시 확인합니다.', actions: Object.freeze(['auto-recovery', 'copy-diagnostics']) }),
        'server-api-internal': Object.freeze({ label: 'Endpoint는 응답했습니다. 배포 점검 결과와 익명 진단을 확인하세요.', actions: Object.freeze(['deployment-check', 'copy-diagnostics']) }),
        'permission-denied': Object.freeze({ label: '익명 인증·Firestore 규칙·Functions 버전을 함께 갱신해야 합니다.', actions: Object.freeze(['copy-deploy', 'deployment-check']) }),
        'authentication-failed': Object.freeze({ label: '익명 인증을 다시 준비한 뒤 대기열 전송을 재시도합니다.', actions: Object.freeze(['auto-recovery', 'copy-diagnostics']) }),
        'smtp-secret-invalid': Object.freeze({ label: 'Gmail Secret을 수정하고 Functions를 다시 배포한 뒤 테스트하세요.', actions: Object.freeze(['copy-deploy', 'deployment-check']) }),
        'smtp-auth-failed': Object.freeze({ label: 'Gmail 앱 비밀번호를 교체한 뒤 실제 메일 테스트를 다시 실행하세요.', actions: Object.freeze(['mail-test', 'deployment-check']) }),
        'smtp-recipient-rejected': Object.freeze({ label: '수신 주소 정책을 확인한 뒤 실제 메일 테스트를 다시 실행하세요.', actions: Object.freeze(['mail-test', 'copy-diagnostics']) }),
        'smtp-rate-limited': Object.freeze({ label: '발송 한도 해제 시각 이후 메일 테스트를 다시 실행하세요.', actions: Object.freeze(['mail-test', 'copy-diagnostics']) }),
        'smtp-network-failed': Object.freeze({ label: 'Functions의 SMTP 연결 상태를 점검하고 메일 테스트를 재실행하세요.', actions: Object.freeze(['deployment-check', 'mail-test']) })
    });

    function classify(rawStatus = '', failureCode = '', failureReason = '') {
        const evidence = `${rawStatus} ${failureCode} ${failureReason}`;
        if (/FOXBEAR_INCIDENT_CLIENT_OFFLINE|client-offline|browser.*offline|브라우저가 오프라인/i.test(evidence)) return 'client-offline';
        if (/FOXBEAR_INCIDENT_CALLABLE_RESPONSE_BLOCKED|endpoint-reachable-opaque|cors.*response|응답 내용을 읽지 못/i.test(evidence)) return 'server-response-blocked';
        if (/functions\/(?:not-found|unimplemented)|FOXBEAR_INCIDENT_SERVICE_STATUS_UNAVAILABLE/i.test(evidence)) return 'server-api-not-deployed';
        if (/FOXBEAR_INCIDENT_CALLABLE_NETWORK_BLOCKED|FOXBEAR_INCIDENT_SAME_ORIGIN_(?:UNAVAILABLE|TIMEOUT)|failed to fetch|networkerror|network request failed|load failed|content security policy|refused to connect|csp/i.test(evidence)) return 'server-network-blocked';
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

    function getActionPlan(status = '') {
        return ACTION_PLANS[status] || null;
    }

    global.FoxBearIncidentRecoveryPolicy = Object.freeze({
        version: '1.6.94',
        actionLabels: ACTION_LABELS,
        classify,
        getActionPlan
    });
})(typeof window !== 'undefined' ? window : globalThis);
