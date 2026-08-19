// FoxBear performance diagnostics - v1.6.108
// Hidden by default. Open from Settings, with ?perf=1, or Ctrl/Command+Alt+P.
(function attachFoxBearPerformanceDiagnostics(global) {
    'use strict';

    const DIAGNOSTICS_VERSION = '1.6.108-mastering-progress-visibility-hardening';
    const STORAGE_KEY = 'foxbear-perf-diagnostics';
    const TOGGLE_EVENT = 'foxbear:performance-diagnostics-toggle';
    const SNAPSHOT_EVENT = 'foxbear:performance-diagnostics-snapshot';
    const MAX_LONG_TASKS = 10;
    const MAX_SAMPLES = 20;
    const PANEL_REFRESH_MS = 2500;
    const PANEL_HIDDEN_REFRESH_MS = 10000;
    const AUTO_CLOSE_STABLE_SAMPLES = 2;
    const AUTO_CLOSE_MIN_UPTIME_MS = 3500;
    const RECENT_LONG_TASK_WINDOW_MS = 60000;
    const RECENT_DECODE_ERROR_WINDOW_MS = 120000;
    const RECENT_WAKE_LOCK_ERROR_WINDOW_MS = 120000;
    const AMBIENT_REFRESH_MS = 8000;
    const AMBIENT_HIDDEN_REFRESH_MS = 30000;
    const AMBIENT_WATCH_CONFIRM_SAMPLES = 2;
    const AMBIENT_DANGER_CONFIRM_SAMPLES = 2;
    const AMBIENT_RECOVERY_CONFIRM_SAMPLES = 2;
    const NOTICE_DISMISS_STORAGE_KEY = `${STORAGE_KEY}-notice-dismissal-v1`;
    const NOTICE_DISMISS_TTL_MS = 30 * 60 * 1000;

    const state = {
        enabled: false,
        panelVisible: false,
        backdrop: null,
        panel: null,
        output: null,
        summaryGrid: null,
        summaryLead: null,
        detailSection: null,
        recommendations: null,
        actionStatus: null,
        recoveryButton: null,
        retryButton: null,
        workerList: null,
        lastRecoveryJobs: [],
        retryInFlight: false,
        returnFocus: null,
        timer: 0,
        longTasks: [],
        samples: [],
        observer: null,
        bootAt: now(),
        lastSnapshot: null,
        lastSummary: null,
        openSource: 'closed',
        autoOpened: false,
        autoStableSamples: 0,
        legacyAutoOpenMigrated: false,
        workerSection: null,
        ambientTimer: 0,
        ambientHealth: 'normal',
        ambientMeasuredHealth: 'normal',
        ambientWatchSamples: 0,
        ambientDangerSamples: 0,
        ambientRecoverySamples: 0,
        healthNotice: null,
        healthNoticeMessage: null,
        noticeDismissedKey: '',
        noticeDismissedAt: 0,
        toastObserver: null,
        toastResizeObserver: null
    };

    function now() {
        return global.performance && typeof global.performance.now === 'function' ? global.performance.now() : Date.now();
    }

    function readStorage() {
        try { return String(global.localStorage.getItem(STORAGE_KEY) || '').toLowerCase(); }
        catch (error) { return ''; }
    }

    function writeStorage(value) {
        try { global.localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off'); }
        catch (error) {}
    }

    function readNoticeDismissal() {
        try {
            const raw = global.localStorage?.getItem?.(NOTICE_DISMISS_STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const key = String(parsed?.key || '');
            const at = Number(parsed?.at || 0);
            if (!key || !at || Date.now() - at >= NOTICE_DISMISS_TTL_MS) {
                global.localStorage?.removeItem?.(NOTICE_DISMISS_STORAGE_KEY);
                return null;
            }
            return Object.freeze({ key, at });
        } catch (error) {
            return null;
        }
    }

    function persistNoticeDismissal(key) {
        const normalized = String(key || '');
        const at = Date.now();
        state.noticeDismissedKey = normalized;
        state.noticeDismissedAt = at;
        try {
            global.localStorage?.setItem?.(NOTICE_DISMISS_STORAGE_KEY, JSON.stringify({ key: normalized, at }));
        } catch (error) {}
        return Object.freeze({ key: normalized, at });
    }

    function restoreNoticeDismissal() {
        const stored = readNoticeDismissal();
        if (!stored) return false;
        state.noticeDismissedKey = stored.key;
        state.noticeDismissedAt = stored.at;
        return true;
    }

    function isNoticeDismissed(key) {
        const stored = readNoticeDismissal();
        if (stored) {
            state.noticeDismissedKey = stored.key;
            state.noticeDismissedAt = stored.at;
        }
        return Boolean(stored && stored.key === String(key || ''));
    }

    function readAutoOpenRequest() {
        try {
            const url = new URL(global.location.href);
            if (url.searchParams.get('perf') === '1') return Object.freeze({ open: true, source: 'query-perf' });
            if (url.searchParams.get('foxbearPerf') === '1') return Object.freeze({ open: true, source: 'query-foxbear-perf' });
        } catch (error) {}
        return Object.freeze({ open: false, source: 'hidden-default' });
    }

    function migrateLegacyAutoOpenPreference() {
        if (readStorage() !== 'on') return false;
        writeStorage(false);
        state.legacyAutoOpenMigrated = true;
        return true;
    }

    function round(value, digits = 1) {
        const number = Number(value || 0);
        if (!Number.isFinite(number)) return 0;
        const factor = Math.pow(10, digits);
        return Math.round(number * factor) / factor;
    }

    function clipList(list, limit) {
        while (list.length > limit) list.shift();
        return list;
    }

    function readMemory() {
        const memory = global.performance?.memory;
        if (!memory) return null;
        return Object.freeze({
            usedMB: round(memory.usedJSHeapSize / 1048576, 1),
            totalMB: round(memory.totalJSHeapSize / 1048576, 1),
            limitMB: round(memory.jsHeapSizeLimit / 1048576, 1)
        });
    }

    function getAudioSnapshot() {
        const audios = Array.from(global.document?.querySelectorAll?.('audio') || []);
        const playing = audios.filter(audio => audio && !audio.paused && !audio.ended);
        return Object.freeze({
            total: audios.length,
            playing: playing.length,
            audible: playing.filter(audio => !audio.muted && Number(audio.volume || 0) > 0.001).length,
            labels: playing.slice(0, 4).map(audio => audio.dataset?.playbackRole || audio.getAttribute('aria-label') || 'audio')
        });
    }

    function getDomSnapshot() {
        const doc = global.document;
        const canvases = Array.from(doc?.querySelectorAll?.('canvas') || []);
        const connectedCanvases = canvases.filter(canvas => canvas.isConnected !== false);
        return Object.freeze({
            nodes: doc?.getElementsByTagName?.('*')?.length || 0,
            canvases: connectedCanvases.length,
            dockPresent: Boolean(doc?.getElementById?.('bottomPreviewDock')),
            settingsButtonPresent: Boolean(doc?.querySelector?.('#mobileSettingsBtn, .mobile-settings-trigger, [data-mobile-settings-trigger]'))
        });
    }

    function getFrameBudgetHint() {
        const recent = state.longTasks.slice(-5);
        const maxRecent = recent.reduce((max, item) => Math.max(max, Number(item.durationMs || 0)), 0);
        if (maxRecent >= 200) return 'heavy';
        if (maxRecent >= 80) return 'watch';
        return 'ok';
    }

    function safeCall(fn, fallback = null) {
        try { return typeof fn === 'function' ? fn() : fallback; }
        catch (error) { return fallback; }
    }

    const WARNING_GUIDANCE = Object.freeze({
        'multiple-audio-playing': '여러 플레이어가 동시에 실행 중입니다. 재생 중인 항목을 하나만 남겨 주세요.',
        'multiple-audible-audio': '두 개 이상의 소리가 겹칩니다. 원본·마스터 또는 미리듣기 중 하나를 정지해 주세요.',
        'many-canvas-nodes': '시각화 화면이 많이 열려 있습니다. 사용하지 않는 상세 화면을 닫아 주세요.',
        'runtime-health-check': '앱 초기화 상태를 확인해야 합니다. 페이지를 새로고침한 뒤 같은 작업을 다시 시도해 주세요.',
        'many-audio-contexts': '오디오 처리 세션이 많이 남아 있습니다. 재생과 미리듣기를 정리한 뒤 다시 확인해 주세요.',
        'audio-context-interrupted': '브라우저가 오디오를 일시 중단했습니다. 화면을 한 번 누른 뒤 재생을 다시 시작해 주세요.',
        'mastered-buffer-retention': '완료된 오디오가 메모리에 많이 남아 있습니다. 저장이 끝난 트랙을 정리해 주세요.',
        'worker-job-stalled': '백그라운드 오디오 작업이 15초 이상 멈췄습니다. 아래 복구 버튼으로 정체 작업을 취소한 뒤 다시 시도해 주세요.',
        'worker-transfer-memory-high': 'Worker 전송 메모리가 높습니다. 대량 작업을 잠시 멈추고 완료된 트랙을 정리해 주세요.',
        'heavy-long-task': '최근 1분 안에 화면이 오래 멈춘 구간이 감지됐습니다. 다른 앱을 닫거나 현재 작업량을 줄여 주세요.',
        'watch-long-task': '최근 1분 안에 화면 응답이 느린 구간이 있었습니다. 현재 작업이 끝날 때까지 추가 조작을 줄여 주세요.',
        'audio-decode-last-error': '최근 오디오 디코딩이 실패했습니다. 파일 형식이나 손상 여부를 확인해 주세요.',
        'wake-lock-last-error': '화면 꺼짐 방지를 사용할 수 없습니다. 브라우저 권한과 절전 설정을 확인해 주세요.',
        'recoverable-runtime-faults': '최근 자동 복구된 내부 오류가 반복되었습니다. 진단 복사 후 같은 작업에서 계속 반복되는지 확인해 주세요.',
        'engine-control-body-lock': '엔진 설정 팝업이 열린 동안 전역 터치/스크롤 잠금이 감지됐습니다. 팝업을 닫은 뒤 같은 설정을 다시 시도해 주세요.',
        'engine-control-change-pending': '엔진 설정 변경 이벤트가 오래 대기 중입니다. 진단 복사 후 페이지를 새로고침하고 다시 시도해 주세요.',
        'dock-integrity-failed': '하단 Dock이 선택 트랙 상태와 맞지 않습니다. Dock 자동 복구를 실행한 뒤 같은 작업을 다시 확인해 주세요.'
    });

    const ACTIVITY_GUIDANCE = Object.freeze({
        'bulk-import-active': '파일 불러오는 중',
        'bulk-import-hud-active': '여러 파일 처리 중',
        'audio-decode-active': '오디오 분석 중',
        'mastering-active': '마스터링 처리 중',
        'wake-lock-auto-active': '작업 중 화면 켜짐 유지',
        'render-queue-pending': '화면 업데이트 중'
    });

    function warningGuidance(code) {
        return WARNING_GUIDANCE[code] || `점검 항목: ${String(code || 'unknown')}`;
    }

    function activityGuidance(code) {
        return ACTIVITY_GUIDANCE[code] || String(code || '작업 진행 중');
    }

    function hasRecentDecodeFailure(audioDecode, nowAt = Date.now()) {
        const events = Array.isArray(audioDecode?.events) ? audioDecode.events : [];
        const latest = events.length ? events[events.length - 1] : null;
        return Boolean(latest && latest.type === 'decode-failed' && nowAt - Number(latest.at || 0) <= RECENT_DECODE_ERROR_WINDOW_MS);
    }

    function hasRecentWakeLockFailure(wakeLock, nowAt = Date.now()) {
        const at = Number(wakeLock?.lastRequestAt || 0);
        return Boolean(wakeLock?.lastError && at > 0 && nowAt - at <= RECENT_WAKE_LOCK_ERROR_WINDOW_MS);
    }

    function hasRetainedPcmPressure(memoryGuard) {
        const pressure = String(memoryGuard?.pressure || 'normal');
        const count = Number(memoryGuard?.masteredBufferCount || 0);
        const bytes = Number(memoryGuard?.masteredBufferBytes || 0);
        const maxCount = Number(memoryGuard?.policy?.maxRetainedBuffers || 0);
        const maxBytes = Number(memoryGuard?.policy?.maxMasteredBufferBytes || 0);
        return pressure === 'high' || pressure === 'medium'
            || (maxCount > 0 && count > maxCount)
            || (maxBytes > 0 && bytes > maxBytes * 0.85);
    }

    function summarizeSnapshot(snapshot) {
        const nowAt = Number(snapshot.at || Date.now());
        const recentLongTasks = snapshot.longTasks.filter(item => nowAt - Number(item.at || nowAt) <= RECENT_LONG_TASK_WINDOW_MS);
        const longTaskMax = recentLongTasks.length ? Math.max(...recentLongTasks.map(item => Number(item.durationMs || 0))) : 0;
        const warnings = [];
        const activities = [];
        if (snapshot.audio.playing > 1) warnings.push('multiple-audio-playing');
        if (snapshot.audio.audible > 1) warnings.push('multiple-audible-audio');
        if (snapshot.dom.canvases > 6) warnings.push('many-canvas-nodes');
        if (snapshot.runtime && !snapshot.runtime.ok) warnings.push('runtime-health-check');
        if (snapshot.engineControls?.activeEngineControl && snapshot.engineControls?.bodyLocked) warnings.push('engine-control-body-lock');
        if (Number(snapshot.engineControls?.pendingChangeCount || 0) > 0 && Number(snapshot.engineControls?.pendingAgeMs || 0) > 5000) warnings.push('engine-control-change-pending');
        if (snapshot.dock && snapshot.dock.healthy === false) warnings.push('dock-integrity-failed');
        const runtimeFaultRecentCount = Number(snapshot.runtimeFaults?.recentCount || 0);
        const runtimeFaultMaxRepeated = Number(snapshot.runtimeFaults?.maxRecentKeyCount || 0);
        if (runtimeFaultMaxRepeated >= 3 || runtimeFaultRecentCount >= 6) warnings.push('recoverable-runtime-faults');
        if ((snapshot.importQueue?.active || 0) + (snapshot.importQueue?.pending || 0) > 0) activities.push('bulk-import-active');
        if (snapshot.bulkImportHud && snapshot.bulkImportHud.total >= 2 && !snapshot.bulkImportHud.complete) activities.push('bulk-import-hud-active');
        if ((snapshot.audioDecode?.activeDecodes || 0) > 0) activities.push('audio-decode-active');
        if ((snapshot.audioContexts?.activeCount || 0) > 5) warnings.push('many-audio-contexts');
        if ((snapshot.audioContexts?.interruptedCount || 0) > 0) warnings.push('audio-context-interrupted');
        if (hasRecentDecodeFailure(snapshot.audioDecode, nowAt)) warnings.push('audio-decode-last-error');
        if ((snapshot.masteringQueue?.active || 0) > 0) activities.push('mastering-active');
        if (hasRetainedPcmPressure(snapshot.memoryGuard)) warnings.push('mastered-buffer-retention');
        if (Number(snapshot.downloadVariantCache?.maxBytes || 0) > 0 && Number(snapshot.downloadVariantCache?.bytes || 0) >= Number(snapshot.downloadVariantCache.maxBytes) * 0.85) warnings.push('download-variant-cache-pressure');
        if ((snapshot.workerJobs?.stalledCount || 0) > 0) warnings.push('worker-job-stalled');
        if ((snapshot.workerJobs?.activeTransferBytes || 0) > 128 * 1024 * 1024) warnings.push('worker-transfer-memory-high');
        if (snapshot.wakeLock?.active && snapshot.wakeLock?.mode === 'auto') activities.push('wake-lock-auto-active');
        if (hasRecentWakeLockFailure(snapshot.wakeLock, nowAt)) warnings.push('wake-lock-last-error');
        if (snapshot.renderScheduler?.pending) activities.push('render-queue-pending');
        if (longTaskMax >= 200) warnings.push('heavy-long-task');
        else if (longTaskMax >= 80) warnings.push('watch-long-task');
        const summary = Object.freeze({
            ok: warnings.length === 0,
            warnings: Object.freeze(warnings),
            activities: Object.freeze([...new Set(activities)]),
            longTaskMaxMs: round(longTaskMax, 1),
            recentLongTaskCount: recentLongTasks.length,
            audioPlaying: snapshot.audio.playing,
            audibleAudio: snapshot.audio.audible,
            canvases: snapshot.dom.canvases,
            importQueue: snapshot.importQueue ? { active: snapshot.importQueue.active || 0, pending: snapshot.importQueue.pending || 0 } : null,
            bulkImportHud: snapshot.bulkImportHud ? { total: snapshot.bulkImportHud.total || 0, done: snapshot.bulkImportHud.done || 0, percent: snapshot.bulkImportHud.percent || 0, expanded: Boolean(snapshot.bulkImportHud.expanded) } : null,
            audioDecode: snapshot.audioDecode ? { active: snapshot.audioDecode.activeDecodes || 0, completedCount: snapshot.audioDecode.completedCount || 0, failedCount: snapshot.audioDecode.failedCount || 0, lastDecodedPcmMB: snapshot.audioDecode.lastDecodedPcmMB || 0 } : null,
            audioContexts: snapshot.audioContexts ? { active: snapshot.audioContexts.activeCount || 0, running: snapshot.audioContexts.runningCount || 0, suspended: snapshot.audioContexts.suspendedCount || 0, byPurpose: snapshot.audioContexts.byPurpose || {} } : null,
            masteringQueue: snapshot.masteringQueue ? { active: snapshot.masteringQueue.active || 0, completedCount: snapshot.masteringQueue.completedCount || 0, failedCount: snapshot.masteringQueue.failedCount || 0 } : null,
            memoryGuard: snapshot.memoryGuard ? { completedCount: snapshot.memoryGuard.completedCount || 0, masteredBufferCount: snapshot.memoryGuard.masteredBufferCount || 0, masteredBufferBytes: snapshot.memoryGuard.masteredBufferBytes || 0, outBlobBytes: snapshot.memoryGuard.outBlobBytes || 0 } : null,
            downloadVariantCache: snapshot.downloadVariantCache ? { entryCount: snapshot.downloadVariantCache.entryCount || 0, bytes: snapshot.downloadVariantCache.bytes || 0, maxEntries: snapshot.downloadVariantCache.maxEntries || 0, maxBytes: snapshot.downloadVariantCache.maxBytes || 0, lowMemory: Boolean(snapshot.downloadVariantCache.lowMemory) } : null,
            wakeLock: snapshot.wakeLock ? { active: Boolean(snapshot.wakeLock.active), mode: snapshot.wakeLock.mode || 'off', settingLabel: snapshot.wakeLock.settingLabel || 'OFF', userEnabled: Boolean(snapshot.wakeLock.userEnabled) } : null,
            runtimeFaults: snapshot.runtimeFaults ? { totalCount: snapshot.runtimeFaults.totalCount || 0, uniqueCount: snapshot.runtimeFaults.uniqueCount || 0, recentCount: snapshot.runtimeFaults.recentCount || 0, maxRecentKeyCount: snapshot.runtimeFaults.maxRecentKeyCount || 0, repeatedKeys: snapshot.runtimeFaults.repeatedKeys || [], entries: snapshot.runtimeFaults.entries || [] } : null,
            engineControls: snapshot.engineControls ? { activeSelectId: snapshot.engineControls.activeSelectId || '', popupVisible: Boolean(snapshot.engineControls.popupVisible), bodyLocked: Boolean(snapshot.engineControls.bodyLocked), pendingChangeCount: snapshot.engineControls.pendingChangeCount || 0, lastDispatchDurationMs: snapshot.engineControls.lastDispatchDurationMs || 0 } : null,
            dock: snapshot.dock ? { healthy: Boolean(snapshot.dock.healthy), expectedVisible: Boolean(snapshot.dock.expectedVisible), show: Boolean(snapshot.dock.show), ariaHidden: snapshot.dock.ariaHidden || '', playerChildren: snapshot.dock.playerChildren || 0, audioCount: snapshot.dock.audioCount || 0, height: snapshot.dock.height || 0, repairCount: snapshot.dock.repairCount || 0, lastRepairReason: snapshot.dock.lastRepairReason || '' } : null,
            renderQueuePending: Boolean(snapshot.renderScheduler?.pending),
            visibility: snapshot.visibility,
            hint: snapshot.frameBudgetHint
        });
        state.lastSummary = summary;
        return summary;
    }

    function getSummary(snapshot = null) {
        return summarizeSnapshot(snapshot || state.lastSnapshot || collectSnapshot('summary'));
    }

    function collectSnapshot(reason = 'manual') {
        const runtimeReport = safeCall(() => global.FoxBearRuntimeHealth?.getReport?.(), null);
        const runtimeFaults = safeCall(() => global.FoxBearRuntimeFaultCounters?.getSnapshot?.(), null);
        const navigationGuard = safeCall(() => global.FoxBearSiteGuards?.getNavigationExitGuardState?.(), null);
        const overlayHistory = safeCall(() => global.FoxBearModalStateMachine?.getHistoryDiagnostics?.(), null);
        const engineControls = safeCall(() => global.FoxBearEngineControlDiagnostics?.getSnapshot?.(), null);
        const dock = safeCall(() => global.FoxBearDockDiagnostics?.getSnapshot?.(), null);
        const playback = safeCall(() => global.FoxBearPlaybackLinkService?.getOrchestrationSnapshot?.(), null);
        const importQueue = safeCall(() => global.FoxBearBulkImportGuard?.getSnapshot?.(), null);
        const bulkImportHud = safeCall(() => global.FoxBearBulkImportHud?.getSnapshot?.(), null);
        const audioDecode = safeCall(() => global.FoxBearAudioDecodeService?.getDiagnostics?.(), null);
        const audioContexts = safeCall(() => global.FoxBearAudioContextManager?.getDiagnostics?.(), null);
        const renderScheduler = safeCall(() => global.FoxBearRenderScheduler?.getSnapshot?.(), null);
        const masteringQueue = safeCall(() => global.FoxBearMasteringGuard?.getSnapshot?.(), null);
        const masteringPerformance = safeCall(() => global.FoxBearMasteringDiagnostics?.getSnapshot?.(), null);
        const wakeLock = safeCall(() => global.FoxBearWakeLockController?.getSnapshot?.(), null);
        const memoryGuard = safeCall(() => global.FoxBearMemoryGuard?.getSnapshot?.(), null);
        const downloadVariantCache = safeCall(() => global.FoxBearDownloadService?.getDownloadVariantCacheDiagnostics?.(), null);
        const workerJobs = safeCall(() => global.FoxBearWorkerJobService?.getDiagnostics?.(), null);
        const sessionHandoff = safeCall(() => global.FoxBearSessionHandoff?.getSnapshot?.(), null);
        const serviceWorkerUpdate = safeCall(() => global.FoxBearServiceWorkerUpdateService?.getSnapshot?.(), null);
        const snapshot = Object.freeze({
            version: DIAGNOSTICS_VERSION,
            reason,
            at: Date.now(),
            uptimeMs: Math.round(now() - state.bootAt),
            enabled: state.enabled,
            visibility: global.document?.visibilityState || 'unknown',
            frameBudgetHint: getFrameBudgetHint(),
            memory: readMemory(),
            audio: getAudioSnapshot(),
            dom: getDomSnapshot(),
            runtimeFaults,
            runtime: runtimeReport ? {
                ok: Boolean(runtimeReport.ok),
                appReady: Boolean(runtimeReport.appReady),
                resourceFailures: runtimeReport.resourceFailures?.length || 0,
                runtimeErrors: runtimeReport.runtimeErrors?.length || 0,
                runtimeWarnings: runtimeReport.runtimeWarnings?.length || 0,
                missingGlobals: runtimeReport.missingGlobals?.length || 0
            } : null,
            navigationGuard,
            overlayHistory,
            engineControls,
            dock,
            importQueue,
            bulkImportHud,
            audioDecode,
            audioContexts,
            masteringQueue,
            masteringPerformance,
            memoryGuard,
            downloadVariantCache,
            workerJobs,
            sessionHandoff,
            serviceWorkerUpdate,
            wakeLock,
            renderScheduler,
            playback: playback ? {
                reason: playback.reason || '',
                conflictCount: playback.conflictCount || 0,
                playing: playback.playing?.length || 0,
                at: playback.at || 0
            } : null,
            longTasks: state.longTasks.slice(-MAX_LONG_TASKS)
        });
        state.lastSnapshot = snapshot;
        summarizeSnapshot(snapshot);
        state.samples.push(snapshot);
        clipList(state.samples, MAX_SAMPLES);
        try { global.dispatchEvent(new CustomEvent(SNAPSHOT_EVENT, { detail: snapshot })); }
        catch (error) {}
        return snapshot;
    }

    function observeLongTasks() {
        if (state.observer || !global.PerformanceObserver) return false;
        try {
            state.observer = new PerformanceObserver(list => {
                list.getEntries().forEach(entry => {
                    state.longTasks.push(Object.freeze({
                        durationMs: round(entry.duration || 0, 1),
                        startMs: round(entry.startTime || 0, 1),
                        name: entry.name || 'longtask',
                        at: Date.now()
                    }));
                });
                clipList(state.longTasks, MAX_LONG_TASKS);
            });
            state.observer.observe({ entryTypes: ['longtask'] });
            return true;
        } catch (error) {
            state.observer = null;
            return false;
        }
    }

    function stopLongTaskObserver() {
        if (!state.observer) return;
        try { state.observer.disconnect(); }
        catch (error) {}
        state.observer = null;
    }

    function ensurePanel() {
        if (state.panel || !global.document?.body) return state.panel;
        const doc = global.document;
        const backdrop = doc.createElement('div');
        backdrop.className = 'foxbear-perf-backdrop';
        backdrop.hidden = true;
        backdrop.dataset.foxbearBackdropClose = 'true';
        backdrop.setAttribute('role', 'dialog');
        backdrop.setAttribute('aria-modal', 'true');
        backdrop.setAttribute('aria-hidden', 'true');
        backdrop.setAttribute('aria-labelledby', 'foxbearPerfPanelTitle');

        const panel = doc.createElement('section');
        panel.className = 'foxbear-perf-panel';
        panel.tabIndex = -1;
        panel.setAttribute('aria-describedby', 'foxbearPerfPanelDescription');

        const header = doc.createElement('div');
        header.className = 'foxbear-perf-panel-head';
        const titleWrap = doc.createElement('div');
        titleWrap.className = 'foxbear-perf-panel-title';
        const eyebrow = doc.createElement('span');
        eyebrow.className = 'foxbear-perf-panel-eyebrow';
        eyebrow.textContent = 'Device Health';
        const title = doc.createElement('strong');
        title.id = 'foxbearPerfPanelTitle';
        title.textContent = '메모리·성능 진단';
        const description = doc.createElement('p');
        description.id = 'foxbearPerfPanelDescription';
        description.textContent = '현재 브라우저의 메모리, 오디오, Worker와 지연 상태를 요약합니다.';
        titleWrap.append(eyebrow, title, description);

        const actions = doc.createElement('div');
        actions.className = 'foxbear-perf-panel-actions';
        const refresh = doc.createElement('button');
        refresh.type = 'button';
        refresh.className = 'foxbear-perf-panel-button';
        refresh.textContent = '새로고침';
        refresh.addEventListener('click', () => refreshPanel('manual-refresh'));
        const copy = doc.createElement('button');
        copy.type = 'button';
        copy.className = 'foxbear-perf-panel-button';
        copy.textContent = '진단 복사';
        copy.addEventListener('click', () => copySnapshotToClipboard());
        const clear = doc.createElement('button');
        clear.type = 'button';
        clear.className = 'foxbear-perf-panel-button';
        clear.textContent = '기록 초기화';
        clear.addEventListener('click', () => {
            clearHistory();
            refreshPanel('clear-history');
        });
        const recover = doc.createElement('button');
        recover.type = 'button';
        recover.className = 'foxbear-perf-panel-button foxbear-perf-recovery-button';
        recover.textContent = '정체 Worker 취소';
        recover.disabled = true;
        recover.setAttribute('aria-disabled', 'true');
        recover.addEventListener('click', () => cancelStalledWorkers());
        const retry = doc.createElement('button');
        retry.type = 'button';
        retry.className = 'foxbear-perf-panel-button foxbear-perf-retry-button';
        retry.textContent = '취소 작업 재시도';
        retry.disabled = true;
        retry.setAttribute('aria-disabled', 'true');
        retry.addEventListener('click', () => retryRecoveredWorkers());
        actions.append(refresh, copy, clear, recover, retry);

        const close = doc.createElement('button');
        close.type = 'button';
        close.className = 'foxbear-perf-panel-close foxbear-modal-close';
        close.setAttribute('aria-label', '메모리 성능진단 닫기');
        close.textContent = '×';
        close.addEventListener('click', () => setPanelVisible(false));
        header.append(titleWrap, actions, close);

        const summaryLead = doc.createElement('p');
        summaryLead.className = 'foxbear-perf-summary-lead';
        summaryLead.setAttribute('role', 'status');
        summaryLead.textContent = '상태를 확인하고 있습니다.';
        const summaryGrid = doc.createElement('div');
        summaryGrid.className = 'foxbear-perf-summary-grid';
        summaryGrid.setAttribute('aria-label', '성능 진단 핵심 상태');

        const recommendations = doc.createElement('section');
        recommendations.className = 'foxbear-perf-recommendations';
        recommendations.setAttribute('aria-label', '권장 조치');
        const recommendationTitle = doc.createElement('strong');
        recommendationTitle.textContent = '권장 조치';
        const recommendationList = doc.createElement('ul');
        recommendations.append(recommendationTitle, recommendationList);

        const workerSection = doc.createElement('section');
        workerSection.className = 'foxbear-perf-worker-section';
        workerSection.setAttribute('aria-label', 'Worker 작업 상세');
        const workerHeader = doc.createElement('div');
        workerHeader.className = 'foxbear-perf-worker-header';
        const workerTitle = doc.createElement('strong');
        workerTitle.textContent = 'Worker 작업 상세';
        const workerHint = doc.createElement('span');
        workerHint.textContent = '진행률·정체 시간·전송 메모리';
        workerHeader.append(workerTitle, workerHint);
        const workerList = doc.createElement('div');
        workerList.className = 'foxbear-perf-worker-list';
        workerSection.append(workerHeader, workerList);

        const actionStatus = doc.createElement('p');
        actionStatus.className = 'foxbear-perf-action-status';
        actionStatus.setAttribute('role', 'status');
        actionStatus.setAttribute('aria-live', 'polite');
        actionStatus.hidden = true;

        const details = doc.createElement('details');
        details.className = 'foxbear-perf-details';
        const detailsSummary = doc.createElement('summary');
        detailsSummary.textContent = '기술 상세 로그 보기';
        const output = doc.createElement('pre');
        output.className = 'foxbear-perf-panel-output';
        output.textContent = '아직 진단 스냅샷이 없습니다.';
        details.append(detailsSummary, output);

        panel.append(header, summaryLead, summaryGrid, recommendations, workerSection, actionStatus, details);
        backdrop.appendChild(panel);
        backdrop.addEventListener('click', event => {
            if (event.target === backdrop) setPanelVisible(false);
        });
        panel.addEventListener('pointerdown', () => {
            if (state.autoOpened) {
                state.autoOpened = false;
                state.autoStableSamples = 0;
                state.openSource = 'user-interaction';
            }
        });
        panel.addEventListener('keydown', event => {
            if (event.key !== 'Tab') return;
            const focusable = Array.from(panel.querySelectorAll('button:not([disabled]), summary, a[href], [tabindex]:not([tabindex="-1"])'))
                .filter(node => !node.hidden && node.getAttribute('aria-hidden') !== 'true');
            if (!focusable.length) return;
            const index = focusable.indexOf(doc.activeElement);
            const next = event.shiftKey
                ? (index <= 0 ? focusable.length - 1 : index - 1)
                : (index < 0 || index >= focusable.length - 1 ? 0 : index + 1);
            event.preventDefault();
            try { focusable[next].focus({ preventScroll: true }); } catch (error) {}
        });
        doc.body.appendChild(backdrop);
        state.backdrop = backdrop;
        state.panel = panel;
        state.output = output;
        state.summaryGrid = summaryGrid;
        state.summaryLead = summaryLead;
        state.detailSection = details;
        state.recommendations = recommendations;
        state.actionStatus = actionStatus;
        state.recoveryButton = recover;
        state.retryButton = retry;
        state.workerList = workerList;
        state.workerSection = workerSection;
        return panel;
    }

    function formatBytes(bytes) {
        const value = Math.max(0, Number(bytes || 0));
        if (value >= 1073741824) return `${round(value / 1073741824, 1)}GB`;
        if (value >= 1048576) return `${round(value / 1048576, 1)}MB`;
        if (value >= 1024) return `${round(value / 1024, 1)}KB`;
        return `${Math.round(value)}B`;
    }

    function formatAge(milliseconds) {
        const value = Math.max(0, Number(milliseconds || 0));
        if (value >= 60000) return `${round(value / 60000, 1)}분`;
        if (value >= 1000) return `${round(value / 1000, 1)}초`;
        return `${Math.round(value)}ms`;
    }

    function getOverallHealth(snapshot, summary) {
        const worker = snapshot.workerJobs || {};
        const memoryRatio = snapshot.memory?.limitMB ? Number(snapshot.memory.usedMB || 0) / Number(snapshot.memory.limitMB || 1) : 0;
        const longTaskMax = summary?.longTaskMaxMs || 0;
        if (worker.healthLevel === 'danger' || (snapshot.runtime && !snapshot.runtime.ok) || memoryRatio >= 0.85 || longTaskMax >= 500) return 'danger';
        if (worker.healthLevel === 'watch' || (summary?.warnings?.length || 0) > 0 || memoryRatio >= 0.7 || longTaskMax >= 80) return 'watch';
        return 'normal';
    }

    function getHealthLabel(level) {
        if (level === 'danger') return '위험';
        if (level === 'watch') return '주의';
        return '정상';
    }

    function updateRetryButton() {
        if (!state.retryButton) return;
        const coordinator = global.FoxBearWorkerRecoveryCoordinator;
        const retryable = state.lastRecoveryJobs.filter(job => safeCall(() => coordinator?.canRetry?.(job), false));
        const disabled = state.retryInFlight || retryable.length < 1;
        state.retryButton.disabled = disabled;
        state.retryButton.hidden = !state.retryInFlight && retryable.length < 1;
        state.retryButton.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        state.retryButton.textContent = state.retryInFlight ? '재시도 시작 중' : (retryable.length ? `취소 작업 ${retryable.length}개 재시도` : '재시도 가능 작업 없음');
    }

    function getWorkerItemTone(item) {
        if (item.status === 'failed' || item.status === 'timeout' || item.healthLevel === 'danger') return 'danger';
        if (item.status === 'cancelled' || item.healthLevel === 'watch') return 'watch';
        return 'normal';
    }

    function renderWorkerJobs(snapshot) {
        if (!state.workerList) return;
        const doc = global.document;
        const worker = snapshot.workerJobs || {};
        const active = Array.isArray(worker.active) ? worker.active : [];
        const recent = Array.isArray(worker.recent) ? worker.recent.slice(-6).reverse() : [];
        const noteworthyRecent = recent.filter(item => item.status !== 'completed' || getWorkerItemTone(item) !== 'normal');
        const items = active.length ? active : noteworthyRecent;
        if (state.workerSection) state.workerSection.hidden = items.length < 1;
        if (!items.length) {
            state.workerList.replaceChildren();
            updateRetryButton();
            return;
        }
        const nodes = items.map(item => {
            const article = doc.createElement('article');
            const tone = getWorkerItemTone(item);
            article.className = 'foxbear-perf-worker-item';
            article.dataset.tone = tone;
            const top = doc.createElement('div');
            top.className = 'foxbear-perf-worker-item-top';
            const title = doc.createElement('strong');
            title.textContent = item.label || '오디오 Worker';
            const badge = doc.createElement('span');
            badge.className = 'foxbear-perf-health-badge';
            badge.dataset.tone = tone;
            badge.textContent = item.status === 'running' ? getHealthLabel(tone) : (item.status === 'completed' ? '완료' : item.status === 'cancelled' ? '취소됨' : item.status === 'timeout' ? '시간초과' : '실패');
            top.append(title, badge);
            const stage = doc.createElement('p');
            stage.textContent = item.stage || item.detail || '작업 상태 확인 중';
            const meta = doc.createElement('div');
            meta.className = 'foxbear-perf-worker-meta';
            const percent = doc.createElement('span');
            percent.textContent = `진행 ${Math.round(Number(item.percent || 0))}%`;
            const age = doc.createElement('span');
            age.textContent = `${item.status === 'running' ? '무응답' : '마지막 진행'} ${formatAge(item.progressAgeMs || item.elapsedMs || 0)}`;
            const transfer = doc.createElement('span');
            transfer.textContent = `전송 ${formatBytes(item.transferBytes || 0)}`;
            meta.append(percent, age, transfer);
            article.append(top, stage, meta);
            if (item.status === 'running' && item.stalled && item.canCancel) {
                const cancel = doc.createElement('button');
                cancel.type = 'button';
                cancel.className = 'foxbear-perf-worker-cancel';
                cancel.textContent = '이 작업 취소';
                cancel.addEventListener('click', () => cancelSingleStalledWorker(item));
                article.append(cancel);
            }
            return article;
        });
        state.workerList.replaceChildren(...nodes);
        updateRetryButton();
    }

    function renderSummaryCards(snapshot) {
        if (!state.summaryGrid || !state.summaryLead) return;
        const doc = global.document;
        const summary = state.lastSummary || summarizeSnapshot(snapshot);
        const warningCount = summary.warnings.length;
        const healthLevel = getOverallHealth(snapshot, summary);
        state.summaryLead.dataset.tone = healthLevel;
        const activityText = summary.activities.slice(0, 2).map(activityGuidance).join(' · ');
        state.summaryLead.textContent = healthLevel === 'danger'
            ? `위험 상태입니다. 즉시 정체 작업과 메모리 사용량을 확인해 주세요. 점검 항목 ${warningCount}개.`
            : healthLevel === 'watch'
                ? `주의가 필요한 항목 ${warningCount}개가 있습니다. 권장 조치를 순서대로 확인해 주세요.`
                : activityText
                    ? `현재 ${activityText}입니다. 확인된 성능 이상은 없습니다.`
                    : '현재 확인된 메모리·성능 이상이 없습니다.';
        const longTaskMax = Number(summary.longTaskMaxMs || 0);
        const worker = snapshot.workerJobs || {};
        const memoryGuard = snapshot.memoryGuard || {};
        const cards = [
            {
                label: '종합 상태',
                value: getHealthLabel(healthLevel),
                detail: warningCount ? summary.warnings.slice(0, 2).map(warningGuidance).join(' · ') : '런타임 경고 없음',
                tone: healthLevel
            },
            {
                label: '브라우저 메모리',
                value: snapshot.memory ? `${snapshot.memory.usedMB}MB` : '측정 미지원',
                detail: snapshot.memory ? `한도 ${snapshot.memory.limitMB}MB` : 'Safari 등 일부 브라우저는 JS Heap 수치를 제공하지 않습니다.',
                tone: snapshot.memory && snapshot.memory.limitMB && snapshot.memory.usedMB / snapshot.memory.limitMB > 0.7 ? 'warn' : 'neutral'
            },
            {
                label: '오디오 재생',
                value: `${snapshot.audio.playing}/${snapshot.audio.total}`,
                detail: snapshot.audio.audible > 1 ? `동시 audible ${snapshot.audio.audible}개` : '중복 재생 없음',
                tone: snapshot.audio.audible > 1 ? 'warn' : 'ok'
            },
            {
                label: 'Worker 작업',
                value: `${worker.activeCount || 0}개`,
                detail: `${worker.stalledCount || 0}개 정체 · 주의 ${worker.watchCount || 0} · 전송 ${formatBytes(worker.activeTransferBytes || 0)}`,
                tone: worker.healthLevel || ((worker.stalledCount || 0) > 0 ? 'danger' : 'neutral')
            },
            {
                label: '긴 메인 작업',
                value: longTaskMax ? `${round(longTaskMax, 0)}ms` : '없음',
                detail: `최근 1분 ${summary.recentLongTaskCount || 0}개`,
                tone: longTaskMax >= 200 ? 'warn' : (longTaskMax >= 80 ? 'watch' : 'ok')
            },
            {
                label: '완료 PCM 보유',
                value: `${memoryGuard.masteredBufferCount || 0}개`,
                detail: `${formatBytes(memoryGuard.masteredBufferBytes || 0)} · 저장 Blob ${formatBytes(memoryGuard.outBlobBytes || 0)}`,
                tone: hasRetainedPcmPressure(memoryGuard) ? 'warn' : 'neutral'
            }
        ];
        const nodes = cards.map(card => {
            const article = doc.createElement('article');
            article.className = 'foxbear-perf-card';
            article.dataset.tone = card.tone;
            const label = doc.createElement('span');
            label.textContent = card.label;
            const value = doc.createElement('strong');
            value.textContent = card.value;
            const detail = doc.createElement('small');
            detail.textContent = card.detail;
            article.append(label, value, detail);
            return article;
        });
        state.summaryGrid.replaceChildren(...nodes);
        if (state.recommendations) {
            const list = state.recommendations.querySelector('ul');
            const guidance = summary.warnings.slice(0, 4).map(code => {
                const item = doc.createElement('li');
                item.textContent = warningGuidance(code);
                return item;
            });
            if (!guidance.length) {
                const item = doc.createElement('li');
                item.textContent = '추가 조치가 필요하지 않습니다. 작업 완료 후 저장된 파일만 확인해 주세요.';
                guidance.push(item);
            }
            list?.replaceChildren(...guidance);
            state.recommendations.hidden = warningCount < 1;
            state.recommendations.dataset.tone = warningCount ? 'warn' : 'ok';
        }
        if (state.recoveryButton) {
            const stalledCount = Number(worker.stalledCount || 0);
            state.recoveryButton.disabled = stalledCount < 1;
            state.recoveryButton.hidden = stalledCount < 1;
            state.recoveryButton.setAttribute('aria-disabled', stalledCount < 1 ? 'true' : 'false');
            state.recoveryButton.textContent = stalledCount > 0 ? `정체 Worker ${stalledCount}개 취소` : '정체 Worker 없음';
        }
        renderWorkerJobs(snapshot);
    }

    function setActionStatus(message, tone = 'neutral') {
        if (!state.actionStatus) return;
        state.actionStatus.hidden = !message;
        state.actionStatus.dataset.tone = tone;
        state.actionStatus.textContent = String(message || '');
    }

    function cancelSingleStalledWorker(item) {
        const service = global.FoxBearWorkerJobService;
        if (!service?.cancelStalledJob) return Object.freeze({ cancelled: false, job: null });
        const approved = typeof global.confirm !== 'function' || global.confirm(`${item.label || '오디오 작업'}을 취소할까요? 현재 진행 결과는 폐기됩니다.`);
        if (!approved) return Object.freeze({ cancelled: false, job: null });
        const result = service.cancelStalledJob(item.runId || item.jobId, { reason: 'performance-diagnostics-single-worker-recovery' });
        if (result.cancelled && result.job) state.lastRecoveryJobs = [result.job];
        setActionStatus(result.cancelled ? '정체 Worker를 취소했습니다. 아래 재시도 버튼으로 원본 트랙에서 다시 시작할 수 있습니다.' : '작업 상태가 이미 변경되어 취소하지 않았습니다.', result.cancelled ? 'ok' : 'neutral');
        refreshPanel('single-stalled-worker-cancelled');
        return result;
    }

    async function retryRecoveredWorkers() {
        if (state.retryInFlight) return Object.freeze({ startedCount: 0, skippedCount: 0, failedCount: 0, results: Object.freeze([]) });
        const coordinator = global.FoxBearWorkerRecoveryCoordinator;
        const jobs = state.lastRecoveryJobs.filter(job => safeCall(() => coordinator?.canRetry?.(job), false));
        if (!coordinator?.retryJobs || !jobs.length) {
            setActionStatus('현재 안전하게 다시 시작할 수 있는 취소 작업이 없습니다.', 'neutral');
            updateRetryButton();
            return Object.freeze({ startedCount: 0, skippedCount: jobs.length, failedCount: 0, results: Object.freeze([]) });
        }
        const approved = typeof global.confirm !== 'function' || global.confirm(`${jobs.length}개의 작업을 원본 트랙에서 다시 시작할까요?`);
        if (!approved) return Object.freeze({ startedCount: 0, skippedCount: jobs.length, failedCount: 0, results: Object.freeze([]) });
        state.retryInFlight = true;
        updateRetryButton();
        setActionStatus('취소 작업을 안전하게 다시 구성하고 있습니다.', 'neutral');
        const result = await coordinator.retryJobs(jobs, { source: 'performance-diagnostics' });
        state.lastRecoveryJobs = result.results.filter(item => !item.ok).map(item => item.job).filter(Boolean);
        state.retryInFlight = false;
        setActionStatus(
            result.startedCount > 0
                ? `${result.startedCount}개 작업을 다시 시작했습니다.${result.failedCount ? ` ${result.failedCount}개는 시작하지 못했습니다.` : ''}`
                : '재시도할 작업을 시작하지 못했습니다. 현재 작업 상태를 확인해 주세요.',
            result.startedCount > 0 && result.failedCount < 1 ? 'ok' : 'warn'
        );
        refreshPanel('recovered-worker-retry');
        return result;
    }

    function cancelStalledWorkers() {
        const service = global.FoxBearWorkerJobService;
        const before = safeCall(() => service?.getDiagnostics?.(), null);
        const stalledCount = Number(before?.stalledCount || 0);
        if (!service?.cancelStalledJobs || stalledCount < 1) {
            setActionStatus('현재 취소할 정체 Worker가 없습니다.', 'neutral');
            refreshPanel('stalled-worker-none');
            return Object.freeze({ cancelledCount: 0, jobs: Object.freeze([]) });
        }
        const approved = typeof global.confirm !== 'function' || global.confirm(`${stalledCount}개의 정체된 오디오 작업을 취소할까요? 진행 중 결과는 저장되지 않습니다.`);
        if (!approved) {
            setActionStatus('정체 Worker 취소를 중단했습니다.', 'neutral');
            return Object.freeze({ cancelledCount: 0, jobs: Object.freeze([]) });
        }
        const result = service.cancelStalledJobs({ reason: 'performance-diagnostics-manual-recovery' });
        if (result.cancelledCount > 0) state.lastRecoveryJobs = Array.from(result.jobs || []);
        setActionStatus(
            result.cancelledCount > 0
                ? `${result.cancelledCount}개의 정체 Worker를 취소했습니다. 재시도 가능한 작업은 아래 버튼으로 다시 시작할 수 있습니다.`
                : '정체 Worker 상태가 이미 해제되었습니다.',
            result.cancelledCount > 0 ? 'ok' : 'neutral'
        );
        refreshPanel('stalled-worker-cancelled');
        return result;
    }

    function formatPanel(snapshot) {
        const memory = snapshot.memory ? `${snapshot.memory.usedMB}/${snapshot.memory.totalMB}MB` : 'n/a';
        const lines = [
            `version: ${snapshot.version}`,
            `hint: ${snapshot.frameBudgetHint} · visible: ${snapshot.visibility}`,
            `audio: ${snapshot.audio.playing}/${snapshot.audio.total} playing · audible ${snapshot.audio.audible}`,
            `canvas: ${snapshot.dom.canvases}`,
            `memory: ${memory}`,
            `runtime: ${snapshot.runtime ? (snapshot.runtime.ok ? 'ok' : 'check') : 'n/a'} · errors ${snapshot.runtime?.runtimeErrors ?? 0} · warnings ${snapshot.runtime?.runtimeWarnings ?? 0}`,
            `nav guard: ${snapshot.navigationGuard?.installed ? 'on' : 'off'} · confirm ${snapshot.navigationGuard?.confirmOpen ? 'open' : 'idle'}`,
            `overlay history: ${snapshot.overlayHistory?.releaseSuspended ? 'suspended' : (snapshot.overlayHistory?.releaseInFlight ? 'release' : 'idle')} · gen ${snapshot.overlayHistory?.sentinelGeneration ?? 0}/${snapshot.overlayHistory?.releaseGeneration ?? 0} · push ${snapshot.overlayHistory?.sentinelPushCount ?? 0} · coalesced ${snapshot.overlayHistory?.coalescedReleaseCount ?? 0} · recovered ${snapshot.overlayHistory?.releaseRecoveredCount ?? 0}/${snapshot.overlayHistory?.releaseHardStallRecoveredCount ?? 0} · mismatch ${snapshot.overlayHistory?.releaseGenerationMismatchCount ?? 0} · user back ${snapshot.overlayHistory?.userBackCloseCount ?? 0}`,
            `SW activity: ${snapshot.serviceWorkerUpdate?.activitySuspended ? 'suspended' : 'active'} · heartbeat ${snapshot.serviceWorkerUpdate?.heartbeatActive ? 'on' : 'off'} · channel ${snapshot.serviceWorkerUpdate?.channelActive ? 'on' : 'fallback'} · pause/resume ${snapshot.serviceWorkerUpdate?.activityPauseCount ?? 0}/${snapshot.serviceWorkerUpdate?.activityResumeCount ?? 0} · registrations ${snapshot.serviceWorkerUpdate?.observedRegistrationCount ?? 0}`, 
            `long tasks: ${snapshot.longTasks.length}${snapshot.longTasks.length ? ' · max ' + Math.max(...snapshot.longTasks.map(item => item.durationMs || 0)) + 'ms' : ''}`,
            `warnings: ${(state.lastSummary?.warnings || []).join(', ') || 'none'}`,
            `activities: ${(state.lastSummary?.activities || []).join(', ') || 'none'}`
        ];
        const selectedPerformance = snapshot.masteringPerformance?.selected;
        if (selectedPerformance) {
            const slowest = (selectedPerformance.stages || []).slice().sort((a, b) => Number(b.ms || 0) - Number(a.ms || 0))[0];
            lines.push(`track DSP: ${selectedPerformance.name || selectedPerformance.id} · ${(Number(selectedPerformance.totalMs || 0) / 1000).toFixed(2)}s · ${Number(selectedPerformance.speedFactor || 0).toFixed(2)}x`);
            lines.push(`slowest stage: ${slowest ? `${slowest.label} ${(Number(slowest.ms || 0) / 1000).toFixed(2)}s` : 'n/a'} · recovery ${selectedPerformance.recoveryStatus || 'none'}`);
            const memoryProfile = selectedPerformance.memory;
            if (memoryProfile) {
                lines.push(`track memory: known peak ${Number(memoryProfile.peakKnownBufferMB || 0).toFixed(1)}MB @ ${memoryProfile.peakStage || 'n/a'} · heap peak ${Number(memoryProfile.peakHeapUsedMB || 0).toFixed(1)}MB`);
                lines.push(`Kakao projection: ${Number(memoryProfile.projectedPeakMB || selectedPerformance.inAppSafety?.projectedPeakMb || 0).toFixed(1)}MB / budget ${Number(memoryProfile.memoryBudgetMB || selectedPerformance.inAppSafety?.memoryBudgetMb || 0).toFixed(1)}MB · pressure ${Number(memoryProfile.pressureRatio || selectedPerformance.inAppSafety?.pressureRatio || 0).toFixed(2)}`);
                const governor = selectedPerformance.memoryGovernor || memoryProfile.governor;
                if (governor) lines.push(`memory governor: ${governor.level || 'normal'} · observed ${Number(governor.observedRatio || 0).toFixed(2)} · ${governor.qualityMode || 'balanced'} · ${governor.truePeak === false ? 'light peak' : 'true peak'} · stage ${governor.stage || 'n/a'}`);
                (memoryProfile.samples || []).slice(-10).forEach(sample => {
                    lines.push(`  memory stage ${sample.label}: buffers ${Number(sample.knownBufferMB || 0).toFixed(1)}MB${sample.heapUsedMB ? ` · heap ${Number(sample.heapUsedMB).toFixed(1)}MB` : ''}`);
                });
            }
        }
        if (snapshot.sessionHandoff?.hasPayload || snapshot.sessionHandoff?.hasPendingTrackProfile) {
            lines.push(`external handoff: restored · pending track ${snapshot.sessionHandoff.hasPendingTrackProfile ? 'yes' : 'no'}`);
        }
        if (snapshot.audio.labels.length) lines.push(`playing: ${snapshot.audio.labels.join(', ')}`);
        return lines.join('\n');
    }

    function getHealthConditionKey(summary, level) {
        return `${level}:${Array.from(summary?.warnings || []).sort().join('|')}`;
    }

    function getPrimaryHealthMessage(summary, level) {
        const first = Array.from(summary?.warnings || [])[0];
        if (first) return warningGuidance(first);
        if (level === 'watch') return '일시적인 성능 주의 항목이 있습니다.';
        if (level === 'danger') return '즉시 확인할 성능 위험 항목이 있습니다.';
        return '현재 성능 상태가 정상입니다.';
    }

    function updateSettingsHealthSummary(level, summary) {
        const doc = global.document;
        const button = doc?.querySelector?.('[data-native-action="performance-diagnostics"]');
        const stateNode = button?.querySelector?.('[data-setting-state]');
        const summaryNode = doc?.getElementById?.('performanceHealthSummary');
        const label = level === 'danger' ? '위험' : level === 'watch' ? '주의' : '정상';
        const message = getPrimaryHealthMessage(summary, level);
        if (button) {
            button.dataset.healthTone = level;
            button.title = level === 'normal' ? '메모리 성능진단 열기' : `${label}: ${message}`;
            button.setAttribute('aria-label', level === 'normal' ? '메모리 성능진단 열기, 현재 정상' : `메모리 성능진단 열기, ${label}, ${message}`);
        }
        if (stateNode) stateNode.textContent = label;
        if (summaryNode) {
            summaryNode.hidden = level === 'normal';
            summaryNode.dataset.tone = level;
            summaryNode.textContent = level === 'normal' ? '' : `${label} · ${message}`;
        }
        return Object.freeze({ level, label, message });
    }

    function updateHealthNoticeStackOffset() {
        const notice = state.healthNotice;
        if (!notice) return 0;
        const toast = global.document?.getElementById?.('toast');
        const visible = Boolean(toast && toast.classList?.contains?.('show') && toast.querySelector?.('.foxbear-toast-item'));
        const height = visible ? Math.max(0, Number(toast.getBoundingClientRect?.().height || toast.offsetHeight || 0)) : 0;
        const offset = height > 0 ? Math.ceil(height + 10) : 0;
        notice.style?.setProperty?.('--foxbear-health-toast-offset', `${offset}px`);
        return offset;
    }

    function installToastStackObserver() {
        if (state.toastObserver || !global.MutationObserver) return false;
        const toast = global.document?.getElementById?.('toast');
        if (!toast) return false;
        state.toastObserver = new global.MutationObserver(() => updateHealthNoticeStackOffset());
        state.toastObserver.observe(toast, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
        if (global.ResizeObserver) {
            state.toastResizeObserver = new global.ResizeObserver(() => updateHealthNoticeStackOffset());
            state.toastResizeObserver.observe(toast);
        }
        updateHealthNoticeStackOffset();
        return true;
    }

    function ensureSettingsHealthBadge() {
        const doc = global.document;
        const toggle = doc?.getElementById?.('mobileNativeQuickToggle');
        if (!toggle) return null;
        let badge = doc.getElementById?.('performanceHealthBadge');
        if (!badge) {
            badge = doc.createElement('span');
            badge.id = 'performanceHealthBadge';
            badge.className = 'performance-health-badge';
            badge.hidden = true;
            badge.setAttribute('aria-hidden', 'true');
            toggle.appendChild(badge);
        }
        return badge;
    }

    function updateSettingsHealthBadge(level) {
        const badge = ensureSettingsHealthBadge();
        const toggle = global.document?.getElementById?.('mobileNativeQuickToggle');
        if (!badge || !toggle) return false;
        const visible = level === 'watch' || level === 'danger';
        badge.hidden = !visible;
        badge.dataset.tone = visible ? level : 'normal';
        badge.textContent = visible ? '!' : '';
        const suffix = level === 'danger' ? ', 성능 위험 항목 있음' : level === 'watch' ? ', 성능 주의 항목 있음' : '';
        toggle.setAttribute('aria-label', `앱 설정 열기${suffix}`);
        toggle.title = level === 'danger' ? '설정 열기 · 성능 위험 항목 있음' : level === 'watch' ? '설정 열기 · 성능 주의 항목 있음' : '설정 열기';
        return visible;
    }

    function ensureHealthNotice() {
        if (state.healthNotice || !global.document?.body) return state.healthNotice;
        const doc = global.document;
        const notice = doc.createElement('aside');
        notice.className = 'foxbear-health-notice';
        notice.hidden = true;
        notice.setAttribute('role', 'status');
        notice.setAttribute('aria-live', 'polite');
        const icon = doc.createElement('span');
        icon.className = 'foxbear-health-notice-icon';
        icon.textContent = '!';
        icon.setAttribute('aria-hidden', 'true');
        const copy = doc.createElement('div');
        copy.className = 'foxbear-health-notice-copy';
        const title = doc.createElement('strong');
        title.textContent = '성능 점검이 필요합니다';
        const message = doc.createElement('span');
        message.textContent = '오디오 작업 상태를 확인해 주세요.';
        copy.append(title, message);
        const open = doc.createElement('button');
        open.type = 'button';
        open.className = 'foxbear-health-notice-open';
        open.textContent = '진단 열기';
        open.addEventListener('click', () => {
            hideHealthNotice('open-diagnostics');
            setPanelVisible(true, { source: 'health-notice', returnFocus: open });
        });
        const close = doc.createElement('button');
        close.type = 'button';
        close.className = 'foxbear-health-notice-close';
        close.setAttribute('aria-label', '성능 경고 닫기');
        close.textContent = '×';
        close.addEventListener('click', () => {
            const summary = state.lastSummary || { warnings: [] };
            persistNoticeDismissal(getHealthConditionKey(summary, state.ambientHealth));
            hideHealthNotice('user-dismissed');
        });
        notice.append(icon, copy, open, close);
        doc.body.appendChild(notice);
        state.healthNotice = notice;
        state.healthNoticeMessage = message;
        installToastStackObserver();
        updateHealthNoticeStackOffset();
        return notice;
    }

    function hideHealthNotice(reason = 'hidden') {
        if (!state.healthNotice) return false;
        state.healthNotice.hidden = true;
        state.healthNotice.dataset.reason = reason;
        return true;
    }

    function showHealthNotice(summary) {
        const notice = ensureHealthNotice();
        if (!notice || state.panelVisible) return false;
        const key = getHealthConditionKey(summary, 'danger');
        if (isNoticeDismissed(key)) return false;
        const first = summary.warnings[0];
        if (state.healthNoticeMessage) state.healthNoticeMessage.textContent = first ? warningGuidance(first) : '오디오 작업 상태를 확인해 주세요.';
        updateHealthNoticeStackOffset();
        notice.hidden = false;
        notice.dataset.tone = 'danger';
        notice.dataset.condition = key;
        return true;
    }

    function applyAmbientHealth(snapshot, summary = null) {
        const resolvedSummary = summary || state.lastSummary || summarizeSnapshot(snapshot);
        const measuredLevel = getOverallHealth(snapshot, resolvedSummary);
        state.ambientMeasuredHealth = measuredLevel;
        if (measuredLevel === 'danger') {
            state.ambientDangerSamples += 1;
            state.ambientWatchSamples = 0;
            state.ambientRecoverySamples = 0;
            if (state.ambientDangerSamples >= AMBIENT_DANGER_CONFIRM_SAMPLES) state.ambientHealth = 'danger';
        } else if (measuredLevel === 'watch') {
            state.ambientWatchSamples += 1;
            state.ambientDangerSamples = 0;
            state.ambientRecoverySamples = 0;
            if (state.ambientWatchSamples >= AMBIENT_WATCH_CONFIRM_SAMPLES) state.ambientHealth = 'watch';
        } else {
            state.ambientWatchSamples = 0;
            state.ambientDangerSamples = 0;
            state.ambientRecoverySamples += 1;
            if (state.ambientRecoverySamples >= AMBIENT_RECOVERY_CONFIRM_SAMPLES) state.ambientHealth = 'normal';
        }
        const level = state.ambientHealth;
        updateSettingsHealthBadge(level);
        updateSettingsHealthSummary(level, resolvedSummary);
        if (level === 'danger') showHealthNotice(resolvedSummary);
        else if (level === 'normal') hideHealthNotice('health-recovered');
        else hideHealthNotice('health-watch');
        try {
            global.dispatchEvent(new CustomEvent('foxbear:ambient-health-change', {
                detail: {
                    level, measuredLevel,
                    warnings: resolvedSummary.warnings.slice(), activities: resolvedSummary.activities.slice(),
                    confirmation: {
                        dangerSamples: state.ambientDangerSamples, watchSamples: state.ambientWatchSamples,
                        recoverySamples: state.ambientRecoverySamples,
                        dangerRequired: AMBIENT_DANGER_CONFIRM_SAMPLES, watchRequired: AMBIENT_WATCH_CONFIRM_SAMPLES,
                        recoveryRequired: AMBIENT_RECOVERY_CONFIRM_SAMPLES
                    }
                }
            }));
        } catch (error) {}
        return Object.freeze({ level, measuredLevel, warnings: resolvedSummary.warnings, activities: resolvedSummary.activities });
    }

    function refreshAmbientHealth(reason = 'ambient-health') {
        const snapshot = collectSnapshot(reason);
        return applyAmbientHealth(snapshot, state.lastSummary);
    }

    function stopAmbientTimer() {
        if (!state.ambientTimer) return;
        global.clearTimeout(state.ambientTimer);
        state.ambientTimer = 0;
    }

    function scheduleAmbientHealth() {
        stopAmbientTimer();
        const hidden = global.document?.visibilityState === 'hidden';
        state.ambientTimer = global.setTimeout(() => {
            state.ambientTimer = 0;
            refreshAmbientHealth(hidden ? 'ambient-health-hidden' : 'ambient-health');
            scheduleAmbientHealth();
        }, hidden ? AMBIENT_HIDDEN_REFRESH_MS : AMBIENT_REFRESH_MS);
    }

    function startAmbientHealthMonitor() {
        const start = () => {
            refreshAmbientHealth('ambient-health-start');
            scheduleAmbientHealth();
        };
        global.addEventListener?.('pagehide', stopAmbientTimer, { once: true });
        if (global.document?.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', start, { once: true });
        else start();
    }

    function maybeAutoCloseStablePanel(snapshot) {
        if (!state.panelVisible || !state.autoOpened) return false;
        const summary = state.lastSummary || summarizeSnapshot(snapshot);
        const runtimeReady = snapshot.runtime?.ok === true && snapshot.runtime?.appReady === true;
        const stable = runtimeReady && summary.ok === true;
        state.autoStableSamples = stable ? state.autoStableSamples + 1 : 0;
        if (state.autoStableSamples < AUTO_CLOSE_STABLE_SAMPLES || Number(snapshot.uptimeMs || 0) < AUTO_CLOSE_MIN_UPTIME_MS) return false;
        const stableSamples = state.autoStableSamples;
        setPanelVisible(false, { restoreFocus: false, reason: 'auto-stable' });
        try {
            global.dispatchEvent(new CustomEvent('foxbear:performance-diagnostics-auto-closed', {
                detail: { reason: 'runtime-stable', stableSamples }
            }));
        } catch (error) {}
        return true;
    }

    function refreshPanel(reason = 'panel') {
        const snapshot = collectSnapshot(reason);
        renderSummaryCards(snapshot);
        if (state.output) state.output.textContent = formatPanel(snapshot);
        maybeAutoCloseStablePanel(snapshot);
        return snapshot;
    }

    function scheduleNextPanelRefresh() {
        stopPanelTimer();
        if (!state.panelVisible) return;
        const hidden = global.document?.visibilityState === 'hidden';
        const delay = hidden ? PANEL_HIDDEN_REFRESH_MS : PANEL_REFRESH_MS;
        state.timer = global.setTimeout(() => {
            state.timer = 0;
            if (!state.panelVisible) return;
            refreshPanel(hidden ? 'panel-refresh-hidden' : 'panel-refresh');
            scheduleNextPanelRefresh();
        }, delay);
    }

    function startPanelTimer() {
        stopPanelTimer();
        refreshPanel('panel-open');
        scheduleNextPanelRefresh();
    }

    function stopPanelTimer() {
        if (!state.timer) return;
        global.clearTimeout(state.timer);
        state.timer = 0;
    }

    function serializeSnapshot(snapshot = null) {
        return JSON.stringify(snapshot || state.lastSnapshot || collectSnapshot('serialize'), null, 2);
    }

    async function copySnapshotToClipboard() {
        const text = serializeSnapshot(state.lastSnapshot || collectSnapshot('copy'));
        try {
            if (global.navigator?.clipboard?.writeText) {
                await global.navigator.clipboard.writeText(text);
                if (state.output) state.output.textContent = `${formatPanel(state.lastSnapshot)}

복사 완료`;
                return true;
            }
        } catch (error) {}
        if (state.output) state.output.textContent = `${formatPanel(state.lastSnapshot || collectSnapshot('copy-fallback'))}

클립보드 복사를 지원하지 않습니다. 콘솔에서 collectSnapshot()을 사용하세요.`;
        return false;
    }

    function clearHistory() {
        state.longTasks = [];
        state.samples = [];
        state.lastSnapshot = null;
        state.lastSummary = null;
        return true;
    }

    function setPanelVisible(visible, options = {}) {
        const panel = ensurePanel();
        const next = Boolean(visible);
        if (next && !state.panelVisible) {
            const candidate = options.returnFocus || global.document?.activeElement;
            if (candidate && candidate !== global.document?.body) state.returnFocus = candidate;
            state.autoOpened = options.auto === true;
            state.autoStableSamples = 0;
            state.openSource = String(options.source || (state.autoOpened ? 'automatic' : 'manual'));
            if (!state.autoOpened && state.lastSummary) {
                persistNoticeDismissal(getHealthConditionKey(state.lastSummary, state.ambientHealth));
            }
            hideHealthNotice('panel-opened');
        }
        state.panelVisible = next;
        if (state.backdrop) {
            state.backdrop.hidden = !state.panelVisible;
            state.backdrop.classList.toggle('show', state.panelVisible);
            state.backdrop.setAttribute('aria-hidden', state.panelVisible ? 'false' : 'true');
            global.FoxBearModalStateMachine?.setExternalLayerOpen?.(state.backdrop, state.panelVisible, {
                mode: 'dialog',
                panel,
                opener: state.returnFocus,
                lockScroll: true,
                onRequestClose: () => setPanelVisible(false, { restoreFocus: true })
            });
        }
        global.document?.body?.classList?.toggle('foxbear-perf-open', state.panelVisible);
        if (state.panelVisible) {
            setEnabled(true, { persist: false, silent: true });
            startPanelTimer();
            const first = panel?.querySelector?.('button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])') || panel;
            try { first?.focus?.({ preventScroll: true }); } catch (error) {}
        } else {
            stopPanelTimer();
            state.autoOpened = false;
            state.autoStableSamples = 0;
            state.openSource = 'closed';
            const returnFocus = state.returnFocus;
            state.returnFocus = null;
            if (options.restoreFocus !== false && returnFocus && global.document?.body?.contains?.(returnFocus) && !returnFocus.hidden) {
                try { returnFocus.focus({ preventScroll: true }); } catch (error) {}
            }
        }
        try { global.dispatchEvent(new CustomEvent(TOGGLE_EVENT, { detail: { enabled: state.enabled, panelVisible: state.panelVisible } })); }
        catch (error) {}
        return state.panelVisible;
    }

    function togglePanel(options = {}) {
        return setPanelVisible(!state.panelVisible, { ...options, source: options.source || 'toggle' });
    }

    function setEnabled(enabled, options = {}) {
        state.enabled = Boolean(enabled);
        if (state.enabled) observeLongTasks();
        else {
            stopLongTaskObserver();
            setPanelVisible(false);
        }
        if (options.persist) writeStorage(state.enabled);
        if (!options.silent) collectSnapshot(state.enabled ? 'enabled' : 'disabled');
        return state.enabled;
    }

    function installVisibilityTimerSync() {
        global.document?.addEventListener?.('visibilitychange', () => {
            if (state.panelVisible) scheduleNextPanelRefresh();
            scheduleAmbientHealth();
        });
    }

    function installKeyboardToggle() {
        global.document?.addEventListener?.('keydown', event => {
            const key = String(event.key || '').toLowerCase();
            if (event.key === 'Escape' && state.panelVisible) {
                event.preventDefault();
                event.stopImmediatePropagation();
                setPanelVisible(false);
                return;
            }
            if ((event.ctrlKey || event.metaKey) && event.altKey && key === 'p') {
                event.preventDefault();
                togglePanel({ source: 'keyboard' });
            }
        }, true);
    }

    global.FoxBearPerformanceDiagnostics = Object.freeze({
        version: DIAGNOSTICS_VERSION,
        STORAGE_KEY,
        setEnabled,
        togglePanel,
        setPanelVisible,
        collectSnapshot,
        getSummary,
        refreshAmbientHealth,
        applyAmbientHealth,
        refreshSettingsHealthSummary: () => updateSettingsHealthSummary(state.ambientHealth, state.lastSummary || { warnings: [] }),
        serializeSnapshot,
        copySnapshotToClipboard,
        cancelStalledWorkers,
        cancelSingleStalledWorker,
        retryRecoveredWorkers,
        clearHistory,
        getSnapshot: () => state.lastSnapshot || collectSnapshot('getSnapshot'),
        getSamples: () => state.samples.slice(),
        getLongTasks: () => state.longTasks.slice(),
        getLifecycleState: () => Object.freeze({
            enabled: state.enabled,
            panelVisible: state.panelVisible,
            openSource: state.openSource,
            autoOpened: state.autoOpened,
            autoStableSamples: state.autoStableSamples,
            legacyAutoOpenMigrated: state.legacyAutoOpenMigrated,
            ambientHealth: state.ambientHealth,
            ambientMeasuredHealth: state.ambientMeasuredHealth,
            ambientWatchSamples: state.ambientWatchSamples,
            ambientDangerSamples: state.ambientDangerSamples,
            ambientRecoverySamples: state.ambientRecoverySamples,
            healthNoticeVisible: Boolean(state.healthNotice && !state.healthNotice.hidden),
            noticeDismissedKey: state.noticeDismissedKey,
            noticeDismissedAt: state.noticeDismissedAt
        })
    });

    installKeyboardToggle();
    installVisibilityTimerSync();
    migrateLegacyAutoOpenPreference();
    restoreNoticeDismissal();
    startAmbientHealthMonitor();
    const autoOpenRequest = readAutoOpenRequest();
    if (autoOpenRequest.open) {
        setEnabled(true, { persist: false, silent: true });
        const openAutomatically = () => setPanelVisible(true, {
            auto: true,
            source: autoOpenRequest.source,
            restoreFocus: false
        });
        if (global.document?.readyState === 'loading') {
            global.document.addEventListener('DOMContentLoaded', openAutomatically, { once: true });
        } else {
            openAutomatically();
        }
    }
})(window);
