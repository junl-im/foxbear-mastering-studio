// FoxBear playback transition service - v1.4.21
(function attachFoxBearPlaybackTransitionService(global) {
    'use strict';

    const SERVICE_VERSION = '1.6.56-playback-blob-source-resilience';
    const DEFAULT_FADE_MS = 140;
    const MIN_FADE_MS = 24;
    const FADE_MIN_VOLUME = 0.0001;
    const MIN_AUDIBLE_VOLUME = 0.02;

    const clamp = global.FoxBearCoreUtils?.clamp || ((value, min, max) => Math.min(max, Math.max(min, Number(value) || 0)));

    function raf(callback) {
        if (typeof global.requestAnimationFrame === 'function') return global.requestAnimationFrame(callback);
        return global.setTimeout(() => callback(Date.now()), 16);
    }

    function caf(id) {
        if (!id) return;
        if (typeof global.cancelAnimationFrame === 'function') global.cancelAnimationFrame(id);
        else global.clearTimeout(id);
    }

    function now() {
        return global.performance && typeof global.performance.now === 'function' ? global.performance.now() : Date.now();
    }

    function beginPlaybackRequest(audio, type = 'transition') {
        if (!audio) return 0;
        const requestId = Number(audio._foxbearPlaybackRequestId || 0) + 1;
        audio._foxbearPlaybackRequestId = requestId;
        audio._foxbearPlaybackRequestType = String(type || 'transition');
        return requestId;
    }

    function ownsPlaybackRequest(audio, requestId) {
        return Boolean(audio && requestId > 0 && Number(audio._foxbearPlaybackRequestId || 0) === Number(requestId));
    }

    function setPlaybackIntent(audio, playing, reason = 'transport') {
        if (!audio) return false;
        audio._foxbearDesiredPlaying = Boolean(playing);
        audio._foxbearPlaybackIntentReason = String(reason || 'transport');
        audio._foxbearPlaybackIntentAt = Date.now();
        return audio._foxbearDesiredPlaying;
    }

    function isPlaybackIntended(audio) {
        if (!audio || audio.ended) return false;
        if (typeof audio._foxbearDesiredPlaying === 'boolean') return audio._foxbearDesiredPlaying;
        return !audio.paused;
    }

    function reconcileExternalPause(audio, reason = 'external-pause') {
        if (!audio || !isPlaybackIntended(audio)) return false;
        audio._foxbearPlaybackRequestId = Number(audio._foxbearPlaybackRequestId || 0) + 1;
        audio._foxbearPlaybackRequestType = String(reason || 'external-pause');
        setPlaybackIntent(audio, false, reason || 'external-pause');
        cancelFade(audio);
        audio.volume = rememberTargetVolume(audio);
        return true;
    }

    function settleSupersededPlayback(audio, targetVolume = 1) {
        if (!audio || isPlaybackIntended(audio)) return false;
        cancelFade(audio);
        if (!audio.paused) try { audio.pause?.(); } catch (error) {}
        audio.volume = clamp(Number(targetVolume || 1), 0.02, 1);
        return true;
    }

    function isAudioConnected(audio) {
        return typeof audio?.isConnected === 'boolean' ? audio.isConnected : true;
    }

    function cancelPlaybackRequest(audio, options = {}) {
        if (!audio) return false;
        const hadRequest = Boolean(audio._foxbearPlaybackRequestId || audio._foxbearFadeState || audio._foxbearFadeRaf || isPlaybackIntended(audio));
        audio._foxbearPlaybackRequestId = Number(audio._foxbearPlaybackRequestId || 0) + 1;
        audio._foxbearPlaybackRequestType = String(options.reason || 'cancelled');
        if (options.preserveIntent !== true) setPlaybackIntent(audio, false, options.reason || 'cancelled');
        cancelFade(audio);
        if (options.pause !== false) {
            try { audio.pause?.(); } catch (error) {}
        }
        return hadRequest;
    }

    function waitForMediaReady(audio, timeoutMs = 900, options = {}) {
        if (!audio) return Promise.resolve(false);
        if (audio.readyState >= 2) return Promise.resolve(true);
        const shouldLoad = options.load !== false;
        return new Promise(resolve => {
            let settled = false;
            const done = value => {
                if (settled) return;
                settled = true;
                global.clearTimeout(timer);
                audio.removeEventListener('canplay', onReady);
                audio.removeEventListener('loadeddata', onReady);
                audio.removeEventListener('error', onError);
                resolve(value);
            };
            const onReady = () => done(true);
            const onError = () => done(false);
            const timer = global.setTimeout(() => done(false), Math.max(120, Number(timeoutMs || 900)));
            audio.addEventListener('canplay', onReady, { once: true });
            audio.addEventListener('loadeddata', onReady, { once: true });
            audio.addEventListener('error', onError, { once: true });
            if (shouldLoad) {
                try { audio.load?.(); } catch (error) {}
            }
        });
    }

    function getInAppCompatibility(userAgent = global.navigator?.userAgent || '') {
        const ua = String(userAgent || '');
        const kakao = /KAKAOTALK|KakaoTalk/i.test(ua);
        const restricted = kakao || /NAVER\(inapp|FBAN|FBAV|Instagram|Line\//i.test(ua);
        return Object.freeze({ restricted, kakao, label: kakao ? '카카오톡 인앱 브라우저' : (restricted ? '인앱 브라우저' : '일반 브라우저') });
    }

    function configureAudioElement(audio) {
        if (!audio) return audio;
        audio.preload = 'metadata';
        audio.playsInline = true;
        audio.setAttribute?.('playsinline', '');
        audio.setAttribute?.('webkit-playsinline', '');
        try { audio.disableRemotePlayback = true; } catch (error) {}
        return audio;
    }

    function resumeAudioGraphForGesture(audio) {
        const pending = [];
        try { const result = audio?._foxbearTranslationController?.resume?.(); if (result && typeof result.then === 'function') pending.push(result); } catch (error) {}
        try { const result = audio?._foxbearResumeAudioGraph?.(); if (result && typeof result.then === 'function') pending.push(result); } catch (error) {}
        return pending.length ? Promise.allSettled(pending) : Promise.resolve([]);
    }

    function isRecoverablePlaybackInterruption(error) {
        const name = String(error?.name || '').toLowerCase();
        const message = String(error?.message || error || '').toLowerCase();
        return name === 'aborterror' || message.includes('interrupted') || message.includes('media was removed') || message.includes('not ready');
    }

    function retryInterruptedPlay(audio, requestId, initialPlay, resumePromise, options = {}) {
        return Promise.resolve(initialPlay).catch(async error => {
            if (!ownsPlaybackRequest(audio, requestId) || !isAudioConnected(audio) || options.retryInterrupted === false || !isRecoverablePlaybackInterruption(error)) throw error;
            await Promise.resolve(resumePromise).catch(() => {});
            if (!ownsPlaybackRequest(audio, requestId) || !isAudioConnected(audio)) return false;
            await waitForMediaReady(audio, options.readyTimeoutMs || 900);
            if (!ownsPlaybackRequest(audio, requestId) || !isAudioConnected(audio)) return false;
            return typeof audio.play === 'function' ? audio.play() : false;
        });
    }

    async function resumeAfterInterruption(audio, options = {}) {
        if (!audio || !isAudioConnected(audio) || audio.ended && options.rewindEnded === false) return false;
        if (!isPlaybackIntended(audio) && options.force !== true) return false;
        if (audio.ended) {
            try { audio.currentTime = 0; } catch (error) {}
        }
        const target = rememberTargetVolume(audio);
        if (!audio.paused && !audio.ended) {
            audio.volume = target;
            await resumeAudioGraphForGesture(audio).catch(() => {});
            reconcileAudibleVolume(audio, options.reason || 'resume-already-playing');
            return true;
        }
        setPlaybackIntent(audio, true, options.reason || 'resume-after-interruption');
        const requestId = beginPlaybackRequest(audio, 'resume-after-interruption');
        cancelFade(audio);
        const resumePromise = resumeAudioGraphForGesture(audio);
        await Promise.resolve(resumePromise).catch(() => {});
        if (!ownsPlaybackRequest(audio, requestId) || !isAudioConnected(audio)) return false;
        if (audio.readyState < 2) await waitForMediaReady(audio, options.readyTimeoutMs || 2200, { load: options.load !== false });
        if (!ownsPlaybackRequest(audio, requestId) || !isAudioConnected(audio)) return false;
        let playPromise;
        try { playPromise = typeof audio.play === 'function' ? audio.play() : Promise.resolve(false); }
        catch (error) { playPromise = Promise.reject(error); }
        try {
            const started = await retryInterruptedPlay(audio, requestId, playPromise, resumePromise, options);
            if (started === false || !ownsPlaybackRequest(audio, requestId) || !isAudioConnected(audio)) {
                settleSupersededPlayback(audio, target);
                return false;
            }
            audio.volume = target;
            reconcileAudibleVolume(audio, options.reason || 'resume-after-interruption');
            return Boolean(!audio.paused && isPlaybackIntended(audio));
        } catch (error) {
            if (ownsPlaybackRequest(audio, requestId)) {
                setPlaybackIntent(audio, false, options.failureReason || 'resume-after-interruption-blocked');
                cancelFade(audio);
                try { audio.pause?.(); } catch (pauseError) {}
                audio.volume = target;
            }
            return false;
        }
    }

    function playSynchronizedPair(context, audioElements, reason = 'synchronized-play') {
        const manager = global.FoxBearAudioContextManager;
        const resumePromise = context && manager?.resume ? manager.resume(context, reason) : Promise.resolve(true);
        (audioElements || []).forEach(audio => setPlaybackIntent(audio, true, reason));
        return Promise.all([resumePromise, ...(audioElements || []).map(audio => audio?.play?.() || Promise.resolve())]);
    }

    function rememberTargetVolume(audio) {
        if (!audio) return 1;
        const current = clamp(Number(audio.volume || 1), 0, 1);
        if (!audio.dataset.foxbearTargetVolume || Number(audio.dataset.foxbearTargetVolume) <= 0) {
            audio.dataset.foxbearTargetVolume = String(current || 1);
        }
        return clamp(Number(audio.dataset.foxbearTargetVolume || current || 1), 0.02, 1);
    }

    function reconcileAudibleVolume(audio, reason = 'audible-volume-reconcile') {
        if (!audio || audio.muted || audio.paused || audio.ended || audio._foxbearFadeState) return false;
        const target = rememberTargetVolume(audio);
        const current = clamp(Number(audio.volume || 0), 0, 1);
        if (current >= Math.min(target, MIN_AUDIBLE_VOLUME)) return false;
        audio.volume = target;
        audio._foxbearVolumeRecoveryReason = String(reason || 'audible-volume-reconcile');
        audio._foxbearVolumeRecoveryAt = Date.now();
        return true;
    }

    function cancelFade(audio) {
        if (!audio) return false;
        const fadeState = audio._foxbearFadeState || null;
        const id = Number(fadeState?.raf || audio._foxbearFadeRaf || 0);
        if (id) caf(id);
        audio._foxbearFadeRaf = 0;
        if (!fadeState) return Boolean(id);
        fadeState.raf = 0;
        if (audio._foxbearFadeState === fadeState) audio._foxbearFadeState = null;
        if (!fadeState.settled) {
            fadeState.settled = true;
            fadeState.resolve(false);
        }
        return true;
    }

    function fadeVolume(audio, toVolume = 1, durationMs = DEFAULT_FADE_MS) {
        if (!audio) return Promise.resolve(false);
        cancelFade(audio);
        const from = clamp(Number(audio.volume || 0), 0, 1);
        const to = clamp(Number(toVolume), 0, 1);
        const duration = Math.max(MIN_FADE_MS, Number(durationMs || DEFAULT_FADE_MS));
        if (Math.abs(from - to) < 0.001) {
            audio.volume = to;
            return Promise.resolve(true);
        }
        return new Promise(resolve => {
            const fadeState = { raf: 0, resolve, settled: false };
            const finish = completed => {
                if (fadeState.settled) return;
                fadeState.settled = true;
                if (audio._foxbearFadeState === fadeState) audio._foxbearFadeState = null;
                fadeState.raf = 0;
                audio._foxbearFadeRaf = 0;
                resolve(Boolean(completed));
            };
            const start = now();
            const step = tick => {
                if (audio._foxbearFadeState !== fadeState) {
                    finish(false);
                    return;
                }
                const t = clamp((tick - start) / duration, 0, 1);
                const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                audio.volume = clamp(from + (to - from) * eased, 0, 1);
                if (t < 1) {
                    fadeState.raf = raf(step);
                    audio._foxbearFadeRaf = fadeState.raf;
                } else {
                    audio.volume = to;
                    finish(true);
                }
            };
            audio._foxbearFadeState = fadeState;
            fadeState.raf = raf(step);
            audio._foxbearFadeRaf = fadeState.raf;
        });
    }

    function playWithFadeIn(audio, options = {}) {
        if (!audio) return Promise.resolve(false);
        setPlaybackIntent(audio, true, options.reason || 'play');
        const requestId = beginPlaybackRequest(audio, 'play');
        cancelFade(audio);
        const resumePromise = resumeAudioGraphForGesture(audio);
        const target = rememberTargetVolume(audio);
        const duration = Number(options.ms || DEFAULT_FADE_MS);
        if (options.fromZero !== false) audio.volume = FADE_MIN_VOLUME;
        let playPromise;
        try { playPromise = typeof audio.play === 'function' ? audio.play() : Promise.resolve(); }
        catch (error) { playPromise = Promise.reject(error); }
        return retryInterruptedPlay(audio, requestId, playPromise, resumePromise, options)
            .then(started => {
                if (started === false) return false;
                if (!ownsPlaybackRequest(audio, requestId)) {
                    settleSupersededPlayback(audio, target);
                    return false;
                }
                if (!isAudioConnected(audio)) {
                    try { audio.pause?.(); } catch (error) {}
                    audio.volume = target;
                    return false;
                }
                return fadeVolume(audio, target, duration);
            })
            .then(completed => {
                const ownsRequest = ownsPlaybackRequest(audio, requestId);
                const connected = isAudioConnected(audio);
                if (!completed && ownsRequest && connected) audio.volume = target;
                if (!ownsRequest) settleSupersededPlayback(audio, target);
                return Boolean(completed && ownsRequest && connected && isPlaybackIntended(audio));
            })
            .catch(error => {
                if (!ownsPlaybackRequest(audio, requestId)) {
                    settleSupersededPlayback(audio, target);
                    return false;
                }
                cancelFade(audio);
                audio.volume = target;
                throw error;
            });
    }

    function pauseWithFadeOut(audio, options = {}) {
        if (!audio) return Promise.resolve(false);
        setPlaybackIntent(audio, false, options.reason || 'pause');
        const requestId = beginPlaybackRequest(audio, 'pause');
        const target = rememberTargetVolume(audio);
        if (audio.paused || audio.ended) {
            cancelFade(audio);
            try { audio.pause?.(); } catch (error) {}
            audio.volume = target;
            return Promise.resolve(ownsPlaybackRequest(audio, requestId));
        }
        return fadeVolume(audio, FADE_MIN_VOLUME, Number(options.ms || DEFAULT_FADE_MS)).then(completed => {
            if (!completed) return false;
            if (!ownsPlaybackRequest(audio, requestId)) return false;
            try { audio.pause(); } catch (error) {}
            audio.volume = target;
            return !isPlaybackIntended(audio);
        });
    }

    function crossfadePair(oldAudio, nextAudio, options = {}) {
        const duration = Number(options.ms || DEFAULT_FADE_MS);
        if (oldAudio && nextAudio && oldAudio === nextAudio) return playWithFadeIn(nextAudio, { ms: duration, fromZero: false });
        if (oldAudio) setPlaybackIntent(oldAudio, false, options.reason || 'crossfade-out');
        if (nextAudio) setPlaybackIntent(nextAudio, true, options.reason || 'crossfade-in');
        const oldRequestId = oldAudio ? beginPlaybackRequest(oldAudio, 'crossfade-out') : 0;
        const nextRequestId = nextAudio ? beginPlaybackRequest(nextAudio, 'crossfade-in') : 0;
        if (oldAudio) cancelFade(oldAudio);
        if (nextAudio) cancelFade(nextAudio);
        const ownsPair = () => (!oldAudio || ownsPlaybackRequest(oldAudio, oldRequestId))
            && (!nextAudio || ownsPlaybackRequest(nextAudio, nextRequestId));
        const oldTarget = rememberTargetVolume(oldAudio);
        const nextTarget = rememberTargetVolume(nextAudio);
        if (nextAudio) nextAudio.volume = FADE_MIN_VOLUME;
        const resumePromise = resumeAudioGraphForGesture(nextAudio);
        // A source switch initiated by a real tap must call play() in the same
        // activation task. Deferring it behind metadata readiness loses user
        // activation in KakaoTalk and several mobile WebViews.
        let immediatePlay = null;
        if (options.userGesture && nextAudio && typeof nextAudio.play === 'function') {
            try { immediatePlay = nextAudio.play(); } catch (error) { immediatePlay = Promise.reject(error); }
        }
        const readyPromise = nextAudio ? waitForMediaReady(nextAudio, options.readyTimeoutMs || 900, { load: !immediatePlay }) : Promise.resolve(false);
        const playPromise = immediatePlay || readyPromise.then(() => {
            if (!ownsPair() || !isAudioConnected(nextAudio)) return false;
            return nextAudio && typeof nextAudio.play === 'function' ? nextAudio.play() : Promise.resolve();
        });
        const recoveredPlay = nextAudio ? retryInterruptedPlay(nextAudio, nextRequestId, playPromise, resumePromise, options) : playPromise;
        return Promise.all([Promise.resolve(recoveredPlay), readyPromise])
            .then(() => {
                if (!ownsPair()) {
                    settleSupersededPlayback(oldAudio, oldTarget);
                    settleSupersededPlayback(nextAudio, nextTarget);
                    return false;
                }
                if (nextAudio && !isAudioConnected(nextAudio)) {
                    try { nextAudio.pause?.(); } catch (error) {}
                    nextAudio.volume = nextTarget;
                    return false;
                }
                const fades = [];
                if (oldAudio) fades.push(fadeVolume(oldAudio, FADE_MIN_VOLUME, duration));
                if (nextAudio) fades.push(fadeVolume(nextAudio, nextTarget, duration));
                return Promise.all(fades);
            })
            .then(results => {
                if (results === false || !ownsPair()) {
                    settleSupersededPlayback(oldAudio, oldTarget);
                    settleSupersededPlayback(nextAudio, nextTarget);
                    return false;
                }
                if (results.some(completed => completed === false)) {
                    if (oldAudio) oldAudio.volume = oldTarget;
                    if (nextAudio) nextAudio.volume = nextTarget;
                    return false;
                }
                if (oldAudio) {
                    try { oldAudio.pause(); } catch (error) {}
                    oldAudio.volume = oldTarget;
                }
                if (nextAudio) nextAudio.volume = nextTarget;
                if (typeof options.onComplete === 'function') options.onComplete();
                return true;
            })
            .catch(error => {
                if (!ownsPair()) {
                    settleSupersededPlayback(oldAudio, oldTarget);
                    settleSupersededPlayback(nextAudio, nextTarget);
                    return false;
                }
                cancelFade(nextAudio);
                if (nextAudio) nextAudio.volume = nextTarget;
                if (oldAudio) oldAudio.volume = oldTarget;
                throw error;
            });
    }

    global.FoxBearPlaybackTransitionService = Object.freeze({
        version: SERVICE_VERSION,
        DEFAULT_FADE_MS,
        FADE_MIN_VOLUME,
        MIN_AUDIBLE_VOLUME,
        rememberTargetVolume,
        reconcileAudibleVolume,
        beginPlaybackRequest,
        ownsPlaybackRequest,
        setPlaybackIntent,
        isPlaybackIntended,
        reconcileExternalPause,
        settleSupersededPlayback,
        cancelPlaybackRequest,
        cancelFade,
        fadeVolume,
        waitForMediaReady,
        getInAppCompatibility,
        configureAudioElement,
        resumeAudioGraphForGesture,
        isRecoverablePlaybackInterruption,
        retryInterruptedPlay,
        resumeAfterInterruption,
        playSynchronizedPair,
        playWithFadeIn,
        pauseWithFadeOut,
        crossfadePair
    });
})(window);
