// FoxBear AI Mastering Studio Pro v1.6.80 - AI mastering / expert workspace mode controller
'use strict';
(function exposeFoxBearUiModeService(global) {
    const MODES = Object.freeze({ AI: 'ai', EXPERT: 'expert' });
    const SESSION_KEY = 'foxbear-ui-mode-session-v1';

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

    function publishPrepaintMode() {
        const restored = safeReadSession(global.sessionStorage);
        try { global.document?.documentElement?.setAttribute('data-ui-mode-pref', restored || 'unselected'); }
        catch (error) {}
        return restored;
    }

    publishPrepaintMode();

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

        const get = key => documentRef?.getElementById?.(ids[key]) || null;
        const body = () => documentRef?.body || null;
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
            const root = body();
            if (root) root.dataset.uiMode = mode;
            if (applyOptions.persist !== false) safeWriteSession(storage, mode);
            updateControls();
            onModeChange(mode, previous);
            try { onLayoutChange(mode, previous); } catch (error) {}
            if (applyOptions.announce === true && previous !== mode) announce(`${modeLabel(mode)} 화면으로 전환했습니다.`);
            return mode;
        }

        function getFocusable() {
            const panel = get('panel');
            if (!panel?.querySelectorAll) return [];
            return Array.from(panel.querySelectorAll('button:not([disabled]):not([hidden]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
                .filter(node => !node.hidden && node.getAttribute?.('aria-hidden') !== 'true');
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
            body()?.classList?.remove('ui-mode-choice-open');
            if (closeOptions.restoreFocus !== false && lastFocused && documentRef?.contains?.(lastFocused)) focusSafe(lastFocused);
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
            const restored = safeReadSession(storage);
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
                    if (chooserOpen) updateControls();
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
            return Object.freeze({ mode, chooserOpen, chooserRequired, initialized, restored: Boolean(safeReadSession(storage)) });
        }

        return Object.freeze({ init, apply, openChooser: open, closeChooser: close, select, getSnapshot, normalizeMode });
    }

    global.FoxBearUiModeService = Object.freeze({ MODES, SESSION_KEY, normalizeMode, createController });
})(window);
