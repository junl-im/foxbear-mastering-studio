// FoxBear AI Mastering Studio Pro v1.5.94 service worker · aiff-fallback-worker-diagnostics-reporting-contract
'use strict';

const CACHE_NAME = 'foxbear-shell-v1.5.94-aiff-fallback-worker-diagnostics-reporting-contract';
const CURRENT_ASSET_VERSION = '1.5.94-aiff-fallback-worker-diagnostics-reporting-contract';
const LEGACY_CACHE_NAMES = ['foxbear-shell-v1.5.4-boot-sri-recovery', 'foxbear-shell-v1.5.5-update-safety', 'foxbear-shell-v1.5.6-export-progress-recovery', 'foxbear-shell-v1.5.74-bulk-pause-skip-reorder-mobile-download', 'foxbear-shell-v1.5.75-dependency-light-static-qa', 'foxbear-shell-v1.5.76-atomic-release-sync-dependency-health', 'foxbear-shell-v1.5.77-runtime-resource-lifecycle-recovery', 'foxbear-shell-v1.5.78-playback-transition-race-recovery', 'foxbear-shell-v1.5.79-preview-download-ownership-recovery', 'foxbear-shell-v1.5.80-mobile-return-media-focus-recovery', 'foxbear-shell-v1.5.81-master-preview-cancellation-native-result-isolation', 'foxbear-shell-v1.5.82-mastering-cancel-playback-resume-recovery', 'foxbear-shell-v1.5.83-worker-dock-ownership-diagnostics', 'foxbear-shell-v1.5.84-trusted-types-browser-gate-recovery', 'foxbear-shell-v1.5.85-browser-fixture-preflight-root-cause-diagnostics', 'foxbear-shell-v1.5.86-browser-failed-retry-fixture-contracts', 'foxbear-shell-v1.5.87-browser-retry-recovery-reporting', 'foxbear-shell-v1.5.88-browser-impact-flaky-history', 'foxbear-shell-v1.5.89-browser-health-first-selector-flaky-issues', 'foxbear-shell-v1.5.90-browser-retry-integrity-metadata-aware-scope', 'foxbear-shell-v1.5.91-cancellable-audio-pipeline-performance-guards', 'foxbear-shell-v1.5.92-python-bytecode-ci-hygiene-node24-cache', 'foxbear-shell-v1.5.93-external-engine-transfer-admin-export-openai-readiness'];
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
  './src/boot/kakao-entry-guard.js',
  './src/boot/kakao-entry-guard.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/boot/kakao-external-browser.js',
  './manifest.webmanifest',
  './sw.js',
  './src/workers/wav-encoder.worker.js',
  './src/workers/mp3-encoder.worker.js',
  './src/workers/analysis.worker.js',
  './src/workers/master-finalizer.worker.js',
  './src/workers/pitch-wsola.worker.js',
  './src/workers/zip-encoder.worker.js',
  './src/workers/wav-encoder.worker.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/workers/mp3-encoder.worker.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/workers/analysis.worker.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/workers/master-finalizer.worker.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/workers/pitch-wsola.worker.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/workers/zip-encoder.worker.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
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
  './assets/icons/foxbear-icon-16.png?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/icons/foxbear-icon-32.png?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/icons/foxbear-icon-192.png?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/icons/foxbear-icon-512.png?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/icons/apple-touch-icon.png?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './manifest.webmanifest?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/boot/performance-diagnostics.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/boot/runtime-health.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/theme.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/layout.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/components/base-components.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/components/forms.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/components/cards.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/components/preview-system.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/components/playback-link.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/studio.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/components/admin-incident-monitor.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/dock.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/dock-waveform.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/waveform-compare.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/spectrum-visualizer.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/export.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract&h=export-progress-v156',
  './assets/css/download-dialog.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/bulk-import-hud.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract&h=bulk-hud-close-hotfix&ui=v153',
  './assets/css/mobile-native.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/dock-ui-repair.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/components/floating-overlays.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/header-command-bar.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './assets/css/components/modal-close-system.css?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './vendor/jszip/jszip.min.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract&lib=3.10.1',
  './src/config/build-info.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/boot/release-presentation-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/boot/session-handoff-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/firebase-bootstrap.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/boot/incident-reporter.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/config/mastering-presets.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/config/genre-presets.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/config/reference-targets.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/config/app-runtime-config.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/state/app-state.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/settings/settings-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/utils/core-utils.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/utils/worker-job-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/recommendation/recommendation-engine.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/mastering-inspector.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/highlight-compare-inspector.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/playback-link-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/playback-transition-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/audio-context-manager.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/preview-translation-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/audio-import-capability-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/audio-decode-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/inapp-mastering-safety-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/import-preflight-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/import-queue-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/analysis-cache-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/memory-guard-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/mastering-memory-diagnostics-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/reference-profile-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/mastering-input-guard-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/mastering-quality-audit-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/quality-gate-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/mastering-orchestrator-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/master-preview-job-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/state/track-lifecycle-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/audio/waveform-control-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/ui/waveform-control-view.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/ui/spectrum-visualizer.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/ui/modal-controller.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/ui/dock-controller.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/ui/mobile-native-view.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract&h=bulk-hud-restore-v153',
  './src/download/download-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/download/export-guard-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract&h=export-v156',
  './src/download/export-progress-view.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract&h=export-progress-v156',
  './src/download/zip-export-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/download/export-queue-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/ui/download-dialog-view.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/ui/bulk-import-hud-view.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract&h=bulk-hud-v153',
  './src/ui/waveform-compare-view.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/ui/detail-panels-view.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/ui/detail-view.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/ui/admin-incident-monitor-view.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/security/site-guards.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/boot/runtime-health.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract&h=boot-sri-v1594',
  './src/boot/update-safety-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract&h=update-safety-v1594',
  './src/boot/service-worker-update-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/boot/service-worker-recovery-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/boot/performance-diagnostics.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract&h=boot-sri-v1594',
  './src/boot/render-scheduler.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract',
  './src/app.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract&h=boot-sri-v1594',
  './assets/icons/foxbear-music.png?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract'
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

async function purgeLegacyShellCaches() {
  const names = await caches.keys();
  await Promise.all(names
    .filter(name => name.startsWith('foxbear-shell-') && name !== CACHE_NAME)
    .map(name => caches.delete(name)));
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
    await purgeLegacyShellCaches();
    if (self.registration?.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (error) {}
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'FOXBEAR_GET_RELEASE_INFO') {
    const payload = { type: 'FOXBEAR_RELEASE_INFO', cacheName: CACHE_NAME, assetVersion: CACHE_NAME.replace(/^foxbear-shell-v/, '') };
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
    // Never mix a stale HTML generation with current bytes: SRI will block the
    // response and can leave the app half-booted. Serve only an exact same-
    // generation cached response; otherwise fail so Runtime Health can recover.
    return Response.error();
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
  if (isStaleAssetGeneration(url)) return Response.error();
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
