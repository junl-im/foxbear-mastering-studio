'use strict';

(function exposeFoxBearAdminIncidentLoaderService(global) {
    const DEFAULT_TIMEOUT_MS = 20000;
    const LAZY_KEY = 'admin-incident-monitor';
    const activeLoads = new Map();
    const activeStyleLoads = new Map();

    function getDocument(options) {
        return options.document || global.document || null;
    }

    function isReady(options) {
        return typeof options.isReady === 'function' && options.isReady() === true;
    }

    function removeNode(node) {
        try { node?.remove?.(); } catch (error) {}
    }

    function loadStyle(options = {}) {
        const styleSrc = String(options.styleSrc || '');
        if (!styleSrc) return Promise.resolve({ reused: true, ready: true });
        const documentRef = getDocument(options);
        const selector = `link[data-foxbear-lazy-style="${LAZY_KEY}"]`;
        const existing = documentRef?.querySelector?.(selector) || null;
        if (existing?.dataset?.foxbearLazyState === 'loaded') return Promise.resolve({ node: existing, reused: true, ready: true });
        const current = activeStyleLoads.get(LAZY_KEY);
        if (current) return current;
        if (existing) removeNode(existing);
        if (!documentRef?.head || typeof documentRef.createElement !== 'function') return Promise.reject(new Error('관리자 오류 관리 스타일을 로드할 문서가 없습니다.'));
        const promise = new Promise((resolve, reject) => {
            const link = documentRef.createElement('link');
            let settled = false;
            let timer = 0;
            const cleanup = () => { if (timer) global.clearTimeout?.(timer); link.removeEventListener?.('load', onLoad); link.removeEventListener?.('error', onError); };
            const fail = message => { if (settled) return; settled = true; cleanup(); link.dataset.foxbearLazyState = 'failed'; removeNode(link); reject(new Error(message)); };
            const onLoad = () => { if (settled) return; settled = true; cleanup(); link.dataset.foxbearLazyState = 'loaded'; resolve({ node: link, reused: false, ready: true }); };
            const onError = () => fail('관리자 오류 관리 스타일을 불러오지 못했습니다.');
            link.rel = 'stylesheet';
            link.dataset.foxbearLazyStyle = LAZY_KEY;
            link.dataset.foxbearLazyState = 'loading';
            link.href = styleSrc;
            if (options.styleIntegrity) link.integrity = String(options.styleIntegrity);
            link.crossOrigin = 'anonymous';
            link.addEventListener('load', onLoad, { once: true });
            link.addEventListener('error', onError, { once: true });
            timer = global.setTimeout?.(() => fail('관리자 오류 관리 스타일 로드 시간이 초과되었습니다.'), Math.max(1000, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS))) || 0;
            documentRef.head.appendChild(link);
        });
        const tracked = promise.finally(() => { if (activeStyleLoads.get(LAZY_KEY) === tracked) activeStyleLoads.delete(LAZY_KEY); });
        activeStyleLoads.set(LAZY_KEY, tracked);
        return tracked;
    }

    function loadScript(options = {}) {
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

    function load(options = {}) {
        if (!options.styleSrc) return loadScript(options);
        return loadStyle(options).then(() => loadScript(options));
    }

    global.FoxBearAdminIncidentLoaderService = Object.freeze({ load, loadStyle });
})(typeof window !== 'undefined' ? window : globalThis);
