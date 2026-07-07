#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL stage14_runtime_recovery_smoke: ${message}`);
    process.exit(1);
  }
}
const version = '1.4.4-fft-live-hotfix';
const index = read('index.html');
const sw = read('sw.js');
const cfg = read('src/config/app-runtime-config.js');
const health = read('src/boot/runtime-health.js');
const css = read('assets/css/boot/runtime-health.css');
const pkg = JSON.parse(read('package.json'));
const overwrite = read('tools/create-overwrite-zip.sh');
const docs = ['CHANGELOG.md', 'HANDOFF.md', 'PROJECT_NOTES.md'].map(read).join('\n');

assert(index.includes(`src/boot/runtime-health.js?v=${version}`), 'index should load runtime-health with stage14 query');
assert(index.indexOf('src/boot/runtime-health.js') < index.indexOf('assets/css/theme.css'), 'runtime-health should load before normal CSS so resource errors are captured early');
assert(index.indexOf('src/boot/runtime-health.js') < index.indexOf('src/firebase-bootstrap.js'), 'runtime-health should load before app modules');
const healthTag = index.match(/<script[^>]+src="src\/boot\/runtime-health\.js[^"]+"[^>]*><\/script>/)?.[0] || '';
assert(healthTag && !/\bdefer\b/.test(healthTag) && !/type="module"/.test(healthTag), 'runtime-health should be a synchronous classic script');
assert(index.includes(`assets/css/boot/runtime-health.css?v=${version}`), 'runtime recovery CSS should be loaded');
assert(sw.includes(`./assets/css/boot/runtime-health.css?v=${version}`), 'service worker should precache runtime recovery CSS');
assert(sw.includes(`./src/boot/runtime-health.js?v=${version}`), 'service worker should precache runtime-health');
assert(sw.includes(`foxbear-shell-v1.4.4-fft-live-hotfix`), 'service worker cache name should be stage16');
assert(cfg.includes(`const ASSET_VERSION = '${version}'`), 'runtime config should expose stage14 asset version');
assert(health.includes('recordResourceFailure'), 'runtime health should record resource/SRI failures');
assert(health.includes('clearCachesAndReload'), 'runtime health should expose cache recovery');
assert(health.includes('BOOT_STALL_MS'), 'runtime health should detect boot stalls');
assert(health.includes('showRecoveryPanel'), 'runtime health should show recovery panel');
assert(health.includes('navigator.serviceWorker.getRegistrations'), 'runtime recovery should unregister old service workers');
assert(css.includes('.runtime-recovery-panel'), 'runtime recovery CSS should style recovery panel');
assert(pkg.qaChecks.includes('node qa/stage14_runtime_recovery_smoke.js'), 'package QA should include stage14 recovery smoke');
assert(overwrite.includes('v1.4.4'), 'overwrite package default should be latest stage');
assert(docs.includes('Stage14'), 'handoff docs should mention Stage14');
assert(!index.includes('1.3.84-stage13-runtime-safety'), 'index should not keep stage13 query');
assert(!sw.includes('1.3.84-stage13-runtime-safety'), 'sw should not keep stage13 query');
console.log('PASS stage14 runtime recovery smoke');
