// FoxBear runtime health monitor - Stage14 runtime recovery
(function attachFoxBearRuntimeHealth(global) {
    'use strict';

    const FALLBACK_VERSION = '1.4.10-perf-polish';
    const BOOT_STALL_MS = 5200;
    const REQUIRED_GLOBALS = Object.freeze([
        'FoxBearRuntimeConfig',
        'FoxBearPerformanceDiagnostics.collectSnapshot',
        'FoxBearPerformanceDiagnostics.getSummary',
        'FoxBearCoreUtils',
        'FoxBearRecommendationEngine.createRecommendationEngine',
        'FoxBearMasteringInspector',
        'FoxBearHighlightCompareInspector.resolveCompareWindow',
        'FoxBearPlaybackLinkService.registerAudio',
        'FoxBearPlaybackLinkService.pauseAllExcept',
        'FoxBearPlaybackTransitionService.crossfadePair',
        'FoxBearWaveformControlService.setPlayhead',
        'FoxBearWaveformControlView.createBars',
        'FoxBearSpectrumVisualizer.renderPanel',
        'FoxBearSpectrumVisualizer.getDiagnostics',
        'FoxBearModalStateMachine.FoxBearModalStateMachine',
        'FoxBearDockController.FoxBearDockController',
        'FoxBearMobileNativeView.createMobileNativeLayer',
        'FoxBearSettingsService.applyToContext',
        'FoxBearDownloadService.downloadBlob',
        'FoxBearDownloadDialogView.showDownloadOptionsDialog',
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

    const state = {
        version: getSelfAssetVersion(),
        appReady: false,
        bootFailed: false,
        bootStalled: false,
        resourceFailures: [],
        runtimeErrors: [],
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

    function recordResourceFailure(target, reason) {
        const failure = normalizeResourceFailure(target, reason);
        if (!failure) return;
        uniquePush(state.resourceFailures, failure, item => `${item.tag}:${item.path}:${item.version}:${item.reason}`, 16);
        const report = check({ silent: true });
        showRecoveryPanel(report, { reason: 'resource-failure' });
        console.warn('[FoxBearRuntimeHealth] resource failed', failure, report);
    }

    function recordRuntimeError(error, reason) {
        const message = error?.message || String(error || 'unknown runtime error');
        uniquePush(state.runtimeErrors, Object.freeze({ reason, message, at: Date.now() }), item => `${item.reason}:${item.message}`, 12);
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

    function publishReport(report, options = {}) {
        state.lastReport = report;
        global.dispatchEvent(new CustomEvent('foxbear:runtime-health', { detail: report }));
        if (!report.ok && !options.silent) {
            setImportStatus(`앱 로딩 점검 필요: ${summarizeProblems(report)} · 아래 복구 패널에서 캐시 초기화를 시도하세요.`, 'warn');
            showRecoveryPanel(report, { reason: 'health-check' });
            console.warn('[FoxBearRuntimeHealth] runtime issues detected', report);
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

    function hardRefresh() {
        const url = new URL(global.location.href);
        url.searchParams.set('foxbearReload', String(Date.now()));
        global.location.replace(url.toString());
    }

    async function clearCachesAndReload() {
        try {
            if ('caches' in global) {
                const names = await global.caches.keys();
                await Promise.all(names.filter(name => /^foxbear-shell-/.test(name)).map(name => global.caches.delete(name)));
            }
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(reg => reg.unregister()));
            }
            sessionStorage.setItem('foxbearRuntimeRecovery', String(Date.now()));
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

    function runBootStallCheck() {
        if (state.appReady || state.bootFailed) return;
        state.bootStalled = true;
        const report = check({ silent: true });
        setImportStatus(`앱 초기화가 지연되고 있습니다: ${summarizeProblems(report)} · 캐시 초기화를 시도해 보세요.`, 'warn');
        showRecoveryPanel(report, { reason: 'boot-stall' });
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
