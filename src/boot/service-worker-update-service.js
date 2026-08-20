// FoxBear service worker update coordinator v1.6.112 - generation-fenced activation claim and BFCache controller reconciliation
(function attachFoxBearServiceWorkerUpdateService(global) {
  'use strict';

  const VERSION = '1.6.112-mastering-lifecycle-race-hardening';
  const DEFAULT_POLL_MS = 500;
  const DEFAULT_STABLE_IDLE_MS = 1800;
  const PEER_TTL_MS = 5000;
  const HEARTBEAT_MS = 1500;
  const CHANNEL_NAME = 'foxbear-sw-activity-v1';
  const STORAGE_PREFIX = 'foxbear-sw-activity:';
  const ACTIVATION_LEASE_KEY = 'foxbear-sw-activation-lease:v1';
  const ACTIVATION_LEASE_TTL_MS = 15000;
  const ACTIVATION_WATCHDOG_MS = 12000;
  const ACTIVATION_CLAIM_SETTLE_MS = 80;
  const TAB_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const peers = new Map();
  const observedRegistrations = new WeakSet();
  const registrationOptions = new WeakMap();
  let observedRegistrationCount = 0;
  let channel = null;
  let storageListenerInstalled = false;
  let activitySuspended = false;
  const state = {
    registration: null,
    waiting: null,
    timer: 0,
    heartbeatTimer: 0,
    activationTimer: 0,
    activationClaimTimer: 0,
    idleSince: 0,
    activationRequested: false,
    controllerChangePending: false,
    lastCheckAt: 0,
    lastActivationAt: 0,
    lastHeartbeatAt: 0,
    lastReason: 'idle',
    checks: 0,
    activityPauseCount: 0,
    activityResumeCount: 0,
    activationLeaseAcquireCount: 0,
    activationLeaseBusyCount: 0,
    activationLeaseReleaseCount: 0,
    activationTimeoutCount: 0,
    activationLeaseLostCount: 0,
    activationClaimCount: 0,
    activationClaimFencedCount: 0,
    activationResumeReconcileCount: 0,
    activationControllerChangeDedupCount: 0,
    clientShellAnnouncementCount: 0,
    clientShellQueryCount: 0,
    clientShellInactiveCount: 0,
    lastClientShellAnnouncementAt: 0,
    activationLeaseToken: '',
    activationLeaseGeneration: 0,
    activationLeasePersistent: false,
    activationLeaseExpiresAt: 0,
    controllerBeforeActivation: null,
    lastController: global.navigator?.serviceWorker?.controller || null,
    lastOptions: {}
  };

  function safeCall(fn, fallback = null) {
    try { return typeof fn === 'function' ? fn() : fallback; }
    catch (error) { return fallback; }
  }

  function getClientShellPayload(requestId = '', reason = 'announce', active = true) {
    return {
      type: active ? 'FOXBEAR_CLIENT_SHELL_STATE' : 'FOXBEAR_CLIENT_SHELL_INACTIVE',
      requestId: String(requestId || ''),
      assetVersion: VERSION,
      cacheName: String(global.FoxBearBuildInfo?.cacheName || `foxbear-shell-v${VERSION}`),
      tabId: TAB_ID,
      active: active === true,
      visibility: global.document?.visibilityState || 'unknown',
      reason: String(reason || 'announce'),
      updatedAt: Date.now()
    };
  }

  function postClientShellState(requestId = '', reason = 'announce', active = true, target = null) {
    const worker = target?.postMessage ? target : global.navigator?.serviceWorker?.controller;
    if (!worker?.postMessage) return false;
    try {
      worker.postMessage(getClientShellPayload(requestId, reason, active));
      state.lastClientShellAnnouncementAt = Date.now();
      if (active) state.clientShellAnnouncementCount += 1;
      else state.clientShellInactiveCount += 1;
      return true;
    } catch (error) {
      global.FoxBearRuntimeFaultCounters?.record?.('service-worker', 'client-state-post-failed');
      return false;
    }
  }

  function handleServiceWorkerMessage(event) {
    const payload = event?.data;
    if (!payload || payload.type !== 'FOXBEAR_QUERY_CLIENT_SHELL_STATE') return false;
    state.clientShellQueryCount += 1;
    return postClientShellState(payload.requestId, 'service-worker-query', true, event.source);
  }

  function getActivitySnapshot() {
    const importQueue = safeCall(() => global.FoxBearBulkImportGuard?.getSnapshot?.(), {}) || {};
    const mastering = safeCall(() => global.FoxBearMasteringGuard?.getSnapshot?.(), {}) || {};
    const decode = safeCall(() => global.FoxBearAudioDecodeService?.getDiagnostics?.(), {}) || {};
    const render = safeCall(() => global.FoxBearRenderScheduler?.getSnapshot?.(), {}) || {};
    const zipExport = safeCall(() => global.FoxBearZipExport?.getSnapshot?.(), {}) || {};
    const exportQueue = safeCall(() => global.FoxBearExportQueueService?.getSnapshot?.(), {}) || {};
    const audios = Array.from(global.document?.querySelectorAll?.('audio') || []);
    const playing = audios.filter(audio => audio && !audio.paused && !audio.ended).length;
    const active = {
      analysis: Number(importQueue.active || 0) + Number(importQueue.pending || 0),
      mastering: Number(mastering.active || 0) + (mastering.busy ? 1 : 0),
      decoding: Number(decode.activeDecodes || 0),
      rendering: render.pending || render.inRender ? 1 : 0,
      exporting: (zipExport.active || exportQueue.active || exportQueue.preparing || exportQueue.delivering) ? 1 : 0,
      playback: playing
    };
    const reasons = Object.entries(active).filter(([, value]) => Number(value) > 0).map(([key]) => key);
    return Object.freeze({ ...active, idle: reasons.length === 0, reasons: Object.freeze(reasons) });
  }

  function peerStorageKey(id = TAB_ID) {
    return `${STORAGE_PREFIX}${id}`;
  }

  function readStoredActivationLease() {
    try {
      const value = JSON.parse(global.localStorage?.getItem?.(ACTIVATION_LEASE_KEY) || 'null');
      if (!value || !value.token) return null;
      return {
        token: String(value.token),
        generation: Math.max(1, Number(value.generation || 1)),
        acquiredAt: Number(value.acquiredAt || 0),
        expiresAt: Number(value.expiresAt || 0)
      };
    } catch (error) { return null; }
  }

  function readActivationLease() {
    const value = readStoredActivationLease();
    if (!value || value.expiresAt <= Date.now()) return null;
    return value;
  }

  function leaseMatches(value, token = state.activationLeaseToken, generation = state.activationLeaseGeneration) {
    return Boolean(value && value.token === token && Number(value.generation || 0) === Number(generation || 0));
  }

  function acquireActivationLease() {
    const current = readStoredActivationLease();
    if (current && current.expiresAt > Date.now() && current.token !== TAB_ID) {
      state.activationLeaseBusyCount += 1;
      state.activationLeaseExpiresAt = Number(current.expiresAt || 0);
      return null;
    }
    const generation = Math.max(Number(current?.generation || 0), Number(state.activationLeaseGeneration || 0)) + 1;
    const lease = { token: TAB_ID, generation, acquiredAt: Date.now(), expiresAt: Date.now() + ACTIVATION_LEASE_TTL_MS };
    try {
      global.localStorage?.setItem?.(ACTIVATION_LEASE_KEY, JSON.stringify(lease));
      const verified = readActivationLease();
      if (!leaseMatches(verified, TAB_ID, generation)) {
        state.activationLeaseBusyCount += 1;
        return null;
      }
      state.activationLeaseToken = TAB_ID;
      state.activationLeaseGeneration = generation;
      state.activationLeasePersistent = true;
      state.activationLeaseExpiresAt = lease.expiresAt;
      state.activationLeaseAcquireCount += 1;
      return lease;
    } catch (error) {
      state.activationLeaseToken = TAB_ID;
      state.activationLeaseGeneration = generation;
      state.activationLeasePersistent = false;
      state.activationLeaseExpiresAt = lease.expiresAt;
      state.activationLeaseAcquireCount += 1;
      state.lastReason = 'activation-lease-local-fallback';
      return lease;
    }
  }

  function clearActivationClaimTimer() {
    if (!state.activationClaimTimer) return;
    try { global.clearTimeout?.(state.activationClaimTimer); } catch (error) {}
    state.activationClaimTimer = 0;
  }

  function releaseActivationLease(reason = 'release', expectedGeneration = state.activationLeaseGeneration) {
    if (state.activationLeaseToken !== TAB_ID || Number(expectedGeneration || 0) !== Number(state.activationLeaseGeneration || 0)) return false;
    try {
      const current = readStoredActivationLease();
      if (leaseMatches(current, TAB_ID, expectedGeneration)) global.localStorage?.removeItem?.(ACTIVATION_LEASE_KEY);
    } catch (error) { global.FoxBearRuntimeFaultCounters?.record?.('service-worker', 'lease-release-storage-failed'); }
    state.activationLeaseToken = '';
    state.activationLeaseGeneration = 0;
    state.activationLeasePersistent = false;
    state.activationLeaseExpiresAt = 0;
    state.activationLeaseReleaseCount += 1;
    state.lastReason = reason || state.lastReason;
    return true;
  }

  function clearActivationWatchdog() {
    if (!state.activationTimer) return;
    try { global.clearTimeout?.(state.activationTimer); } catch (error) {}
    state.activationTimer = 0;
  }

  function resetActivationRequestState() {
    clearActivationClaimTimer();
    clearActivationWatchdog();
    state.activationRequested = false;
    state.controllerChangePending = false;
    state.controllerBeforeActivation = null;
  }

  function handleActivationTimeout(expectedGeneration) {
    state.activationTimer = 0;
    if (Number(expectedGeneration || 0) !== Number(state.activationLeaseGeneration || 0)) return false;
    if (!state.controllerChangePending && !state.activationRequested) return false;
    state.activationRequested = false;
    state.controllerChangePending = false;
    state.controllerBeforeActivation = null;
    state.activationTimeoutCount += 1;
    state.lastReason = 'activation-timeout';
    releaseActivationLease('activation-timeout-release', expectedGeneration);
    if (getWaitingWorker()) scheduleCheck(state.lastOptions?.pollMs || DEFAULT_POLL_MS, state.lastOptions || {});
    return true;
  }

  function scheduleActivationWatchdog(expectedGeneration) {
    clearActivationWatchdog();
    if (typeof global.setTimeout !== 'function') return 0;
    state.activationTimer = global.setTimeout(() => handleActivationTimeout(expectedGeneration), ACTIVATION_WATCHDOG_MS) || 0;
    return state.activationTimer;
  }

  function loseActivationClaim(reason = 'activation-lease-lost') {
    const expectedGeneration = state.activationLeaseGeneration;
    clearActivationClaimTimer();
    clearActivationWatchdog();
    state.activationRequested = false;
    state.controllerChangePending = false;
    state.controllerBeforeActivation = null;
    state.activationLeaseToken = '';
    state.activationLeaseGeneration = 0;
    state.activationLeasePersistent = false;
    state.activationLeaseLostCount += 1;
    state.lastReason = reason;
    if (getWaitingWorker()) scheduleCheck(state.lastOptions?.pollMs || DEFAULT_POLL_MS, state.lastOptions || {});
    return expectedGeneration;
  }

  function handleActivationLeaseStorage(event) {
    if (event?.key !== ACTIVATION_LEASE_KEY || (!state.activationRequested && !state.controllerChangePending)) return false;
    let lease = null;
    try { lease = event.newValue ? JSON.parse(event.newValue) : null; } catch (error) {}
    if (leaseMatches(lease, TAB_ID, state.activationLeaseGeneration)) return false;
    state.activationLeaseExpiresAt = Number(lease?.expiresAt || 0);
    loseActivationClaim('activation-lease-lost');
    return true;
  }

  function rememberPeer(payload) {
    if (!payload || payload.type !== 'FOXBEAR_TAB_ACTIVITY' || !payload.tabId || payload.tabId === TAB_ID) return;
    if (payload.closed) {
      peers.delete(payload.tabId);
      return;
    }
    const updatedAt = Number(payload.updatedAt || 0);
    if (!updatedAt || Date.now() - updatedAt > PEER_TTL_MS * 2) return;
    peers.set(String(payload.tabId), {
      tabId: String(payload.tabId),
      updatedAt,
      activity: payload.activity || { idle: true, reasons: [] },
      visibility: payload.visibility || 'unknown'
    });
  }

  function readStoredPeers() {
    try {
      for (let index = 0; index < global.localStorage.length; index += 1) {
        const key = global.localStorage.key(index);
        if (!key || !key.startsWith(STORAGE_PREFIX) || key === peerStorageKey()) continue;
        try { rememberPeer(JSON.parse(global.localStorage.getItem(key) || 'null')); } catch (error) {}
      }
    } catch (error) { global.FoxBearRuntimeFaultCounters?.record?.('service-worker', 'peer-storage-read-failed'); }
  }

  function prunePeers() {
    const cutoff = Date.now() - PEER_TTL_MS;
    peers.forEach((peer, id) => {
      if (Number(peer.updatedAt || 0) >= cutoff) return;
      peers.delete(id);
      try { global.localStorage?.removeItem?.(peerStorageKey(id)); } catch (error) {}
    });
  }

  function getPeerActivitySnapshot() {
    readStoredPeers();
    prunePeers();
    const entries = Array.from(peers.values());
    const busy = entries.filter(peer => peer.activity && peer.activity.idle === false);
    return Object.freeze({
      count: entries.length,
      busyCount: busy.length,
      busyTabs: Object.freeze(busy.map(peer => Object.freeze({ tabId: peer.tabId, reasons: Object.freeze(Array.from(peer.activity?.reasons || [])), visibility: peer.visibility }))),
      idle: busy.length === 0
    });
  }

  function publishActivity(force = false) {
    const now = Date.now();
    if (!force && now - state.lastHeartbeatAt < Math.max(500, HEARTBEAT_MS - 100)) return;
    state.lastHeartbeatAt = now;
    const payload = {
      type: 'FOXBEAR_TAB_ACTIVITY',
      tabId: TAB_ID,
      updatedAt: now,
      visibility: global.document?.visibilityState || 'unknown',
      activity: getActivitySnapshot()
    };
    try { channel?.postMessage?.(payload); } catch (error) { global.FoxBearRuntimeFaultCounters?.record?.('service-worker', 'peer-channel-post-failed'); }
    try { global.localStorage?.setItem?.(peerStorageKey(), JSON.stringify(payload)); } catch (error) { global.FoxBearRuntimeFaultCounters?.record?.('service-worker', 'peer-storage-write-failed'); }
  }

  function handlePeerStorage(event) {
    if (event?.key === ACTIVATION_LEASE_KEY) { handleActivationLeaseStorage(event); return; }
    if (!event.key?.startsWith?.(STORAGE_PREFIX) || !event.newValue) return;
    try { rememberPeer(JSON.parse(event.newValue)); } catch (error) {}
  }

  function pauseActivityChannel(reason = 'pagehide') {
    if (activitySuspended && !state.heartbeatTimer && !channel) return false;
    const payload = { type: 'FOXBEAR_TAB_ACTIVITY', tabId: TAB_ID, updatedAt: Date.now(), closed: true, reason };
    try { channel?.postMessage?.(payload); } catch (error) {}
    if (state.heartbeatTimer) {
      try { global.clearInterval?.(state.heartbeatTimer); } catch (error) {}
      state.heartbeatTimer = 0;
    }
    try { channel?.close?.(); } catch (error) {}
    channel = null;
    try { global.localStorage?.removeItem?.(peerStorageKey()); } catch (error) {}
    activitySuspended = true;
    state.activityPauseCount += 1;
    return true;
  }

  function resumeActivityChannel(reason = 'resume') {
    if (!channel) {
      try {
        if (typeof global.BroadcastChannel === 'function') {
          channel = new global.BroadcastChannel(CHANNEL_NAME);
          channel.addEventListener('message', event => rememberPeer(event.data));
        }
      } catch (error) { channel = null; }
    }
    if (!state.heartbeatTimer && typeof global.setInterval === 'function') {
      state.heartbeatTimer = global.setInterval(() => publishActivity(), HEARTBEAT_MS);
    }
    const resumed = activitySuspended;
    activitySuspended = false;
    if (resumed) state.activityResumeCount += 1;
    publishActivity(true);
    state.lastReason = resumed ? `activity-resumed:${reason}` : state.lastReason;
    return true;
  }

  function initializePeerChannel() {
    if (!storageListenerInstalled) {
      storageListenerInstalled = true;
      global.addEventListener?.('storage', handlePeerStorage);
    }
    resumeActivityChannel('initialize');
  }

  function clearTimer() {
    if (!state.timer) return;
    global.clearTimeout(state.timer);
    state.timer = 0;
  }

  function getWaitingWorker(registration = state.registration) {
    return registration?.waiting || state.waiting || null;
  }

  function finalizeActivationClaim(expectedGeneration, waiting, reason) {
    state.activationClaimTimer = 0;
    if (!state.activationRequested || Number(expectedGeneration || 0) !== Number(state.activationLeaseGeneration || 0)) return false;
    if (state.activationLeasePersistent) {
      const current = readActivationLease();
      if (!leaseMatches(current, TAB_ID, expectedGeneration)) {
        state.activationClaimFencedCount += 1;
        loseActivationClaim('activation-claim-fenced');
        return false;
      }
    }
    const peerActivity = getPeerActivitySnapshot();
    if (!peerActivity.idle) {
      state.activationClaimFencedCount += 1;
      state.activationRequested = false;
      state.controllerChangePending = false;
      releaseActivationLease('activation-peer-busy-release', expectedGeneration);
      state.lastReason = `peer-busy-after-claim:${peerActivity.busyCount}`;
      if (getWaitingWorker()) scheduleCheck(state.lastOptions?.pollMs || DEFAULT_POLL_MS, state.lastOptions || {});
      return false;
    }
    state.controllerChangePending = true;
    state.controllerBeforeActivation = global.navigator?.serviceWorker?.controller || null;
    state.activationClaimCount += 1;
    try {
      waiting.postMessage({
        type: 'SKIP_WAITING',
        reason,
        requestedAt: state.lastActivationAt,
        leaseOwner: TAB_ID,
        leaseGeneration: expectedGeneration
      });
      scheduleActivationWatchdog(expectedGeneration);
      return true;
    } catch (error) {
      state.activationRequested = false;
      state.controllerChangePending = false;
      state.controllerBeforeActivation = null;
      clearActivationWatchdog();
      releaseActivationLease('activation-error-release', expectedGeneration);
      state.lastReason = `activation-error:${error?.message || error}`;
      return false;
    }
  }

  function requestActivation(reason = 'stable-idle') {
    const waiting = getWaitingWorker();
    if (!waiting || state.activationRequested || state.controllerChangePending) return false;
    const peerActivity = getPeerActivitySnapshot();
    if (!peerActivity.idle) {
      state.lastReason = `peer-busy:${peerActivity.busyCount}`;
      return false;
    }
    const lease = acquireActivationLease();
    if (!lease) {
      state.lastReason = 'activation-owned-by-peer';
      return false;
    }
    state.activationRequested = true;
    state.controllerChangePending = false;
    state.lastActivationAt = Date.now();
    state.lastReason = `activation-claim:${reason}`;
    if (typeof global.setTimeout === 'function' && state.activationLeasePersistent) {
      state.activationClaimTimer = global.setTimeout(
        () => finalizeActivationClaim(lease.generation, waiting, reason),
        ACTIVATION_CLAIM_SETTLE_MS
      ) || 0;
      return true;
    }
    return finalizeActivationClaim(lease.generation, waiting, reason);
  }

  function scheduleCheck(delay = DEFAULT_POLL_MS, options = {}) {
    clearTimer();
    state.timer = global.setTimeout(() => checkWaitingWorker(options), Math.max(50, Number(delay || DEFAULT_POLL_MS)));
  }

  function checkWaitingWorker(options = {}) {
    state.timer = 0;
    state.checks += 1;
    state.lastCheckAt = Date.now();
    publishActivity(true);
    const waiting = getWaitingWorker();
    if (!waiting) {
      state.idleSince = 0;
      state.activationRequested = false;
      state.lastReason = 'no-waiting-worker';
      return getSnapshot();
    }
    state.waiting = waiting;
    if (state.controllerChangePending || state.activationRequested) return getSnapshot();
    const activity = getActivitySnapshot();
    const peerActivity = getPeerActivitySnapshot();
    if (!activity.idle || !peerActivity.idle) {
      state.idleSince = 0;
      state.lastReason = !activity.idle ? `busy:${activity.reasons.join(',')}` : `peer-busy:${peerActivity.busyCount}`;
      scheduleCheck(options.pollMs, options);
      return getSnapshot();
    }
    if (!state.idleSince) state.idleSince = Date.now();
    const stableIdleMs = Math.max(250, Number(options.stableIdleMs || DEFAULT_STABLE_IDLE_MS));
    const idleFor = Date.now() - state.idleSince;
    state.lastReason = `idle:${idleFor}`;
    if (idleFor >= stableIdleMs) {
      const requested = requestActivation('stable-idle-all-tabs');
      if (!requested && getWaitingWorker()) scheduleCheck(options.pollMs || DEFAULT_POLL_MS, options);
    } else scheduleCheck(Math.min(Number(options.pollMs || DEFAULT_POLL_MS), stableIdleMs - idleFor), options);
    return getSnapshot();
  }

  function observeInstalling(registration, options) {
    const worker = registration?.installing;
    if (!worker || worker.__foxbearUpdateObserved) return;
    worker.__foxbearUpdateObserved = true;
    worker.addEventListener('statechange', () => {
      if (worker.state !== 'installed') return;
      if (!global.navigator?.serviceWorker?.controller) {
        state.waiting = null;
        state.lastReason = 'initial-install';
        return;
      }
      state.waiting = registration.waiting || worker;
      state.activationRequested = false;
      state.controllerChangePending = false;
      state.idleSince = 0;
      scheduleCheck(0, options);
    });
  }

  function coordinate(registration, options = {}) {
    if (!registration) return getSnapshot();
    state.lastOptions = options || {};
    state.registration = registration;
    if (!state.activationRequested && !state.controllerChangePending) state.lastController = global.navigator?.serviceWorker?.controller || state.lastController;
    registrationOptions.set(registration, options || {});
    state.waiting = global.navigator?.serviceWorker?.controller ? (registration.waiting || null) : null;
    if (!observedRegistrations.has(registration)) {
      observedRegistrations.add(registration);
      observedRegistrationCount += 1;
      registration.addEventListener?.('updatefound', () => observeInstalling(registration, registrationOptions.get(registration) || {}));
    }
    observeInstalling(registration, registrationOptions.get(registration) || {});
    if (activitySuspended) resumeActivityChannel('coordinate');
    else publishActivity(true);
    if (state.waiting) scheduleCheck(0, options);
    return getSnapshot();
  }

  function handleControllerChange(source = 'event') {
    const currentController = global.navigator?.serviceWorker?.controller || null;
    const changed = currentController !== state.lastController;
    if (!changed && !state.activationRequested && !state.controllerChangePending) {
      state.activationControllerChangeDedupCount += 1;
      return false;
    }
    const expectedGeneration = state.activationLeaseGeneration;
    clearActivationClaimTimer();
    clearActivationWatchdog();
    releaseActivationLease('controller-change-release', expectedGeneration);
    state.waiting = null;
    state.activationRequested = false;
    state.controllerChangePending = false;
    state.controllerBeforeActivation = null;
    state.idleSince = 0;
    state.lastController = currentController;
    state.lastReason = source === 'resume' ? 'controller-changed-during-bfcache' : 'controller-changed';
    clearTimer();
    return true;
  }

  function reconcileControllerAfterResume() {
    const currentController = global.navigator?.serviceWorker?.controller || null;
    const changedSinceActivation = Boolean(
      (state.activationRequested || state.controllerChangePending)
      && currentController
      && currentController !== state.controllerBeforeActivation
    );
    const changedSinceLastSeen = currentController !== state.lastController;
    if (!changedSinceActivation && !changedSinceLastSeen) return false;
    state.activationResumeReconcileCount += 1;
    return handleControllerChange('resume');
  }

  function getSnapshot() {
    return Object.freeze({
      version: VERSION,
      tabId: TAB_ID,
      waiting: Boolean(getWaitingWorker()),
      idleSince: state.idleSince,
      activationRequested: state.activationRequested,
      controllerChangePending: state.controllerChangePending,
      lastCheckAt: state.lastCheckAt,
      lastActivationAt: state.lastActivationAt,
      lastReason: state.lastReason,
      checks: state.checks,
      activitySuspended,
      heartbeatActive: Boolean(state.heartbeatTimer),
      activationWatchdogActive: Boolean(state.activationTimer),
      activationClaimPending: Boolean(state.activationClaimTimer),
      activationLeaseOwned: state.activationLeaseToken === TAB_ID,
      activationLeaseGeneration: state.activationLeaseGeneration,
      activationLeasePersistent: state.activationLeasePersistent,
      activationLeaseExpiresAt: state.activationLeaseExpiresAt,
      activationLeaseAcquireCount: state.activationLeaseAcquireCount,
      activationLeaseBusyCount: state.activationLeaseBusyCount,
      activationLeaseReleaseCount: state.activationLeaseReleaseCount,
      activationTimeoutCount: state.activationTimeoutCount,
      activationLeaseLostCount: state.activationLeaseLostCount,
      activationClaimCount: state.activationClaimCount,
      activationClaimFencedCount: state.activationClaimFencedCount,
      activationResumeReconcileCount: state.activationResumeReconcileCount,
      activationControllerChangeDedupCount: state.activationControllerChangeDedupCount,
      clientShellAnnouncementCount: state.clientShellAnnouncementCount,
      clientShellQueryCount: state.clientShellQueryCount,
      clientShellInactiveCount: state.clientShellInactiveCount,
      lastClientShellAnnouncementAt: state.lastClientShellAnnouncementAt,
      channelActive: Boolean(channel),
      observedRegistrationCount,
      activityPauseCount: state.activityPauseCount,
      activityResumeCount: state.activityResumeCount,
      activity: getActivitySnapshot(),
      peerActivity: getPeerActivitySnapshot()
    });
  }

  initializePeerChannel();
  global.navigator?.serviceWorker?.addEventListener?.('message', handleServiceWorkerMessage);
  global.navigator?.serviceWorker?.addEventListener?.('controllerchange', () => {
    handleControllerChange('event');
    postClientShellState('', 'controllerchange', true);
  });
  global.addEventListener?.('online', () => { publishActivity(true); postClientShellState('', 'online', true); if (state.waiting) scheduleCheck(0); });
  global.addEventListener?.('pagehide', event => {
    postClientShellState('', event?.persisted ? 'bfcache-pagehide' : 'pagehide', event?.persisted === true);
    pauseActivityChannel(event?.persisted ? 'bfcache-pagehide' : 'pagehide');
  });
  global.addEventListener?.('pageshow', event => {
    if (event?.persisted || activitySuspended) resumeActivityChannel(event?.persisted ? 'bfcache-pageshow' : 'pageshow');
    reconcileControllerAfterResume();
    postClientShellState('', event?.persisted ? 'bfcache-pageshow' : 'pageshow', true);
    if (state.waiting) scheduleCheck(0);
  });
  global.addEventListener?.('beforeunload', () => { postClientShellState('', 'beforeunload', false); pauseActivityChannel('beforeunload'); });
  global.document?.addEventListener?.('visibilitychange', () => {
    if (global.document?.visibilityState === 'visible' && activitySuspended) resumeActivityChannel('visibility');
    else publishActivity(true);
    postClientShellState('', 'visibilitychange', true);
    if (state.waiting) scheduleCheck(0);
  });

  if (typeof global.setTimeout === 'function') global.setTimeout(() => postClientShellState('', 'initial', true), 0);
  else postClientShellState('', 'initial', true);

  global.FoxBearServiceWorkerUpdateService = Object.freeze({
    version: VERSION,
    coordinate,
    check: checkWaitingWorker,
    requestActivation,
    publishActivity,
    pauseActivityChannel,
    resumeActivityChannel,
    postClientShellState,
    getActivitySnapshot,
    getPeerActivitySnapshot,
    getSnapshot
  });
})(window);
