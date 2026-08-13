const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL stage13_runtime_health_smoke: ${message}`);
    process.exit(1);
  }
}
const version = '1.6.95-release-artifact-safety';
const index = read('index.html');
const sw = read('sw.js');
const cfg = read('src/config/app-runtime-config.js');
const app = read('src/app.js');
const health = read('src/boot/runtime-health.js');
const pkg = JSON.parse(read('package.json'));
const overwrite = read('tools/create-overwrite-zip.sh');
const docs = ['CHANGELOG.md', 'HANDOFF.md', 'PROJECT_NOTES.md'].map(read).join('\n');

assert(index.includes(`src/boot/runtime-health.js?v=${version}`), 'runtime health script should be loaded by index.html');
assert(index.indexOf('src/boot/runtime-health.js') < index.indexOf('src/security/site-guards.js'), 'runtime health should load before guard/module dependencies so it can catch load failures');
assert(index.indexOf('src/boot/runtime-health.js') < index.indexOf('src/app.js'), 'runtime health should load before app.js');
assert(!index.includes('sha384-PLACEHOLDER'), 'runtime health SRI should be real');
assert(sw.includes(`./src/boot/runtime-health.js?v=${version}`), 'service worker should precache runtime health module');
assert(sw.includes(`foxbear-shell-v1.6.95-release-artifact-safety`), 'service worker cache name should be stage14 or later');
assert(cfg.includes(`const ASSET_VERSION = '${version}'`), 'runtime config should expose current asset version');
assert(app.includes("window.FoxBearRuntimeHealth?.markAppReady?.()"), 'app should mark runtime health as ready after init');
assert(app.includes("window.FoxBearRuntimeHealth?.markBootFailed?.(error)"), 'app should report critical init failures to runtime health');
assert(app.includes(`navigator.serviceWorker.register('./sw.js?v=${version}')`), 'service worker registration should use current cache key');
assert(health.includes('FoxBearRuntimeHealth'), 'runtime health should expose FoxBearRuntimeHealth');
assert(health.includes('requiredGlobals'), 'runtime health should publish required global list');
assert(health.includes('assetVersionMismatches'), 'runtime health should detect asset version mismatches');
assert(health.includes('fileInput') && health.includes('folderInput'), 'runtime health should check import DOM ids');
assert(pkg.qaChecks.includes('node --check src/boot/runtime-health.js'), 'package QA should syntax check runtime health');
assert(pkg.qaChecks.includes('node qa/stage13_runtime_health_smoke.js'), 'package QA should include stage13 smoke');
assert(overwrite.includes('package.json') && overwrite.includes("'v' + (p.version || 'dev')"), 'overwrite package default should be latest stage or later');

const localAssetTags = Array.from(index.matchAll(/<(script|link|img)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g));
for (const match of localAssetTags) {
  const tag = match[0];
  const url = match[2];
  if (/^(?:src\/|assets\/|manifest\.webmanifest|sw\.js)/.test(url.split('?')[0])) {
    assert(url.includes(`?v=${version}`), `local asset tag missing stage13 query: ${tag}`);
  }
}
assert(!index.includes('stage12.2-cachefix'), 'index should not keep stage12.2 cache key');
assert(!sw.includes('stage12.2-cachefix'), 'sw should not keep stage12.2 cache key');
assert(docs.includes('Stage13') && docs.includes('Stage14'), 'handoff docs should mention Stage13 and Stage14');
console.log('PASS stage13 runtime health smoke');
