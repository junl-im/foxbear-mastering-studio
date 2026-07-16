// FoxBear lightweight performance diagnostics - v1.4.27
// Hidden by default. Enable with ?perf=1, localStorage foxbear-perf-diagnostics=on, or Ctrl/Command+Alt+P.
(function attachFoxBearPerformanceDiagnostics(global) {
    'use strict';

    const DIAGNOSTICS_VERSION = '1.5.28-resilience-lifecycle-offline-recovery';
    const STORAGE_KEY = 'foxbear-perf-diagnostics';
    const TOGGLE_EVENT = 'foxbear:performance-diagnostics-toggle';
    const SNAPSHOT_EVENT = 'foxbear:performance-diagnostics-snapshot';
    const MAX_LONG_TASKS = 10;
    const MAX_SAMPLES = 20;
    const PANEL_REFRESH_MS = 1200;
    const PANEL_HIDDEN_REFRESH_MS = 6000;

    const state = {
        enabled: false,
        panelVisible: false,
        panel: null,
        output: null,
        timer: 0,
        longTasks: [],
        samples: [],
        observer: null,
        bootAt: now(),
        lastSnapshot: null,
        lastSummary: null
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

    function shouldAutoEnable() {
        try {
            const url = new URL(global.location.href);
            if (url.searchParams.get('perf') === '1') return true;
            if (url.searchParams.get('foxbearPerf') === '1') return true;
        } catch (error) {}
        return readStorage() === 'on';
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
            labels: playing.slice(0, 4).map(audio => audio.dataset?.spectrumLabel || audio.dataset?.playbackRole || audio.getAttribute('aria-label') || 'audio')
        });
    }

    function getDomSnapshot() {
        const doc = global.document;
        const canvases = Array.from(doc?.querySelectorAll?.('canvas') || []);
        const connectedCanvases = canvases.filter(canvas => canvas.isConnected !== false);
        return Object.freeze({
            nodes: doc?.getElementsByTagName?.('*')?.length || 0,
            canvases: connectedCanvases.length,
            spectrumPanels: doc?.querySelectorAll?.('.spectrum-visualizer-panel')?.length || 0,
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

    function summarizeSnapshot(snapshot) {
        const longTaskMax = snapshot.longTasks.length ? Math.max(...snapshot.longTasks.map(item => Number(item.durationMs || 0))) : 0;
        const warnings = [];
        if (snapshot.audio.playing > 1) warnings.push('multiple-audio-playing');
        if (snapshot.audio.audible > 1) warnings.push('multiple-audible-audio');
        if (snapshot.dom.canvases > 6) warnings.push('many-canvas-nodes');
        if (snapshot.runtime && !snapshot.runtime.ok) warnings.push('runtime-health-check');
        if ((snapshot.importQueue?.active || 0) + (snapshot.importQueue?.pending || 0) > 0) warnings.push('bulk-import-active');
        if (snapshot.bulkImportHud && snapshot.bulkImportHud.total >= 2 && !snapshot.bulkImportHud.complete) warnings.push('bulk-import-hud-active');
        if ((snapshot.audioDecode?.activeDecodes || 0) > 0) warnings.push('audio-decode-active');
        if ((snapshot.audioContexts?.activeCount || 0) > 5) warnings.push('many-audio-contexts');
        if ((snapshot.audioContexts?.interruptedCount || 0) > 0) warnings.push('audio-context-interrupted');
        if ((snapshot.audioDecode?.failedCount || 0) > 0 && snapshot.audioDecode?.lastError) warnings.push('audio-decode-last-error');
        if ((snapshot.masteringQueue?.active || 0) > 0) warnings.push('mastering-active');
        if ((snapshot.memoryGuard?.masteredBufferCount || 0) > 2) warnings.push('mastered-buffer-retention');
        if (snapshot.wakeLock?.active && snapshot.wakeLock?.mode === 'auto') warnings.push('wake-lock-auto-active');
        if (snapshot.wakeLock?.lastError) warnings.push('wake-lock-last-error');
        if (snapshot.renderScheduler?.pending) warnings.push('render-queue-pending');
        if (snapshot.spectrum?.live && snapshot.dom.spectrumPanels < 1) warnings.push('spectrum-live-without-panel');
        if (longTaskMax >= 200) warnings.push('heavy-long-task');
        else if (longTaskMax >= 80) warnings.push('watch-long-task');
        const summary = Object.freeze({
            ok: warnings.length === 0,
            warnings: Object.freeze(warnings),
            longTaskMaxMs: round(longTaskMax, 1),
            audioPlaying: snapshot.audio.playing,
            audibleAudio: snapshot.audio.audible,
            canvases: snapshot.dom.canvases,
            spectrumPanels: snapshot.dom.spectrumPanels,
            importQueue: snapshot.importQueue ? { active: snapshot.importQueue.active || 0, pending: snapshot.importQueue.pending || 0 } : null,
            bulkImportHud: snapshot.bulkImportHud ? { total: snapshot.bulkImportHud.total || 0, done: snapshot.bulkImportHud.done || 0, percent: snapshot.bulkImportHud.percent || 0, expanded: Boolean(snapshot.bulkImportHud.expanded) } : null,
            audioDecode: snapshot.audioDecode ? { active: snapshot.audioDecode.activeDecodes || 0, completedCount: snapshot.audioDecode.completedCount || 0, failedCount: snapshot.audioDecode.failedCount || 0, lastDecodedPcmMB: snapshot.audioDecode.lastDecodedPcmMB || 0 } : null,
            audioContexts: snapshot.audioContexts ? { active: snapshot.audioContexts.activeCount || 0, running: snapshot.audioContexts.runningCount || 0, suspended: snapshot.audioContexts.suspendedCount || 0, byPurpose: snapshot.audioContexts.byPurpose || {} } : null,
            masteringQueue: snapshot.masteringQueue ? { active: snapshot.masteringQueue.active || 0, completedCount: snapshot.masteringQueue.completedCount || 0, failedCount: snapshot.masteringQueue.failedCount || 0 } : null,
            memoryGuard: snapshot.memoryGuard ? { completedCount: snapshot.memoryGuard.completedCount || 0, masteredBufferCount: snapshot.memoryGuard.masteredBufferCount || 0, masteredBufferBytes: snapshot.memoryGuard.masteredBufferBytes || 0, outBlobBytes: snapshot.memoryGuard.outBlobBytes || 0 } : null,
            wakeLock: snapshot.wakeLock ? { active: Boolean(snapshot.wakeLock.active), mode: snapshot.wakeLock.mode || 'off', settingLabel: snapshot.wakeLock.settingLabel || 'OFF', userEnabled: Boolean(snapshot.wakeLock.userEnabled) } : null,
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
        const spectrum = safeCall(() => global.FoxBearSpectrumVisualizer?.getDiagnostics?.(), null);
        const navigationGuard = safeCall(() => global.FoxBearSiteGuards?.getNavigationExitGuardState?.(), null);
        const playback = safeCall(() => global.FoxBearPlaybackLinkService?.getOrchestrationSnapshot?.(), null);
        const importQueue = safeCall(() => global.FoxBearBulkImportGuard?.getSnapshot?.(), null);
        const bulkImportHud = safeCall(() => global.FoxBearBulkImportHud?.getSnapshot?.(), null);
        const audioDecode = safeCall(() => global.FoxBearAudioDecodeService?.getDiagnostics?.(), null);
        const audioContexts = safeCall(() => global.FoxBearAudioContextManager?.getDiagnostics?.(), null);
        const renderScheduler = safeCall(() => global.FoxBearRenderScheduler?.getSnapshot?.(), null);
        const masteringQueue = safeCall(() => global.FoxBearMasteringGuard?.getSnapshot?.(), null);
        const wakeLock = safeCall(() => global.FoxBearWakeLockController?.getSnapshot?.(), null);
        const memoryGuard = safeCall(() => global.FoxBearMemoryGuard?.getSnapshot?.(), null);
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
            runtime: runtimeReport ? {
                ok: Boolean(runtimeReport.ok),
                appReady: Boolean(runtimeReport.appReady),
                resourceFailures: runtimeReport.resourceFailures?.length || 0,
                runtimeErrors: runtimeReport.runtimeErrors?.length || 0,
                runtimeWarnings: runtimeReport.runtimeWarnings?.length || 0,
                missingGlobals: runtimeReport.missingGlobals?.length || 0
            } : null,
            spectrum,
            navigationGuard,
            importQueue,
            bulkImportHud,
            audioDecode,
            audioContexts,
            masteringQueue,
            memoryGuard,
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
        const panel = global.document.createElement('section');
        panel.className = 'foxbear-perf-panel';
        panel.hidden = true;
        panel.setAttribute('aria-live', 'polite');
        panel.setAttribute('aria-label', 'FoxBear 성능 진단 패널');

        const header = global.document.createElement('div');
        header.className = 'foxbear-perf-panel-head';
        const title = global.document.createElement('strong');
        title.textContent = 'Performance diagnostics';
        const actions = global.document.createElement('div');
        actions.className = 'foxbear-perf-panel-actions';
        const refresh = global.document.createElement('button');
        refresh.type = 'button';
        refresh.className = 'foxbear-perf-panel-button';
        refresh.textContent = '새로고침';
        refresh.addEventListener('click', () => refreshPanel('manual-refresh'));
        const copy = global.document.createElement('button');
        copy.type = 'button';
        copy.className = 'foxbear-perf-panel-button';
        copy.textContent = '복사';
        copy.addEventListener('click', () => copySnapshotToClipboard());
        const clear = global.document.createElement('button');
        clear.type = 'button';
        clear.className = 'foxbear-perf-panel-button';
        clear.textContent = '초기화';
        clear.addEventListener('click', () => {
            clearHistory();
            refreshPanel('clear-history');
        });
        const close = global.document.createElement('button');
        close.type = 'button';
        close.className = 'foxbear-perf-panel-close';
        close.textContent = '닫기';
        close.addEventListener('click', () => setPanelVisible(false));
        actions.append(refresh, copy, clear, close);
        header.append(title, actions);

        const output = global.document.createElement('pre');
        output.className = 'foxbear-perf-panel-output';
        output.textContent = 'No snapshot yet';
        panel.append(header, output);
        global.document.body.appendChild(panel);
        state.panel = panel;
        state.output = output;
        return panel;
    }

    function formatPanel(snapshot) {
        const memory = snapshot.memory ? `${snapshot.memory.usedMB}/${snapshot.memory.totalMB}MB` : 'n/a';
        const spectrum = snapshot.spectrum ? `${snapshot.spectrum.live ? 'live' : 'static'} ${snapshot.spectrum.contextState || ''}`.trim() : 'n/a';
        const lines = [
            `version: ${snapshot.version}`,
            `hint: ${snapshot.frameBudgetHint} · visible: ${snapshot.visibility}`,
            `audio: ${snapshot.audio.playing}/${snapshot.audio.total} playing · audible ${snapshot.audio.audible}`,
            `canvas: ${snapshot.dom.canvases} · spectrum panels ${snapshot.dom.spectrumPanels}`,
            `memory: ${memory}`,
            `spectrum: ${spectrum}`,
            `runtime: ${snapshot.runtime ? (snapshot.runtime.ok ? 'ok' : 'check') : 'n/a'} · errors ${snapshot.runtime?.runtimeErrors ?? 0} · warnings ${snapshot.runtime?.runtimeWarnings ?? 0}`,
            `nav guard: ${snapshot.navigationGuard?.installed ? 'on' : 'off'} · confirm ${snapshot.navigationGuard?.confirmOpen ? 'open' : 'idle'}`,
            `long tasks: ${snapshot.longTasks.length}${snapshot.longTasks.length ? ' · max ' + Math.max(...snapshot.longTasks.map(item => item.durationMs || 0)) + 'ms' : ''}`,
            `warnings: ${(state.lastSummary?.warnings || []).join(', ') || 'none'}`
        ];
        if (snapshot.audio.labels.length) lines.push(`playing: ${snapshot.audio.labels.join(', ')}`);
        return lines.join('\n');
    }

    function refreshPanel(reason = 'panel') {
        const snapshot = collectSnapshot(reason);
        if (state.output) state.output.textContent = formatPanel(snapshot);
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

    function setPanelVisible(visible) {
        const panel = ensurePanel();
        state.panelVisible = Boolean(visible);
        if (panel) panel.hidden = !state.panelVisible;
        if (state.panelVisible) {
            setEnabled(true, { persist: true, silent: true });
            startPanelTimer();
        } else {
            stopPanelTimer();
        }
        try { global.dispatchEvent(new CustomEvent(TOGGLE_EVENT, { detail: { enabled: state.enabled, panelVisible: state.panelVisible } })); }
        catch (error) {}
        return state.panelVisible;
    }

    function togglePanel() {
        return setPanelVisible(!state.panelVisible);
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
        });
    }

    function installKeyboardToggle() {
        global.document?.addEventListener?.('keydown', event => {
            const key = String(event.key || '').toLowerCase();
            if ((event.ctrlKey || event.metaKey) && event.altKey && key === 'p') {
                event.preventDefault();
                togglePanel();
            }
        });
    }

    global.FoxBearPerformanceDiagnostics = Object.freeze({
        version: DIAGNOSTICS_VERSION,
        STORAGE_KEY,
        setEnabled,
        togglePanel,
        setPanelVisible,
        collectSnapshot,
        getSummary,
        serializeSnapshot,
        copySnapshotToClipboard,
        clearHistory,
        getSnapshot: () => state.lastSnapshot || collectSnapshot('getSnapshot'),
        getSamples: () => state.samples.slice(),
        getLongTasks: () => state.longTasks.slice()
    });

    installKeyboardToggle();
    installVisibilityTimerSync();
    if (shouldAutoEnable()) {
        setEnabled(true, { persist: false, silent: true });
        if (global.document?.readyState === 'loading') {
            global.document.addEventListener('DOMContentLoaded', () => setPanelVisible(true), { once: true });
        } else {
            setPanelVisible(true);
        }
    }
})(window);
