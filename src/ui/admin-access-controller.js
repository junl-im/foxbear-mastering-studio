// FoxBear AI Mastering Studio Pro v1.6.72 - Spark-compatible Google administrator access controller
'use strict';

(function attachFoxBearAdminAccessController(global) {
    const SESSION_REFRESH_THROTTLE_MS = 30000;
    const SECURE_ADMIN_MARKER = 'foxbearAdmin';

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

        function getAdminAuthPolicy() {
            return global.FoxBearFirebase?.adminAuth || {};
        }

        function getSubmitLabel() {
            if (state.adminUnlockBusy) return 'Google 로그인 중…';
            return getAdminAuthPolicy().onSecureOrigin === false
                ? 'Google 인증 또는 보안 주소로 전환'
                : 'Google 계정으로 인증';
        }

        function updateSubmitLabel() {
            if (el.adminAccessSubmit && !state.adminUnlockBusy) el.adminAccessSubmit.textContent = getSubmitLabel();
        }

        function buildSecureAdminLaunchUrl(input = '') {
            let target;
            try {
                target = new URL(String(input || global.FoxBearFirebase?.getSecureAdminLaunchUrl?.() || ''), global.location?.href);
            } catch (error) {
                return '';
            }
            if (target.protocol !== 'https:' || target.hostname !== 'foxbear-music.web.app') return '';
            target.searchParams.set(SECURE_ADMIN_MARKER, '1');
            const handoffUrl = global.FoxBearSessionHandoff?.attachToUrl?.(target.href, { reason: 'admin-secure-origin-recovery' });
            return String(handoffUrl || target.href);
        }

        function consumeSecureAdminLaunchMarker() {
            let url;
            try { url = new URL(global.location?.href || ''); } catch (error) { return false; }
            if (url.searchParams.get(SECURE_ADMIN_MARKER) !== '1') return false;
            url.searchParams.delete(SECURE_ADMIN_MARKER);
            try { global.history?.replaceState?.(global.history.state, '', `${url.pathname}${url.search}${url.hash}`); } catch (error) {}
            global.setTimeout?.(() => open({ returnFocus: el.mobileNativeQuickToggle || global.document?.activeElement }), 160);
            return true;
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
            const diagnostics = global.FoxBearFirebase?.getAdminAuthDiagnostics?.();
            const policy = getAdminAuthPolicy();
            if (diagnostics?.code) {
                setStatus(formatFailure({ code: diagnostics.code, message: diagnostics.message, diagnostics }), 'error');
            } else if (policy.onSecureOrigin === false) {
                setStatus('현재 GitHub Pages 주소에서는 Google 팝업을 먼저 시도하고, 브라우저가 인증 통신을 막으면 Firebase Hosting 보안 주소로 자동 전환합니다.', 'neutral');
            } else {
                setStatus('Google 관리자 계정 인증 대기', 'neutral');
            }
            updateIdentity({});
            updateSubmitLabel();
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
            const fullCode = String(error?.code || 'auth/unknown');
            const code = fullCode.replace(/^auth\//, '');
            const diagnostics = error?.diagnostics || global.FoxBearFirebase?.getAdminAuthDiagnostics?.() || {};
            const pageHost = (() => {
                try { return new URL(diagnostics.pageOrigin || global.location?.origin || '').host; } catch (parseError) { return ''; }
            })();
            const authDomain = String(diagnostics.authDomain || global.FoxBearFirebase?.authDomain || '');
            const secureOrigin = String(global.FoxBearFirebase?.adminAuth?.secureOrigin || '');
            const context = [
                pageHost ? `host=${pageHost}` : '',
                authDomain ? `authDomain=${authDomain}` : '',
                secureOrigin ? `secure=${secureOrigin}` : '',
                diagnostics.online === false ? '브라우저 오프라인' : ''
            ].filter(Boolean).join(' · ');
            const suffix = context ? ` (${fullCode} · ${context})` : ` (${fullCode})`;
            if (code === 'popup-closed-by-user' || code === 'cancelled-popup-request') return 'Google 로그인이 취소되었습니다.';
            if (code === 'unauthorized-domain') return `Firebase Authentication 승인 도메인에 현재 사이트 주소를 추가해주세요.${suffix}`;
            if (code === 'operation-not-allowed') return `Firebase Authentication에서 Google 로그인 제공업체를 활성화해주세요.${suffix}`;
            if (code === 'secure-origin-required') return `GitHub Pages의 교차 출처 인증 통신이 완료되지 않아 Firebase Hosting 보안 주소로 전환합니다.${suffix}`;
            if (code === 'network-request-failed') return `Google 인증 서버와 통신하지 못했습니다. 로그인 상태를 재확인한 뒤 Firebase Hosting 보안 주소 복구를 사용합니다.${suffix}`;
            if (code === 'redirect-result-missing' || code === 'redirect-loop-prevented') return `${error?.message || 'Google 리디렉션 인증 결과를 확인하지 못했습니다.'}${suffix}`;
            if (code === 'web-storage-unsupported') return `브라우저가 인증용 사이트 저장소를 차단했습니다. 쿠키·사이트 데이터 차단 설정을 확인해주세요.${suffix}`;
            return `${error?.message || 'Google 관리자 인증에 실패했습니다.'}${suffix}`;
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
                const diagnostics = error?.diagnostics || global.FoxBearFirebase?.getAdminAuthDiagnostics?.();
                console.warn('FoxBear Google administrator authentication failed:', {
                    code: error?.code || diagnostics?.code || 'auth/unknown',
                    message: error?.message || diagnostics?.message || '',
                    pageOrigin: diagnostics?.pageOrigin || global.location?.origin || '',
                    authDomain: diagnostics?.authDomain || global.FoxBearFirebase?.authDomain || '',
                    online: diagnostics?.online !== false,
                    rejectedScriptUrl: diagnostics?.rejectedScriptUrl || ''
                });
                if (String(error?.code || '') === 'auth/secure-origin-required') {
                    const secureUrl = buildSecureAdminLaunchUrl(error?.secureUrl);
                    setStatus(formatFailure({ code: error?.code, message: error?.message, diagnostics }), 'warning');
                    if (secureUrl) {
                        global.setTimeout?.(() => global.location.assign(secureUrl), 80);
                        return true;
                    }
                }
                setStatus(formatFailure({ code: error?.code, message: error?.message, diagnostics }), 'error');
                return false;
            } finally {
                state.adminUnlockBusy = false;
                if (el.adminAccessSubmit) {
                    el.adminAccessSubmit.disabled = false;
                    el.adminAccessSubmit.removeAttribute('aria-busy');
                    el.adminAccessSubmit.textContent = getSubmitLabel();
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
            updateSubmitLabel();
            consumeSecureAdminLaunchMarker();
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

    global.FoxBearAdminAccessController = Object.freeze({ version: '1.6.72-ci-safe-hygiene-self-repair', create });
})(typeof window !== 'undefined' ? window : globalThis);
