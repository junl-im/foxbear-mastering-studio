'use strict';

(function exposeFoxBearAdminIncidentLoaderService(global) {
    const DEFAULT_TIMEOUT_MS = 20000;
    const LAZY_KEY = 'admin-incident-monitor';
    const activeLoads = new Map();

    function getDocument(options) {
        return options.document || global.document || null;
    }

    function isReady(options) {
        return typeof options.isReady === 'function' && options.isReady() === true;
    }

    function removeNode(node) {
        try { node?.remove?.(); } catch (error) {}
    }

    function load(options = {}) {
        if (isReady(options)) return Promise.resolve({ reused: true, ready: true });
        const current = activeLoads.get(LAZY_KEY);
        if (current) return current;

        const documentRef = getDocument(options);
        if (!documentRef?.head || typeof documentRef.createElement !== 'function') {
            return Promise.reject(new Error('관리자 오류 관리 모듈을 로드할 문서가 없습니다.'));
        }
        const selector = `script[data-foxbear-lazy="${LAZY_KEY}"]`;
        const stale = documentRef.querySelector?.(selector) || null;
        // If no live Promise owns the element and the factory is still absent,
        // the previous load either failed or completed without initialization.
        // Never attach listeners to an already-settled script element.
        if (stale && !isReady(options)) removeNode(stale);

        const timeoutMs = Math.max(1000, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS));
        const promise = new Promise((resolve, reject) => {
            const script = documentRef.createElement('script');
            let settled = false;
            let timer = 0;

            const cleanup = () => {
                if (timer) global.clearTimeout?.(timer);
                script.removeEventListener?.('load', onLoad);
                script.removeEventListener?.('error', onError);
            };
            const fail = message => {
                if (settled) return;
                settled = true;
                cleanup();
                script.dataset.foxbearLazyState = 'failed';
                removeNode(script);
                reject(new Error(message));
            };
            const onLoad = () => {
                if (settled) return;
                if (!isReady(options)) {
                    fail('관리자 오류 관리 모듈 초기화에 실패했습니다.');
                    return;
                }
                settled = true;
                cleanup();
                script.dataset.foxbearLazyState = 'loaded';
                resolve({ node: script, reused: false, ready: true });
            };
            const onError = () => fail('관리자 오류 관리 모듈을 불러오지 못했습니다.');

            script.async = true;
            script.dataset.foxbearLazy = LAZY_KEY;
            script.dataset.foxbearLazyState = 'loading';
            script.src = typeof options.resolveScriptUrl === 'function'
                ? options.resolveScriptUrl(options.src)
                : String(options.src || '');
            if (options.integrity) script.integrity = String(options.integrity);
            script.crossOrigin = 'anonymous';
            script.addEventListener('load', onLoad, { once: true });
            script.addEventListener('error', onError, { once: true });
            timer = global.setTimeout?.(() => fail('관리자 오류 관리 모듈 로드 시간이 초과되었습니다.'), timeoutMs) || 0;
            documentRef.head.appendChild(script);
        });

        const tracked = promise.finally(() => {
            if (activeLoads.get(LAZY_KEY) === tracked) activeLoads.delete(LAZY_KEY);
        });
        activeLoads.set(LAZY_KEY, tracked);
        return tracked;
    }

    global.FoxBearAdminIncidentLoaderService = Object.freeze({ load });
})(typeof window !== 'undefined' ? window : globalThis);
