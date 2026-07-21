// FoxBear Modal State Machine Controller v1.4.0
'use strict';

(function exposeFoxBearModalStateMachine(global) {
    function isElement(value) {
        return Boolean(value && typeof value === 'object' && value.nodeType === 1);
    }

    function stopEvent(event) {
        if (!event) return;
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }

    function hardSet(dialog, open, bodyClass) {
        if (!isElement(dialog)) return false;
        dialog.hidden = !open;
        dialog.classList.toggle('show', Boolean(open));
        dialog.setAttribute('aria-hidden', open ? 'false' : 'true');
        dialog.style.display = open ? 'flex' : 'none';
        dialog.style.pointerEvents = open ? 'auto' : 'none';
        if (bodyClass && global.document && global.document.body) {
            global.document.body.classList.toggle(bodyClass, Boolean(open));
        }
        return true;
    }

    class FoxBearModalStateMachine {
        constructor(options = {}) {
            this.document = options.document || global.document;
            this.getElement = options.getElement || (id => this.document.getElementById(id));
            this.modals = new Map();
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

        setOpen(name, open, options = {}) {
            const cfg = this.modals.get(name);
            if (!cfg) return false;
            const dialog = this.resolve(cfg.dialog);
            if (!dialog) return false;
            if (open && this.active && this.active !== name) this.setOpen(this.active, false, { restoreFocus: false, silent: true });
            hardSet(dialog, Boolean(open), cfg.bodyClass);
            if (open) {
                this.active = name;
                if (!options.silent && typeof cfg.onOpen === 'function') cfg.onOpen({ name, dialog, controller: this, event: options.event || null });
                const panel = dialog.querySelector('[tabindex], .feature-dialog-panel, .preview-dialog-panel, .program-info-panel');
                if (panel && typeof panel.focus === 'function') {
                    try { panel.focus({ preventScroll: true }); } catch (_) {}
                }
            } else {
                if (this.active === name) this.active = null;
                if (!options.silent && typeof cfg.onClose === 'function') cfg.onClose({ name, dialog, controller: this, event: options.event || null });
                if (options.restoreFocus !== false) {
                    const focusTarget = this.resolve(cfg.returnFocus || cfg.openers[0]);
                    if (focusTarget && this.document.body.contains(focusTarget)) {
                        try { focusTarget.focus({ preventScroll: true }); } catch (_) {}
                    }
                }
            }
            return true;
        }

        open(name, event = null) {
            stopEvent(event);
            return this.setOpen(name, true, { event });
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

        handleClick(event) {
            const target = event.target;
            if (!target || typeof target.closest !== 'function') return;
            for (const [name, cfg] of this.modals.entries()) {
                if (this.matchByIdOrSelector(target, cfg.openers, cfg.openerSelector)) {
                    this.open(name, event);
                    return;
                }
                if (this.matchByIdOrSelector(target, cfg.closers, cfg.closeSelector)) {
                    this.close(name, event, { restoreFocus: false });
                    return;
                }
                const dialog = this.resolve(cfg.dialog);
                if (cfg.closeOnBackdrop && dialog && target === dialog && this.isOpen(name)) {
                    this.close(name, event, { restoreFocus: false });
                    return;
                }
            }
        }

        handleKeydown(event) {
            if (event.key === 'Escape') {
                const externalLayer = this.document?.querySelector?.(
                    '.select-popup-backdrop.show, .download-options-backdrop, .ai-recommend-dialog-backdrop.show, #downloadAssist.show'
                );
                if (externalLayer) return;
                if (this.active) this.close(this.active, event, { restoreFocus: false });
                else this.closeAll(event);
                return;
            }
            if (event.key !== 'Enter' && event.key !== ' ') return;
            const target = event.target;
            if (!target || typeof target.closest !== 'function') return;
            for (const [name, cfg] of this.modals.entries()) {
                if (this.matchByIdOrSelector(target, cfg.openers, cfg.openerSelector)) {
                    this.open(name, event);
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

    global.FoxBearModalStateMachine = { FoxBearModalStateMachine, hardSet };
})(window);
