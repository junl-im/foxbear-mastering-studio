// FoxBear managed Web Audio context lifecycle service.
(function attachFoxBearAudioContextManager(global) {
    'use strict';

    const SERVICE_VERSION = global.FoxBearBuildInfo?.assetVersion || '1.5.13-handoff-package-integrity';
    const MAX_EVENTS = 40;
    const records = new Map();
    const contextIds = new WeakMap();
    const ownerIds = new Map();
    const events = [];
    let serial = 0;

    function now() {
        return Date.now();
    }

    function pushEvent(type, record, detail = {}) {
        events.push(Object.freeze({
            type,
            at: now(),
            id: record?.id || '',
            purpose: record?.purpose || '',
            ownerId: record?.ownerId || '',
            state: record?.context?.state || record?.lastState || '',
            ...detail
        }));
        while (events.length > MAX_EVENTS) events.shift();
    }

    function getAudioContextClass() {
        return global.AudioContext || global.webkitAudioContext || null;
    }

    function normalizeOptions(options = {}) {
        return {
            purpose: String(options.purpose || 'unspecified'),
            ownerId: String(options.ownerId || ''),
            latencyHint: options.latencyHint || 'interactive',
            sampleRate: Number.isFinite(Number(options.sampleRate)) ? Number(options.sampleRate) : undefined,
            replaceOwner: Boolean(options.replaceOwner),
            transient: Boolean(options.transient)
        };
    }

    function removeOwnerReference(record) {
        if (!record?.ownerId) return;
        const ids = ownerIds.get(record.ownerId);
        if (!ids) return;
        ids.delete(record.id);
        if (!ids.size) ownerIds.delete(record.ownerId);
    }

    function pruneClosed() {
        records.forEach((record, id) => {
            if (record.context?.state !== 'closed') return;
            record.lastState = 'closed';
            records.delete(id);
            removeOwnerReference(record);
        });
    }

    function register(context, options = {}) {
        if (!context) throw new Error('AudioContext instance is required.');
        const existingId = contextIds.get(context);
        if (existingId && records.has(existingId)) return context;
        const normalized = normalizeOptions(options);
        const id = `audio-context-${++serial}`;
        const record = {
            id,
            context,
            purpose: normalized.purpose,
            ownerId: normalized.ownerId,
            transient: normalized.transient,
            latencyHint: normalized.latencyHint,
            createdAt: now(),
            lastState: context.state || 'unknown',
            resumeCount: 0,
            closeReason: ''
        };
        records.set(id, record);
        contextIds.set(context, id);
        if (record.ownerId) {
            if (!ownerIds.has(record.ownerId)) ownerIds.set(record.ownerId, new Set());
            ownerIds.get(record.ownerId).add(id);
        }
        if (typeof context.addEventListener === 'function') {
            context.addEventListener('statechange', () => {
                record.lastState = context.state || record.lastState;
                pushEvent('statechange', record);
                if (context.state === 'closed') {
                    records.delete(id);
                    removeOwnerReference(record);
                }
            });
        }
        pushEvent('create', record);
        return context;
    }

    function create(options = {}) {
        const normalized = normalizeOptions(options);
        const AudioContextClass = getAudioContextClass();
        if (!AudioContextClass) throw new Error('Web Audio API is not supported.');
        if (normalized.replaceOwner && normalized.ownerId) closeOwner(normalized.ownerId, 'owner-replaced');
        const constructorOptions = { latencyHint: normalized.latencyHint };
        if (normalized.sampleRate) constructorOptions.sampleRate = normalized.sampleRate;
        return register(new AudioContextClass(constructorOptions), normalized);
    }

    function getRecord(context) {
        if (!context) return null;
        const id = contextIds.get(context);
        return id ? records.get(id) || null : null;
    }

    async function resume(context, reason = 'resume') {
        if (!context) return null;
        const record = getRecord(context);
        if (context.state === 'suspended' && typeof context.resume === 'function') {
            try {
                await context.resume();
                if (record) record.resumeCount += 1;
                pushEvent('resume', record, { reason });
            } catch (error) {
                pushEvent('resume-error', record, { reason, message: error?.message || String(error || '') });
            }
        }
        return context;
    }

    async function close(context, reason = 'close') {
        if (!context) return false;
        const record = getRecord(context);
        if (record) record.closeReason = reason;
        if (context.state === 'closed') {
            if (record) {
                records.delete(record.id);
                removeOwnerReference(record);
            }
            return true;
        }
        try {
            if (typeof context.close === 'function') await context.close();
            pushEvent('close', record, { reason });
            if (record) {
                records.delete(record.id);
                removeOwnerReference(record);
            }
            return true;
        } catch (error) {
            pushEvent('close-error', record, { reason, message: error?.message || String(error || '') });
            return false;
        }
    }

    function closeOwner(ownerId, reason = 'owner-close') {
        const key = String(ownerId || '');
        if (!key) return Promise.resolve([]);
        const ids = Array.from(ownerIds.get(key) || []);
        return Promise.all(ids.map(id => close(records.get(id)?.context, reason)));
    }

    function closePurpose(purpose, reason = 'purpose-close') {
        const key = String(purpose || '');
        const contexts = Array.from(records.values()).filter(record => record.purpose === key).map(record => record.context);
        return Promise.all(contexts.map(context => close(context, reason)));
    }

    function closeAll(reason = 'close-all') {
        return Promise.all(Array.from(records.values()).map(record => close(record.context, reason)));
    }

    async function withContext(options, callback) {
        const context = create({ ...(options || {}), transient: true });
        try {
            await resume(context, 'with-context');
            return await callback(context);
        } finally {
            await close(context, 'with-context-complete');
        }
    }

    function getDiagnostics() {
        pruneClosed();
        const active = Array.from(records.values());
        const byState = {};
        const byPurpose = {};
        active.forEach(record => {
            const state = record.context?.state || record.lastState || 'unknown';
            byState[state] = (byState[state] || 0) + 1;
            byPurpose[record.purpose] = (byPurpose[record.purpose] || 0) + 1;
        });
        return Object.freeze({
            version: SERVICE_VERSION,
            activeCount: active.length,
            runningCount: byState.running || 0,
            suspendedCount: byState.suspended || 0,
            interruptedCount: byState.interrupted || 0,
            byState: Object.freeze({ ...byState }),
            byPurpose: Object.freeze({ ...byPurpose }),
            contexts: Object.freeze(active.map(record => Object.freeze({
                id: record.id,
                purpose: record.purpose,
                ownerId: record.ownerId,
                state: record.context?.state || record.lastState || 'unknown',
                transient: record.transient,
                createdAt: record.createdAt,
                ageMs: Math.max(0, now() - record.createdAt),
                resumeCount: record.resumeCount,
                closeReason: record.closeReason
            }))),
            events: Object.freeze(events.slice())
        });
    }

    if (typeof global.addEventListener === 'function') {
        global.addEventListener('pagehide', () => { closeAll('pagehide'); });
    }

    global.FoxBearAudioContextManager = Object.freeze({
        version: SERVICE_VERSION,
        create,
        register,
        resume,
        close,
        closeOwner,
        closePurpose,
        closeAll,
        withContext,
        getDiagnostics
    });
})(window);
