// FoxBear AI Mastering Studio Pro v1.6.44 - Spark-compatible Google administrator access controller
'use strict';

(function attachFoxBearAdminAccessController(global) {
    const SESSION_REFRESH_THROTTLE_MS = 30000;

    function create(options = {}) {
        const state = options.state || {};
        const el = options.elements || {};
        const toggleSettings = typeof options.toggleSettings === 'function' ? options.toggleSettings : () => {};
        const openMonitor = typeof options.openMonitor === 'function' ? options.openMonitor : () => {};
        const closeMonitor = typeof options.closeMonitor === 'function' ? options.closeMonitor : () => {};
        const updateTrigger = typeof options.updateTrigger === 'function' ? options.updateTrigger : () => {};
        const updateUi = typeof options.updateUi === 'function' ? options.updateUi : () => {};
        const showToast = typeof options.showToast === 'function' ? options.showToast : () => {};
        const setFallbackModalState = typeof options.setFallbackModalState === 'function' ? options.setFallbackModalState : () => false;
        let eventsBound = false;
        let lastSessionRefreshAt = 0;

        function setStatus(message, tone = 'neutral') {
            if (!el.adminAccessStatus) return;
            el.adminAccessStatus.textContent = String(message || '');
            el.adminAccessStatus.dataset.tone = tone;
        }

        function updateIdentity(profile = {}) {
            const uid = String(profile.uid || state.firebaseUserId || '');
            const email = String(profile.email || state.firebaseAdminEmail || '');
            state.firebaseUserId = uid;
            state.firebaseAdminEmail = email;
            state.firebaseAdminDisplayName = String(profile.displayName || state.firebaseAdminDisplayName || '');
            state.firebaseAdminProvider = String(profile.providerId || profile.authMethod || state.firebaseAdminProvider || '');
            if (el.adminAccessIdentity) el.adminAccessIdentity.hidden = !uid || state.firebaseAdminProvider !== 'google.com';
            if (el.adminAccessEmail) el.adminAccessEmail.textContent = email || 'Google 계정';
            if (el.adminAccessUid) el.adminAccessUid.textContent = uid || '-';
        }

        function expireLocalSession(notify = true) {
            const wasActive = Boolean(state.firebaseIsAdmin);
            state.firebaseIsAdmin = false;
            state.firebaseAdminRole = '';
            state.adminSessionExpiresAt = '';
            state.firebaseAdminChecked = true;
            state.adminStatsRemoteError = 'Google 관리자 인증이 해제되었습니다.';
            closeMonitor();
            updateTrigger();
            updateSessionUi();
            updateUi();
            if (notify && wasActive) showToast('관리자 Google 세션이 종료되어 모니터링을 닫았습니다.');
            return false;
        }

        function hasActiveSession() {
            return Boolean(state.firebaseIsAdmin && state.firebaseAdminProvider === 'google.com');
        }

        function getSessionLabel() {
            if (state.adminLogoutBusy) return '종료 중';
            if (hasActiveSession()) return '열기';
            return state.adminAccessChecking ? '확인' : '로그인';
        }

        function updateSessionUi() {
            const active = hasActiveSession();
            if (el.adminSessionStatus) {
                if (state.adminLogoutBusy) {
                    el.adminSessionStatus.textContent = 'Google 관리자 세션을 종료하고 있습니다…';
                    el.adminSessionStatus.dataset.tone = 'warning';
                } else if (active) {
                    el.adminSessionStatus.textContent = `Google 인증됨 · ${state.firebaseAdminEmail || state.firebaseUserId || '관리자'}`;
                    el.adminSessionStatus.dataset.tone = 'ok';
                } else {
                    el.adminSessionStatus.textContent = '활성 Google 관리자 세션이 없습니다.';
                    el.adminSessionStatus.dataset.tone = 'error';
                }
            }
            if (el.adminSessionRefresh) {
                el.adminSessionRefresh.disabled = Boolean(state.adminAccessChecking || state.adminLogoutBusy);
                el.adminSessionRefresh.setAttribute('aria-busy', state.adminAccessChecking ? 'true' : 'false');
            }
            if (el.adminSessionLogout) {
                el.adminSessionLogout.disabled = !active || Boolean(state.adminLogoutBusy);
                el.adminSessionLogout.setAttribute('aria-busy', state.adminLogoutBusy ? 'true' : 'false');
                el.adminSessionLogout.textContent = state.adminLogoutBusy ? '로그아웃 중…' : '관리자 로그아웃';
            }
            return active;
        }

        function scheduleSessionCheck() {
            return updateSessionUi();
        }

        function applyProfile(profile = {}) {
            updateIdentity(profile);
            state.firebaseIsAdmin = Boolean(profile.active && (profile.providerId === 'google.com' || profile.authMethod === 'google.com'));
            state.firebaseAdminRole = profile.role || '';
            state.adminSessionExpiresAt = profile.expiresAt || '';
            state.firebaseAdminChecked = true;
            state.adminStatsRemoteError = state.firebaseIsAdmin
                ? ''
                : `Google UID(${state.firebaseUserId || '확인 중'})가 활성 관리자 문서로 등록되지 않았습니다.`;
            updateTrigger();
            updateSessionUi();
            updateUi();
            return state.firebaseIsAdmin;
        }

        async function refreshSession(options = {}) {
            if (state.adminAccessChecking || state.adminLogoutBusy) return hasActiveSession();
            const bridge = global.FoxBearFirebase;
            if (!bridge || typeof bridge.getAdminProfile !== 'function') {
                if (!options.silent) showToast('Firebase 관리자 권한 확인 기능이 준비되지 않았습니다.');
                updateSessionUi();
                return false;
            }
            state.adminAccessChecking = true;
            lastSessionRefreshAt = Date.now();
            updateSessionUi();
            updateUi();
            try {
                const profile = await bridge.getAdminProfile();
                const active = applyProfile(profile);
                if (!active) closeMonitor();
                if (!options.silent) showToast(active ? 'Google 관리자 권한이 확인되었습니다.' : '등록된 관리자 Google 계정이 아닙니다.');
                return active;
            } catch (error) {
                if (!options.silent) showToast(`관리자 권한 확인 실패: ${error?.message || error}`);
                state.adminStatsRemoteError = error?.message || String(error);
                updateSessionUi();
                return false;
            } finally {
                state.adminAccessChecking = false;
                updateSessionUi();
                updateUi();
            }
        }

        async function revokeSession(event = null) {
            event?.preventDefault?.();
            if (state.adminLogoutBusy) return false;
            const bridge = global.FoxBearFirebase;
            if (!bridge || typeof bridge.signOutAdminAccess !== 'function') {
                showToast('Firebase Google 로그아웃 기능이 준비되지 않았습니다.');
                return false;
            }
            state.adminLogoutBusy = true;
            updateSessionUi();
            updateUi();
            try {
                await bridge.signOutAdminAccess();
                state.firebaseAdminEmail = '';
                state.firebaseAdminDisplayName = '';
                state.firebaseAdminProvider = 'anonymous';
                expireLocalSession(false);
                showToast('관리자 Google 계정에서 로그아웃했습니다. 일반 익명 세션으로 전환되었습니다.');
                return true;
            } catch (error) {
                showToast(`관리자 로그아웃 실패: ${error?.message || error}`);
                return false;
            } finally {
                state.adminLogoutBusy = false;
                updateSessionUi();
                updateUi();
            }
        }

        function prepare() {
            setStatus('Google 관리자 계정 인증 대기', 'neutral');
            updateIdentity({});
        }

        function clear() {}

        function open(options = {}) {
            if (hasActiveSession()) {
                toggleSettings(false);
                openMonitor();
                return true;
            }
            if (!el.adminAccessDialog) return false;
            toggleSettings(false);
            const controller = state.modalController;
            const opener = options.returnFocus || el.mobileNativeQuickToggle || global.document?.activeElement;
            if (controller?.modals?.has?.('adminAccess')) {
                const opened = controller.setOpen('adminAccess', true, { opener });
                global.requestAnimationFrame?.(() => el.adminAccessSubmit?.focus?.({ preventScroll: true }));
                return opened;
            }
            prepare();
            setFallbackModalState(el.adminAccessDialog, true, 'admin-access-open');
            global.FoxBearModalStateMachine?.focusFirst?.(el.adminAccessDialog);
            global.requestAnimationFrame?.(() => el.adminAccessSubmit?.focus?.({ preventScroll: true }));
            return true;
        }

        function close(options = {}) {
            if (!el.adminAccessDialog) return false;
            const controller = state.modalController;
            if (controller?.modals?.has?.('adminAccess') && controller.isOpen('adminAccess')) {
                return controller.setOpen('adminAccess', false, { restoreFocus: options.restoreFocus !== false });
            }
            setFallbackModalState(el.adminAccessDialog, false, 'admin-access-open');
            if (options.restoreFocus !== false) {
                try { el.mobileNativeQuickToggle?.focus?.({ preventScroll: true }); } catch (error) {}
            }
            return true;
        }

        function formatFailure(error) {
            const code = String(error?.code || '').replace(/^auth\//, '');
            if (code === 'popup-closed-by-user' || code === 'cancelled-popup-request') return 'Google 로그인이 취소되었습니다.';
            if (code === 'unauthorized-domain') return 'Firebase Authentication의 승인된 도메인에 현재 사이트 주소를 추가해주세요.';
            if (code === 'operation-not-allowed') return 'Firebase Authentication에서 Google 로그인 제공업체를 활성화해주세요.';
            if (code === 'network-request-failed') return '네트워크 연결을 확인한 뒤 다시 시도해주세요.';
            return error?.message || 'Google 관리자 인증에 실패했습니다.';
        }

        async function submit(event = null) {
            event?.preventDefault?.();
            if (state.adminUnlockBusy) return false;
            const bridge = global.FoxBearFirebase;
            if (!bridge || typeof bridge.signInAdminWithGoogle !== 'function' || typeof bridge.getAdminProfile !== 'function') {
                setStatus('Firebase Google 관리자 인증 기능이 아직 준비되지 않았습니다.', 'error');
                return false;
            }
            state.adminUnlockBusy = true;
            if (el.adminAccessSubmit) {
                el.adminAccessSubmit.disabled = true;
                el.adminAccessSubmit.setAttribute('aria-busy', 'true');
                el.adminAccessSubmit.textContent = 'Google 로그인 중…';
            }
            setStatus('Google 계정 로그인 창에서 관리자 계정을 선택해주세요.', 'neutral');
            updateUi();
            try {
                const identity = await bridge.signInAdminWithGoogle();
                if (identity?.redirecting) {
                    setStatus('Google 로그인 페이지로 이동합니다…', 'neutral');
                    return true;
                }
                updateIdentity(identity);
                const profile = await bridge.getAdminProfile();
                updateIdentity(profile);
                if (!applyProfile(profile)) {
                    setStatus('로그인은 성공했지만 관리자 UID 등록이 필요합니다. 아래 UID를 Firestore siteAdmins 문서 ID로 등록해주세요.', 'warning');
                    return false;
                }
                setStatus('Google 관리자 인증이 완료되었습니다.', 'ok');
                close({ restoreFocus: false });
                showToast('관리자 Google 인증 완료 · 모니터링을 엽니다.');
                global.requestAnimationFrame?.(() => openMonitor());
                return true;
            } catch (error) {
                setStatus(formatFailure(error), 'error');
                return false;
            } finally {
                state.adminUnlockBusy = false;
                if (el.adminAccessSubmit) {
                    el.adminAccessSubmit.disabled = false;
                    el.adminAccessSubmit.removeAttribute('aria-busy');
                    el.adminAccessSubmit.textContent = 'Google 계정으로 인증';
                }
                updateSessionUi();
                updateUi();
            }
        }

        async function copyUid(event = null) {
            event?.preventDefault?.();
            const uid = String(state.firebaseUserId || el.adminAccessUid?.textContent || '').trim();
            if (!uid || uid === '-') return false;
            try {
                await global.navigator?.clipboard?.writeText?.(uid);
                showToast('관리자 UID를 복사했습니다.');
                return true;
            } catch (error) {
                showToast(`UID 복사 실패: ${error?.message || error}`);
                return false;
            }
        }

        function refreshAfterResume() {
            if (state.adminLogoutBusy) return;
            if (Date.now() - lastSessionRefreshAt < SESSION_REFRESH_THROTTLE_MS) return;
            refreshSession({ silent: true });
        }

        function bindEvents() {
            if (eventsBound) return false;
            eventsBound = true;
            el.adminAccessClose?.addEventListener('click', () => close());
            el.adminAccessCancel?.addEventListener('click', () => close());
            el.adminAccessForm?.addEventListener('submit', submit);
            el.adminAccessSubmit?.addEventListener('click', event => {
                if (!el.adminAccessForm) submit(event);
            });
            el.adminAccessUidCopy?.addEventListener('click', copyUid);
            el.adminSessionRefresh?.addEventListener('click', () => refreshSession());
            el.adminSessionLogout?.addEventListener('click', revokeSession);
            el.adminAccessDialog?.addEventListener('click', event => {
                if (event.target === el.adminAccessDialog && !state.adminUnlockBusy) close({ restoreFocus: false });
            });
            global.addEventListener?.('keydown', event => {
                if (event.key === 'Escape' && el.adminAccessDialog?.classList.contains('show') && !state.adminUnlockBusy) close({ restoreFocus: false });
            });
            global.addEventListener?.('pageshow', refreshAfterResume);
            global.addEventListener?.('focus', refreshAfterResume);
            global.document?.addEventListener?.('visibilitychange', () => {
                if (global.document.visibilityState === 'visible') refreshAfterResume();
            });
            updateSessionUi();
            return true;
        }

        return Object.freeze({
            open,
            close,
            submit,
            bindEvents,
            prepare,
            clear,
            setStatus,
            hasActiveSession,
            getSessionLabel,
            updateSessionUi,
            scheduleSessionCheck,
            applyProfile,
            refreshSession,
            revokeSession,
            expireLocalSession,
            copyUid
        });
    }

    global.FoxBearAdminAccessController = Object.freeze({ version: '1.6.44-google-auth-gapi-module-trusted-types-recovery', create });
})(typeof window !== 'undefined' ? window : globalThis);
