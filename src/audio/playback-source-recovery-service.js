// FoxBear AI Mastering Studio Pro v1.6.98 - bounded playback Blob source retirement
(function attachFoxBearPlaybackSourceRecoveryService(global) {
    'use strict';

    const SERVICE_VERSION = '1.6.98-spectrum-retirement-mobile-header-integrity';
    const DEFAULT_READY_TIMEOUT_MS = 2600;
    const RETIRE_RECHECK_MS = 1800;
    const RETIRE_MAX_WAIT_MS = 45000;
    const RECOVERY_WINDOW_MS = 15000;
    const MAX_RECOVERY_ATTEMPTS = 2;

    const recoveryState = new WeakMap();
    const retiredUrls = new WeakMap();

    function normalizeMode(mode) {
        return mode === 'mastered' ? 'mastered' : (mode === 'masterPreview' ? 'masterPreview' : 'original');
    }

    function sourceSlotForMode(mode) {
        const normalized = normalizeMode(mode);
        if (normalized === 'mastered') return 'masteredUrl';
        if (normalized === 'masterPreview') return 'masterPreviewUrl';
        return 'originalUrl';
    }

    function backingBlobForMode(track, mode) {
        if (!track) return null;
        const normalized = normalizeMode(mode);
        if (normalized === 'mastered') return track.outBlob || null;
        if (normalized === 'masterPreview') return track.masterPreviewBlob || null;
        return track.file || null;
    }

    function declaredSource(audio) {
        return String(audio?.getAttribute?.('src') || audio?.src || audio?.currentSrc || '');
    }

    function isBlobUrl(url) {
        return /^blob:/i.test(String(url || ''));
    }

    function isUrlInUse(url, documentRef = global.document) {
        if (!url || !documentRef?.querySelectorAll) return false;
        return Array.from(documentRef.querySelectorAll('audio')).some(audio => {
            if (!audio || audio._foxbearSourceRecoveryDisposed) return false;
            return String(audio.currentSrc || audio.src || audio.getAttribute?.('src') || '') === String(url);
        });
    }

    function isUrlActivelyPlaying(url, documentRef = global.document) {
        if (!url || !documentRef?.querySelectorAll) return false;
        return Array.from(documentRef.querySelectorAll('audio')).some(audio => {
            if (!audio || audio._foxbearSourceRecoveryDisposed) return false;
            const sourceMatches = String(audio.currentSrc || audio.src || audio.getAttribute?.('src') || '') === String(url);
            return sourceMatches && audio.paused === false && audio.ended !== true;
        });
    }

    function getRetiredRecord(track) {
        if (!track) return null;
        let record = retiredUrls.get(track);
        if (!record) {
            record = { urls: new Map() };
            retiredUrls.set(track, record);
        }
        return record;
    }

    function revokeUrl(record, url, revokeObjectURL) {
        const entry = record?.urls?.get(url);
        if (entry?.timer) global.clearTimeout(entry.timer);
        record?.urls?.delete(url);
        try { revokeObjectURL(url); } catch (error) {}
        return true;
    }

    function scheduleRetiredCheck(track, url, options = {}) {
        const record = getRetiredRecord(track);
        if (!record || !record.urls.has(url)) return false;
        const entry = record.urls.get(url);
        if (entry.timer) global.clearTimeout(entry.timer);
        entry.timer = global.setTimeout(() => {
            entry.timer = 0;
            flushRetiredUrls(track, options);
        }, Math.max(120, Number(options.recheckMs || RETIRE_RECHECK_MS)));
        return true;
    }

    function retireObjectUrl(track, url, options = {}) {
        if (!track || !isBlobUrl(url)) return false;
        const record = getRetiredRecord(track);
        if (!record) return false;
        const now = Date.now();
        const existing = record.urls.get(url);
        if (existing) {
            existing.lastSeenAt = now;
            scheduleRetiredCheck(track, url, options);
            return true;
        }
        record.urls.set(url, { createdAt: now, lastSeenAt: now, timer: 0 });
        flushRetiredUrls(track, options);
        return true;
    }

    function flushRetiredUrls(track, options = {}) {
        const record = retiredUrls.get(track);
        if (!record) return 0;
        const documentRef = options.document || global.document;
        const revokeObjectURL = options.revokeObjectURL || (url => global.URL?.revokeObjectURL?.(url));
        const now = Date.now();
        let revoked = 0;
        Array.from(record.urls.entries()).forEach(([url, entry]) => {
            const inUse = isUrlInUse(url, documentRef);
            const maxWaitMs = Math.max(1000, Number(options.maxWaitMs || RETIRE_MAX_WAIT_MS));
            const expired = now - Number(entry.createdAt || now) >= maxWaitMs;
            const activelyPlaying = expired && isUrlActivelyPlaying(url, documentRef);
            if (!inUse || options.force === true || (expired && !activelyPlaying)) {
                revokeUrl(record, url, revokeObjectURL);
                revoked += 1;
            } else {
                entry.lastSeenAt = now;
                scheduleRetiredCheck(track, url, options);
            }
        });
        if (!record.urls.size) retiredUrls.delete(track);
        return revoked;
    }

    function releaseTrack(track, options = {}) {
        const record = retiredUrls.get(track);
        if (!record) return 0;
        return flushRetiredUrls(track, { ...options, force: true });
    }

    function releaseAudio(audio) {
        if (!audio) return false;
        audio._foxbearSourceRecoveryDisposed = true;
        audio._foxbearSourceRecoveryPending = false;
        recoveryState.delete(audio);
        return true;
    }

    function canAttemptRecovery(audio) {
        if (!audio || audio._foxbearSourceRecoveryDisposed || audio.isConnected === false) return false;
        const now = Date.now();
        let state = recoveryState.get(audio);
        if (!state || now - Number(state.windowStartedAt || 0) > RECOVERY_WINDOW_MS) {
            state = { windowStartedAt: now, attempts: 0, inflight: null };
            recoveryState.set(audio, state);
        }
        return state.attempts < MAX_RECOVERY_ATTEMPTS;
    }

    function markHealthy(audio) {
        if (!audio) return false;
        const state = recoveryState.get(audio);
        if (state?.inflight) return true;
        if (state) recoveryState.delete(audio);
        audio._foxbearSourceRecoveryPending = false;
        return true;
    }

    function resolveAudioMode(audio, options = {}) {
        return normalizeMode(options.mode || audio?.closest?.('[data-waveform-mode]')?.dataset?.waveformMode || 'original');
    }

    function createController(deps = {}) {
        const documentRef = deps.document || global.document;
        const getTrackById = typeof deps.getTrackById === 'function' ? deps.getTrackById : () => null;
        const getSelectedTrack = typeof deps.getSelectedTrack === 'function' ? deps.getSelectedTrack : () => null;
        const getTransitionService = typeof deps.getTransitionService === 'function' ? deps.getTransitionService : () => global.FoxBearPlaybackTransitionService || null;
        const createObjectURL = deps.createObjectURL || (blob => global.URL.createObjectURL(blob));
        const revokeObjectURL = deps.revokeObjectURL || (url => global.URL.revokeObjectURL(url));
        const onTrackUrlReplaced = typeof deps.onTrackUrlReplaced === 'function' ? deps.onTrackUrlReplaced : () => {};

        function resolveTrack(audio, options = {}) {
            if (options.track) return options.track;
            const trackId = String(options.trackId || audio?.dataset?.trackId || '');
            return (trackId && getTrackById(trackId)) || getSelectedTrack() || null;
        }

        function clearFailedIntent(audio, reason) {
            const transition = getTransitionService();
            if (transition?.reconcileExternalPause) transition.reconcileExternalPause(audio, reason || 'source-recovery-failed');
            else {
                audio._foxbearDesiredPlaying = false;
                try { audio.pause?.(); } catch (error) {}
            }
        }

        async function repairAudio(audio, options = {}) {
            if (!audio || audio._foxbearSourceRecoveryDisposed || audio.isConnected === false) return Object.freeze({ recovered: false, reason: 'audio-unavailable' });
            const existing = recoveryState.get(audio);
            if (existing?.inflight) return existing.inflight;
            if (!canAttemptRecovery(audio)) {
                clearFailedIntent(audio, 'source-recovery-attempt-limit');
                return Object.freeze({ recovered: false, reason: 'attempt-limit' });
            }
            const state = recoveryState.get(audio);
            state.attempts += 1;
            const task = (async () => {
                const track = resolveTrack(audio, options);
                const mode = resolveAudioMode(audio, options);
                const sourceSlot = sourceSlotForMode(mode);
                const blob = backingBlobForMode(track, mode);
                if (!track || !blob) {
                    clearFailedIntent(audio, 'source-recovery-no-backing-blob');
                    return Object.freeze({ recovered: false, reason: 'backing-blob-unavailable', mode });
                }
                const transition = getTransitionService();
                const oldUrl = String(track[sourceSlot] || declaredSource(audio) || '');
                const currentTime = Math.max(0, Number(audio.currentTime || 0));
                const shouldResume = options.shouldResume !== undefined
                    ? Boolean(options.shouldResume)
                    : Boolean(transition?.isPlaybackIntended?.(audio));
                const targetVolume = transition?.rememberTargetVolume?.(audio) ?? Math.max(0.02, Number(audio.volume || 1));
                let nextUrl = '';
                let committed = false;
                audio._foxbearSourceRecoveryPending = true;
                try {
                    nextUrl = createObjectURL(blob);
                    if (!nextUrl) throw new Error('Object URL creation failed');
                    audio.preload = 'auto';
                    audio.src = nextUrl;
                    try { audio.load?.(); } catch (error) {}
                    const ready = transition?.waitForMediaReady
                        ? await transition.waitForMediaReady(audio, Number(options.readyTimeoutMs || DEFAULT_READY_TIMEOUT_MS), { load: false })
                        : Number(audio.readyState || 0) >= 2;
                    if (!ready || audio.isConnected === false || audio._foxbearSourceRecoveryDisposed) throw new Error('Recovered media source did not become ready');
                    try {
                        const duration = Number(audio.duration || 0);
                        audio.currentTime = Number.isFinite(duration) && duration > 0
                            ? Math.min(currentTime, Math.max(0, duration - 0.08))
                            : currentTime;
                    } catch (error) {}
                    track[sourceSlot] = nextUrl;
                    committed = true;
                    onTrackUrlReplaced(track, mode, nextUrl, oldUrl, audio);
                    if (oldUrl && oldUrl !== nextUrl) retireObjectUrl(track, oldUrl, { document: documentRef, revokeObjectURL });
                    audio.volume = Math.max(0.02, Number(targetVolume || 1));
                    let resumed = false;
                    if (shouldResume) {
                        resumed = transition?.resumeAfterInterruption
                            ? Boolean(await transition.resumeAfterInterruption(audio, { force: true, load: false, reason: options.reason || 'playback-source-recovery', readyTimeoutMs: Number(options.readyTimeoutMs || DEFAULT_READY_TIMEOUT_MS) }))
                            : Boolean(await Promise.resolve(audio.play?.()).then(() => true).catch(() => false));
                        if (!resumed) clearFailedIntent(audio, 'source-recovery-resume-blocked');
                    }
                    markHealthy(audio);
                    return Object.freeze({ recovered: true, resumed, mode, oldUrl, newUrl: nextUrl });
                } catch (error) {
                    if (!committed && nextUrl) {
                        try { revokeObjectURL(nextUrl); } catch (revokeError) {}
                    }
                    clearFailedIntent(audio, 'source-recovery-failed');
                    audio.volume = Math.max(0.02, Number(targetVolume || 1));
                    return Object.freeze({ recovered: false, reason: 'repair-failed', mode, error });
                } finally {
                    audio._foxbearSourceRecoveryPending = false;
                }
            })();
            state.inflight = task;
            try {
                const result = await task;
                if (result?.recovered) recoveryState.delete(audio);
                return result;
            } finally {
                const latest = recoveryState.get(audio);
                if (latest?.inflight === task) latest.inflight = null;
            }
        }

        return Object.freeze({
            version: SERVICE_VERSION,
            repairAudio,
            markHealthy,
            releaseAudio,
            retireObjectUrl: (track, url, options = {}) => retireObjectUrl(track, url, { document: documentRef, revokeObjectURL, ...options }),
            flushRetiredUrls: (track, options = {}) => flushRetiredUrls(track, { document: documentRef, revokeObjectURL, ...options }),
            releaseTrack: track => releaseTrack(track, { document: documentRef, revokeObjectURL })
        });
    }

    global.FoxBearPlaybackSourceRecoveryService = Object.freeze({
        version: SERVICE_VERSION,
        DEFAULT_READY_TIMEOUT_MS,
        RETIRE_RECHECK_MS,
        RETIRE_MAX_WAIT_MS,
        RECOVERY_WINDOW_MS,
        MAX_RECOVERY_ATTEMPTS,
        normalizeMode,
        sourceSlotForMode,
        backingBlobForMode,
        declaredSource,
        isBlobUrl,
        isUrlInUse,
        isUrlActivelyPlaying,
        retireObjectUrl,
        flushRetiredUrls,
        releaseTrack,
        releaseAudio,
        canAttemptRecovery,
        markHealthy,
        createController
    });
})(window);
