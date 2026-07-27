// FoxBear Modal State Machine Controller v1.6.12
'use strict';

(function exposeFoxBearModalStateMachine(global) {
    const openLayers = new Set();
    const FOCUSABLE_SELECTOR = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
    ].join(',');
    let scrollLockSnapshot = null;

    function isElement(value) {
        return Boolean(value && typeof value === 'object' && value.nodeType === 1);
    }

    function stopEvent(event) {
        if (!event) return;
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }

    function getDocument(dialog = null) {
        return dialog?.ownerDocument || global.document || null;
    }

    function getFocusable(dialog) {
        if (!isElement(dialog) || typeof dialog.querySelectorAll !== 'function') return [];
        return Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(element => {
            if (!isElement(element) || element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
            if (element.disabled || element.getAttribute('aria-disabled') === 'true') return false;
            if (typeof global.getComputedStyle !== 'function') return true;
            const style = global.getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
    }

    function focusFirst(dialog) {
        const candidates = getFocusable(dialog);
        const panel = dialog?.querySelector?.('[tabindex="-1"], [tabindex], .feature-dialog-panel, .preview-dialog-panel, .program-info-panel, .support-settings-panel, .foxbear-perf-panel');
        const target = candidates[0] || panel || dialog;
        if (target && typeof target.focus === 'function') {
            try { target.focus({ preventScroll: true }); } catch (_) {}
        }
        return target || null;
    }

    function lockDocument(doc) {
        if (!doc?.body || scrollLockSnapshot) return;
        const body = doc.body;
        const root = doc.documentElement;
        const scrollY = Number(global.scrollY || root?.scrollTop || body.scrollTop || 0);
        scrollLockSnapshot = {
            body,
            root,
            scrollY,
            bodyPosition: body.style.position,
            bodyTop: body.style.top,
            bodyLeft: body.style.left,
            bodyRight: body.style.right,
            bodyWidth: body.style.width,
            bodyOverflow: body.style.overflow,
            bodyTouchAction: body.style.touchAction,
            rootOverflow: root?.style?.overflow || ''
        };
        body.dataset.foxbearModalScrollY = String(scrollY);
        body.style.position = 'fixed';
        body.style.top = `${-scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';
        body.style.overflow = 'hidden';
        body.style.touchAction = 'none';
        if (root?.style) root.style.overflow = 'hidden';
        body.classList.add('foxbear-modal-layer-open');
    }

    function unlockDocument() {
        if (!scrollLockSnapshot) return;
        const snapshot = scrollLockSnapshot;
        scrollLockSnapshot = null;
        const { body, root, scrollY } = snapshot;
        if (body?.style) {
            body.style.position = snapshot.bodyPosition;
            body.style.top = snapshot.bodyTop;
            body.style.left = snapshot.bodyLeft;
            body.style.right = snapshot.bodyRight;
            body.style.width = snapshot.bodyWidth;
            body.style.overflow = snapshot.bodyOverflow;
            body.style.touchAction = snapshot.bodyTouchAction;
            body.classList.remove('foxbear-modal-layer-open');
            delete body.dataset.foxbearModalScrollY;
        }
        if (root?.style) root.style.overflow = snapshot.rootOverflow;
        if (typeof global.scrollTo === 'function') {
            try { global.scrollTo({ top: scrollY, left: 0, behavior: 'auto' }); }
            catch (_) { try { global.scrollTo(0, scrollY); } catch (_) {} }
        }
    }

    function syncDocumentLock(dialog = null) {
        if (openLayers.size > 0) lockDocument(getDocument(dialog));
        else unlockDocument();
    }

    function setExternalLayerOpen(layer, open) {
        if (!isElement(layer)) return false;
        if (open) openLayers.add(layer);
        else openLayers.delete(layer);
        syncDocumentLock(layer);
        return true;
    }

    function hardSet(dialog, open, bodyClass) {
        if (!isElement(dialog)) return false;
        dialog.hidden = !open;
        dialog.classList.toggle('show', Boolean(open));
        dialog.setAttribute('aria-hidden', open ? 'false' : 'true');
        dialog.style.display = open ? 'flex' : 'none';
        dialog.style.pointerEvents = open ? 'auto' : 'none';
        if (bodyClass && getDocument(dialog)?.body) {
            getDocument(dialog).body.classList.toggle(bodyClass, Boolean(open));
        }
        setExternalLayerOpen(dialog, Boolean(open));
        return true;
    }

    class FoxBearModalStateMachine {
        constructor(options = {}) {
            this.document = options.document || global.document;
            this.getElement = options.getElement || (id => this.document.getElementById(id));
            this.modals = new Map();
            this.returnFocusByName = new Map();
            this.active = null;
            this.installed = false;
            this.boundClick = this.handleClick.bind(this);
            this.boundKeydown = this.handleKeydown.bind(this);
        }

        register(name, config = {}) {
            if (!name || !config.dialog) return this;
            const normalized = {
                name,
                dialog: config.dialog,
                openers: config.openers || [],
                closers: config.closers || [],
                closeSelector: config.closeSelector || '',
                openerSelector: config.openerSelector || '',
                bodyClass: config.bodyClass || `${name}-dialog-open`,
                onOpen: config.onOpen || null,
                onClose: config.onClose || null,
                returnFocus: config.returnFocus || null,
                closeOnBackdrop: config.closeOnBackdrop !== false
            };
            this.modals.set(name, normalized);
            this.decorateCloseButtons(normalized);
            return this;
        }

        decorateCloseButtons(cfg) {
            if (!cfg) return;
            const dialog = this.resolve(cfg.dialog);
            const buttons = [];
            for (const id of cfg.closers || []) {
                const button = this.resolve(id);
                if (button) buttons.push(button);
            }
            if (dialog && cfg.closeSelector) {
                dialog.querySelectorAll(cfg.closeSelector).forEach(button => buttons.push(button));
            }
            buttons.forEach(button => {
                button.classList.add('foxbear-modal-close');
                button.dataset.foxbearModalClose = cfg.name;
            });
        }

        resolve(ref) {
            if (!ref) return null;
            if (isElement(ref)) return ref;
            return this.getElement(String(ref)) || null;
        }

        isOpen(name) {
            const cfg = this.modals.get(name);
            const dialog = cfg ? this.resolve(cfg.dialog) : null;
            return Boolean(dialog && !dialog.hidden && dialog.classList.contains('show'));
        }

        rememberReturnFocus(name, options = {}) {
            const candidate = this.resolve(options.opener) || options.event?.currentTarget || options.event?.target || this.document?.activeElement;
            if (isElement(candidate) && candidate !== this.document?.body) this.returnFocusByName.set(name, candidate);
        }

        restoreFocus(name, cfg) {
            const remembered = this.returnFocusByName.get(name);
            this.returnFocusByName.delete(name);
            const focusTarget = remembered || this.resolve(cfg.returnFocus || cfg.openers[0]);
            if (focusTarget && this.document?.body?.contains?.(focusTarget) && !focusTarget.hidden && focusTarget.getAttribute?.('aria-hidden') !== 'true') {
                try { focusTarget.focus({ preventScroll: true }); } catch (_) {}
            }
        }

        setOpen(name, open, options = {}) {
            const cfg = this.modals.get(name);
            if (!cfg) return false;
            const dialog = this.resolve(cfg.dialog);
            if (!dialog) return false;
            if (open && this.active && this.active !== name) this.setOpen(this.active, false, { restoreFocus: false, silent: true });
            if (open) this.rememberReturnFocus(name, options);
            hardSet(dialog, Boolean(open), cfg.bodyClass);
            if (open) {
                this.active = name;
                if (!options.silent && typeof cfg.onOpen === 'function') cfg.onOpen({ name, dialog, controller: this, event: options.event || null });
                focusFirst(dialog);
            } else {
                if (this.active === name) this.active = null;
                if (!options.silent && typeof cfg.onClose === 'function') cfg.onClose({ name, dialog, controller: this, event: options.event || null });
                if (options.restoreFocus !== false) this.restoreFocus(name, cfg);
                else this.returnFocusByName.delete(name);
            }
            return true;
        }

        open(name, event = null, opener = null) {
            stopEvent(event);
            return this.setOpen(name, true, { event, opener });
        }

        close(name, event = null, options = {}) {
            stopEvent(event);
            return this.setOpen(name, false, { event, restoreFocus: options.restoreFocus !== false });
        }

        closeAll(event = null) {
            if (event) stopEvent(event);
            let changed = false;
            Array.from(this.modals.keys()).forEach(name => {
                if (this.isOpen(name)) changed = this.setOpen(name, false, { event, restoreFocus: false }) || changed;
            });
            this.active = null;
            return changed;
        }

        matchByIdOrSelector(target, ids = [], selector = '') {
            if (!target || typeof target.closest !== 'function') return null;
            for (const id of ids) {
                const hit = target.closest(`#${id}`);
                if (hit) return hit;
            }
            if (selector) {
                const hit = target.closest(selector);
                if (hit) return hit;
            }
            return null;
        }

        isGenericBackdrop(target) {
            if (!isElement(target) || target.getAttribute('role') !== 'dialog') return false;
            if (target.dataset.foxbearBackdropClose === 'false') return false;
            return Array.from(target.classList || []).some(name => /(?:backdrop|overlay|modal-layer)/i.test(name));
        }

        closeGenericBackdrop(target, event) {
            if (!this.isGenericBackdrop(target)) return false;
            const closeButton = target.querySelector(
                '.foxbear-modal-close, [data-foxbear-modal-close], [data-modal-close], button[aria-label*="닫기"]'
            );
            if (!closeButton || closeButton.disabled || closeButton.getAttribute('aria-disabled') === 'true') return false;
            stopEvent(event);
            closeButton.click();
            return true;
        }

        trapFocus(event) {
            if (!this.active || event.key !== 'Tab') return false;
            const cfg = this.modals.get(this.active);
            const dialog = cfg ? this.resolve(cfg.dialog) : null;
            if (!dialog || !this.isOpen(this.active)) return false;
            const focusable = getFocusable(dialog);
            if (!focusable.length) {
                stopEvent(event);
                focusFirst(dialog);
                return true;
            }
            const current = this.document?.activeElement;
            const index = focusable.indexOf(current);
            const nextIndex = event.shiftKey
                ? (index <= 0 ? focusable.length - 1 : index - 1)
                : (index < 0 || index >= focusable.length - 1 ? 0 : index + 1);
            stopEvent(event);
            try { focusable[nextIndex].focus({ preventScroll: true }); } catch (_) {}
            return true;
        }

        handleClick(event) {
            const target = event.target;
            if (!target || typeof target.closest !== 'function') return;
            for (const [name, cfg] of this.modals.entries()) {
                const opener = this.matchByIdOrSelector(target, cfg.openers, cfg.openerSelector);
                if (opener) {
                    this.open(name, event, opener);
                    return;
                }
                if (this.matchByIdOrSelector(target, cfg.closers, cfg.closeSelector)) {
                    this.close(name, event, { restoreFocus: true });
                    return;
                }
                const dialog = this.resolve(cfg.dialog);
                if (cfg.closeOnBackdrop && dialog && target === dialog && this.isOpen(name)) {
                    this.close(name, event, { restoreFocus: true });
                    return;
                }
            }
            this.closeGenericBackdrop(target, event);
        }

        handleKeydown(event) {
            if (this.trapFocus(event)) return;
            if (event.key === 'Escape') {
                const externalLayer = this.document?.querySelector?.(
                    '.select-popup-backdrop.show, .download-options-backdrop, .ai-recommend-dialog-backdrop.show, #downloadAssist.show'
                );
                if (externalLayer) return;
                if (this.active) this.close(this.active, event, { restoreFocus: true });
                else this.closeAll(event);
                return;
            }
            if (event.key !== 'Enter' && event.key !== ' ') return;
            const target = event.target;
            if (!target || typeof target.closest !== 'function') return;
            for (const [name, cfg] of this.modals.entries()) {
                const opener = this.matchByIdOrSelector(target, cfg.openers, cfg.openerSelector);
                if (opener) {
                    this.open(name, event, opener);
                    return;
                }
            }
        }

        install() {
            if (this.installed || !this.document) return this;
            this.installed = true;
            this.document.addEventListener('click', this.boundClick, { capture: true });
            this.document.addEventListener('keydown', this.boundKeydown, { capture: true });
            return this;
        }
    }

    global.FoxBearModalStateMachine = {
        FoxBearModalStateMachine,
        hardSet,
        setExternalLayerOpen,
        getOpenLayerCount: () => openLayers.size,
        isDocumentLocked: () => Boolean(scrollLockSnapshot),
        getFocusable,
        focusFirst
    };
})(window);
