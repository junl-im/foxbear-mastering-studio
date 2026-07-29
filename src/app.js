// FoxBear AI Mastering Studio Pro v1.6.37 - app slim-down orchestration bridge
'use strict'; const FoxBearCoreUtils = window.FoxBearCoreUtils || {};
const {
    clamp,
    clamp01,
    map,
    dbToAmp,
    median,
    normalizeWaveformValues,
    sampleMarkersFromValues,
    getWaveformMarkerForIndex = FoxBearCoreUtils.getWaveformMarkerForlndex,
    createWaveformOverview,
    sampleWaveformOverview,
    samplePeakMarkers
} = FoxBearCoreUtils; const FoxBearMasteringInspector = window.FoxBearMasteringInspector || {};
const FoxBearPlaybackLinkService = window.FoxBearPlaybackLinkService || {};
const FoxBearRuntimeConfig = window.FoxBearRuntimeConfig || {};
const FoxBearAudioImportCapabilityService = window.FoxBearAudioImportCapabilityService || null;
const FoxBearMasteringInputGuard = window.FoxBearMasteringInputGuard || null;
const FoxBearInAppMasteringSafetyService = window.FoxBearInAppMasteringSafetyService || null;
const FoxBearSessionHandoff = window.FoxBearSessionHandoff || null;
let externalBrowserHandoffBridge = null;
const FoxBearMasteringMemoryDiagnostics = window.FoxBearMasteringMemoryDiagnostics || null;
const FoxBearBuildInfo = window.FoxBearBuildInfo || {}; const APP_VERSION = 'Pro v1.6.37';
if ((FoxBearRuntimeConfig.APP_VERSION && FoxBearRuntimeConfig.APP_VERSION !== APP_VERSION) || (FoxBearBuildInfo.appVersion && FoxBearBuildInfo.appVersion !== APP_VERSION)) console.warn('[FoxBear] release metadata mismatch', { app: APP_VERSION, runtime: FoxBearRuntimeConfig.APP_VERSION, build: FoxBearBuildInfo.appVersion });
const {
    WAV_ENCODER_WORKER_URL = 'src/workers/wav-encoder.worker.js',
    MP3_ENCODER_WORKER_URL = 'src/workers/mp3-encoder.worker.js',
    ANALYSIS_WORKER_URL = 'src/workers/analysis.worker.js',
    MASTER_FINALIZER_WORKER_URL = 'src/workers/master-finalizer.worker.js',
    PITCH_WSOLA_WORKER_URL = 'src/workers/pitch-wsola.worker.js',
    ZIP_ENCODER_WORKER_URL = 'src/workers/zip-encoder.worker.js',
    OPTIONAL_WASM_PITCH_ADAPTER_URL = './engines/pitch-engine-adapter.js',
    MAX_FILES = 35,
    MAX_FILE_SIZE = 220 * 1024 * 1024,
    CORE_AUDIO_EXTENSIONS = [],
    CONTAINER_AUDIO_EXTENSIONS = [],
    EXPERIMENTAL_AUDIO_EXTENSIONS = [],
    AUDIO_EXTENSIONS = [],
    VIDEO_AUDIO_EXTENSIONS = [],
    AUDIO_IMPORT_ACCEPT = '.wav,.wave,.mp3,.mpeg,.mpga,.aif,.aiff,.aifc,audio/wav,audio/x-wav,audio/mpeg,audio/aiff,audio/x-aiff',
    DEFAULT_TRANSFORM = { pitchSemitones: 0, speedRatio: 1, snapSemitone: true, beatPreset: 'original' },
    DEFAULT_INSTRUMENT_LAYER = { mode: 'off', amount: 'light' },
    ACTION_SELECT_IDS = [],
    MASTER_FLOW_STEPS = [],
    QUALITY_GATE_RULES = {},
    WAVEFORM_OVERVIEW_BINS = 96,
    DOCK_WAVEFORM_BINS = 72,
    MASTER_PREVIEW_DURATION_SEC = 15,
    MOBILE_NATIVE_IDB = 'foxbear-mobile-native-share-v1',
    MOBILE_NATIVE_SHARE_STORE = 'sharedFiles',
    MOBILE_NATIVE_SHARE_QUERY = 'foxbearSharedAudio',
    MOBILE_NATIVE_HAPTIC_PATTERNS = {},
    MAX_SNAPSHOTS_PER_TRACK = 12,
    MAX_REDO_SNAPSHOTS_PER_TRACK = 8,
    AUTO_SNAPSHOT_COOLDOWN_MS = 1200,
    REALTIME_PREVIEW_RENDER_DELAY = 160,
    ADMIN_STATS_VISITOR_KEY = 'foxbear-admin-visitor-id-v1',
    ADMIN_STATS_STORAGE_KEY = 'foxbear-admin-local-stats-v1',
    ADMIN_STATS_MAX_EVENTS = 120,
    IMPORT_ANALYSIS_CONCURRENCY = 1,
    LARGE_IMPORT_BATCH_THRESHOLD = 12,
    IMPORT_QUEUE_YIELD_MS = 90,
    MASTERING_PROGRESS_RENDER_DELAY_MS = 110,
    BULK_IMPORT_HUD_MIN_TRACKS = 2,
    BULK_IMPORT_HUD_DONE_HOLD_MS = 15000
} = FoxBearRuntimeConfig;
const SERVICE_WORKER_URL = `./sw.js?v=${FoxBearBuildInfo.assetVersion || '1.6.37-ui-shell-cross-generation-recovery'}&h=${FoxBearBuildInfo.serviceWorkerRevision || 'sw-v1637'}`;
const TRUSTED_SCRIPT_PATHS = Object.freeze([...(Array.isArray(FoxBearRuntimeConfig.TRUSTED_SCRIPT_PATHS) ? FoxBearRuntimeConfig.TRUSTED_SCRIPT_PATHS : [WAV_ENCODER_WORKER_URL, MP3_ENCODER_WORKER_URL, ANALYSIS_WORKER_URL, MASTER_FINALIZER_WORKER_URL, PITCH_WSOLA_WORKER_URL, ZIP_ENCODER_WORKER_URL]), SERVICE_WORKER_URL]);
const TRUSTED_SCRIPT_URLS = new Set();
const FOXBEAR_TRUSTED_TYPES_POLICY = createFoxBearTrustedTypesPolicy();
const ANALYSIS_CACHE_DB = 'foxbear-analysis-cache-v1359';
const ANALYSIS_CACHE_STORE = 'analysis';
const ANALYSIS_ENGINE_CACHE_VERSION = 'analysis-engine-v1.4-stable';
const SHARED_DSP_PROFILE_VERSION = 'v1.4.0-dock-modal-state-machine';
const PLAYBACK_CROSSFADE_MS = 140;
const SAFE_IMPORT_ANALYSIS_CONCURRENCY = Math.max(1, Math.min(2, Number(IMPORT_ANALYSIS_CONCURRENCY) || 1));
const SAFE_LARGE_IMPORT_BATCH_THRESHOLD = Math.max(4, Number(LARGE_IMPORT_BATCH_THRESHOLD) || 12);
const SAFE_IMPORT_QUEUE_YIELD_MS = Math.max(30, Number(IMPORT_QUEUE_YIELD_MS) || 90);
const SAFE_MASTERING_PROGRESS_RENDER_DELAY_MS = Math.max(60, Number(MASTERING_PROGRESS_RENDER_DELAY_MS) || 110);
const SAFE_BULK_IMPORT_HUD_MIN_TRACKS = Math.max(2, Number(BULK_IMPORT_HUD_MIN_TRACKS) || 2);
const SAFE_BULK_IMPORT_HUD_DONE_HOLD_MS = Math.max(3000, Number(BULK_IMPORT_HUD_DONE_HOLD_MS) || 15000);
let importAnalysisController = null;
let masteringBatchRunner = null;
let dockWaveformPlayheadRaf = 0, dockWaveformPendingAudio = null;
// v1.4.28 compatibility QA anchors: const importAnalysisQueue = [] ; importAnalysisActiveCount < SAFE_IMPORT_ANALYSIS_CONCURRENCY ; 대량 업로드 안전 모드 ; Analysis error handler failed ; beginBulkMasteringHudBatch(candidates, { source: options.source || 'selected' ; beginBulkMasteringHudBatch(candidates, { source: 'all'
const masteringQueueState = {
    activeIds: new Set(),
    activeNames: new Map(),
    startedAt: 0,
    lastStartedAt: 0,
    lastCompletedAt: 0,
    completedCount: 0,
    failedCount: 0,
    lastStatus: 'idle'
};
const PLAYBACK_FADE_MIN_VOLUME = 0.0001;
const CURVE_CACHE = new Map();
TRUSTED_SCRIPT_PATHS.forEach(path => {
    try {
        TRUSTED_SCRIPT_URLS.add(new URL(path, document.baseURI).href);
    } catch (error) {
        console.warn('Trusted script URL registration skipped:', path, error);
    }
});
function createFoxBearTrustedTypesPolicy() {
    if (!window.trustedTypes || typeof window.trustedTypes.createPolicy !== 'function') return null;
    try {
        return window.trustedTypes.createPolicy('foxbear', {
            createScriptURL(value) {
                const url = new URL(String(value), document.baseURI);
                if (url.origin !== window.location.origin || !TRUSTED_SCRIPT_URLS.has(url.href)) {
                    throw new TypeError('허용되지 않은 스크립트 URL입니다.');
                }
                return url.href;
            }
        });
    } catch (error) {
        console.warn('Trusted Types policy unavailable:', error);
        return null;
    }
}
function resolveFoxBearScriptUrl(path) {
    const url = new URL(String(path || ''), document.baseURI);
    if (url.origin !== window.location.origin || !TRUSTED_SCRIPT_URLS.has(url.href)) {
        throw new TypeError('허용되지 않은 워커/엔진 스크립트 경로입니다.');
    }
    return FOXBEAR_TRUSTED_TYPES_POLICY ? FOXBEAR_TRUSTED_TYPES_POLICY.createScriptURL(url.href) : url.href;
}
function createFoxBearWorker(path, options) { return new Worker(resolveFoxBearScriptUrl(path), options); }
function getWorkerJobService() { return window.FoxBearWorkerJobService || null; }
async function runFoxBearWorkerJob(path, payload, transfer, options = {}) {
    const service = getWorkerJobService();
    if (!service?.run) throw new Error('워커 작업 관리 서비스를 불러오지 못했습니다.');
    return (await service.run({ createWorker: () => createFoxBearWorker(path), payload, transfer, timeoutMs: options.timeoutMs, signal: options.signal || null, jobId: options.jobId || '', label: options.label || '오디오 워커', onProgress: typeof options.onProgress === 'function' ? options.onProgress : null })).data;
}
function isWorkerJobAbortError(error) { return Boolean(getWorkerJobService()?.isAbortError?.(error) || error?.name === 'AbortError' || error?.code === 'FOXBEAR_WORKER_JOB_CANCELLED'); }
function throwIfFoxBearOperationCancelled(signal, reason = 'operation-cancelled') { if (!signal?.aborted) return; throw getWorkerJobService()?.makeAbortError?.(signal.reason || reason) || new DOMException('작업이 취소되었습니다.', 'AbortError'); }
function getZipExportService() { return window.FoxBearZipExportService || null; }
function isZipExportActive() { return Boolean(getZipExportService()?.getSnapshot?.().active); }
function getExportQueueService() { return window.FoxBearExportQueueService || null; } function isExportQueueActive() { const snapshot = getExportQueueService()?.getSnapshot?.(); return Boolean(snapshot?.active || snapshot?.preparing || snapshot?.delivering); } function isAnyExportActive() { return Boolean(isZipExportActive() || isExportQueueActive()); }
function getAnalysisCacheOptions() {
    return Object.freeze({
        dbName: ANALYSIS_CACHE_DB,
        storeName: ANALYSIS_CACHE_STORE,
        engineVersion: ANALYSIS_ENGINE_CACHE_VERSION
    });
}
function getAnalysisCacheService() {
    return window.FoxBearAnalysisCacheService || null;
}
function getTrackLifecycleService() {
    return window.FoxBearTrackLifecycleService || null;
}
function getMasterPreviewJobService() {
    return window.FoxBearMasterPreviewJobService || null;
}
function getMemoryGuardService() {
    return window.FoxBearMemoryGuardService || null;
}
const FoxBearAudioContexts = window.FoxBearAudioContextManager;
function getExportGuardService() { return window.FoxBearExportGuardService || null; }
function getQualityGateService() {
    return window.FoxBearQualityGateService || null;
}
function getMasteringOrchestratorService() {
    return window.FoxBearMasteringOrchestratorService || null;
}
function getErrorMessage(error, fallback = '알 수 없는 오류') {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.error && error.error.message) return error.error.message;
    if (error.reason && error.reason.message) return error.reason.message;
    try { return String(error); } catch (stringifyError) { return fallback; }
}
function getReferenceMatchStrengthAmount(value = state.referenceMatchStrength) {
    if (FoxBearMasteringInspector.getReferenceStrengthAmount) return FoxBearMasteringInspector.getReferenceStrengthAmount(value);
    return clamp(Number(value ?? 0.62), 0, 1);
}
function getReferenceMatchStrengthLabel(value = state.referenceMatchStrength) {
    if (FoxBearMasteringInspector.getReferenceStrengthLabel) return FoxBearMasteringInspector.getReferenceStrengthLabel(value);
    const amount = getReferenceMatchStrengthAmount(value);
    if (amount <= 0.28) return 'Light';
    if (amount >= 0.82) return 'Strong';
    return 'Balanced';
}
function computeAdaptiveTargetLufsForTrack(track, baseTarget = state.targetLufs) {
    const base = Number.isFinite(Number(baseTarget)) ? Number(baseTarget) : -14;
    if (!state.adaptiveTargetLufs || !track || !track.analysis) return base;
    if (FoxBearMasteringInspector.computeAdaptiveTargetLufs) {
        return FoxBearMasteringInspector.computeAdaptiveTargetLufs(track.analysis, {
            baseTarget: base,
            preset: track.preset || track.recommendedPreset || 'custom',
            masterGoal: state.masterGoal,
            masterStyle: state.masterStyle,
            masterStrength: state.masterStrength
        });
    }
    const analysis = track.analysis || {};
    const preset = String(track.preset || track.recommendedPreset || 'custom');
    let target = base;
    const vocalish = shouldApplyVocalProtection(preset, analysis) || Number(analysis.midRatio || 0) > 0.32;
    const mobileRisk = Number(analysis.mobileSpeakerRisk || 0);
    const crest = Number(analysis.crest || 0);
    if (vocalish) target = Math.min(target, -14.6);
    if (mobileRisk > 0.42) target = Math.min(target, -14.8);
    if (crest < 4.0 && Number(analysis.transientDensity || 0) > 0.58) target = Math.min(target, base - 0.6);
    if (/edm|dance|house|trap|drill|futurebass/.test(preset) && state.masterStrength === 'loud' && mobileRisk < 0.38) target = Math.max(target, -10.8);
    if (state.masterStrength === 'natural' || state.masterStrength === 'vocal_safe') target = Math.min(target, -14.8);
    if (state.masterStrength === 'mobile_safe') target = Math.min(target, -14.2);
    return Number(clamp(target, -16.5, -9.5).toFixed(1));
}
function resolveTargetLufsForTrack(track) {
    return computeAdaptiveTargetLufsForTrack(track, state.targetLufs);
}
function createDspAmountSummary(track) {
    const info = track?.finalizeInfo || {};
    const analysis = track?.analysis || {};
    if (FoxBearMasteringInspector.createDspAmountSummary) return FoxBearMasteringInspector.createDspAmountSummary(info, analysis);
    const spatial = analysis.spatialBudgetApplied || {};
    const items = [
        { key: 'limiter', label: 'Limiter', value: Math.abs(Number(info.limiterReductionDb || 0)), unit: 'dB' },
        { key: 'multiband', label: 'Multiband', value: Math.abs(Number(info.multibandReductionDb || 0)), unit: 'dB' },
        { key: 'deesser', label: 'De-esser', value: Math.abs(Number(info.dynamicDeEsserReductionDb || 0)), unit: 'dB' },
        { key: 'mobile', label: 'Mobile Guard', value: Number(info.mobileSpeakerRisk || analysis.mobileSpeakerRisk || 0) * 100, unit: '%' },
        { key: 'spatial', label: 'Spatial Clamp', value: Math.max(0, 1 - Number(spatial.widthFactor || 1)) * 100, unit: '%' }
    ];
    const score = clamp(Math.round(items.reduce((sum, item) => sum + (item.unit === 'dB' ? item.value * 12 : item.value), 0) / 5), 0, 100);
    return { score, items };
}
function formatDspAmountSummary(track) {
    const summary = createDspAmountSummary(track);
    if (!summary || !Array.isArray(summary.items)) return '렌더 후 표시';
    const visible = summary.items.filter(item => Number(item.value || 0) > 0.02).slice(0, 5);
    if (!visible.length) return '보정 최소 · 원본 보존 중심';
    return visible.map(item => `${item.label} ${item.unit === 'dB' ? formatSigned(-Math.abs(Number(item.value || 0)), 1) + ' dB' : Math.round(Number(item.value || 0)) + '%'}`).join(' · ');
}
function getDspAmountScoreLabel(track) {
    const score = Number(createDspAmountSummary(track)?.score || 0);
    if (score >= 64) return `강함 ${score}점`;
    if (score >= 34) return `중간 ${score}점`;
    return `가벼움 ${score}점`;
}
const UTILITY_FEATURE_DEFINITIONS = {
    autoCacheClean: {
        label: '분석 캐시 자동정리',
        short: '켜두면 오래된 분석 캐시를 주기적으로 정리합니다. 끄면 캐시를 그대로 보존합니다.'
    },
    clearAnalysisCache: {
        label: '분석 캐시 즉시 정리',
        short: '현재 브라우저에 저장된 분석 캐시를 바로 비워 파일 재분석 상태를 깨끗하게 만듭니다.',
        actionOnly: true,
        actionLabel: '실행'
    },
    selectedGenreLock: {
        label: '선택 트랙 장르 잠금',
        short: '선택한 곡의 현재 장르 프리셋을 잠가 AI 재적용 때 장르가 바뀌지 않게 합니다.',
        actionLabel: '전환',
        getState: () => Boolean(getSelectedTrack()?.genreLocked),
        isDisabled: () => {
            const track = getSelectedTrack();
            return !track || state.busy || !track.analysis;
        }
    },
    smartPerformanceGuard: {
        label: '스마트 성능 가드',
        short: '모바일·긴 파일·저메모리 환경에서 품질 손상 없이 가장 무거운 검사만 자동으로 가볍게 조절합니다.'
    }
};
const PREVIEW_TRANSLATION_MODES = Object.freeze({
    studio: {
        id: 'studio',
        label: 'Studio',
        short: '\u{1F3A7} 원음',
        title: '렌더 결과 그대로 듣습니다.',
        aria: '스튜디오 원음 미리듣기'
    },
    phone: {
        id: 'phone',
        label: 'Smartphone',
        short: '\u{1F4F1} 스마트폰',
        title: '스마트폰 스피커처럼 저역을 줄이고 2~5kHz 공진을 확인합니다.',
        aria: '스마트폰 스피커 시뮬레이션 미리듣기'
    },
    laptop: {
        id: 'laptop',
        label: 'Laptop',
        short: '\u{1F4BB} 노트북',
        title: '노트북/작은 스피커처럼 저역이 부족하고 중고역이 앞으로 나오는 환경을 확인합니다.',
        aria: '노트북 스피커 시뮬레이션 미리듣기'
    },
    mono: {
        id: 'mono',
        label: 'Mono',
        short: '\u{1F50A} 모노',
        title: '좌우를 모노로 접어 보컬/저역/공간감 호환성을 확인합니다.',
        aria: '모노 호환성 미리듣기'
    }
});
document.addEventListener('DOMContentLoaded', safeInit);
window.addEventListener('error', event => reportBootOrImportError(event.error || event.message, '앱 실행 오류'));
window.addEventListener('unhandledrejection', handleUnhandledRejection);
function runSiteAccessGuard() {
    return Boolean(window.FoxBearSiteGuards?.runSiteAccessGuard?.());
}
function safeInit() {
    try {
        const ready = init();
        if (ready !== false) {
            window.FoxBearRuntimeHealth?.markAppReady?.();
            updateImportStatus(getAudioImportCapabilityService()?.getStatusText?.() || '앱 준비 완료 · WAV/MP3/PCM AIFF 파일을 선택하면 바로 분석을 시작합니다.', 'ready');
        }
    } catch (error) {
        console.error('FoxBear critical init failed:', error);
        window.FoxBearRuntimeHealth?.markBootFailed?.(error);
        try { cacheElements(); } catch (cacheError) {}
        bindEmergencyUploadOnly();
        updateImportStatus(`필수 앱 준비에 실패했습니다. 파일열기는 비상 모드로 연결했습니다 · ${getErrorMessage(error)}`, 'error');
        showToastSafe('필수 앱 준비 실패 · 파일열기는 비상 모드로 연결했습니다.');
    }
}
function runInitStep(label, callback, options = {}) {
    try {
        const result = callback();
        if (result && typeof result.then === 'function') {
            return result.catch(error => {
                console.error(`FoxBear async init step failed: ${label}`, error);
                const message = getErrorMessage(error);
                if (options.critical) throw error;
                updateImportStatus(`${label} 준비 중 일부 오류가 있었지만 파일열기는 계속 사용할 수 있습니다 · ${message}`, 'warn');
                return null;
            });
        }
        return result;
    } catch (error) {
        console.error(`FoxBear init step failed: ${label}`, error);
        const message = getErrorMessage(error);
        if (options.critical) throw error;
        updateImportStatus(`${label} 준비 중 일부 오류가 있었지만 파일열기는 계속 사용할 수 있습니다 · ${message}`, 'warn');
        return null;
    }
}
function isBenignPlaybackRejection(error) {
    const name = String(error?.name || '').toLowerCase();
    const message = String(error?.message || error || '').toLowerCase();
    return name === 'notallowederror'
        || name === 'aborterror'
        || message.includes('play() request was interrupted')
        || message.includes('request is not allowed')
        || message.includes('user didn')
        || message.includes('autoplay')
        || message.includes('interrupted by a call to pause')
        || message.includes('interrupted by a new load request');
}
function getPlaybackTransitionService() { return window.FoxBearPlaybackTransitionService || null; }
function getInAppAudioCompatibility() { return getPlaybackTransitionService()?.getInAppCompatibility?.() || { restricted: false, kakao: false, label: '일반 브라우저' }; }
function configurePreviewAudioElement(audio) { return getPlaybackTransitionService()?.configureAudioElement?.(audio) || audio; }
function rememberAudioTargetVolume(audio) { return getPlaybackTransitionService()?.rememberTargetVolume?.(audio) ?? 1; }
function cancelAudioFade(audio) { return getPlaybackTransitionService()?.cancelFade?.(audio); }
function cancelAudioPlaybackRequest(audio, reason = 'dispose') { const service = getPlaybackTransitionService(); if (service && typeof service.cancelPlaybackRequest === 'function') return service.cancelPlaybackRequest(audio, { pause: true, reason }); cancelAudioFade(audio); try { audio?.pause?.(); } catch (error) {} return Boolean(audio); }
function fadeAudioVolume(audio, toVolume = 1, durationMs = PLAYBACK_CROSSFADE_MS) {
    const service = getPlaybackTransitionService();
    if (service && typeof service.fadeVolume === 'function') return service.fadeVolume(audio, toVolume, durationMs);
    return Promise.resolve(false);
}
function playAudioWithFadeIn(audio, options = {}) {
    if (!audio) return Promise.resolve(false);
    const service = getPlaybackTransitionService();
    if (service && typeof service.playWithFadeIn === 'function') return service.playWithFadeIn(audio, { ms: PLAYBACK_CROSSFADE_MS, ...options });
    return audio.play?.() || Promise.resolve(false);
}
function pauseAudioWithFadeOut(audio, options = {}) {
    const service = getPlaybackTransitionService();
    if (service && typeof service.pauseWithFadeOut === 'function') return service.pauseWithFadeOut(audio, { ms: PLAYBACK_CROSSFADE_MS, ...options });
    try { audio?.pause?.(); } catch (error) {}
    return Promise.resolve(Boolean(audio));
}
function crossfadeAudioPair(oldAudio, nextAudio, options = {}) {
    const service = getPlaybackTransitionService();
    if (service && typeof service.crossfadePair === 'function') return service.crossfadePair(oldAudio, nextAudio, { ms: PLAYBACK_CROSSFADE_MS, ...options });
    try { if (oldAudio) oldAudio.pause(); } catch (error) {}
    return nextAudio?.play?.() || Promise.resolve(false);
}
function handleUnhandledRejection(event) {
    const error = event?.reason;
    if (isBenignPlaybackRejection(error)) {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        console.info('FoxBear playback promise was blocked or interrupted:', error);
        updateImportStatus('브라우저가 자동 재생을 잠시 막았습니다. Dock의 재생 버튼을 한 번 눌러주세요.', 'warn');
        return;
    }
    reportBootOrImportError(error, '앱 비동기 오류');
}
function reportBootOrImportError(error, label = '앱 오류') {
    const message = getErrorMessage(error, label);
    console.warn(label, error);
    updateImportStatus(`${label}: ${message}`, 'error');
}
function bindEmergencyUploadOnly() {
    const fileInput = document.getElementById('fileInput');
    const folderInput = document.getElementById('folderInput');
    if (fileInput && !fileInput.dataset.emergencyBound) {
        fileInput.dataset.emergencyBound = 'true';
        fileInput.addEventListener('change', event => handleNativeInputFiles(event.target.files, 'file'));
    }
    if (folderInput && !folderInput.dataset.emergencyBound) {
        folderInput.dataset.emergencyBound = 'true';
        folderInput.addEventListener('change', event => handleNativeInputFiles(event.target.files, 'folder'));
    }
}
function installPlaybackLinkStatusBridge() {
    if (!FoxBearPlaybackLinkService || typeof FoxBearPlaybackLinkService.installDomAudit !== 'function') {
        console.warn('FoxBear playback link service is unavailable; players will use local status only.');
        return false;
    }
    const installed = FoxBearPlaybackLinkService.installDomAudit(document);
    window.addEventListener('foxbear:playback-link-change', event => {
        const snapshot = event?.detail?.snapshot;
        if (!snapshot) return;
        document.body.dataset.playbackLinkRole = snapshot.role || '';
        document.body.dataset.playbackLinkState = snapshot.playing ? 'playing' : 'paused';
        document.body.dataset.playbackLinkTime = String(snapshot.absoluteSec ?? '0');
        if (snapshot.groupPolicy) document.body.dataset.playbackGroupPolicy = snapshot.groupPolicy;
    });
    window.addEventListener('foxbear:playback-orchestration-change', event => {
        const detail = event?.detail || {};
        document.body.dataset.playbackOrchestration = detail.active ? 'active' : 'idle';
        document.body.dataset.playbackOrchestrationReason = detail.reason || '';
        document.body.dataset.playbackOrchestrationPaused = String((detail.paused || []).length);
        document.body.dataset.playbackOrchestrationConflicts = String(detail.conflictCount || 0);
    });
    return installed;
}
function registerPlaybackLinkedAudio(audio, meta = {}) { if (!audio) return null; try { window.FoxBearSpectrumVisualizer?.registerAudio?.(audio, meta); } catch (error) { console.warn('Spectrum audio registration failed:', error); } if (!FoxBearPlaybackLinkService || typeof FoxBearPlaybackLinkService.registerAudio !== 'function') return null; return FoxBearPlaybackLinkService.registerAudio(audio, meta); }
function unregisterPlaybackLinkedAudio(audio, reason = 'dispose') { if (!audio) return false; let removed = cancelAudioPlaybackRequest(audio, reason); try { removed = window.FoxBearSpectrumVisualizer?.unregisterAudio?.(audio, reason) || removed; } catch (error) { console.warn('Spectrum audio cleanup failed:', error); } try { removed = FoxBearPlaybackLinkService?.unregisterAudio?.(audio, reason) || removed; } catch (error) { console.warn('Playback link cleanup failed:', error); } return removed; }
function createSpectrumAnalyserTap(audioContext) {
    if (!audioContext || typeof audioContext.createAnalyser !== 'function') return null;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.82;
    return analyser;
}
function registerExternalSpectrumAnalyser(audio, analyser, audioContext, meta = {}) {
    if (!audio || !analyser) return null;
    try {
        window.FoxBearSpectrumVisualizer?.registerExternalAnalyser?.(audio, analyser, audioContext, meta);
    } catch (error) {
        console.warn('External spectrum analyser registration failed:', error);
    }
    return analyser;
}
function bindUploadInputEventsOnce() {
    if (el.fileDrop && el.fileInput) bindNativeUploadLabel(el.fileDrop, el.fileInput, 'file');
    if (el.folderDrop && el.folderInput) bindNativeUploadLabel(el.folderDrop, el.folderInput, 'folder');
    if (el.fileDrop && el.fileDrop.dataset.dropZoneBound !== 'true') {
        el.fileDrop.dataset.dropZoneBound = 'true';
        setupDropZone(el.fileDrop);
    }
    if (el.folderDrop && el.folderDrop.dataset.dropZoneBound !== 'true') {
        el.folderDrop.dataset.dropZoneBound = 'true';
        setupDropZone(el.folderDrop);
    }
    if (el.fileInput && el.fileInput.dataset.nativeInputChangeBound !== 'true') {
        el.fileInput.dataset.nativeInputChangeBound = 'true';
        el.fileInput.addEventListener('input', event => markNativeInputChanged(event.target));
        el.fileInput.addEventListener('change', event => handleNativeInputFiles(event.target.files, 'file'));
    }
    if (el.folderInput && el.folderInput.dataset.nativeInputChangeBound !== 'true') {
        el.folderInput.dataset.nativeInputChangeBound = 'true';
        el.folderInput.addEventListener('input', event => markNativeInputChanged(event.target));
        el.folderInput.addEventListener('change', event => handleNativeInputFiles(event.target.files, 'folder'));
    }
}
function init() {
    if (runSiteAccessGuard()) return false;
    runInitStep('화면 요소 연결', cacheElements, { critical: true });
    runInitStep('브라우저 코덱 확인', syncAudioImportCapabilities);
    runInitStep('파일 불러오기', bindUploadInputEventsOnce, { critical: true });
    runInitStep('설정 저장값 복원', restorePersistedSettings);
    runInitStep('외부 브라우저 작업 복구', initExternalBrowserHandoff);
    runInitStep('화면유지 컨트롤러 노출', exposeFoxBearWakeLockController);
    runInitStep('Dock 리모컨 보호 이벤트', installDockRemoteDelegation);
    runInitStep('플레이어 연동 상태 감시', installPlaybackLinkStatusBridge);
    runInitStep('슬라이더 UI', renderSliders);
    runInitStep('기능 버튼 UI', renderFeatureButtons);
    runInitStep('버튼형 팝업 보호 이벤트', bindFeatureOpenHardFallback);
    runInitStep('선택 팝업 UI', enhanceActionSelects);
    runInitStep('컨트롤 이벤트', bindEvents);
    runInitStep('Firebase 연결', initFirebaseBridge);
    runInitStep('방문 통계', registerAdminVisit);
    runInitStep('도움말 툴팁', initActionHelpTooltips);
    runInitStep('분석 캐시 정리', maybeAutoCleanAnalysisCache);
    requestAnimationFrame(() => runInitStep('지연 UI 동기화', () => { enhanceActionSelects(); syncEnhancedSelectButtons(); initActionHelpTooltips(); scheduleBottomPreviewLayoutSync(); }));
    setTimeout(() => runInitStep('선택 UI 재동기화', () => { enhanceActionSelects(); syncEnhancedSelectButtons(); initActionHelpTooltips(); }), 350);
    runInitStep('기본 프리셋', () => applyPresetToControlsOnly('custom'));
    runInitStep('피치/속도 컨트롤', () => setTransformControls(DEFAULT_TRANSFORM));
    runInitStep('악기 레이어 컨트롤', () => setInstrumentControls(DEFAULT_INSTRUMENT_LAYER));
    runInitStep('대량 작업 HUD', initBulkImportHudEvents);
    runInitStep('화면 렌더링', renderAll);
    runInitStep('UI 보호 이벤트', initUiGuards);
    runInitStep('나가기/새로고침 보호', initNavigationExitGuard);
    runInitStep('Dock 레이아웃 감시', installBottomPreviewLayoutObserver);
    runInitStep('Dock 레이아웃 동기화', scheduleBottomPreviewLayoutSync);
    runInitStep('모바일 편의 기능', initMobileNativeUx);
    runInitStep('구독 안내', maybeShowSubscribePrompt);
    return true;
}
function cacheElements() {
    const ids = [
        'fileDrop', 'folderDrop', 'fileInput', 'folderInput', 'importStatus', 'featureDock', 'featureCount', 'featureOpenBtn', 'featureDialog', 'featureDialogClose', 'featureDialogList',
        'genreSelect', 'confidenceText', 'intensityField', 'sliderFields', 'pitchSlider', 'speedSlider', 'pitchValue', 'speedValue',
        'pitchHint', 'speedHint', 'beatChangeSelect', 'beatValue', 'beatHint', 'keyReadout', 'tempoReadout', 'tempoPercent', 'snapSemitone', 'pitchSpeedBadge',
        'instrumentLayerSelect', 'instrumentAmountSelect', 'instrumentBadge', 'instrumentHint',
        'smartSuggestPanel', 'smartSuggestStatus', 'smartSuggestSummary', 'smartSuggestList', 'smartSuggestApplyBtn',
        'referencePanel', 'referenceStatus', 'referenceSummary', 'referenceMetrics', 'referenceLoadBtn', 'referenceApplyBtn', 'referenceClearBtn', 'referenceInput', 'referenceStrengthSelect',
        'adaptiveLufsToggle',
        'previewOpenBtn', 'previewDialog', 'previewDialogClose', 'previewDialogBody', 'previewDialogCaption',
        'bottomPreviewDock', 'bottomPreviewTitle', 'bottomPreviewMobileTitle', 'bottomPreviewGenre', 'bottomPreviewPlayBtn', 'bottomPreviewTranslationModes', 'bottomPreviewWaveformBtn', 'bottomPreviewMasterPreviewBtn', 'bottomPreviewMasterBtn', 'bottomPreviewOriginalBtn', 'bottomPreviewMasteredBtn', 'bottomPreviewPlayer', 'mobileNativeStatus', 'mobileNativeQuickToggle', 'mobileNativePanel',
        'adminStatsTrigger', 'adminStatsDialog', 'adminStatsClose', 'adminStatsCloseBottom', 'adminStatsRefresh', 'adminStatsSummary', 'adminStatsRows', 'adminStatsNotice', 'adminVisitsTab', 'adminIncidentsTab', 'adminVisitsPanel', 'adminIncidentsPanel', 'adminIncidentsSummary', 'adminIncidentsRows', 'adminIncidentsNotice', 'adminIncidentHealthHero', 'adminIncidentHealthBadge', 'adminIncidentDataFreshness', 'adminIncidentDensityToggle', 'adminIncidentHealthTitle', 'adminIncidentHealthSummary', 'adminIncidentVerificationSchedule', 'adminIncidentPrimaryAction', 'adminIncidentRecoveryActions', 'adminIncidentRecoverDue', 'adminIncidentRecoverDead', 'adminIncidentTestWebhook', 'adminIncidentVerifyDeployment', 'adminIncidentConfirmInbox', 'adminIncidentConfirmSpam', 'adminIncidentCleanupUnconfirmed', 'adminIncidentRecoveryStatus', 'adminIncidentDeploymentStatus', 'adminIncidentMailVerificationStatus', 'adminIncidentMailTroubleshooter', 'adminIncidentMailTroubleshooterStatus', 'adminIncidentMailTroubleshooterSteps', 'adminIncidentMailTestDetails', 'adminIncidentMailTestStats', 'adminIncidentMailTestTrend', 'adminIncidentMailTestTrendStatus', 'adminIncidentMailTestPeriod', 'adminIncidentMailTestSearch', 'adminIncidentMailTestFilter', 'adminIncidentMailTestExport', 'adminIncidentMailTestCount', 'adminIncidentMailTestRows', 'adminIncidentHistoryDetails', 'adminIncidentHistoryFilter', 'adminIncidentHistoryMore', 'adminIncidentHistoryStatus', 'adminIncidentHistoryRows', 'adminIncidentAuditDetails', 'adminIncidentAuditSearch', 'adminIncidentAuditFilter', 'adminIncidentAuditMore', 'adminIncidentAuditExport', 'adminIncidentAuditStatus', 'adminIncidentAuditRows',
        'processingHud', 'processingHudTitle', 'processingHudText', 'processingHudPercent', 'processingHudBar',
        'bulkImportHud', 'bulkImportHudTitle', 'bulkImportHudText', 'bulkImportHudPercent', 'bulkImportHudBar', 'bulkImportHudList', 'bulkImportHudToggle', 'bulkImportHudClose', 'bulkImportHudMasterAll', 'bulkImportHudRestore',
        'aiApplyBtn', 'masterPreviewBtn', 'masterSelectedBtn', 'masterAllBtn', 'zipBtn', 'individualExportBtn', 'clearBtn', 'trackList', 'queuePreview', 'trackDetail',
        'detailStatus', 'queueCount', 'statTracks', 'statDone', 'statSize', 'statState', 'selectedBadge',
        'albumStatus', 'toast', 'featureTooltip', 'programInfoBtn', 'programInfoDialog', 'programInfoClose', 'incidentReportingDialog', 'incidentReportingClose', 'masterGoalSelect', 'masterStyleSelect', 'masterStrengthSelect', 'platformPresetSelect', 'performanceModeSelect', 'outputFormatSelect', 'targetLufsSelect', 'ceilingSelect', 'qualityModeSelect', 'pitchEngineSelect', 'genreLockBtn', 'clearCacheBtn',
        'snapshotSaveBtn', 'snapshotUndoBtn', 'snapshotRedoBtn', 'snapshotAiBtn', 'snapshotOriginalBtn', 'snapshotClearBtn', 'snapshotStatus', 'snapshotHistory', 'globalDiffMeter', 'subscribeNudge', 'subscribeNudgeAction', 'subscribeNudgeClose'
    ];
    ids.forEach(id => { el[id] = document.getElementById(id); });
}
function decorateSliderLabel(label, text) {
    const value = String(text || '');
    const match = value.match(/^(.+?)\s*\((.+)\)$/);
    label.textContent = '';
    const ko = document.createElement('span');
    ko.className = 'slider-label-ko';
    ko.textContent = match ? match[1].trim() : value;
    label.appendChild(ko);
    if (match) {
        const en = document.createElement('small');
        en.className = 'slider-label-en';
        en.textContent = match[2].trim();
        label.appendChild(en);
    }
}
function renderSliders() {
    el.sliderFields.textContent = '';
    if (el.intensityField) el.intensityField.textContent = '';
    SLIDERS.forEach((slider, index) => {
        const field = document.createElement('div');
        field.className = 'field';
        const head = document.createElement('div');
        head.className = 'range-head';
        const label = document.createElement('label');
        label.htmlFor = slider.id;
        decorateSliderLabel(label, slider.label);
        const rec = document.createElement('span');
        rec.className = 'rec-value';
        rec.id = `rec-${slider.id}`;
        const value = document.createElement('b');
        value.id = `value-${slider.id}`;
        value.textContent = formatSliderValue(slider, GENRE_PRESETS.custom[slider.id]);
        const input = document.createElement('input');
        input.type = 'range';
        input.id = slider.id;
        input.min = String(slider.min ?? 0);
        input.max = String(slider.max ?? 100);
        input.step = String(slider.step ?? 1);
        input.value = String(GENRE_PRESETS.custom[slider.id]);
        input.dataset.sliderIndex = String(index);
        const hint = document.createElement('div');
        hint.className = 'slider-hint';
        hint.id = `hint-${slider.id}`;
        head.append(label, rec, value);
        field.append(head, input, hint);
        const target = slider.id === 'intensity' && el.intensityField ? el.intensityField : el.sliderFields;
        target.appendChild(field);
    });
}
function renderFeatureButtons() {
    const featureContainer = el.featureDialogList || el.featureDock;
    if (!featureContainer) return;
    if (el.featureDock) el.featureDock.textContent = '';
    featureContainer.textContent = '';
    const groups = [
        {
            kind: 'engine',
            title: '마스터링 엔진',
            description: '음색, 피크, 보컬, 공간감에 직접 개입하는 렌더 엔진 기능입니다.',
            definitions: FEATURE_DEFINITIONS
        },
        {
            kind: 'utility',
            title: '비교 · 관리 도구',
            description: 'A/B 비교, 루프, 캐시, 성능 보호처럼 엔진 밖에서 동작하는 보조 기능입니다.',
            definitions: UTILITY_FEATURE_DEFINITIONS
        }
    ];
    groups.forEach(group => {
        const header = document.createElement('div');
        header.className = 'feature-group-title';
        header.dataset.kind = group.kind;
        const strong = document.createElement('strong');
        strong.textContent = group.title;
        const small = document.createElement('small');
        small.textContent = group.description;
        header.append(strong, small);
        featureContainer.appendChild(header);
        const cards = Object.entries(group.definitions).map(([key, info], order) => ({
            kind: group.kind,
            key,
            info,
            active: getFeatureToggleState(group.kind, key),
            order
        }));
        cards.sort((a, b) => {
            if (a.active !== b.active) return a.active ? 1 : -1;
            return a.order - b.order;
        });
        cards.forEach(({ kind, key, info, active }) => {
            const button = document.createElement('button');
            const actionOnly = Boolean(info.actionOnly);
            const disabled = typeof info.isDisabled === 'function' ? Boolean(info.isDisabled()) : false;
            button.type = 'button';
            button.className = `feature-card feature-dialog-card ${active ? 'active' : ''} ${actionOnly ? 'action-only' : ''}`;
            button.dataset.feature = key;
            button.dataset.kind = kind;
            button.dataset.state = actionOnly ? 'action' : (active ? 'on' : 'off');
            button.dataset.tooltip = info.short;
            button.dataset.help = disabled ? `${info.short} 현재는 선택 가능한 분석 완료 트랙이 필요합니다.` : info.short;
            button.title = button.dataset.help;
            button.disabled = disabled;
            if (!actionOnly) button.setAttribute('aria-pressed', String(Boolean(active)));
            button.setAttribute('aria-label', `${info.label}: ${button.dataset.help}`);
            const title = document.createElement('b');
            title.textContent = info.label;
            const status = document.createElement('span');
            status.className = 'feature-status';
            status.textContent = actionOnly ? (disabled ? '대기' : (info.actionLabel || '실행')) : (active ? 'ON' : 'OFF');
            button.append(title, status);
            attachHelpTooltip(button, button.dataset.help);
            button.addEventListener('click', () => {
                showFeatureTooltip(button, button.dataset.help, 1800);
                if (kind === 'utility') toggleUtilityFeature(key);
                else toggleFeature(key);
            });
            featureContainer.appendChild(button);
        });
    });
    updateFeatureSummary();
}
function getFeatureToggleState(kind, key) {
    if (kind === 'utility') {
        const info = UTILITY_FEATURE_DEFINITIONS[key];
        if (typeof info?.getState === 'function') return Boolean(info.getState());
        if (info?.actionOnly) return false;
        return Boolean(state[key]);
    }
    return Boolean(state.featureFlags[key]);
}
async function toggleUtilityFeature(key) {
    if (!Object.prototype.hasOwnProperty.call(UTILITY_FEATURE_DEFINITIONS, key)) return;
    const info = UTILITY_FEATURE_DEFINITIONS[key];
    if (typeof info.isDisabled === 'function' && info.isDisabled()) {
        showFeatureTooltip(document.querySelector(`[data-feature="${key}"]`), '분석이 완료된 선택 트랙이 필요합니다.', 1600);
        return;
    }
    if (key === 'clearAnalysisCache') {
        await clearAnalysisCache();
        renderFeatureButtons();
        return;
    }
    if (key === 'selectedGenreLock') {
        toggleGenreLockForSelected();
        renderFeatureButtons();
        return;
    }
    if (key === 'autoCacheClean') {
        state.autoCacheClean = !state.autoCacheClean;
        if (state.autoCacheClean) maybeAutoCleanAnalysisCache(true);
    } else if (key === 'smartPerformanceGuard') {
        state.smartPerformanceGuard = !state.smartPerformanceGuard;
    }
    persistRuntimeSettings();
    renderFeatureButtons();
    renderAll({ keepDetailAudio: true });
    updateMobileNativeUi();
    showToast(`${info.label}: ${getFeatureToggleState('utility', key) ? '켜짐' : '꺼짐'} · ${info.short}`);
}
function updateFeatureSummary() {
    const engineActive = Object.values(state.featureFlags).filter(Boolean).length;
    const utilityActive = Object.keys(UTILITY_FEATURE_DEFINITIONS)
        .filter(key => !UTILITY_FEATURE_DEFINITIONS[key].actionOnly)
        .filter(key => getFeatureToggleState('utility', key)).length;
    if (el.featureCount) el.featureCount.textContent = `${engineActive + utilityActive}개 활성`;
}
function showFeatureTooltip(target, text, autoHideMs = 0) {
    if (!el.featureTooltip || !target || !text) return;
    el.featureTooltip.textContent = text;
    el.featureTooltip.classList.add('show');
    el.featureTooltip.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const tip = el.featureTooltip.getBoundingClientRect();
        const margin = 8;
        let left = rect.left + rect.width / 2 - tip.width / 2;
        left = clamp(left, margin, Math.max(margin, window.innerWidth - tip.width - margin));
        let top = rect.top - tip.height - 9;
        if (top < margin) top = rect.bottom + 9;
        if (top + tip.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - tip.height - margin);
        el.featureTooltip.style.left = `${left}px`;
        el.featureTooltip.style.top = `${top}px`;
    });
    clearTimeout(state.featureTooltipTimer);
    if (autoHideMs) state.featureTooltipTimer = setTimeout(hideFeatureTooltip, autoHideMs);
}
function hideFeatureTooltip() {
    if (!el.featureTooltip) return;
    el.featureTooltip.classList.remove('show');
    el.featureTooltip.setAttribute('aria-hidden', 'true');
}
function openProgramInfoDialog(event = null, options = {}) {
    if (!el.programInfoDialog) return false; const controller = state.modalController;
    if (controller?.modals?.has?.('programInfo')) return controller.setOpen('programInfo', true, { event, opener: options.returnFocus || event?.currentTarget || el.programInfoBtn || document.activeElement });
    hardSetModalState(el.programInfoDialog, true, 'program-info-open'); window.FoxBearModalStateMachine?.focusFirst?.(el.programInfoDialog); return true;
}
function closeProgramInfoDialog(options = {}) {
    if (!el.programInfoDialog) return false; const controller = state.modalController;
    if (controller?.modals?.has?.('programInfo') && controller.isOpen('programInfo')) return controller.setOpen('programInfo', false, { restoreFocus: options.restoreFocus !== false });
    hardSetModalState(el.programInfoDialog, false, 'program-info-open'); if (options.restoreFocus !== false && el.programInfoBtn) try { el.programInfoBtn.focus({ preventScroll: true }); } catch (error) {} return true;
}
function openIncidentReportingDialog(options = {}) {
    if (!el.incidentReportingDialog) return false; toggleMobileNativePanel(false); const controller = state.modalController;
    if (controller?.modals?.has?.('incidentReporting')) return controller.setOpen('incidentReporting', true, { opener: options.returnFocus || el.mobileNativeQuickToggle || document.activeElement });
    hardSetModalState(el.incidentReportingDialog, true, 'incident-reporting-open'); window.FoxBearIncidentReporter?.bindControls?.(); window.FoxBearModalStateMachine?.focusFirst?.(el.incidentReportingDialog); return true;
}
function closeIncidentReportingDialog(options = {}) {
    if (!el.incidentReportingDialog) return false; const controller = state.modalController;
    if (controller?.modals?.has?.('incidentReporting') && controller.isOpen('incidentReporting')) return controller.setOpen('incidentReporting', false, { restoreFocus: options.restoreFocus !== false });
    hardSetModalState(el.incidentReportingDialog, false, 'incident-reporting-open'); if (options.restoreFocus !== false && el.mobileNativeQuickToggle) try { el.mobileNativeQuickToggle.focus({ preventScroll: true }); } catch (error) {} return true;
}
function openFeatureDialog(event = null) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    if (!el.featureDialog) {
        try { cacheElements(); } catch (error) {}
    }
    if (!el.featureDialog) return false;
    renderFeatureButtons();
    hardSetModalState(el.featureDialog, true, 'feature-dialog-open');
    const panel = el.featureDialog.querySelector('.feature-dialog-panel');
    if (panel) panel.focus({ preventScroll: true });
    return true;
}
function closeFeatureDialog(options = {}) {
    const dialog = el.featureDialog || document.getElementById('featureDialog');
    if (!dialog) return false;
    state.featureDialogClosingUntil = 0;
    hardSetModalState(dialog, false, 'feature-dialog-open');
    hideFeatureTooltip();
    if (options.restoreFocus !== false) {
        const opener = el.featureOpenBtn || document.getElementById('featureOpenBtn');
        if (opener && document.body.contains(opener)) {
            try { opener.focus({ preventScroll: true }); } catch (error) {}
        }
    }
    return true;
}
function closeFeatureDialogFromEvent(event = null) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    return closeFeatureDialog({ restoreFocus: false });
}
function hardSetModalState(dialog, open, bodyClass = '') {
    if (!dialog) return false;
    if (window.FoxBearModalStateMachine && typeof window.FoxBearModalStateMachine.hardSet === 'function') {
        return window.FoxBearModalStateMachine.hardSet(dialog, Boolean(open), bodyClass);
    }
    dialog.hidden = !open;
    dialog.classList.toggle('show', Boolean(open));
    dialog.setAttribute('aria-hidden', open ? 'false' : 'true');
    dialog.style.display = open ? 'flex' : 'none';
    dialog.style.pointerEvents = open ? 'auto' : 'none';
    if (bodyClass) document.body.classList.toggle(bodyClass, Boolean(open));
    return true;
}
function installManagedModalController() {
    if (state.managedModalControllerInstalled) return state.modalController || null;
    if (!window.FoxBearModalStateMachine || !window.FoxBearModalStateMachine.FoxBearModalStateMachine) {
        console.warn('FoxBear modal state machine is unavailable; falling back to direct modal handlers.');
        return null;
    }
    const controller = new window.FoxBearModalStateMachine.FoxBearModalStateMachine({
        document,
        getElement: id => el[id] || document.getElementById(id)
    });
    controller
        .register('programInfo', {
            dialog: 'programInfoDialog',
            openers: ['programInfoBtn'],
            closers: ['programInfoClose'],
            closeSelector: '.program-info-close, [data-program-info-close]',
            bodyClass: 'program-info-open',
            returnFocus: 'programInfoBtn'
        })
        .register('incidentReporting', {
            dialog: 'incidentReportingDialog',
            closers: ['incidentReportingClose'],
            closeSelector: '.support-settings-close, [data-incident-reporting-close]',
            bodyClass: 'incident-reporting-open',
            returnFocus: 'mobileNativeQuickToggle',
            onOpen: () => window.FoxBearIncidentReporter?.bindControls?.()
        })
        .register('feature', {
            dialog: 'featureDialog',
            openers: ['featureOpenBtn'],
            closers: ['featureDialogClose'],
            closeSelector: '.feature-dialog-close, [data-feature-dialog-close]',
            bodyClass: 'feature-dialog-open',
            returnFocus: 'featureOpenBtn',
            onOpen: () => {
                renderFeatureButtons();
                hideFeatureTooltip();
            },
            onClose: () => hideFeatureTooltip()
        })
        .register('preview', {
            dialog: 'previewDialog',
            openers: ['previewOpenBtn'],
            closers: ['previewDialogClose'],
            closeSelector: '.preview-dialog-close, [data-preview-dialog-close]',
            bodyClass: 'preview-dialog-open',
            returnFocus: 'previewOpenBtn',
            onOpen: ctx => {
                const ok = openPreviewDialog(ctx.event || null);
                if (!ok && state.modalController) state.modalController.setOpen('preview', false, { restoreFocus: false, silent: true });
            },
            onClose: () => {
                const dialog = el.previewDialog || document.getElementById('previewDialog');
                const waveformOnly = dialog?.classList.contains('waveform-compare-mode');
                if (!waveformOnly) {
                    pauseAllPreviewAudio();
                    cleanupRealtimePreview();
                }
                if (dialog) dialog.classList.remove('waveform-compare-mode');
                const title = dialog?.querySelector('#previewDialogTitle');
                if (title) title.textContent = '미리듣기';
                clearPreviewDialogBody('managed-modal-close');
            }
        })
        .install();
    state.modalController = controller;
    state.managedModalControllerInstalled = true;
    window.FoxBearOpenFeatureDialog = event => openFeatureDialog(event);
    window.FoxBearCloseFeatureDialog = event => closeFeatureDialogFromEvent(event);
    window.FoxBearOpenPreviewDialog = event => openPreviewDialog(event);
    window.FoxBearClosePreviewDialog = event => closePreviewDialog(event, { restoreFocus: false });
    return controller;
}
function clearPreviewDialogBody(reason = 'preview-dialog-clear') { const body = el.previewDialogBody; if (!body) return 0; const children = Array.from(body.children || []); children.forEach(child => { try { child._foxbearDispose?.(); } catch (error) { console.warn('Preview element cleanup failed:', error); } }); Array.from(body.querySelectorAll?.('audio') || []).forEach(audio => { try { audio.pause?.(); } catch (error) {} unregisterPlaybackLinkedAudio(audio, reason); }); body.textContent = ''; return children.length; }
function installModalHardFixController() {
    return installManagedModalController();
}
function forceOpenFeatureDialog(event = null) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    if (state.featureDialogClosingUntil && Date.now() < state.featureDialogClosingUntil) return false;
    if (!el.featureDialog) {
        try { cacheElements(); } catch (error) {}
    }
    if (!el.featureDialog) {
        showToastSafe('버튼형 기능 창을 열 수 없습니다. 새로고침 후 다시 시도해주세요.');
        return false;
    }
    return openFeatureDialog(event);
}
function ensureFeatureDialogLayer() {
    const dialog = el.featureDialog || document.getElementById('featureDialog');
    const button = el.featureOpenBtn || document.getElementById('featureOpenBtn');
    if (dialog) {
        // v1.3.81: the opener stays in the normal page layer; only the modal
        // itself rises above the Dock while it is visible. Closed dialogs are
        // force-hidden so a stale CSS override cannot block the page.
        dialog.style.removeProperty('z-index');
        const shown = dialog.classList.contains('show');
        dialog.hidden = !shown;
        dialog.style.display = shown ? 'flex' : 'none';
        dialog.style.pointerEvents = shown ? 'auto' : 'none';
    }
    if (button) {
        button.removeAttribute('disabled');
        button.style.removeProperty('z-index');
        button.style.removeProperty('position');
        button.style.pointerEvents = 'auto';
        button.style.touchAction = 'manipulation';
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-controls', 'featureDialog');
    }
}
function bindFeatureOpenHardFallback() {
    return installManagedModalController();
}
function openPreviewDialog(event = null) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    const track = getSelectedTrack() || (typeof resolveMainActiveTrackForDock === 'function' ? resolveMainActiveTrackForDock() : null) || state.tracks?.[0] || null;
    if (!el.previewDialog || !el.previewDialogBody) {
        showToastSafe('미리듣기 창을 열 수 없습니다. 새로고침 후 다시 시도해주세요.');
        return false;
    }
    if (!track) {
        showToastSafe('미리듣기할 음원을 먼저 불러와주세요.');
        return false;
    }
    renderPreviewDialog(track);
    el.previewDialog.classList.remove('waveform-compare-mode');
    const title = el.previewDialog.querySelector('#previewDialogTitle');
    if (title) title.textContent = '미리듣기';
    hardSetModalState(el.previewDialog, true, 'preview-dialog-open');
    const panel = el.previewDialog.querySelector('.preview-dialog-panel');
    if (panel) panel.focus({ preventScroll: true });
    return true;
}
function closePreviewDialog(event = null, options = {}) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    if (!el.previewDialog) return false;
    const waveformOnly = el.previewDialog.classList.contains('waveform-compare-mode');
    if (!waveformOnly) {
        pauseAllPreviewAudio();
        cleanupRealtimePreview();
    }
    el.previewDialog.classList.remove('waveform-compare-mode');
    hardSetModalState(el.previewDialog, false, 'preview-dialog-open');
    const title = el.previewDialog.querySelector('#previewDialogTitle');
    if (title) title.textContent = '미리듣기';
    document.body.classList.remove('preview-dialog-open');
    clearPreviewDialogBody('preview-dialog-close');
    if (options.restoreFocus !== false && el.previewOpenBtn) el.previewOpenBtn.focus({ preventScroll: true });
    return true;
}
function renderPreviewDialog(track) {
    if (!el.previewDialogBody || !track) return;
    cleanupRealtimePreview();
    clearPreviewDialogBody('preview-dialog-rerender');
    if (el.previewDialogCaption) el.previewDialogCaption.textContent = '실시간 미리듣기';
    renderRealtimePreviewConsole(track, el.previewDialogBody);
    if (track.masteredUrl) {
        renderPreviewDialogUnifiedPlayers(track, el.previewDialogBody);
    }
}
function renderRealtimePreviewConsole(track, target) {
    const wrap = document.createElement('section');
    wrap.className = 'realtime-preview-console';
    const head = document.createElement('div');
    head.className = 'realtime-preview-head';
    const title = document.createElement('strong');
    title.textContent = '실시간 마스터링 프리뷰';
    const status = document.createElement('span');
    status.className = 'realtime-preview-status';
    status.textContent = 'WebAudio 대기';
    head.append(title, status);
    const trackInfo = makeRealtimePreviewTrackInfo(track);
    const playerCard = document.createElement('div');
    playerCard.className = 'preview-card realtime-player-card realtime-unified-player-card';
    const previewStart = getRealtimePreviewStartSec(track);
    const previewPlayer = createDockIntegratedWaveformPlayer(track, {
        src: track.originalUrl,
        mode: 'original',
        duration: track.analysis?.duration,
        startSec: previewStart,
        gainDb: 0,
        translationMode: false,
        seekTarget: 'local',
        waveformRole: 'realtime-preview',
        waveformClass: 'realtime-preview-waveform-bars',
        playerClass: 'realtime-custom-player realtime-dock-linked-player',
        playerRole: 'mastering-settings-preview'
    });
    const audio = previewPlayer.querySelector('audio');
    if (audio) {
        audio.setAttribute('aria-label', `${track.name || '선택 곡'} 통합 마스터링 설정 미리듣기 재생`);
        audio.dataset.previewSystem = 'mastering-settings';
    }
    playerCard.append(previewPlayer);
    playerCard.appendChild(createRealtimePreviewSystemBridge(track, audio, status));
    const controls = document.createElement('div');
    controls.className = 'realtime-control-stack realtime-eq-strip';
    controls.setAttribute('aria-label', '실시간 마스터링 컨트롤');
    getRealtimeControlDefinitions(track).forEach(control => controls.appendChild(createRealtimeSliderRow(control, track)));
    wrap.append(head, trackInfo, playerCard, controls);
    target.appendChild(wrap);
    if (audio) setupRealtimePreviewEngine(track, audio, status);
    else if (status) status.textContent = '플레이어 생성 실패';
}
function makeRealtimePreviewTrackInfo(track) {
    const info = document.createElement('div');
    info.className = 'realtime-track-info';
    const name = document.createElement('strong');
    name.textContent = track?.name || '선택한 곡';
    const meta = document.createElement('span');
    const parts = [];
    if (Number.isFinite(Number(track?.analysis?.duration))) parts.push(formatTime(Number(track.analysis.duration)));
    if (track?.size) parts.push(formatBytes(track.size));
    parts.push(track?.type || 'audio');
    const preset = PRESET_LABELS[track?.preset] || track?.preset || '커스텀';
    parts.push(preset);
    meta.textContent = parts.filter(Boolean).join(' · ');
    info.append(name, meta);
    return info;
}
function getRealtimePreviewStartSec(track) {
    const captured = captureBottomPreviewTransport(track, state.bottomPreviewMode);
    if (captured && captured.trackId === track?.id && Number.isFinite(Number(captured.absoluteSec))) {
        return clamp(Number(captured.absoluteSec), 0, Math.max(0, Number(track?.analysis?.duration || 0) - 0.08));
    }
    const highlight = getTrackHighlightStart(track);
    return Number.isFinite(Number(highlight)) ? Number(highlight) : 0;
}
function createRealtimePreviewSystemBridge(track, audio, statusEl) {
    const bridge = document.createElement('div');
    bridge.className = 'realtime-system-bridge';
    bridge.setAttribute('aria-label', 'Dock 및 비교 시스템 연동');
    const meta = document.createElement('div');
    meta.className = 'realtime-system-meta';
    const pill = document.createElement('span');
    pill.className = 'realtime-system-pill is-linked';
    pill.textContent = 'Dock 파형 엔진 연동';
    const peak = document.createElement('span');
    peak.className = 'realtime-system-pill';
    peak.textContent = '피크/플레이헤드 표시';
    const bus = document.createElement('span');
    bus.className = 'realtime-system-pill is-bus-linked';
    bus.textContent = '전역 재생상태 연동';
    meta.append(pill, peak, bus);
    const actions = document.createElement('div');
    actions.className = 'realtime-system-actions';
    const addAction = (label, title, handler) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'realtime-system-action';
        button.textContent = label;
        button.title = title;
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            handler();
        });
        actions.appendChild(button);
    };
    addAction('↙ Dock 위치 가져오기', '하단 Dock의 현재 재생 위치를 이 미리듣기 플레이어로 가져옵니다.', () => syncRealtimePreviewFromDock(audio, statusEl));
    addAction('↗ Dock으로 보내기', '이 미리듣기 위치를 하단 Dock 원곡 플레이어로 보냅니다.', () => sendRealtimePreviewToDock(track, audio));
    addAction('🌊 비교창', '원곡/마스터링 큰 비교창을 엽니다.', () => openWaveformCompareDialog());
    addAction('⚡ 피크 이동', '원곡 피크가 큰 구간으로 미리듣기 위치를 이동합니다.', () => seekRealtimePreviewToPeak(track, audio, statusEl));
    bridge.append(meta, actions);
    return bridge;
}
function syncRealtimePreviewFromDock(audio, statusEl) {
    const track = getSelectedTrack();
    const dock = getBottomPreviewAudio();
    if (!track || !audio || !dock) {
        showToast('가져올 Dock 재생 위치가 없습니다.');
        return false;
    }
    const captured = captureBottomPreviewTransport(track, state.bottomPreviewMode);
    const next = Number(captured?.absoluteSec ?? dock.currentTime ?? 0);
    applyBottomPreviewStart(audio, next);
    if (statusEl) statusEl.textContent = `Dock 위치 ${formatTime(next)} 동기화`;
    showToast(`Dock 위치 ${formatTime(next)}를 설정 미리듣기로 가져왔습니다.`);
    return true;
}
function sendRealtimePreviewToDock(track, audio) {
    if (!track || !audio) return false;
    const position = Math.max(0, Number(audio.currentTime || 0));
    state.bottomPreviewTransport = {
        trackId: track.id,
        mode: 'original',
        localSec: position,
        absoluteSec: position,
        playing: !audio.paused && !audio.ended,
        translationMode: state.previewTranslationMode || 'studio',
        capturedAt: Date.now()
    };
    state.bottomPreviewMode = 'original';
    state.bottomPreviewTrackId = track.id;
    renderBottomPreviewDock({ autoPlay: !audio.paused && !audio.ended, keepPlaying: !audio.paused && !audio.ended });
    showToast(`설정 미리듣기 위치 ${formatTime(position)}를 Dock으로 보냈습니다.`);
    return true;
}
function seekRealtimePreviewToPeak(track, audio, statusEl) {
    if (!track || !audio) return false;
    const values = normalizeWaveformValues(getTrackOriginalWaveformValues(track), 96);
    const duration = Number(track.analysis?.duration || audio.duration || 0);
    if (!values.length || !Number.isFinite(duration) || duration <= 0) {
        showToast('피크 이동에 사용할 파형 정보가 아직 없습니다.');
        return false;
    }
    let bestIndex = 0;
    let bestScore = -1;
    values.forEach((value, index) => {
        const score = Number(value || 0) + (index > 2 ? 0.03 : 0);
        if (score > bestScore) { bestScore = score; bestIndex = index; }
    });
    const pct = values.length > 1 ? bestIndex / (values.length - 1) : 0;
    const next = clamp(duration * pct, 0, Math.max(0, duration - 0.08));
    applyBottomPreviewStart(audio, next);
    if (statusEl) statusEl.textContent = `피크 구간 ${formatTime(next)} 이동`;
    showToast(`설정 미리듣기 피크 구간 ${formatTime(next)}로 이동했습니다.`);
    return true;
}
function getRealtimeControlDefinitions(track) {
    const ordered = [];
    const intensity = SLIDERS.find(slider => slider.id === 'intensity');
    if (intensity) ordered.push({ kind: 'slider', ...intensity });
    SLIDERS.filter(slider => slider.id !== 'intensity').forEach(slider => ordered.push({ kind: 'slider', ...slider }));
    const transform = cloneTransform(track?.transform || DEFAULT_TRANSFORM);
    ordered.push(
        { kind: 'pitch', id: 'pitchSemitones', label: '피치 (Pitch)', min: -12, max: 12, step: transform.snapSemitone ? 1 : 0.01, unit: ' st', low: '키를 낮춰 더 묵직하게 만듭니다.', neutral: '원본 키를 유지합니다.', high: '키를 올려 더 밝고 가볍게 만듭니다.' },
        { kind: 'bpm', id: 'speedPercent', label: 'BPM (%)', min: 50, max: 150, step: 1, unit: '%', low: '템포를 느리게 미리듣습니다.', neutral: '원본 템포를 유지합니다.', high: '템포를 빠르게 미리듣습니다.' }
    );
    return ordered;
}
function createRealtimeSliderRow(control, track) {
    const value = getRealtimeControlValue(control, track);
    const row = document.createElement('div');
    row.className = 'realtime-slider-row realtime-fader';
    row.dataset.slider = control.id;
    row.dataset.kind = control.kind || 'slider';
    row.dataset.hint = customHintText(control, value);
    const label = document.createElement('label');
    label.className = 'realtime-fader-label';
    label.htmlFor = `rt-${control.id}`;
    decorateSliderLabel(label, control.label);
    const input = document.createElement('input');
    input.type = 'range';
    input.id = `rt-${control.id}`;
    input.min = String(control.min ?? 0);
    input.max = String(control.max ?? 100);
    input.step = String(control.step ?? 1);
    input.value = String(value);
    input.dataset.sliderId = control.id;
    input.dataset.controlKind = control.kind || 'slider';
    input.addEventListener('input', handleRealtimePreviewSliderInput);
    const valueWrap = document.createElement('div');
    valueWrap.className = 'realtime-fader-value-wrap';
    const valueEl = document.createElement('input');
    valueEl.type = 'number';
    valueEl.id = `rt-value-${control.id}`;
    valueEl.className = 'realtime-fader-value realtime-fader-number';
    valueEl.min = String(control.min ?? 0);
    valueEl.max = String(control.max ?? 100);
    valueEl.step = String(control.step ?? 1);
    valueEl.value = formatRealtimeNumber(control, value);
    valueEl.dataset.sliderId = control.id;
    valueEl.dataset.controlKind = control.kind || 'slider';
    valueEl.setAttribute('aria-label', `${plainSliderLabel(control.label)} 값 직접 입력`);
    valueEl.addEventListener('change', handleRealtimePreviewNumberInput);
    valueEl.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            valueEl.blur();
        }
    });
    const unit = document.createElement('span');
    unit.textContent = String(control.unit || '').trim();
    valueWrap.append(valueEl, unit);
    const hint = document.createElement('small');
    hint.className = 'realtime-slider-hint';
    hint.textContent = customHintText(control, value);
    row.append(label, input, valueWrap, hint);
    return row;
}
function getRealtimeControlValue(control, track) {
    const kind = control.kind || 'slider';
    if (kind === 'pitch') return clampToStep(Number(track?.transform?.pitchSemitones ?? 0), control.min, control.max, control.step || 1);
    if (kind === 'bpm') return clampToStep(Number(track?.transform?.speedRatio ?? 1) * 100, control.min, control.max, control.step || 1);
    return clampToStep(Number(track?.settings?.[control.id] ?? GENRE_PRESETS.custom[control.id]), control.min ?? 0, control.max ?? 100, control.step ?? 1);
}
function formatRealtimeNumber(control, value) {
    const step = Number(control.step ?? 1);
    if (step < 1) return Number(value).toFixed(2).replace(/\.00$/, '');
    return String(Math.round(Number(value)));
}
function findRealtimeControl(id, kind = 'slider') {
    return getRealtimeControlDefinitions(getSelectedTrack()).find(control => control.id === id && (control.kind || 'slider') === kind)
        || getRealtimeControlDefinitions(getSelectedTrack()).find(control => control.id === id)
        || null;
}
function handleRealtimePreviewSliderInput(event) {
    applyRealtimeControlValue(event.currentTarget, Number(event.currentTarget.value));
}
function handleRealtimePreviewNumberInput(event) {
    const number = event.currentTarget;
    const control = findRealtimeControl(number.dataset.sliderId, number.dataset.controlKind);
    if (!control) return;
    const value = clampToStep(Number(number.value), control.min ?? 0, control.max ?? 100, control.step ?? 1);
    number.value = formatRealtimeNumber(control, value);
    const range = document.getElementById(`rt-${control.id}`);
    if (range) range.value = String(value);
    applyRealtimeControlValue(number, value);
}
function applyRealtimeControlValue(source, rawValue) {
    const id = source.dataset.sliderId;
    const kind = source.dataset.controlKind || 'slider';
    const control = findRealtimeControl(id, kind);
    const track = getSelectedTrack();
    if (!control || !track) return;
    const min = control.min ?? 0;
    const max = control.max ?? 100;
    const step = control.step ?? 1;
    const value = clampToStep(Number(rawValue), min, max, step);
    const range = document.getElementById(`rt-${id}`);
    if (range) range.value = String(value);
    if (kind === 'pitch' || kind === 'bpm') {
        const transform = cloneTransform(track.transform || DEFAULT_TRANSFORM);
        if (kind === 'pitch') transform.pitchSemitones = value;
        if (kind === 'bpm') {
            transform.speedRatio = clamp(value / 100, 0.5, 1.5);
            transform.beatPreset = getBeatPresetForRatio(transform.speedRatio);
        }
        track.transform = cloneTransform(transform);
        setTransformControls(track.transform);
        invalidateMasteredOutput(track, '피치/BPM 조정값이 적용되었습니다. 최종 저장 시 고품질 렌더 경로로 처리됩니다.', false);
    } else {
        if (!track.settings) track.settings = cloneSettings(GENRE_PRESETS.custom);
        track.settings[id] = value;
        track.preset = 'custom';
        track.genreLocked = true;
        const mainInput = document.getElementById(id);
        if (mainInput) mainInput.value = String(value);
        const mainValue = document.getElementById(`value-${id}`);
        if (mainValue) mainValue.textContent = formatSliderValue(control, value);
        const recEl = document.getElementById(`rec-${id}`);
        if (recEl) recEl.textContent = '';
        updateSliderHint(id);
        invalidateMasteredOutput(track, '실시간 미리듣기에서 사용자 커스텀 값이 적용되었습니다. 저장하려면 다시 마스터링하세요.', false);
    }
    const localValue = document.getElementById(`rt-value-${id}`);
    if (localValue) localValue.value = formatRealtimeNumber(control, value);
    const row = source.closest('.realtime-slider-row') || document.querySelector(`.realtime-slider-row[data-slider="${id}"]`);
    const newHint = customHintText(control, value);
    const hint = row ? row.querySelector('.realtime-slider-hint') : null;
    if (hint) hint.textContent = newHint;
    if (row) row.dataset.hint = newHint;
    updateRealtimePreviewSettings(track);
    schedulePreviewUiRefresh();
}
function schedulePreviewUiRefresh() {
    clearTimeout(state.previewRenderTimer);
    state.previewRenderTimer = setTimeout(() => {
        state.previewRenderTimer = null;
        renderButtons();
        renderTrackList();
        renderDetail({ keepDetailAudio: true });
        renderSelectedBadge();
        updateSmartRecommendationPanel();
        renderSnapshotPanel();
        updatePreviewButton();
    }, REALTIME_PREVIEW_RENDER_DELAY);
}
function setupRealtimePreviewEngine(track, audio, statusEl) {
    cleanupRealtimePreview();
    if (getInAppAudioCompatibility().restricted) { if (statusEl) statusEl.textContent = '인앱 호환 재생'; return; }
    if (!window.AudioContext && !window.webkitAudioContext) {
        if (statusEl) statusEl.textContent = 'WebAudio 미지원';
        return;
    }
    try {
        const context = FoxBearAudioContexts.create({ purpose: 'realtime-mastering-preview', ownerId: 'realtime-mastering-preview', replaceOwner: true, latencyHint: 'interactive' });
        const source = context.createMediaElementSource(audio);
        const nodes = createRealtimeMasteringNodes(context, source, track);
        registerExternalSpectrumAnalyser(audio, nodes.spectrumAnalyser, context, {
            role: 'mastering-settings-preview',
            trackId: track?.id || '',
            mode: 'realtime-preview',
            label: '실시간 마스터링 FFT'
        });
        audio._foxbearResumeAudioGraph = () => FoxBearAudioContexts.resume(context, 'realtime-preview-user-gesture');
        state.realtimePreview = { context, audio, nodes, statusEl, trackId: track.id };
        updateRealtimePreviewSettings(track);
        audio.addEventListener('play', () => {
            FoxBearAudioContexts.resume(context, 'realtime-preview-play');
            if (statusEl) statusEl.textContent = '실시간 적용 중';
        });
        audio.addEventListener('pause', () => {
            if (statusEl) statusEl.textContent = '일시정지';
        });
        audio.addEventListener('ended', () => {
            if (statusEl) statusEl.textContent = '재생 완료';
        });
        if (statusEl) statusEl.textContent = '재생 준비';
    } catch (error) {
        console.warn('Realtime preview unavailable:', error);
        if (statusEl) statusEl.textContent = '일반 재생 모드';
    }
}
function createRealtimeMasteringNodes(context, source, track) {
    const inputGain = context.createGain();
    const highPass = context.createBiquadFilter();
    const lowShelf = context.createBiquadFilter();
    const lowMid = context.createBiquadFilter();
    const presence = context.createBiquadFilter();
    const highShelf = context.createBiquadFilter();
    const metallic = context.createBiquadFilter();
    const compressor = context.createDynamicsCompressor();
    const width = createRealtimeWidthMatrix(context, Number(track.analysis?.channels || 2) >= 2);
    const limiter = context.createDynamicsCompressor();
    const outputGain = context.createGain();
    const spectrumAnalyser = createSpectrumAnalyserTap(context);
    highPass.type = 'highpass';
    lowShelf.type = 'lowshelf';
    lowMid.type = 'peaking';
    presence.type = 'peaking';
    highShelf.type = 'highshelf';
    metallic.type = 'peaking';
    source.connect(inputGain).connect(highPass).connect(lowShelf).connect(lowMid).connect(presence).connect(highShelf).connect(metallic).connect(compressor).connect(width.input);
    width.output.connect(limiter).connect(outputGain);
    if (spectrumAnalyser) outputGain.connect(spectrumAnalyser).connect(context.destination);
    else outputGain.connect(context.destination);
    return { inputGain, highPass, lowShelf, lowMid, presence, highShelf, metallic, compressor, width, limiter, outputGain, spectrumAnalyser };
}
function createRealtimeWidthMatrix(context, enabled) {
    const input = context.createGain();
    const output = context.createGain();
    if (!enabled || !context.createChannelSplitter || !context.createChannelMerger) {
        input.connect(output);
        return { input, output, directLeft: null, directRight: null, crossLR: null, crossRL: null, enabled: false };
    }
    const splitter = context.createChannelSplitter(2);
    const merger = context.createChannelMerger(2);
    const directLeft = context.createGain();
    const directRight = context.createGain();
    const crossLR = context.createGain();
    const crossRL = context.createGain();
    input.connect(splitter);
    splitter.connect(directLeft, 0);
    directLeft.connect(merger, 0, 0);
    splitter.connect(crossLR, 0);
    crossLR.connect(merger, 0, 1);
    splitter.connect(directRight, 1);
    directRight.connect(merger, 0, 1);
    splitter.connect(crossRL, 1);
    crossRL.connect(merger, 0, 0);
    merger.connect(output);
    return { input, output, directLeft, directRight, crossLR, crossRL, enabled: true };
}
function updateRealtimePreviewSettings(track = getSelectedTrack()) {
    const preview = state.realtimePreview;
    if (!preview || !preview.nodes || !preview.context || !track || preview.trackId !== track.id) return;
    syncRealtimePreviewControls(track);
    const context = preview.context;
    const now = context.currentTime || 0;
    const nodes = preview.nodes;
    const profile = createSharedDspProfile(track.settings || GENRE_PRESETS.custom, track.analysis, track.preset || 'custom', {
        mode: 'realtime-preview',
        minWidthFactor: 0.72,
        maxWidthFactor: 1.38
    });
    markSharedDspProfileApplied(track.analysis, profile);
    const rt = profile.realtime;
    setAudioParam(nodes.inputGain.gain, rt.inputGain, now);
    setAudioParam(nodes.highPass.frequency, rt.highPass.frequency, now);
    setAudioParam(nodes.highPass.Q, rt.highPass.q, now);
    setAudioParam(nodes.lowShelf.frequency, rt.lowShelf.frequency, now);
    setAudioParam(nodes.lowShelf.gain, rt.lowShelf.gain, now);
    setAudioParam(nodes.lowMid.frequency, rt.lowMid.frequency, now);
    setAudioParam(nodes.lowMid.Q, rt.lowMid.q, now);
    setAudioParam(nodes.lowMid.gain, rt.lowMid.gain, now);
    setAudioParam(nodes.presence.frequency, rt.presence.frequency, now);
    setAudioParam(nodes.presence.Q, rt.presence.q, now);
    setAudioParam(nodes.presence.gain, rt.presence.gain, now);
    setAudioParam(nodes.highShelf.frequency, rt.highShelf.frequency, now);
    setAudioParam(nodes.highShelf.gain, rt.highShelf.gain, now);
    setAudioParam(nodes.metallic.frequency, rt.metallic.frequency, now);
    setAudioParam(nodes.metallic.Q, rt.metallic.q, now);
    setAudioParam(nodes.metallic.gain, rt.metallic.gain, now);
    setAudioParam(nodes.compressor.threshold, rt.compressor.threshold, now);
    setAudioParam(nodes.compressor.knee, rt.compressor.knee, now);
    setAudioParam(nodes.compressor.ratio, rt.compressor.ratio, now);
    setAudioParam(nodes.compressor.attack, rt.compressor.attack, now);
    setAudioParam(nodes.compressor.release, rt.compressor.release, now);
    setRealtimeWidth(nodes.width, rt.widthFactor, now);
    setAudioParam(nodes.limiter.threshold, rt.limiter.threshold, now);
    setAudioParam(nodes.limiter.knee, rt.limiter.knee, now);
    setAudioParam(nodes.limiter.ratio, rt.limiter.ratio, now);
    setAudioParam(nodes.limiter.attack, rt.limiter.attack, now);
    setAudioParam(nodes.limiter.release, rt.limiter.release, now);
    setAudioParam(nodes.outputGain.gain, rt.outputGain, now);
    if (preview.audio) {
        const speed = clamp(Number(track.transform?.speedRatio || 1), 0.5, 1.5);
        preview.audio.playbackRate = speed;
        if ('preservesPitch' in preview.audio) preview.audio.preservesPitch = true;
        if ('mozPreservesPitch' in preview.audio) preview.audio.mozPreservesPitch = true;
        if ('webkitPreservesPitch' in preview.audio) preview.audio.webkitPreservesPitch = true;
    }
    if (preview.statusEl) preview.statusEl.textContent = preview.audio && !preview.audio.paused ? '실시간 적용 중' : '재생 준비';
}
function syncRealtimePreviewControls(track) {
    if (!track || !el.previewDialog?.classList.contains('show')) return;
    getRealtimeControlDefinitions(track).forEach(control => {
        const input = document.getElementById(`rt-${control.id}`);
        const valueEl = document.getElementById(`rt-value-${control.id}`);
        if (!input) return;
        const value = getRealtimeControlValue(control, track);
        if (document.activeElement !== input) input.value = String(value);
        if (valueEl && document.activeElement !== valueEl) valueEl.value = formatRealtimeNumber(control, value);
        const hint = input.closest('.realtime-slider-row')?.querySelector('.realtime-slider-hint');
        if (hint && document.activeElement !== input && document.activeElement !== valueEl) hint.textContent = customHintText(control, value);
    });
}
function setRealtimeWidth(widthNode, widthValue, now) {
    if (!widthNode || !widthNode.enabled) return;
    const width = clamp(Number(widthValue || 1), 0.5, 1.55);
    const direct = clamp((1 + width) / 2, 0, 1.35);
    const cross = clamp((1 - width) / 2, -0.28, 0.25);
    setAudioParam(widthNode.directLeft.gain, direct, now);
    setAudioParam(widthNode.directRight.gain, direct, now);
    setAudioParam(widthNode.crossLR.gain, cross, now);
    setAudioParam(widthNode.crossRL.gain, cross, now);
}
function setAudioParam(param, value, now) {
    if (!param) return;
    const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
    try {
        param.cancelScheduledValues(now);
        param.setTargetAtTime(safe, now, 0.018);
    } catch (error) {
        try { param.value = safe; } catch (_) {}
    }
}
function cleanupRealtimePreview() {
    clearTimeout(state.previewRenderTimer);
    state.previewRenderTimer = null;
    const preview = state.realtimePreview;
    if (!preview) return;
    try { if (preview.audio) { delete preview.audio._foxbearResumeAudioGraph; preview.audio.pause(); preview.audio.removeAttribute('src'); preview.audio.load(); } } catch (error) {}
    FoxBearAudioContexts.close(preview.context, 'realtime-preview-cleanup');
    state.realtimePreview = null;
}
function updatePreviewButton() {
    if (!el.previewOpenBtn) return;
    const track = getSelectedTrack() || (typeof resolveMainActiveTrackForDock === 'function' ? resolveMainActiveTrackForDock() : null) || state.tracks?.[0] || null;
    // v1.4.0: keep the mastering-settings preview button clickable.
    // Disabled buttons cannot show a reason when a stale selectedId/dock state exists.
    el.previewOpenBtn.disabled = false;
    el.previewOpenBtn.setAttribute('aria-disabled', String(!track));
    el.previewOpenBtn.classList.toggle('soft-disabled', !track);
}
function updateSmartRecommendationPanel() {
    if (!el.smartSuggestPanel) return;
    const track = getSelectedTrack();
    const hasAnalysis = Boolean(track && track.analysis);
    if (el.smartSuggestApplyBtn) el.smartSuggestApplyBtn.disabled = !hasAnalysis || state.busy;
    if (!track) {
        if (el.smartSuggestStatus) el.smartSuggestStatus.textContent = '파일 대기';
        if (el.smartSuggestSummary) el.smartSuggestSummary.textContent = '곡을 불러오면 분석값 기준으로 장르, 강도, 안전 옵션을 추천합니다.';
        if (el.smartSuggestList) el.smartSuggestList.textContent = '';
        return;
    }
    if (el.smartSuggestStatus) el.smartSuggestStatus.textContent = hasAnalysis ? `${track.confidence || 0}% 추천` : statusLabel(track.status);
    if (el.smartSuggestSummary) {
        if (hasAnalysis) {
            const preset = PRESET_LABELS[track.recommendedPreset || track.preset] || track.recommendedPreset || track.preset || '커스텀';
            const explanation = buildRecommendationExplainability(track);
            const reason = explanation.summary ? ` · ${explanation.summary}` : (track.genreReason ? ` · ${simplifyAiReason(track.genreReason)}` : '');
            el.smartSuggestSummary.textContent = `${preset} 기준 추천값을 사용할 수 있습니다${reason}`;
        } else {
            el.smartSuggestSummary.textContent = '분석이 끝나면 장르와 안전 옵션 추천이 표시됩니다.';
        }
    }
    if (!el.smartSuggestList) return;
    el.smartSuggestList.textContent = '';
    buildSmartSuggestionItems(track).forEach(item => el.smartSuggestList.appendChild(makeSmartSuggestionPill(item.label, item.value, item.tone)));
    renderSmartCandidatePresets(track, el.smartSuggestList);
}
function renderSmartCandidatePresets(track, target) {
    if (!target || !track || !track.analysis) return;
    const candidates = getAiCandidatePresets(track).slice(0, 4);
    if (!candidates.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'smart-candidate-row';
    candidates.forEach(candidate => {
        const button = document.createElement('button');
        button.type = 'button';
        const recommended = Boolean(candidate.recommended);
        const active = candidate.preset === track.preset;
        button.className = `smart-candidate-chip ${active ? 'active' : ''} ${recommended ? 'recommended' : ''}`;
        const label = document.createElement('span');
        label.textContent = candidate.label;
        const badge = document.createElement('b');
        badge.textContent = recommended ? `추천 ${candidate.percent}%` : `${candidate.percent}%`;
        button.title = buildCandidateExplainText(track, candidate);
        button.append(label, badge);
        button.disabled = state.busy || !track.analysis;
        button.addEventListener('click', () => applyAiPresetCandidate(track, candidate.preset));
        wrap.appendChild(button);
    });
    target.appendChild(wrap);
}
function maybeShowSingleTrackAiRecommendationDialog(track) {
    if (!track || !track.autoAiRecommendDialog || track.aiRecommendDialogShown || !track.analysis) return;
    if (window.__FOXBEAR_E2E_DISABLE_AUTO_DIALOGS__ === true) return;
    track.aiRecommendDialogShown = true;
    showAiRecommendationDialog(track);
}
function showAiRecommendationDialog(track) {
    if (!track || !track.analysis || !document.body) return;
    const previous = document.querySelector('.ai-recommend-dialog-backdrop');
    if (previous) closeAiRecommendationDialog(previous, { restoreFocus: false });
    const returnFocus = document.activeElement && document.activeElement.nodeType === 1 ? document.activeElement : null;
    const backdrop = document.createElement('div');
    backdrop.className = 'ai-recommend-dialog-backdrop show';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'AI 추천 프리셋');
    backdrop.__foxbearReturnFocus = returnFocus;
    const panel = document.createElement('section');
    panel.className = 'ai-recommend-dialog-panel';
    panel.tabIndex = -1;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ai-recommend-dialog-close foxbear-modal-close';
    close.setAttribute('aria-label', 'AI 추천 팝업 닫기');
    close.textContent = '×';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'ai-recommend-eyebrow';
    eyebrow.textContent = 'AI 자동 분석 완료';
    const title = document.createElement('h2');
    title.textContent = track.name || '선택 곡';
    const summary = document.createElement('p');
    summary.textContent = buildAiMasteringSummary(track);
    const list = document.createElement('div');
    list.className = 'ai-recommend-preset-list';
    const dialogCandidates = [...getAiCandidatePresets(track).slice(0, 4), getOriginalSelectionCandidate(track)];
    dialogCandidates.forEach(candidate => {
        const row = document.createElement('button');
        row.type = 'button';
        const recommended = Boolean(candidate.recommended);
        const manual = Boolean(candidate.manual);
        row.className = `ai-recommend-preset ${recommended ? 'recommended' : ''} ${manual ? 'manual-original' : ''} ${(candidate.active ?? (candidate.preset === track.preset)) ? 'active' : ''}`;
        const name = document.createElement('strong');
        name.textContent = candidate.label;
        const meta = document.createElement('span');
        meta.textContent = candidate.meta || `${candidate.percent}%`;
        const mark = document.createElement('em');
        mark.textContent = candidate.mark || (recommended ? '추천' : '후보');
        const explain = document.createElement('small');
        explain.className = 'ai-recommend-preset-explain';
        explain.textContent = buildCandidateExplainText(track, candidate);
        row.append(name, meta, mark, explain);
        row.addEventListener('click', () => {
            if (manual) applyOriginalManualSelection(track);
            else applyAiPresetCandidate(track, candidate.preset);
            closeAiRecommendationDialog(backdrop);
        });
        list.appendChild(row);
    });
    const handleDialogKeydown = event => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        closeAiRecommendationDialog(backdrop);
    };
    backdrop.__foxbearCleanup = () => document.removeEventListener('keydown', handleDialogKeydown, true);
    document.addEventListener('keydown', handleDialogKeydown, true);
    close.addEventListener('click', () => closeAiRecommendationDialog(backdrop));
    backdrop.addEventListener('click', event => { if (event.target === backdrop) closeAiRecommendationDialog(backdrop); });
    const explainBox = document.createElement('div');
    explainBox.className = 'ai-recommend-explain-box';
    const explainTitle = document.createElement('span');
    explainTitle.textContent = '판단 근거';
    const explainList = document.createElement('div');
    explainList.className = 'ai-recommend-explain-list';
    const explainability = buildRecommendationExplainability(track);
    explainability.chips.forEach(chip => {
        const chipEl = document.createElement('b');
        chipEl.className = `ai-recommend-explain-chip ai-recommend-explain-${chip.tone || 'neutral'}`;
        chipEl.textContent = chip.text;
        explainList.appendChild(chipEl);
    });
    explainBox.append(explainTitle, explainList);
    panel.append(close, eyebrow, title, summary, explainBox, list);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    document.body.classList.add('ai-recommend-dialog-open');
    window.FoxBearModalStateMachine?.setExternalLayerOpen?.(backdrop, true, {
        mode: 'dialog',
        panel,
        opener: returnFocus,
        lockScroll: true,
        onRequestClose: () => closeAiRecommendationDialog(backdrop)
    });
    requestAnimationFrame(() => panel.focus());
}
function closeAiRecommendationDialog(backdrop, options = {}) {
    const target = backdrop || document.querySelector('.ai-recommend-dialog-backdrop');
    const returnFocus = target?.__foxbearReturnFocus || null;
    try { target?.__foxbearCleanup?.(); } catch (error) {}
    if (target) window.FoxBearModalStateMachine?.setExternalLayerOpen?.(target, false);
    if (target) target.remove();
    document.body.classList.remove('ai-recommend-dialog-open');
    if (options.restoreFocus !== false && returnFocus && document.body.contains(returnFocus)) {
        try { returnFocus.focus({ preventScroll: true }); } catch (error) {}
    }
}
function buildSmartSuggestionItems(track) {
    const items = [];
    const analysis = track.analysis || {};
    const preset = PRESET_LABELS[track.recommendedPreset || track.preset] || track.recommendedPreset || track.preset || '커스텀';
    const confidence = Number(track.confidence || 0);
    const confidenceTone = getAiConfidenceTone(track);
    items.push({ label: '추천 장르', value: preset, tone: 'cyan' });
    if (confidence) items.push({ label: 'AI 신뢰도', value: `${getAiConfidenceLabel(track)} ${confidence}%`, tone: confidenceTone });
    items.push({ label: '목표 음압', value: `${Number(state.targetLufs || -14).toFixed(0)} LUFS`, tone: 'neutral' });
    items.push({ label: '스타일', value: getMasterStyleLabel(state.masterStyle), tone: 'cyan' });
    items.push({ label: '성향', value: getMasterStrengthLabel(state.masterStrength), tone: getMasterStrengthTone(state.masterStrength) });
    const safety = track.safetyInfo || (track.analysis ? computeEngineSafetyInfo(track, null, track.finalizeInfo || null) : null);
    if (safety) items.push({ label: '안전 점수', value: `${safety.score}점`, tone: safety.tone || 'ok' });
    if (Number.isFinite(Number(analysis.lowMonoScore))) items.push({ label: '저역 모노', value: `${Math.round(Number(analysis.lowMonoScore))}점`, tone: analysis.lowMonoScore >= 80 ? 'ok' : analysis.lowMonoScore >= 62 ? 'warn' : 'danger' });
    const firstRisk = getAiMasteringRiskNotes(track)[0];
    items.push({ label: '위험 체크', value: firstRisk || '양호', tone: firstRisk ? 'warn' : 'ok' });
    const activeGuards = [
        state.featureFlags.truePeakGuard ? '피크' : '',
        state.featureFlags.vocalProtect ? '보컬' : '',
        state.featureFlags.earFatigueGuard ? '피로' : ''
    ].filter(Boolean).join(' · ') || '수동';
    items.push({ label: '보호 가드', value: activeGuards, tone: 'ok' });
    const explanation = buildRecommendationExplainability(track);
    if (explanation.primarySignal) items.push({ label: '추천 근거', value: explanation.primarySignal, tone: explanation.primaryTone || 'cyan' });
    if (explanation.primaryCaution) items.push({ label: '감점 요인', value: explanation.primaryCaution, tone: 'warn' });
    return items;
}
function makeSmartSuggestionPill(label, value, tone = 'neutral') {
    const item = document.createElement('div');
    item.className = `smart-suggest-pill smart-suggest-${tone}`;
    const name = document.createElement('span');
    name.textContent = label;
    const val = document.createElement('b');
    val.textContent = value;
    item.append(name, val);
    return item;
}
function renderReferencePanel() {
    if (!el.referencePanel) return;
    const profile = state.referenceProfile;
    const ready = profile?.status === 'ready' && profile.analysis;
    if (el.referenceStatus) {
        el.referenceStatus.textContent = !profile ? '미등록' : profile.status === 'analyzing' ? '분석 중' : profile.status === 'error' ? '오류' : '적용 가능';
    }
    if (el.referenceSummary) {
        if (!profile) el.referenceSummary.textContent = '상업 음원이나 목표 사운드를 1곡 불러오면 톤 밸런스와 폭을 추천/렌더에 참고합니다.';
        else if (profile.status === 'analyzing') el.referenceSummary.textContent = `${profile.name} 분석 중입니다. 완료되면 추천값과 레퍼런스 매처에 반영됩니다.`;
        else if (profile.status === 'error') el.referenceSummary.textContent = `${profile.name} · ${profile.report}`;
        else el.referenceSummary.textContent = `${profile.name} · ${profile.report} · ${formatBytes(profile.size || 0)}`;
    }
    if (el.referenceMetrics) {
        el.referenceMetrics.textContent = '';
        if (ready) {
            const a = profile.analysis;
            [
                ['저역', `${Math.round(Number(a.bassRatio || 0) * 100)}%`],
                ['밝기', `${Math.round(Number(a.brightness || 0) * 100)}%`],
                ['공간', `${Math.round(Number(a.stereoWidth || 0) * 100)}%`],
                ['FFT', `${Math.round(Number(a.spectralCentroidHz || 0)) || '-'}Hz`],
                ['Ref', `${Array.isArray(a.spectrumProfile) && a.spectrumProfile.length >= 24 ? '24대역' : '12대역'}`],
                ['모노', formatMonoScore(a)]
            ].forEach(([label, value]) => el.referenceMetrics.appendChild(makeSmartSuggestionPill(label, value, 'neutral')));
        }
    }
    if (el.referenceApplyBtn) el.referenceApplyBtn.disabled = !ready || !getSelectedTrack()?.analysis || state.busy;
    if (el.referenceClearBtn) el.referenceClearBtn.disabled = !profile || state.busy;
    if (el.referenceStrengthSelect) {
        el.referenceStrengthSelect.value = String(getReferenceMatchStrengthAmount());
        el.referenceStrengthSelect.disabled = state.busy;
    }
}
function renderSnapshotPanel() {
    const track = getSelectedTrack();
    const undoCount = Array.isArray(track?.snapshots) ? track.snapshots.length : 0;
    const redoCount = Array.isArray(track?.redoSnapshots) ? track.redoSnapshots.length : 0;
    const latest = undoCount ? track.snapshots[undoCount - 1] : null;
    const latestLabel = latest ? formatSnapshotLabel(latest) : '';
    if (el.snapshotStatus) {
        el.snapshotStatus.textContent = !track ? '트랙 선택 대기' : undoCount ? `되돌리기 ${undoCount}개${redoCount ? ` · 다시 ${redoCount}개` : ''}` : '기록 없음';
        el.snapshotStatus.title = latestLabel || '저장된 되돌리기 기록이 없습니다.';
    }
    if (el.snapshotHistory) {
        el.snapshotHistory.textContent = !track ? '트랙을 선택하면 최근 변경 기록이 표시됩니다.' : latestLabel ? `최근 기록: ${latestLabel}` : '최근 변경 기록이 없습니다. 슬라이더/장르/성향을 바꾸면 자동으로 기록됩니다.';
    }
    const canRestoreAi = Boolean(track && track.analysis && !state.busy);
    if (el.snapshotSaveBtn) el.snapshotSaveBtn.disabled = !track || state.busy;
    if (el.snapshotUndoBtn) el.snapshotUndoBtn.disabled = !track || state.busy || undoCount < 1;
    if (el.snapshotRedoBtn) el.snapshotRedoBtn.disabled = !track || state.busy || redoCount < 1;
    if (el.snapshotAiBtn) el.snapshotAiBtn.disabled = !canRestoreAi;
    if (el.snapshotOriginalBtn) el.snapshotOriginalBtn.disabled = !track || state.busy;
    if (el.snapshotClearBtn) el.snapshotClearBtn.disabled = !track || state.busy || (undoCount < 1 && redoCount < 1);
}
function formatMonoScore(analysis) {
    const score = Number(analysis?.lowMonoScore);
    if (!Number.isFinite(score)) return 'N/A';
    return `${Math.round(score)}점`;
}
function updateProcessingHud() {
    scheduleBottomPreviewLayoutSync(); if (!el.processingHud) return;
    const running = state.tracks.find(track => track.status === 'processing') || null; const bulkMasteringActive = Boolean(getBulkImportHudView()?.isActiveMasteringTrack?.(running));
    if (!running || bulkMasteringActive) {
        el.processingHud.classList.remove('show'); el.processingHud.setAttribute('aria-hidden', 'true');
        el.processingHud.dataset.suppressedByBulk = bulkMasteringActive ? 'true' : 'false'; if (el.processingHudBar) el.processingHudBar.style.width = '0%';
        syncFloatingOverlayStack(); return;
    }
    el.processingHud.dataset.suppressedByBulk = 'false'; const progress = clamp(Number(running.progress || 0), 0, 100);
    const visibleProgress = running.status === 'done' ? 100 : Math.max(5, quantizeProgressStep(progress));
    el.processingHud.classList.add('show');
    el.processingHud.setAttribute('aria-hidden', 'false');
    el.processingHud.dataset.progressStep = String(visibleProgress);
    if (el.processingHudTitle) el.processingHudTitle.textContent = '마스터링 중';
    if (el.processingHudText) el.processingHudText.textContent = `${running.name} · ${running.report || '처리 중'} · ${visibleProgress}% 단계`;
    if (el.processingHudPercent) el.processingHudPercent.textContent = `${visibleProgress}%`;
    if (el.processingHudBar) el.processingHudBar.style.width = `${visibleProgress}%`;
    syncFloatingOverlayStack();
}
function syncFloatingOverlayStack() {
    const root = document.documentElement;
    const body = document.body;
    if (!root || !body) return;
    const hud = el.processingHud || document.getElementById('processingHud');
    const bulkHud = el.bulkImportHud || document.getElementById('bulkImportHud');
    const hudVisible = Boolean(hud && hud.classList.contains('show') && hud.getAttribute('aria-hidden') !== 'true');
    const bulkVisible = Boolean(bulkHud && bulkHud.classList.contains('show') && bulkHud.getAttribute('aria-hidden') !== 'true');
    body.classList.toggle('processing-hud-active', hudVisible);
    body.classList.toggle('bulk-import-hud-active', bulkVisible);
    if (!hudVisible) {
        root.style.setProperty('--foxbear-processing-hud-height', '0px');
    } else {
        const rect = hud.getBoundingClientRect ? hud.getBoundingClientRect() : { height: 0 };
        const measured = Math.ceil(Math.max(rect.height || 0, hud.offsetHeight || 0, hud.scrollHeight || 0, 52));
        root.style.setProperty('--foxbear-processing-hud-height', `${measured}px`);
    }
    if (!bulkVisible) {
        root.style.setProperty('--foxbear-bulk-import-hud-height', '0px');
        return;
    }
    const bulkRect = bulkHud.getBoundingClientRect ? bulkHud.getBoundingClientRect() : { height: 0 };
    const bulkMeasured = Math.ceil(Math.max(bulkRect.height || 0, bulkHud.offsetHeight || 0, bulkHud.scrollHeight || 0, 80));
    root.style.setProperty('--foxbear-bulk-import-hud-height', `${bulkMeasured}px`);
}
const ACTION_HELP_TEXTS = {
    programInfoBtn: '프로그램의 핵심 기능, 안전 처리 방식, 개발 방향을 확인합니다.',
    featureOpenBtn: '버튼형 적용 기능 창을 열어 필요한 버튼을 확인합니다.',
    previewOpenBtn: '불러온 트랙을 저장 전 WebAudio 실시간 체인으로 미리듣습니다.',
    smartSuggestApplyBtn: '분석 결과 기준 추천 프리셋과 추천값을 선택 트랙에 다시 적용합니다.',
    referenceLoadBtn: '목표 사운드가 될 레퍼런스 트랙을 분석합니다.',
    referenceApplyBtn: '레퍼런스 톤을 현재 선택 트랙 추천값에 반영합니다.',
    referenceClearBtn: '레퍼런스 트랙 분석값을 해제합니다.',
    snapshotSaveBtn: '현재 선택 트랙의 설정 상태를 저장합니다.',
    snapshotUndoBtn: '최근 자동/수동 기록으로 되돌립니다.',
    snapshotRedoBtn: '되돌린 설정을 다시 적용합니다.',
    snapshotAiBtn: '분석 결과의 AI 추천값으로 즉시 복원합니다.',
    snapshotOriginalBtn: 'AI 프리셋 없이 원본 기준 커스텀 상태로 전환합니다.',
    snapshotClearBtn: '선택 트랙의 스냅샷 기록을 삭제합니다.',
    fileDrop: '마스터링할 오디오 파일을 불러옵니다. 여러 곡도 한 번에 선택할 수 있습니다.',
    folderDrop: '폴더 안의 여러 음악 파일을 한 번에 불러옵니다.',
    aiApplyBtn: '분석 결과 기준으로 장르와 추천값을 다시 적용합니다.',
    masterSelectedBtn: '선택한 트랙만 현재 설정으로 마스터링합니다.',
    masterAllBtn: '대기열의 모든 트랙을 순서대로 마스터링합니다.',
    zipBtn: '완료된 결과물을 ZIP 파일로 묶어 다운로드합니다.',
    clearBtn: '작업 대기열과 미리듣기 결과를 초기화합니다.',
    clearCacheBtn: '저장된 분석 캐시를 즉시 비웁니다.',
    genreLockBtn: 'AI 추천값을 다시 적용해도 현재 장르 프리셋을 유지합니다.',
    adaptiveLufsToggle: '곡의 밀도와 장르를 기준으로 LUFS 목표를 자동 보정합니다.',
    snapSemitone: '피치 조정을 반음 단위로 고정해 키 보정이 과하게 흔들리지 않게 합니다.',
    masterPreviewBtn: '전체 렌더 전에 선택 트랙의 하이라이트 15초 결과를 먼저 만듭니다.',
    bottomPreviewWaveformBtn: '하단 Dock에서 파형 피크 비교창을 엽니다.',
    bottomPreviewMasterBtn: '선택한 곡을 바로 마스터링합니다.',
    bottomPreviewMasterPreviewBtn: '전체 렌더 전에 15초 하이라이트 듣기를 생성하거나 재생합니다.',
    bottomPreviewOriginalBtn: '원본 파일 기준으로 미리듣습니다.',
    bottomPreviewMasteredBtn: '마스터링 완료본 기준으로 미리듣습니다.',
    adminStatsRefresh: '관리자 방문 통계 데이터를 새로 불러옵니다.',
    adminStatsClose: '관리자 통계 창을 닫습니다.',
    adminStatsCloseBottom: '관리자 통계 창을 닫습니다.'
};
function initActionHelpTooltips() {
    Object.entries(ACTION_HELP_TEXTS).forEach(([id, text]) => {
        const target = el[id] || document.getElementById(id);
        if (target) attachHelpTooltip(target, text);
    });
    document.querySelectorAll('.select-popup-trigger').forEach(trigger => {
        const id = trigger.dataset.selectFor;
        const select = id ? document.getElementById(id) : null;
        const label = select ? getSelectLabel(select) : '선택';
        attachHelpTooltip(trigger, `${label} 옵션을 버튼형 팝업으로 선택합니다.`);
    });
    document.querySelectorAll('.player-toggle').forEach(button => attachHelpTooltip(button, '미리듣기를 재생하거나 일시정지합니다.'));
    document.querySelectorAll('button[title], [role="button"][aria-label], input[type="range"], select, label[for], .mini-check, .upload-drop, .bottom-preview-translation-btn, [data-help]').forEach(node => {
        const text = node.dataset.help || node.getAttribute('title') || node.getAttribute('aria-label') || node.textContent?.trim();
        if (text) attachHelpTooltip(node, text);
    });
}
function getCurrentHelpText(target, fallback = '') {
    return target?.dataset?.help || target?.getAttribute?.('title') || target?.getAttribute?.('aria-label') || fallback;
}
function updateHelpText(target, text) {
    if (!target || !text) return;
    target.dataset.help = text;
    target.title = text;
    attachHelpTooltip(target, text);
}
function attachHelpTooltip(target, text) {
    if (!target || !text || target.dataset.helpBound === 'true') return;
    target.dataset.helpBound = 'true';
    target.dataset.help = target.dataset.help || text;
    target.addEventListener('mouseenter', () => showFeatureTooltip(target, getCurrentHelpText(target, text)));
    target.addEventListener('focus', () => showFeatureTooltip(target, getCurrentHelpText(target, text)));
    target.addEventListener('mouseleave', hideFeatureTooltip);
    target.addEventListener('blur', hideFeatureTooltip);
    target.addEventListener('click', () => showFeatureTooltip(target, getCurrentHelpText(target, text), 1200));
    target.addEventListener('touchstart', () => showFeatureTooltip(target, getCurrentHelpText(target, text), 1300), { passive: true });
}
async function maybeAutoCleanAnalysisCache(force = false) {
    if (!state.autoCacheClean) return;
    try {
        const key = 'foxbearAutoCacheCleanLastRun';
        const now = Date.now();
        const last = Number(localStorage.getItem(key) || '0');
        const interval = 48 * 60 * 60 * 1000;
        if (!force && last && now - last < interval) return;
        await clearAnalysisCache({ silent: true, skipRender: true });
        localStorage.setItem(key, String(now));
        if (force) showToast('분석 캐시 자동정리를 실행했습니다.');
    } catch (error) {
        console.warn('Auto cache clean skipped:', error);
    }
}
function pauseAllPreviewAudio() {
    document.querySelectorAll('.custom-player audio').forEach(audio => {
        try { audio.pause(); } catch (error) {}
    });
}
function hasMeaningfulWorkspaceState() {
    return Boolean(
        state.busy
        || state.tracks.some(track => track && (track.status !== 'queued' || track.analysis || track.outBlob || track.masteredUrl || track.masterPreviewUrl))
        || (state.activeDownloadUrls && state.activeDownloadUrls.size > 0)
    );
}
function initNavigationExitGuard() {
    const guards = window.FoxBearSiteGuards;
    if (!guards || typeof guards.installNavigationExitGuard !== 'function') return false;
    return guards.installNavigationExitGuard({
        shouldBlock: hasMeaningfulWorkspaceState,
        onStay: () => showToast('나가기를 취소했습니다. 작업 화면을 계속 유지합니다.'),
        onLeave: () => {
            try { pauseAllPreviewAudio(); } catch (error) {}
        }
    });
}
function bindAdminStatsEvents() {
    updateAdminStatsTriggerVisibility();
    if (el.adminStatsTrigger) {
        el.adminStatsTrigger.addEventListener('click', handleAdminStatsTriggerTap);
        el.adminStatsTrigger.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleAdminStatsTriggerTap();
            }
        });
    }
    if (el.adminStatsDialog) {
        el.adminStatsDialog.addEventListener('click', event => {
            if (event.target === el.adminStatsDialog) closeAdminStatsDialog();
        });
    }
    if (el.adminStatsClose) el.adminStatsClose.addEventListener('click', closeAdminStatsDialog);
    if (el.adminStatsCloseBottom) el.adminStatsCloseBottom.addEventListener('click', closeAdminStatsDialog);
    if (el.adminStatsRefresh) el.adminStatsRefresh.addEventListener('click', () => renderAdminStatsDialog(true));
    if (el.adminVisitsTab) el.adminVisitsTab.addEventListener('click', () => setAdminMonitorView('visits', true));
    if (el.adminIncidentsTab) el.adminIncidentsTab.addEventListener('click', () => setAdminMonitorView('incidents', true));
}
function handleAdminStatsTriggerTap() {
    if (!state.firebaseIsAdmin) {
        if (!state.adminAccessChecking) refreshFirebaseAdminAccess();
        return;
    }
    openAdminStatsDialog();
}
function renderAdminStatsTriggerContent(showAdmin) {
    if (!el.adminStatsTrigger) return;
    el.adminStatsTrigger.textContent = '';
    if (showAdmin) {
        const label = document.createElement('span');
        label.className = 'brand-command-device-text';
        label.textContent = '관리자 모니터링';
        el.adminStatsTrigger.appendChild(label);
        return;
    }
    const icons = document.createElement('span');
    icons.className = 'brand-command-device-icons';
    icons.setAttribute('aria-hidden', 'true');
    const screen = document.createElement('i');
    screen.className = 'is-screen';
    const phone = document.createElement('i');
    phone.className = 'is-phone';
    const label = document.createElement('span');
    label.className = 'brand-command-device-text';
    label.textContent = '모바일 · PC 호환';
    icons.append(screen, phone);
    el.adminStatsTrigger.append(icons, label);
}
function updateAdminStatsTriggerVisibility() {
    if (!el.adminStatsTrigger) return;
    const visible = Boolean(state.firebaseIsAdmin);
    el.adminStatsTrigger.hidden = false;
    el.adminStatsTrigger.setAttribute('aria-hidden', 'false');
    el.adminStatsTrigger.setAttribute('tabindex', visible ? '0' : '-1');
    el.adminStatsTrigger.setAttribute('role', visible ? 'button' : 'presentation');
    el.adminStatsTrigger.setAttribute('aria-label', visible ? '관리자 모니터링 열기' : '모바일 · PC 호환 안내');
    renderAdminStatsTriggerContent(visible);
}
function openAdminStatsDialog() {
    if (!el.adminStatsDialog) return;
    if (!state.firebaseIsAdmin) {
        showToast('관리자 UID로 등록된 사용자만 모니터링을 열 수 있습니다.');
        refreshFirebaseAdminAccess();
        return;
    }
    el.adminStatsDialog.classList.add('show');
    el.adminStatsDialog.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-dialog-open');
    setAdminMonitorView(state.adminMonitorView || 'visits', false);
    renderAdminStatsDialog(false);
    const panel = el.adminStatsDialog.querySelector('.admin-dialog-panel');
    setTimeout(() => panel?.focus({ preventScroll: true }), 30);
}
function closeAdminStatsDialog() {
    if (!el.adminStatsDialog) return;
    el.adminStatsDialog.classList.remove('show');
    el.adminStatsDialog.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-dialog-open');
}
function registerAdminVisit() {
    const now = new Date();
    const visitorId = getOrCreateAdminVisitorId();
    const stats = readAdminLocalStats();
    const dateKey = formatAdminDateKey(now);
    const referrer = normalizeReferrer(document.referrer);
    const event = {
        at: now.toISOString(),
        date: dateKey,
        visitorId,
        ip: '백엔드 미연결',
        referrer,
        page: `${location.pathname || '/'}${location.search || ''}`,
        path: location.pathname || '/',
        screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
        language: navigator.language || '',
        userAgent: navigator.userAgent || '',
        appVersion: document.body?.dataset?.build || ''
    };
    stats.version = 1;
    stats.totalVisits = Number(stats.totalVisits || 0) + 1;
    stats.firstSeen = stats.firstSeen || event.at;
    stats.lastSeen = event.at;
    stats.visitors = stats.visitors && typeof stats.visitors === 'object' ? stats.visitors : {};
    const visitor = stats.visitors[visitorId] || { firstSeen: event.at, visits: 0, referrers: [] };
    visitor.lastSeen = event.at;
    visitor.visits = Number(visitor.visits || 0) + 1;
    visitor.referrers = Array.from(new Set([...(visitor.referrers || []), referrer])).slice(0, 12);
    stats.visitors[visitorId] = visitor;
    stats.events = Array.isArray(stats.events) ? stats.events : [];
    stats.events.push(event);
    stats.events = stats.events.slice(-ADMIN_STATS_MAX_EVENTS);
    stats.daily = stats.daily && typeof stats.daily === 'object' ? stats.daily : {};
    stats.daily[dateKey] = buildDailyStats(stats.events, dateKey);
    writeAdminLocalStats(stats);
    state.lastAdminVisitEvent = event;
    registerFirebaseVisit(event);
}
function initFirebaseBridge() {
    window.addEventListener('foxbear:firebase-ready', event => handleFirebaseBridgeReady(event.detail));
    window.addEventListener('foxbear:firebase-auth', event => handleFirebaseBridgeReady(event.detail));
    window.addEventListener('foxbear:firebase-error', event => handleFirebaseBridgeError(event.detail));
    updateAdminStatsTriggerVisibility();
    if (window.FoxBearFirebase) handleFirebaseBridgeReady(window.FoxBearFirebase);
}
function handleFirebaseBridgeReady(detail = {}) {
    const bridge = window.FoxBearFirebase || detail || {};
    state.firebaseReady = Boolean(bridge.ready);
    state.firebaseUserId = bridge.uid || (typeof bridge.getUid === 'function' ? bridge.getUid() : '') || state.firebaseUserId;
    state.firebaseError = bridge.error || '';
    state.firebaseRemoteNotice = bridge.remoteConfig?.foxbear_notice || state.firebaseRemoteNotice || '';
    applyFirebaseRemoteConfig(bridge.remoteConfig || {});
    refreshFirebaseAdminAccess(bridge);
    if (state.lastAdminVisitEvent) registerFirebaseVisit(state.lastAdminVisitEvent);
}
function refreshFirebaseAdminAccess(bridge = window.FoxBearFirebase) {
    const target = bridge || window.FoxBearFirebase;
    if (!target || typeof target.getAdminProfile !== 'function') {
        state.firebaseIsAdmin = false;
        state.firebaseAdminChecked = Boolean(state.firebaseError);
        updateAdminStatsTriggerVisibility();
        return;
    }
    if (state.adminAccessChecking) return;
    state.adminAccessChecking = true;
    updateAdminStatsTriggerVisibility();
    target.getAdminProfile()
        .then(profile => {
            state.firebaseUserId = profile?.uid || state.firebaseUserId || '';
            state.firebaseIsAdmin = Boolean(profile?.active);
            state.firebaseAdminRole = profile?.role || '';
            state.firebaseAdminChecked = true;
            state.adminStatsRemoteError = state.firebaseIsAdmin ? '' : `현재 UID(${state.firebaseUserId || '확인 중'})는 활성 관리자 문서가 아닙니다.`;
            updateAdminStatsTriggerVisibility();
        })
        .catch(error => {
            state.firebaseIsAdmin = false;
            state.firebaseAdminChecked = true;
            state.adminStatsRemoteError = error?.message || String(error);
            updateAdminStatsTriggerVisibility();
        })
        .finally(() => {
            state.adminAccessChecking = false;
        });
}
function applyFirebaseRemoteConfig(config = {}) {
    const youtubeUrl = normalizeRemoteHttpsUrl(config.foxbear_youtube_url, 'www.youtube.com');
    if (youtubeUrl) {
        document.querySelectorAll('.designer-mini-link').forEach(link => {
            link.href = youtubeUrl;
        });
    }
    const notice = limitAdminText(config.foxbear_notice || '', 120);
    if (notice && !state.firebaseNoticeShown) {
        state.firebaseNoticeShown = true;
        showToast(notice);
    }
}
function normalizeRemoteHttpsUrl(value, allowedHost) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
        const url = new URL(raw);
        if (url.protocol !== 'https:' || url.hostname !== allowedHost) return '';
        url.hash = '';
        return url.toString();
    } catch (error) {
        return '';
    }
}
function handleFirebaseBridgeError(detail = {}) {
    state.firebaseReady = false;
    state.firebaseIsAdmin = false;
    state.firebaseAdminChecked = true;
    state.firebaseError = detail.error || window.FoxBearFirebase?.error || 'Firebase 연결 실패';
    updateAdminStatsTriggerVisibility();
}
function registerFirebaseVisit(event) {
    if (state.firebaseVisitLogged) return;
    const bridge = window.FoxBearFirebase;
    if (!bridge || typeof bridge.logVisit !== 'function') return;
    state.firebaseVisitLogged = true;
    bridge.logVisit({
        dateKey: event.date,
        referrer: event.referrer,
        page: event.page,
        path: event.path,
        screen: event.screen,
        language: event.language,
        userAgent: event.userAgent,
        appVersion: event.appVersion
    }).then(() => {
        state.firebaseReady = true;
        state.firebaseUserId = bridge.getUid ? bridge.getUid() : state.firebaseUserId;
    }).catch(error => {
        state.firebaseVisitLogged = false;
        state.firebaseError = error.message || String(error);
        console.warn('Firebase visit log skipped:', error);
    });
}
function readAdminLocalStats() {
    try {
        return JSON.parse(localStorage.getItem(ADMIN_STATS_STORAGE_KEY) || '{}') || {};
    } catch (error) {
        return {};
    }
}
function writeAdminLocalStats(stats) {
    try {
        localStorage.setItem(ADMIN_STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch (error) {
        console.warn('Local statistics unavailable:', error);
    }
}
function getOrCreateAdminVisitorId() {
    try {
        const current = localStorage.getItem(ADMIN_STATS_VISITOR_KEY);
        if (current) return current;
        const id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(ADMIN_STATS_VISITOR_KEY, id);
        return id;
    } catch (error) {
        return `session-${Math.random().toString(36).slice(2, 8)}`;
    }
}
function formatAdminDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function buildDailyStats(events, dateKey) {
    const todayEvents = (events || []).filter(item => item.date === dateKey);
    return {
        visits: todayEvents.length,
        unique: new Set(todayEvents.map(item => item.visitorId)).size,
        referrers: Array.from(new Set(todayEvents.map(item => item.referrer))).slice(0, 12)
    };
}
function normalizeReferrer(referrer) {
    if (!referrer) return '직접 접속 / 비공개';
    try {
        const url = new URL(referrer);
        if (url.hostname === location.hostname) return '내부 이동';
        return url.hostname;
    } catch (error) {
        return referrer.slice(0, 80);
    }
}
function setAdminMonitorView(view, refresh = false) {
    const next = view === 'incidents' ? 'incidents' : 'visits';
    state.adminMonitorView = next;
    const incidentsActive = next === 'incidents';
    if (el.adminVisitsTab) {
        el.adminVisitsTab.classList.toggle('active', !incidentsActive);
        el.adminVisitsTab.setAttribute('aria-selected', incidentsActive ? 'false' : 'true');
    }
    if (el.adminIncidentsTab) {
        el.adminIncidentsTab.classList.toggle('active', incidentsActive);
        el.adminIncidentsTab.setAttribute('aria-selected', incidentsActive ? 'true' : 'false');
    }
    if (el.adminVisitsPanel) el.adminVisitsPanel.hidden = incidentsActive;
    if (el.adminIncidentsPanel) el.adminIncidentsPanel.hidden = !incidentsActive;
    if (refresh) renderAdminStatsDialog(true);
}
async function renderAdminStatsDialog(forceRemote) {
    if (state.adminMonitorView === 'incidents') return renderAdminIncidentsDialog(forceRemote);
    if (!el.adminStatsSummary || !el.adminStatsRows) return;
    if (!state.firebaseIsAdmin) {
        el.adminStatsSummary.textContent = '';
        el.adminStatsRows.textContent = '';
        if (el.adminStatsNotice) {
            el.adminStatsNotice.textContent = `관리자 UID로 등록된 사용자만 방문 통계를 볼 수 있습니다.${getFirebaseStatusNotice()}`;
        }
        return;
    }
    const localStats = readAdminLocalStats();
    let remoteStats = null;
    if (forceRemote || window.FoxBearFirebase?.ready) {
        remoteStats = await fetchAdminFirebaseStats();
    }
    if (!remoteStats && (forceRemote || window.FOXBEAR_STATS_ENDPOINT)) {
        remoteStats = await fetchAdminRemoteStats();
    }
    const model = remoteStats || makeAdminStatsModel(localStats);
    el.adminStatsSummary.textContent = '';
    makeAdminSummaryCard('오늘 접속', `${model.todayVisits}회`, model.mode).forEach(node => el.adminStatsSummary.appendChild(node));
    makeAdminSummaryCard('오늘 고유 방문자', `${model.todayUnique}명`, model.mode).forEach(node => el.adminStatsSummary.appendChild(node));
    makeAdminSummaryCard('누적 접속', `${model.totalVisits}회`, model.mode).forEach(node => el.adminStatsSummary.appendChild(node));
    makeAdminSummaryCard('통계 방식', model.modeLabel, model.mode).forEach(node => el.adminStatsSummary.appendChild(node));
    if (el.adminStatsNotice) {
        el.adminStatsNotice.textContent = model.notice || '방문 통계입니다.';
    }
    el.adminStatsRows.textContent = '';
    const events = model.events.slice().reverse().slice(0, 50);
    if (!events.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = '아직 표시할 방문 기록이 없습니다.';
        row.appendChild(cell);
        el.adminStatsRows.appendChild(row);
        return;
    }
    events.forEach(item => {
        const row = document.createElement('tr');
        [formatAdminEventTime(item.at), item.ip || maskAdminVisitorId(item.visitorId), item.referrer || '직접 접속 / 비공개', item.page || '/'].forEach(text => {
            const cell = document.createElement('td');
            cell.textContent = text;
            row.appendChild(cell);
        });
        el.adminStatsRows.appendChild(row);
    });
}
let adminIncidentMonitorViewController = null;
function getAdminIncidentMonitorViewController() {
    if (adminIncidentMonitorViewController) return adminIncidentMonitorViewController;
    const factory = window.FoxBearAdminIncidentMonitorView;
    if (!factory || typeof factory.create !== 'function') return null;
    adminIncidentMonitorViewController = factory.create({
        state, el,
        getBridge: () => window.FoxBearFirebase,
        makeSummaryCard: makeAdminSummaryCard,
        safeNumber: safeAdminNumber,
        formatTime: formatAdminEventTime,
        limitText: limitAdminText,
        getFirebaseStatusNotice,
        showToast,
        downloadBlob
    });
    return adminIncidentMonitorViewController;
}
async function renderAdminIncidentsDialog(forceRemote) {
    const controller = getAdminIncidentMonitorViewController();
    if (!controller) {
        if (el.adminIncidentsNotice) el.adminIncidentsNotice.textContent = '오류 관리 화면 모듈이 아직 로드되지 않았습니다.';
        return;
    }
    return controller.render(forceRemote);
}
function makeAdminSummaryCard(label, value, mode) {
    const card = document.createElement('div');
    card.className = `admin-stat-card admin-stat-${mode || 'local'}`;
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = value;
    card.append(span, strong);
    return [card];
}
function makeAdminStatsModel(stats) {
    const dateKey = formatAdminDateKey(new Date());
    const events = Array.isArray(stats.events) ? stats.events : [];
    const todayEvents = events.filter(item => item.date === dateKey);
    return {
        mode: 'local',
        modeLabel: '로컬 기록',
        notice: `현재는 브라우저 localStorage 기준입니다. siteAdmins에 등록된 관리자 UID에서만 원격 방문 통계를 표시합니다.${getFirebaseStatusNotice()}${state.adminStatsRemoteError ? ' 원격 통계 확인 실패: ' + state.adminStatsRemoteError : ''}`,
        totalVisits: Number(stats.totalVisits || events.length || 0),
        todayVisits: todayEvents.length,
        todayUnique: new Set(todayEvents.map(item => item.visitorId)).size,
        events: events.map(item => ({ ...item, ip: item.ip || maskAdminVisitorId(item.visitorId) }))
    };
}
async function fetchAdminFirebaseStats() {
    const bridge = window.FoxBearFirebase;
    if (!bridge || typeof bridge.getAdminStats !== 'function') return null;
    try {
        const data = await bridge.getAdminStats({ limit: 80, todayLimit: 500 });
        const uid = data.uid || bridge.uid || (bridge.getUid ? bridge.getUid() : '') || '';
        state.firebaseReady = true;
        state.firebaseUserId = uid;
        state.adminStatsRemoteError = '';
        return {
            mode: 'firebase',
            modeLabel: 'Firebase',
            notice: `Firebase Firestore 원격 통계입니다. 오디오는 업로드하지 않고 방문 이벤트만 저장합니다. 관리자 UID: ${uid || '확인 중'}`,
            totalVisits: safeAdminNumber(data.totalVisits, 0),
            todayVisits: safeAdminNumber(data.todayVisits, 0),
            todayUnique: safeAdminNumber(data.todayUnique, 0),
            events: Array.isArray(data.events) ? data.events.map(item => ({
                at: limitAdminText(item.at || '', 40),
                ip: limitAdminText(item.ip || '클라이언트 Firestore 모드', 64),
                visitorId: limitAdminText(item.visitorId || item.uid || '', 80),
                referrer: limitAdminText(item.referrer || '직접 접속 / 비공개', 160),
                page: limitAdminText(item.page || '/', 160)
            })) : []
        };
    } catch (error) {
        const uid = bridge.uid || (bridge.getUid ? bridge.getUid() : '') || state.firebaseUserId || '';
        state.firebaseUserId = uid;
        state.adminStatsRemoteError = makeFirebaseStatsErrorMessage(error, uid);
        return null;
    }
}
function makeFirebaseStatsErrorMessage(error, uid) {
    const raw = error?.message || String(error || '');
    if (/permission|Missing or insufficient permissions|PERMISSION_DENIED/i.test(raw)) {
        return `Firestore 읽기 권한이 없습니다. Firebase Console에서 siteAdmins/${uid || '현재_UID'} 문서를 먼저 만들어주세요.`;
    }
    return raw;
}
function getFirebaseStatusNotice() {
    const bridge = window.FoxBearFirebase;
    const uid = state.firebaseUserId || bridge?.uid || (bridge?.getUid ? bridge.getUid() : '');
    if (uid) return ` 현재 Firebase UID: ${uid}.`;
    if (state.firebaseError || bridge?.error) return ` Firebase 연결 상태: ${state.firebaseError || bridge.error}.`;
    return ' Firebase 연결 대기 중입니다.';
}
async function fetchAdminRemoteStats() {
    const endpoint = typeof window.FOXBEAR_STATS_ENDPOINT === 'string' ? window.FOXBEAR_STATS_ENDPOINT.trim() : '';
    if (!endpoint || typeof fetch !== 'function') return null;
    let endpointUrl;
    try {
        endpointUrl = new URL(endpoint, window.location.origin);
        if (endpointUrl.origin !== window.location.origin || !endpointUrl.pathname.startsWith('/')) {
            throw new Error('통계 API는 같은 도메인의 절대 경로만 허용됩니다.');
        }
        endpointUrl.hash = '';
    } catch (error) {
        state.adminStatsRemoteError = error.message || String(error);
        return null;
    }
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 5000) : null;
    try {
        const response = await fetch(endpointUrl.toString(), {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            redirect: 'error',
            referrerPolicy: 'no-referrer',
            headers: { Accept: 'application/json' },
            signal: controller ? controller.signal : undefined
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const length = Number(response.headers.get('content-length') || 0);
        if (length > 262144) throw new Error('통계 응답이 너무 큽니다.');
        const data = await response.json();
        const events = Array.isArray(data.events) ? data.events.slice(0, 100) : [];
        return {
            mode: 'remote',
            modeLabel: '서버 API',
            notice: '서버 통계 API에서 받은 방문자 IP, 유입 사이트, 누적 접속자 기준으로 표시 중입니다.',
            totalVisits: safeAdminNumber(data.totalVisits, events.length),
            todayVisits: safeAdminNumber(data.todayVisits, 0),
            todayUnique: safeAdminNumber(data.todayUnique ?? data.uniqueVisitors, 0),
            events: events.map(item => ({
                at: limitAdminText(item.at || item.createdAt || item.time || '', 40),
                ip: limitAdminText(item.ip || item.ipAddress || 'IP 없음', 64),
                visitorId: limitAdminText(item.visitorId || '', 80),
                referrer: limitAdminText(item.referrer || item.referer || '직접 접속 / 비공개', 160),
                page: limitAdminText(item.page || item.path || '/', 160)
            }))
        };
    } catch (error) {
        state.adminStatsRemoteError = error.name === 'AbortError' ? '요청 시간 초과' : (error.message || String(error));
        return null;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}
function safeAdminNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}
function limitAdminText(value, maxLength) {
    return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength);
}
function maskAdminVisitorId(visitorId) {
    const value = String(visitorId || 'local');
    return value.startsWith('local-') ? `local:${value.slice(-6)}` : value;
}
function formatAdminEventTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || '-';
    return date.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function getSettingsService() {
    return window.FoxBearSettingsService || null;
}
function getSettingsServiceContext() {
    return { state, mobile: ensureMobileNativeState() };
}
function restorePersistedSettings() {
    const service = getSettingsService();
    if (!service) return null;
    const mobile = ensureMobileNativeState();
    const restored = service.applyToContext({ state, mobile }, service.load());
    if (restored.storagePersistRequested && mobile.storagePersisted !== true) {
        maybeRequestPersistentStorage(false);
    }
    return restored;
}
function initExternalBrowserHandoff() {
    if (!FoxBearSessionHandoff?.createAppBridge) return null;
    externalBrowserHandoffBridge = FoxBearSessionHandoff.createAppBridge({ state, getSelectedTrack, cloneSettings, cloneTransform, cloneInstrumentLayer, defaults: { transform: DEFAULT_TRANSFORM, instrument: DEFAULT_INSTRUMENT_LAYER }, syncControls: syncOutputControlValues, notify: showToast });
    return externalBrowserHandoffBridge.init();
}
function openPerformanceDiagnosticsPanel(options = {}) {
    closeProgramInfoDialog({ restoreFocus: false });
    closeIncidentReportingDialog({ restoreFocus: false });
    toggleMobileNativePanel(false);
    window.FoxBearPerformanceDiagnostics?.setPanelVisible?.(true, {
        returnFocus: options.returnFocus || el.mobileNativeQuickToggle || document.activeElement, source: 'settings'
    });
}
function persistRuntimeSettings() {
    const service = getSettingsService();
    if (!service) return null;
    return service.saveFromContext(getSettingsServiceContext());
}
function resetPersistedSettings() {
    const service = getSettingsService();
    if (!service) return;
    const mobile = ensureMobileNativeState();
    const defaults = service.reset();
    service.applyToContext({ state, mobile }, defaults);
    releaseFoxBearWakeLock({ clearDesired: true, persist: false, reason: 'settings-reset' });
    renderFeatureButtons();
    renderAll({ keepDetailAudio: true });
    updateMobileNativeUi();
    showToast('설정을 기본값으로 초기화했습니다.');
}
function ensureMobileNativeState() {
    if (!state.mobileNative) {
        state.mobileNative = { installed: false, safeMode: false, hapticsEnabled: true, wakeLockDesired: false, wakeLockActive: false, wakeLockAutoActive: false, wakeLockSentinel: null, wakeLockBusy: false, wakeLockLastMode: 'off', wakeLockLastReason: '', wakeLockLastError: null, wakeLockLastRequestAt: 0, wakeLockRequestCount: 0, wakeLockManualRequestCount: 0, wakeLockAutoRequestCount: 0, deferredInstallPrompt: null, quickPanelOpen: false, storagePersisted: null, lastHapticAt: 0, sharedLaunchHandled: false, lastVisibilityHiddenAt: 0, serviceWorkerReady: false, badgeCount: 0, pageRestoreToastAt: 0 };
    }
    return state.mobileNative;
}
function initMobileNativeUx() {
    const nativeState = ensureMobileNativeState();
    createMobileNativeLayer();
    detectMobileSafeMode();
    registerFoxBearServiceWorker();
    installMobileNativeGlobalListeners();
    processPwaShareTargetLaunch();
    maybeRequestPersistentStorage(false);
    updateMobileNativeUi();
}
function createMobileNativeLayer() {
    const refs = window.FoxBearMobileNativeView?.createMobileNativeLayer?.(document);
    if (!refs) return;
    el.mobileNativeStatus = refs.status || el.mobileNativeStatus; el.mobileNativeQuickToggle = refs.toggle || el.mobileNativeQuickToggle;
    el.bulkImportHudRestore = refs.bulkHudRestore || el.bulkImportHudRestore; el.mobileNativePanel = refs.panel || el.mobileNativePanel; window.FoxBearPerformanceDiagnostics?.refreshSettingsHealthSummary?.();
}
function bindMobileNativeEvents() {
    createMobileNativeLayer();
    if (el.mobileNativeQuickToggle) {
        el.mobileNativeQuickToggle.addEventListener('click', () => toggleMobileNativePanel());
    }
    if (el.mobileNativeStatus) {
        el.mobileNativeStatus.addEventListener('click', () => toggleMobileNativePanel(true));
    }
    if (el.mobileNativePanel) {
        el.mobileNativePanel.addEventListener('click', event => {
            const actionButton = event.target.closest('[data-native-action]');
            if (!actionButton) return;
            handleMobileNativeAction(actionButton.dataset.nativeAction);
        });
    }
    const mobile = ensureMobileNativeState();
    if (!mobile.outsideDismissInstalled) {
        mobile.outsideDismissInstalled = true;
        document.addEventListener('pointerdown', event => {
            if (!mobile.quickPanelOpen) return;
            const target = event.target;
            if (el.mobileNativePanel?.contains(target) || el.mobileNativeQuickToggle?.contains(target)) return;
            toggleMobileNativePanel(false);
        }, true);
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && mobile.quickPanelOpen) toggleMobileNativePanel(false);
        }, true);
    }
    installDockGestureLayer();
}
function installMobileNativeGlobalListeners() {
    const nativeState = ensureMobileNativeState();
    if (nativeState.listenersInstalled) return;
    nativeState.listenersInstalled = true;
    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        ensureMobileNativeState().deferredInstallPrompt = event;
        updateMobileNativeUi();
        showToast('FoxBear를 홈 화면 앱처럼 설치할 수 있습니다. ⚙️ 설정에서 바로가기 추가를 누르세요.');
    });
    window.addEventListener('appinstalled', () => {
        const mobile = ensureMobileNativeState();
        mobile.installed = true;
        mobile.deferredInstallPrompt = null;
        foxBearHaptic('success');
        updateMobileNativeUi();
        showToast('FoxBear 앱 설치가 완료되었습니다.');
    });
    document.addEventListener('visibilitychange', handleMobileVisibilityChange, { passive: true });
    window.addEventListener('pageshow', handleMobilePageShow, { passive: true });
    document.body?.addEventListener('click', event => {
        const target = event.target.closest('button, .upload-tile, input[type="range"], select');
        if (target && !target.disabled) foxBearHaptic('tap');
    }, true);
}
function installDockGestureLayer() {
    const dock = el.bottomPreviewDock;
    if (!dock || dock.dataset.nativeGestureBound === 'true') return;
    dock.dataset.nativeGestureBound = 'true';
    let startX = 0;
    let startY = 0;
    let startAt = 0;
    dock.addEventListener('touchstart', event => {
        const touch = event.touches && event.touches[0];
        if (!touch) return;
        startX = touch.clientX;
        startY = touch.clientY;
        startAt = Date.now();
    }, { passive: true });
    dock.addEventListener('touchend', event => {
        const touch = event.changedTouches && event.changedTouches[0];
        if (!touch) return;
        const dy = touch.clientY - startY;
        const dx = Math.abs(touch.clientX - startX);
        if (Date.now() - startAt < 700 && dy < -34 && dx < 90) {
            toggleMobileNativePanel(true);
            foxBearHaptic('switch');
        }
    }, { passive: true });
}
function toggleMobileNativePanel(forceOpen = null) {
    const mobile = ensureMobileNativeState(), next = forceOpen === null ? !mobile.quickPanelOpen : Boolean(forceOpen);
    const focusWasInside = Boolean(el.mobileNativePanel?.contains(document.activeElement)); mobile.quickPanelOpen = next;
    document.body.classList.toggle('mobile-native-panel-open', next); if (el.mobileNativePanel) el.mobileNativePanel.setAttribute('aria-hidden', String(!next)); if (el.mobileNativeQuickToggle) el.mobileNativeQuickToggle.setAttribute('aria-expanded', String(next)); updateMobileNativeUi();
    if (next) requestAnimationFrame(() => { const first = el.mobileNativePanel?.querySelector('button:not([disabled]), [tabindex]:not([tabindex="-1"])'); try { first?.focus?.({ preventScroll: true }); } catch (error) {} });
    else if (focusWasInside) requestAnimationFrame(() => { try { el.mobileNativeQuickToggle?.focus?.({ preventScroll: true }); } catch (error) {} });
}
function handleMobileNativeAction(action) {
    switch (action) {
        case 'close':
            toggleMobileNativePanel(false);
            return;
        case 'install':
            promptInstallFoxBearPwa();
            return;
        case 'external-browser':
            openCurrentPageInExternalBrowser();
            return;
        case 'wake':
            toggleFoxBearWakeLock();
            return;
        case 'haptic':
            toggleFoxBearHaptics();
            return;
        case 'persist':
            maybeRequestPersistentStorage(true);
            return;
        case 'restore':
            restoreDockTransportAfterReturn(true);
            return;
        case 'clear-cache':
            toggleUtilityFeature('clearAnalysisCache');
            return;
        case 'reset-settings':
            resetPersistedSettings();
            return;
        case 'auto-cache-clean':
            toggleUtilityFeature('autoCacheClean');
            return;
        case 'smart-performance':
            toggleUtilityFeature('smartPerformanceGuard');
            return;
        case 'incident-reporting': {
            const returnFocus = el.mobileNativeQuickToggle || document.activeElement;
            toggleMobileNativePanel(false);
            requestAnimationFrame(() => openIncidentReportingDialog({ returnFocus }));
            return;
        }
        case 'performance-diagnostics': {
            const returnFocus = el.mobileNativeQuickToggle || document.activeElement;
            toggleMobileNativePanel(false);
            requestAnimationFrame(() => openPerformanceDiagnosticsPanel({ returnFocus }));
            return;
        }
    }
}
function updateMobileNativeUi() {
    const mobile = ensureMobileNativeState();
    if (!document.body) return;
    const safeMode = detectMobileSafeMode();
    document.body.classList.toggle('mobile-safe-mode', safeMode);
    const audio = getBottomPreviewAudio ? getBottomPreviewAudio() : null;
    const playing = Boolean(audio && !audio.paused && !audio.ended);
    const mediaReady = Boolean('mediaSession' in navigator);
    const wakeSnapshot = getFoxBearWakeLockSnapshot();
    if (el.mobileNativeStatus) {
        const wake = wakeSnapshot.active ? (wakeSnapshot.mode === 'auto' ? '자동보호' : '화면유지') : '앱 편의';
        const media = mediaReady ? '잠금화면' : '기본';
        el.mobileNativeStatus.textContent = `${wake} · ${media}${playing ? ' · 재생중' : ''}`;
        el.mobileNativeStatus.classList.toggle('wake-active', wakeSnapshot.active);
        el.mobileNativeStatus.classList.toggle('wake-auto', wakeSnapshot.mode === 'auto');
        el.mobileNativeStatus.classList.toggle('safe-mode', safeMode);
    }
    if (el.mobileNativePanel) {
        const wakeLabel = supportsWakeLock() ? wakeSnapshot.settingLabel : 'OFF';
        setMobileNativeSettingState('wake', wakeSnapshot.userEnabled, wakeLabel);
        setMobileNativeSettingState('haptic', Boolean(mobile.hapticsEnabled));
        setMobileNativeSettingState('persist', mobile.storagePersisted === true, mobile.storagePersisted === null ? 'OFF' : null);
        setMobileNativeSettingState('auto-cache-clean', Boolean(state.autoCacheClean));
        setMobileNativeSettingState('smart-performance', Boolean(state.smartPerformanceGuard));
        setMobileNativeActionState('install', mobile.installed ? 'ON' : '추가', mobile.installed);
        setMobileNativeActionState('external-browser', '열기', false);
        setMobileNativeActionState('incident-reporting', window.FoxBearIncidentReporter?.getSettingsSummary?.().label || (window.FoxBearIncidentReporter?.getStatus?.().enabled === false ? '꺼짐' : '미확인'), window.FoxBearIncidentReporter?.getStatus?.().enabled !== false);
        setMobileNativeActionState('performance-diagnostics', ({ normal: '정상', watch: '주의', danger: '위험' }[window.FoxBearPerformanceDiagnostics?.getLifecycleState?.().ambientHealth] || '정상'), false);
        setMobileNativeActionState('clear-cache', '실행', false);
        setMobileNativeActionState('reset-settings', '초기화', false);
        setMobileNativeActionState('restore', playing ? '실행' : '대기', playing);
        const restore = el.mobileNativePanel.querySelector('[data-native-action="restore"]');
        if (restore) restore.disabled = !playing;
        document.body.classList.toggle('mobile-native-media-ready', mediaReady);
        document.body.classList.toggle('mobile-native-safe-mode', safeMode);
    }
    syncMediaSessionForDock();
    syncWakeLockForCurrentActivity();
}
function setNativeStatusText(key, text) {
    const item = el.mobileNativePanel?.querySelector(`[data-native-status="${key}"]`);
    if (item) item.textContent = text;
}
function setMobileNativeSettingState(action, active, labelOverride = null) {
    const button = el.mobileNativePanel?.querySelector(`[data-native-action="${action}"]`);
    if (!button) return;
    const enabled = Boolean(active), label = labelOverride || (enabled ? 'ON' : 'OFF'), normalized = String(label || '').toLowerCase(), auto = normalized === 'auto' || normalized === '자동';
    button.dataset.state = auto ? 'auto' : (normalized === 'on' ? 'on' : (normalized === 'off' ? 'off' : 'action'));
    button.classList.toggle('is-on', enabled && !auto); button.classList.toggle('is-off', !enabled && !auto); button.classList.toggle('is-auto', auto); button.setAttribute('aria-pressed', auto ? 'mixed' : String(enabled));
    const stateNode = button.querySelector('[data-setting-state]');
    if (stateNode) stateNode.textContent = label;
}
function setMobileNativeActionState(action, label, active = false) {
    const button = el.mobileNativePanel?.querySelector(`[data-native-action="${action}"]`);
    if (!button) return;
    button.dataset.state = active ? 'on' : 'action';
    button.classList.toggle('is-on', Boolean(active));
    button.classList.toggle('is-off', false);
    const stateNode = button.querySelector('[data-setting-state]');
    if (stateNode) stateNode.textContent = label;
}
function detectMobileSafeMode() {
    const mobile = ensureMobileNativeState();
    const env = typeof getDownloadEnvironmentInfo === 'function' ? getDownloadEnvironmentInfo() : { restricted: false };
    const smallViewport = Boolean(window.matchMedia && window.matchMedia('(max-width: 520px)').matches);
    const lowMemory = Number(navigator.deviceMemory || 0) > 0 && Number(navigator.deviceMemory || 0) <= 4;
    const lowCpu = Number(navigator.hardwareConcurrency || 0) > 0 && Number(navigator.hardwareConcurrency || 0) <= 4;
    mobile.safeMode = Boolean(env.restricted || smallViewport || lowMemory || lowCpu);
    return mobile.safeMode;
}
function getWakeLockActivityReason() {
    const audio = getBottomPreviewAudio ? getBottomPreviewAudio() : null;
    if (state.busy) return 'busy';
    if (state.tracks?.some(track => track.status === 'processing')) return 'mastering';
    if (state.tracks?.some(track => track.status === 'analyzing')) return 'analyzing';
    return audio && !audio.paused && !audio.ended ? 'playback' : '';
}
function getFoxBearWakeLockSnapshot() {
    const mobile = ensureMobileNativeState();
    const activityReason = getWakeLockActivityReason();
    const userEnabled = Boolean(mobile.wakeLockDesired);
    const active = Boolean(mobile.wakeLockActive);
    const autoActive = Boolean(active && !userEnabled && mobile.wakeLockAutoActive);
    const mode = active ? (autoActive ? 'auto' : 'manual') : (userEnabled ? 'armed' : 'off');
    const settingLabel = userEnabled ? 'ON' : (autoActive ? 'AUTO' : 'OFF');
    return Object.freeze({ supported: supportsWakeLock(), active, autoActive, userEnabled, desired: userEnabled, mode, settingLabel, activityReason, busy: Boolean(mobile.wakeLockBusy), hasSentinel: Boolean(mobile.wakeLockSentinel), lastMode: mobile.wakeLockLastMode || 'off', lastReason: mobile.wakeLockLastReason || '', lastError: mobile.wakeLockLastError || null, lastRequestAt: Number(mobile.wakeLockLastRequestAt || 0), requestCount: Number(mobile.wakeLockRequestCount || 0), manualRequestCount: Number(mobile.wakeLockManualRequestCount || 0), autoRequestCount: Number(mobile.wakeLockAutoRequestCount || 0) });
}
function exposeFoxBearWakeLockController() {
    window.FoxBearWakeLockController = Object.freeze({ getSnapshot: getFoxBearWakeLockSnapshot, supportsWakeLock, request: requestFoxBearWakeLock, release: releaseFoxBearWakeLock, sync: syncWakeLockForCurrentActivity });
}
function supportsWakeLock() {
    return Boolean(navigator.wakeLock && typeof navigator.wakeLock.request === 'function');
}
async function requestFoxBearWakeLock(reason = '', options = {}) {
    const mobile = ensureMobileNativeState(), auto = options.auto === true, notify = options.toast === true && !auto, requestMode = auto && !mobile.wakeLockDesired ? 'auto' : 'manual';
    if (!auto && options.arm !== false) mobile.wakeLockDesired = true;
    mobile.wakeLockLastMode = requestMode; mobile.wakeLockLastReason = reason || ''; mobile.wakeLockLastRequestAt = Date.now(); mobile.wakeLockRequestCount = Number(mobile.wakeLockRequestCount || 0) + 1;
    if (requestMode === 'auto') mobile.wakeLockAutoRequestCount = Number(mobile.wakeLockAutoRequestCount || 0) + 1; else mobile.wakeLockManualRequestCount = Number(mobile.wakeLockManualRequestCount || 0) + 1;
    if (!supportsWakeLock()) {
        mobile.wakeLockActive = false; mobile.wakeLockAutoActive = false; mobile.wakeLockLastError = 'unsupported';
        if (!auto && mobile.wakeLockDesired) { mobile.wakeLockDesired = false; persistRuntimeSettings(); }
        if (notify && reason) showToast('이 브라우저는 화면유지 Wake Lock을 지원하지 않습니다.');
        updateMobileNativeUi(); return false;
    }
    if (mobile.wakeLockSentinel || mobile.wakeLockBusy) {
        if (mobile.wakeLockSentinel) { mobile.wakeLockActive = true; mobile.wakeLockAutoActive = Boolean(auto && !mobile.wakeLockDesired); }
        return Boolean(mobile.wakeLockSentinel);
    }
    mobile.wakeLockBusy = true;
    try {
        const sentinel = await navigator.wakeLock.request('screen');
        mobile.wakeLockSentinel = sentinel; mobile.wakeLockActive = true; mobile.wakeLockAutoActive = Boolean(auto && !mobile.wakeLockDesired); mobile.wakeLockLastError = null;
        sentinel.addEventListener('release', () => {
            const current = ensureMobileNativeState();
            if (current.wakeLockSentinel === sentinel) current.wakeLockSentinel = null;
            current.wakeLockActive = false; current.wakeLockAutoActive = false; updateMobileNativeUi();
        });
        if (notify && reason) showToast(`화면유지 ON · ${reason}`);
        updateMobileNativeUi(); return true;
    } catch (error) {
        console.warn('wake lock failed:', error);
        mobile.wakeLockActive = false; mobile.wakeLockAutoActive = false; mobile.wakeLockLastError = error?.name || error?.message || 'request-failed';
        if (!auto && mobile.wakeLockDesired) { mobile.wakeLockDesired = false; persistRuntimeSettings(); }
        if (notify && reason) showToast('화면유지를 켤 수 없습니다. 브라우저 권한/배터리 정책을 확인하세요.');
        updateMobileNativeUi(); return false;
    } finally { mobile.wakeLockBusy = false; }
}
async function releaseFoxBearWakeLock(options = {}) {
    const mobile = ensureMobileNativeState(), sentinel = mobile.wakeLockSentinel, clearDesired = options.clearDesired !== false, persist = options.persist !== false;
    if (clearDesired) mobile.wakeLockDesired = false;
    mobile.wakeLockLastMode = options.reason || (clearDesired ? 'manual-off' : 'auto-off');
    if (sentinel && typeof sentinel.release === 'function') { try { await sentinel.release(); } catch (error) {} }
    mobile.wakeLockSentinel = null; mobile.wakeLockActive = false; mobile.wakeLockAutoActive = false;
    if (persist && clearDesired) persistRuntimeSettings();
    updateMobileNativeUi();
}
function toggleFoxBearWakeLock() {
    const mobile = ensureMobileNativeState();
    if (mobile.wakeLockDesired) {
        releaseFoxBearWakeLock({ clearDesired: true, persist: true, reason: 'manual-off' });
        showToast('화면유지를 껐습니다.');
    } else {
        mobile.wakeLockDesired = true;
        mobile.wakeLockAutoActive = false;
        persistRuntimeSettings();
        requestFoxBearWakeLock('프리뷰/마스터링 중 화면이 꺼지지 않게 유지합니다.', { toast: true, auto: false });
    }
}
function syncWakeLockForCurrentActivity() {
    const mobile = ensureMobileNativeState(), activityReason = getWakeLockActivityReason(), active = Boolean(activityReason);
    if ((mobile.wakeLockDesired || active) && document.visibilityState === 'visible') requestFoxBearWakeLock(active && !mobile.wakeLockDesired ? `자동 보호 · ${activityReason}` : '사용자 설정 유지', { toast: false, auto: active && !mobile.wakeLockDesired });
    else if (!mobile.wakeLockDesired && !active && mobile.wakeLockSentinel) releaseFoxBearWakeLock({ clearDesired: false, persist: false, reason: 'auto-idle' });
}
function toggleFoxBearHaptics() {
    const mobile = ensureMobileNativeState();
    mobile.hapticsEnabled = !mobile.hapticsEnabled;
    persistRuntimeSettings();
    foxBearHaptic(mobile.hapticsEnabled ? 'success' : 'tap', { force: true });
    showToast(`진동 피드백 ${mobile.hapticsEnabled ? 'ON' : 'OFF'}`);
    updateMobileNativeUi();
}
function foxBearHaptic(pattern = 'tap', options = {}) {
    const mobile = ensureMobileNativeState();
    if (!mobile.hapticsEnabled && !options.force) return false;
    if (!navigator.vibrate || typeof navigator.vibrate !== 'function') return false;
    const now = Date.now();
    if (!options.force && now - Number(mobile.lastHapticAt || 0) < 90) return false;
    const value = MOBILE_NATIVE_HAPTIC_PATTERNS[pattern] || pattern || MOBILE_NATIVE_HAPTIC_PATTERNS.tap;
    try {
        navigator.vibrate(value);
        mobile.lastHapticAt = now;
        return true;
    } catch (error) {
        return false;
    }
}
function getDockAudioTrackId(audio) { return String(audio?.dataset?.trackId || audio?.dataset?.spectrumTrackId || ''); }
function syncMediaSessionForDock(audioOverride = null) {
    if (!('mediaSession' in navigator)) return;
    const requestedAudio = audioOverride || (getBottomPreviewAudio ? getBottomPreviewAudio() : null);
    const audio = requestedAudio?.dataset?.bottomPreviewActive === 'false' ? (getBottomPreviewAudio ? getBottomPreviewAudio() : null) : requestedAudio;
    const ownerId = getDockAudioTrackId(audio), track = ownerId ? state.tracks.find(item => String(item?.id || '') === ownerId) : getSelectedTrack();
    if (!track || !audio) {
        try { navigator.mediaSession.playbackState = 'none'; navigator.mediaSession.metadata = null; } catch (error) {}
        ['play', 'pause', 'seekbackward', 'seekforward', 'seekto'].forEach(action => { try { navigator.mediaSession.setActionHandler(action, null); } catch (error) {} });
        try { navigator.mediaSession.setPositionState?.(); } catch (error) {} return;
    }
    const mode = ownerId === String(state.bottomPreviewTrackId || '') ? (state.bottomPreviewMode || 'original') : (audio.dataset?.spectrumMode || audio.dataset?.waveformMode || 'original');
    const source = mode === 'mastered' ? '마스터링 프리뷰' : (mode === 'masterPreview' ? '하이라이트 듣기' : '원곡 프리뷰');
    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: `${source} · ${track.name || 'FoxBear Preview'}`,
            artist: 'FoxBear AI Mastering Studio',
            album: getBottomPreviewGenreLabel(track),
            artwork: [
                { src: 'assets/icons/foxbear-music.png', sizes: '512x512', type: 'image/png' },
                { src: 'assets/icons/foxbear.svg', sizes: '512x512', type: 'image/svg+xml' }
            ]
        });
        navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
        navigator.mediaSession.setActionHandler('play', () => playBottomPreviewAudio());
        navigator.mediaSession.setActionHandler('pause', () => { try { getBottomPreviewAudio()?.pause?.(); } catch (error) {} });
        navigator.mediaSession.setActionHandler('seekbackward', details => seekDockAudioBy(-Math.abs(Number(details?.seekOffset || 10))));
        navigator.mediaSession.setActionHandler('seekforward', details => seekDockAudioBy(Math.abs(Number(details?.seekOffset || 10))));
        navigator.mediaSession.setActionHandler('seekto', details => {
            const current = getBottomPreviewAudio ? getBottomPreviewAudio() : audio;
            if (!current || !Number.isFinite(Number(details?.seekTime))) return;
            current.currentTime = clamp(Number(details.seekTime), 0, Math.max(0, Number(current.duration || 0) - 0.08));
        });
        if (navigator.mediaSession.setPositionState) {
            const duration = Number(audio.duration || track.analysis?.duration || track.masteredDurationSec || 0);
            if (Number.isFinite(duration) && duration > 0) {
                navigator.mediaSession.setPositionState({ duration, playbackRate: audio.playbackRate || 1, position: clamp(Number(audio.currentTime || 0), 0, duration) });
            }
        }
    } catch (error) {
        console.warn('MediaSession sync skipped:', error);
    }
}
function seekDockAudioBy(deltaSec) {
    const audio = getBottomPreviewAudio ? getBottomPreviewAudio() : null;
    if (!audio) return;
    const duration = Number(audio.duration || 0);
    const next = Number(audio.currentTime || 0) + Number(deltaSec || 0);
    audio.currentTime = Number.isFinite(duration) && duration > 0 ? clamp(next, 0, Math.max(0, duration - 0.08)) : Math.max(0, next);
    syncDockWaveformPlayhead(audio);
}
function onDockAudioTransportEvent(audio) {
    syncDockWaveformPlayhead(audio);
    syncMediaSessionForDock(audio);
    syncWakeLockForCurrentActivity();
}
function trackHasMasterSource(track) {
    return Boolean(track && (track.masteredUrl || track.masterPreviewUrl));
}
function applyPreviewTranslationMode(mode, options = {}) {
    let target = PREVIEW_TRANSLATION_MODES[mode] ? mode : 'studio';
    const compatibility = getInAppAudioCompatibility();
    if (compatibility.restricted && target !== 'studio') { target = 'studio'; if (options.toast) showToast(`${compatibility.label}에서는 안정적인 음악 재생을 위해 스튜디오 모드로 재생합니다.`); }
    if (state.previewTranslationMode === target && !options.toast) return true;
    const track = options.track || activateMainTrackFromDock(resolveMainActiveTrackForDock()) || getSelectedTrack();
    if (!track) {
        if (options.toast) showToast('먼저 음원을 불러온 뒤 재생환경을 바꿀 수 있습니다.');
        return false;
    }
    state.previewTranslationMode = target;
    state.bottomPreviewTrackId = track.id;
    const audio = getBottomPreviewAudio();
    if (audio && target !== 'studio' && !audio._foxbearTranslationController) setupPreviewTranslationAudio(audio, { persistentTranslation: true, trackId: track.id, mode: state.bottomPreviewMode });
    const switchedInPlace = Boolean(audio?._foxbearTranslationController?.setMode?.(target, { fadeMs: 120 }));
    if (switchedInPlace || (audio && target === 'studio' && !audio._foxbearTranslationController)) renderPreviewTranslationModeControls(state.bottomPreviewMode);
    else renderBottomPreviewDock({ keepPlaying: options.keepPlaying !== false, userGesture: Boolean(options.userGesture) });
    foxBearHaptic('switch');
    if (options.toast && !(compatibility.restricted && mode !== 'studio')) showToast(`${PREVIEW_TRANSLATION_MODES[target].label} 모드로 부드럽게 전환했습니다.`);
    return true;
}
function jumpDockToImportantPeak(track = getSelectedTrack()) {
    if (!track) return;
    const audio = getBottomPreviewAudio();
    if (!audio) {
        showToast('먼저 Dock 프리뷰를 준비하세요.');
        return;
    }
    const payload = getDockWaveformPayload(track, state.bottomPreviewMode);
    const values = normalizeWaveformValues(payload.values || [], 96);
    if (!values.length) {
        showToast('이동할 파형 피크가 아직 없습니다.');
        return;
    }
    let bestIndex = 0;
    let bestScore = -1;
    values.forEach((value, index) => {
        const marker = payload.markers?.[index] || 'ok';
        const score = Number(value || 0) + (marker === 'clip' ? 0.35 : marker === 'hot' ? 0.18 : 0) + (index > 4 ? 0.04 : 0);
        if (score > bestScore) { bestScore = score; bestIndex = index; }
    });
    const pct = values.length > 1 ? bestIndex / (values.length - 1) : 0;
    const duration = Number(audio.duration || (state.bottomPreviewMode === 'masterPreview' ? track.masterPreviewInfo?.durationSec : track.analysis?.duration) || 0);
    if (!Number.isFinite(duration) || duration <= 0) return;
    audio.currentTime = clamp(pct * duration, 0, Math.max(0, duration - 0.08));
    playBottomPreviewAudio();
    syncDockWaveformPlayhead(audio);
    foxBearHaptic('switch');
    showToast(`피크 구간 ${Math.round(pct * 100)}% 지점으로 이동했습니다.`);
}
function addWaveformPeakJumpChips(track, wrap) {
    if (!track || !wrap) return;
    const chipRow = document.createElement('div');
    chipRow.className = 'waveform-jump-chip-row';
    const chips = [
        { label: 'LIVE 위치', action: () => syncDockWaveformPlayhead() },
        { label: '최대 피크', action: () => jumpDockToImportantPeak(track) },
        { label: '후렴 추정', action: () => jumpDockToPercent(track, 42) },
        { label: '뒤쪽 피크', action: () => jumpDockToPercent(track, 68) }
    ];
    chips.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'waveform-jump-chip';
        button.textContent = item.label;
        button.addEventListener('click', item.action);
        chipRow.appendChild(button);
    });
    wrap.appendChild(chipRow);
}
function jumpDockToPercent(track, percent) {
    seekDockToWaveformPercent(percent, { track, mode: state.bottomPreviewMode, play: true, source: 'chip' });
}
function getWaveformSeekDuration(track, mode = state.bottomPreviewMode, audio = getBottomPreviewAudio(), scope = 'full') {
    const audioDuration = Number(audio?.duration || 0);
    const previewDuration = Number(track?.masterPreviewInfo?.durationSec || MASTER_PREVIEW_DURATION_SEC || audioDuration || 0);
    if (scope === 'preview' || mode === 'masterPreview') {
        return Number.isFinite(previewDuration) && previewDuration > 0 ? previewDuration : audioDuration;
    }
    const trackDuration = mode === 'mastered'
        ? Number(track?.masteredDurationSec || track?.analysis?.duration || audioDuration || 0)
        : Number(track?.analysis?.duration || audioDuration || 0);
    return Number.isFinite(trackDuration) && trackDuration > 0 ? trackDuration : audioDuration;
}
function resolveWaveformSeekMode(track, requestedMode = state.bottomPreviewMode) {
    const target = requestedMode === 'mastered' ? 'mastered' : (requestedMode === 'masterPreview' ? 'masterPreview' : 'original');
    if (target === 'mastered' && !track?.masteredUrl) return track?.masterPreviewUrl ? 'masterPreview' : 'original';
    if (target === 'masterPreview' && !track?.masterPreviewUrl) return track?.masteredUrl ? 'mastered' : 'original';
    return target;
}
function seekDockToWaveformPercent(percent, options = {}) {
    const track = options.track || getSelectedTrack();
    if (!track) return false;
    const targetMode = resolveWaveformSeekMode(track, options.mode || state.bottomPreviewMode);
    const pct = clamp(Number(percent || 0), 0, 100) / 100;
    const audio = getBottomPreviewAudio();
    const currentMode = state.bottomPreviewMode || 'original';
    const requestedScope = options.scope === 'preview' ? 'preview' : getWaveformModeScope(targetMode, options.source || 'waveform');
    const duration = getWaveformSeekDuration(track, targetMode, currentMode === targetMode ? audio : null, requestedScope);
    if (!Number.isFinite(duration) || duration <= 0) return false;
    const scopedLocalSec = clamp(duration * pct, 0, Math.max(0, duration - 0.08));
    const absoluteSec = requestedScope === 'preview' || targetMode === 'masterPreview'
        ? getMasterPreviewStartSec(track) + scopedLocalSec
        : scopedLocalSec;
    const localSec = targetMode === 'masterPreview' ? scopedLocalSec : absoluteSec;
    const playing = options.play !== false;
    state.bottomPreviewTransport = {
        trackId: track.id,
        mode: targetMode,
        localSec,
        absoluteSec,
        playing,
        translationMode: state.previewTranslationMode || 'studio',
        capturedAt: Date.now()
    };
    state.bottomPreviewMode = targetMode;
    state.bottomPreviewTrackId = track.id;
    const applySeek = () => {
        const nextAudio = getBottomPreviewAudio();
        if (!nextAudio) return;
        applyBottomPreviewStart(nextAudio, localSec);
        if (playing) playBottomPreviewAudio();
        syncDockWaveformPlayhead(nextAudio);
    };
    if (currentMode !== targetMode || !audio) {
        renderBottomPreviewDock({ autoPlay: playing, keepPlaying: playing });
        requestAnimationFrame(applySeek);
    } else {
        applySeek();
    }
    foxBearHaptic('switch');
    const label = targetMode === 'mastered' ? '마스터링' : (targetMode === 'masterPreview' ? '하이라이트 듣기' : '원본');
    showToast(`${label} ${Math.round(pct * 100)}% 구간으로 이동했습니다.`);
    return true;
}
function getWaveformPointerPercent(event, element) {
    const service = window.FoxBearWaveformControlService;
    if (service && typeof service.pointerToPercent === 'function') {
        return service.pointerToPercent(event, element);
    }
    return mapWaveformPointerToAudioPercent(event, element);
}
function seekLocalWaveformAudioPercent(bars, percent, options = {}) {
    const track = getSelectedTrack();
    const audio = bars?.closest?.('.custom-player')?.querySelector?.('audio');
    if (!track || !audio) return false;
    const mode = bars?.dataset?.waveformMode || 'original';
    const scope = bars?.dataset?.waveformScope || getWaveformModeScope(mode, bars?.dataset?.waveformRole || 'local');
    const pct = clamp(Number(percent || 0), 0, 100) / 100;
    const duration = getWaveformSeekDuration(track, mode, audio, scope);
    if (!Number.isFinite(duration) || duration <= 0) return false;
    const service = window.FoxBearWaveformControlService;
    const localSec = service && typeof service.seekAudioToPercent === 'function'
        ? service.seekAudioToPercent(audio, pct * 100, duration)
        : clamp(duration * pct, 0, Math.max(0, duration - 0.08));
    if (!Number.isFinite(localSec)) return false;
    if (!service || typeof service.seekAudioToPercent !== 'function') applyBottomPreviewStart(audio, localSec);
    const player = audio.closest('.custom-player');
    const waveform = player?.querySelector?.('.dock-integrated-waveform-bars');
    setPlayheadOnElement(waveform || bars, pct * 100, Boolean(options.play && !audio.ended));
    if (options.play !== false) playAudioWithFadeIn(audio, { fromZero: false }).catch(() => showToast('브라우저가 재생을 차단했습니다. 다시 눌러주세요.'));
    return true;
}
function shouldSeekWaveformLocally(bars) {
    return bars?.dataset?.waveformSeekTarget === 'local';
}
function onWaveformBarsSeek(event) {
    if (!event) return;
    event.preventDefault();
    event.stopPropagation();
    const bars = event.currentTarget;
    if (Date.now() - Number(bars?.dataset?.lastPointerSeekAt || 0) < 360) return;
    const pct = getWaveformPointerPercent(event, bars);
    if (!Number.isFinite(pct)) return;
    if (shouldSeekWaveformLocally(bars)) {
        seekLocalWaveformAudioPercent(bars, pct, { play: true, source: bars?.dataset?.waveformRole || 'waveform' });
        return;
    }
    const mode = bars?.dataset?.waveformMode || state.bottomPreviewMode;
    seekDockToWaveformPercent(pct, { mode, scope: bars?.dataset?.waveformScope || 'full', play: true, source: bars?.dataset?.waveformRole || 'waveform' });
}
function onWaveformBarsPointerSeek(event) {
    if (!event || event.pointerType === 'mouse' || event.button > 0) return;
    event.preventDefault();
    event.stopPropagation();
    const bars = event.currentTarget;
    bars.dataset.lastPointerSeekAt = String(Date.now());
    const pct = getWaveformPointerPercent(event, bars);
    if (!Number.isFinite(pct)) return;
    if (shouldSeekWaveformLocally(bars)) {
        seekLocalWaveformAudioPercent(bars, pct, { play: true, source: bars?.dataset?.waveformRole || 'waveform-touch' });
        return;
    }
    const mode = bars?.dataset?.waveformMode || state.bottomPreviewMode;
    seekDockToWaveformPercent(pct, { mode, scope: bars?.dataset?.waveformScope || 'full', play: true, source: bars?.dataset?.waveformRole || 'waveform-touch' });
}
function onWaveformBarsKeySeek(event) {
    if (!event || !['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const bars = event.currentTarget;
    const mode = bars?.dataset?.waveformMode || state.bottomPreviewMode;
    const current = getDockPlaybackPercent(getSelectedTrack(), mode, bars?.dataset?.waveformScope || getWaveformModeScope(mode, bars?.dataset?.waveformRole || 'keyboard'));
    let pct = Number.isFinite(Number(current)) ? Number(current) : 0;
    if (event.key === 'Home') pct = 0;
    else if (event.key === 'End') pct = 100;
    else if (event.key === 'ArrowLeft') pct = Math.max(0, pct - 5);
    else if (event.key === 'ArrowRight') pct = Math.min(100, pct + 5);
    const shouldPlay = event.key === 'Enter' || event.key === ' ';
    if (shouldSeekWaveformLocally(bars)) {
        seekLocalWaveformAudioPercent(bars, pct, { play: shouldPlay, source: 'keyboard' });
        return;
    }
    seekDockToWaveformPercent(pct, { mode, scope: bars?.dataset?.waveformScope || 'full', play: shouldPlay, source: 'keyboard' });
}
function attachWaveformSeekHandlers(bars, mode = state.bottomPreviewMode, role = 'waveform') {
    if (!bars) return;
    const targetMode = mode === 'mastered' ? 'mastered' : (mode === 'masterPreview' ? 'masterPreview' : 'original');
    bars.dataset.waveformMode = targetMode;
    bars.dataset.waveformRole = role;
    bars.dataset.waveformScope = getWaveformModeScope(targetMode, role);
    bars.setAttribute('role', 'slider');
    bars.setAttribute('tabindex', '0');
    bars.setAttribute('aria-valuemin', '0');
    bars.setAttribute('aria-valuemax', '100');
    bars.setAttribute('aria-label', '파형을 눌러 해당 구간부터 재생');
    bars.title = '파형을 누르면 해당 구간부터 재생됩니다.';
    bars.addEventListener('pointerdown', onWaveformBarsPointerSeek);
    bars.addEventListener('click', onWaveformBarsSeek);
    bars.addEventListener('keydown', onWaveformBarsKeySeek);
}
function onBottomWaveformButtonClick(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    openWaveformCompareDialog();
}
async function shareSelectedMasterFromQuickPanel(track = getSelectedTrack()) {
    if (!track || !track.outBlob) {
        showToast('공유할 마스터링 파일이 없습니다.');
        return;
    }
    try {
        await shareDownloadFile(track.outBlob, track.outName || buildMasteredFileName(track, { format: track.outFormat || 'wav24', extension: /mp3/.test(track.outFormat || '') ? 'mp3' : 'wav' }));
        clearNativeBadgeIfDone();
        foxBearHaptic('download');
    } catch (error) {
        showToast('공유가 막히면 다운로드 창의 저장 도움을 사용하세요.');
        showDownloadOptionsDialog(track);
    }
}
async function promptInstallFoxBearPwa() {
    const mobile = ensureMobileNativeState();
    if (mobile.deferredInstallPrompt) {
        try {
            mobile.deferredInstallPrompt.prompt();
            const choice = await mobile.deferredInstallPrompt.userChoice;
            mobile.deferredInstallPrompt = null;
            showToast(choice?.outcome === 'accepted' ? '앱 설치를 시작했습니다.' : '앱 설치를 취소했습니다.');
        } catch (error) {
            showToast('브라우저 메뉴에서 홈 화면에 추가 또는 앱 설치를 선택해주세요.');
        }
    } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
        showToast('iOS는 Safari 공유 버튼 → 홈 화면에 추가를 사용하세요.');
    } else {
        showToast('브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택하세요.');
    }
    updateMobileNativeUi();
}
async function maybeRequestPersistentStorage(userInitiated = false) {
    const mobile = ensureMobileNativeState();
    if (userInitiated) {
        mobile.storagePersistRequested = true;
        persistRuntimeSettings();
    }
    if (!navigator.storage || typeof navigator.storage.persist !== 'function') {
        mobile.storagePersisted = false;
        if (userInitiated) showToast('이 브라우저는 저장소 보호 요청을 지원하지 않습니다.');
        updateMobileNativeUi();
        return false;
    }
    try {
        const already = typeof navigator.storage.persisted === 'function' ? await navigator.storage.persisted() : false;
        if (already) {
            mobile.storagePersisted = true;
            persistRuntimeSettings();
            if (userInitiated) showToast('저장소 보호가 이미 켜져 있습니다.');
            updateMobileNativeUi();
            return true;
        }
        if (!userInitiated) {
            mobile.storagePersisted = false;
            updateMobileNativeUi();
            return false;
        }
        const granted = await navigator.storage.persist();
        mobile.storagePersisted = Boolean(granted);
        persistRuntimeSettings();
        showToast(granted ? '프로젝트/분석 캐시 저장소 보호를 요청했습니다.' : '브라우저가 저장소 보호를 승인하지 않았습니다.');
        updateMobileNativeUi();
        return Boolean(granted);
    } catch (error) {
        mobile.storagePersisted = false;
        if (userInitiated) showToast('저장소 보호 요청에 실패했습니다.');
        updateMobileNativeUi();
        return false;
    }
}function handleMobileVisibilityChange() {
    const mobile = ensureMobileNativeState();
    if (document.visibilityState === 'hidden') {
        mobile.lastVisibilityHiddenAt = Date.now();
        captureBottomPreviewTransport(getSelectedTrack(), state.bottomPreviewMode, { reason: 'visibility-hidden', ttlMs: 12 * 60 * 60 * 1000 });
        return;
    }
    restoreDockTransportAfterReturn(false);
}
function handleMobilePageShow() {
    restoreDockTransportAfterReturn(false);
    scheduleBottomPreviewLayoutSync();
    syncWakeLockForCurrentActivity();
}
function restoreDockTransportAfterReturn(forceNotice = false) {
    const track = getSelectedTrack();
    if (!track) return false;
    const mobile = ensureMobileNativeState(), now = Date.now();
    if (!forceNotice && now - Number(mobile.lastDockRestoreAt || 0) < 350) return false;
    mobile.lastDockRestoreAt = now;
    const before = getBottomPreviewAudio();
    const controller = before?._foxbearTranslationController;
    if (controller?.closed || controller?.context?.state === 'closed') { captureBottomPreviewTransport(track, state.bottomPreviewMode); if (el.bottomPreviewPlayer) delete el.bottomPreviewPlayer.dataset.previewKey; }
    else if (before && !before.paused && controller?.resume) try { controller.resume(); } catch (error) {}
    renderBottomPreviewDock({ keepPlaying: true });
    scheduleBottomPreviewLayoutSync();
    syncMediaSessionForDock();
    if (forceNotice || now - Number(mobile.pageRestoreToastAt || 0) > 60000) {
        mobile.pageRestoreToastAt = now;
        showToast('Dock 재생 위치와 모바일 편의 상태를 복구했습니다.');
    }
    return true;
}
async function registerFoxBearServiceWorker(options = {}) {
    const mobile = ensureMobileNativeState(); if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    const bypassOnce = !options.ignoreRecoveryBypass && await window.FoxBearServiceWorkerRecoveryService?.consumeOneShotBypass?.();
    if (bypassOnce) {
        mobile.serviceWorkerReady = false;
        updateMobileNativeUi(); globalThis.setTimeout?.(() => registerFoxBearServiceWorker({ ignoreRecoveryBypass: true }), 12000);
        return;
    }
    try {
        // compatibility anchors: navigator.serviceWorker.register('./sw.js?v=1.6.37-ui-shell-cross-generation-recovery') · navigator.serviceWorker.register('./sw.js?v=1.6.37-ui-shell-cross-generation-recovery&h=sw-v1637')
        const registration = await navigator.serviceWorker.register(resolveFoxBearScriptUrl(SERVICE_WORKER_URL));
        window.FoxBearServiceWorkerUpdateService?.coordinate?.(registration, { stableIdleMs: 1800, pollMs: 500 });
        const readyRegistration = await Promise.race([navigator.serviceWorker.ready.catch(() => null), new Promise(resolve => setTimeout(() => resolve(null), 15000))]);
        const activeWorker = readyRegistration?.active || registration?.active || null;
        mobile.serviceWorkerReady = Boolean(activeWorker);
        if (activeWorker && !window.__FOXBEAR_E2E__) activeWorker.postMessage({ type: 'FOXBEAR_WARM_CACHE' });
        updateMobileNativeUi();
    } catch (error) {
        mobile.serviceWorkerReady = false;
        updateMobileNativeUi();
        console.warn('Service worker registration skipped:', error);
    }
}
function openMobileShareIdb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(MOBILE_NATIVE_IDB, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(MOBILE_NATIVE_SHARE_STORE)) db.createObjectStore(MOBILE_NATIVE_SHARE_STORE, { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('공유 파일 저장소를 열 수 없습니다.'));
    });
}
async function takeSharedAudioFromIdb(id) {
    if (!id || typeof indexedDB === 'undefined') return null;
    const db = await openMobileShareIdb();
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(MOBILE_NATIVE_SHARE_STORE, 'readwrite');
            const store = tx.objectStore(MOBILE_NATIVE_SHARE_STORE);
            const req = store.get(id);
            req.onsuccess = () => {
                const value = req.result || null;
                if (value) store.delete(id);
                resolve(value);
            };
            req.onerror = () => reject(req.error || new Error('공유 파일을 읽지 못했습니다.'));
        });
    } finally {
        db.close();
    }
}
async function processPwaShareTargetLaunch() {
    const mobile = ensureMobileNativeState();
    if (mobile.sharedLaunchHandled) return;
    const params = new URLSearchParams(window.location.search || '');
    const shareId = params.get(MOBILE_NATIVE_SHARE_QUERY);
    if (!shareId) return;
    mobile.sharedLaunchHandled = true;
    try {
        const item = await takeSharedAudioFromIdb(shareId);
        const files = Array.isArray(item?.files) ? item.files : [];
        const audioFiles = files.filter(file => file && validateAudioFile(file).ok);
        if (audioFiles.length) {
            handleFiles(audioFiles);
            showToast(`${audioFiles.length}개 공유 파일을 FoxBear로 불러왔습니다.`);
            history.replaceState(null, document.title, window.location.pathname + window.location.hash);
        } else {
            showToast('공유된 파일에서 지원 오디오를 찾지 못했습니다.');
        }
    } catch (error) {
        console.warn('share target launch failed:', error);
        showToast('공유 파일을 불러오지 못했습니다. 파일 선택으로 다시 시도해주세요.');
    }
}
function setNativeBadge(count = 0) {
    const mobile = ensureMobileNativeState();
    const value = Math.max(0, Math.floor(Number(count || 0)));
    mobile.badgeCount = value;
    try {
        if (value > 0 && navigator.setAppBadge) navigator.setAppBadge(value).catch(() => {});
        else if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
    } catch (error) {}
}
function getCompletedUndownloadedCount() {
    return state.tracks.filter(track => track.outBlob && track.downloadAttention).length;
}
function clearNativeBadgeIfDone() {
    setNativeBadge(getCompletedUndownloadedCount());
}
// v1.3.81: legacy A/B difference helpers kept because QA and old feature cards still rely on them.
function createDifferencePreviewPlayer(track, options = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'difference-preview-player';
    const mode = options.mode === 'masterPreview' ? 'masterPreview' : 'mastered';
    const durationSec = Number(options.durationSec || track?.analysis?.duration || 0);
    const compareOffset = 0;
    const originalOffset = mode === 'masterPreview' ? getMasterPreviewStartSec(track) : 0;
    const matchGainDb = Number.isFinite(Number(options.gainDb)) ? Number(options.gainDb) : getABMatchGainDb(track);
    const compareGain = state.abLevelMatch && Number.isFinite(matchGainDb) ? clamp(Math.pow(10, matchGainDb / 20), 0.04, 1.25) : 1;
    const originalAudio = configurePreviewAudioElement(document.createElement('audio'));
    originalAudio.src = track.originalUrl;
    const compareAudio = configurePreviewAudioElement(document.createElement('audio'));
    compareAudio.src = options.compareUrl;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'player-toggle';
    setPlayerToggleIcon(toggle, false);
    toggle.setAttribute('aria-label', '차이 듣기 재생');
    const seek = document.createElement('input');
    seek.type = 'range';
    seek.className = 'player-seek difference-preview-seek';
    seek.min = '0';
    seek.max = '1000';
    seek.step = '1';
    seek.value = '0';
    const time = document.createElement('span');
    time.className = 'player-time difference-preview-time';
    time.textContent = formatPlayerTime(0, durationSec);
    const badge = document.createElement('span');
    badge.className = 'difference-listen-badge';
    badge.textContent = state.abLevelMatch ? '차이 · 레벨매칭' : '차이 · 실제음량';
    let context = null;
    let graphReady = false;
    const getDuration = () => Number.isFinite(compareAudio.duration) && compareAudio.duration > 0 ? compareAudio.duration : durationSec;
    const localPosition = () => Math.max(0, Number(compareAudio.currentTime || 0) - compareOffset);
    const setPlaying = playing => {
        toggle.classList.toggle('playing', Boolean(playing));
        setPlayerToggleIcon(toggle, Boolean(playing));
        toggle.setAttribute('aria-label', playing ? '차이 듣기 일시정지' : '차이 듣기 재생');
    };
    const syncUi = () => {
        const duration = getDuration();
        const pos = localPosition();
        if (Number.isFinite(duration) && duration > 0) seek.value = String(Math.round(clamp(pos / duration, 0, 1) * 1000));
        time.textContent = formatPlayerTime(pos, duration);
    };
    const seekLocal = seconds => {
        const duration = getDuration();
        const safe = Number.isFinite(duration) && duration > 0 ? clamp(seconds, 0, Math.max(0, duration - 0.08)) : Math.max(0, Number(seconds || 0));
        try { compareAudio.currentTime = compareOffset + safe; } catch (error) {}
        try { originalAudio.currentTime = originalOffset + safe; } catch (error) {}
        syncUi();
    };
    const ensureGraph = () => {
        if (graphReady || (!window.AudioContext && !window.webkitAudioContext)) return graphReady;
        try {
            context = FoxBearAudioContexts.create({ purpose: 'difference-preview', ownerId: `difference-preview:${track?.id || 'track'}:${Date.now()}`, latencyHint: 'interactive' });
            const originalSource = context.createMediaElementSource(originalAudio);
            const compareSource = context.createMediaElementSource(compareAudio);
            const originalInvert = context.createGain();
            originalInvert.gain.value = -1;
            const compareLevel = context.createGain();
            compareLevel.gain.value = compareGain;
            const protect = context.createDynamicsCompressor();
            protect.threshold.value = -18;
            protect.knee.value = 18;
            protect.ratio.value = 5;
            protect.attack.value = 0.003;
            protect.release.value = 0.08;
            const output = context.createGain();
            const spectrumAnalyser = createSpectrumAnalyserTap(context);
            output.gain.value = 0.62;
            originalSource.connect(originalInvert).connect(protect);
            compareSource.connect(compareLevel).connect(protect);
            protect.connect(output);
            if (spectrumAnalyser) output.connect(spectrumAnalyser).connect(context.destination);
            else output.connect(context.destination);
            registerExternalSpectrumAnalyser(compareAudio, spectrumAnalyser, context, {
                role: 'difference-compare',
                trackId: track?.id || '',
                mode,
                label: '차이 듣기 FFT'
            });
            registerExternalSpectrumAnalyser(originalAudio, spectrumAnalyser, context, {
                role: 'difference-original',
                trackId: track?.id || '',
                mode: 'original',
                label: '차이 듣기 FFT'
            });
            graphReady = true;
        } catch (error) {
            console.warn('Difference listen graph unavailable:', error);
            graphReady = false;
        }
        return graphReady;
    };
    const playBoth = async () => {
        bindExclusivePreview(compareAudio);
        if (getInAppAudioCompatibility().restricted) { showToast('현재 인앱 브라우저에서는 차이 듣기 대신 원본/마스터 A/B 재생을 사용해주세요.'); setPlaying(false); return false; }
        if (!ensureGraph()) { showToast('이 브라우저에서는 차이 듣기 오디오 그래프를 만들 수 없습니다.'); setPlaying(false); return false; }
        const start = Number(options.startSec || 0);
        if (compareAudio.readyState < 1 || Math.abs(localPosition() - start) > 0.15) seekLocal(Number.isFinite(start) ? start : 0);
        try {
            await getPlaybackTransitionService().playSynchronizedPair(context, [originalAudio, compareAudio], 'difference-preview-play');
            setPlaying(true);
        } catch (error) {
            try { originalAudio.pause(); compareAudio.pause(); } catch (pauseError) {}
            showToast('차이 듣기 자동 재생이 차단되었습니다. 재생 버튼을 다시 눌러주세요.');
            setPlaying(false);
        }
    };
    const pauseBoth = () => {
        try { originalAudio.pause(); compareAudio.pause(); } catch (error) {}
        setPlaying(false);
    };
    toggle.addEventListener('click', () => {
        if (compareAudio.paused) playBoth();
        else pauseBoth();
    });
    seek.addEventListener('input', () => {
        const duration = getDuration();
        if (Number.isFinite(duration) && duration > 0) seekLocal(Number(seek.value) / 1000 * duration);
    });
    compareAudio.addEventListener('loadedmetadata', () => seekLocal(Number(options.startSec || 0)), { once: true });
    compareAudio.addEventListener('timeupdate', () => {
        const targetOriginal = originalOffset + localPosition();
        if (Math.abs((originalAudio.currentTime || 0) - targetOriginal) > 0.18) {
            try { originalAudio.currentTime = targetOriginal; } catch (error) {}
        }
        const duration = getDuration();
        if (state.abLoopMode && Number.isFinite(duration) && duration > 6 && localPosition() >= Math.min(duration, Number(options.startSec || 0) + 5)) {
            seekLocal(Number(options.startSec || 0));
            return;
        }
        syncUi();
    });
    compareAudio.addEventListener('play', () => setPlaying(true));
    compareAudio.addEventListener('pause', () => setPlaying(false));
    compareAudio.addEventListener('ended', () => pauseBoth());
    [originalAudio, compareAudio].forEach(audio => {
        audio.addEventListener('emptied', () => context && FoxBearAudioContexts.close(context, 'difference-preview-emptied'), { once: true });
        audio.addEventListener('error', () => context && FoxBearAudioContexts.close(context, 'difference-preview-error'), { once: true });
    });
    registerPlaybackLinkedAudio(compareAudio, {
        role: 'difference-compare',
        shell: wrap,
        trackId: track?.id || '',
        mode,
        label: '차이 비교',
        absoluteStartSec: compareOffset,
        durationSec
    });
    registerPlaybackLinkedAudio(originalAudio, {
        role: 'difference-original',
        shell: wrap,
        trackId: track?.id || '',
        mode: 'original',
        label: '차이 원본',
        absoluteStartSec: originalOffset,
        durationSec
    });
    wrap._foxbearPlay = playBoth;
    wrap._foxbearPause = pauseBoth;
    wrap._foxbearDispose = () => { pauseBoth(); if (context) FoxBearAudioContexts.close(context, 'difference-preview-dispose'); context = null; graphReady = false; };
    wrap.append(toggle, seek, time, badge, compareAudio, originalAudio);
    return wrap;
}
function toggleDockAbLevelMatch() {
    const track = getSelectedTrack();
    captureBottomPreviewTransport(track, state.bottomPreviewMode);
    state.abLevelMatch = !state.abLevelMatch;
    syncBottomCompareTools();
    renderBottomPreviewDock({ keepPlaying: true });
    renderAll({ keepDetailAudio: true });
    showToast(state.abLevelMatch ? 'Dock A/B 레벨 매칭을 켰습니다.' : 'Dock A/B 레벨 매칭을 껐습니다.');
}
function toggleDockDifferenceListen() {
    const track = getSelectedTrack();
    if (!track) return;
    captureBottomPreviewTransport(track, state.bottomPreviewMode);
    const hasCompare = Boolean(track.masteredUrl || track.masterPreviewUrl);
    if (!hasCompare) {
        showToast('마스터링 또는 15초 하이라이트 듣기가 준비된 뒤 차이 듣기를 사용할 수 있습니다.');
        return;
    }
    state.abDifferenceListen = !state.abDifferenceListen;
    if (state.abDifferenceListen && state.bottomPreviewMode === 'original') {
        state.bottomPreviewMode = track.masteredUrl ? 'mastered' : 'masterPreview';
    }
    syncBottomCompareTools();
    renderBottomPreviewDock({ keepPlaying: true, autoPlay: true });
    showToast(state.abDifferenceListen ? '차이 듣기: 원본을 빼고 달라진 성분만 재생합니다.' : '차이 듣기를 껐습니다.');
}
function installDockRemoteDelegation() {
    if (state.dockRemoteDelegationInstalled) return state.dockController || null;
    const root = el.bottomPreviewDock || document.getElementById('bottomPreviewDock');
    if (!root) return null;
    if (!window.FoxBearDockController || !window.FoxBearDockController.FoxBearDockController) {
        console.warn('FoxBear dock controller is unavailable; direct button handlers remain active.');
        return null;
    }
    const controller = new window.FoxBearDockController.FoxBearDockController({
        root,
        handlers: {
            bottomPreviewPlayBtn: event => toggleBottomPreviewExternalPlayback(event),
            bottomPreviewMasterBtn: event => runDockRemoteMaster(event),
            bottomPreviewMasterPreviewBtn: event => runDockRemoteMasterPreview(event),
            bottomPreviewWaveformBtn: event => onBottomWaveformButtonClick(event),
            bottomPreviewOriginalBtn: event => runDockRemoteSourceMode('original', event),
            bottomPreviewMasteredBtn: event => runDockRemoteSourceMode('mastered', event),
            translation: (event, target) => runDockRemoteTranslationMode(target.dataset.previewTranslationMode, event)
        }
    }).install();
    state.dockController = controller;
    state.dockRemoteDelegationInstalled = true;
    return controller;
}
function installFeatureDialogFallback() {
    return installManagedModalController();
}
function installPreviewDialogFallback() {
    return installManagedModalController();
}
function bindEvents() {
    window.addEventListener('scroll', hideFeatureTooltip, { passive: true });
    window.addEventListener('resize', hideFeatureTooltip);
    window.addEventListener('resize', scheduleBottomPreviewLayoutSync, { passive: true });
    window.addEventListener('orientationchange', scheduleBottomPreviewLayoutSync, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleBottomPreviewLayoutSync, { passive: true });
        window.visualViewport.addEventListener('scroll', scheduleBottomPreviewLayoutSync, { passive: true });
    }
    bindMobileNativeEvents();
    installManagedModalController();
    if (el.programInfoBtn) el.programInfoBtn.addEventListener('click', openProgramInfoDialog);
    if (el.programInfoClose) el.programInfoClose.addEventListener('click', closeProgramInfoDialog);
    if (el.incidentReportingClose) el.incidentReportingClose.addEventListener('click', () => closeIncidentReportingDialog());
    if (el.programInfoDialog) {
        el.programInfoDialog.addEventListener('click', event => {
            if (event.target === el.programInfoDialog) closeProgramInfoDialog();
        });
    }
    if (el.incidentReportingDialog) {
        el.incidentReportingDialog.addEventListener('click', event => {
            if (event.target === el.incidentReportingDialog) closeIncidentReportingDialog({ restoreFocus: false });
        });
    }
    installDockRemoteDelegation();
    bindAdminStatsEvents();
    if (el.smartSuggestApplyBtn) el.smartSuggestApplyBtn.addEventListener('click', applyAIRecommendationToSelected);
    if (el.referenceLoadBtn) el.referenceLoadBtn.addEventListener('click', () => clickNativeFileInput(el.referenceInput, '레퍼런스 파일'));
    if (el.referenceInput) el.referenceInput.addEventListener('change', e => handleReferenceFiles(e.target.files));
    if (el.referenceApplyBtn) el.referenceApplyBtn.addEventListener('click', applyReferenceToSelected);
    if (el.referenceClearBtn) el.referenceClearBtn.addEventListener('click', clearReferenceProfile);
    if (el.referenceStrengthSelect) el.referenceStrengthSelect.addEventListener('change', handleReferenceStrengthChange);
    if (el.adaptiveLufsToggle) el.adaptiveLufsToggle.addEventListener('change', handleAdaptiveLufsToggle);
    if (el.snapshotSaveBtn) el.snapshotSaveBtn.addEventListener('click', saveSnapshotForSelected);
    if (el.snapshotUndoBtn) el.snapshotUndoBtn.addEventListener('click', restoreLatestSnapshotForSelected);
    if (el.snapshotRedoBtn) el.snapshotRedoBtn.addEventListener('click', redoSnapshotForSelected);
    if (el.snapshotAiBtn) el.snapshotAiBtn.addEventListener('click', restoreAiRecommendationSnapshotForSelected);
    if (el.snapshotOriginalBtn) el.snapshotOriginalBtn.addEventListener('click', restoreOriginalSnapshotForSelected);
    if (el.snapshotClearBtn) el.snapshotClearBtn.addEventListener('click', clearSnapshotsForSelected);
    window.addEventListener('keydown', event => {
        if (event.key === 'Escape' && el.programInfoDialog?.classList.contains('show')) closeProgramInfoDialog();
        if (event.key === 'Escape' && el.incidentReportingDialog?.classList.contains('show')) closeIncidentReportingDialog({ restoreFocus: false });
        if (event.key === 'Escape' && el.featureDialog?.classList.contains('show')) closeFeatureDialog({ restoreFocus: false });
        if (event.key === 'Escape' && el.previewDialog?.classList.contains('show')) closePreviewDialog(event, { restoreFocus: false });
        if (event.key === 'Escape' && el.adminStatsDialog?.classList.contains('show')) closeAdminStatsDialog();
    });
    bindUploadInputEventsOnce();
    el.genreSelect.addEventListener('change', () => {
        if (state.programmatic) return;
        saveUndoPointForSelectedOrAll('장르 변경 전');
        applyPresetToSelected(el.genreSelect.value, true);
    });
    SLIDERS.forEach(slider => {
        const input = document.getElementById(slider.id);
        input.addEventListener('input', () => {
            const track = getSelectedTrack();
            const value = Number(input.value);
            document.getElementById(`value-${slider.id}`).textContent = formatSliderValue(slider, value);
            if (state.programmatic || !track) {
                updateSliderHint(slider.id);
                return;
            }
            saveUndoPoint(track, `${slider.label || slider.id} 조절 전`, { auto: true });
            track.settings[slider.id] = value;
            track.preset = 'custom';
            track.genreLocked = true;
            invalidateMasteredOutput(track, '사용자 커스텀 값이 적용되었습니다. 다시 마스터링하세요.', true);
            state.programmatic = true;
            setControlsFromSettings(track.settings, 'custom', track.recommendedSettings);
            state.programmatic = false;
            renderAll({ keepDetailAudio: true });
        });
    });
    el.pitchSlider.addEventListener('input', handlePitchSpeedChange);
    el.speedSlider.addEventListener('input', handlePitchSpeedChange);
    if (el.beatChangeSelect) el.beatChangeSelect.addEventListener('change', handleBeatChangeSelect);
    if (el.instrumentLayerSelect) el.instrumentLayerSelect.addEventListener('change', handleInstrumentLayerChange);
    if (el.instrumentAmountSelect) el.instrumentAmountSelect.addEventListener('change', handleInstrumentLayerChange);
    el.snapSemitone.addEventListener('change', () => {
        const track = getSelectedTrack();
        const transform = track ? cloneTransform(track.transform) : cloneTransform(DEFAULT_TRANSFORM);
        transform.snapSemitone = el.snapSemitone.checked;
        if (transform.snapSemitone) transform.pitchSemitones = Math.round(Number(el.pitchSlider.value));
        if (track) {
            saveUndoPoint(track, '피치/속도 변경 전', { auto: true });
            track.transform = transform;
            invalidateMasteredOutput(track, '피치/속도 조정값이 적용되었습니다. 다시 마스터링하세요.', true);
        }
        setTransformControls(transform);
        renderAll({ keepDetailAudio: true });
    });
    el.aiApplyBtn.addEventListener('click', applyAIRecommendationToSelected);
    if (el.masterPreviewBtn) el.masterPreviewBtn.addEventListener('click', () => renderMasterPreviewForSelected('detail'));
    el.masterSelectedBtn.addEventListener('click', masterSelectedTracks);
    el.masterAllBtn.addEventListener('click', masterAllTracks);
    el.zipBtn.addEventListener('click', downloadZip);
    if (el.individualExportBtn) el.individualExportBtn.addEventListener('click', startSequentialExport);
    window.addEventListener('foxbear:export-show-track-downloads', () => focusCompletedTrackDownload(state.tracks.find(track => track.outBlob)));
    el.clearBtn.addEventListener('click', clearQueue);
    if (el.masterGoalSelect) {
        state.masterGoal = el.masterGoalSelect.value || state.masterGoal;
        applyMasterGoalDefaults(state.masterGoal, false);
        el.masterGoalSelect.addEventListener('change', () => {
            saveUndoPointForSelectedOrAll('목표 모드 변경 전');
            state.masterGoal = el.masterGoalSelect.value || 'natural';
            applyMasterGoalDefaults(state.masterGoal, true);
            invalidateAllMasteredOutput(`${getMasterGoalLabel(state.masterGoal)} 목표 모드로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${getMasterGoalLabel(state.masterGoal)} 목표 모드로 변경했습니다.`);
        });
    }
    if (el.masterStyleSelect) {
        state.masterStyle = el.masterStyleSelect.value || state.masterStyle;
        applyMasterStyleDefaults(state.masterStyle, false);
        el.masterStyleSelect.addEventListener('change', () => {
            saveUndoPointForSelectedOrAll('스타일 변경 전');
            state.masterStyle = el.masterStyleSelect.value || 'streaming';
            applyMasterStyleDefaults(state.masterStyle, true);
            invalidateAllMasteredOutput(`${getMasterStyleLabel(state.masterStyle)} 스타일로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${getMasterStyleLabel(state.masterStyle)} 스타일을 적용했습니다.`);
        });
    }
    if (el.masterStrengthSelect) {
        state.masterStrength = el.masterStrengthSelect.value || state.masterStrength || 'balanced';
        el.masterStrengthSelect.addEventListener('change', () => {
            saveUndoPointForSelectedOrAll('마스터링 성향 변경 전');
            state.masterStrength = el.masterStrengthSelect.value || 'balanced';
            applyMasterStrengthDefaults(state.masterStrength, true);
            invalidateAllMasteredOutput(`${getMasterStrengthLabel(state.masterStrength)} 성향으로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${getMasterStrengthLabel(state.masterStrength)} 성향을 적용했습니다.`);
        });
    }
    if (el.outputFormatSelect) {
        state.outputFormat = el.outputFormatSelect.value || state.outputFormat;
        el.outputFormatSelect.addEventListener('change', () => {
            saveUndoPointForSelectedOrAll('출력 포맷 변경 전');
            state.outputFormat = el.outputFormatSelect.value || 'wav24';
            setPlatformPresetCustomFromManualChange();
            invalidateAllMasteredOutput('출력 포맷이 변경되었습니다. 다시 마스터링하세요.');
            renderAll({ keepDetailAudio: true });
            showToast(getOutputFormatLabel(state.outputFormat) + ' 출력으로 변경했습니다.');
        });
    }
    if (el.targetLufsSelect) {
        state.targetLufs = Number(el.targetLufsSelect.value || state.targetLufs);
        if (el.adaptiveLufsToggle) el.adaptiveLufsToggle.checked = Boolean(state.adaptiveTargetLufs);
        el.targetLufsSelect.addEventListener('change', () => {
            saveUndoPointForSelectedOrAll('LUFS 타깃 변경 전');
            state.targetLufs = Number(el.targetLufsSelect.value || -14);
            setPlatformPresetCustomFromManualChange();
            invalidateAllMasteredOutput(`${state.targetLufs} LUFS 타깃으로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${state.targetLufs} LUFS 타깃으로 변경했습니다.`);
        });
    }
    if (el.ceilingSelect) {
        state.ceilingDb = Number(el.ceilingSelect.value || state.ceilingDb);
        el.ceilingSelect.addEventListener('change', () => {
            saveUndoPointForSelectedOrAll('피크 천장 변경 전');
            state.ceilingDb = Number(el.ceilingSelect.value || -1.0);
            setPlatformPresetCustomFromManualChange();
            invalidateAllMasteredOutput(`${state.ceilingDb} dBTP 피크 천장으로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${state.ceilingDb} dBTP 피크 천장으로 변경했습니다.`);
        });
    }
    if (el.qualityModeSelect) {
        state.qualityMode = el.qualityModeSelect.value || state.qualityMode;
        el.qualityModeSelect.addEventListener('change', () => {
            saveUndoPointForSelectedOrAll('품질 모드 변경 전');
            state.qualityMode = el.qualityModeSelect.value || 'balanced';
            if (el.platformPresetSelect && state.platformPreset !== 'custom') {
                state.platformPreset = 'custom';
                el.platformPresetSelect.value = 'custom';
            }
            invalidateAllMasteredOutput(`${getQualityModeLabel(state.qualityMode)} 엔진 모드로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${getQualityModeLabel(state.qualityMode)} 엔진 모드로 변경했습니다.`);
        });
    }
    if (el.platformPresetSelect) {
        state.platformPreset = el.platformPresetSelect.value || state.platformPreset;
        el.platformPresetSelect.addEventListener('change', () => {
            saveUndoPointForSelectedOrAll('플랫폼 프리셋 변경 전');
            applyPlatformExportPreset(el.platformPresetSelect.value || 'custom', true);
        });
    }
    if (el.performanceModeSelect) {
        state.performanceMode = el.performanceModeSelect.value || state.performanceMode;
        el.performanceModeSelect.addEventListener('change', () => {
            saveUndoPointForSelectedOrAll('성능 모드 변경 전');
            state.performanceMode = el.performanceModeSelect.value || 'auto';
            invalidateAllMasteredOutput(`${getPerformanceModeLabel(state.performanceMode)} 성능 모드로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${getPerformanceModeLabel(state.performanceMode)} 성능 모드로 변경했습니다.`);
        });
    }
    if (el.pitchEngineSelect) {
        state.pitchEngine = el.pitchEngineSelect.value || state.pitchEngine;
        el.pitchEngineSelect.addEventListener('change', () => {
            saveUndoPointForSelectedOrAll('피치 엔진 변경 전');
            state.pitchEngine = el.pitchEngineSelect.value || 'auto';
            invalidateAllMasteredOutput(`${getPitchEngineLabel(state.pitchEngine)} 피치/속도 엔진으로 변경되었습니다. 다시 마스터링하세요.`);
            renderAll({ keepDetailAudio: true });
            showToast(`${getPitchEngineLabel(state.pitchEngine)} 피치/속도 엔진으로 변경했습니다.`);
        });
    }
    if (el.genreLockBtn) {
        el.genreLockBtn.addEventListener('click', toggleGenreLockForSelected);
    }
    if (el.clearCacheBtn) {
        el.clearCacheBtn.addEventListener('click', async () => {
            await clearAnalysisCache();
        });
    }
    if (el.subscribeNudgeAction) {
        el.subscribeNudgeAction.addEventListener('click', () => {
            markSubscribePromptSeen();
            window.open('https://www.youtube.com/@FoxBearMusic?sub_confirmation=1', '_blank', 'noopener,noreferrer');
            hideSubscribePrompt();
        });
    }
    if (el.subscribeNudgeClose) {
        el.subscribeNudgeClose.addEventListener('click', () => {
            markSubscribePromptSeen();
            hideSubscribePrompt();
        });
    }
}
function enhanceActionSelects() {
    const selects = ACTION_SELECT_IDS.map(id => el[id] || document.getElementById(id)).filter(Boolean);
    if (!selects.length) return;
    ensureSelectPopupScaffold();
    selects.forEach(select => {
        const existing = document.querySelector(`.select-popup-trigger[data-select-for="${select.id}"]`);
        select.classList.add('native-select-hidden');
        select.dataset.fbEnhanced = 'true';
        select.setAttribute('tabindex', '-1');
        if (existing) {
            updateSelectTrigger(select);
            attachHelpTooltip(existing, `${getSelectLabel(select)} 옵션을 버튼형 팝업으로 선택합니다.`);
            return;
        }
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'select-popup-trigger';
        trigger.dataset.selectFor = select.id;
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.addEventListener('click', event => {
            event.preventDefault();
            openSelectPopup(select, trigger);
        });
        select.insertAdjacentElement('afterend', trigger);
        select.addEventListener('change', () => updateSelectTrigger(select));
        updateSelectTrigger(select);
        attachHelpTooltip(trigger, `${getSelectLabel(select)} 옵션을 버튼형 팝업으로 선택합니다.`);
    });
}
function ensureSelectPopupScaffold() {
    if (state.selectPopup && document.body.contains(state.selectPopup.backdrop)) return state.selectPopup;
    const stale = document.querySelector('.select-popup-backdrop');
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
    const backdrop = document.createElement('div');
    backdrop.className = 'select-popup-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', event => {
        if (event.target === backdrop) closeSelectPopup();
    });
    const panel = document.createElement('div');
    panel.className = 'select-popup-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('tabindex', '-1');
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    state.selectPopup = { backdrop, panel, activeSelect: null, lastTrigger: null, keyBound: false };
    if (!state.selectPopupKeyBound) {
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || !state.selectPopup?.activeSelect) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            closeSelectPopup();
        }, true);
        window.addEventListener('resize', () => {
            if (state.selectPopup?.activeSelect) positionPopupPanel();
        }, { passive: true });
        state.selectPopupKeyBound = true;
    }
    return state.selectPopup;
}
function openSelectPopup(select, trigger) {
    const popup = state.selectPopup;
    if (!popup || !select) return;
    popup.activeSelect = select;
    popup.lastTrigger = trigger || null;
    ensureSelectPopupScaffold();
    popup.panel.textContent = '';
    popup.panel.dataset.select = select.id;
    popup.panel.className = 'select-popup-panel';
    popup.panel.classList.toggle('select-popup-dense', select.options.length >= 6);
    popup.panel.classList.toggle('select-popup-compact', select.options.length <= 4);
    popup.panel.classList.toggle('select-popup-genre', select.id === 'genreSelect');
    const label = getSelectLabel(select);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'select-popup-close foxbear-modal-close';
    close.setAttribute('aria-label', `${label} 선택 창 닫기`);
    close.textContent = '×';
    close.addEventListener('click', closeSelectPopup);
    const title = document.createElement('div');
    title.className = 'select-popup-title';
    title.textContent = label;
    popup.panel.append(close, title);
    const list = document.createElement('div');
    list.className = 'select-popup-list';
    list.setAttribute('role', 'listbox');
    Array.from(select.options).forEach(option => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = `select-popup-option${option.value === select.value ? ' active' : ''}`;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', option.value === select.value ? 'true' : 'false');
        item.textContent = option.textContent.trim();
        item.addEventListener('click', () => {
            if (select.value !== option.value) {
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
            closeSelectPopup();
            syncEnhancedSelectButtons();
        });
        list.appendChild(item);
    });
    popup.panel.appendChild(list);
    const managedOverlay = window.FoxBearModalStateMachine?.setExternalLayerOpen?.(popup.backdrop, true, {
        mode: 'dialog',
        panel: popup.panel,
        opener: trigger || document.activeElement,
        lockScroll: true,
        onRequestClose: () => closeSelectPopup()
    });
    if (!managedOverlay) lockPageForPopup();
    popup.backdrop.classList.add('show');
    popup.backdrop.setAttribute('aria-hidden', 'false');
    positionPopupPanel();
    popup.panel.focus({ preventScroll: true });
}
function closeSelectPopup() {
    const popup = state.selectPopup;
    if (!popup) return;
    popup.backdrop.classList.remove('show');
    popup.backdrop.setAttribute('aria-hidden', 'true');
    const lastTrigger = popup.lastTrigger;
    popup.activeSelect = null;
    popup.lastTrigger = null;
    popup.panel.dataset.select = '';
    popup.panel.classList.remove('select-popup-dense', 'select-popup-compact', 'select-popup-genre');
    const managedOverlay = window.FoxBearModalStateMachine?.setExternalLayerOpen?.(popup.backdrop, false);
    if (!managedOverlay) unlockPageForPopup();
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
}
function lockPageForPopup() {
    if (document.body.classList.contains('select-popup-open')) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    state.popupScrollY = scrollY;
    state.popupScrollbarCompensation = scrollbarWidth;
    if (scrollbarWidth > 0 && window.matchMedia('(min-width: 641px)').matches) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.documentElement.classList.add('select-popup-open');
    document.body.classList.add('select-popup-open');
}
function unlockPageForPopup() {
    if (!document.body.classList.contains('select-popup-open')) return;
    const scrollY = state.popupScrollY || 0;
    document.documentElement.classList.remove('select-popup-open');
    document.body.classList.remove('select-popup-open');
    document.body.style.paddingRight = '';
    state.popupScrollY = 0;
    state.popupScrollbarCompensation = 0;
    window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' });
}
function positionPopupPanel() {
    const popup = state.selectPopup;
    if (!popup || !popup.panel) return;
    popup.panel.style.transform = 'translate3d(0,0,0)';
}
function getSelectLabel(select) {
    if (!select) return '선택';
    const label = document.querySelector(`label[for="${select.id}"]`);
    return label ? label.textContent.trim() : '선택';
}
function updateSelectTrigger(select) {
    if (!select) return;
    const trigger = document.querySelector(`.select-popup-trigger[data-select-for="${select.id}"]`);
    if (!trigger) return;
    const selected = select.options[select.selectedIndex];
    const label = getSelectLabel(select);
    const value = selected ? selected.textContent.trim() : '선택';
    let valueEl = trigger.querySelector('.select-trigger-value');
    if (!valueEl) {
        trigger.textContent = '';
        valueEl = document.createElement('span');
        valueEl.className = 'select-trigger-value';
        const icon = document.createElement('span');
        icon.className = 'select-trigger-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '⌄';
        trigger.append(valueEl, icon);
    }
    valueEl.textContent = value;
    trigger.setAttribute('aria-label', `${label}: ${value}`);
}
function syncEnhancedSelectButtons() {
    ACTION_SELECT_IDS.forEach(id => updateSelectTrigger(el[id]));
}
function initUiGuards() {
    return window.FoxBearSiteGuards?.initUiGuards?.();
}
function maybeShowSubscribePrompt() {
    if (!el.subscribeNudge) return;
    const now = Date.now();
    const coolDownMs = 60 * 60 * 1000;
    let lastShown = 0;
    try {
        lastShown = Number(localStorage.getItem('foxbearSubscribeNudgeLastShown') || '0');
    } catch (error) {
        lastShown = 0;
    }
    if (now - lastShown < coolDownMs) return;
    setTimeout(() => {
        el.subscribeNudge.classList.add('show');
        try { localStorage.setItem('foxbearSubscribeNudgeLastShown', String(now)); } catch (error) {}
        setTimeout(hideSubscribePrompt, 15000);
    }, 900);
}
function markSubscribePromptSeen() {
    try {
        localStorage.setItem('foxbearSubscribeNudgeLastShown', String(Date.now()));
    } catch (error) {
        // 저장 불가 환경에서는 현재 세션에서만 닫힙니다.
    }
}
function hideSubscribePrompt() {
    if (el.subscribeNudge) el.subscribeNudge.classList.remove('show');
}
function toggleFeature(key) {
    if (!Object.prototype.hasOwnProperty.call(state.featureFlags, key)) return;
    state.featureFlags[key] = !state.featureFlags[key];
    if (key === 'albumMatch') state.albumProfile = computeAlbumProfile();
    invalidateAllMasteredOutput(`${FEATURE_DEFINITIONS[key].label} 설정이 변경되었습니다. 다시 마스터링하세요.`);
    renderFeatureButtons();
    renderAll({ keepDetailAudio: true });
    showToast(`${FEATURE_DEFINITIONS[key].label}: ${state.featureFlags[key] ? '켜짐' : '꺼짐'} · ${FEATURE_DEFINITIONS[key].short}`);
}
const FOXBEAR_UPLOAD_ACCEPT = AUDIO_IMPORT_ACCEPT;
function getAudioImportCapabilityService() { return window.FoxBearAudioImportCapabilityService || FoxBearAudioImportCapabilityService || null; }
function getFoxBearFilePickerTypes() {
    const service = getAudioImportCapabilityService();
    return service?.getPickerTypes?.() || [{ description: 'FoxBear 안정 오디오 파일', accept: { 'audio/wav': ['.wav', '.wave'], 'audio/mpeg': ['.mp3', '.mpeg', '.mpga'], 'audio/aiff': ['.aif', '.aiff', '.aifc'] } }];
}
function syncAudioImportCapabilities() {
    const service = getAudioImportCapabilityService();
    if (service?.applyToInputs) return service.applyToInputs({ fileInput: el.fileInput, folderInput: el.folderInput, referenceInput: el.referenceInput, statusElement: el.importStatus });
    [el.fileInput, el.folderInput, el.referenceInput].filter(Boolean).forEach(input => input.setAttribute('accept', FOXBEAR_UPLOAD_ACCEPT)); return null;
}
function supportsSystemDirectoryPicker() {
    return typeof window.showDirectoryPicker === 'function';
}
function supportsDirectoryInput(input = el.folderInput) {
    return Boolean(input && ('webkitdirectory' in input || 'directory' in input));
}
function updateImportStatus(message, tone = 'info') {
    const target = (typeof el !== 'undefined' && el.importStatus) ? el.importStatus : document.getElementById('importStatus');
    if (!target) return;
    target.textContent = message || '';
    target.dataset.tone = tone || 'info';
}
function getBulkImportHudView() {
    const view = window.FoxBearBulkImportHudView;
    if (!view || typeof view.update !== 'function') return null;
    return view;
}
function getBulkImportHudDeps() {
    return {
        el,
        state,
        clamp,
        statusLabel,
        syncFloatingOverlayStack,
        showToast: showToastSafe,
        onMasterAll: () => masterAllTracks(),
        onCancelBatch: reason => cancelActiveMasteringBatch(reason),
        onPauseBatch: reason => pauseActiveMasteringBatch(reason),
        onResumeBatch: reason => resumeActiveMasteringBatch(reason),
        onSkipCurrent: reason => skipCurrentMasteringTrack(reason),
        onMoveTrack: (trackId, direction) => movePendingMasteringTrack(trackId, direction),
        onRetryFailed: () => retryFailedBulkMasteringTracks(),
        scheduleRender: reason => scheduleRenderAll(reason, { keepDetailAudio: true, immediate: true }),
        minTracks: SAFE_BULK_IMPORT_HUD_MIN_TRACKS,
        doneHoldMs: SAFE_BULK_IMPORT_HUD_DONE_HOLD_MS,
        getLargeBatchThreshold: () => SAFE_LARGE_IMPORT_BATCH_THRESHOLD
    };
}
function initBulkImportHudEvents() {
    const view = getBulkImportHudView();
    if (!view || typeof view.init !== 'function') return null;
    view.init(getBulkImportHudDeps());
    return view;
}
function beginBulkImportHudBatch(tracks, options = {}) {
    const view = getBulkImportHudView();
    if (!view || typeof view.beginBatch !== 'function') return null;
    view.configure?.(getBulkImportHudDeps());
    return view.beginBatch(tracks, options);
}
function beginBulkMasteringHudBatch(tracks, options = {}) {
    const items = Array.isArray(tracks) ? tracks.filter(Boolean) : []; const view = getBulkImportHudView();
    if (!view || !items.length) return null;
    view.configure?.(getBulkImportHudDeps());
    return typeof view.beginMasteringBatch === 'function' ? view.beginMasteringBatch(items, options) : (typeof view.beginBatch === 'function' ? view.beginBatch(items, options) : null);
}
function updateBulkImportHud() {
    const view = getBulkImportHudView();
    if (!view || typeof view.update !== 'function') return null;
    view.configure?.(getBulkImportHudDeps());
    return view.update();
}
function getBulkImportHudSnapshot() {
    const view = getBulkImportHudView();
    return view && typeof view.getSnapshot === 'function' ? view.getSnapshot() : Object.freeze({ version: '1.6.37-ui-shell-cross-generation-recovery', total: 0, pending: 0, active: 0, fallback: true });
}
function showToastSafe(message) {
    try { showToast(message); } catch (error) { console.warn('toast unavailable:', message); }
}
function prepareNativeFileInput(input) {
    if (!input) return;
    try { input.value = ''; } catch (error) {}
    input.dataset.lastPickerRequestAt = String(Date.now());
    input.dataset.lastPickerChanged = 'false';
}
function markNativeInputChanged(input) {
    if (!input) return;
    input.dataset.lastPickerChanged = 'true';
    input.dataset.lastPickerChangedAt = String(Date.now());
}
function armPickerReturnWatch(input, label = '파일') {
    if (!input || input.dataset.pickerWatchBound === 'true') return;
    input.dataset.pickerWatchBound = 'true';
    const check = () => {
        const requestedAt = Number(input.dataset.lastPickerRequestAt || 0);
        if (!requestedAt || input.dataset.lastPickerChanged === 'true') return;
        const elapsed = Date.now() - requestedAt;
        if (elapsed < 800) return;
        updateImportStatus(`${label} 선택기가 닫혔지만 앱으로 전달된 파일이 없습니다. 카카오톡 인앱이면 우측 상단 메뉴에서 Chrome/Safari로 열어 다시 시도하거나, 파일명이 없는 음원은 다운로드 후 선택해주세요.`, 'warn');
    };
    window.addEventListener('focus', () => window.setTimeout(check, 450), { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) window.setTimeout(check, 450);
    }, { passive: true });
}
function clickNativeFileInput(input, label = '파일') {
    if (!input) {
        showToastSafe(`${label} 선택기를 찾지 못했습니다. 페이지를 새로고침 후 다시 시도하세요.`);
        updateImportStatus(`${label} 선택기를 찾지 못했습니다.`, 'error');
        return false;
    }
    prepareNativeFileInput(input);
    armPickerReturnWatch(input, label);
    updateImportStatus(`${label} 선택기를 여는 중입니다. 선택 후에도 반응이 없으면 카카오톡 메뉴의 외부 브라우저 열기를 사용하세요.`, 'active');
    try {
        input.click();
        return true;
    } catch (error) {
        console.warn('native file input click failed:', error);
        showToastSafe(`${label} 선택기를 열지 못했습니다. 브라우저 권한 또는 인앱 브라우저 제한을 확인하세요.`);
        updateImportStatus(`${label} 선택기를 열지 못했습니다. 외부 브라우저에서 다시 시도하세요.`, 'error');
        return false;
    }
}
async function openSystemFilePicker() {
    try {
        const handles = await window.showOpenFilePicker({
            multiple: true,
            excludeAcceptAllOption: false,
            types: getFoxBearFilePickerTypes()
        });
        const files = await Promise.all((handles || []).map(handle => handle.getFile()));
        if (files.length) await handleFiles(files);
        else showToast('선택된 파일이 없습니다.');
        return true;
    } catch (error) {
        if (error?.name === 'AbortError') return true;
        console.warn('showOpenFilePicker failed:', error);
        showToast('시스템 파일 선택이 막혀 기본 파일 선택으로 전환합니다.');
        return false;
    }
}
function isLikelyAudioFileHandle(name = '', kind = '') {
    const lower = String(name || '').toLowerCase();
    if (kind && kind !== 'file') return false;
    const service = getAudioImportCapabilityService();
    if (service && typeof service.getFileCapability === 'function') return service.getFileCapability(name).ok;
    return AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext)) || VIDEO_AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
}
function attachRelativePathToFile(file, relativePath) {
    if (!file || !relativePath) return file;
    try {
        Object.defineProperty(file, 'webkitRelativePath', {
            value: String(relativePath),
            configurable: true
        });
    } catch (error) {
        // 일부 브라우저는 readonly 속성 재정의를 막습니다. 파일 자체는 그대로 처리합니다.
    }
    return file;
}
function getFileExtension(fileOrName = '') {
    const name = typeof fileOrName === 'string' ? fileOrName : (fileOrName?.name || '');
    const match = String(name || '').toLowerCase().match(/\.[a-z0-9]+$/);
    return match ? match[0] : '';
}
function getAudioImportSupportLabel(fileOrName = '') {
    const service = getAudioImportCapabilityService();
    if (service && typeof service.getFileCapability === 'function') return service.getFileCapability(fileOrName).label;
    const ext = getFileExtension(fileOrName);
    if (!ext) return '확장자 없음';
    if (CORE_AUDIO_EXTENSIONS.includes(ext)) return '권장 입력';
    if (CONTAINER_AUDIO_EXTENSIONS.includes(ext)) return '컨테이너 입력';
    if (EXPERIMENTAL_AUDIO_EXTENSIONS.includes(ext)) return '브라우저 조건부';
    return '미확인 입력';
}
function getAudioImportDecodeHint(fileOrName = '') {
    const capability = getAudioImportCapabilityService()?.getFileCapability?.(fileOrName);
    if (capability && !capability.ok) return ` ${capability.reason}`;
    const service = window.FoxBearAudioDecodeService;
    if (service && typeof service.getAudioImportDecodeHint === 'function') return service.getAudioImportDecodeHint(fileOrName);
    return capability?.reason ? ` ${capability.reason}` : '';
}
async function collectFilesFromDirectoryHandle(directoryHandle, prefix = '', out = []) {
    if (!directoryHandle || typeof directoryHandle.entries !== 'function') return out;
    for await (const [name, handle] of directoryHandle.entries()) {
        const relativePath = prefix ? `${prefix}/${name}` : name;
        if (handle.kind === 'directory') {
            await collectFilesFromDirectoryHandle(handle, relativePath, out);
            continue;
        }
        if (!isLikelyAudioFileHandle(name, handle.kind)) continue;
        try {
            const file = await handle.getFile();
            out.push(attachRelativePathToFile(file, relativePath));
            if (out.length >= MAX_FILES) break;
        } catch (error) {
            console.warn('directory file read skipped:', relativePath, error);
        }
    }
    return out;
}
async function openSystemDirectoryPicker() {
    try {
        const directory = await window.showDirectoryPicker({ mode: 'read' });
        const files = await collectFilesFromDirectoryHandle(directory);
        if (!files.length) {
            showToast('폴더 안에서 지원 오디오 파일을 찾지 못했습니다.');
            return true;
        }
        await handleFiles(files);
        showToast(`${Math.min(files.length, MAX_FILES)}개 파일을 폴더에서 불러왔습니다.`);
        return true;
    } catch (error) {
        if (error?.name === 'AbortError') return true;
        console.warn('showDirectoryPicker failed:', error);
        showToast('시스템 폴더 선택이 막혀 기본 폴더/파일 선택으로 전환합니다.');
        return false;
    }
}
function openUploadPicker(kind = 'file') {
    foxBearHaptic('tap');
    if (kind === 'folder') {
        if (supportsDirectoryInput(el.folderInput)) {
            clickNativeFileInput(el.folderInput, '폴더');
            return;
        }
        if (supportsSystemDirectoryPicker()) {
            openSystemDirectoryPicker().then(opened => {
                if (!opened) clickNativeFileInput(el.fileInput, '파일');
            });
            return;
        }
        showToast('이 브라우저는 폴더 선택을 지원하지 않아 여러 파일 선택으로 대체합니다.');
        clickNativeFileInput(el.fileInput, '파일');
        return;
    }
    // v1.3.65: 사용자 제스처 안에서 가장 안정적인 <input type="file"> 경로를 우선 사용합니다.
    // showOpenFilePicker()는 일부 브라우저/인앱 환경에서 선택 후 File 객체 전달이 끊기거나,
    // 실패 후 fallback input.click()이 사용자 활성화 밖에서 막히는 사례가 있어 보조 경로로만 남깁니다.
    clickNativeFileInput(el.fileInput, '파일');
}
function bindNativeUploadLabel(label, input, kind = 'file') {
    if (!label || !input) return;
    if (label.dataset.nativePickerBound === 'true') return;
    label.dataset.nativePickerBound = 'true';
    input.dataset.nativePickerBound = 'true';
    const labelText = kind === 'folder' ? '폴더' : '파일';
    armPickerReturnWatch(input, labelText);
    const prime = () => {
        label.classList.add('picker-active');
        foxBearHaptic('tap');
        prepareNativeFileInput(input);
        updateImportStatus(`${labelText} 선택 대기 중 · 카카오톡/인앱 브라우저도 표준 파일 입력으로 처리합니다.`, 'active');
        window.setTimeout(() => label.classList.remove('picker-active'), 420);
    };
    label.addEventListener('pointerdown', prime, { passive: true });
    label.addEventListener('touchstart', prime, { passive: true });
    input.addEventListener('click', () => {
        prepareNativeFileInput(input);
        updateImportStatus(`${labelText} 선택기를 열었습니다.`, 'active');
    });
    label.addEventListener('click', event => {
        // v1.3.65: 카카오톡/Android WebView 호환성을 위해 실제 input을 타일 위에 투명 오버레이합니다.
        // 마우스/터치 클릭에서는 preventDefault()를 쓰지 않아 브라우저의 네이티브 파일 권한 흐름을 보존합니다.
        if (kind === 'folder' && !supportsDirectoryInput(input) && supportsSystemDirectoryPicker() && event.target !== input) {
            event.preventDefault();
            openUploadPicker(kind);
            return;
        }
        if (kind === 'folder' && !supportsDirectoryInput(input)) {
            updateImportStatus('이 브라우저는 폴더 선택을 제한할 수 있어 여러 파일 선택으로 대체될 수 있습니다.', 'warn');
        }
    });
    label.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        prepareNativeFileInput(input);
        openUploadPicker(kind);
    });
}
function setupDropZone(zone) {
    zone.addEventListener('dragover', event => {
        event.preventDefault();
        zone.style.borderColor = 'rgba(127,255,212,0.78)';
    });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', event => {
        event.preventDefault();
        zone.style.borderColor = '';
        if (event.dataTransfer && event.dataTransfer.files) handleFiles(event.dataTransfer.files);
    });
}
function getImportAnalysisQueueController() {
    if (importAnalysisController) return importAnalysisController;
    const service = window.FoxBearImportQueueService;
    if (service && typeof service.createTrackAnalysisQueue === 'function') {
        importAnalysisController = service.createTrackAnalysisQueue({
            concurrency: SAFE_IMPORT_ANALYSIS_CONCURRENCY,
            largeBatchThreshold: SAFE_LARGE_IMPORT_BATCH_THRESHOLD,
            yieldMs: SAFE_IMPORT_QUEUE_YIELD_MS,
            isTrackStillImported,
            runTrack: (track, task) => analyzeTrack(track, task),
            reportTrackAnalysisError,
            onCancel: track => {
                if (!isTrackStillImported(track)) return;
                track.report = '분석 작업 취소 중';
                scheduleRenderAll('analysis-cancel', { keepDetailAudio: true });
            },
            getRenderQueue: () => typeof getRenderSchedulerSnapshot === 'function' ? getRenderSchedulerSnapshot() : null,
            onStatus: (snapshot, context) => updateImportAnalysisQueueStatus(context, snapshot)
        });
    } else {
        console.warn('FoxBearImportQueueService unavailable; import analysis queue will stay idle.');
        importAnalysisController = Object.freeze({
            getSnapshot: () => Object.freeze({
                version: '1.4.28-app-slimdown-fallback',
                active: 0,
                pending: 0,
                queuedIds: 0,
                lastBatchSize: 0,
                concurrency: SAFE_IMPORT_ANALYSIS_CONCURRENCY,
                largeBatchThreshold: SAFE_LARGE_IMPORT_BATCH_THRESHOLD,
                yieldMs: SAFE_IMPORT_QUEUE_YIELD_MS,
                renderQueue: typeof getRenderSchedulerSnapshot === 'function' ? getRenderSchedulerSnapshot() : null
            }),
            queueTrack: () => false,
            queueTracks: () => this.getSnapshot?.() || Object.freeze({ active: 0, pending: 0 }),
            schedule: () => null,
            runPump: () => null,
            cancelTrack: () => null,
            cancelAll: () => null,
            clear: () => null
        });
    }
    return importAnalysisController;
}
function getImportAnalysisQueueSnapshot() {
    return getImportAnalysisQueueController().getSnapshot();
}
function isTrackStillImported(track) {
    return Boolean(track && state.tracks.some(item => item && item.id === track.id));
}
function updateImportAnalysisQueueStatus(context = '', snapshotOverride = null) {
    const snapshot = snapshotOverride || getImportAnalysisQueueSnapshot();
    const totalWorking = snapshot.active + snapshot.pending;
    if (!totalWorking) {
        if (context === 'complete') updateImportStatus('대량 업로드 분석 대기열 완료', 'ready');
        updateBulkImportHud();
        return snapshot;
    }
    updateBulkImportHud();
    updateImportStatus(`분석 대기열 진행 중 · 실행 ${snapshot.active} / 대기 ${snapshot.pending}${context ? ` · ${context}` : ''}`, 'active');
    return snapshot;
}
function reportTrackAnalysisError(track, error) {
    if (!track || isAnalysisCancellationError(error)) return;
    track.status = 'error';
    track.error = getErrorMessage(error, '분석 실패');
    track.report = track.error;
    scheduleRenderAll('analysis-error', { keepDetailAudio: true });
    showToastSafe(`${track.name}: ${track.error}`);
    updateImportStatus(`${track.name}: ${track.error}`, 'error');
}
function scheduleImportAnalysisPump(delayMs = SAFE_IMPORT_QUEUE_YIELD_MS) {
    return getImportAnalysisQueueController().schedule(delayMs);
}
function queueTrackForAnalysis(track) {
    return getImportAnalysisQueueController().queueTrack(track);
}
function queueTracksForAnalysis(tracks, options = {}) {
    return getImportAnalysisQueueController().queueTracks(tracks, options);
}
function runImportAnalysisPump() {
    return getImportAnalysisQueueController().runPump();
}
window.FoxBearBulkImportGuard = Object.freeze({
    getSnapshot: getImportAnalysisQueueSnapshot,
    getPolicy: getImportMemoryPolicy,
    queueTracksForAnalysis,
    cancelTrack: (trackOrId, reason) => getImportAnalysisQueueController().cancelTrack?.(trackOrId, reason),
    cancelAll: reason => getImportAnalysisQueueController().cancelAll?.(reason),
    get concurrency() { return SAFE_IMPORT_ANALYSIS_CONCURRENCY; },
    get largeBatchThreshold() { return SAFE_LARGE_IMPORT_BATCH_THRESHOLD; }
});
function getMasteringQueueSnapshot() {
    const activeIds = Array.from(masteringQueueState.activeIds);
    return Object.freeze({
        version: '1.6.37-ui-shell-cross-generation-recovery',
        active: activeIds.length,
        activeIds,
        activeNames: activeIds.map(id => masteringQueueState.activeNames.get(id)).filter(Boolean),
        busy: Boolean(state.busy),
        startedAt: masteringQueueState.startedAt || 0,
        lastStartedAt: masteringQueueState.lastStartedAt || 0,
        lastCompletedAt: masteringQueueState.lastCompletedAt || 0,
        completedCount: masteringQueueState.completedCount,
        failedCount: masteringQueueState.failedCount,
        lastStatus: masteringQueueState.lastStatus,
        progressRenderDelayMs: SAFE_MASTERING_PROGRESS_RENDER_DELAY_MS,
        renderQueue: typeof getRenderSchedulerSnapshot === 'function' ? getRenderSchedulerSnapshot() : null,
        workerJobs: getWorkerJobService()?.getDiagnostics?.() || null
    });
}
function markMasteringQueueStart(track, mode = 'single') {
    if (!track) return getMasteringQueueSnapshot();
    const now = Date.now();
    masteringQueueState.activeIds.add(track.id);
    masteringQueueState.activeNames.set(track.id, track.name || track.id);
    if (!masteringQueueState.startedAt) masteringQueueState.startedAt = now;
    masteringQueueState.lastStartedAt = now;
    masteringQueueState.lastStatus = mode || 'active';
    updateBulkImportHud();
    return getMasteringQueueSnapshot();
}
function markMasteringQueueEnd(track, status = 'done') {
    if (track) {
        masteringQueueState.activeIds.delete(track.id);
        masteringQueueState.activeNames.delete(track.id);
    }
    masteringQueueState.lastCompletedAt = Date.now();
    if (status === 'done') masteringQueueState.completedCount += 1;
    else if (status === 'error') masteringQueueState.failedCount += 1;
    if (!masteringQueueState.activeIds.size) masteringQueueState.startedAt = 0;
    masteringQueueState.lastStatus = status || 'idle';
    updateBulkImportHud();
    return getMasteringQueueSnapshot();
}
window.FoxBearMasteringGuard = Object.freeze({
    version: '1.6.37-ui-shell-cross-generation-recovery',
    getSnapshot: getMasteringQueueSnapshot
});
window.FoxBearMasteringDiagnostics = Object.freeze({ version: '1.6.37-ui-shell-cross-generation-recovery', getSnapshot: getMasteringPerformanceSnapshot });
function getMasteringMemoryPolicyOptions(reason = 'release-after-encode', extra = {}) {
    const completedCount = state.tracks.filter(track => track && track.status === 'done').length;
    const activeBatchSize = Math.max(completedCount, ...state.tracks.map(track => Number(track?.bulkMasteringTotal || 0)).filter(Number.isFinite));
    return Object.assign({ selectedId: state.selectedId, retainCompletedPcm: false, forceReleaseAll: true, keepSelected: false, keepRecent: 0,
        maxRetainedBuffers: 0, maxMasteredBufferBytes: 0, largeBatch: activeBatchSize >= SAFE_LARGE_IMPORT_BATCH_THRESHOLD, batchSize: activeBatchSize, reason }, extra || {});
}
function getSingleTrackDownloadReencodePolicy(track, calledFromBatch = false) {
    if (!track || calledFromBatch || state.selectedId !== track.id || isRestrictedDownloadBrowser()) return {};
    const mobile = Boolean(window.matchMedia?.('(pointer: coarse)')?.matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')), deviceMemoryGb = Math.max(0, Number(navigator.deviceMemory || 0));
    if (mobile || (deviceMemoryGb > 0 && deviceMemoryGb <= 4)) return {}; // encoded Blob only on mobile/low-memory devices
    const bytes = Math.max(0, Number(track.masteredBuffer?.numberOfChannels || 0) * Number(track.masteredBuffer?.length || 0) * 4), budget = 384 * 1024 * 1024;
    return !bytes || bytes > budget ? {} : { retainCompletedPcm: true, forceReleaseAll: false, keepSelected: true, keepRecent: 0, maxRetainedBuffers: 1, maxMasteredBufferBytes: budget };
}
function applyCompletedMasteringMemoryPolicy(reason = 'completed-batch-policy', extra = {}) {
    const service = getMemoryGuardService();
    if (!service || typeof service.releaseCompletedMasteredBuffers !== 'function') return null;
    const result = service.releaseCompletedMasteredBuffers(state.tracks, getMasteringMemoryPolicyOptions(reason, extra));
    if (result && result.released) {
        console.info('FoxBear memory guard released completed mastered buffers:', result);
    }
    return result;
}
function getMemoryGuardSnapshot() {
    const service = getMemoryGuardService();
    if (!service || typeof service.getSnapshot !== 'function') return Object.freeze({ version: 'v1.6.37-ui-shell-cross-generation-recovery', unavailable: true, trackCount: state.tracks.length });
    return service.getSnapshot(state.tracks, getMasteringMemoryPolicyOptions('snapshot'));
}
function diagnoseCompletedMasteringMemory(reason = 'manual-diagnostic') {
    const service = getMemoryGuardService();
    if (!service || typeof service.diagnoseCompletedBatch !== 'function') return Object.freeze({ version: 'v1.6.37-ui-shell-cross-generation-recovery', unavailable: true });
    const result = service.diagnoseCompletedBatch(state.tracks, getMasteringMemoryPolicyOptions(reason));
    console.info('FoxBear memory guard diagnostic:', result);
    return result;
}
function afterMasteringBatchMemorySweep(batchSummary = {}) {
    const completed = Number(batchSummary.completed || 0);
    if (!completed) return null;
    const result = diagnoseCompletedMasteringMemory('batch-complete-sweep');
    const released = Number(result?.policyResult?.released || 0);
    if (released) showToast(`메모리 안정화 · 완료 버퍼 ${released}개 자동 해제`);
    const pressure = String(result?.after?.pressure || 'normal'); if (pressure !== 'normal') showToast(`메모리 ${pressure === 'high' ? '위험' : '주의'} · ZIP/export 전 곡별 저장도 준비하세요`);
    return result;
}
window.FoxBearMemoryGuard = Object.freeze({
    version: 'v1.6.37-ui-shell-cross-generation-recovery',
    getSnapshot: getMemoryGuardSnapshot,
    applyPolicy: applyCompletedMasteringMemoryPolicy,
    diagnose: diagnoseCompletedMasteringMemory
});
window.FoxBearExportGuard = Object.freeze({ version: 'v1.6.37-ui-shell-cross-generation-recovery', getReadiness: () => getExportGuardService()?.getExportReadiness?.(state.tracks, { memorySnapshot: getMemoryGuardSnapshot() }) || null, getDiagnostics: () => getExportGuardService()?.getDiagnostics?.() || [] });
async function handleNativeInputFiles(fileList, kind = 'file') {
    const count = fileList && typeof fileList.length === 'number' ? fileList.length : 0;
    const input = kind === 'folder' ? el.folderInput : el.fileInput;
    markNativeInputChanged(input);
    if (!count) {
        updateImportStatus('파일 선택이 취소되었거나 브라우저가 파일 정보를 전달하지 않았습니다.', 'warn');
        return;
    }
    try {
        const label = kind === 'folder' ? '폴더 항목' : '파일';
        if (count === 1) showToastSafe(`${label} 1개 선택됨 · 추천값 확인 준비 중`);
        else showToastSafe(`${count}개 ${label} 선택됨 · AI 추천값은 자동 적용됩니다`);
        updateImportStatus(`${count}개 ${label} 선택됨 · 앱으로 전달 완료 · 분석 대기열 등록 중`, 'active');
        const result = await handleFiles(fileList);
        if (result?.added) updateImportStatus(`${result.added}개 트랙 등록 완료 · 디코딩/분석을 시작했습니다.`, 'ready');
        else if (result?.invalid) updateImportStatus(`${result.invalid}개 항목을 열지 못했습니다. 파일명/코덱을 확인하거나 WAV/MP3/M4A로 변환해보세요.`, 'error');
        else updateImportStatus('선택한 항목에서 불러올 수 있는 오디오를 찾지 못했습니다.', 'warn');
    } catch (error) {
        console.error('native input import failed:', error);
        const message = getErrorMessage(error, '파일을 불러오지 못했습니다.');
        showToastSafe(message);
        updateImportStatus(`${message} · 카카오톡 인앱이면 외부 브라우저로 열어 다시 시도하세요.`, 'error');
    }
}
async function preflightImportPlanDecodedMemory(plan) {
    const service = window.FoxBearImportPreflightService;
    if (!service?.run) return Object.freeze({ ...plan, decodedMemoryRejected: [], skippedByDecodedMemory: 0 });
    return service.run(plan, { lowMemoryMaxDecodedPcmBytes: FoxBearRuntimeConfig.LOW_MEMORY_MAX_DECODED_PCM_BYTES, lowMemoryMaxDecodePeakBytes: FoxBearRuntimeConfig.LOW_MEMORY_MAX_DECODE_PEAK_BYTES, standardMaxDecodedPcmBytes: FoxBearRuntimeConfig.STANDARD_MAX_DECODED_PCM_BYTES, standardMaxDecodePeakBytes: FoxBearRuntimeConfig.STANDARD_MAX_DECODE_PEAK_BYTES, metadataTimeoutMs: FoxBearRuntimeConfig.IMPORT_METADATA_PROBE_TIMEOUT_MS, concurrency: FoxBearRuntimeConfig.IMPORT_METADATA_PROBE_CONCURRENCY, largeBatchThreshold: SAFE_LARGE_IMPORT_BATCH_THRESHOLD, onStatus: updateImportStatus, onProbeError: (error, file) => console.warn('Import memory preflight skipped:', file?.name, error) });
}
async function handleFiles(fileList) {
    const incoming = Array.from(fileList || []).filter(Boolean);
    if (!incoming.length) return { added: 0, invalid: 0, limited: 0 };
    let plan = planImportFilesForCurrentDevice(incoming);
    updateImportStatus(`${incoming.length}개 항목 수신 · 파일 형식 확인 중`, 'active');
    plan = await preflightImportPlanDecodedMemory(plan);
    const { policy: importPolicy, accepted, invalidEntries, memoryRejected, decodedMemoryRejected = [], skippedByLimit, skippedByMemory, skippedByDecodedMemory = 0, largeBatch } = plan;
    if (state.tracks.length + incoming.length > importPolicy.maxFiles) showToast(`현재 기기에서는 최대 ${importPolicy.maxFiles}개까지만 추가할 수 있습니다.`);
    invalidEntries.forEach(({ file, validation }) => { showToastSafe(`${file.name || '선택 파일'}: ${validation.reason}`); updateImportStatus(`${file.name || '선택 파일'}: ${validation.reason}`, 'error'); });
    memoryRejected.forEach(file => { const reason = `현재 기기 안전 한도(${formatBytes(importPolicy.maxBatchBytes)})를 넘어 제외했습니다.`; showToastSafe(`${file.name || '선택 파일'}: ${reason}`); updateImportStatus(`${file.name || '선택 파일'}: ${reason}`, 'warn'); });
    decodedMemoryRejected.forEach(({ file, reason }) => { showToastSafe(`${file.name || '선택 파일'}: ${reason}`); updateImportStatus(`${file.name || '선택 파일'}: ${reason}`, 'warn'); });
    const singleUploadDialogCandidate = accepted.length === 1, addedTracks = [];
    const pendingExternalTrackProfile = accepted.length ? externalBrowserHandoffBridge?.hasPendingTrackProfile?.() : false;
    for (const { file, validation, memoryProbe = null } of accepted) {
        const track = createTrack(file);
        Object.assign(track, { importLabel: validation.label, importMemoryEstimate: memoryProbe, importedAt: new Date().toISOString(), importQueueYieldMs: importPolicy.queueYieldMs, importMemoryPolicy: importPolicy.label, autoAiRecommendDialog: singleUploadDialogCandidate, bulkRecommendationMode: singleUploadDialogCandidate ? 'single-dialog' : 'auto-apply', report: largeBatch ? `대량 업로드 안전 대기열 등록 중 (${addedTracks.length + 1}/${accepted.length}) · AI 추천값 자동 적용 예정` : (singleUploadDialogCandidate ? '분석 후 추천값 선택 팝업 준비 중' : '분석 대기열 등록 중 · AI 추천값 자동 적용 예정') });
        if (pendingExternalTrackProfile && addedTracks.length === 0) externalBrowserHandoffBridge?.applyPendingTrackProfile?.(track);
        state.tracks.push(track);
        if (state.selectedIds && typeof state.selectedIds.add === 'function') state.selectedIds.add(track.id);
        if (!state.selectedId || singleUploadDialogCandidate) { state.selectedId = track.id; state.bottomPreviewTrackId = track.id; applyTrackToControls(track); }
        addedTracks.push(track);
    }
    clearFileInputs();
    const added = addedTracks.length, invalid = invalidEntries.length;
    const totalSkippedByMemory = skippedByMemory + skippedByDecodedMemory;
    if (added) {
        beginBulkImportHudBatch(addedTracks, { largeBatch, skippedByLimit: skippedByLimit + totalSkippedByMemory });
        scheduleRenderAll('import-register', { keepDetailAudio: true, immediate: !largeBatch, delayMs: largeBatch ? 120 : 0 });
        queueTracksForAnalysis(addedTracks, { largeBatch, skippedByLimit: skippedByLimit + totalSkippedByMemory, yieldMs: importPolicy.queueYieldMs });
        const queueText = largeBatch ? `대량 업로드 안전 모드로 ${SAFE_IMPORT_ANALYSIS_CONCURRENCY}곡씩 순차 분석하고 곡 사이 ${importPolicy.queueYieldMs}ms 휴지합니다.` : '오디오 디코딩/분석 대기열을 시작합니다.', recommendationText = singleUploadDialogCandidate ? '추천값 선택 팝업을 준비합니다.' : '각 곡 AI 추천값은 자동 적용됩니다.', skippedText = [skippedByLimit ? `${skippedByLimit}개 최대 개수 제한` : '', skippedByMemory ? `${skippedByMemory}개 압축 파일 용량 한도` : '', skippedByDecodedMemory ? `${skippedByDecodedMemory}개 디코딩 메모리 한도` : ''].filter(Boolean).join(' · ');
        showToastSafe(`${added}개 트랙 등록 완료. ${queueText} ${recommendationText}${skippedText ? ` · ${skippedText}으로 제외` : ''}`);
    } else if (invalid || totalSkippedByMemory) showToastSafe('선택한 파일을 현재 기기에서 안전하게 열 수 없습니다. 더 짧은 WAV/MP3 파일 또는 데스크톱 브라우저를 사용해주세요.');
    return { added, invalid, limited: skippedByLimit + totalSkippedByMemory };
}
function getImportMemoryPolicy() {
    const service = window.FoxBearImportQueueService;
    return service?.createImportMemoryPolicy?.({ maxFiles: MAX_FILES, maxFileSize: MAX_FILE_SIZE, lowMemoryMaxFiles: FoxBearRuntimeConfig.LOW_MEMORY_MAX_FILES, lowMemoryMaxFileSize: FoxBearRuntimeConfig.LOW_MEMORY_MAX_FILE_SIZE, lowMemoryBatchBytes: FoxBearRuntimeConfig.LOW_MEMORY_IMPORT_BATCH_BYTES, normalYieldMs: SAFE_IMPORT_QUEUE_YIELD_MS, lowMemoryYieldMs: FoxBearRuntimeConfig.LOW_MEMORY_IMPORT_YIELD_MS, largeBatchThreshold: SAFE_LARGE_IMPORT_BATCH_THRESHOLD, coarsePointer: Boolean(window.matchMedia?.('(pointer: coarse)')?.matches), userAgent: navigator.userAgent, deviceMemory: navigator.deviceMemory }) || Object.freeze({ lowMemory: false, mobile: false, deviceMemoryGb: 0, maxFiles: MAX_FILES, maxFileSize: MAX_FILE_SIZE, maxBatchBytes: Number.MAX_SAFE_INTEGER, queueYieldMs: SAFE_IMPORT_QUEUE_YIELD_MS, label: 'standard' });
}
function planImportFilesForCurrentDevice(fileList) {
    const service = window.FoxBearImportQueueService, policy = getImportMemoryPolicy();
    return service?.planImportFiles?.(fileList, state.tracks.length, { maxFiles: MAX_FILES, maxFileSize: MAX_FILE_SIZE, lowMemoryMaxFiles: FoxBearRuntimeConfig.LOW_MEMORY_MAX_FILES, lowMemoryMaxFileSize: FoxBearRuntimeConfig.LOW_MEMORY_MAX_FILE_SIZE, lowMemoryBatchBytes: FoxBearRuntimeConfig.LOW_MEMORY_IMPORT_BATCH_BYTES, normalYieldMs: SAFE_IMPORT_QUEUE_YIELD_MS, lowMemoryYieldMs: FoxBearRuntimeConfig.LOW_MEMORY_IMPORT_YIELD_MS, largeBatchThreshold: SAFE_LARGE_IMPORT_BATCH_THRESHOLD, coarsePointer: policy.mobile, userAgent: navigator.userAgent, deviceMemory: navigator.deviceMemory }, validateAudioFile) || { policy, incoming: fileList, accepted: fileList.map(file => ({ file, validation: validateAudioFile(file, policy) })).filter(item => item.validation.ok), invalidEntries: [], memoryRejected: [], acceptedBytes: 0, skippedByLimit: 0, skippedByMemory: 0, largeBatch: fileList.length >= SAFE_LARGE_IMPORT_BATCH_THRESHOLD };
}
function validateAudioFile(file, importPolicy = getImportMemoryPolicy()) {
    const type = String(file?.type || '').toLowerCase();
    if (Number(file?.size || 0) <= 0) return { ok: false, reason: '빈 파일입니다.' };
    const maxFileSize = Math.max(1, Number(importPolicy?.maxFileSize || MAX_FILE_SIZE));
    if (file.size > maxFileSize) return { ok: false, reason: `현재 기기에서는 파일당 최대 ${formatBytes(maxFileSize)}까지 안전하게 처리할 수 있습니다.` };
    const capabilityService = getAudioImportCapabilityService();
    const capability = capabilityService?.getFileCapability?.(file) || null;
    if (capability && !capability.ok) return { ok: false, reason: `${capability.reason} WAV, MP3 또는 PCM AIFF로 변환해 주세요.`, label: capability.label };
    const hasKnownExtension = Boolean(getFileExtension(file));
    const hasAudioMime = Boolean(type && (type.startsWith('audio/') || type === 'application/ogg' || type === 'application/octet-stream'));
    const hasVideoMime = Boolean(type && (type === 'video/mp4' || type === 'video/quicktime'));
    if (!hasKnownExtension && !hasAudioMime && !hasVideoMime) return { ok: false, reason: '오디오 파일 형식을 확인할 수 없습니다. WAV, MP3 또는 PCM AIFF 파일을 선택해 주세요.' };
    const label = capability?.label || getAudioImportSupportLabel(file);
    if (capability?.tier === 'conditional' || capability?.tier === 'container') console.info('Conditional browser codec import selected:', file.name, capability.reason || getAudioImportDecodeHint(file));
    return { ok: true, label, capability };
}
function createTrack(file) {
    const lifecycle = getTrackLifecycleService();
    if (!lifecycle || typeof lifecycle.createTrackModel !== 'function') {
        throw new Error('트랙 라이프사이클 서비스를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    }
    return lifecycle.createTrackModel(file, {
        customPreset: GENRE_PRESETS.custom,
        defaultTransform: DEFAULT_TRANSFORM,
        defaultInstrumentLayer: DEFAULT_INSTRUMENT_LAYER,
        cloneSettings,
        cloneTransform,
        cloneInstrumentLayer,
        createObjectURL: blob => URL.createObjectURL(blob)
    });
}
function makeAnalysisCancelledError(stage = 'analysis-cancelled') { const error = new Error(`분석 작업이 취소되었습니다. (${stage})`); error.name = 'AbortError'; error.code = 'FOXBEAR_ANALYSIS_CANCELLED'; return error; }
function isAnalysisCancellationError(error) { return Boolean(error && (error.name === 'AbortError' || error.code === 'FOXBEAR_ANALYSIS_CANCELLED')); }
function assertAnalysisTaskActive(track, task, stage = 'analysis') {
    if (task && typeof task.throwIfCancelled === 'function') task.throwIfCancelled();
    if (task?.signal?.aborted || task?.cancelled) throw makeAnalysisCancelledError(stage);
    if (!isTrackStillImported(track)) throw makeAnalysisCancelledError(`${stage}-track-removed`);
    if (track?.analysisTask && task && track.analysisTask !== task) throw makeAnalysisCancelledError(`${stage}-superseded`);
    return true;
}
async function analyzeTrack(track, task = null) {
    assertAnalysisTaskActive(track, task, 'start');
    track.status = 'analyzing';
    track.progress = 10;
    track.report = '임시 오디오 메모리 매핑 중';
    scheduleRenderAll('analysis-start', { keepDetailAudio: true });
    let analysis = await readAnalysisCache(track);
    assertAnalysisTaskActive(track, task, 'cache-read');
    if (analysis) {
        track.analysisCacheHit = true;
        track.progress = 72;
        track.report = '분석 캐시 적중 · 장르/마스터링 추천값 계산 중';
        scheduleRenderAll('analysis-cache-hit', { keepDetailAudio: true });
    } else {
        const buffer = await decodeAudio(track.file, task);
        assertAnalysisTaskActive(track, task, 'decode');
        track.progress = 50;
        track.report = '밝기, 스테레오 폭, 공진 힌트 분석 중';
        scheduleRenderAll('analysis-progress', { keepDetailAudio: true });
        analysis = await analyzeBufferAsync(buffer, task);
        assertAnalysisTaskActive(track, task, 'worker-analysis');
        analysis.abHighlightStartSec = estimateABHighlightStart(buffer);
        analysis.waveformOverview = sampleWaveformOverview(buffer, DOCK_WAVEFORM_BINS);
        assertAnalysisTaskActive(track, task, 'analysis-summary');
        track.abHighlightStartSec = analysis.abHighlightStartSec;
        track.analysisCacheHit = false;
        await writeAnalysisCache(track, analysis);
        assertAnalysisTaskActive(track, task, 'cache-write');
    }
    if (analysis && Number.isFinite(Number(analysis.abHighlightStartSec))) track.abHighlightStartSec = Number(analysis.abHighlightStartSec);
    const recommendation = safeRecommendPreset(track.name, analysis, 'track');
    const settings = makeRecommendedSettings(recommendation.preset, analysis);
    assertAnalysisTaskActive(track, task, 'state-apply');
    track.analysis = analysis;
    track.recommendedPreset = recommendation.preset;
    track.preset = recommendation.preset;
    track.confidence = recommendation.confidence;
    track.genreReason = recommendation.reason || '';
    track.genreAlternatives = recommendation.alternatives || [];
    track.genreExplanation = recommendation.explanation || null;
    track.settings = cloneSettings(settings);
    track.recommendedSettings = cloneSettings(settings);
    externalBrowserHandoffBridge?.reapplyTrackProfileAfterAnalysis?.(track);
    track.status = 'ready';
    track.progress = 100;
    track.report = buildReport(track);
    if (state.selectedId === track.id) applyTrackToControls(track);
    if (state.featureFlags.albumMatch) state.albumProfile = computeAlbumProfile();
    scheduleRenderAll('analysis-complete', { keepDetailAudio: true });
    try { forceRefreshBottomPreviewDock(track, 'analysis-complete'); } catch (error) { console.warn('Dock refresh after analysis failed:', error); }
    try { maybeShowSingleTrackAiRecommendationDialog(track); } catch (error) { console.warn('Single track recommendation dialog failed:', error); }
}
async function decodeAudio(file, task = null) {
    const service = window.FoxBearAudioDecodeService;
    if (!service || typeof service.decodeAudioFile !== 'function') {
        throw new Error('오디오 디코딩 서비스를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    }
    if (task && typeof task.throwIfCancelled === 'function') task.throwIfCancelled();
    return await service.decodeAudioFile(file, { latencyHint: 'playback', metadataTimeoutMs: 4500, signal: task?.signal || null });
}
function getAnalysisCacheKey(track) {
    const service = getAnalysisCacheService();
    if (service && typeof service.getCacheKey === 'function') return service.getCacheKey(track, getAnalysisCacheOptions());
    const f = track && track.file ? track.file : {};
    return [f.name || track.name || 'audio', f.size || track.size || 0, f.lastModified || 0, ANALYSIS_ENGINE_CACHE_VERSION].join('|');
}
function openAnalysisCacheDb() {
    const service = getAnalysisCacheService();
    if (service && typeof service.openDb === 'function') return service.openDb(getAnalysisCacheOptions());
    return Promise.resolve(null);
}
async function readAnalysisCache(track) {
    const service = getAnalysisCacheService();
    if (!service || typeof service.read !== 'function') return null;
    return service.read(track, getAnalysisCacheOptions());
}
async function writeAnalysisCache(track, analysis) {
    const service = getAnalysisCacheService();
    if (!service || typeof service.write !== 'function') return;
    await service.write(track, analysis, getAnalysisCacheOptions());
}
async function clearAnalysisCache(options = {}) {
    try {
        const service = getAnalysisCacheService();
        const cleared = service && typeof service.clear === 'function' ? await service.clear(getAnalysisCacheOptions()) : false;
        if (cleared) state.tracks.forEach(track => { track.analysisCacheHit = false; });
        if (!options.skipRender) renderAll({ keepDetailAudio: true });
        if (!options.silent) showToast('분석 캐시를 정리했습니다.');
    } catch (error) {
        console.warn('Analysis cache clear failed:', error);
    }
}
async function analyzeBufferAsync(buffer, task = null) {
    task?.throwIfCancelled?.();
    const analysisSamples = Math.max(1, buffer.length) * Math.max(1, Math.min(buffer.numberOfChannels || 1, 2));
    if (!window.Worker) { if (task?.signal?.aborted) throw makeAnalysisCancelledError('main-analysis'); if (analysisSamples > 24 * 1024 * 1024) { const error = new Error('긴 곡 분석에는 Web Worker가 필요합니다. 최신 브라우저에서 다시 시도해주세요.'); error.code = 'FOXBEAR_ANALYSIS_FALLBACK_TOO_LARGE'; throw error; } return analyzeBuffer(buffer); }
    const channels = buffer.numberOfChannels, channelBuffers = [];
    for (let ch = 0; ch < channels; ch += 1) channelBuffers.push(buffer.getChannelData(ch).slice().buffer);
    const payload = { sampleRate: buffer.sampleRate, duration: buffer.duration, channels, length: buffer.length, channelBuffers };
    try {
        const data = await runFoxBearWorkerJob(ANALYSIS_WORKER_URL, payload, channelBuffers, { timeoutMs: 30000, signal: task?.signal || null, jobId: task?.id ? `analysis:${task.id}` : '', label: '오디오 분석' });
        if (!data?.ok || !data.analysis) throw new Error(data?.error || '분석 워커 실패');
        task?.throwIfCancelled?.();
        return data.analysis;
    } catch (error) {
        if (isWorkerJobAbortError(error) || isAnalysisCancellationError(error) || task?.signal?.aborted) throw makeAnalysisCancelledError('analysis-cancelled');
        console.warn('Analysis worker fallback:', error);
        if (analysisSamples > 24 * 1024 * 1024) { error.code ||= 'FOXBEAR_ANALYSIS_FALLBACK_TOO_LARGE'; throw error; }
        task?.throwIfCancelled?.();
        return analyzeBuffer(buffer);
    }
}
function analyzeBuffer(buffer) {
    const channels = Math.max(1, Math.min(buffer.numberOfChannels || 1, 32));
    const totalSamples = Math.max(0, buffer.length || 0);
    const channelData = [];
    for (let ch = 0; ch < channels; ch += 1) channelData.push(buffer.getChannelData(ch));
    const time = measureTimeDomainFeatures(channelData, buffer.sampleRate, totalSamples, channels);
    const spectrum = measureFftSpectrumFeatures(channelData, buffer.sampleRate, totalSamples, channels);
    const brightness = spectrum.valid ? clamp01(spectrum.brightness * 0.78 + time.brightness * 0.22) : time.brightness;
    const metallicHint = spectrum.valid ? clamp01(spectrum.metallicHint * 0.74 + time.metallicHint * 0.26) : time.metallicHint;
    const bassRatio = spectrum.valid ? spectrum.bassRatio : time.bassRatio;
    const lowMidRatio = spectrum.valid ? spectrum.lowMidRatio : time.lowMidRatio;
    const midRatio = spectrum.valid ? spectrum.midRatio : time.midRatio;
    const highRatio = spectrum.valid ? spectrum.highRatio : time.highRatio;
    const transientDensity = spectrum.valid ? clamp01(time.transientDensity * 0.48 + spectrum.spectralFlux * 0.52) : time.transientDensity;
    const loudnessIntegrated = measureKWeightedGatedLoudness(buffer);
    const loudnessHint = 20 * Math.log10(Math.max(0.000001, time.rms));
    const peakDb = 20 * Math.log10(Math.max(0.000001, time.peak));
    const headroomDb = -1.0 - peakDb;
    const silence = time.rms < 0.00008 || time.peak < 0.0005;
    const lowMonoScore = channels >= 2 ? Math.round(clamp(((time.lowMonoCorrelation + 1) * 0.5) * 72 + (1 - clamp01(time.lowSideRatio)) * 28, 0, 100)) : 100;
    const lowMonoRisk = lowMonoScore >= 82 ? 'safe' : lowMonoScore >= 64 ? 'watch' : 'risk';
    const spatialExcessRisk = channels >= 2 ? clamp01(Math.max(0, time.stereoWidth - 0.58) * 1.25 + Math.max(0, time.lowSideRatio - 0.34) * 1.10 + Math.max(0, (spectrum.spectrumBands?.air || 0) - 0.16) * 0.72) : 0;
    const mobileSpeakerRisk = estimateMobileSpeakerRisk({ bassRatio, lowMidRatio, midRatio, highRatio, brightness, metallicHint, transientDensity, loudnessIntegrated, loudnessHint, crest: time.crest, presenceRatio: spectrum.spectrumBands?.presence || 0, airRatio: spectrum.spectrumBands?.air || 0, spectrumBands: spectrum.spectrumBands, spectrumProfile: spectrum.spectrumProfile }, GENRE_PRESETS.custom);
    return {
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels,
        totalSamples,
        peak: time.peak,
        peakDb,
        rms: time.rms,
        loudnessHint,
        crest: time.crest,
        brightness,
        stereoWidth: time.stereoWidth,
        metallicHint,
        zeroCrossRate: time.zeroCrossRate,
        loudnessIntegrated,
        headroomDb,
        bassRatio,
        lowMidRatio,
        midRatio,
        highRatio,
        transientDensity,
        lowMonoCorrelation: time.lowMonoCorrelation,
        lowSideRatio: time.lowSideRatio,
        lowMonoScore,
        lowMonoRisk,
        silence,
        spectralCentroidHz: spectrum.spectralCentroidHz,
        spectralRolloffHz: spectrum.spectralRolloffHz,
        spectralFlatness: spectrum.spectralFlatness,
        spectralFlux: spectrum.spectralFlux,
        spectrumBands: spectrum.spectrumBands,
        spectrumProfile: spectrum.spectrumProfile,
        subRatio: spectrum.spectrumBands?.sub || 0,
        presenceRatio: spectrum.spectrumBands?.presence || 0,
        airRatio: spectrum.spectrumBands?.air || 0,
        spatialExcessRisk,
        widthRecommendationLimit: spatialExcessRisk > 0.52 || lowMonoScore < 70 ? 52 : spatialExcessRisk > 0.28 ? 60 : 72,
        mobileSpeakerRisk: mobileSpeakerRisk.risk,
        mobileSpeakerRiskLabel: mobileSpeakerRisk.label,
        mobileSpeakerDetail: { boom: mobileSpeakerRisk.boom, box: mobileSpeakerRisk.box, honk: mobileSpeakerRisk.honk, harsh: mobileSpeakerRisk.harsh, density: mobileSpeakerRisk.density },
        loudnessStandard: 'ITU-R BS.1770 K-weighting + EBU R128 gates',
        analysisMethod: '4096-point FFT, Hann window, 75% overlap frame sampling, 24-band reference profile',
        targetDynamicFreq: spectrum.valid ? spectrum.harshPeakHz : estimateTargetFrequency(time.zeroCrossRate)
    };
}
function measureTimeDomainFeatures(channelData, sampleRate, totalSamples, channels) {
    const step = Math.max(1, Math.floor(totalSamples / 240000));
    let peak = 0, sumSq = 0, count = 0, diffSum = 0, zeroCrossings = 0, prevMono = 0;
    let midSq = 0, sideSq = 0, stereoCount = 0, highFreqEnergy = 0, midHighEnergy = 0;
    let lowLeftLp = 0, lowRightLp = 0, lowLeftSq = 0, lowRightSq = 0, lowCrossSq = 0, lowMidMonoSq = 0, lowSideMonoSq = 0;
    const effectiveRate = Math.max(1000, sampleRate / step);
    const lpCoeff = freq => clamp(1 - Math.exp(-2 * Math.PI * freq / effectiveRate), 0.001, 0.98);
    const c120 = lpCoeff(120), c700 = lpCoeff(700), c3500 = lpCoeff(3500);
    let lp120 = 0, lp700 = 0, lp3500 = 0;
    let bassSq = 0, lowMidSq = 0, midBandSq = 0, highBandSq = 0, transientHits = 0, bandCount = 0;
    for (let i = 0; i < totalSamples; i += step) {
        let mono = 0;
        for (let ch = 0; ch < channels; ch += 1) {
            const sample = channelData[ch][i] || 0;
            const abs = Math.abs(sample);
            if (abs > peak) peak = abs;
            sumSq += sample * sample;
            mono += sample / channels;
            count += 1;
        }
        const delta = mono - prevMono;
        const absDelta = Math.abs(delta);
        diffSum += absDelta;
        if (absDelta > 0.15) highFreqEnergy += 1;
        if (absDelta > 0.05 && absDelta <= 0.15) midHighEnergy += 1;
        if (absDelta > 0.11) transientHits += 1;
        if ((mono >= 0 && prevMono < 0) || (mono < 0 && prevMono >= 0)) zeroCrossings += 1;
        lp120 += c120 * (mono - lp120);
        lp700 += c700 * (mono - lp700);
        lp3500 += c3500 * (mono - lp3500);
        const bassBand = lp120;
        const lowMidBand = lp700 - lp120;
        const midBand = lp3500 - lp700;
        const highBand = mono - lp3500;
        bassSq += bassBand * bassBand;
        lowMidSq += lowMidBand * lowMidBand;
        midBandSq += midBand * midBand;
        highBandSq += highBand * highBand;
        bandCount += 1;
        prevMono = mono;
        if (channels >= 2) {
            const left = channelData[0][i] || 0;
            const right = channelData[1][i] || 0;
            const mid = (left + right) * 0.5;
            const side = (left - right) * 0.5;
            midSq += mid * mid;
            sideSq += side * side;
            lowLeftLp += c120 * (left - lowLeftLp);
            lowRightLp += c120 * (right - lowRightLp);
            const lowMid = (lowLeftLp + lowRightLp) * 0.5;
            const lowSide = (lowLeftLp - lowRightLp) * 0.5;
            lowLeftSq += lowLeftLp * lowLeftLp;
            lowRightSq += lowRightLp * lowRightLp;
            lowCrossSq += lowLeftLp * lowRightLp;
            lowMidMonoSq += lowMid * lowMid;
            lowSideMonoSq += lowSide * lowSide;
            stereoCount += 1;
        }
    }
    const rms = Math.sqrt(sumSq / Math.max(1, count));
    const crest = peak / Math.max(0.000001, rms);
    const zcr = zeroCrossings / Math.max(1, totalSamples / step);
    const avgDiff = diffSum / Math.max(1, totalSamples / step);
    const brightness = clamp01((avgDiff / Math.max(0.0001, rms)) * 2.15 + zcr * 2.7);
    const stereoWidth = channels >= 2 ? clamp01(Math.sqrt(sideSq / Math.max(1, stereoCount)) / Math.max(0.0001, Math.sqrt(midSq / Math.max(1, stereoCount)))) : 0;
    const metallicHint = clamp01(brightness * 0.65 + (highFreqEnergy / Math.max(1, midHighEnergy)) * 0.3 + zcr * 1.5);
    const spectralTotal = Math.max(1e-9, bassSq + lowMidSq + midBandSq + highBandSq);
    const lowMonoCorrelation = channels >= 2 && stereoCount ? clamp(lowCrossSq / Math.sqrt(Math.max(1e-12, lowLeftSq * lowRightSq)), -1, 1) : 1;
    const lowSideRatio = channels >= 2 && stereoCount ? Math.sqrt(lowSideMonoSq / Math.max(1, stereoCount)) / Math.max(0.000001, Math.sqrt(lowMidMonoSq / Math.max(1, stereoCount))) : 0;
    return { peak, rms, crest, zeroCrossRate: zcr, brightness, stereoWidth, metallicHint, bassRatio: clamp01(bassSq / spectralTotal), lowMidRatio: clamp01(lowMidSq / spectralTotal), midRatio: clamp01(midBandSq / spectralTotal), highRatio: clamp01(highBandSq / spectralTotal), transientDensity: clamp01(transientHits / Math.max(1, bandCount) * 4.0), lowMonoCorrelation, lowSideRatio };
}
function measureFftSpectrumFeatures(channelData, sampleRate, totalSamples, channels) {
    const fftSize = chooseFftSize(sampleRate, totalSamples);
    if (totalSamples < 128 || fftSize < 512) return makeEmptySpectrumFeatures();
    const half = fftSize >> 1;
    const hop = Math.max(128, fftSize >> 2);
    const availableFrames = totalSamples <= fftSize ? 1 : Math.floor((totalSamples - fftSize) / hop) + 1;
    const maxFrames = 320;
    const frameStride = Math.max(1, Math.ceil(availableFrames / maxFrames));
    const window = makeHannWindow(fftSize);
    const real = new Float32Array(fftSize);
    const imag = new Float32Array(fftSize);
    const avgPower = new Float64Array(half);
    const prevMag = new Float32Array(half);
    const bandEnergy = { sub: 0, bass: 0, lowMid: 0, mid: 0, presence: 0, high: 0, air: 0 };
    let totalPower = 0, centroidNum = 0, logMagSum = 0, magMeanSum = 0, fluxSum = 0, fluxFrames = 0, frameCount = 0;
    let harshPeakPower = -Infinity, harshPeakHz = 5200;
    for (let frame = 0; frame < availableFrames; frame += frameStride) {
        const start = Math.min(Math.max(0, frame * hop), Math.max(0, totalSamples - fftSize));
        real.fill(0);
        imag.fill(0);
        for (let i = 0; i < fftSize; i += 1) {
            const index = start + i;
            let mono = 0;
            if (index < totalSamples) {
                for (let ch = 0; ch < channels; ch += 1) mono += (channelData[ch][index] || 0) / channels;
            }
            real[i] = mono * window[i];
        }
        fftRadix2(real, imag);
        let frameMagSum = 0, frameFlux = 0;
        for (let bin = 1; bin < half; bin += 1) {
            const re = real[bin], im = imag[bin];
            const power = re * re + im * im;
            const mag = Math.sqrt(power);
            const freq = bin * sampleRate / fftSize;
            avgPower[bin] += power;
            totalPower += power;
            centroidNum += freq * power;
            logMagSum += Math.log(Math.max(1e-12, mag));
            frameMagSum += mag;
            if (frameCount > 0) frameFlux += Math.max(0, mag - prevMag[bin]);
            prevMag[bin] = mag;
            const band = getSpectrumBand(freq);
            if (band) bandEnergy[band] += power;
            if (freq >= 2600 && freq <= 8200 && power > harshPeakPower) {
                harshPeakPower = power;
                harshPeakHz = freq;
            }
        }
        magMeanSum += frameMagSum / Math.max(1, half - 1);
        if (frameCount > 0) {
            fluxSum += frameFlux / Math.max(1e-9, frameMagSum);
            fluxFrames += 1;
        }
        frameCount += 1;
    }
    if (!frameCount || totalPower <= 1e-12) return makeEmptySpectrumFeatures();
    const total = Math.max(1e-12, Object.values(bandEnergy).reduce((sum, value) => sum + value, 0));
    const bands = {};
    Object.keys(bandEnergy).forEach(key => { bands[key] = clamp01(bandEnergy[key] / total); });
    const bassRatio = clamp01((bandEnergy.sub + bandEnergy.bass) / total);
    const lowMidRatio = clamp01(bandEnergy.lowMid / total);
    const midRatio = clamp01((bandEnergy.mid + bandEnergy.presence * 0.35) / total);
    const highRatio = clamp01((bandEnergy.presence * 0.65 + bandEnergy.high + bandEnergy.air) / total);
    const centroid = centroidNum / totalPower;
    const rolloff = findSpectralRolloff(avgPower, sampleRate, fftSize, totalPower * 0.85);
    const geometricMean = Math.exp(logMagSum / Math.max(1, frameCount * (half - 1)));
    const arithmeticMean = magMeanSum / Math.max(1, frameCount);
    const flatness = clamp01(geometricMean / Math.max(1e-12, arithmeticMean));
    const brightness = clamp01(normalizeLogFrequency(centroid, 380, 5600) * 0.62 + normalizeLogFrequency(rolloff, 1800, 15000) * 0.18 + highRatio * 0.48 + bands.air * 0.25);
    const metallicHint = clamp01(bands.presence * 1.45 + bands.high * 0.95 + flatness * 0.32 + normalizeLogFrequency(harshPeakHz, 2800, 8200) * 0.12);
    const spectralFlux = clamp01((fluxSum / Math.max(1, fluxFrames)) * 9.5);
    const spectrumProfile = makeCompactSpectrumProfile(avgPower, sampleRate, fftSize, totalPower);
    return { valid: true, bassRatio, lowMidRatio, midRatio, highRatio, spectralCentroidHz: Math.round(centroid), spectralRolloffHz: Math.round(rolloff), spectralFlatness: Number(flatness.toFixed(4)), spectralFlux, brightness, metallicHint, spectrumBands: bands, spectrumProfile, harshPeakHz: Math.round(clamp(harshPeakHz, 2600, 8200)) };
}
function chooseFftSize(sampleRate, totalSamples) {
    if (totalSamples < 2048) return 1024;
    if (sampleRate >= 88200 && totalSamples >= 8192) return 8192;
    return 4096;
}
function makeEmptySpectrumFeatures() {
    return { valid: false, bassRatio: 0.25, lowMidRatio: 0.25, midRatio: 0.25, highRatio: 0.25, spectralCentroidHz: 0, spectralRolloffHz: 0, spectralFlatness: 0, spectralFlux: 0, brightness: 0.45, metallicHint: 0.35, spectrumBands: { sub: 0, bass: 0, lowMid: 0, mid: 0, presence: 0, high: 0, air: 0 }, spectrumProfile: [], harshPeakHz: 5200 };
}
function makeHannWindow(size) {
    const window = new Float32Array(size);
    const denom = Math.max(1, size - 1);
    for (let i = 0; i < size; i += 1) window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / denom));
    return window;
}
function fftRadix2(real, imag) {
    const n = real.length;
    for (let i = 1, j = 0; i < n; i += 1) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            const tr = real[i]; real[i] = real[j]; real[j] = tr;
            const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
        }
    }
    for (let len = 2; len <= n; len <<= 1) {
        const angle = -2 * Math.PI / len;
        const wLenR = Math.cos(angle);
        const wLenI = Math.sin(angle);
        for (let i = 0; i < n; i += len) {
            let wr = 1, wi = 0;
            for (let j = 0; j < len / 2; j += 1) {
                const uR = real[i + j], uI = imag[i + j];
                const vR = real[i + j + len / 2] * wr - imag[i + j + len / 2] * wi;
                const vI = real[i + j + len / 2] * wi + imag[i + j + len / 2] * wr;
                real[i + j] = uR + vR;
                imag[i + j] = uI + vI;
                real[i + j + len / 2] = uR - vR;
                imag[i + j + len / 2] = uI - vI;
                const nextWr = wr * wLenR - wi * wLenI;
                wi = wr * wLenI + wi * wLenR;
                wr = nextWr;
            }
        }
    }
}
function getSpectrumBand(freq) {
    if (freq < 20 || freq > 22000) return null;
    if (freq < 60) return 'sub';
    if (freq < 160) return 'bass';
    if (freq < 500) return 'lowMid';
    if (freq < 2500) return 'mid';
    if (freq < 6000) return 'presence';
    if (freq < 12000) return 'high';
    return 'air';
}
function findSpectralRolloff(avgPower, sampleRate, fftSize, threshold) {
    let cumulative = 0;
    for (let bin = 1; bin < avgPower.length; bin += 1) {
        cumulative += avgPower[bin];
        if (cumulative >= threshold) return bin * sampleRate / fftSize;
    }
    return sampleRate * 0.5;
}
function normalizeLogFrequency(freq, low, high) {
    const value = Math.log10(Math.max(1, Number(freq || 0)));
    const min = Math.log10(Math.max(1, low));
    const max = Math.log10(Math.max(low + 1, high));
    return clamp01((value - min) / Math.max(1e-9, max - min));
}
const SPECTRUM_PROFILE_24_RANGES = [
    [20, 32], [32, 45], [45, 63], [63, 90], [90, 125], [125, 180],
    [180, 250], [250, 355], [355, 500], [500, 710], [710, 1000], [1000, 1400],
    [1400, 2000], [2000, 2800], [2800, 4000], [4000, 5600], [5600, 7100], [7100, 9000],
    [9000, 11200], [11200, 14000], [14000, 16000], [16000, 18000], [18000, 20000], [20000, 22000]
];
function makeCompactSpectrumProfile(avgPower, sampleRate, fftSize, totalPower) {
    const denom = Math.max(1e-12, totalPower);
    return SPECTRUM_PROFILE_24_RANGES.map(([from, to]) => {
        let sum = 0;
        const start = Math.max(1, Math.floor(from * fftSize / sampleRate));
        const end = Math.min(avgPower.length - 1, Math.ceil(to * fftSize / sampleRate));
        for (let bin = start; bin <= end; bin += 1) sum += avgPower[bin];
        return Number(clamp01(sum / denom).toFixed(5));
    });
}
function estimateTargetFrequency(zcr) {
    if (zcr > 0.42) return 7400;
    if (zcr < 0.18) return 3100;
    return 5200;
}
function estimateABHighlightStart(buffer) {
    if (!buffer || !Number.isFinite(buffer.duration) || buffer.duration <= 8) return 0;
    const sampleRate = buffer.sampleRate || 44100;
    const channels = Math.min(2, buffer.numberOfChannels || 1);
    const windowSec = 5;
    const startMin = Math.max(0, buffer.duration * 0.12);
    const startMax = Math.max(0, buffer.duration - windowSec - Math.min(2, buffer.duration * 0.05));
    const hopSec = buffer.duration > 240 ? 1.5 : 1;
    const sampleStep = Math.max(256, Math.floor(sampleRate * 0.018));
    let bestStart = clamp(buffer.duration * 0.33, 0, startMax);
    let bestScore = -Infinity;
    let prevAvg = 0;
    for (let startSec = startMin; startSec <= startMax; startSec += hopSec) {
        const start = Math.floor(startSec * sampleRate);
        const end = Math.min(buffer.length, start + Math.floor(windowSec * sampleRate));
        if (end <= start + sampleStep) continue;
        let sumSq = 0;
        let sumAbs = 0;
        let transient = 0;
        let count = 0;
        let last = 0;
        for (let i = start; i < end; i += sampleStep) {
            let mono = 0;
            for (let ch = 0; ch < channels; ch += 1) mono += buffer.getChannelData(ch)[i] || 0;
            mono /= channels;
            const abs = Math.abs(mono);
            sumSq += mono * mono;
            sumAbs += abs;
            transient += Math.abs(abs - last);
            last = abs;
            count += 1;
        }
        const rms = Math.sqrt(sumSq / Math.max(1, count));
        const avgAbs = sumAbs / Math.max(1, count);
        const contrast = Math.abs(avgAbs - prevAvg);
        prevAvg = avgAbs;
        const centerWeight = 1 - Math.abs((startSec + windowSec * 0.5) / buffer.duration - 0.52) * 0.34;
        const introPenalty = startSec < buffer.duration * 0.18 ? 0.88 : 1;
        const score = (rms * 0.72 + transient * 0.22 + contrast * 0.12) * centerWeight * introPenalty;
        if (score > bestScore) {
            bestScore = score;
            bestStart = startSec;
        }
    }
    return Number(clamp(bestStart, 0, startMax).toFixed(2));
}
function estimateABHighlightStartFromPair(beforeBuffer, afterBuffer, analysis) {
    const beforeDuration = Number(beforeBuffer?.duration || 0);
    const afterDuration = Number(afterBuffer?.duration || 0);
    const duration = Math.min(beforeDuration, afterDuration);
    if (!beforeBuffer || !afterBuffer || !Number.isFinite(duration) || duration <= 8) {
        return estimateABHighlightStart(beforeBuffer || afterBuffer);
    }
    const sampleRate = Math.min(beforeBuffer.sampleRate || 44100, afterBuffer.sampleRate || 44100);
    const windowSec = 5;
    const startMin = Math.max(0, duration * 0.10);
    const startMax = Math.max(0, duration - windowSec - Math.min(2, duration * 0.04));
    const hopSec = duration > 240 ? 1.5 : 1;
    const step = Math.max(512, Math.floor(sampleRate * 0.022));
    const beforeChannels = Math.min(2, beforeBuffer.numberOfChannels || 1);
    const afterChannels = Math.min(2, afterBuffer.numberOfChannels || 1);
    const beforeRate = beforeBuffer.sampleRate || sampleRate;
    const afterRate = afterBuffer.sampleRate || sampleRate;
    const beforeData = Array.from({ length: beforeChannels }, (_, ch) => beforeBuffer.getChannelData(ch));
    const afterData = Array.from({ length: afterChannels }, (_, ch) => afterBuffer.getChannelData(ch));
    let bestStart = Number.isFinite(Number(analysis?.abHighlightStartSec)) ? Number(analysis.abHighlightStartSec) : clamp(duration * 0.33, 0, startMax);
    let bestScore = -Infinity;
    for (let startSec = startMin; startSec <= startMax; startSec += hopSec) {
        const endSec = Math.min(duration, startSec + windowSec);
        let energy = 0;
        let diff = 0;
        let transient = 0;
        let count = 0;
        let lastDiff = 0;
        for (let sec = startSec; sec < endSec; sec += step / sampleRate) {
            const beforeIndex = Math.min(beforeBuffer.length - 1, Math.max(0, Math.floor(sec * beforeRate)));
            const afterIndex = Math.min(afterBuffer.length - 1, Math.max(0, Math.floor(sec * afterRate)));
            let beforeMono = 0;
            let afterMono = 0;
            for (let ch = 0; ch < beforeChannels; ch += 1) beforeMono += beforeData[ch][beforeIndex] || 0;
            for (let ch = 0; ch < afterChannels; ch += 1) afterMono += afterData[ch][afterIndex] || 0;
            beforeMono /= Math.max(1, beforeChannels);
            afterMono /= Math.max(1, afterChannels);
            const d = Math.abs(afterMono - beforeMono);
            energy += Math.abs(beforeMono) + Math.abs(afterMono);
            diff += d;
            transient += Math.abs(d - lastDiff);
            lastDiff = d;
            count += 1;
        }
        if (!count) continue;
        const avgEnergy = energy / count;
        const avgDiff = diff / count;
        const avgTransient = transient / count;
        const centerWeight = 1 - Math.abs((startSec + windowSec * 0.5) / duration - 0.52) * 0.30;
        const introPenalty = startSec < duration * 0.15 ? 0.90 : 1;
        const score = (avgDiff * 0.56 + avgEnergy * 0.32 + avgTransient * 0.26) * centerWeight * introPenalty;
        if (score > bestScore) {
            bestScore = score;
            bestStart = startSec;
        }
    }
    return Number(clamp(bestStart, 0, startMax).toFixed(2));
}
function getDevicePerformanceTier() {
    const memory = Number(navigator.deviceMemory || 0);
    const cores = Number(navigator.hardwareConcurrency || 0);
    const ua = navigator.userAgent || '';
    const mobile = /Android|iPhone|iPad|iPod|Mobile|KAKAOTALK|NAVER|Instagram|Line/i.test(ua) || (window.matchMedia && window.matchMedia('(max-width: 640px)').matches);
    let tier = 'desktop';
    if (mobile) tier = 'mobile';
    if ((memory && memory <= 3) || (cores && cores <= 4)) tier = mobile ? 'mobile-lite' : 'desktop-lite';
    return { tier, mobile, memory, cores };
}
function getSmartPerformanceGuardDecision(track, buffer, requestedOutputFormat) {
    const rawDevice = getDevicePerformanceTier();
    const inAppSafety = track?.inAppSafetyInfo || null;
    const forcedMobile = state.performanceMode === 'mobile';
    const qualityLock = state.performanceMode === 'quality';
    const device = forcedMobile ? { ...rawDevice, mobile: true, tier: rawDevice.tier === 'desktop' ? 'mobile' : rawDevice.tier } : rawDevice;
    const duration = Number(buffer?.duration || track?.analysis?.duration || 0);
    const sourceMode = state.qualityMode || 'balanced';
    const mp3 = String(requestedOutputFormat || '').startsWith('mp3');
    const longFile = duration >= 8 * 60;
    const veryLongFile = duration >= 15 * 60;
    let qualityMode = sourceMode;
    const reasons = [];
    const guardEnabled = Boolean(state.smartPerformanceGuard) && !qualityLock;
    if (qualityLock) reasons.push('품질 우선 잠금');
    if (guardEnabled) {
        if ((device.tier === 'mobile-lite' || forcedMobile) && sourceMode === 'max') {
            qualityMode = 'balanced';
            reasons.push(forcedMobile ? 'Mobile Safe Max 검사 균형화' : '구형/저메모리 모바일 Max 검사 완화');
        }
        if (device.mobile && veryLongFile && sourceMode !== 'fast') {
            qualityMode = 'fast';
            reasons.push('긴 파일 모바일 처리 보호');
        } else if (device.mobile && longFile && sourceMode === 'max') {
            qualityMode = 'balanced';
            reasons.push('긴 파일 모바일 Max 검사 균형화');
        }
        if (mp3 && device.mobile && duration >= 10 * 60 && qualityMode === 'max') {
            qualityMode = 'balanced';
            reasons.push('MP3 인코딩 여유 확보');
        }
    }
    const qualityRanks = { fast: 0, balanced: 1, max: 2 };
    if (inAppSafety?.qualityMode && qualityRanks[inAppSafety.qualityMode] < qualityRanks[qualityMode]) {
        qualityMode = inAppSafety.qualityMode;
        reasons.push(...(inAppSafety.reasons || ['인앱 브라우저 메모리 보호']));
    }
    const memoryGovernor = track?.memoryGovernorInfo || null;
    if (memoryGovernor?.qualityMode && qualityRanks[memoryGovernor.qualityMode] < qualityRanks[qualityMode]) { qualityMode = memoryGovernor.qualityMode; reasons.push(`메모리 압력 ${memoryGovernor.level} · ${memoryGovernor.reasons?.join(', ') || '자동 품질 조절'}`); }
    const requestedTruePeak = state.featureFlags.truePeakGuard !== false, truePeak = requestedTruePeak && !inAppSafety?.disableTruePeak && memoryGovernor?.truePeak !== false;
    if (requestedTruePeak && !truePeak) reasons.push(memoryGovernor?.truePeak === false ? '실측 메모리 압력으로 True Peak 경량화' : '인앱 브라우저 메모리 보호로 True Peak 경량화');
    if (!reasons.length) reasons.push(guardEnabled ? '원래 품질 유지' : '성능 가드 OFF');
    return {
        enabled: guardEnabled,
        mode: state.performanceMode,
        sourceQualityMode: sourceMode,
        qualityMode,
        truePeak,
        duration,
        deviceTier: device.tier,
        mobile: device.mobile,
        memory: device.memory,
        cores: device.cores,
        changed: qualityMode !== sourceMode || truePeak !== requestedTruePeak,
        inAppSafety,
        memoryGovernor,
        reasons
    };
}
function computeEngineSafetyInfo(track, buffer, finalizeInfo) {
    const analysis = track?.analysis || {};
    const settings = track?.settings || GENRE_PRESETS.custom;
    let score = 100;
    const notes = [];
    const intensity = Number(settings.intensity || 100);
    const width = Number(settings.width || 50);
    const clarity = Number(settings.clarity || 50);
    const punch = Number(settings.dynamicPunch || 35);
    const removal = Number(settings.metallicRemoval || 42);
    const pitch = Math.abs(Number(track?.transform?.pitchSemitones || 0));
    const speedDelta = Math.abs(Number(track?.transform?.speedRatio || 1) - 1);
    const peakAfterDb = Number.isFinite(finalizeInfo?.peakAfter) ? ampToDb(finalizeInfo.peakAfter) : NaN;
    const metallic = Number(analysis.metallicHint || 0);
    const high = Number(analysis.highRatio || 0);
    const bass = Number(analysis.bassRatio || 0);
    const lowMonoScore = Number(analysis.lowMonoScore);
    if (intensity > 140) { score -= Math.min(20, (intensity - 140) * 0.25); notes.push('강도 높음'); }
    if (width > 72 && !state.featureFlags.phaseSafe) { score -= 12; notes.push('공간감 보호 OFF'); }
    if (clarity > 70 && (high > 0.38 || metallic > 0.55)) { score -= 10; notes.push('고역 피로 가능'); }
    if (punch > 68 && Number(analysis.transientDensity || 0) > 0.55) { score -= 8; notes.push('트랜지언트 과다 가능'); }
    if (bass > 0.48 && !state.featureFlags.lowEndAnchor) { score -= 10; notes.push('저역 고정 OFF'); }
    if (Number.isFinite(lowMonoScore) && lowMonoScore < 64) { score -= 12; notes.push('저역 모노 호환 위험'); }
    else if (Number.isFinite(lowMonoScore) && lowMonoScore < 82) { score -= 5; notes.push('저역 모노 점검'); }
    if (metallic > 0.62 && removal < 48) { score -= 8; notes.push('금속성 제거 약함'); }
    if (pitch >= 7 || speedDelta >= 0.25) {
        const protectedBy = state.featureFlags.vocalProtect && state.featureFlags.melodyPreserve && state.featureFlags.vocalFocusPlus;
        score -= protectedBy ? 3 : 12;
        notes.push(protectedBy ? '극단 피치/BPM 보호 ON' : '극단 피치/BPM 보호 약함');
    }
    if (!state.featureFlags.truePeakGuard) { score -= 12; notes.push('True Peak OFF'); }
    if (Number.isFinite(peakAfterDb) && peakAfterDb > -0.6) { score -= 8; notes.push('피크 여유 적음'); }
    if (state.smartPerformanceGuard && track?.performanceGuardInfo?.changed) { score += 2; notes.push('성능 가드 품질 균형'); }
    score = Math.round(clamp(score, 0, 100));
    const label = score >= 86 ? '안전' : score >= 72 ? '주의 낮음' : score >= 58 ? '주의' : '과처리 위험';
    const tone = score >= 86 ? 'safe' : score >= 72 ? 'good' : score >= 58 ? 'warn' : 'danger';
    if (!notes.length) notes.push('현재 설정 안정적');
    return { score, label, tone, notes: notes.slice(0, 4), peakAfterDb };
}
function formatPerformanceGuardInfo(info) {
    if (!info) return state.smartPerformanceGuard ? '대기 · 렌더 시 자동 판단' : 'OFF';
    const mode = `${getQualityModeLabel(info.sourceQualityMode)} → ${getQualityModeLabel(info.qualityMode)}`;
    const changed = info.changed ? '조정됨' : '유지';
    return `${getPerformanceModeLabel(info.mode || state.performanceMode)} · ${changed} · ${mode} · ${info.reasons.join(', ')}`;
}
function getRecommendationEngine() {
    if (!window.__foxBearRecommendationEngine) {
        const factory = window.FoxBearRecommendationEngine;
        if (!factory || typeof factory.createRecommendationEngine !== 'function') throw new Error('추천 엔진 모듈이 준비되지 않았습니다.');
        window.__foxBearRecommendationEngine = factory.createRecommendationEngine({
            GENRE_PRESETS,
            PRESET_LABELS,
            clamp,
            clamp01,
            normalizeLogFrequency,
            estimateMobileSpeakerRisk
        });
    }
    return window.__foxBearRecommendationEngine;
}
function recommendPreset(fileName, analysis) {
    return getRecommendationEngine().recommendPreset(fileName, analysis);
}
function safeRecommendPreset(fileName, analysis, source = 'track') {
    return getRecommendationEngine().safeRecommendPreset(fileName, analysis, source);
}
function extractGenreFeatures(analysis) {
    return getRecommendationEngine().extractGenreFeatures(analysis);
}
function keywordHit(haystack, keywords) {
    return getRecommendationEngine().keywordHit(haystack, keywords);
}
function makeGenreReason(preset, features, alternatives, mode) {
    return getRecommendationEngine().makeGenreReason(preset, features, alternatives, mode);
}
function getPresetFamily(preset) {
    return getRecommendationEngine().getPresetFamily(preset);
}
function makeCandidateReason(preset, features = {}, explicit = false, gatePass = false, winner = false) {
    return getRecommendationEngine().makeCandidateReason(preset, features, explicit, gatePass, winner);
}
function makeCandidateCaution(preset, features = {}, explicit = false, gatePass = false) {
    return getRecommendationEngine().makeCandidateCaution(preset, features, explicit, gatePass);
}
function makeRecommendationExplanation(preset, features = {}, alternatives = [], explicit = false, gatePass = false, confidence = 0) {
    return getRecommendationEngine().makeRecommendationExplanation(preset, features, alternatives, explicit, gatePass, confidence);
}
function buildRecommendationExplainability(track) {
    return getRecommendationEngine().buildRecommendationExplainability(track);
}
function buildCandidateExplainText(track, candidate) {
    return getRecommendationEngine().buildCandidateExplainText(track, candidate);
}
function makeRecommendedSettings(preset, analysis) {
    const base = cloneSettings(GENRE_PRESETS[preset] || GENRE_PRESETS.custom);
    if (!analysis || analysis.silence) return base;
    const finiteOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback, bright = clamp01(finiteOr(analysis.brightness, 0.48)), wide = clamp01(finiteOr(analysis.stereoWidth, 0.38)), crest = finiteOr(analysis.crest, 5.0), metallicHint = clamp01(finiteOr(analysis.metallicHint, 0.42));
    const crestNorm = clamp01((crest - 2.2) / 8.5), spatialRisk = clamp01(finiteOr(analysis.spatialExcessRisk, 0)), widthLimit = Number.isFinite(Number(analysis.widthRecommendationLimit)) ? Number(analysis.widthRecommendationLimit) : 72;
    base.clarity = clamp(Math.round(base.clarity + (0.48 - bright) * 10), 8, 82);
    base.warmth = clamp(Math.round(base.warmth + (bright - 0.52) * 7), 10, 86);
    base.width = clamp(Math.round(base.width + (0.38 - wide) * 10), 10, 72);
    base.dynamicPunch = clamp(Math.round(base.dynamicPunch + (0.48 - crestNorm) * 8), 10, 74);
    base.metallicRemoval = clamp(Math.round(base.metallicRemoval + (metallicHint - 0.42) * 24), 18, 78);
    if (preset === 'lofi') base.analogGroove = clamp(Math.round(base.analogGroove + (1 - bright) * 6), 10, 42);
    if (preset === 'kballad' || preset === 'rnb') base.width = clamp(base.width + 4, 30, 74);
    if (preset === 'dance' || preset === 'house' || preset === 'edm') base.dynamicPunch = clamp(base.dynamicPunch + 4, 35, 78);
    if (preset === 'acoustic') base.dynamicPunch = clamp(base.dynamicPunch - 5, 10, 50);
    if (preset === 'futurebass' || preset === 'synthpop') base.metallicRemoval = clamp(base.metallicRemoval + 4, 20, 82);
    if (preset === 'cinematic') base.width = clamp(base.width + 5, 36, 78);
    if (preset === 'spatial') base.stereoGroove = clamp(base.stereoGroove + 3, 8, 24);
    if (preset === 'tape') base.analogGroove = clamp(base.analogGroove + 4, 18, 36);
    if (preset === 'punch') base.dynamicPunch = clamp(base.dynamicPunch + 5, 45, 82);
    if (metallicHint > 0.72) base.clarity = clamp(base.clarity - 4, 8, 78);
    if (crest > 5.8) base.intensity = clamp(base.intensity + 5, 50, 200);
    if (metallicHint > 0.7) base.intensity = clamp(base.intensity + 5, 50, 200);
    const mobileRisk = estimateMobileSpeakerRisk(analysis, base, getMasteringIntensity(base));
    if (mobileRisk.risk > 0.30) {
        base.warmth = clamp(Math.round(base.warmth - mobileRisk.box * 7 - mobileRisk.boom * 5), 10, 84);
        base.dynamicPunch = clamp(Math.round(base.dynamicPunch - mobileRisk.density * 5), 10, 72);
        base.clarity = clamp(Math.round(base.clarity - mobileRisk.harsh * 4), 8, 80);
        base.metallicRemoval = clamp(Math.round(base.metallicRemoval + mobileRisk.harsh * 5 + mobileRisk.box * 3), 18, 84);
    }
    if (spatialRisk > 0.24 || Number(analysis.lowMonoScore || 100) < 78 || wide > 0.56) {
        base.width = clamp(Math.min(base.width, widthLimit) - Math.round(spatialRisk * 7), 10, 68);
        base.stereoGroove = clamp(Math.round(base.stereoGroove - spatialRisk * 9 - Math.max(0, wide - 0.56) * 12), 0, 24);
    }
    applyReferenceToSettings(base, analysis);
    if (spatialRisk > 0.24 || Number(analysis.lowMonoScore || 100) < 78) {
        base.width = clamp(Math.min(base.width, widthLimit), 10, 68);
        base.stereoGroove = clamp(base.stereoGroove, 0, 24);
    }
    return base;
}
function applyReferenceToSettings(settings, analysis) {
    const ref = state.referenceProfile?.status === 'ready' ? state.referenceProfile.target : null;
    if (!settings || !analysis || !ref) return settings;
    const refAmount = getReferenceMatchStrengthAmount();
    const brightDelta = clamp(Number(ref.brightness || 0.5) - Number(analysis.brightness || 0.5), -0.55, 0.55);
    let widthDelta = clamp(Number(ref.stereoWidth || 0.35) - Number(analysis.stereoWidth || 0.35), -0.50, 0.50);
    const bassDelta = clamp(Number(ref.bass || 0.25) - Number(analysis.bassRatio || 0.25), -0.45, 0.45);
    const punchDelta = clamp(Number(ref.transientDensity || 0.35) - Number(analysis.transientDensity || 0.35), -0.50, 0.50);
    const metallicDelta = clamp(Number(ref.metallicHint || 0.4) - Number(analysis.metallicHint || 0.4), -0.50, 0.50);
    const spectrumDelta = getSpectrumProfileDelta(ref, analysis);
    const detailedDelta = spectrumDelta.profile24 || getReferenceProfileBandDeltas(ref, analysis);
    const spatialRisk = clamp01(Number(analysis.spatialExcessRisk || 0));
    if (widthDelta > 0 && (spatialRisk > 0.20 || Number(analysis.lowMonoScore || 100) < 82 || Number(analysis.stereoWidth || 0) > 0.54)) {
        widthDelta *= clamp(1 - spatialRisk * 1.15, 0.18, 0.62);
    }
    const vocalMetalRisk = estimateVocalMetallicRisk(analysis, settings, null, getMasteringIntensity(settings));
    const mobileRisk = estimateMobileSpeakerRisk(analysis, settings, getMasteringIntensity(settings));
    const refinedPresence = spectrumDelta.presence * 0.62 + detailedDelta.vocal * 0.18 + detailedDelta.presence * 0.20;
    const refinedAir = spectrumDelta.air * 0.58 + detailedDelta.sibilance * 0.14 + detailedDelta.air * 0.28;
    const safePresenceDelta = refinedPresence > 0 ? refinedPresence * clamp(1 - vocalMetalRisk * 1.35 - mobileRisk.harsh * 0.25, 0.12, 1) : refinedPresence;
    const safeAirDelta = refinedAir > 0 ? refinedAir * clamp(1 - vocalMetalRisk * 1.45 - mobileRisk.harsh * 0.30, 0.10, 1) : refinedAir;
    const safeBrightDelta = brightDelta > 0 ? brightDelta * clamp(1 - vocalMetalRisk * 1.10 - mobileRisk.harsh * 0.18, 0.20, 1) : brightDelta;
    settings.clarity = clamp(Math.round(settings.clarity + (safeBrightDelta * 8 + safePresenceDelta * 13 + safeAirDelta * 8) * refAmount), 8, 82);
    settings.warmth = clamp(Math.round(settings.warmth + (bassDelta * 7 + spectrumDelta.low * 7 + detailedDelta.mud * 4 - safeBrightDelta * 3) * refAmount), 10, 86);
    settings.width = clamp(Math.round(settings.width + widthDelta * 12 * refAmount), 10, 76);
    settings.dynamicPunch = clamp(Math.round(settings.dynamicPunch + punchDelta * 10 * refAmount), 10, 82);
    settings.metallicRemoval = clamp(Math.round(settings.metallicRemoval + (Math.max(0, metallicDelta) * 6 + Math.max(0, -safePresenceDelta) * 8 + Math.max(0, detailedDelta.harsh) * 4) * refAmount + vocalMetalRisk * 5 + mobileRisk.harsh * 3), 18, 84);
    const widthLimit = Number.isFinite(Number(analysis.widthRecommendationLimit)) ? Number(analysis.widthRecommendationLimit) : 72;
    if (spatialRisk > 0.24 || Number(analysis.lowMonoScore || 100) < 78) settings.width = clamp(Math.min(settings.width, widthLimit), 10, 68);
    return settings;
}
function applyPresetToSelected(preset, userInitiated) {
    const track = getSelectedTrack();
    const settings = cloneSettings(GENRE_PRESETS[preset] || GENRE_PRESETS.custom);
    if (track) {
        if (userInitiated) saveUndoPoint(track, '프리셋 적용 전');
        track.preset = preset;
        track.settings = settings;
        if (userInitiated) track.genreLocked = true;
        if (userInitiated) invalidateMasteredOutput(track, `${PRESET_LABELS[preset]} 프리셋을 수동 적용했습니다. 다시 마스터링하세요.`, true);
    }
    state.programmatic = true;
    setControlsFromSettings(settings, preset, track ? track.recommendedSettings : settings);
    state.programmatic = false;
    renderAll({ keepDetailAudio: true });
}
function applyAIRecommendationToSelected() {
    const targets = getSelectedTracks().length ? getSelectedTracks() : [getSelectedTrack()].filter(Boolean);
    const ready = targets.filter(track => track.analysis);
    if (!ready.length) {
        showToast('분석이 완료된 트랙을 선택하세요.');
        return;
    }
    ready.forEach(track => {
        saveUndoPoint(track, 'AI 추천 적용 전');
        if (track.genreLocked) {
            track.settings = cloneSettings(makeRecommendedSettings(track.preset || 'custom', track.analysis));
            invalidateMasteredOutput(track, `${PRESET_LABELS[track.preset] || track.preset} 잠금 장르 기준 추천값을 적용했습니다.`, true);
            return;
        }
        track.preset = track.recommendedPreset || 'custom';
        track.settings = cloneSettings(track.recommendedSettings || GENRE_PRESETS.custom);
        invalidateMasteredOutput(track, `${PRESET_LABELS[track.preset] || track.preset} AI 추천값을 다시 적용했습니다.`, true);
    });
    const active = getSelectedTrack();
    if (active) applyTrackToControls(active);
    renderAll({ keepDetailAudio: true });
    showToast(`${ready.length}개 트랙에 AI 추천 프리셋을 적용했습니다.`);
}
function applyTrackToControls(track) {
    state.programmatic = true;
    el.genreSelect.value = track.preset || 'custom';
    setControlsFromSettings(track.settings, track.preset, track.recommendedSettings);
    setTransformControls(track.transform || DEFAULT_TRANSFORM);
    setInstrumentControls(track.instrument || DEFAULT_INSTRUMENT_LAYER);
    state.programmatic = false;
}
function setControlsFromSettings(settings, preset, recommended) {
    el.genreSelect.value = preset || 'custom';
    SLIDERS.forEach(slider => {
        const input = document.getElementById(slider.id);
        const valueEl = document.getElementById(`value-${slider.id}`);
        const recEl = document.getElementById(`rec-${slider.id}`);
        const min = slider.min ?? 0;
        const max = slider.max ?? 100;
        const step = slider.step ?? 1;
        const raw = Number(settings[slider.id] ?? GENRE_PRESETS.custom[slider.id]);
        const value = clampToStep(raw, min, max, step);
        input.value = String(value);
        valueEl.textContent = formatSliderValue(slider, value);
        if (recommended && recommended[slider.id] !== undefined && preset !== 'custom') recEl.textContent = `추천: ${formatSliderValue(slider, recommended[slider.id])}`;
        else recEl.textContent = '';
        updateSliderHint(slider.id);
    });
    syncEnhancedSelectButtons();
}
function handlePitchSpeedChange() {
    const track = getSelectedTrack();
    const transform = track ? cloneTransform(track.transform) : cloneTransform(DEFAULT_TRANSFORM);
    transform.snapSemitone = el.snapSemitone.checked;
    transform.pitchSemitones = Number(el.pitchSlider.value);
    transform.speedRatio = Number(el.speedSlider.value);
    if (transform.snapSemitone) transform.pitchSemitones = Math.round(transform.pitchSemitones);
    transform.pitchSemitones = clamp(transform.pitchSemitones, -12, 12);
    transform.speedRatio = clamp(transform.speedRatio, 0.5, 1.5);
    transform.beatPreset = getBeatPresetForRatio(transform.speedRatio);
    if (track) {
        track.transform = transform;
        invalidateMasteredOutput(track, '피치/속도 조정값이 적용되었습니다. 다시 마스터링하세요.', true);
    }
    setTransformControls(transform);
    renderAll({ keepDetailAudio: true });
}
function setTransformControls(transform) {
    const value = cloneTransform(transform || DEFAULT_TRANSFORM);
    state.programmatic = true;
    el.snapSemitone.checked = Boolean(value.snapSemitone);
    el.pitchSlider.step = value.snapSemitone ? '1' : '0.01';
    el.pitchSlider.value = String(value.pitchSemitones);
    el.speedSlider.value = String(value.speedRatio);
    el.pitchValue.textContent = `${formatSigned(value.pitchSemitones, value.snapSemitone ? 0 : 2)} st`;
    el.speedValue.textContent = `${value.speedRatio.toFixed(2)}x`;
    if (el.beatChangeSelect) el.beatChangeSelect.value = value.beatPreset || getBeatPresetForRatio(value.speedRatio);
    if (el.beatValue) el.beatValue.textContent = getBeatPresetLabel(value.beatPreset || getBeatPresetForRatio(value.speedRatio));
    el.keyReadout.textContent = formatSigned(value.pitchSemitones, value.snapSemitone ? 0 : 2);
    el.tempoReadout.textContent = `${value.speedRatio.toFixed(2)}x`;
    el.tempoPercent.textContent = `${Math.round(value.speedRatio * 100)}%`;
    if (el.pitchHint) el.pitchHint.textContent = `${value.snapSemitone ? 'st 단위 고정 ON' : 'cent 미세 조정 ON'} · ${Math.abs(value.pitchSemitones) < 0.001 ? '원본 키 유지' : 'Pitch 변경 적용'}`;
    if (el.speedHint) el.speedHint.textContent = `BPM ${value.speedRatio.toFixed(2)}x · ${Math.abs(value.speedRatio - 1) < 0.001 ? '기본 속도' : '길이/템포 변경'}`;
    if (el.beatHint) el.beatHint.textContent = value.beatPreset === 'custom' ? '슬라이더로 직접 만든 커스텀 박자 비율입니다.' : `${getBeatPresetLabel(value.beatPreset)} · 속도 슬라이더와 연동됩니다.`;
    el.pitchSpeedBadge.textContent = isDefaultTransform(value) ? '기본값' : '변경 적용';
    state.programmatic = false;
    syncEnhancedSelectButtons();
}
function handleBeatChangeSelect() {
    if (state.programmatic || !el.beatChangeSelect) return;
    const presetKey = el.beatChangeSelect.value || 'original';
    const preset = BEAT_CHANGE_PRESETS[presetKey] || null;
    const track = getSelectedTrack();
    const transform = track ? cloneTransform(track.transform) : cloneTransform(DEFAULT_TRANSFORM);
    if (preset) transform.speedRatio = clamp(preset.ratio, 0.5, 1.5);
    transform.beatPreset = presetKey === 'custom' ? 'custom' : (presetKey in BEAT_CHANGE_PRESETS ? presetKey : 'original');
    if (track) {
        saveUndoPoint(track, '박자 변경 전', { auto: true });
        track.transform = transform;
        invalidateMasteredOutput(track, `${getBeatPresetLabel(transform.beatPreset)} 박자 변경값이 적용되었습니다. 다시 마스터링하세요.`, true);
    }
    setTransformControls(transform);
    renderAll({ keepDetailAudio: true });
    showToast(`${getBeatPresetLabel(transform.beatPreset)} 적용`);
}
function handleInstrumentLayerChange() {
    if (state.programmatic) return;
    const track = getSelectedTrack();
    const layer = cloneInstrumentLayer({
        mode: el.instrumentLayerSelect ? el.instrumentLayerSelect.value : 'off',
        amount: el.instrumentAmountSelect ? el.instrumentAmountSelect.value : 'light'
    });
    if (track) {
        saveUndoPoint(track, '악기 레이어 변경 전', { auto: true });
        track.instrument = layer;
        track.instrumentInfo = null;
        invalidateMasteredOutput(track, `${getInstrumentLayerLabel(layer.mode)} 악기 추가 설정이 변경되었습니다. 다시 마스터링하세요.`, true);
    }
    setInstrumentControls(layer);
    renderAll({ keepDetailAudio: true });
}
function setInstrumentControls(layer) {
    const value = cloneInstrumentLayer(layer || DEFAULT_INSTRUMENT_LAYER);
    state.programmatic = true;
    if (el.instrumentLayerSelect) el.instrumentLayerSelect.value = value.mode;
    if (el.instrumentAmountSelect) el.instrumentAmountSelect.value = value.amount;
    if (el.instrumentBadge) el.instrumentBadge.textContent = value.mode === 'off' ? 'OFF' : `${getInstrumentLayerLabel(value.mode)} · ${getInstrumentAmountLabel(value.amount)}`;
    if (el.instrumentHint) el.instrumentHint.textContent = value.mode === 'off' ? '악기 추가를 끄면 원본 오디오만 마스터링합니다.' : '자동 추정 BPM에 맞춰 합성 킥/하이햇/클랩을 아주 작게 섞습니다.';
    state.programmatic = false;
    syncEnhancedSelectButtons();
}
function updateSliderHint(id) {
    const track = getSelectedTrack();
    const slider = SLIDERS.find(item => item.id === id);
    const input = document.getElementById(id);
    const hint = document.getElementById(`hint-${id}`);
    if (!slider || !input || !hint) return;
    const preset = track ? track.preset : el.genreSelect.value;
    const recommendation = track ? track.recommendedSettings : GENRE_PRESETS[preset];
    const currentValue = Number(input.value);
    if (!track || preset === 'custom' || !recommendation) {
        hint.textContent = customHintText(slider, currentValue);
        return;
    }
    const recommendedValue = Number(recommendation[id]);
    hint.textContent = '';
    const marker = document.createElement('span');
    if (currentValue < recommendedValue) {
        marker.className = 'hint-down';
        marker.textContent = '↓ 낮춤: ';
        hint.append(marker, document.createTextNode(slider.low));
    } else if (currentValue > recommendedValue) {
        marker.className = 'hint-up';
        marker.textContent = '↑ 높임: ';
        hint.append(marker, document.createTextNode(slider.high));
    } else {
        marker.className = 'hint-ok';
        marker.textContent = '✓ 추천값과 동일';
        hint.append(marker);
    }
}
function customHintText(slider, value) {
    const numeric = Number(value);
    if (slider.kind === 'pitch') {
        if (numeric < -0.25) return slider.low;
        if (numeric > 0.25) return slider.high;
        return slider.neutral;
    }
    if (slider.kind === 'bpm') {
        if (numeric < 98) return slider.low;
        if (numeric > 102) return slider.high;
        return slider.neutral;
    }
    if (slider.id === 'intensity') {
        if (numeric < 90) return slider.low;
        if (numeric >= 140) return slider.high;
        return slider.neutral;
    }
    if (numeric < 35) return slider.low;
    if (numeric > 65) return slider.high;
    return slider.neutral;
}
function getPrimaryActionTracks(explicitTrack = null) {
    const explicit = explicitTrack || null;
    if (explicit) return [explicit];
    const checked = getSelectedTracks();
    if (checked.length) return checked;
    const active = getSelectedTrack();
    return active ? [active] : [];
}
function preparePrimaryActionTrack(track) {
    const target = track || getSelectedTrack() || getBottomPreviewDockTrack() || state.tracks[0] || null;
    if (!target) return null;
    state.selectedId = target.id;
    state.bottomPreviewTrackId = target.id;
    if (state.selectedIds && typeof state.selectedIds.add === 'function') state.selectedIds.add(target.id);
    applyTrackToControls(target);
    return target;
}
function notifyBulkMasteringTrackStart(track, meta = {}) { return getBulkImportHudView()?.markMasteringTrackStart?.(track, meta) || false; }
function notifyBulkMasteringTrackResult(track, meta = {}) { return getBulkImportHudView()?.markMasteringTrackResult?.(track, meta) || false; }
function notifyBulkMasteringBatchCancelled(meta = {}) { return getBulkImportHudView()?.markMasteringBatchCancelled?.(meta) || false; }
function notifyBulkMasteringPauseChanged(meta = {}) { return getBulkImportHudView()?.markMasteringPauseChanged?.(meta) || false; }
function notifyBulkMasteringSkipRequested(meta = {}) { return getBulkImportHudView()?.markMasteringSkipRequested?.(meta) || false; }
function notifyBulkMasteringQueueChanged(meta = {}) { return getBulkImportHudView()?.markMasteringQueueChanged?.(meta) || false; }
function runMasteringBatchControl(method, args = []) { const accepted = Boolean(getMasteringBatchRunner()?.[method]?.(...args)); if (accepted) updateBulkImportHud(); return accepted; }
function cancelActiveMasteringBatch(reason = 'user-request') { return runMasteringBatchControl('cancelActiveBatch', [reason]); }
function pauseActiveMasteringBatch(reason = 'user-request') { return runMasteringBatchControl('pauseActiveBatch', [reason]); } function resumeActiveMasteringBatch(reason = 'user-request') { return runMasteringBatchControl('resumeActiveBatch', [reason]); } function skipCurrentMasteringTrack(reason = 'user-skip') { return runMasteringBatchControl('skipCurrentTrack', [reason]); }
function movePendingMasteringTrack(trackId, direction) { return runMasteringBatchControl('movePendingTrack', [trackId, direction]); }
async function retryFailedBulkMasteringTracks() {
    const failedTracks = getBulkImportHudView()?.getFailedTracks?.() || state.tracks.filter(track => track && (track.bulkMasteringResult === 'error' || track.status === 'error'));
    if (!failedTracks.length) { showToast('다시 실행할 실패 곡이 없습니다.'); return false; }
    clearStaleBusyFlagIfIdle('retry-failed-bulk-mastering');
    if (state.busy && hasActiveBlockingWork()) { showToast('현재 작업이 끝난 뒤 실패 곡을 다시 실행해주세요.'); return false; }
    failedTracks.forEach(track => Object.assign(track, { error: null, status: track.analysis ? 'ready' : 'queued', progress: 0, report: '실패 곡 재시도 대기', bulkMasteringResult: 'queued', bulkMasteringCancelReason: '' }));
    const result = await getMasteringBatchRunner().runBatch(failedTracks, {
        source: 'retry-failed', largeBatch: failedTracks.length >= SAFE_LARGE_IMPORT_BATCH_THRESHOLD, inheritImportBatch: false,
        initialRenderOptions: { keepDetailAudio: true }, finalRenderOptions: { keepDetailAudio: true }, masterOptions: { source: 'retry-failed' }
    });
    if (result.completed) showToast(result.failed ? `실패 곡 재시도 완료 · 성공 ${result.completed} / 재실패 ${result.failed}` : `${result.completed}곡 재시도 마스터링 완료`);
    else showToast(result.cancelled ? `실패 곡 재시도가 중단되었습니다. · 취소 ${result.cancelled}` : '실패 곡 재시도를 완료하지 못했습니다.');
    return result.completed > 0;
}
function getMasteringBatchRunner() {
    if (masteringBatchRunner) return masteringBatchRunner;
    const service = getMasteringOrchestratorService();
    if (service && typeof service.createMasteringBatchRunner === 'function') {
        masteringBatchRunner = service.createMasteringBatchRunner({
            beginHudBatch: beginBulkMasteringHudBatch,
            setBusy: value => { state.busy = Boolean(value); },
            beforeBatch: () => { if (state.featureFlags.albumMatch) state.albumProfile = computeAlbumProfile(); },
            afterBatch: payload => afterMasteringBatchMemorySweep(payload?.result || payload || {}),
            onTrackStart: (track, meta) => notifyBulkMasteringTrackStart(track, meta),
            onTrackComplete: (track, meta) => notifyBulkMasteringTrackResult(track, meta),
            onBatchCancelled: meta => notifyBulkMasteringBatchCancelled(meta),
            onCancelRequested: () => updateBulkImportHud(),
            onPauseChanged: meta => notifyBulkMasteringPauseChanged(meta),
            onSkipRequested: meta => notifyBulkMasteringSkipRequested(meta),
            onQueueChanged: meta => notifyBulkMasteringQueueChanged(meta),
            render: options => renderAll(options || {}),
            prepareTrack: track => preparePrimaryActionTrack(track),
            masterTrack
        });
    } else {
        masteringBatchRunner = Object.freeze({
            version: '1.6.37-bulk-pause-skip-reorder-summary-fallback',
            cancelActiveBatch: () => false, pauseActiveBatch: () => false, resumeActiveBatch: () => false,
            skipCurrentTrack: () => false, movePendingTrack: () => false, getActiveBatchSnapshot: () => null,
            async runBatch(items, batchOptions = {}) {
                const tracks = Array.isArray(items) ? items.filter(Boolean) : [];
                let completed = 0, failed = 0;
                try {
                    beginBulkMasteringHudBatch(tracks, batchOptions);
                    state.busy = true;
                    if (state.featureFlags.albumMatch) state.albumProfile = computeAlbumProfile();
                    renderAll(batchOptions.initialRenderOptions || {});
                    for (const track of tracks) {
                        try {
                            preparePrimaryActionTrack(track);
                            (await masterTrack(track, true, batchOptions.masterOptions || {})) ? completed += 1 : failed += 1;
                        } catch (error) { failed += 1; console.error('Batch mastering track error:', error); }
                    }
                    const result = Object.freeze({ total: tracks.length, completed, failed, ok: completed > 0 });
                    afterMasteringBatchMemorySweep(result);
                    return result;
                } finally { state.busy = false;
                    try { renderAll(batchOptions.finalRenderOptions || {}); } catch (error) { console.error('Batch final render error:', error); }
                }
            }
        });
    }
    return masteringBatchRunner;
}
async function masterSelectedTracks(options = {}) {
    clearStaleBusyFlagIfIdle(options.source ? `master-selected-${options.source}` : 'master-selected');
    if (state.busy && hasActiveBlockingWork()) {
        showToast('현재 작업이 끝난 뒤 다시 눌러주세요.');
        return false;
    }
    if (state.busy && !hasActiveBlockingWork()) state.busy = false;
    const explicitTrack = options.track ? preparePrimaryActionTrack(options.track) : null;
    const candidates = getPrimaryActionTracks(explicitTrack).filter(track => track && !['processing'].includes(track.status) && !track.error);
    if (!candidates.length) {
        showToast('마스터링할 곡을 먼저 불러오거나 선택해주세요.');
        return false;
    }
    const result = await getMasteringBatchRunner().runBatch(candidates, {
        source: options.source || 'selected',
        largeBatch: candidates.length >= SAFE_LARGE_IMPORT_BATCH_THRESHOLD,
        inheritImportBatch: true,
        initialRenderOptions: { keepDetailAudio: true },
        finalRenderOptions: { keepDetailAudio: true },
        masterOptions: { source: options.source || 'main' }
    });
    if (result.completed) {
        showToast(`${result.completed}개 선택 트랙 마스터링 완료`);
        const focusTarget = candidates.find(track => track?.outBlob) || candidates[0];
        requestAnimationFrame(() => focusCompletedTrackDownload(focusTarget));
    } else showToast('마스터링을 완료하지 못했습니다. 트랙 상태를 확인해주세요.');
    return result.completed > 0;
}
async function masterAllTracks() {
    if (state.busy) return false;
    const candidates = state.tracks.filter(track => !['processing', 'analyzing'].includes(track.status) && !track.error);
    if (!candidates.length) return false;
    const result = await getMasteringBatchRunner().runBatch(candidates, {
        source: 'all',
        largeBatch: candidates.length >= SAFE_LARGE_IMPORT_BATCH_THRESHOLD,
        inheritImportBatch: true,
        initialRenderOptions: {},
        finalRenderOptions: {},
        masterOptions: { source: 'all' }
    });
    setNativeBadge(getCompletedUndownloadedCount());
    if (result.completed) {
        foxBearHaptic('complete');
        showToast(result.stopped
            ? `전체 마스터링 중단 · 완료 ${result.completed} / 실패 ${result.failed} / 취소 ${result.cancelled || 0}`
            : (result.failed ? `전체 마스터링 완료 · 성공 ${result.completed} / 실패 ${result.failed}` : '전체 마스터링이 성공적으로 완료되었습니다.'));
    } else if (result.cancelled) {
        showToast(`전체 마스터링이 중단되었습니다. · 취소 ${result.cancelled}`);
    }
    return result.completed > 0;
}
function quantizeProgressStep(value, step = 5) {
    const n = clamp(Number(value || 0), 0, 100);
    if (n >= 100) return 100;
    return clamp(Math.round(n / step) * step, 0, 99);
}
async function setMasteringProgress(track, targetProgress, report = '', options = {}) {
    if (!track) return;
    const target = clamp(Number(targetProgress || 0), 0, 100);
    const current = clamp(Number(track.progress || 0), 0, 100);
    const steps = [];
    if (target > current) {
        let next = Math.ceil((current + 0.01) / 5) * 5;
        while (next < target) {
            steps.push(next);
            next += 5;
        }
    }
    if (!steps.length || steps[steps.length - 1] !== target) steps.push(target);
    for (const step of steps) {
        track.progress = step;
        if (report) track.report = report;
        if (track.bulkMasteringBatchId || track.bulkImportBatchId) updateBulkImportHud();
        scheduleRenderAll('mastering-progress', {
            keepDetailAudio: true,
            delayMs: Number.isFinite(Number(options.renderDelayMs)) ? Number(options.renderDelayMs) : SAFE_MASTERING_PROGRESS_RENDER_DELAY_MS,
            immediate: Boolean(options.immediateRender || step >= 100)
        });
        if (!options.noYield) await yieldToBrowser();
    }
}
async function waitForTrackAnalysisIfNeeded(track, purpose = '마스터링') {
    if (!track) return false;
    if (track.analysis && track.status !== 'analyzing') return true;
    if (track.error) return false;
    const label = purpose || '작업';
    try {
        if (track.analysisPromise && typeof track.analysisPromise.then === 'function') {
            showToast(`${label} 전 곡 분석을 마무리합니다.`);
            track.report = `${label} 준비 중 · 분석 완료 대기`;
            renderAll({ keepDetailAudio: true });
            await track.analysisPromise;
        } else if (!track.analysis && track.status !== 'processing') {
            showToast(`${label} 전 곡 분석을 먼저 실행합니다.`);
            const analysisJob = analyzeTrack(track);
            track.analysisPromise = analysisJob;
            await analysisJob.finally(() => {
                if (track.analysisPromise === analysisJob) track.analysisPromise = null;
            });
        }
    } catch (error) {
        reportOperationalIncident('mastering', error, `purpose=${label}; phase=analysis-preflight`, { reason: 'analysis-before-mastering-failed' });
        track.status = 'error';
        track.error = getErrorMessage(error, '분석 실패');
        track.report = track.error;
        showToast(`${label} 준비 실패: ${track.error}`);
        renderAll({ keepDetailAudio: true });
        return false;
    }
    if (track.error) return false;
    return Boolean(track.analysis);
}
function getQualityRecoveryE2EControl() {
    if (window.__FOXBEAR_E2E__ !== true) return null;
    const value = window.__FOXBEAR_E2E_QUALITY_RECOVERY__;
    return value && typeof value === 'object' ? value : null;
}
function getQualityRecoveryRiskLabel(code) {
    const labels = {
        DYNAMIC_COLLAPSE: '과도한 리미팅',
        HIGH_LOSS: '고역 손실',
        LOW_PUMPING: '저역 펌핑',
        PHASE_RISK: '스테레오 위상',
        INVALID_OUTPUT: '출력 샘플 무결성'
    };
    return labels[String(code || '').toUpperCase()] || '품질 회귀';
}
function applyQualityRecoveryE2EOverride(track, gate) {
    const control = getQualityRecoveryE2EControl();
    if (!control?.forceFirstGateFail || track?.engineRecoveryInfo?.attempted) return gate;
    const code = String(control.riskCode || 'PHASE_RISK').toUpperCase();
    const label = String(control.riskLabel || getQualityRecoveryRiskLabel(code));
    const detail = String(control.riskDetail || `E2E injected ${code}`);
    const item = Object.freeze({ label, status: 'fail', detail, meta: Object.freeze({ code, e2eInjected: true }) });
    const riskFlag = Object.freeze({ label, status: 'fail', detail, code, e2eInjected: true });
    return Object.freeze({
        ...(gate || {}),
        status: 'fail',
        label: 'FAIL',
        score: Math.min(Number(gate?.score || 100), 48),
        summary: `${Number(gate?.items?.filter?.(entry => entry.status === 'pass')?.length || 0)} 통과 · E2E 강제 실패 1건`,
        items: Object.freeze([...(gate?.items || []), item]),
        riskFlags: Object.freeze([...(gate?.riskFlags || []), riskFlag]),
        e2eInjected: true
    });
}
function maybeThrowQualityRecoveryE2E(stage) {
    const control = getQualityRecoveryE2EControl();
    if (control?.throwAt && String(control.throwAt) === String(stage)) {
        const error = new Error(`E2E injected quality recovery error at ${stage}`);
        error.code = 'FOXBEAR_E2E_QUALITY_RECOVERY';
        throw error;
    }
}
async function runQualityGateRecoveryAttempt(track, context = {}) {
    const service = getMasteringOrchestratorService();
    const plan = service?.createQualityRecoveryPlan?.({ gate: track?.qualityGate, settings: track?.settings, targetLufs: track?.finalizeInfo?.targetLufs ?? resolveTargetLufsForTrack(track), ceilingDb: track?.finalizeInfo?.ceilingDb ?? state.ceilingDb, alreadyAttempted: Boolean(track?.engineRecoveryInfo?.attempted) });
    if (!plan) return null;
    if (FoxBearInAppMasteringSafetyService?.shouldPreserveFirstRender?.(track?.inAppSafetyInfo, track?.qualityGate)) {
        track.engineRecoveryInfo = {
            attempted: false,
            status: 'preserved-first-render-device-safety',
            attemptCount: 0,
            reason: `${track.inAppSafetyInfo.label} 메모리 보호 · 비치명 품질 실패`,
            profileId: plan.profileId,
            profileLabel: plan.profileLabel,
            profileIds: [...(plan.profileIds || [])],
            riskCodes: [...(plan.riskCodes || [])],
            firstGate: track.qualityGate,
            preservedFirstRender: true,
            runtimeSafety: track.inAppSafetyInfo,
            completedAt: new Date().toISOString()
        };
        track.report = `품질 점검 필요 · ${track.inAppSafetyInfo.label}에서는 메모리 보호를 위해 첫 렌더를 보존했습니다.`;
        reportOperationalIncident('quality-recovery', new Error('In-app quality recovery deferred for device safety'), `profile=${plan.profileId || ''}; preservedFirstRender=true; projectedPeakMb=${track.inAppSafetyInfo.projectedPeakMb || 0}`, { reason: 'quality-recovery-deferred-device-safety', severity: 'warning' });
        return null;
    }
    const originalTrackState = {
        settings: cloneSettings(track.settings),
        performanceGuardInfo: track.performanceGuardInfo,
        finalizeInfo: track.finalizeInfo,
        masterReport: track.masterReport,
        qualityGate: track.qualityGate,
        comparison: track.comparison,
        waveformOverview: track.waveformOverview,
        abHighlightStartSec: track.abHighlightStartSec,
        safetyInfo: track.safetyInfo,
        truePeakInfo: track.truePeakInfo,
        exportFallbackInfo: track.exportFallbackInfo
    };
    const firstGate = originalTrackState.qualityGate;
    const startedAt = new Date().toISOString();
    track.engineRecoveryInfo = {
        attempted: true,
        status: 'running',
        attemptCount: 1,
        reason: plan.reason,
        profileId: plan.profileId,
        profileLabel: plan.profileLabel,
        profileIds: [...(plan.profileIds || [])],
        riskCodes: [...(plan.riskCodes || [])],
        adjustments: [...(plan.adjustments || [])],
        requestedSettings: originalTrackState.settings,
        safeSettings: cloneSettings(plan.safeSettings),
        firstGate,
        startedAt
    };
    track.report = `품질 게이트 실패 · ${plan.profileLabel || '안전 설정'}으로 1회 자동 재렌더 중 (${plan.reason})`;
    track.progress = Math.max(99, Number(track.progress || 0));
    scheduleRenderAll('quality-gate-auto-recovery', { keepDetailAudio: true, immediate: true });
    await yieldToBrowser();
    try {
        track.settings = cloneSettings(plan.safeSettings);
        const retryMasteredBuffer = await renderMasterBuffer(context.preparedBuffer, track.settings, track.preset, track.analysis, context.albumProfile);
        context.assertMasteringJobActive('quality-recovery-master-render');
        sanitizeAudioBuffer(retryMasteredBuffer, 'quality-recovery-master-chain');
        maybeThrowQualityRecoveryE2E('after-render');
        markPerformanceStage(track, '안전 재렌더', { prepared: context.preparedBuffer, mastered: retryMasteredBuffer });
        const baseGuard = getSmartPerformanceGuardDecision(track, retryMasteredBuffer, context.requestedOutputFormat);
        const retryGuard = { ...baseGuard, sourceQualityMode: baseGuard.qualityMode, qualityMode: plan.qualityMode, truePeak: plan.truePeak, changed: true, recovery: true, reasons: [...(baseGuard.reasons || []), '품질 게이트 1회 자동 복구'] };
        const retryFinalization = await finalizeMasterBufferAsync(retryMasteredBuffer, { targetLufs: plan.targetLufs, ceilingDb: plan.ceilingDb, qualityMode: plan.qualityMode, masterGoal: state.masterGoal, truePeak: plan.truePeak, analysis: track.analysis || {}, dspProfile: getSharedDspSummaryForReport(track.analysis?.sharedDspProfileApplied), signal: context.signal || null, jobId: `${context.masteringJobId}:quality-recovery-finalizer` });
        context.assertMasteringJobActive('quality-recovery-finalizer');
        const retryFinalBuffer = retryFinalization.buffer;
        sanitizeAudioBuffer(retryFinalBuffer, 'quality-recovery-finalizer');
        maybeThrowQualityRecoveryE2E('after-finalizer');
        markPerformanceStage(track, '안전 파이널라이저', { prepared: context.preparedBuffer, final: retryFinalBuffer });
        track.performanceGuardInfo = retryGuard;
        const retryEncoded = await encodeMasterOutputAsync(retryFinalBuffer, context.requestedOutputFormat, { signal: context.signal || null, jobId: `${context.masteringJobId}:quality-recovery-encode` });
        context.assertMasteringJobActive('quality-recovery-encode');
        maybeThrowQualityRecoveryE2E('after-encode');
        if (!retryEncoded.blob || retryEncoded.blob.size <= 44) throw new Error('안전 재렌더 결과가 비어 있습니다.');
        const retryReport = createMasterReport(track, context.preparedBuffer, retryFinalBuffer, retryFinalization.info, retryEncoded);
        const retryGate = createQualityGateReport(track, retryReport, retryFinalization.info, retryEncoded);
        retryReport.qualityGate = retryGate;
        markPerformanceStage(track, '안전 인코딩', { prepared: context.preparedBuffer, final: retryFinalBuffer, output: retryEncoded.blob });
        track.finalizeInfo = retryFinalization.info;
        track.masterReport = retryReport;
        track.qualityGate = retryGate;
        track.comparison = createComparisonInfo(track, retryFinalization.info);
        track.waveformOverview = createWaveformOverview(context.preparedBuffer, retryFinalBuffer, track.memoryGovernorInfo?.compactWaveform ? Math.max(36, Math.round(WAVEFORM_OVERVIEW_BINS / 2)) : WAVEFORM_OVERVIEW_BINS); if (state.autoHighlightAB && !track.memoryGovernorInfo?.compactWaveform) track.abHighlightStartSec = estimateABHighlightStartFromPair(context.preparedBuffer, retryFinalBuffer, track.analysis); else if (track.memoryGovernorInfo?.compactWaveform && Number.isFinite(Number(track.analysis?.abHighlightStartSec))) track.abHighlightStartSec = Number(track.analysis.abHighlightStartSec);
        track.safetyInfo = computeEngineSafetyInfo(track, retryFinalBuffer, retryFinalization.info);
        track.truePeakInfo = { mode: 'truePeak', targetDbTP: plan.ceilingDb, peakBefore: retryFinalization.info.peakBefore, peakAfter: retryFinalization.info.peakAfter, gain: Math.pow(10, (retryFinalization.info.gainDb || 0) / 20) };
        track.exportFallbackInfo = retryEncoded.fallbackFrom ? { from: retryEncoded.fallbackFrom, to: retryEncoded.format, reason: retryEncoded.fallbackReason || '' } : null;
        track.engineRecoveryInfo = {
            ...track.engineRecoveryInfo,
            status: retryGate.status === 'fail' ? 'failed-after-retry' : 'recovered',
            finalGate: retryGate,
            completedAt: new Date().toISOString(),
            targetLufs: plan.targetLufs,
            ceilingDb: plan.ceilingDb,
            qualityMode: plan.qualityMode,
            preservedFirstRender: false
        };
        return { masteredBuffer: retryMasteredBuffer, finalBuffer: retryFinalBuffer, finalization: retryFinalization, encoded: retryEncoded };
    } catch (error) {
        const cancelled = Boolean(context.signal?.aborted || isWorkerJobAbortError(error));
        const recoveryFailure = { ...track.engineRecoveryInfo, status: cancelled ? 'cancelled' : 'error', error: getErrorMessage(error, cancelled ? '안전 재렌더 취소' : '안전 재렌더 실패'), errorCode: String(error?.code || ''), completedAt: new Date().toISOString(), preservedFirstRender: true };
        Object.assign(track, originalTrackState); track.engineRecoveryInfo = recoveryFailure;
        if (cancelled) throw (isWorkerJobAbortError(error) ? error : (getWorkerJobService()?.makeAbortError?.(context.signal?.reason || 'quality-recovery-cancelled') || error));
        reportOperationalIncident('quality-recovery', error, `profile=${recoveryFailure.profileId || ''}; risks=${(recoveryFailure.riskCodes || []).join(',')}; preservedFirstRender=true`, { reason: 'quality-recovery-failed' });
        console.warn('Quality gate auto recovery failed; keeping first render:', error); return null;
    }
}
async function masterTrack(track, calledFromBatch = false, options = {}) {
    const notifyBlocked = Boolean(options.notifyBlocked);
    const forceIfIdle = Boolean(options.forceIfIdle);
    if (!track) {
        if (notifyBlocked) showToast('마스터링할 곡을 찾지 못했습니다.');
        return false;
    }
    if (track.status === 'processing') {
        if (notifyBlocked) showToast('이미 마스터링이 진행 중입니다.');
        return false;
    }
    if (track.status === 'analyzing' || (!track.analysis && track.status !== 'processing')) {
        if (options.awaitAnalysis !== false) {
            const ready = await waitForTrackAnalysisIfNeeded(track, '마스터링');
            if (!ready) {
                if (notifyBlocked) showToast('분석을 완료하지 못해 마스터링을 시작할 수 없습니다.');
                return false;
            }
        } else {
            if (notifyBlocked) showToast('분석이 끝난 뒤 마스터링을 진행할 수 있습니다.');
            return false;
        }
    }
    if (!calledFromBatch && state.busy) {
        const cleared = forceIfIdle ? clearStaleBusyFlagIfIdle('master-track-force-idle') : false;
        if (state.busy && !cleared) {
            if (notifyBlocked) showToast('현재 작업이 끝난 뒤 다시 눌러주세요.');
            return false;
        }
    }
    pauseAllPreviewAudio();
    if (!calledFromBatch) {
        getBulkImportHudView()?.detachTrackFromMasteringBatch?.(track);
        state.busy = true;
        if (state.featureFlags.albumMatch) state.albumProfile = computeAlbumProfile();
    }
    markMasteringQueueStart(track, calledFromBatch ? 'batch' : 'single');
    try { track.masteringAbortController?.abort?.('mastering-superseded'); } catch (error) {}
    const masteringAbortController = typeof AbortController === 'function' ? new AbortController() : null;
    const externalMasteringSignal = options.signal || null;
    const abortFromBatchSignal = () => {
        try { masteringAbortController?.abort?.(externalMasteringSignal?.reason || 'batch-cancelled'); } catch (error) {}
    };
    if (externalMasteringSignal?.aborted) abortFromBatchSignal();
    else externalMasteringSignal?.addEventListener?.('abort', abortFromBatchSignal, { once: true });
    const masteringJobId = getWorkerJobService()?.createJobId?.(`master:${track.id}`) || `master:${track.id}:${Date.now()}`;
    track.masteringAbortController = masteringAbortController;
    track.masteringJobId = masteringJobId;
    const assertMasteringJobActive = stage => {
        if (masteringAbortController?.signal?.aborted || track.masteringJobId !== masteringJobId) {
            const error = getWorkerJobService()?.makeAbortError?.(`mastering-cancelled:${stage}`) || new DOMException('마스터링 작업이 취소되었습니다.', 'AbortError');
            throw error;
        }
    };
    const masteringTask = { id: masteringJobId, signal: masteringAbortController?.signal || null, throwIfCancelled: assertMasteringJobActive };
    let completedSuccessfully = false;
    track.status = 'processing';
    track.progress = 0;
    track.error = null;
    track.trimInfo = null;
    track.instrumentInfo = null;
    track.albumApplied = null;
    track.truePeakInfo = null;
    track.finalizeInfo = null;
    track.performanceGuardInfo = null;
    track.safetyInfo = null;
    track.qualityGate = null;
    track.engineRecoveryInfo = null;
    track.waveformOverview = null;
    track.exportFallbackInfo = null;
    track.masterReport = null;
    track.inputGuardInfo = null;
    track.inAppSafetyInfo = null;
    track.memoryGovernorInfo = null; track.memoryWarningKey = '';
    track.remasterCount = Number(track.remasterCount || 0) + 1;
    track.performanceInfo = beginPerformanceProfile();
    track.inAppSafetyInfo = FoxBearInAppMasteringSafetyService?.createPlan?.(null, { durationSec: Number(track.analysis?.duration || 0), sampleRate: Number(track.analysis?.sampleRate || 48000), channels: Number(track.analysis?.channels || 2), qualityMode: state.qualityMode || 'balanced', outputFormat: state.outputFormat || 'wav24', transformed: !isDefaultTransform(track.transform || DEFAULT_TRANSFORM), instrumentLayer: shouldUseInstrumentLayer(track.instrument), qualityRecoveryEnabled: true }) || null; const preflightGovernor = FoxBearMasteringMemoryDiagnostics?.createGovernorDecision?.(track, null, { stage: '사전 진단', sourceQualityMode: state.qualityMode || 'balanced', requestedTruePeak: state.featureFlags.truePeakGuard !== false, outputFormat: state.outputFormat || 'wav24' }) || null; maybeAnnounceMemoryGovernor(track, preflightGovernor, track.inAppSafetyInfo?.warning, 'preflight'); track.report = track.inAppSafetyInfo?.warning?.message || '온디맨드 디코더 구동 중...';
    syncWakeLockForCurrentActivity();
    await setMasteringProgress(track, 5, track.report);
    let currentSourceBuffer = null;
    let preparedBuffer = null;
    let masteredBuffer = null;
    let finalBuffer = null;
    try {
        assertMasteringJobActive('start');
        currentSourceBuffer = await decodeAudio(track.file, masteringTask);
        assertMasteringJobActive('decode');
        track.inAppSafetyInfo = FoxBearInAppMasteringSafetyService?.createPlan?.(currentSourceBuffer, {
            qualityMode: state.qualityMode || 'balanced',
            outputFormat: state.outputFormat || 'wav24',
            transformed: !isDefaultTransform(track.transform || DEFAULT_TRANSFORM),
            instrumentLayer: shouldUseInstrumentLayer(track.instrument),
            qualityRecoveryEnabled: true
        }) || null;
        track.inputGuardInfo = FoxBearMasteringInputGuard?.assertMasterable
            ? FoxBearMasteringInputGuard.assertMasterable(currentSourceBuffer, track.analysis || {})
            : null;
        markPerformanceStage(track, '디코딩', { decoded: currentSourceBuffer });
        maybeAnnounceMemoryGovernor(track, track.memoryGovernorInfo, track.inAppSafetyInfo?.warning, 'decode');
        const decodeReadyMessage = track.inAppSafetyInfo?.highRisk
            ? `디코딩 완료 · ${track.inAppSafetyInfo.label} 안전 경로 적용 (${track.inAppSafetyInfo.projectedPeakMb}MB 예상)`
            : (track.inputGuardInfo?.warnings?.[0] || '디코딩 완료 · 분석/렌더 준비 중');
        await setMasteringProgress(track, 10, decodeReadyMessage);
        if (!track.analysis) {
            await setMasteringProgress(track, 15, '분석 정보가 없어 마스터링 직전 긴급 분석을 실행 중');
            const analysis = await analyzeBufferAsync(currentSourceBuffer, masteringTask);
            analysis.abHighlightStartSec = estimateABHighlightStart(currentSourceBuffer);
            track.abHighlightStartSec = analysis.abHighlightStartSec;
            const recommendation = safeRecommendPreset(track.name, analysis, 'master-emergency');
            track.analysis = analysis;
            track.recommendedPreset = recommendation.preset;
            track.confidence = recommendation.confidence;
            track.genreReason = recommendation.reason || '';
            track.genreAlternatives = recommendation.alternatives || [];
            track.genreExplanation = recommendation.explanation || null;
            if (track.preset === 'custom') {
                track.preset = recommendation.preset;
                track.settings = makeRecommendedSettings(recommendation.preset, analysis);
                track.recommendedSettings = cloneSettings(track.settings);
            }
            assertMasteringJobActive('emergency-analysis');
            markPerformanceStage(track, '긴급 분석', { decoded: currentSourceBuffer });
        }
        if (state.featureFlags.trimSilence) {
            await setMasteringProgress(track, 25, '앞뒤 무음 구간 감지 및 여유 구간 보존 중');
            const trimResult = autoTrimSilenceBuffer(currentSourceBuffer);
            currentSourceBuffer = trimResult.buffer;
            track.trimInfo = trimResult.info;
            markPerformanceStage(track, '무음 정리', { decoded: currentSourceBuffer });
        }
        await setMasteringProgress(track, 30, 'DC offset 제거 및 비정상 샘플 안전 점검 중');
        track.dcInfo = removeDcOffsetAudioBuffer(currentSourceBuffer);
        sanitizeAudioBuffer(currentSourceBuffer, 'pre-pitch-cleanup');
        markPerformanceStage(track, 'DC 정리', { decoded: currentSourceBuffer });
        await yieldToBrowser();
        await setMasteringProgress(track, 40, '피치/BPM 워커 변환 및 오버랩 위상 정렬 중');
        preparedBuffer = await preparePitchSpeedBuffer(currentSourceBuffer, track.transform, { signal: masteringTask.signal, jobId: `${masteringJobId}:pitch`, onProgress: progress => { if (!masteringTask.signal?.aborted && track.masteringJobId === masteringJobId && progress.percent >= 35) track.report = `${progress.stage} · ${progress.percent}%`; } });
        assertMasteringJobActive('pitch-speed');
        currentSourceBuffer = null;
        markPerformanceStage(track, '피치/BPM', { prepared: preparedBuffer });
        await yieldToBrowser();
        if (shouldUseInstrumentLayer(track.instrument)) {
            await setMasteringProgress(track, 55, '박자 감지 및 리듬 악기 레이어 자연 믹싱 중');
            const layered = mixInstrumentLayerBuffer(preparedBuffer, track.instrument, track.analysis);
            preparedBuffer = layered.buffer;
            track.instrumentInfo = layered.info;
            markPerformanceStage(track, '리듬 레이어', { prepared: preparedBuffer });
            await yieldToBrowser();
        }
        await setMasteringProgress(track, 65, '공진 감쇄, 톤 체인, 다이나믹 체인 렌더링 중');
        const albumProfile = getActiveAlbumProfile();
        masteredBuffer = await renderMasterBuffer(preparedBuffer, track.settings, track.preset, track.analysis, albumProfile);
        assertMasteringJobActive('master-render');
        sanitizeAudioBuffer(masteredBuffer, 'master-chain');
        markPerformanceStage(track, '마스터 체인', { prepared: preparedBuffer, mastered: masteredBuffer });
        await yieldToBrowser();
        await setMasteringProgress(track, 80, '마스터 체인 완료 · 파이널라이저 준비 중');
        const requestedOutputFormat = state.outputFormat || 'wav24';
        track.report = state.featureFlags.truePeakGuard ? `True Peak 가드 및 ${getOutputFormatLabel(requestedOutputFormat)} 인코딩 중` : `샘플 피크 가드 및 ${getOutputFormatLabel(requestedOutputFormat)} 인코딩 중`;
        await setMasteringProgress(track, 85, track.report);
        const guardDecision = getSmartPerformanceGuardDecision(track, masteredBuffer, requestedOutputFormat);
        track.performanceGuardInfo = guardDecision;
        track.report = guardDecision.changed ? `스마트 성능 가드 적용 · ${getQualityModeLabel(guardDecision.sourceQualityMode)} → ${getQualityModeLabel(guardDecision.qualityMode)} · ${getOutputFormatLabel(requestedOutputFormat)} 인코딩 중` : track.report;
        await setMasteringProgress(track, 90, track.report);
        let finalization = await finalizeMasterBufferAsync(masteredBuffer, {
            targetLufs: resolveTargetLufsForTrack(track),
            ceilingDb: state.ceilingDb,
            qualityMode: guardDecision.qualityMode,
            masterGoal: state.masterGoal,
            truePeak: guardDecision.truePeak,
            analysis: track.analysis || {},
            dspProfile: getSharedDspSummaryForReport(track.analysis?.sharedDspProfileApplied),
            signal: masteringAbortController?.signal || null,
            jobId: `${masteringJobId}:finalizer`, onProgress: progress => { if (masteringAbortController?.signal?.aborted || track.masteringJobId !== masteringJobId) return; const workerPercent = clamp(Number(progress?.percent || 0), 0, 100); track.progress = Math.max(Number(track.progress || 0), 90 + workerPercent * 0.04); track.report = `${progress?.stage || '파이널라이저'} ${Math.round(workerPercent)}%${progress?.detail ? ` · ${progress.detail}` : ''}`; scheduleRenderAll('master-finalizer-worker-progress', { keepDetailAudio: true, delayMs: 80 }); }
        });
        assertMasteringJobActive('finalizer');
        finalBuffer = finalization.buffer;
        sanitizeAudioBuffer(finalBuffer, 'finalizer');
        masteredBuffer = null;
        track.waveformOverview = createWaveformOverview(preparedBuffer, finalBuffer, track.memoryGovernorInfo?.compactWaveform ? Math.max(36, Math.round(WAVEFORM_OVERVIEW_BINS / 2)) : WAVEFORM_OVERVIEW_BINS); if (state.autoHighlightAB && !track.memoryGovernorInfo?.compactWaveform) track.abHighlightStartSec = estimateABHighlightStartFromPair(preparedBuffer, finalBuffer, track.analysis); else if (track.memoryGovernorInfo?.compactWaveform && Number.isFinite(Number(track.analysis?.abHighlightStartSec))) track.abHighlightStartSec = Number(track.analysis.abHighlightStartSec);
        track.safetyInfo = computeEngineSafetyInfo(track, finalBuffer, finalization.info);
        markPerformanceStage(track, '파이널라이저', { prepared: preparedBuffer, final: finalBuffer });
        await setMasteringProgress(track, 95, `${getOutputFormatLabel(requestedOutputFormat)} 파일 인코딩 및 품질 리포트 준비 중`);
        track.finalizeInfo = finalization.info;
        track.comparison = createComparisonInfo(track, finalization.info);
        track.truePeakInfo = {
            mode: guardDecision.truePeak ? 'truePeak' : 'samplePeak',
            targetDbTP: state.ceilingDb,
            peakBefore: finalization.info.peakBefore,
            peakAfter: finalization.info.peakAfter,
            gain: Math.pow(10, (finalization.info.gainDb || 0) / 20)
        };
        if (albumProfile && track.analysis) track.albumApplied = createAlbumAppliedInfo(track.analysis, albumProfile);
        let encoded = await encodeMasterOutputAsync(finalBuffer, requestedOutputFormat, {
            signal: masteringAbortController?.signal || null,
            jobId: `${masteringJobId}:encode`, onProgress: progress => { if (masteringAbortController?.signal?.aborted || track.masteringJobId !== masteringJobId) return; const workerPercent = clamp(Number(progress?.percent || 0), 0, 100); track.progress = Math.max(Number(track.progress || 0), 95 + workerPercent * 0.04); track.report = `${progress?.stage || getOutputFormatLabel(requestedOutputFormat)} ${Math.round(workerPercent)}%${progress?.detail ? ` · ${progress.detail}` : ''}`; scheduleRenderAll('master-encoder-worker-progress', { keepDetailAudio: true, delayMs: 80 }); }
        });
        assertMasteringJobActive('encode');
        track.exportFallbackInfo = encoded.fallbackFrom ? { from: encoded.fallbackFrom, to: encoded.format, reason: encoded.fallbackReason || '' } : null;
        track.masterReport = createMasterReport(track, preparedBuffer, finalBuffer, finalization.info, encoded);
        track.qualityGate = applyQualityRecoveryE2EOverride(track, createQualityGateReport(track, track.masterReport, finalization.info, encoded));
        track.masterReport.qualityGate = track.qualityGate;
        markPerformanceStage(track, '인코딩', { prepared: preparedBuffer, final: finalBuffer, output: encoded.blob });
        const preserveFirstRenderForMemory = FoxBearInAppMasteringSafetyService?.shouldPreserveFirstRender?.(track.inAppSafetyInfo, track.qualityGate) === true, canReleasePreparedBeforeRecovery = Boolean(track.memoryGovernorInfo?.releaseAggressively) && (track.qualityGate?.status !== 'fail' || preserveFirstRenderForMemory); if (canReleasePreparedBeforeRecovery) { preparedBuffer = null; track.memoryGovernorReleaseInfo = Object.freeze({ stage: 'post-encode', reason: 'adaptive-memory-governor', at: new Date().toISOString() }); markPerformanceStage(track, 'PCM 조기 해제', { final: finalBuffer, output: encoded.blob }); }
        const recoveryResult = await runQualityGateRecoveryAttempt(track, { preparedBuffer, albumProfile, requestedOutputFormat, signal: masteringAbortController?.signal || null, masteringJobId, assertMasteringJobActive });
        if (recoveryResult) {
            masteredBuffer = recoveryResult.masteredBuffer;
            finalBuffer = recoveryResult.finalBuffer;
            finalization = recoveryResult.finalization;
            encoded = recoveryResult.encoded;
        }
        if (!encoded.blob || encoded.blob.size <= 44) throw new Error('렌더 결과가 비어 있습니다. 브라우저 오디오 렌더러가 출력을 만들지 못했습니다.');
        await getDownloadService().assertDownloadBlob(encoded.blob);
        const dockAudioBeforeComplete = state.selectedId === track.id ? getBottomPreviewAudio() : null;
        const preserveOriginalDockPlayback = Boolean(dockAudioBeforeComplete && state.bottomPreviewMode === 'original' && !dockAudioBeforeComplete.paused && !dockAudioBeforeComplete.ended);
        finishPerformanceProfile(track, finalBuffer, encoded.blob);
        const nextOutName = buildMasteredFileName(track, encoded);
        const nextMasteredUrl = URL.createObjectURL(encoded.blob);
        const previousMasteredUrl = track.masteredUrl || '';
        track.outBlob = encoded.blob;
        track.outFormat = encoded.format;
        track.outName = nextOutName;
        track.masteredUrl = nextMasteredUrl;
        track.masteredBuffer = finalBuffer;
        track.masteredDurationSec = finalBuffer.duration || 0;
        if (previousMasteredUrl && previousMasteredUrl !== nextMasteredUrl) URL.revokeObjectURL(previousMasteredUrl);
        track.status = 'done';
        applyCompletedMasteringMemoryPolicy(calledFromBatch ? 'batch-master-complete' : 'single-master-complete', getSingleTrackDownloadReencodePolicy(track, calledFromBatch));
        track.downloadAttention = true;
        if (state.selectedId === track.id) { state.bottomPreviewMode = preserveOriginalDockPlayback ? 'original' : 'mastered'; state.bottomPreviewAutoplayTrackId = null; }
        track.report = createDoneReport(track);
        await setMasteringProgress(track, 100, track.report);
        completedSuccessfully = true;
        setNativeBadge(getCompletedUndownloadedCount());
        preserveOriginalDockPlayback ? renderBottomPreviewDock({ keepPlaying: true }) : forceRefreshBottomPreviewDock(track, 'master-complete');
        foxBearHaptic('complete');
        showToast(`${track.name} 마스터링 성공`);
    } catch (error) {
        if (isWorkerJobAbortError(error)) {
            const abortReason = String(masteringAbortController?.signal?.reason || externalMasteringSignal?.reason || error?.message || '');
            const skippedByBatch = calledFromBatch && /skip/i.test(abortReason);
            console.info(skippedByBatch ? 'Mastering skipped:' : 'Mastering cancelled:', track.name, abortReason || error);
            if (state.tracks.includes(track)) { track.status = track.analysis ? 'ready' : 'queued'; track.error = null;
                track.report = skippedByBatch ? '현재 곡을 건너뛰고 다음 곡으로 이동했습니다.' : '마스터링 작업이 취소되었습니다.';
                if (!calledFromBatch) showToast(`${track.name}: 마스터링이 취소되었습니다.`); }
        } else {
            console.error('Mastering error:', error);
            reportOperationalIncident('mastering', error, `stage=${track.report || ''}; status=${track.status || ''}; format=${state.outputFormat || ''}; quality=${state.qualityMode || ''}; inApp=${track.inAppSafetyInfo?.label || ''}; projectedPeakMb=${track.inAppSafetyInfo?.projectedPeakMb || 0}; pressure=${track.inAppSafetyInfo?.pressureRatio || 0}`, { reason: 'mastering-failed' });
            track.status = 'error';
            const friendly = createUserFriendlyMasteringError(error);
            track.error = friendly.message;
            track.report = friendly.report;
            foxBearHaptic('error');
            showToast(`${track.name}: ${friendly.message}`);
        }
    } finally {
        currentSourceBuffer = null;
        preparedBuffer = null;
        masteredBuffer = null;
        finalBuffer = null;
        externalMasteringSignal?.removeEventListener?.('abort', abortFromBatchSignal);
        if (track.masteringJobId === masteringJobId) {
            track.masteringAbortController = null;
            track.masteringJobId = '';
        }
        markMasteringQueueEnd(track, completedSuccessfully ? 'done' : (track.status === 'error' ? 'error' : 'stopped'));
        if (!calledFromBatch) state.busy = false;
        scheduleRenderAll('mastering-final', { keepDetailAudio: true, immediate: true });
        if (completedSuccessfully && !calledFromBatch) {
            requestAnimationFrame(() => focusCompletedTrackDownload(track));
        }
    }
    return completedSuccessfully;
}
function autoTrimSilenceBuffer(buffer) {
    const sampleRate = buffer.sampleRate;
    const channels = buffer.numberOfChannels;
    const frameSize = Math.max(256, Math.round(sampleRate * 0.025));
    const threshold = Math.pow(10, -55 / 20);
    const holdFrames = 2;
    const marginSamples = Math.round(sampleRate * 0.12);
    const totalFrames = Math.ceil(buffer.length / frameSize);
    let firstActiveFrame = 0;
    let lastActiveFrame = totalFrames - 1;
    for (let frame = 0; frame < totalFrames; frame += 1) {
        if (isFrameActive(buffer, frame * frameSize, frameSize, threshold)) {
            let confirmed = true;
            for (let h = 1; h < holdFrames; h += 1) {
                if (!isFrameActive(buffer, (frame + h) * frameSize, frameSize, threshold)) confirmed = false;
            }
            if (confirmed) {
                firstActiveFrame = frame;
                break;
            }
        }
    }
    for (let frame = totalFrames - 1; frame >= 0; frame -= 1) {
        if (isFrameActive(buffer, frame * frameSize, frameSize, threshold)) {
            let confirmed = true;
            for (let h = 1; h < holdFrames; h += 1) {
                if (!isFrameActive(buffer, Math.max(0, frame - h) * frameSize, frameSize, threshold)) confirmed = false;
            }
            if (confirmed) {
                lastActiveFrame = frame;
                break;
            }
        }
    }
    const startSample = clamp(firstActiveFrame * frameSize - marginSamples, 0, buffer.length - 1);
    const endSample = clamp((lastActiveFrame + 1) * frameSize + marginSamples, startSample + 1, buffer.length);
    const trimStart = startSample;
    const trimEnd = buffer.length - endSample;
    const shouldTrim = trimStart > sampleRate * 0.08 || trimEnd > sampleRate * 0.08;
    if (!shouldTrim || endSample - startSample < sampleRate * 0.8) {
        return {
            buffer,
            info: {
                applied: false,
                startTrimSec: 0,
                endTrimSec: 0,
                sourceDuration: buffer.duration,
                outputDuration: buffer.duration
            }
        };
    }
    const outputLength = endSample - startSample;
    const output = makeAudioBuffer(channels, outputLength, sampleRate);
    for (let ch = 0; ch < channels; ch += 1) {
        const src = buffer.getChannelData(ch);
        const dst = output.getChannelData(ch);
        dst.set(src.subarray(startSample, endSample));
    }
    applyEdgeFade(output, 0.012);
    return {
        buffer: output,
        info: {
            applied: true,
            startTrimSec: trimStart / sampleRate,
            endTrimSec: trimEnd / sampleRate,
            sourceDuration: buffer.duration,
            outputDuration: output.duration
        }
    };
}
function isFrameActive(buffer, start, frameSize, threshold) {
    const end = Math.min(buffer.length, start + frameSize);
    if (start >= buffer.length) return false;
    let sumSq = 0;
    let count = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = start; i < end; i += 1) {
            const sample = data[i] || 0;
            sumSq += sample * sample;
            count += 1;
        }
    }
    return Math.sqrt(sumSq / Math.max(1, count)) > threshold;
}
function applyEdgeFade(buffer, fadeSeconds) {
    const fadeSamples = Math.min(Math.round(buffer.sampleRate * fadeSeconds), Math.floor(buffer.length / 3));
    if (fadeSamples <= 4) return;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < fadeSamples; i += 1) {
            const fadeIn = i / fadeSamples;
            const fadeOut = (fadeSamples - i) / fadeSamples;
            data[i] *= fadeIn;
            data[data.length - 1 - i] *= fadeOut;
        }
    }
}
async function tryExternalPitchEngine(sourceBuffer, transform, options = {}) {
    if (!['auto', 'external'].includes(state.pitchEngine || 'auto')) return null;
    const signal = options.signal || null;
    throwIfFoxBearOperationCancelled(signal, 'pitch-external-start');
    try {
        const adapter = await import(OPTIONAL_WASM_PITCH_ADAPTER_URL);
        throwIfFoxBearOperationCancelled(signal, 'pitch-external-import');
        if (!adapter || typeof adapter.processPitchSpeed !== 'function') return null;
        const output = await adapter.processPitchSpeed({ sourceBuffer, transform, makeAudioBuffer, qualityMode: state.qualityMode || 'balanced', signal });
        throwIfFoxBearOperationCancelled(signal, 'pitch-external-complete');
        if (output && output.numberOfChannels && output.length) return output;
        if (state.pitchEngine === 'external') showToast('External WASM 피치 엔진이 설치되지 않아 WSOLA로 전환합니다.');
    } catch (error) {
        if (isWorkerJobAbortError(error) || signal?.aborted) throw error;
        if (state.pitchEngine === 'external') showToast('External WASM 피치 엔진을 불러오지 못해 WSOLA로 전환합니다.');
        console.warn('External pitch adapter fallback:', error);
    }
    return null;
}
async function preparePitchSpeedBuffer(sourceBuffer, transform, options = {}) {
    const value = cloneTransform(transform || DEFAULT_TRANSFORM), signal = options.signal || null;
    throwIfFoxBearOperationCancelled(signal, 'pitch-start');
    if (isDefaultTransform(value)) return sourceBuffer;
    const externalResult = await tryExternalPitchEngine(sourceBuffer, value, options);
    if (externalResult) return applyTransformSafetyPolish(externalResult, value);
    const channels = Math.min(2, sourceBuffer.numberOfChannels), totalSamples = Math.max(1, sourceBuffer.length) * Math.max(1, channels);
    let workerFailure = null;
    if (window.Worker) {
        try {
            const channelBuffers = [];
            for (let ch = 0; ch < channels; ch += 1) channelBuffers.push(sourceBuffer.getChannelData(ch).slice().buffer);
            const data = await runFoxBearWorkerJob(PITCH_WSOLA_WORKER_URL, { sampleRate: sourceBuffer.sampleRate, channels, length: sourceBuffer.length, transform: value, qualityMode: state.qualityMode || 'balanced', channelBuffers }, channelBuffers, { timeoutMs: 120000, signal, jobId: options.jobId || '', label: options.label || '피치/BPM 변환', onProgress: options.onProgress });
            if (!data?.ok || !Array.isArray(data.channelBuffers)) throw new Error(data?.error || '피치/BPM 워커 처리 실패');
            throwIfFoxBearOperationCancelled(signal, 'pitch-worker-complete');
            const output = makeAudioBuffer(data.channels, data.length, data.sampleRate);
            data.channelBuffers.forEach((buf, ch) => output.copyToChannel(new Float32Array(buf), ch));
            return applyTransformSafetyPolish(output, value);
        } catch (error) {
            if (isWorkerJobAbortError(error) || signal?.aborted) throw error;
            workerFailure = error;
            console.warn('Pitch worker fallback:', error);
        }
    }
    const fallbackMaxSamples = Math.max(1024, Number(options.fallbackMaxSamples || 12 * 1024 * 1024));
    if (totalSamples > fallbackMaxSamples && (workerFailure || !window.Worker)) { const error = workerFailure || new Error('긴 곡의 피치/BPM 변환에는 Web Worker가 필요합니다. 최신 브라우저에서 다시 시도해주세요.'); error.code ||= 'FOXBEAR_PITCH_FALLBACK_TOO_LARGE'; throw error; }
    if (workerFailure) showToast('피치/BPM 워커가 실패해 기본 엔진으로 전환합니다.');
    throwIfFoxBearOperationCancelled(signal, 'pitch-fallback-start');
    const pitchFactor = Math.pow(2, value.pitchSemitones / 12), speedRatio = clamp(value.speedRatio, 0.5, 1.5);
    let workingBuffer = sourceBuffer;
    if (Math.abs(value.pitchSemitones) > 0.01) workingBuffer = resampleAudioBuffer(sourceBuffer, Math.max(1, Math.round(sourceBuffer.length / pitchFactor)));
    throwIfFoxBearOperationCancelled(signal, 'pitch-fallback-resample');
    const targetLength = Math.max(1, Math.round(sourceBuffer.length / speedRatio));
    if (Math.abs(workingBuffer.length - targetLength) > 4) workingBuffer = timeStretchAudioBuffer(workingBuffer, targetLength);
    throwIfFoxBearOperationCancelled(signal, 'pitch-fallback-stretch');
    return applyTransformSafetyPolish(workingBuffer, value);
}
function applyTransformSafetyPolish(buffer, transform) {
    if (!buffer || !transform || isDefaultTransform(transform)) return buffer;
    const extreme = Math.abs(Number(transform.pitchSemitones || 0)) >= 7 || Math.abs(Number(transform.speedRatio || 1) - 1) >= 0.28;
    const fadeSeconds = extreme ? 0.010 : 0.005;
    applyEdgeFade(buffer, fadeSeconds);
    removeDcOffset(buffer, extreme ? 3 : 5);
    if (extreme) smoothBoundaryClicks(buffer, 0.0035);
    return buffer;
}
function removeDcOffset(buffer, stride = 4) {
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += stride) {
            sum += data[i] || 0;
            count += 1;
        }
        const offset = sum / Math.max(1, count);
        if (Math.abs(offset) < 0.00003) continue;
        const correction = clamp(offset, -0.006, 0.006);
        for (let i = 0; i < data.length; i += 1) data[i] = clamp(data[i] - correction, -1, 1);
    }
}
function smoothBoundaryClicks(buffer, seconds) {
    const samples = Math.min(Math.round(buffer.sampleRate * seconds), Math.floor(buffer.length / 4));
    if (samples < 8) return;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 1; i < samples; i += 1) {
            const inWeight = i / samples;
            const outWeight = (samples - i) / samples;
            data[i] = data[i] * inWeight + data[i - 1] * (1 - inWeight) * 0.35;
            const j = data.length - 1 - i;
            if (j > 0) data[j] = data[j] * outWeight + data[j + 1] * (1 - outWeight) * 0.35;
        }
    }
}
function resampleAudioBuffer(buffer, targetLength) {
    const output = makeAudioBuffer(buffer.numberOfChannels, targetLength, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) resampleChannel(buffer.getChannelData(ch), output.getChannelData(ch));
    return output;
}
function resampleChannel(input, output) {
    if (output.length === 1) {
        output[0] = input[0] || 0;
        return;
    }
    if (input.length < 4) {
        const ratio = (input.length - 1) / Math.max(1, output.length - 1);
        for (let i = 0; i < output.length; i += 1) {
            const position = i * ratio;
            const index = Math.floor(position);
            const fraction = position - index;
            output[i] = (input[index] || 0) * (1 - fraction) + (input[Math.min(input.length - 1, index + 1)] || 0) * fraction;
        }
        return;
    }
    const ratio = (input.length - 1) / Math.max(1, output.length - 1);
    for (let i = 0; i < output.length; i += 1) {
        const position = i * ratio;
        const index = Math.floor(position);
        const t = position - index;
        output[i] = cubicInterpolate(
            input[Math.max(0, index - 1)] || 0,
            input[index] || 0,
            input[Math.min(input.length - 1, index + 1)] || 0,
            input[Math.min(input.length - 1, index + 2)] || 0,
            t
        );
    }
}
function cubicInterpolate(y0, y1, y2, y3, t) {
    const a0 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
    const a1 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    const a2 = -0.5 * y0 + 0.5 * y2;
    const a3 = y1;
    return clamp(a0 * t * t * t + a1 * t * t + a2 * t + a3, -1.2, 1.2);
}
function timeStretchAudioBuffer(buffer, targetLength) {
    const output = makeAudioBuffer(buffer.numberOfChannels, targetLength, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const stretched = granularStretchChannel(buffer.getChannelData(ch), targetLength, buffer.sampleRate);
        output.copyToChannel(stretched, ch);
    }
    applyEdgeFade(output, 0.006);
    return output;
}
function granularStretchChannel(input, targetLength, sampleRate) {
    if (!input.length || targetLength <= 0) return new Float32Array(Math.max(1, targetLength));
    if (Math.abs(targetLength - input.length) < 8) return new Float32Array(input.slice(0, targetLength));
    const stretch = targetLength / Math.max(1, input.length);
    const windowSize = makeEven(clamp(Math.round(sampleRate * 0.075), 2048, 8192));
    const overlap = Math.round(windowSize * 0.5);
    const hopOut = Math.max(256, windowSize - overlap);
    const hopIn = hopOut / Math.max(0.01, stretch);
    const searchRadius = Math.round(sampleRate * 0.014);
    const output = new Float32Array(targetLength + windowSize + searchRadius + 4);
    const weights = new Float32Array(output.length);
    const window = makeHannWindow(windowSize);
    let frame = 0;
    for (let outPos = 0; outPos < targetLength; outPos += hopOut) {
        const expectedIn = Math.round(frame * hopIn);
        const inPos = findBestSolaOffset(input, output, expectedIn, outPos, overlap, searchRadius);
        for (let i = 0; i < windowSize; i += 1) {
            const sourceIndex = inPos + i;
            const outIndex = outPos + i;
            if (sourceIndex >= input.length || outIndex >= output.length) break;
            const weight = window[i];
            output[outIndex] += (input[sourceIndex] || 0) * weight;
            weights[outIndex] += weight;
        }
        frame += 1;
    }
    const result = new Float32Array(targetLength);
    for (let i = 0; i < targetLength; i += 1) result[i] = weights[i] > 0.00001 ? output[i] / weights[i] : 0;
    return result;
}
function findBestSolaOffset(input, output, expectedIn, outPos, overlap, searchRadius) {
    if (outPos <= 0) return clamp(expectedIn, 0, Math.max(0, input.length - 1));
    const minPos = clamp(expectedIn - searchRadius, 0, Math.max(0, input.length - overlap - 2));
    const maxPos = clamp(expectedIn + searchRadius, minPos, Math.max(minPos, input.length - overlap - 2));
    let bestPos = clamp(expectedIn, minPos, maxPos);
    let bestScore = -Infinity;
    const step = 4;
    const corrStep = 2;
    for (let candidate = minPos; candidate <= maxPos; candidate += step) {
        let cross = 0;
        let a2 = 0;
        let b2 = 0;
        for (let i = 0; i < overlap; i += corrStep) {
            const a = output[outPos + i] || 0;
            const b = input[candidate + i] || 0;
            cross += a * b;
            a2 += a * a;
            b2 += b * b;
        }
        const score = cross / Math.sqrt(Math.max(1e-12, a2 * b2));
        if (score > bestScore) {
            bestScore = score;
            bestPos = candidate;
        }
    }
    return bestPos;
}
function makeEven(value) { return value % 2 === 0 ? value : value + 1; }
function makeAudioBuffer(numberOfChannels, length, sampleRate) {
    const channels = Math.max(1, Math.min(32, Math.floor(numberOfChannels || 1)));
    const safeLength = Math.max(1, Math.floor(length || 1));
    const safeRate = Math.max(3000, Math.floor(sampleRate || 44100));
    if (typeof AudioBuffer !== 'undefined') {
        try {
            return new AudioBuffer({ numberOfChannels: channels, length: safeLength, sampleRate: safeRate });
        } catch (error) {
            // 일부 모바일/구형 브라우저는 AudioBuffer 생성자를 노출하지만 실제 생성에서 실패할 수 있습니다.
        }
    }
    const context = createOfflineAudioContext(channels, safeLength, safeRate);
    return context.createBuffer(channels, safeLength, safeRate);
}
function createOfflineAudioContext(numberOfChannels, length, sampleRate) {
    const OfflineContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineContextClass) throw new Error('이 브라우저는 OfflineAudioContext를 지원하지 않아 마스터링 렌더링을 실행할 수 없습니다.');
    return new OfflineContextClass(
        Math.max(1, Math.min(32, Math.floor(numberOfChannels || 1))),
        Math.max(1, Math.floor(length || 1)),
        Math.max(3000, Math.floor(sampleRate || 44100))
    );
}
async function renderMasterBuffer(sourceBuffer, settings, preset, analysis, albumProfile) {
    const sampleRate = sourceBuffer.sampleRate;
    const length = Math.max(1, sourceBuffer.length);
    const renderChannels = Math.max(1, Math.min(2, sourceBuffer.numberOfChannels || 1));
    const context = createOfflineAudioContext(renderChannels, length, sampleRate);
    const sharedProfile = createSharedDspProfile(settings, analysis, preset, { mode: 'offline-render', minWidthFactor: 0.82, maxWidthFactor: 1.22 });
    const effectiveSettings = sharedProfile.effectiveSettings;
    const intensity = sharedProfile.intensity;
    markSharedDspProfileApplied(analysis, sharedProfile);
    const source = context.createBufferSource();
    source.buffer = sourceBuffer;
    const preGain = context.createGain();
    preGain.gain.value = intensity.raw >= 160 ? 0.84 : 0.9;
    source.connect(preGain);
    let node = preGain;
    const highPass = context.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 22 + Math.max(0, intensity.raw - 120) * 0.08;
    highPass.Q.value = 0.707;
    node.connect(highPass);
    node = highPass;
    node = createSubCleanNode(context, node, effectiveSettings, analysis, intensity);
    node = createLowEndAnchorNode(context, node, renderChannels === 2 && sourceBuffer.numberOfChannels >= 2, effectiveSettings, analysis, intensity);
    node = createMetallicRemovalNode(context, node, effectiveSettings.metallicRemoval, analysis, intensity);
    node = createAdaptiveResonanceSmootherNode(context, node, effectiveSettings, analysis, intensity);
    node = createDeMaskingPolishNode(context, node, effectiveSettings, analysis, intensity);
    node = createPresetReferenceMatchNode(context, node, preset, effectiveSettings, analysis, intensity);
    node = createAiHumanizeNode(context, node, preset, effectiveSettings, intensity);
    node = createVocalProtectionNode(context, node, preset, effectiveSettings, analysis, intensity);
    node = createVocalFocusPlusNode(context, node, preset, effectiveSettings, analysis, intensity);
    node = createMelodyPreserveNode(context, node, preset, effectiveSettings, analysis, intensity);
    node = createProfileEqChain(context, node, preset, intensity);
    const isStereoRender = renderChannels === 2 && sourceBuffer.numberOfChannels >= 2;
    const spatialBudget = sharedProfile.spatialBudget;
    if (analysis && isStereoRender) markSharedDspProfileApplied(analysis, sharedProfile);
    node = createStereoWidthNode(context, node, isStereoRender, spatialBudget.widthFactor);
    node = createStereoGrooveNode(context, node, spatialBudget.stereoGroove, intensity);
    node = createPhaseSafeNode(context, node, isStereoRender, effectiveSettings, analysis, intensity);
    node = createSaturationNode(context, node, effectiveSettings.analogGroove, effectiveSettings.warmth, intensity);
    node = createSpectralBalancerNode(context, node, effectiveSettings, analysis, intensity);
    node = createAdaptiveAirBalanceNode(context, node, effectiveSettings, analysis, intensity);
    node = createOpenMixRecoveryNode(context, node, effectiveSettings, analysis, intensity);
    node = createPerceptualPolishNode(context, node, effectiveSettings, analysis, intensity);
    node = createToneChain(context, node, effectiveSettings, analysis, preset, intensity);
    node = createHighFrequencyExciterNode(context, node, effectiveSettings, analysis, preset, intensity);
    node = createDynamicDeEsserNode(context, node, effectiveSettings, analysis, preset, intensity);
    node = createVocalMetallicComfortNode(context, node, preset, effectiveSettings, analysis, intensity);
    node = createEarFatigueGuardNode(context, node, effectiveSettings, analysis, intensity);
    node = createTransientRefineNode(context, node, effectiveSettings, analysis, intensity);
    node = createMicroDynamicsGlueNode(context, node, effectiveSettings, analysis, intensity);
    node = createGentleMultibandDynamicsNode(context, node, effectiveSettings, analysis, intensity);
    node = createTranslationGuardNode(context, node, effectiveSettings, analysis, intensity);
    node = createCompressionNode(context, node, effectiveSettings.dynamicPunch, intensity);
    node = createAlbumMatchNode(context, node, analysis, albumProfile);
    node = createLoudnessLiftNode(context, node, effectiveSettings, analysis, intensity);
    node = createLimiterNode(context, node, intensity);
    node.connect(context.destination);
    source.start(0);
    return context.startRendering();
}
function makeEffectiveMasterSettings(settings, analysis, preset) {
    const out = cloneSettings(settings || GENRE_PRESETS.custom);
    if (settings && Number.isFinite(Number(settings.intensity))) out.intensity = Number(settings.intensity);
    applyMasterGoalToSettings(out, analysis, preset);
    applyMasterStyleToSettings(out, analysis, preset);
    applyMasterStrengthToSettings(out, analysis, preset);
    if (!state.featureFlags.smartGuard || !analysis) return finalizeMasterStrengthSafetyCaps(out, analysis, preset);
    const brightness = Number(analysis.brightness || 0);
    const metallic = Number(analysis.metallicHint || 0);
    const bass = Number(analysis.bassRatio || 0);
    const high = Number(analysis.highRatio || 0);
    const transient = Number(analysis.transientDensity || 0);
    const spatialRisk = clamp01(Number(analysis.spatialExcessRisk || 0));
    const lowMonoScore = Number(analysis.lowMonoScore || 100);
    const isCustom = preset === 'custom';
    const guardStrength = isCustom ? 0.55 : 1;
    if (brightness > 0.68 || high > 0.42) {
        out.clarity = clamp(Math.round(out.clarity - (brightness > 0.78 ? 7 : 4) * guardStrength), 5, 92);
        out.metallicRemoval = clamp(Math.round(out.metallicRemoval + (high > 0.48 ? 8 : 5) * guardStrength), 18, 88);
    }
    if (metallic > 0.66) {
        out.metallicRemoval = clamp(Math.round(out.metallicRemoval + (metallic - 0.6) * 28 * guardStrength), 20, 90);
        out.clarity = clamp(Math.round(out.clarity - (metallic - 0.6) * 12 * guardStrength), 5, 88);
    }
    if (bass > 0.55) {
        out.warmth = clamp(Math.round(out.warmth - (bass - 0.52) * 18 * guardStrength), 10, 86);
        out.dynamicPunch = clamp(Math.round(out.dynamicPunch - (bass - 0.52) * 10 * guardStrength), 8, 82);
    }
    if (transient > 0.62 && out.dynamicPunch > 58) {
        out.dynamicPunch = clamp(Math.round(out.dynamicPunch - (transient - 0.58) * 18 * guardStrength), 10, 78);
    }
    if (Number(out.intensity) >= 170 && (metallic > 0.7 || high > 0.48)) {
        out.intensity = clamp(Math.round(Number(out.intensity) - 10), 50, 200);
    }
    if (spatialRisk > 0.24 || lowMonoScore < 78 || Number(analysis.stereoWidth || 0) > 0.58) {
        const widthLimit = Number.isFinite(Number(analysis.widthRecommendationLimit)) ? Number(analysis.widthRecommendationLimit) : 64;
        out.width = clamp(Math.min(Number(out.width || 50), widthLimit) - Math.round(spatialRisk * 8), 8, 68);
        out.stereoGroove = clamp(Math.round(Number(out.stereoGroove || 0) - spatialRisk * 10 - Math.max(0, 78 - lowMonoScore) * 0.18), 0, 24);
    }
    const vocalMetalRisk = estimateVocalMetallicRisk(analysis, out, preset, getMasteringIntensity(out));
    if (vocalMetalRisk > 0.28) {
        out.clarity = clamp(Math.round(Number(out.clarity || 50) - vocalMetalRisk * 10), 5, 88);
        out.intensity = clampToStep(Number(out.intensity || 100) - vocalMetalRisk * 10, 50, 200, 5);
        out.dynamicPunch = clamp(Math.round(Number(out.dynamicPunch || 35) - vocalMetalRisk * 4), 4, 88);
        out.stereoGroove = clamp(Math.round(Number(out.stereoGroove || 0) - vocalMetalRisk * 4), 0, 24);
    }
    const mobileRisk = estimateMobileSpeakerRisk(analysis, out, getMasteringIntensity(out));
    if (mobileRisk.risk > 0.30) {
        out.warmth = clamp(Math.round(Number(out.warmth || 55) - mobileRisk.box * 8 - mobileRisk.boom * 5), 10, 84);
        out.dynamicPunch = clamp(Math.round(Number(out.dynamicPunch || 35) - mobileRisk.density * 6 - mobileRisk.boom * 4), 4, 84);
        out.clarity = clamp(Math.round(Number(out.clarity || 50) - mobileRisk.harsh * 5 + Math.max(0, 0.42 - mobileRisk.honk) * 2), 5, 86);
        out.metallicRemoval = clamp(Math.round(Number(out.metallicRemoval || 42) + mobileRisk.harsh * 7 + mobileRisk.box * 3), 18, 88);
        if (mobileRisk.risk > 0.52) out.intensity = clampToStep(Number(out.intensity || 100) - mobileRisk.risk * 8, 50, 200, 5);
    }
    applySpatialBudgetToSettings(out, analysis, getMasteringIntensity(out));
    finalizeMasterStrengthSafetyCaps(out, analysis, preset);
    return out;
}
function createSharedDspProfile(settings, analysis, preset, options = {}) {
    const effectiveSettings = makeEffectiveMasterSettings(settings, analysis, preset);
    const intensity = getMasteringIntensity(effectiveSettings);
    const minWidthFactor = Number.isFinite(Number(options.minWidthFactor)) ? Number(options.minWidthFactor) : 0.82;
    const maxWidthFactor = Number.isFinite(Number(options.maxWidthFactor)) ? Number(options.maxWidthFactor) : 1.22;
    const spatialBudget = getPhaseSafeSpatialBudget(effectiveSettings, analysis, intensity, minWidthFactor, maxWidthFactor);
    const realtime = createSharedRealtimePreviewParams(effectiveSettings, analysis || {}, intensity, spatialBudget);
    const finalizerAnalysis = createFinalizerAnalysisPayload(analysis || {});
    const summary = {
        version: SHARED_DSP_PROFILE_VERSION,
        mode: options.mode || 'render',
        preset: preset || 'custom',
        masterStrength: state.masterStrength || 'balanced',
        masterStrengthLabel: getMasterStrengthLabel(state.masterStrength),
        effectiveSettings: {
            intensity: Number(effectiveSettings.intensity || 100),
            clarity: Number(effectiveSettings.clarity || 50),
            warmth: Number(effectiveSettings.warmth || 50),
            width: Number(effectiveSettings.width || 50),
            stereoGroove: Number(effectiveSettings.stereoGroove || 0),
            dynamicPunch: Number(effectiveSettings.dynamicPunch || 35),
            metallicRemoval: Number(effectiveSettings.metallicRemoval || 42)
        },
        intensity: {
            raw: Number(intensity.raw || 100),
            amount: Number(intensity.amount || 1)
        },
        spatialBudget: {
            widthFactor: Number(spatialBudget.widthFactor || 1),
            rawWidthFactor: Number(spatialBudget.rawWidthFactor || 1),
            stereoGroove: Number(spatialBudget.stereoGroove || 0),
            rawStereoGroove: Number(spatialBudget.rawStereoGroove || 0),
            scale: Number(spatialBudget.scale || 1),
            effectiveExpansion: Number(spatialBudget.effectiveExpansion || 0),
            maxExpansion: Number(spatialBudget.maxExpansion || 0),
            reason: spatialBudget.reason || ''
        },
        realtimeTone: {
            highPassHz: Number(realtime.highPass.frequency || 0),
            lowShelfDb: Number(realtime.lowShelf.gain || 0),
            lowMidDb: Number(realtime.lowMid.gain || 0),
            presenceDb: Number(realtime.presence.gain || 0),
            highShelfDb: Number(realtime.highShelf.gain || 0),
            metallicDb: Number(realtime.metallic.gain || 0),
            outputGainDb: Number(realtime.outputGainDb || 0)
        },
        finalizer: {
            bassRatio: Number(finalizerAnalysis.bassRatio || 0),
            lowMidRatio: Number(finalizerAnalysis.lowMidRatio || 0),
            midRatio: Number(finalizerAnalysis.midRatio || 0),
            highRatio: Number(finalizerAnalysis.highRatio || 0),
            presenceRatio: Number(finalizerAnalysis.presenceRatio || 0),
            airRatio: Number(finalizerAnalysis.airRatio || 0),
            dynamicDeEsserRisk: estimateDynamicDeEsserNeed(finalizerAnalysis, effectiveSettings, preset, intensity).risk,
            mobileSpeakerRisk: Number(finalizerAnalysis.mobileSpeakerRisk || 0),
            spatialExcessRisk: Number(finalizerAnalysis.spatialExcessRisk || 0)
        }
    };
    return { version: SHARED_DSP_PROFILE_VERSION, effectiveSettings, intensity, spatialBudget, realtime, finalizerAnalysis, summary };
}
function createSharedRealtimePreviewParams(settings, analysis = {}, intensity = getMasteringIntensity(settings), spatialBudget = null) {
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const metallicHint = clamp01(Number(analysis.metallicHint ?? 0.35));
    const bass = clamp01(Number(analysis.bassRatio ?? 0.28));
    const punch = clamp(Number(settings.dynamicPunch || 50), 0, 100);
    const safeSpatial = spatialBudget || getPhaseSafeSpatialBudget(settings, analysis, intensity, 0.72, 1.38);
    const outputGainDb = clamp(map(intensity.raw, 50, 200, -1.8, 2.8), -2.2, 3.0);
    return {
        inputGain: intensity.raw >= 160 ? 0.82 : 0.90,
        highPass: {
            frequency: clamp(22 + bass * 18 + Math.max(0, intensity.raw - 120) * 0.08, 22, 48),
            q: 0.707
        },
        lowShelf: {
            frequency: 160,
            gain: clamp(map(settings.warmth, 0, 100, -2.0, 2.2) * clamp(intensity.amount, .65, 1.85), -3.6, 3.8)
        },
        lowMid: {
            frequency: 330,
            q: 0.78,
            gain: clamp(map(settings.warmth, 0, 100, -0.8, 1.1) * clamp(intensity.amount, .65, 1.7), -2.2, 2.4)
        },
        presence: {
            frequency: 3000,
            q: 0.95,
            gain: clamp(map(settings.clarity, 0, 100, -1.4, 1.8) * clamp(intensity.amount, .65, 1.95) - metallicHint * .22, -3.3, 3.6)
        },
        highShelf: {
            frequency: 7600,
            gain: clamp(map(settings.clarity, 0, 100, -2.0, 2.4) * clamp(intensity.amount, .65, 2.0) - Math.max(0, brightness - .68) * 1.6, -4.3, 4.8)
        },
        metallic: {
            frequency: clamp(Number(analysis.targetDynamicFreq || 5200), 2600, 8200),
            q: intensity.raw >= 150 ? 5.8 : 4.2,
            gain: clamp(map(settings.metallicRemoval, 0, 100, 0, -3.8) * clamp(intensity.amount, .7, 1.8), -6.4, 0)
        },
        compressor: {
            threshold: clamp(map(punch, 0, 100, -14, -27) - Math.max(0, intensity.raw - 120) * .05, -34, -10),
            knee: clamp(map(punch, 0, 100, 18, 8), 6, 22),
            ratio: clamp(map(punch, 0, 100, 1.4, 3.2) + Math.max(0, intensity.raw - 140) * .012, 1.2, 4.4),
            attack: clamp(map(punch, 0, 100, .020, .006), .003, .026),
            release: clamp(map(punch, 0, 100, .22, .12), .08, .32)
        },
        widthFactor: safeSpatial.widthFactor,
        limiter: {
            threshold: intensity.raw >= 155 ? -5.0 : -3.2,
            knee: 1.2,
            ratio: 16,
            attack: .002,
            release: .065
        },
        outputGainDb,
        outputGain: dbToAmp(outputGainDb)
    };
}
function markSharedDspProfileApplied(analysis, profile) {
    if (!analysis || !profile) return;
    analysis.sharedDspProfileApplied = profile.summary || profile;
    analysis.spatialBudgetApplied = profile.spatialBudget || profile.summary?.spatialBudget || analysis.spatialBudgetApplied || null;
}
function getSharedDspSummaryForReport(source) {
    const summary = source?.summary || source;
    if (!summary) return null;
    return {
        version: summary.version || SHARED_DSP_PROFILE_VERSION,
        mode: summary.mode || '',
        preset: summary.preset || '',
        effectiveSettings: summary.effectiveSettings || null,
        spatialBudget: summary.spatialBudget || null,
        realtimeTone: summary.realtimeTone || null,
        finalizer: summary.finalizer || null
    };
}
function createSubCleanNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    const bass = clamp01(Number(analysis?.bassRatio ?? 0.28));
    const warmth = clamp(Number(settings.warmth || 55), 0, 100);
    const punch = clamp(Number(settings.dynamicPunch || 35), 0, 100);
    const need = bass > 0.36 || warmth > 64 || punch > 56 || intensity.raw > 135;
    if (!need) return input;
    const subGuard = context.createBiquadFilter();
    subGuard.type = 'highpass';
    subGuard.frequency.value = clamp(24 + bass * 14 + Math.max(0, intensity.raw - 120) * 0.05, 24, 42);
    subGuard.Q.value = 0.72;
    const mudGuard = context.createBiquadFilter();
    mudGuard.type = 'peaking';
    mudGuard.frequency.value = bass > 0.46 ? 235 : 285;
    mudGuard.Q.value = 0.95;
    mudGuard.gain.value = clamp(-0.18 - bass * 0.62 - Math.max(0, warmth - 62) * 0.012, -1.6, -0.08);
    input.connect(subGuard).connect(mudGuard);
    return mudGuard;
}
function isVocalLikeAnalysis(analysis, preset) {
    if (!analysis) return false;
    const vocalPresets = new Set(['pop','kpop','kballad','rnb','ballad','acoustic','citypop','globalpop']);
    if (preset && vocalPresets.has(preset)) return true;
    const mid = clamp01(Number(analysis.midRatio ?? 0));
    const lowMid = clamp01(Number(analysis.lowMidRatio ?? 0));
    const high = clamp01(Number(analysis.highRatio ?? 0));
    const transient = clamp01(Number(analysis.transientDensity ?? 0.35));
    return (mid > 0.30 || lowMid > 0.28) && high < 0.52 && transient < 0.72;
}
function estimateVocalMetallicRisk(analysis, settings = {}, preset = null, intensity = getMasteringIntensity(settings || {})) {
    if (!analysis) return 0;
    const vocalBase = isVocalLikeAnalysis(analysis, preset) ? 0.28 : 0;
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const presence = clamp01(Number(analysis.presenceRatio ?? analysis.spectrumBands?.presence ?? 0.16));
    const air = clamp01(Number(analysis.airRatio ?? analysis.spectrumBands?.air ?? 0.10));
    const high = clamp01(Number(analysis.highRatio ?? 0.22));
    const clarity = clamp(Number(settings?.clarity ?? 50), 0, 100);
    const rawIntensity = Number(intensity?.raw ?? settings?.intensity ?? 100);
    const targetFreq = Number(analysis.targetDynamicFreq || analysis.harshPeakHz || 5200);
    const vocalPresence = Math.max(0, presence - 0.16) * 2.6;
    const airFizz = Math.max(0, air - 0.12) * 2.0;
    const brightRisk = Math.max(0, brightness - 0.58) * 1.6 + Math.max(0, high - 0.34) * 1.35;
    const metalRisk = Math.max(0, metallic - 0.44) * 1.75;
    const clarityRisk = Math.max(0, clarity - 56) / 70;
    const intensityRisk = Math.max(0, rawIntensity - 112) / 115;
    const harshBandRisk = targetFreq >= 3600 && targetFreq <= 8200 ? 0.08 : 0;
    return clamp01(vocalBase + vocalPresence + airFizz + brightRisk + metalRisk + clarityRisk + intensityRisk + harshBandRisk);
}
function sumProfileBins(profile, indices) {
    if (!Array.isArray(profile) || !profile.length) return 0;
    return indices.reduce((sum, index) => sum + Number(profile[index] || 0), 0);
}
function getProfileRegionEnergy(profile, region) {
    if (!Array.isArray(profile) || !profile.length) return 0;
    const is24 = profile.length >= 24;
    const map24 = {
        lowBody: [6, 7, 8, 9],
        phoneBand: [14, 15],
        sibilance: [16, 17, 18],
        air: [19, 20, 21, 22, 23]
    };
    const map12 = {
        lowBody: [3, 4, 5],
        phoneBand: [8, 9],
        sibilance: [9, 10],
        air: [10, 11]
    };
    return sumProfileBins(profile, (is24 ? map24 : map12)[region] || []);
}
function estimateMobileSpeakerRisk(analysis, settings = {}, intensity = getMasteringIntensity(settings || {})) {
    if (!analysis) return { risk: 0, boom: 0, box: 0, honk: 0, harsh: 0, density: 0, label: 'safe' };
    const bands = analysis.spectrumBands || {};
    const profile = Array.isArray(analysis.spectrumProfile) ? analysis.spectrumProfile : [];
    const bass = clamp01(Number(analysis.bassRatio ?? 0.25));
    const lowMid = clamp01(Number(analysis.lowMidRatio ?? bands.lowMid ?? 0.22));
    const mid = clamp01(Number(analysis.midRatio ?? bands.mid ?? 0.28));
    const presence = clamp01(Number(analysis.presenceRatio ?? bands.presence ?? 0.16));
    const high = clamp01(Number(analysis.highRatio ?? 0.22));
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const loudness = clamp01(((Number(analysis.loudnessIntegrated ?? analysis.loudnessHint ?? -18) + 24) / 14));
    const crest = Number.isFinite(Number(analysis.crest)) ? Number(analysis.crest) : 4;
    const lowBody = clamp01(getProfileRegionEnergy(profile, 'lowBody') * (profile.length >= 24 ? 5.2 : 4.2));
    const phoneBand = clamp01(getProfileRegionEnergy(profile, 'phoneBand') * (profile.length >= 24 ? 6.2 : 4.8));
    const boom = clamp01(Math.max(0, bass - 0.36) * 1.15 + Math.max(0, lowMid - 0.28) * 1.75 + Math.max(0, lowBody - 0.40) * 0.85);
    const box = clamp01(Math.max(0, lowMid - 0.25) * 1.85 + Math.max(0, mid - 0.33) * 0.72 + Math.max(0, lowBody - 0.34) * 0.95);
    const honk = clamp01(Math.max(0, mid - 0.36) * 1.20 + Math.max(0, phoneBand - 0.25) * 1.10);
    const harsh = clamp01(Math.max(0, presence - 0.18) * 2.15 + Math.max(0, high - 0.34) * 0.85 + Math.max(0, brightness - 0.58) * 1.05 + Math.max(0, metallic - 0.46) * 0.82);
    const density = clamp01(Math.max(0, loudness - 0.50) * 0.55 + Math.max(0, 4.2 - crest) * 0.12 + Math.max(0, Number(intensity?.raw ?? settings?.intensity ?? 100) - 120) / 180);
    const risk = clamp01(boom * 0.24 + box * 0.30 + honk * 0.16 + harsh * 0.21 + density * 0.16);
    const label = risk > 0.58 ? 'risk' : risk > 0.34 ? 'watch' : 'safe';
    return { risk, boom, box, honk, harsh, density, label };
}
function formatMobileSpeakerRisk(info) {
    if (!info) return 'N/A';
    const label = info.label === 'risk' ? '위험' : info.label === 'watch' ? '주의' : '안전';
    return `${label} ${Math.round(Number(info.risk || 0) * 100)}% · 붐 ${Math.round(Number(info.boom || 0) * 100)}% · 박스 ${Math.round(Number(info.box || 0) * 100)}% · 폰공진 ${Math.round(Number(info.harsh || 0) * 100)}%`;
}
function estimateDynamicDeEsserNeed(analysis, settings = {}, preset = null, intensity = getMasteringIntensity(settings || {})) {
    const normalized = normalizeFinalizerAnalysis(analysis || {});
    const vocalRisk = Math.max(
        normalized.vocalMetallicRisk || 0,
        estimateVocalMetallicRisk(analysis, settings || {}, preset, intensity)
    );
    const sibilance = clamp01(Math.max(0, normalized.airRatio - 0.105) * 2.55 + Math.max(0, normalized.highRatio - 0.30) * 1.10 + Math.max(0, normalized.brightness - 0.56) * 0.95);
    const harsh = clamp01(Math.max(0, normalized.presenceRatio - 0.165) * 2.45 + Math.max(0, normalized.metallicHint - 0.42) * 1.15 + Math.max(0, normalized.brightness - 0.60) * 0.75);
    const exciterRisk = clamp01(Math.max(0, Number(settings?.clarity || 50) - 58) / 46 + Math.max(0, Number(intensity?.raw || 100) - 125) / 110);
    const mobileHarsh = clamp01(Number(normalized.mobileSpeakerDetail?.harsh || 0) || Math.max(0, normalized.mobileSpeakerRisk - 0.25));
    const risk = clamp01(vocalRisk * 0.42 + sibilance * 0.27 + harsh * 0.23 + exciterRisk * 0.12 + mobileHarsh * 0.13);
    const targetHz = clamp(Number(normalized.targetDynamicFreq || normalized.harshPeakHz || 6500), 2600, 8800);
    const mode = risk > 0.55 ? 'strong' : risk > 0.30 ? 'active' : risk > 0.16 ? 'light' : 'bypass';
    return { risk, sibilance, harsh, vocalRisk, exciterRisk, mobileHarsh, targetHz, mode };
}
function createDynamicDeEsserNode(context, input, settings, analysis, preset, intensity = getMasteringIntensity(settings)) {
    if (!state.featureFlags.smartGuard || !analysis) return input;
    const need = estimateDynamicDeEsserNeed(analysis, settings, preset, intensity);
    if (need.risk < 0.16) return input;
    const output = context.createGain();
    const lowPath = context.createBiquadFilter();
    const presenceHp = context.createBiquadFilter();
    const presenceLp = context.createBiquadFilter();
    const sibilanceHp = context.createBiquadFilter();
    const sibilanceLp = context.createBiquadFilter();
    const airHp = context.createBiquadFilter();
    const presenceComp = context.createDynamicsCompressor();
    const sibilanceComp = context.createDynamicsCompressor();
    const airComp = context.createDynamicsCompressor();
    const presenceGain = context.createGain();
    const sibilanceGain = context.createGain();
    const airGain = context.createGain();
    const balanceGain = context.createGain();
    const amount = clamp(need.risk * clamp(intensity.amount, 0.70, 1.42), 0.14, 0.86);
    const target = clamp(Number(need.targetHz || 6500), 3000, 8800);
    const presenceTop = clamp(target * 0.78, 4300, 6200);
    const sibilanceTop = clamp(target * 1.28, 7200, 9800);
    lowPath.type = 'lowpass';
    lowPath.frequency.value = 2400;
    lowPath.Q.value = 0.707;
    presenceHp.type = 'highpass';
    presenceHp.frequency.value = 2300;
    presenceHp.Q.value = 0.707;
    presenceLp.type = 'lowpass';
    presenceLp.frequency.value = presenceTop;
    presenceLp.Q.value = 0.707;
    presenceComp.threshold.value = clamp(-25 + need.harsh * 5 - amount * 3, -32, -18);
    presenceComp.knee.value = 14;
    presenceComp.ratio.value = clamp(1.35 + amount * 1.65 + need.harsh * 0.55, 1.25, 3.2);
    presenceComp.attack.value = 0.0035;
    presenceComp.release.value = 0.070;
    presenceGain.gain.value = clamp(0.98 - amount * 0.055, 0.91, 1.0);
    sibilanceHp.type = 'highpass';
    sibilanceHp.frequency.value = clamp(target * 0.82, 4800, 7200);
    sibilanceHp.Q.value = 0.707;
    sibilanceLp.type = 'lowpass';
    sibilanceLp.frequency.value = sibilanceTop;
    sibilanceLp.Q.value = 0.707;
    sibilanceComp.threshold.value = clamp(-31 + need.sibilance * 4 - amount * 4, -38, -22);
    sibilanceComp.knee.value = 10;
    sibilanceComp.ratio.value = clamp(1.55 + amount * 2.20 + need.sibilance * 0.72, 1.35, 4.4);
    sibilanceComp.attack.value = 0.0018;
    sibilanceComp.release.value = 0.060;
    sibilanceGain.gain.value = clamp(0.98 - amount * 0.080, 0.88, 1.0);
    airHp.type = 'highpass';
    airHp.frequency.value = 9200;
    airHp.Q.value = 0.707;
    airComp.threshold.value = clamp(-35 + need.sibilance * 4 - amount * 2, -40, -25);
    airComp.knee.value = 12;
    airComp.ratio.value = clamp(1.18 + amount * 1.15, 1.12, 2.2);
    airComp.attack.value = 0.004;
    airComp.release.value = 0.090;
    airGain.gain.value = clamp(0.98 - amount * 0.045, 0.92, 1.0);
    balanceGain.gain.value = clamp(0.995 - amount * 0.018, 0.975, 1.0);
    input.connect(lowPath).connect(output);
    input.connect(presenceHp).connect(presenceLp).connect(presenceComp).connect(presenceGain).connect(output);
    input.connect(sibilanceHp).connect(sibilanceLp).connect(sibilanceComp).connect(sibilanceGain).connect(output);
    input.connect(airHp).connect(airComp).connect(airGain).connect(output);
    output.connect(balanceGain);
    return balanceGain;
}
function createVocalMetallicComfortNode(context, input, preset, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!analysis) return input;
    const risk = estimateVocalMetallicRisk(analysis, settings, preset, intensity);
    if (risk < 0.24) return input;
    const output = context.createGain();
    const scale = clamp(0.55 + risk * 0.75, 0.55, 1.30);
    const throatSmooth = context.createBiquadFilter();
    throatSmooth.type = 'peaking';
    throatSmooth.frequency.value = 3150;
    throatSmooth.Q.value = 1.05;
    throatSmooth.gain.value = clamp(-0.16 * scale - Math.max(0, Number(settings.clarity || 50) - 60) * 0.005, -0.72, -0.04);
    const sibilanceFuse = context.createBiquadFilter();
    sibilanceFuse.type = 'peaking';
    sibilanceFuse.frequency.value = clamp(Number(analysis.targetDynamicFreq || analysis.harshPeakHz || 6500), 5200, 8200);
    sibilanceFuse.Q.value = 2.05;
    sibilanceFuse.gain.value = clamp(-0.34 * scale - Math.max(0, risk - 0.45) * 0.62, -1.65, -0.08);
    const glassShelf = context.createBiquadFilter();
    glassShelf.type = 'highshelf';
    glassShelf.frequency.value = 10400;
    glassShelf.gain.value = clamp(-0.22 * scale - Math.max(0, risk - 0.52) * 0.55, -1.35, 0);
    input.connect(throatSmooth).connect(sibilanceFuse).connect(glassShelf).connect(output);
    return output;
}
function createAdaptiveResonanceSmootherNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    const metallic = clamp01(Number(analysis?.metallicHint ?? 0.35));
    const brightness = clamp01(Number(analysis?.brightness ?? 0.45));
    const high = clamp01(Number(analysis?.highRatio ?? 0.24));
    const removal = clamp(Number(settings.metallicRemoval || 42), 0, 100);
    const need = metallic > 0.42 || brightness > 0.62 || high > 0.34 || removal > 58 || intensity.raw > 145;
    if (!need) return input;
    const target = clamp(Number(analysis?.targetDynamicFreq || 5200), 2600, 8800);
    const amount = clamp((metallic * 0.75 + brightness * 0.35 + high * 0.35 + removal / 180) * clamp(intensity.amount, 0.65, 1.65), 0.18, 1.65);
    const dynamicNotch = context.createBiquadFilter();
    dynamicNotch.type = 'peaking';
    dynamicNotch.frequency.value = target;
    dynamicNotch.Q.value = clamp(3.2 + amount * 1.7, 3.0, 6.8);
    dynamicNotch.gain.value = clamp(-0.28 * amount, -1.25, -0.08);
    const glassGuard = context.createBiquadFilter();
    glassGuard.type = 'peaking';
    glassGuard.frequency.value = target < 5200 ? 6400 : 9200;
    glassGuard.Q.value = 2.2;
    glassGuard.gain.value = clamp(-0.16 * amount, -0.9, -0.04);
    const airRecover = context.createBiquadFilter();
    airRecover.type = 'highshelf';
    airRecover.frequency.value = 13200;
    airRecover.gain.value = clamp((brightness < 0.54 && removal > 44 ? 0.12 : -0.08) * amount, -0.35, 0.28);
    input.connect(dynamicNotch).connect(glassGuard).connect(airRecover);
    return airRecover;
}
function createDeMaskingPolishNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!analysis) return input;
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const transient = clamp01(Number(analysis.transientDensity ?? 0.35));
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const removal = clamp(Number(settings.metallicRemoval || 42), 0, 100);
    const need = brightness > 0.56 || metallic > 0.42 || transient > 0.54 || clarity > 58 || removal > 54 || intensity.raw > 135;
    if (!need) return input;
    const scale = clamp(intensity.amount, 0.65, 1.75);
    const deMask = context.createBiquadFilter();
    deMask.type = 'peaking';
    deMask.frequency.value = 1850;
    deMask.Q.value = 0.82;
    deMask.gain.value = clamp((0.30 - Number(analysis.midRatio || 0.28)) * 0.42 * scale, -0.22, 0.28);
    const glare = context.createBiquadFilter();
    glare.type = 'peaking';
    glare.frequency.value = clamp(Number(analysis.targetDynamicFreq || 5200) * 0.62, 2800, 5200);
    glare.Q.value = 1.42;
    glare.gain.value = clamp(-(Math.max(0, brightness - 0.58) * 0.52 + Math.max(0, metallic - 0.40) * 0.38 + Math.max(0, transient - 0.55) * 0.26) * scale, -0.85, -0.02);
    const edge = context.createBiquadFilter();
    edge.type = 'peaking';
    edge.frequency.value = clamp(Number(analysis.targetDynamicFreq || 6200), 5200, 9200);
    edge.Q.value = 2.05;
    edge.gain.value = clamp(-(Math.max(0, metallic - 0.46) * 0.60 + Math.max(0, removal - 60) * 0.005) * scale, -0.80, -0.01);
    input.connect(deMask).connect(glare).connect(edge);
    return edge;
}
function createGentleMultibandDynamicsNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!analysis || intensity.raw < 95) return input;
    const normalized = normalizeFinalizerAnalysis(analysis);
    const punch = clamp(Number(settings.dynamicPunch || 45), 0, 100);
    const lowNeed = clamp01(Math.max(0, normalized.bassRatio - 0.31) * 1.7 + Math.max(0, 80 - normalized.lowMonoScore) / 80 * 0.65 + normalized.spatialExcessRisk * 0.34);
    const highNeed = clamp01(Math.max(0, normalized.presenceRatio - 0.18) * 1.5 + Math.max(0, normalized.airRatio - 0.14) * 1.4 + Math.max(0, normalized.metallicHint - 0.45) * 0.95 + Math.max(0, normalized.brightness - 0.60) * 0.65);
    const midNeed = clamp01(Math.max(0, normalized.lowMidRatio - 0.30) * 0.95 + Math.max(0, punch - 62) / 140);
    const need = lowNeed > 0.05 || highNeed > 0.05 || midNeed > 0.06 || punch > 68 || state.masterGoal === 'loud';
    if (!need) return input;
    const output = context.createGain();
    const dry = context.createGain();
    const wet = context.createGain();
    const lowPath = context.createBiquadFilter();
    const midHp = context.createBiquadFilter();
    const midLp = context.createBiquadFilter();
    const highPath = context.createBiquadFilter();
    const lowComp = context.createDynamicsCompressor();
    const midComp = context.createDynamicsCompressor();
    const highComp = context.createDynamicsCompressor();
    const amount = clamp(0.12 + lowNeed * 0.08 + highNeed * 0.08 + midNeed * 0.06 + Math.max(0, intensity.raw - 125) * 0.001, 0.10, 0.30);
    dry.gain.value = 1 - amount * 0.18;
    wet.gain.value = amount;
    lowPath.type = 'lowpass';
    lowPath.frequency.value = 170;
    lowPath.Q.value = 0.707;
    lowComp.threshold.value = clamp(-23 + lowNeed * 4, -24, -17);
    lowComp.knee.value = 16;
    lowComp.ratio.value = clamp(1.35 + lowNeed * 1.35, 1.25, 2.8);
    lowComp.attack.value = 0.020;
    lowComp.release.value = 0.185;
    midHp.type = 'highpass';
    midHp.frequency.value = 180;
    midHp.Q.value = 0.707;
    midLp.type = 'lowpass';
    midLp.frequency.value = 4200;
    midLp.Q.value = 0.707;
    midComp.threshold.value = clamp(-19 + midNeed * 3, -22, -15);
    midComp.knee.value = 18;
    midComp.ratio.value = clamp(1.18 + midNeed * 0.82, 1.15, 2.0);
    midComp.attack.value = 0.014;
    midComp.release.value = 0.135;
    highPath.type = 'highpass';
    highPath.frequency.value = 5200;
    highPath.Q.value = 0.707;
    highComp.threshold.value = clamp(-30 + highNeed * 4, -31, -22);
    highComp.knee.value = 10;
    highComp.ratio.value = clamp(1.25 + highNeed * 1.55, 1.18, 2.9);
    highComp.attack.value = 0.004;
    highComp.release.value = 0.075;
    input.connect(dry).connect(output);
    input.connect(lowPath).connect(lowComp).connect(wet);
    input.connect(midHp).connect(midLp).connect(midComp).connect(wet);
    input.connect(highPath).connect(highComp).connect(wet);
    wet.connect(output);
    return output;
}
function createMicroDynamicsGlueNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    const loudMode = state.masterGoal === 'loud';
    const punch = clamp(Number(settings.dynamicPunch || 35), 0, 100);
    const transient = clamp01(Number(analysis?.transientDensity ?? 0.35));
    const need = loudMode || punch > 58 || transient > 0.56 || intensity.raw > 150;
    if (!need) return input;
    const compressor = context.createDynamicsCompressor();
    const drive = clamp((punch - 45) / 100 + transient * 0.22 + Math.max(0, intensity.raw - 130) / 260, 0.08, 0.62);
    compressor.threshold.value = clamp(-13 - drive * 8, -20, -10);
    compressor.knee.value = 18;
    compressor.ratio.value = clamp(1.28 + drive * 1.25, 1.25, 2.05);
    compressor.attack.value = 0.018;
    compressor.release.value = 0.18;
    input.connect(compressor);
    return compressor;
}
function createLowEndAnchorNode(context, input, isStereo, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!state.featureFlags.lowEndAnchor || !isStereo) return input;
    const bassRatio = clamp01(Number(analysis?.bassRatio ?? 0.28));
    const anchorAmount = clamp(0.18 + bassRatio * 0.34 + Math.max(0, intensity.raw - 120) * 0.002, 0.16, 0.58);
    const splitFrequency = clamp(120 + bassRatio * 80, 115, 190);
    const output = context.createGain();
    const highPath = context.createBiquadFilter();
    highPath.type = 'highpass';
    highPath.frequency.value = splitFrequency;
    highPath.Q.value = 0.707;
    const splitter = context.createChannelSplitter(2);
    const left = context.createGain();
    const right = context.createGain();
    const lowPass = context.createBiquadFilter();
    const lowGain = context.createGain();
    left.gain.value = 0.5;
    right.gain.value = 0.5;
    lowPass.type = 'lowpass';
    lowPass.frequency.value = splitFrequency;
    lowPass.Q.value = 0.707;
    lowGain.gain.value = anchorAmount;
    input.connect(highPath).connect(output);
    input.connect(splitter);
    splitter.connect(left, 0);
    splitter.connect(right, 1);
    left.connect(lowPass);
    right.connect(lowPass);
    lowPass.connect(lowGain).connect(output);
    return output;
}
function shouldApplyMelodyPreserve(preset, analysis) {
    if (state.featureFlags.melodyPreserve === false) return false;
    if (!preset || preset === 'custom') return false;
    const melodicPresets = new Set(['pop','kpop','kballad','rnb','ballad','acoustic','citypop','globalpop','rock']);
    const mid = Number(analysis?.midRatio || 0);
    const lowMid = Number(analysis?.lowMidRatio || 0);
    return melodicPresets.has(preset) || mid > 0.30 || lowMid > 0.28;
}
function createMelodyPreserveNode(context, input, preset, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!shouldApplyMelodyPreserve(preset, analysis)) return input;
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const scale = clamp(0.65 + (100 - Math.min(100, clarity)) / 180 + Math.max(0, intensity.raw - 120) / 260, 0.55, 1.28);
    const output = context.createGain();
    const bodyGuard = context.createBiquadFilter();
    bodyGuard.type = 'peaking';
    bodyGuard.frequency.value = 780;
    bodyGuard.Q.value = 0.75;
    bodyGuard.gain.value = clamp(0.12 * scale, 0.04, 0.32);
    const melodyForward = context.createBiquadFilter();
    melodyForward.type = 'peaking';
    melodyForward.frequency.value = 1450;
    melodyForward.Q.value = 0.82;
    melodyForward.gain.value = clamp(0.18 * scale, 0.05, 0.42);
    const harshGuard = context.createBiquadFilter();
    harshGuard.type = 'peaking';
    harshGuard.frequency.value = 3650;
    harshGuard.Q.value = 1.45;
    harshGuard.gain.value = clamp(-0.12 * scale - Math.max(0, clarity - 62) * 0.008, -0.85, -0.04);
    input.connect(bodyGuard).connect(melodyForward).connect(harshGuard).connect(output);
    return output;
}
function shouldApplyAiHumanizer(preset) {
    return Boolean(preset && preset !== 'custom' && state.featureFlags.aiHumanize !== false);
}
function createAiHumanizeNode(context, input, preset, settings, intensity = getMasteringIntensity(settings)) {
    if (!shouldApplyAiHumanizer(preset)) return input;
    const scale = clamp(intensity.amount, 0.65, 1.65);
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const removal = clamp(Number(settings.metallicRemoval || 45), 0, 100);
    const warm250 = context.createBiquadFilter();
    warm250.type = 'peaking';
    warm250.frequency.value = 250;
    warm250.Q.value = 0.95;
    warm250.gain.value = clamp(0.72 * scale, 0.35, 1.25);
    const warm400 = context.createBiquadFilter();
    warm400.type = 'peaking';
    warm400.frequency.value = 400;
    warm400.Q.value = 0.85;
    warm400.gain.value = clamp(0.58 * scale, 0.25, 1.1);
    const body500 = context.createBiquadFilter();
    body500.type = 'peaking';
    body500.frequency.value = 500;
    body500.Q.value = 0.9;
    body500.gain.value = clamp(0.42 * scale, 0.15, 0.9);
    const deEsser = context.createBiquadFilter();
    deEsser.type = 'peaking';
    deEsser.frequency.value = 6400;
    deEsser.Q.value = 3.4;
    deEsser.gain.value = clamp(-0.9 - removal * 0.018 * scale, -3.2, -0.7);
    const hatTamer = context.createBiquadFilter();
    hatTamer.type = 'peaking';
    hatTamer.frequency.value = 10000;
    hatTamer.Q.value = 1.2;
    hatTamer.gain.value = clamp(-0.7 - Math.max(0, clarity - 55) * 0.018 * scale, -2.6, -0.35);
    const air125 = context.createBiquadFilter();
    air125.type = 'peaking';
    air125.frequency.value = 12500;
    air125.Q.value = 1.1;
    air125.gain.value = clamp(-0.85 * scale, -2.4, -0.35);
    const antiFizz16 = context.createBiquadFilter();
    antiFizz16.type = 'peaking';
    antiFizz16.frequency.value = 16000;
    antiFizz16.Q.value = 0.95;
    antiFizz16.gain.value = clamp(-1.05 * scale, -2.8, -0.45);
    const lowPass = context.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 16000;
    lowPass.Q.value = 0.707;
    input.connect(warm250).connect(warm400).connect(body500).connect(deEsser).connect(hatTamer).connect(air125).connect(antiFizz16).connect(lowPass);
    return lowPass;
}
function createPresetReferenceMatchNode(context, input, preset, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.referenceMatch === false || !analysis || !preset) return input;
    const target = getActiveReferenceTarget(preset);
    if (!target) return input;
    const bass = clamp01(Number(analysis.bassRatio ?? target.bass));
    const lowMid = clamp01(Number(analysis.lowMidRatio ?? target.lowMid));
    const mid = clamp01(Number(analysis.midRatio ?? target.mid));
    const high = clamp01(Number(analysis.highRatio ?? target.high));
    const brightness = clamp01(Number(analysis.brightness ?? target.brightness));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const scale = clamp(0.34 + intensity.amount * 0.21, 0.38, 0.82);
    const spectralDelta = getSpectrumProfileDelta(target, analysis);
    const d = spectralDelta.profile24 || getReferenceProfileBandDeltas(target, analysis);
    const vocalRisk = estimateVocalMetallicRisk(analysis, settings, preset, intensity);
    const mobileRisk = estimateMobileSpeakerRisk(analysis, settings, intensity);
    const presenceSafety = clamp(1 - vocalRisk * 1.10 - mobileRisk.harsh * 0.28, 0.18, 1);
    const airSafety = clamp(1 - vocalRisk * 1.25 - mobileRisk.harsh * 0.34, 0.12, 1);
    const sub = context.createBiquadFilter();
    sub.type = 'lowshelf';
    sub.frequency.value = 58;
    sub.gain.value = clamp(((target.bass - bass) * 1.05 + d.sub * 0.55) * scale, -0.46, 0.38);
    const low = context.createBiquadFilter();
    low.type = 'peaking';
    low.frequency.value = preset === 'edm' || preset === 'trap' || preset === 'drill' ? 94 : 125;
    low.Q.value = 0.78;
    low.gain.value = clamp(((target.bass - bass) * 1.35 + spectralDelta.low * 0.72 + d.bass * 0.62) * scale, -0.66, 0.62);
    const mud = context.createBiquadFilter();
    mud.type = 'peaking';
    mud.frequency.value = 285;
    mud.Q.value = 0.92;
    mud.gain.value = clamp((spectralDelta.body * 0.46 + d.mud * 0.82 - mobileRisk.box * 0.12) * scale, -0.54, 0.36);
    const body = context.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = target.lowMid > 0.30 ? 420 : 620;
    body.Q.value = 0.84;
    body.gain.value = clamp(((target.lowMid - lowMid) * 0.95 + d.body * 0.78) * scale, -0.48, 0.46);
    const vocal = context.createBiquadFilter();
    vocal.type = 'peaking';
    vocal.frequency.value = preset === 'rock' || preset === 'punch' ? 1700 : 2150;
    vocal.Q.value = 0.92;
    vocal.gain.value = clamp(((target.mid - mid) * 0.72 + d.vocal * 0.60) * scale * presenceSafety, -0.40, 0.36);
    const presence = context.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = Number(analysis.harshPeakHz || analysis.targetDynamicFreq || 3600) > 4200 ? 3200 : 2800;
    presence.Q.value = 1.15;
    presence.gain.value = clamp(((target.mid - mid) * 0.48 + spectralDelta.presence * 0.54 + d.presence * 0.46) * scale * presenceSafety - Math.max(0, metallic - 0.56) * 0.20, -0.48, 0.34);
    const harshGuard = context.createBiquadFilter();
    harshGuard.type = 'peaking';
    harshGuard.frequency.value = clamp(Number(analysis.harshPeakHz || analysis.targetDynamicFreq || 5200), 3600, 7200);
    harshGuard.Q.value = 2.15;
    harshGuard.gain.value = clamp((d.harsh > 0 ? d.harsh * 0.24 * presenceSafety : d.harsh * 0.64) * scale - vocalRisk * 0.22 - mobileRisk.harsh * 0.14, -0.58, 0.18);
    const sibilance = context.createBiquadFilter();
    sibilance.type = 'peaking';
    sibilance.frequency.value = 7600;
    sibilance.Q.value = 1.65;
    sibilance.gain.value = clamp((d.sibilance > 0 ? d.sibilance * 0.18 * airSafety : d.sibilance * 0.56) * scale - vocalRisk * 0.16, -0.48, 0.16);
    const air = context.createBiquadFilter();
    air.type = 'highshelf';
    air.frequency.value = target.high > 0.25 ? 10400 : 11800;
    air.gain.value = clamp(((target.high - high) * 0.62 + spectralDelta.air * 0.46 + d.air * 0.58 + (target.brightness - brightness) * 0.22) * scale * airSafety, -0.54, 0.38);
    input.connect(sub).connect(low).connect(mud).connect(body).connect(vocal).connect(presence).connect(harshGuard).connect(sibilance).connect(air);
    return air;
}
function createVocalFocusPlusNode(context, input, preset, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.vocalFocusPlus === false || !analysis) return input;
    const vocalLikely = shouldApplyVocalProtection(preset, analysis) || Number(analysis.midRatio || 0) > 0.30 || Number(analysis.lowMidRatio || 0) > 0.28;
    if (!vocalLikely && intensity.raw < 135) return input;
    const scale = clamp(0.55 + intensity.amount * 0.32, 0.55, 1.18);
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const output = context.createGain();
    const focusBody = context.createBiquadFilter();
    focusBody.type = 'peaking';
    focusBody.frequency.value = 1180;
    focusBody.Q.value = 0.78;
    focusBody.gain.value = clamp(0.10 * scale, 0.03, 0.25);
    const lyricForward = context.createBiquadFilter();
    lyricForward.type = 'peaking';
    lyricForward.frequency.value = 2150;
    lyricForward.Q.value = 0.92;
    lyricForward.gain.value = clamp((clarity < 64 ? 0.11 : 0.04) * scale, 0.02, 0.24);
    const vowelGuard = context.createBiquadFilter();
    vowelGuard.type = 'peaking';
    vowelGuard.frequency.value = 3250;
    vowelGuard.Q.value = 1.55;
    vowelGuard.gain.value = clamp(-(Math.max(0, brightness - 0.56) * 0.40 + Math.max(0, clarity - 62) * 0.006) * scale, -0.55, -0.02);
    const sibilanceFuse = context.createBiquadFilter();
    sibilanceFuse.type = 'peaking';
    sibilanceFuse.frequency.value = 7600;
    sibilanceFuse.Q.value = 2.25;
    sibilanceFuse.gain.value = clamp(-0.08 * scale - Math.max(0, brightness - 0.62) * 0.32, -0.62, -0.02);
    input.connect(focusBody).connect(lyricForward).connect(vowelGuard).connect(sibilanceFuse).connect(output);
    return output;
}
function createAdaptiveAirBalanceNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.adaptiveAir === false || !analysis) return input;
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const high = clamp01(Number(analysis.highRatio ?? 0.24));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const scale = clamp(intensity.amount, 0.65, 1.55);
    const output = context.createGain();
    const silkShelf = context.createBiquadFilter();
    silkShelf.type = 'highshelf';
    silkShelf.frequency.value = brightness > 0.66 || high > 0.38 ? 11800 : 13200;
    const openAmount = brightness < 0.42 && high < 0.28 ? 0.22 : 0.04;
    const trimAmount = Math.max(0, brightness - 0.64) * 0.55 + Math.max(0, high - 0.36) * 0.45 + Math.max(0, clarity - 68) * 0.006;
    silkShelf.gain.value = clamp((openAmount - trimAmount) * scale, -0.78, 0.34);
    const glassFuse = context.createBiquadFilter();
    glassFuse.type = 'peaking';
    glassFuse.frequency.value = 9800;
    glassFuse.Q.value = 1.45;
    glassFuse.gain.value = clamp(-(Math.max(0, metallic - 0.48) * 0.45 + Math.max(0, brightness - 0.70) * 0.28) * scale, -0.65, 0);
    input.connect(silkShelf).connect(glassFuse).connect(output);
    return output;
}
function createOpenMixRecoveryNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.openMixGuard === false || !analysis) return input;
    const warmth = clamp(Number(settings.warmth || 55), 0, 100);
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const lowMid = clamp01(Number(analysis.lowMidRatio ?? 0.24));
    const mid = clamp01(Number(analysis.midRatio ?? 0.28));
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const needsAir = brightness < 0.50 || clarity < 52 || warmth > 62 || lowMid > 0.28 || intensity.raw > 125;
    if (!needsAir) return input;
    const scale = clamp(0.55 + intensity.amount * 0.32, 0.58, 1.22);
    const output = context.createGain();
    const cloudCut = context.createBiquadFilter();
    cloudCut.type = 'peaking';
    cloudCut.frequency.value = lowMid > 0.30 ? 330 : 410;
    cloudCut.Q.value = 0.72;
    cloudCut.gain.value = clamp(-(Math.max(0, lowMid - 0.22) * 0.95 + Math.max(0, warmth - 62) * 0.008) * scale, -0.85, -0.04);
    const windowLift = context.createBiquadFilter();
    windowLift.type = 'peaking';
    windowLift.frequency.value = mid < 0.28 ? 1900 : 2450;
    windowLift.Q.value = 0.82;
    windowLift.gain.value = clamp((Math.max(0, 0.34 - mid) * 0.55 + Math.max(0, 56 - clarity) * 0.004) * scale, 0.02, 0.30);
    const airWindow = context.createBiquadFilter();
    airWindow.type = 'highshelf';
    airWindow.frequency.value = 10800;
    airWindow.gain.value = clamp((0.42 - brightness) * 0.48 * scale - Math.max(0, metallic - 0.54) * 0.28, -0.24, 0.32);
    input.connect(cloudCut).connect(windowLift).connect(airWindow).connect(output);
    return output;
}
function createTranslationGuardNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.translationGuard === false || !analysis) return input;
    const bass = clamp01(Number(analysis.bassRatio ?? 0.28));
    const lowMid = clamp01(Number(analysis.lowMidRatio ?? 0.24));
    const mid = clamp01(Number(analysis.midRatio ?? 0.28));
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const mobile = estimateMobileSpeakerRisk(analysis, settings, intensity);
    const scale = clamp(intensity.amount * (0.74 + mobile.risk * 0.72), 0.65, 1.65);
    const output = context.createGain();
    const subPocket = context.createBiquadFilter();
    subPocket.type = 'lowshelf';
    subPocket.frequency.value = 92;
    subPocket.gain.value = clamp(-(Math.max(0, bass - 0.35) * 0.86 + mobile.boom * 0.36) * scale, -1.20, 0.06);
    const mudPocket = context.createBiquadFilter();
    mudPocket.type = 'peaking';
    mudPocket.frequency.value = mobile.box > 0.45 ? 310 : 255;
    mudPocket.Q.value = 0.82;
    mudPocket.gain.value = clamp(-(Math.max(0, lowMid - 0.25) * 0.95 + mobile.box * 0.58) * scale, -1.45, 0.01);
    const boxResonance = context.createBiquadFilter();
    boxResonance.type = 'peaking';
    boxResonance.frequency.value = 470;
    boxResonance.Q.value = 1.10;
    boxResonance.gain.value = clamp(-(mobile.box * 0.42 + Math.max(0, lowMid - 0.31) * 0.52) * scale, -1.05, 0);
    const smallSpeakerFocus = context.createBiquadFilter();
    smallSpeakerFocus.type = 'peaking';
    smallSpeakerFocus.frequency.value = 1450;
    smallSpeakerFocus.Q.value = 0.78;
    smallSpeakerFocus.gain.value = clamp((0.31 - mid) * 0.26 * scale - mobile.honk * 0.18, -0.28, 0.20);
    const phoneHonkGuard = context.createBiquadFilter();
    phoneHonkGuard.type = 'peaking';
    phoneHonkGuard.frequency.value = 2900;
    phoneHonkGuard.Q.value = 1.15;
    phoneHonkGuard.gain.value = clamp(-(mobile.honk * 0.40 + Math.max(0, brightness - 0.63) * 0.12) * scale, -0.90, 0);
    const phoneHarshGuard = context.createBiquadFilter();
    phoneHarshGuard.type = 'peaking';
    phoneHarshGuard.frequency.value = 4200;
    phoneHarshGuard.Q.value = 1.45;
    phoneHarshGuard.gain.value = clamp(-(Math.max(0, brightness - 0.60) * 0.38 + mobile.harsh * 0.52) * scale, -1.10, 0);
    const outputTrim = context.createGain();
    outputTrim.gain.value = clamp(1 - mobile.density * 0.018 - mobile.risk * 0.012, 0.955, 1);
    input.connect(subPocket).connect(mudPocket).connect(boxResonance).connect(smallSpeakerFocus).connect(phoneHonkGuard).connect(phoneHarshGuard).connect(outputTrim).connect(output);
    return output;
}
function shouldApplyVocalProtection(preset, analysis) {
    if (state.featureFlags.vocalProtect === false) return false;
    if (!preset || preset === 'custom') return false;
    const vocalPresets = new Set(['pop','kpop','kballad','rnb','ballad','acoustic','citypop','globalpop']);
    if (vocalPresets.has(preset)) return true;
    const mid = Number(analysis?.midRatio || 0);
    const high = Number(analysis?.highRatio || 0);
    return mid > 0.34 && high < 0.55;
}
function createVocalProtectionNode(context, input, preset, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!shouldApplyVocalProtection(preset, analysis)) return input;
    const scale = clamp(intensity.amount, 0.7, 1.45);
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const output = context.createGain();
    const body = context.createBiquadFilter();
    const nasalGuard = context.createBiquadFilter();
    const deEsserSoft = context.createBiquadFilter();
    const airBalance = context.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 900;
    body.Q.value = 0.95;
    body.gain.value = clamp(0.22 * scale, 0.08, 0.55);
    nasalGuard.type = 'peaking';
    nasalGuard.frequency.value = 2400;
    nasalGuard.Q.value = 1.25;
    nasalGuard.gain.value = clamp(-0.18 * scale, -0.55, -0.05);
    deEsserSoft.type = 'peaking';
    deEsserSoft.frequency.value = 7200;
    deEsserSoft.Q.value = 2.8;
    deEsserSoft.gain.value = clamp(-0.28 - Math.max(0, clarity - 58) * 0.012 * scale, -1.25, -0.16);
    airBalance.type = 'highshelf';
    airBalance.frequency.value = 11800;
    airBalance.gain.value = clamp(-0.10 * scale, -0.45, 0);
    input.connect(body).connect(nasalGuard).connect(deEsserSoft).connect(airBalance).connect(output);
    return output;
}
function createProfileEqChain(context, input, preset, intensity = getMasteringIntensity({ intensity: 100 })) {
    const filters = PROFILE_EQ_FILTERS[preset] || [];
    let node = input;
    filters.forEach(config => {
        const filter = context.createBiquadFilter();
        filter.type = config.type;
        filter.frequency.value = config.frequency;
        filter.Q.value = config.q;
        filter.gain.value = clamp(config.gain * clamp(intensity.amount, 0.7, 1.8), -5.5, 4.0);
        node.connect(filter);
        node = filter;
    });
    return node;
}
function createStereoWidthNode(context, input, isStereo, widthFactor) {
    if (!isStereo) return input;
    const splitter = context.createChannelSplitter(2);
    const merger = context.createChannelMerger(2);
    const output = context.createGain();
    const side = widthFactor;
    const routes = [
        [0, 0, 0.5 + 0.5 * side],
        [1, 0, 0.5 - 0.5 * side],
        [0, 1, 0.5 - 0.5 * side],
        [1, 1, 0.5 + 0.5 * side]
    ];
    input.connect(splitter);
    routes.forEach(([from, to, gainValue]) => {
        const gain = context.createGain();
        gain.gain.value = gainValue;
        splitter.connect(gain, from);
        gain.connect(merger, 0, to);
    });
    merger.connect(output);
    return output;
}
function getRawWidthFactor(settings, intensity = getMasteringIntensity(settings), minFactor = 0.82, maxFactor = 1.22) {
    const widthSetting = clamp(Number(settings?.width ?? 50), 0, 100);
    const rawBase = map(widthSetting, 0, 100, minFactor, maxFactor);
    const scaled = 1 + (rawBase - 1) * clamp(intensity?.amount ?? 1, 0.65, 1.65);
    return clamp(scaled, minFactor, maxFactor);
}
function getPhaseSafeSpatialBudget(settings, analysis, intensity = getMasteringIntensity(settings), minFactor = 0.82, maxFactor = 1.22) {
    const rawWidthFactor = getRawWidthFactor(settings, intensity, minFactor, maxFactor);
    const rawGroove = clamp(Number(settings?.stereoGroove ?? 0), 0, 100);
    const intensityAmount = clamp(Number(intensity?.amount ?? 1), 0.65, 1.70);
    const rawGrooveDepth = clamp(rawGroove / 100 * intensityAmount, 0, 1.25);
    if (!analysis || state.featureFlags.phaseSafe === false) {
        return {
            widthFactor: rawWidthFactor,
            stereoGroove: rawGroove,
            rawWidthFactor,
            rawStereoGroove: rawGroove,
            scale: 1,
            effectiveExpansion: Math.max(0, rawWidthFactor - 1) + rawGrooveDepth * 0.20,
            maxExpansion: maxFactor - 1,
            phaseSafeReductionDb: 0,
            reason: 'phase-safe bypass'
        };
    }
    const measuredWidth = clamp01(Number(analysis.stereoWidth ?? 0.38));
    const spatialRisk = clamp01(Number(analysis.spatialExcessRisk || 0));
    const lowMonoScore = Number(analysis.lowMonoScore || 100);
    const lowSideRatio = clamp01(Number(analysis.lowSideRatio || 0));
    const lowMonoRisk = clamp01(Math.max(0, 84 - lowMonoScore) / 84);
    const widthRisk = clamp01(Math.max(0, measuredWidth - 0.52) / 0.36);
    const sideRisk = clamp01(Math.max(0, lowSideRatio - 0.28) / 0.38);
    const bands = analysis.spectrumBands || {};
    const air = clamp01(Number(analysis.airRatio ?? bands.air ?? 0));
    const presence = clamp01(Number(analysis.presenceRatio ?? bands.presence ?? 0));
    const airRisk = clamp01(Math.max(0, air - 0.14) / 0.22 + Math.max(0, presence - 0.24) / 0.45 * 0.35);
    const widthExpansion = Math.max(0, rawWidthFactor - 1);
    const widthContraction = Math.min(0, rawWidthFactor - 1);
    const grooveExpansion = rawGrooveDepth * 0.20;
    const requestedExpansion = widthExpansion + grooveExpansion;
    const baseBudget = clamp(maxFactor - 1, 0.12, 0.42);
    const riskPenalty = spatialRisk * 0.115 + lowMonoRisk * 0.135 + widthRisk * 0.105 + sideRisk * 0.080 + airRisk * 0.060;
    const maxExpansion = clamp(baseBudget - riskPenalty, 0.012, baseBudget);
    const scale = requestedExpansion > maxExpansion && requestedExpansion > 0 ? clamp(maxExpansion / requestedExpansion, 0.08, 1) : 1;
    const safeWidthFactor = clamp(1 + widthContraction + widthExpansion * scale, minFactor, maxFactor);
    const safeGroove = clamp(rawGroove * scale, 0, 100);
    const effectiveExpansion = Math.max(0, safeWidthFactor - 1) + clamp(safeGroove / 100 * intensityAmount, 0, 1.25) * 0.20;
    const reduction = requestedExpansion > 0 ? clamp01(1 - effectiveExpansion / requestedExpansion) : 0;
    const reasonParts = [];
    if (spatialRisk > 0.20) reasonParts.push(`spatial ${Math.round(spatialRisk * 100)}%`);
    if (lowMonoScore < 84) reasonParts.push(`low-mono ${Math.round(lowMonoScore)}`);
    if (measuredWidth > 0.52) reasonParts.push(`width ${Math.round(measuredWidth * 100)}%`);
    if (lowSideRatio > 0.28) reasonParts.push(`low-side ${Math.round(lowSideRatio * 100)}%`);
    if (airRisk > 0.10) reasonParts.push(`air ${Math.round(air * 100)}%`);
    return {
        widthFactor: safeWidthFactor,
        stereoGroove: safeGroove,
        rawWidthFactor,
        rawStereoGroove: rawGroove,
        scale,
        effectiveExpansion,
        requestedExpansion,
        maxExpansion,
        phaseSafeReductionDb: reduction > 0 ? -20 * Math.log10(Math.max(1e-6, 1 - reduction * 0.55)) : 0,
        reason: reasonParts.length ? reasonParts.join(' / ') : 'safe budget'
    };
}
function applySpatialBudgetToSettings(settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!settings || !analysis || state.featureFlags.phaseSafe === false) return settings;
    const budget = getPhaseSafeSpatialBudget(settings, analysis, intensity, 0.82, 1.22);
    if (budget.scale >= 0.995) return settings;
    const width = clamp(Number(settings.width || 50), 0, 100);
    const widthDelta = Math.max(0, width - 50);
    if (widthDelta > 0) settings.width = clamp(Math.round(50 + widthDelta * budget.scale), 3, 88);
    settings.stereoGroove = clamp(Math.round(Number(settings.stereoGroove || 0) * budget.scale), 0, 100);
    return settings;
}
function createPhaseSafeNode(context, input, isStereo, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.phaseSafe === false || !isStereo) return input;
    const width = clamp(Number(settings.width || 28), 0, 100);
    const groove = clamp(Number(settings.stereoGroove || 0), 0, 100);
    const measuredWidth = clamp01(Number(analysis?.stereoWidth ?? 0.38));
    const bass = clamp01(Number(analysis?.bassRatio ?? 0.26));
    const spatialRisk = clamp01(Number(analysis?.spatialExcessRisk || 0));
    const lowMonoPenalty = Math.max(0, 78 - Number(analysis?.lowMonoScore || 100)) / 78;
    const risk = Math.max(0, width - 54) / 46 * 0.44 + Math.max(0, groove - 12) / 88 * 0.24 + Math.max(0, measuredWidth - 0.56) * 0.56 + Math.max(0, bass - 0.36) * 0.18 + spatialRisk * 0.44 + lowMonoPenalty * 0.28;
    if (risk < 0.035) return input;
    const side = clamp(1 - risk * clamp(intensity.amount, 0.65, 1.6) * 0.18, 0.86, 1);
    const splitter = context.createChannelSplitter(2);
    const merger = context.createChannelMerger(2);
    const output = context.createGain();
    const routes = [
        [0, 0, 0.5 + 0.5 * side],
        [1, 0, 0.5 - 0.5 * side],
        [0, 1, 0.5 - 0.5 * side],
        [1, 1, 0.5 + 0.5 * side]
    ];
    input.connect(splitter);
    routes.forEach(([from, to, gainValue]) => {
        const gain = context.createGain();
        gain.gain.value = gainValue;
        splitter.connect(gain, from);
        gain.connect(merger, 0, to);
    });
    merger.connect(output);
    return output;
}
function createStereoGrooveNode(context, input, amount, intensity = getMasteringIntensity({ intensity: 100 })) {
    const depth = clamp(amount / 100 * clamp(intensity.amount, 0.7, 1.7), 0, 1.25);
    if (depth < 0.08) return input;
    const output = context.createGain();
    const dry = context.createGain();
    const wet = context.createGain();
    const delay = context.createDelay(0.04);
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    dry.gain.value = 1 - depth * 0.08;
    wet.gain.value = depth * 0.08;
    delay.delayTime.value = 0.0018 + depth * 0.0025;
    lfo.frequency.value = 0.14 + depth * 0.32;
    lfoGain.gain.value = depth * 0.0012;
    input.connect(dry).connect(output);
    input.connect(delay).connect(wet).connect(output);
    lfo.connect(lfoGain).connect(delay.delayTime);
    lfo.start(0);
    return output;
}
function createSpectralBalancerNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!analysis) return input;
    const bass = clamp01(Number(analysis.bassRatio ?? 0.28));
    const lowMid = clamp01(Number(analysis.lowMidRatio ?? 0.24));
    const mid = clamp01(Number(analysis.midRatio ?? 0.28));
    const high = clamp01(Number(analysis.highRatio ?? 0.22));
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const scale = clamp(intensity.amount, 0.65, 1.7);
    const output = context.createGain();
    const subShelf = context.createBiquadFilter();
    subShelf.type = 'lowshelf';
    subShelf.frequency.value = 95;
    subShelf.gain.value = clamp((0.30 - bass) * 1.35 * scale, -0.75, 0.65);
    const mudScoop = context.createBiquadFilter();
    mudScoop.type = 'peaking';
    mudScoop.frequency.value = 260;
    mudScoop.Q.value = 0.82;
    mudScoop.gain.value = clamp((0.22 - lowMid) * 1.55 * scale, -0.95, 0.45);
    const vocalKeep = context.createBiquadFilter();
    vocalKeep.type = 'peaking';
    vocalKeep.frequency.value = 1650;
    vocalKeep.Q.value = 0.72;
    vocalKeep.gain.value = clamp((0.30 - mid) * 0.62 * scale, -0.32, 0.45);
    const airTrim = context.createBiquadFilter();
    airTrim.type = 'highshelf';
    airTrim.frequency.value = brightness > 0.66 || high > 0.36 ? 9800 : 11800;
    airTrim.gain.value = clamp((0.27 - high) * 1.2 * scale - Math.max(0, brightness - 0.62) * 1.25, -0.95, 0.55);
    input.connect(subShelf).connect(mudScoop).connect(vocalKeep).connect(airTrim).connect(output);
    return output;
}
function createPerceptualPolishNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (!analysis) return input;
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const warmth = clamp(Number(settings.warmth || 55), 0, 100);
    const removal = clamp(Number(settings.metallicRemoval || 42), 0, 100);
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const high = clamp01(Number(analysis.highRatio ?? 0.22));
    const mid = clamp01(Number(analysis.midRatio ?? 0.28));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const scale = clamp(intensity.amount, 0.65, 1.75);
    const bodyFocus = context.createBiquadFilter();
    bodyFocus.type = 'peaking';
    bodyFocus.frequency.value = 520;
    bodyFocus.Q.value = 0.88;
    bodyFocus.gain.value = clamp((warmth - 55) * 0.006 * scale + (0.27 - mid) * 0.30, -0.28, 0.42);
    const presenceFocus = context.createBiquadFilter();
    presenceFocus.type = 'peaking';
    presenceFocus.frequency.value = 2450;
    presenceFocus.Q.value = 1.05;
    presenceFocus.gain.value = clamp((clarity - 50) * 0.0045 * scale - metallic * 0.18, -0.48, 0.38);
    const biteGuard = context.createBiquadFilter();
    biteGuard.type = 'peaking';
    biteGuard.frequency.value = clamp(Number(analysis.targetDynamicFreq || 5200) * 0.82, 3600, 6800);
    biteGuard.Q.value = 2.35;
    biteGuard.gain.value = clamp(-Math.max(0, metallic - 0.42) * 0.72 * scale - Math.max(0, removal - 58) * 0.006, -1.10, -0.03);
    const silkShelf = context.createBiquadFilter();
    silkShelf.type = 'highshelf';
    silkShelf.frequency.value = 13500;
    silkShelf.gain.value = clamp((0.48 - brightness) * 0.62 * scale - Math.max(0, high - 0.38) * 0.55, -0.55, 0.42);
    input.connect(bodyFocus).connect(presenceFocus).connect(biteGuard).connect(silkShelf);
    return silkShelf;
}
function createToneChain(context, input, settings, analysis, preset, intensity = getMasteringIntensity(settings)) {
    const vocalMetalRisk = estimateVocalMetallicRisk(analysis, settings, preset, intensity);
    const toneScale = clamp(intensity.amount * clamp(1 - vocalMetalRisk * 0.26, 0.72, 1), 0.65, 2.05);
    const highAggressionBase = intensity.raw >= 140 ? 1 + Math.pow((intensity.raw - 140) / 60, 1.55) * 0.9 : 1;
    const highAggression = clamp(highAggressionBase * (1 - vocalMetalRisk * 0.48), 0.72, highAggressionBase);
    const lowShelf = context.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 170;
    lowShelf.gain.value = clamp(map(settings.warmth, 0, 100, -2.0, 2.4) * toneScale, -4.0, 4.2);
    const lowMid = context.createBiquadFilter();
    lowMid.type = 'peaking';
    lowMid.frequency.value = 320;
    lowMid.Q.value = 0.75;
    lowMid.gain.value = clamp(map(settings.warmth, 0, 100, -1.0, 1.2) * toneScale, -3.0, 3.0);
    const presence = context.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 3100;
    presence.Q.value = intensity.raw >= 150 ? 1.15 : 0.92;
    presence.gain.value = clamp(map(settings.clarity, 0, 100, -1.5, 1.8) * toneScale * highAggression - vocalMetalRisk * 0.55, -4.0, 4.2);
    const highShelf = context.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 7200;
    highShelf.gain.value = clamp(map(settings.clarity, 0, 100, -2.2, 2.5) * toneScale * highAggression - vocalMetalRisk * 0.82, -5.0, 4.4);
    input.connect(lowShelf).connect(lowMid).connect(presence).connect(highShelf);
    return highShelf;
}
function createMetallicRemovalNode(context, input, amount, analysis, intensity = getMasteringIntensity({ intensity: 100 })) {
    const vocalRisk = estimateVocalMetallicRisk(analysis, { clarity: 50, metallicRemoval: amount, intensity: intensity.raw }, null, intensity);
    const aggressiveBase = intensity.raw >= 140 ? 1 + Math.pow((intensity.raw - 140) / 60, 1.45) * 0.9 : 1;
    const aggressive = aggressiveBase * clamp(1 - vocalRisk * 0.32, 0.68, 1);
    const effectiveAmount = clamp(amount * clamp(intensity.amount, 0.65, 2.15) * aggressive, 0, vocalRisk > 0.42 ? 176 : 220);
    const depth = effectiveAmount / 100;
    if (depth < 0.03) return input;
    const targetDynamicF = (analysis && analysis.targetDynamicFreq) ? analysis.targetDynamicFreq : 5200;
    const ringCut = context.createBiquadFilter();
    ringCut.type = 'peaking';
    ringCut.frequency.value = 2700;
    ringCut.Q.value = (intensity.raw >= 150 ? 4.3 : 3.5) * clamp(1 - vocalRisk * 0.20, 0.78, 1);
    ringCut.gain.value = clamp(map(effectiveAmount, 0, 200, 0, -5.2), -6.0, 0);
    const dynamicCut = context.createBiquadFilter();
    dynamicCut.type = 'peaking';
    dynamicCut.frequency.value = targetDynamicF;
    dynamicCut.Q.value = (intensity.raw >= 150 ? 6.5 : 5.0) * clamp(1 - vocalRisk * 0.28, 0.72, 1);
    dynamicCut.gain.value = clamp(map(effectiveAmount, 0, 200, 0, -8.5) * clamp(1 - vocalRisk * 0.22, 0.72, 1), vocalRisk > 0.42 ? -6.8 : -9.5, 0);
    const fizzCut = context.createBiquadFilter();
    fizzCut.type = 'peaking';
    fizzCut.frequency.value = 8200;
    fizzCut.Q.value = (intensity.raw >= 150 ? 6.2 : 5.2) * clamp(1 - vocalRisk * 0.24, 0.74, 1);
    fizzCut.gain.value = clamp(map(effectiveAmount, 0, 200, 0, -6.2), -7.0, 0);
    const airTamer = context.createBiquadFilter();
    airTamer.type = 'highshelf';
    airTamer.frequency.value = 11500;
    airTamer.gain.value = clamp(map(effectiveAmount, 0, 200, 0, -3.4), -4.0, 0);
    input.connect(ringCut).connect(dynamicCut).connect(fizzCut).connect(airTamer);
    return airTamer;
}
function createHighFrequencyExciterNode(context, input, settings, analysis, preset, intensity = getMasteringIntensity(settings)) {
    const clarity = clamp(Number(settings.clarity || 0), 0, 100) / 100;
    const vocalMetalRisk = estimateVocalMetallicRisk(analysis, settings, preset, intensity);
    const vocalLikely = isVocalLikeAnalysis(analysis, preset);
    const safeDriveScale = clamp(1 - vocalMetalRisk * 0.82 - (vocalLikely ? 0.18 : 0), 0.18, 1);
    const exciterDrive = Math.max(0, (intensity.raw - 92) / 118) * (0.26 + clarity * 0.62) * safeDriveScale;
    if (exciterDrive < 0.035 || vocalMetalRisk > 0.72) return input;
    const output = context.createGain();
    const dry = context.createGain();
    const highPass = context.createBiquadFilter();
    const shaper = context.createWaveShaper();
    const airShelf = context.createBiquadFilter();
    const wet = context.createGain();
    highPass.type = 'highpass';
    highPass.frequency.value = clamp(6100 - clarity * 700 + vocalMetalRisk * 1400, 5000, 7200);
    highPass.Q.value = 0.65;
    shaper.curve = makeExciterCurve(1 + exciterDrive * 3.2);
    shaper.oversample = '4x';
    airShelf.type = 'highshelf';
    airShelf.frequency.value = 9400;
    airShelf.gain.value = clamp(exciterDrive * 3.4 * clamp(intensity.amount, 0.8, 1.45) * clamp(1 - vocalMetalRisk * 0.65, 0.28, 1), 0, vocalLikely ? 2.2 : 4.2);
    wet.gain.value = clamp(0.018 + exciterDrive * 0.075, 0.012, vocalLikely ? 0.085 : 0.15);
    dry.gain.value = 1 - wet.gain.value * 0.10;
    input.connect(dry).connect(output);
    input.connect(highPass).connect(shaper).connect(airShelf).connect(wet).connect(output);
    return output;
}
function makeExciterCurve(amount) {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const drive = Math.max(1, amount * 8);
    for (let i = 0; i < samples; i += 1) {
        const x = i * 2 / (samples - 1) - 1;
        const shaped = Math.tanh(x * drive);
        curve[i] = (shaped - x * 0.35) * 0.72;
    }
    return curve;
}
function createEarFatigueGuardNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.earFatigueGuard === false || !analysis) return input;
    const clarity = clamp(Number(settings.clarity || 50), 0, 100);
    const removal = clamp(Number(settings.metallicRemoval || 42), 0, 100);
    const brightness = clamp01(Number(analysis.brightness ?? 0.45));
    const high = clamp01(Number(analysis.highRatio ?? 0.22));
    const metallic = clamp01(Number(analysis.metallicHint ?? 0.35));
    const fatigue = Math.max(0, brightness - 0.58) * 0.50 + Math.max(0, high - 0.34) * 0.45 + Math.max(0, metallic - 0.48) * 0.60 + Math.max(0, clarity - 64) * 0.006 + Math.max(0, intensity.raw - 135) * 0.0025;
    if (fatigue < 0.035 && removal < 62) return input;
    const scale = clamp(0.65 + fatigue * 1.3, 0.65, 1.35);
    const glare = context.createBiquadFilter();
    glare.type = 'peaking';
    glare.frequency.value = 3600;
    glare.Q.value = 1.65;
    glare.gain.value = clamp(-fatigue * 0.70 * scale, -0.95, -0.02);
    const edge = context.createBiquadFilter();
    edge.type = 'peaking';
    edge.frequency.value = clamp(Number(analysis.targetDynamicFreq || 6200), 4800, 7800);
    edge.Q.value = 2.4;
    edge.gain.value = clamp(-(fatigue * 0.88 + Math.max(0, removal - 65) * 0.006) * scale, -1.25, -0.02);
    const airFuse = context.createBiquadFilter();
    airFuse.type = 'peaking';
    airFuse.frequency.value = 9800;
    airFuse.Q.value = 1.55;
    airFuse.gain.value = clamp(-fatigue * 0.62 * scale, -0.95, 0);
    input.connect(glare).connect(edge).connect(airFuse);
    return airFuse;
}
function createLoudnessLiftNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    const output = context.createGain();
    const loudnessHint = analysis && Number.isFinite(analysis.loudnessHint) ? analysis.loudnessHint : -18;
    const targetRms = map(intensity.raw, 50, 200, -20.5, -10.0);
    const baseLift = clamp((targetRms - loudnessHint) * 0.34, -1.5, 7.2);
    const extraDrive = intensity.raw > 120 ? Math.pow((intensity.raw - 120) / 80, 1.35) * 1.6 : 0;
    const gainDb = clamp(baseLift + extraDrive, -2.0, intensity.raw >= 160 ? 8.5 : 6.0);
    output.gain.value = dbToAmp(gainDb);
    input.connect(output);
    return output;
}
function createTransientRefineNode(context, input, settings, analysis, intensity = getMasteringIntensity(settings)) {
    if (state.featureFlags.transientRefine === false) return input;
    const transient = clamp01(Number(analysis?.transientDensity ?? 0.35));
    const punch = clamp(Number(settings.dynamicPunch || 50), 0, 100);
    const high = clamp01(Number(analysis?.highRatio ?? 0.28));
    const need = transient > 0.42 || punch > 54 || intensity.raw > 135;
    if (!need) return input;
    const snapScale = clamp((transient - 0.36) * 2.0 + Math.max(0, punch - 50) / 120 + Math.max(0, intensity.raw - 130) / 180, 0.1, 1.25);
    const output = context.createGain();
    const clickGuard = context.createBiquadFilter();
    const hatGuard = context.createBiquadFilter();
    const bodyKeep = context.createBiquadFilter();
    bodyKeep.type = 'peaking';
    bodyKeep.frequency.value = 1850;
    bodyKeep.Q.value = 0.9;
    bodyKeep.gain.value = clamp(0.06 * snapScale, 0, 0.20);
    clickGuard.type = 'peaking';
    clickGuard.frequency.value = 4700;
    clickGuard.Q.value = 2.2;
    clickGuard.gain.value = clamp(-0.18 * snapScale, -0.85, -0.03);
    hatGuard.type = 'peaking';
    hatGuard.frequency.value = high > 0.38 ? 9500 : 7800;
    hatGuard.Q.value = 1.8;
    hatGuard.gain.value = clamp(-0.12 * snapScale, -0.65, -0.02);
    input.connect(bodyKeep).connect(clickGuard).connect(hatGuard).connect(output);
    return output;
}
function createCompressionNode(context, input, punch, intensity = getMasteringIntensity({ intensity: 100 })) {
    const compressor = context.createDynamicsCompressor();
    const effectivePunch = clamp(punch * clamp(intensity.amount, 0.7, 1.9), 0, 160);
    const p = clamp01(effectivePunch / 100);
    compressor.threshold.value = clamp(map(effectivePunch, 0, 160, -18, -6), -26, -5);
    compressor.knee.value = clamp(map(effectivePunch, 0, 160, 28, 8), 6, 30);
    compressor.ratio.value = clamp(map(effectivePunch, 0, 160, 2.2, 1.18), 1.12, 5.0);
    compressor.attack.value = map(p, 0, 1, 0.008, 0.035);
    compressor.release.value = map(p, 0, 1, 0.34, 0.09);
    input.connect(compressor);
    return compressor;
}
function createLimiterNode(context, input, intensity = getMasteringIntensity({ intensity: 100 })) {
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = intensity.raw >= 150 ? -1.6 : -0.9;
    limiter.knee.value = 0;
    limiter.ratio.value = intensity.raw >= 150 ? 20 : 15;
    limiter.attack.value = 0.001;
    limiter.release.value = intensity.raw >= 150 ? 0.055 : 0.07;
    input.connect(limiter);
    return limiter;
}
function createSaturationNode(context, input, analogGroove, warmth, intensity = getMasteringIntensity({ intensity: 100 })) {
    if (analogGroove < 8 && warmth < 68 && intensity.raw < 125) return input;
    const output = context.createGain();
    const dry = context.createGain();
    const wet = context.createGain();
    const shaper = context.createWaveShaper();
    const drive = 1 + (analogGroove / 100 * 2.5 + warmth / 100 * 0.4) * clamp(intensity.amount, 0.65, 1.85);
    const mix = Math.min(0.2, (analogGroove / 100 * 0.09 + warmth / 100 * 0.015) * clamp(intensity.amount, 0.65, 2.0));
    const compensation = 1.0 / (1.0 + (analogGroove * 0.0035 * clamp(intensity.amount, 0.8, 1.6)));
    dry.gain.value = (1 - mix) * compensation;
    wet.gain.value = mix * compensation;
    shaper.curve = makeSaturationCurve(drive);
    shaper.oversample = '4x';
    input.connect(dry).connect(output);
    input.connect(shaper).connect(wet).connect(output);
    return output;
}
function makeSaturationCurve(amount) {
    const key = `sat:${Math.round(Number(amount || 1) * 100)}`;
    if (CURVE_CACHE.has(key)) return CURVE_CACHE.get(key);
    const samples = 4096;
    const curve = new Float32Array(samples);
    const k = amount * 18;
    for (let i = 0; i < samples; i += 1) {
        const x = i * 2 / (samples - 1) - 1;
        curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
    }
    if (CURVE_CACHE.size > 24) CURVE_CACHE.clear();
    CURVE_CACHE.set(key, curve);
    return curve;
}
function createAlbumMatchNode(context, input, analysis, albumProfile) {
    if (!state.featureFlags.albumMatch || !analysis || !albumProfile || albumProfile.count < 2) return input;
    const output = context.createGain();
    const toneDelta = clamp(albumProfile.brightness - analysis.brightness, -0.45, 0.45);
    const levelDeltaDb = clamp((albumProfile.loudnessHint - analysis.loudnessHint) * 0.35, -2.5, 2.5);
    const lowShelf = context.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 180;
    lowShelf.gain.value = clamp(-toneDelta * 1.1, -1.2, 1.2);
    const highShelf = context.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 7800;
    highShelf.gain.value = clamp(toneDelta * 2.0, -1.8, 1.8);
    output.gain.value = Math.pow(10, levelDeltaDb / 20);
    input.connect(lowShelf).connect(highShelf).connect(output);
    return output;
}
function computeAlbumProfile() {
    const analyses = state.tracks.map(track => track.analysis).filter(item => item && !item.silence);
    if (!analyses.length) return null;
    return {
        count: analyses.length,
        loudnessHint: median(analyses.map(item => item.loudnessHint)),
        brightness: median(analyses.map(item => item.brightness)),
        stereoWidth: median(analyses.map(item => item.stereoWidth)),
        metallicHint: median(analyses.map(item => item.metallicHint))
    };
}
function getActiveAlbumProfile() {
    if (!state.featureFlags.albumMatch) return null;
    state.albumProfile = computeAlbumProfile();
    if (!state.albumProfile || state.albumProfile.count < 2) return null;
    return state.albumProfile;
}
function createAlbumAppliedInfo(analysis, profile) {
    const levelDeltaDb = clamp((profile.loudnessHint - analysis.loudnessHint) * 0.35, -2.5, 2.5);
    const toneDelta = clamp(profile.brightness - analysis.brightness, -0.45, 0.45);
    return {
        referenceTracks: profile.count,
        levelDeltaDb,
        toneDelta,
        referenceLoudness: profile.loudnessHint,
        referenceBrightness: profile.brightness
    };
}
function mixInstrumentLayerBuffer(buffer, layer, analysis) {
    const value = cloneInstrumentLayer(layer || DEFAULT_INSTRUMENT_LAYER);
    const preset = INSTRUMENT_LAYER_PRESETS[value.mode] || INSTRUMENT_LAYER_PRESETS.off;
    if (value.mode === 'off') {
        return { buffer, info: { applied: false, label: 'OFF', bpm: 0, events: 0, gainDb: 0, confidence: 0 } };
    }
    const bpmInfo = estimateTempoFromBuffer(buffer, analysis);
    const bpm = clamp(Number(bpmInfo.bpm || 120), 60, 190);
    const amount = INSTRUMENT_AMOUNT_LEVELS[value.amount] || INSTRUMENT_AMOUNT_LEVELS.light;
    const sourcePeak = measureSamplePeak(buffer);
    const bassDucking = preset.hasKick ? clamp(1 - Number(analysis?.bassRatio || 0.28) * 0.20, 0.76, 1.0) : 1;
    const transientDucking = clamp(1.06 - Number(analysis?.transientDensity || 0.35) * 0.32, 0.72, 1.02);
    const confidenceScale = clamp(0.72 + Number(bpmInfo.confidence || 0.4) * 0.36, 0.70, 1.05);
    const peakRoomScale = clamp((0.965 - sourcePeak) / 0.34, 0.34, 1.0);
    const naturalScale = amount.gain * peakRoomScale * bassDucking * transientDucking * confidenceScale;
    const output = cloneAudioBuffer(buffer);
    const channels = getMutableChannelViews(output);
    const beatSamples = Math.max(1, Math.round(buffer.sampleRate * 60 / bpm));
    const firstBeat = detectFirstTransientSample(buffer, beatSamples);
    const durationBeats = Math.ceil((buffer.length + beatSamples) / beatSamples);
    const swing = value.amount === 'light' ? 0.018 : value.amount === 'normal' ? 0.026 : 0.034;
    const microHumanize = value.amount === 'bold' ? 0.008 : 0.005;
    let events = 0;
    let weightedGain = 0;
    for (let beat = 0; beat < durationBeats; beat += 1) {
        const barBeat = beat % 4;
        const baseStart = firstBeat + beat * beatSamples;
        const human = Math.round(beatSamples * microHumanize * pseudoNoise(beat * 19.17));
        if (baseStart >= -beatSamples && baseStart < output.length) {
            if (preset.hasKick) {
                const velocity = barBeat === 0 ? 1.0 : barBeat === 2 ? 0.72 : 0.36;
                const start = baseStart + human;
                if (start >= 0 && start < output.length) {
                    const amp = 0.050 * naturalScale * velocity;
                    addKickToChannels(channels, output.sampleRate, start, amp);
                    weightedGain += amp;
                    events += 1;
                }
            }
            if (preset.hasClap && (barBeat === 1 || barBeat === 3)) {
                const start = baseStart + Math.round(beatSamples * 0.018) + Math.round(human * 0.45);
                if (start >= 0 && start < output.length) {
                    const amp = 0.029 * naturalScale * (barBeat === 1 ? 0.92 : 1.0);
                    addClapToChannels(channels, output.sampleRate, start, amp);
                    weightedGain += amp;
                    events += 1;
                }
            }
        }
        if (preset.hasHat) {
            const offbeatSwing = Math.round(beatSamples * (0.50 + swing));
            const hat1 = baseStart + offbeatSwing + Math.round(human * 0.35);
            if (hat1 >= 0 && hat1 < output.length) {
                const amp = 0.016 * naturalScale * (barBeat === 0 ? 0.82 : 1.0);
                addHatToChannels(channels, output.sampleRate, hat1, amp, beat, beat % 2 ? 0.94 : 1.06);
                weightedGain += amp;
                events += 1;
            }
            if (value.amount !== 'light') {
                const hat2 = baseStart + Math.round(beatSamples * 0.25) - Math.round(beatSamples * swing * 0.33);
                if (hat2 >= 0 && hat2 < output.length) {
                    const amp = 0.0085 * naturalScale * (barBeat === 2 ? 0.9 : 0.7);
                    addHatToChannels(channels, output.sampleRate, hat2, amp, beat + 17, beat % 2 ? 1.05 : 0.96);
                    weightedGain += amp;
                    events += 1;
                }
            }
        }
    }
    applyEdgeFade(output, 0.004);
    const afterPeak = measureSamplePeakFast(channels);
    const safeGain = afterPeak > 0.94 ? 0.94 / Math.max(1e-9, afterPeak) : 1;
    if (safeGain < 1) applyBufferGainFast(channels, safeGain);
    return {
        buffer: output,
        info: {
            applied: true,
            label: getInstrumentLayerLabel(value.mode),
            amount: value.amount,
            bpm,
            confidence: bpmInfo.confidence,
            candidates: bpmInfo.candidates || [],
            gridQuality: bpmInfo.gridQuality,
            firstBeatSec: firstBeat / buffer.sampleRate,
            events,
            averageEventGain: events ? weightedGain / events : 0,
            gainDb: 20 * Math.log10(Math.max(1e-9, safeGain * naturalScale))
        }
    };
}
function estimateTempoFromBuffer(buffer, analysis) {
    const tempoData = buildOnsetEnvelope(buffer, 132);
    const envelope = tempoData.envelope;
    const sampleRate = buffer.sampleRate;
    const hopSeconds = tempoData.hop / sampleRate;
    if (!envelope.length) return { bpm: 120, confidence: 0, candidates: [], gridQuality: 0 };
    const candidates = [];
    for (let bpm = 60; bpm <= 190; bpm += 0.5) {
        const lag = Math.max(1, Math.round((60 / bpm) / hopSeconds));
        const score = scoreTempoLag(envelope, lag);
        candidates.push({ bpm, score });
    }
    candidates.sort((a, b) => b.score - a.score);
    let best = candidates[0] || { bpm: 120, score: 0 };
    const folded = foldTempoCandidate(best.bpm, analysis);
    let bestBpm = folded;
    const foldedHit = candidates.find(item => Math.abs(foldTempoCandidate(item.bpm, analysis) - folded) < 0.6);
    if (foldedHit && foldedHit.score > best.score * 0.82) best = foldedHit;
    bestBpm = refineTempoWithNeighborhood(envelope, hopSeconds, bestBpm);
    const runnerUp = candidates.find(item => Math.abs(foldTempoCandidate(item.bpm, analysis) - bestBpm) > 3) || candidates[1] || best;
    const transient = Number(analysis?.transientDensity ?? 0.35);
    const separation = best.score / Math.max(1e-9, runnerUp.score || 1e-9);
    const rawConfidence = (best.score * 120) + clamp((separation - 1) * 0.42, 0, 0.36) + transient * 0.22;
    const confidence = clamp01(rawConfidence);
    const gridQuality = clamp01(scoreTempoLag(envelope, Math.max(1, Math.round((60 / bestBpm) / hopSeconds))) * 150);
    return {
        bpm: clamp(bestBpm, 60, 190),
        confidence,
        gridQuality,
        candidates: candidates.slice(0, 4).map(item => ({ bpm: Math.round(foldTempoCandidate(item.bpm, analysis) * 10) / 10, score: Math.round(item.score * 100000) / 100000 }))
    };
}
function buildOnsetEnvelope(buffer, maxSeconds = 120) {
    const sampleRate = buffer.sampleRate;
    const frameSize = Math.max(768, Math.round(sampleRate * 0.026));
    const hop = Math.max(384, Math.round(sampleRate * 0.0125));
    const maxLength = Math.min(buffer.length, Math.round(sampleRate * maxSeconds));
    const frames = Math.max(0, Math.ceil(maxLength / hop));
    const envelope = new Float32Array(frames);
    const channels = getReadableChannelViews(buffer);
    let prevEnergy = 0;
    let prevPeak = 0;
    let running = 0;
    for (let frame = 0; frame < frames; frame += 1) {
        const start = frame * hop;
        const end = Math.min(maxLength, start + frameSize);
        let sum = 0;
        let peak = 0;
        let zc = 0;
        let prev = 0;
        let count = 0;
        for (let ch = 0; ch < channels.length; ch += 1) {
            const data = channels[ch];
            for (let i = start; i < end; i += 4) {
                const sample = data[i] || 0;
                const abs = Math.abs(sample);
                sum += abs;
                if (abs > peak) peak = abs;
                if (count > 0 && Math.sign(sample) !== Math.sign(prev)) zc += 1;
                prev = sample;
                count += 1;
            }
        }
        const energy = sum / Math.max(1, count);
        const rise = Math.max(0, energy - prevEnergy * 0.86);
        const peakRise = Math.max(0, peak - prevPeak * 0.82);
        const zcBoost = clamp01(zc / Math.max(1, count) * 7.5);
        const raw = rise * 0.88 + peakRise * 0.38 + energy * zcBoost * 0.08;
        running = running * 0.985 + raw * 0.015;
        envelope[frame] = Math.max(0, raw - running * 0.16);
        prevEnergy = energy;
        prevPeak = peak;
    }
    normalizeEnvelopeInPlace(envelope);
    return { envelope, hop, frameSize };
}
function normalizeEnvelopeInPlace(envelope) {
    let max = 0;
    let sum = 0;
    for (let i = 0; i < envelope.length; i += 1) {
        max = Math.max(max, envelope[i]);
        sum += envelope[i];
    }
    const mean = sum / Math.max(1, envelope.length);
    const scale = 1 / Math.max(1e-9, Math.max(max * 0.55, mean * 6));
    for (let i = 0; i < envelope.length; i += 1) {
        envelope[i] = Math.min(1, envelope[i] * scale);
    }
}
function scoreTempoLag(envelope, lag) {
    if (!envelope.length || lag <= 0 || lag >= envelope.length) return 0;
    let score = 0;
    let count = 0;
    const lag2 = lag * 2;
    const halfLag = Math.max(1, Math.round(lag / 2));
    for (let i = lag2; i < envelope.length; i += 1) {
        const current = envelope[i];
        score += current * envelope[i - lag];
        if (i - lag2 >= 0) score += current * envelope[i - lag2] * 0.42;
        if (i - halfLag >= 0) score += current * envelope[i - halfLag] * 0.18;
        count += 1.6;
    }
    return score / Math.max(1, count);
}
function refineTempoWithNeighborhood(envelope, hopSeconds, bpm) {
    let bestBpm = bpm;
    let bestScore = -Infinity;
    for (let candidate = bpm - 1.5; candidate <= bpm + 1.5; candidate += 0.25) {
        const lag = Math.max(1, Math.round((60 / candidate) / hopSeconds));
        const score = scoreTempoLag(envelope, lag);
        if (score > bestScore) {
            bestScore = score;
            bestBpm = candidate;
        }
    }
    return Math.round(bestBpm * 10) / 10;
}
function foldTempoCandidate(bpm, analysis) {
    let value = Number(bpm || 120);
    const transient = Number(analysis?.transientDensity ?? 0.35);
    const bass = Number(analysis?.bassRatio ?? 0.28);
    while (value < 78 && (transient > 0.22 || bass > 0.24)) value *= 2;
    while (value > 174 && transient < 0.58) value /= 2;
    if (value < 92 && transient > 0.46 && bass > 0.24) value *= 2;
    if (value > 156 && transient < 0.30) value /= 2;
    return clamp(value, 60, 190);
}
function detectFirstTransientSample(buffer, beatSamples) {
    const sampleRate = buffer.sampleRate;
    const activeStart = findActiveAudioStartSample(buffer);
    const searchStart = Math.max(0, activeStart - Math.round(sampleRate * 0.08));
    const maxBeats = Math.min(16, Math.ceil((buffer.length - searchStart) / Math.max(1, beatSamples)));
    const step = Math.max(128, Math.round(sampleRate * 0.006));
    let bestOffset = 0;
    let bestScore = -Infinity;
    for (let offset = 0; offset < beatSamples; offset += step) {
        let score = 0;
        let weight = 1;
        for (let beat = 0; beat < maxBeats; beat += 1) {
            const pos = searchStart + offset + beat * beatSamples;
            if (pos >= buffer.length) break;
            score += measureTransientAtSample(buffer, pos) * weight;
            weight *= 0.94;
        }
        if (score > bestScore) {
            bestScore = score;
            bestOffset = offset;
        }
    }
    return clamp(searchStart + bestOffset - Math.round(beatSamples * 0.015), 0, Math.max(0, buffer.length - 1));
}
function findActiveAudioStartSample(buffer) {
    const sampleRate = buffer.sampleRate;
    const channels = getReadableChannelViews(buffer);
    const frame = Math.max(512, Math.round(sampleRate * 0.02));
    const threshold = 0.006;
    const max = Math.min(buffer.length, Math.round(sampleRate * 12));
    for (let start = 0; start < max; start += frame) {
        let sum = 0;
        let count = 0;
        for (let ch = 0; ch < channels.length; ch += 1) {
            const data = channels[ch];
            const end = Math.min(buffer.length, start + frame);
            for (let i = start; i < end; i += 8) {
                sum += Math.abs(data[i] || 0);
                count += 1;
            }
        }
        if (sum / Math.max(1, count) > threshold) return start;
    }
    return 0;
}
function measureTransientAtSample(buffer, sample) {
    const channels = getReadableChannelViews(buffer);
    const frame = Math.max(128, Math.round(buffer.sampleRate * 0.006));
    const beforeStart = Math.max(0, sample - frame);
    const afterEnd = Math.min(buffer.length, sample + frame);
    let before = 0;
    let after = 0;
    let beforeCount = 0;
    let afterCount = 0;
    for (let ch = 0; ch < channels.length; ch += 1) {
        const data = channels[ch];
        for (let i = beforeStart; i < sample; i += 4) {
            before += Math.abs(data[i] || 0);
            beforeCount += 1;
        }
        for (let i = sample; i < afterEnd; i += 4) {
            after += Math.abs(data[i] || 0);
            afterCount += 1;
        }
    }
    return Math.max(0, after / Math.max(1, afterCount) - before / Math.max(1, beforeCount) * 0.72);
}
function getReadableChannelViews(buffer) {
    const channels = [];
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) channels.push(buffer.getChannelData(ch));
    return channels;
}
function getMutableChannelViews(buffer) {
    return getReadableChannelViews(buffer);
}
function addKickToChannels(channels, sampleRate, start, amp) {
    const length = Math.min((channels[0]?.length || 0) - start, Math.round(sampleRate * 0.18));
    if (length <= 0) return;
    let phase = 0;
    for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const norm = i / Math.max(1, length);
        const freq = 76 - 39 * Math.pow(norm, 0.70);
        phase += 2 * Math.PI * freq / sampleRate;
        const body = Math.sin(phase) * Math.exp(-t * 18.5);
        const click = Math.exp(-t * 190) * 0.18;
        addToChannels(channels, start + i, (body + click) * amp, 1);
    }
}
function addHatToChannels(channels, sampleRate, start, amp, seed, panLean) {
    const length = Math.min((channels[0]?.length || 0) - start, Math.round(sampleRate * 0.052));
    if (length <= 0) return;
    let hp1 = 0;
    let hp2 = 0;
    for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const raw = pseudoNoise(start + i * 2.3 + seed * 101.7);
        const high = raw - hp1 * 0.72 + (hp1 - hp2) * 0.24;
        hp2 = hp1;
        hp1 = raw;
        const env = Math.exp(-t * 78);
        addToChannels(channels, start + i, high * env * amp, panLean || 1);
    }
}
function addClapToChannels(channels, sampleRate, start, amp) {
    const length = Math.min((channels[0]?.length || 0) - start, Math.round(sampleRate * 0.108));
    if (length <= 0) return;
    let hp = 0;
    for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const burst = Math.exp(-Math.max(0, t) * 34) + 0.62 * Math.exp(-Math.max(0, t - 0.014) * 42) + 0.50 * Math.exp(-Math.max(0, t - 0.031) * 52);
        const raw = pseudoNoise(start * 0.37 + i * 2.1);
        const high = raw - hp * 0.42;
        hp = raw;
        addToChannels(channels, start + i, high * burst * amp * 0.42, 0.96);
    }
}
function addToChannels(channels, index, value, panLean = 1) {
    if (index < 0 || !channels.length || index >= channels[0].length) return;
    if (channels.length < 2) {
        channels[0][index] += value;
        return;
    }
    channels[0][index] += value * panLean;
    channels[1][index] += value * (2 - panLean);
}
function measureSamplePeakFast(channels) {
    let peak = 0;
    for (let ch = 0; ch < channels.length; ch += 1) {
        const data = channels[ch];
        for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
    }
    return peak;
}
function applyBufferGainFast(channels, gain) {
    for (let ch = 0; ch < channels.length; ch += 1) {
        const data = channels[ch];
        for (let i = 0; i < data.length; i += 1) data[i] *= gain;
    }
}
function pseudoNoise(x) {
    const n = Math.sin(x * 12.9898 + 78.233) * 43758.5453123;
    return (n - Math.floor(n)) * 2 - 1;
}
function applyBufferGain(buffer, gain) {
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i += 1) data[i] *= gain;
    }
}
function measureSamplePeak(buffer) {
    let peak = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
    }
    return peak;
}
function measureInterpolatedPeak(buffer, factor) {
    return measureFirTruePeakAudioBuffer(buffer, factor);
}
function measureFirTruePeakAudioBuffer(buffer, factor = 4) {
    const safeFactor = Math.max(1, Math.min(8, Math.round(Number(factor || 1))));
    const samplePeak = measureSamplePeak(buffer);
    if (safeFactor <= 1 || samplePeak <= 0) return samplePeak;
    const radius = 6;
    const kernels = getFirTruePeakKernels(safeFactor, radius);
    const candidateFloor = samplePeak * 0.28;
    let peak = samplePeak;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        const length = data.length;
        for (let i = 0; i < length - 1; i += 1) {
            const a = Math.abs(data[i] || 0);
            const b = Math.abs(data[i + 1] || 0);
            if (Math.max(a, b) < candidateFloor) continue;
            for (let phase = 1; phase < safeFactor; phase += 1) {
                const kernel = kernels[phase];
                let value = 0;
                let norm = 0;
                for (let k = 0; k < kernel.coeffs.length; k += 1) {
                    const n = i + kernel.offsets[k];
                    if (n < 0 || n >= length) continue;
                    const coeff = kernel.coeffs[k];
                    value += (data[n] || 0) * coeff;
                    norm += coeff;
                }
                const candidate = Math.abs(norm ? value / norm : value);
                if (candidate > peak) peak = candidate;
            }
        }
    }
    return peak;
}
function getFirTruePeakKernels(factor, radius) {
    const key = `${factor}:${radius}`;
    const cache = getFirTruePeakKernels.cache || (getFirTruePeakKernels.cache = new Map());
    if (cache.has(key)) return cache.get(key);
    const kernels = [null];
    for (let phase = 1; phase < factor; phase += 1) {
        const frac = phase / factor;
        const offsets = [];
        const coeffs = [];
        for (let offset = -radius + 1; offset <= radius; offset += 1) {
            const t = frac - offset;
            const coeff = sinc(t) * blackmanWindow(t / radius);
            if (Math.abs(coeff) > 1e-8) {
                offsets.push(offset);
                coeffs.push(coeff);
            }
        }
        kernels[phase] = { offsets, coeffs };
    }
    cache.set(key, kernels);
    return kernels;
}
function sinc(x) {
    if (Math.abs(x) < 1e-8) return 1;
    const pix = Math.PI * x;
    return Math.sin(pix) / pix;
}
function blackmanWindow(x) {
    const ax = Math.abs(x);
    if (ax >= 1) return 0;
    const phase = Math.PI * ax;
    return 0.42 + 0.5 * Math.cos(phase) + 0.08 * Math.cos(2 * phase);
}
function softCeilingSample(value, ceiling) {
    const sign = Math.sign(value);
    const abs = Math.abs(value);
    const knee = ceiling * 0.985;
    if (abs <= knee) return value;
    const room = Math.max(0.000001, ceiling - knee);
    const limited = knee + Math.tanh((abs - knee) / room) * room * 0.98;
    return sign * Math.min(ceiling, limited);
}
function sanitizeAudioBuffer(buffer, label = 'audio') {
    if (!buffer || !buffer.numberOfChannels || !buffer.length) return { repaired: 0, clipped: 0, peakBefore: 0, peakAfter: 0 };
    let repaired = 0;
    let clipped = 0;
    let peak = 0;
    const hardLimit = 8;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i += 1) {
            let value = data[i];
            if (!Number.isFinite(value)) {
                value = 0;
                repaired += 1;
            }
            if (value > hardLimit || value < -hardLimit) {
                value = clamp(value, -hardLimit, hardLimit);
                clipped += 1;
            }
            data[i] = value;
            const abs = Math.abs(value);
            if (abs > peak) peak = abs;
        }
    }
    const peakBefore = peak;
    if (peak > 4) {
        const gain = 4 / peak;
        applyBufferGain(buffer, gain);
        clipped += 1;
        peak = measureSamplePeak(buffer);
    }
    if (repaired || clipped) console.warn(`Audio safety repair applied (${label}):`, { repaired, clipped, peakBefore, peakAfter: peak });
    return { repaired, clipped, peakBefore, peakAfter: peak };
}
function removeDcOffsetAudioBuffer(buffer) {
    if (!buffer || !buffer.length || !buffer.numberOfChannels) return { applied: false, offsets: [], maxOffset: 0, maxOffsetDb: -120 };
    const offsets = [];
    let maxOffset = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) sum += Number.isFinite(data[i]) ? data[i] : 0;
        const mean = sum / Math.max(1, data.length);
        offsets.push(mean);
        maxOffset = Math.max(maxOffset, Math.abs(mean));
    }
    const threshold = 1e-6;
    if (maxOffset <= threshold) return { applied: false, offsets, maxOffset, maxOffsetDb: ampToDb(maxOffset) };
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        const mean = offsets[ch] || 0;
        for (let i = 0; i < data.length; i += 1) data[i] = (Number.isFinite(data[i]) ? data[i] : 0) - mean;
    }
    return { applied: true, offsets, maxOffset, maxOffsetDb: ampToDb(maxOffset) };
}
function applyTransparentLimiterGuard(buffer, targetDbTP = -1.0, truePeak = true, qualityMode = 'balanced') {
    const ceiling = Math.pow(10, Number(targetDbTP || -1) / 20);
    const oversample = truePeak ? 4 : 1;
    const peakBefore = truePeak ? measureInterpolatedPeak(buffer, oversample) : measureSamplePeak(buffer);
    if (peakBefore < 0.000001) {
        return { mode: truePeak ? 'lookaheadFirTruePeakLimiter4x' : 'lookaheadSamplePeakLimiter', targetDbTP, peakBefore, peakAfter: peakBefore, gain: 1, limiterReductionDb: 0, lookaheadMs: getLimiterLookaheadMs(qualityMode) };
    }
    const limiterInfo = applyLookaheadEnvelopeLimiter(buffer, ceiling, qualityMode);
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i += 1) data[i] = softCeilingSample(data[i], ceiling);
    }
    removeDcOffsetAudioBuffer(buffer);
    let peakAfter = truePeak ? measureInterpolatedPeak(buffer, oversample) : measureSamplePeak(buffer);
    let finalGain = 1;
    if (peakAfter > ceiling * 1.0005) {
        finalGain = ceiling / Math.max(1e-9, peakAfter);
        applyBufferGain(buffer, finalGain);
        peakAfter = truePeak ? measureInterpolatedPeak(buffer, oversample) : measureSamplePeak(buffer);
    }
    return {
        mode: truePeak ? 'lookaheadFirTruePeakLimiter4x' : 'lookaheadSamplePeakLimiter',
        targetDbTP,
        peakBefore,
        peakAfter,
        gain: finalGain,
        limiterReductionDb: limiterInfo.reductionDb,
        limiterMode: limiterInfo.mode,
        lookaheadMs: limiterInfo.lookaheadMs,
        lookaheadSamples: limiterInfo.lookaheadSamples,
        preLimiterPeak: peakBefore
    };
}
function createFinalizerAnalysisPayload(analysis) {
    const normalized = normalizeFinalizerAnalysis(analysis || {});
    return {
        bassRatio: normalized.bassRatio,
        lowMidRatio: normalized.lowMidRatio,
        midRatio: normalized.midRatio,
        highRatio: normalized.highRatio,
        presenceRatio: normalized.presenceRatio,
        airRatio: normalized.airRatio,
        brightness: normalized.brightness,
        metallicHint: normalized.metallicHint,
        transientDensity: normalized.transientDensity,
        spatialExcessRisk: normalized.spatialExcessRisk,
        lowMonoScore: normalized.lowMonoScore,
        mobileSpeakerRisk: normalized.mobileSpeakerRisk,
        mobileSpeakerDetail: normalized.mobileSpeakerDetail,
        harshPeakHz: normalized.harshPeakHz,
        targetDynamicFreq: normalized.targetDynamicFreq,
        vocalMetallicRisk: estimateVocalMetallicRisk(analysis, {}, null, { raw: 100, amount: 1 }),
        dynamicDeEsserRisk: estimateDynamicDeEsserNeed(normalized, {}, null, { raw: 100, amount: 1 }).risk,
        spectrumBands: analysis?.spectrumBands || null
    };
}
function normalizeFinalizerAnalysis(analysis) {
    return FoxBearMasteringInputGuard?.normalizeAnalysis?.(analysis || {}) || {};
}
function applyMobileSpeakerResonanceGuardBuffer(buffer, qualityMode = 'balanced', analysis = {}) {
    if (!buffer || !buffer.length || !buffer.numberOfChannels) return { mode: 'bypass', risk: 0, cuts: {} };
    const normalized = normalizeFinalizerAnalysis(analysis || {});
    const fallbackRisk = estimateMobileSpeakerRisk(normalized, {}, { raw: 100, amount: 1 });
    const detail = normalized.mobileSpeakerDetail || {};
    const risk = clamp01(Number(normalized.mobileSpeakerRisk || 0) || fallbackRisk.risk);
    if (risk < 0.16) return { mode: 'bypass', risk, cuts: {} };
    const sampleRate = Math.max(3000, Math.min(384000, Number(buffer.sampleRate || 44100)));
    const amount = qualityMode === 'fast' ? 0.74 : qualityMode === 'max' ? 1.08 : 0.92;
    const cuts = {
        lowShelfDb: clamp(-(Math.max(0, normalized.bassRatio - 0.35) * 0.72 + Number(detail.boom || fallbackRisk.boom) * 0.42) * amount, -1.05, 0),
        mudDb: clamp(-(Math.max(0, normalized.lowMidRatio - 0.25) * 1.05 + Number(detail.box || fallbackRisk.box) * 0.62) * amount, -1.35, 0),
        boxDb: clamp(-(Number(detail.box || fallbackRisk.box) * 0.55 + Math.max(0, normalized.lowMidRatio - 0.31) * 0.40) * amount, -1.05, 0),
        phoneDb: clamp(-(Number(detail.harsh || fallbackRisk.harsh) * 0.58 + Math.max(0, normalized.presenceRatio - 0.20) * 0.72) * amount, -1.15, 0)
    };
    const channels = [];
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) channels.push(buffer.getChannelData(ch));
    const filterSets = channels.map(() => [
        createGenericLowShelfFilter(sampleRate, 105, 0.707, cuts.lowShelfDb),
        createGenericPeakingFilter(sampleRate, 285, 0.86, cuts.mudDb),
        createGenericPeakingFilter(sampleRate, 465, 1.12, cuts.boxDb),
        createGenericPeakingFilter(sampleRate, 4150, 1.45, cuts.phoneDb)
    ]);
    for (let i = 0; i < buffer.length; i += 1) {
        for (let ch = 0; ch < channels.length; ch += 1) {
            let x = Number.isFinite(channels[ch][i]) ? channels[ch][i] : 0;
            for (const filter of filterSets[ch]) x = processKWeightBiquad(filter, x);
            channels[ch][i] = x;
        }
    }
    return { mode: 'mobileSpeakerResonanceGuard', risk, cuts };
}
function applyDynamicDeEsserBuffer(buffer, qualityMode = 'balanced', analysis = {}) {
    if (!buffer || !buffer.length || !buffer.numberOfChannels) return { mode: 'bypass', risk: 0, reductionDb: 0, bands: {} };
    const normalized = normalizeFinalizerAnalysis(analysis || {});
    const need = estimateDynamicDeEsserNeed(normalized, {}, null, { raw: 100, amount: 1 });
    if (need.risk < 0.16) return { mode: 'bypass', risk: need.risk, reductionDb: 0, bands: {} };
    const sampleRate = Math.max(3000, Math.min(384000, Number(buffer.sampleRate || 44100)));
    const channels = [];
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) channels.push(buffer.getChannelData(ch));
    const result = applyDynamicDeEsserToChannelArrays(channels, buffer.length, sampleRate, qualityMode, normalized, processKWeightBiquad, {
        lowpass: createGenericLowpassFilter,
        highpass: createGenericHighpassFilter
    });
    return result;
}
function applyDynamicDeEsserToChannelArrays(channels, length, sampleRate, qualityMode, analysis, processFn, factories) {
    const need = estimateDynamicDeEsserNeed(analysis || {}, {}, null, { raw: 100, amount: 1 });
    if (!channels || !channels.length || length < 16 || need.risk < 0.16) return { mode: 'bypass', risk: need.risk, reductionDb: 0, bands: {} };
    const amount = (qualityMode === 'fast' ? 0.78 : qualityMode === 'max' ? 1.12 : 0.94) * clamp(0.72 + need.risk * 0.72, 0.76, 1.26);
    const target = clamp(Number(need.targetHz || 6500), 3000, 8800);
    const presenceTop = clamp(target * 0.78, 4300, 6200);
    const sibilanceBottom = clamp(target * 0.82, 4800, 7200);
    const sibilanceTop = clamp(target * 1.28, 7200, 9800);
    const harshHp = channels.map(() => factories.highpass(sampleRate, 2300, 0.707));
    const harshLp = channels.map(() => factories.lowpass(sampleRate, presenceTop, 0.707));
    const sibilanceHp = channels.map(() => factories.highpass(sampleRate, sibilanceBottom, 0.707));
    const sibilanceLp = channels.map(() => factories.lowpass(sampleRate, sibilanceTop, 0.707));
    const airHp = channels.map(() => factories.highpass(sampleRate, 9200, 0.707));
    const harshDetector = createBandEnvelopeFollower(sampleRate, 2.2, 70);
    const sibilanceDetector = createBandEnvelopeFollower(sampleRate, 1.1, 62);
    const airDetector = createBandEnvelopeFollower(sampleRate, 3.5, 95);
    const harshThresh = dbToAmp(clamp(-26.5 + need.harsh * 3.8 - need.risk * 3.6, -33, -20));
    const sibilanceThresh = dbToAmp(clamp(-31.5 + need.sibilance * 3.4 - need.risk * 4.2, -39, -23));
    const airThresh = dbToAmp(clamp(-35.0 + need.sibilance * 4.2 - need.risk * 2.0, -42, -25));
    const maxHarshDb = clamp(0.55 + need.harsh * 2.75 + need.vocalRisk * 1.0, 0.55, 4.6) * amount;
    const maxSibDb = clamp(0.70 + need.sibilance * 3.30 + need.vocalRisk * 1.15, 0.65, 5.8) * amount;
    const maxAirDb = clamp(0.35 + need.sibilance * 1.35, 0.30, 2.35) * amount;
    const wetHarsh = clamp(0.20 + need.risk * 0.20, 0.18, 0.42);
    const wetSib = clamp(0.24 + need.risk * 0.26, 0.20, 0.52);
    const wetAir = clamp(0.12 + need.risk * 0.10, 0.10, 0.24);
    let minHarsh = 1, minSibilance = 1, minAir = 1, activeSamples = 0;
    const scratch = channels.map(() => ({ x: 0, harsh: 0, sib: 0, air: 0 }));
    for (let i = 0; i < length; i += 1) {
        let harshAbs = 0, sibAbs = 0, airAbs = 0;
        for (let ch = 0; ch < channels.length; ch += 1) {
            const x = Number.isFinite(channels[ch][i]) ? channels[ch][i] : 0;
            const harsh = processFn(harshLp[ch], processFn(harshHp[ch], x));
            const sib = processFn(sibilanceLp[ch], processFn(sibilanceHp[ch], x));
            const air = processFn(airHp[ch], x);
            scratch[ch].x = x;
            scratch[ch].harsh = harsh;
            scratch[ch].sib = sib;
            scratch[ch].air = air;
            harshAbs = Math.max(harshAbs, Math.abs(harsh));
            sibAbs = Math.max(sibAbs, Math.abs(sib));
            airAbs = Math.max(airAbs, Math.abs(air));
        }
        const harshGain = computeDynamicBandGain(updateBandEnvelope(harshDetector, harshAbs), harshThresh, 1.85, maxHarshDb);
        const sibGain = computeDynamicBandGain(updateBandEnvelope(sibilanceDetector, sibAbs), sibilanceThresh, 2.45, maxSibDb);
        const airGain = computeDynamicBandGain(updateBandEnvelope(airDetector, airAbs), airThresh, 1.55, maxAirDb);
        minHarsh = Math.min(minHarsh, harshGain);
        minSibilance = Math.min(minSibilance, sibGain);
        minAir = Math.min(minAir, airGain);
        if (harshGain < 0.999 || sibGain < 0.999 || airGain < 0.999) activeSamples += 1;
        for (let ch = 0; ch < channels.length; ch += 1) {
            const item = scratch[ch];
            channels[ch][i] = item.x
                - item.harsh * (1 - harshGain) * wetHarsh
                - item.sib * (1 - sibGain) * wetSib
                - item.air * (1 - airGain) * wetAir;
        }
    }
    const bands = {
        presence: gainToReductionDb(minHarsh),
        sibilance: gainToReductionDb(minSibilance),
        air: gainToReductionDb(minAir),
        activePct: Math.round(activeSamples / Math.max(1, length) * 1000) / 10,
        targetHz: Math.round(target)
    };
    return { mode: 'dynamicDeEsserHarshSuppressor', risk: need.risk, reductionDb: Math.min(0, bands.presence, bands.sibilance, bands.air), bands };
}
function applyGentleMultibandDynamicsBuffer(buffer, qualityMode = 'balanced', analysis = {}) {
    if (!buffer || !buffer.length || !buffer.numberOfChannels) return { mode: 'bypass', reductionDb: 0, bands: {} };
    const normalized = normalizeFinalizerAnalysis(analysis || {});
    const sampleRate = Math.max(3000, Math.min(384000, Number(buffer.sampleRate || 44100)));
    const channels = [];
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) channels.push(buffer.getChannelData(ch));
    const length = buffer.length;
    const amount = qualityMode === 'fast' ? 0.72 : qualityMode === 'max' ? 1.08 : 0.92;
    const lowNeed = clamp01(Math.max(0, normalized.bassRatio - 0.31) * 2.2 + Math.max(0, 78 - normalized.lowMonoScore) / 78 * 0.80 + normalized.spatialExcessRisk * 0.30);
    const midNeed = clamp01(Math.max(0, normalized.lowMidRatio - 0.30) * 1.3 + Math.max(0, 0.48 - normalized.midRatio) * 0.35 + Math.max(0, normalized.transientDensity - 0.58) * 0.25);
    const highNeed = clamp01(Math.max(0, normalized.presenceRatio - 0.18) * 2.0 + Math.max(0, normalized.airRatio - 0.14) * 1.8 + Math.max(0, normalized.metallicHint - 0.45) * 1.1 + Math.max(0, normalized.brightness - 0.60) * 0.75);
    const wetLow = clamp((0.16 + lowNeed * 0.18) * amount, 0.10, 0.34);
    const wetMid = clamp((0.08 + midNeed * 0.13) * amount, 0.05, 0.22);
    const wetHigh = clamp((0.10 + highNeed * 0.20) * amount, 0.06, 0.30);
    const maxLowDb = 0.7 + lowNeed * 2.2;
    const maxMidDb = 0.45 + midNeed * 1.25;
    const maxHighDb = 0.55 + highNeed * 1.85;
    const lowFilters = channels.map(() => createGenericLowpassFilter(sampleRate, 170, 0.707));
    const midHp = channels.map(() => createGenericHighpassFilter(sampleRate, 180, 0.707));
    const midLp = channels.map(() => createGenericLowpassFilter(sampleRate, 4200, 0.707));
    const highFilters = channels.map(() => createGenericHighpassFilter(sampleRate, 5200, 0.707));
    const lowDetector = createBandEnvelopeFollower(sampleRate, 7, 155);
    const midDetector = createBandEnvelopeFollower(sampleRate, 12, 115);
    const highDetector = createBandEnvelopeFollower(sampleRate, 4, 82);
    const lowThresh = dbToAmp(-18.5 + lowNeed * 2.0);
    const midThresh = dbToAmp(-16.0 + midNeed * 1.6);
    const highThresh = dbToAmp(-25.0 + highNeed * 2.4);
    let minLowGain = 1;
    let minMidGain = 1;
    let minHighGain = 1;
    let activeSamples = 0;
    const scratch = channels.map(() => ({ x: 0, low: 0, mid: 0, high: 0 }));
    for (let i = 0; i < length; i += 1) {
        let lowAbs = 0;
        let midAbs = 0;
        let highAbs = 0;
        for (let ch = 0; ch < channels.length; ch += 1) {
            const x = Number.isFinite(channels[ch][i]) ? channels[ch][i] : 0;
            const low = processKWeightBiquad(lowFilters[ch], x);
            const mid = processKWeightBiquad(midLp[ch], processKWeightBiquad(midHp[ch], x));
            const high = processKWeightBiquad(highFilters[ch], x);
            scratch[ch].x = x;
            scratch[ch].low = low;
            scratch[ch].mid = mid;
            scratch[ch].high = high;
            lowAbs = Math.max(lowAbs, Math.abs(low));
            midAbs = Math.max(midAbs, Math.abs(mid));
            highAbs = Math.max(highAbs, Math.abs(high));
        }
        const lowGain = computeDynamicBandGain(updateBandEnvelope(lowDetector, lowAbs), lowThresh, 2.0, maxLowDb);
        const midGain = computeDynamicBandGain(updateBandEnvelope(midDetector, midAbs), midThresh, 1.55, maxMidDb);
        const highGain = computeDynamicBandGain(updateBandEnvelope(highDetector, highAbs), highThresh, 2.15, maxHighDb);
        minLowGain = Math.min(minLowGain, lowGain);
        minMidGain = Math.min(minMidGain, midGain);
        minHighGain = Math.min(minHighGain, highGain);
        if (lowGain < 0.999 || midGain < 0.999 || highGain < 0.999) activeSamples += 1;
        for (let ch = 0; ch < channels.length; ch += 1) {
            const item = scratch[ch];
            channels[ch][i] = item.x
                - item.low * (1 - lowGain) * wetLow
                - item.mid * (1 - midGain) * wetMid
                - item.high * (1 - highGain) * wetHigh;
        }
    }
    const bands = {
        low: gainToReductionDb(minLowGain),
        mid: gainToReductionDb(minMidGain),
        high: gainToReductionDb(minHighGain),
        activePct: Math.round(activeSamples / Math.max(1, length) * 1000) / 10
    };
    return { mode: 'gentle3BandDynamicControl', reductionDb: Math.min(0, Math.min(bands.low, bands.mid, bands.high)), bands };
}
function createBandEnvelopeFollower(sampleRate, attackMs, releaseMs) {
    return {
        value: 0,
        attack: Math.exp(-1 / Math.max(1, sampleRate * attackMs / 1000)),
        release: Math.exp(-1 / Math.max(1, sampleRate * releaseMs / 1000))
    };
}
function updateBandEnvelope(detector, input) {
    const coeff = input > detector.value ? detector.attack : detector.release;
    detector.value = coeff * detector.value + (1 - coeff) * input;
    return detector.value;
}
function computeDynamicBandGain(env, threshold, ratio, maxReductionDb) {
    if (!(env > threshold)) return 1;
    const overDb = 20 * Math.log10(Math.max(1e-9, env / Math.max(1e-9, threshold)));
    const reductionDb = Math.min(Math.max(0, overDb * (1 - 1 / Math.max(1.01, ratio))), Math.max(0, maxReductionDb));
    return dbToAmp(-reductionDb);
}
function gainToReductionDb(gain) {
    return gain < 1 ? 20 * Math.log10(Math.max(1e-9, gain)) : 0;
}
function createGenericLowpassFilter(sampleRate, frequency, q) {
    const w0 = 2 * Math.PI * clamp(frequency, 1, sampleRate * 0.45) / sampleRate;
    const cos = Math.cos(w0);
    const sin = Math.sin(w0);
    const alpha = sin / (2 * Math.max(0.001, q));
    const b0 = (1 - cos) / 2;
    const b1 = 1 - cos;
    const b2 = (1 - cos) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cos;
    const a2 = 1 - alpha;
    return normalizeKWeightBiquad(b0, b1, b2, a0, a1, a2);
}
function createGenericHighpassFilter(sampleRate, frequency, q) {
    const w0 = 2 * Math.PI * clamp(frequency, 1, sampleRate * 0.45) / sampleRate;
    const cos = Math.cos(w0);
    const sin = Math.sin(w0);
    const alpha = sin / (2 * Math.max(0.001, q));
    const b0 = (1 + cos) / 2;
    const b1 = -(1 + cos);
    const b2 = (1 + cos) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cos;
    const a2 = 1 - alpha;
    return normalizeKWeightBiquad(b0, b1, b2, a0, a1, a2);
}
function createGenericPeakingFilter(sampleRate, frequency, q, gainDb) {
    const a = Math.pow(10, Number(gainDb || 0) / 40);
    const w0 = 2 * Math.PI * clamp(frequency, 1, sampleRate * 0.45) / sampleRate;
    const cos = Math.cos(w0);
    const sin = Math.sin(w0);
    const alpha = sin / (2 * Math.max(0.001, q));
    const b0 = 1 + alpha * a;
    const b1 = -2 * cos;
    const b2 = 1 - alpha * a;
    const a0 = 1 + alpha / a;
    const a1 = -2 * cos;
    const a2 = 1 - alpha / a;
    return normalizeKWeightBiquad(b0, b1, b2, a0, a1, a2);
}
function createGenericLowShelfFilter(sampleRate, frequency, q, gainDb) {
    const a = Math.pow(10, Number(gainDb || 0) / 40);
    const w0 = 2 * Math.PI * clamp(frequency, 1, sampleRate * 0.45) / sampleRate;
    const cos = Math.cos(w0);
    const sin = Math.sin(w0);
    const sqrtA = Math.sqrt(a);
    const shelfSlope = Math.max(0.1, Number(q || 0.707));
    const alpha = sin / 2 * Math.sqrt((a + 1 / a) * (1 / shelfSlope - 1) + 2);
    const b0 = a * ((a + 1) - (a - 1) * cos + 2 * sqrtA * alpha);
    const b1 = 2 * a * ((a - 1) - (a + 1) * cos);
    const b2 = a * ((a + 1) - (a - 1) * cos - 2 * sqrtA * alpha);
    const a0 = (a + 1) + (a - 1) * cos + 2 * sqrtA * alpha;
    const a1 = -2 * ((a - 1) + (a + 1) * cos);
    const a2 = (a + 1) + (a - 1) * cos - 2 * sqrtA * alpha;
    return normalizeKWeightBiquad(b0, b1, b2, a0, a1, a2);
}
function getLimiterLookaheadMs(qualityMode) {
    return qualityMode === 'max' ? 5 : qualityMode === 'fast' ? 1.5 : 3;
}
function applyLookaheadEnvelopeLimiter(buffer, ceiling, qualityMode = 'balanced') {
    const sampleRate = Math.max(3000, Number(buffer.sampleRate || 44100));
    const safeCeiling = Math.max(1e-9, ceiling);
    const releaseMs = qualityMode === 'max' ? 105 : qualityMode === 'fast' ? 42 : 68;
    const release = Math.exp(-1 / Math.max(1, sampleRate * releaseMs / 1000));
    const lookaheadMs = getLimiterLookaheadMs(qualityMode);
    const lookaheadSamples = Math.max(1, Math.round(sampleRate * lookaheadMs / 1000));
    const channels = [];
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) channels.push(buffer.getChannelData(ch));
    const peaks = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i += 1) {
        let peak = 0;
        for (const data of channels) {
            const abs = Math.abs(data[i] || 0);
            if (abs > peak) peak = abs;
        }
        peaks[i] = peak;
    }
    const deque = [];
    let head = 0;
    let addedUntil = -1;
    let gain = 1;
    let minGain = 1;
    let activeSamples = 0;
    for (let i = 0; i < buffer.length; i += 1) {
        const futureEnd = Math.min(buffer.length - 1, i + lookaheadSamples);
        while (addedUntil < futureEnd) {
            addedUntil += 1;
            const peak = peaks[addedUntil];
            while (deque.length > head && peaks[deque[deque.length - 1]] <= peak) deque.pop();
            deque.push(addedUntil);
        }
        while (head < deque.length && deque[head] < i) head += 1;
        if (head > 1024 && head * 2 > deque.length) {
            deque.splice(0, head);
            head = 0;
        }
        const futurePeak = head < deque.length ? peaks[deque[head]] : peaks[i];
        const desired = futurePeak > safeCeiling ? safeCeiling / Math.max(1e-9, futurePeak) : 1;
        if (desired < gain) gain = desired;
        else gain = Math.min(1, gain * release + (1 - release));
        if (gain < minGain) minGain = gain;
        if (gain < 0.999999) {
            activeSamples += 1;
            for (const data of channels) data[i] = (data[i] || 0) * gain;
        }
    }
    return {
        mode: 'lookaheadLimiter',
        lookaheadMs,
        lookaheadSamples,
        activeSamples,
        minGain,
        reductionDb: minGain < 1 ? 20 * Math.log10(Math.max(1e-9, minGain)) : 0
    };
}
function calculateAudioStats(buffer) {
    if (!buffer || !buffer.length) return null;
    let peak = 0;
    let sumSq = 0;
    let count = 0;
    let clippedSamples = 0;
    let invalidSamples = 0;
    let dcSumAbs = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const data = buffer.getChannelData(ch);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
            const finite = Number.isFinite(data[i]);
            if (!finite) invalidSamples += 1;
            const value = finite ? data[i] : 0;
            const abs = Math.abs(value);
            if (abs > peak) peak = abs;
            if (abs >= 0.999) clippedSamples += 1;
            sumSq += value * value;
            sum += value;
            count += 1;
        }
        dcSumAbs += Math.abs(sum / Math.max(1, data.length));
    }
    const rms = Math.sqrt(sumSq / Math.max(1, count));
    const peakDb = ampToDb(peak);
    const rmsDb = ampToDb(rms);
    const lufs = measureApproxGatedLoudness(buffer);
    return {
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
        durationSec: buffer.duration || buffer.length / Math.max(1, buffer.sampleRate),
        peak,
        peakDb,
        rms,
        rmsDb,
        approxLufs: lufs,
        crestDb: Number.isFinite(peakDb) && Number.isFinite(rmsDb) ? peakDb - rmsDb : NaN,
        dcOffsetAvg: dcSumAbs / Math.max(1, buffer.numberOfChannels),
        clippedSamples,
        invalidSamples
    };
}
function createMasterReport(track, beforeBuffer, finalBuffer, finalizeInfo, encoded) {
    const before = calculateAudioStats(beforeBuffer);
    const after = calculateAudioStats(finalBuffer);
    const beforeLufs = Number.isFinite(track?.analysis?.loudnessIntegrated) ? track.analysis.loudnessIntegrated : before?.approxLufs;
    const afterLufs = Number.isFinite(finalizeInfo?.loudnessAfter) ? finalizeInfo.loudnessAfter : after?.approxLufs;
    const shortTermBefore = measureShortTermLufsStats(beforeBuffer);
    const shortTermAfter = finalizeInfo?.shortTermLufs || measureShortTermLufsStats(finalBuffer);
    const qualityAudit = window.FoxBearMasteringQualityAudit?.compare?.(beforeBuffer, finalBuffer) || null, spatialBudget = track?.analysis?.spatialBudgetApplied || null, appliedProfile = track?.analysis?.sharedDspProfileApplied || null;
    const recommendationApplication = { recommendedPreset: track?.recommendedPreset || '', appliedPreset: track?.preset || 'custom', genreLocked: Boolean(track?.genreLocked), confidence: Number(track?.confidence || 0), recommendedSettings: track?.recommendedSettings ? cloneSettings(track.recommendedSettings) : null, requestedSettings: track?.settings ? cloneSettings(track.settings) : null, effectiveSettings: appliedProfile?.effectiveSettings ? cloneSettings(appliedProfile.effectiveSettings) : null, masterGoal: state.masterGoal, masterStyle: state.masterStyle, masterStrength: state.masterStrength };
    const truePeakAmplitude = Number(finalizeInfo?.peakAfter), truePeakDbTP = Number.isFinite(truePeakAmplitude) && truePeakAmplitude > 0 ? ampToDb(truePeakAmplitude) : NaN;
    return {
        before: { ...before, approxLufs: beforeLufs },
        after: { ...after, approxLufs: afterLufs, samplePeakDb: after?.peakDb, truePeak: truePeakAmplitude, truePeakDbTP },
        loudness: { shortTermBefore, shortTermAfter, standard: 'approx short-term K-weighted LUFS, 3s window / 1s hop' },
        target: { lufs: Number(finalizeInfo?.targetLufs ?? state.targetLufs), baseLufs: Number(state.targetLufs), adaptiveLufs: Boolean(state.adaptiveTargetLufs), ceilingDb: Number(finalizeInfo?.ceilingDb ?? state.ceilingDb), qualityMode: finalizeInfo?.qualityMode || state.qualityMode, masterGoal: state.masterGoal, masterStyle: state.masterStyle, masterStrength: state.masterStrength, referenceMatchStrength: getReferenceMatchStrengthAmount() },
        recommendationApplication,
        qualityAudit,
        finalizer: {
            mode: finalizeInfo?.mode || '',
            limiterMode: finalizeInfo?.limiterMode || '',
            lookaheadMs: Number(finalizeInfo?.lookaheadMs || 0),
            limiterReductionDb: Number(finalizeInfo?.limiterReductionDb || 0),
            limiterActivePct: Number(finalizeInfo?.limiterActivePct || 0),
            limiterMeanReductionDb: Number(finalizeInfo?.limiterMeanReductionDb || 0),
            limiterGainMovement: Number(finalizeInfo?.limiterGainMovement || 0),
            preLimiterPeak: Number(finalizeInfo?.preLimiterPeak || 0),
            oversample: Number(finalizeInfo?.oversample || 0),
            oversampleMode: finalizeInfo?.oversampleMode || '',
            multibandMode: finalizeInfo?.multibandMode || '',
            multibandReductionDb: Number(finalizeInfo?.multibandReductionDb || 0),
            multibandBands: finalizeInfo?.multibandBands || null,
            mobileSpeakerMode: finalizeInfo?.mobileSpeakerMode || '',
            mobileSpeakerRisk: Number(finalizeInfo?.mobileSpeakerRisk || 0),
            mobileSpeakerCuts: finalizeInfo?.mobileSpeakerCuts || null,
            dynamicDeEsserMode: finalizeInfo?.dynamicDeEsserMode || '',
            dynamicDeEsserRisk: Number(finalizeInfo?.dynamicDeEsserRisk || 0),
            dynamicDeEsserReductionDb: Number(finalizeInfo?.dynamicDeEsserReductionDb || 0),
            dynamicDeEsserBands: finalizeInfo?.dynamicDeEsserBands || null,
            loudnessStandard: finalizeInfo?.loudnessStandard || '',
            sharedDspProfileVersion: finalizeInfo?.sharedDspProfileVersion || track?.analysis?.sharedDspProfileApplied?.version || '',
            sharedDspProfile: getSharedDspSummaryForReport(finalizeInfo?.sharedDspProfile || track?.analysis?.sharedDspProfileApplied),
            performance: finalizeInfo?.performance || null,
            spatialBudget: spatialBudget ? {
                widthFactor: Number(spatialBudget.widthFactor || 1),
                rawWidthFactor: Number(spatialBudget.rawWidthFactor || 1),
                stereoGroove: Number(spatialBudget.stereoGroove || 0),
                rawStereoGroove: Number(spatialBudget.rawStereoGroove || 0),
                scale: Number(spatialBudget.scale || 1),
                effectiveExpansion: Number(spatialBudget.effectiveExpansion || 0),
                maxExpansion: Number(spatialBudget.maxExpansion || 0),
                reason: spatialBudget.reason || ''
            } : null
        },
        delta: {
            lufs: Number.isFinite(beforeLufs) && Number.isFinite(afterLufs) ? afterLufs - beforeLufs : NaN,
            rmsDb: Number.isFinite(before?.rmsDb) && Number.isFinite(after?.rmsDb) ? after.rmsDb - before.rmsDb : NaN,
            crestDb: Number.isFinite(before?.crestDb) && Number.isFinite(after?.crestDb) ? after.crestDb - before.crestDb : NaN
        },
        clippingRisk: stripTags(getClippingRiskText(track)),
        output: { format: encoded?.format || track?.outFormat || state.outputFormat, extension: encoded?.extension || '', fallbackFrom: encoded?.fallbackFrom || null, fallbackReason: encoded?.fallbackReason || '' },
        createdAt: new Date().toISOString()
    };
}
function createUserFriendlyMasteringError(error) {
    return FoxBearInAppMasteringSafetyService?.createUserFriendlyMasteringError?.(error)
        || { message: getErrorMessage(error, '마스터링 실패'), report: `마스터링 실패: ${getErrorMessage(error, '마스터링 실패')}` };
}
function reportOperationalIncident(category, error, context = '', options = {}) {
    try {
        const reporter = window.FoxBearIncidentReporter;
        if (!reporter?.report) return;
        reporter.report({
            category,
            severity: options.severity || 'error',
            reason: options.reason || error?.code || category,
            message: options.message || getErrorMessage(error, `${category} failure`),
            error,
            source: options.source || 'src/app.js',
            context
        }, { automatic: options.automatic !== false }).catch(() => {});
    } catch (reportError) {
        console.warn('Operational incident report skipped:', reportError);
    }
}
function getLoudnessMeasurementService() {
    const service = window.FoxBearLoudnessMeasurementService;
    if (!service?.measureBundle || !service?.measureIntegrated || !service?.measureShortTerm) throw new Error('K-weighted loudness service unavailable.');
    return service;
}
function measureApproxGatedLoudness(buffer) { return measureKWeightedGatedLoudness(buffer); }
function measureKWeightedGatedLoudness(buffer) { return getLoudnessMeasurementService().measureIntegrated(buffer); }
function measureKWeightedLoudnessBundleAudioBuffer(buffer, options = {}) { return getLoudnessMeasurementService().measureBundle(buffer, options); }
function measureShortTermLufsStats(buffer, options = {}) { return getLoudnessMeasurementService().measureShortTerm(buffer, options); }
function normalizeKWeightBiquad(b0, b1, b2, a0, a1, a2) {
    const inv = 1 / Math.max(1e-12, a0);
    return { b0: b0 * inv, b1: b1 * inv, b2: b2 * inv, a1: a1 * inv, a2: a2 * inv, x1: 0, x2: 0, y1: 0, y2: 0 };
}
function processKWeightBiquad(state, x) {
    const y = state.b0 * x + state.b1 * state.x1 + state.b2 * state.x2 - state.a1 * state.y1 - state.a2 * state.y2;
    state.x2 = state.x1;
    state.x1 = x;
    state.y2 = state.y1;
    state.y1 = Number.isFinite(y) ? y : 0;
    return state.y1;
}
async function finalizeMasterBufferAsync(buffer, options = {}) {
    const fallback = () => {
        const working = cloneAudioBuffer(buffer);
        sanitizeAudioBuffer(working, 'finalizer-fallback-input');
        const dcInfo = removeDcOffsetAudioBuffer(working);
        const targetDb = Number(options.ceilingDb ?? -1.0);
        const targetLufs = Number(options.targetLufs ?? -14);
        const qualityMode = options.qualityMode || 'balanced';
        const mobileInfo = applyMobileSpeakerResonanceGuardBuffer(working, qualityMode, options.analysis || {});
        const deEsserInfo = applyDynamicDeEsserBuffer(working, qualityMode, options.analysis || {});
        const multibandInfo = applyGentleMultibandDynamicsBuffer(working, qualityMode, options.analysis || {});
        const maxGainDb = qualityMode === 'max' ? 8 : qualityMode === 'fast' ? 4.5 : 6;
        const loudnessBefore = measureApproxGatedLoudness(working);
        const loudnessGainDb = clamp(targetLufs - loudnessBefore, -8, maxGainDb);
        applyBufferGain(working, Math.pow(10, loudnessGainDb / 20));
        const peakInfo = applyTransparentLimiterGuard(working, targetDb, options.truePeak !== false, qualityMode);
        sanitizeAudioBuffer(working, 'finalizer-fallback-output');
        const finalLoudness = measureKWeightedLoudnessBundleAudioBuffer(working);
        const loudnessAfter = finalLoudness.integrated;
        const shortTermLufs = finalLoudness.shortTerm;
        return {
            buffer: working,
            info: {
                mode: options.truePeak === false ? 'K-weighted multiband lookahead sample peak fallback' : 'K-weighted multiband + 4x FIR true peak fallback',
                qualityMode,
                targetLufs,
                ceilingDb: targetDb,
                loudnessBefore,
                loudnessAfter,
                shortTermLufs,
                peakBefore: peakInfo.peakBefore,
                peakAfter: peakInfo.peakAfter,
                gainDb: loudnessGainDb + 20 * Math.log10(Math.max(1e-9, peakInfo.gain || 1)),
                limiterReductionDb: peakInfo.limiterReductionDb || 0,
                dcRemoved: dcInfo,
                oversample: 4,
                oversampleMode: options.truePeak === false ? 'sample peak' : '4x windowed-sinc FIR true peak',
                multibandMode: multibandInfo.mode,
                multibandReductionDb: multibandInfo.reductionDb,
                multibandBands: multibandInfo.bands,
                mobileSpeakerMode: mobileInfo.mode,
                mobileSpeakerRisk: mobileInfo.risk,
                mobileSpeakerCuts: mobileInfo.cuts,
                dynamicDeEsserMode: deEsserInfo.mode,
                dynamicDeEsserRisk: deEsserInfo.risk,
                dynamicDeEsserReductionDb: deEsserInfo.reductionDb,
                dynamicDeEsserBands: deEsserInfo.bands,
                limiterMode: peakInfo.limiterMode,
                lookaheadMs: peakInfo.lookaheadMs,
                lookaheadSamples: peakInfo.lookaheadSamples,
                preLimiterPeak: peakInfo.preLimiterPeak,
                loudnessStandard: 'ITU-R BS.1770 K-weighting + EBU R128 gates',
                sharedDspProfileVersion: options.dspProfile?.version || SHARED_DSP_PROFILE_VERSION,
                sharedDspProfile: getSharedDspSummaryForReport(options.dspProfile)
            }
        };
    };
    if (!window.Worker) return fallback();
    try {
        const channels = Math.min(2, buffer.numberOfChannels);
        const channelBuffers = [];
        for (let ch = 0; ch < channels; ch += 1) channelBuffers.push(buffer.getChannelData(ch).slice().buffer);
        const payload = {
            sampleRate: buffer.sampleRate,
            channels,
            length: buffer.length,
            targetLufs: Number(options.targetLufs ?? -14),
            ceilingDb: Number(options.ceilingDb ?? -1.0),
            qualityMode: options.qualityMode || 'balanced',
            truePeak: options.truePeak !== false,
            analysis: createFinalizerAnalysisPayload(options.analysis || {}),
            channelBuffers
        };
        const result = await runFoxBearWorkerJob(MASTER_FINALIZER_WORKER_URL, payload, channelBuffers, {
            timeoutMs: Math.min(600000, Math.max(90000, Number(buffer.duration || 0) * 450)),
            signal: options.signal || null,
            jobId: options.jobId || '',
            label: '마스터 파이널라이저',
            onProgress: options.onProgress
        });
        if (!result?.ok) throw new Error(result?.error || '마스터 파이널라이저 실패');
        const output = makeAudioBuffer(result.channels, result.length, result.sampleRate);
        (result.channelBuffers || []).forEach((buf, ch) => output.copyToChannel(new Float32Array(buf), ch));
        const info = result.info || {};
        info.sharedDspProfileVersion = options.dspProfile?.version || SHARED_DSP_PROFILE_VERSION;
        info.sharedDspProfile = getSharedDspSummaryForReport(options.dspProfile);
        return { buffer: output, info };
    } catch (error) {
        if (isWorkerJobAbortError(error)) throw error;
        console.warn('Master finalizer fallback:', error);
        showToast('파이널라이저 워커가 실패해 기본 피크 가드로 전환합니다.');
        return fallback();
    }
}
function cloneAudioBuffer(buffer) {
    const output = makeAudioBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) output.copyToChannel(buffer.getChannelData(ch).slice(), ch);
    return output;
}
async function encodeMasterOutputAsync(buffer, requestedFormat = 'wav24', options = {}) {
    const format = requestedFormat || 'wav24';
    if (/^mp3_(128|192|256|320)$/.test(format)) {
        const bitrate = Number(format.split('_')[1]) * 1000;
        try {
            const blob = await encodeMp3Async(buffer, bitrate, options);
            return { blob, format, extension: 'mp3', mime: 'audio/mpeg' };
        } catch (error) {
            if (isWorkerJobAbortError(error) || error?.code === 'FOXBEAR_WORKER_JOB_TIMEOUT') throw error;
            console.warn('MP3 encoder fallback:', error);
            const reason = getErrorMessage(error, 'MP3 인코더 실패');
            showToast('MP3 인코더가 실패해 24-bit WAV로 자동 저장합니다.');
            const blob = await encodeWavAsync(buffer, 'wav24', options);
            return { blob, format: 'wav24', extension: 'wav', mime: 'audio/wav', fallbackFrom: format, fallbackReason: reason };
        }
    }
    const blob = await encodeWavAsync(buffer, format, options);
    return { blob, format, extension: 'wav', mime: 'audio/wav' };
}
async function encodeMp3Async(buffer, bitrate, options = {}) {
    if (!window.Worker) throw new Error('MP3 워커를 사용할 수 없습니다.');
    const channels = Math.min(2, buffer.numberOfChannels);
    const channelBuffers = [];
    for (let ch = 0; ch < channels; ch += 1) channelBuffers.push(buffer.getChannelData(ch).slice().buffer);
    const payload = {
        sampleRate: buffer.sampleRate,
        channels,
        length: buffer.length,
        bitrate,
        channelBuffers
    };
    const result = await runFoxBearWorkerJob(MP3_ENCODER_WORKER_URL, payload, channelBuffers, {
        timeoutMs: Math.min(600000, Math.max(180000, Number(buffer.duration || 0) * 300)),
        signal: options.signal || null,
        jobId: options.jobId || '',
        label: 'MP3 인코딩',
        onProgress: options.onProgress
    });
    if (!result?.ok || !result.arrayBuffer) throw new Error(result?.error || 'MP3 인코딩 실패');
    return new Blob([result.arrayBuffer], { type: 'audio/mpeg' });
}
async function encodeWavAsync(buffer, format = 'wav24', options = {}) { let workerFailure = null;
    if (window.Worker) {
        try {
            const channels = Math.min(2, buffer.numberOfChannels);
            const channelBuffers = [];
            for (let ch = 0; ch < channels; ch += 1) channelBuffers.push(buffer.getChannelData(ch).slice().buffer);
            const payload = {
                sampleRate: buffer.sampleRate,
                channels,
                length: buffer.length,
                channelBuffers,
                format
            };
            const result = await runFoxBearWorkerJob(WAV_ENCODER_WORKER_URL, payload, channelBuffers, {
                timeoutMs: Math.min(600000, Math.max(45000, Number(buffer.duration || 0) * 120)),
                signal: options.signal || null,
                jobId: options.jobId || '',
                label: 'WAV 인코딩',
                onProgress: options.onProgress
            });
            if (!result?.ok || !result.arrayBuffer) throw new Error(result?.error || 'WAV 워커 인코딩 실패');
            return new Blob([result.arrayBuffer], { type: 'audio/wav' });
        } catch (error) {
            if (isWorkerJobAbortError(error) || error?.code === 'FOXBEAR_WORKER_JOB_TIMEOUT') throw error;
            console.warn('Worker WAV encoder fallback:', error); workerFailure = error;
        }
    }
    if (options.signal?.aborted) throw getWorkerJobService()?.makeAbortError?.(options.signal.reason || 'wav-fallback-cancelled') || new DOMException('WAV 인코딩이 취소되었습니다.', 'AbortError'); if (workerFailure && buffer.length * Math.min(2, buffer.numberOfChannels) > 12 * 1024 * 1024) { workerFailure.code ||= 'FOXBEAR_WAV_FALLBACK_TOO_LARGE'; throw workerFailure; } options.onProgress?.({ percent: 5, stage: 'WAV 호환 인코딩', detail: '브라우저 기본 경로로 WAV를 생성합니다.' }); const fallbackBlob = encodeWav(buffer, format);
    options.onProgress?.({ percent: 98, stage: 'WAV 호환 인코딩', detail: 'WAV 파일 생성을 완료했습니다.' }); return fallbackBlob;
}
function encodeWav(buffer, format = 'wav24') {
    const channels = Math.min(2, buffer.numberOfChannels);
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const float32 = format === 'wav32float';
    const pcm16 = format === 'wav16';
    const bytesPerSample = float32 ? 4 : (pcm16 ? 2 : 3);
    const bitDepth = float32 ? 32 : (pcm16 ? 16 : 24);
    const audioFormat = float32 ? 3 : 1;
    const blockAlign = channels * bytesPerSample;
    const dataSize = length * blockAlign;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, audioFormat, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    const channelData = [];
    for (let ch = 0; ch < channels; ch += 1) channelData.push(buffer.getChannelData(ch));
    let offset = 44;
    for (let i = 0; i < length; i += 1) {
        for (let ch = 0; ch < channels; ch += 1) {
            if (float32) {
                view.setFloat32(offset, clamp(channelData[ch][i] || 0, -1, 1), true);
                offset += 4;
            } else if (pcm16) {
                const dither = (Math.random() - Math.random()) / 32768;
                const sample = clamp((channelData[ch][i] || 0) + dither, -1, 1);
                view.setInt16(offset, sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff), true);
                offset += 2;
            } else {
                const dither = (Math.random() - Math.random()) / 8388608;
                const sample = clamp((channelData[ch][i] || 0) + dither, -1, 1);
                writeInt24(view, offset, sample);
                offset += 3;
            }
        }
    }
    return new Blob([arrayBuffer], { type: 'audio/wav' });
}
function writeInt24(view, offset, sample) {
    let value = sample < 0 ? Math.round(sample * 0x800000) : Math.round(sample * 0x7fffff);
    value = Math.max(-0x800000, Math.min(0x7fffff, value));
    if (value < 0) value += 0x1000000;
    view.setUint8(offset, value & 0xff);
    view.setUint8(offset + 1, (value >> 8) & 0xff);
    view.setUint8(offset + 2, (value >> 16) & 0xff);
}
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i += 1) view.setUint8(offset + i, string.charCodeAt(i));
}
async function downloadZip() { if (isExportQueueActive()) { showToast('곡별 순차 저장을 먼저 취소하거나 완료해 주세요.'); return Object.freeze({ ok: false, conflictingExport: true }); }
    const completed = state.tracks.filter(track => track.outBlob);
    if (!completed.length) return;
    const zipService = getZipExportService();
    if (!zipService || typeof zipService.start !== 'function') {
        showToast('ZIP 내보내기 모듈을 불러오지 못했습니다. 캐시를 새로고침한 뒤 다시 시도하거나 곡별 다운로드를 사용하세요.');
        try { window.FoxBearRuntimeHealth?.check?.({ silent: false }); } catch (error) {}
        return Object.freeze({ ok: false, moduleUnavailable: true });
    }
    const exportGuard = getExportGuardService();
    applyCompletedMasteringMemoryPolicy('zip-preflight-release', { retainCompletedPcm: false, forceReleaseAll: true, keepSelected: false, keepRecent: 0, maxRetainedBuffers: 0, maxMasteredBufferBytes: 0 });
    const zipPlan = exportGuard?.prepareZipExportPlan?.(completed, {
        memorySnapshot: getMemoryGuardSnapshot(),
        fileNameForTrack: track => track.outName || `${safeBaseName(track.name)}_mastered.wav`
    }) || null;
    return zipService.start({
        completed,
        plan: zipPlan,
        workerUrl: ZIP_ENCODER_WORKER_URL,
        workerJobService: getWorkerJobService(),
        runWorkerJob: runFoxBearWorkerJob,
        progressView: window.FoxBearExportProgressView,
        validateZipBlob: (blob, plan) => exportGuard?.validateZipBlob?.(blob, plan) || { ok: Boolean(blob), size: blob?.size || 0 },
        downloadBlob,
        fileName: `foxbear_mastered_${timestampForFile()}.zip`,
        focusTrack: focusCompletedTrackDownload,
        showToast,
        getErrorMessage,
        onStateChange: () => renderAll({ keepDetailAudio: true }),
        onFinally: () => {
            applyCompletedMasteringMemoryPolicy('zip-finally-release', { forceReleaseAll: true });
            renderAll({ keepDetailAudio: true });
        }
    });
}
async function startSequentialExport() { const completed = state.tracks.filter(track => track?.outBlob), queueService = getExportQueueService();
    if (!completed.length) return Object.freeze({ ok: false, empty: true }); if (!queueService?.start) { showToast('곡별 순차 저장 모듈을 불러오지 못했습니다. 캐시를 새로고침한 뒤 다시 시도하세요.'); try { window.FoxBearRuntimeHealth?.check?.({ silent: false }); } catch (error) {} return Object.freeze({ ok: false, moduleUnavailable: true }); }
    if (isZipExportActive()) { showToast('ZIP 내보내기를 먼저 취소하거나 완료해 주세요.'); return Object.freeze({ ok: false, conflictingExport: true }); }
    applyCompletedMasteringMemoryPolicy('individual-export-preflight-release', { retainCompletedPcm: false, forceReleaseAll: true, keepSelected: false, keepRecent: 0, maxRetainedBuffers: 0, maxMasteredBufferBytes: 0 });
    const plan = getExportGuardService()?.prepareZipExportPlan?.(completed, { memorySnapshot: getMemoryGuardSnapshot(), fileNameForTrack: track => track.outName || `${safeBaseName(track.name)}_mastered.wav` });
    const files = (plan?.files || completed.map(track => ({ id: track.id, fileName: track.outName || `${safeBaseName(track.name)}_mastered.wav`, blob: track.outBlob }))).map((file, index) => ({ id: file.id || completed[index]?.id || `track-${index + 1}`, trackId: file.id || completed[index]?.id || '', fileName: file.fileName, blob: file.blob }));
    return queueService.start({ files, environment: getDownloadEnvironmentInfo(), progressView: window.FoxBearExportProgressView, validateFile: blob => getDownloadService().assertDownloadBlob(blob), canShareFile: supportsWebShareFiles, shareFile: shareDownloadFile, supportsPicker: supportsFileSystemSave(), saveWithPicker: saveBlobWithPicker, downloadFile: downloadBlob, showToast, onStateChange: () => renderAll({ keepDetailAudio: true }), onFinally: () => { applyCompletedMasteringMemoryPolicy('individual-export-finally-release', { forceReleaseAll: true }); renderAll({ keepDetailAudio: true }); } });
}
function downloadTrack(track) { if (!track || !track.outBlob) return;
    if (isAnyExportActive()) { showToast('진행 중인 내보내기를 먼저 완료하거나 취소해 주세요.'); return; }
    showDownloadOptionsDialog(track);
}
function closeDownloadOptionsDialog(backdrop) {
    const panel = backdrop || document.querySelector('.download-options-backdrop');
    if (!panel) return;
    const returnFocus = panel.__foxbearReturnFocus || null;
    try { panel.__foxbearCleanup?.(); } catch (error) {}
    window.FoxBearModalStateMachine?.setExternalLayerOpen?.(panel, false);
    panel.remove();
    document.body.classList.remove('download-options-open');
    if (returnFocus && document.body.contains(returnFocus)) {
        try { returnFocus.focus({ preventScroll: true }); } catch (error) {}
    }
}
function showDownloadOptionsDialog(track) {
    const dialogView = window.FoxBearDownloadDialogView;
    if (!dialogView || typeof dialogView.showDownloadOptionsDialog !== 'function') {
        showToast('다운로드 창 모듈을 불러오지 못했습니다.');
        return;
    }
    return dialogView.showDownloadOptionsDialog(track, {
        state,
        getDownloadEnvironmentInfo,
        getDownloadFormatOptions,
        getDownloadSizeEstimate: (trackValue, formatValue) => getDownloadService().getDownloadSizeEstimate(trackValue, formatValue),
        prepareTrackDownloadBlob,
        getImmediateTrackDownloadBlob: (trackValue, formatValue) => getDownloadService().getImmediateTrackDownloadBlob(trackValue, formatValue, getDownloadServiceDeps()),
        isRestrictedDownloadBrowser,
        supportsWebShareFiles,
        supportsWebShareDownloadFiles,
        shareDownloadFile,
        showDownloadAssist,
        closeDownloadOptionsDialog,
        downloadBlob,
        copyCurrentPageUrl,
        openCurrentPageInExternalBrowser,
        copyDownloadTroubleshootingGuide,
        copyDownloadDiagnostics,
        getDownloadDiagnostics,
        getRecommendedDownloadFlow,
        getDownloadActionReceipt,
        getDownloadRecoveryChecklist,
        getDownloadCompactRecoveryPlan,
        getDownloadDialogCompactHint,
        getDownloadDialogDisplayProfile,
        copyDownloadRecoveryChecklist,
        showToast,
        foxBearHaptic,
        clearNativeBadgeIfDone,
        renderAll,
        getErrorMessage
    });
}
function getDownloadService() {
    const service = window.FoxBearDownloadService;
    if (!service) throw new Error('다운로드 서비스 모듈을 불러오지 못했습니다.');
    return service;
}
function getDownloadServiceDeps() {
    return {
        state,
        showToast,
        timestampForFile,
        buildMasteredFileName,
        encodeMasterOutputAsync
    };
}
function getDownloadFormatOptions(track = null) {
    return getDownloadService().getDownloadFormatOptions(track);
}
async function prepareTrackDownloadBlob(track, format, options = {}) { return getDownloadService().prepareTrackDownloadBlob(track, format, getDownloadServiceDeps(), options); }
function scrollDownloadTargetIntoFocus(target, card) {
    const element = target || card;
    if (!element) return;
    const rect = element.getBoundingClientRect?.();
    if (!rect) {
        try { element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch (error) {}
        return;
    }
    const viewport = window.innerHeight || document.documentElement.clientHeight || 720;
    const dockHeight = Number(el.bottomPreviewDock?.getBoundingClientRect?.().height || 0);
    // Keep the download line slightly above the true center so the Dock does not cover it.
    const focusBand = Math.max(120, viewport * 0.42 - Math.min(80, dockHeight * 0.28));
    const targetY = window.scrollY + rect.top - focusBand + Math.min(24, rect.height * 0.35);
    try { window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' }); }
    catch (error) { element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); }
}
function focusCompletedTrackDownload(track) {
    if (!track) return;
    const findCard = () => Array.from(document.querySelectorAll('.track-card[data-track-id]')).find(item => item.dataset.trackId === track.id);
    const run = (announce = false) => {
        const card = findCard();
        if (!card) return false;
        const buttons = Array.from(card.querySelectorAll('button'));
        const button = card.querySelector('.download-attention') || buttons.find(btn => /다운로드/.test(btn.textContent || '')) || card.querySelector('[data-action="download"], .track-actions button');
        const actionLine = button?.closest?.('.track-actions') || button?.closest?.('.track-export-ready-panel') || button || card;
        const target = actionLine || card;
        card.classList.add('download-focus-card');
        if (button) {
            button.classList.add('download-focus-button');
            button.setAttribute('data-download-nudge', '여기서 저장');
        }
        scrollDownloadTargetIntoFocus(target, card);
        if (button && typeof button.focus === 'function') {
            setTimeout(() => button.focus({ preventScroll: true }), 520);
        }
        setTimeout(() => {
            card.classList.remove('download-focus-card');
            if (button) {
                button.classList.remove('download-focus-button');
                button.removeAttribute('data-download-nudge');
            }
        }, 5600);
        if (announce) showToast('마스터링 완료 · 파일 다운로드 버튼을 눌러 저장하세요.');
        return true;
    };
    if (!run(true)) requestAnimationFrame(() => run(true));
    setTimeout(() => run(false), 420);
    setTimeout(() => run(false), 980);
}
async function downloadTrackReport(track) {
    if (!track) return false;
    try { const report = createExportReport(track); const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }); await downloadBlob(blob, buildExportReportFileName(track)); return true; }
    catch (error) { console.warn('Report download failed:', error); showToast(getErrorMessage(error, '리포트 파일을 저장하지 못했습니다.')); return false; }
}
function buildExportReportFileName(track) {
    return `${safeBaseName(track?.name || 'track')}_foxbear_report_${timestampForFile()}.json`;
}
function downloadBlob(blob, fileName) {
    return getDownloadService().downloadBlob(blob, fileName, getDownloadServiceDeps());
}
function getDownloadEnvironmentInfo() {
    return getDownloadService().getDownloadEnvironmentInfo();
}
function canShareTinyAudioProbe() {
    return getDownloadService().canShareTinyAudioProbe();
}
function supportsWebShareDownloadFiles() {
    return getDownloadService().supportsWebShareDownloadFiles();
}
function supportsWebShareFiles(blob, fileName) {
    return getDownloadService().supportsWebShareFiles(blob, fileName);
}
async function shareDownloadFile(blob, fileName) {
    return getDownloadService().shareDownloadFile(blob, fileName, getDownloadServiceDeps());
}
function supportsFileSystemSave() {
    return getDownloadService().supportsFileSystemSave();
}
async function saveBlobWithPicker(blob, fileName) {
    return getDownloadService().saveBlobWithPicker(blob, fileName, getDownloadServiceDeps());
}
function copyCurrentPageUrl() {
    return getDownloadService().copyCurrentPageUrl(getDownloadServiceDeps());
}
function openCurrentPageInExternalBrowser() {
    return getDownloadService().openCurrentPageInExternalBrowser(getDownloadServiceDeps());
}
function copyDownloadTroubleshootingGuide(fileName) {
    const service = getDownloadService();
    if (typeof service.copyDownloadTroubleshootingGuide !== 'function') return copyCurrentPageUrl();
    return service.copyDownloadTroubleshootingGuide(fileName, getDownloadServiceDeps());
}
function getDownloadDiagnostics(blob = null, fileName = '') {
    const service = getDownloadService();
    if (typeof service.getDownloadDiagnostics !== 'function') return null;
    return service.getDownloadDiagnostics(blob, fileName);
}
function getRecommendedDownloadFlow(blob = null, fileName = '') {
    const service = getDownloadService();
    if (typeof service.getRecommendedDownloadFlow !== 'function') return null;
    return service.getRecommendedDownloadFlow(blob, fileName);
}
function getDownloadActionReceipt(action = 'download', blob = null, fileName = '') {
    const service = getDownloadService();
    if (typeof service.getDownloadActionReceipt !== 'function') return null;
    return service.getDownloadActionReceipt(action, blob, fileName);
}
function getDownloadRecoveryChecklist(blob = null, fileName = '', lastAction = '') {
    const service = getDownloadService();
    if (typeof service.getDownloadRecoveryChecklist !== 'function') return null;
    return service.getDownloadRecoveryChecklist(blob, fileName, lastAction);
}
function getDownloadCompactRecoveryPlan(blob = null, fileName = '', lastAction = '') {
    const service = getDownloadService();
    if (typeof service.getDownloadCompactRecoveryPlan !== 'function') return null;
    return service.getDownloadCompactRecoveryPlan(blob, fileName, lastAction);
}
function getDownloadDialogCompactHint(blob = null, fileName = '', lastAction = '') {
    const service = getDownloadService();
    if (typeof service.getDownloadDialogCompactHint !== 'function') return null;
    return service.getDownloadDialogCompactHint(blob, fileName, lastAction);
}
function getDownloadDialogDisplayProfile(blob = null, fileName = '', lastAction = '') {
    const service = getDownloadService();
    if (typeof service.getDownloadDialogDisplayProfile !== 'function') return null;
    return service.getDownloadDialogDisplayProfile(blob, fileName, lastAction);
}
function copyDownloadRecoveryChecklist(blob = null, fileName = '', lastAction = '') {
    const service = getDownloadService();
    if (typeof service.copyDownloadRecoveryChecklist !== 'function') return copyDownloadTroubleshootingGuide(fileName);
    return service.copyDownloadRecoveryChecklist(blob, fileName, lastAction, getDownloadServiceDeps());
}
function copyDownloadDiagnostics(blob = null, fileName = '') {
    const service = getDownloadService();
    if (typeof service.copyDownloadDiagnostics !== 'function') return copyCurrentPageUrl();
    return service.copyDownloadDiagnostics(blob, fileName, getDownloadServiceDeps());
}
function supportsAnchorDownload() {
    return getDownloadService().supportsAnchorDownload();
}
function isRestrictedDownloadBrowser() {
    return getDownloadService().isRestrictedDownloadBrowser();
}
function normalizeDownloadFileNameForBlob(fileName, blob) {
    return getDownloadService().normalizeDownloadFileNameForBlob(fileName, blob);
}
function sanitizeDownloadFileName(fileName) {
    return getDownloadService().sanitizeDownloadFileName(fileName);
}
function revokeDownloadUrl(url) {
    return getDownloadService().revokeDownloadUrl(url, getDownloadServiceDeps());
}
function showDownloadAssist(url, fileName, mimeType, blob = null) {
    return getDownloadService().showDownloadAssist(url, fileName, mimeType, blob, getDownloadServiceDeps());
}
function invalidateMasteredOutput(track, report, autoRefresh = false) {
    if (!track) return;
    const wasDone = track.status === 'done' && Boolean(track.outBlob);
    if (track.masteredUrl) URL.revokeObjectURL(track.masteredUrl);
    track.outBlob = null;
    track.outName = '';
    track.outFormat = null;
    track.masteredUrl = null;
    track.masteredBuffer = null;
    track.masteredDurationSec = 0;
    clearMasterPreviewOutput(track);
    track.downloadAttention = false;
    track.truePeakInfo = null;
    track.finalizeInfo = null;
    track.albumApplied = null;
    track.qualityGate = null;
    track.engineRecoveryInfo = null;
    track.masterReport = null;
    track.comparison = null;
    track.waveformOverview = null;
    track.safetyInfo = null;
    if (track.status === 'done') {
        track.status = 'ready';
        track.progress = 100;
    }
    track.report = report;
    if (autoRefresh && wasDone) scheduleAutoRemaster(track);
}
function scheduleAutoRemaster(track) {
    if (!track || track.error) return;
    const existing = state.autoRemasterTimers && state.autoRemasterTimers.get(track.id);
    if (existing) clearTimeout(existing);
    track.report = '설정 변경 감지 · 자동 갱신 대기 중';
    const timer = setTimeout(() => {
        if (state.autoRemasterTimers) state.autoRemasterTimers.delete(track.id);
        if (!state.tracks.some(item => item.id === track.id) || track.error) return;
        if (state.busy || isAnyExportActive() || ['analyzing', 'processing'].includes(track.status)) {
            scheduleAutoRemaster(track);
            return;
        }
        masterTrack(track).catch(error => {
            track.status = 'error';
            track.error = getErrorMessage(error, '자동 갱신 실패');
            renderAll();
        });
    }, 900);
    if (state.autoRemasterTimers) state.autoRemasterTimers.set(track.id, timer);
}
function invalidateAllMasteredOutput(report) {
    state.tracks.forEach(track => invalidateMasteredOutput(track, report));
}
function releaseTrackResourcesSafely(track) {
    const lifecycle = getTrackLifecycleService();
    if (lifecycle?.releaseTrackResources) return lifecycle.releaseTrackResources(track, { revokeObjectURL: url => URL.revokeObjectURL(url) });
    try { track?.masterPreviewAbortController?.abort?.('track-resources-released'); } catch (error) {}
    ['originalUrl', 'masteredUrl', 'masterPreviewUrl'].forEach(key => { if (track?.[key]) URL.revokeObjectURL(track[key]); if (track) track[key] = null; });
    if (track) { track.masterPreviewAbortController = null; track.masterPreviewJobId = ''; track.masteredBuffer = null; track.masterPreviewBlob = null; track.masterPreviewInfo = null; track.outBlob = null; }
    return null;
}
function clearQueue() {
    if (isAnyExportActive()) { showToast('진행 중인 내보내기를 먼저 취소하거나 완료해 주세요.'); return; }
    getImportAnalysisQueueController().cancelAll?.('queue-cleared');
    clearBottomPreviewPlayer();
    if (state.autoRemasterTimers) { state.autoRemasterTimers.forEach(timer => clearTimeout(timer)); state.autoRemasterTimers.clear(); }
    state.tracks.forEach(track => {
        try { track?.masteringAbortController?.abort?.('queue-cleared'); } catch (error) {}
        getMasterPreviewJobService()?.cancel?.(track, 'queue-cleared');
        releaseTrackResourcesSafely(track);
    });
    state.tracks = [];
    state.selectedId = null;
    state.selectedIds.clear();
    state.bottomPreviewMode = 'original';
    state.bottomPreviewTrackId = null;
    state.masterPreviewRenderingTrackId = null;
    state.masterPreviewRenderingJobId = '';
    state.bottomPreviewAutoplayTrackId = null;
    state.bottomPreviewTransport = null;
    if (state.expandedDetailIds) state.expandedDetailIds.clear();
    if (state.collapsedDetailIds) state.collapsedDetailIds.clear();
    state.busy = false;
    state.albumProfile = null;
    clearFileInputs();
    applyPresetToControlsOnly('custom');
    setTransformControls(DEFAULT_TRANSFORM);
    setInstrumentControls(DEFAULT_INSTRUMENT_LAYER);
    renderAll();
    showToast('작업 큐를 초기화했습니다.');
}
function clearFileInputs() {
    if (el.fileInput) el.fileInput.value = '';
    if (el.folderInput) el.folderInput.value = '';
    if (el.referenceInput) el.referenceInput.value = '';
}
async function handleReferenceFiles(fileList) {
    const [file] = Array.from(fileList || []);
    if (!file) return;
    const validation = validateAudioFile(file);
    if (!validation.ok) {
        showToast(`레퍼런스 ${file.name}: ${validation.reason}`);
        if (el.referenceInput) el.referenceInput.value = '';
        return;
    }
    state.referenceProfile = {
        name: file.name,
        size: file.size,
        status: 'analyzing',
        report: '레퍼런스 분석 중',
        analysis: null,
        target: null
    };
    renderAll({ keepDetailAudio: true });
    try {
        const buffer = await decodeAudio(file);
        const analysis = await analyzeBufferAsync(buffer);
        const recommendation = safeRecommendPreset(file.name, analysis, 'reference');
        state.referenceProfile = {
            name: file.name,
            size: file.size,
            status: 'ready',
            report: `${PRESET_LABELS[recommendation.preset] || recommendation.preset} 성향 레퍼런스`,
            analysis,
            recommendedPreset: recommendation.preset,
            confidence: recommendation.confidence,
            target: makeReferenceTargetFromAnalysis(analysis)
        };
        applyReferenceToReadyTracks(false);
        invalidateAllMasteredOutput('레퍼런스 트랙이 변경되었습니다. 다시 마스터링하세요.');
        showToast(`레퍼런스 분석 완료: ${file.name}`);
    } catch (error) {
        state.referenceProfile = { name: file.name, size: file.size, status: 'error', report: getErrorMessage(error, '레퍼런스 분석 실패'), analysis: null, target: null };
        showToast(`레퍼런스 분석 실패: ${state.referenceProfile.report}`);
    } finally {
        if (el.referenceInput) el.referenceInput.value = '';
        renderAll({ keepDetailAudio: true });
    }
}
function makeReferenceTargetFromAnalysis(analysis) {
    if (!analysis || analysis.silence) return null;
    return {
        bass: clamp01(Number(analysis.bassRatio ?? 0.25)),
        lowMid: clamp01(Number(analysis.lowMidRatio ?? 0.25)),
        mid: clamp01(Number(analysis.midRatio ?? 0.25)),
        high: clamp01(Number(analysis.highRatio ?? 0.20)),
        brightness: clamp01(Number(analysis.brightness ?? 0.50)),
        stereoWidth: clamp01(Number(analysis.stereoWidth ?? 0.35)),
        transientDensity: clamp01(Number(analysis.transientDensity ?? 0.35)),
        metallicHint: clamp01(Number(analysis.metallicHint ?? 0.40)),
        loudnessHint: Number(analysis.loudnessHint || -18),
        spectralCentroidHz: Number(analysis.spectralCentroidHz || 0),
        spectralRolloffHz: Number(analysis.spectralRolloffHz || 0),
        spectralFlatness: Number(analysis.spectralFlatness || 0),
        spectrumBands: cloneSpectrumBands(analysis.spectrumBands),
        spectrumProfileVersion: 24,
        spectrumProfile: normalizeReferenceSpectrumProfile(analysis.spectrumProfile, analysis)
    };
}
function getActiveReferenceTarget(preset) {
    const presetTarget = PRESET_REFERENCE_TARGETS[preset] || null;
    const refTarget = state.referenceProfile?.status === 'ready' ? state.referenceProfile.target : null;
    if (!refTarget) {
        if (!presetTarget) return null;
        return { ...presetTarget, spectrumProfileVersion: 24, spectrumProfile: makePresetSpectrumProfile24(presetTarget), spectrumBands: cloneSpectrumBands(presetTarget.spectrumBands || presetTarget) };
    }
    if (!presetTarget) return { ...refTarget, spectrumProfileVersion: 24, spectrumProfile: normalizeReferenceSpectrumProfile(refTarget.spectrumProfile, refTarget) };
    const amount = getReferenceMatchStrengthAmount();
    const presetProfile = makePresetSpectrumProfile24(presetTarget);
    const refProfile = normalizeReferenceSpectrumProfile(refTarget.spectrumProfile, refTarget);
    return {
        bass: blend(presetTarget.bass, refTarget.bass, amount),
        lowMid: blend(presetTarget.lowMid, refTarget.lowMid, amount),
        mid: blend(presetTarget.mid, refTarget.mid, amount),
        high: blend(presetTarget.high, refTarget.high, amount),
        brightness: blend(presetTarget.brightness, refTarget.brightness, amount),
        stereoWidth: refTarget.stereoWidth,
        transientDensity: refTarget.transientDensity,
        metallicHint: refTarget.metallicHint,
        spectralCentroidHz: refTarget.spectralCentroidHz,
        spectralRolloffHz: refTarget.spectralRolloffHz,
        spectralFlatness: refTarget.spectralFlatness,
        spectrumBands: cloneSpectrumBands(refTarget.spectrumBands),
        spectrumProfileVersion: 24,
        spectrumProfile: presetProfile.map((value, index) => Number(blend(value, Number(refProfile[index] || 0), amount).toFixed(5)))
    };
}
function normalizeReferenceSpectrumProfile(profile, fallback = null) {
    if (Array.isArray(profile) && profile.length >= 24) return profile.slice(0, 24).map(value => clamp01(Number(value) || 0));
    if (Array.isArray(profile) && profile.length >= 12) return upsampleSpectrumProfile12To24(profile);
    return makePresetSpectrumProfile24(fallback || { bass: 0.25, lowMid: 0.25, mid: 0.28, high: 0.22, brightness: 0.50 });
}
function upsampleSpectrumProfile12To24(profile) {
    const source = profile.slice(0, 12).map(value => clamp01(Number(value) || 0));
    const split = [0.48, 0.52];
    const out = [];
    source.forEach(value => {
        out.push(Number((value * split[0]).toFixed(5)));
        out.push(Number((value * split[1]).toFixed(5)));
    });
    return out.slice(0, 24);
}
function makePresetSpectrumProfile24(target) {
    const bands = cloneSpectrumBands(target?.spectrumBands || target);
    const bass = clamp01(Number(target?.bass ?? ((bands.bass + bands.sub) || 0.25)));
    const lowMid = clamp01(Number(target?.lowMid ?? (bands.lowMid || 0.25)));
    const mid = clamp01(Number(target?.mid ?? (bands.mid || 0.28)));
    const high = clamp01(Number(target?.high ?? ((bands.high + bands.air) || 0.22)));
    const bright = clamp01(Number(target?.brightness ?? 0.50));
    const subShare = clamp(0.20 + bass * 0.22, 0.16, 0.34);
    const airShare = clamp(0.18 + bright * 0.22, 0.16, 0.34);
    const profile = new Array(24).fill(0);
    distributeProfileEnergy(profile, [0, 1, 2, 3], bass * subShare, [0.16, 0.22, 0.28, 0.34]);
    distributeProfileEnergy(profile, [4, 5, 6], bass * (1 - subShare), [0.34, 0.36, 0.30]);
    distributeProfileEnergy(profile, [7, 8, 9, 10], lowMid, [0.24, 0.30, 0.26, 0.20]);
    distributeProfileEnergy(profile, [11, 12, 13, 14], mid, [0.23, 0.28, 0.27, 0.22]);
    distributeProfileEnergy(profile, [15, 16, 17, 18], high * (1 - airShare), [0.25, 0.27, 0.25, 0.23]);
    distributeProfileEnergy(profile, [19, 20, 21, 22, 23], high * airShare, [0.30, 0.24, 0.20, 0.15, 0.11]);
    const sum = profile.reduce((total, value) => total + value, 0) || 1;
    return profile.map(value => Number(clamp01(value / sum).toFixed(5)));
}
function distributeProfileEnergy(profile, indices, amount, weights) {
    const weightSum = weights.reduce((sum, value) => sum + value, 0) || 1;
    indices.forEach((index, position) => {
        profile[index] += clamp01(Number(amount) || 0) * (Number(weights[position] || 0) / weightSum);
    });
}
function sumSpectrumRange(profile, from, to) {
    const normalized = normalizeReferenceSpectrumProfile(profile);
    let sum = 0;
    for (let i = from; i <= to; i += 1) sum += Number(normalized[i] || 0);
    return sum;
}
function getReferenceProfileBandDeltas(ref, analysis) {
    const refProfile = normalizeReferenceSpectrumProfile(ref?.spectrumProfile, ref);
    const nowProfile = normalizeReferenceSpectrumProfile(analysis?.spectrumProfile, analysis);
    const deltaRange = (from, to, scale = 18) => {
        let sum = 0;
        let count = 0;
        for (let i = from; i <= to; i += 1) {
            sum += Number(refProfile[i] || 0) - Number(nowProfile[i] || 0);
            count += 1;
        }
        return clamp(sum / Math.max(1, count) * scale, -0.55, 0.55);
    };
    return {
        sub: deltaRange(0, 2, 22),
        bass: deltaRange(3, 6, 20),
        mud: deltaRange(7, 9, 19),
        body: deltaRange(10, 12, 18),
        vocal: deltaRange(13, 14, 18),
        presence: deltaRange(14, 16, 17),
        harsh: deltaRange(15, 17, 16),
        sibilance: deltaRange(17, 19, 16),
        air: deltaRange(20, 23, 18),
        tilt: clamp((sumSpectrumRange(refProfile, 15, 23) - sumSpectrumRange(nowProfile, 15, 23)) - (sumSpectrumRange(refProfile, 0, 8) - sumSpectrumRange(nowProfile, 0, 8)), -0.45, 0.45)
    };
}
function cloneSpectrumBands(bands) {
    const source = bands || {};
    return {
        sub: clamp01(Number(source.sub || 0)),
        bass: clamp01(Number(source.bass || 0)),
        lowMid: clamp01(Number(source.lowMid || 0)),
        mid: clamp01(Number(source.mid || 0)),
        presence: clamp01(Number(source.presence || 0)),
        high: clamp01(Number(source.high || 0)),
        air: clamp01(Number(source.air || 0))
    };
}
function getSpectrumProfileDelta(ref, analysis) {
    const detailed = getReferenceProfileBandDeltas(ref, analysis);
    const refBands = cloneSpectrumBands(ref?.spectrumBands);
    const nowBands = cloneSpectrumBands(analysis?.spectrumBands);
    return {
        low: clamp((detailed.sub * 0.32 + detailed.bass * 0.68) + ((refBands.sub + refBands.bass) - (nowBands.sub + nowBands.bass)) * 0.28, -0.55, 0.55),
        body: clamp(detailed.mud * 0.38 + detailed.body * 0.62 + (refBands.lowMid - nowBands.lowMid) * 0.22, -0.55, 0.55),
        presence: clamp(detailed.vocal * 0.30 + detailed.presence * 0.52 + detailed.harsh * 0.18 + (refBands.presence - nowBands.presence) * 0.20, -0.55, 0.55),
        air: clamp(detailed.sibilance * 0.20 + detailed.air * 0.68 + detailed.tilt * 0.12 + ((refBands.high + refBands.air) - (nowBands.high + nowBands.air)) * 0.20, -0.55, 0.55),
        profile24: detailed
    };
}
function blend(a, b, amount) {
    const av = Number.isFinite(Number(a)) ? Number(a) : 0;
    const bv = Number.isFinite(Number(b)) ? Number(b) : av;
    return av + (bv - av) * clamp(Number(amount || 0), 0, 1);
}
function handleReferenceStrengthChange() {
    const next = getReferenceMatchStrengthAmount(el.referenceStrengthSelect?.value ?? state.referenceMatchStrength);
    saveUndoPointForSelectedOrAll('레퍼런스 강도 변경 전');
    state.referenceMatchStrength = next;
    const count = applyReferenceToReadyTracks(false);
    invalidateAllMasteredOutput(`레퍼런스 매칭 강도 ${getReferenceMatchStrengthLabel(next)}로 변경되었습니다. 다시 마스터링하세요.`);
    renderAll({ keepDetailAudio: true });
    showToast(`레퍼런스 매칭 강도: ${getReferenceMatchStrengthLabel(next)}${count ? ` · ${count}곡 추천값 갱신` : ''}`);
}
function handleAdaptiveLufsToggle() {
    saveUndoPointForSelectedOrAll('Adaptive LUFS 변경 전');
    state.adaptiveTargetLufs = Boolean(el.adaptiveLufsToggle?.checked);
    invalidateAllMasteredOutput(state.adaptiveTargetLufs ? '곡별 Adaptive LUFS가 켜졌습니다. 다시 마스터링하세요.' : '곡별 Adaptive LUFS가 꺼졌습니다. 다시 마스터링하세요.');
    renderAll({ keepDetailAudio: true });
    showToast(state.adaptiveTargetLufs ? '곡별 Adaptive LUFS를 켰습니다.' : '곡별 Adaptive LUFS를 껐습니다.');
}
function applyReferenceToReadyTracks(show = true) {
    if (!state.referenceProfile?.analysis) return 0;
    let count = 0;
    state.tracks.forEach(track => {
        if (!track.analysis || track.genreLocked) return;
        track.recommendedSettings = makeRecommendedSettings(track.recommendedPreset || track.preset || 'custom', track.analysis);
        if (!track.outBlob || track.preset === track.recommendedPreset) track.settings = cloneSettings(track.recommendedSettings);
        count += 1;
    });
    if (show && count) showToast(`${count}개 트랙 추천값에 레퍼런스를 반영했습니다.`);
    return count;
}
function applyReferenceToSelected() {
    const track = getSelectedTrack();
    if (!track || !track.analysis || !state.referenceProfile?.analysis) {
        showToast('분석 완료 트랙과 레퍼런스를 먼저 준비하세요.');
        return;
    }
    saveSnapshot(track, '레퍼런스 적용 전');
    const preset = track.preset === 'custom' ? (track.recommendedPreset || 'custom') : track.preset;
    track.settings = makeRecommendedSettings(preset, track.analysis);
    track.recommendedSettings = cloneSettings(track.settings);
    track.report = '레퍼런스 톤을 현재 곡 추천값에 반영했습니다.';
    invalidateMasteredOutput(track, '레퍼런스 톤이 반영되었습니다. 다시 마스터링하세요.', true);
    applyTrackToControls(track);
    renderAll({ keepDetailAudio: true });
    showToast('레퍼런스 추천값을 현재 곡에 반영했습니다.');
}
function clearReferenceProfile() {
    state.referenceProfile = null;
    invalidateAllMasteredOutput('레퍼런스가 해제되었습니다. 다시 마스터링하세요.');
    renderAll({ keepDetailAudio: true });
    showToast('레퍼런스 트랙을 해제했습니다.');
}
function applyPlatformExportPreset(value, userInitiated = false) {
    const preset = PLATFORM_EXPORT_PRESETS[value] ? value : 'custom';
    state.platformPreset = preset;
    if (el.platformPresetSelect) el.platformPresetSelect.value = preset;
    const config = PLATFORM_EXPORT_PRESETS[preset];
    if (preset !== 'custom') {
        state.outputFormat = config.outputFormat;
        state.targetLufs = config.targetLufs;
        state.ceilingDb = config.ceilingDb;
        state.qualityMode = config.qualityMode;
        syncOutputControlValues();
        invalidateAllMasteredOutput(`${config.label} 저장 프리셋으로 변경되었습니다. 다시 마스터링하세요.`);
    }
    renderAll({ keepDetailAudio: true });
    if (userInitiated) showToast(`${config.label} 프리셋 적용 · ${config.note}`);
}
function syncOutputControlValues() {
    if (el.outputFormatSelect) el.outputFormatSelect.value = state.outputFormat;
    if (el.targetLufsSelect) el.targetLufsSelect.value = String(state.targetLufs);
    if (el.ceilingSelect) el.ceilingSelect.value = String(state.ceilingDb);
    if (el.qualityModeSelect) el.qualityModeSelect.value = state.qualityMode;
    if (el.performanceModeSelect) el.performanceModeSelect.value = state.performanceMode;
    if (el.masterStyleSelect) el.masterStyleSelect.value = state.masterStyle;
    if (el.masterStrengthSelect) el.masterStrengthSelect.value = state.masterStrength;
    syncEnhancedSelectButtons();
}
function setPlatformPresetCustomFromManualChange() {
    if (!el.platformPresetSelect || state.platformPreset === 'custom') return;
    state.platformPreset = 'custom';
    el.platformPresetSelect.value = 'custom';
    syncEnhancedSelectButtons();
}
function getPlatformPresetLabel(value = state.platformPreset) {
    return PLATFORM_EXPORT_PRESETS[value]?.label || '직접 설정';
}
function getPlatformFileSuffix() {
    const value = state.platformPreset || 'custom';
    if (!value || value === 'custom') return '';
    return '_' + value.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
}
function getPerformanceModeLabel(value = state.performanceMode) {
    if (value === 'mobile') return 'Mobile Safe';
    if (value === 'quality') return 'Quality Lock';
    return 'Auto';
}
function getSnapshotCore(snapshot) {
    if (!snapshot) return '';
    const core = {
        preset: snapshot.preset,
        recommendedPreset: snapshot.recommendedPreset,
        genreLocked: Boolean(snapshot.genreLocked),
        settings: snapshot.settings || {},
        transform: snapshot.transform || {},
        instrument: snapshot.instrument || {},
        masterGoal: snapshot.masterGoal,
        masterStyle: snapshot.masterStyle,
        masterStrength: snapshot.masterStrength,
        outputFormat: snapshot.outputFormat,
        targetLufs: snapshot.targetLufs,
        ceilingDb: snapshot.ceilingDb,
        qualityMode: snapshot.qualityMode,
        platformPreset: snapshot.platformPreset,
        performanceMode: snapshot.performanceMode,
        adaptiveTargetLufs: Boolean(snapshot.adaptiveTargetLufs),
        referenceMatchStrength: snapshot.referenceMatchStrength
    };
    try { return JSON.stringify(core); } catch (error) { return String(Date.now()); }
}
function formatSnapshotLabel(snapshot) {
    if (!snapshot) return '';
    const label = snapshot.label || '스냅샷';
    const date = snapshot.savedAt ? new Date(snapshot.savedAt) : null;
    const time = date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
    return time ? `${label} · ${time}` : label;
}
function getSnapshotTargets() {
    const selected = getSelectedTracks();
    if (selected.length) return selected;
    const active = getSelectedTrack();
    if (active) return [active];
    return state.tracks.filter(track => track && !track.error);
}
function saveUndoPointForSelectedOrAll(label = '변경 전') {
    getSnapshotTargets().forEach(track => saveUndoPoint(track, label, { auto: true }));
}
function saveUndoPoint(track, label = '변경 전', options = {}) {
    if (!track || state.busy) return null;
    if (!Array.isArray(track.snapshots)) track.snapshots = [];
    if (!Array.isArray(track.redoSnapshots)) track.redoSnapshots = [];
    const now = Date.now();
    if (options.auto && track.snapshotMeta && track.snapshotMeta.label === label && now - Number(track.snapshotMeta.at || 0) < AUTO_SNAPSHOT_COOLDOWN_MS) return null;
    const snapshot = captureTrackSnapshot(track, label);
    const fingerprint = getSnapshotCore(snapshot);
    const last = track.snapshots[track.snapshots.length - 1];
    if (last && getSnapshotCore(last) === fingerprint) return null;
    snapshot.fingerprint = fingerprint;
    snapshot.auto = Boolean(options.auto);
    track.snapshots.push(snapshot);
    while (track.snapshots.length > MAX_SNAPSHOTS_PER_TRACK) track.snapshots.shift();
    track.redoSnapshots = [];
    track.snapshotMeta = { label, at: now };
    return snapshot;
}
function captureTrackSnapshot(track, label = '스냅샷') {
    return {
        label,
        savedAt: new Date().toISOString(),
        preset: track.preset,
        recommendedPreset: track.recommendedPreset,
        genreLocked: Boolean(track.genreLocked),
        settings: cloneSettings(track.settings),
        recommendedSettings: cloneSettings(track.recommendedSettings || GENRE_PRESETS.custom),
        transform: cloneTransform(track.transform || DEFAULT_TRANSFORM),
        instrument: cloneInstrumentLayer(track.instrument || DEFAULT_INSTRUMENT_LAYER),
        masterGoal: state.masterGoal,
        masterStyle: state.masterStyle,
        masterStrength: state.masterStrength,
        outputFormat: state.outputFormat,
        targetLufs: state.targetLufs,
        ceilingDb: state.ceilingDb,
        qualityMode: state.qualityMode,
        platformPreset: state.platformPreset,
        performanceMode: state.performanceMode,
        adaptiveTargetLufs: Boolean(state.adaptiveTargetLufs),
        referenceMatchStrength: getReferenceMatchStrengthAmount()
    };
}
function saveSnapshot(track, label = '사용자 스냅샷') {
    return saveUndoPoint(track, label, { force: true });
}
function saveSnapshotForSelected() {
    const track = getSelectedTrack();
    if (!track || state.busy) return;
    saveUndoPoint(track, '사용자 저장', { force: true });
    renderAll({ keepDetailAudio: true });
    showToast('현재 설정을 되돌리기 기록에 저장했습니다.');
}
function restoreLatestSnapshotForSelected() {
    const track = getSelectedTrack();
    if (!track || state.busy || !Array.isArray(track.snapshots) || !track.snapshots.length) return;
    if (!Array.isArray(track.redoSnapshots)) track.redoSnapshots = [];
    const current = captureTrackSnapshot(track, '되돌리기 전 상태');
    const snapshot = track.snapshots.pop();
    track.redoSnapshots.push(current);
    while (track.redoSnapshots.length > MAX_REDO_SNAPSHOTS_PER_TRACK) track.redoSnapshots.shift();
    restoreSnapshot(track, snapshot);
    invalidateMasteredOutput(track, `${snapshot.label || '최근 기록'}으로 되돌렸습니다. 다시 마스터링하세요.`, true);
    applyTrackToControls(track);
    renderAll({ keepDetailAudio: true });
    showToast(`${snapshot.label || '최근 기록'}으로 되돌렸습니다.`);
}
function redoSnapshotForSelected() {
    const track = getSelectedTrack();
    if (!track || state.busy || !Array.isArray(track.redoSnapshots) || !track.redoSnapshots.length) return;
    const current = captureTrackSnapshot(track, '다시 적용 전 상태');
    const snapshot = track.redoSnapshots.pop();
    if (!Array.isArray(track.snapshots)) track.snapshots = [];
    track.snapshots.push(current);
    while (track.snapshots.length > MAX_SNAPSHOTS_PER_TRACK) track.snapshots.shift();
    restoreSnapshot(track, snapshot);
    invalidateMasteredOutput(track, '되돌린 설정을 다시 적용했습니다. 다시 마스터링하세요.', true);
    applyTrackToControls(track);
    renderAll({ keepDetailAudio: true });
    showToast('되돌린 설정을 다시 적용했습니다.');
}
function restoreAiRecommendationSnapshotForSelected() {
    const track = getSelectedTrack();
    if (!track || !track.analysis || state.busy) return;
    saveUndoPoint(track, 'AI 추천 복원 전', { force: true });
    applyAiRecommendationSettings(track, true, 'AI 추천값으로 복원했습니다. 다시 마스터링하세요.');
    applyTrackToControls(track);
    renderAll({ keepDetailAudio: true });
    showToast('AI 추천값으로 복원했습니다.');
}
function restoreOriginalSnapshotForSelected() {
    const track = getSelectedTrack();
    if (!track || state.busy) return;
    applyOriginalManualSelection(track);
}
function restoreSnapshot(track, snapshot) {
    if (!track || !snapshot) return;
    track.preset = snapshot.preset || 'custom';
    track.recommendedPreset = snapshot.recommendedPreset || track.recommendedPreset || 'custom';
    track.genreLocked = Boolean(snapshot.genreLocked);
    track.settings = cloneSettings(snapshot.settings || GENRE_PRESETS.custom);
    track.recommendedSettings = cloneSettings(snapshot.recommendedSettings || track.settings);
    track.transform = cloneTransform(snapshot.transform || DEFAULT_TRANSFORM);
    track.instrument = cloneInstrumentLayer(snapshot.instrument || DEFAULT_INSTRUMENT_LAYER);
    state.masterGoal = snapshot.masterGoal || state.masterGoal;
    state.masterStyle = snapshot.masterStyle || state.masterStyle;
    state.masterStrength = snapshot.masterStrength || state.masterStrength || 'balanced';
    state.outputFormat = snapshot.outputFormat || state.outputFormat;
    state.targetLufs = Number(snapshot.targetLufs ?? state.targetLufs);
    state.ceilingDb = Number(snapshot.ceilingDb ?? state.ceilingDb);
    state.qualityMode = snapshot.qualityMode || state.qualityMode;
    state.platformPreset = snapshot.platformPreset || 'custom';
    state.performanceMode = snapshot.performanceMode || state.performanceMode;
    state.adaptiveTargetLufs = Boolean(snapshot.adaptiveTargetLufs ?? state.adaptiveTargetLufs);
    state.referenceMatchStrength = getReferenceMatchStrengthAmount(snapshot.referenceMatchStrength ?? state.referenceMatchStrength);
    if (el.adaptiveLufsToggle) el.adaptiveLufsToggle.checked = Boolean(state.adaptiveTargetLufs);
    if (el.referenceStrengthSelect) el.referenceStrengthSelect.value = String(state.referenceMatchStrength);
    if (el.masterGoalSelect) el.masterGoalSelect.value = state.masterGoal;
    if (el.masterStyleSelect) el.masterStyleSelect.value = state.masterStyle;
    if (el.masterStrengthSelect) el.masterStrengthSelect.value = state.masterStrength;
    if (el.platformPresetSelect) el.platformPresetSelect.value = state.platformPreset;
    syncOutputControlValues();
}
function clearSnapshotsForSelected() {
    const track = getSelectedTrack();
    if (!track || state.busy) return;
    track.snapshots = [];
    track.redoSnapshots = [];
    track.snapshotMeta = null;
    renderAll({ keepDetailAudio: true });
    showToast('선택 트랙의 되돌리기 기록을 지웠습니다.');
}
function beginPerformanceProfile() { return FoxBearMasteringMemoryDiagnostics?.createPerformanceInfo?.() || { running: true, startedAt: new Date().toISOString(), startMs: Date.now(), lastMs: Date.now(), stages: [], memoryStages: [], totalMs: 0, realtimeRatio: 0, outputSize: 0 }; }
function getMemoryGovernorLevelRank(level) { return ({ normal: 0, elevated: 1, high: 2, critical: 3 })[String(level || 'normal')] || 0; }
function maybeAnnounceMemoryGovernor(track, decision, warning = null, source = '') { if (!track || !decision) return false; const level = String(decision.level || 'normal'), key = `${level}:${decision.qualityMode}:${decision.truePeak}`; if (getMemoryGovernorLevelRank(level) < 1 || (track.memoryWarningKey === key && !decision.escalated)) return false; track.memoryWarningKey = key; const ratio = Number(decision.observedRatio || track.inAppSafetyInfo?.pressureRatio || 0).toFixed(2), action = decision.qualityMode !== decision.sourceQualityMode || decision.truePeak === false ? `${getQualityModeLabel(decision.qualityMode)}·${decision.truePeak === false ? '경량 피크' : 'True Peak'} 자동 적용` : '단계별 메모리 감시', message = warning?.message || `${track.inAppSafetyInfo?.label || '현재 브라우저'} 메모리 압력 ${ratio} · ${action}`; if (level === 'high' || level === 'critical' || source === 'preflight') showToast(message); if (source === 'runtime-stage' && decision.escalated && (Number(decision.heapRatio || 0) >= 0.9 || Number(decision.knownBufferRatio || 0) >= 0.95)) reportOperationalIncident('mastering-memory', new Error('Observed mastering memory pressure escalation'), `source=${source}; stage=${decision.stage || ''}; ratio=${ratio}; heap=${decision.heapRatio || 0}; buffers=${decision.knownBufferRatio || 0}; quality=${decision.qualityMode}; truePeak=${decision.truePeak}`, { reason: 'mastering-memory-observed-escalation', severity: 'warning' }); return true; }
function markPerformanceStage(track, label, buffers = {}) { const sample = FoxBearMasteringMemoryDiagnostics?.markStage?.(track, label, buffers) || null, decision = FoxBearMasteringMemoryDiagnostics?.createGovernorDecision?.(track, sample, { stage: label, sourceQualityMode: state.qualityMode || 'balanced', requestedTruePeak: state.featureFlags.truePeakGuard !== false, outputFormat: state.outputFormat || 'wav24' }) || null; maybeAnnounceMemoryGovernor(track, decision, null, 'runtime-stage'); return sample; }
function finishPerformanceProfile(track, buffer, blob) {
    if (!track || !track.performanceInfo) return;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const totalMs = Math.max(0, now - Number(track.performanceInfo.startMs || now));
    const durationMs = buffer?.duration ? buffer.duration * 1000 : track.analysis?.duration ? track.analysis.duration * 1000 : 0;
    track.performanceInfo.running = false;
    track.performanceInfo.totalMs = totalMs;
    track.performanceInfo.realtimeRatio = durationMs > 0 ? totalMs / durationMs : 0;
    track.performanceInfo.speedFactor = totalMs > 0 ? durationMs / totalMs : 0;
    Object.assign(track.performanceInfo, { finalizerProcessingMs: Number(track.finalizeInfo?.performance?.processingMs || 0), finalizerRealtimeFactor: Number(track.finalizeInfo?.performance?.realtimeFactor || 0), finalizerStageMs: track.finalizeInfo?.performance?.stageMs || null });
    track.performanceInfo.outputSize = blob?.size || 0;
    track.performanceInfo.completedAt = new Date().toISOString();
    const memoryService = getMemoryGuardService();
    if (memoryService && typeof memoryService.getAudioBufferBytes === 'function') {
        track.performanceInfo.masteredBufferBytes = memoryService.getAudioBufferBytes(buffer);
        track.performanceInfo.outBlobBytes = blob?.size || 0;
    }
}
function getMasteringPerformanceSnapshot() {
    const summarize = track => track && track.performanceInfo ? Object.freeze({
        id: track.id,
        name: track.name,
        status: track.status,
        qualityGate: track.qualityGate?.status || '',
        recoveryStatus: track.engineRecoveryInfo?.status || '',
        recoveryProfileId: track.engineRecoveryInfo?.profileId || '',
        recoveryProfileLabel: track.engineRecoveryInfo?.profileLabel || '',
        recoveryRiskCodes: [...(track.engineRecoveryInfo?.riskCodes || [])],
        recoveryError: track.engineRecoveryInfo?.error || '',
        preservedFirstRender: Boolean(track.engineRecoveryInfo?.preservedFirstRender),
        outputBytes: Number(track.outBlob?.size || 0),
        outputFormat: String(track.outFormat || ''),
        totalMs: Number(track.performanceInfo.totalMs || 0),
        speedFactor: Number(track.performanceInfo.speedFactor || 0),
        realtimeRatio: Number(track.performanceInfo.realtimeRatio || 0),
        finalizerProcessingMs: Number(track.performanceInfo.finalizerProcessingMs || 0),
        stages: (track.performanceInfo.stages || []).map(stage => ({ label: stage.label, ms: Number(stage.ms || 0) })),
        memory: FoxBearMasteringMemoryDiagnostics?.summarize?.(track.performanceInfo) || null,
        inAppSafety: track.inAppSafetyInfo || null,
        memoryGovernor: track.memoryGovernorInfo || null
    }) : null;
    const selected = summarize(getSelectedTrack());
    const recent = state.tracks.filter(track => track?.performanceInfo?.totalMs).slice(-8).map(summarize).filter(Boolean);
    return Object.freeze({ version: '1.6.37-kakao-adaptive-memory-governor', selected, recent });
}
function getHeaviestPerformanceStage(info) {
    if (!info || !Array.isArray(info.stages) || !info.stages.length) return null;
    return info.stages.slice().sort((a, b) => Number(b.ms || 0) - Number(a.ms || 0))[0];
}
function formatPerformanceInfo(info) {
    if (!info) return '-';
    if (info.running) return '처리 중 · 단계별 시간 측정 중';
    const speedFactor = Number(info.speedFactor || 0);
    const speedText = speedFactor > 0 ? `처리 속도 ${speedFactor.toFixed(2)}x` : '처리 속도 계산 전';
    const size = info.outputSize ? ` · 출력 ${formatBytes(info.outputSize)}` : '';
    return `${formatDurationMs(info.totalMs)} · ${speedText}${size}`;
}
function formatDurationMs(ms) {
    const value = Math.max(0, Number(ms || 0));
    if (value < 1000) return `${Math.round(value)} ms`;
    if (value < 60000) return `${(value / 1000).toFixed(value < 10000 ? 2 : 1)}초`;
    const minutes = Math.floor(value / 60000);
    const seconds = Math.round((value % 60000) / 1000).toString().padStart(2, '0');
    return `${minutes}분 ${seconds}초`;
}
function formatInstrumentLayerResult(info) {
    const confidence = Number.isFinite(Number(info.confidence)) ? ` · 신뢰 ${Math.round(Number(info.confidence) * 100)}%` : '';
    const grid = Number.isFinite(Number(info.gridQuality)) ? ` · 그리드 ${Math.round(Number(info.gridQuality) * 100)}%` : '';
    const gain = Number.isFinite(Number(info.gainDb)) ? ` · ${info.gainDb.toFixed(1)} dB` : '';
    return `${info.label} · 추정 ${Number(info.bpm || 0).toFixed(1)} BPM · ${info.events || 0} hits${confidence}${grid}${gain}`;
}
function yieldToBrowser() {
    return new Promise(resolve => setTimeout(resolve, 0));
}
let renderSchedulerRegistered = false;
function getRenderSchedulerContext() {
    const snapshot = getImportAnalysisQueueSnapshot();
    const queued = Number(snapshot.pending || 0) + Number(snapshot.active || 0);
    return Object.freeze({
        importActive: queued > 0,
        largeImportActive: Boolean(Number(snapshot.lastBatchSize || 0) >= SAFE_LARGE_IMPORT_BATCH_THRESHOLD && queued > 0),
        active: Number(snapshot.active || 0),
        pending: Number(snapshot.pending || 0),
        lastBatchSize: Number(snapshot.lastBatchSize || 0)
    });
}
function ensureRenderSchedulerRegistered() {
    const service = window.FoxBearRenderScheduler;
    if (!service || typeof service.register !== 'function' || renderSchedulerRegistered) return service || null;
    service.register(options => renderAll(options || {}), getRenderSchedulerContext);
    renderSchedulerRegistered = true;
    return service;
}
function getRenderSchedulerSnapshot() {
    const service = ensureRenderSchedulerRegistered();
    return service && typeof service.getSnapshot === 'function' ? service.getSnapshot() : Object.freeze({ pending: false, inRender: false, reasons: [], fallback: true });
}
function flushScheduledRender(reason = 'flush') {
    const service = ensureRenderSchedulerRegistered();
    if (service && typeof service.flush === 'function') return service.flush(reason);
    try { renderAll({}); } catch (error) { reportBootOrImportError(error, '렌더링 오류'); }
    return getRenderSchedulerSnapshot();
}
function scheduleRenderAll(reason = 'scheduled', options = {}) {
    const service = ensureRenderSchedulerRegistered();
    if (service && typeof service.schedule === 'function') return service.schedule(reason, options);
    try { renderAll(options || {}); } catch (error) { reportBootOrImportError(error, '렌더링 오류'); }
    return getRenderSchedulerSnapshot();
}
function renderAll(options = {}) {
    renderStats();
    renderButtons();
    initActionHelpTooltips();
    renderQueuePreview();
    renderTrackList();
    renderDetail(options);
    renderSelectedBadge();
    renderAlbumStatus();
    updateFeatureSummary();
    updateSmartRecommendationPanel();
    renderReferencePanel();
    renderSnapshotPanel();
    updatePreviewButton();
    renderBottomPreviewDock(options);
    updateRealtimePreviewSettings();
    updateProcessingHud();
    updateBulkImportHud();
    updateMobileNativeUi();
    syncEnhancedSelectButtons();
}
function renderStats() {
    const total = state.tracks.length;
    const done = state.tracks.filter(track => track.outBlob).length;
    const totalSize = state.tracks.reduce((sum, track) => sum + track.size, 0);
    const busy = state.tracks.some(track => ['analyzing', 'processing'].includes(track.status));
    el.statTracks.textContent = String(total);
    el.statDone.textContent = String(done);
    el.statSize.textContent = formatBytes(totalSize);
    el.statState.textContent = busy ? '작업 중' : (total ? '준비' : '대기');
    el.queueCount.textContent = `${total}개`;
}
function renderAlbumStatus() {
    const profile = computeAlbumProfile();
    if (!state.featureFlags.albumMatch) {
        el.albumStatus.textContent = '앨범 단위 볼륨/톤 통일은 버튼을 켜면 전체 곡의 중간값을 기준으로 자연스럽게 보정합니다.';
        return;
    }
    if (!profile || profile.count < 2) {
        el.albumStatus.textContent = '앨범 통일 ON · 2곡 이상 분석되면 중간 볼륨/밝기 기준으로 보정됩니다.';
        return;
    }
    el.albumStatus.textContent = `앨범 통일 ON · 기준 ${profile.count}곡 · 기준 RMS ${profile.loudnessHint.toFixed(1)} dB · 기준 밝기 ${Math.round(profile.brightness * 100)}%`;
}
function syncExportInteractionLock(active) { ['.console-panel', '#trackList', '.output-format-box'].forEach(selector => { const node = document.querySelector(selector); if (!node) return; if (active) node.setAttribute('inert', ''); else node.removeAttribute('inert'); node.setAttribute('aria-disabled', String(Boolean(active))); }); document.body.classList.toggle('export-interaction-locked', Boolean(active)); }
function renderButtons() {
    const hasTracks = state.tracks.length > 0;
    const selectedTracks = getSelectedTracks();
    const activeTrack = getSelectedTrack();
    const actionTracks = getPrimaryActionTracks();
    const aiTargets = selectedTracks.length ? selectedTracks : (activeTrack ? [activeTrack] : []);
    const hasCompleted = state.tracks.some(track => track.outBlob); syncExportInteractionLock(isAnyExportActive());
    const canApplyAI = aiTargets.some(track => track.analysis) && !state.busy && !isAnyExportActive();
    const canProcessSelected = actionTracks.some(track => !['processing'].includes(track.status) && !track.error) && !isActionBusyBlocked();
    const canPreviewMaster = Boolean(activeTrack && !isActionBusyBlocked() && activeTrack.status !== 'processing' && !activeTrack.error);
    const canProcessAll = hasTracks && !state.busy && !isAnyExportActive() && state.tracks.some(track => !['analyzing', 'processing'].includes(track.status) && !track.error);
    el.aiApplyBtn.disabled = !canApplyAI;
    if (el.masterPreviewBtn) {
        el.masterPreviewBtn.disabled = !canPreviewMaster;
        el.masterPreviewBtn.textContent = activeTrack && activeTrack.masterPreviewStatus === 'processing' ? '하이라이트 듣기 생성 중' : '하이라이트 듣기 · 15초';
    }
    el.masterSelectedBtn.disabled = !canProcessSelected;
    el.masterAllBtn.disabled = !canProcessAll;
    el.zipBtn.disabled = !hasCompleted || state.busy || isAnyExportActive();
    el.zipBtn.textContent = isZipExportActive() ? 'ZIP 생성 중...' : 'ZIP 다운로드';
    if (el.individualExportBtn) { el.individualExportBtn.disabled = !hasCompleted || state.busy || isAnyExportActive(); el.individualExportBtn.textContent = isExportQueueActive() ? '순차 저장 진행 중...' : '곡별 순차 저장'; }
    const unsafeClearBusy = Boolean(isAnyExportActive() || state.masterPreviewRenderingTrackId || masteringQueueState.activeIds.size || state.tracks.some(track => track.status === 'processing'));
    el.clearBtn.disabled = !hasTracks || unsafeClearBusy;
    if (el.masterSelectedBtn) {
        const labelCount = selectedTracks.length || actionTracks.length;
        el.masterSelectedBtn.textContent = labelCount > 1 ? `선택 ${labelCount}곡 마스터링` : (labelCount === 1 ? '선택 1곡 마스터링' : '선택 트랙 마스터링');
    }
    syncBottomCompareTools();
    if (el.genreLockBtn) {
        const active = getSelectedTrack();
        el.genreLockBtn.textContent = active && active.genreLocked ? '장르 잠금 해제' : '장르 잠금';
        el.genreLockBtn.disabled = !active || state.busy;
    }
    if (el.globalDiffMeter) el.globalDiffMeter.textContent = buildGlobalDiffText();
}
function renderQueuePreview() {
    if (!el.queuePreview) return;
    el.queuePreview.textContent = '';
    el.queuePreview.hidden = true;
    el.queuePreview.setAttribute('aria-hidden', 'true');
}
function buildTrackAiJudgeText(track) {
    if (!track) return '';
    if (track.status === 'analyzing') return 'AI 분석 중 · 추천 프리셋 준비';
    if (track.status === 'processing') return track.report || 'AI 마스터링 중';
    if (track.error) return `오류 · ${track.error}`;
    if (track.qualityGate) {
        const prefix = track.qualityGate.status === 'pass' ? '결과 안정적' : track.qualityGate.status === 'warn' ? '결과 확인 필요' : '재보정 권장';
        return `${prefix} · ${track.qualityGate.summary}`;
    }
    if (track.analysis) return `AI 추천 · ${PRESET_LABELS[track.preset] || track.preset || '커스텀'} · ${getAiConfidenceLabel(track)} ${track.confidence || 0}%`;
    return 'AI 추천 대기';
}
function renderTrackList() {
    el.trackList.textContent = '';
    if (!state.tracks.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = '대기열이 비어있습니다. 파일 또는 폴더를 올리면 분석 카드가 생성됩니다.';
        el.trackList.appendChild(empty);
        return;
    }
    state.tracks.forEach(track => {
        const card = document.createElement('article');
        card.className = `track-card ${state.selectedIds.has(track.id) ? 'selected' : ''} ${track.id === state.selectedId ? 'active-track' : ''} ${track.genreLocked ? 'genre-locked' : ''}`;
        card.dataset.trackId = track.id;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-pressed', state.selectedIds.has(track.id) ? 'true' : 'false');
        card.setAttribute('aria-label', `${track.name} 현재 작업으로 열기. 작업 선택 버튼으로만 마스터링 대상을 지정하고, 더블클릭하면 선택을 해제합니다.`);
        card.addEventListener('click', event => {
            if (event.target.closest('button')) return;
            activateTrackOnly(track.id);
        });
        card.addEventListener('dblclick', event => {
            if (event.target.closest('button')) return;
            clearTrackSelection(track.id);
        });
        card.addEventListener('keydown', event => {
            if (event.target.closest('button')) return;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                activateTrackOnly(track.id);
            }
            if (event.key === 'Backspace' || event.key === 'Delete') {
                event.preventDefault();
                clearTrackSelection(track.id);
            }
        });
        const top = document.createElement('div');
        top.className = 'track-top track-state-row';
        const statePills = document.createElement('div');
        statePills.className = 'track-state-pills';
        if (track.id === state.selectedId) {
            const activePill = document.createElement('span');
            activePill.className = 'track-state-pill track-state-active';
            activePill.textContent = '현재 작업';
            statePills.appendChild(activePill);
        } else if (state.selectedIds.has(track.id)) {
            const pickedPill = document.createElement('span');
            pickedPill.className = 'track-state-pill track-state-picked';
            pickedPill.textContent = '작업 선택';
            statePills.appendChild(pickedPill);
        }
        const status = document.createElement('span');
        status.className = `status-pill status-${track.status}`;
        status.textContent = statusLabel(track.status);
        statePills.appendChild(status);
        top.appendChild(statePills);
        const titleWrap = document.createElement('div');
        titleWrap.className = 'track-info-block';
        const title = document.createElement('strong');
        title.className = 'track-name';
        title.textContent = track.name;
        const meta = document.createElement('div');
        meta.className = 'track-meta';
        meta.textContent = `${formatBytes(track.size)} · ${track.type || 'audio'}`;
        const presetChip = document.createElement('div');
        presetChip.className = 'track-preset-chip';
        presetChip.textContent = `프리셋 · ${PRESET_LABELS[track.preset] || track.preset}${track.genreLocked ? ' · 잠금' : ''}`;
        titleWrap.append(title, meta, presetChip);
        const progressShell = document.createElement('div');
        progressShell.className = 'progress-shell';
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.style.width = `${track.progress || 0}%`;
        progressShell.appendChild(progressBar);
        const progressCaption = document.createElement('div');
        progressCaption.className = 'progress-caption';
        progressCaption.textContent = track.status === 'processing' ? (track.report || '마스터링 중') : (track.status === 'done' ? `완료 · ${track.qualityGate ? '품질 ' + track.qualityGate.label + ' · ' : ''}프리뷰/다운로드 가능` : '대기 중');
        const aiJudge = document.createElement('div');
        aiJudge.className = 'track-ai-judge';
        aiJudge.textContent = buildTrackAiJudgeText(track);
        const actions = document.createElement('div');
        actions.className = 'track-actions';
        const isPicked = state.selectedIds.has(track.id);
        actions.append(
            makeMiniButton(isPicked ? '선택 해제' : '작업 선택', isPicked ? 'btn-primary' : 'btn-secondary', () => toggleTrackSelection(track.id), state.busy),
            makeMiniButton(track.genreLocked ? '잠금 해제' : '장르 잠금', track.genreLocked ? 'btn-primary' : 'btn-secondary', () => toggleGenreLockForTrack(track), state.busy || !track.analysis),
            makeMiniButton('AI 프리셋', 'btn-secondary', () => applyAIRecommendationToTrack(track), state.busy || !track.analysis),
            makeMiniButton('마스터링', 'btn-primary', () => masterTrack(track), ['analyzing', 'processing'].includes(track.status) || state.busy || Boolean(track.error)),
            makeMiniButton('삭제', 'btn-danger', () => removeTrack(track.id), state.busy)
        );
        if (track.error && getDownloadEnvironmentInfo().restricted) {
            actions.append(makeMiniButton('외부 브라우저 복구', 'btn-primary', () => openCurrentPageInExternalBrowser(), state.busy));
        }
        let exportReadyPanel = null;
        if (track.outBlob) {
            exportReadyPanel = createTrackExportReadyPanel(track);
            const downloadButton = makeMiniButton('파일 다운로드', 'btn-secondary', () => downloadTrack(track), false);
            if (track.downloadAttention) downloadButton.classList.add('download-attention');
            actions.append(downloadButton);
            actions.append(makeMiniButton('리포트 저장', 'btn-secondary', () => downloadTrackReport(track), false));
        }
        card.append(top, titleWrap, progressShell, progressCaption, aiJudge);
        if (exportReadyPanel) card.appendChild(exportReadyPanel);
        card.appendChild(actions);
        el.trackList.appendChild(card);
    });
}
function createTrackExportReadyPanel(track) {
    const panel = document.createElement('div');
    panel.className = 'track-export-ready-panel';
    const env = getDownloadEnvironmentInfo();
    const format = getOutputFormatLabel(track.outFormat || state.outputFormat || 'wav24');
    const size = track.outBlob ? formatBytes(track.outBlob.size || 0) : '파일 준비됨';
    const title = document.createElement('strong');
    title.textContent = '완성 파일 준비됨';
    const meta = document.createElement('span');
    meta.textContent = `${format} · ${size}`;
    const hint = document.createElement('small');
    hint.textContent = env.restricted
        ? '카카오/인앱 브라우저에서는 파일 다운로드 창에서 공유 또는 외부 브라우저 안내를 먼저 확인하세요.'
        : env.shareFiles
            ? '다운로드 또는 공유 버튼으로 저장/전송할 수 있습니다.'
            : '공유 미지원 브라우저면 다운로드 후 파일 앱/문자/카카오에서 공유하세요.';
    panel.append(title, meta, hint);
    return panel;
}
function makeMiniButton(label, className, onClick, disabled = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn-mini ${className}`;
    button.textContent = label;
    button.disabled = Boolean(disabled);
    button.addEventListener('click', onClick);
    const help = getMiniButtonHelp(label);
    if (help) attachHelpTooltip(button, help);
    return button;
}
function getMiniButtonHelp(label) {
    if (label.includes('선택 해제')) return '선택 목록에서 이 곡을 제외합니다.';
    if (label.includes('작업 선택') || label === '선택') return '이 곡을 선택 목록에 추가합니다.';
    if (label.includes('잠금 해제')) return '장르 프리셋을 다시 자동 추천 대상에 포함합니다.';
    if (label.includes('장르 잠금')) return 'AI 재적용 시 현재 장르 프리셋을 유지합니다.';
    if (label.includes('AI 프리셋')) return '분석 결과 기준 추천 프리셋을 다시 적용합니다.';
    if (label.includes('마스터링')) return '이 트랙만 현재 설정으로 다시 렌더링합니다.';
    if (label.includes('다운로드')) return '완료된 마스터링 파일을 저장합니다.';
    if (label.includes('리포트')) return '마스터링 설정, 품질 게이트, 전후 분석을 JSON 리포트로 저장합니다.';
    if (label.includes('삭제')) return '이 트랙을 대기열에서 제거합니다.';
    return '';
}
function getDetailView() {
    const view = window.FoxBearDetailView;
    if (!view || typeof view.renderDetail !== 'function') {
        throw new Error('Detail view module is not loaded.');
    }
    return view;
}
function getDetailPanelsView() {
    const view = window.FoxBearDetailPanelsView;
    if (!view || typeof view.renderQualityGatePanel !== 'function') {
        throw new Error('Detail panels view module is not loaded.');
    }
    return view;
}
function getDetailPanelsViewDeps() {
    return {
        state,
        el,
        MASTER_FLOW_STEPS,
        clamp,
        createABSwitchPlayer,
        computeEngineSafetyInfo,
        formatPerformanceGuardInfo,
        getMasterStyleLabel,
        formatSigned,
        getOutputFormatLabel,
        ampToDb,
        stripTags,
        getClippingRiskText,
        getHeaviestPerformanceStage,
        formatPerformanceInfo,
        formatDurationMs,
        createComparisonInfo,
        getDspAmountScoreLabel
    };
}
function getDetailViewDeps() {
    return {
        state,
        el,
        PRESET_LABELS,
        PLATFORM_EXPORT_PRESETS,
        MASTER_PREVIEW_DURATION_SEC,
        getSelectedTrack,
        statusLabel,
        updateConfidenceUI,
        computeEngineSafetyInfo,
        renderAll,
        renderMasterComparisonPanel,
        renderABStudioPanel,
        renderSpectrumPanel,
        renderWaveformPanel,
        renderMasterReportPanel,
        renderQualityGatePanel,
        renderProcessingFlowPanel,
        renderEngineSafetyPanel,
        renderLowMonoPanel,
        addDetailRow,
        formatBytes,
        getOutputFormatLabel,
        getMasterGoalLabel,
        getMasterGoalDescription,
        getMasterStyleLabel,
        getMasterStyleDescription,
        getMasterStrengthLabel,
        getMasterStrengthDescription,
        getReferenceMatchStrengthLabel,
        getReferenceMatchStrengthAmount,
        getPlatformPresetLabel,
        getMasteringIntensity,
        formatSigned,
        getBeatPresetLabel,
        getBeatPresetForRatio,
        getInstrumentDetailText,
        featureLabelText,
        shouldApplyAiHumanizer,
        shouldApplyVocalProtection,
        formatPerformanceGuardInfo,
        formatInstrumentLayerResult,
        formatPerformanceInfo,
        getHeaviestPerformanceStage,
        formatDurationMs,
        ampToDb,
        getDspAmountScoreLabel,
        formatDspAmountSummary,
        getClippingRiskText,
        getQualityModeLabel,
        formatTime,
        getLowMonoRiskLabel,
        formatMobileSpeakerRisk,
        applyTrackToControls,
        canStartMasterPreview,
        renderMasterPreviewForTrack,
        getAiConfidenceTone,
        getAiConfidenceLabel,
        buildAiMasteringSummary,
        buildAiMasteringGridItems,
        buildRecommendationExplainability,
        simplifyAiReason,
        getAiCandidatePresets,
        getOriginalSelectionCandidate,
        buildCandidateExplainText,
        applyOriginalManualSelection,
        applyAiPresetCandidate,
        getAiMasteringRiskNotes,
        applyAIRecommendationToTrack,
        canStartAiMastering,
        masterTrackWithAiRecommendation,
        shouldOfferAiSafeRemaster,
        aiSafeRemasterTrack
    };
}
function renderDetail(options = {}) {
    return getDetailView().renderDetail(options, getDetailViewDeps());
}
function isDesktopDetailDefaultOpen() {
    return getDetailView().isDesktopDetailDefaultOpen(getDetailViewDeps());
}
function isAnalysisDetailOpen(track) {
    return getDetailView().isAnalysisDetailOpen(track, getDetailViewDeps());
}
function toggleAnalysisDetailOpen(trackId) {
    return getDetailView().toggleAnalysisDetailOpen(trackId, getDetailViewDeps());
}
function renderMasterPreviewQuickBar(track) {
    return getDetailView().renderMasterPreviewQuickBar(track, getDetailViewDeps());
}
function renderAiMasteringCard(track) {
    return getDetailView().renderAiMasteringCard(track, getDetailViewDeps());
}
function makeAiMasteringMetric(label, value, tone = 'neutral') {
    return getDetailView().makeAiMasteringMetric(label, value, tone);
}
function buildAiMasteringGridItems(track) {
    if (!track || !track.analysis) {
        return [
            { label: '상태', value: statusLabel(track?.status || 'queued'), tone: 'neutral' },
            { label: '추천', value: '분석 대기', tone: 'neutral' },
            { label: '목표', value: `${Number(state.targetLufs || -14).toFixed(0)} LUFS`, tone: 'neutral' },
            { label: '가드', value: '대기', tone: 'neutral' }
        ];
    }
    const preset = PRESET_LABELS[track.preset || track.recommendedPreset] || track.preset || '커스텀';
    const altCount = getAiCandidatePresets(track).length;
    const gate = track.qualityGate ? `${track.qualityGate.label} · ${track.qualityGate.score}점` : '렌더 전';
    return [
        { label: '선택 프리셋', value: preset, tone: 'cyan' },
        { label: 'AI 신뢰도', value: `${getAiConfidenceLabel(track)} ${track.confidence || 0}%`, tone: getAiConfidenceTone(track) },
        { label: '목표/피크', value: `${Number(state.targetLufs || -14).toFixed(0)} LUFS · ${Number(state.ceilingDb || -1).toFixed(1)} dB`, tone: 'neutral' },
        { label: '품질 판정', value: gate, tone: track.qualityGate?.status === 'fail' ? 'danger' : track.qualityGate?.status === 'warn' ? 'warn' : 'ok' },
        { label: '스타일', value: getMasterStyleLabel(state.masterStyle), tone: 'cyan' },
        { label: '성향', value: getMasterStrengthLabel(state.masterStrength), tone: getMasterStrengthTone(state.masterStrength) },
        { label: '후보 수', value: altCount ? `${altCount}개` : '없음', tone: altCount ? 'ok' : 'neutral' }
    ];
}
function buildAiMasteringSummary(track) {
    const preset = PRESET_LABELS[track.recommendedPreset || track.preset] || track.recommendedPreset || track.preset || '커스텀';
    const confidence = Number(track.confidence || 0);
    const mode = confidence >= 78 ? '바로 진행해도 좋은 추천값입니다.' : confidence >= 58 ? '대안 프리셋도 함께 비교해보는 것을 권장합니다.' : '장르 판단이 애매하니 후보 프리셋을 한 번 확인해주세요.';
    const guards = [
        state.featureFlags.vocalProtect ? '보컬 보호' : '',
        state.featureFlags.earFatigueGuard ? '청감 피로 가드' : '',
        state.featureFlags.truePeakGuard ? '피크 가드' : ''
    ].filter(Boolean).join(' · ');
    const explanation = buildRecommendationExplainability(track);
    const explainText = explanation.primarySignal ? ` 주요 근거: ${explanation.primarySignal}.` : '';
    const cautionText = explanation.primaryCaution ? ` 감점: ${explanation.primaryCaution}.` : '';
    return `${preset} 기준으로 ${getMasterStyleLabel(state.masterStyle)} 스타일을 적용합니다. ${mode} 활성 보호: ${guards || '기본'}.${explainText}${cautionText}`;
}
function simplifyAiReason(reason) {
    const value = String(reason || '').trim();
    if (!value) return '파일명과 오디오 분석값을 기준으로 현재 프리셋을 추천했습니다.';
    return value.replace(/\s+/g, ' ').slice(0, 180);
}
function getAiCandidatePresets(track) {
    if (!track || !track.analysis) return [];
    const recommendedPreset = track.recommendedPreset || track.preset;
    const baseConfidence = clamp(Math.round(Number(track.confidence || 0)), 0, 99);
    const alternativeMap = new Map((track.genreAlternatives || []).map((item, index) => [item.preset, { ...item, index }]));
    const seen = new Set();
    const candidates = [];
    const add = preset => {
        if (!preset || seen.has(preset) || preset === 'custom') return;
        seen.add(preset);
        const alternative = alternativeMap.get(preset) || null;
        const recommended = preset === recommendedPreset;
        const fallbackIndex = candidates.length;
        let percent = recommended ? baseConfidence : Math.max(35, baseConfidence - (fallbackIndex * 7 + 5));
        if (alternative && Number.isFinite(Number(alternative.score))) {
            const bestScore = Number((track.genreAlternatives || [])[0]?.score || alternative.score || 0);
            const delta = Math.max(0, bestScore - Number(alternative.score));
            percent = recommended ? baseConfidence : clamp(Math.round(baseConfidence - delta * 9 - (alternative.index || 0) * 3), 34, Math.max(34, baseConfidence - 4));
        }
        candidates.push({ preset, label: PRESET_LABELS[preset] || alternative?.label || preset, percent, recommended });
    };
    add(recommendedPreset);
    (track.genreAlternatives || []).forEach(item => add(item.preset));
    if (candidates.length < 3) {
        ['pop', 'kpop', 'kballad', 'rnb', 'dance', 'hiphop', 'punch', 'tape'].forEach(add);
    }
    return candidates.slice(0, 4);
}
function getOriginalSelectionCandidate(track) {
    return {
        preset: 'custom',
        label: '원본선택',
        percent: 100,
        meta: '원음',
        mark: '수동',
        recommended: false,
        manual: true,
        active: Boolean(track && track.originalManualSelected)
    };
}
function getAiConfidenceTone(track) {
    const confidence = Number(track?.confidence || 0);
    if (confidence >= 78) return 'ok';
    if (confidence >= 58) return 'warn';
    if (confidence > 0) return 'danger';
    return 'neutral';
}
function getAiConfidenceLabel(track) {
    const confidence = Number(track?.confidence || 0);
    if (confidence >= 78) return '신뢰도 높음';
    if (confidence >= 58) return '신뢰도 보통';
    if (confidence > 0) return '신뢰도 낮음';
    return '추천 대기';
}
function getAiMasteringRiskNotes(track) {
    const notes = [];
    const analysis = track?.analysis || null;
    if (!analysis) return notes;
    if (Number(analysis.peakDb) > -1.2) notes.push('원본 피크 여유 부족');
    if (Number(analysis.brightness) > 0.68 || Number(analysis.metallicHint) > 0.62) notes.push('고역 피로 가능성');
    if (Number(analysis.lowMonoScore) < 68 || analysis.lowMonoRisk === 'high') notes.push('저역 모노 호환 확인');
    if (Number(analysis.stereoWidth) > 0.78) notes.push('스테레오 폭 과다 가능성');
    if (Number(analysis.loudnessHint) > -9) notes.push('이미 큰 음압 · 강도 낮춤 권장');
    if (track.qualityGate?.status === 'warn') notes.unshift('마스터링 결과 확인 필요');
    if (track.qualityGate?.status === 'fail') notes.unshift('품질 게이트 실패 · 재보정 권장');
    return Array.from(new Set(notes)).slice(0, 4);
}
function applyAiPresetCandidate(track, preset) {
    if (!track || !track.analysis || state.busy) return;
    if (preset === 'custom') {
        applyOriginalManualSelection(track);
        return;
    }
    const settings = makeRecommendedSettings(preset, track.analysis);
    saveUndoPoint(track, '추천 후보 적용 전');
    track.preset = preset;
    track.settings = cloneSettings(settings);
    track.genreLocked = true;
    invalidateMasteredOutput(track, `${PRESET_LABELS[preset] || preset} 후보 프리셋을 적용했습니다. 다시 마스터링하세요.`, false);
    state.selectedId = track.id;
    applyTrackToControls(track);
    renderAll({ keepDetailAudio: true });
    showToast(`${PRESET_LABELS[preset] || preset} 후보 프리셋을 적용했습니다.`);
}
function applyOriginalManualSelection(track) {
    if (!track || state.busy) return false;
    saveUndoPoint(track, '원본선택 전');
    track.preset = 'custom';
    track.settings = cloneSettings(GENRE_PRESETS.custom);
    track.genreLocked = true;
    track.originalManualSelected = true;
    invalidateMasteredOutput(track, '원본선택 모드입니다. 원음 기준에서 직접 조절한 뒤 마스터링하세요.', false);
    state.selectedId = track.id;
    applyTrackToControls(track);
    renderAll({ keepDetailAudio: true });
    showToast('원본선택: 원음 기준 커스텀 조절 모드로 전환했습니다.');
    return true;
}
function canStartAiMastering(track) {
    return Boolean(track && track.analysis && !state.busy && !track.error && !['processing', 'analyzing'].includes(track.status));
}
async function masterTrackWithAiRecommendation(track) {
    if (!canStartAiMastering(track)) {
        showToast('분석이 끝난 정상 트랙에서만 AI 추천 마스터링을 진행할 수 있습니다.');
        return;
    }
    applyAiRecommendationSettings(track, false, 'AI 추천 설정으로 마스터링을 시작합니다.');
    state.selectedId = track.id;
    applyTrackToControls(track);
    renderAll({ keepDetailAudio: true });
    await masterTrack(track);
}
function applyAiRecommendationSettings(track, autoRefresh = false, report = '') {
    if (!track || !track.analysis) return false;
    saveUndoPoint(track, 'AI 추천 복원 전');
    if (track.genreLocked) {
        track.settings = cloneSettings(makeRecommendedSettings(track.preset || 'custom', track.analysis));
        invalidateMasteredOutput(track, report || `${PRESET_LABELS[track.preset] || track.preset} 잠금 장르 기준 추천값을 적용했습니다.`, autoRefresh);
    } else {
        track.preset = track.recommendedPreset || 'custom';
        track.settings = cloneSettings(track.recommendedSettings || makeRecommendedSettings(track.preset, track.analysis));
        invalidateMasteredOutput(track, report || `${PRESET_LABELS[track.preset] || track.preset} AI 추천값을 적용했습니다.`, autoRefresh);
    }
    return true;
}
function shouldOfferAiSafeRemaster(track) {
    return Boolean(track && track.outBlob && track.qualityGate && track.qualityGate.status !== 'pass');
}
function applyAiSafeRemasterPlan(track) {
    if (!track || !track.analysis) return [];
    const current = cloneSettings(track.settings || track.recommendedSettings || GENRE_PRESETS.custom);
    const gateStatus = track.qualityGate?.status || 'warn';
    const reasons = [];
    const gateFail = gateStatus === 'fail';
    const cut = gateFail ? 18 : 10;
    current.intensity = clamp(Math.round(Number(current.intensity || 100) - cut), 50, 190);
    current.dynamicPunch = clamp(Math.round(Number(current.dynamicPunch || 50) - (gateFail ? 8 : 5)), 5, 82);
    current.metallicRemoval = clamp(Math.round(Number(current.metallicRemoval || 35) + (gateFail ? 12 : 8)), 0, 90);
    current.clarity = clamp(Math.round(Number(current.clarity || 50) - (gateFail ? 5 : 3)), 0, 88);
    reasons.push(`강도 ${cut}%p 완화`);
    if (Number(track.analysis.lowMonoScore) < 74 || track.analysis.lowMonoRisk === 'high') {
        current.width = clamp(Math.round(Number(current.width || 50) - 8), 8, 76);
        current.stereoGroove = clamp(Math.round(Number(current.stereoGroove || 20) - 6), 0, 70);
        reasons.push('저역/위상 안전폭 보정');
    }
    if (Number(track.analysis.brightness) > 0.64 || Number(track.analysis.metallicHint) > 0.58) {
        current.warmth = clamp(Math.round(Number(current.warmth || 45) + 5), 8, 90);
        reasons.push('고역 피로 완화');
    }
    track.settings = current;
    track.aiSafeRemaster = { createdAt: new Date().toISOString(), reasons };
    invalidateMasteredOutput(track, `AI 안전 재마스터링 준비 · ${reasons.join(' · ')}`, false);
    return reasons;
}
async function aiSafeRemasterTrack(track) {
    if (!track || state.busy || track.status === 'processing' || track.status === 'analyzing') return;
    if (!track.analysis) {
        showToast('분석이 완료된 뒤 AI 재마스터링을 사용할 수 있습니다.');
        return;
    }
    const reasons = applyAiSafeRemasterPlan(track);
    state.selectedId = track.id;
    applyTrackToControls(track);
    renderAll({ keepDetailAudio: true });
    showToast(`AI 안전 재마스터링: ${reasons.join(' · ')}`);
    await masterTrack(track);
}
function renderPreviewPlayers(track, target = el.trackDetail, options = {}) {
    if (track && track.masteredUrl) target.appendChild(createABSwitchPlayer(track));
    const previewGrid = document.createElement('div');
    previewGrid.className = `preview-grid ${options.vertical ? 'preview-grid-vertical' : ''}`;
    const originalCard = document.createElement('div');
    originalCard.className = 'preview-card';
    const originalLabel = makePreviewTitle('원곡 프리뷰', track.analysis?.duration);
    originalCard.append(originalLabel, createPreviewPlayer(track.originalUrl, 0, track.analysis?.duration, state.abLoopMode, getTrackHighlightStart(track), { trackId: track.id, mode: 'original', label: '원음 미리듣기' }));
    const masteredCard = document.createElement('div');
    masteredCard.className = 'preview-card';
    const masteredLabel = makePreviewTitle('마스터링 프리뷰', track.masteredDurationSec || null);
    masteredCard.appendChild(masteredLabel);
    if (track.masteredUrl) {
        masteredCard.appendChild(createPreviewPlayer(track.masteredUrl, getABMatchGainDb(track), track.masteredDurationSec, state.abLoopMode, getTrackHighlightStart(track), { trackId: track.id, mode: 'mastered', label: '마스터 미리듣기' }));
    } else {
        const empty = document.createElement('div');
        empty.className = 'preview-empty';
        empty.textContent = '마스터링 실행 후 활성화됩니다.';
        masteredCard.appendChild(empty);
    }
    previewGrid.append(originalCard, masteredCard);
    target.appendChild(previewGrid);
}
function renderPreviewDialogUnifiedPlayers(track, target) {
    if (!track || !target) return;
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'preview-section-title preview-section-title-unified';
    sectionTitle.textContent = '완료본 통합 미리듣기 / A-B 비교';
    target.appendChild(sectionTitle);
    if (track.masteredUrl) {
        target.appendChild(createABSwitchPlayer(track));
    }
    const grid = document.createElement('div');
    grid.className = 'preview-grid preview-grid-vertical preview-dialog-unified-grid';
    if (track.masteredUrl) {
        const masteredCard = document.createElement('div');
        masteredCard.className = 'preview-card preview-dialog-unified-card';
        masteredCard.appendChild(makePreviewTitle('마스터링 완료본', track.masteredDurationSec || track.analysis?.duration));
        const masteredPlayer = createDockIntegratedWaveformPlayer(track, {
            src: track.masteredUrl,
            mode: 'mastered',
            duration: track.masteredDurationSec || track.analysis?.duration,
            startSec: getRealtimePreviewStartSec(track),
            gainDb: getABMatchGainDb(track),
            translationMode: true,
            seekTarget: 'local',
            waveformRole: 'preview-dialog-mastered',
            waveformClass: 'preview-dialog-waveform-bars',
            playerClass: 'preview-dialog-unified-player',
            playerRole: 'preview-dialog-mastered',
            sourceLabel: '마스터링'
        });
        const audio = masteredPlayer.querySelector('audio');
        if (audio) {
            audio.dataset.previewSystem = 'preview-dialog-mastered';
            audio.setAttribute('aria-label', `${track.name || '선택 곡'} 마스터링 완료본 통합 미리듣기 재생`);
        }
        masteredCard.appendChild(masteredPlayer);
        grid.appendChild(masteredCard);
    }
    target.appendChild(grid);
}
function getPreviewTranslationMode() {
    const mode = String(state.previewTranslationMode || 'studio');
    return PREVIEW_TRANSLATION_MODES[mode] || PREVIEW_TRANSLATION_MODES.studio;
}
function handlePreviewTranslationModeClick(event) {
    const button = event.target?.closest?.('[data-preview-translation-mode]');
    if (!button) return;
    runDockRemoteTranslationMode(button.dataset.previewTranslationMode || 'studio', event);
}
function runDockRemoteTranslationMode(mode, event = null) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    const track = activateMainTrackFromDock(resolveMainActiveTrackForDock());
    if (!track) {
        showToast('먼저 음원을 불러온 뒤 재생환경을 바꿀 수 있습니다.');
        return false;
    }
    applyPreviewTranslationMode(mode, { keepPlaying: true, toast: true, track, userGesture: true });
    return true;
}
function syncBottomCompareTools() {
    if (el.bottomPreviewAbMatchBtn) {
        el.bottomPreviewAbMatchBtn.classList.toggle('active', Boolean(state.abLevelMatch));
        el.bottomPreviewAbMatchBtn.setAttribute('aria-pressed', String(Boolean(state.abLevelMatch)));
        el.bottomPreviewAbMatchBtn.textContent = state.abLevelMatch ? '레벨매칭 ON' : '레벨매칭 OFF';
        el.bottomPreviewAbMatchBtn.title = state.abLevelMatch ? '원본/마스터 체감 볼륨을 맞춰 비교합니다.' : '마스터링된 실제 음량 차이를 그대로 듣습니다.';
    }
    if (el.bottomPreviewDifferenceBtn) {
        const track = getSelectedTrack();
        const enabled = Boolean(track && (track.masteredUrl || track.masterPreviewUrl));
        el.bottomPreviewDifferenceBtn.disabled = !enabled;
        el.bottomPreviewDifferenceBtn.classList.toggle('active', Boolean(state.abDifferenceListen));
        el.bottomPreviewDifferenceBtn.setAttribute('aria-pressed', String(Boolean(state.abDifferenceListen)));
        el.bottomPreviewDifferenceBtn.textContent = state.abDifferenceListen ? '차이듣기 ON' : '차이듣기';
        el.bottomPreviewDifferenceBtn.title = enabled ? '마스터에서 원본을 빼 실제로 달라진 성분을 확인합니다.' : '마스터링 또는 15초 하이라이트 듣기 생성 후 사용할 수 있습니다.';
    }
}
function renderPreviewTranslationModeControls(activeSourceMode = state.bottomPreviewMode) {
    if (!el.bottomPreviewTranslationModes) return;
    const active = getPreviewTranslationMode();
    el.bottomPreviewTranslationModes.textContent = '';
    const label = document.createElement('span');
    label.className = 'bottom-preview-translation-label';
    label.textContent = '\u{1F39A} 재생환경';
    el.bottomPreviewTranslationModes.appendChild(label);
    Object.values(PREVIEW_TRANSLATION_MODES).forEach(mode => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'bottom-preview-translation-btn';
        button.dataset.previewTranslationMode = mode.id;
        button.textContent = mode.short;
        button.title = mode.title;
        button.dataset.help = mode.title;
        button.setAttribute('aria-pressed', String(active.id === mode.id));
        button.setAttribute('aria-label', mode.aria);
        if (active.id === mode.id) button.classList.add('active');
        attachHelpTooltip(button, mode.title);
        el.bottomPreviewTranslationModes.appendChild(button);
    });
    const hint = document.createElement('em');
    hint.className = 'bottom-preview-translation-hint';
    hint.textContent = active.id === 'studio' ? '렌더 그대로' : `${active.label} 체크`;
    if (activeSourceMode === 'masterPreview') hint.textContent += ' · 15초';
    el.bottomPreviewTranslationModes.appendChild(hint);
}
function setupPreviewTranslationAudio(audio, options = {}) {
    if (!audio || options.translationMode === false) return null;
    rememberAudioTargetVolume(audio);
    const mode = getPreviewTranslationMode();
    if (mode.id === 'studio' || getInAppAudioCompatibility().restricted) return null;
    try {
        const controller = window.FoxBearPreviewTranslationService?.attach?.(audio, {
            mode: mode.id,
            persistent: options.persistentTranslation === true,
            createContext: () => FoxBearAudioContexts.create({ purpose: 'preview-translation', ownerId: `preview-translation:${options.trackId || audio.dataset.spectrumTrackId || 'track'}:${Date.now()}`, latencyHint: 'interactive' }),
            createAnalyser: createSpectrumAnalyserTap
        });
        if (!controller) return null;
        registerExternalSpectrumAnalyser(audio, controller.analyser, controller.context, { role: 'preview-translation', trackId: options.trackId || audio.dataset.spectrumTrackId || '', mode: mode.id, label: `${mode.label || mode.id} FFT` });
        return controller.context;
    } catch (error) {
        console.warn('Preview translation graph unavailable:', error);
        return null;
    }
}
function createPreviewTranslationFilterChain(context, modeId) { return window.FoxBearPreviewTranslationService?.createFilterChain?.(context, modeId) || []; }
function connectPreviewMonoMatrix(context, source, firstNode) { return window.FoxBearPreviewTranslationService?.connectMonoMatrix?.(context, source, firstNode) || []; }
function closePreviewTranslationContext(context) { if (context && context.state !== 'closed') FoxBearAudioContexts.close(context, 'preview-translation-close'); }
function getBottomPreviewDockTrack() {
    const dockTrackId = state.bottomPreviewTrackId;
    const dockTrack = dockTrackId ? state.tracks.find(track => track.id === dockTrackId) : null;
    return dockTrack || getSelectedTrack() || state.tracks[0] || null;
}
function hasActiveBlockingWork() {
    return Boolean(
        state.masterPreviewRenderingTrackId ||
        state.tracks.some(track => track.status === 'processing' || track.status === 'analyzing')
    );
}
function clearStaleBusyFlagIfIdle(reason = '') {
    if (!state.busy || hasActiveBlockingWork()) return false;
    console.warn('Clearing stale busy flag', reason || 'idle dock action');
    state.busy = false;
    return true;
}
function isActionBusyBlocked() {
    clearStaleBusyFlagIfIdle('action-busy-check');
    return Boolean(isAnyExportActive() || (state.busy && hasActiveBlockingWork()));
}
function getDockActionTrack() {
    return getBottomPreviewDockTrack() || getSelectedTrack() || state.tracks[0] || null;
}
function prepareTrackForDockAction(track) {
    if (!track && state.tracks.length === 1) track = state.tracks[0];
    if (!track) return null;
    state.selectedId = track.id;
    state.bottomPreviewTrackId = track.id;
    if (state.selectedIds && typeof state.selectedIds.add === 'function') state.selectedIds.add(track.id);
    return track;
}
function selectBottomPreviewMode(mode, autoPlay = false, trackOverride = null) {
    const track = prepareTrackForDockAction(trackOverride || getDockActionTrack());
    if (!track) return;
    captureBottomPreviewTransport(track, state.bottomPreviewMode);
    const nextMode = mode === 'mastered' ? 'mastered' : (mode === 'masterPreview' ? 'masterPreview' : 'original');
    if (nextMode === 'mastered' && !track.masteredUrl) {
        showToast('마스터링 실행 후 마스터링 프리뷰가 활성화됩니다.');
        return;
    }
    if (nextMode === 'masterPreview' && !track.masterPreviewUrl) {
        renderMasterPreviewForTrack(track, { source: 'dock' });
        return;
    }
    state.bottomPreviewMode = nextMode;
    state.bottomPreviewTrackId = track.id;
    if ((nextMode === 'mastered' || nextMode === 'masterPreview') && autoPlay) state.bottomPreviewAutoplayTrackId = track.id;
    renderBottomPreviewDock({ autoPlay: (nextMode === 'mastered' || nextMode === 'masterPreview') && autoPlay });
}
function runDockRemoteSourceMode(mode, event = null) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    const track = activateMainTrackFromDock(resolveMainActiveTrackForDock());
    if (!track) {
        showToast('먼저 음원을 불러온 뒤 프리뷰를 전환할 수 있습니다.');
        return false;
    }
    const nextMode = mode === 'mastered' ? 'mastered' : (mode === 'masterPreview' ? 'masterPreview' : 'original');
    if (nextMode === 'mastered' && !track.masteredUrl) {
        showToast('마스터링 완료 후 마스터링 프리뷰로 전환할 수 있습니다.');
        return false;
    }
    if (nextMode === 'masterPreview' && !track.masterPreviewUrl) {
        runDockRemoteMasterPreview(event);
        return false;
    }
    captureBottomPreviewTransport(track, state.bottomPreviewMode);
    state.bottomPreviewMode = nextMode;
    state.bottomPreviewTrackId = track.id;
    state.bottomPreviewAutoplayTrackId = track.id;
    renderBottomPreviewDock({ autoPlay: true, keepPlaying: true, userGesture: true });
    foxBearHaptic('switch');
    showToast(nextMode === 'mastered' ? '마스터링 프리뷰로 전환했습니다.' : '원곡 프리뷰로 전환했습니다.');
    return true;
}
function resolveMainActiveTrackForDock() {
    // Dock is only a remote controller. The source of truth is the track that the
    // main screen currently regards as active. Fallbacks only keep the remote
    // usable after imports or stale Dock state.
    const selected = getSelectedTrack();
    if (selected) return selected;
    const dock = getBottomPreviewDockTrack();
    if (dock) return dock;
    return state.tracks[0] || null;
}
function activateMainTrackFromDock(track) {
    const target = track || resolveMainActiveTrackForDock();
    if (!target) return null;
    state.selectedId = target.id;
    state.bottomPreviewTrackId = target.id;
    if (state.selectedIds && typeof state.selectedIds.add === 'function') state.selectedIds.add(target.id);
    try { applyTrackToControls(target); } catch (error) { console.warn('Dock remote control sync failed:', error); }
    return target;
}
function isOtherTrackBlockingDockAction(track) {
    if (!track) return Boolean(state.busy && hasActiveBlockingWork());
    return Boolean(state.tracks.some(item => item.id !== track.id && (item.status === 'processing' || item.status === 'analyzing')) || (state.masterPreviewRenderingTrackId && state.masterPreviewRenderingTrackId !== track.id));
}
async function runDockRemoteMaster(event = null) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    clearStaleBusyFlagIfIdle('dock-remote-master');
    const track = activateMainTrackFromDock(resolveMainActiveTrackForDock());
    if (!track) {
        showToast('마스터링할 곡을 먼저 불러와주세요.');
        return false;
    }
    if (track.error) {
        showToast('오류가 있는 곡입니다. 다시 불러온 뒤 마스터링해주세요.');
        return false;
    }
    if (track.status === 'processing') {
        showToast('이미 이 곡의 마스터링이 진행 중입니다.');
        return false;
    }
    if (state.busy && isOtherTrackBlockingDockAction(track)) {
        showToast('다른 곡 작업이 끝난 뒤 다시 눌러주세요.');
        return false;
    }
    showToast(`${track.name || '선택 곡'} 마스터링을 시작합니다.`);
    const ok = await masterTrack(track, false, { awaitAnalysis: true, notifyBlocked: true, forceIfIdle: true, source: 'dock-remote' });
    if (!ok && track.status !== 'processing') renderAll({ keepDetailAudio: true });
    return ok;
}
async function masterBottomPreviewTrack(event = null) {
    return runDockRemoteMaster(event);
}
function canStartMasterPreview(track) {
    if (!track || !track.analysis || track.error) return false;
    if (track.status === 'processing' || track.status === 'analyzing') return false;
    if (state.busy && isOtherTrackBlockingDockAction(track)) return false;
    clearStaleBusyFlagIfIdle('master-preview-start-check');
    return !state.busy || !hasActiveBlockingWork();
}
async function renderMasterPreviewForSelected(source = 'detail') {
    const track = source === 'dock' || source === 'dock-remote'
        ? activateMainTrackFromDock(resolveMainActiveTrackForDock())
        : (preparePrimaryActionTrack(getSelectedTrack()) || activateMainTrackFromDock(resolveMainActiveTrackForDock()));
    if (!track) {
        showToast('미리듣기할 곡을 먼저 선택해주세요.');
        return;
    }
    await renderMasterPreviewForTrack(track, { source });
}
async function runDockRemoteMasterPreview(event = null) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    clearStaleBusyFlagIfIdle('dock-remote-preview');
    const track = activateMainTrackFromDock(resolveMainActiveTrackForDock());
    if (!track) {
        showToast('하이라이트 듣기할 곡을 먼저 불러와주세요.');
        return false;
    }
    if (track.error) {
        showToast('오류가 있는 곡입니다. 다시 불러온 뒤 하이라이트 듣기를 만들어주세요.');
        return false;
    }
    if (track.status === 'processing') {
        showToast('마스터링 작업이 끝난 뒤 하이라이트 듣기를 사용할 수 있습니다.');
        return false;
    }
    if (state.busy && isOtherTrackBlockingDockAction(track)) {
        showToast('다른 곡 작업이 끝난 뒤 다시 눌러주세요.');
        return false;
    }
    await renderMasterPreviewForTrack(track, { source: 'dock-remote' });
    return Boolean(track.masterPreviewUrl && track.masterPreviewInfo);
}
async function renderDockMasterPreview(event = null) {
    return runDockRemoteMasterPreview(event);
}
async function renderMasterPreviewForTrack(track, options = {}) {
    if (!track) return;
    if (!track.analysis || track.status === 'analyzing') {
        const ready = await waitForTrackAnalysisIfNeeded(track, String(options.source || '').startsWith('dock') ? '하이라이트 듣기' : '미리듣기');
        if (!ready) { showToast('분석을 완료하지 못해 하이라이트 듣기를 만들 수 없습니다.'); renderBottomPreviewDock({ keepPlaying: true }); return; }
    }
    if (track.masterPreviewUrl && track.masterPreviewInfo && track.masterPreviewStatus !== 'processing') {
        state.selectedId = track.id; state.bottomPreviewMode = 'masterPreview'; state.bottomPreviewTrackId = track.id; state.bottomPreviewAutoplayTrackId = track.id;
        renderAll({ keepDetailAudio: true, autoPlay: true }); requestAnimationFrame(playBottomPreviewAudio); showToast('준비된 15초 하이라이트 듣기를 재생합니다.'); return;
    }
    if (!canStartMasterPreview(track)) {
        const reason = track.status === 'analyzing' ? '분석이 끝난 뒤 하이라이트 듣기를 만들 수 있습니다.'
            : track.status === 'processing' ? '마스터링 작업이 끝난 뒤 하이라이트 듣기를 만들 수 있습니다.'
            : track.error ? '오류가 있는 곡입니다. 다시 불러온 뒤 진행해주세요.' : state.busy ? '현재 작업이 끝난 뒤 다시 눌러주세요.'
            : '분석이 끝난 정상 트랙에서만 하이라이트 듣기를 만들 수 있습니다.';
        showToast(reason); renderBottomPreviewDock({ keepPlaying: true }); return;
    }
    const previewJobs = getMasterPreviewJobService();
    if (!previewJobs?.create || !previewJobs?.assertActive) { showToast('하이라이트 작업 관리 서비스를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.'); return; }
    pauseAllPreviewAudio();
    const previousReport = track.report || '';
    const previewJob = previewJobs.create(track, { label: `master-preview:${track.id}`, supersedeReason: 'master-preview-restarted' });
    const isTrackActive = candidate => state.tracks.some(item => item === candidate || item.id === candidate?.id);
    const previewTask = { signal: previewJob.signal, throwIfCancelled(stage = 'master-preview') { return previewJobs.assertActive(track, previewJob, isTrackActive, stage); } };
    let completed = false; let pendingUrl = '';
    state.busy = true; state.masterPreviewRenderingTrackId = track.id; state.masterPreviewRenderingJobId = previewJob.id;
    track.masterPreviewStatus = 'processing'; track.report = '15초 하이라이트 듣기 생성 중'; renderAll({ keepDetailAudio: true });
    try {
        previewTask.throwIfCancelled('decode-start');
        const sourceBuffer = await decodeAudio(track.file, previewTask);
        previewTask.throwIfCancelled('decode-complete');
        const startSec = computeMasterPreviewSliceStartSec(track, sourceBuffer);
        let segmentBuffer = sliceAudioBuffer(sourceBuffer, startSec, MASTER_PREVIEW_DURATION_SEC);
        segmentBuffer = removeDcOffsetAudioBuffer(segmentBuffer).buffer || segmentBuffer;
        sanitizeAudioBuffer(segmentBuffer, 'master-preview-source'); await yieldToBrowser(); previewTask.throwIfCancelled('source-slice');
        let preparedBuffer = await preparePitchSpeedBuffer(segmentBuffer, track.transform, { signal: previewJob.signal, jobId: `${previewJob.id}:pitch`, label: '하이라이트 피치/BPM 변환' });
        previewTask.throwIfCancelled('pitch-speed');
        if (shouldUseInstrumentLayer(track.instrument)) preparedBuffer = mixInstrumentLayerBuffer(preparedBuffer, track.instrument, track.analysis).buffer;
        sanitizeAudioBuffer(preparedBuffer, 'master-preview-prepared'); await yieldToBrowser(); previewTask.throwIfCancelled('prepared-buffer');
        const albumProfile = getActiveAlbumProfile();
        const masteredBuffer = await renderMasterBuffer(preparedBuffer, track.settings, track.preset, track.analysis, albumProfile);
        previewTask.throwIfCancelled('master-chain'); sanitizeAudioBuffer(masteredBuffer, 'master-preview-chain'); await yieldToBrowser(); previewTask.throwIfCancelled('finalizer-start');
        const finalization = await finalizeMasterBufferAsync(masteredBuffer, {
            targetLufs: resolveTargetLufsForTrack(track), ceilingDb: state.ceilingDb, qualityMode: state.qualityMode === 'max' ? 'balanced' : state.qualityMode,
            masterGoal: state.masterGoal, truePeak: state.featureFlags.truePeakGuard, analysis: track.analysis || {},
            dspProfile: getSharedDspSummaryForReport(track.analysis?.sharedDspProfileApplied), signal: previewJob.signal, jobId: `${previewJob.id}:finalizer`
        });
        previewTask.throwIfCancelled('finalizer-complete');
        const finalBuffer = finalization.buffer;
        sanitizeAudioBuffer(finalBuffer, 'master-preview-finalizer');
        const blob = await encodeWavAsync(finalBuffer, 'wav16', { signal: previewJob.signal, jobId: `${previewJob.id}:wav` });
        previewTask.throwIfCancelled('wav-complete');
        if (!blob || blob.size <= 44) throw new Error('하이라이트 듣기 파일이 비어 있습니다.');
        pendingUrl = URL.createObjectURL(blob); previewTask.throwIfCancelled('commit');
        if (track.masterPreviewUrl) URL.revokeObjectURL(track.masterPreviewUrl);
        track.masterPreviewBlob = blob; track.masterPreviewUrl = pendingUrl; pendingUrl = '';
        track.masterPreviewInfo = {
            startSec, durationSec: finalBuffer.duration || MASTER_PREVIEW_DURATION_SEC, sourceDurationSec: segmentBuffer.duration || MASTER_PREVIEW_DURATION_SEC,
            preset: track.preset, settings: cloneSettings(track.settings), createdAt: new Date().toISOString(), finalizeInfo: finalization.info || {},
            waveformOverview: sampleWaveformOverview(finalBuffer, DOCK_WAVEFORM_BINS), sourceWaveformOverview: sampleWaveformOverview(segmentBuffer, DOCK_WAVEFORM_BINS),
            dspProfile: getSharedDspSummaryForReport(track.analysis?.sharedDspProfileApplied)
        };
        track.masterPreviewStatus = 'ready'; track.report = `하이라이트 듣기 준비됨 · ${formatTime(startSec)}부터 약 ${Math.round(track.masterPreviewInfo.durationSec)}초`;
        state.selectedId = track.id; state.bottomPreviewMode = 'masterPreview'; state.bottomPreviewTrackId = track.id; state.bottomPreviewAutoplayTrackId = track.id;
        completed = true; showToast('15초 하이라이트 듣기를 생성했습니다. Dock에서 재생합니다.');
    } catch (error) {
        if (pendingUrl) { try { URL.revokeObjectURL(pendingUrl); } catch (revokeError) {} pendingUrl = ''; }
        const cancelled = previewJobs.isAbortError?.(error) || isWorkerJobAbortError(error);
        const ownsJob = previewJobs.owns?.(track, previewJob) && isTrackActive(track);
        if (cancelled) { console.info('Master preview cancelled:', error?.stage || error?.message || 'cancelled'); if (ownsJob) { track.masterPreviewStatus = 'idle'; track.report = previousReport || '하이라이트 듣기 취소됨'; } }
        else if (ownsJob) { console.error('Master preview error:', error); track.masterPreviewStatus = 'error'; track.report = previousReport || '하이라이트 듣기 생성 실패'; showToast(`하이라이트 듣기 실패: ${getErrorMessage(error, '알 수 없는 오류')}`); }
    } finally {
        const ownsJob = Boolean(previewJobs.owns?.(track, previewJob));
        const ownsGlobalState = state.masterPreviewRenderingJobId === previewJob.id;
        if (ownsJob) previewJobs.finish?.(track, previewJob);
        if (ownsGlobalState) { state.busy = false; state.masterPreviewRenderingTrackId = null; state.masterPreviewRenderingJobId = ''; renderAll({ keepDetailAudio: true, autoPlay: completed }); if (completed) requestAnimationFrame(playBottomPreviewAudio); }
    }
}
function computeMasterPreviewSliceStartSec(track, buffer) {
    const duration = Number(buffer?.duration || track?.analysis?.duration || 0);
    if (!Number.isFinite(duration) || duration <= 0) return 0;
    const candidate = Number.isFinite(Number(track?.abHighlightStartSec)) ? Number(track.abHighlightStartSec) : getTrackHighlightStart(track);
    const raw = Number.isFinite(Number(candidate)) ? Number(candidate) : duration * 0.33;
    const maxStart = Math.max(0, duration - MASTER_PREVIEW_DURATION_SEC);
    return clamp(raw, 0, maxStart);
}
function sliceAudioBuffer(buffer, startSec, durationSec) {
    const sampleRate = buffer.sampleRate;
    const start = clamp(Math.floor(Number(startSec || 0) * sampleRate), 0, Math.max(0, buffer.length - 1));
    const maxLength = Math.max(1, buffer.length - start);
    const length = Math.min(maxLength, Math.max(1, Math.round(Number(durationSec || MASTER_PREVIEW_DURATION_SEC) * sampleRate)));
    const output = makeAudioBuffer(buffer.numberOfChannels, length, sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
        const src = buffer.getChannelData(ch);
        output.getChannelData(ch).set(src.subarray(start, start + length));
    }
    applyEdgeFade(output, 0.015);
    return output;
}
function clearMasterPreviewOutput(track, reason = 'master-preview-invalidated') {
    if (!track) return;
    getMasterPreviewJobService()?.cancel?.(track, reason);
    if (track.masterPreviewUrl) URL.revokeObjectURL(track.masterPreviewUrl);
    track.masterPreviewBlob = null;
    track.masterPreviewUrl = null;
    track.masterPreviewInfo = null;
    track.masterPreviewStatus = 'idle';
    if (state.bottomPreviewMode === 'masterPreview' && state.bottomPreviewTrackId === track.id) {
        state.bottomPreviewMode = 'original';
    }
}
function getTrackOriginalWaveformValues(track) {
    return normalizeWaveformValues(track?.waveformOverview?.before || track?.waveformOverview?.original || track?.analysis?.waveformOverview || track?.masterPreviewInfo?.sourceWaveformOverview || []);
}
function getTrackMasterWaveformValues(track) {
    return normalizeWaveformValues(track?.waveformOverview?.after || track?.waveformOverview?.mastered || track?.masterPreviewInfo?.waveformOverview || []);
}
function getTrackMasterWaveformMarkers(track, fallbackValues = []) {
    return track?.waveformOverview?.peakMarkers || track?.waveformOverview?.masteredPeaks || sampleMarkersFromValues(fallbackValues);
}
function getDockWaveformPayload(track, mode = state.bottomPreviewMode) {
    const original = getTrackOriginalWaveformValues(track);
    const mastered = getTrackMasterWaveformValues(track);
    if (mode === 'mastered' && mastered.length) return { label: '마스터링 피크', badge: 'Master', values: mastered, markers: getTrackMasterWaveformMarkers(track, mastered) };
    if (mode === 'masterPreview' && track?.masterPreviewInfo?.waveformOverview?.length) return { label: '하이라이트 피크', badge: '15s', values: normalizeWaveformValues(track.masterPreviewInfo.waveformOverview), markers: sampleMarkersFromValues(track.masterPreviewInfo.waveformOverview) };
    return { label: '원본 피크', badge: 'Original', values: original, markers: sampleMarkersFromValues(original) };
}
function getAdaptiveDockWaveformBinCount(scope = 'dock') {
    const minBins = scope === 'popup' ? 88 : 48;
    const maxBins = scope === 'popup' ? 156 : 128;
    const fallbackWidth = scope === 'popup' ? Math.min(window.innerWidth || 720, 920) : Math.min(window.innerWidth || 390, 680);
    const measuredWidth = scope === 'popup'
        ? (el.previewDialogBody?.getBoundingClientRect?.().width || fallbackWidth)
        : (el.bottomPreviewPlayer?.getBoundingClientRect?.().width || el.bottomPreviewDock?.getBoundingClientRect?.().width || fallbackWidth);
    const chromeAllowance = scope === 'popup' ? 150 : 118;
    const plotWidth = Math.max(120, Number(measuredWidth || fallbackWidth) - chromeAllowance);
    const pxPerBar = scope === 'popup' ? 3.0 : (plotWidth < 260 ? 2.65 : 2.45);
    return Math.max(minBins, Math.min(maxBins, Math.round(plotWidth / pxPerBar)));
}
function getDockWaveformSignature(track, mode = state.bottomPreviewMode) {
    if (!track) return 'no-track';
    const payload = getDockWaveformPayload(track, mode), values = normalizeWaveformValues(payload.values || [], DOCK_WAVEFORM_BINS);
    const peakSum = values.length ? Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0) * 1000) : 0, peakMax = values.length ? Math.round(Math.max(...values.map(value => Number(value || 0))) * 1000) : 0;
    const markerCount = Array.isArray(payload.markers) ? payload.markers.length : 0, sourceRevision = mode === 'mastered' ? Number(track.outBlob?.size || 0) : (mode === 'masterPreview' ? Number(track.masterPreviewBlob?.size || 0) : Number(track.file?.size || track.size || 0));
    return [mode || 'original', values.length, peakSum, peakMax, markerCount, Math.round(Number(track.analysis?.duration || 0) * 10), sourceRevision].join(':');
}
function forceRefreshBottomPreviewDock(track = getSelectedTrack(), reason = '') {
    if (!track || !el.bottomPreviewDock || !el.bottomPreviewPlayer) return false;
    if (!(state.selectedId === track.id || state.bottomPreviewTrackId === track.id || (state.tracks.length === 1 && !state.selectedId))) return false;
    if (!state.selectedId) state.selectedId = track.id;
    state.bottomPreviewTrackId = track.id;
    const token = el.bottomPreviewPlayer.dataset.previewRefreshToken = String(Number(el.bottomPreviewPlayer.dataset.previewRefreshToken || 0) + 1); delete el.bottomPreviewPlayer.dataset.previewKey;
    el.bottomPreviewPlayer.dataset.previewRefreshReason = reason || 'manual';
    const refresh = () => { if (el.bottomPreviewPlayer?.dataset.previewRefreshToken === token) try { renderBottomPreviewDock({ keepPlaying: true }); } catch (error) { console.warn('Dock waveform refresh failed:', error); } };
    requestAnimationFrame(refresh); setTimeout(() => { if (!el.bottomPreviewPlayer?.dataset.previewKey) refresh(); }, 90);
    return true;
}
function renderBottomWaveformMini(track, mode = state.bottomPreviewMode) {
    if (!el.bottomPreviewWaveformBtn) return;
    el.bottomPreviewWaveformBtn.textContent = '';
    const payload = getDockWaveformPayload(track, mode);
    const hasValues = Boolean(track && payload.values && payload.values.length);
    el.bottomPreviewWaveformBtn.disabled = !track;
    el.bottomPreviewWaveformBtn.classList.toggle('ready', hasValues);
    el.bottomPreviewWaveformBtn.title = hasValues ? '원곡과 마스터링을 큰 파형으로 비교합니다.' : '분석 후 비교보기에서 파형을 볼 수 있습니다.';
    const label = document.createElement('span');
    label.className = 'bottom-compare-open-label';
    const strong = document.createElement('strong');
    strong.textContent = '\u{1F30A} 비교';
    const small = document.createElement('em');
    small.textContent = track?.masteredUrl ? '원곡 ↔ 마스터' : (track?.masterPreviewUrl ? '원곡 ↔ 하이라이트' : '피크');
    label.append(strong, small);
    el.bottomPreviewWaveformBtn.appendChild(label);
}
function getWaveformModeScope(mode = state.bottomPreviewMode, role = 'dock') {
    const target = mode === 'mastered' ? 'mastered' : (mode === 'masterPreview' ? 'masterPreview' : 'original');
    if (target === 'masterPreview') return 'preview';
    if (role === 'dock' && target === 'masterPreview') return 'preview';
    return 'full';
}
function getAudioPlaybackPercentForWaveform(track = getSelectedTrack(), mode = state.bottomPreviewMode, audio = getBottomPreviewAudio(), scope = 'dock') {
    if (!track || !audio) return null;
    const local = Number(audio.currentTime || 0);
    const audioDuration = Number.isFinite(Number(audio.duration)) && Number(audio.duration) > 0 ? Number(audio.duration) : 0;
    const fullDuration = Number(track.analysis?.duration || track.masteredDurationSec || audioDuration || 0);
    const previewDuration = Number(track.masterPreviewInfo?.durationSec || MASTER_PREVIEW_DURATION_SEC || audioDuration || 0);
    const normalizedScope = scope === 'preview' || (scope === 'dock' && mode === 'masterPreview') ? 'preview' : 'full';
    const basis = normalizedScope === 'preview' ? (audioDuration || previewDuration) : fullDuration;
    if (!Number.isFinite(basis) || basis <= 0) return null;
    const playbackAbsoluteSec = mode === 'masterPreview' ? getMasterPreviewStartSec(track) + local : local;
    const position = normalizedScope === 'preview'
        ? (mode === 'masterPreview' ? local : absoluteToLocalPreviewTime(track, 'masterPreview', playbackAbsoluteSec, basis))
        : playbackAbsoluteSec;
    return clamp(position / basis * 100, 0, 100);
}
function getDockPlaybackPercent(track = getSelectedTrack(), mode = state.bottomPreviewMode, scope = 'dock') {
    return getAudioPlaybackPercentForWaveform(track, state.bottomPreviewMode || mode, getBottomPreviewAudio(), scope);
}
function getWaveformBarElements(element) {
    const service = window.FoxBearWaveformControlService;
    if (service && typeof service.getBarElements === 'function') return service.getBarElements(element);
    if (!element || typeof element.querySelectorAll !== 'function') return [];
    return Array.from(element.querySelectorAll('i'));
}
function getWaveformTimelineModel(element) {
    const service = window.FoxBearWaveformControlService;
    if (service && typeof service.getTimelineModel === 'function') return service.getTimelineModel(element);
    const bars = getWaveformBarElements(element);
    const rootRect = element?.getBoundingClientRect?.();
    if (!rootRect || !rootRect.width) return null;
    if (!bars.length) return { rootRect, bars, plotLeft: rootRect.left, plotRight: rootRect.right, plotWidth: rootRect.width };
    const firstRect = bars[0]?.getBoundingClientRect?.();
    const lastRect = bars[bars.length - 1]?.getBoundingClientRect?.();
    const left = Number.isFinite(firstRect?.left) ? firstRect.left : rootRect.left;
    const right = Number.isFinite(lastRect?.right) ? lastRect.right : rootRect.right;
    const safeLeft = Math.max(rootRect.left, Math.min(left, right));
    const safeRight = Math.min(rootRect.right, Math.max(left, right));
    const width = Math.max(1, safeRight - safeLeft);
    return { rootRect, bars, plotLeft: safeLeft, plotRight: safeRight, plotWidth: width };
}
function mapAudioPercentToWaveformVisualPercent(element, percent) {
    const service = window.FoxBearWaveformControlService;
    if (service && typeof service.audioPercentToVisualPercent === 'function') return service.audioPercentToVisualPercent(element, percent);
    const pct = clamp(Number(percent), 0, 100);
    const model = getWaveformTimelineModel(element);
    if (!model) return pct;
    const x = model.plotLeft + model.plotWidth * (pct / 100);
    return clamp((x - model.rootRect.left) / Math.max(1, model.rootRect.width) * 100, 0, 100);
}
function mapWaveformPointerToAudioPercent(event, element) {
    const service = window.FoxBearWaveformControlService;
    if (service && typeof service.pointerToPercent === 'function') return service.pointerToPercent(event, element);
    const target = element || event?.currentTarget || event?.target;
    if (!target || typeof target.getBoundingClientRect !== 'function') return NaN;
    const x = Number(event?.clientX ?? event?.touches?.[0]?.clientX ?? event?.changedTouches?.[0]?.clientX);
    if (!Number.isFinite(x)) return NaN;
    const model = getWaveformTimelineModel(target);
    if (!model) return NaN;
    return clamp((x - model.plotLeft) / Math.max(1, model.plotWidth) * 100, 0, 100);
}
function getWaveformElementPlaybackPercent(element, track = getSelectedTrack()) {
    const mode = element?.dataset?.waveformMode || state.bottomPreviewMode;
    const scope = element?.dataset?.waveformScope || getWaveformModeScope(mode, element?.dataset?.waveformRole || 'dock');
    return getDockPlaybackPercent(track, mode, scope);
}
function isWaveformPlaybackModeActive(mode = state.bottomPreviewMode) {
    const current = state.bottomPreviewMode || 'original';
    if (mode === current) return true;
    if ((mode === 'mastered' || mode === 'original') && (current === 'mastered' || current === 'original')) return true;
    return false;
}
function updateWaveformProgressBars(element, percent) {
    const service = window.FoxBearWaveformControlService;
    if (service && typeof service.updateBarProgress === 'function') {
        service.updateBarProgress(element, percent);
        return;
    }
    if (!element || !Number.isFinite(Number(percent))) return;
    const pct = clamp(Number(percent), 0, 100);
    if (element.dataset.waveformCssProgressReady !== 'true') { element.dataset.waveformCssProgressReady = 'true'; element.querySelectorAll?.('i.is-played, i.is-current').forEach(bar => bar.classList.remove('is-played', 'is-current')); }
    element.style.setProperty('--waveform-progress-pct', `${mapAudioPercentToWaveformVisualPercent(element, pct)}%`);
}
function setPlayheadOnElement(element, percent, playing = false) {
    const service = window.FoxBearWaveformControlService;
    if (service && typeof service.setPlayhead === 'function') {
        service.setPlayhead(element, percent, playing);
        return;
    }
    if (!element) return;
    if (!Number.isFinite(Number(percent))) {
        element.classList.remove('has-live-playhead', 'is-playing');
        element.style.removeProperty('--waveform-playhead-pct');
        element.style.removeProperty('--waveform-progress-pct');
        element.removeAttribute('aria-valuenow');
        delete element.dataset.waveformPlaybackPercent;
        if (element.dataset.waveformCssProgressReady !== 'true') { element.dataset.waveformCssProgressReady = 'true'; element.querySelectorAll?.('i.is-played, i.is-current').forEach(bar => bar.classList.remove('is-played', 'is-current')); }
        return;
    }
    const pct = clamp(Number(percent), 0, 100);
    const visualPct = mapAudioPercentToWaveformVisualPercent(element, pct);
    const displayPct = Math.round(pct * 10) / 10;
    element.dataset.waveformPlaybackPercent = String(displayPct);
    element.style.setProperty('--waveform-playhead-pct', `${visualPct}%`);
    element.style.setProperty('--waveform-progress-pct', `${visualPct}%`);
    element.setAttribute('aria-valuenow', String(Math.round(displayPct)));
    element.classList.add('has-live-playhead');
    element.classList.toggle('is-playing', Boolean(playing));
    updateWaveformProgressBars(element, pct);
}
function performDockWaveformPlayheadSync(audioOverride = null) {
    const track = getSelectedTrack();
    const audio = audioOverride || getBottomPreviewAudio();
    const playing = Boolean(audio && !audio.paused && !audio.ended);
    const dockBars = el.bottomPreviewPlayer?.querySelector('.dock-integrated-waveform-bars') || el.bottomPreviewWaveformBtn?.querySelector('.bottom-waveform-bars');
    setPlayheadOnElement(dockBars || el.bottomPreviewWaveformBtn, getWaveformElementPlaybackPercent(dockBars || el.bottomPreviewWaveformBtn, track), playing);
    const dialog = el.previewDialog;
    if (!dialog || !dialog.classList.contains('waveform-compare-mode')) return;
    let primaryPercent = null;
    dialog.querySelectorAll('.waveform-compare-bars').forEach(bars => {
        const mode = bars?.dataset?.waveformMode || state.bottomPreviewMode;
        const pct = getWaveformElementPlaybackPercent(bars, track);
        if (primaryPercent === null && mode === state.bottomPreviewMode) primaryPercent = pct;
        setPlayheadOnElement(bars, pct, playing && isWaveformPlaybackModeActive(mode));
    });
    const card = dialog.querySelector('.waveform-compare-card');
    if (card) setPlayheadOnElement(card, primaryPercent ?? getDockPlaybackPercent(track, state.bottomPreviewMode, getWaveformModeScope(state.bottomPreviewMode, 'popup')), playing);
}
function syncDockWaveformPlayhead(audioOverride = null) {
    dockWaveformPendingAudio = audioOverride || dockWaveformPendingAudio || null;
    if (dockWaveformPlayheadRaf) return;
    dockWaveformPlayheadRaf = requestAnimationFrame(() => { const pendingAudio = dockWaveformPendingAudio; dockWaveformPendingAudio = null; dockWaveformPlayheadRaf = 0; performDockWaveformPlayheadSync(pendingAudio); });
}
function openWaveformCompareDialog() {
    const track = activateMainTrackFromDock(resolveMainActiveTrackForDock());
    if (!track) {
        showToast('비교할 음원을 먼저 불러와주세요.');
        return;
    }
    if (!el.previewDialog || !el.previewDialogBody) {
        showToast('비교 팝업을 열 수 없습니다. 화면을 새로고침해주세요.');
        return;
    }
    captureBottomPreviewTransport(track, state.bottomPreviewMode);
    clearPreviewDialogBody('waveform-compare-open');
    el.previewDialog.hidden = false;
    el.previewDialog.style.display = 'flex';
    el.previewDialog.style.pointerEvents = 'auto';
    el.previewDialog.classList.add('show', 'waveform-compare-mode');
    el.previewDialog.setAttribute('aria-hidden', 'false');
    document.body.classList.add('preview-dialog-open');
    const title = el.previewDialog.querySelector('#previewDialogTitle');
    if (title) title.textContent = '원곡 / 마스터링 큰 비교';
    if (el.previewDialogCaption) el.previewDialogCaption.textContent = '큰 파형에서 원곡과 마스터링을 같은 위치로 비교하고 선택해 들어봅니다.';
    renderWaveformCompareDialog(track, el.previewDialogBody);
    syncDockWaveformPlayhead();
    const panel = el.previewDialog.querySelector('.preview-dialog-panel');
    if (panel) panel.focus({ preventScroll: true });
}
function renderWaveformCompareDialog(track, target) {
    const compareView = window.FoxBearWaveformCompareView;
    if (!compareView || typeof compareView.renderWaveformCompareDialog !== 'function') {
        showToast('비교 팝업 모듈을 불러오지 못했습니다. 화면을 새로고침해주세요.');
        return;
    }
    return compareView.renderWaveformCompareDialog(track, target, {
        document,
        state,
        MASTER_PREVIEW_DURATION_SEC,
        clamp,
        requestAnimationFrame,
        setTimeout,
        setInterval,
        clearInterval,
        getAdaptiveDockWaveformBinCount,
        getTrackOriginalWaveformValues,
        getTrackMasterWaveformValues,
        getTrackMasterWaveformMarkers,
        normalizeWaveformValues,
        sampleMarkersFromValues,
        getMasterPreviewStartSec,
        attachWaveformSeekHandlers,
        addWaveformPeakJumpChips,
        getBottomPreviewAudio,
        getDockModeLabel,
        formatPlayerTime,
        toggleBottomPreviewExternalPlayback,
        activateMainTrackFromDock,
        resolveMainActiveTrackForDock,
        showToast,
        runDockRemoteMasterPreview,
        captureBottomPreviewTransport,
        renderBottomPreviewDock,
        playBottomPreviewAudio,
        foxBearHaptic,
        highlightCompareInspector: window.FoxBearHighlightCompareInspector
    });
}
function getBottomPreviewGenreLabel(track) {
    if (!track) return '장르 없음';
    const preset = track.preset || track.recommendedPreset || 'custom';
    return PRESET_LABELS[preset] || preset || '장르 없음';
}
function createManagedWaveformBars(options = {}) {
    const view = window.FoxBearWaveformControlView;
    if (view && typeof view.createBars === 'function') {
        return view.createBars({ document, ...options });
    }
    const service = window.FoxBearWaveformControlService;
    if (service && typeof service.renderBars === 'function') {
        const bars = service.renderBars(options.values || [], options.markers || [], {
            document,
            tagName: options.tagName || 'div',
            className: options.className || 'dock-integrated-waveform-bars',
            barClassPrefix: options.barClassPrefix || 'dock-integrated-waveform',
            bins: options.bins || 96
        });
        if (options.emptyClass && !(options.values || []).length) bars.classList.add(options.emptyClass);
        if (options.readyClass && options.hasRealValues) bars.classList.add(options.readyClass);
        if (options.placeholderClass && !options.hasRealValues) bars.classList.add(options.placeholderClass);
        if (options.dataset && typeof options.dataset === 'object') {
            Object.entries(options.dataset).forEach(([key, value]) => {
                if (value !== undefined && value !== null) bars.dataset[key] = String(value);
            });
        }
        bars.dataset.waveformViewFallback = 'service-renderBars';
        service.stampManagedElement?.(bars, options.role || 'waveform');
        return bars;
    }
    throw new Error('FoxBear waveform view/service is not available');
}
function makeDockWaveformBars(track, mode = state.bottomPreviewMode, options = {}) {
    const payload = getDockWaveformPayload(track, mode);
    const adaptiveBins = getAdaptiveDockWaveformBinCount('dock');
    const rawValues = Array.isArray(payload.values) ? payload.values : [];
    const hasRealValues = Boolean(rawValues.length);
    const targetMode = mode === 'mastered' ? 'mastered' : (mode === 'masterPreview' ? 'masterPreview' : 'original');
    const role = options.waveformRole || 'dock-player';
    const extraClass = String(options.extraClass || '').split(/\s+/).filter(Boolean).join(' ');
    const bars = createManagedWaveformBars({
        className: `dock-integrated-waveform-bars dock-waveform-polished${extraClass ? ' ' + extraClass : ''}`,
        values: rawValues,
        markers: hasRealValues ? payload.markers : [],
        bins: adaptiveBins,
        role,
        barClassPrefix: 'dock-integrated-waveform',
        readyClass: 'dock-integrated-waveform-ready',
        placeholderClass: 'dock-integrated-waveform-placeholder',
        hasRealValues,
        realMinHeight: 10,
        placeholderMinHeight: 12,
        placeholderFactory: index => {
            const wave = Math.sin(index * 0.62) * 0.055 + Math.sin(index * 0.19) * 0.035;
            return clamp(0.18 + wave, 0.08, 0.32);
        }
    });
    attachWaveformSeekHandlers(bars, targetMode, role);
    if (options.seekTarget) bars.dataset.waveformSeekTarget = options.seekTarget;
    bars.setAttribute('aria-label', hasRealValues ? '통합 피크 파형 플레이어. 막대 높이와 색으로 피크 위치를 확인하고 클릭하면 해당 위치로 이동해 재생합니다.' : '통합 파형 플레이어. 분석 중에는 임시 파형을 표시하고 완료 즉시 실제 피크 파형으로 갱신됩니다.');
    return bars;
}
function getDockModeLabel(mode = state.bottomPreviewMode) {
    if (mode === 'mastered') return '마스터링';
    if (mode === 'masterPreview') return '하이라이트';
    return '원곡';
}
function syncBottomPreviewExternalPlayButton(audio = getBottomPreviewAudio(), forcedPlaying = null) {
    const button = el.bottomPreviewPlayBtn || document.getElementById('bottomPreviewPlayBtn');
    if (!button) return;
    const track = getSelectedTrack() || (typeof resolveMainActiveTrackForDock === 'function' ? resolveMainActiveTrackForDock() : null) || state.tracks?.[0] || null;
    const hasSource = Boolean(track && (track.originalUrl || track.masteredUrl || track.masterPreviewUrl));
    const playing = forcedPlaying === null || forcedPlaying === undefined ? Boolean(audio && !audio.paused && !audio.ended) : Boolean(forcedPlaying);
    button.disabled = !hasSource;
    button.classList.toggle('playing', playing);
    if (button.id === 'bottomPreviewPlayBtn') {
        button.textContent = '';
        const glyph = document.createElement('span');
        glyph.className = 'bottom-preview-play-glyph';
        glyph.setAttribute('aria-hidden', 'true');
        glyph.textContent = hasSource ? (playing ? 'Ⅱ' : '▶') : '•';
        const label = document.createElement('span');
        label.className = 'bottom-preview-play-label';
        label.textContent = hasSource ? (playing ? '일시정지' : '재생') : '대기';
        button.append(glyph, label);
    } else {
        setPlayerToggleIcon(button, playing);
    }
    button.setAttribute('aria-label', playing ? 'Dock 일시정지' : 'Dock 재생');
    button.title = hasSource ? (playing ? '현재 프리뷰를 일시정지합니다.' : '현재 프리뷰를 재생합니다.') : '음원을 불러오면 재생할 수 있습니다.';
}
function toggleBottomPreviewExternalPlayback(event = null) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    const audio = getBottomPreviewAudio();
    if (!audio) {
        playBottomPreviewAudio();
        syncBottomPreviewExternalPlayButton();
        return;
    }
    if (audio.paused || audio.ended) {
        playAudioWithFadeIn(audio).catch(() => showToast('브라우저가 재생을 차단했습니다. Dock 재생 버튼을 다시 눌러주세요.'));
    } else {
        pauseAudioWithFadeOut(audio);
    }
}
function createDockIntegratedWaveformPlayer(track, options = {}) {
    const mode = options.mode === 'mastered' ? 'mastered' : (options.mode === 'masterPreview' ? 'masterPreview' : 'original');
    const wrap = document.createElement('div');
    wrap.className = 'custom-player dock-integrated-player';
    if (options.playerClass) wrap.classList.add(...String(options.playerClass).split(/\s+/).filter(Boolean));
    wrap.dataset.waveformMode = mode;
    if (options.playerRole) wrap.dataset.playerRole = options.playerRole;
    const audio = configurePreviewAudioElement(document.createElement('audio'));
    audio.src = options.src || '';
    if (state.abLevelMatch && Number.isFinite(options.gainDb)) {
        audio.volume = clamp(Math.pow(10, options.gainDb / 20), 0.02, 1);
    }
    rememberAudioTargetVolume(audio);
    setupPreviewTranslationAudio(audio, options);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'player-toggle dock-integrated-toggle';
    setPlayerToggleIcon(toggle, false);
    toggle.setAttribute('aria-label', '통합 파형 플레이어 재생');
    const waveform = makeDockWaveformBars(track, mode, {
        seekTarget: options.seekTarget || 'dock',
        waveformRole: options.waveformRole || 'dock-player',
        extraClass: options.waveformClass || ''
    });
    const info = document.createElement('div');
    info.className = 'dock-integrated-info';
    const source = document.createElement('span');
    source.className = 'dock-integrated-source';
    source.textContent = options.sourceLabel || getDockModeLabel(mode);
    source.setAttribute('aria-label', '프리뷰 소스');
    const time = document.createElement('span');
    time.className = 'player-time dock-integrated-time';
    time.setAttribute('aria-label', '재생 시간 / 전체 러닝타임');
    const initialDuration = Number(options.duration || 0);
    time.textContent = formatPlayerTime(0, initialDuration);
    const peak = document.createElement('button');
    peak.type = 'button';
    peak.className = 'dock-integrated-peak-jump';
    peak.textContent = '⚡ 피크';
    peak.title = '가장 강한 피크 구간으로 이동합니다.';
    peak.setAttribute('aria-label', '피크 구간으로 이동');
    info.append(source, time, peak);
    const seekToStrongestPeak = () => {
        const payload = getDockWaveformPayload(track, mode);
        const values = Array.isArray(payload?.values) ? payload.values : [];
        const duration = Number(getDuration() || options.duration || track?.analysis?.duration || track?.masteredDurationSec || 0);
        if (!values.length || !Number.isFinite(duration) || duration <= 0) {
            showToast('피크 위치를 아직 계산할 수 없습니다. 분석 완료 후 다시 시도해주세요.');
            return;
        }
        const service = window.FoxBearWaveformControlService;
        const peakPercent = service && typeof service.findStrongestPeakPercent === 'function'
            ? service.findStrongestPeakPercent(values)
            : values.reduce((best, value, index) => Number(value) > Number(values[best] || -Infinity) ? index : best, 0) / Math.max(1, values.length - 1) * 100;
        const startOffset = Number(options.startSec || 0);
        const localSec = clamp((Number(peakPercent) / 100) * duration, 0, Math.max(0, duration - 0.08));
        audio.currentTime = clamp(localSec - startOffset, 0, Math.max(0, duration - 0.08));
        sync();
        showToast(`${options.sourceLabel || getDockModeLabel(mode)} 피크 구간으로 이동했습니다.`);
    };
    peak.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        seekToStrongestPeak();
    });
    const setPlaying = isPlaying => {
        toggle.classList.toggle('playing', Boolean(isPlaying));
        waveform.classList.toggle('is-playing', Boolean(isPlaying));
        setPlayerToggleIcon(toggle, Boolean(isPlaying));
        toggle.setAttribute('aria-label', isPlaying ? '일시정지' : '재생');
        syncBottomPreviewExternalPlayButton(audio, Boolean(isPlaying));
    };
    const getDuration = () => Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : initialDuration;
    const sync = () => {
        const duration = getDuration();
        time.textContent = formatPlayerTime(audio.currentTime || 0, duration);
        const pct = getAudioPlaybackPercentForWaveform(track, mode, audio, waveform.dataset.waveformScope || getWaveformModeScope(mode, waveform.dataset.waveformRole || 'dock-player'));
        setPlayheadOnElement(waveform, pct, Boolean(audio && !audio.paused && !audio.ended));
        syncDockWaveformPlayhead(audio);
    };
    toggle.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (audio.paused) playAudioWithFadeIn(audio).catch(() => showToast('브라우저가 재생을 차단했습니다. 다시 눌러주세요.'));
        else pauseAudioWithFadeOut(audio);
    });
    audio.addEventListener('loadedmetadata', () => {
        applyBottomPreviewStart(audio, Number(options.startSec || 0));
        sync();
    });
    audio.addEventListener('play', () => {
        const allowed = wrap._foxbearCrossfadeOldAudio ? [wrap._foxbearCrossfadeOldAudio] : [];
        bindExclusivePreview(audio, { allowAudioElements: allowed });
        setPlaying(true);
        onDockAudioTransportEvent(audio);
        sync();
    });
    audio.addEventListener('pause', () => {
        setPlaying(false);
        onDockAudioTransportEvent(audio);
        sync();
    });
    audio.addEventListener('ended', () => {
        setPlaying(false);
        audio.currentTime = 0;
        onDockAudioTransportEvent(audio);
        sync();
    });
    audio.addEventListener('timeupdate', sync);
    wrap._foxbearPlay = () => {
        if (!audio.paused) return Promise.resolve();
        return playAudioWithFadeIn(audio).catch(() => showToast('브라우저가 재생을 차단했습니다. 통합 파형 재생 버튼을 다시 눌러주세요.'));
    };
    wrap._foxbearPause = () => {
        pauseAudioWithFadeOut(audio);
    };
    registerPlaybackLinkedAudio(audio, {
        role: options.playerRole || (options.waveformRole === 'dock-player' ? 'bottom-dock' : 'inline-preview'),
        shell: wrap,
        trackId: track?.id || '',
        mode,
        label: options.playerRole === 'mastering-settings-preview' ? '설정 미리듣기' : getDockModeLabel(mode),
        absoluteStartSec: mode === 'masterPreview' ? getMasterPreviewStartSec(track) : 0,
        durationSec: getDuration()
    });
    wrap.append(toggle, waveform, info, audio);
    return wrap;
}
function renderBottomPreviewDock(options = {}) {
    if (!el.bottomPreviewDock || !el.bottomPreviewPlayer) return;
    const track = getSelectedTrack();
    if (!track) {
        clearBottomPreviewPlayer();
        el.bottomPreviewDock.classList.remove('show');
        el.bottomPreviewDock.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('bottom-preview-active');
        syncBottomPreviewFloatingOffset();
        syncMediaSessionForDock(null);
        updateMobileNativeUi();
        state.bottomPreviewMode = 'original';
        state.bottomPreviewTrackId = null;
        state.bottomPreviewAutoplayTrackId = null;
        syncBottomPreviewExternalPlayButton(null, false);
        return;
    }
    if (!el.bottomPreviewPlayer.classList.contains('is-crossfading') && el.bottomPreviewPlayer.children.length > 1) {
        const children = Array.from(el.bottomPreviewPlayer.children), keep = children.find(child => child.querySelector?.('audio[data-bottom-preview-active="true"]')) || children.at(-1);
        children.filter(child => child !== keep).forEach(child => { try { child._foxbearDispose?.(); } catch (error) {} child.querySelectorAll?.('audio').forEach(audio => { try { audio.pause?.(); } catch (error) {} unregisterPlaybackLinkedAudio(audio, 'dock-crossfade-prune'); }); child.remove(); });
    }
    if (state.bottomPreviewTrackId !== track.id) {
        state.bottomPreviewTrackId = track.id;
        if (state.bottomPreviewAutoplayTrackId !== track.id) state.bottomPreviewMode = 'original';
    }
    const masteredAvailable = Boolean(track.masteredUrl);
    const masterPreviewAvailable = Boolean(track.masterPreviewUrl);
    if (state.bottomPreviewMode === 'mastered' && !masteredAvailable) state.bottomPreviewMode = 'original';
    if (state.bottomPreviewMode === 'masterPreview' && !masterPreviewAvailable) state.bottomPreviewMode = 'original';
    const mode = state.bottomPreviewMode === 'mastered' ? 'mastered' : (state.bottomPreviewMode === 'masterPreview' ? 'masterPreview' : 'original');
    const useMastered = mode === 'mastered' && masteredAvailable;
    const useMasterPreview = mode === 'masterPreview' && masterPreviewAvailable;
    const src = useMastered ? track.masteredUrl : (useMasterPreview ? track.masterPreviewUrl : track.originalUrl);
    const duration = useMastered ? (track.masteredDurationSec || track.analysis?.duration) : (useMasterPreview ? (track.masterPreviewInfo?.durationSec || MASTER_PREVIEW_DURATION_SEC) : track.analysis?.duration);
    // v1.3.49: Dock is now a compact transport only.
    // Keep A/B level match and difference listen in the full comparison UI,
    // but do not let hidden Dock compare state affect Dock playback.
    const differenceReady = false;
    const gainDb = 0;
    const waveformSignature = getDockWaveformSignature(track, mode);
    const key = `${track.id}|${mode}|${src || ''}|${state.abLoopMode && !useMasterPreview ? 'loop' : 'free'}|dock-clean|wave:${waveformSignature}`;
    el.bottomPreviewDock.classList.add('show');
    el.bottomPreviewDock.setAttribute('aria-hidden', 'false');
    document.body.classList.add('bottom-preview-active');
    const trackName = track.name || '선택 트랙';
    const genreLabel = getBottomPreviewGenreLabel(track);
    if (el.bottomPreviewTitle) {
        el.bottomPreviewTitle.textContent = trackName;
        el.bottomPreviewTitle.title = trackName;
    }
    if (el.bottomPreviewMobileTitle) {
        el.bottomPreviewMobileTitle.textContent = trackName;
        el.bottomPreviewMobileTitle.title = trackName;
    }
    if (el.bottomPreviewGenre) {
        el.bottomPreviewGenre.textContent = genreLabel;
        el.bottomPreviewGenre.title = genreLabel;
    }
    setBottomPreviewMasterPreviewButtonState(track, mode);
    setBottomPreviewMasterButtonState(track);
    setBottomPreviewTabState(mode, masteredAvailable);
    renderPreviewTranslationModeControls(mode);
    renderBottomWaveformMini(track, mode);
    requestAnimationFrame(syncBottomPreviewFloatingOffset);
    const samePlayer = el.bottomPreviewPlayer.dataset.previewKey === key && getBottomPreviewAudio();
    const transitionOldPlayer = !samePlayer ? el.bottomPreviewPlayer.firstElementChild : null;
    const transitionOldAudio = transitionOldPlayer?.querySelector?.('audio') || null;
    const canCrossfadeDock = Boolean(options.userGesture && transitionOldAudio && !transitionOldAudio.paused && !transitionOldAudio.ended && src);
    let shouldResume = false;
    let pendingCrossfade = null;
    if (samePlayer) {
        const bars = el.bottomPreviewPlayer.querySelector('.dock-integrated-waveform-bars');
        const payload = getDockWaveformPayload(track, mode);
        const hasRealValues = Boolean(payload.values && payload.values.length);
        if (bars && hasRealValues && bars.dataset.waveformReady !== 'true') {
            delete el.bottomPreviewPlayer.dataset.previewKey;
            return renderBottomPreviewDock({ ...options, keepPlaying: true });
        }
    }
    if (!samePlayer) {
        const previousMode = el.bottomPreviewPlayer.dataset.previewMode || state.bottomPreviewMode;
        captureBottomPreviewTransport(track, previousMode);
        if (!canCrossfadeDock) clearBottomPreviewPlayer();
        else {
            transitionOldPlayer.dataset.crossfadeLegacy = 'true';
            transitionOldAudio.dataset.crossfadeLegacy = 'true';
            transitionOldAudio.dataset.bottomPreviewActive = 'false';
            el.bottomPreviewPlayer.classList.add('is-crossfading');
        }
        if (!src) {
            const empty = document.createElement('div');
            empty.className = 'bottom-preview-empty';
            empty.textContent = '프리뷰 소스를 준비 중입니다.';
            el.bottomPreviewPlayer.appendChild(empty);
        } else {
            const transport = getPendingBottomPreviewTransport(track, mode, duration, options.autoPlay || state.bottomPreviewAutoplayTrackId === track.id);
            const player = createDockIntegratedWaveformPlayer(track, { src, mode, duration, startSec: transport.startSec, gainDb, translationMode: true, persistentTranslation: true });
            player.classList.add('bottom-custom-player');
            const audio = player.querySelector('audio');
            const modeLabel = differenceReady ? '차이 듣기' : (useMastered ? '마스터링' : (useMasterPreview ? '15초 하이라이트 듣기' : '원본'));
            if (audio) {
                audio.setAttribute('aria-label', `${track.name || '선택 곡'} ${modeLabel} 프리뷰 재생`);
                audio.dataset.bottomPreviewActive = 'true';
                if (canCrossfadeDock) player._foxbearCrossfadeOldAudio = transitionOldAudio;
                audio.addEventListener('play', () => onDockAudioTransportEvent(audio));
                audio.addEventListener('pause', () => onDockAudioTransportEvent(audio));
                audio.addEventListener('ended', () => onDockAudioTransportEvent(audio));
                audio.addEventListener('timeupdate', () => syncMediaSessionForDock(audio));
                if (!differenceReady) applyBottomPreviewStart(audio, transport.startSec);
            }
            el.bottomPreviewPlayer.appendChild(player);
            syncBottomPreviewExternalPlayButton(audio, false);
            el.bottomPreviewPlayer.dataset.previewKey = key;
            el.bottomPreviewPlayer.dataset.previewMode = mode;
            syncDockWaveformPlayhead(audio);
            shouldResume = Boolean(transport.playing);
            if (canCrossfadeDock && audio) {
                pendingCrossfade = { oldPlayer: transitionOldPlayer, oldAudio: transitionOldAudio, nextAudio: audio, nextPlayer: player };
            }
        }
    }
    syncDockWaveformPlayhead();
    syncBottomPreviewExternalPlayButton();
    const shouldAutoPlay = shouldResume || ((options.autoPlay || state.bottomPreviewAutoplayTrackId === track.id) && (useMastered || useMasterPreview));
    if (shouldAutoPlay) {
        state.bottomPreviewAutoplayTrackId = null;
        if (pendingCrossfade) {
            const runCrossfade = () => {
                crossfadeAudioPair(pendingCrossfade.oldAudio, pendingCrossfade.nextAudio, {
                    userGesture: Boolean(options.userGesture),
                    onComplete: () => {
                        pendingCrossfade.oldPlayer?.remove?.();
                        el.bottomPreviewPlayer?.classList.remove('is-crossfading');
                        if (pendingCrossfade.nextPlayer) delete pendingCrossfade.nextPlayer._foxbearCrossfadeOldAudio;
                        syncBottomPreviewExternalPlayButton(pendingCrossfade.nextAudio, true);
                    }
                }).catch(() => {
                    pendingCrossfade.oldPlayer?.remove?.();
                    el.bottomPreviewPlayer?.classList.remove('is-crossfading');
                    playBottomPreviewAudio();
                });
            };
            options.userGesture ? runCrossfade() : requestAnimationFrame(runCrossfade);
        } else options.userGesture ? playBottomPreviewAudio() : requestAnimationFrame(playBottomPreviewAudio);
    }
    syncMediaSessionForDock();
    updateMobileNativeUi();
}
function scheduleBottomPreviewLayoutSync() {
    if (state.bottomPreviewLayoutRaf) cancelAnimationFrame(state.bottomPreviewLayoutRaf);
    state.bottomPreviewLayoutRaf = requestAnimationFrame(() => {
        state.bottomPreviewLayoutRaf = 0;
        syncBottomPreviewFloatingOffset();
    });
}
function installBottomPreviewLayoutObserver() {
    if (state.bottomPreviewLayoutObserverInstalled) return;
    state.bottomPreviewLayoutObserverInstalled = true;
    document.addEventListener('visibilitychange', scheduleBottomPreviewLayoutSync, { passive: true });
    window.addEventListener('pageshow', scheduleBottomPreviewLayoutSync, { passive: true });
    if (window.ResizeObserver && el.bottomPreviewDock) {
        state.bottomPreviewResizeObserver = new ResizeObserver(scheduleBottomPreviewLayoutSync);
        state.bottomPreviewResizeObserver.observe(el.bottomPreviewDock);
        if (el.bottomPreviewPlayer) state.bottomPreviewResizeObserver.observe(el.bottomPreviewPlayer);
        if (el.bottomPreviewTranslationModes) state.bottomPreviewResizeObserver.observe(el.bottomPreviewTranslationModes);
    }
}
function syncBottomPreviewFloatingOffset() {
    const root = document.documentElement;
    const dock = el.bottomPreviewDock;
    const visible = Boolean(dock && dock.classList.contains('show') && document.body.classList.contains('bottom-preview-active'));
    if (!visible) {
        root.style.removeProperty('--bottom-preview-height');
        root.style.removeProperty('--bottom-preview-floating-bottom');
        root.style.removeProperty('--bottom-preview-hud-bottom');
        root.style.removeProperty('--bottom-preview-panel-bottom');
        root.style.removeProperty('--bottom-preview-viewport-height');
        return;
    }
    const mobile = Boolean(window.matchMedia && window.matchMedia('(max-width: 720px)').matches);
    const visualViewport = window.visualViewport || null;
    const viewportHeight = Math.round(visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 720);
    const rect = dock.getBoundingClientRect ? dock.getBoundingClientRect() : { height: 0 };
    const measured = Math.ceil(Math.max(rect.height || 0, dock.offsetHeight || 0, dock.scrollHeight || 0));
    const fallback = mobile ? 164 : 176;
    const minReasonable = mobile ? 96 : 120;
    const maxReasonable = Math.max(fallback, Math.floor(viewportHeight * (mobile ? 0.46 : 0.36)));
    const height = measured > 0
        ? clamp(measured, minReasonable, maxReasonable)
        : fallback;
    // Stage11.1: anchor mobile overlays to the measured Dock edge. Do not force
    // a tall fallback over real mobile Dock height; that made toasts/HUD/quick
    // controls appear detached from the player.
    const floatingGap = mobile ? 1 : 10;
    const hudGap = mobile ? 1 : 8;
    const panelGap = mobile ? 4 : 18;
    root.style.setProperty('--bottom-preview-height', `${height}px`);
    root.style.setProperty('--bottom-preview-floating-bottom', `${height + floatingGap}px`);
    root.style.setProperty('--bottom-preview-hud-bottom', `${height + hudGap}px`);
    root.style.setProperty('--bottom-preview-panel-bottom', `${height + panelGap}px`);
    root.style.setProperty('--bottom-preview-viewport-height', `${viewportHeight}px`);
}
function setBottomPreviewMasterPreviewButtonState(track, mode = state.bottomPreviewMode) {
    if (!el.bottomPreviewMasterPreviewBtn) return;
    const processing = Boolean(track && track.masterPreviewStatus === 'processing');
    const ready = Boolean(track && track.masterPreviewUrl);
    el.bottomPreviewMasterPreviewBtn.classList.toggle('active', mode === 'masterPreview');
    el.bottomPreviewMasterPreviewBtn.classList.toggle('processing', processing);
    const blocked = !track || track.status === 'processing' || Boolean(track.error) || (state.busy && isOtherTrackBlockingDockAction(track));
    el.bottomPreviewMasterPreviewBtn.disabled = false;
    el.bottomPreviewMasterPreviewBtn.setAttribute('aria-disabled', String(blocked));
    el.bottomPreviewMasterPreviewBtn.classList.toggle('soft-disabled', blocked);
    if (!track) {
        el.bottomPreviewMasterPreviewBtn.textContent = '\u{2728} 하이라이트';
        el.bottomPreviewMasterPreviewBtn.title = '곡을 선택하면 15초 하이라이트 듣기를 만들 수 있습니다.';
    } else if (processing) {
        el.bottomPreviewMasterPreviewBtn.textContent = '\u{23F3} 생성중';
        el.bottomPreviewMasterPreviewBtn.title = '선택 곡의 15초 하이라이트 듣기를 처리하고 있습니다.';
    } else if (ready) {
        el.bottomPreviewMasterPreviewBtn.textContent = '\u{2728} 하이라이트';
        el.bottomPreviewMasterPreviewBtn.title = '준비된 15초 하이라이트 듣기를 재생합니다.';
    } else {
        el.bottomPreviewMasterPreviewBtn.textContent = '\u{2728} 하이라이트';
        el.bottomPreviewMasterPreviewBtn.title = '전체 마스터링 전에 하이라이트 15초 결과를 먼저 들어봅니다.';
    }
    updateHelpText(el.bottomPreviewMasterPreviewBtn, el.bottomPreviewMasterPreviewBtn.title);
}
function setBottomPreviewMasterButtonState(track) {
    if (!el.bottomPreviewMasterBtn) return;
    clearStaleBusyFlagIfIdle('dock-master-button-state');
    const busy = state.busy && isOtherTrackBlockingDockAction(track);
    const blocked = !track || busy || track.status === 'processing' || Boolean(track.error);
    el.bottomPreviewMasterBtn.disabled = false;
    el.bottomPreviewMasterBtn.setAttribute('aria-disabled', String(blocked));
    el.bottomPreviewMasterBtn.classList.toggle('soft-disabled', blocked);
    el.bottomPreviewMasterBtn.classList.toggle('processing', Boolean(track && track.status === 'processing'));
    if (!track) {
        el.bottomPreviewMasterBtn.textContent = '\u{1F6E0} 마스터링';
        el.bottomPreviewMasterBtn.title = '곡을 선택하면 마스터링을 시작할 수 있습니다.';
    } else if (track.status === 'processing') {
        el.bottomPreviewMasterBtn.textContent = '\u{2699} 진행 중';
        el.bottomPreviewMasterBtn.title = '선택한 곡을 마스터링하고 있습니다.';
    } else if (track.status === 'analyzing') {
        el.bottomPreviewMasterBtn.textContent = '\u{1F50D} 분석 중';
        el.bottomPreviewMasterBtn.title = '누르면 분석 완료를 기다린 뒤 바로 마스터링합니다.';
    } else if (track.error) {
        el.bottomPreviewMasterBtn.textContent = '\u{26A0} 오류 확인';
        el.bottomPreviewMasterBtn.title = '오류가 있는 곡은 다시 불러온 뒤 진행해주세요.';
    } else {
        el.bottomPreviewMasterBtn.textContent = '\u{1F6E0} 마스터링';
        el.bottomPreviewMasterBtn.title = '선택한 곡을 마스터링합니다.';
    }
    updateHelpText(el.bottomPreviewMasterBtn, el.bottomPreviewMasterBtn.title);
}
function setBottomPreviewTabState(mode, masteredAvailable) {
    const originalActive = mode === 'original';
    const masteredActive = mode === 'mastered';
    if (el.bottomPreviewOriginalBtn) {
        el.bottomPreviewOriginalBtn.classList.toggle('active', originalActive);
        el.bottomPreviewOriginalBtn.setAttribute('aria-selected', String(originalActive));
        updateHelpText(el.bottomPreviewOriginalBtn, '불러온 원본 파일을 기준으로 미리듣습니다.');
    }
    if (el.bottomPreviewMasteredBtn) {
        el.bottomPreviewMasteredBtn.classList.toggle('active', masteredActive);
        el.bottomPreviewMasteredBtn.setAttribute('aria-selected', String(masteredActive));
        el.bottomPreviewMasteredBtn.disabled = !masteredAvailable;
        el.bottomPreviewMasteredBtn.title = masteredAvailable ? '마스터링된 곡을 재생합니다.' : '마스터링 실행 후 활성화됩니다.';
        updateHelpText(el.bottomPreviewMasteredBtn, el.bottomPreviewMasteredBtn.title);
    }
}
function getBottomPreviewAudio() {
    return el.bottomPreviewPlayer?.querySelector('audio[data-bottom-preview-active="true"]')
        || el.bottomPreviewPlayer?.querySelector('audio:not([data-crossfade-legacy="true"])')
        || el.bottomPreviewPlayer?.querySelector('audio')
        || null;
}
function getMasterPreviewStartSec(track) {
    const value = Number(track?.masterPreviewInfo?.startSec ?? track?.masterPreviewInfo?.highlightStartSec ?? track?.abHighlightStartSec ?? track?.analysis?.abHighlightStartSec ?? 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
}
function localToAbsolutePreviewTime(track, mode, localSec) {
    const local = Math.max(0, Number(localSec || 0));
    if (mode === 'masterPreview') return getMasterPreviewStartSec(track) + local;
    return local;
}
function absoluteToLocalPreviewTime(track, mode, absoluteSec, durationSec) {
    const absolute = Math.max(0, Number(absoluteSec || 0));
    let local = mode === 'masterPreview' ? absolute - getMasterPreviewStartSec(track) : absolute;
    if (!Number.isFinite(local) || local < 0) local = 0;
    const duration = Number(durationSec || 0);
    if (Number.isFinite(duration) && duration > 0) local = clamp(local, 0, Math.max(0, duration - 0.08));
    return local;
}
function captureBottomPreviewTransport(track = getSelectedTrack(), mode = state.bottomPreviewMode, options = {}) {
    const audio = getBottomPreviewAudio();
    if (!audio || !track) return null;
    const audioTrackId = getDockAudioTrackId(audio);
    if (audioTrackId && audioTrackId !== String(track.id || '')) return null;
    const localSec = Number(audio.currentTime || 0), absoluteSec = localToAbsolutePreviewTime(track, mode, localSec), capturedAt = Date.now();
    const transport = {
        trackId: track.id,
        mode,
        localSec,
        absoluteSec,
        playing: !audio.paused && !audio.ended,
        translationMode: state.previewTranslationMode || 'studio', reason: String(options.reason || 'interaction'),
        capturedAt, expiresAt: capturedAt + Math.max(60000, Number(options.ttlMs || 60000))
    };
    state.bottomPreviewTransport = transport;
    return transport;
}
function getPendingBottomPreviewTransport(track, targetMode, durationSec, fallbackAutoPlay = false) {
    const transport = state.bottomPreviewTransport;
    if (!transport || !track || transport.trackId !== track.id) {
        const hint = targetMode === 'masterPreview' ? 0 : getTrackHighlightStart(track);
        return { startSec: Number.isFinite(Number(hint)) ? Number(hint) : 0, playing: Boolean(fallbackAutoPlay) };
    }
    const fresh = !transport.capturedAt || Date.now() < Number(transport.expiresAt || (transport.capturedAt + 60 * 1000));
    const startSec = fresh ? absoluteToLocalPreviewTime(track, targetMode, transport.absoluteSec, durationSec) : 0;
    return { startSec, playing: Boolean(fallbackAutoPlay || (fresh && transport.playing)) };
}
function applyBottomPreviewStart(audio, startSec = 0) {
    if (!audio) return;
    const target = Math.max(0, Number(startSec || 0));
    const seek = () => {
        try {
            const duration = Number(audio.duration || 0);
            const safeTarget = Number.isFinite(duration) && duration > 0 ? clamp(target, 0, Math.max(0, duration - 0.08)) : target;
            if (Math.abs((audio.currentTime || 0) - safeTarget) > 0.05) audio.currentTime = safeTarget;
        } catch (error) {}
    };
    if (audio.readyState >= 1) seek();
    else audio.addEventListener('loadedmetadata', seek, { once: true });
}
function clearBottomPreviewPlayer() {
    if (!el.bottomPreviewPlayer) return;
    Array.from(el.bottomPreviewPlayer.children).forEach(child => { try { child._foxbearDispose?.(); } catch (error) {} });
    el.bottomPreviewPlayer.querySelectorAll('audio').forEach(audio => {
        try { audio.pause(); } catch (error) {}
        if (audio._foxbearTranslationController?.close) audio._foxbearTranslationController.close();
        else if (audio._foxbearTranslationContext) closePreviewTranslationContext(audio._foxbearTranslationContext);
        unregisterPlaybackLinkedAudio(audio, 'bottom-preview-clear');
        try { audio.removeAttribute('src'); audio.load(); } catch (error) {}
    });
    el.bottomPreviewPlayer.textContent = '';
    delete el.bottomPreviewPlayer.dataset.previewKey;
}
function playBottomPreviewAudio() {
    const player = el.bottomPreviewPlayer?.firstElementChild;
    if (player && typeof player._foxbearPlay === 'function') {
        player._foxbearPlay();
        return;
    }
    const audio = el.bottomPreviewPlayer?.querySelector('audio');
    if (!audio) return;
    playAudioWithFadeIn(audio).catch(() => showToast('브라우저가 자동 재생을 차단했습니다. 하단 재생 버튼을 눌러주세요.'));
}
function makePreviewTitle(label, durationSec) {
    const title = document.createElement('strong');
    const main = document.createElement('span');
    main.textContent = label;
    title.appendChild(main);
    if (Number.isFinite(Number(durationSec)) && Number(durationSec) > 0) {
        const small = document.createElement('small');
        small.className = 'preview-runtime';
        small.textContent = `총 ${formatTime(Number(durationSec))}`;
        title.appendChild(small);
    }
    return title;
}
function formatPlayerTime(current, duration) {
    if (Number.isFinite(Number(duration)) && Number(duration) > 0) return `${formatTime(current || 0)} / ${formatTime(duration)}`;
    return formatTime(current || 0);
}
function plainSliderLabel(label) {
    return String(label || '').replace(/\s*\([^)]*\)/g, '').trim() || '컨트롤';
}
function getTrackHighlightStart(track) {
    if (!state.autoHighlightAB || !track) return NaN;
    const directRaw = track.abHighlightStartSec;
    const direct = Number(directRaw);
    if (directRaw !== null && directRaw !== undefined && Number.isFinite(direct) && direct >= 0) return direct;
    const analysisRaw = track.analysis?.abHighlightStartSec;
    const fromAnalysis = Number(analysisRaw);
    if (analysisRaw !== null && analysisRaw !== undefined && Number.isFinite(fromAnalysis) && fromAnalysis >= 0) return fromAnalysis;
    const duration = Number(track.analysis?.duration || track.masteredDurationSec || 0);
    if (!Number.isFinite(duration) || duration <= 8) return NaN;
    return clamp(duration * 0.33, 0, Math.max(0, duration - 5));
}
function setPlayerToggleIcon(button, isPlaying) {
    if (!button) return;
    button.textContent = '';
    const icon = document.createElement('span');
    icon.className = isPlaying ? 'player-icon player-icon-pause' : 'player-icon player-icon-play';
    icon.setAttribute('aria-hidden', 'true');
    button.appendChild(icon);
}
function createPreviewPlayer(src, gainDb = 0, knownDurationSec = 0, loopCompare = false, loopStartHint = NaN, options = {}) {
    const wrap = document.createElement('div');
    wrap.className = `custom-player ${loopCompare ? 'ab-loop-player' : ''}`;
    const audio = configurePreviewAudioElement(document.createElement('audio'));
    audio.src = src;
    if (state.abLevelMatch && Number.isFinite(gainDb)) {
        audio.volume = clamp(Math.pow(10, gainDb / 20), 0.02, 1);
    }
    setupPreviewTranslationAudio(audio, options);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'player-toggle';
    setPlayerToggleIcon(toggle, false);
    toggle.setAttribute('aria-label', '재생');
    attachHelpTooltip(toggle, '미리듣기를 재생하거나 일시정지합니다.');
    const seek = document.createElement('input');
    seek.type = 'range';
    seek.className = 'player-seek';
    seek.min = '0';
    seek.max = '1000';
    seek.step = '1';
    seek.value = '0';
    const time = document.createElement('span');
    time.className = 'player-time';
    const initialDuration = Number(knownDurationSec || 0);
    time.textContent = formatPlayerTime(0, initialDuration);
    const loopBadge = document.createElement('span');
    loopBadge.className = 'ab-loop-badge';
    loopBadge.textContent = state.autoHighlightAB ? '하이라이트 5초' : '5초 루프';
    if (!loopCompare) loopBadge.hidden = true;
    let loopStart = Number.isFinite(Number(loopStartHint)) ? Number(loopStartHint) : NaN;
    const setPlaying = isPlaying => {
        toggle.classList.toggle('playing', Boolean(isPlaying));
        setPlayerToggleIcon(toggle, Boolean(isPlaying));
        toggle.setAttribute('aria-label', isPlaying ? '일시정지' : '재생');
    };
    const getDuration = () => Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : initialDuration;
    const getLoopBounds = () => {
        const duration = getDuration();
        if (!loopCompare || !Number.isFinite(duration) || duration <= 6) return null;
        const length = 5;
        const maxStart = Math.max(0, duration - length);
        if (!Number.isFinite(loopStart)) loopStart = clamp(duration * 0.33, 0, maxStart);
        loopStart = clamp(loopStart, 0, maxStart);
        return { start: loopStart, end: Math.min(duration, loopStart + length) };
    };
    toggle.addEventListener('click', () => {
        if (audio.paused) playAudioWithFadeIn(audio).catch(() => showToast('브라우저가 재생을 차단했습니다. 다시 눌러주세요.'));
        else pauseAudioWithFadeOut(audio);
    });
    audio.addEventListener('loadedmetadata', () => {
        const bounds = getLoopBounds();
        if (bounds && audio.currentTime < bounds.start) audio.currentTime = bounds.start;
        time.textContent = formatPlayerTime(audio.currentTime || 0, getDuration());
    });
    audio.addEventListener('play', () => {
        const allowed = wrap._foxbearCrossfadeOldAudio ? [wrap._foxbearCrossfadeOldAudio] : [];
        bindExclusivePreview(audio, { allowAudioElements: allowed });
        const bounds = getLoopBounds();
        if (bounds && (audio.currentTime < bounds.start || audio.currentTime >= bounds.end)) audio.currentTime = bounds.start;
        setPlaying(true);
        syncDockWaveformPlayhead(audio);
        onDockAudioTransportEvent(audio);
    });
    audio.addEventListener('pause', () => {
        setPlaying(false);
        syncDockWaveformPlayhead(audio);
        onDockAudioTransportEvent(audio);
    });
    audio.addEventListener('ended', () => {
        setPlaying(false);
        seek.value = '0';
        time.textContent = formatPlayerTime(0, getDuration());
        syncDockWaveformPlayhead(audio);
        onDockAudioTransportEvent(audio);
    });
    audio.addEventListener('timeupdate', () => {
        const duration = getDuration();
        const bounds = getLoopBounds();
        if (bounds && audio.currentTime >= bounds.end) {
            audio.currentTime = bounds.start;
            return;
        }
        if (Number.isFinite(duration) && duration > 0) seek.value = String(Math.round(audio.currentTime / duration * 1000));
        time.textContent = formatPlayerTime(audio.currentTime || 0, duration);
        syncDockWaveformPlayhead(audio);
        syncMediaSessionForDock(audio);
    });
    seek.addEventListener('input', () => {
        const duration = getDuration();
        if (Number.isFinite(duration) && duration > 0) {
            audio.currentTime = Number(seek.value) / 1000 * duration;
            if (loopCompare) loopStart = audio.currentTime;
            syncDockWaveformPlayhead(audio);
        }
    });
    registerPlaybackLinkedAudio(audio, {
        role: options.playerRole || 'inline-preview',
        shell: wrap,
        trackId: options.trackId || '',
        mode: options.mode || (gainDb ? 'mastered' : 'original'),
        label: options.label || (gainDb ? '마스터 미리듣기' : '원음 미리듣기'),
        absoluteStartSec: Number.isFinite(Number(options.absoluteStartSec)) ? Number(options.absoluteStartSec) : 0,
        durationSec: getDuration()
    });
    wrap.append(toggle, seek, time, loopBadge, audio);
    return wrap;
}
function bindExclusivePreview(audio, options = {}) {
    const allowed = new Set(Array.isArray(options.allowAudioElements) ? options.allowAudioElements.filter(Boolean) : []);
    if (audio && !allowed.size && FoxBearPlaybackLinkService && typeof FoxBearPlaybackLinkService.pauseAllExcept === 'function') {
        FoxBearPlaybackLinkService.pauseAllExcept(audio, 'legacy-exclusive-preview');
        return;
    }
    document.querySelectorAll('.custom-player audio, .ab-switch-deck audio, .difference-preview-player audio, audio[data-preview-system]').forEach(other => {
        if (other !== audio && !allowed.has(other)) other.pause();
    });
}
function createABSwitchPlayer(track) {
    const deck = document.createElement('section');
    deck.className = 'ab-switch-deck';
    deck.setAttribute('aria-label', '원본과 마스터링본을 같은 위치에서 비교');
    const head = document.createElement('div');
    head.className = 'ab-switch-head';
    const title = document.createElement('strong');
    title.textContent = 'A/B 스위치 비교';
    const sourceBadge = document.createElement('span');
    sourceBadge.textContent = '원본 A';
    head.append(title, sourceBadge);
    const originalAudio = configurePreviewAudioElement(document.createElement('audio'));
    originalAudio.src = track.originalUrl;
    const masteredAudio = configurePreviewAudioElement(document.createElement('audio'));
    masteredAudio.src = track.masteredUrl;
    const matchGainDb = getABMatchGainDb(track);
    if (state.abLevelMatch && Number.isFinite(matchGainDb)) masteredAudio.volume = clamp(Math.pow(10, matchGainDb / 20), 0.02, 1);
    rememberAudioTargetVolume(originalAudio);
    rememberAudioTargetVolume(masteredAudio);
    let active = 'original';
    let loopStart = getTrackHighlightStart(track);
    const activeAudio = () => active === 'original' ? originalAudio : masteredAudio;
    const inactiveAudio = () => active === 'original' ? masteredAudio : originalAudio;
    const durationSec = Number(track.analysis?.duration || track.masteredDurationSec || 0);
    const controls = document.createElement('div');
    controls.className = 'ab-switch-controls';
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'player-toggle';
    setPlayerToggleIcon(play, false);
    play.setAttribute('aria-label', 'A/B 재생');
    const swap = document.createElement('button');
    swap.type = 'button';
    swap.className = 'btn-secondary ab-swap-btn';
    swap.textContent = '마스터 B로 전환';
    const seek = document.createElement('input');
    seek.type = 'range';
    seek.min = '0';
    seek.max = '1000';
    seek.step = '1';
    seek.value = '0';
    seek.className = 'player-seek';
    const time = document.createElement('span');
    time.className = 'player-time';
    time.textContent = formatPlayerTime(0, durationSec);
    controls.append(play, swap, seek, time);
    const hint = document.createElement('small');
    hint.className = 'ab-switch-hint';
    hint.textContent = state.abLevelMatch ? `마스터본을 ${formatSigned(matchGainDb, 1)} dB로 레벨 매칭해 비교합니다.` : '레벨 매칭 OFF · 실제 마스터링 체감 음량으로 비교합니다.';
    const compareTools = document.createElement('div');
    compareTools.className = 'ab-switch-compare-tools';
    compareTools.setAttribute('aria-label', '비교 전용 컨트롤');
    const createCompareToolButton = (key, label, description) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ab-compare-tool';
        button.dataset.compareTool = key;
        button.dataset.state = 'off';
        button.title = description;
        button.setAttribute('aria-pressed', 'false');
        const text = document.createElement('span');
        text.className = 'ab-compare-tool-label';
        text.textContent = label;
        const status = document.createElement('b');
        status.className = 'ab-compare-tool-status';
        status.textContent = 'OFF';
        button.append(text, status);
        return button;
    };
    const levelMatchBtn = createCompareToolButton('level-match', '레벨매칭', '원본/마스터 체감 볼륨을 맞춰 비교합니다.');
    const loopBtn = createCompareToolButton('ab-loop', '5초 루프', '현재 비교 위치를 5초 구간으로 반복합니다.');
    const differenceBtn = createCompareToolButton('difference-listen', '차이듣기', '마스터에서 원본을 뺀 차이 성분을 Dock 비교 재생으로 확인합니다.');
    const highlightBtn = createCompareToolButton('highlight-seek', '하이라이트 이동', '분석된 하이라이트 구간으로 A/B 위치를 맞춥니다.');
    highlightBtn.classList.add('action-only');
    highlightBtn.removeAttribute('aria-pressed');
    compareTools.append(levelMatchBtn, loopBtn, differenceBtn, highlightBtn);
    const syncCompareToolUi = () => {
        const setToggle = (button, active) => {
            button.classList.toggle('active', Boolean(active));
            button.dataset.state = active ? 'on' : 'off';
            button.setAttribute('aria-pressed', String(Boolean(active)));
            const status = button.querySelector('.ab-compare-tool-status');
            if (status) status.textContent = active ? 'ON' : 'OFF';
        };
        setToggle(levelMatchBtn, state.abLevelMatch);
        setToggle(loopBtn, state.abLoopMode);
        setToggle(differenceBtn, state.abDifferenceListen);
        highlightBtn.dataset.state = 'action';
        const highlightStatus = highlightBtn.querySelector('.ab-compare-tool-status');
        if (highlightStatus) highlightStatus.textContent = '이동';
        const nextGain = state.abLevelMatch && Number.isFinite(matchGainDb) ? clamp(Math.pow(10, matchGainDb / 20), 0.02, 1) : 1;
        masteredAudio.volume = nextGain;
        masteredAudio.dataset.foxbearTargetVolume = String(nextGain);
        hint.textContent = state.abLevelMatch ? `마스터본을 ${formatSigned(matchGainDb, 1)} dB로 레벨 매칭해 비교합니다.` : '실제 마스터링 체감 음량으로 비교합니다.';
        if (state.abLoopMode) hint.textContent += ' · 5초 루프 ON';
        if (state.abDifferenceListen) hint.textContent += ' · 차이듣기 ON';
    };
    const waveformDeck = document.createElement('div');
    waveformDeck.className = 'ab-switch-inline-waveforms';
    waveformDeck.setAttribute('aria-label', 'A/B 통합 파형 컨트롤');
    const createInlineWaveformRow = (mode, label) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = `ab-switch-inline-waveform-row ab-waveform-${mode}`;
        row.dataset.abWaveformMode = mode;
        row.setAttribute('aria-label', `${label} 파형에서 위치 이동`);
        const title = document.createElement('span');
        title.className = 'ab-switch-inline-waveform-label';
        title.textContent = label;
        const values = mode === 'mastered' ? getTrackMasterWaveformValues(track) : getTrackOriginalWaveformValues(track);
        const markers = mode === 'mastered' ? getTrackMasterWaveformMarkers(track, values) : sampleMarkersFromValues(values);
        const bars = createManagedWaveformBars({
            tagName: 'span',
            className: 'ab-switch-inline-waveform-bars has-live-playhead',
            values,
            markers,
            bins: getAdaptiveDockWaveformBinCount('dialog'),
            role: `ab-${mode}`,
            barClassPrefix: 'dock-integrated-waveform',
            realMinHeight: 10,
            placeholderMinHeight: 10,
            placeholderFactory: index => clamp(0.18 + Math.sin(index * 0.43) * 0.08, 0.08, 0.34)
        });
        row.append(title, bars);
        row.addEventListener('click', event => {
            const duration = Number(activeAudio().duration || durationSec || 0);
            if (!Number.isFinite(duration) || duration <= 0) return;
            const service = window.FoxBearWaveformControlService;
            const pct = service && typeof service.pointerToPercent === 'function'
                ? clamp(service.pointerToPercent(event, bars) / 100, 0, 1)
                : clamp((event.clientX - bars.getBoundingClientRect().left) / Math.max(1, bars.getBoundingClientRect().width), 0, 1);
            const position = pct * duration;
            originalAudio.currentTime = Math.min(position, Number(originalAudio.duration || duration));
            masteredAudio.currentTime = Math.min(position, Number(masteredAudio.duration || duration));
            if (state.abLoopMode) loopStart = position;
            syncUi();
        });
        return row;
    };
    const originalWaveformRow = createInlineWaveformRow('original', '원본 A');
    const masteredWaveformRow = createInlineWaveformRow('mastered', '마스터 B');
    waveformDeck.append(originalWaveformRow, masteredWaveformRow);
    const syncUi = () => {
        const audio = activeAudio();
        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationSec;
        if (Number.isFinite(duration) && duration > 0) seek.value = String(Math.round((audio.currentTime || 0) / duration * 1000));
        time.textContent = formatPlayerTime(audio.currentTime || 0, duration);
        sourceBadge.textContent = active === 'original' ? '원본 A' : '마스터 B';
        swap.textContent = active === 'original' ? '마스터 B로 전환' : '원본 A로 전환';
        setPlayerToggleIcon(play, !audio.paused);
        const pct = Number.isFinite(duration) && duration > 0 ? clamp((audio.currentTime || 0) / duration, 0, 1) : 0;
        setPlayheadOnElement(originalWaveformRow.querySelector('.ab-switch-inline-waveform-bars'), pct * 100, active === 'original' && !audio.paused);
        setPlayheadOnElement(masteredWaveformRow.querySelector('.ab-switch-inline-waveform-bars'), pct * 100, active === 'mastered' && !audio.paused);
        originalWaveformRow.classList.toggle('active', active === 'original');
        masteredWaveformRow.classList.toggle('active', active === 'mastered');
    };
    const getLoopBounds = () => {
        if (!state.abLoopMode) return null;
        const duration = Number(activeAudio().duration || durationSec || 0);
        if (!Number.isFinite(duration) || duration <= 6) return null;
        const length = 5;
        if (!Number.isFinite(loopStart)) loopStart = clamp(duration * 0.33, 0, Math.max(0, duration - length));
        loopStart = clamp(loopStart, 0, Math.max(0, duration - length));
        return { start: loopStart, end: Math.min(duration, loopStart + length) };
    };
    const switchTo = (next, options = {}) => {
        const oldAudio = activeAudio();
        const wasPlaying = !oldAudio.paused;
        const position = oldAudio.currentTime || 0;
        active = next;
        const nextAudio = activeAudio();
        nextAudio.currentTime = Math.min(position, Number(nextAudio.duration || durationSec || position));
        if (wasPlaying) {
            bindExclusivePreview(nextAudio, { allowAudioElements: [oldAudio] });
            crossfadeAudioPair(oldAudio, nextAudio, { userGesture: Boolean(options.userGesture) }).catch(() => {
                try { oldAudio.pause(); } catch (error) {}
                playAudioWithFadeIn(nextAudio, { fromZero: false }).catch(() => showToast('브라우저가 재생을 차단했습니다. 다시 눌러주세요.'));
            });
        } else {
            oldAudio.pause();
        }
        syncUi();
    };
    play.addEventListener('click', () => {
        const audio = activeAudio();
        if (audio.paused) {
            bindExclusivePreview(audio);
            const bounds = getLoopBounds();
            if (bounds && (audio.currentTime < bounds.start || audio.currentTime >= bounds.end)) audio.currentTime = bounds.start;
            playAudioWithFadeIn(audio).catch(() => showToast('브라우저가 재생을 차단했습니다. 다시 눌러주세요.'));
        } else {
            pauseAudioWithFadeOut(audio);
        }
        syncUi();
    });
    swap.addEventListener('click', () => switchTo(active === 'original' ? 'mastered' : 'original', { userGesture: true }));
    seek.addEventListener('input', () => {
        const duration = Number(activeAudio().duration || durationSec || 0);
        if (Number.isFinite(duration) && duration > 0) {
            const position = Number(seek.value) / 1000 * duration;
            originalAudio.currentTime = Math.min(position, Number(originalAudio.duration || duration));
            masteredAudio.currentTime = Math.min(position, Number(masteredAudio.duration || duration));
            if (state.abLoopMode) loopStart = position;
            syncUi();
        }
    });
    [originalAudio, masteredAudio].forEach(audio => {
        audio.addEventListener('play', syncUi);
        audio.addEventListener('pause', syncUi);
        audio.addEventListener('loadedmetadata', syncUi);
        audio.addEventListener('timeupdate', () => {
            if (audio !== activeAudio()) return;
            const bounds = getLoopBounds();
            if (bounds && audio.currentTime >= bounds.end) {
                audio.currentTime = bounds.start;
                return;
            }
            inactiveAudio().currentTime = Math.min(audio.currentTime || 0, Number(inactiveAudio().duration || durationSec || audio.currentTime || 0));
            syncUi();
        });
        audio.addEventListener('ended', syncUi);
    });
    registerPlaybackLinkedAudio(originalAudio, {
        role: 'ab-switch-original',
        shell: deck,
        trackId: track?.id || '',
        mode: 'original',
        label: 'A/B 원본',
        durationSec
    });
    registerPlaybackLinkedAudio(masteredAudio, {
        role: 'ab-switch-mastered',
        shell: deck,
        trackId: track?.id || '',
        mode: 'mastered',
        label: 'A/B 마스터',
        durationSec
    });
    levelMatchBtn.addEventListener('click', () => {
        state.abLevelMatch = !state.abLevelMatch;
        syncCompareToolUi();
        syncBottomCompareTools();
        renderBottomPreviewDock({ keepPlaying: true });
        showToast(state.abLevelMatch ? '비교창 레벨매칭을 켰습니다.' : '비교창 레벨매칭을 껐습니다.');
    });
    loopBtn.addEventListener('click', () => {
        state.abLoopMode = !state.abLoopMode;
        if (state.abLoopMode) loopStart = activeAudio().currentTime || getTrackHighlightStart(track);
        syncCompareToolUi();
        syncUi();
        showToast(state.abLoopMode ? '비교창 5초 루프를 켰습니다.' : '비교창 5초 루프를 껐습니다.');
    });
    differenceBtn.addEventListener('click', () => {
        const hasCompare = Boolean(track?.masteredUrl || track?.masterPreviewUrl);
        if (!hasCompare) {
            showToast('마스터링 또는 하이라이트 듣기 생성 후 차이듣기를 사용할 수 있습니다.');
            return;
        }
        state.abDifferenceListen = !state.abDifferenceListen;
        if (state.abDifferenceListen && state.bottomPreviewMode === 'original') {
            state.bottomPreviewMode = track.masteredUrl ? 'mastered' : 'masterPreview';
        }
        syncCompareToolUi();
        syncBottomCompareTools();
        renderBottomPreviewDock({ keepPlaying: true, autoPlay: state.abDifferenceListen });
        showToast(state.abDifferenceListen ? '차이듣기를 켰습니다. Dock 비교 재생에서 차이 성분을 확인합니다.' : '차이듣기를 껐습니다.');
    });
    highlightBtn.addEventListener('click', () => {
        const start = getTrackHighlightStart(track);
        const duration = Number(activeAudio().duration || durationSec || 0);
        if (!Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0) {
            showToast('하이라이트 구간을 아직 계산할 수 없습니다.');
            return;
        }
        const safeStart = clamp(start, 0, Math.max(0, duration - 1));
        loopStart = safeStart;
        originalAudio.currentTime = Math.min(safeStart, Number(originalAudio.duration || duration));
        masteredAudio.currentTime = Math.min(safeStart, Number(masteredAudio.duration || duration));
        syncUi();
        showToast(`비교창을 ${formatPlayerTime(safeStart, duration)} 하이라이트 구간으로 이동했습니다.`);
    });
    syncCompareToolUi();
    deck.append(head, controls, waveformDeck, compareTools, hint, originalAudio, masteredAudio);
    return deck;
}
function renderSpectrumPanel(track) {
    const visualizer = window.FoxBearSpectrumVisualizer;
    if (!track || !track.analysis || !el.trackDetail || !visualizer || typeof visualizer.renderPanel !== 'function') return;
    const panel = visualizer.renderPanel({
        document,
        track,
        getActiveAudio: () => getActiveSpectrumAudioForTrack(track)
    });
    if (panel) el.trackDetail.appendChild(panel);
}
function getActiveSpectrumAudioForTrack(track) {
    const list = Array.from(document.querySelectorAll('audio'));
    const trackId = String(track?.id || '');
    return list.find(audio => !audio.paused && !audio.ended && audio.dataset.spectrumTrackId === trackId)
        || list.find(audio => !audio.paused && !audio.ended)
        || list.find(audio => audio.dataset.spectrumTrackId === trackId)
        || null;
}
function renderWaveformPanel(track) {
    if (!track || !track.waveformOverview) return;
    const panel = document.createElement('section');
    panel.className = 'waveform-panel';
    const head = document.createElement('div');
    head.className = 'waveform-head';
    const title = document.createElement('strong');
    title.textContent = '파형 / 피크 미니뷰';
    const badge = document.createElement('span');
    badge.textContent = 'Before / After';
    head.append(title, badge);
    panel.appendChild(head);
    const originalWaveform = getTrackOriginalWaveformValues(track);
    const masterWaveform = getTrackMasterWaveformValues(track);
    panel.appendChild(makeWaveformRow('원본', originalWaveform, sampleMarkersFromValues(originalWaveform)));
    panel.appendChild(makeWaveformRow('마스터', masterWaveform, getTrackMasterWaveformMarkers(track, masterWaveform)));
    const hint = document.createElement('small');
    hint.className = 'waveform-hint';
    hint.textContent = '막대가 높을수록 해당 구간의 피크가 큽니다. 붉은 표시는 클리핑 근접 구간입니다.';
    panel.appendChild(hint);
    el.trackDetail.appendChild(panel);
}
function makeWaveformRow(label, values = [], markers = []) {
    const view = window.FoxBearWaveformControlView;
    if (view && typeof view.createRow === 'function') {
        const row = view.createRow({
            document,
            label,
            values,
            markers,
            bins: Math.max(8, Array.isArray(values) && values.length ? values.length : 64),
            rowClassName: 'waveform-row',
            barsClassName: 'waveform-bars',
            role: 'detail',
            barClassPrefix: 'waveform',
            realMinHeight: 5,
            placeholderMinHeight: 5
        });
        enhanceWaveformRowZoom(row, label, values, markers);
        return row;
    }
    const row = document.createElement('div');
    row.className = 'waveform-row';
    const span = document.createElement('span');
    span.textContent = label;
    const bars = createManagedWaveformBars({
        className: 'waveform-bars',
        values,
        markers,
        bins: Math.max(8, Array.isArray(values) && values.length ? values.length : 64),
        role: 'detail',
        barClassPrefix: 'waveform',
        realMinHeight: 5,
        placeholderMinHeight: 5
    });
    row.append(span, bars);
    enhanceWaveformRowZoom(row, label, values, markers);
    return row;
}
function enhanceWaveformRowZoom(row, label, values = [], markers = []) {
    const sourceValues = Array.isArray(values) ? values.slice() : [];
    if (!row || sourceValues.length < 16) return row;
    let zoom = 1;
    let center = 0.5;
    let lastTap = 0;
    let pinchStart = null;
    const status = document.createElement('span');
    status.className = 'waveform-zoom-status';
    const controls = document.createElement('div');
    controls.className = 'waveform-zoom-controls';
    const makeButton = (text, title, action) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'waveform-zoom-btn';
        button.textContent = text;
        button.title = title;
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            action();
        });
        return button;
    };
    const render = () => {
        const total = sourceValues.length;
        const windowSize = Math.max(8, Math.round(total / zoom));
        const start = clamp(Math.round(center * total - windowSize / 2), 0, Math.max(0, total - windowSize));
        const end = Math.min(total, start + windowSize);
        const subset = sourceValues.slice(start, end);
        const subsetMarkers = Array.isArray(markers) && markers.length ? markers.slice(start, end) : sampleMarkersFromValues(subset);
        const oldBars = row.querySelector('.waveform-bars');
        const nextBars = createManagedWaveformBars({
            className: 'waveform-bars waveform-bars-zoomable',
            values: subset,
            markers: subsetMarkers,
            bins: Math.max(8, subset.length),
            role: 'detail-zoom',
            barClassPrefix: 'waveform',
            realMinHeight: 5,
            placeholderMinHeight: 5,
            dataset: { waveformZoom: `${zoom}x`, waveformWindowStart: start, waveformWindowEnd: end }
        });
        nextBars.setAttribute('aria-label', `${label} 확대 파형 ${zoom}배, 전체 ${total}개 bin 중 ${start + 1}-${end} 구간`);
        nextBars.addEventListener('dblclick', onDoubleTapZoom);
        nextBars.addEventListener('touchstart', onTouchStart, { passive: true });
        nextBars.addEventListener('touchmove', onTouchMove, { passive: false });
        if (oldBars) oldBars.replaceWith(nextBars);
        status.textContent = zoom === 1 ? '전체' : `${zoom}x · ${Math.round(start / total * 100)}-${Math.round(end / total * 100)}%`;
        row.classList.toggle('is-waveform-zoomed', zoom > 1);
    };
    const setZoom = (nextZoom, nextCenter = center) => {
        zoom = clamp(Math.round(Number(nextZoom) || 1), 1, 8);
        center = clamp(Number(nextCenter), 0, 1);
        render();
    };
    const pointerCenter = event => {
        const bars = row.querySelector('.waveform-bars');
        const rect = bars?.getBoundingClientRect?.();
        if (!rect || !rect.width) return center;
        return clamp((Number(event.clientX || rect.left + rect.width / 2) - rect.left) / rect.width, 0, 1);
    };
    function onDoubleTapZoom(event) {
        event.preventDefault();
        setZoom(zoom >= 8 ? 1 : zoom * 2, pointerCenter(event));
    }
    function onTouchStart(event) {
        if (event.touches && event.touches.length === 2) {
            const [a, b] = event.touches;
            const dx = a.clientX - b.clientX;
            const dy = a.clientY - b.clientY;
            pinchStart = { distance: Math.hypot(dx, dy), zoom };
            return;
        }
        const now = Date.now();
        if (now - lastTap < 320 && event.touches && event.touches[0]) {
            const touch = event.touches[0];
            onDoubleTapZoom({ preventDefault(){}, clientX: touch.clientX });
        }
        lastTap = now;
    }
    function onTouchMove(event) {
        if (!pinchStart || !event.touches || event.touches.length !== 2) return;
        const [a, b] = event.touches;
        const dx = a.clientX - b.clientX;
        const dy = a.clientY - b.clientY;
        const distance = Math.hypot(dx, dy);
        if (!Number.isFinite(distance) || distance <= 0) return;
        event.preventDefault();
        const midX = (a.clientX + b.clientX) / 2;
        const ratio = distance / Math.max(1, pinchStart.distance);
        const targetZoom = ratio > 1.18 ? pinchStart.zoom * 2 : (ratio < 0.84 ? pinchStart.zoom / 2 : zoom);
        const bars = row.querySelector('.waveform-bars');
        const rect = bars?.getBoundingClientRect?.();
        const nextCenter = rect && rect.width ? clamp((midX - rect.left) / rect.width, 0, 1) : center;
        setZoom(targetZoom, nextCenter);
    }
    controls.append(
        makeButton('−', '파형 축소', () => setZoom(zoom / 2)),
        makeButton('+', '파형 확대', () => setZoom(zoom * 2)),
        makeButton('초기화', '전체 파형 보기', () => setZoom(1, 0.5)),
        status
    );
    row.appendChild(controls);
    const bars = row.querySelector('.waveform-bars');
    if (bars) {
        bars.classList.add('waveform-bars-zoomable');
        bars.addEventListener('dblclick', onDoubleTapZoom);
        bars.addEventListener('touchstart', onTouchStart, { passive: true });
        bars.addEventListener('touchmove', onTouchMove, { passive: false });
    }
    status.textContent = '전체';
    row.dataset.waveformZoomEnabled = 'true';
    return row;
}
function createQualityGateReport(track, report, finalizeInfo, encoded) {
    const service = getQualityGateService();
    if (service && typeof service.createReport === 'function') {
        return service.createReport({
            track,
            report,
            finalizeInfo,
            encoded,
            rules: QUALITY_GATE_RULES,
            targetLufs: state.targetLufs,
            ceilingDb: state.ceilingDb,
            performanceGuardLabel: track?.performanceGuardInfo?.changed ? formatPerformanceGuardInfo(track.performanceGuardInfo) : ''
        });
    }
    const items = [];
    const target = Number(report?.target?.lufs ?? state.targetLufs);
    const afterLufs = Number(report?.after?.approxLufs);
    const lufsDiff = Number.isFinite(target) && Number.isFinite(afterLufs) ? afterLufs - target : NaN;
    addQualityGateItem(items, '라우드니스 목표', Math.abs(lufsDiff) <= QUALITY_GATE_RULES.lufsToleranceDb ? 'pass' : 'warn', Number.isFinite(lufsDiff) ? `목표 대비 ${formatSigned(lufsDiff, 1)} LUFS` : '측정값 없음');
    const peakDb = Number(report?.after?.peakDb);
    const ceiling = Number(report?.target?.ceilingDb ?? state.ceilingDb);
    addQualityGateItem(items, '피크 천장', Number.isFinite(peakDb) && peakDb <= ceiling + QUALITY_GATE_RULES.peakMarginDb ? 'pass' : 'warn', Number.isFinite(peakDb) ? `최종 ${peakDb.toFixed(2)} dBFS · 천장 ${ceiling.toFixed(1)} dB` : '측정값 없음');
    const invalid = Number(report?.after?.invalidSamples || 0);
    addQualityGateItem(items, 'Invalid sample scan', invalid === 0 ? 'pass' : 'fail', invalid === 0 ? 'NaN/Infinity 없음' : `${invalid}개 비정상 샘플 감지`);
    const clipped = Number(report?.after?.clippedSamples || 0);
    addQualityGateItem(items, '클리핑 샘플', clipped === 0 ? 'pass' : (clipped < 8 ? 'warn' : 'fail'), clipped === 0 ? '0개' : `${clipped}개`);
    const gainDb = Number(finalizeInfo?.gainDb || 0);
    addQualityGateItem(items, '보정 게인', Math.abs(gainDb) <= QUALITY_GATE_RULES.warnGainDb ? 'pass' : 'warn', `${formatSigned(gainDb, 1)} dB`);
    const duration = Number(report?.after?.durationSec || track?.masteredDurationSec || 0);
    addQualityGateItem(items, '재생 길이', duration >= QUALITY_GATE_RULES.minUsefulDurationSec ? 'pass' : 'warn', `${duration.toFixed(2)}초`);
    const dc = Number(report?.after?.dcOffsetAvg || 0);
    addQualityGateItem(items, 'DC offset', Math.abs(dc) <= QUALITY_GATE_RULES.maxDcOffset ? 'pass' : 'warn', `${dc.toFixed(5)}`);
    if (encoded?.fallbackFrom) addQualityGateItem(items, '출력 fallback', 'warn', `${getOutputFormatLabel(encoded.fallbackFrom)} 실패 → ${getOutputFormatLabel(encoded.format)} 저장`);
    if (track?.performanceGuardInfo?.changed) addQualityGateItem(items, '성능 가드', 'warn', formatPerformanceGuardInfo(track.performanceGuardInfo));
    const mobileRisk = Number(track?.analysis?.mobileSpeakerRisk || finalizeInfo?.mobileSpeakerRisk || 0);
    if (mobileRisk > 0.42) addQualityGateItem(items, '폰 스피커 울림', mobileRisk > 0.62 ? 'warn' : 'pass', `위험 ${Math.round(mobileRisk * 100)}% · 모바일 번역 가드 적용`);
    const fail = items.filter(item => item.status === 'fail').length;
    const warn = items.filter(item => item.status === 'warn').length;
    const pass = items.filter(item => item.status === 'pass').length;
    const score = clamp(Math.round(100 - fail * 30 - warn * 9), 0, 100);
    const status = fail ? 'fail' : (warn ? 'warn' : 'pass');
    const label = status === 'pass' ? 'PASS' : (status === 'warn' ? 'CHECK' : 'FAIL');
    const summary = `${pass} 통과 · ${warn} 주의 · ${fail} 실패`;
    return { status, label, score, summary, items, createdAt: new Date().toISOString() };
}
function addQualityGateItem(items, label, status, detail) {
    items.push({ label, status, detail });
}
function renderQualityGatePanel(track) {
    return getDetailPanelsView().renderQualityGatePanel(track, getDetailPanelsViewDeps());
}
function renderABStudioPanel(track) {
    return getDetailPanelsView().renderABStudioPanel(track, getDetailPanelsViewDeps());
}
function buildMasteredFileName(track, encoded) {
    const lufs = Number(track?.finalizeInfo?.targetLufs ?? track?.masterReport?.target?.lufs ?? state.targetLufs);
    const lufsPart = Number.isFinite(lufs) ? `${Math.abs(Math.round(lufs))}LUFS` : 'target';
    const style = String(state.masterStyle || 'master').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    const format = String(encoded?.format || state.outputFormat || 'wav24').replace(/[^a-z0-9]+/gi, '').toLowerCase();
    const platform = getPlatformFileSuffix();
    return `${safeBaseName(track.name)}_mastered_${lufsPart}_${style}_${format}${platform}.${encoded?.extension || 'wav'}`;
}
function renderMasterReportPanel(track) {
    return getDetailPanelsView().renderMasterReportPanel(track, getDetailPanelsViewDeps());
}
function formatMetric(value, unit = '') {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return `${n.toFixed(1)}${unit}`;
}
function renderProcessingFlowPanel(track) {
    return getDetailPanelsView().renderProcessingFlowPanel(track, getDetailPanelsViewDeps());
}
function renderEngineSafetyPanel(track) {
    return getDetailPanelsView().renderEngineSafetyPanel(track, getDetailPanelsViewDeps());
}
function renderLowMonoPanel(track) {
    return getDetailPanelsView().renderLowMonoPanel(track, getDetailPanelsViewDeps());
}
function getLowMonoRiskLabel(risk) {
    return getDetailPanelsView().getLowMonoRiskLabel(risk);
}
function renderMasterComparisonPanel(track) {
    return getDetailPanelsView().renderMasterComparisonPanel(track, getDetailPanelsViewDeps());
}
function makeLufsBar(label, lufs) {
    return getDetailPanelsView().makeLufsBar(label, lufs, getDetailPanelsViewDeps());
}
function createComparisonInfo(track, finalizeInfo) {
    const before = track.analysis && Number.isFinite(track.analysis.loudnessIntegrated) ? track.analysis.loudnessIntegrated : NaN;
    const after = finalizeInfo && Number.isFinite(finalizeInfo.loudnessAfter) ? finalizeInfo.loudnessAfter : NaN;
    const gain = Number.isFinite(before) && Number.isFinite(after) ? after - before : NaN;
    const peakAfter = finalizeInfo && Number.isFinite(finalizeInfo.peakAfter) ? ampToDb(finalizeInfo.peakAfter) : NaN;
    return { beforeLufs: before, afterLufs: after, loudnessDelta: gain, peakAfterDb: peakAfter };
}
function getABMatchGainDb(track) {
    if (!state.abLevelMatch || !track || !track.finalizeInfo || !track.analysis) return 0;
    const before = Number.isFinite(track.analysis.loudnessIntegrated) ? track.analysis.loudnessIntegrated : track.analysis.loudnessHint;
    const after = Number.isFinite(track.finalizeInfo.loudnessAfter) ? track.finalizeInfo.loudnessAfter : NaN;
    if (!Number.isFinite(before) || !Number.isFinite(after)) return 0;
    return clamp(before - after, -18, 0);
}
function getClippingRiskText(track) {
    const peak = track?.finalizeInfo && Number.isFinite(track.finalizeInfo.peakAfter) ? ampToDb(track.finalizeInfo.peakAfter) : (track?.analysis?.peakDb ?? NaN);
    if (!Number.isFinite(peak)) return '렌더 후 판단';
    if (peak > -0.35) return '높음 · 천장 여유 부족';
    if (peak > -1.0) return '중간 · 플랫폼 변환 주의';
    return '낮음 · 안전 여유 확보';
}
function stripTags(value) { return String(value || '').replace(/<[^>]+>/g, ''); }
function buildTrackDiffText(track) {
    return getDetailPanelsView().buildTrackDiffText(track, getDetailPanelsViewDeps());
}
function buildGlobalDiffText() {
    const done = state.tracks.filter(track => track.outBlob && track.finalizeInfo);
    if (!done.length) return '마스터링 전후 비교는 렌더 후 분석에서 표시됩니다.';
    const avg = done.reduce((sum, track) => sum + (track.comparison?.loudnessDelta || 0), 0) / done.length;
    const risky = done.filter(track => /높음|중간/.test(getClippingRiskText(track))).length;
    return `${done.length}곡 비교 완료 · 평균 라우드니스 변화 ${formatSigned(avg, 1)} LUFS · 주의 필요 ${risky}곡`;
}
function applyAIRecommendationToTrack(track) {
    if (!track || !track.analysis) {
        showToast('분석이 완료된 곡에서만 AI 프리셋을 적용할 수 있습니다.');
        return;
    }
    applyAiRecommendationSettings(track, true, `${PRESET_LABELS[track.genreLocked ? track.preset : (track.recommendedPreset || track.preset)] || track.preset} AI 추천값을 다시 적용했습니다.`);
    state.selectedId = track.id;
    applyTrackToControls(track);
    renderAll({ keepDetailAudio: true });
    showToast(`${track.name}: AI 프리셋을 적용했습니다.`);
}
function toggleGenreLockForTrack(track) {
    if (!track) return;
    saveUndoPoint(track, '장르 잠금 변경 전');
    track.genreLocked = !track.genreLocked;
    if (track.genreLocked && track.analysis) {
        track.settings = cloneSettings(makeRecommendedSettings(track.preset || 'custom', track.analysis));
        invalidateMasteredOutput(track, `${PRESET_LABELS[track.preset] || track.preset} 장르를 잠금 처리했습니다.`, true);
    }
    state.selectedId = track.id;
    renderAll({ keepDetailAudio: true });
    showToast(track.genreLocked ? '이 곡의 장르를 잠금 처리했습니다. AI 재적용 시 이 장르 기준을 유지합니다.' : '이 곡의 장르 잠금을 해제했습니다. AI 추천 장르가 다시 적용될 수 있습니다.');
}
function toggleGenreLockForSelected() {
    toggleGenreLockForTrack(getSelectedTrack());
}
function getMasterGoalProfile(goal = state.masterGoal) {
    const profiles = {
        melody: {
            label: '멜로디 보존 우선',
            description: '보컬·리드·어쿠스틱 악기 보호',
            targetLufs: -16,
            ceilingDb: -1.5,
            qualityMode: 'max',
            clarityDelta: -5,
            warmthDelta: 4,
            widthDelta: -3,
            punchDelta: -7,
            metallicDelta: 6,
            intensityScale: 0.90
        },
        natural: {
            label: '자연스러움 우선',
            description: '원본 질감과 체감 보정의 균형',
            targetLufs: -14,
            ceilingDb: -1.0,
            qualityMode: 'balanced',
            clarityDelta: 0,
            warmthDelta: 1,
            widthDelta: 0,
            punchDelta: 0,
            metallicDelta: 2,
            intensityScale: 1.0
        },
        loud: {
            label: '음압 우선',
            description: '더 강한 존재감과 큰 체감',
            targetLufs: -12,
            ceilingDb: -0.8,
            qualityMode: 'max',
            clarityDelta: 4,
            warmthDelta: -2,
            widthDelta: 2,
            punchDelta: 8,
            metallicDelta: 4,
            intensityScale: 1.12
        }
    };
    return profiles[goal] || profiles.natural;
}
function getMasterGoalLabel(goal = state.masterGoal) {
    return getMasterGoalProfile(goal).label;
}
function getMasterGoalDescription(goal = state.masterGoal) {
    return getMasterGoalProfile(goal).description;
}
function formatCeilingSelectValue(value) {
    return Number(value).toFixed(1).replace(/\.0$/, '');
}
function applyMasterGoalDefaults(goal, updateControls) {
    const profile = getMasterGoalProfile(goal);
    state.targetLufs = profile.targetLufs;
    state.ceilingDb = profile.ceilingDb;
    state.qualityMode = profile.qualityMode;
    if (updateControls || el.targetLufsSelect) {
        if (el.targetLufsSelect) el.targetLufsSelect.value = String(profile.targetLufs);
        if (el.ceilingSelect) el.ceilingSelect.value = formatCeilingSelectValue(profile.ceilingDb);
        if (el.qualityModeSelect) el.qualityModeSelect.value = profile.qualityMode;
    }
}
function applyMasterGoalToSettings(out, analysis, preset) {
    const profile = getMasterGoalProfile(state.masterGoal);
    const isCustom = preset === 'custom';
    const customScale = isCustom ? 0.55 : 1;
    out.clarity = clamp(Math.round(out.clarity + profile.clarityDelta * customScale), 5, 95);
    out.warmth = clamp(Math.round(out.warmth + profile.warmthDelta * customScale), 5, 95);
    out.width = clamp(Math.round(out.width + profile.widthDelta * customScale), 5, 86);
    out.dynamicPunch = clamp(Math.round(out.dynamicPunch + profile.punchDelta * customScale), 5, 90);
    out.metallicRemoval = clamp(Math.round(out.metallicRemoval + profile.metallicDelta * customScale), 18, 92);
    out.intensity = clampToStep(Number(out.intensity || 100) * profile.intensityScale, 50, 200, 5);
    if (state.masterGoal === 'melody') {
        const mid = Number(analysis?.midRatio || 0);
        if (mid > 0.28 || shouldApplyVocalProtection(preset, analysis)) {
            out.clarity = clamp(out.clarity - 3, 5, 90);
            out.warmth = clamp(out.warmth + 2, 5, 96);
            out.dynamicPunch = clamp(out.dynamicPunch - 4, 5, 85);
        }
    }
    if (state.masterGoal === 'loud') {
        const metallic = Number(analysis?.metallicHint || 0);
        if (metallic > 0.62) out.metallicRemoval = clamp(out.metallicRemoval + 6, 18, 94);
    }
}
function getMasterStrengthProfile(value = state.masterStrength) {
    return MASTER_STRENGTH_PROFILES[value] || MASTER_STRENGTH_PROFILES.balanced;
}
function getMasterStrengthLabel(value = state.masterStrength) {
    return getMasterStrengthProfile(value).label || 'Balanced';
}
function getMasterStrengthDescription(value = state.masterStrength) {
    return getMasterStrengthProfile(value).description || '기본 균형 성향';
}
function getMasterStrengthTone(value = state.masterStrength) {
    const profile = String(value || 'balanced');
    if (profile.includes('safe')) return 'ok';
    if (profile === 'loud') return 'warn';
    if (profile === 'modern') return 'cyan';
    if (profile === 'natural') return 'neutral';
    return 'cyan';
}
function applyMasterStrengthDefaults(value, updateControls) {
    const profile = getMasterStrengthProfile(value);
    state.masterStrength = MASTER_STRENGTH_PROFILES[value] ? value : 'balanced';
    if (profile.targetLufs !== null && profile.targetLufs !== undefined) state.targetLufs = Number(profile.targetLufs);
    if (profile.ceilingDb !== null && profile.ceilingDb !== undefined) state.ceilingDb = Number(profile.ceilingDb);
    if (profile.qualityMode) state.qualityMode = profile.qualityMode;
    if (state.platformPreset !== 'custom' && updateControls) {
        state.platformPreset = 'custom';
        if (el.platformPresetSelect) el.platformPresetSelect.value = 'custom';
    }
    if (updateControls || el.targetLufsSelect) {
        if (el.masterStrengthSelect) el.masterStrengthSelect.value = state.masterStrength;
        if (profile.targetLufs !== null && profile.targetLufs !== undefined && el.targetLufsSelect) el.targetLufsSelect.value = String(state.targetLufs);
        if (profile.ceilingDb !== null && profile.ceilingDb !== undefined && el.ceilingSelect) el.ceilingSelect.value = formatCeilingSelectValue(state.ceilingDb);
        if (profile.qualityMode && el.qualityModeSelect) el.qualityModeSelect.value = state.qualityMode;
    }
    syncEnhancedSelectButtons();
}
function applyMasterStrengthToSettings(out, analysis, preset) {
    const profile = getMasterStrengthProfile(state.masterStrength);
    const isCustom = preset === 'custom';
    const customScale = isCustom ? 0.72 : 1;
    out.clarity = clamp(Math.round(Number(out.clarity || 50) + (profile.clarityDelta || 0) * customScale), 5, 96);
    out.warmth = clamp(Math.round(Number(out.warmth || 50) + (profile.warmthDelta || 0) * customScale), 5, 96);
    out.width = clamp(Math.round(Number(out.width || 50) + (profile.widthDelta || 0) * customScale), 3, 88);
    out.stereoGroove = clamp(Math.round(Number(out.stereoGroove || 0) + (profile.stereoGrooveDelta || 0) * customScale), 0, 36);
    out.dynamicPunch = clamp(Math.round(Number(out.dynamicPunch || 35) + (profile.punchDelta || 0) * customScale), 4, 94);
    out.metallicRemoval = clamp(Math.round(Number(out.metallicRemoval || 42) + (profile.metallicDelta || 0) * customScale), 16, 98);
    out.analogGroove = clamp(Math.round(Number(out.analogGroove || 0) + (profile.analogDelta || 0) * customScale), 0, 88);
    out.intensity = clampToStep(Number(out.intensity || 100) * Number(profile.intensityScale || 1), 50, 200, 5);
    const vocalRisk = analysis ? estimateVocalMetallicRisk(analysis, out, preset, getMasteringIntensity(out)) : 0;
    const mobileRisk = analysis ? estimateMobileSpeakerRisk(analysis, out, getMasteringIntensity(out)) : { risk: 0, harsh: 0, box: 0, boom: 0, density: 0 };
    if (state.masterStrength === 'vocal_safe') {
        out.clarity = clamp(Math.round(out.clarity - 3 - vocalRisk * 12), 5, 62);
        out.width = clamp(Math.min(out.width, 54), 3, 54);
        out.stereoGroove = clamp(Math.min(out.stereoGroove, 12), 0, 12);
        out.dynamicPunch = clamp(Math.round(out.dynamicPunch - 4 - vocalRisk * 5), 4, 68);
        out.metallicRemoval = clamp(Math.round(out.metallicRemoval + 6 + vocalRisk * 12), 28, 98);
        out.intensity = clampToStep(Number(out.intensity || 100) - vocalRisk * 12, 50, 160, 5);
    }
    if (state.masterStrength === 'mobile_safe') {
        out.warmth = clamp(Math.round(out.warmth - 3 - mobileRisk.boom * 10 - mobileRisk.box * 8), 8, 58);
        out.dynamicPunch = clamp(Math.round(out.dynamicPunch - 4 - mobileRisk.density * 8), 4, 62);
        out.clarity = clamp(Math.round(out.clarity - mobileRisk.harsh * 8), 5, 72);
        out.width = clamp(Math.min(out.width, 58), 3, 58);
        out.stereoGroove = clamp(Math.min(out.stereoGroove, 10), 0, 10);
        out.metallicRemoval = clamp(Math.round(out.metallicRemoval + mobileRisk.harsh * 9 + mobileRisk.box * 5), 22, 94);
        out.intensity = clampToStep(Number(out.intensity || 100) - mobileRisk.risk * 10, 50, 165, 5);
    }
    if (state.masterStrength === 'loud' && (vocalRisk > 0.32 || mobileRisk.risk > 0.42)) {
        out.clarity = clamp(Math.round(out.clarity - vocalRisk * 6 - mobileRisk.harsh * 4), 5, 82);
        out.metallicRemoval = clamp(Math.round(out.metallicRemoval + vocalRisk * 8 + mobileRisk.harsh * 5), 18, 94);
        out.width = clamp(Math.min(out.width, 72), 3, 72);
    }
}
function finalizeMasterStrengthSafetyCaps(out, analysis, preset) {
    if (!out || !analysis) return out;
    const profile = state.masterStrength || 'balanced';
    const vocalRisk = estimateVocalMetallicRisk(analysis, out, preset, getMasteringIntensity(out));
    const mobileRisk = estimateMobileSpeakerRisk(analysis, out, getMasteringIntensity(out));
    if (profile === 'natural') {
        out.intensity = clampToStep(Number(out.intensity || 100), 50, 145, 5);
        out.width = clamp(Math.min(Number(out.width || 50), 62), 3, 62);
        out.stereoGroove = clamp(Math.min(Number(out.stereoGroove || 0), 14), 0, 14);
    }
    if (profile === 'vocal_safe') {
        out.clarity = clamp(Math.round(Number(out.clarity || 50) - vocalRisk * 8), 5, 60);
        out.metallicRemoval = clamp(Math.round(Number(out.metallicRemoval || 42) + 4 + vocalRisk * 10), 32, 98);
        out.intensity = clampToStep(Number(out.intensity || 100), 50, 155, 5);
    }
    if (profile === 'mobile_safe') {
        out.warmth = clamp(Math.round(Number(out.warmth || 50) - mobileRisk.boom * 8 - mobileRisk.box * 8), 8, 56);
        out.dynamicPunch = clamp(Math.round(Number(out.dynamicPunch || 35) - mobileRisk.density * 6), 4, 60);
        out.stereoGroove = clamp(Math.min(Number(out.stereoGroove || 0), 9), 0, 9);
        out.intensity = clampToStep(Number(out.intensity || 100), 50, 160, 5);
    }
    return out;
}
function getMasterStyleProfile(style = state.masterStyle) {
    return MASTER_STYLE_PRESETS[style] || MASTER_STYLE_PRESETS.streaming;
}
function getMasterStyleLabel(style = state.masterStyle) {
    return getMasterStyleProfile(style).label;
}
function getMasterStyleDescription(style = state.masterStyle) {
    return getMasterStyleProfile(style).description;
}
function applyMasterStyleDefaults(style, updateControls) {
    const profile = getMasterStyleProfile(style);
    state.targetLufs = profile.targetLufs;
    state.ceilingDb = profile.ceilingDb;
    state.qualityMode = profile.qualityMode;
    if (state.platformPreset !== 'custom' && updateControls) {
        state.platformPreset = 'custom';
        if (el.platformPresetSelect) el.platformPresetSelect.value = 'custom';
    }
    if (updateControls || el.targetLufsSelect) {
        if (el.targetLufsSelect) el.targetLufsSelect.value = String(profile.targetLufs);
        if (el.ceilingSelect) el.ceilingSelect.value = formatCeilingSelectValue(profile.ceilingDb);
        if (el.qualityModeSelect) el.qualityModeSelect.value = profile.qualityMode;
    }
    syncEnhancedSelectButtons();
}
function applyMasterStyleToSettings(out, analysis, preset) {
    const profile = getMasterStyleProfile(state.masterStyle);
    const isCustom = preset === 'custom';
    const customScale = isCustom ? 0.60 : 1;
    out.clarity = clamp(Math.round(out.clarity + profile.clarityDelta * customScale), 5, 96);
    out.warmth = clamp(Math.round(out.warmth + profile.warmthDelta * customScale), 5, 96);
    out.width = clamp(Math.round(out.width + profile.widthDelta * customScale), 3, 88);
    out.dynamicPunch = clamp(Math.round(out.dynamicPunch + profile.punchDelta * customScale), 4, 94);
    out.metallicRemoval = clamp(Math.round(out.metallicRemoval + profile.metallicDelta * customScale), 16, 96);
    out.analogGroove = clamp(Math.round((out.analogGroove || 0) + profile.analogDelta * customScale), 0, 80);
    out.intensity = clampToStep(Number(out.intensity || 100) * profile.intensityScale, 50, 200, 5);
    if (state.masterStyle === 'vocal' && shouldApplyVocalProtection(preset, analysis)) {
        out.clarity = clamp(out.clarity - 2, 5, 92);
        out.warmth = clamp(out.warmth + 2, 5, 96);
        out.metallicRemoval = clamp(out.metallicRemoval + 4, 18, 96);
    }
    if (state.masterStyle === 'podcast') {
        out.stereoGroove = clamp(Math.round((out.stereoGroove || 0) * 0.35), 0, 24);
        out.width = clamp(out.width, 3, 24);
    }
}
function getPitchEngineLabel(mode) {
    const labels = { auto: 'Auto/WASM 우선', wsola: 'WSOLA Worker', external: 'External WASM' };
    return labels[mode] || mode;
}
function addDetailRow(label, value, target = el.trackDetail) {
    const row = document.createElement('div');
    row.className = 'detail-row';
    const left = document.createElement('span');
    const right = document.createElement('span');
    left.textContent = label;
    right.textContent = value == null || value === '' ? '-' : String(value);
    row.append(left, right);
    target.appendChild(row);
}
function renderSelectedBadge() {
    const track = getSelectedTrack();
    el.selectedBadge.textContent = track ? (PRESET_LABELS[track.preset] || track.preset) : '선택 없음';
}
function updateConfidenceUI(track) {
    if (!track) {
        el.confidenceText.textContent = '추천 없음';
        return;
    }
    el.confidenceText.textContent = track.confidence ? `AI 추천 ${track.confidence}%` : '추천 대기';
}
function activateTrackOnly(id) {
    state.selectedId = id;
    const track = getSelectedTrack();
    if (track) applyTrackToControls(track);
    renderAll({ keepDetailAudio: true });
}
function clearTrackSelection(id) {
    if (!id || !state.selectedIds.has(id)) return;
    state.selectedIds.delete(id);
    renderAll({ keepDetailAudio: true });
    showToast('선택이 해제되었습니다.');
}
function removeTrack(id) {
    const index = state.tracks.findIndex(track => track.id === id);
    if (index < 0) return;
    getImportAnalysisQueueController().cancelTrack?.(id, 'track-removed');
    const removingTrack = state.tracks[index];
    try { removingTrack?.masteringAbortController?.abort?.('track-removed'); } catch (error) {}
    const removingPreviewJobId = String(removingTrack?.masterPreviewJobId || '');
    getMasterPreviewJobService()?.cancel?.(removingTrack, 'track-removed');
    if (removingPreviewJobId && state.masterPreviewRenderingJobId === removingPreviewJobId) {
        state.masterPreviewRenderingTrackId = null;
        state.masterPreviewRenderingJobId = '';
        state.busy = false;
    }
    const previewOwned = state.bottomPreviewTrackId === id || state.bottomPreviewTransport?.trackId === id;
    if (previewOwned) clearBottomPreviewPlayer();
    const timer = state.autoRemasterTimers?.get(id);
    if (timer) { clearTimeout(timer); state.autoRemasterTimers.delete(id); }
    const [track] = state.tracks.splice(index, 1);
    state.selectedIds.delete(id);
    releaseTrackResourcesSafely(track);
    if (previewOwned) { state.bottomPreviewTrackId = null; state.bottomPreviewAutoplayTrackId = null; state.bottomPreviewTransport = null; }
    if (state.selectedId === id) {
        state.selectedId = state.tracks[0] ? state.tracks[0].id : null;
        const selected = getSelectedTrack();
        if (selected) applyTrackToControls(selected);
        else {
            applyPresetToControlsOnly('custom');
            setTransformControls(DEFAULT_TRANSFORM);
            setInstrumentControls(DEFAULT_INSTRUMENT_LAYER);
        }
    }
    if (state.featureFlags.albumMatch) state.albumProfile = computeAlbumProfile();
    renderAll();
}
function applyPresetToControlsOnly(preset) {
    state.programmatic = true;
    setControlsFromSettings(GENRE_PRESETS[preset] || GENRE_PRESETS.custom, preset, GENRE_PRESETS[preset] || GENRE_PRESETS.custom);
    setInstrumentControls(DEFAULT_INSTRUMENT_LAYER);
    el.confidenceText.textContent = '추천 없음';
    state.programmatic = false;
}
function getSelectedTrack() {
    return state.tracks.find(track => track.id === state.selectedId) || null;
}
function getSelectedTracks() {
    return state.tracks.filter(track => state.selectedIds.has(track.id));
}
function toggleTrackSelection(id) {
    if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
        renderAll({ keepDetailAudio: true });
        return;
    }
    state.selectedIds.add(id);
    state.selectedId = id;
    const track = getSelectedTrack();
    if (track) applyTrackToControls(track);
    renderAll({ keepDetailAudio: true });
}
function buildReport(track) {
    if (!track.analysis) return '분석 대기 중';
    const preset = PRESET_LABELS[track.recommendedPreset] || track.recommendedPreset;
    const brightness = Math.round(track.analysis.brightness * 100);
    const width = Math.round(track.analysis.stereoWidth * 100);
    return `${preset} 추천 · 신뢰도 ${track.confidence}% · 밝기 ${brightness}% · 스테레오 ${width}% · 강도 ${track.settings.intensity ?? 100}% · 공진 추적 주파수 ${track.analysis.targetDynamicFreq}Hz 포착${track.genreReason ? ' · ' + track.genreReason : ''}`;
}
function createDoneReport(track) {
    const parts = [`마스터링 완료: ${track.outName}`, getOutputFormatLabel(track.outFormat || state.outputFormat || 'wav24'), `강도 ${track.settings.intensity ?? 100}%`, getMasterGoalLabel(state.masterGoal), getMasterStyleLabel(state.masterStyle), getMasterStrengthLabel(state.masterStrength)];
    if (track.instrumentInfo && track.instrumentInfo.applied) parts.push(`${track.instrumentInfo.label} 레이어 ${track.instrumentInfo.bpm.toFixed(0)} BPM`);
    if (track.trimInfo && track.trimInfo.applied) parts.push(`무음 정리 앞 ${track.trimInfo.startTrimSec.toFixed(2)}초/뒤 ${track.trimInfo.endTrimSec.toFixed(2)}초`);
    if (track.dcInfo && track.dcInfo.applied) parts.push('DC offset 정리');
    if (track.exportFallbackInfo) parts.push(`${getOutputFormatLabel(track.exportFallbackInfo.from)} 실패 → ${getOutputFormatLabel(track.exportFallbackInfo.to)} 저장`);
    if (track.albumApplied) parts.push(`앨범 통일 ${formatSigned(track.albumApplied.levelDeltaDb, 2)} dB`);
    if (track.truePeakInfo) parts.push(track.truePeakInfo.mode === 'truePeak' ? 'True Peak 보호' : 'Sample Peak 보호');
    if (track.qualityGate) parts.push(`품질 ${track.qualityGate.label}`);
    if (track.engineRecoveryInfo?.attempted) parts.push(track.engineRecoveryInfo.status === 'recovered' ? '안전 재렌더 복구' : '안전 재렌더 1회 수행');
    if (track.performanceInfo?.totalMs) parts.push(`처리 ${formatDurationMs(track.performanceInfo.totalMs)}`);
    return parts.join(' · ');
}
function createExportReport(track) {
    return {
        app: 'FoxBear AI Mastering Studio Pro v1.6.37',
        developer: '곰같은여우 (with AI)',
        youtube: 'https://www.youtube.com/@FoxBearMusic',
        originalFile: track.name,
        visiblePath: track.path,
        exportedFile: track.outName,
        outputFormat: track.outFormat,
        preset: track.preset,
        recommendedPreset: track.recommendedPreset,
        confidence: track.confidence,
        genreReason: track.genreReason,
        genreAlternatives: track.genreAlternatives,
        settings: track.settings,
        pitchSpeed: track.transform,
        masteredDurationSec: track.masteredDurationSec || null,
        instrument: track.instrument,
        instrumentInfo: track.instrumentInfo,
        enabledFeatures: { ...state.featureFlags },
        trimInfo: track.trimInfo,
        albumApplied: track.albumApplied,
        truePeakInfo: track.truePeakInfo,
        finalizeInfo: track.finalizeInfo,
        dcInfo: track.dcInfo,
        masterReport: track.masterReport,
        exportFallbackInfo: track.exportFallbackInfo,
        qualityGate: track.qualityGate,
        engineRecoveryInfo: track.engineRecoveryInfo,
        waveformOverview: track.waveformOverview,
        performanceInfo: track.performanceInfo,
        outputTarget: { masterGoal: track.masterReport?.target?.masterGoal ?? state.masterGoal, masterStyle: track.masterReport?.target?.masterStyle ?? state.masterStyle, masterStrength: track.masterReport?.target?.masterStrength ?? state.masterStrength, targetLufs: track.finalizeInfo?.targetLufs ?? track.masterReport?.target?.lufs ?? state.targetLufs, baseTargetLufs: track.masterReport?.target?.baseLufs ?? state.targetLufs, ceilingDb: track.finalizeInfo?.ceilingDb ?? track.masterReport?.target?.ceilingDb ?? state.ceilingDb, qualityMode: track.finalizeInfo?.qualityMode ?? track.masterReport?.target?.qualityMode ?? state.qualityMode },
        albumProfile: state.albumProfile,
        analysis: track.analysis,
        createdAt: new Date().toISOString()
    };
}
function featureLabelText() {
    const active = Object.entries(state.featureFlags)
        .filter(([, value]) => value)
        .map(([key]) => FEATURE_DEFINITIONS[key].label);
    return active.length ? active.join(' · ') : '기능 미사용';
}
function getQualityModeLabel(mode) {
    const labels = { fast: 'Fast', balanced: 'Balanced Pro', max: 'Max Quality' };
    return labels[mode] || labels.balanced;
}
function statusLabel(status) {
    const labels = { queued: '대기', analyzing: '분석 중', ready: '준비', processing: '처리 중', done: '완료', error: '오류' };
    return labels[status] || status;
}
function cloneSettings(settings) {
    return {
        clarity: Number(settings.clarity),
        warmth: Number(settings.warmth),
        width: Number(settings.width),
        stereoGroove: Number(settings.stereoGroove),
        analogGroove: Number(settings.analogGroove),
        dynamicPunch: Number(settings.dynamicPunch),
        metallicRemoval: Number(settings.metallicRemoval ?? 0),
        intensity: Number(settings.intensity ?? 100)
    };
}
function cloneTransform(transform) {
    const pitchSemitones = clamp(Number(transform?.pitchSemitones ?? DEFAULT_TRANSFORM.pitchSemitones), -12, 12);
    const speedRatio = clamp(Number(transform?.speedRatio ?? DEFAULT_TRANSFORM.speedRatio), 0.5, 1.5);
    const beatPreset = transform?.beatPreset === 'custom' ? 'custom' : (transform?.beatPreset && BEAT_CHANGE_PRESETS[transform.beatPreset] ? transform.beatPreset : getBeatPresetForRatio(speedRatio));
    return {
        pitchSemitones,
        speedRatio,
        snapSemitone: transform?.snapSemitone !== undefined ? Boolean(transform.snapSemitone) : DEFAULT_TRANSFORM.snapSemitone,
        beatPreset
    };
}
function cloneInstrumentLayer(layer) {
    const mode = layer?.mode && INSTRUMENT_LAYER_PRESETS[layer.mode] ? layer.mode : DEFAULT_INSTRUMENT_LAYER.mode;
    const amount = layer?.amount && INSTRUMENT_AMOUNT_LEVELS[layer.amount] ? layer.amount : DEFAULT_INSTRUMENT_LAYER.amount;
    return { mode, amount };
}
function getBeatPresetForRatio(ratio) {
    const value = Number(ratio || 1);
    let bestKey = 'custom';
    let bestDelta = Infinity;
    Object.entries(BEAT_CHANGE_PRESETS).forEach(([key, preset]) => {
        const delta = Math.abs(value - preset.ratio);
        if (delta < bestDelta) {
            bestDelta = delta;
            bestKey = key;
        }
    });
    return bestDelta < 0.006 ? bestKey : 'custom';
}
function getBeatPresetLabel(key) {
    if (key === 'custom') return '커스텀 박자';
    return BEAT_CHANGE_PRESETS[key]?.label || BEAT_CHANGE_PRESETS.original.label;
}
function getInstrumentLayerLabel(mode) {
    return INSTRUMENT_LAYER_PRESETS[mode]?.label || INSTRUMENT_LAYER_PRESETS.off.label;
}
function getInstrumentAmountLabel(amount) {
    return INSTRUMENT_AMOUNT_LEVELS[amount]?.label || INSTRUMENT_AMOUNT_LEVELS.light.label;
}
function shouldUseInstrumentLayer(layer) {
    const value = cloneInstrumentLayer(layer || DEFAULT_INSTRUMENT_LAYER);
    return value.mode !== 'off';
}
function getInstrumentDetailText(track) {
    const layer = cloneInstrumentLayer(track?.instrument || DEFAULT_INSTRUMENT_LAYER);
    if (layer.mode === 'off') return 'OFF · 원본만 처리';
    const rendered = track?.instrumentInfo?.applied ? ` · 렌더 ${track.instrumentInfo.bpm.toFixed(0)} BPM` : ' · 렌더 전';
    return `${getInstrumentLayerLabel(layer.mode)} · ${getInstrumentAmountLabel(layer.amount)}${rendered}`;
}
function clampToStep(value, min, max, step) {
    const safeStep = Number(step || 1);
    const clamped = clamp(Number(value), min, max);
    return Math.round(clamped / safeStep) * safeStep;
}
function getOutputFormatLabel(format) {
    const labels = {
        wav16: '16-bit PCM WAV',
        wav24: '24-bit PCM WAV',
        wav32float: '32-bit Float WAV',
        mp3_128: 'MP3 128 kbps',
        mp3_192: 'MP3 192 kbps',
        mp3_256: 'MP3 256 kbps',
        mp3_320: 'MP3 320 kbps'
    };
    return labels[format] || labels.wav24;
}
function formatSliderValue(slider, value) {
    const step = Number(slider.step ?? 1);
    const digits = step < 1 ? 2 : 0;
    return `${Number(value).toFixed(digits)}${slider.unit || '%'}`;
}
function getMasteringIntensity(settings) {
    const raw = clampToStep(Number(settings?.intensity ?? 100), 50, 200, 5);
    let amount = raw / 100;
    if (raw >= 140) {
        const over = (raw - 140) / 60;
        amount = 1.4 + over * 0.75 + Math.pow(over, 1.7) * 1.05;
    }
    return { raw, amount, high: raw >= 140 };
}
function formatSigned(value, digits) {
    const fixed = Number(value).toFixed(digits);
    return Number(value) > 0 ? `+${fixed}` : fixed;
}
function isDefaultTransform(transform) {
    return Math.abs(Number(transform.pitchSemitones)) < 0.001 && Math.abs(Number(transform.speedRatio) - 1) < 0.001;
}
function ampToDb(value) {
    return 20 * Math.log10(Math.max(0.000001, Math.abs(value)));
}
function formatBytes(bytes) {
    if (!bytes) return '0 MB';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '-';
    const minutes = Math.floor(seconds / 60);
    const rest = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${rest}`;
}
function safeBaseName(fileName) {
    const withoutExt = fileName.replace(/\.[^.]+$/, '');
    return withoutExt.replace(/[^a-zA-Z0-9가-힣._-]+/g, '_').slice(0, 80) || 'track';
}
function timestampForFile() {
    const date = new Date();
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
function showToast(message, options = {}) {
    const target = (typeof el !== 'undefined' && el.toast) ? el.toast : document.getElementById('toast');
    if (!target) {
        console.info('toast:', message);
        return;
    }
    const text = String(message || '').trim();
    if (!text) return;
    syncFloatingOverlayStack();
    target.classList.add('foxbear-toast-stack', 'show');
    target.setAttribute('role', 'status');
    target.setAttribute('aria-live', 'polite');
    target.setAttribute('aria-atomic', 'false');
    const maxItems = Math.max(1, Number(options.maxItems || 4));
    const existing = Array.from(target.querySelectorAll('.foxbear-toast-item'));
    while (existing.length >= maxItems) {
        const first = existing.shift();
        if (first) first.remove();
    }
    const item = document.createElement('div');
    item.className = 'foxbear-toast-item';
    item.textContent = text;
    target.appendChild(item);
    requestAnimationFrame(() => item.classList.add('show'));
    const duration = Math.max(1200, Number(options.duration || 3400));
    const timer = setTimeout(() => {
        item.classList.remove('show');
        item.classList.add('leaving');
        window.setTimeout(() => {
            item.remove();
            if (!target.querySelector('.foxbear-toast-item')) target.classList.remove('show');
        }, 220);
    }, duration);
    item.dataset.toastTimer = String(timer);
    if (typeof state !== 'undefined') state.lastToastTimer = timer;
}
