// FoxBear service worker update coordinator v1.5.81 - stable-idle and cross-tab activity guard
(function attachFoxBearServiceWorkerUpdateService(global) {
  'use strict';

  const VERSION = '1.5.81-master-preview-cancellation-native-result-isolation';
  const DEFAULT_POLL_MS = 500;
  const DEFAULT_STABLE_IDLE_MS = 1800;
  const PEER_TTL_MS = 5000;
  const HEARTBEAT_MS = 1500;
  const CHANNEL_NAME = 'foxbear-sw-activity-v1';
  const STORAGE_PREFIX = 'foxbear-sw-activity:';
  const TAB_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const peers = new Map();
  let channel = null;
  const state = {
    registration: null,
    waiting: null,
    timer: 0,
    heartbeatTimer: 0,
    idleSince: 0,
    activationRequested: false,
    controllerChangePending: false,
    lastCheckAt: 0,
    lastActivationAt: 0,
    lastHeartbeatAt: 0,
    lastReason: 'idle',
    checks: 0
  };

  function safeCall(fn, fallback = null) {
    try { return typeof fn === 'function' ? fn() : fallback; }
    catch (error) { return fallback; }
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
    } catch (error) {}
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
    try { channel?.postMessage?.(payload); } catch (error) {}
    try { global.localStorage?.setItem?.(peerStorageKey(), JSON.stringify(payload)); } catch (error) {}
  }

  function closeActivityChannel() {
    const payload = { type: 'FOXBEAR_TAB_ACTIVITY', tabId: TAB_ID, updatedAt: Date.now(), closed: true };
    try { channel?.postMessage?.(payload); } catch (error) {}
    try { global.localStorage?.removeItem?.(peerStorageKey()); } catch (error) {}
  }

  function initializePeerChannel() {
    try {
      if (typeof global.BroadcastChannel === 'function') {
        channel = new global.BroadcastChannel(CHANNEL_NAME);
        channel.addEventListener('message', event => rememberPeer(event.data));
      }
    } catch (error) { channel = null; }
    global.addEventListener?.('storage', event => {
      if (!event.key?.startsWith?.(STORAGE_PREFIX) || !event.newValue) return;
      try { rememberPeer(JSON.parse(event.newValue)); } catch (error) {}
    });
    state.heartbeatTimer = global.setInterval(() => publishActivity(), HEARTBEAT_MS);
    publishActivity(true);
  }

  function clearTimer() {
    if (!state.timer) return;
    global.clearTimeout(state.timer);
    state.timer = 0;
  }

  function getWaitingWorker(registration = state.registration) {
    return registration?.waiting || state.waiting || null;
  }

  function requestActivation(reason = 'stable-idle') {
    const waiting = getWaitingWorker();
    if (!waiting || state.activationRequested || state.controllerChangePending) return false;
    const peerActivity = getPeerActivitySnapshot();
    if (!peerActivity.idle) {
      state.lastReason = `peer-busy:${peerActivity.busyCount}`;
      return false;
    }
    state.activationRequested = true;
    state.controllerChangePending = true;
    state.lastActivationAt = Date.now();
    state.lastReason = reason;
    try {
      waiting.postMessage({ type: 'SKIP_WAITING', reason, requestedAt: state.lastActivationAt });
      return true;
    } catch (error) {
      state.activationRequested = false;
      state.controllerChangePending = false;
      state.lastReason = `activation-error:${error?.message || error}`;
      return false;
    }
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
    if (idleFor >= stableIdleMs) requestActivation('stable-idle-all-tabs');
    else scheduleCheck(Math.min(Number(options.pollMs || DEFAULT_POLL_MS), stableIdleMs - idleFor), options);
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
    state.registration = registration;
    state.waiting = global.navigator?.serviceWorker?.controller ? (registration.waiting || null) : null;
    registration.addEventListener?.('updatefound', () => observeInstalling(registration, options));
    observeInstalling(registration, options);
    publishActivity(true);
    if (state.waiting) scheduleCheck(0, options);
    return getSnapshot();
  }

  function handleControllerChange() {
    state.waiting = null;
    state.activationRequested = false;
    state.controllerChangePending = false;
    state.idleSince = 0;
    state.lastReason = 'controller-changed';
    clearTimer();
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
      activity: getActivitySnapshot(),
      peerActivity: getPeerActivitySnapshot()
    });
  }

  initializePeerChannel();
  global.navigator?.serviceWorker?.addEventListener?.('controllerchange', handleControllerChange);
  global.addEventListener?.('online', () => { publishActivity(true); if (state.waiting) scheduleCheck(0); });
  global.addEventListener?.('pagehide', closeActivityChannel);
  global.addEventListener?.('beforeunload', closeActivityChannel);
  global.document?.addEventListener?.('visibilitychange', () => { publishActivity(true); if (state.waiting) scheduleCheck(0); });

  global.FoxBearServiceWorkerUpdateService = Object.freeze({
    version: VERSION,
    coordinate,
    check: checkWaitingWorker,
    requestActivation,
    publishActivity,
    getActivitySnapshot,
    getPeerActivitySnapshot,
    getSnapshot
  });
})(window);
