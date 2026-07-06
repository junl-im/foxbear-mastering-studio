// FoxBear Dock Controller v1.4.0
'use strict';

(function exposeFoxBearDockController(global) {
    function stopEvent(event) {
        if (!event) return;
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }

    class FoxBearDockController {
        constructor(options = {}) {
            this.root = options.root || null;
            this.handlers = options.handlers || {};
            this.installed = false;
            this.boundClick = this.handleClick.bind(this);
        }

        setRoot(root) {
            if (this.root === root) return this;
            if (this.installed && this.root) this.root.removeEventListener('click', this.boundClick, true);
            this.root = root;
            if (this.installed && this.root) this.root.addEventListener('click', this.boundClick, true);
            return this;
        }

        install() {
            if (this.installed) return this;
            this.installed = true;
            if (this.root) this.root.addEventListener('click', this.boundClick, true);
            return this;
        }

        handleClick(event) {
            if (!this.root || !event.target || typeof event.target.closest !== 'function') return;
            const target = event.target.closest('[data-dock-action], #bottomPreviewPlayBtn, #bottomPreviewMasterBtn, #bottomPreviewMasterPreviewBtn, #bottomPreviewWaveformBtn, #bottomPreviewOriginalBtn, #bottomPreviewMasteredBtn, [data-preview-translation-mode]');
            if (!target || !this.root.contains(target)) return;
            const action = target.dataset?.dockAction || (target.dataset?.previewTranslationMode ? 'translation' : target.id);
            const handler = this.handlers[action];
            if (!handler) return;
            stopEvent(event);
            handler(event, target);
        }
    }

    global.FoxBearDockController = { FoxBearDockController };
})(window);
