// FoxBear AI Mastering Studio Pro v1.6.95 - post-master playback readiness recovery
(function attachFoxBearPostMasterPlaybackRecoveryService(global) {
    'use strict';

    const SERVICE_VERSION = '1.6.95-release-artifact-safety';
    const DEFAULT_READY_TIMEOUT_MS = 2200;

    function getExpectedSource(track, mode = 'original') {
        if (!track) return '';
        if (mode === 'mastered') return String(track.masteredUrl || '');
        if (mode === 'masterPreview') return String(track.masterPreviewUrl || '');
        return String(track.originalUrl || '');
    }

    function getDeclaredSource(audio) {
        if (!audio) return '';
        return String(audio.getAttribute?.('src') || audio.src || '');
    }

    function isAligned(track, mode, audio) {
        if (!track || !audio || audio.isConnected === false) return false;
        const expected = getExpectedSource(track, mode);
        const actual = getDeclaredSource(audio);
        const ownerId = String(audio.dataset?.trackId || audio.dataset?.spectrumTrackId || '');
        return Boolean(expected && actual === expected && (!ownerId || ownerId === String(track.id || '')));
    }

    function warmAudio(audio) {
        if (!audio || audio.isConnected === false) return false;
        try { audio.preload = 'auto'; } catch (error) {}
        const requestActive = Boolean(audio._foxbearFadeState || !audio.paused);
        if (!requestActive && Number(audio.readyState || 0) === 0) {
            try { audio.load?.(); } catch (error) {}
        }
        return true;
    }

    function findPlayerOwner(root, audio) {
        if (!root || !audio) return null;
        return Array.from(root.children || []).find(child => child === audio || child.contains?.(audio)) || null;
    }

    function createController(deps = {}) {
        const getState = typeof deps.getState === 'function' ? deps.getState : () => ({});
        const getPlayerRoot = typeof deps.getPlayerRoot === 'function' ? deps.getPlayerRoot : () => null;
        const getActiveAudio = typeof deps.getActiveAudio === 'function' ? deps.getActiveAudio : () => null;
        const renderDock = typeof deps.renderDock === 'function' ? deps.renderDock : () => {};
        const syncExternalPlayButton = typeof deps.syncExternalPlayButton === 'function' ? deps.syncExternalPlayButton : () => {};
        const playWithFadeIn = typeof deps.playWithFadeIn === 'function' ? deps.playWithFadeIn : () => Promise.resolve(false);
        const requestFrame = typeof deps.requestAnimationFrame === 'function'
            ? deps.requestAnimationFrame
            : (typeof global.requestAnimationFrame === 'function' ? global.requestAnimationFrame.bind(global) : callback => global.setTimeout(callback, 0));

        function stabilizeAfterMastering(track, options = {}) {
            const state = getState() || {};
            const root = getPlayerRoot();
            if (!track || !root) return false;
            const eligible = state.selectedId === track.id
                || state.bottomPreviewTrackId === track.id
                || (Array.isArray(state.tracks) && state.tracks.length === 1 && !state.selectedId);
            if (!eligible) return false;
            if (options.preserveOriginalPlayback) {
                renderDock({ keepPlaying: true });
                return true;
            }
            state.bottomPreviewMode = 'mastered';
            state.bottomPreviewTrackId = track.id;
            const current = getActiveAudio();
            if (isAligned(track, 'mastered', current)) {
                warmAudio(current);
                syncExternalPlayButton(current, !current.paused && !current.ended);
                return true;
            }
            if (current && (current._foxbearFadeState || !current.paused)) return false;
            renderDock({ keepPlaying: true });
            const repaired = getActiveAudio();
            if (isAligned(track, 'mastered', repaired)) {
                warmAudio(repaired);
                return true;
            }
            const token = root.dataset.postMasterPlaybackToken = String(Number(root.dataset.postMasterPlaybackToken || 0) + 1);
            requestFrame(() => {
                const activeRoot = getPlayerRoot();
                if (!activeRoot || activeRoot.dataset.postMasterPlaybackToken !== token) return;
                const active = getActiveAudio();
                if (isAligned(track, 'mastered', active) || active?._foxbearFadeState || (active && !active.paused)) return;
                delete activeRoot.dataset.previewKey;
                renderDock({ keepPlaying: true });
                warmAudio(getActiveAudio());
            });
            return false;
        }

        async function startPlayback(audio = getActiveAudio(), options = {}) {
            let target = audio;
            if (!target || target.isConnected === false) {
                renderDock({ keepPlaying: true });
                target = getActiveAudio();
            }
            if (!target) return false;
            if (target.ended) {
                try { target.currentTime = 0; } catch (error) {}
            }
            warmAudio(target);
            try {
                const started = await playWithFadeIn(target, { readyTimeoutMs: DEFAULT_READY_TIMEOUT_MS, ...options });
                if (started) return true;
                const current = getActiveAudio();
                if (current && current !== target && current.isConnected !== false) {
                    warmAudio(current);
                    return Boolean(await playWithFadeIn(current, { readyTimeoutMs: DEFAULT_READY_TIMEOUT_MS, fromZero: false, ...options }));
                }
                return false;
            } catch (error) {
                if (target.error && target.paused) {
                    try { target.load?.(); } catch (loadError) {}
                }
                throw error;
            }
        }

        return Object.freeze({
            stabilizeAfterMastering,
            startPlayback,
            getPlayerOwner: audio => findPlayerOwner(getPlayerRoot(), audio),
            warmAudio,
            isAligned: (track, mode, audio = getActiveAudio()) => isAligned(track, mode, audio)
        });
    }

    global.FoxBearPostMasterPlaybackRecoveryService = Object.freeze({
        version: SERVICE_VERSION,
        DEFAULT_READY_TIMEOUT_MS,
        getExpectedSource,
        getDeclaredSource,
        isAligned,
        warmAudio,
        findPlayerOwner,
        createController
    });
})(window);
