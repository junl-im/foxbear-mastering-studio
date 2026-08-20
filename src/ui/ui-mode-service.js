// FoxBear AI Mastering Studio Pro v1.6.111 - AI mastering / expert workspace mode controller
'use strict';
(function exposeFoxBearUiModeService(global) {
    const MODES = Object.freeze({ AI: 'ai', EXPERT: 'expert' });
    const SESSION_KEY = 'foxbear-ui-mode-session-v1';
    const SESSION_CONTRACT = Object.freeze({
        storage: 'sessionStorage',
        sameTabReload: 'restore',
        freshBrowsingSession: 'require-choice',
        manualSwitch: 'reopen'
    });

    function normalizeMode(value) {
        const mode = String(value || '').trim().toLowerCase();
        return mode === MODES.AI || mode === MODES.EXPERT ? mode : '';
    }

    function safeReadSession(storage) {
        if (!storage || typeof storage.getItem !== 'function') return '';
        try { return normalizeMode(storage.getItem(SESSION_KEY)); }
        catch (error) { return ''; }
    }

    function safeWriteSession(storage, mode) {
        if (!storage || typeof storage.setItem !== 'function') return false;
        try { storage.setItem(SESSION_KEY, normalizeMode(mode)); return true; }
        catch (error) { return false; }
    }

    function safeReadE2eMode() {
        if (global.__FOXBEAR_E2E__ !== true) return '';
        return normalizeMode(global.__FOXBEAR_E2E_UI_MODE__);
    }

    function safeReadPendingMode() {
        return normalizeMode(global.__FOXBEAR_PENDING_UI_MODE__);
    }

    function readInitialModeState(storage) {
        const session = safeReadSession(storage);
        if (session) return Object.freeze({ mode: session, source: 'session' });
        const pending = safeReadPendingMode();
        if (pending) return Object.freeze({ mode: pending, source: 'pending' });
        const e2e = safeReadE2eMode();
        if (e2e) return Object.freeze({ mode: e2e, source: 'e2e' });
        return Object.freeze({ mode: '', source: 'unselected' });
    }

    function readInitialMode(storage) {
        return readInitialModeState(storage).mode;
    }

    function publishPrepaintMode() {
        const restored = readInitialMode(global.sessionStorage);
        try { global.document?.documentElement?.setAttribute('data-ui-mode-pref', restored || 'unselected'); }
        catch (error) {}
        return restored;
    }

    publishPrepaintMode();

    function applyEarlyModeSelection(nextMode) {
        const normalized = normalizeMode(nextMode);
        if (!normalized) return false;
        const activeController = global.FoxBearUiModeController;
        if (activeController && typeof activeController.select === 'function') {
            try {
                if (activeController.select(normalized) !== false) return true;
            } catch (error) {
                console.warn('FoxBear UI mode controller selection fallback:', error);
            }
        }

        global.__FOXBEAR_PENDING_UI_MODE__ = normalized;
        safeWriteSession(global.sessionStorage, normalized);
        const documentRef = global.document;
        const chooser = documentRef?.getElementById?.('uiModeChooser') || null;
        const shell = documentRef?.querySelector?.('.app-shell') || null;
        const ai = documentRef?.getElementById?.('uiModeAiBtn') || null;
        const expert = documentRef?.getElementById?.('uiModeExpertBtn') || null;
        const switcher = documentRef?.getElementById?.('uiModeSwitchBtn') || null;
        const switcherLabel = documentRef?.getElementById?.('uiModeSwitchLabel') || null;
        const label = normalized === MODES.AI ? 'AI 마스터링' : '전문가 모드';

        try { documentRef?.documentElement?.setAttribute?.('data-ui-mode-pref', normalized); } catch (error) {}
        if (documentRef?.body) {
            documentRef.body.dataset.uiMode = normalized;
            documentRef.body.classList?.remove?.('ui-mode-choice-open');
        }
        if (chooser) {
            chooser.classList?.remove?.('show');
            chooser.hidden = true;
            chooser.dataset.required = 'false';
            chooser.setAttribute?.('aria-hidden', 'true');
            try { global.FoxBearModalStateMachine?.setExternalLayerOpen?.(chooser, false); } catch (error) {}
        }
        if (shell && 'inert' in shell) shell.inert = false;
        if (ai) {
            ai.dataset.active = normalized === MODES.AI ? 'true' : 'false';
            ai.setAttribute?.('aria-pressed', String(normalized === MODES.AI));
        }
        if (expert) {
            expert.dataset.active = normalized === MODES.EXPERT ? 'true' : 'false';
            expert.setAttribute?.('aria-pressed', String(normalized === MODES.EXPERT));
        }
        if (switcher) {
            switcher.dataset.mode = normalized;
            switcher.setAttribute?.('aria-label', `${label} 사용 중 · 작업 방식 변경`);
        }
        if (switcherLabel) switcherLabel.textContent = label;
        try {
            global.dispatchEvent?.(new CustomEvent('foxbear:ui-mode-early-selected', { detail: { mode: normalized } }));
        } catch (error) {}
        return true;
    }

    function installEarlyChoiceBridge() {
        const documentRef = global.document;
        if (!documentRef?.addEventListener || global.__FOXBEAR_UI_MODE_EARLY_BRIDGE_INSTALLED__ === true) return false;
        global.__FOXBEAR_UI_MODE_EARLY_BRIDGE_INSTALLED__ = true;
        documentRef.addEventListener('click', event => {
            const target = event?.target?.closest?.('#uiModeAiBtn, #uiModeExpertBtn');
            if (!target) return;
            const nextMode = target.id === 'uiModeExpertBtn' ? MODES.EXPERT : MODES.AI;
            if (!applyEarlyModeSelection(nextMode)) return;
            event.preventDefault?.();
            event.stopPropagation?.();
        }, true);
        return true;
    }

    installEarlyChoiceBridge();

    function createController(options = {}) {
        const documentRef = options.document || global.document;
        const storage = Object.prototype.hasOwnProperty.call(options, 'sessionStorage') ? options.sessionStorage : global.sessionStorage;
        const onModeChange = typeof options.onModeChange === 'function' ? options.onModeChange : () => {};
        const onLayoutChange = typeof options.onLayoutChange === 'function' ? options.onLayoutChange : () => {};
        const announce = typeof options.announce === 'function' ? options.announce : () => {};
        const ids = {
            chooser: options.chooserId || 'uiModeChooser',
            panel: options.panelId || 'uiModeChooserPanel',
            close: options.closeId || 'uiModeChooserClose',
            ai: options.aiId || 'uiModeAiBtn',
            expert: options.expertId || 'uiModeExpertBtn',
            switcher: options.switcherId || 'uiModeSwitchBtn',
            switcherLabel: options.switcherLabelId || 'uiModeSwitchLabel'
        };
        let mode = '';
        let initialized = false;
        let chooserOpen = false;
        let chooserRequired = false;
        let lastFocused = null;
        let pageshowBound = false;
        let overlayRegistered = false;
        let backgroundInertPrevious = null;

        const get = key => documentRef?.getElementById?.(ids[key]) || null;
        const body = () => documentRef?.body || null;
        const appShell = () => documentRef?.querySelector?.('.app-shell') || null;
        const modeLabel = value => value === MODES.AI ? 'AI 마스터링' : '전문가 모드';

        function updateControls() {
            const switcher = get('switcher');
            const label = get('switcherLabel');
            const ai = get('ai');
            const expert = get('expert');
            if (label) label.textContent = mode ? modeLabel(mode) : '작업 방식';
            if (switcher) {
                switcher.dataset.mode = mode || 'unselected';
                switcher.setAttribute('aria-label', mode ? `${modeLabel(mode)} 사용 중 · 작업 방식 변경` : '작업 방식 선택');
            }
            if (ai) {
                ai.dataset.active = mode === MODES.AI ? 'true' : 'false';
                ai.setAttribute('aria-pressed', String(mode === MODES.AI));
            }
            if (expert) {
                expert.dataset.active = mode === MODES.EXPERT ? 'true' : 'false';
                expert.setAttribute('aria-pressed', String(mode === MODES.EXPERT));
            }
        }

        function focusSafe(node) {
            if (!node || typeof node.focus !== 'function') return false;
            try { node.focus({ preventScroll: true }); return true; }
            catch (error) { try { node.focus(); return true; } catch (nestedError) { return false; } }
        }

        function apply(nextMode, applyOptions = {}) {
            const normalized = normalizeMode(nextMode);
            if (!normalized) return '';
            const previous = mode;
            mode = normalized;
            global.__FOXBEAR_PENDING_UI_MODE__ = mode;
            const root = body();
            if (root) root.dataset.uiMode = mode;
            try { documentRef?.documentElement?.setAttribute?.('data-ui-mode-pref', mode); } catch (error) {}
            if (applyOptions.persist !== false) safeWriteSession(storage, mode);
            updateControls();
            onModeChange(mode, previous);
            try { onLayoutChange(mode, previous); } catch (error) {}
            if (applyOptions.announce === true && previous !== mode) announce(`${modeLabel(mode)} 화면으로 전환했습니다.`);
            return mode;
        }

        function isFocusCandidateAvailable(node, panel) {
            if (!node || node.disabled || node.getAttribute?.('aria-disabled') === 'true' || node.getAttribute?.('tabindex') === '-1') return false;
            let current = node;
            while (current) {
                if (current.hidden || current.inert === true || current.getAttribute?.('aria-hidden') === 'true' || current.hasAttribute?.('inert')) return false;
                if (typeof global.getComputedStyle === 'function') {
                    try {
                        const style = global.getComputedStyle(current);
                        if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse' || style?.contentVisibility === 'hidden') return false;
                    } catch (error) {}
                }
                if (current === panel) break;
                current = current.parentElement || null;
            }
            return true;
        }

        function getFocusable() {
            const panel = get('panel');
            if (!panel?.querySelectorAll) return [];
            const sharedFocusable = global.FoxBearModalStateMachine?.getFocusable;
            if (typeof sharedFocusable === 'function') {
                try { return sharedFocusable(panel); } catch (error) {}
            }
            return Array.from(panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'))
                .filter(node => isFocusCandidateAvailable(node, panel));
        }

        function setBackgroundInert(active) {
            const shell = appShell();
            if (!shell || !('inert' in shell)) return false;
            if (active) {
                if (backgroundInertPrevious === null) backgroundInertPrevious = Boolean(shell.inert);
                shell.inert = true;
                return true;
            }
            if (backgroundInertPrevious !== null) {
                shell.inert = backgroundInertPrevious;
                backgroundInertPrevious = null;
            }
            return true;
        }

        function syncOverlayRegistration(openState) {
            const chooser = get('chooser');
            const panel = get('panel');
            const manager = global.FoxBearModalStateMachine;
            if (!chooser || !manager?.setExternalLayerOpen) return false;
            if (openState) {
                manager.setExternalLayerOpen(chooser, true, {
                    mode: 'dialog',
                    panel,
                    opener: lastFocused,
                    lockScroll: true,
                    history: !chooserRequired,
                    onRequestClose: () => {
                        if (chooserRequired && !mode) return false;
                        return close({ restoreFocus: true, fromOverlay: true });
                    }
                });
                overlayRegistered = true;
                return true;
            }
            if (overlayRegistered) manager.setExternalLayerOpen(chooser, false);
            overlayRegistered = false;
            return true;
        }

        function open(openOptions = {}) {
            const chooser = get('chooser');
            const panel = get('panel');
            if (!chooser || !panel) return false;
            chooserRequired = openOptions.required === true || !mode;
            chooserOpen = true;
            lastFocused = documentRef?.activeElement || null;
            chooser.hidden = false;
            chooser.classList.add('show');
            chooser.dataset.required = chooserRequired ? 'true' : 'false';
            chooser.setAttribute('aria-hidden', 'false');
            body()?.classList?.add('ui-mode-choice-open');
            setBackgroundInert(true);
            syncOverlayRegistration(true);
            updateControls();
            const preferred = mode === MODES.EXPERT ? get('expert') : get('ai');
            const focusTarget = preferred || getFocusable()[0] || panel;
            const raf = global.requestAnimationFrame || (callback => global.setTimeout?.(callback, 0));
            if (typeof raf === 'function') raf(() => focusSafe(focusTarget));
            return true;
        }

        function close(closeOptions = {}) {
            if (chooserRequired && !mode && closeOptions.force !== true) return false;
            const chooser = get('chooser');
            if (!chooser) return false;
            chooserOpen = false;
            chooserRequired = false;
            chooser.classList.remove('show');
            chooser.hidden = true;
            chooser.dataset.required = 'false';
            chooser.setAttribute('aria-hidden', 'true');
            syncOverlayRegistration(false);
            setBackgroundInert(false);
            body()?.classList?.remove('ui-mode-choice-open');
            if (closeOptions.restoreFocus !== false && lastFocused && documentRef?.contains?.(lastFocused)) focusSafe(lastFocused);
            lastFocused = null;
            return true;
        }

        function releaseForEmergency() {
            const chooser = get('chooser');
            chooserOpen = false;
            chooserRequired = false;
            if (chooser) {
                chooser.classList.remove('show');
                chooser.hidden = true;
                chooser.dataset.required = 'false';
                chooser.setAttribute('aria-hidden', 'true');
                try { global.FoxBearModalStateMachine?.setExternalLayerOpen?.(chooser, false); } catch (error) {}
            }
            overlayRegistered = false;
            setBackgroundInert(false);
            body()?.classList?.remove('ui-mode-choice-open');
            lastFocused = null;
            return true;
        }

        function select(nextMode) {
            const selected = apply(nextMode, { persist: true, announce: Boolean(mode) });
            if (!selected) return false;
            close({ force: true, restoreFocus: false });
            const switcher = get('switcher');
            const preferredFocus = selected === MODES.AI ? documentRef?.getElementById?.('fileDrop') : switcher;
            const raf = global.requestAnimationFrame || (callback => global.setTimeout?.(callback, 0));
            if (typeof raf === 'function') raf(() => focusSafe(preferredFocus || switcher));
            return true;
        }

        function handleKeydown(event) {
            if (!chooserOpen) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                if (!chooserRequired) close();
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = getFocusable();
            if (!focusable.length) { event.preventDefault(); focusSafe(get('panel')); return; }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = documentRef.activeElement;
            if (event.shiftKey && (active === first || !get('panel')?.contains?.(active))) {
                event.preventDefault(); focusSafe(last);
            } else if (!event.shiftKey && active === last) {
                event.preventDefault(); focusSafe(first);
            }
        }

        function bindOnce(node, key, handler) {
            if (!node || node.dataset?.[key] === 'true') return;
            if (node.dataset) node.dataset[key] = 'true';
            node.addEventListener('click', handler);
        }

        function init() {
            if (initialized) return getSnapshot();
            initialized = true;
            const restored = readInitialMode(storage);
            const root = body();
            if (restored) {
                apply(restored, { persist: false });
                close({ force: true, restoreFocus: false });
            } else if (root) root.dataset.uiMode = 'unselected';
            bindOnce(get('ai'), 'uiModeBound', () => select(MODES.AI));
            bindOnce(get('expert'), 'uiModeBound', () => select(MODES.EXPERT));
            bindOnce(get('switcher'), 'uiModeBound', () => open({ required: false }));
            bindOnce(get('close'), 'uiModeBound', () => close());
            const chooser = get('chooser');
            if (chooser && chooser.dataset?.uiModeKeyBound !== 'true') {
                chooser.dataset.uiModeKeyBound = 'true';
                chooser.addEventListener('keydown', handleKeydown);
                chooser.addEventListener('click', event => {
                    if (event.target === chooser && !chooserRequired) close();
                });
            }
            if (!pageshowBound && global.addEventListener) {
                pageshowBound = true;
                global.addEventListener('pageshow', () => {
                    if (mode) apply(mode, { persist: false });
                    if (chooserOpen) { syncOverlayRegistration(true); updateControls(); }
                });
            }
            updateControls();
            if (!restored) {
                const raf = global.requestAnimationFrame || (callback => global.setTimeout?.(callback, 0));
                if (typeof raf === 'function') raf(() => open({ required: true }));
                else open({ required: true });
            }
            return getSnapshot();
        }

        function getSnapshot() {
            const initialState = readInitialModeState(storage);
            return Object.freeze({
                mode, chooserOpen, chooserRequired, initialized, overlayRegistered,
                restored: Boolean(initialState.mode),
                restoredSource: initialState.source,
                sessionContract: SESSION_CONTRACT
            });
        }

        return Object.freeze({ init, apply, openChooser: open, closeChooser: close, releaseForEmergency, select, getSnapshot, normalizeMode });
    }

    global.FoxBearUiModeService = Object.freeze({ MODES, SESSION_KEY, SESSION_CONTRACT, normalizeMode, createController, applyEarlyModeSelection, installEarlyChoiceBridge });
})(window);
