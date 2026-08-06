let initializeApp;
let getAuth;
let onAuthStateChanged;
let signInAnonymously;
let GoogleAuthProvider;
let browserSessionPersistence;
let getRedirectResult;
let setPersistence;
let signInWithPopup;
let signInWithRedirect;
let signOut;
let addDoc;
let collection;
let doc;
let getCountFromServer;
let getDoc;
let getDocs;
let getFirestore;
let limit;
let orderBy;
let query;
let serverTimestamp;
let setDoc;
let where;
let fetchAndActivate;
let getRemoteConfig;
let getValue;
let isRemoteConfigSupported;
let getFunctions;
let httpsCallable;
let firebaseModulesPromise = null;

const FIREBASE_SDK_VERSION = '12.16.0';
const FIREBASE_MODULE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
const FIREBASE_FUNCTIONS_REGION = 'asia-northeast3';
const FIREBASE_DEFAULT_AUTH_DOMAIN = 'foxbear-music.firebaseapp.com';
const FIREBASE_SECURE_ADMIN_ORIGIN = 'https://foxbear-music.web.app';
const FIREBASE_SECURE_ADMIN_MARKER = 'foxbearAdmin';
const FIREBASE_HOSTING_AUTH_DOMAINS = Object.freeze(new Set([
    'foxbear-music.firebaseapp.com',
    'foxbear-music.web.app'
]));
const ADMIN_GOOGLE_REDIRECT_MARKER = 'foxbear.admin.google.redirect';
const ADMIN_GOOGLE_REDIRECT_ATTEMPTS = 'foxbear.admin.google.redirectAttempts';

function resolveFirebaseAuthDomain() {
    const currentHost = String(globalThis.location?.hostname || '').trim().toLowerCase();
    return FIREBASE_HOSTING_AUTH_DOMAINS.has(currentHost)
        ? currentHost
        : FIREBASE_DEFAULT_AUTH_DOMAIN;
}

function isFirebaseHostingAdminOrigin() {
    const currentHost = String(globalThis.location?.hostname || '').trim().toLowerCase();
    const protocol = String(globalThis.location?.protocol || '').trim().toLowerCase();
    return protocol === 'https:' && FIREBASE_HOSTING_AUTH_DOMAINS.has(currentHost);
}

function getSecureAdminLaunchUrl() {
    const url = new URL('/', FIREBASE_SECURE_ADMIN_ORIGIN);
    url.searchParams.set(FIREBASE_SECURE_ADMIN_MARKER, '1');
    return url.href;
}

const FIREBASE_CONFIG = Object.freeze({
    apiKey: 'AIzaSyBvYuYlN6etTd3B6C_ZGvsaAktbWJU8yOs',
    authDomain: resolveFirebaseAuthDomain(),
    projectId: 'foxbear-music',
    storageBucket: 'foxbear-music.firebasestorage.app',
    messagingSenderId: '52981410353',
    appId: '1:52981410353:web:c9c700a8e55672a999c310'
});
const FIREBASE_FUNCTIONS_ORIGIN = `https://${FIREBASE_FUNCTIONS_REGION}-${FIREBASE_CONFIG.projectId}.cloudfunctions.net`;
const INCIDENT_STATUS_FUNCTION_NAME = 'getIncidentServiceStatus';
const INCIDENT_DIRECT_PROBE_TIMEOUT_MS = 4500;
const INCIDENT_SAME_ORIGIN_TIMEOUT_MS = 9000;
const INCIDENT_SAME_ORIGIN_PATHS = Object.freeze({
    getIncidentServiceStatus: '/api/incident/status',
    submitIncidentReport: '/api/incident/submit',
    getIncidentDeliveryStatus: '/api/incident/delivery',
    checkIncidentDeploymentReadiness: '/api/incident/readiness'
});
const INCIDENT_ROUTE_POLICY_FALLBACK = Object.freeze({
    shouldAttempt: () => true,
    recordAttempt: () => null,
    recordSuccess: () => null,
    recordFailure: () => null,
    getHealth: () => Object.freeze({ routes: Object.freeze({}) }),
    getPreferredRoutes: () => Object.freeze(['callable', 'hosting-rewrite']),
    observeNetworkChange: () => Object.freeze({ routes: Object.freeze({}) }),
    clear: () => Object.freeze({ routes: Object.freeze({}) })
});
const incidentRoutePolicy = window.FoxBearIncidentRoutePolicy || INCIDENT_ROUTE_POLICY_FALLBACK;

const MAX_TEXT_LENGTHS = Object.freeze({
    referrer: 160,
    page: 180,
    path: 160,
    language: 24,
    userAgent: 220,
    screen: 32,
    appVersion: 24,
    assetVersion: 80,
    severity: 16,
    category: 40,
    reason: 100,
    message: 500,
    code: 80,
    stack: 1400,
    fingerprint: 64,
    submissionKey: 64,
    source: 80,
    browser: 40,
    platform: 40,
    visibility: 20,
    viewport: 32,
    context: 700
});

const REMOTE_CONFIG_DEFAULTS = Object.freeze({
    foxbear_notice: '',
    foxbear_stats_enabled: true,
    foxbear_storage_enabled: false,
    foxbear_incident_reporting_enabled: true,
    foxbear_youtube_url: 'https://www.youtube.com/@FoxBearMusic'
});

const bridgeState = {
    app: null,
    appCheck: null,
    appCheckConfigured: false,
    appCheckReady: false,
    appCheckError: '',
    auth: null,
    db: null,
    functions: null,
    remoteConfig: null,
    user: null,
    ready: false,
    authReady: false,
    remoteConfigValues: { ...REMOTE_CONFIG_DEFAULTS },
    error: '',
    storageEnabled: false,
    storageReason: 'Spark 무료 요금제에서는 Cloud Storage for Firebase를 사용하지 않습니다.',
    adminAuthDiagnostics: Object.freeze({
        code: '',
        message: '',
        online: true,
        pageOrigin: '',
        authDomain: FIREBASE_CONFIG.authDomain,
        rejectedScriptUrl: '',
        redirectAttempted: false,
        occurredAt: ''
    })
};

async function loadFirebaseModules() {
    if (firebaseModulesPromise) return firebaseModulesPromise;
    firebaseModulesPromise = Promise.all([
        import(`${FIREBASE_MODULE_BASE}/firebase-app.js`),
        import(`${FIREBASE_MODULE_BASE}/firebase-auth.js`),
        import(`${FIREBASE_MODULE_BASE}/firebase-firestore.js`),
        import(`${FIREBASE_MODULE_BASE}/firebase-remote-config.js`),
        import(`${FIREBASE_MODULE_BASE}/firebase-functions.js`)
    ]).then(([appModule, authModule, firestoreModule, remoteConfigModule, functionsModule]) => {
        ({ initializeApp } = appModule);
        ({ getAuth, onAuthStateChanged, signInAnonymously, GoogleAuthProvider, browserSessionPersistence, getRedirectResult, setPersistence, signInWithPopup, signInWithRedirect, signOut } = authModule);
        ({ addDoc, collection, doc, getCountFromServer, getDoc, getDocs, getFirestore, limit, orderBy, query, serverTimestamp, setDoc, where } = firestoreModule);
        ({ fetchAndActivate, getRemoteConfig, getValue, isSupported: isRemoteConfigSupported } = remoteConfigModule);
        ({ getFunctions, httpsCallable } = functionsModule);
        return true;
    });
    return firebaseModulesPromise;
}

function dispatchFirebaseEvent(type, extra = {}) {
    window.dispatchEvent(new CustomEvent(type, {
        detail: makePublicBridge(extra)
    }));
}

function makePublicBridge(extra = {}) {
    return Object.freeze({
        sdkVersion: FIREBASE_SDK_VERSION,
        projectId: FIREBASE_CONFIG.projectId,
        authDomain: FIREBASE_CONFIG.authDomain,
        pageOrigin: String(globalThis.location?.origin || ''),
        ready: bridgeState.ready,
        authReady: bridgeState.authReady,
        uid: bridgeState.user?.uid || '',
        error: bridgeState.error,
        storageEnabled: false,
        storageReason: bridgeState.storageReason,
        incidentTransport: bridgeState.functions ? 'callable-primary+hosting-rewrite-fallback' : 'hosting-rewrite+firestore-fallback',
        incidentFunctionsOrigin: FIREBASE_FUNCTIONS_ORIGIN,
        incidentStatusFunctionName: INCIDENT_STATUS_FUNCTION_NAME,
        incidentSameOriginStatusPath: INCIDENT_SAME_ORIGIN_PATHS[INCIDENT_STATUS_FUNCTION_NAME],
        incidentRouteHealth: incidentRoutePolicy.getHealth(),
        appCheck: Object.freeze({
            mode: 'disabled',
            disabled: true,
            configured: false,
            ready: false,
            error: ''
        }),
        adminAuth: Object.freeze({
            mode: isFirebaseHostingAdminOrigin() ? 'firebase-hosting' : 'external-popup',
            secureOrigin: FIREBASE_SECURE_ADMIN_ORIGIN,
            currentOrigin: String(globalThis.location?.origin || ''),
            onSecureOrigin: isFirebaseHostingAdminOrigin(),
            redirectSupported: isFirebaseHostingAdminOrigin()
        }),
        getSecureAdminLaunchUrl,
        remoteConfig: { ...bridgeState.remoteConfigValues },
        signInGuest,
        logVisit,
        logIncident,
        getIncidentDelivery,
        getIncidentServiceStatus,
        getIncidentRouteHealth: () => incidentRoutePolicy.getHealth(),
        clearIncidentRouteHealth: () => incidentRoutePolicy.clear(),
        probeIncidentCallableEndpoint,
        checkIncidentDeploymentReadiness,
        retryOwnIncidentReport,
        signInAdminWithGoogle,
        getAdminAuthDiagnostics: () => bridgeState.adminAuthDiagnostics,
        signOutAdminAccess,
        getAdminStats,
        getAdminIncidents,
        getIncidentOperationsHistory,
        getIncidentAdminAuditLog,
        getIncidentMailTestHistory,
        requestIncidentRetry,
        getIncidentRetryRequest,
        requestIncidentBatchRecovery,
        getIncidentBatchRecoveryRequest,
        requestIncidentAlertChannelTest,
        getIncidentAlertChannelTestRequest,
        requestIncidentDeploymentVerification,
        getIncidentDeploymentVerificationRequest,
        requestIncidentMailReceiptConfirmation,
        getIncidentMailReceiptConfirmationRequest,
        requestIncidentMailTestCleanup,
        getIncidentMailTestCleanupRequest,
        getAdminProfile,
        refreshAppCheckToken,
        getUid: () => bridgeState.user?.uid || '',
        getStatus: () => makePublicBridge(),
        ...extra
    });
}

function limitText(value, maxLength) {
    return String(value ?? '')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .slice(0, maxLength);
}

function getDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getKstDayRange(date = new Date()) {
    const source = date instanceof Date ? date : new Date(date);
    const kst = new Date(source.getTime() + (9 * 60 * 60 * 1000));
    const startAsUtc = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 0, 0, 0, 0);
    const start = new Date(startAsUtc - (9 * 60 * 60 * 1000));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { dateKey: new Date(startAsUtc).toISOString().slice(0, 10), start, end };
}

function timestampIso(value) {
    if (!value) return '';
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function normalizeVisitPayload(payload = {}) {
    const pageValue = payload.page || `${window.location.pathname || '/'}${window.location.search || ''}`;
    const pathValue = payload.path || window.location.pathname || '/';
    return {
        dateKey: limitText(payload.dateKey || getDateKey(), 10),
        clientAt: new Date().toISOString(),
        referrer: limitText(payload.referrer || '직접 접속 / 비공개', MAX_TEXT_LENGTHS.referrer),
        page: limitText(pageValue, MAX_TEXT_LENGTHS.page),
        path: limitText(pathValue, MAX_TEXT_LENGTHS.path),
        language: limitText(payload.language || navigator.language || '', MAX_TEXT_LENGTHS.language),
        userAgent: limitText(payload.userAgent || navigator.userAgent || '', MAX_TEXT_LENGTHS.userAgent),
        screen: limitText(payload.screen || `${window.screen?.width || 0}x${window.screen?.height || 0}`, MAX_TEXT_LENGTHS.screen),
        appVersion: limitText(payload.appVersion || document.body?.dataset?.build || '', MAX_TEXT_LENGTHS.appVersion),
        source: 'foxbear-web-client',
        storageUsed: false
    };
}

function normalizeFirestoreVisit(snapshot) {
    const item = snapshot.data() || {};
    const createdAt = item.createdAt && typeof item.createdAt.toDate === 'function'
        ? item.createdAt.toDate().toISOString()
        : item.clientAt || '';
    return {
        at: limitText(createdAt, 40),
        uid: limitText(item.uid || '', 80),
        visitorId: limitText(item.visitorId || item.uid || '', 80),
        ip: '클라이언트 Firestore 모드',
        referrer: limitText(item.referrer || '직접 접속 / 비공개', MAX_TEXT_LENGTHS.referrer),
        page: limitText(item.page || '/', MAX_TEXT_LENGTHS.page),
        dateKey: limitText(item.dateKey || '', 10),
        appVersion: limitText(item.appVersion || '', MAX_TEXT_LENGTHS.appVersion)
    };
}


async function refreshAppCheckToken() {
    return Object.freeze({ mode: 'disabled', disabled: true, configured: false, ready: false, error: '' });
}

async function signInGuest() {
    if (!bridgeState.auth) throw new Error('Firebase Auth가 초기화되지 않았습니다.');
    if (bridgeState.auth.currentUser) return bridgeState.auth.currentUser;
    const credential = await signInAnonymously(bridgeState.auth);
    bridgeState.user = credential.user;
    bridgeState.authReady = true;
    return credential.user;
}

function normalizeAdminAuthCode(error) {
    return limitText(String(error?.code || 'auth/unknown').trim() || 'auth/unknown', 100);
}

function sanitizeAdminAuthMessage(error) {
    const raw = String(error?.message || error || 'Google 관리자 로그인에 실패했습니다.');
    return limitText(raw.replace(/https?:\/\/[^\s)]+/gi, value => {
        try {
            const url = new URL(value);
            return `${url.origin}${url.pathname}`;
        } catch (parseError) {
            return '[URL 생략]';
        }
    }), 240);
}

function recordAdminAuthDiagnostics(error, extra = {}) {
    const diagnostics = Object.freeze({
        code: normalizeAdminAuthCode(error),
        message: sanitizeAdminAuthMessage(error),
        online: globalThis.navigator?.onLine !== false,
        pageOrigin: limitText(String(globalThis.location?.origin || ''), 180),
        authDomain: FIREBASE_CONFIG.authDomain,
        rejectedScriptUrl: limitText(String(globalThis.FoxBearTrustedTypesBootstrap?.getLastRejectedScriptUrl?.() || ''), 220),
        redirectAttempted: extra.redirectAttempted === true,
        occurredAt: new Date().toISOString()
    });
    bridgeState.adminAuthDiagnostics = diagnostics;
    exposeBridge();
    return diagnostics;
}

function clearAdminAuthDiagnostics() {
    bridgeState.adminAuthDiagnostics = Object.freeze({
        code: '',
        message: '',
        online: globalThis.navigator?.onLine !== false,
        pageOrigin: limitText(String(globalThis.location?.origin || ''), 180),
        authDomain: FIREBASE_CONFIG.authDomain,
        rejectedScriptUrl: '',
        redirectAttempted: false,
        occurredAt: ''
    });
    exposeBridge();
}

function readAdminRedirectAttempts() {
    try {
        const value = Number.parseInt(sessionStorage.getItem(ADMIN_GOOGLE_REDIRECT_ATTEMPTS) || '0', 10);
        return Number.isFinite(value) ? Math.max(0, value) : 0;
    } catch (error) {
        return 0;
    }
}

function clearAdminRedirectState() {
    try {
        sessionStorage.removeItem(ADMIN_GOOGLE_REDIRECT_MARKER);
        sessionStorage.removeItem(ADMIN_GOOGLE_REDIRECT_ATTEMPTS);
    } catch (error) {}
}

function hasGoogleAdminProvider(user) {
    return Boolean(user && !user.isAnonymous && user.providerData?.some?.(item => item?.providerId === 'google.com'));
}

function makeGoogleAdminIdentity(user) {
    if (!hasGoogleAdminProvider(user)) return null;
    return Object.freeze({
        uid: user.uid,
        email: limitText(user.email || '', 160),
        displayName: limitText(user.displayName || '', 120),
        emailVerified: user.emailVerified === true,
        providerId: 'google.com',
        redirecting: false
    });
}

async function waitForGoogleAdminUser(timeoutMs = 3600) {
    const deadline = Date.now() + Math.max(300, Number(timeoutMs) || 3600);
    while (Date.now() < deadline) {
        const user = bridgeState.auth?.currentUser || bridgeState.user;
        if (hasGoogleAdminProvider(user)) return user;
        await new Promise(resolve => globalThis.setTimeout(resolve, 120));
    }
    const finalUser = bridgeState.auth?.currentUser || bridgeState.user;
    return hasGoogleAdminProvider(finalUser) ? finalUser : null;
}

function makeSecureOriginRequiredError(sourceError = null) {
    const error = new Error('현재 배포 주소에서는 Google 리디렉션 인증을 안전하게 완료할 수 없습니다. Firebase Hosting 보안 주소로 이동해 다시 인증해주세요.');
    error.code = 'auth/secure-origin-required';
    error.secureUrl = getSecureAdminLaunchUrl();
    error.cause = sourceError || undefined;
    error.diagnostics = recordAdminAuthDiagnostics(error, { redirectAttempted: false });
    return error;
}

async function beginAdminGoogleRedirect(provider, sourceError) {
    if (!isFirebaseHostingAdminOrigin()) throw makeSecureOriginRequiredError(sourceError);
    if (typeof signInWithRedirect !== 'function') throw sourceError;
    const attempts = readAdminRedirectAttempts();
    if (attempts >= 1) {
        const loopError = new Error('Google 리디렉션 인증 결과를 확인하지 못했습니다. 브라우저의 사이트 데이터 차단 또는 OAuth 리디렉션 URI 설정을 확인해주세요.');
        loopError.code = 'auth/redirect-loop-prevented';
        loopError.diagnostics = recordAdminAuthDiagnostics(loopError, { redirectAttempted: true });
        clearAdminRedirectState();
        throw loopError;
    }
    try {
        sessionStorage.setItem(ADMIN_GOOGLE_REDIRECT_MARKER, normalizeAdminAuthCode(sourceError));
        sessionStorage.setItem(ADMIN_GOOGLE_REDIRECT_ATTEMPTS, String(attempts + 1));
    } catch (storageError) {}
    recordAdminAuthDiagnostics(sourceError, { redirectAttempted: true });
    await signInWithRedirect(bridgeState.auth, provider);
    return Object.freeze({ redirecting: true, providerId: 'google.com' });
}

async function signInAdminWithGoogle() {
    if (!bridgeState.auth) throw new Error('Firebase Auth가 초기화되지 않았습니다.');
    const currentIdentity = makeGoogleAdminIdentity(bridgeState.auth.currentUser);
    if (currentIdentity) return currentIdentity;
    if (typeof GoogleAuthProvider !== 'function' || typeof signInWithPopup !== 'function') {
        throw new Error('Firebase Google 로그인 모듈이 준비되지 않았습니다.');
    }
    await setPersistence(bridgeState.auth, browserSessionPersistence);
    bridgeState.auth.useDeviceLanguage?.();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    clearAdminAuthDiagnostics();
    try {
        const credential = await signInWithPopup(bridgeState.auth, provider);
        bridgeState.user = credential.user;
        bridgeState.authReady = true;
        clearAdminRedirectState();
        clearAdminAuthDiagnostics();
        return makeGoogleAdminIdentity(credential.user);
    } catch (error) {
        const code = normalizeAdminAuthCode(error);
        if (code === 'auth/network-request-failed') {
            const recoveredUser = await waitForGoogleAdminUser();
            const recoveredIdentity = makeGoogleAdminIdentity(recoveredUser);
            if (recoveredIdentity) {
                bridgeState.user = recoveredUser;
                bridgeState.authReady = true;
                clearAdminRedirectState();
                clearAdminAuthDiagnostics();
                return recoveredIdentity;
            }
        }
        const redirectFallbackCodes = new Set([
            'auth/popup-blocked',
            'auth/operation-not-supported-in-this-environment',
            'auth/network-request-failed'
        ]);
        if (redirectFallbackCodes.has(code)) {
            if (!isFirebaseHostingAdminOrigin()) throw makeSecureOriginRequiredError(error);
            return beginAdminGoogleRedirect(provider, error);
        }
        const rawMessage = sanitizeAdminAuthMessage(error);
        const rejectedScriptUrl = String(globalThis.FoxBearTrustedTypesBootstrap?.getLastRejectedScriptUrl?.() || '');
        const trustedTypesBlocked = Boolean(rejectedScriptUrl) || /TrustedScriptURL|Trusted Types|requires ['"]?TrustedScriptURL|허용되지 않은 동적 스크립트 URL/i.test(rawMessage);
        const normalized = new Error(limitText(
            trustedTypesBlocked
                ? `브라우저 보안 정책이 Google 인증 스크립트를 차단했습니다. ${rejectedScriptUrl || '차단 경로를 확인할 수 없습니다.'} 최신 버전으로 강력 새로고침한 뒤 다시 시도해주세요.`
                : rawMessage,
            240
        ));
        normalized.code = trustedTypesBlocked ? 'auth/trusted-types-blocked' : code;
        normalized.diagnostics = recordAdminAuthDiagnostics(normalized);
        throw normalized;
    }
}

async function signOutAdminAccess() {
    if (!bridgeState.auth) throw new Error('Firebase Auth가 초기화되지 않았습니다.');
    const current = bridgeState.auth.currentUser;
    const wasAdminAccount = Boolean(current && !current.isAnonymous);
    if (current && typeof signOut === 'function') await signOut(bridgeState.auth);
    const guest = await signInGuest();
    return Object.freeze({
        active: false,
        signedOut: wasAdminAccount,
        uid: guest?.uid || ''
    });
}

function visitDocumentId(uid, dateKey) {
    const safeUid = limitText(uid, 128);
    const safeDateKey = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || '')) ? String(dateKey) : getDateKey();
    if (!safeUid) throw new Error('Firebase 방문자 UID가 준비되지 않았습니다.');
    return `${safeUid}_${safeDateKey}`;
}

async function logVisit(payload = {}) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const user = await signInGuest();
    const visit = normalizeVisitPayload(payload);
    const visitId = visitDocumentId(user.uid, visit.dateKey);
    const visitRef = doc(bridgeState.db, 'siteVisits', visitId);
    try {
        await setDoc(visitRef, {
            ...visit,
            uid: user.uid,
            visitorId: user.uid,
            createdAt: serverTimestamp()
        });
        return Object.freeze({ logged: true, deduplicated: false, visitId });
    } catch (error) {
        const duplicate = await getDoc(visitRef).catch(() => null);
        if (duplicate?.exists?.() && duplicate.data()?.uid === user.uid) {
            return Object.freeze({ logged: true, deduplicated: true, visitId });
        }
        throw error;
    }
}


const INCIDENT_SEVERITIES = new Set(['warning', 'error', 'fatal']);
const INCIDENT_CATEGORIES = new Set([
    'runtime', 'resource', 'boot', 'mastering', 'mastering-memory', 'quality-recovery', 'export',
    'update-safety', 'release-mismatch', 'firebase', 'manual-test', 'unknown'
]);

function safeIncidentNumber(value, min, max) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min;
}

function normalizeIncidentPayload(payload = {}) {
    const identity = window.FoxBearIncidentSubmissionIdentity;
    const severity = INCIDENT_SEVERITIES.has(payload.severity) ? payload.severity : 'error';
    const category = INCIDENT_CATEGORIES.has(payload.category) ? payload.category : 'unknown';
    return {
        schemaVersion: 1,
        clientAt: identity?.normalizeClientAt?.(payload.clientAt || new Date().toISOString()) || limitText(payload.clientAt || new Date().toISOString(), 40),
        appVersion: limitText(payload.appVersion || document.body?.dataset?.build || '', MAX_TEXT_LENGTHS.appVersion),
        assetVersion: limitText(payload.assetVersion || '', MAX_TEXT_LENGTHS.assetVersion),
        severity,
        category,
        reason: limitText(payload.reason || category, MAX_TEXT_LENGTHS.reason),
        message: limitText(payload.message || 'Unknown incident', MAX_TEXT_LENGTHS.message),
        code: limitText(payload.code || '', MAX_TEXT_LENGTHS.code),
        stack: limitText(payload.stack || '', MAX_TEXT_LENGTHS.stack),
        fingerprint: limitText(payload.fingerprint || 'unknown', MAX_TEXT_LENGTHS.fingerprint),
        submissionKey: limitText(identity?.createSubmissionKey?.(payload) || payload.submissionKey || '', MAX_TEXT_LENGTHS.submissionKey),
        source: limitText(payload.source || 'foxbear-web-client', MAX_TEXT_LENGTHS.source),
        pagePath: limitText(payload.pagePath || window.location.pathname || '/', MAX_TEXT_LENGTHS.path),
        browser: limitText(payload.browser || '', MAX_TEXT_LENGTHS.browser),
        platform: limitText(payload.platform || '', MAX_TEXT_LENGTHS.platform),
        language: limitText(payload.language || navigator.language || '', MAX_TEXT_LENGTHS.language),
        viewport: limitText(payload.viewport || '', MAX_TEXT_LENGTHS.viewport),
        online: payload.online !== false,
        visibility: limitText(payload.visibility || '', MAX_TEXT_LENGTHS.visibility),
        memoryGb: safeIncidentNumber(payload.memoryGb, 0, 64),
        cpuCores: safeIncidentNumber(payload.cpuCores, 0, 64),
        runtimeOk: payload.runtimeOk !== false,
        resourceFailureCount: safeIncidentNumber(payload.resourceFailureCount, 0, 99),
        runtimeErrorCount: safeIncidentNumber(payload.runtimeErrorCount, 0, 99),
        runtimeWarningCount: safeIncidentNumber(payload.runtimeWarningCount, 0, 99),
        bootFailed: payload.bootFailed === true,
        bootStalled: payload.bootStalled === true,
        automatic: payload.automatic !== false,
        context: limitText(payload.context || '', MAX_TEXT_LENGTHS.context)
    };
}

function incidentDocumentId(uid, payload) {
    const identity = window.FoxBearIncidentSubmissionIdentity;
    if (identity?.createReportId) return identity.createReportId(uid, payload);
    const submissionKey = String(payload.submissionKey || payload.fingerprint || 'unknown').replace(/[^a-z0-9_-]/gi, '').slice(0, 64) || 'unknown';
    return `${uid}_${submissionKey}`.slice(0, 180);
}

function callableErrorCode(error) {
    return limitText(error?.code || error?.name || 'functions/unknown', 80);
}

function callableErrorMessage(error) {
    return limitText(error?.message || error || 'Callable request failed', 240);
}

function normalizeIncidentCallableError(error, name) {
    const originalCode = callableErrorCode(error);
    const originalMessage = callableErrorMessage(error);
    const evidence = `${originalCode} ${originalMessage}`;
    const networkBlocked = /failed to fetch|networkerror|network request failed|load failed|content security policy|refused to connect|csp/i.test(evidence);
    if (!networkBlocked) return error;
    const wrapped = new Error(`Firebase Callable 연결에 실패했습니다. Hosting CSP 또는 네트워크 연결을 확인하세요. function=${name}; cause=${originalCode}: ${originalMessage}`);
    wrapped.code = 'FOXBEAR_INCIDENT_CALLABLE_NETWORK_BLOCKED';
    wrapped.originalCode = originalCode;
    wrapped.functionName = name;
    wrapped.endpoint = `${FIREBASE_FUNCTIONS_ORIGIN}/${name}`;
    wrapped.cause = error;
    return wrapped;
}

async function probeIncidentCallableEndpoint(name = INCIDENT_STATUS_FUNCTION_NAME, timeoutMs = INCIDENT_DIRECT_PROBE_TIMEOUT_MS) {
    const functionName = limitText(name || INCIDENT_STATUS_FUNCTION_NAME, 80) || INCIDENT_STATUS_FUNCTION_NAME;
    const endpoint = `${FIREBASE_FUNCTIONS_ORIGIN}/${functionName}`;
    const boundedTimeout = Math.max(1000, Math.min(10000, Number(timeoutMs) || INCIDENT_DIRECT_PROBE_TIMEOUT_MS));
    const checkedAt = () => new Date().toISOString();
    if (window.navigator?.onLine === false) {
        return Object.freeze({
            ok: false,
            reachable: false,
            deployed: null,
            corsReadable: false,
            classification: 'client-offline',
            functionName,
            endpoint,
            status: 0,
            statusText: '',
            code: 'FOXBEAR_INCIDENT_CLIENT_OFFLINE',
            message: '브라우저가 오프라인 상태입니다.',
            attempts: 0,
            checkedAt: checkedAt()
        });
    }

    const request = async mode => {
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        let timer = 0;
        try {
            if (controller) timer = window.setTimeout(() => controller.abort('incident-endpoint-probe-timeout'), boundedTimeout);
            return await fetch(endpoint, {
                method: 'POST',
                mode,
                credentials: 'omit',
                cache: 'no-store',
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                body: '{}',
                signal: controller?.signal
            });
        } finally {
            if (timer) window.clearTimeout(timer);
        }
    };

    try {
        const response = await request('cors');
        const status = Number(response?.status) || 0;
        const deployed = status !== 404;
        return Object.freeze({
            ok: deployed,
            reachable: true,
            deployed,
            corsReadable: true,
            classification: deployed ? 'endpoint-reachable' : 'not-deployed',
            functionName,
            endpoint,
            status,
            statusText: limitText(response?.statusText || '', 80),
            attempts: 1,
            checkedAt: checkedAt()
        });
    } catch (corsError) {
        const corsTimeout = corsError?.name === 'AbortError';
        try {
            const opaqueResponse = await request('no-cors');
            return Object.freeze({
                ok: false,
                reachable: true,
                deployed: null,
                corsReadable: false,
                classification: 'endpoint-reachable-opaque',
                functionName,
                endpoint,
                status: Number(opaqueResponse?.status) || 0,
                statusText: '',
                code: 'FOXBEAR_INCIDENT_CALLABLE_RESPONSE_BLOCKED',
                message: 'Functions endpoint에는 도달했지만 브라우저가 응답 내용을 읽지 못했습니다.',
                attempts: 2,
                checkedAt: checkedAt()
            });
        } catch (opaqueError) {
            const timeout = corsTimeout || opaqueError?.name === 'AbortError';
            return Object.freeze({
                ok: false,
                reachable: false,
                deployed: null,
                corsReadable: false,
                classification: timeout ? 'timeout' : 'network-blocked',
                functionName,
                endpoint,
                status: 0,
                statusText: '',
                code: limitText(opaqueError?.code || opaqueError?.name || corsError?.code || corsError?.name || (timeout ? 'AbortError' : 'TypeError'), 80),
                message: limitText(opaqueError?.message || corsError?.message || (timeout ? 'Endpoint probe timed out' : 'Endpoint probe failed'), 180),
                attempts: 2,
                checkedAt: checkedAt()
            });
        }
    }
}

function shouldTrySameOriginCallable(error) {
    const evidence = `${callableErrorCode(error)} ${callableErrorMessage(error)}`;
    return /FOXBEAR_INCIDENT_CALLABLE_(?:NETWORK_BLOCKED|UNAVAILABLE)|functions\/(?:unavailable|deadline-exceeded)|failed to fetch|networkerror|network request failed|load failed|content security policy|refused to connect|cors/i.test(evidence);
}

function normalizeCallableHttpError(payload = {}, response = null, name = '') {
    const source = payload?.error && typeof payload.error === 'object' ? payload.error : payload;
    const rawStatus = limitText(source?.status || source?.code || `http-${response?.status || 0}`, 80);
    const normalizedStatus = rawStatus.toLowerCase().replace(/_/g, '-');
    const error = new Error(limitText(source?.message || `Same-origin Callable request failed (${response?.status || 0})`, 240));
    error.code = normalizedStatus.startsWith('functions/') ? normalizedStatus : `functions/${normalizedStatus}`;
    error.httpStatus = Number(response?.status || 0);
    error.functionName = name;
    error.endpoint = INCIDENT_SAME_ORIGIN_PATHS[name] || '';
    return error;
}

async function getSameOriginCallableHeaders() {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    const user = bridgeState.user || await signInGuest().catch(() => null);
    if (user?.getIdToken) {
        const token = await user.getIdToken(false).catch(() => '');
        if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

async function invokeIncidentCallableSameOrigin(name, data) {
    const path = INCIDENT_SAME_ORIGIN_PATHS[name];
    if (!path || typeof window.fetch !== 'function') {
        const error = new Error(`Same-origin incident route is unavailable. function=${name}`);
        error.code = 'FOXBEAR_INCIDENT_SAME_ORIGIN_UNAVAILABLE';
        throw error;
    }
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = window.setTimeout(() => controller?.abort(), INCIDENT_SAME_ORIGIN_TIMEOUT_MS);
    try {
        const response = await window.fetch(path, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            redirect: 'follow',
            headers: await getSameOriginCallableHeaders(),
            body: JSON.stringify({ data: data || {} }),
            signal: controller?.signal
        });
        let payload = null;
        try { payload = await response.json(); } catch (_) { payload = null; }
        if (!response.ok || payload?.error) throw normalizeCallableHttpError(payload || {}, response, name);
        const result = payload?.result ?? payload?.data ?? {};
        if (result && typeof result === 'object') return { ...result, serverTransport: result.transport || '', transport: 'hosting-rewrite' };
        return { value: result, transport: 'hosting-rewrite' };
    } catch (error) {
        if (error?.name === 'AbortError') {
            const timeoutError = new Error(`Same-origin Callable request timed out. function=${name}`);
            timeoutError.code = 'FOXBEAR_INCIDENT_SAME_ORIGIN_TIMEOUT';
            timeoutError.functionName = name;
            timeoutError.endpoint = path;
            throw timeoutError;
        }
        throw error;
    } finally {
        window.clearTimeout(timer);
    }
}

async function invokeIncidentCallable(name, data) {
    let primaryError = null;
    const callableReady = bridgeState.functions && typeof httpsCallable === 'function';
    const preferredRoutes = incidentRoutePolicy.getPreferredRoutes?.() || ['callable', 'hosting-rewrite'];
    const hostingPreferred = preferredRoutes[0] === 'hosting-rewrite';
    if (hostingPreferred) {
        incidentRoutePolicy.recordAttempt?.('hosting-rewrite');
        try {
            const result = await invokeIncidentCallableSameOrigin(name, data);
            incidentRoutePolicy.recordSuccess('hosting-rewrite');
            return result;
        } catch (hostingPreferredError) {
            incidentRoutePolicy.recordFailure('hosting-rewrite', hostingPreferredError);
            primaryError = hostingPreferredError;
        }
    }
    const callableAllowed = incidentRoutePolicy.shouldAttempt('callable');
    if (callableReady && callableAllowed) {
        incidentRoutePolicy.recordAttempt?.('callable');
        try {
            const callable = httpsCallable(bridgeState.functions, name, { timeout: 15000 });
            const response = await callable(data);
            incidentRoutePolicy.recordSuccess('callable');
            const result = response?.data || {};
            return result && typeof result === 'object' ? { ...result, transport: result.transport || 'callable' } : result;
        } catch (error) {
            primaryError = normalizeIncidentCallableError(error, name);
            incidentRoutePolicy.recordFailure('callable', primaryError);
            if (!shouldTrySameOriginCallable(primaryError)) throw primaryError;
        }
    } else if (callableReady && !callableAllowed) {
        primaryError = new Error(`Firebase Callable 경로가 반복 실패로 잠시 우회되었습니다. function=${name}`);
        primaryError.code = 'FOXBEAR_INCIDENT_CALLABLE_COOLDOWN';
        primaryError.functionName = name;
        primaryError.endpoint = `${FIREBASE_FUNCTIONS_ORIGIN}/${name}`;
        primaryError.adaptiveRouteSkipped = true;
    } else {
        primaryError = new Error(`Firebase Functions 신고 API가 초기화되지 않았습니다. endpoint=${FIREBASE_FUNCTIONS_ORIGIN}/${name}`);
        primaryError.code = 'FOXBEAR_INCIDENT_CALLABLE_UNAVAILABLE';
        primaryError.functionName = name;
        primaryError.endpoint = `${FIREBASE_FUNCTIONS_ORIGIN}/${name}`;
    }
    try {
        incidentRoutePolicy.recordAttempt?.('hosting-rewrite');
        const result = await invokeIncidentCallableSameOrigin(name, data);
        incidentRoutePolicy.recordSuccess('hosting-rewrite');
        return result;
    } catch (fallbackError) {
        incidentRoutePolicy.recordFailure('hosting-rewrite', fallbackError);
        const combined = new Error(`Firebase Callable 기본 경로와 Hosting same-origin 복구 경로가 모두 실패했습니다. primary=${callableErrorCode(primaryError)}; fallback=${callableErrorCode(fallbackError)}`);
        combined.code = primaryError?.adaptiveRouteSkipped === true
            ? (callableErrorCode(fallbackError) || 'FOXBEAR_INCIDENT_CALLABLE_FAILED')
            : (callableErrorCode(primaryError) || callableErrorCode(fallbackError) || 'FOXBEAR_INCIDENT_CALLABLE_FAILED');
        combined.primaryError = primaryError;
        combined.fallbackError = fallbackError;
        combined.functionName = name;
        combined.endpoint = `${FIREBASE_FUNCTIONS_ORIGIN}/${name}`;
        combined.sameOriginEndpoint = INCIDENT_SAME_ORIGIN_PATHS[name] || '';
        combined.adaptiveRouteSkipped = primaryError?.adaptiveRouteSkipped === true;
        throw combined;
    }
}

function normalizeIncidentServiceStatus(value = {}) {
    const localAppCheck = { mode: 'disabled', disabled: true, configured: false, ready: false, error: '' };
    return Object.freeze({
        productVersion: limitText(value.productVersion || '', 24),
        serviceSchemaVersion: safeIncidentNumber(value.serviceSchemaVersion, 0, 99),
        region: limitText(value.region || FIREBASE_FUNCTIONS_REGION, 40),
        functionsOrigin: limitText(value.functionsOrigin || FIREBASE_FUNCTIONS_ORIGIN, 180),
        status: limitText(value.status || 'unknown', 20),
        transport: limitText(value.transport || 'callable', 30),
        mailTrigger: limitText(value.mailTrigger || '', 80),
        smtpProvider: limitText(value.smtpProvider || '', 30),
        smtpCredential: limitText(value.smtpCredential || '', 40),
        appCheckMode: limitText(value.appCheckMode || 'disabled', 20),
        appCheckEnforced: value.appCheckEnforced === true,
        appCheckTokenPresent: value.appCheckTokenPresent === true,
        readinessCheck: limitText(value.readinessCheck || '', 80),
        checkedAt: limitText(value.checkedAt || '', 40),
        clientProductVersion: limitText(window.FoxBearBuildInfo?.productVersion || document.body?.dataset?.build || '', 24),
        clientAppCheck: Object.freeze(localAppCheck)
    });
}

async function submitIncidentViaCallable(reportId, incident) {
    const result = await invokeIncidentCallable('submitIncidentReport', { reportId, incident });
    return {
        queued: result.queued !== false,
        deduplicated: result.deduplicated === true,
        reportId: limitText(result.reportId || reportId, 180),
        submissionKey: limitText(result.submissionKey || incident.submissionKey || '', 64),
        transport: result.transport || 'callable',
        service: normalizeIncidentServiceStatus(result.service || {})
    };
}

async function readIncidentDeliveryViaCallable(reportId) {
    const result = await invokeIncidentCallable('getIncidentDeliveryStatus', { reportId });
    return { ...result, transport: result.transport || 'callable', service: normalizeIncidentServiceStatus(result.service || {}) };
}

async function getIncidentServiceStatus() {
    await signInGuest();
    const result = await invokeIncidentCallable(INCIDENT_STATUS_FUNCTION_NAME, {});
    return normalizeIncidentServiceStatus(result);
}

function normalizeDeploymentReadiness(value = {}) {
    const requiredCheckKeys = Object.freeze(['functions', 'firestore', 'smtpSecret', 'smtpConnection']);
    const sourceChecks = value?.checks && typeof value.checks === 'object' ? value.checks : {};
    const normalizeCheck = input => Object.freeze({
        ok: input?.ok === true,
        status: limitText(input?.status || (input?.ok ? 'ready' : 'unknown'), 24),
        code: limitText(input?.code || '', 80),
        reason: limitText(input?.reason || '', 80),
        message: limitText(input?.message || '', 240)
    });
    const normalizedChecks = Object.fromEntries(requiredCheckKeys.map(key => [key, normalizeCheck(sourceChecks[key])]));
    const checkedAt = limitText(value?.checkedAt || '', 40);
    const service = normalizeIncidentServiceStatus(value?.service || {});
    const contractValid = Boolean(
        value && typeof value === 'object'
        && Number.isFinite(Date.parse(checkedAt))
        && service.productVersion
        && service.functionsOrigin
        && requiredCheckKeys.every(key => Object.prototype.hasOwnProperty.call(sourceChecks, key) && typeof sourceChecks[key]?.ok === 'boolean')
    );
    if (!contractValid && normalizedChecks.functions.ok) {
        normalizedChecks.functions = Object.freeze({
            ok: false,
            status: 'error',
            code: 'FOXBEAR_INCIDENT_READINESS_CONTRACT_INVALID',
            reason: 'response-contract-invalid',
            message: '배포 점검 응답 형식이 불완전합니다. Callable Functions를 다시 배포하세요.'
        });
    }
    const checks = Object.freeze(normalizedChecks);
    return Object.freeze({
        ok: value?.ok === true && contractValid && requiredCheckKeys.every(key => checks[key].ok === true),
        cached: value?.cached === true,
        checkedAt,
        lastHealthyAt: limitText(value?.lastHealthyAt || '', 40),
        nextCheckAt: limitText(value?.nextCheckAt || '', 40),
        contractValid,
        contractCode: contractValid ? '' : 'FOXBEAR_INCIDENT_READINESS_CONTRACT_INVALID',
        checks,
        service
    });
}

async function checkIncidentDeploymentReadiness() {
    await signInGuest();
    const result = await invokeIncidentCallable('checkIncidentDeploymentReadiness', {});
    return normalizeDeploymentReadiness(result || {});
}

async function retryOwnIncidentReport(reportId) {
    const user = await signInGuest();
    const safeId = limitText(reportId, 180);
    if (!safeId || !safeId.startsWith(`${user.uid}_`)) throw new Error('본인이 실행한 메일 테스트만 다시 보낼 수 있습니다.');
    const result = await invokeIncidentCallable('retryOwnIncidentReport', { reportId: safeId });
    return { ...result, transport: 'callable', service: normalizeIncidentServiceStatus(result.service || {}) };
}

async function logIncident(payload = {}) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    if (bridgeState.remoteConfigValues.foxbear_incident_reporting_enabled === false && payload.category !== 'manual-test') {
        throw new Error('자동 문제 신고가 원격 설정에서 비활성화되어 있습니다.');
    }
    const user = await signInGuest();
    const incident = normalizeIncidentPayload(payload);
    const reportId = incidentDocumentId(user.uid, incident);
    let callableFailure = null;

    try {
        return await submitIncidentViaCallable(reportId, incident);
    } catch (error) {
        callableFailure = error;
        console.warn('FoxBear incident callable fallback:', callableErrorCode(error), callableErrorMessage(error));
    }

    const reportRef = doc(bridgeState.db, 'incidentReports', reportId);
    // Compatibility fallback for deployments that have not published the callable
    // functions yet. Create first; read only after a duplicate/update denial.
    try {
        await setDoc(reportRef, {
            ...incident,
            uid: user.uid,
            delivery: { status: 'pending', attemptCount: 0 },
            createdAt: serverTimestamp()
        });
    } catch (error) {
        const duplicate = await getDoc(reportRef).catch(() => null);
        if (!duplicate?.exists?.()) {
            const combined = new Error(`서버 신고 API와 Firestore 호환 경로가 모두 실패했습니다. API: ${callableErrorMessage(callableFailure)} / Firestore: ${limitText(error?.message || error, 220)}`);
            combined.code = error?.code || callableErrorCode(callableFailure) || 'FOXBEAR_INCIDENT_SUBMIT_FAILED';
            throw combined;
        }
        return { queued: true, deduplicated: true, reportId, submissionKey: incident.submissionKey, transport: 'firestore' };
    }
    return { queued: true, deduplicated: false, reportId, submissionKey: incident.submissionKey, transport: 'firestore' };
}

async function getIncidentDelivery(reportId) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const user = await signInGuest();
    const safeId = limitText(reportId, 180);
    if (!safeId.startsWith(`${user.uid}_`)) throw new Error('본인의 문제 보고서만 조회할 수 있습니다.');
    let callableFailure = null;
    try {
        return await readIncidentDeliveryViaCallable(safeId);
    } catch (error) {
        callableFailure = error;
    }
    try {
        const snapshot = await getDoc(doc(bridgeState.db, 'incidentReports', safeId));
        if (!snapshot.exists()) return { exists: false, status: 'missing', transport: 'firestore' };
        const data = snapshot.data() || {};
        const delivery = data.delivery || {};
        return {
            exists: true,
            status: limitText(delivery.status || 'pending', 40),
            reason: limitText(delivery.reason || '', 100),
            code: limitText(delivery.code || '', 80),
            message: limitText(delivery.message || '', 300),
            attemptCount: safeIncidentNumber(delivery.attemptCount, 0, 20),
            terminal: delivery.terminal === true,
            messageId: limitText(delivery.messageId || '', 240),
            subject: limitText(delivery.subject || '', 180),
            senderName: limitText(delivery.senderName || '', 80),
            recipient: limitText(delivery.recipient || '', 180),
            mailType: limitText(delivery.mailType || '', 40),
            acceptedCount: safeIncidentNumber(delivery.acceptedCount, 0, 20),
            rejectedCount: safeIncidentNumber(delivery.rejectedCount, 0, 20),
            smtpResponse: limitText(delivery.smtpResponse || '', 300),
            smtpAcceptedAt: timestampIso(delivery.smtpAcceptedAt),
            nextRetryAt: timestampIso(delivery.nextRetryAt),
            checkedAt: timestampIso(delivery.checkedAt),
            userRetryCount: safeIncidentNumber(delivery.userRetryCount, 0, 2),
            userRetryLimit: 2,
            transport: 'firestore'
        };
    } catch (error) {
        const combined = new Error(`메일 상태 API와 Firestore 조회가 모두 실패했습니다. API: ${callableErrorMessage(callableFailure)} / Firestore: ${limitText(error?.message || error, 220)}`);
        combined.code = error?.code || callableErrorCode(callableFailure) || 'FOXBEAR_INCIDENT_STATUS_FAILED';
        throw combined;
    }
}

async function getAdminProfile() {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const user = bridgeState.auth?.currentUser || await signInGuest();
    const providerId = user?.providerData?.some?.(item => item?.providerId === 'google.com') ? 'google.com' : (user?.isAnonymous ? 'anonymous' : 'unknown');
    const identity = {
        uid: user?.uid || '',
        email: limitText(user?.email || '', 160),
        displayName: limitText(user?.displayName || '', 120),
        emailVerified: user?.emailVerified === true,
        providerId
    };
    if (!user || providerId !== 'google.com' || !identity.emailVerified) {
        return { ...identity, exists: false, active: false, role: '', authMethod: providerId, expiresAt: '' };
    }
    const adminRef = doc(bridgeState.db, 'siteAdmins', user.uid);
    const snapshot = await getDoc(adminRef);
    const data = snapshot.exists() ? (snapshot.data() || {}) : {};
    const configuredEmail = limitText(data.email || '', 160).toLowerCase();
    const signedInEmail = identity.email.toLowerCase();
    const emailMatches = !configuredEmail || configuredEmail === signedInEmail;
    const providerMatches = !data.authProvider || data.authProvider === 'google.com';
    const expiresAt = timestampIso(data.expiresAt);
    const expiresAtMs = expiresAt ? Date.parse(expiresAt) : 0;
    const active = snapshot.exists()
        && data.active === true
        && emailMatches
        && providerMatches
        && (!expiresAtMs || expiresAtMs > Date.now());
    return {
        ...identity,
        exists: snapshot.exists(),
        active,
        role: active ? limitText(data.role || 'admin', 40) : '',
        authMethod: 'google.com',
        expiresAt: active ? expiresAt : '',
        emailMatches,
        providerMatches
    };
}

async function getAdminStats(options = {}) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) {
        throw new Error(`현재 Firebase UID(${profile.uid || '확인 중'})는 활성 관리자 문서가 아닙니다.`);
    }
    const todayKey = limitText(options.dateKey || getDateKey(), 10);
    const eventsLimit = Math.min(Math.max(Number(options.limit || 80), 1), 100);
    const todayLimit = Math.min(Math.max(Number(options.todayLimit || 500), 1), 500);
    const visitsRef = collection(bridgeState.db, 'siteVisits');
    const todayQuery = query(visitsRef, where('dateKey', '==', todayKey));
    const recentQuery = query(visitsRef, orderBy('createdAt', 'desc'), limit(eventsLimit));
    const todayUniqueQuery = query(visitsRef, where('dateKey', '==', todayKey), limit(todayLimit));
    const [totalCountSnap, todayCountSnap, todayUniqueSnap, recentSnap] = await Promise.all([
        getCountFromServer(visitsRef),
        getCountFromServer(todayQuery),
        getDocs(todayUniqueQuery),
        getDocs(recentQuery)
    ]);
    const todayVisitorIds = new Set();
    todayUniqueSnap.forEach(doc => {
        const item = doc.data() || {};
        const id = item.uid || item.visitorId || doc.id;
        if (id) todayVisitorIds.add(id);
    });
    const events = [];
    recentSnap.forEach(doc => events.push(normalizeFirestoreVisit(doc)));
    return {
        totalVisits: totalCountSnap.data().count || 0,
        todayVisits: todayCountSnap.data().count || 0,
        todayUnique: todayVisitorIds.size,
        events,
        uid: bridgeState.user?.uid || '',
        dateKey: todayKey
    };
}


function normalizeIncidentOperations(snapshot) {
    if (!snapshot?.exists?.()) {
        return {
            exists: false,
            status: 'unknown',
            signature: '',
            checkedAt: '',
            stale: true,
            reasons: [],
            queue: {},
            quota: {},
            summaries: {},
            smtp: { status: 'unknown', reason: 'health-document-missing', message: '운영 상태 점검 문서가 아직 생성되지 않았습니다.' },
            channels: { webhook: { status: 'unknown', provider: '', reason: '' } },
            mailVerification: { status: 'unknown', neverTested: true, verificationStale: true, overdueReceiptCount: 0 },
            alert: {}
        };
    }
    const data = snapshot.data() || {};
    const checkedAt = timestampIso(data.checkedAt);
    const checkedAtMs = checkedAt ? Date.parse(checkedAt) : 0;
    return {
        exists: true,
        productVersion: limitText(data.productVersion || '', 24),
        schemaVersion: safeIncidentNumber(data.schemaVersion, 0, 20),
        status: limitText(data.status || 'unknown', 20),
        signature: limitText(data.signature || '', 100),
        checkedAt,
        stale: !checkedAtMs || Date.now() - checkedAtMs > 35 * 60 * 1000,
        reasons: Array.isArray(data.reasons) ? data.reasons.slice(0, 12).map(item => ({
            code: limitText(item?.code || '', 80),
            severity: limitText(item?.severity || 'warning', 20),
            message: limitText(item?.message || '', 300),
            recommendedAction: limitText(item?.recommendedAction || '', 500)
        })) : [],
        queue: {
            pending: safeIncidentNumber(data.queue?.pending, 0, 100000),
            failed: safeIncidentNumber(data.queue?.failed, 0, 100000),
            sending: safeIncidentNumber(data.queue?.sending, 0, 100000),
            retrying: safeIncidentNumber(data.queue?.retrying, 0, 100000),
            deadLetter: safeIncidentNumber(data.queue?.deadLetter, 0, 100000),
            emailed: safeIncidentNumber(data.queue?.emailed, 0, 100000),
            stale: safeIncidentNumber(data.queue?.stale, 0, 100000),
            rateLimitedLegacy: safeIncidentNumber(data.queue?.rateLimitedLegacy, 0, 100000),
            oldestStaleAt: timestampIso(data.queue?.oldestStaleAt)
        },
        quota: {
            dateKey: limitText(data.quota?.dateKey || '', 10),
            sent: safeIncidentNumber(data.quota?.sent, 0, 100000),
            reserved: safeIncidentNumber(data.quota?.reserved, 0, 100000),
            limit: safeIncidentNumber(data.quota?.limit, 0, 100000),
            reservationLeak: safeIncidentNumber(data.quota?.reservationLeak, 0, 100000)
        },
        summaries: {
            failed: safeIncidentNumber(data.summaries?.failed, 0, 100),
            locked: safeIncidentNumber(data.summaries?.locked, 0, 100),
            lastEmailedAt: timestampIso(data.summaries?.lastEmailedAt)
        },
        mailVerification: {
            status: limitText(data.mailVerification?.status || 'unknown', 40),
            neverTested: data.mailVerification?.neverTested === true,
            verificationStale: data.mailVerification?.verificationStale === true,
            confirmedLatest: data.mailVerification?.confirmedLatest === true,
            latestReceiptOverdue: data.mailVerification?.latestReceiptOverdue === true,
            lastTestStatus: limitText(data.mailVerification?.lastTestStatus || '', 40),
            lastTestReason: limitText(data.mailVerification?.lastTestReason || '', 100),
            overdueReceiptCount: safeIncidentNumber(data.mailVerification?.overdueReceiptCount, 0, 1000),
            oldestOverdueReceiptAt: timestampIso(data.mailVerification?.oldestOverdueReceiptAt),
            sampleCapped: data.mailVerification?.sampleCapped === true,
            lastTestAt: timestampIso(data.mailVerification?.lastTestAt),
            lastSmtpAcceptedAt: timestampIso(data.mailVerification?.lastSmtpAcceptedAt),
            lastConfirmedAt: timestampIso(data.mailVerification?.lastConfirmedAt),
            nextVerificationDueAt: timestampIso(data.mailVerification?.nextVerificationDueAt),
            verificationAgeDays: safeIncidentNumber(data.mailVerification?.verificationAgeDays, 0, 3650),
            scheduleStatus: limitText(data.mailVerification?.scheduleStatus || 'not-scheduled', 30)
        },
        smtp: {
            status: limitText(data.smtp?.status || 'unknown', 20),
            reason: limitText(data.smtp?.reason || '', 80),
            code: limitText(data.smtp?.code || '', 80),
            message: limitText(data.smtp?.message || '', 300),
            checkedAt: timestampIso(data.smtp?.checkedAt),
            cached: data.smtp?.cached === true
        },
        channels: {
            webhook: {
                status: limitText(data.channels?.webhook?.status || 'disabled', 20),
                provider: limitText(data.channels?.webhook?.provider || '', 40),
                reason: limitText(data.channels?.webhook?.reason || '', 100),
                failoverReady: data.channels?.webhook?.failoverReady === true,
                primaryStatus: limitText(data.channels?.webhook?.primaryStatus || 'disabled', 20),
                primaryProvider: limitText(data.channels?.webhook?.primaryProvider || '', 40),
                fallbackStatus: limitText(data.channels?.webhook?.fallbackStatus || 'disabled', 20),
                fallbackProvider: limitText(data.channels?.webhook?.fallbackProvider || '', 40)
            }
        },
        alert: {
            status: limitText(data.alert?.status || '', 40),
            kind: limitText(data.alert?.kind || '', 20),
            reason: limitText(data.alert?.reason || '', 100),
            lastDispatchedAt: timestampIso(data.alert?.lastDispatchedAt),
            lastSentAt: timestampIso(data.alert?.lastSentAt),
            smtpStatus: limitText(data.alert?.channels?.smtp?.status || '', 20),
            webhookStatus: limitText(data.alert?.channels?.webhook?.status || '', 20),
            webhookProvider: limitText(data.alert?.channels?.webhook?.provider || '', 40)
        },
        lastIncidentSentAt: timestampIso(data.lastIncidentSentAt)
    };
}

function normalizeMailVerification(snapshot) {
    if (!snapshot?.exists?.()) return { exists: false, status: 'missing', stale: true, lastTestReportId: '', lastConfirmedReportId: '' };
    const data = snapshot.data() || {};
    const lastConfirmedAt = timestampIso(data.lastConfirmedAt);
    const lastSmtpAcceptedAt = timestampIso(data.lastSmtpAcceptedAt);
    const lastTestReportId = limitText(data.lastTestReportId || '', 180);
    const lastConfirmedReportId = limitText(data.lastConfirmedReportId || '', 180);
    const confirmedLatest = Boolean(lastTestReportId && lastConfirmedReportId && lastTestReportId === lastConfirmedReportId);
    const referenceAt = confirmedLatest ? lastConfirmedAt : (lastSmtpAcceptedAt || timestampIso(data.lastTestAt));
    const referenceMs = referenceAt ? Date.parse(referenceAt) : 0;
    return {
        exists: true,
        productVersion: limitText(data.productVersion || '', 24),
        status: limitText(confirmedLatest ? 'confirmed' : (data.status || data.lastTestStatus || 'unknown'), 40),
        confirmedLatest,
        stale: !confirmedLatest || !referenceMs || Date.now() - referenceMs > 7 * 24 * 60 * 60 * 1000,
        lastTestReportId,
        lastTestStatus: limitText(data.lastTestStatus || '', 40),
        lastTestReason: limitText(data.lastTestReason || '', 100),
        lastTestSubject: limitText(data.lastTestSubject || '', 180),
        lastTestMessageId: limitText(data.lastTestMessageId || '', 240),
        lastTestAt: timestampIso(data.lastTestAt),
        lastSmtpAcceptedAt,
        lastConfirmedReportId,
        lastConfirmedLocation: limitText(data.lastConfirmedLocation || '', 20),
        lastConfirmedAt,
        lastConfirmedSubject: limitText(data.lastConfirmedSubject || '', 180),
        lastConfirmedMessageId: limitText(data.lastConfirmedMessageId || '', 240),
        warningAfter: timestampIso(data.warningAfter),
        nextVerificationDueAt: timestampIso(data.nextVerificationDueAt || data.warningAfter),
        verificationAgeDays: safeIncidentNumber(data.verificationAgeDays, 0, 3650),
        scheduleStatus: limitText(data.scheduleStatus || (referenceMs && Date.now() > referenceMs + 7 * 24 * 60 * 60 * 1000 ? 'overdue' : referenceMs ? 'scheduled' : 'not-scheduled'), 30)
    };
}

function normalizeMailTestHistory(snapshot) {
    const data = snapshot.data() || {};
    return {
        id: limitText(snapshot.id || '', 180),
        reportId: limitText(data.reportId || '', 180),
        testId: limitText(data.testId || '', 100),
        productVersion: limitText(data.productVersion || '', 24),
        status: limitText(data.status || 'unknown', 40),
        reason: limitText(data.reason || '', 100),
        subject: limitText(data.subject || '', 180),
        messageId: limitText(data.messageId || '', 240),
        acceptedCount: safeIncidentNumber(data.acceptedCount, 0, 20),
        rejectedCount: safeIncidentNumber(data.rejectedCount, 0, 20),
        smtpAcceptedAt: timestampIso(data.smtpAcceptedAt),
        checkedAt: timestampIso(data.checkedAt),
        receiptConfirmed: data.receiptConfirmed === true,
        receiptPending: data.receiptPending === true,
        receiptOverdue: data.receiptOverdue === true || (data.receiptConfirmed !== true && data.status === 'emailed' && Number(data.receiptDueAt?.toMillis?.() || 0) > 0 && Date.now() > Number(data.receiptDueAt.toMillis())),
        confirmationStatus: limitText(data.confirmationStatus || (data.receiptConfirmed ? 'confirmed' : data.status === 'emailed' ? 'pending' : 'not-applicable'), 30),
        receiptDueAt: timestampIso(data.receiptDueAt),
        receiptLocation: limitText(data.receiptLocation || '', 20),
        receiptConfirmedAt: timestampIso(data.receiptConfirmedAt),
        receiptDismissed: data.receiptDismissed === true || data.confirmationStatus === 'dismissed',
        receiptResolvedAt: timestampIso(data.receiptResolvedAt),
        receiptResolutionReason: limitText(data.receiptResolutionReason || '', 80),
        message: limitText(data.message || '', 300)
    };
}

function normalizeIncidentRecovery(snapshot) {
    if (!snapshot?.exists?.()) return { exists: false, status: 'missing', checkedAt: '' };
    const data = snapshot.data() || {};
    return {
        exists: true,
        source: limitText(data.source || '', 40),
        mode: limitText(data.mode || '', 40),
        requested: safeIncidentNumber(data.requested, 0, 1000),
        attempted: safeIncidentNumber(data.attempted, 0, 1000),
        emailed: safeIncidentNumber(data.emailed, 0, 1000),
        failed: safeIncidentNumber(data.failed, 0, 1000),
        deadLetter: safeIncidentNumber(data.deadLetter, 0, 1000),
        skipped: safeIncidentNumber(data.skipped, 0, 1000),
        durationMs: safeIncidentNumber(data.durationMs, 0, 3600000),
        checkedAt: timestampIso(data.checkedAt)
    };
}

function normalizeOperationsHistory(snapshot) {
    const data = snapshot.data() || {};
    return {
        id: limitText(snapshot.id || '', 40),
        productVersion: limitText(data.productVersion || '', 24),
        status: limitText(data.status || 'unknown', 20),
        checkedAt: timestampIso(data.checkedAt),
        stale: safeIncidentNumber(data.queue?.stale, 0, 100000),
        deadLetter: safeIncidentNumber(data.queue?.deadLetter, 0, 100000),
        pending: safeIncidentNumber(data.queue?.pending, 0, 100000),
        failed: safeIncidentNumber(data.queue?.failed, 0, 100000),
        smtpStatus: limitText(data.smtpStatus || 'unknown', 20),
        webhookStatus: limitText(data.webhookStatus || 'disabled', 20),
        alertStatus: limitText(data.alertStatus || '', 20),
        mailVerificationStatus: limitText(data.mailVerificationStatus || 'unknown', 40),
        mailVerificationStale: data.mailVerificationStale === true,
        overdueReceiptCount: safeIncidentNumber(data.overdueReceiptCount, 0, 1000),
        reasonCodes: Array.isArray(data.reasonCodes) ? data.reasonCodes.slice(0, 12).map(value => limitText(value, 80)) : [],
        recommendedActions: Array.isArray(data.recommendedActions) ? data.recommendedActions.slice(0, 6).map(value => limitText(value, 500)) : []
    };
}

function normalizeIncidentDeployment(snapshot) {
    if (!snapshot?.exists?.()) return { exists: false, status: 'missing', productVersion: '', checkedAt: '', stale: true, recommendedActions: [] };
    const data = snapshot.data() || {};
    const checkedAt = timestampIso(data.checkedAt);
    const checkedAtMs = checkedAt ? Date.parse(checkedAt) : 0;
    return {
        exists: true,
        status: limitText(data.status || 'unknown', 20),
        productVersion: limitText(data.productVersion || '', 24),
        operationsSchemaVersion: safeIncidentNumber(data.operationsSchemaVersion, 0, 20),
        checkedAt,
        stale: !checkedAtMs || Date.now() - checkedAtMs > 24 * 60 * 60 * 1000,
        reasonCodes: Array.isArray(data.reasonCodes) ? data.reasonCodes.slice(0, 12).map(value => limitText(value, 80)) : [],
        recommendedActions: Array.isArray(data.recommendedActions) ? data.recommendedActions.slice(0, 6).map(value => limitText(value, 500)) : [],
        smtpStatus: limitText(data.checks?.smtp?.status || 'unknown', 20),
        smtpReason: limitText(data.checks?.smtp?.reason || '', 100),
        webhookStatus: limitText(data.checks?.webhook?.status || 'disabled', 20),
        webhookProvider: limitText(data.checks?.webhook?.provider || '', 40),
        capabilities: {
            batchRecovery: data.checks?.batchRecovery === true,
            alertChannelTest: data.checks?.alertChannelTest === true,
            actionRateLimit: data.checks?.actionRateLimit === true,
            historyDetail: data.checks?.historyDetail === true,
            adminAuditLog: data.checks?.adminAuditLog === true,
            historyPagination: data.checks?.historyPagination === true,
            mailTestVerificationAlerts: data.checks?.mailTestVerificationAlerts === true,
            mailReceiptOverdueTracking: data.checks?.mailReceiptOverdueTracking === true,
            mailTestStatistics: data.checks?.mailTestStatistics === true,
            mailTestHistorySearchExport: data.checks?.mailTestHistorySearchExport === true,
            mailTestPeriodTrends: data.checks?.mailTestPeriodTrends === true,
            mailVerificationSchedule: data.checks?.mailVerificationSchedule === true,
            adminOperationsUiHierarchy: data.checks?.adminOperationsUiHierarchy === true,
            webhookFailover: data.checks?.webhookFailover === true,
            indexes: {
                status: limitText(data.checks?.indexes?.status || 'unknown', 20),
                probes: Array.isArray(data.checks?.indexes?.probes) ? data.checks.indexes.probes.slice(0, 12).map(item => ({ name: limitText(item?.name || '', 80), status: limitText(item?.status || 'unknown', 20), reason: limitText(item?.reason || '', 100) })) : []
            },
            postDeployHealth: {
                operationsStateExists: data.checks?.postDeployHealth?.operationsStateExists === true,
                operationsStatus: limitText(data.checks?.postDeployHealth?.operationsStatus || 'unknown', 20),
                stale: data.checks?.postDeployHealth?.stale === true
            }
        }
    };
}

function normalizeFirestoreIncident(snapshot) {
    const item = snapshot.data() || {};
    const createdAt = item.createdAt && typeof item.createdAt.toDate === 'function'
        ? item.createdAt.toDate().toISOString()
        : item.clientAt || '';
    const delivery = item.delivery || {};
    const nextRetryAt = delivery.nextRetryAt && typeof delivery.nextRetryAt.toDate === 'function'
        ? delivery.nextRetryAt.toDate().toISOString()
        : '';
    const leaseUntil = delivery.leaseUntil && typeof delivery.leaseUntil.toDate === 'function'
        ? delivery.leaseUntil.toDate().toISOString()
        : '';
    return {
        id: limitText(snapshot.id || '', 180),
        at: limitText(createdAt, 40),
        severity: limitText(item.severity || 'error', 16),
        category: limitText(item.category || 'unknown', 40),
        reason: limitText(item.reason || '', 100),
        message: limitText(item.message || '', 500),
        code: limitText(item.code || '', 80),
        fingerprint: limitText(item.fingerprint || '', 64),
        appVersion: limitText(item.appVersion || '', 24),
        browser: limitText(item.browser || '', 40),
        platform: limitText(item.platform || '', 40),
        deliveryStatus: limitText(delivery.status || 'pending', 40),
        deliveryReason: limitText(delivery.reason || '', 100),
        deliveryMessage: limitText(delivery.message || '', 300),
        messageId: limitText(delivery.messageId || '', 240),
        attemptCount: safeIncidentNumber(delivery.attemptCount, 0, 20),
        manualResetCount: safeIncidentNumber(delivery.manualResetCount, 0, 20),
        terminal: delivery.terminal === true,
        nextRetryAt: limitText(nextRetryAt, 40),
        leaseUntil: limitText(leaseUntil, 40)
    };
}


function normalizeAdminAuditLog(snapshot) {
    const data = snapshot.data() || {};
    return {
        id: limitText(snapshot.id || '', 180),
        at: timestampIso(data.createdAt),
        uid: limitText(data.uid || '', 128),
        action: limitText(data.action || 'unknown', 80),
        status: limitText(data.status || 'recorded', 40),
        reason: limitText(data.reason || '', 100),
        requestId: limitText(data.requestId || '', 180),
        targetType: limitText(data.targetType || '', 60),
        targetId: limitText(data.targetId || '', 180),
        result: {
            attempted: safeIncidentNumber(data.result?.attempted, 0, 100000),
            succeeded: safeIncidentNumber(data.result?.succeeded, 0, 100000),
            failed: safeIncidentNumber(data.result?.failed, 0, 100000),
            skipped: safeIncidentNumber(data.result?.skipped, 0, 100000)
        }
    };
}

function parseHistoryFilter(filter = 'all') {
    const safe = limitText(filter || 'all', 120);
    if (safe.startsWith('status:')) return { type: 'status', value: limitText(safe.slice(7), 20) };
    if (safe.startsWith('reason:')) return { type: 'reason', value: limitText(safe.slice(7), 80) };
    return { type: 'all', value: '' };
}

async function getIncidentOperationsHistory(options = {}) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 운영 이력을 조회할 수 있습니다.');
    const pageSize = Math.min(Math.max(Number(options.limit || 24), 1), 48);
    const filter = parseHistoryFilter(options.filter);
    const before = Number(options.before || 0);
    const constraints = [];
    if (filter.type === 'status' && filter.value) constraints.push(where('status', '==', filter.value));
    if (filter.type === 'reason' && filter.value) constraints.push(where('reasonCodes', 'array-contains', filter.value));
    if (before > 0) constraints.push(where('checkedAt', '<', new Date(before)));
    constraints.push(orderBy('checkedAt', 'desc'), limit(pageSize + 1));
    const snapshot = await getDocs(query(collection(bridgeState.db, 'incidentOperationsHistory'), ...constraints));
    const docs = snapshot.docs.slice(0, pageSize);
    const items = docs.map(normalizeOperationsHistory);
    const last = docs[docs.length - 1];
    return {
        items,
        hasMore: snapshot.docs.length > pageSize,
        nextCursor: last ? Number(last.data()?.checkedAt?.toMillis?.() || 0) : 0,
        filter: filter.type === 'all' ? 'all' : `${filter.type}:${filter.value}`
    };
}

async function getIncidentAdminAuditLog(options = {}) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 관리자 감사 로그를 조회할 수 있습니다.');
    const pageSize = Math.min(Math.max(Number(options.limit || 24), 1), 50);
    const before = Number(options.before || 0);
    const constraints = [];
    if (before > 0) constraints.push(where('createdAt', '<', new Date(before)));
    constraints.push(orderBy('createdAt', 'desc'), limit(pageSize + 1));
    const snapshot = await getDocs(query(collection(bridgeState.db, 'incidentAdminAuditLog'), ...constraints));
    const docs = snapshot.docs.slice(0, pageSize);
    const last = docs[docs.length - 1];
    return {
        items: docs.map(normalizeAdminAuditLog),
        hasMore: snapshot.docs.length > pageSize,
        nextCursor: last ? Number(last.data()?.createdAt?.toMillis?.() || 0) : 0
    };
}

function summarizeMailTestHistory(items = []) {
    const stats = items.reduce((result, item) => {
        result.total += 1;
        if (item.status === 'emailed') result.smtpAccepted += 1;
        else if (['failed', 'dead-letter'].includes(item.status)) result.failed += 1;
        else result.other += 1;
        if (item.receiptConfirmed) {
            result.receiptConfirmed += 1;
            if (item.receiptLocation === 'spam') result.spam += 1;
            else result.inbox += 1;
        } else if (item.status === 'emailed') {
            result.receiptPending += 1;
            if (item.receiptOverdue) result.receiptOverdue += 1;
        }
        return result;
    }, { total: 0, smtpAccepted: 0, failed: 0, other: 0, receiptConfirmed: 0, receiptPending: 0, receiptOverdue: 0, inbox: 0, spam: 0 });
    stats.smtpSuccessRate = stats.total ? Math.round((stats.smtpAccepted / stats.total) * 1000) / 10 : 0;
    stats.receiptConfirmationRate = stats.smtpAccepted ? Math.round((stats.receiptConfirmed / stats.smtpAccepted) * 1000) / 10 : 0;
    return stats;
}

async function getIncidentMailTestHistory(options = {}) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 실제 메일 테스트 이력을 조회할 수 있습니다.');
    const pageSize = Math.min(Math.max(Number(options.limit || 100), 1), 200);
    const snapshot = await getDocs(query(collection(bridgeState.db, 'incidentMailTestHistory'), orderBy('checkedAt', 'desc'), limit(pageSize)));
    const items = snapshot.docs.map(normalizeMailTestHistory);
    return { items, stats: summarizeMailTestHistory(items), checkedAt: new Date().toISOString() };
}

async function getAdminIncidents(options = {}) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error(`현재 Firebase UID(${profile.uid || '확인 중'})는 활성 관리자 문서가 아닙니다.`);
    const eventsLimit = Math.min(Math.max(Number(options.limit || 100), 1), 150);
    const reportsRef = collection(bridgeState.db, 'incidentReports');
    const recentQuery = query(reportsRef, orderBy('createdAt', 'desc'), limit(eventsLimit));
    const kstRange = getKstDayRange(new Date());
    const todayQuery = query(reportsRef, where('createdAt', '>=', kstRange.start), where('createdAt', '<', kstRange.end));
    const [snapshot, todayCountSnapshot, operationsSnapshot, recoverySnapshot, deploymentSnapshot, verificationSnapshot, testHistorySnapshot, historyPage, auditLog] = await Promise.all([
        getDocs(recentQuery),
        getCountFromServer(todayQuery),
        getDoc(doc(bridgeState.db, 'incidentOperations', 'mail')),
        getDoc(doc(bridgeState.db, 'incidentOperations', 'recovery')),
        getDoc(doc(bridgeState.db, 'incidentOperations', 'deployment')).catch(() => ({ exists: () => false })),
        getDoc(doc(bridgeState.db, 'incidentOperations', 'mailVerification')).catch(() => ({ exists: () => false })),
        getIncidentMailTestHistory({ limit: 200 }).catch(() => ({ items: [], stats: summarizeMailTestHistory([]) })),
        getIncidentOperationsHistory({ limit: 24, filter: 'all' }).catch(() => ({ items: [], hasMore: false, nextCursor: 0 })),
        getIncidentAdminAuditLog({ limit: 24 }).catch(() => ({ items: [], hasMore: false, nextCursor: 0 }))
    ]);
    const incidents = [];
    snapshot.forEach(item => incidents.push(normalizeFirestoreIncident(item)));
    const summary = incidents.reduce((result, item) => {
        result.total += 1;
        if (item.deliveryStatus === 'failed') result.failed += 1;
        if (item.deliveryStatus === 'dead-letter') result.deadLetter += 1;
        if (['pending', 'sending', 'retrying', 'reserved'].includes(item.deliveryStatus)) result.pending += 1;
        if (item.deliveryStatus === 'emailed') result.emailed += 1;
        if (item.severity === 'fatal') result.fatal += 1;
        return result;
    }, { total: 0, today: 0, failed: 0, deadLetter: 0, pending: 0, emailed: 0, fatal: 0 });
    summary.today = safeIncidentNumber(todayCountSnapshot.data()?.count, 0, 1000000);
    return {
        uid: profile.uid,
        incidents,
        summary,
        operations: normalizeIncidentOperations(operationsSnapshot),
        recovery: normalizeIncidentRecovery(recoverySnapshot),
        deployment: normalizeIncidentDeployment(deploymentSnapshot),
        mailVerification: normalizeMailVerification(verificationSnapshot),
        mailTestHistory: Array.isArray(testHistorySnapshot.items) ? testHistorySnapshot.items : [],
        mailTestStats: testHistorySnapshot.stats || summarizeMailTestHistory([]),
        history: historyPage.items || [],
        historyHasMore: historyPage.hasMore === true,
        historyNextCursor: safeIncidentNumber(historyPage.nextCursor, 0, Number.MAX_SAFE_INTEGER),
        auditLog: auditLog.items || [],
        auditLogHasMore: auditLog.hasMore === true,
        auditLogNextCursor: safeIncidentNumber(auditLog.nextCursor, 0, Number.MAX_SAFE_INTEGER),
        dateKey: kstRange.dateKey,
        appCheck: { mode: 'disabled', disabled: true, configured: false, ready: false, error: '' }
    };
}

async function requestIncidentRetry(reportId, options = {}) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 메일 재전송을 요청할 수 있습니다.');
    const safeReportId = limitText(reportId, 180);
    if (!safeReportId) throw new Error('재전송할 보고서 ID가 없습니다.');
    const requestRef = await addDoc(collection(bridgeState.db, 'incidentRetryRequests'), {
        uid: profile.uid,
        reportId: safeReportId,
        source: 'foxbear-admin-dashboard',
        forceTerminal: options.forceTerminal === true,
        createdAt: serverTimestamp()
    });
    return { requestId: requestRef.id, reportId: safeReportId, status: 'requested' };
}

async function getIncidentRetryRequest(requestId) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 재전송 상태를 조회할 수 있습니다.');
    const safeId = limitText(requestId, 180);
    const snapshot = await getDoc(doc(bridgeState.db, 'incidentRetryRequests', safeId));
    if (!snapshot.exists()) return { exists: false, status: 'missing' };
    const data = snapshot.data() || {};
    return {
        exists: true,
        status: limitText(data.status || 'pending', 40),
        reason: limitText(data.reason || '', 100),
        retryAfterSeconds: safeIncidentNumber(data.retryAfterSeconds, 0, 86400)
    };
}

async function requestIncidentBatchRecovery(mode = 'recoverable') {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 일괄 복구를 요청할 수 있습니다.');
    const safeMode = mode === 'dead-letter' ? 'dead-letter' : 'recoverable';
    const requestRef = await addDoc(collection(bridgeState.db, 'incidentBatchRecoveryRequests'), {
        uid: profile.uid,
        mode: safeMode,
        source: 'foxbear-admin-dashboard',
        createdAt: serverTimestamp()
    });
    return { requestId: requestRef.id, mode: safeMode, status: 'requested' };
}

async function getIncidentBatchRecoveryRequest(requestId) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 일괄 복구 상태를 조회할 수 있습니다.');
    const safeId = limitText(requestId, 180);
    const snapshot = await getDoc(doc(bridgeState.db, 'incidentBatchRecoveryRequests', safeId));
    if (!snapshot.exists()) return { exists: false, status: 'missing' };
    const data = snapshot.data() || {};
    const result = data.result || {};
    return {
        exists: true,
        status: limitText(data.status || 'pending', 40),
        reason: limitText(data.reason || '', 100),
        retryAfterSeconds: safeIncidentNumber(data.retryAfterSeconds, 0, 86400),
        result: {
            requested: safeIncidentNumber(result.requested, 0, 1000),
            attempted: safeIncidentNumber(result.attempted, 0, 1000),
            emailed: safeIncidentNumber(result.emailed, 0, 1000),
            failed: safeIncidentNumber(result.failed, 0, 1000),
            deadLetter: safeIncidentNumber(result.deadLetter, 0, 1000),
            skipped: safeIncidentNumber(result.skipped, 0, 1000)
        }
    };
}


async function requestIncidentAlertChannelTest() {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 보조 경보 채널을 테스트할 수 있습니다.');
    const requestRef = await addDoc(collection(bridgeState.db, 'incidentAlertTestRequests'), {
        uid: profile.uid,
        source: 'foxbear-admin-dashboard',
        createdAt: serverTimestamp()
    });
    return { requestId: requestRef.id, status: 'requested' };
}

async function getIncidentAlertChannelTestRequest(requestId) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 보조 경보 테스트 상태를 조회할 수 있습니다.');
    const safeId = limitText(requestId, 180);
    const snapshot = await getDoc(doc(bridgeState.db, 'incidentAlertTestRequests', safeId));
    if (!snapshot.exists()) return { exists: false, status: 'missing' };
    const data = snapshot.data() || {};
    return {
        exists: true,
        status: limitText(data.status || 'pending', 40),
        reason: limitText(data.reason || '', 100),
        provider: limitText(data.provider || '', 40),
        statusCode: safeIncidentNumber(data.statusCode, 0, 999),
        retryAfterSeconds: safeIncidentNumber(data.retryAfterSeconds, 0, 86400)
    };
}

async function requestIncidentDeploymentVerification() {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 배포 상태를 검증할 수 있습니다.');
    const requestRef = await addDoc(collection(bridgeState.db, 'incidentDeploymentVerificationRequests'), {
        uid: profile.uid,
        source: 'foxbear-admin-dashboard',
        expectedVersion: limitText(window.FoxBearBuildInfo?.productVersion || '', 24),
        createdAt: serverTimestamp()
    });
    return { requestId: requestRef.id, status: 'requested' };
}

async function getIncidentDeploymentVerificationRequest(requestId) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 배포 검증 상태를 조회할 수 있습니다.');
    const safeId = limitText(requestId, 180);
    const snapshot = await getDoc(doc(bridgeState.db, 'incidentDeploymentVerificationRequests', safeId));
    if (!snapshot.exists()) return { exists: false, status: 'missing' };
    const data = snapshot.data() || {};
    return {
        exists: true,
        status: limitText(data.status || 'pending', 40),
        reason: limitText(data.reason || '', 100),
        retryAfterSeconds: safeIncidentNumber(data.retryAfterSeconds, 0, 86400),
        result: data.result ? {
            status: limitText(data.result.status || 'unknown', 20),
            productVersion: limitText(data.result.productVersion || '', 24),
            operationsSchemaVersion: safeIncidentNumber(data.result.operationsSchemaVersion, 0, 20),
            reasonCodes: Array.isArray(data.result.reasonCodes) ? data.result.reasonCodes.slice(0, 12).map(value => limitText(value, 80)) : [],
            recommendedActions: Array.isArray(data.result.recommendedActions) ? data.result.recommendedActions.slice(0, 6).map(value => limitText(value, 500)) : []
        } : null
    };
}

async function requestIncidentMailReceiptConfirmation(reportId, location = 'inbox') {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 테스트 메일 수신을 확인할 수 있습니다.');
    const safeReportId = limitText(reportId, 180);
    if (!safeReportId) throw new Error('확인할 테스트 보고서 ID가 없습니다.');
    const safeLocation = location === 'spam' ? 'spam' : 'inbox';
    const requestRef = await addDoc(collection(bridgeState.db, 'incidentMailReceiptConfirmationRequests'), {
        uid: profile.uid,
        reportId: safeReportId,
        location: safeLocation,
        source: 'foxbear-admin-dashboard',
        createdAt: serverTimestamp()
    });
    return { requestId: requestRef.id, reportId: safeReportId, location: safeLocation, status: 'requested' };
}

async function getIncidentMailReceiptConfirmationRequest(requestId) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 수신 확인 상태를 조회할 수 있습니다.');
    const safeId = limitText(requestId, 180);
    const snapshot = await getDoc(doc(bridgeState.db, 'incidentMailReceiptConfirmationRequests', safeId));
    if (!snapshot.exists()) return { exists: false, status: 'missing' };
    const data = snapshot.data() || {};
    return {
        exists: true,
        status: limitText(data.status || 'pending', 40),
        reason: limitText(data.reason || '', 100),
        result: data.result ? {
            reportId: limitText(data.result.reportId || '', 180),
            location: limitText(data.result.location || '', 20),
            status: limitText(data.result.status || '', 40)
        } : null
    };
}

async function requestIncidentMailTestCleanup() {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 미확인 테스트 이력을 정리할 수 있습니다.');
    const requestRef = await addDoc(collection(bridgeState.db, 'incidentMailTestCleanupRequests'), {
        uid: profile.uid,
        mode: 'unconfirmed-24h',
        source: 'foxbear-admin-dashboard',
        createdAt: serverTimestamp()
    });
    return { requestId: requestRef.id, status: 'requested' };
}

async function getIncidentMailTestCleanupRequest(requestId) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 미확인 테스트 정리 상태를 조회할 수 있습니다.');
    const safeId = limitText(requestId, 180);
    const snapshot = await getDoc(doc(bridgeState.db, 'incidentMailTestCleanupRequests', safeId));
    if (!snapshot.exists()) return { exists: false, status: 'missing' };
    const data = snapshot.data() || {};
    return {
        exists: true,
        status: limitText(data.status || 'pending', 40),
        reason: limitText(data.reason || '', 100),
        retryAfterSeconds: safeIncidentNumber(data.retryAfterSeconds, 0, 86400),
        result: data.result ? {
            requested: safeIncidentNumber(data.result.requested, 0, 1000),
            cleaned: safeIncidentNumber(data.result.cleaned, 0, 1000),
            skipped: safeIncidentNumber(data.result.skipped, 0, 1000),
            capped: data.result.capped === true
        } : null
    };
}

async function loadRemoteConfig() {
    try {
        if (!(await isRemoteConfigSupported())) return;
        bridgeState.remoteConfig = getRemoteConfig(bridgeState.app);
        bridgeState.remoteConfig.settings = {
            minimumFetchIntervalMillis: 60 * 60 * 1000,
            fetchTimeoutMillis: 5000
        };
        bridgeState.remoteConfig.defaultConfig = REMOTE_CONFIG_DEFAULTS;
        await fetchAndActivate(bridgeState.remoteConfig);
        bridgeState.remoteConfigValues = {
            foxbear_notice: getValue(bridgeState.remoteConfig, 'foxbear_notice').asString(),
            foxbear_stats_enabled: getValue(bridgeState.remoteConfig, 'foxbear_stats_enabled').asBoolean(),
            foxbear_storage_enabled: false,
            foxbear_incident_reporting_enabled: getValue(bridgeState.remoteConfig, 'foxbear_incident_reporting_enabled').asBoolean(),
            foxbear_youtube_url: getValue(bridgeState.remoteConfig, 'foxbear_youtube_url').asString() || REMOTE_CONFIG_DEFAULTS.foxbear_youtube_url
        };
    } catch (error) {
        console.warn('Firebase Remote Config skipped:', error);
    }
}

function exposeBridge(extra = {}) {
    window.FoxBearFirebase = makePublicBridge(extra);
}

async function bootFirebase() {
    try {
        await loadFirebaseModules();
        bridgeState.app = initializeApp(FIREBASE_CONFIG);
        bridgeState.auth = getAuth(bridgeState.app);
        bridgeState.db = getFirestore(bridgeState.app);
        bridgeState.functions = getFunctions(bridgeState.app, FIREBASE_FUNCTIONS_REGION);
        exposeBridge();
        onAuthStateChanged(bridgeState.auth, user => {
            bridgeState.user = user;
            bridgeState.authReady = true;
            exposeBridge();
            dispatchFirebaseEvent('foxbear:firebase-auth', { user });
        });
        if (isFirebaseHostingAdminOrigin() && typeof getRedirectResult === 'function') {
            try {
                const redirectResult = await getRedirectResult(bridgeState.auth);
                if (redirectResult?.user) {
                    bridgeState.user = redirectResult.user;
                    bridgeState.authReady = true;
                    clearAdminRedirectState();
                    clearAdminAuthDiagnostics();
                } else if (readAdminRedirectAttempts() > 0) {
                    const missingResult = new Error('Google 로그인에서 돌아왔지만 인증 결과를 확인하지 못했습니다. OAuth 리디렉션 URI와 브라우저 사이트 데이터 허용 상태를 확인해주세요.');
                    missingResult.code = 'auth/redirect-result-missing';
                    recordAdminAuthDiagnostics(missingResult, { redirectAttempted: true });
                    clearAdminRedirectState();
                }
            } catch (error) {
                bridgeState.error = sanitizeAdminAuthMessage(error);
                recordAdminAuthDiagnostics(error, { redirectAttempted: true });
                clearAdminRedirectState();
            }
        } else {
            clearAdminRedirectState();
        }
        await signInGuest();
        await loadRemoteConfig();
        bridgeState.ready = true;
        exposeBridge();
        dispatchFirebaseEvent('foxbear:firebase-ready');
    } catch (error) {
        bridgeState.error = error?.message || String(error);
        bridgeState.ready = false;
        exposeBridge();
        dispatchFirebaseEvent('foxbear:firebase-error', { error: bridgeState.error });
        console.warn('Firebase bootstrap failed:', error);
    }
}

exposeBridge();
function scheduleFirebaseBoot() {
    const start = () => bootFirebase();
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(start, { timeout: 2500 });
        return;
    }
    window.setTimeout(start, 650);
}
scheduleFirebaseBoot();
