// FoxBear AI Mastering Studio Pro v1.6.41 - administrator access UI controller
'use strict';

(function attachFoxBearAdminAccessController(global) {
    function create(options = {}) {
        const state = options.state || {};
        const el = options.elements || {};
        const toggleSettings = typeof options.toggleSettings === 'function' ? options.toggleSettings : () => {};
        const openMonitor = typeof options.openMonitor === 'function' ? options.openMonitor : () => {};
        const updateTrigger = typeof options.updateTrigger === 'function' ? options.updateTrigger : () => {};
        const updateUi = typeof options.updateUi === 'function' ? options.updateUi : () => {};
        const showToast = typeof options.showToast === 'function' ? options.showToast : () => {};
        const setFallbackModalState = typeof options.setFallbackModalState === 'function' ? options.setFallbackModalState : () => false;
        let eventsBound = false;

        function setStatus(message, tone = 'neutral') {
            if (!el.adminAccessStatus) return;
            el.adminAccessStatus.textContent = String(message || '');
            el.adminAccessStatus.dataset.tone = tone;
        }

        function prepare() {
            if (el.adminAccessPin) {
                el.adminAccessPin.value = '';
                el.adminAccessPin.removeAttribute('aria-invalid');
                el.adminAccessPin.disabled = false;
            }
            setStatus('Firebase 서버 인증 대기', 'neutral');
        }

        function clear() {
            if (el.adminAccessPin) el.adminAccessPin.value = '';
        }

        function open(options = {}) {
            if (state.firebaseIsAdmin) {
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
                global.requestAnimationFrame?.(() => el.adminAccessPin?.focus?.({ preventScroll: true }));
                return opened;
            }
            prepare();
            setFallbackModalState(el.adminAccessDialog, true, 'admin-access-open');
            global.FoxBearModalStateMachine?.focusFirst?.(el.adminAccessDialog);
            global.requestAnimationFrame?.(() => el.adminAccessPin?.focus?.({ preventScroll: true }));
            return true;
        }

        function close(options = {}) {
            if (!el.adminAccessDialog) return false;
            const controller = state.modalController;
            if (controller?.modals?.has?.('adminAccess') && controller.isOpen('adminAccess')) {
                return controller.setOpen('adminAccess', false, { restoreFocus: options.restoreFocus !== false });
            }
            setFallbackModalState(el.adminAccessDialog, false, 'admin-access-open');
            clear();
            if (options.restoreFocus !== false) {
                try { el.mobileNativeQuickToggle?.focus?.({ preventScroll: true }); } catch (error) {}
            }
            return true;
        }

        function formatFailure(error) {
            const code = String(error?.code || '').replace(/^functions\//, '');
            const retryAfterSeconds = Number(error?.details?.retryAfterSeconds || 0);
            if (code === 'resource-exhausted') {
                const minutes = retryAfterSeconds ? Math.max(1, Math.ceil(retryAfterSeconds / 60)) : 15;
                return `인증 시도가 제한되었습니다. 약 ${minutes}분 뒤 다시 시도해주세요.`;
            }
            if (code === 'permission-denied') return '관리자 비밀번호가 올바르지 않습니다.';
            if (code === 'failed-precondition') return error?.message || 'Firebase 관리자 인증 설정을 확인해주세요.';
            if (code === 'unauthenticated') return 'Firebase 익명 인증을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.';
            return error?.message || '관리자 인증에 실패했습니다.';
        }

        async function submit(event = null) {
            event?.preventDefault?.();
            if (state.adminUnlockBusy) return false;
            const pin = String(el.adminAccessPin?.value || '').trim();
            if (!/^\d{4,12}$/.test(pin)) {
                el.adminAccessPin?.setAttribute('aria-invalid', 'true');
                setStatus('숫자 4~12자리 비밀번호를 입력해주세요.', 'error');
                el.adminAccessPin?.focus?.({ preventScroll: true });
                return false;
            }
            const bridge = global.FoxBearFirebase;
            if (!bridge || typeof bridge.unlockAdminAccess !== 'function') {
                setStatus('Firebase 관리자 인증 함수가 아직 준비되지 않았습니다.', 'error');
                return false;
            }
            state.adminUnlockBusy = true;
            if (el.adminAccessSubmit) {
                el.adminAccessSubmit.disabled = true;
                el.adminAccessSubmit.setAttribute('aria-busy', 'true');
                el.adminAccessSubmit.textContent = '서버 확인 중…';
            }
            if (el.adminAccessPin) {
                el.adminAccessPin.disabled = true;
                el.adminAccessPin.removeAttribute('aria-invalid');
            }
            setStatus('Firebase 서버에서 관리자 권한을 확인하고 있습니다.', 'neutral');
            updateUi();
            try {
                const result = await bridge.unlockAdminAccess(pin);
                if (!result?.active) throw new Error('관리자 세션을 발급받지 못했습니다.');
                state.firebaseUserId = result.uid || state.firebaseUserId || '';
                state.firebaseIsAdmin = true;
                state.firebaseAdminChecked = true;
                state.firebaseAdminRole = result.role || 'admin-session';
                state.adminSessionExpiresAt = result.expiresAt || '';
                state.adminStatsRemoteError = '';
                clear();
                updateTrigger();
                updateUi();
                setStatus('관리자 인증이 완료되었습니다.', 'ok');
                close({ restoreFocus: false });
                showToast('관리자 인증 완료 · 모니터링을 엽니다.');
                global.requestAnimationFrame?.(() => openMonitor());
                return true;
            } catch (error) {
                setStatus(formatFailure(error), 'error');
                if (el.adminAccessPin) {
                    el.adminAccessPin.value = '';
                    el.adminAccessPin.setAttribute('aria-invalid', 'true');
                    global.requestAnimationFrame?.(() => el.adminAccessPin?.focus?.({ preventScroll: true }));
                }
                return false;
            } finally {
                state.adminUnlockBusy = false;
                if (el.adminAccessSubmit) {
                    el.adminAccessSubmit.disabled = false;
                    el.adminAccessSubmit.removeAttribute('aria-busy');
                    el.adminAccessSubmit.textContent = '인증 후 열기';
                }
                if (el.adminAccessPin) el.adminAccessPin.disabled = false;
                updateUi();
            }
        }

        function bindEvents() {
            if (eventsBound) return false;
            eventsBound = true;
            el.adminAccessClose?.addEventListener('click', () => close());
            el.adminAccessCancel?.addEventListener('click', () => close());
            el.adminAccessForm?.addEventListener('submit', submit);
            el.adminAccessPin?.addEventListener('input', () => {
                el.adminAccessPin.removeAttribute('aria-invalid');
                if (!state.adminUnlockBusy) setStatus('Firebase 서버 인증 대기', 'neutral');
            });
            el.adminAccessDialog?.addEventListener('click', event => {
                if (event.target === el.adminAccessDialog && !state.adminUnlockBusy) close({ restoreFocus: false });
            });
            global.addEventListener?.('keydown', event => {
                if (event.key === 'Escape' && el.adminAccessDialog?.classList.contains('show') && !state.adminUnlockBusy) close({ restoreFocus: false });
            });
            return true;
        }

        return Object.freeze({ open, close, submit, bindEvents, prepare, clear, setStatus });
    }

    global.FoxBearAdminAccessController = Object.freeze({ version: '1.6.41-admin-secret-pin-session', create });
})(typeof window !== 'undefined' ? window : globalThis);
