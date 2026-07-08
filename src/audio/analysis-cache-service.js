// FoxBear analysis cache service v1.4.27 - extracted IndexedDB cache helpers
'use strict';

(function attachFoxBearAnalysisCacheService(global) {
    const DEFAULT_DB_NAME = 'foxbear-analysis-cache-v1359';
    const DEFAULT_STORE_NAME = 'analysis';
    const DEFAULT_ENGINE_VERSION = 'analysis-engine-v1.4-stable';

    function resolveOptions(options = {}) {
        return {
            dbName: options.dbName || DEFAULT_DB_NAME,
            storeName: options.storeName || DEFAULT_STORE_NAME,
            engineVersion: options.engineVersion || DEFAULT_ENGINE_VERSION
        };
    }

    function getCacheKey(track, options = {}) {
        const opts = resolveOptions(options);
        const f = track && track.file ? track.file : {};
        return [f.name || track?.name || 'audio', f.size || track?.size || 0, f.lastModified || 0, opts.engineVersion].join('|');
    }

    function openDb(options = {}) {
        const opts = resolveOptions(options);
        return new Promise((resolve, reject) => {
            if (!('indexedDB' in global)) return resolve(null);
            const req = indexedDB.open(opts.dbName, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(opts.storeName)) db.createObjectStore(opts.storeName);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
        });
    }

    async function read(track, options = {}) {
        const opts = resolveOptions(options);
        try {
            const db = await openDb(opts);
            if (!db) return null;
            const key = getCacheKey(track, opts);
            return await new Promise(resolve => {
                const tx = db.transaction(opts.storeName, 'readonly');
                const req = tx.objectStore(opts.storeName).get(key);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
                tx.oncomplete = () => db.close();
                tx.onerror = () => { try { db.close(); } catch (error) {} resolve(null); };
            });
        } catch (error) {
            console.warn('Analysis cache read failed:', error);
            return null;
        }
    }

    async function write(track, analysis, options = {}) {
        const opts = resolveOptions(options);
        try {
            const db = await openDb(opts);
            if (!db || !analysis) return false;
            const key = getCacheKey(track, opts);
            await new Promise(resolve => {
                const tx = db.transaction(opts.storeName, 'readwrite');
                tx.objectStore(opts.storeName).put(analysis, key);
                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = () => { db.close(); resolve(); };
            });
            return true;
        } catch (error) {
            console.warn('Analysis cache write failed:', error);
            return false;
        }
    }

    async function clear(options = {}) {
        const opts = resolveOptions(options);
        try {
            const db = await openDb(opts);
            if (!db) return false;
            await new Promise(resolve => {
                const tx = db.transaction(opts.storeName, 'readwrite');
                tx.objectStore(opts.storeName).clear();
                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = () => { db.close(); resolve(); };
            });
            return true;
        } catch (error) {
            console.warn('Analysis cache clear failed:', error);
            return false;
        }
    }

    global.FoxBearAnalysisCacheService = Object.freeze({
        version: '1.4.27-release-cleanup',
        getCacheKey,
        openDb,
        read,
        write,
        clear
    });
})(window);
