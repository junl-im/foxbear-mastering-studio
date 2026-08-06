'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const firebase = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));
const assetVersion = pkg.foxbearRelease.assetVersion;
const publicHtmlFiles = ['index.html', 'external-browser.html', 'design-preview.html'];
const tagPattern = /<(?:script|link|img)\b[^>]+(?:src|href)="((?:src|assets|manifest\.webmanifest)[^"]+)"[^>]*>/g;

for (const file of publicHtmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const assets = [...html.matchAll(tagPattern)].map(match => match[1]);
  assert(assets.length > 0, `${file} must expose at least one local runtime asset`);
  for (const asset of assets) {
    assert(asset.includes(`?v=${assetVersion}`), `${file} has an unversioned immutable asset: ${asset}`);
  }
}

function expectedSri(relativePath) {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  return `sha384-${crypto.createHash('sha384').update(bytes).digest('base64')}`;
}

const design = fs.readFileSync(path.join(root, 'design-preview.html'), 'utf8');
assert(design.includes(`integrity="${expectedSri('assets/css/design-preview.css')}"`), 'design preview CSS SRI must match its file bytes');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
const manifestIcons = [
  ...(manifest.icons || []).map(icon => icon.src),
  ...(manifest.shortcuts || []).flatMap(shortcut => (shortcut.icons || []).map(icon => icon.src))
];
assert(manifestIcons.length > 0, 'manifest must expose icons');
for (const icon of manifestIcons) {
  assert(icon.includes(`?v=${assetVersion}`), `manifest icon must use current cache generation: ${icon}`);
}

const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const asset of [
  'assets/css/external-browser.css',
  'src/boot/kakao-external-browser.js',
  'assets/css/design-preview.css',
  'assets/icons/foxbear-icon-96.png'
]) {
  assert(sw.includes(`./${asset}?v=${assetVersion}`), `service worker must cache the current auxiliary asset generation: ${asset}`);
}
assert(sw.includes("const PUBLIC_AUXILIARY_HTML = new Set(['404.html', 'external-browser.html', 'design-preview.html'])"), 'service worker must allowlist public auxiliary HTML');
assert(sw.includes('isPublicAuxiliaryHtmlRequest(url)') && sw.includes('networkFirstAuxiliaryNavigation(request)'), 'service worker must route auxiliary navigation before canonical redirect recovery');
assert(sw.indexOf('isPublicAuxiliaryHtmlRequest(url)') < sw.indexOf('networkFirstNavigation(request, event.preloadResponse)'), 'auxiliary navigation routing must be evaluated before root-shell recovery');

const cachedWrites = [];
const fetchCalls = [];
const sandbox = {
  URL,
  Set,
  Response,
  Request,
  console,
  fetch: async request => {
    fetchCalls.push(String(request.url || request));
    return new Response('<!doctype html><title>aux</title>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  },
  caches: {
    async open() {
      return {
        async put(key) { cachedWrites.push(String(key)); },
        async match() { return null; }
      };
    }
  },
  self: {
    location: { origin: 'https://example.com' },
    registration: { scope: 'https://example.com/app/' },
    addEventListener() {}
  }
};
vm.runInNewContext(sw, sandbox, { filename: 'sw.js' });
assert.strictEqual(sandbox.isPublicAuxiliaryHtmlRequest(new URL('https://example.com/app/external-browser.html?target=x')), true);
assert.strictEqual(sandbox.isPublicAuxiliaryHtmlRequest(new URL('https://example.com/app/design-preview.html')), true);
assert.strictEqual(sandbox.isPublicAuxiliaryHtmlRequest(new URL('https://example.com/app/404.html')), true);
assert.strictEqual(sandbox.isPublicAuxiliaryHtmlRequest(new URL('https://example.com/app/nested/missing')), false);

(async () => {
  const request = new Request('https://example.com/app/external-browser.html?target=local', { headers: { accept: 'text/html' } });
  const response = await sandbox.networkFirstAuxiliaryNavigation(request);
  assert.strictEqual(response.status, 200, 'auxiliary navigation should return the network response');
  assert.strictEqual(fetchCalls[0], request.url, 'auxiliary navigation must preserve the request query while fetching');
  assert(cachedWrites.includes('https://example.com/app/external-browser.html'), 'auxiliary navigation must cache one canonical query-free fallback');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

const noStoreSources = new Map((firebase.hosting.headers || []).map(rule => [rule.source, rule.headers || []]));
for (const source of ['/404.html', '/external-browser.html', '/design-preview.html', '/foxbear-root.json', '/index.html', '/manifest.webmanifest', '/sw.js']) {
  const headers = noStoreSources.get(source) || [];
  const cache = headers.find(header => String(header.key).toLowerCase() === 'cache-control')?.value || '';
  assert(/no-cache/.test(cache), `${source} must opt out of stale shell caching`);
}

const updater = fs.readFileSync(path.join(root, 'tools/update-sri.py'), 'utf8');
assert(updater.includes("ROOT / 'design-preview.html'"), 'SRI updater must include design-preview.html');
const verifier = fs.readFileSync(path.join(root, 'qa/verify_sri.py'), 'utf8');
assert(verifier.includes("'design-preview.html'"), 'SRI verifier must include design-preview.html');

console.log('PASS v1.6.68 public shell cache integrity smoke');
