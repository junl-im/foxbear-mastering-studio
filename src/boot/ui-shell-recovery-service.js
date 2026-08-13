// FoxBear UI shell recovery v1.6.94 - replacement-aware resource retry settlement
(function attachFoxBearUiShellRecoveryService(global) {
  'use strict';

  const VERSION = global.FoxBearBuildInfo?.assetVersion || '1.6.94-release-integrity-hardening';
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
  const RESOURCE_RETRY_GRACE_MS = 2500;
  const initialResourceNodes = new WeakSet(Array.from(global.document?.querySelectorAll?.('link[href],script[src]') || []));
  const retryFirstSeenAt = new WeakMap();
  const retryDeadlineScheduled = new WeakSet();
  const state = {
    checks: 0,
    recoveries: 0,
    resolvedRecoveries: 0,
    missingStyleRecoveries: 0,
    missingScriptRecoveries: 0,
    shellVisibilityRecoveries: 0,
    replacementObservationCount: 0,
    noticeSuppressedCount: 0,
    noticeDismissCount: 0,
    resourceFailures: [],
    lastReason: '',
    lastCheckAt: 0,
    recoveredAt: 0,
    resolvedAt: 0,
    stylesMissing: false,
    stylesPending: false,
    stylesRetrying: false,
    scriptsMissing: false,
    scriptsPending: false,
    scriptsRetrying: false,
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

  function findStylesheets(fragment) {
    const links = Array.from(global.document?.querySelectorAll?.('link[rel="stylesheet"][href]') || []);
    return links.filter(node => String(node.getAttribute?.('href') || node.href || '').includes(fragment));
  }

  function scheduleRetryDeadline(node, label) {
    if (!node || initialResourceNodes.has(node) || retryDeadlineScheduled.has(node)) return;
    retryDeadlineScheduled.add(node);
    if (!retryFirstSeenAt.has(node)) retryFirstSeenAt.set(node, Date.now());
    if (typeof global.setTimeout === 'function') {
      global.setTimeout(() => recover(`resource-retry-timeout:${label}`), RESOURCE_RETRY_GRACE_MS + 25);
    }
  }

  function retryPending(node, label) {
    if (!node || initialResourceNodes.has(node)) return false;
    scheduleRetryDeadline(node, label);
    const firstSeenAt = Number(retryFirstSeenAt.get(node) || Date.now());
    return Date.now() - firstSeenAt < RESOURCE_RETRY_GRACE_MS;
  }

  function trackedResourceLabel(node) {
    const tagName = String(node?.tagName || '').toUpperCase();
    const source = String(node?.getAttribute?.(tagName === 'LINK' ? 'href' : 'src') || node?.href || node?.src || '');
    if (tagName === 'LINK') return REQUIRED_STYLES.find(fragment => source.includes(fragment)) || '';
    if (tagName === 'SCRIPT') return REQUIRED_SCRIPTS.find(fragment => source.includes(fragment)) || '';
    return '';
  }

  function observeResourceReplacements() {
    if (typeof global.MutationObserver !== 'function' || !global.document?.documentElement) return null;
    const observer = new global.MutationObserver(records => {
      let found = false;
      for (const record of records || []) {
        for (const addedNode of Array.from(record?.addedNodes || [])) {
          const nodes = [addedNode, ...Array.from(addedNode?.querySelectorAll?.('link[rel="stylesheet"][href],script[src]') || [])];
          for (const node of nodes) {
            const label = trackedResourceLabel(node);
            if (!label) continue;
            scheduleRetryDeadline(node, label);
            state.replacementObservationCount += 1;
            found = true;
          }
        }
      }
      if (found) schedule('resource-retry-inserted', 0);
    });
    try { observer.observe(global.document.documentElement, { childList: true, subtree: true }); }
    catch (error) { return null; }
    return observer;
  }

  function stylesheetCandidateState(link, fragment) {
    const failed = link?.dataset?.foxbearLoadError === 'true';
    let loaded = false;
    try { loaded = !failed && Boolean(link.sheet); } catch (error) { loaded = !failed; }
    const pending = !loaded && !failed && (!state.windowLoaded || retryPending(link, fragment));
    return Object.freeze({ loaded, failed: failed || (!loaded && !pending && state.windowLoaded), pending });
  }

  function stylesheetState(fragment) {
    const links = findStylesheets(fragment);
    if (!links.length) return Object.freeze({ fragment, exists: false, loaded: false, failed: true, pending: false, candidates: 0 });
    const candidates = links.map(link => stylesheetCandidateState(link, fragment));
    const loaded = candidates.some(item => item.loaded);
    const pending = !loaded && candidates.some(item => item.pending);
    const failed = !loaded && !pending && candidates.some(item => item.failed);
    const retrying = !loaded && pending && candidates.some(item => item.failed);
    return Object.freeze({ fragment, exists: true, loaded, failed, pending, retrying, candidates: candidates.length });
  }

  function getCoreStyleStatus() {
    const entries = REQUIRED_STYLES.map(stylesheetState);
    const pending = entries.filter(item => item.pending);
    const missing = entries.filter(item => !item.exists || item.failed);
    const retrying = entries.filter(item => item.retrying);
    return Object.freeze({ entries: Object.freeze(entries), pending: Object.freeze(pending), missing: Object.freeze(missing), retrying: Object.freeze(retrying) });
  }

  function findScripts(fragment) {
    const scripts = Array.from(global.document?.querySelectorAll?.('script[src]') || []);
    return scripts.filter(node => String(node.getAttribute?.('src') || node.src || '').includes(fragment));
  }

  function scriptCandidateState(script, fragment) {
    const failed = script?.dataset?.foxbearLoadError === 'true';
    const loaded = !failed && (
      script.dataset?.foxbearLoadComplete === 'true'
      || script.readyState === 'complete'
      || script.readyState === 'loaded'
      || (state.windowLoaded && initialResourceNodes.has(script))
    );
    const pending = !loaded && !failed && (!state.windowLoaded || retryPending(script, fragment));
    return Object.freeze({ loaded, failed: failed || (!loaded && !pending && state.windowLoaded), pending });
  }

  function scriptState(fragment) {
    const scripts = findScripts(fragment);
    if (!scripts.length) return Object.freeze({ fragment, exists: false, loaded: false, failed: state.windowLoaded, pending: !state.windowLoaded, candidates: 0 });
    const candidates = scripts.map(script => scriptCandidateState(script, fragment));
    const loaded = candidates.some(item => item.loaded);
    const pending = !loaded && candidates.some(item => item.pending);
    const failed = !loaded && !pending && candidates.some(item => item.failed);
    const retrying = !loaded && pending && candidates.some(item => item.failed);
    return Object.freeze({ fragment, exists: true, loaded, failed, pending, retrying, candidates: candidates.length });
  }

  function getCriticalScriptStatus() {
    const entries = REQUIRED_SCRIPTS.map(scriptState);
    const pending = entries.filter(item => item.pending);
    const missing = entries.filter(item => !item.exists || item.failed);
    const retrying = entries.filter(item => item.retrying);
    return Object.freeze({ entries: Object.freeze(entries), pending: Object.freeze(pending), missing: Object.freeze(missing), retrying: Object.freeze(retrying) });
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
        : reason === 'resource-retry-pending'
          ? '핵심 화면 리소스 복구를 다시 시도하고 있습니다. 완료될 때까지 현재 화면을 유지합니다.'
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
    state.stylesRetrying = false;
    state.scriptsMissing = false;
    state.scriptsRetrying = false;
    shell?.removeAttribute?.('data-ui-shell-recovered');
    global.document?.documentElement?.classList?.remove?.('foxbear-ui-shell-styles-missing', 'foxbear-ui-shell-scripts-missing', 'foxbear-ui-shell-recovery-active');
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
    const stylesRetrying = styleStatus.retrying.length > 0;
    const scriptsRetrying = scriptStatus.retrying.length > 0;
    state.stylesPending = styleStatus.pending.length > 0;
    state.stylesMissing = stylesMissing;
    state.stylesRetrying = stylesRetrying;
    state.scriptsPending = scriptStatus.pending.length > 0;
    state.scriptsMissing = scriptsMissing;
    state.scriptsRetrying = scriptsRetrying;

    document.documentElement.classList.toggle('foxbear-ui-shell-styles-missing', stylesMissing);
    document.documentElement.classList.toggle('foxbear-ui-shell-scripts-missing', scriptsMissing);
    document.documentElement.classList.toggle('foxbear-ui-shell-resource-retry-pending', stylesRetrying || scriptsRetrying);
    document.documentElement.classList.toggle('foxbear-ui-shell-recovery-active', !visible);
    document.body.classList?.toggle('foxbear-ui-shell-recovery-active', !visible);

    const shellWasRecovered = !wasVisible && visible;
    const degraded = stylesMissing || scriptsMissing || stylesRetrying || scriptsRetrying || !visible;
    const signature = `${stylesMissing ? 'styles' : ''}:${scriptsMissing ? 'scripts' : ''}:${stylesRetrying || scriptsRetrying ? 'retrying' : ''}:${!visible ? 'hidden' : ''}:${shellWasRecovered ? 'unhidden' : ''}`;
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
    } else if (stylesRetrying || scriptsRetrying) {
      shell.setAttribute('data-ui-shell-recovered', 'true');
      state.active = true;
      ensureNotice('resource-retry-pending');
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
    return stylesMissing || scriptsMissing || stylesRetrying || scriptsRetrying || shellWasRecovered || !visible;
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
    else if (state.active) ensureNotice(state.stylesMissing ? 'core-styles-missing' : (state.scriptsMissing ? 'critical-scripts-missing' : (state.stylesRetrying || state.scriptsRetrying ? 'resource-retry-pending' : state.lastReason)));
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
  observeResourceReplacements();

  function getSnapshot() {
    return Object.freeze({
      version: VERSION,
      checks: state.checks,
      recoveries: state.recoveries,
      resolvedRecoveries: state.resolvedRecoveries,
      missingStyleRecoveries: state.missingStyleRecoveries,
      missingScriptRecoveries: state.missingScriptRecoveries,
      shellVisibilityRecoveries: state.shellVisibilityRecoveries,
      replacementObservationCount: state.replacementObservationCount,
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
      stylesRetrying: state.stylesRetrying,
      scriptsMissing: state.scriptsMissing,
      scriptsPending: state.scriptsPending,
      scriptsRetrying: state.scriptsRetrying,
      active: state.active,
      noticeVisible: state.noticeVisible,
      runtimePanelVisible: state.runtimePanelVisible,
      windowLoaded: state.windowLoaded
    });
  }

  global.FoxBearUiShellRecoveryService = Object.freeze({ version: VERSION, recover, setRuntimePanelVisible, getSnapshot });
})(window);
