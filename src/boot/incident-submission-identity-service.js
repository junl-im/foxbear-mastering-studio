// FoxBear stable incident submission identity helpers - v1.6.87
(function attachFoxBearIncidentSubmissionIdentity(global) {
    'use strict';

    const SUBMISSION_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{7,63}$/i;

    function cleanText(value, maxLength = 180) {
        return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
    }

    function fnv1a(value, seed = 0x811c9dc5) {
        let hash = seed >>> 0;
        const text = String(value || '');
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        return hash.toString(16).padStart(8, '0');
    }

    function normalizeClientAt(value, fallbackNow = Date.now()) {
        const text = cleanText(value, 40);
        const parsed = Date.parse(text);
        if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
        const fallback = Number(fallbackNow);
        return new Date(Number.isFinite(fallback) ? fallback : Date.now()).toISOString();
    }

    function createSubmissionKey(value = {}) {
        const provided = cleanText(value.submissionKey || '', 64);
        if (SUBMISSION_KEY_PATTERN.test(provided)) return provided.toLowerCase();
        const fingerprint = cleanText(value.fingerprint || 'unknown', 64) || 'unknown';
        const clientAt = normalizeClientAt(value.clientAt);
        const first = fnv1a(`${fingerprint}|${clientAt}|foxbear-submit-v1`);
        const second = fnv1a(`${clientAt}|${fingerprint}|foxbear-submit-v1`, 0x9e3779b9);
        return `inc_${first}${second}`;
    }

    function safeIdPart(value, fallback = 'anonymous', maxLength = 100) {
        return cleanText(value, maxLength).replace(/[^a-z0-9_-]/gi, '_').slice(0, maxLength) || fallback;
    }

    function createReportId(uid, incident = {}) {
        const userPart = safeIdPart(uid, 'anonymous', 100);
        const submissionKey = createSubmissionKey(incident);
        return `${userPart}_${submissionKey}`.slice(0, 180);
    }

    global.FoxBearIncidentSubmissionIdentity = Object.freeze({
        version: '1.6.87',
        normalizeClientAt,
        createSubmissionKey,
        createReportId
    });
})(typeof window !== 'undefined' ? window : globalThis);
