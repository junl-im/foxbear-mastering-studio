// FoxBear AI Mastering Studio Pro v1.4.24 service worker
'use strict';

const CACHE_NAME = 'foxbear-shell-v1.4.24-bulk-import-hud';
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
  './assets/icons/foxbear-icon-16.png?v=1.4.24-bulk-import-hud',
  './assets/icons/foxbear-icon-32.png?v=1.4.24-bulk-import-hud',
  './assets/icons/foxbear-icon-192.png?v=1.4.24-bulk-import-hud',
  './assets/icons/foxbear-icon-512.png?v=1.4.24-bulk-import-hud',
  './assets/icons/apple-touch-icon.png?v=1.4.24-bulk-import-hud',
  './manifest.webmanifest?v=1.4.24-bulk-import-hud',
  './assets/css/boot/performance-diagnostics.css?v=1.4.24-bulk-import-hud',
  './assets/css/boot/runtime-health.css?v=1.4.24-bulk-import-hud',
  './assets/css/theme.css?v=1.4.24-bulk-import-hud',
  './assets/css/layout.css?v=1.4.24-bulk-import-hud',
  './assets/css/components/base-components.css?v=1.4.24-bulk-import-hud',
  './assets/css/components/forms.css?v=1.4.24-bulk-import-hud',
  './assets/css/components/cards.css?v=1.4.24-bulk-import-hud',
  './assets/css/components/preview-system.css?v=1.4.24-bulk-import-hud',
  './assets/css/components/playback-link.css?v=1.4.24-bulk-import-hud',
  './assets/css/studio.css?v=1.4.24-bulk-import-hud',
  './assets/css/dock.css?v=1.4.24-bulk-import-hud',
  './assets/css/dock-waveform.css?v=1.4.24-bulk-import-hud',
  './assets/css/waveform-compare.css?v=1.4.24-bulk-import-hud',
  './assets/css/spectrum-visualizer.css?v=1.4.24-bulk-import-hud',
  './assets/css/export.css?v=1.4.24-bulk-import-hud',
  './assets/css/download-dialog.css?v=1.4.24-bulk-import-hud',
  './assets/css/bulk-import-hud.css?v=1.4.24-bulk-import-hud',
  './assets/css/mobile-native.css?v=1.4.24-bulk-import-hud',
  './assets/css/dock-ui-repair.css?v=1.4.24-bulk-import-hud',
  './assets/css/components/floating-overlays.css?v=1.4.24-bulk-import-hud',
  './vendor/jszip/jszip.min.js?v=3.10.1',
  './src/firebase-bootstrap.js?v=1.4.24-bulk-import-hud',
  './src/config/mastering-presets.js?v=1.4.24-bulk-import-hud',
  './src/config/genre-presets.js?v=1.4.24-bulk-import-hud',
  './src/config/reference-targets.js?v=1.4.24-bulk-import-hud',
  './src/config/app-runtime-config.js?v=1.4.24-bulk-import-hud',
  './src/state/app-state.js?v=1.4.24-bulk-import-hud',
  './src/settings/settings-service.js?v=1.4.24-bulk-import-hud',
  './src/utils/core-utils.js?v=1.4.24-bulk-import-hud',
  './src/recommendation/recommendation-engine.js?v=1.4.24-bulk-import-hud',
  './src/audio/mastering-inspector.js?v=1.4.24-bulk-import-hud',
  './src/audio/highlight-compare-inspector.js?v=1.4.24-bulk-import-hud',
  './src/audio/playback-link-service.js?v=1.4.24-bulk-import-hud',
  './src/audio/playback-transition-service.js?v=1.4.24-bulk-import-hud',
  './src/audio/audio-decode-service.js?v=1.4.24-bulk-import-hud',
  './src/audio/waveform-control-service.js?v=1.4.24-bulk-import-hud',
  './src/ui/waveform-control-view.js?v=1.4.24-bulk-import-hud',
  './src/ui/spectrum-visualizer.js?v=1.4.24-bulk-import-hud',
  './src/ui/modal-controller.js?v=1.4.24-bulk-import-hud',
  './src/ui/dock-controller.js?v=1.4.24-bulk-import-hud',
  './src/ui/mobile-native-view.js?v=1.4.24-bulk-import-hud',
  './src/download/download-service.js?v=1.4.24-bulk-import-hud',
  './src/ui/download-dialog-view.js?v=1.4.24-bulk-import-hud',
  './src/ui/bulk-import-hud-view.js?v=1.4.24-bulk-import-hud',
  './src/ui/waveform-compare-view.js?v=1.4.24-bulk-import-hud',
  './src/ui/detail-panels-view.js?v=1.4.24-bulk-import-hud',
  './src/ui/detail-view.js?v=1.4.24-bulk-import-hud',
  './src/security/site-guards.js?v=1.4.24-bulk-import-hud',
  './src/boot/runtime-health.js?v=1.4.24-bulk-import-hud',
  './src/boot/performance-diagnostics.js?v=1.4.24-bulk-import-hud',
  './src/boot/render-scheduler.js?v=1.4.24-bulk-import-hud',
  './src/app.js?v=1.4.24-bulk-import-hud',
  './assets/icons/foxbear-music.png?v=1.4.24-bulk-import-hud'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('foxbear-shell-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
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
    event.respondWith(networkFirst(request));
    return;
  }
  if (['script', 'style', 'worker'].includes(request.destination) || /\.(?:js|css)(?:$|\?)/.test(url.pathname + url.search)) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => undefined);
    return fresh;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || cache.match('./index.html') || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
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
