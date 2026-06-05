import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import {
    addDoc,
    collection,
    getCountFromServer,
    getDocs,
    getFirestore,
    limit,
    orderBy,
    query,
    serverTimestamp,
    where
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import {
    fetchAndActivate,
    getRemoteConfig,
    getValue,
    isSupported as isRemoteConfigSupported
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-remote-config.js';

const FIREBASE_SDK_VERSION = '12.14.0';
const FIREBASE_CONFIG = Object.freeze({
    apiKey: 'AIzaSyBvYuYlN6etTd3B6C_ZGvsaAktbWJU8yOs',
    authDomain: 'foxbear-music.firebaseapp.com',
    projectId: 'foxbear-music',
    storageBucket: 'foxbear-music.firebasestorage.app',
    messagingSenderId: '52981410353',
    appId: '1:52981410353:web:c9c700a8e55672a999c310'
});

const MAX_TEXT_LENGTHS = Object.freeze({
    referrer: 160,
    page: 180,
    path: 160,
    language: 24,
    userAgent: 220,
    screen: 32,
    appVersion: 24
});

const REMOTE_CONFIG_DEFAULTS = Object.freeze({
    foxbear_notice: '',
    foxbear_stats_enabled: true,
    foxbear_storage_enabled: false,
    foxbear_youtube_url: 'https://www.youtube.com/@FoxBearMusic'
});

const bridgeState = {
    app: null,
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
        remoteConfig: { ...bridgeState.remoteConfigValues },
        signInGuest,
        logVisit,
        getAdminStats,
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

async function getAdminStats(options = {}) {
    if (!bridgeState.db) throw new Error('Firestore가 초기화되지 않았습니다.');
    await signInGuest();
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
        bridgeState.app = initializeApp(FIREBASE_CONFIG);
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
bootFirebase();
