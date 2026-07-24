// FoxBear runtime health monitor - v1.5.5 update safety
(function attachFoxBearRuntimeHealth(global) {
    'use strict';

    const FALLBACK_VERSION = '1.5.98-worker-retry-health-levels';
    const RUNTIME_SCRIPT_URL = (() => {
        try {
            const current = document.currentScript?.src || '';
            if (current) return new URL(current, global.location.href);
            const match = Array.from(document.scripts || []).find(script => /(?:^|\/)src\/boot\/runtime-health\.js(?:[?#]|$)/.test(script.src || script.getAttribute?.('src') || ''));
            return match?.src ? new URL(match.src, global.location.href) : null;
        } catch (error) {
            return null;
        }
    })();
    const APP_ROOT_URL = (() => {
        try {
            if (RUNTIME_SCRIPT_URL) return new URL('../../', RUNTIME_SCRIPT_URL);
            const fallback = new URL(global.location.href);
            fallback.search = '';
            fallback.hash = '';
            fallback.pathname = fallback.pathname.replace(/[^/]*$/, '');
            return fallback;
        } catch (error) {
            return null;
        }
    })();
    if (global.FoxBearBuildInfo?.assetVersion && global.FoxBearBuildInfo.assetVersion !== FALLBACK_VERSION) console.warn('[FoxBear] runtime health metadata mismatch', { fallback: FALLBACK_VERSION, build: global.FoxBearBuildInfo.assetVersion });
    const BOOT_STALL_MS = 5200;
    const REQUIRED_GLOBALS = Object.freeze([
        'FoxBearRuntimeConfig',
        'FoxBearReleasePresentation.getReport',
        'FoxBearUpdateSafety.getReport',
        'FoxBearUpdateSafety.getRecoveryPlan',
        'FoxBearServiceWorkerRecoveryService.consumeOneShotBypass',
        'FoxBearPerformanceDiagnostics.collectSnapshot',
        'FoxBearPerformanceDiagnostics.getSummary',
        'FoxBearSessionHandoff.attachToUrl',
        'FoxBearMasteringMemoryDiagnostics.capture',
        'FoxBearCoreUtils',
        'FoxBearWorkerJobService.run',
        'FoxBearRecommendationEngine.createRecommendationEngine',
        'FoxBearMasteringInspector',
        'FoxBearHighlightCompareInspector.resolveCompareWindow',
        'FoxBearPlaybackLinkService.registerAudio',
        'FoxBearPlaybackLinkService.pauseAllExcept',
        'FoxBearPlaybackTransitionService.crossfadePair',
        'FoxBearPlaybackTransitionService.waitForMediaReady',
        'FoxBearAudioContextManager.getDiagnostics',
        'FoxBearAudioDecodeService.decodeAudioFile',
        'FoxBearAudioDecodeService.getDiagnostics',
        'FoxBearInAppMasteringSafetyService.createPlan',
        'FoxBearInAppMasteringSafetyService.shouldPreserveFirstRender',
        'FoxBearMasteringInputGuard.assertMasterable',
        'FoxBearWaveformControlService.setPlayhead',
        'FoxBearWaveformControlView.createBars',
        'FoxBearSpectrumVisualizer.renderPanel',
        'FoxBearSpectrumVisualizer.unregisterAudio',
        'FoxBearSpectrumVisualizer.pruneDisconnectedAudio',
        'FoxBearSpectrumVisualizer.getDiagnostics',
        'FoxBearModalStateMachine.FoxBearModalStateMachine',
        'FoxBearDockController.FoxBearDockController',
        'FoxBearMobileNativeView.createMobileNativeLayer',
        'FoxBearWakeLockController.getSnapshot',
        'FoxBearSettingsService.applyToContext',
        'FoxBearDownloadService.downloadBlob',
        'FoxBearDownloadService.copyDownloadTroubleshootingGuide',
        'FoxBearDownloadService.getDownloadCapabilitySummary',
        'FoxBearDownloadService.getRecommendedDownloadFlow',
        'FoxBearDownloadService.getDownloadActionReceipt',
        'FoxBearDownloadService.getDownloadRecoveryChecklist',
        'FoxBearDownloadService.getDownloadCompactRecoveryPlan',
        'FoxBearDownloadService.getDownloadDialogCompactHint',
        'FoxBearDownloadService.getDownloadDialogDisplayProfile',
        'FoxBearDownloadService.copyDownloadRecoveryChecklist',
        'FoxBearDownloadService.getDownloadDiagnostics',
        'FoxBearDownloadService.copyDownloadDiagnostics',
        'FoxBearExportGuardService.prepareZipExportPlan',
        'FoxBearExportProgressView.begin',
        'FoxBearZipExportService.start',
        'FoxBearExportQueueService.start',
        'FoxBearDownloadDialogView.showDownloadOptionsDialog',
        'FoxBearBulkImportGuard.getSnapshot',
        'FoxBearBulkImportHud.getSnapshot',
        'FoxBearMasteringGuard.getSnapshot',
        'FoxBearMasteringDiagnostics.getSnapshot',
        'FoxBearRenderScheduler.getSnapshot',
        'FoxBearWaveformCompareView.renderWaveformCompareDialog',
        'FoxBearDetailPanelsView.renderQualityGatePanel',
        'FoxBearDetailView.renderDetail',
        'FoxBearSiteGuards.runSiteAccessGuard',
        'FoxBearSiteGuards.getNavigationExitGuardState'
    ]);
    const REQUIRED_DOM_IDS = Object.freeze([
        'fileInput',
        'folderInput',
        'importStatus',
        'bottomPreviewDock',
        'bottomPreviewPlayer',
        'trackList',
        'trackDetail'
    ]);
    const LOCAL_ASSET_RE = /^(?:\.\/)?(?:src\/|assets\/|manifest\.webmanifest|sw\.js)/;
    const RESOURCE_TAGS = new Set(['SCRIPT', 'LINK', 'IMG', 'SOURCE']);
    const AUTO_RECOVERY_KEY = 'foxbearAutoGenerationRecovery';
    let generationProbePromise = null;

    const state = {
        version: getSelfAssetVersion(),
        appReady: false,
        bootFailed: false,
        bootStalled: false,
        resourceFailures: [],
        runtimeErrors: [],
        runtimeWarnings: [],
        lastReport: null,
        firstCheckedAt: 0,
        panel: null,
        panelVisible: false
    };

    function getSelfAssetVersion() {
        try {
            const script = document.currentScript;
            const raw = script?.getAttribute?.('src') || script?.src || '';
            const url = raw ? new URL(raw, global.location.href) : null;
            return url?.searchParams?.get('v') || FALLBACK_VERSION;
        } catch (error) {
            return FALLBACK_VERSION;
        }
    }

    function readPath(root, dottedPath) {
        return dottedPath.split('.').reduce((value, key) => (value == null ? undefined : value[key]), root);
    }

    function uniquePush(list, item, keyFn, limit) {
        const key = keyFn(item);
        if (!list.some(existing => keyFn(existing) === key)) list.push(item);
        while (list.length > limit) list.shift();
    }

    function getResourceUrl(target) {
        if (!target || target === global || !RESOURCE_TAGS.has(target.tagName)) return '';
        return target.getAttribute?.('src') || target.getAttribute?.('href') || target.currentSrc || '';
    }

    function normalizeResourceFailure(target, reason) {
        const url = getResourceUrl(target);
        if (!url) return null;
        let parsedPath = url;
        let version = '';
        try {
            const parsed = new URL(url, global.location.href);
            parsedPath = parsed.pathname.replace(/^\//, '');
            version = parsed.searchParams.get('v') || '';
        } catch (error) {}
        return Object.freeze({
            tag: target.tagName.toLowerCase(),
            path: parsedPath,
            version,
            reason: reason || 'resource-error',
            at: Date.now()
        });
    }

    function dispatchRuntimeIssue(type, detail = {}) {
        try { global.dispatchEvent(new CustomEvent('foxbear:runtime-issue', { detail: { type, ...detail } })); }
        catch (error) {}
    }

    function recordResourceFailure(target, reason) {
        const failure = normalizeResourceFailure(target, reason);
        if (!failure) return;
        uniquePush(state.resourceFailures, failure, item => `${item.tag}:${item.path}:${item.version}:${item.reason}`, 16);
        const report = check({ silent: true });
        showRecoveryPanel(report, { reason: 'resource-failure' });
        dispatchRuntimeIssue('resource', { failure, report });
        console.warn('[FoxBearRuntimeHealth] resource failed', failure, report);
    }

    function normalizeRuntimeIssue(error, reason) {
        const message = error?.message || String(error || 'unknown runtime error');
        const code = error?.code || error?.name || '';
        const stack = typeof error?.stack === 'string' ? error.stack.slice(0, 1200) : '';
        return Object.freeze({ reason, message, code: String(code || ''), stack, at: Date.now() });
    }

    function isOptionalRemoteRuntimeIssue(issue) {
        const text = `${issue.code} ${issue.message} ${issue.stack}`;
        const firebaseIdentity = /firebase|firestore|remote config|identitytoolkit|firebaseio|googleapis|gstatic/i.test(text);
        const networkFailure = /network-request-failed|failed to fetch|could not reach|client is offline|backend didn't respond|backend did not respond|unavailable|err_name_not_resolved|err_connection_|networkerror/i.test(text);
        return firebaseIdentity && networkFailure;
    }

    function recordRuntimeError(error, reason) {
        const issue = normalizeRuntimeIssue(error, reason);
        const optional = isOptionalRemoteRuntimeIssue(issue);
        const target = optional ? state.runtimeWarnings : state.runtimeErrors;
        uniquePush(target, issue, item => `${item.reason}:${item.code}:${item.message}`, 12);
        dispatchRuntimeIssue(optional ? 'warning' : (reason === 'boot-failed' ? 'boot' : 'runtime'), { issue, optional });
    }

    function findMissingGlobals() {
        return REQUIRED_GLOBALS.filter(name => readPath(global, name) == null);
    }

    function findMissingDomIds() {
        return REQUIRED_DOM_IDS.filter(id => !document.getElementById(id));
    }

    function extractAssetVersion(rawUrl) {
        try {
            const url = new URL(rawUrl, global.location.href);
            const localPath = url.pathname.replace(/^\//, '');
            if (!LOCAL_ASSET_RE.test(localPath)) return null;
            return { path: localPath, version: url.searchParams.get('v') || '' };
        } catch (error) {
            return null;
        }
    }

    function findAssetVersionMismatches() {
        const expected = state.version;
        const nodes = Array.from(document.querySelectorAll('script[src], link[href], img[src]'));
        return nodes
            .map(node => extractAssetVersion(node.getAttribute('src') || node.getAttribute('href') || ''))
            .filter(Boolean)
            .filter(item => item.version && item.version !== expected)
            .map(item => `${item.path}?v=${item.version}`);
    }

    function buildReport() {
        const missingGlobals = findMissingGlobals();
        const missingDomIds = document.readyState === 'loading' ? [] : findMissingDomIds();
        const assetVersionMismatches = findAssetVersionMismatches();
        const ok = missingGlobals.length === 0
            && missingDomIds.length === 0
            && assetVersionMismatches.length === 0
            && state.resourceFailures.length === 0
            && !state.bootFailed
            && !state.bootStalled;
        return Object.freeze({
            ok,
            appReady: state.appReady,
            bootFailed: state.bootFailed,
            bootStalled: state.bootStalled,
            version: state.version,
            missingGlobals,
            missingDomIds,
            assetVersionMismatches,
            resourceFailures: state.resourceFailures.slice(),
            runtimeErrors: state.runtimeErrors.slice(),
            runtimeWarnings: state.runtimeWarnings.slice(),
            checkedAt: Date.now()
        });
    }

    function setImportStatus(message, mode) {
        const target = document.getElementById('importStatus');
        if (!target || state.appReady) return;
        target.textContent = message;
        if (mode) target.dataset.status = mode;
    }

    function summarizeProblems(report) {
        const problems = [];
        if (report.resourceFailures.length) problems.push(`리소스 ${report.resourceFailures.length}개`);
        if (report.missingGlobals.length) problems.push(`모듈 ${report.missingGlobals.length}개`);
        if (report.missingDomIds.length) problems.push(`DOM ${report.missingDomIds.length}개`);
        if (report.assetVersionMismatches.length) problems.push('캐시 버전 불일치');
        if (report.bootFailed) problems.push('앱 boot 실패');
        if (report.bootStalled) problems.push('앱 boot 지연');
        return problems.join(', ') || '알 수 없는 로딩 문제';
    }

    async function probeDeployedGeneration() {
        if (generationProbePromise || !APP_ROOT_URL || !global.fetch) return generationProbePromise;
        generationProbePromise = (async () => {
            try {
                const probe = new URL('index.html', APP_ROOT_URL);
                probe.searchParams.set('foxbearGenerationProbe', String(Date.now()));
                const response = await global.fetch(probe.href, { cache: 'no-store', redirect: 'follow' });
                if (!response.ok) return '';
                const html = await response.text();
                return html.match(/src\/config\/build-info\.js\?v=([^"&]+)/)?.[1] || '';
            } catch (error) {
                return '';
            }
        })();
        return generationProbePromise;
    }

    async function recoverStaleGeneration(report) {
        if (!report.resourceFailures.length || state.appReady && report.resourceFailures.length < 3) return false;
        const deployed = await probeDeployedGeneration();
        if (!deployed || deployed === state.version) return false;
        try {
            if (sessionStorage.getItem(AUTO_RECOVERY_KEY) === deployed) return false;
            sessionStorage.setItem(AUTO_RECOVERY_KEY, deployed);
        } catch (error) {}
        await clearCachesAndReload();
        return true;
    }

    function publishReport(report, options = {}) {
        state.lastReport = report;
        global.dispatchEvent(new CustomEvent('foxbear:runtime-health', { detail: report }));
        if (!report.ok && !options.silent) {
            setImportStatus(`앱 로딩 점검 필요: ${summarizeProblems(report)} · 아래 복구 패널에서 캐시 초기화를 시도하세요.`, 'warn');
            showRecoveryPanel(report, { reason: 'health-check' });
            console.warn('[FoxBearRuntimeHealth] runtime issues detected', report);
            recoverStaleGeneration(report).catch(error => console.warn('[FoxBearRuntimeHealth] generation recovery probe failed', error));
        }
        return report;
    }

    function check(options = {}) {
        if (!state.firstCheckedAt) state.firstCheckedAt = Date.now();
        return publishReport(buildReport(), options);
    }

    function markAppReady() {
        state.appReady = true;
        state.bootStalled = false;
        hideRecoveryPanel();
        return check({ silent: true });
    }

    function markBootFailed(error) {
        state.bootFailed = true;
        recordRuntimeError(error, 'boot-failed');
        const report = check({ silent: true });
        showRecoveryPanel(report, { reason: 'boot-failed' });
        console.warn('[FoxBearRuntimeHealth] app boot failed', error, report);
        return report;
    }

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function appendButton(parent, label, handler) {
        const button = element('button', 'runtime-recovery-button', label);
        button.type = 'button';
        button.addEventListener('click', handler);
        parent.appendChild(button);
        return button;
    }

    function explainReport(report) {
        const lines = [];
        if (report.resourceFailures.length) {
            lines.push(`차단/실패 리소스: ${report.resourceFailures.map(item => item.path).slice(0, 3).join(', ')}`);
        }
        if (report.assetVersionMismatches.length) {
            lines.push(`버전 불일치: ${report.assetVersionMismatches.slice(0, 3).join(', ')}`);
        }
        if (report.missingGlobals.length) {
            lines.push(`누락 모듈: ${report.missingGlobals.slice(0, 3).join(', ')}`);
        }
        if (report.missingDomIds.length) {
            lines.push(`누락 DOM: ${report.missingDomIds.join(', ')}`);
        }
        if (report.bootFailed || report.bootStalled) {
            lines.push(report.bootFailed ? '앱 초기화 실패가 감지되었습니다.' : '앱 초기화 완료 신호가 늦어지고 있습니다.');
        }
        return lines.length ? lines.join(' · ') : '자세한 내용은 브라우저 콘솔의 FoxBearRuntimeHealth 리포트를 확인하세요.';
    }

    function ensurePanel() {
        if (state.panel) return state.panel;
        if (!document.body) return null;
        const panel = element('section', 'runtime-recovery-panel');
        panel.setAttribute('role', 'status');
        panel.setAttribute('aria-live', 'polite');
        panel.hidden = true;

        const header = element('div', 'runtime-recovery-header');
        const title = element('strong', 'runtime-recovery-title', '앱 로딩 복구');
        const close = element('button', 'runtime-recovery-close', '×');
        close.type = 'button';
        close.setAttribute('aria-label', '복구 패널 닫기');
        close.addEventListener('click', hideRecoveryPanel);
        header.append(title, close);

        const summary = element('p', 'runtime-recovery-summary');
        const details = element('p', 'runtime-recovery-details');
        const actions = element('div', 'runtime-recovery-actions');
        appendButton(actions, '새로고침', hardRefresh);
        appendButton(actions, '캐시 초기화 후 재시도', clearCachesAndReload);
        appendButton(actions, '리포트 복사', copyReport);
        appendButton(actions, '업데이트 점검 복사', copyUpdateSafetyReport);

        panel.append(header, summary, details, actions);
        document.body.appendChild(panel);
        state.panel = panel;
        return panel;
    }

    function renderPanel(report) {
        const panel = ensurePanel();
        if (!panel) return null;
        const summary = panel.querySelector('.runtime-recovery-summary');
        const details = panel.querySelector('.runtime-recovery-details');
        if (summary) summary.textContent = `감지: ${summarizeProblems(report)}`;
        if (details) details.textContent = explainReport(report);
        return panel;
    }

    function showRecoveryPanel(report = buildReport(), options = {}) {
        if (report.ok && options.reason !== 'manual') return;
        const display = () => {
            const panel = renderPanel(report);
            if (!panel) return;
            panel.hidden = false;
            state.panelVisible = true;
        };
        if (document.body) display();
        else document.addEventListener('DOMContentLoaded', display, { once: true });
    }

    function hideRecoveryPanel() {
        if (!state.panel) return;
        state.panel.hidden = true;
        state.panelVisible = false;
    }

    function getCanonicalRecoveryUrl() {
        const url = new URL(APP_ROOT_URL || global.location.href);
        url.search = '';
        url.hash = '';
        url.searchParams.set('foxbearReload', String(Date.now()));
        url.searchParams.set('foxbearRecovery', 'asset-generation');
        return url;
    }

    function hardRefresh() {
        global.location.replace(getCanonicalRecoveryUrl().toString());
    }

    async function clearCachesAndReload() {
        try {
            if ('caches' in global) {
                const names = await global.caches.keys();
                await Promise.all(names
                    .filter(name => /^foxbear-|^workbox-|^precache-/i.test(name))
                    .map(name => global.caches.delete(name)));
            }
            if ('serviceWorker' in navigator) {
                const controller = navigator.serviceWorker.controller;
                try { controller?.postMessage?.({ type: 'FOXBEAR_PURGE_CACHES' }); } catch (error) {}
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(async reg => {
                    try { await reg.update?.(); } catch (error) {}
                    try { reg.active?.postMessage?.({ type: 'FOXBEAR_PURGE_CACHES' }); } catch (error) {}
                    return reg.unregister();
                }));
            }
            sessionStorage.setItem('foxbearRuntimeRecovery', String(Date.now()));
            sessionStorage.setItem('foxbearBypassSwOnce', '1');
        } catch (error) {
            console.warn('[FoxBearRuntimeHealth] cache recovery failed', error);
        }
        hardRefresh();
    }

    async function copyReport() {
        const report = state.lastReport || buildReport();
        const text = JSON.stringify(report, null, 2);
        try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
            setImportStatus('런타임 점검 리포트를 클립보드에 복사했습니다.', 'ready');
        } catch (error) {
            console.warn('[FoxBearRuntimeHealth] report copy fallback', text);
            setImportStatus('리포트 복사 권한이 없어 콘솔에 리포트를 남겼습니다.', 'warn');
        }
    }

    async function copyUpdateSafetyReport() {
        try {
            if (global.FoxBearUpdateSafety?.copyReport) {
                await global.FoxBearUpdateSafety.copyReport();
                setImportStatus('업데이트 안전성 리포트를 클립보드에 복사했습니다.', 'ready');
                return;
            }
        } catch (error) {
            console.warn('[FoxBearRuntimeHealth] update safety report copy failed', error);
        }
        setImportStatus('업데이트 안전성 모듈을 찾지 못했습니다. 런타임 리포트를 먼저 복사하세요.', 'warn');
    }

    function runBootStallCheck() {
        if (state.appReady || state.bootFailed) return;
        state.bootStalled = true;
        const report = check({ silent: true });
        setImportStatus(`앱 초기화가 지연되고 있습니다: ${summarizeProblems(report)} · 캐시 초기화를 시도해 보세요.`, 'warn');
        showRecoveryPanel(report, { reason: 'boot-stall' });
        dispatchRuntimeIssue('boot', { issue: { reason: 'boot-stalled', message: 'App boot stalled', code: 'FOXBEAR_BOOT_STALLED', stack: '', at: Date.now() }, report });
        console.warn('[FoxBearRuntimeHealth] app boot stalled', report);
    }

    global.addEventListener('error', event => {
        const resourceUrl = getResourceUrl(event.target);
        if (resourceUrl) {
            recordResourceFailure(event.target, 'load-error-or-sri-block');
            return;
        }
        recordRuntimeError(event.error || event.message, 'window-error');
    }, true);

    global.addEventListener('unhandledrejection', event => {
        recordRuntimeError(event.reason, 'unhandledrejection');
    });

    document.addEventListener('DOMContentLoaded', () => {
        global.setTimeout(() => check({ silent: false }), 900);
        global.setTimeout(runBootStallCheck, BOOT_STALL_MS);
    });

    global.FoxBearRuntimeHealth = Object.freeze({
        version: state.version,
        requiredGlobals: REQUIRED_GLOBALS,
        requiredDomIds: REQUIRED_DOM_IDS,
        check,
        getReport: () => state.lastReport || buildReport(),
        showRecoveryPanel: () => showRecoveryPanel(state.lastReport || buildReport(), { reason: 'manual' }),
        clearCachesAndReload,
        hardRefresh,
        markAppReady,
        markBootFailed
    });
})(window);
