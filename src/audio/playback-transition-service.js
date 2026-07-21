// FoxBear playback transition service - v1.4.21
(function attachFoxBearPlaybackTransitionService(global) {
    'use strict';

    const SERVICE_VERSION = '1.5.47-engine-edgecase-quality-gate';
    const DEFAULT_FADE_MS = 140;
    const MIN_FADE_MS = 24;
    const FADE_MIN_VOLUME = 0.0001;

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

    function waitForMediaReady(audio, timeoutMs = 900) {
        if (!audio) return Promise.resolve(false);
        if (audio.readyState >= 2) return Promise.resolve(true);
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
            try { audio.load?.(); } catch (error) {}
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
        try { audio?._foxbearTranslationController?.resume?.(); } catch (error) {}
        try { audio?._foxbearResumeAudioGraph?.(); } catch (error) {}
    }

    function playSynchronizedPair(context, audioElements, reason = 'synchronized-play') {
        const manager = global.FoxBearAudioContextManager;
        const resumePromise = context && manager?.resume ? manager.resume(context, reason) : Promise.resolve(true);
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

    function cancelFade(audio) {
        const id = Number(audio?._foxbearFadeRaf || 0);
        if (id) caf(id);
        if (audio) audio._foxbearFadeRaf = 0;
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
            const start = now();
            const step = tick => {
                const t = clamp((tick - start) / duration, 0, 1);
                const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                audio.volume = clamp(from + (to - from) * eased, 0, 1);
                if (t < 1) audio._foxbearFadeRaf = raf(step);
                else {
                    audio.volume = to;
                    audio._foxbearFadeRaf = 0;
                    resolve(true);
                }
            };
            audio._foxbearFadeRaf = raf(step);
        });
    }

    function playWithFadeIn(audio, options = {}) {
        if (!audio) return Promise.resolve(false);
        resumeAudioGraphForGesture(audio);
        const target = rememberTargetVolume(audio);
        const duration = Number(options.ms || DEFAULT_FADE_MS);
        if (options.fromZero !== false) audio.volume = FADE_MIN_VOLUME;
        const playPromise = typeof audio.play === 'function' ? audio.play() : Promise.resolve();
        return Promise.resolve(playPromise)
            .then(() => fadeVolume(audio, target, duration))
            .then(() => true)
            .catch(error => {
                cancelFade(audio);
                audio.volume = target;
                throw error;
            });
    }

    function pauseWithFadeOut(audio, options = {}) {
        if (!audio) return Promise.resolve(false);
        const target = rememberTargetVolume(audio);
        if (audio.paused || audio.ended) {
            audio.volume = target;
            return Promise.resolve(true);
        }
        return fadeVolume(audio, FADE_MIN_VOLUME, Number(options.ms || DEFAULT_FADE_MS)).then(() => {
            try { audio.pause(); } catch (error) {}
            audio.volume = target;
            return true;
        });
    }

    function crossfadePair(oldAudio, nextAudio, options = {}) {
        const duration = Number(options.ms || DEFAULT_FADE_MS);
        if (oldAudio && nextAudio && oldAudio === nextAudio) return playWithFadeIn(nextAudio, { ms: duration, fromZero: false });
        const oldTarget = rememberTargetVolume(oldAudio);
        const nextTarget = rememberTargetVolume(nextAudio);
        if (nextAudio) nextAudio.volume = FADE_MIN_VOLUME;
        // A source switch initiated by a real tap must call play() in the same
        // activation task. Deferring it behind metadata readiness loses user
        // activation in KakaoTalk and several mobile WebViews.
        let immediatePlay = null;
        if (options.userGesture && nextAudio && typeof nextAudio.play === 'function') {
            try { immediatePlay = nextAudio.play(); } catch (error) { immediatePlay = Promise.reject(error); }
        }
        const readyPromise = nextAudio ? waitForMediaReady(nextAudio, options.readyTimeoutMs || 900) : Promise.resolve(false);
        const playPromise = immediatePlay || readyPromise.then(() => nextAudio && typeof nextAudio.play === 'function' ? nextAudio.play() : Promise.resolve());
        return Promise.all([Promise.resolve(playPromise), readyPromise])
            .then(() => {
                const fades = [];
                if (oldAudio) fades.push(fadeVolume(oldAudio, FADE_MIN_VOLUME, duration));
                if (nextAudio) fades.push(fadeVolume(nextAudio, nextTarget, duration));
                return Promise.all(fades);
            })
            .then(() => {
                if (oldAudio) {
                    try { oldAudio.pause(); } catch (error) {}
                    oldAudio.volume = oldTarget;
                }
                if (nextAudio) nextAudio.volume = nextTarget;
                if (typeof options.onComplete === 'function') options.onComplete();
                return true;
            })
            .catch(error => {
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
        rememberTargetVolume,
        cancelFade,
        fadeVolume,
        waitForMediaReady,
        getInAppCompatibility,
        configureAudioElement,
        resumeAudioGraphForGesture,
        playSynchronizedPair,
        playWithFadeIn,
        pauseWithFadeOut,
        crossfadePair
    });
})(window);
