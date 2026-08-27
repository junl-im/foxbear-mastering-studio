// FoxBear PWA share policy contract - v1.7.2
(function exposeFoxBearPwaSharePolicy(global) {
    'use strict';

    const DEFAULTS = Object.freeze({
        schemaVersion: 2,
        maxFiles: 12,
        maxFileBytes: 220 * 1024 * 1024,
        maxBatchBytes: 512 * 1024 * 1024,
        maxStoreBytes: 768 * 1024 * 1024,
        recordLimit: 8,
        recordTtlMs: 24 * 60 * 60 * 1000,
        claimLeaseMs: 2 * 60 * 1000,
        claimHeartbeatMs: 30 * 1000
    });

    const AUDIO_EXTENSIONS = Object.freeze(new Set([
        '.wav', '.wave', '.mp3', '.mpeg', '.mpga', '.aif', '.aiff', '.aifc',
        '.m4a', '.aac', '.flac', '.ogg', '.oga', '.opus', '.webm', '.weba',
        '.mp4', '.m4v', '.mov'
    ]));
    const VIDEO_AUDIO_TYPES = Object.freeze(new Set(['video/mp4', 'video/quicktime']));

    function positiveInteger(value, fallback, minimum = 1) {
        const number = Math.floor(Number(value));
        return Number.isFinite(number) && number >= minimum ? number : fallback;
    }

    function createPolicy(overrides = {}) {
        const policy = {
            schemaVersion: positiveInteger(overrides.schemaVersion, DEFAULTS.schemaVersion),
            maxFiles: positiveInteger(overrides.maxFiles, DEFAULTS.maxFiles),
            maxFileBytes: positiveInteger(overrides.maxFileBytes, DEFAULTS.maxFileBytes),
            maxBatchBytes: positiveInteger(overrides.maxBatchBytes, DEFAULTS.maxBatchBytes),
            maxStoreBytes: positiveInteger(overrides.maxStoreBytes, DEFAULTS.maxStoreBytes),
            recordLimit: positiveInteger(overrides.recordLimit, DEFAULTS.recordLimit),
            recordTtlMs: positiveInteger(overrides.recordTtlMs, DEFAULTS.recordTtlMs, 60 * 1000),
            claimLeaseMs: positiveInteger(overrides.claimLeaseMs, DEFAULTS.claimLeaseMs, 10 * 1000),
            claimHeartbeatMs: positiveInteger(overrides.claimHeartbeatMs, DEFAULTS.claimHeartbeatMs, 5 * 1000)
        };
        if (policy.claimHeartbeatMs >= policy.claimLeaseMs) {
            policy.claimHeartbeatMs = Math.max(5 * 1000, Math.floor(policy.claimLeaseMs / 3));
        }
        return Object.freeze(policy);
    }

    function extension(name = '') {
        const value = String(name || '').trim().toLowerCase();
        const dot = value.lastIndexOf('.');
        return dot >= 0 ? value.slice(dot) : '';
    }

    function isSupportedFile(file, policy = DEFAULTS) {
        if (!file || typeof file !== 'object' || !('name' in file)) return false;
        const size = Number(file.size || 0);
        if (!Number.isFinite(size) || size <= 0 || size > Number(policy.maxFileBytes || DEFAULTS.maxFileBytes)) return false;
        const type = String(file.type || '').trim().toLowerCase();
        if (type.startsWith('audio/') || VIDEO_AUDIO_TYPES.has(type)) return true;
        return AUDIO_EXTENSIONS.has(extension(file.name));
    }

    function selectFiles(values = [], policy = DEFAULTS) {
        const files = [];
        let totalBytes = 0;
        let rejected = 0;
        for (const value of Array.from(values || [])) {
            if (files.length >= Number(policy.maxFiles || DEFAULTS.maxFiles)) {
                rejected += 1;
                continue;
            }
            if (!isSupportedFile(value, policy)) {
                rejected += 1;
                continue;
            }
            const nextBytes = totalBytes + Number(value.size || 0);
            if (nextBytes > Number(policy.maxBatchBytes || DEFAULTS.maxBatchBytes)) {
                rejected += 1;
                continue;
            }
            files.push(value);
            totalBytes = nextBytes;
        }
        return Object.freeze({ files: Object.freeze(files), totalBytes, rejected });
    }

    function recordTimestamp(record = {}) {
        const declared = Number(record?.createdAt || 0);
        if (Number.isFinite(declared) && declared > 0) return declared;
        const value = Number.parseInt(String(record?.key || record?.id || '').split('-', 1)[0], 10);
        return Number.isFinite(value) && value > 0 ? value : 0;
    }

    function recordBytes(record = {}) {
        const declared = Number(record?.totalBytes || 0);
        if (Number.isFinite(declared) && declared > 0) return Math.floor(declared);
        return (Array.isArray(record?.files) ? record.files : []).reduce((sum, file) => {
            const size = Number(file?.size || 0);
            return sum + (Number.isFinite(size) && size > 0 ? size : 0);
        }, 0);
    }

    function activeClaim(record = {}, now = Date.now()) {
        const owner = String(record?.claimOwner || '').trim();
        const expiresAt = Number(record?.claimExpiresAt || 0);
        return Boolean(owner && Number.isFinite(expiresAt) && expiresAt > now);
    }

    function normalizeRecord(record = {}, now = Date.now()) {
        const value = record?.value && typeof record.value === 'object' ? record.value : record;
        const key = String(record?.key || value?.id || '').trim();
        const createdAt = recordTimestamp({ ...value, key });
        return Object.freeze({
            key,
            createdAt,
            totalBytes: Math.max(0, recordBytes(value)),
            activeClaim: activeClaim(value, now),
            claimOwner: String(value?.claimOwner || ''),
            claimExpiresAt: Number(value?.claimExpiresAt || 0)
        });
    }

    function planRetention(records = [], now = Date.now(), incomingBytes = 0, policy = DEFAULTS) {
        const normalized = Array.from(records || [])
            .map(record => normalizeRecord(record, now))
            .filter(record => record.key);
        const maxStoreBytes = Number(policy.maxStoreBytes || DEFAULTS.maxStoreBytes);
        const maxExistingRecords = Math.max(0, Number(policy.recordLimit || DEFAULTS.recordLimit) - 1);
        const availableBytes = Math.max(0, maxStoreBytes - Math.max(0, Number(incomingBytes || 0)));
        const protectedRecords = normalized
            .filter(record => record.activeClaim)
            .sort((a, b) => b.createdAt - a.createdAt);
        const protectedBytes = protectedRecords.reduce((sum, record) => sum + record.totalBytes, 0);
        const protectedKeys = new Set(protectedRecords.map(record => record.key));
        const retainKeys = protectedRecords.map(record => record.key);
        let retainedBytes = protectedBytes;

        const canAccept = incomingBytes <= Number(policy.maxBatchBytes || DEFAULTS.maxBatchBytes)
            && incomingBytes <= maxStoreBytes
            && protectedRecords.length <= maxExistingRecords
            && protectedBytes <= availableBytes;

        if (canAccept) {
            const freshUnclaimed = normalized
                .filter(record => !protectedKeys.has(record.key))
                .filter(record => record.createdAt > 0 && now - record.createdAt <= Number(policy.recordTtlMs || DEFAULTS.recordTtlMs))
                .sort((a, b) => b.createdAt - a.createdAt);
            for (const record of freshUnclaimed) {
                if (retainKeys.length >= maxExistingRecords) break;
                if (retainedBytes + record.totalBytes > availableBytes) continue;
                retainKeys.push(record.key);
                retainedBytes += record.totalBytes;
            }
        }

        const retained = new Set(retainKeys);
        const deleteKeys = normalized
            .filter(record => !record.activeClaim && !retained.has(record.key))
            .map(record => record.key);
        return Object.freeze({
            canAccept,
            reason: canAccept ? 'ok' : protectedBytes > availableBytes ? 'active-imports-use-storage' : 'store-budget-exceeded',
            retainKeys: Object.freeze(retainKeys),
            deleteKeys: Object.freeze(deleteKeys),
            retainedBytes,
            protectedBytes,
            availableBytes
        });
    }

    function isQuotaExceededError(error) {
        const name = String(error?.name || '');
        const message = String(error?.message || '');
        return name === 'QuotaExceededError' || /quota|storage.*full|disk.*full/i.test(`${name} ${message}`);
    }

    const api = Object.freeze({
        version: '1.7.2',
        DEFAULTS,
        AUDIO_EXTENSIONS,
        VIDEO_AUDIO_TYPES,
        createPolicy,
        isSupportedFile,
        selectFiles,
        recordTimestamp,
        recordBytes,
        activeClaim,
        normalizeRecord,
        planRetention,
        isQuotaExceededError
    });

    global.FoxBearPwaSharePolicy = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : globalThis);
