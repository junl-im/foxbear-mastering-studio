// FoxBear cross-tab incident queue coordination, generation fencing, and adaptive fallback synchronization - v1.6.71
(function attachFoxBearIncidentQueueCoordination(global) {
    'use strict';

    const support = global.FoxBearIncidentSupport;
    const queueModule = global.FoxBearIncidentLocalQueue;
    if (!support || !queueModule) throw new Error('FoxBear incident queue dependencies are not loaded.');

    const DEFAULT_CHANNEL_NAME = 'foxbear-incident-queue-v1';
    const DEFAULT_LEASE_TTL_MS = 15000;
    const DEFAULT_LEASE_SETTLE_MS = 30;
    const DEFAULT_TOMBSTONE_TTL_MS = 24 * 60 * 60 * 1000;
    const DEFAULT_MAX_TOMBSTONES = 96;
    const DEFAULT_MAX_SHARDS = 64;
    const DEFAULT_FALLBACK_POLL_MS = 2000;
    const DEFAULT_IDLE_POLL_MS = 12000;
    const DEFAULT_HIDDEN_POLL_MS = 45000;

    function createId(prefix = 'tab') {
        const random = Math.random().toString(36).slice(2, 10);
        return `${prefix}-${Date.now().toString(36)}-${random}`;
    }

    function createCoordinator(options = {}) {
        const key = support.cleanText(options.key || queueModule.defaultKey, 180) || queueModule.defaultKey;
        const maxItems = Math.max(1, Math.min(100, Math.floor(Number(options.maxItems || queueModule.defaultMaxItems || 8))));
        const maxSerializedBytes = Math.max(4096, Math.min(1024 * 1024, Math.floor(Number(options.maxSerializedBytes || queueModule.defaultMaxSerializedBytes || 96 * 1024))));
        const tabId = support.cleanText(options.tabId || createId('tab'), 100) || createId('tab');
        const channelName = support.cleanText(options.channelName || DEFAULT_CHANNEL_NAME, 120) || DEFAULT_CHANNEL_NAME;
        const leaseTtlMs = Math.max(250, Math.min(120000, Number(options.leaseTtlMs || DEFAULT_LEASE_TTL_MS)));
        const fallbackPollMs = Math.max(50, Math.min(30000, Number(options.fallbackPollMs || DEFAULT_FALLBACK_POLL_MS)));
        const idlePollMs = Math.max(fallbackPollMs, Math.min(60000, Number(options.idlePollMs || Math.max(DEFAULT_IDLE_POLL_MS, fallbackPollMs * 4))));
        const hiddenPollMs = Math.max(idlePollMs, Math.min(120000, Number(options.hiddenPollMs || Math.max(DEFAULT_HIDDEN_POLL_MS, idlePollMs * 3))));
        const leaseSettleMs = Math.max(0, Math.min(1000, Number(options.leaseSettleMs ?? DEFAULT_LEASE_SETTLE_MS)));
        const tombstoneTtlMs = Math.max(60000, Math.min(7 * 24 * 60 * 60 * 1000, Number(options.tombstoneTtlMs || DEFAULT_TOMBSTONE_TTL_MS)));
        const maxTombstones = Math.max(8, Math.min(512, Number(options.maxTombstones || DEFAULT_MAX_TOMBSTONES)));
        const maxShards = Math.max(2, Math.min(256, Number(options.maxShards || DEFAULT_MAX_SHARDS)));
        const storage = options.storage || global.localStorage;
        const navigatorObject = options.navigator || global.navigator || {};
        const now = typeof options.now === 'function' ? options.now : Date.now;
        const setTimeoutFn = typeof options.setTimeout === 'function' ? options.setTimeout : global.setTimeout?.bind(global);
        const clearTimeoutFn = typeof options.clearTimeout === 'function' ? options.clearTimeout : global.clearTimeout?.bind(global);
        const setIntervalFn = typeof options.setInterval === 'function' ? options.setInterval : global.setInterval?.bind(global);
        const pollingSetTimeoutFn = typeof options.pollSetTimeout === 'function' ? options.pollSetTimeout : (setIntervalFn ? setTimeoutFn : null);
        const pollingClearTimeoutFn = typeof options.pollClearTimeout === 'function' ? options.pollClearTimeout : clearTimeoutFn;
        const clearIntervalFn = typeof options.clearInterval === 'function' ? options.clearInterval : global.clearInterval?.bind(global);
        const BroadcastChannelCtor = Object.prototype.hasOwnProperty.call(options, 'BroadcastChannel') ? options.BroadcastChannel : global.BroadcastChannel;
        const AbortControllerCtor = options.AbortController || global.AbortController;
        const eventTarget = options.eventTarget || global;
        const documentObject = options.document || global.document || null;
        const shardPrefix = `${key}:tab:`;
        const ownShardKey = `${shardPrefix}${tabId}`;
        const tombstoneKey = `${key}:delivered-v1`;
        const boundTombstonePrefix = `${key}:bound-tab:`;
        const ownBoundTombstoneKey = `${boundTombstonePrefix}${tabId}`;
        const lockKey = `${key}:flush-lock-v1`;
        const revisionKey = `${key}:revision-v1`;
        const webLockName = `${key}:flush-owner-v1`;
        const listeners = new Set();
        let channel = null;
        let disposed = false;
        let revision = 0;
        let storageListener = null;
        let pagehideListener = null;
        let pageshowListener = null;
        let focusListener = null;
        let visibilityListener = null;
        let fallbackPollTimer = 0;
        let currentPollMs = 0;
        let lastPollReason = '';
        let activeLeaseToken = '';
        let activeLeaseGeneration = 0;
        let activeLeaseAbort = null;
        let activeLeaseExpiryTimer = 0;
        let lastRevisionRaw = '';
        const stats = {
            enqueueCount: 0,
            duplicateSkips: 0,
            syncEvents: 0,
            storageEvents: 0,
            broadcastEvents: 0,
            lockAcquisitions: 0,
            lockContentions: 0,
            lockLosses: 0,
            leaseRenewals: 0,
            leaseRenewalFailures: 0,
            leaseExpiryAborts: 0,
            staleLeaseTakeovers: 0,
            bfcacheReleases: 0,
            voluntaryReleases: 0,
            fallbackPolls: 0,
            fallbackChanges: 0,
            activePolls: 0,
            idlePolls: 0,
            hiddenPolls: 0,
            pollScheduleChanges: 0,
            generationMismatchAborts: 0,
            pageResyncs: 0,
            tombstoneWrites: 0,
            shardCompactions: 0,
            parseErrors: 0,
            storageFailures: 0,
            lastChangeAt: 0,
            lastLockAt: 0,
            lastLockReason: ''
        };

        function nowMs() {
            const value = Number(now());
            return Number.isFinite(value) ? value : Date.now();
        }

        function safeGet(storageKey, fallback = '') {
            try {
                const value = storage?.getItem?.(storageKey);
                return value == null ? fallback : String(value);
            } catch (error) {
                stats.storageFailures += 1;
                return fallback;
            }
        }

        function safeSet(storageKey, value) {
            try {
                storage?.setItem?.(storageKey, String(value));
                return true;
            } catch (error) {
                stats.storageFailures += 1;
                return false;
            }
        }

        function safeRemove(storageKey) {
            try {
                storage?.removeItem?.(storageKey);
                return true;
            } catch (error) {
                stats.storageFailures += 1;
                return false;
            }
        }

        function parseJson(raw, fallback) {
            const text = String(raw || '');
            if (!text) return fallback;
            try { return JSON.parse(text); }
            catch (error) {
                stats.parseErrors += 1;
                return fallback;
            }
        }

        const baseStore = queueModule.createStore({
            key,
            maxItems,
            maxSerializedBytes,
            storageGet: safeGet,
            storageSet: safeSet
        });

        function readShard(shardKey) {
            const raw = safeGet(shardKey, '');
            if (!raw) return Object.freeze({ version: 1, tabId: shardKey.slice(shardPrefix.length), updatedAt: 0, items: Object.freeze([]) });
            const parsed = parseJson(raw, null);
            if (Array.isArray(parsed)) {
                const normalized = queueModule.normalizeItems(parsed, { maxItems, maxSerializedBytes });
                return Object.freeze({ version: 0, tabId: shardKey.slice(shardPrefix.length), updatedAt: 0, items: normalized.items });
            }
            if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
                return Object.freeze({ version: 1, tabId: shardKey.slice(shardPrefix.length), updatedAt: 0, items: Object.freeze([]) });
            }
            const normalized = queueModule.normalizeItems(parsed.items, { maxItems, maxSerializedBytes });
            return Object.freeze({
                version: 1,
                tabId: support.cleanText(parsed.tabId || shardKey.slice(shardPrefix.length), 100),
                updatedAt: Math.max(0, Number(parsed.updatedAt || 0)),
                items: normalized.items
            });
        }

        function writeShard(shardKey, shardTabId, items) {
            const normalized = queueModule.normalizeItems(items, { maxItems, maxSerializedBytes: Math.max(4096, maxSerializedBytes - 512) });
            if (!normalized.items.length) return safeRemove(shardKey);
            const envelope = {
                version: 1,
                tabId: support.cleanText(shardTabId || shardKey.slice(shardPrefix.length), 100),
                updatedAt: nowMs(),
                items: normalized.items
            };
            return safeSet(shardKey, JSON.stringify(envelope));
        }

        const ownStore = queueModule.createStore({
            key: ownShardKey,
            maxItems,
            maxSerializedBytes: Math.max(4096, maxSerializedBytes - 512),
            storageGet() { return JSON.stringify(readShard(ownShardKey).items); },
            storageSet(_storageKey, raw) {
                const items = parseJson(raw, []);
                return writeShard(ownShardKey, tabId, items);
            }
        });

        function listShardKeys() {
            const keys = [];
            try {
                const length = Math.max(0, Number(storage?.length || 0));
                for (let index = 0; index < length && keys.length < maxShards; index += 1) {
                    const storageKey = storage?.key?.(index);
                    if (typeof storageKey === 'string' && storageKey.startsWith(shardPrefix)) keys.push(storageKey);
                }
            } catch (error) {
                stats.storageFailures += 1;
            }
            if (safeGet(ownShardKey, '') && !keys.includes(ownShardKey)) keys.push(ownShardKey);
            return [...new Set(keys)].slice(0, maxShards);
        }

        function entryId(value) {
            const fingerprint = support.cleanText(value?.fingerprint || value || '', 64);
            if (!fingerprint) return '';
            const clientAt = support.cleanText(value?.clientAt || '', 48);
            return `${fingerprint}@${clientAt || 'legacy'}`;
        }

        function listBoundTombstoneKeys() {
            const keys = [];
            try {
                const length = Math.max(0, Number(storage?.length || 0));
                for (let index = 0; index < length && keys.length < maxShards; index += 1) {
                    const storageKey = storage?.key?.(index);
                    if (typeof storageKey === 'string' && storageKey.startsWith(boundTombstonePrefix)) keys.push(storageKey);
                }
            } catch (error) {
                stats.storageFailures += 1;
            }
            if (safeGet(ownBoundTombstoneKey, '') && !keys.includes(ownBoundTombstoneKey)) keys.push(ownBoundTombstoneKey);
            return [...new Set(keys)].slice(0, maxShards);
        }

        function readTombstoneKey(storageKey) {
            const parsed = parseJson(safeGet(storageKey, '[]'), []);
            const cutoff = nowMs() - tombstoneTtlMs;
            const latestById = new Map();
            for (const item of Array.isArray(parsed) ? parsed : []) {
                const id = support.cleanText(item?.id || '', 140);
                const at = Math.max(0, Number(item?.at || 0));
                if (!id || at < cutoff) continue;
                if (at >= Number(latestById.get(id) || 0)) latestById.set(id, at);
            }
            return Array.from(latestById, ([id, at]) => Object.freeze({ id, at }))
                .sort((left, right) => left.at - right.at)
                .slice(-maxTombstones);
        }

        function readTombstones() {
            const latestById = new Map();
            for (const storageKey of [tombstoneKey, ...listBoundTombstoneKeys()]) {
                for (const item of readTombstoneKey(storageKey)) {
                    if (item.at >= Number(latestById.get(item.id) || 0)) latestById.set(item.id, item.at);
                }
            }
            return Array.from(latestById, ([id, at]) => Object.freeze({ id, at }))
                .sort((left, right) => left.at - right.at)
                .slice(-(maxTombstones * 4));
        }

        function writeTombstones(values = [], storageKey = tombstoneKey) {
            const current = readTombstoneKey(storageKey);
            const byId = new Map(current.map(item => [item.id, item.at]));
            const at = nowMs();
            for (const value of values) {
                const id = support.cleanText(typeof value === 'string' ? value : entryId(value), 140);
                if (id) byId.set(id, at);
            }
            const next = Array.from(byId, ([id, timestamp]) => ({ id, at: timestamp }))
                .sort((left, right) => left.at - right.at)
                .slice(-maxTombstones);
            const ok = next.length ? safeSet(storageKey, JSON.stringify(next)) : safeRemove(storageKey);
            if (ok) stats.tombstoneWrites += 1;
            return Object.freeze({ ok, items: Object.freeze(next), count: next.length });
        }

        function writeBoundTombstones(values = []) {
            return writeTombstones(values, ownBoundTombstoneKey);
        }

        function itemOrder(item, shardUpdatedAt = 0, index = 0) {
            const parsed = Date.parse(String(item?.clientAt || ''));
            if (Number.isFinite(parsed)) return parsed + Math.min(0.999, index / 1000);
            return Math.max(0, Number(shardUpdatedAt || 0)) + Math.min(0.999, index / 1000);
        }

        function collectRecords() {
            const tombstoneSet = new Set(readTombstones().map(item => item.id));
            const records = [];
            baseStore.load().forEach((item, index) => records.push({ item, order: itemOrder(item, 0, index) }));
            for (const shardKey of listShardKeys()) {
                const shard = readShard(shardKey);
                shard.items.forEach((item, index) => records.push({ item, order: itemOrder(item, shard.updatedAt, index) }));
            }
            records.sort((left, right) => left.order - right.order);
            return records.filter(record => !tombstoneSet.has(entryId(record.item)));
        }

        function collectMergedItems() {
            return queueModule.normalizeItems(collectRecords().map(record => record.item), { maxItems, maxSerializedBytes }).items;
        }

        function load() {
            return collectMergedItems();
        }

        function count() {
            return load().length;
        }

        function snapshot() {
            const items = load();
            return Object.freeze({
                items: Object.freeze([...items]),
                fingerprints: Object.freeze(items.map(item => item.fingerprint)),
                entryIds: Object.freeze(items.map(entryId)),
                count: items.length
            });
        }

        function notify(detail = {}) {
            const payload = Object.freeze({
                source: support.cleanText(detail.source || 'local', 24),
                reason: support.cleanText(detail.reason || 'queue-change', 80),
                tabId: support.cleanText(detail.tabId || tabId, 100),
                revision: Math.max(0, Number(detail.revision || revision)),
                count: count(),
                at: nowMs()
            });
            for (const listener of listeners) {
                try { listener(payload); } catch (error) {}
            }
            return payload;
        }

        function publishChange(reason = 'queue-change') {
            revision += 1;
            stats.lastChangeAt = nowMs();
            const payload = { type: 'FOXBEAR_INCIDENT_QUEUE_CHANGE', tabId, revision, reason, at: stats.lastChangeAt };
            const serialized = JSON.stringify(payload);
            try { channel?.postMessage?.(payload); } catch (error) {}
            if (safeSet(revisionKey, serialized)) lastRevisionRaw = serialized;
            notify({ ...payload, source: 'local' });
            scheduleFallbackPoll('local-change');
        }

        function save(items) {
            const saved = ownStore.save(items);
            if (saved.ok) {
                enforceGlobalBound();
                publishChange('save');
            }
            return Object.freeze({ ...saved, count: count() });
        }

        function enqueue(payload) {
            const fingerprint = support.cleanText(payload?.fingerprint || '', 64);
            const current = load();
            if (!fingerprint) return Object.freeze({ ok: false, added: false, duplicate: false, count: current.length, dropped: 0, bytes: 0 });
            if (current.some(item => item.fingerprint === fingerprint)) {
                stats.duplicateSkips += 1;
                return Object.freeze({ ok: true, added: false, duplicate: true, count: current.length, dropped: 0, bytes: 0 });
            }
            const saved = ownStore.enqueue(payload);
            stats.enqueueCount += saved.added ? 1 : 0;
            if (saved.ok) {
                enforceGlobalBound();
                publishChange(saved.duplicate ? 'duplicate' : 'enqueue');
            }
            const merged = load();
            return Object.freeze({ ...saved, added: merged.some(item => entryId(item) === entryId(payload)), count: merged.length });
        }

        function compactShard(shardKey, entryIds) {
            let ok = true;
            let removed = 0;
            for (let attempt = 0; attempt < 3; attempt += 1) {
                const shard = readShard(shardKey);
                const remaining = shard.items.filter(item => !entryIds.has(entryId(item)));
                const delta = shard.items.length - remaining.length;
                if (!delta) break;
                removed += delta;
                ok = writeShard(shardKey, shard.tabId, remaining) && ok;
                const verify = readShard(shardKey);
                if (!verify.items.some(item => entryIds.has(entryId(item)))) break;
            }
            if (removed) stats.shardCompactions += 1;
            return Object.freeze({ ok, removed });
        }

        function compactOwnShardAgainstTombstones() {
            const ids = new Set(readTombstones().map(item => item.id));
            if (!ids.size) return Object.freeze({ ok: true, removed: 0 });
            return compactShard(ownShardKey, ids);
        }

        function enforceGlobalBound() {
            const records = collectRecords();
            const visible = queueModule.normalizeItems(records.map(record => record.item), { maxItems, maxSerializedBytes }).items;
            const visibleIds = new Set(visible.map(entryId));
            const droppedIds = new Set(records.map(record => entryId(record.item)).filter(id => id && !visibleIds.has(id)));
            if (!droppedIds.size) return Object.freeze({ ok: true, dropped: 0, count: visible.length });
            const tombstones = writeBoundTombstones([...droppedIds]);
            let ok = tombstones.ok;
            for (const shardKey of listShardKeys()) ok = compactShard(shardKey, droppedIds).ok && ok;
            return Object.freeze({ ok, dropped: droppedIds.size, count: collectMergedItems().length });
        }

        function removeEntries(values = []) {
            const entries = Array.isArray(values) ? values : [];
            const ids = new Set(entries.map(value => typeof value === 'string' ? support.cleanText(value, 140) : entryId(value)).filter(Boolean));
            const before = load();
            if (!ids.size) return Object.freeze({ ok: true, items: before, count: before.length, removed: 0, preservedConcurrent: 0 });
            const fingerprints = new Set(entries.map(value => support.cleanText(value?.fingerprint || '', 64)).filter(Boolean));
            const tombstones = writeTombstones([...ids]);
            let ok = tombstones.ok;
            if (fingerprints.size) {
                const baseResult = baseStore.removeFingerprints([...fingerprints]);
                ok = baseResult.ok && ok;
            }
            let physicallyRemoved = 0;
            for (const shardKey of listShardKeys()) {
                const compacted = compactShard(shardKey, ids);
                physicallyRemoved += compacted.removed;
                ok = compacted.ok && ok;
            }
            const after = load();
            const removed = Math.max(0, before.length - after.length);
            publishChange('commit');
            return Object.freeze({
                ok,
                items: Object.freeze([...after]),
                count: after.length,
                removed,
                physicallyRemoved,
                preservedConcurrent: Math.max(0, after.length - Math.max(0, before.length - removed))
            });
        }

        function removeFingerprints(values = []) {
            const fingerprints = new Set((Array.isArray(values) ? values : []).map(value => support.cleanText(value || '', 64)).filter(Boolean));
            const entries = load().filter(item => fingerprints.has(item.fingerprint));
            return removeEntries(entries);
        }

        function clear() {
            return removeEntries(load());
        }

        function readLease() {
            const parsed = parseJson(safeGet(lockKey, ''), null);
            if (!parsed || typeof parsed !== 'object') return null;
            return Object.freeze({
                owner: support.cleanText(parsed.owner || '', 100),
                token: support.cleanText(parsed.token || '', 180),
                expiresAt: Math.max(0, Number(parsed.expiresAt || 0)),
                generation: Math.max(0, Number(parsed.generation || 0))
            });
        }

        function createAbortError(reason = 'queue ownership lost') {
            const error = new Error(support.cleanText(reason, 180));
            error.name = 'AbortError';
            error.code = 'FOXBEAR_INCIDENT_QUEUE_OWNERSHIP_LOST';
            return error;
        }

        function sleep(delayMs) {
            if (!setTimeoutFn || delayMs <= 0) return Promise.resolve();
            return new Promise(resolve => setTimeoutFn(resolve, delayMs));
        }

        function createLinkedController(sourceSignal) {
            if (typeof AbortControllerCtor !== 'function') {
                return Object.freeze({ controller: null, signal: sourceSignal || null, unlink() {} });
            }
            const controller = new AbortControllerCtor();
            let handler = null;
            if (sourceSignal) {
                if (sourceSignal.aborted) controller.abort(sourceSignal.reason);
                else if (typeof sourceSignal.addEventListener === 'function') {
                    handler = () => controller.abort(sourceSignal.reason);
                    sourceSignal.addEventListener('abort', handler, { once: true });
                }
            }
            return Object.freeze({
                controller,
                signal: controller.signal,
                unlink() { if (handler) sourceSignal?.removeEventListener?.('abort', handler); }
            });
        }

        function clearLeaseExpiryTimer() {
            if (activeLeaseExpiryTimer && clearTimeoutFn) clearTimeoutFn(activeLeaseExpiryTimer);
            activeLeaseExpiryTimer = 0;
        }

        function abortActiveOwnership(reason = 'Incident queue ownership lost.', metric = '') {
            if (!activeLeaseAbort || activeLeaseAbort.signal?.aborted) return false;
            if (metric && Object.prototype.hasOwnProperty.call(stats, metric)) stats[metric] += 1;
            stats.lastLockReason = cleanLockReason(reason);
            activeLeaseAbort.abort?.(createAbortError(reason));
            return true;
        }

        function cleanLockReason(value) {
            return support.cleanText(String(value || 'ownership-lost').toLowerCase().replace(/[^a-z0-9-]+/g, '-'), 80) || 'ownership-lost';
        }

        function releaseActiveOwnership(reason = 'ownership-release', options = {}) {
            const token = activeLeaseToken;
            const generation = activeLeaseGeneration;
            const lease = token ? readLease() : null;
            abortActiveOwnership(reason);
            clearLeaseExpiryTimer();
            if (token && lease?.token === token && lease?.generation === generation) safeRemove(lockKey);
            if (token || activeLeaseAbort) stats.voluntaryReleases += 1;
            if (options.bfcache) stats.bfcacheReleases += 1;
            activeLeaseToken = '';
            activeLeaseGeneration = 0;
            activeLeaseAbort = null;
        }

        function validateActiveOwnership(source = 'ownership-check') {
            if (!activeLeaseToken || activeLeaseToken === webLockName) return true;
            const lease = readLease();
            if (lease?.token === activeLeaseToken && lease.generation === activeLeaseGeneration && lease.expiresAt > nowMs()) return true;
            if (lease?.token === activeLeaseToken && lease.generation !== activeLeaseGeneration) stats.generationMismatchAborts += 1;
            stats.lockLosses += 1;
            abortActiveOwnership(`Incident queue lease lost during ${source}.`);
            return false;
        }

        function resync(source = 'manual') {
            if (disposed) return Object.freeze({ ok: false, disposed: true, count: 0 });
            enforceGlobalBound();
            compactOwnShardAgainstTombstones();
            validateActiveOwnership(source);
            if (source !== 'manual') stats.pageResyncs += 1;
            const payload = notify({ source: source === 'peer' ? 'peer' : 'local', reason: `resync-${source}` });
            return Object.freeze({ ok: true, disposed: false, count: payload.count });
        }

        function determinePollProfile() {
            const hidden = documentObject?.visibilityState === 'hidden';
            if (hidden) return Object.freeze({ delayMs: hiddenPollMs, reason: 'hidden' });
            const lease = readLease();
            const active = count() > 0 || Boolean(activeLeaseToken) || Boolean(lease?.expiresAt > nowMs());
            return active
                ? Object.freeze({ delayMs: fallbackPollMs, reason: 'active' })
                : Object.freeze({ delayMs: idlePollMs, reason: 'idle' });
        }

        function scheduleFallbackPoll(reason = 'schedule', immediate = false) {
            if (disposed || !pollingSetTimeoutFn) return false;
            if (fallbackPollTimer && pollingClearTimeoutFn) pollingClearTimeoutFn(fallbackPollTimer);
            const profile = determinePollProfile();
            currentPollMs = immediate ? 0 : profile.delayMs;
            lastPollReason = support.cleanText(`${reason}:${profile.reason}`, 80);
            stats.pollScheduleChanges += 1;
            fallbackPollTimer = pollingSetTimeoutFn(() => {
                fallbackPollTimer = 0;
                pollExternalRevision(profile.reason);
            }, currentPollMs);
            return true;
        }

        function pollExternalRevision(profileReason = '') {
            if (disposed) return;
            stats.fallbackPolls += 1;
            if (profileReason === 'hidden') stats.hiddenPolls += 1;
            else if (profileReason === 'idle') stats.idlePolls += 1;
            else stats.activePolls += 1;
            const raw = safeGet(revisionKey, '');
            if (!raw || raw === lastRevisionRaw) validateActiveOwnership('fallback-poll');
            else {
                lastRevisionRaw = raw;
                stats.fallbackChanges += 1;
                handleExternalChange(parseJson(raw, null), 'poll');
                validateActiveOwnership('fallback-poll-change');
            }
            scheduleFallbackPoll('poll-complete');
        }

        async function runWithLease(callback, runOptions = {}) {
            const current = readLease();
            const currentTime = nowMs();
            if (current?.token && current.expiresAt <= currentTime) stats.staleLeaseTakeovers += 1;
            if (current?.token && current.expiresAt > currentTime && current.owner !== tabId) {
                stats.lockContentions += 1;
                stats.lastLockReason = 'peer-lease';
                return Object.freeze({ acquired: false, skipped: true, reason: 'peer-owner', owner: current.owner, value: null });
            }
            const token = `${tabId}:${createId('lease')}`;
            const generation = Math.max(0, Number(current?.generation || 0)) + 1;
            const claim = { owner: tabId, token, expiresAt: currentTime + leaseTtlMs, generation };
            if (!safeSet(lockKey, JSON.stringify(claim))) {
                stats.lockContentions += 1;
                stats.lastLockReason = 'lease-storage-failed';
                return Object.freeze({ acquired: false, skipped: true, reason: 'lock-storage-failed', owner: '', value: null });
            }
            await sleep(leaseSettleMs);
            const verified = readLease();
            if (!verified || verified.token !== token || verified.generation !== generation || verified.expiresAt <= nowMs()) {
                stats.lockContentions += 1;
                stats.lastLockReason = 'lease-race-lost';
                return Object.freeze({ acquired: false, skipped: true, reason: 'peer-owner', owner: verified?.owner || '', value: null });
            }

            const linked = createLinkedController(runOptions.signal);
            const controller = linked.controller;
            activeLeaseToken = token;
            activeLeaseGeneration = generation;
            activeLeaseAbort = controller;
            stats.lockAcquisitions += 1;
            stats.lastLockAt = nowMs();
            stats.lastLockReason = 'lease-acquired';
            let heartbeat = 0;
            const armExpiryWatchdog = () => {
                clearLeaseExpiryTimer();
                if (!setTimeoutFn) return;
                activeLeaseExpiryTimer = setTimeoutFn(() => {
                    if (!validateActiveOwnership('lease-expiry-watchdog')) stats.leaseExpiryAborts += 1;
                }, leaseTtlMs + 25);
            };
            const isOwner = () => {
                const lease = readLease();
                return !disposed && lease?.token === token && lease.generation === generation && lease.expiresAt > nowMs() && !linked.signal?.aborted;
            };
            armExpiryWatchdog();
            if (setIntervalFn) {
                heartbeat = setIntervalFn(() => {
                    const lease = readLease();
                    if (!lease || lease.token !== token || lease.generation !== generation || lease.expiresAt <= nowMs()) {
                        if (lease?.token === token && lease?.generation !== generation) stats.generationMismatchAborts += 1;
                        stats.lockLosses += 1;
                        stats.lastLockReason = 'lease-lost';
                        controller?.abort?.(createAbortError());
                        return;
                    }
                    const renewed = { owner: tabId, token, expiresAt: nowMs() + leaseTtlMs, generation };
                    if (safeSet(lockKey, JSON.stringify(renewed))) {
                        stats.leaseRenewals += 1;
                        armExpiryWatchdog();
                    } else {
                        stats.leaseRenewalFailures += 1;
                        stats.lastLockReason = 'lease-renewal-failed';
                        controller?.abort?.(createAbortError('Incident queue lease renewal failed.'));
                    }
                }, Math.max(500, Math.floor(leaseTtlMs / 3)));
            }
            try {
                const value = await callback(Object.freeze({ owner: tabId, token, generation, fenceId: `lease-${generation}`, signal: linked.signal, isOwner, mode: 'lease' }));
                return Object.freeze({ acquired: true, skipped: false, reason: 'acquired', owner: tabId, value });
            } finally {
                if (heartbeat && clearIntervalFn) clearIntervalFn(heartbeat);
                clearLeaseExpiryTimer();
                linked.unlink();
                const lease = readLease();
                if (lease?.token === token && lease?.generation === generation) safeRemove(lockKey);
                if (activeLeaseToken === token) { activeLeaseToken = ''; activeLeaseGeneration = 0; }
                if (activeLeaseAbort === controller) activeLeaseAbort = null;
            }
        }

        async function runWithWebLock(callback, runOptions = {}) {
            return navigatorObject.locks.request(webLockName, { mode: 'exclusive', ifAvailable: true }, async lock => {
                if (!lock) {
                    stats.lockContentions += 1;
                    stats.lastLockReason = 'peer-web-lock';
                    return Object.freeze({ acquired: false, skipped: true, reason: 'peer-owner', owner: '', value: null });
                }
                const linked = createLinkedController(runOptions.signal);
                activeLeaseToken = webLockName;
                activeLeaseGeneration = 0;
                activeLeaseAbort = linked.controller;
                stats.lockAcquisitions += 1;
                stats.lastLockAt = nowMs();
                stats.lastLockReason = 'web-lock-acquired';
                try {
                    const value = await callback(Object.freeze({ owner: tabId, token: webLockName, generation: 0, fenceId: 'web-lock', signal: linked.signal, isOwner: () => !disposed && !linked.signal?.aborted, mode: 'web-lock' }));
                    return Object.freeze({ acquired: true, skipped: false, reason: 'acquired', owner: tabId, value });
                } finally {
                    linked.unlink();
                    if (activeLeaseAbort === linked.controller) activeLeaseAbort = null;
                    if (activeLeaseToken === webLockName) { activeLeaseToken = ''; activeLeaseGeneration = 0; }
                }
            });
        }

        function runExclusive(callback, runOptions = {}) {
            if (disposed) return Promise.resolve(Object.freeze({ acquired: false, skipped: true, reason: 'disposed', owner: '', value: null }));
            if (typeof callback !== 'function') return Promise.reject(new TypeError('Queue ownership callback is required.'));
            if (navigatorObject?.locks && typeof navigatorObject.locks.request === 'function') return runWithWebLock(callback, runOptions);
            return runWithLease(callback, runOptions);
        }

        function subscribe(listener) {
            if (typeof listener !== 'function') return () => {};
            listeners.add(listener);
            return () => listeners.delete(listener);
        }

        function handleExternalChange(payload, source) {
            if (!payload || payload.type !== 'FOXBEAR_INCIDENT_QUEUE_CHANGE' || payload.tabId === tabId) return;
            stats.syncEvents += 1;
            if (source === 'broadcast') stats.broadcastEvents += 1;
            if (source === 'storage') stats.storageEvents += 1;
            if (source === 'poll') stats.storageEvents += 1;
            enforceGlobalBound();
            compactOwnShardAgainstTombstones();
            notify({ ...payload, source: 'peer' });
        }

        function initialize() {
            try {
                if (typeof BroadcastChannelCtor === 'function') {
                    channel = new BroadcastChannelCtor(channelName);
                    if (typeof channel.addEventListener === 'function') channel.addEventListener('message', event => handleExternalChange(event?.data, 'broadcast'));
                    else channel.onmessage = event => handleExternalChange(event?.data, 'broadcast');
                }
            } catch (error) { channel = null; }
            lastRevisionRaw = safeGet(revisionKey, '');
            if (typeof eventTarget?.addEventListener === 'function') {
                storageListener = event => {
                    if (event?.key === lockKey) {
                        const lease = parseJson(event.newValue || '', null);
                        if (activeLeaseToken && activeLeaseToken !== webLockName && (lease?.token !== activeLeaseToken || lease?.generation !== activeLeaseGeneration)) {
                            if (lease?.token === activeLeaseToken && lease?.generation !== activeLeaseGeneration) stats.generationMismatchAborts += 1;
                            stats.lockLosses += 1;
                            abortActiveOwnership('Incident queue ownership changed in another tab.');
                        }
                        return;
                    }
                    if (event?.key !== revisionKey || !event.newValue) return;
                    lastRevisionRaw = String(event.newValue);
                    handleExternalChange(parseJson(event.newValue, null), 'storage');
                };
                pagehideListener = event => { releaseActiveOwnership('Incident queue page hidden.', { bfcache: Boolean(event?.persisted) }); scheduleFallbackPoll('pagehide'); };
                pageshowListener = () => { resync('pageshow'); scheduleFallbackPoll('pageshow', true); };
                focusListener = () => { resync('focus'); scheduleFallbackPoll('focus', true); };
                eventTarget.addEventListener('storage', storageListener);
                eventTarget.addEventListener('pagehide', pagehideListener);
                eventTarget.addEventListener('pageshow', pageshowListener);
                eventTarget.addEventListener('focus', focusListener);
            }
            if (typeof documentObject?.addEventListener === 'function') {
                visibilityListener = () => { if (documentObject.visibilityState !== 'hidden') resync('visible'); scheduleFallbackPoll('visibility', documentObject.visibilityState !== 'hidden'); };
                documentObject.addEventListener('visibilitychange', visibilityListener);
            }
            scheduleFallbackPoll('initialize');
            enforceGlobalBound();
            compactOwnShardAgainstTombstones();
        }

        function getState() {
            const shardKeys = listShardKeys();
            const peerShards = shardKeys.map(readShard).filter(shard => shard.tabId && shard.tabId !== tabId && shard.items.length > 0);
            const lease = readLease();
            return Object.freeze({
                version: '1.6.71',
                key,
                maxItems,
                maxSerializedBytes,
                queueCount: count(),
                shardCount: shardKeys.length,
                peerShardCount: peerShards.length,
                tombstoneCount: readTombstones().length,
                lockOwned: Boolean(activeLeaseToken),
                lockOwner: lease?.expiresAt > nowMs() ? (lease.owner === tabId ? 'self' : 'peer') : '',
                lockOwnedByPeer: Boolean(lease?.expiresAt > nowMs() && lease.owner && lease.owner !== tabId),
                lockMode: navigatorObject?.locks && typeof navigatorObject.locks.request === 'function' ? 'web-lock' : 'lease',
                syncMode: channel ? 'broadcast-storage-poll' : 'storage-polling',
                fallbackPollMs,
                idlePollMs,
                hiddenPollMs,
                currentPollMs,
                lastPollReason,
                pollingEnabled: Boolean(pollingSetTimeoutFn),
                activeLeaseGeneration,
                disposed,
                ...stats
            });
        }

        function dispose() {
            if (disposed) return;
            disposed = true;
            try { channel?.close?.(); } catch (error) {}
            channel = null;
            if (storageListener) eventTarget?.removeEventListener?.('storage', storageListener);
            if (pagehideListener) eventTarget?.removeEventListener?.('pagehide', pagehideListener);
            if (pageshowListener) eventTarget?.removeEventListener?.('pageshow', pageshowListener);
            if (focusListener) eventTarget?.removeEventListener?.('focus', focusListener);
            if (visibilityListener) documentObject?.removeEventListener?.('visibilitychange', visibilityListener);
            storageListener = null;
            pagehideListener = null;
            pageshowListener = null;
            focusListener = null;
            visibilityListener = null;
            if (fallbackPollTimer && pollingClearTimeoutFn) pollingClearTimeoutFn(fallbackPollTimer);
            fallbackPollTimer = 0;
            releaseActiveOwnership('Incident queue coordinator disposed.');
            listeners.clear();
        }

        initialize();
        return Object.freeze({
            load,
            save,
            enqueue,
            snapshot,
            removeEntries,
            removeFingerprints,
            count,
            clear,
            getState,
            runExclusive,
            subscribe,
            resync,
            dispose,
            entryId
        });
    }

    global.FoxBearIncidentQueueCoordination = Object.freeze({
        version: '1.6.71',
        defaultChannelName: DEFAULT_CHANNEL_NAME,
        defaultLeaseTtlMs: DEFAULT_LEASE_TTL_MS,
        defaultTombstoneTtlMs: DEFAULT_TOMBSTONE_TTL_MS,
        defaultFallbackPollMs: DEFAULT_FALLBACK_POLL_MS,
        defaultIdlePollMs: DEFAULT_IDLE_POLL_MS,
        defaultHiddenPollMs: DEFAULT_HIDDEN_POLL_MS,
        createCoordinator
    });
})(typeof window !== 'undefined' ? window : globalThis);
