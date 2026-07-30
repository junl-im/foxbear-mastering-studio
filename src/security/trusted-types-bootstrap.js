'use strict';

(function installFoxBearTrustedTypesBootstrap(global) {
    const trustedTypes = global.trustedTypes;
    const location = global.location;
    const documentRef = global.document;
    const FIREBASE_AUTH_GAPI_ORIGIN = 'https://apis.google.com';
    const FIREBASE_AUTH_GAPI_PATH = '/js/api.js';
    const GOOGLE_RECAPTCHA_ORIGIN = 'https://www.google.com';
    const GOOGLE_RECAPTCHA_PATH_PREFIX = '/recaptcha/';
    const GOOGLE_RECAPTCHA_STATIC_ORIGIN = 'https://www.gstatic.com';
    const GOOGLE_RECAPTCHA_STATIC_PATH_PREFIX = '/recaptcha/';
    const SAME_ORIGIN_SCRIPT_PATHS = Object.freeze([
        '/src/',
        '/vendor/'
    ]);

    function normalizeScriptUrl(value) {
        return new URL(String(value || ''), documentRef?.baseURI || location?.href || undefined);
    }

    function isAllowedScriptUrl(value) {
        let url;
        try {
            url = normalizeScriptUrl(value);
        } catch (error) {
            return false;
        }
        if (location?.origin && url.origin === location.origin) {
            return SAME_ORIGIN_SCRIPT_PATHS.some(prefix => url.pathname.startsWith(prefix));
        }
        if (url.origin === FIREBASE_AUTH_GAPI_ORIGIN && url.pathname === FIREBASE_AUTH_GAPI_PATH) {
            return true;
        }
        if (url.origin === GOOGLE_RECAPTCHA_ORIGIN && url.pathname.startsWith(GOOGLE_RECAPTCHA_PATH_PREFIX)) {
            return true;
        }
        return url.origin === GOOGLE_RECAPTCHA_STATIC_ORIGIN
            && url.pathname.startsWith(GOOGLE_RECAPTCHA_STATIC_PATH_PREFIX);
    }

    function createScriptUrl(value) {
        const url = normalizeScriptUrl(value);
        if (!isAllowedScriptUrl(url.href)) {
            throw new TypeError('허용되지 않은 동적 스크립트 URL입니다.');
        }
        return url.href;
    }

    const diagnostics = {
        policyName: 'default',
        installed: false,
        isAllowedScriptUrl,
        createScriptUrl
    };

    if (trustedTypes && typeof trustedTypes.createPolicy === 'function') {
        try {
            diagnostics.policy = trustedTypes.createPolicy('default', {
                createScriptURL: createScriptUrl
            });
            diagnostics.installed = true;
        } catch (error) {
            diagnostics.error = String(error?.message || error || 'Trusted Types default policy setup failed');
            console.warn('FoxBear Trusted Types bootstrap unavailable:', error);
        }
    }

    global.FoxBearTrustedTypesBootstrap = Object.freeze(diagnostics);
})(typeof window !== 'undefined' ? window : globalThis);
