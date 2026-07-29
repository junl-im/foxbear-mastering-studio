// FoxBear UI shell recovery v1.6.37 - cross-generation asset failure and hidden-shell fallback
(function attachFoxBearUiShellRecoveryService(global) {
  'use strict';

  const VERSION = global.FoxBearBuildInfo?.assetVersion || '1.6.37-ui-shell-cross-generation-recovery';
  const REQUIRED_STYLES = [
    'assets/css/theme.css',
    'assets/css/layout.css',
    'assets/css/studio.css'
  ];
  const MAX_FAILURES = 12;
  const state = {
    checks: 0,
    recoveries: 0,
    missingStyleRecoveries: 0,
    resourceFailures: [],
    lastReason: '',
    lastCheckAt: 0,
    recoveredAt: 0,
    stylesMissing: false
  };

  function rememberFailure(target) {
    const url = String(target?.src || target?.href || '');
    if (!url || state.resourceFailures.includes(url)) return;
    state.resourceFailures.push(url.replace(/[?#].*$/, '').slice(-180));
    if (state.resourceFailures.length > MAX_FAILURES) state.resourceFailures.splice(0, state.resourceFailures.length - MAX_FAILURES);
  }

  function stylesheetLoaded(fragment) {
    const links = Array.from(global.document?.querySelectorAll?.('link[rel="stylesheet"][href]') || []);
    const link = links.find(node => String(node.getAttribute('href') || '').includes(fragment));
    if (!link) return false;
    try { return Boolean(link.sheet); } catch (error) { return true; }
  }

  function detectMissingCoreStyles() {
    return REQUIRED_STYLES.some(fragment => !stylesheetLoaded(fragment));
  }

  function ensureNotice(reason) {
    const document = global.document;
    if (!document?.body || document.body.classList?.contains('security-message-page')) return null;
    let notice = document.getElementById('foxbearUiShellRecoveryNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'foxbearUiShellRecoveryNotice';
      notice.className = 'foxbear-ui-shell-recovery-notice';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      document.body.appendChild(notice);
    }
    notice.textContent = reason === 'core-styles-missing'
      ? '화면 스타일 일부를 불러오지 못해 안전 UI로 복구했습니다. 새로고침하면 최신 화면을 다시 시도합니다.'
      : '화면 표시 상태를 자동 복구했습니다.';
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

  function recover(reason = 'probe') {
    const document = global.document;
    state.checks += 1;
    state.lastCheckAt = Date.now();
    state.lastReason = reason;
    if (!document?.documentElement || !document.body) return false;
    if (document.body.classList?.contains('security-message-page')) return false;
    const shell = document.querySelector?.('.app-shell');
    if (!shell) return false;

    const stylesMissing = detectMissingCoreStyles();
    state.stylesMissing = stylesMissing;
    document.documentElement.classList.toggle('foxbear-ui-shell-styles-missing', stylesMissing);
    clearAccidentalShellHiding(shell);

    const visible = isShellVisible(shell);
    document.documentElement.classList.toggle('foxbear-ui-shell-recovery-active', !visible);
    document.body.classList?.toggle('foxbear-ui-shell-recovery-active', !visible);
    if (!visible || stylesMissing) {
      shell.setAttribute('data-ui-shell-recovered', 'true');
      state.recoveries += 1;
      if (stylesMissing) state.missingStyleRecoveries += 1;
      state.recoveredAt = Date.now();
      ensureNotice(stylesMissing ? 'core-styles-missing' : reason);
      return true;
    }
    return false;
  }

  function schedule(reason, delay) {
    if (typeof global.setTimeout !== 'function') return 0;
    return global.setTimeout(() => recover(reason), delay) || 0;
  }

  global.addEventListener?.('error', event => {
    const target = event?.target;
    const tagName = String(target?.tagName || '').toUpperCase();
    if (tagName !== 'LINK' && tagName !== 'SCRIPT') return;
    rememberFailure(target);
    schedule(`resource-error:${tagName.toLowerCase()}`, 0);
  }, true);

  global.document?.addEventListener?.('DOMContentLoaded', () => {
    recover('dom-content-loaded');
    schedule('post-dom-probe', 600);
    schedule('late-style-probe', 2200);
  }, { once: true });
  global.addEventListener?.('load', () => recover('window-load'), { once: true });
  global.addEventListener?.('pageshow', () => schedule('pageshow', 0));

  function getSnapshot() {
    return Object.freeze({
      version: VERSION,
      checks: state.checks,
      recoveries: state.recoveries,
      missingStyleRecoveries: state.missingStyleRecoveries,
      resourceFailureCount: state.resourceFailures.length,
      resourceFailures: state.resourceFailures.slice(),
      lastReason: state.lastReason,
      lastCheckAt: state.lastCheckAt,
      recoveredAt: state.recoveredAt,
      stylesMissing: state.stylesMissing
    });
  }

  global.FoxBearUiShellRecoveryService = Object.freeze({ version: VERSION, recover, getSnapshot });
})(window);
