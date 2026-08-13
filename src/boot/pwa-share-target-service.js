// FoxBear PWA share-target launch, lease, and IndexedDB handoff service - v1.6.95
(function attachFoxBearPwaShareTargetService(global) {
    'use strict';

    const config = global.FoxBearRuntimeConfig || {};
    const policyApi = global.FoxBearPwaSharePolicy || {};
    const policy = policyApi.createPolicy ? policyApi.createPolicy() : Object.freeze({
        schemaVersion: 2,
        recordTtlMs: 24 * 60 * 60 * 1000,
        claimLeaseMs: 2 * 60 * 1000,
        claimHeartbeatMs: 30 * 1000
    });
    const DB_NAME = config.MOBILE_NATIVE_IDB || 'foxbear-mobile-native-share-v1';
    const STORE_NAME = config.MOBILE_NATIVE_SHARE_STORE || 'sharedFiles';
    const SHARE_QUERY = config.MOBILE_NATIVE_SHARE_QUERY || 'foxbearSharedAudio';
    const SHARE_ERROR_QUERY = config.MOBILE_NATIVE_SHARE_ERROR_QUERY || 'share-error';
    const MAX_AGE_MS = Math.max(60 * 1000, Number(config.MOBILE_NATIVE_SHARE_MAX_AGE_MS || policy.recordTtlMs));
    const CLAIM_LEASE_MS = Math.max(10 * 1000, Number(config.MOBILE_NATIVE_SHARE_CLAIM_LEASE_MS || policy.claimLeaseMs));
    const CLAIM_HEARTBEAT_MS = Math.max(5 * 1000, Math.min(CLAIM_LEASE_MS - 1000, Number(config.MOBILE_NATIVE_SHARE_CLAIM_HEARTBEAT_MS || policy.claimHeartbeatMs)));
    const instanceId = createInstanceId();
    let lastServiceWorkerHandoff = null;
    let handoffListenerAttached = false;

    function createInstanceId() {
        const existing = (() => {
            try { return global.sessionStorage?.getItem?.('foxbear-share-instance-v1') || ''; } catch (error) { return ''; }
        })();
        if (existing) return existing;
        const random = typeof global.crypto?.randomUUID === 'function'
            ? global.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const value = `page-${random}`.slice(0, 160);
        try { global.sessionStorage?.setItem?.('foxbear-share-instance-v1', value); } catch (error) {}
        return value;
    }

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

    async function claimSharedAudio(id, options = {}) {
        if (!id) return Object.freeze({ status: 'missing', item: null, ownerId: instanceId });
        const ownerId = String(options.ownerId || instanceId).slice(0, 160);
        const now = Number(options.now || Date.now());
        const leaseMs = Math.max(10 * 1000, Number(options.leaseMs || CLAIM_LEASE_MS));
        const db = await openShareDb();
        try {
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(id);
                let result = Object.freeze({ status: 'missing', item: null, ownerId });
                request.onsuccess = () => {
                    const current = request.result || null;
                    if (!current) return;
                    const currentOwner = String(current.claimOwner || '');
                    const currentExpiry = Number(current.claimExpiresAt || 0);
                    if (currentOwner && currentOwner !== ownerId && currentExpiry > now) {
                        result = Object.freeze({ status: 'busy', item: null, ownerId, claimOwner: currentOwner, claimExpiresAt: currentExpiry });
                        return;
                    }
                    const claimed = {
                        ...current,
                        schemaVersion: Math.max(Number(current.schemaVersion || 0), Number(policy.schemaVersion || 2)),
                        claimOwner: ownerId,
                        claimAcquiredAt: currentOwner === ownerId ? Number(current.claimAcquiredAt || now) : now,
                        claimExpiresAt: now + leaseMs,
                        claimGeneration: Math.max(0, Number(current.claimGeneration || 0)) + (currentOwner === ownerId ? 0 : 1)
                    };
                    store.put(claimed);
                    result = Object.freeze({ status: 'claimed', item: claimed, ownerId, claimExpiresAt: claimed.claimExpiresAt });
                };
                request.onerror = () => reject(request.error || new Error('공유 파일 점유 상태를 읽지 못했습니다.'));
                tx.oncomplete = () => resolve(result);
                tx.onerror = () => reject(tx.error || new Error('공유 파일 점유 작업을 완료하지 못했습니다.'));
                tx.onabort = () => reject(tx.error || new Error('공유 파일 점유 작업이 중단되었습니다.'));
            });
        } finally {
            db.close();
        }
    }

    async function updateClaim(id, ownerId, action, options = {}) {
        if (!id || !ownerId) return false;
        const now = Number(options.now || Date.now());
        const leaseMs = Math.max(10 * 1000, Number(options.leaseMs || CLAIM_LEASE_MS));
        const db = await openShareDb();
        try {
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(id);
                let changed = false;
                request.onsuccess = () => {
                    const current = request.result || null;
                    if (!current || String(current.claimOwner || '') !== ownerId) return;
                    if (action === 'delete') {
                        store.delete(id);
                        changed = true;
                        return;
                    }
                    const next = { ...current };
                    if (action === 'renew') {
                        next.claimExpiresAt = now + leaseMs;
                        next.claimHeartbeatAt = now;
                    } else {
                        delete next.claimOwner;
                        delete next.claimAcquiredAt;
                        delete next.claimExpiresAt;
                        delete next.claimHeartbeatAt;
                    }
                    store.put(next);
                    changed = true;
                };
                request.onerror = () => reject(request.error || new Error('공유 파일 점유 상태를 갱신하지 못했습니다.'));
                tx.oncomplete = () => resolve(changed);
                tx.onerror = () => reject(tx.error || new Error('공유 파일 점유 갱신을 완료하지 못했습니다.'));
                tx.onabort = () => reject(tx.error || new Error('공유 파일 점유 갱신이 중단되었습니다.'));
            });
        } finally {
            db.close();
        }
    }

    function renewClaim(id, ownerId, options) { return updateClaim(id, ownerId, 'renew', options); }
    function releaseClaim(id, ownerId) { return updateClaim(id, ownerId, 'release'); }
    function completeClaim(id, ownerId) { return updateClaim(id, ownerId, 'delete'); }

    async function takeSharedAudio(id) {
        const claim = await claimSharedAudio(id);
        if (claim.status !== 'claimed') return null;
        await completeClaim(id, claim.ownerId);
        return claim.item;
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

    function shareErrorMessage(code) {
        if (code === 'unsupported') return '공유된 파일에서 지원 오디오를 찾지 못했습니다.';
        if (code === 'quota') return '기기의 공유 임시 저장 공간이 부족합니다. 저장 공간을 확보한 뒤 다시 시도해주세요.';
        if (code === 'busy') return '다른 공유 파일 가져오기가 진행 중입니다. 잠시 후 다시 시도해주세요.';
        return '공유 파일을 임시 저장하지 못했습니다. 파일 선택으로 다시 시도해주세요.';
    }

    function observeServiceWorkerHandoff() {
        if (handoffListenerAttached || !global.navigator?.serviceWorker?.addEventListener) return;
        handoffListenerAttached = true;
        global.navigator.serviceWorker.addEventListener('message', event => {
            if (event?.data?.type !== 'FOXBEAR_SHARE_HANDOFF_READY') return;
            lastServiceWorkerHandoff = Object.freeze({ ...event.data, receivedAt: Date.now() });
        });
    }

    async function processLaunch(options = {}) {
        observeServiceWorkerHandoff();
        const state = options.state && typeof options.state === 'object' ? options.state : {};
        if (state.sharedLaunchHandled) return Object.freeze({ handled: false, reason: 'already-handled' });
        const params = new URLSearchParams(global.location?.search || '');
        const shareId = params.get(SHARE_QUERY);
        const shareError = params.get(SHARE_ERROR_QUERY);
        if (!shareId && !shareError) return Object.freeze({ handled: false, reason: 'not-a-share-launch' });
        state.sharedLaunchHandled = true;
        const showToast = typeof options.showToast === 'function' ? options.showToast : () => undefined;
        if (!shareId) {
            notify(showToast, shareErrorMessage(shareError));
            clearLaunchQuery();
            return Object.freeze({ handled: true, ok: false, reason: shareError || 'storage' });
        }

        let claim = null;
        let heartbeat = null;
        let leaseLost = false;
        try {
            claim = await claimSharedAudio(shareId, options.claimOptions);
            if (claim.status === 'busy') {
                notify(showToast, '이 공유 파일은 다른 FoxBear 탭에서 가져오는 중입니다. 중복 가져오기를 막았습니다.');
                clearLaunchQuery();
                return Object.freeze({ handled: true, ok: false, reason: 'claimed-by-other-tab', retryable: false });
            }
            if (claim.status !== 'claimed' || !claim.item) {
                notify(showToast, '공유 파일을 찾지 못했거나 이미 처리했습니다. 다시 공유해주세요.');
                clearLaunchQuery();
                return Object.freeze({ handled: true, ok: false, reason: 'missing' });
            }

            const item = claim.item;
            const createdAt = Number(item.createdAt || 0);
            if (createdAt > 0 && Date.now() - createdAt > MAX_AGE_MS) {
                await completeClaim(shareId, claim.ownerId);
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
                await completeClaim(shareId, claim.ownerId);
                notify(showToast, '공유된 파일에서 지원 오디오를 찾지 못했습니다.');
                clearLaunchQuery();
                return Object.freeze({ handled: true, ok: false, reason: 'unsupported', count: 0 });
            }
            if (typeof options.handleFiles !== 'function') throw new Error('share-import-handler-unavailable');

            heartbeat = global.setInterval?.(() => {
                renewClaim(shareId, claim.ownerId).then(renewed => {
                    if (!renewed) leaseLost = true;
                }).catch(() => { leaseLost = true; });
            }, CLAIM_HEARTBEAT_MS);

            const importResult = await options.handleFiles(audioFiles);
            const reportedAdded = Number(importResult?.added);
            const added = Number.isFinite(reportedAdded) ? Math.max(0, Math.floor(reportedAdded)) : audioFiles.length;
            if (!added) {
                await completeClaim(shareId, claim.ownerId);
                notify(showToast, '공유 파일을 현재 기기의 안전 한도에서 불러오지 못했습니다. 더 작은 파일로 다시 시도해주세요.');
                clearLaunchQuery();
                return Object.freeze({ handled: true, ok: false, reason: 'import-rejected', count: 0 });
            }
            if (leaseLost) throw new Error('share-import-lease-lost');
            const cleaned = await completeClaim(shareId, claim.ownerId);
            if (!cleaned) throw new Error('share-import-claim-lost');
            clearLaunchQuery();
            notify(showToast, `${added}개 공유 파일을 FoxBear로 불러왔습니다.`);
            return Object.freeze({ handled: true, ok: true, reason: 'imported', count: added, cleanupPending: false });
        } catch (error) {
            console.warn('share target launch failed:', error);
            if (claim?.status === 'claimed') {
                await releaseClaim(shareId, claim.ownerId).catch(() => false);
            }
            notify(showToast, '공유 파일은 임시 보관 중입니다. 새로고침 후 다시 시도하거나 파일 선택을 이용해주세요.');
            return Object.freeze({ handled: true, ok: false, reason: 'import-failed', retryable: true });
        } finally {
            if (heartbeat != null) global.clearInterval?.(heartbeat);
        }
    }

    observeServiceWorkerHandoff();

    global.FoxBearPwaShareTargetService = Object.freeze({
        version: '1.6.95',
        policy,
        instanceId,
        processLaunch,
        clearLaunchQuery,
        readSharedAudio,
        deleteSharedAudio,
        takeSharedAudio,
        claimSharedAudio,
        renewClaim,
        releaseClaim,
        completeClaim,
        observeServiceWorkerHandoff,
        getLastServiceWorkerHandoff: () => lastServiceWorkerHandoff
    });
})(typeof window !== 'undefined' ? window : globalThis);
