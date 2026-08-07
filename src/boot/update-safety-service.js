// FoxBear update safety diagnostics - synchronized release metadata
(function attachFoxBearUpdateSafety(global) {
    'use strict';

    const BUILD_INFO = global.FoxBearBuildInfo || {};
    const PATCH_ID = BUILD_INFO.assetVersion ? `v${BUILD_INFO.assetVersion}` : 'v1.6.74-incident-admission-spark-retention-download-memory';
    const EXPECTED_BOOT_KEY = BUILD_INFO.bootRevision || 'boot-sri-v1674';
    const BOOT_CRITICAL_RE = /(?:src\/boot\/runtime-health\.js|src\/boot\/performance-diagnostics\.js|src\/app\.js)$/;
    const LOCAL_ASSET_RE = /^(?:\.\/)?(?:src\/|assets\/|manifest\.webmanifest|sw\.js|vendor\/)/;
    const state = {
        lastReport: null,
        runtimeReports: [],
        lastCheckedAt: 0
    };

    function currentScriptVersion() {
        try {
            const script = document.currentScript;
            const raw = script?.getAttribute?.('src') || script?.src || '';
            const url = raw ? new URL(raw, global.location.href) : null;
            return url?.searchParams?.get('v') || global.FoxBearRuntimeHealth?.version || '';
        } catch (error) {
            return global.FoxBearRuntimeHealth?.version || '';
        }
    }

    function normalizeAsset(node) {
        const raw = node.getAttribute?.('src') || node.getAttribute?.('href') || '';
        if (!raw) return null;
        let url;
        try {
            url = new URL(raw, global.location.href);
        } catch (error) {
            return null;
        }
        const path = url.pathname.replace(/^\//, '');
        if (!LOCAL_ASSET_RE.test(path)) return null;
        const search = url.search || '';
        return Object.freeze({
            tag: node.tagName.toLowerCase(),
            path,
            src: raw,
            version: url.searchParams.get('v') || '',
            cacheBust: url.searchParams.get('h') || url.searchParams.get('ui') || '',
            hasIntegrity: Boolean(node.getAttribute?.('integrity')),
            isBootCritical: BOOT_CRITICAL_RE.test(path),
            isScript: node.tagName === 'SCRIPT',
            search
        });
    }

    function getAssetInventory() {
        return Array.from(document.querySelectorAll('script[src],link[href]'))
            .map(normalizeAsset)
            .filter(Boolean);
    }

    function getBootAssets(inventory = getAssetInventory()) {
        return inventory.filter(asset => asset.isBootCritical);
    }

    function findBootKeyMismatches(inventory = getAssetInventory()) {
        return getBootAssets(inventory)
            .filter(asset => asset.cacheBust !== EXPECTED_BOOT_KEY)
            .map(asset => `${asset.path}?h=${asset.cacheBust || 'missing'}`);
    }

    function findVersionMismatches(inventory = getAssetInventory()) {
        const expected = currentScriptVersion();
        if (!expected) return [];
        return inventory
            .filter(asset => asset.version && asset.version !== expected && !asset.path.startsWith('vendor/'))
            .map(asset => `${asset.path}?v=${asset.version}`);
    }

    function findMissingIntegrity(inventory = getAssetInventory()) {
        return inventory
            .filter(asset => (asset.path.endsWith('.js') || asset.path.endsWith('.css')) && !asset.path.startsWith('vendor/') && !asset.hasIntegrity)
            .map(asset => asset.path);
    }

    function summarizeRuntimeReport(runtimeReport) {
        if (!runtimeReport) return null;
        return Object.freeze({
            ok: Boolean(runtimeReport.ok),
            appReady: Boolean(runtimeReport.appReady),
            bootFailed: Boolean(runtimeReport.bootFailed),
            bootStalled: Boolean(runtimeReport.bootStalled),
            resourceFailures: Array.isArray(runtimeReport.resourceFailures) ? runtimeReport.resourceFailures.slice() : [],
            missingGlobals: Array.isArray(runtimeReport.missingGlobals) ? runtimeReport.missingGlobals.slice() : [],
            assetVersionMismatches: Array.isArray(runtimeReport.assetVersionMismatches) ? runtimeReport.assetVersionMismatches.slice() : []
        });
    }

    function classifyRisk(runtimeReport, inventory) {
        const bootKeyMismatches = findBootKeyMismatches(inventory);
        const versionMismatches = findVersionMismatches(inventory);
        const missingIntegrity = findMissingIntegrity(inventory);
        const runtime = summarizeRuntimeReport(runtimeReport || global.FoxBearRuntimeHealth?.getReport?.());
        const sriBlocks = runtime?.resourceFailures?.filter(item => /sri|load-error/i.test(item.reason || '') && /\.js(?:$|\?)/.test(item.path || '')) || [];
        const bootScriptBlocks = sriBlocks.filter(item => /src\/boot\/performance-diagnostics\.js|src\/app\.js|src\/boot\/runtime-health\.js/.test(item.path || ''));
        let level = 'ok';
        if (bootScriptBlocks.length || runtime?.bootStalled || runtime?.bootFailed) level = 'critical';
        else if (sriBlocks.length || bootKeyMismatches.length || versionMismatches.length) level = 'warn';
        else if (missingIntegrity.length) level = 'info';
        return Object.freeze({ level, bootKeyMismatches, versionMismatches, missingIntegrity, sriBlocks, bootScriptBlocks, runtime });
    }

    function getRecoveryPlan(risk) {
        const active = risk || classifyRisk(null, getAssetInventory());
        if (active.level === 'critical') {
            return Object.freeze([
                'Runtime Health 복구 패널에서 캐시 초기화 후 재시도를 실행합니다.',
                '같은 문제가 반복되면 배포 서버/CDN이 최신 index.html과 JS를 같은 세대로 제공하는지 확인합니다.',
                '직접 확인 시 app.js, performance-diagnostics.js, runtime-health.js의 h=boot-sri-v1674와 SRI가 일치해야 합니다.'
            ]);
        }
        if (active.level === 'warn') {
            return Object.freeze([
                '새로고침 후 FoxBearUpdateSafety.getReport()를 다시 확인합니다.',
                'service worker cache generation과 index.html asset cache key가 같은 패치 세대인지 확인합니다.'
            ]);
        }
        return Object.freeze(['업데이트 안전성 문제가 감지되지 않았습니다.']);
    }

    function buildReport(runtimeReport) {
        const inventory = getAssetInventory();
        const risk = classifyRisk(runtimeReport, inventory);
        const report = Object.freeze({
            ok: risk.level === 'ok' || risk.level === 'info',
            patchId: PATCH_ID,
            expectedBootKey: EXPECTED_BOOT_KEY,
            assetVersion: currentScriptVersion(),
            riskLevel: risk.level,
            bootAssets: getBootAssets(inventory),
            bootKeyMismatches: risk.bootKeyMismatches,
            versionMismatches: risk.versionMismatches,
            missingIntegrity: risk.missingIntegrity,
            sriBlocks: risk.sriBlocks,
            bootScriptBlocks: risk.bootScriptBlocks,
            runtime: risk.runtime,
            recoveryPlan: getRecoveryPlan(risk),
            checkedAt: Date.now()
        });
        state.lastReport = report;
        state.lastCheckedAt = report.checkedAt;
        return report;
    }

    function getReport() {
        return state.lastReport || buildReport();
    }

    function check(runtimeReport) {
        const report = buildReport(runtimeReport);
        if (!report.ok || report.riskLevel === 'critical' || report.riskLevel === 'warn') {
            global.dispatchEvent(new CustomEvent('foxbear:update-safety-risk', { detail: report }));
            console.warn('[FoxBearUpdateSafety] update safety risk', report);
        }
        return report;
    }

    async function copyReport() {
        const text = JSON.stringify(getReport(), null, 2);
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        console.warn('[FoxBearUpdateSafety] report', text);
        return false;
    }

    global.addEventListener('foxbear:runtime-health', event => {
        const runtimeReport = event.detail || null;
        state.runtimeReports.push(runtimeReport);
        while (state.runtimeReports.length > 8) state.runtimeReports.shift();
        check(runtimeReport);
    });

    document.addEventListener('DOMContentLoaded', () => {
        global.setTimeout(() => check(global.FoxBearRuntimeHealth?.getReport?.()), 1200);
    });

    global.FoxBearUpdateSafety = Object.freeze({
        patchId: PATCH_ID,
        expectedBootKey: EXPECTED_BOOT_KEY,
        getAssetInventory,
        getBootAssets,
        findBootKeyMismatches,
        findVersionMismatches,
        findMissingIntegrity,
        getRecoveryPlan,
        check,
        getReport,
        copyReport
    });
})(window);
