// FoxBear AI Mastering Studio Pro v1.6.50 service worker · kakao-centered-entry-notice
'use strict';

const CACHE_NAME = 'foxbear-shell-v1.6.50-kakao-centered-entry-notice';
const CURRENT_ASSET_VERSION = '1.6.50-kakao-centered-entry-notice';
const LEGACY_CACHE_NAMES = ['foxbear-shell-v1.5.4-boot-sri-recovery', 'foxbear-shell-v1.5.5-update-safety', 'foxbear-shell-v1.5.6-export-progress-recovery', 'foxbear-shell-v1.6.30-overlay-history-release-exit-guard-safety', 'foxbear-shell-v1.6.31-overlay-history-transaction-coalescing', 'foxbear-shell-v1.6.32-overlay-history-generation-bfcache-recovery', 'foxbear-shell-v1.6.33-overlay-history-watchdog-recovery-full-audit', 'foxbear-shell-v1.6.34-history-hard-stall-sw-activity-lifecycle', 'foxbear-shell-v1.6.35-history-terminal-race-sw-activation-lease', 'foxbear-shell-v1.6.36-sw-activation-generation-fencing-resource-stress', 'foxbear-shell-v1.6.37-ui-shell-cross-generation-recovery', 'foxbear-shell-v1.6.38-ui-shell-runtime-health-cache-retirement', 'foxbear-shell-v1.6.39-ui-shell-partial-script-probe-isolation', 'foxbear-shell-v1.6.40-ui-shell-retry-replacement-settlement', 'foxbear-shell-v1.6.41-admin-secret-pin-session', 'foxbear-shell-v1.6.42-spark-google-admin-auth', 'foxbear-shell-v1.6.43-google-auth-trusted-types-csp-recovery', 'foxbear-shell-v1.6.44-google-auth-gapi-module-trusted-types-recovery', 'foxbear-shell-v1.6.45-windows-release-gate-spark-hosting-no-app-check', 'foxbear-shell-v1.6.46-google-auth-same-origin-network-recovery', 'foxbear-shell-v1.6.47-external-host-admin-auth-opaque-error-recovery', 'foxbear-shell-v1.6.48-post-master-download-format-quality', 'foxbear-shell-v1.6.49-download-variant-cache-reuse'];
const RETAINED_LEGACY_SHELL_COUNT = 2;
const CLIENT_SHELL_PROBE_TIMEOUT_MS = 400;
const CLIENT_SHELL_CLEANUP_COOLDOWN_MS = 2500;
const CLIENT_SHELL_REPORT_MAX_AGE_MS = 120000;
const CLIENT_SHELL_PROBE_RETRY_MS = 120;
const SHARE_DB = 'foxbear-mobile-native-share-v1';
const SHARE_STORE = 'sharedFiles';
const SHARE_QUERY = 'foxbearSharedAudio';
const CORE_ASSETS = [
  './',
  './index.html',
  './404.html',
  './foxbear-root.json',
  './external-browser.html',
  './assets/css/external-browser.css',
  './src/security/trusted-types-bootstrap.js',
  './src/boot/kakao-entry-guard.js',
  './src/boot/kakao-entry-notice.js',
  './assets/css/boot/kakao-entry-notice.css',
  './src/security/trusted-types-bootstrap.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/kakao-entry-guard.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/kakao-entry-notice.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/kakao-external-browser.js',
  './manifest.webmanifest',
  './sw.js',
  './src/workers/wav-encoder.worker.js',
  './src/workers/mp3-encoder.worker.js',
  './src/workers/analysis.worker.js',
  './src/workers/master-finalizer.worker.js',
  './src/workers/pitch-wsola.worker.js',
  './src/workers/zip-encoder.worker.js',
  './src/workers/wav-encoder.worker.js?v=1.6.50-kakao-centered-entry-notice',
  './src/workers/mp3-encoder.worker.js?v=1.6.50-kakao-centered-entry-notice',
  './src/workers/analysis.worker.js?v=1.6.50-kakao-centered-entry-notice',
  './src/workers/master-finalizer.worker.js?v=1.6.50-kakao-centered-entry-notice',
  './src/workers/pitch-wsola.worker.js?v=1.6.50-kakao-centered-entry-notice',
  './src/workers/zip-encoder.worker.js?v=1.6.50-kakao-centered-entry-notice',
  './src/engines/pitch-engine-adapter.js',
  './assets/icons/foxbear-icon-48.png',
  './assets/icons/foxbear-icon-72.png',
  './assets/icons/foxbear-icon-96.png',
  './assets/icons/foxbear-icon-128.png',
  './assets/icons/foxbear-icon-144.png',
  './assets/icons/foxbear-icon-152.png',
  './assets/icons/foxbear-icon-180.png',
  './assets/icons/foxbear-icon-192.png',
  './assets/icons/foxbear-icon-384.png',
  './assets/icons/foxbear-icon-512.png',
  './assets/icons/foxbear-icon-16.png?v=1.6.50-kakao-centered-entry-notice',
  './assets/icons/foxbear-icon-32.png?v=1.6.50-kakao-centered-entry-notice',
  './assets/icons/foxbear-icon-192.png?v=1.6.50-kakao-centered-entry-notice',
  './assets/icons/foxbear-icon-512.png?v=1.6.50-kakao-centered-entry-notice',
  './assets/icons/apple-touch-icon.png?v=1.6.50-kakao-centered-entry-notice',
  './manifest.webmanifest?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/boot/performance-diagnostics.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/boot/runtime-health.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/boot/ui-shell-recovery.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/boot/kakao-entry-notice.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/theme.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/layout.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/components/base-components.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/components/forms.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/components/cards.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/components/preview-system.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/components/playback-link.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/studio.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/components/admin-incident-monitor.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/dock.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/dock-waveform.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/waveform-compare.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/spectrum-visualizer.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/export.css?v=1.6.50-kakao-centered-entry-notice&h=export-progress-v156',
  './assets/css/download-dialog.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/bulk-import-hud.css?v=1.6.50-kakao-centered-entry-notice&h=bulk-hud-close-hotfix&ui=v153',
  './assets/css/mobile-native.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/dock-ui-repair.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/components/floating-overlays.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/header-command-bar.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/components/support-settings.css?v=1.6.50-kakao-centered-entry-notice',
  './assets/css/components/modal-close-system.css?v=1.6.50-kakao-centered-entry-notice',
  './vendor/jszip/jszip.min.js?v=1.6.50-kakao-centered-entry-notice&lib=3.10.1',
  './src/config/build-info.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/release-presentation-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/session-handoff-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-route-policy.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-submission-identity-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/firebase-bootstrap.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-support-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-state-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-mail-sync-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-lifecycle-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-recovery-sweep-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-service-recovery-controller.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-recovery-policy.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-local-queue-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-queue-coordination-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-service-diagnostics.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-diagnostics-view-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-controls-view-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/incident-reporter.js?v=1.6.50-kakao-centered-entry-notice',
  './src/config/mastering-presets.js?v=1.6.50-kakao-centered-entry-notice',
  './src/config/genre-presets.js?v=1.6.50-kakao-centered-entry-notice',
  './src/config/reference-targets.js?v=1.6.50-kakao-centered-entry-notice',
  './src/config/app-runtime-config.js?v=1.6.50-kakao-centered-entry-notice',
  './src/state/app-state.js?v=1.6.50-kakao-centered-entry-notice',
  './src/settings/settings-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/utils/core-utils.js?v=1.6.50-kakao-centered-entry-notice',
  './src/utils/worker-job-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/recommendation/recommendation-engine.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/mastering-inspector.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/highlight-compare-inspector.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/playback-link-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/playback-transition-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/audio-context-manager.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/preview-translation-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/audio-import-capability-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/audio-decode-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/inapp-mastering-safety-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/import-preflight-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/import-queue-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/analysis-cache-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/memory-guard-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/mastering-memory-diagnostics-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/reference-profile-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/loudness-measurement-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/mastering-input-guard-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/mastering-quality-audit-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/quality-gate-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/mastering-orchestrator-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/master-preview-job-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/state/track-lifecycle-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/audio/waveform-control-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/ui/waveform-control-view.js?v=1.6.50-kakao-centered-entry-notice',
  './src/ui/spectrum-visualizer.js?v=1.6.50-kakao-centered-entry-notice',
  './src/ui/modal-controller.js?v=1.6.50-kakao-centered-entry-notice',
  './src/ui/dock-controller.js?v=1.6.50-kakao-centered-entry-notice',
  './src/ui/mobile-native-view.js?v=1.6.50-kakao-centered-entry-notice&h=bulk-hud-restore-v153',
  './src/ui/admin-access-controller.js?v=1.6.50-kakao-centered-entry-notice',
  './src/download/download-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/download/export-guard-service.js?v=1.6.50-kakao-centered-entry-notice&h=export-v156',
  './src/download/export-progress-view.js?v=1.6.50-kakao-centered-entry-notice&h=export-progress-v156',
  './src/download/zip-export-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/download/export-queue-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/ui/download-dialog-view.js?v=1.6.50-kakao-centered-entry-notice',
  './src/ui/bulk-import-hud-view.js?v=1.6.50-kakao-centered-entry-notice&h=bulk-hud-v153',
  './src/ui/waveform-compare-view.js?v=1.6.50-kakao-centered-entry-notice',
  './src/ui/detail-panels-view.js?v=1.6.50-kakao-centered-entry-notice',
  './src/ui/detail-view.js?v=1.6.50-kakao-centered-entry-notice',
  './src/ui/admin-incident-monitor-view.js?v=1.6.50-kakao-centered-entry-notice',
  './src/security/site-guards.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/runtime-health.js?v=1.6.50-kakao-centered-entry-notice&h=boot-sri-v1650-kakao-notice',
  './src/boot/ui-shell-recovery-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/update-safety-service.js?v=1.6.50-kakao-centered-entry-notice&h=update-safety-v1650-kakao-notice',
  './src/boot/service-worker-update-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/service-worker-recovery-service.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/worker-recovery-coordinator.js?v=1.6.50-kakao-centered-entry-notice',
  './src/boot/performance-diagnostics.js?v=1.6.50-kakao-centered-entry-notice&h=boot-sri-v1650-kakao-notice',
  './src/boot/render-scheduler.js?v=1.6.50-kakao-centered-entry-notice',
  './src/app.js?v=1.6.50-kakao-centered-entry-notice&h=boot-sri-v1650-kakao-notice',
  './src/boot/worker-recovery-app-bridge.js?v=1.6.50-kakao-centered-entry-notice',
  './assets/icons/foxbear-music.png?v=1.6.50-kakao-centered-entry-notice'
];

const INSTALL_ASSETS = [
  ...CORE_ASSETS.filter(asset =>
    ['./', './index.html', './404.html', './foxbear-root.json', './manifest.webmanifest', './sw.js'].includes(asset)
    || ((/\.(?:js|css)(?:[?#]|$)/.test(asset) || /manifest\.webmanifest\?/.test(asset))
      && !/src\/workers\//.test(asset)
      && !/kakao-external-browser\.js/.test(asset))
  )
];
const INSTALL_ASSET_SET = new Set(INSTALL_ASSETS);
const WARM_ASSETS = CORE_ASSETS.filter(asset => !INSTALL_ASSET_SET.has(asset));
let warmCachePromise = null;
let legacyCleanupPromise = null;
let lastLegacyCleanupAt = 0;
let clientShellProbeSequence = 0;
let ignoredLateClientShellReportCount = 0;
let prunedClientShellReportCount = 0;
let clientShellProbeRetryCount = 0;
const clientShellReports = new Map();
const clientShellProbes = new Map();

async function warmFoxBearCoreCache(options = {}) {
  if (warmCachePromise) return warmCachePromise;
  const force = options.force === true;
  warmCachePromise = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const failures = [];
    let cursor = 0;
    let cached = 0;
    let alreadyCached = 0;
    const worker = async () => {
      while (cursor < WARM_ASSETS.length) {
        const asset = WARM_ASSETS[cursor++];
        try {
          if (!force && await cache.match(asset)) {
            alreadyCached += 1;
            continue;
          }
          const response = await fetch(asset, { cache: 'reload' });
          if (!response || !response.ok) throw new Error(`HTTP ${response?.status || 0}`);
          await cache.put(asset, response.clone());
          cached += 1;
        } catch (error) {
          failures.push({ asset, error: error?.message || String(error) });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, Math.max(1, WARM_ASSETS.length)) }, worker));
    return { total: WARM_ASSETS.length, cached, alreadyCached, failed: failures.length, failures, force };
  })();
  try {
    return await warmCachePromise;
  } finally {
    warmCachePromise = null;
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(INSTALL_ASSETS);
  })());
});

function retainedLegacyShellNames() {
  return new Set(LEGACY_CACHE_NAMES.slice(-RETAINED_LEGACY_SHELL_COUNT));
}

function cacheNameForAssetVersion(assetVersion) {
  const version = String(assetVersion || '').trim();
  return version ? `foxbear-shell-v${version}` : '';
}

function rememberClientShellState(event, payload) {
  const clientId = String(event?.source?.id || payload?.clientId || '');
  if (!clientId) return false;
  const requestId = String(payload?.requestId || '');
  const probe = requestId ? clientShellProbes.get(requestId) : null;
  if (requestId && (!probe || !probe.expected.has(clientId))) {
    ignoredLateClientShellReportCount += 1;
    return false;
  }
  if (payload?.type === 'FOXBEAR_CLIENT_SHELL_INACTIVE' || payload?.active === false) {
    clientShellReports.delete(clientId);
    return true;
  }
  const assetVersion = String(payload?.assetVersion || '').trim();
  if (!assetVersion) return false;
  const report = {
    clientId,
    assetVersion,
    cacheName: String(payload?.cacheName || cacheNameForAssetVersion(assetVersion)),
    updatedAt: Date.now(),
    visibility: String(payload?.visibility || 'unknown')
  };
  clientShellReports.set(clientId, report);
  if (probe) {
    probe.responses.set(clientId, report);
    if (probe.responses.size >= probe.expected.size) probe.resolve();
  }
  return true;
}

function pruneClientShellReports(activeClientIds = null) {
  const now = Date.now();
  clientShellReports.forEach((report, clientId) => {
    const inactive = activeClientIds instanceof Set && !activeClientIds.has(clientId);
    const stale = now - Number(report?.updatedAt || 0) > CLIENT_SHELL_REPORT_MAX_AGE_MS;
    if (!inactive && !stale) return;
    clientShellReports.delete(clientId);
    prunedClientShellReportCount += 1;
  });
}

async function queryActiveClientShellVersions() {
  let windows = [];
  try { windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); } catch (error) {}
  const initialIds = new Set(windows.map(client => String(client.id || '')).filter(Boolean));
  pruneClientShellReports(initialIds);
  if (!windows.length) return { complete: true, clientCount: 0, reportedCount: 0, versions: new Set(), cacheNames: new Set(), disappearedCount: 0 };
  const requestId = `shell-probe-${Date.now().toString(36)}-${(++clientShellProbeSequence).toString(36)}`;
  const expected = new Set(initialIds);
  const responses = new Map();
  let resolveProbe = () => undefined;
  const settled = new Promise(resolve => { resolveProbe = resolve; });
  clientShellProbes.set(requestId, { expected, responses, resolve: resolveProbe });
  const postQuery = clients => {
    for (const client of clients) {
      const clientId = String(client?.id || '');
      if (!clientId || !expected.has(clientId) || responses.has(clientId)) continue;
      try { client.postMessage({ type: 'FOXBEAR_QUERY_CLIENT_SHELL_STATE', requestId, assetVersion: CURRENT_ASSET_VERSION }); } catch (error) {}
    }
  };
  postQuery(windows);
  if (responses.size < expected.size) {
    await Promise.race([settled, new Promise(resolve => setTimeout(resolve, CLIENT_SHELL_PROBE_TIMEOUT_MS))]);
  }
  let currentWindows = windows;
  try { currentWindows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); } catch (error) {}
  const currentIds = new Set(currentWindows.map(client => String(client.id || '')).filter(Boolean));
  let disappearedCount = 0;
  Array.from(expected).forEach(clientId => {
    if (currentIds.has(clientId)) return;
    expected.delete(clientId);
    responses.delete(clientId);
    disappearedCount += 1;
  });
  pruneClientShellReports(currentIds);
  if (responses.size < expected.size && currentWindows.length) {
    clientShellProbeRetryCount += 1;
    postQuery(currentWindows);
    await Promise.race([settled, new Promise(resolve => setTimeout(resolve, CLIENT_SHELL_PROBE_RETRY_MS))]);
  }
  clientShellProbes.delete(requestId);
  const complete = Array.from(expected).every(clientId => responses.has(clientId));
  const versions = new Set();
  const cacheNames = new Set();
  responses.forEach((report, clientId) => {
    if (!expected.has(clientId)) return;
    if (report.assetVersion) versions.add(report.assetVersion);
    if (report.cacheName) cacheNames.add(report.cacheName);
  });
  return { complete, clientCount: expected.size, reportedCount: responses.size, versions, cacheNames, disappearedCount };
}

async function purgeLegacyShellCaches(options = {}) {
  const names = await caches.keys();
  const retained = retainedLegacyShellNames();
  const deleted = [];
  const obsolete = names.filter(name => name.startsWith('foxbear-shell-') && name !== CACHE_NAME && !retained.has(name));
  await Promise.all(obsolete.map(async name => {
    if (await caches.delete(name)) deleted.push(name);
  }));

  let probe = null;
  if (options.probeClients === true) {
    probe = await queryActiveClientShellVersions();
    if (probe.complete) {
      const latestRollback = LEGACY_CACHE_NAMES[LEGACY_CACHE_NAMES.length - 1] || '';
      const protectedNames = new Set([latestRollback, ...probe.cacheNames].filter(Boolean));
      const optionalRetained = names.filter(name => retained.has(name) && !protectedNames.has(name));
      await Promise.all(optionalRetained.map(async name => {
        if (await caches.delete(name)) deleted.push(name);
      }));
    }
  }
  lastLegacyCleanupAt = Date.now();
  return { deleted, retained: Array.from(retained), probe };
}

function scheduleLegacyShellCleanup(reason = 'client-state') {
  if (legacyCleanupPromise) return legacyCleanupPromise;
  const elapsed = Date.now() - lastLegacyCleanupAt;
  const delay = Math.max(0, CLIENT_SHELL_CLEANUP_COOLDOWN_MS - elapsed);
  legacyCleanupPromise = new Promise(resolve => setTimeout(resolve, delay))
    .then(() => purgeLegacyShellCaches({ probeClients: true, reason }))
    .finally(() => { legacyCleanupPromise = null; });
  return legacyCleanupPromise;
}

async function matchExactAcrossShellCaches(request) {
  const names = await caches.keys();
  const retained = retainedLegacyShellNames();
  const candidates = [CACHE_NAME, ...names.filter(name => retained.has(name)).reverse()];
  for (const name of candidates) {
    try {
      const cache = await caches.open(name);
      const response = await cache.match(request);
      if (response) return response;
    } catch (error) {}
  }
  return null;
}

async function currentCachedMatch(cache, request, fallbackRequest = null) {
  return await cache.match(request) || (fallbackRequest ? await cache.match(fallbackRequest) : null) || null;
}

async function isCurrentShellHtml(response) {
  if (!response || !response.ok) return false;
  const type = String(response.headers.get('content-type') || '');
  if (!type.includes('text/html')) return false;
  try {
    const text = await response.clone().text();
    return text.includes(CURRENT_ASSET_VERSION);
  } catch (error) {
    return false;
  }
}

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await purgeLegacyShellCaches({ probeClients: false, reason: 'activate-pre-claim' });
    if (self.registration?.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (error) {}
    }
    await self.clients.claim();
    await purgeLegacyShellCaches({ probeClients: true, reason: 'activate-post-claim' });
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && (event.data.type === 'FOXBEAR_CLIENT_SHELL_STATE' || event.data.type === 'FOXBEAR_CLIENT_SHELL_INACTIVE')) {
    rememberClientShellState(event, event.data);
    if (!event.data.requestId || event.data.type === 'FOXBEAR_CLIENT_SHELL_INACTIVE') {
      event.waitUntil(scheduleLegacyShellCleanup(event.data.type).catch(() => undefined));
    }
  }
  if (event.data && event.data.type === 'FOXBEAR_GET_RELEASE_INFO') {
    const payload = { type: 'FOXBEAR_RELEASE_INFO', cacheName: CACHE_NAME, assetVersion: CACHE_NAME.replace(/^foxbear-shell-v/, ''), retainedLegacyShellCount: RETAINED_LEGACY_SHELL_COUNT, clientShellReportCount: clientShellReports.size, ignoredLateClientShellReportCount, prunedClientShellReportCount, clientShellProbeRetryCount };
    try { event.ports?.[0]?.postMessage?.(payload); } catch (error) {}
    try { if (!event.ports?.[0]) event.source?.postMessage?.(payload); } catch (error) {}
  }
  if (event.data && event.data.type === 'FOXBEAR_WARM_CACHE') {
    const force = event.data.force === true;
    event.waitUntil((force ? warmFoxBearCoreCache({ force: true }) : warmFoxBearCoreCache()).catch(error => ({
      total: WARM_ASSETS.length,
      cached: 0,
      alreadyCached: 0,
      failed: WARM_ASSETS.length,
      failures: [{ asset: '*', error: error?.message || String(error) }],
      force
    })).then(result => {
      const payload = { type: 'FOXBEAR_WARM_CACHE_DONE', cacheName: CACHE_NAME, ...result };
      try { event.ports?.[0]?.postMessage?.(payload); } catch (error) {}
      try { if (!event.ports?.[0]) event.source?.postMessage?.(payload); } catch (error) {}
    }));
  }
  if (event.data && event.data.type === 'FOXBEAR_PURGE_CACHES') {
    event.waitUntil(purgeFoxBearCaches().then(() => {
      try { event.source?.postMessage?.({ type: 'FOXBEAR_PURGE_CACHES_DONE', cacheName: CACHE_NAME }); } catch (error) {}
    }));
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const requestUrl = String(request.url || '');
  // Object/data URLs are local, ephemeral resources owned by the page that
  // created them. They must never enter CacheStorage or the SW fetch pipeline.
  if (requestUrl.startsWith('blob:') || requestUrl.startsWith('data:')) return;
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(handleShareTarget(request));
    return;
  }
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirstNavigation(request, event.preloadResponse));
    return;
  }
  if (['script', 'style', 'worker'].includes(request.destination) || /\.(?:js|css)(?:$|\?)/.test(url.pathname + url.search)) {
    event.respondWith(networkFirstNoFallbackOnIntegrityAssets(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

async function purgeFoxBearCaches() {
  const names = await caches.keys();
  await Promise.all(names
    .filter(name => /^foxbear-|^workbox-|^precache-/i.test(name) || LEGACY_CACHE_NAMES.includes(name))
    .map(name => caches.delete(name)));
}

async function matchCurrentOrRecovery(cache, request, fallbackRequest = null) {
  return currentCachedMatch(cache, request, fallbackRequest);
}

function getCanonicalAppRootUrl() {
  const root = new URL('./', self.registration.scope);
  root.searchParams.set('foxbearRouteRecovery', 'sw');
  return root;
}

function isCanonicalShellRequest(url) {
  const root = new URL('./', self.registration.scope);
  const index = new URL('index.html', root);
  return url.pathname === root.pathname || url.pathname === index.pathname;
}

function requestedAssetVersion(url) {
  return String(url.searchParams.get('v') || '');
}

function isStaleAssetGeneration(url) {
  const requested = requestedAssetVersion(url);
  return Boolean(requested && requested !== CURRENT_ASSET_VERSION);
}

async function networkFirstNoFallbackOnIntegrityAssets(request) {
  const url = new URL(request.url);
  const cache = await caches.open(CACHE_NAME);
  if (isStaleAssetGeneration(url)) {
    // An already-open or BFCache-restored client can briefly request its exact
    // previous generation after the new worker claims the page. Keep the latest
    // legacy shells and return only an exact cache-key match so SRI stays valid.
    return await matchExactAcrossShellCaches(request) || Response.error();
  }
  const hasPatchBust = url.searchParams.has('h') || url.searchParams.has('ui');
  try {
    const fresh = await fetch(request, { cache: hasPatchBust ? 'no-store' : 'default' });
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone()).catch(() => undefined);
      return fresh;
    }
    return await matchCurrentOrRecovery(cache, request) || fresh || Response.error();
  } catch (error) {
    return await matchCurrentOrRecovery(cache, request) || Response.error();
  }
}

async function networkFirstNavigation(request, preloadResponse) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  const canonicalShell = isCanonicalShellRequest(url);
  const canonicalIndex = new URL('index.html', self.registration.scope).href;

  const acceptCurrentShell = async response => {
    if (!(await isCurrentShellHtml(response))) return null;
    await cache.put(canonicalIndex, response.clone()).catch(() => undefined);
    return response;
  };

  try {
    if (canonicalShell) {
      const preload = await preloadResponse;
      const validPreload = await acceptCurrentShell(preload);
      if (validPreload) return validPreload;

      const fresh = await fetch(canonicalIndex, { cache: 'no-store', redirect: 'follow' });
      const validFresh = await acceptCurrentShell(fresh);
      if (validFresh) return validFresh;

      return await currentCachedMatch(cache, canonicalIndex) || Response.error();
    }

    // Broken nested routes must never become cached application shells. Redirect
    // them to the canonical repository/app root so GitHub Pages does not loop on 404.
    return Response.redirect(getCanonicalAppRootUrl().toString(), 302);
  } catch (error) {
    if (!canonicalShell) return Response.redirect(getCanonicalAppRootUrl().toString(), 302);
    return await currentCachedMatch(cache, canonicalIndex) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const url = new URL(request.url);
  const cache = await caches.open(CACHE_NAME);
  if (isStaleAssetGeneration(url)) return await matchExactAcrossShellCaches(request) || Response.error();
  const cached = await matchCurrentOrRecovery(cache, request);
  const freshPromise = fetch(request, { cache: 'reload' }).then(response => {
    if (response && response.ok) cache.put(request, response.clone()).catch(() => undefined);
    return response;
  }).catch(() => null);
  if (cached) {
    freshPromise.catch(() => undefined);
    return cached;
  }
  const fresh = await freshPromise;
  return fresh || Response.error();
}

function openShareDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SHARE_STORE)) db.createObjectStore(SHARE_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('share db open failed'));
  });
}

async function putSharedFiles(record) {
  const db = await openShareDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SHARE_STORE, 'readwrite');
      tx.objectStore(SHARE_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('share db write failed'));
    });
  } finally {
    db.close();
  }
}

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const entries = [];
    const fileFields = ['audio', 'file', 'files'];
    fileFields.forEach(field => {
      formData.getAll(field).forEach(value => {
        if (value && typeof value === 'object' && 'name' in value && value.size > 0) entries.push(value);
      });
    });
    if (!entries.length) {
      formData.forEach(value => {
        if (value && typeof value === 'object' && 'name' in value && value.size > 0) entries.push(value);
      });
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await putSharedFiles({
      id,
      createdAt: Date.now(),
      title: String(formData.get('title') || ''),
      text: String(formData.get('text') || ''),
      url: String(formData.get('url') || ''),
      files: entries.slice(0, 12)
    });
    const redirectUrl = new URL('./', self.registration.scope);
    redirectUrl.searchParams.set(SHARE_QUERY, id);
    return Response.redirect(redirectUrl.href, 303);
  } catch (error) {
    const fallback = new URL('./?share-error=1', self.registration.scope);
    return Response.redirect(fallback.href, 303);
  }
}
