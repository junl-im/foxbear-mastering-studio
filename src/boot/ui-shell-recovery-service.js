// FoxBear UI shell recovery v1.6.39 - partial script recovery and stale resource isolation
(function attachFoxBearUiShellRecoveryService(global) {
  'use strict';

  const VERSION = global.FoxBearBuildInfo?.assetVersion || '1.6.39-ui-shell-partial-script-probe-isolation';
  const REQUIRED_STYLES = Object.freeze([
    'assets/css/theme.css',
    'assets/css/layout.css',
    'assets/css/studio.css'
  ]);
  const REQUIRED_SCRIPTS = Object.freeze([
    'src/config/build-info.js',
    'src/boot/runtime-health.js',
    'src/boot/service-worker-update-service.js',
    'src/app.js'
  ]);
  const MAX_FAILURES = 12;
  const TRANSIENT_NOTICE_MS = 5000;
  const state = {
    checks: 0,
    recoveries: 0,
    resolvedRecoveries: 0,
    missingStyleRecoveries: 0,
    missingScriptRecoveries: 0,
    shellVisibilityRecoveries: 0,
    noticeSuppressedCount: 0,
    noticeDismissCount: 0,
    resourceFailures: [],
    lastReason: '',
    lastCheckAt: 0,
    recoveredAt: 0,
    resolvedAt: 0,
    stylesMissing: false,
    stylesPending: false,
    scriptsMissing: false,
    scriptsPending: false,
    active: false,
    noticeVisible: false,
    runtimePanelVisible: false,
    windowLoaded: false,
    dismissTimer: 0,
    lastSignature: ''
  };

  function normalizePath(raw) {
    return String(raw || '').replace(/[?#].*$/, '').replace(/^.*?:\/\/[^/]+\//, '').replace(/^\//, '').slice(-180);
  }

  function rememberFailure(target) {
    const path = normalizePath(target?.src || target?.href || target?.getAttribute?.('src') || target?.getAttribute?.('href'));
    if (!path || state.resourceFailures.includes(path)) return;
    state.resourceFailures.push(path);
    if (state.resourceFailures.length > MAX_FAILURES) state.resourceFailures.splice(0, state.resourceFailures.length - MAX_FAILURES);
  }

  function forgetFailure(target) {
    const path = normalizePath(target?.src || target?.href || target?.getAttribute?.('src') || target?.getAttribute?.('href'));
    if (!path) return;
    const index = state.resourceFailures.indexOf(path);
    if (index >= 0) state.resourceFailures.splice(index, 1);
  }

  function findStylesheet(fragment) {
    const links = Array.from(global.document?.querySelectorAll?.('link[rel="stylesheet"][href]') || []);
    return links.find(node => String(node.getAttribute?.('href') || node.href || '').includes(fragment)) || null;
  }

  function stylesheetState(fragment) {
    const link = findStylesheet(fragment);
    if (!link) return Object.freeze({ fragment, exists: false, loaded: false, failed: true, pending: false });
    const failed = link.dataset?.foxbearLoadError === 'true'
      || state.resourceFailures.some(path => path.includes(fragment));
    let loaded = false;
    try { loaded = Boolean(link.sheet); } catch (error) { loaded = true; }
    const pending = !loaded && !failed && !state.windowLoaded;
    return Object.freeze({ fragment, exists: true, loaded, failed, pending });
  }

  function getCoreStyleStatus() {
    const entries = REQUIRED_STYLES.map(stylesheetState);
    const pending = entries.filter(item => item.pending);
    const missing = entries.filter(item => !item.exists || item.failed || (!item.loaded && state.windowLoaded));
    return Object.freeze({ entries: Object.freeze(entries), pending: Object.freeze(pending), missing: Object.freeze(missing) });
  }

  function findScript(fragment) {
    const scripts = Array.from(global.document?.querySelectorAll?.('script[src]') || []);
    return scripts.find(node => String(node.getAttribute?.('src') || node.src || '').includes(fragment)) || null;
  }

  function scriptState(fragment) {
    const script = findScript(fragment);
    if (!script) return Object.freeze({ fragment, exists: false, loaded: false, failed: state.windowLoaded, pending: !state.windowLoaded });
    const failed = script.dataset?.foxbearLoadError === 'true'
      || state.resourceFailures.some(path => path.includes(fragment));
    const loaded = script.dataset?.foxbearLoadComplete === 'true'
      || script.readyState === 'complete'
      || script.readyState === 'loaded'
      || (state.windowLoaded && !failed);
    const pending = !loaded && !failed && !state.windowLoaded;
    return Object.freeze({ fragment, exists: true, loaded, failed, pending });
  }

  function getCriticalScriptStatus() {
    const entries = REQUIRED_SCRIPTS.map(scriptState);
    const pending = entries.filter(item => item.pending);
    const missing = entries.filter(item => !item.exists || item.failed || (!item.loaded && state.windowLoaded));
    return Object.freeze({ entries: Object.freeze(entries), pending: Object.freeze(pending), missing: Object.freeze(missing) });
  }

  function clearDismissTimer() {
    if (!state.dismissTimer) return;
    try { global.clearTimeout?.(state.dismissTimer); } catch (error) {}
    state.dismissTimer = 0;
  }

  function removeNotice(reason = 'resolved') {
    clearDismissTimer();
    const notice = global.document?.getElementById?.('foxbearUiShellRecoveryNotice');
    if (notice?.remove) notice.remove();
    else if (notice) notice.hidden = true;
    if (state.noticeVisible) state.noticeDismissCount += 1;
    state.noticeVisible = false;
    state.lastReason = reason || state.lastReason;
  }

  function runtimePanelIsVisible() {
    if (state.runtimePanelVisible) return true;
    const panel = global.document?.querySelector?.('.runtime-recovery-panel');
    return Boolean(panel && panel.hidden === false);
  }

  function ensureNotice(reason, options = {}) {
    const document = global.document;
    if (!document?.body || document.body.classList?.contains('security-message-page')) return null;
    if (runtimePanelIsVisible()) {
      state.noticeSuppressedCount += 1;
      removeNotice('runtime-panel-visible');
      return null;
    }
    let notice = document.getElementById('foxbearUiShellRecoveryNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'foxbearUiShellRecoveryNotice';
      notice.className = 'foxbear-ui-shell-recovery-notice';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      document.body.appendChild(notice);
    }
    notice.hidden = false;
    notice.textContent = reason === 'core-styles-missing'
      ? '화면 스타일 일부를 불러오지 못해 안전 UI로 복구했습니다. 아래 복구 도구에서 새로고침이나 캐시 초기화를 시도할 수 있습니다.'
      : reason === 'critical-scripts-missing'
        ? '화면은 표시되지만 핵심 기능 일부를 불러오지 못했습니다. 복구 도구에서 새로고침이나 캐시 초기화를 시도할 수 있습니다.'
        : '화면 표시 상태를 자동 복구했습니다.';
    state.noticeVisible = true;
    clearDismissTimer();
    if (options.transient && typeof global.setTimeout === 'function') {
      state.dismissTimer = global.setTimeout(() => removeNotice('transient-notice-dismissed'), TRANSIENT_NOTICE_MS) || 0;
    }
    return notice;
  }

  function isShellVisible(shell) {
    if (!shell || shell.hidden || shell.hasAttribute?.('inert')) return false;
    let style = null;
    try { style = global.getComputedStyle?.(shell) || null; } catch (error) {}
    if (style && (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) <= 0.01)) return false;
    try {
      const rect = shell.getBoundingClientRect?.();
      if (rect && rect.width <= 1 && rect.height <= 1) return false;
    } catch (error) {}
    return true;
  }

  function clearAccidentalShellHiding(shell) {
    if (!shell) return;
    shell.hidden = false;
    shell.removeAttribute?.('hidden');
    shell.removeAttribute?.('inert');
    if (shell.getAttribute?.('aria-hidden') === 'true') shell.setAttribute('aria-hidden', 'false');
    const style = shell.style;
    if (!style) return;
    if (style.display === 'none') style.removeProperty('display');
    if (style.visibility === 'hidden') style.removeProperty('visibility');
    if (Number(style.opacity || 1) <= 0.01) style.removeProperty('opacity');
  }

  function publish(reason) {
    const snapshot = getSnapshot();
    try { global.dispatchEvent?.(new CustomEvent('foxbear:ui-shell-recovery', { detail: { ...snapshot, reason } })); }
    catch (error) {}
    return snapshot;
  }

  function settleResolved(shell, reason) {
    const wasActive = state.active;
    state.active = false;
    state.stylesMissing = false;
    shell?.removeAttribute?.('data-ui-shell-recovered');
    global.document?.documentElement?.classList?.remove?.('foxbear-ui-shell-styles-missing', 'foxbear-ui-shell-recovery-active');
    global.document?.body?.classList?.remove?.('foxbear-ui-shell-recovery-active');
    if (wasActive) {
      state.resolvedRecoveries += 1;
      state.resolvedAt = Date.now();
    }
    if (!state.noticeVisible || state.lastReason !== 'shell-unhidden') removeNotice(reason || 'recovery-resolved');
  }

  function recover(reason = 'probe') {
    const document = global.document;
    state.checks += 1;
    state.lastCheckAt = Date.now();
    state.lastReason = reason;
    if (!document?.documentElement || !document.body) return false;
    if (document.body.classList?.contains('security-message-page')) return false;
    const shell = document.querySelector?.('.app-shell');
    if (!shell) return false;

    const wasVisible = isShellVisible(shell);
    clearAccidentalShellHiding(shell);
    const visible = isShellVisible(shell);
    const styleStatus = getCoreStyleStatus();
    const scriptStatus = getCriticalScriptStatus();
    const stylesMissing = styleStatus.missing.length > 0;
    const scriptsMissing = scriptStatus.missing.length > 0;
    state.stylesPending = styleStatus.pending.length > 0;
    state.stylesMissing = stylesMissing;
    state.scriptsPending = scriptStatus.pending.length > 0;
    state.scriptsMissing = scriptsMissing;

    document.documentElement.classList.toggle('foxbear-ui-shell-styles-missing', stylesMissing);
    document.documentElement.classList.toggle('foxbear-ui-shell-scripts-missing', scriptsMissing);
    document.documentElement.classList.toggle('foxbear-ui-shell-recovery-active', !visible);
    document.body.classList?.toggle('foxbear-ui-shell-recovery-active', !visible);

    const shellWasRecovered = !wasVisible && visible;
    const degraded = stylesMissing || scriptsMissing || !visible;
    const signature = `${stylesMissing ? 'styles' : ''}:${scriptsMissing ? 'scripts' : ''}:${!visible ? 'hidden' : ''}:${shellWasRecovered ? 'unhidden' : ''}`;
    if (stylesMissing) {
      shell.setAttribute('data-ui-shell-recovered', 'true');
      state.active = true;
      if (state.lastSignature !== signature) {
        state.recoveries += 1;
        state.missingStyleRecoveries += 1;
        state.recoveredAt = Date.now();
      }
      ensureNotice('core-styles-missing');
    } else if (scriptsMissing) {
      shell.setAttribute('data-ui-shell-recovered', 'true');
      state.active = true;
      if (state.lastSignature !== signature) {
        state.recoveries += 1;
        state.missingScriptRecoveries += 1;
        state.recoveredAt = Date.now();
      }
      ensureNotice('critical-scripts-missing');
    } else if (!visible) {
      shell.setAttribute('data-ui-shell-recovered', 'true');
      state.active = true;
      if (state.lastSignature !== signature) {
        state.recoveries += 1;
        state.shellVisibilityRecoveries += 1;
        state.recoveredAt = Date.now();
      }
      ensureNotice(reason);
    } else if (shellWasRecovered) {
      state.active = false;
      shell.setAttribute('data-ui-shell-recovered', 'true');
      if (state.lastSignature !== signature) {
        state.recoveries += 1;
        state.shellVisibilityRecoveries += 1;
        state.recoveredAt = Date.now();
      }
      ensureNotice('shell-unhidden', { transient: true });
    } else if (!degraded) {
      settleResolved(shell, 'recovery-resolved');
    }

    state.lastSignature = signature;
    publish(reason);
    return stylesMissing || scriptsMissing || shellWasRecovered || !visible;
  }

  function schedule(reason, delay) {
    if (typeof global.setTimeout !== 'function') return 0;
    return global.setTimeout(() => recover(reason), delay) || 0;
  }

  function setRuntimePanelVisible(visible) {
    state.runtimePanelVisible = visible === true;
    if (state.runtimePanelVisible) {
      if (state.noticeVisible) state.noticeSuppressedCount += 1;
      removeNotice('runtime-panel-visible');
    }
    else if (state.active) ensureNotice(state.stylesMissing ? 'core-styles-missing' : (state.scriptsMissing ? 'critical-scripts-missing' : state.lastReason));
    publish('runtime-panel-visibility');
    return state.runtimePanelVisible;
  }

  global.addEventListener?.('error', event => {
    const target = event?.target;
    const tagName = String(target?.tagName || '').toUpperCase();
    if (tagName !== 'LINK' && tagName !== 'SCRIPT') return;
    if (target?.dataset) target.dataset.foxbearLoadError = 'true';
    rememberFailure(target);
    schedule(`resource-error:${tagName.toLowerCase()}`, 0);
  }, true);

  global.addEventListener?.('load', event => {
    const target = event?.target;
    const tagName = String(target?.tagName || '').toUpperCase();
    if (target === global) {
      state.windowLoaded = true;
      recover('window-load');
      return;
    }
    if (tagName !== 'LINK' && tagName !== 'SCRIPT') return;
    if (target?.dataset) {
      delete target.dataset.foxbearLoadError;
      target.dataset.foxbearLoadComplete = 'true';
    }
    forgetFailure(target);
    schedule(tagName === 'LINK' ? 'stylesheet-loaded' : 'script-loaded', 0);
  }, true);

  global.addEventListener?.('foxbear:runtime-recovery-panel', event => {
    setRuntimePanelVisible(event?.detail?.visible === true);
  });

  global.document?.addEventListener?.('DOMContentLoaded', () => {
    recover('dom-content-loaded');
    schedule('post-dom-probe', 600);
    schedule('late-style-probe', 2200);
  }, { once: true });
  global.addEventListener?.('pageshow', () => schedule('pageshow', 0));

  function getSnapshot() {
    return Object.freeze({
      version: VERSION,
      checks: state.checks,
      recoveries: state.recoveries,
      resolvedRecoveries: state.resolvedRecoveries,
      missingStyleRecoveries: state.missingStyleRecoveries,
      missingScriptRecoveries: state.missingScriptRecoveries,
      shellVisibilityRecoveries: state.shellVisibilityRecoveries,
      noticeSuppressedCount: state.noticeSuppressedCount,
      noticeDismissCount: state.noticeDismissCount,
      resourceFailureCount: state.resourceFailures.length,
      resourceFailures: state.resourceFailures.slice(),
      lastReason: state.lastReason,
      lastCheckAt: state.lastCheckAt,
      recoveredAt: state.recoveredAt,
      resolvedAt: state.resolvedAt,
      stylesMissing: state.stylesMissing,
      stylesPending: state.stylesPending,
      scriptsMissing: state.scriptsMissing,
      scriptsPending: state.scriptsPending,
      active: state.active,
      noticeVisible: state.noticeVisible,
      runtimePanelVisible: state.runtimePanelVisible,
      windowLoaded: state.windowLoaded
    });
  }

  global.FoxBearUiShellRecoveryService = Object.freeze({ version: VERSION, recover, setRuntimePanelVisible, getSnapshot });
})(window);
