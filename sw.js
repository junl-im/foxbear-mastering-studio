// FoxBear AI Mastering Studio Pro v1.5.30 service worker · inapp-playback-recovery
'use strict';

const CACHE_NAME = 'foxbear-shell-v1.5.30-inapp-playback-recovery';
const RECOVERY_CACHE_LIMIT = 2;
const LEGACY_CACHE_NAMES = ['foxbear-shell-v1.5.4-boot-sri-recovery', 'foxbear-shell-v1.5.5-update-safety', 'foxbear-shell-v1.5.6-export-progress-recovery', 'foxbear-shell-v1.5.10-header-settings-relocation', 'foxbear-shell-v1.5.11-audio-context-ci-stability', 'foxbear-shell-v1.5.12-ci-runtime-readiness', 'foxbear-shell-v1.5.13-handoff-package-integrity', 'foxbear-shell-v1.5.14-github-desktop-handoff-preflight', 'foxbear-shell-v1.5.15-e2e-runtime-classification', 'foxbear-shell-v1.5.16-e2e-server-pipe-deadlock-fix', 'foxbear-shell-v1.5.17-browser-contract-fix', 'foxbear-shell-v1.5.18-ci-diagnostics-pwa-readiness', 'foxbear-shell-v1.5.19-ci-runtime-isolation-package-hardening', 'foxbear-shell-v1.5.20-idempotent-pwa-cache-warm', 'foxbear-shell-v1.5.21-history-csp-console-contract-fix', 'foxbear-shell-v1.5.22-header-preview-routing-polish', 'foxbear-shell-v1.5.23-e2e-preview-readiness', 'foxbear-shell-v1.5.24-e2e-responsive-preview-control', 'foxbear-shell-v1.5.25-e2e-preview-stability', 'foxbear-shell-v1.5.26-engraved-command-header', 'foxbear-shell-v1.5.27-device-glyph-sri-hardening', 'foxbear-shell-v1.5.28-resilience-lifecycle-offline-recovery', 'foxbear-shell-v1.5.29-analysis-update-lifecycle'];
const SHARE_DB = 'foxbear-mobile-native-share-v1';
const SHARE_STORE = 'sharedFiles';
const SHARE_QUERY = 'foxbearSharedAudio';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './src/workers/wav-encoder.worker.js',
  './src/workers/mp3-encoder.worker.js',
  './src/workers/analysis.worker.js',
  './src/workers/master-finalizer.worker.js',
  './src/workers/pitch-wsola.worker.js',
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
  './assets/icons/foxbear-icon-16.png?v=1.5.30-inapp-playback-recovery',
  './assets/icons/foxbear-icon-32.png?v=1.5.30-inapp-playback-recovery',
  './assets/icons/foxbear-icon-192.png?v=1.5.30-inapp-playback-recovery',
  './assets/icons/foxbear-icon-512.png?v=1.5.30-inapp-playback-recovery',
  './assets/icons/apple-touch-icon.png?v=1.5.30-inapp-playback-recovery',
  './manifest.webmanifest?v=1.5.30-inapp-playback-recovery',
  './assets/css/boot/performance-diagnostics.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/boot/runtime-health.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/theme.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/layout.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/components/base-components.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/components/forms.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/components/cards.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/components/preview-system.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/components/playback-link.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/studio.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/dock.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/dock-waveform.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/waveform-compare.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/spectrum-visualizer.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/export.css?v=1.5.30-inapp-playback-recovery&h=export-progress-v156',
  './assets/css/download-dialog.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/bulk-import-hud.css?v=1.5.30-inapp-playback-recovery&h=bulk-hud-close-hotfix&ui=v153',
  './assets/css/mobile-native.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/dock-ui-repair.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/components/floating-overlays.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/header-command-bar.css?v=1.5.30-inapp-playback-recovery',
  './vendor/jszip/jszip.min.js?v=3.10.1',
  './src/config/build-info.js?v=1.5.30-inapp-playback-recovery',
  './src/boot/release-presentation-service.js?v=1.5.30-inapp-playback-recovery',
  './src/firebase-bootstrap.js?v=1.5.30-inapp-playback-recovery',
  './src/config/mastering-presets.js?v=1.5.30-inapp-playback-recovery',
  './src/config/genre-presets.js?v=1.5.30-inapp-playback-recovery',
  './src/config/reference-targets.js?v=1.5.30-inapp-playback-recovery',
  './src/config/app-runtime-config.js?v=1.5.30-inapp-playback-recovery',
  './src/state/app-state.js?v=1.5.30-inapp-playback-recovery',
  './src/settings/settings-service.js?v=1.5.30-inapp-playback-recovery',
  './src/utils/core-utils.js?v=1.5.30-inapp-playback-recovery',
  './src/recommendation/recommendation-engine.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/mastering-inspector.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/highlight-compare-inspector.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/playback-link-service.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/playback-transition-service.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/audio-context-manager.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/preview-translation-service.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/audio-decode-service.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/import-queue-service.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/analysis-cache-service.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/memory-guard-service.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/reference-profile-service.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/quality-gate-service.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/mastering-orchestrator-service.js?v=1.5.30-inapp-playback-recovery',
  './src/state/track-lifecycle-service.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/waveform-control-service.js?v=1.5.30-inapp-playback-recovery',
  './src/ui/waveform-control-view.js?v=1.5.30-inapp-playback-recovery',
  './src/ui/spectrum-visualizer.js?v=1.5.30-inapp-playback-recovery',
  './src/ui/modal-controller.js?v=1.5.30-inapp-playback-recovery',
  './src/ui/dock-controller.js?v=1.5.30-inapp-playback-recovery',
  './src/ui/mobile-native-view.js?v=1.5.30-inapp-playback-recovery&h=bulk-hud-restore-v153',
  './src/download/download-service.js?v=1.5.30-inapp-playback-recovery',
  './src/download/export-guard-service.js?v=1.5.30-inapp-playback-recovery&h=export-v156',
  './src/download/export-progress-view.js?v=1.5.30-inapp-playback-recovery&h=export-progress-v156',
  './src/ui/download-dialog-view.js?v=1.5.30-inapp-playback-recovery',
  './src/ui/bulk-import-hud-view.js?v=1.5.30-inapp-playback-recovery&h=bulk-hud-v153',
  './src/ui/waveform-compare-view.js?v=1.5.30-inapp-playback-recovery',
  './src/ui/detail-panels-view.js?v=1.5.30-inapp-playback-recovery',
  './src/ui/detail-view.js?v=1.5.30-inapp-playback-recovery',
  './src/security/site-guards.js?v=1.5.30-inapp-playback-recovery',
  './src/boot/runtime-health.js?v=1.5.30-inapp-playback-recovery&h=boot-sri-v1530',
  './src/boot/update-safety-service.js?v=1.5.30-inapp-playback-recovery&h=update-safety-v1530',
  './src/boot/service-worker-update-service.js?v=1.5.30-inapp-playback-recovery',
  './src/boot/performance-diagnostics.js?v=1.5.30-inapp-playback-recovery&h=boot-sri-v1530',
  './src/boot/render-scheduler.js?v=1.5.30-inapp-playback-recovery',
  './src/app.js?v=1.5.30-inapp-playback-recovery&h=boot-sri-v1530',
  './assets/icons/foxbear-music.png?v=1.5.30-inapp-playback-recovery'
];

const INSTALL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest?v=1.5.30-inapp-playback-recovery',
  './assets/css/boot/runtime-health.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/theme.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/layout.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/components/base-components.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/studio.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/mobile-native.css?v=1.5.30-inapp-playback-recovery',
  './assets/css/header-command-bar.css?v=1.5.30-inapp-playback-recovery',
  './src/config/build-info.js?v=1.5.30-inapp-playback-recovery',
  './src/boot/runtime-health.js?v=1.5.30-inapp-playback-recovery&h=boot-sri-v1530',
  './src/boot/update-safety-service.js?v=1.5.30-inapp-playback-recovery&h=update-safety-v1530',
  './src/boot/service-worker-update-service.js?v=1.5.30-inapp-playback-recovery',
  './src/boot/release-presentation-service.js?v=1.5.30-inapp-playback-recovery',
  './src/config/app-runtime-config.js?v=1.5.30-inapp-playback-recovery',
  './src/state/app-state.js?v=1.5.30-inapp-playback-recovery',
  './src/utils/core-utils.js?v=1.5.30-inapp-playback-recovery',
  './src/audio/preview-translation-service.js?v=1.5.30-inapp-playback-recovery',
  './src/ui/mobile-native-view.js?v=1.5.30-inapp-playback-recovery&h=bulk-hud-restore-v153',
  './src/app.js?v=1.5.30-inapp-playback-recovery&h=boot-sri-v1530',
  './assets/icons/foxbear-music.png?v=1.5.30-inapp-playback-recovery'
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

function getAvailableRecoveryCacheNames(names = []) {
  const available = new Set(names);
  return LEGACY_CACHE_NAMES.filter(name => available.has(name)).slice(-RECOVERY_CACHE_LIMIT).reverse();
}

async function matchFoxBearRecoveryCache(request, fallbackRequest = null) {
  const names = getAvailableRecoveryCacheNames(await caches.keys());
  for (const name of names) {
    const cache = await caches.open(name);
    const cached = await cache.match(request) || (fallbackRequest ? await cache.match(fallbackRequest) : null);
    if (cached) return cached;
  }
  return null;
}

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const keep = new Set([CACHE_NAME, ...getAvailableRecoveryCacheNames(names)]);
    await Promise.all(names.filter(name => name.startsWith('foxbear-shell-') && !keep.has(name)).map(name => caches.delete(name)));
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
  const url = new URL(request.url);
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
  const cached = await cache.match(request) || (fallbackRequest ? await cache.match(fallbackRequest) : null);
  return cached || await matchFoxBearRecoveryCache(request, fallbackRequest);
}

async function networkFirstNoFallbackOnIntegrityAssets(request) {
  const url = new URL(request.url);
  const hasPatchBust = url.searchParams.has('h') || url.searchParams.has('ui');
  const cache = await caches.open(CACHE_NAME);
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
  try {
    const preload = await preloadResponse;
    if (preload && preload.ok) {
      cache.put(request, preload.clone()).catch(() => undefined);
      cache.put('./index.html', preload.clone()).catch(() => undefined);
      return preload;
    }
    const fresh = await fetch(request, { cache: 'no-store' });
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone()).catch(() => undefined);
      cache.put('./index.html', fresh.clone()).catch(() => undefined);
      return fresh;
    }
    return await matchCurrentOrRecovery(cache, request, './index.html') || fresh || Response.error();
  } catch (error) {
    return await matchCurrentOrRecovery(cache, request, './index.html') || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request) || await matchFoxBearRecoveryCache(request);
  const freshPromise = fetch(request).then(response => {
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
