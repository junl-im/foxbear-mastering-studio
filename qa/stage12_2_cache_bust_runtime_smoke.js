#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL stage12_2_cache_bust_runtime_smoke: ${message}`);
    process.exit(1);
  }
};

const index = read('index.html');
const sw = read('sw.js');
const cfg = read('src/config/app-runtime-config.js');
const pkg = JSON.parse(read('package.json'));
const version = '1.4.20-bulk-import-guard';

assert(index.includes(`?v=${version}`), 'index.html should use the stage12.2 cache-busting asset version');
assert(sw.includes(`?v=${version}`), 'service worker precache should use the stage12.2 asset version');
assert(sw.includes('foxbear-shell-v1.4.20-bulk-import-guard'), 'service worker cache name should be stage12.2 cachefix');
assert(!index.includes('?v=1.4.0-dock-modal-state-machine'), 'index.html should not keep the stale immutable asset query');
assert(!sw.includes('?v=1.4.0-dock-modal-state-machine'), 'sw.js should not keep the stale immutable asset query');

const localAssetTags = index.match(/<(?:script|link)\b[^>]+(?:src|href)="(?:src|assets|manifest\.webmanifest)[^"]+"[^>]*>/g) || [];
assert(localAssetTags.length >= 20, 'expected local script/style/manifest asset tags in index.html');
for (const tag of localAssetTags) {
  assert(tag.includes(`?v=${version}`), `local asset tag missing stage12.2 query: ${tag}`);
  if (/\.(?:js|css)(?:\?|")/.test(tag) || /manifest\.webmanifest/.test(tag)) {
    assert(/integrity="sha384-[^"]+"/.test(tag), `local JS/CSS/manifest tag missing SRI: ${tag}`);
  }
}

assert(cfg.includes(`const ASSET_VERSION = '${version}'`), 'runtime config should expose the stage12.2 asset version');
['analysis.worker.js', 'master-finalizer.worker.js', 'wav-encoder.worker.js', 'mp3-encoder.worker.js', 'pitch-wsola.worker.js'].forEach(name => {
  assert(cfg.includes(name), `worker URL should still be declared for ${name}`);
});
assert(cfg.includes('const assetUrl = path => `${path}?v=${ASSET_VERSION}`'), 'worker helper should append the cache-busting query');
assert(pkg.qaChecks.includes('node qa/stage12_2_cache_bust_runtime_smoke.js'), 'package QA should include stage12.2 cache-bust smoke');
console.log('PASS stage12.2 cache-bust/runtime smoke');
