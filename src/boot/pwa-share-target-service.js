// FoxBear PWA share-target launch and IndexedDB handoff service - v1.6.70
(function attachFoxBearPwaShareTargetService(global) {
    'use strict';

    const config = global.FoxBearRuntimeConfig || {};
    const DB_NAME = config.MOBILE_NATIVE_IDB || 'foxbear-mobile-native-share-v1';
    const STORE_NAME = config.MOBILE_NATIVE_SHARE_STORE || 'sharedFiles';
    const SHARE_QUERY = config.MOBILE_NATIVE_SHARE_QUERY || 'foxbearSharedAudio';
    const SHARE_ERROR_QUERY = config.MOBILE_NATIVE_SHARE_ERROR_QUERY || 'share-error';
    const MAX_AGE_MS = Math.max(60 * 1000, Number(config.MOBILE_NATIVE_SHARE_MAX_AGE_MS || 24 * 60 * 60 * 1000));

    function openShareDb() {
        return new Promise((resolve, reject) => {
            if (typeof global.indexedDB === 'undefined') {
                reject(new Error('공유 파일 저장소를 사용할 수 없습니다.'));
                return;
            }
            const request = global.indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            };
            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => db.close();
                resolve(db);
            };
            request.onerror = () => reject(request.error || new Error('공유 파일 저장소를 열 수 없습니다.'));
            request.onblocked = () => reject(new Error('다른 FoxBear 화면이 공유 저장소 업데이트를 막고 있습니다.'));
        });
    }

    async function readSharedAudio(id) {
        if (!id) return null;
        const db = await openShareDb();
        try {
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const request = tx.objectStore(STORE_NAME).get(id);
                let value = null;
                request.onsuccess = () => { value = request.result || null; };
                request.onerror = () => reject(request.error || new Error('공유 파일을 읽지 못했습니다.'));
                tx.oncomplete = () => resolve(value);
                tx.onerror = () => reject(tx.error || new Error('공유 파일 읽기 작업을 완료하지 못했습니다.'));
                tx.onabort = () => reject(tx.error || new Error('공유 파일 읽기 작업이 중단되었습니다.'));
            });
        } finally {
            db.close();
        }
    }

    async function deleteSharedAudio(id) {
        if (!id) return false;
        const db = await openShareDb();
        try {
            await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).delete(id);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error || new Error('공유 파일 정리를 완료하지 못했습니다.'));
                tx.onabort = () => reject(tx.error || new Error('공유 파일 정리 작업이 중단되었습니다.'));
            });
            return true;
        } finally {
            db.close();
        }
    }

    async function takeSharedAudio(id) {
        const value = await readSharedAudio(id);
        if (value) await deleteSharedAudio(id);
        return value;
    }

    function clearLaunchQuery() {
        try {
            const url = new URL(global.location.href);
            url.searchParams.delete(SHARE_QUERY);
            url.searchParams.delete(SHARE_ERROR_QUERY);
            url.searchParams.delete('shareCount');
            global.history?.replaceState?.(null, global.document?.title || '', `${url.pathname}${url.search}${url.hash}`);
        } catch (error) {}
    }

    function notify(showToast, message) {
        try { showToast(message); } catch (error) {}
    }

    async function discardSharedAudio(id) {
        try { return await deleteSharedAudio(id); } catch (error) {
            console.warn('share target cleanup failed:', error);
            return false;
        }
    }

    async function processLaunch(options = {}) {
        const state = options.state && typeof options.state === 'object' ? options.state : {};
        if (state.sharedLaunchHandled) return Object.freeze({ handled: false, reason: 'already-handled' });
        const params = new URLSearchParams(global.location?.search || '');
        const shareId = params.get(SHARE_QUERY);
        const shareError = params.get(SHARE_ERROR_QUERY);
        if (!shareId && !shareError) return Object.freeze({ handled: false, reason: 'not-a-share-launch' });
        state.sharedLaunchHandled = true;
        const showToast = typeof options.showToast === 'function' ? options.showToast : () => undefined;
        if (!shareId) {
            notify(showToast, shareError === 'unsupported'
                ? '공유된 파일에서 지원 오디오를 찾지 못했습니다.'
                : '공유 파일을 임시 저장하지 못했습니다. 파일 선택으로 다시 시도해주세요.');
            clearLaunchQuery();
            return Object.freeze({ handled: true, ok: false, reason: shareError || 'storage' });
        }
        try {
            const item = await readSharedAudio(shareId);
            if (!item) {
                notify(showToast, '공유 파일을 찾지 못했거나 이미 처리했습니다. 다시 공유해주세요.');
                clearLaunchQuery();
                return Object.freeze({ handled: true, ok: false, reason: 'missing' });
            }
            const createdAt = Number(item.createdAt || 0);
            if (createdAt > 0 && Date.now() - createdAt > MAX_AGE_MS) {
                await discardSharedAudio(shareId);
                notify(showToast, '공유 파일 보관 시간이 지나 만료되었습니다. 다시 공유해주세요.');
                clearLaunchQuery();
                return Object.freeze({ handled: true, ok: false, reason: 'expired' });
            }
            const files = Array.isArray(item.files) ? item.files : [];
            const validateAudioFile = typeof options.validateAudioFile === 'function'
                ? options.validateAudioFile
                : () => ({ ok: false });
            const audioFiles = files.filter(file => file && validateAudioFile(file)?.ok === true);
            if (!audioFiles.length) {
                await discardSharedAudio(shareId);
                notify(showToast, '공유된 파일에서 지원 오디오를 찾지 못했습니다.');
                clearLaunchQuery();
                return Object.freeze({ handled: true, ok: false, reason: 'unsupported', count: 0 });
            }
            if (typeof options.handleFiles !== 'function') throw new Error('share-import-handler-unavailable');
            const importResult = await options.handleFiles(audioFiles);
            const reportedAdded = Number(importResult?.added);
            const added = Number.isFinite(reportedAdded) ? Math.max(0, Math.floor(reportedAdded)) : audioFiles.length;
            if (!added) {
                await discardSharedAudio(shareId);
                notify(showToast, '공유 파일을 현재 기기의 안전 한도에서 불러오지 못했습니다. 더 작은 파일로 다시 시도해주세요.');
                clearLaunchQuery();
                return Object.freeze({ handled: true, ok: false, reason: 'import-rejected', count: 0 });
            }
            const cleaned = await discardSharedAudio(shareId);
            clearLaunchQuery();
            notify(showToast, `${added}개 공유 파일을 FoxBear로 불러왔습니다.`);
            return Object.freeze({ handled: true, ok: true, reason: 'imported', count: added, cleanupPending: !cleaned });
        } catch (error) {
            console.warn('share target launch failed:', error);
            notify(showToast, '공유 파일은 임시 보관 중입니다. 새로고침 후 다시 시도하거나 파일 선택을 이용해주세요.');
            return Object.freeze({ handled: true, ok: false, reason: 'import-failed', retryable: true });
        }
    }

    global.FoxBearPwaShareTargetService = Object.freeze({
        version: '1.6.70',
        processLaunch,
        clearLaunchQuery,
        readSharedAudio,
        deleteSharedAudio,
        takeSharedAudio
    });
})(typeof window !== 'undefined' ? window : globalThis);
