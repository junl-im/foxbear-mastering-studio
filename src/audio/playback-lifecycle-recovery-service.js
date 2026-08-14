// FoxBear playback lifecycle recovery service - v1.6.100
(function attachFoxBearPlaybackLifecycleRecoveryService(global) {
    'use strict';

    const SERVICE_VERSION = '1.6.100-sw-stereo-ci-cleanup-hardening';
    const RESTORE_DEBOUNCE_MS = 350;
    const NOTICE_COOLDOWN_MS = 60000;

    function isConnected(audio) {
        return Boolean(audio && (typeof audio.isConnected !== 'boolean' || audio.isConnected));
    }

    function createController(deps = {}) {
        const documentRef = deps.document || global.document;
        const getState = typeof deps.getState === 'function' ? deps.getState : () => ({});
        const getMobileState = typeof deps.getMobileState === 'function' ? deps.getMobileState : () => ({});
        const getSelectedTrack = typeof deps.getSelectedTrack === 'function' ? deps.getSelectedTrack : () => null;
        const getActiveAudio = typeof deps.getActiveAudio === 'function' ? deps.getActiveAudio : () => null;
        const getPlayerRoot = typeof deps.getPlayerRoot === 'function' ? deps.getPlayerRoot : () => null;
        const captureTransport = typeof deps.captureTransport === 'function' ? deps.captureTransport : () => null;
        const renderDock = typeof deps.renderDock === 'function' ? deps.renderDock : () => {};
        const scheduleLayout = typeof deps.scheduleLayout === 'function' ? deps.scheduleLayout : () => {};
        const syncWakeLock = typeof deps.syncWakeLock === 'function' ? deps.syncWakeLock : () => {};
        const syncMediaSession = typeof deps.syncMediaSession === 'function' ? deps.syncMediaSession : () => {};
        const syncPlayButton = typeof deps.syncPlayButton === 'function' ? deps.syncPlayButton : () => {};
        const unregisterAudio = typeof deps.unregisterAudio === 'function' ? deps.unregisterAudio : () => {};
        const showToast = typeof deps.showToast === 'function' ? deps.showToast : () => {};
        const transition = () => deps.getTransitionService?.() || global.FoxBearPlaybackTransitionService || null;

        function nextGeneration(mobile) {
            mobile.dockLifecycleGeneration = Number(mobile.dockLifecycleGeneration || 0) + 1;
            return mobile.dockLifecycleGeneration;
        }

        function cleanupLegacyPlayer(player, reason) {
            if (!player) return;
            try { player._foxbearDispose?.(); } catch (error) {}
            player.querySelectorAll?.('audio').forEach(audio => {
                try { transition()?.cancelPlaybackRequest?.(audio, { pause: true, reason }); } catch (error) {}
                try { audio._foxbearTranslationController?.close?.(); } catch (error) {}
                try { unregisterAudio(audio, reason); } catch (error) {}
            });
            try { player.remove?.(); } catch (error) {}
        }

        function collapseInterruptedCrossfade(reason = 'lifecycle-return') {
            const root = getPlayerRoot();
            if (!root) return false;
            const children = Array.from(root.children || []);
            if (!root.classList?.contains?.('is-crossfading') && children.length <= 1) return false;
            const active = getActiveAudio();
            const owner = children.find(child => child === active || child.contains?.(active)) || children.at(-1) || null;
            children.filter(child => child !== owner).forEach(child => cleanupLegacyPlayer(child, reason));
            root.classList?.remove?.('is-crossfading');
            root.querySelectorAll?.('[data-crossfade-legacy="true"]').forEach(node => {
                try { delete node.dataset.crossfadeLegacy; } catch (error) { node.removeAttribute?.('data-crossfade-legacy'); }
            });
            if (owner) {
                try { delete owner._foxbearCrossfadeOldAudio; } catch (error) {}
            }
            return true;
        }

        function expectedPlayback(track, state) {
            const transport = state?.bottomPreviewTransport;
            if (!track || !transport || String(transport.trackId || '') !== String(track.id || '')) return false;
            if (transport.mode && state.bottomPreviewMode && transport.mode !== state.bottomPreviewMode) return false;
            const fresh = !transport.expiresAt || Date.now() < Number(transport.expiresAt || 0);
            return Boolean(fresh && transport.playing);
        }

        function markPlaybackStopped(track, state, reason) {
            const transport = state?.bottomPreviewTransport;
            if (transport && track && String(transport.trackId || '') === String(track.id || '')) {
                transport.playing = false;
                transport.reason = String(reason || 'lifecycle-reconciled');
                transport.capturedAt = Date.now();
            }
        }

        function handleUnexpectedPause(audio, reason = 'external-focus-pause') {
            if (!isConnected(audio) || documentRef?.visibilityState === 'hidden') return false;
            if (audio._foxbearSourceRecoveryPending || audio.error || Number(audio.networkState || 0) === 3) return false;
            const service = transition();
            if (!service?.isPlaybackIntended?.(audio)) return false;
            const reconciled = service.reconcileExternalPause
                ? service.reconcileExternalPause(audio, reason)
                : service.cancelPlaybackRequest?.(audio, { pause: false, reason });
            const state = getState() || {};
            markPlaybackStopped(getSelectedTrack(), state, reason);
            syncPlayButton(audio, false);
            syncMediaSession(audio);
            return Boolean(reconciled);
        }

        function handleHidden() {
            const mobile = getMobileState() || {};
            const state = getState() || {};
            const track = getSelectedTrack();
            nextGeneration(mobile);
            mobile.lastVisibilityHiddenAt = Date.now();
            if (track) captureTransport(track, state.bottomPreviewMode, { reason: 'visibility-hidden', ttlMs: 12 * 60 * 60 * 1000 });
            return true;
        }

        function settleResumeResult(audio, started, context) {
            const { mobile, state, track, generation } = context;
            if (generation !== Number(mobile.dockLifecycleGeneration || 0) || documentRef?.visibilityState === 'hidden') {
                if (started && isConnected(audio)) transition()?.cancelPlaybackRequest?.(audio, { pause: true, preserveIntent: true, reason: 'lifecycle-resume-superseded' });
                return false;
            }
            if (started && isConnected(audio) && !audio.paused) {
                transition()?.reconcileAudibleVolume?.(audio, 'lifecycle-resume-settled');
                syncPlayButton(audio, true);
                syncMediaSession(audio);
                return true;
            }
            markPlaybackStopped(track, state, 'lifecycle-resume-blocked');
            syncPlayButton(audio, false);
            syncMediaSession(audio);
            const now = Date.now();
            if (now - Number(mobile.playbackResumeNoticeAt || 0) > NOTICE_COOLDOWN_MS) {
                mobile.playbackResumeNoticeAt = now;
                showToast('브라우저가 자동 재생 복구를 막았습니다. Dock 재생 버튼을 눌러주세요.');
            }
            return false;
        }

        function restore(forceNotice = false) {
            const track = getSelectedTrack();
            if (!track) return false;
            const mobile = getMobileState() || {};
            const state = getState() || {};
            const now = Date.now();
            if (!forceNotice && now - Number(mobile.lastDockRestoreAt || 0) < RESTORE_DEBOUNCE_MS) return false;
            mobile.lastDockRestoreAt = now;
            const generation = nextGeneration(mobile);
            collapseInterruptedCrossfade('lifecycle-return-crossfade');
            const before = getActiveAudio();
            const controller = before?._foxbearTranslationController;
            if (controller?.closed || controller?.context?.state === 'closed') {
                captureTransport(track, state.bottomPreviewMode, { reason: 'lifecycle-closed-audio-context', ttlMs: 12 * 60 * 60 * 1000 });
                const root = getPlayerRoot();
                if (root?.dataset) delete root.dataset.previewKey;
            } else if (before && transition()?.isPlaybackIntended?.(before) && controller?.resume) {
                try { controller.resume(); } catch (error) {}
            }
            renderDock({ keepPlaying: true });
            scheduleLayout();
            syncWakeLock();
            const active = getActiveAudio();
            if (active && !active.paused && !active.ended) transition()?.reconcileAudibleVolume?.(active, 'lifecycle-visible');
            const shouldResume = expectedPlayback(track, state);
            if (shouldResume && isConnected(active) && (active.paused || active.ended)) {
                if (active.ended) try { active.currentTime = 0; } catch (error) {}
                const service = transition();
                const request = service?.resumeAfterInterruption
                    ? service.resumeAfterInterruption(active, { reason: 'mobile-lifecycle-return', readyTimeoutMs: 2200 })
                    : Promise.resolve(active.play?.()).then(() => true).catch(() => false);
                Promise.resolve(request).then(started => settleResumeResult(active, Boolean(started), { mobile, state, track, generation })).catch(() => settleResumeResult(active, false, { mobile, state, track, generation }));
            } else {
                if (!shouldResume && active?.paused && transition()?.isPlaybackIntended?.(active)) handleUnexpectedPause(active, 'lifecycle-stale-intent');
                syncPlayButton(active, Boolean(active && !active.paused && !active.ended));
                syncMediaSession(active);
            }
            if (forceNotice || now - Number(mobile.pageRestoreToastAt || 0) > NOTICE_COOLDOWN_MS) {
                mobile.pageRestoreToastAt = now;
                showToast('Dock 재생 위치와 모바일 편의 상태를 복구했습니다.');
            }
            return true;
        }

        function handleVisibilityChange() {
            return documentRef?.visibilityState === 'hidden' ? handleHidden() : restore(false);
        }

        function handlePageShow() {
            const restored = restore(false);
            scheduleLayout();
            syncWakeLock();
            return restored;
        }

        return Object.freeze({
            version: SERVICE_VERSION,
            handleVisibilityChange,
            handlePageShow,
            restore,
            handleUnexpectedPause,
            collapseInterruptedCrossfade
        });
    }

    global.FoxBearPlaybackLifecycleRecoveryService = Object.freeze({
        version: SERVICE_VERSION,
        RESTORE_DEBOUNCE_MS,
        NOTICE_COOLDOWN_MS,
        createController
    });
})(window);
