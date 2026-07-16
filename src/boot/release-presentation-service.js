// FoxBear release presentation synchronizer.
(function attachFoxBearReleasePresentation(global) {
    'use strict';

    const BUILD_INFO = global.FoxBearBuildInfo || {};
    const PRODUCT_VERSION = String(BUILD_INFO.productVersion || '').trim();
    const APP_VERSION = String(BUILD_INFO.appVersion || (PRODUCT_VERSION ? `Pro v${PRODUCT_VERSION}` : '')).trim();
    const ASSET_VERSION = String(BUILD_INFO.assetVersion || '').trim();
    const CACHE_NAME = String(BUILD_INFO.cacheName || '').trim();
    const VERSION_LABEL = PRODUCT_VERSION ? `v${PRODUCT_VERSION}` : '';
    const state = {
        lastReport: null,
        serviceWorkerReport: null,
        appliedAt: 0
    };

    function textOf(node) {
        return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function setText(selector, expected, mismatches) {
        const nodes = Array.from(document.querySelectorAll(selector));
        nodes.forEach(node => {
            const before = textOf(node);
            if (before !== expected) mismatches.push(Object.freeze({ selector, before, expected }));
            node.textContent = expected;
        });
        return nodes.length;
    }

    function apply() {
        const mismatches = [];
        if (!PRODUCT_VERSION) {
            const report = Object.freeze({ ok: false, reason: 'missing-build-info', mismatches: Object.freeze([]), checkedAt: Date.now() });
            state.lastReport = report;
            return report;
        }

        const body = document.body;
        const root = document.documentElement;
        const expectedTitle = `FoxBear Mastering PRO ${VERSION_LABEL}`;
        const expectedDescription = `FoxBear AI Mastering Studio Pro ${VERSION_LABEL} - ${BUILD_INFO.buildId || 'browser mastering release'}`;

        if (body) {
            const before = String(body.dataset.build || '');
            if (before !== PRODUCT_VERSION) mismatches.push(Object.freeze({ selector: 'body[data-build]', before, expected: PRODUCT_VERSION }));
            body.dataset.build = PRODUCT_VERSION;
            body.dataset.assetVersion = ASSET_VERSION;
            body.dataset.releaseBuild = String(BUILD_INFO.buildId || '');
        }
        if (root) {
            root.dataset.foxbearVersion = PRODUCT_VERSION;
            root.dataset.foxbearAssetVersion = ASSET_VERSION;
        }

        if (document.title !== expectedTitle) {
            mismatches.push(Object.freeze({ selector: 'title', before: document.title, expected: expectedTitle }));
            document.title = expectedTitle;
        }

        const description = document.querySelector('meta[name="description"]');
        if (description) {
            const before = String(description.getAttribute('content') || '');
            if (!before.includes(VERSION_LABEL)) mismatches.push(Object.freeze({ selector: 'meta[name="description"]', before, expected: expectedDescription }));
            description.setAttribute('content', expectedDescription);
        }

        setText('[data-release-label="version-button"]', VERSION_LABEL, mismatches);
        setText('[data-release-label="program-eyebrow"]', `FoxBear Mastering PRO ${VERSION_LABEL}`, mismatches);
        setText('[data-release-label="version-only"]', VERSION_LABEL, mismatches);
        setText('[data-release-label="app-version"]', APP_VERSION, mismatches);

        const report = Object.freeze({
            ok: true,
            recoveredStaticMismatch: mismatches.length > 0,
            productVersion: PRODUCT_VERSION,
            appVersion: APP_VERSION,
            assetVersion: ASSET_VERSION,
            cacheName: CACHE_NAME,
            buildId: String(BUILD_INFO.buildId || ''),
            mismatches: Object.freeze(mismatches.slice()),
            checkedAt: Date.now()
        });
        state.lastReport = report;
        state.appliedAt = report.checkedAt;
        if (mismatches.length) console.warn('[FoxBearReleasePresentation] repaired stale release labels', report);
        try { global.dispatchEvent(new CustomEvent('foxbear:release-presentation', { detail: report })); } catch (error) {}
        return report;
    }

    function requestServiceWorkerReleaseInfo(timeoutMs = 1400) {
        const controller = navigator.serviceWorker?.controller;
        if (!controller || typeof MessageChannel !== 'function') {
            return Promise.resolve(Object.freeze({ available: false, matches: null, reason: 'no-controller' }));
        }
        return new Promise(resolve => {
            const channel = new MessageChannel();
            let settled = false;
            const finish = result => {
                if (settled) return;
                settled = true;
                global.clearTimeout(timer);
                try { channel.port1.close(); } catch (error) {}
                const report = Object.freeze(result);
                state.serviceWorkerReport = report;
                resolve(report);
            };
            const timer = global.setTimeout(() => finish({ available: false, matches: null, reason: 'timeout' }), timeoutMs);
            channel.port1.onmessage = event => {
                const info = event.data || {};
                const matches = (!CACHE_NAME || info.cacheName === CACHE_NAME) && (!ASSET_VERSION || info.assetVersion === ASSET_VERSION);
                if (document.documentElement) document.documentElement.dataset.foxbearWorkerGeneration = matches ? 'current' : 'stale';
                finish({ available: true, matches, expectedCacheName: CACHE_NAME, expectedAssetVersion: ASSET_VERSION, ...info });
            };
            try {
                controller.postMessage({ type: 'FOXBEAR_GET_RELEASE_INFO' }, [channel.port2]);
            } catch (error) {
                finish({ available: false, matches: null, reason: error?.message || 'post-message-failed' });
            }
        });
    }

    function getReport() {
        return state.lastReport || apply();
    }

    function getServiceWorkerReport() {
        return state.serviceWorkerReport;
    }

    function boot() {
        apply();
        requestServiceWorkerReleaseInfo().then(report => {
            if (report.available && report.matches === false) {
                console.warn('[FoxBearReleasePresentation] service worker generation mismatch', report);
                try { global.dispatchEvent(new CustomEvent('foxbear:release-worker-mismatch', { detail: report })); } catch (error) {}
            }
        }).catch(() => undefined);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
    global.addEventListener('pageshow', apply);

    global.FoxBearReleasePresentation = Object.freeze({
        version: ASSET_VERSION,
        apply,
        getReport,
        requestServiceWorkerReleaseInfo,
        getServiceWorkerReport
    });
})(window);
