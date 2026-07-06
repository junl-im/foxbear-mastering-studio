// FoxBear runtime health monitor - Stage13
(function attachFoxBearRuntimeHealth(global) {
    'use strict';

    const FALLBACK_VERSION = '1.3.84-stage13-runtime-safety';
    const REQUIRED_GLOBALS = Object.freeze([
        'FoxBearRuntimeConfig',
        'FoxBearCoreUtils',
        'FoxBearRecommendationEngine.createRecommendationEngine',
        'FoxBearMasteringInspector',
        'FoxBearModalStateMachine.FoxBearModalStateMachine',
        'FoxBearDockController.FoxBearDockController',
        'FoxBearMobileNativeView.createMobileNativeLayer',
        'FoxBearDownloadService.downloadBlob',
        'FoxBearDownloadDialogView.showDownloadOptionsDialog',
        'FoxBearWaveformCompareView.renderWaveformCompareDialog',
        'FoxBearDetailView.renderDetail',
        'FoxBearSiteGuards.runSiteAccessGuard'
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

    const state = {
        version: getSelfAssetVersion(),
        appReady: false,
        bootFailed: false,
        lastReport: null,
        firstCheckedAt: 0
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
        const ok = missingGlobals.length === 0 && missingDomIds.length === 0 && assetVersionMismatches.length === 0 && !state.bootFailed;
        return Object.freeze({
            ok,
            appReady: state.appReady,
            bootFailed: state.bootFailed,
            version: state.version,
            missingGlobals,
            missingDomIds,
            assetVersionMismatches,
            checkedAt: Date.now()
        });
    }

    function setImportStatus(message, mode) {
        const target = document.getElementById('importStatus');
        if (!target || state.appReady) return;
        target.textContent = message;
        if (mode) target.dataset.status = mode;
    }

    function publishReport(report, options = {}) {
        state.lastReport = report;
        global.dispatchEvent(new CustomEvent('foxbear:runtime-health', { detail: report }));
        if (!report.ok && !options.silent) {
            const problems = [];
            if (report.missingGlobals.length) problems.push(`모듈 ${report.missingGlobals.length}개`);
            if (report.missingDomIds.length) problems.push(`DOM ${report.missingDomIds.length}개`);
            if (report.assetVersionMismatches.length) problems.push('캐시 버전 불일치');
            setImportStatus(`앱 로딩 점검 필요: ${problems.join(', ')} · 새로고침 후에도 반복되면 최신 overwrite를 다시 적용하세요.`, 'warn');
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
        return check({ silent: true });
    }

    function markBootFailed(error) {
        state.bootFailed = true;
        const report = check({ silent: true });
        console.warn('[FoxBearRuntimeHealth] app boot failed', error, report);
        return report;
    }

    document.addEventListener('DOMContentLoaded', () => {
        global.setTimeout(() => check({ silent: false }), 900);
    });

    global.FoxBearRuntimeHealth = Object.freeze({
        version: state.version,
        requiredGlobals: REQUIRED_GLOBALS,
        requiredDomIds: REQUIRED_DOM_IDS,
        check,
        getReport: () => state.lastReport || buildReport(),
        markAppReady,
        markBootFailed
    });
})(window);
