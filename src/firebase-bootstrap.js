let initializeApp;
let getAuth;
let onAuthStateChanged;
let signInAnonymously;
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
let initializeAppCheck;
let ReCaptchaEnterpriseProvider;
let getToken;
let firebaseModulesPromise = null;

const FIREBASE_SDK_VERSION = '12.16.0';
const FIREBASE_MODULE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
const FIREBASE_CONFIG = Object.freeze({
    apiKey: 'AIzaSyBvYuYlN6etTd3B6C_ZGvsaAktbWJU8yOs',
    authDomain: 'foxbear-music.firebaseapp.com',
    projectId: 'foxbear-music',
    storageBucket: 'foxbear-music.firebasestorage.app',
    messagingSenderId: '52981410353',
    appId: '1:52981410353:web:c9c700a8e55672a999c310'
});
const APP_CHECK_SITE_KEY = String(
    window.FOXBEAR_APP_CHECK_SITE_KEY
    || document.querySelector('meta[name="foxbear-app-check-site-key"]')?.content
    || ''
).trim();


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
    appCheckConfigured: Boolean(APP_CHECK_SITE_KEY),
    appCheckReady: false,
    appCheckError: '',
    auth: null,
    db: null,
    remoteConfig: null,
    user: null,
    ready: false,
    authReady: false,
    remoteConfigValues: { ...REMOTE_CONFIG_DEFAULTS },
    error: '',
    storageEnabled: false,
    storageReason: 'Spark 무료 요금제에서는 Cloud Storage for Firebase를 사용하지 않습니다.'
};

async function loadFirebaseModules() {
    if (firebaseModulesPromise) return firebaseModulesPromise;
    firebaseModulesPromise = Promise.all([
        import(`${FIREBASE_MODULE_BASE}/firebase-app.js`),
        import(`${FIREBASE_MODULE_BASE}/firebase-auth.js`),
        import(`${FIREBASE_MODULE_BASE}/firebase-firestore.js`),
        import(`${FIREBASE_MODULE_BASE}/firebase-remote-config.js`),
        import(`${FIREBASE_MODULE_BASE}/firebase-app-check.js`)
    ]).then(([appModule, authModule, firestoreModule, remoteConfigModule, appCheckModule]) => {
        ({ initializeApp } = appModule);
        ({ getAuth, onAuthStateChanged, signInAnonymously } = authModule);
        ({ addDoc, collection, doc, getCountFromServer, getDoc, getDocs, getFirestore, limit, orderBy, query, serverTimestamp, setDoc, where } = firestoreModule);
        ({ fetchAndActivate, getRemoteConfig, getValue, isSupported: isRemoteConfigSupported } = remoteConfigModule);
        ({ initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } = appCheckModule);
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
        ready: bridgeState.ready,
        authReady: bridgeState.authReady,
        uid: bridgeState.user?.uid || '',
        error: bridgeState.error,
        storageEnabled: false,
        storageReason: bridgeState.storageReason,
        appCheck: Object.freeze({
            configured: bridgeState.appCheckConfigured,
            ready: bridgeState.appCheckReady,
            error: bridgeState.appCheckError
        }),
        remoteConfig: { ...bridgeState.remoteConfigValues },
        signInGuest,
        logVisit,
        logIncident,
        getIncidentDelivery,
        getAdminStats,
        getAdminIncidents,
        requestIncidentRetry,
        getIncidentRetryRequest,
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


async function initializeFoxBearAppCheck() {
    if (!APP_CHECK_SITE_KEY) {
        bridgeState.appCheckConfigured = false;
        bridgeState.appCheckReady = false;
        bridgeState.appCheckError = 'reCAPTCHA Enterprise 사이트 키가 설정되지 않았습니다.';
        return false;
    }
    try {
        bridgeState.appCheck = initializeAppCheck(bridgeState.app, {
            provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
            isTokenAutoRefreshEnabled: true
        });
        bridgeState.appCheckConfigured = true;
        bridgeState.appCheckReady = true;
        bridgeState.appCheckError = '';
        return true;
    } catch (error) {
        bridgeState.appCheckReady = false;
        bridgeState.appCheckError = limitText(error?.message || error, 300);
        console.warn('Firebase App Check initialization skipped:', error);
        return false;
    }
}

async function refreshAppCheckToken(forceRefresh = false) {
    if (!bridgeState.appCheck) {
        return { configured: bridgeState.appCheckConfigured, ready: false, error: bridgeState.appCheckError || 'App Check가 초기화되지 않았습니다.' };
    }
    try {
        const result = await getToken(bridgeState.appCheck, Boolean(forceRefresh));
        bridgeState.appCheckReady = Boolean(result?.token);
        bridgeState.appCheckError = '';
        exposeBridge();
        return {
            configured: true,
            ready: bridgeState.appCheckReady,
            expireTimeMillis: Math.max(0, Number(result?.expireTimeMillis || 0))
        };
    } catch (error) {
        bridgeState.appCheckReady = false;
        bridgeState.appCheckError = limitText(error?.message || error, 300);
        exposeBridge();
        return { configured: true, ready: false, error: bridgeState.appCheckError };
    }
}

async function signInGuest() {
    if (!bridgeState.auth) throw new Error('Firebase Auth가 초기화되지 않았습니다.');
    if (bridgeState.auth.currentUser) return bridgeState.auth.currentUser;
    const credential = await signInAnonymously(bridgeState.auth);
    bridgeState.user = credential.user;
    bridgeState.authReady = true;
    return credential.user;
}

async function logVisit(payload = {}) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const user = await signInGuest();
    const visit = normalizeVisitPayload(payload);
    await addDoc(collection(bridgeState.db, 'siteVisits'), {
        ...visit,
        uid: user.uid,
        visitorId: user.uid,
        createdAt: serverTimestamp()
    });
    return true;
}


const INCIDENT_SEVERITIES = new Set(['warning', 'error', 'fatal']);
const INCIDENT_CATEGORIES = new Set([
    'runtime', 'resource', 'boot', 'mastering', 'quality-recovery', 'export',
    'update-safety', 'release-mismatch', 'firebase', 'manual-test', 'unknown'
]);

function safeIncidentNumber(value, min, max) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min;
}

function normalizeIncidentPayload(payload = {}) {
    const severity = INCIDENT_SEVERITIES.has(payload.severity) ? payload.severity : 'error';
    const category = INCIDENT_CATEGORIES.has(payload.category) ? payload.category : 'unknown';
    return {
        schemaVersion: 1,
        clientAt: limitText(payload.clientAt || new Date().toISOString(), 40),
        appVersion: limitText(payload.appVersion || document.body?.dataset?.build || '', MAX_TEXT_LENGTHS.appVersion),
        assetVersion: limitText(payload.assetVersion || '', MAX_TEXT_LENGTHS.assetVersion),
        severity,
        category,
        reason: limitText(payload.reason || category, MAX_TEXT_LENGTHS.reason),
        message: limitText(payload.message || 'Unknown incident', MAX_TEXT_LENGTHS.message),
        code: limitText(payload.code || '', MAX_TEXT_LENGTHS.code),
        stack: limitText(payload.stack || '', MAX_TEXT_LENGTHS.stack),
        fingerprint: limitText(payload.fingerprint || 'unknown', MAX_TEXT_LENGTHS.fingerprint),
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
    const bucket = Math.floor(Date.now() / (15 * 60 * 1000)).toString(36);
    const fingerprint = String(payload.fingerprint || 'unknown').replace(/[^a-z0-9_-]/gi, '').slice(0, 64) || 'unknown';
    return `${uid}_${bucket}_${fingerprint}`.slice(0, 180);
}

async function logIncident(payload = {}) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    if (bridgeState.remoteConfigValues.foxbear_incident_reporting_enabled === false && payload.category !== 'manual-test') {
        throw new Error('자동 문제 신고가 원격 설정에서 비활성화되어 있습니다.');
    }
    const user = await signInGuest();
    const incident = normalizeIncidentPayload(payload);
    const reportId = incidentDocumentId(user.uid, incident);
    const reportRef = doc(bridgeState.db, 'incidentReports', reportId);
    const existing = await getDoc(reportRef);
    if (existing.exists()) return { queued: true, deduplicated: true, reportId };
    try {
        await setDoc(reportRef, {
            ...incident,
            uid: user.uid,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        const duplicate = await getDoc(reportRef).catch(() => null);
        if (!duplicate?.exists?.()) throw error;
        return { queued: true, deduplicated: true, reportId };
    }
    return { queued: true, deduplicated: false, reportId };
}

async function getIncidentDelivery(reportId) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const user = await signInGuest();
    const safeId = limitText(reportId, 180);
    if (!safeId.startsWith(`${user.uid}_`)) throw new Error('본인의 문제 보고서만 조회할 수 있습니다.');
    const snapshot = await getDoc(doc(bridgeState.db, 'incidentReports', safeId));
    if (!snapshot.exists()) return { exists: false, status: 'missing' };
    const data = snapshot.data() || {};
    return {
        exists: true,
        status: limitText(data.delivery?.status || 'pending', 40),
        reason: limitText(data.delivery?.reason || '', 100),
        message: limitText(data.delivery?.message || '', 300)
    };
}

async function getAdminProfile() {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const user = await signInGuest();
    const adminRef = doc(bridgeState.db, 'siteAdmins', user.uid);
    const snapshot = await getDoc(adminRef);
    const data = snapshot.exists() ? (snapshot.data() || {}) : {};
    const active = snapshot.exists() && data.active === true;
    return {
        uid: user.uid,
        exists: snapshot.exists(),
        active,
        role: active ? limitText(data.role || 'admin', 40) : ''
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


function normalizeFirestoreIncident(snapshot) {
    const item = snapshot.data() || {};
    const createdAt = item.createdAt && typeof item.createdAt.toDate === 'function'
        ? item.createdAt.toDate().toISOString()
        : item.clientAt || '';
    const delivery = item.delivery || {};
    const nextRetryAt = delivery.nextRetryAt && typeof delivery.nextRetryAt.toDate === 'function'
        ? delivery.nextRetryAt.toDate().toISOString()
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
        attemptCount: safeIncidentNumber(delivery.attemptCount, 0, 20),
        terminal: delivery.terminal === true,
        nextRetryAt: limitText(nextRetryAt, 40)
    };
}

async function getAdminIncidents(options = {}) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error(`현재 Firebase UID(${profile.uid || '확인 중'})는 활성 관리자 문서가 아닙니다.`);
    const eventsLimit = Math.min(Math.max(Number(options.limit || 100), 1), 150);
    const reportsRef = collection(bridgeState.db, 'incidentReports');
    const recentQuery = query(reportsRef, orderBy('createdAt', 'desc'), limit(eventsLimit));
    const snapshot = await getDocs(recentQuery);
    const incidents = [];
    snapshot.forEach(item => incidents.push(normalizeFirestoreIncident(item)));
    const todayKey = getDateKey();
    const summary = incidents.reduce((result, item) => {
        result.total += 1;
        if (item.at.slice(0, 10) === todayKey) result.today += 1;
        if (item.deliveryStatus === 'failed') result.failed += 1;
        if (['pending', 'sending', 'retrying', 'reserved'].includes(item.deliveryStatus)) result.pending += 1;
        if (item.deliveryStatus === 'emailed') result.emailed += 1;
        if (item.severity === 'fatal') result.fatal += 1;
        return result;
    }, { total: 0, today: 0, failed: 0, pending: 0, emailed: 0, fatal: 0 });
    return {
        uid: profile.uid,
        incidents,
        summary,
        appCheck: {
            configured: bridgeState.appCheckConfigured,
            ready: bridgeState.appCheckReady,
            error: bridgeState.appCheckError
        }
    };
}

async function requestIncidentRetry(reportId) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    const profile = await getAdminProfile();
    if (!profile.active) throw new Error('활성 관리자만 메일 재전송을 요청할 수 있습니다.');
    const safeReportId = limitText(reportId, 180);
    if (!safeReportId) throw new Error('재전송할 보고서 ID가 없습니다.');
    const requestRef = await addDoc(collection(bridgeState.db, 'incidentRetryRequests'), {
        uid: profile.uid,
        reportId: safeReportId,
        source: 'foxbear-admin-dashboard',
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
        reason: limitText(data.reason || '', 100)
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
        await initializeFoxBearAppCheck();
        bridgeState.auth = getAuth(bridgeState.app);
        bridgeState.db = getFirestore(bridgeState.app);
        exposeBridge();
        onAuthStateChanged(bridgeState.auth, user => {
            bridgeState.user = user;
            bridgeState.authReady = true;
            exposeBridge();
            dispatchFirebaseEvent('foxbear:firebase-auth', { user });
        });
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
