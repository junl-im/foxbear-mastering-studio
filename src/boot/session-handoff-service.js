// FoxBear external-browser session handoff service v1.5.68.
'use strict';

(function attachFoxBearSessionHandoffService(global) {
    const BUILD_INFO = global.FoxBearBuildInfo || {};
    const VERSION = BUILD_INFO.assetVersion || '1.5.68-mail-delivery-verification-sender-subject-rules';
    const PARAM = 'foxbearHandoff';
    const MAX_TOKEN_LENGTH = 7200;
    const MAX_AGE_MS = 20 * 60 * 1000;
    const SETTING_KEYS = Object.freeze([
        'clarity', 'warmth', 'width', 'stereoGroove', 'analogGroove',
        'dynamicPunch', 'metallicRemoval', 'intensity'
    ]);
    const FEATURE_KEYS = Object.freeze([
        'trimSilence', 'albumMatch', 'truePeakGuard', 'aiHumanize', 'vocalProtect',
        'smartGuard', 'lowEndAnchor', 'melodyPreserve', 'transientRefine',
        'vocalFocusPlus', 'adaptiveAir', 'translationGuard', 'openMixGuard',
        'referenceMatch', 'phaseSafe', 'earFatigueGuard'
    ]);
    const ENUMS = Object.freeze({
        outputFormat: Object.freeze(['wav16', 'wav24', 'wav32float', 'mp3_320']),
        qualityMode: Object.freeze(['fast', 'balanced', 'max']),
        performanceMode: Object.freeze(['auto', 'mobile', 'quality']),
        masterGoal: Object.freeze(['natural', 'balanced', 'loud']),
        masterStyle: Object.freeze(['transparent', 'streaming', 'club', 'vocal', 'podcast', 'warm_analog', 'clean_loud']),
        masterStrength: Object.freeze(['natural', 'balanced', 'modern', 'loud', 'vocal_safe', 'mobile_safe']),
        platformPreset: Object.freeze(['custom', 'streaming', 'youtube', 'apple', 'social', 'loud_demo', 'archive']),
        preset: Object.freeze(['custom', 'pop', 'kpop', 'kballad', 'rnb', 'ballad', 'acoustic', 'citypop', 'dance', 'synthpop', 'house', 'futurebass', 'edm', 'trap', 'drill', 'hiphop', 'boombap', 'globalpop', 'lofi', 'rock', 'cinematic', 'spatial', 'tape', 'punch']),
        beatPreset: Object.freeze(['original', 'slow5', 'slow10', 'fast5', 'fast10', 'half', 'double']),
        instrumentMode: Object.freeze(['off', 'kick', 'hat', 'kick_hat', 'clap', 'kick_hat_clap']),
        instrumentAmount: Object.freeze(['light', 'normal', 'bold'])
    });

    let provider = null;
    let consumed = false;
    let pendingPayload = null;
    let pendingTrackProfile = null;

    function finite(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, finite(value, min)));
    }

    function enumValue(value, allowed, fallback) {
        const text = String(value || '');
        return allowed.includes(text) ? text : fallback;
    }

    function sanitizeSettings(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const defaults = { clarity: 50, warmth: 55, width: 28, stereoGroove: 12, analogGroove: 6, dynamicPunch: 35, metallicRemoval: 42, intensity: 100 };
        const out = {};
        SETTING_KEYS.forEach(key => {
            const value = source[key] == null ? defaults[key] : source[key];
            out[key] = key === 'intensity'
                ? Math.round(clamp(value, 50, 200))
                : Math.round(clamp(value, 0, 100));
        });
        return out;
    }

    function sanitizeFeatures(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const out = {};
        FEATURE_KEYS.forEach(key => {
            if (typeof source[key] === 'boolean') out[key] = source[key];
        });
        return out;
    }

    function sanitizeGlobal(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        return Object.freeze({
            outputFormat: enumValue(source.outputFormat, ENUMS.outputFormat, 'wav24'),
            targetLufs: clamp(source.targetLufs == null ? -14 : source.targetLufs, -24, -7),
            ceilingDb: clamp(source.ceilingDb == null ? -1 : source.ceilingDb, -6, -0.1),
            qualityMode: enumValue(source.qualityMode, ENUMS.qualityMode, 'balanced'),
            performanceMode: enumValue(source.performanceMode, ENUMS.performanceMode, 'auto'),
            masterGoal: enumValue(source.masterGoal, ENUMS.masterGoal, 'natural'),
            masterStyle: enumValue(source.masterStyle, ENUMS.masterStyle, 'streaming'),
            masterStrength: enumValue(source.masterStrength, ENUMS.masterStrength, 'balanced'),
            platformPreset: enumValue(source.platformPreset, ENUMS.platformPreset, 'custom'),
            adaptiveTargetLufs: source.adaptiveTargetLufs !== false,
            referenceMatchStrength: clamp(source.referenceMatchStrength == null ? 0.62 : source.referenceMatchStrength, 0, 1),
            featureFlags: Object.freeze(sanitizeFeatures(source.featureFlags))
        });
    }

    function sanitizeTrack(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const transform = source.transform && typeof source.transform === 'object' ? source.transform : {};
        const instrument = source.instrument && typeof source.instrument === 'object' ? source.instrument : {};
        return Object.freeze({
            preset: enumValue(source.preset, ENUMS.preset, 'custom'),
            genreLocked: Boolean(source.genreLocked),
            settings: Object.freeze(sanitizeSettings(source.settings)),
            transform: Object.freeze({
                pitchSemitones: clamp(transform.pitchSemitones == null ? 0 : transform.pitchSemitones, -12, 12),
                speedRatio: clamp(transform.speedRatio == null ? 1 : transform.speedRatio, 0.5, 1.5),
                snapSemitone: transform.snapSemitone !== false,
                beatPreset: enumValue(transform.beatPreset, ENUMS.beatPreset, 'original')
            }),
            instrument: Object.freeze({
                mode: enumValue(instrument.mode, ENUMS.instrumentMode, 'off'),
                amount: enumValue(instrument.amount, ENUMS.instrumentAmount, 'light')
            })
        });
    }

    function sanitizePayload(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const createdAt = Math.floor(finite(source.createdAt, Date.now()));
        if (createdAt < Date.now() - MAX_AGE_MS || createdAt > Date.now() + 60000) return null;
        return Object.freeze({
            schema: 1,
            createdAt,
            reason: String(source.reason || 'external-browser-recovery').slice(0, 80),
            global: sanitizeGlobal(source.global),
            track: source.track && typeof source.track === 'object' ? sanitizeTrack(source.track) : null
        });
    }

    function bytesToBase64(bytes) {
        let text = '';
        for (let i = 0; i < bytes.length; i += 1) text += String.fromCharCode(bytes[i]);
        return global.btoa(text);
    }

    function base64ToBytes(value) {
        const text = global.atob(value);
        const bytes = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i);
        return bytes;
    }

    function encodePayload(payload) {
        const clean = sanitizePayload(payload);
        if (!clean) return '';
        const bytes = new TextEncoder().encode(JSON.stringify(clean));
        return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    function decodePayload(token) {
        const text = String(token || '');
        if (!text || text.length > MAX_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(text)) return null;
        try {
            const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4);
            const json = new TextDecoder().decode(base64ToBytes(padded));
            if (json.length > 18000) return null;
            return sanitizePayload(JSON.parse(json));
        } catch (error) {
            return null;
        }
    }

    function registerProvider(nextProvider) {
        provider = typeof nextProvider === 'function' ? nextProvider : null;
        return Boolean(provider);
    }

    function createPayload(reason = 'external-browser-recovery') {
        let raw = {};
        try { raw = provider ? (provider() || {}) : {}; } catch (error) { raw = {}; }
        return sanitizePayload({
            schema: 1,
            createdAt: Date.now(),
            reason,
            global: raw.global || raw.state || {},
            track: raw.track || raw.selectedTrack || {}
        });
    }

    function attachToUrl(input, options = {}) {
        let url;
        try { url = new URL(String(input || global.location?.href || ''), global.location?.href); }
        catch (error) { return String(input || ''); }
        url.searchParams.delete(PARAM);
        const token = encodePayload(options.payload || createPayload(options.reason));
        if (token) url.searchParams.set(PARAM, token);
        return url.href;
    }

    function stripTokenFromAddress() {
        try {
            const url = new URL(global.location.href);
            if (!url.searchParams.has(PARAM)) return;
            url.searchParams.delete(PARAM);
            global.history?.replaceState?.(global.history.state, '', `${url.pathname}${url.search}${url.hash}`);
        } catch (error) {}
    }

    function consumeFromLocation() {
        if (consumed) return pendingPayload;
        consumed = true;
        let token = '';
        try { token = new URL(global.location.href).searchParams.get(PARAM) || ''; } catch (error) {}
        pendingPayload = decodePayload(token);
        pendingTrackProfile = pendingPayload?.track || null;
        if (token) stripTokenFromAddress();
        return pendingPayload;
    }

    function applyGlobalState(state, payload = pendingPayload) {
        if (!state || !payload?.global) return false;
        const source = payload.global;
        state.outputFormat = source.outputFormat;
        state.targetLufs = source.targetLufs;
        state.ceilingDb = source.ceilingDb;
        state.qualityMode = source.qualityMode;
        state.performanceMode = source.performanceMode;
        state.masterGoal = source.masterGoal;
        state.masterStyle = source.masterStyle;
        state.masterStrength = source.masterStrength;
        state.platformPreset = source.platformPreset;
        state.adaptiveTargetLufs = source.adaptiveTargetLufs;
        state.referenceMatchStrength = source.referenceMatchStrength;
        Object.assign(state.featureFlags || {}, source.featureFlags || {});
        return true;
    }

    function takePendingTrackProfile() {
        const profile = pendingTrackProfile;
        pendingTrackProfile = null;
        return profile;
    }

    function peekPendingTrackProfile() {
        return pendingTrackProfile;
    }

    function applyTrackProfile(track, profile, helpers = {}) {
        if (!track || !profile) return false;
        track.preset = profile.preset || 'custom';
        track.genreLocked = Boolean(profile.genreLocked);
        track.settings = typeof helpers.cloneSettings === 'function' ? helpers.cloneSettings(profile.settings) : { ...profile.settings };
        track.recommendedSettings = typeof helpers.cloneSettings === 'function' ? helpers.cloneSettings(profile.settings) : { ...profile.settings };
        track.transform = typeof helpers.cloneTransform === 'function' ? helpers.cloneTransform(profile.transform) : { ...profile.transform };
        track.instrument = typeof helpers.cloneInstrumentLayer === 'function' ? helpers.cloneInstrumentLayer(profile.instrument) : { ...profile.instrument };
        track.externalHandoffRestored = true;
        track.report = '외부 브라우저 복구 설정 적용 · 파일 분석 대기 중';
        return true;
    }

    function createAppBridge(options = {}) {
        const state = options.state || null;
        const helpers = {
            cloneSettings: options.cloneSettings,
            cloneTransform: options.cloneTransform,
            cloneInstrumentLayer: options.cloneInstrumentLayer
        };
        const getSelectedTrack = typeof options.getSelectedTrack === 'function' ? options.getSelectedTrack : () => null;
        const syncControls = typeof options.syncControls === 'function' ? options.syncControls : () => {};
        const notify = typeof options.notify === 'function' ? options.notify : () => {};
        const defaults = options.defaults || {};

        function buildPayload() {
            const track = getSelectedTrack();
            return {
                global: state ? {
                    outputFormat: state.outputFormat,
                    targetLufs: state.targetLufs,
                    ceilingDb: state.ceilingDb,
                    qualityMode: state.qualityMode,
                    performanceMode: state.performanceMode,
                    masterGoal: state.masterGoal,
                    masterStyle: state.masterStyle,
                    masterStrength: state.masterStrength,
                    platformPreset: state.platformPreset,
                    adaptiveTargetLufs: state.adaptiveTargetLufs,
                    referenceMatchStrength: state.referenceMatchStrength,
                    featureFlags: { ...(state.featureFlags || {}) }
                } : {},
                track: track ? {
                    preset: track.preset,
                    genreLocked: track.genreLocked,
                    settings: typeof helpers.cloneSettings === 'function' ? helpers.cloneSettings(track.settings) : { ...(track.settings || {}) },
                    transform: typeof helpers.cloneTransform === 'function' ? helpers.cloneTransform(track.transform || defaults.transform) : { ...(track.transform || defaults.transform || {}) },
                    instrument: typeof helpers.cloneInstrumentLayer === 'function' ? helpers.cloneInstrumentLayer(track.instrument || defaults.instrument) : { ...(track.instrument || defaults.instrument || {}) }
                } : null
            };
        }

        function init() {
            registerProvider(buildPayload);
            const payload = consumeFromLocation();
            if (!payload || !state) return payload;
            applyGlobalState(state, payload);
            syncControls();
            state.externalHandoffRestoredAt = Date.now();
            global.setTimeout?.(() => notify('외부 브라우저에서 작업 설정을 복구했습니다. 원곡만 다시 선택해주세요.'), 120);
            return payload;
        }

        function applyPendingTrackProfile(track) {
            const profile = takePendingTrackProfile();
            if (!track || !profile) return false;
            const applied = applyTrackProfile(track, profile, helpers);
            if (applied) track.externalHandoffProfile = profile;
            return Boolean(applied);
        }

        function reapplyTrackProfileAfterAnalysis(track) {
            if (!track?.externalHandoffProfile) return false;
            const applied = applyTrackProfile(track, track.externalHandoffProfile, helpers);
            track.externalHandoffProfile = null;
            return Boolean(applied);
        }

        return Object.freeze({
            init,
            buildPayload,
            hasPendingTrackProfile: () => Boolean(peekPendingTrackProfile()),
            applyPendingTrackProfile,
            reapplyTrackProfileAfterAnalysis
        });
    }

    global.FoxBearSessionHandoff = Object.freeze({
        version: VERSION,
        parameter: PARAM,
        registerProvider,
        createPayload,
        encodePayload,
        decodePayload,
        attachToUrl,
        consumeFromLocation,
        applyGlobalState,
        takePendingTrackProfile,
        peekPendingTrackProfile,
        applyTrackProfile,
        createAppBridge,
        getSnapshot: () => Object.freeze({
            version: VERSION,
            consumed,
            hasPayload: Boolean(pendingPayload),
            hasPendingTrackProfile: Boolean(pendingTrackProfile),
            reason: pendingPayload?.reason || '',
            createdAt: pendingPayload?.createdAt || 0
        })
    });
})(typeof window !== 'undefined' ? window : globalThis);
