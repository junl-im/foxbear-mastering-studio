// FoxBear service worker update coordinator v1.5.30
(function attachFoxBearServiceWorkerUpdateService(global) {
  'use strict';

  const VERSION = '1.5.30-inapp-playback-recovery';
  const DEFAULT_POLL_MS = 500;
  const DEFAULT_STABLE_IDLE_MS = 1800;
  const state = {
    registration: null,
    waiting: null,
    timer: 0,
    idleSince: 0,
    activationRequested: false,
    controllerChangePending: false,
    lastCheckAt: 0,
    lastActivationAt: 0,
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
    const audios = Array.from(global.document?.querySelectorAll?.('audio') || []);
    const playing = audios.filter(audio => audio && !audio.paused && !audio.ended).length;
    const active = {
      analysis: Number(importQueue.active || 0) + Number(importQueue.pending || 0),
      mastering: Number(mastering.active || 0) + (mastering.busy ? 1 : 0),
      decoding: Number(decode.activeDecodes || 0),
      rendering: render.pending || render.inRender ? 1 : 0,
      playback: playing
    };
    const reasons = Object.entries(active).filter(([, value]) => Number(value) > 0).map(([key]) => key);
    return Object.freeze({ ...active, idle: reasons.length === 0, reasons: Object.freeze(reasons) });
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
    if (!activity.idle) {
      state.idleSince = 0;
      state.lastReason = `busy:${activity.reasons.join(',')}`;
      scheduleCheck(options.pollMs, options);
      return getSnapshot();
    }
    if (!state.idleSince) state.idleSince = Date.now();
    const stableIdleMs = Math.max(250, Number(options.stableIdleMs || DEFAULT_STABLE_IDLE_MS));
    const idleFor = Date.now() - state.idleSince;
    state.lastReason = `idle:${idleFor}`;
    if (idleFor >= stableIdleMs) requestActivation('stable-idle');
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
      waiting: Boolean(getWaitingWorker()),
      idleSince: state.idleSince,
      activationRequested: state.activationRequested,
      controllerChangePending: state.controllerChangePending,
      lastCheckAt: state.lastCheckAt,
      lastActivationAt: state.lastActivationAt,
      lastReason: state.lastReason,
      checks: state.checks,
      activity: getActivitySnapshot()
    });
  }

  global.navigator?.serviceWorker?.addEventListener?.('controllerchange', handleControllerChange);
  global.addEventListener?.('online', () => state.waiting && scheduleCheck(0));
  global.document?.addEventListener?.('visibilitychange', () => state.waiting && scheduleCheck(0));

  global.FoxBearServiceWorkerUpdateService = Object.freeze({
    version: VERSION,
    coordinate,
    check: checkWaitingWorker,
    requestActivation,
    getActivitySnapshot,
    getSnapshot
  });
})(window);
