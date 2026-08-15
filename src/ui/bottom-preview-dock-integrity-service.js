'use strict';

(function exposeFoxBearBottomPreviewDockIntegrityService(global) {
    const VERSION = '1.6.102-admin-lazyload-sw-hygiene-hardening';

    function createController(options = {}) {
        const state = options.state || {};
        const documentRef = options.document || global.document;
        const getSelectedTrack = typeof options.getSelectedTrack === 'function' ? options.getSelectedTrack : () => null;
        const applyTrackToControls = typeof options.applyTrackToControls === 'function' ? options.applyTrackToControls : () => {};
        const getDock = typeof options.getDock === 'function' ? options.getDock : () => documentRef?.getElementById?.('bottomPreviewDock') || null;
        const getPlayer = typeof options.getPlayer === 'function' ? options.getPlayer : () => documentRef?.getElementById?.('bottomPreviewPlayer') || null;
        const renderDock = typeof options.renderDock === 'function' ? options.renderDock : () => {};
        const hideDock = typeof options.hideDock === 'function' ? options.hideDock : () => {};
        const requestFrame = options.requestAnimationFrame || global.requestAnimationFrame?.bind(global) || (callback => global.setTimeout(callback, 0));
        const cancelFrame = options.cancelAnimationFrame || global.cancelAnimationFrame?.bind(global) || (handle => global.clearTimeout(handle));
        const getComputedStyleRef = options.getComputedStyle || global.getComputedStyle?.bind(global) || (() => null);

        function validTrackById(id) {
            if (!id || !Array.isArray(state.tracks)) return null;
            return state.tracks.find(track => String(track?.id || '') === String(id)) || null;
        }

        function repairSelection(reason = 'render') {
            const tracks = Array.isArray(state.tracks) ? state.tracks : [];
            if (!tracks.length) return null;
            const active = getSelectedTrack();
            if (active) return active;
            let fallback = validTrackById(state.bottomPreviewTrackId);
            if (!fallback && state.selectedIds && typeof state.selectedIds.values === 'function') {
                for (const id of state.selectedIds.values()) {
                    fallback = validTrackById(id);
                    if (fallback) break;
                }
            }
            if (!fallback) fallback = tracks[0] || null;
            if (!fallback) return null;
            state.selectedId = fallback.id;
            if (!validTrackById(state.bottomPreviewTrackId)) state.bottomPreviewTrackId = fallback.id;
            state.bottomPreviewLastRepairReason = `selection:${reason}`;
            try {
                applyTrackToControls(fallback);
            } catch (error) {
                console.warn('FoxBear active track selection recovery failed:', error);
            }
            return fallback;
        }

        function getSnapshot() {
            const dock = getDock();
            const player = getPlayer();
            const track = getSelectedTrack();
            const style = dock ? getComputedStyleRef(dock) : null;
            const rect = dock?.getBoundingClientRect?.() || { width: 0, height: 0 };
            const show = Boolean(dock?.classList?.contains('show'));
            const ariaHidden = dock?.getAttribute?.('aria-hidden') || '';
            const bodyActive = Boolean(documentRef?.body?.classList?.contains('bottom-preview-active'));
            const playerChildren = Number(player?.children?.length || 0);
            const activeAudio = player?.querySelector?.('audio[data-bottom-preview-active="true"]')
                || player?.querySelector?.('audio:not([data-crossfade-legacy="true"])')
                || player?.querySelector?.('audio')
                || null;
            const selectedTrackId = String(track?.id || '');
            const dockTrackId = String(state.bottomPreviewTrackId || '');
            const playerTrackId = String(activeAudio?.dataset?.trackId || player?.dataset?.trackId || '');
            const selectionIntegrity = !Number(state.tracks?.length || 0) || Boolean(track);
            const expectedVisible = Boolean(track);
            const renderedVisible = Boolean(show && ariaHidden === 'false' && bodyActive && style?.display !== 'none' && style?.visibility !== 'hidden' && Number(rect.height || 0) > 0);
            const trackOwnerMatches = !expectedVisible || Boolean(selectedTrackId && dockTrackId === selectedTrackId && playerTrackId === selectedTrackId);
            const healthy = selectionIntegrity && (expectedVisible ? Boolean(renderedVisible && playerChildren > 0 && trackOwnerMatches) : Boolean(!show && ariaHidden !== 'false' && !bodyActive));
            return Object.freeze({
                version: VERSION,
                trackCount: Number(state.tracks?.length || 0),
                selectedId: String(state.selectedId || ''),
                selectedTrackId,
                selectedValid: Boolean(track),
                selectionIntegrity,
                dockTrackId,
                playerTrackId,
                trackOwnerMatches,
                expectedVisible,
                show,
                ariaHidden,
                bodyActive,
                playerChildren,
                audioCount: Number(player?.querySelectorAll?.('audio')?.length || 0),
                display: style?.display || '',
                visibility: style?.visibility || '',
                opacity: style?.opacity || '',
                width: Number(rect.width || 0),
                height: Number(rect.height || 0),
                healthy,
                repairCount: Number(state.bottomPreviewRepairCount || 0),
                lastRepairReason: String(state.bottomPreviewLastRepairReason || ''),
                lastIntegrityAt: Number(state.bottomPreviewLastIntegrityAt || 0)
            });
        }

        function repair(reason = 'manual') {
            const dock = getDock();
            const player = getPlayer();
            if (!dock || !player) return getSnapshot();
            const track = repairSelection(`dock:${reason}`);
            if (!track) {
                const before = getSnapshot();
                if (before.show || before.ariaHidden === 'false' || before.bodyActive || before.playerChildren > 0) {
                    state.bottomPreviewRepairCount = Number(state.bottomPreviewRepairCount || 0) + 1;
                    state.bottomPreviewLastRepairReason = `hide:${reason}`;
                    hideDock();
                }
                state.bottomPreviewLastIntegrityAt = Date.now();
                return getSnapshot();
            }
            const before = getSnapshot();
            const needsRenderRepair = !before.show || before.ariaHidden !== 'false' || !before.bodyActive || before.playerChildren === 0 || before.display === 'none' || before.visibility === 'hidden' || before.height <= 0 || !before.trackOwnerMatches;
            if (needsRenderRepair) {
                state.bottomPreviewRepairCount = Number(state.bottomPreviewRepairCount || 0) + 1;
                state.bottomPreviewLastRepairReason = `render:${reason}`;
                renderDock({ keepPlaying: true, integrityRepair: true, skipIntegritySchedule: true });
            }
            state.bottomPreviewLastIntegrityAt = Date.now();
            return getSnapshot();
        }

        function schedule(reason = 'scheduled') {
            if (state.bottomPreviewIntegrityRaf) cancelFrame(state.bottomPreviewIntegrityRaf);
            state.bottomPreviewIntegrityRaf = requestFrame(() => {
                state.bottomPreviewIntegrityRaf = 0;
                repair(reason);
            });
            return state.bottomPreviewIntegrityRaf;
        }

        const diagnostics = Object.freeze({ version: VERSION, getSnapshot, repair: reason => repair(reason || 'diagnostic') });
        global.FoxBearDockDiagnostics = diagnostics;
        return Object.freeze({ version: VERSION, repairSelection, getSnapshot, repair, schedule });
    }

    global.FoxBearBottomPreviewDockIntegrityService = Object.freeze({ version: VERSION, createController });
})(typeof window !== 'undefined' ? window : globalThis);
