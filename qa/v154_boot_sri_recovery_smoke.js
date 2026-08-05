#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL v1.5.4 boot SRI recovery smoke: ${message}`);
    process.exit(1);
  }
}
function sri(path) {
  return `sha384-${crypto.createHash('sha384').update(fs.readFileSync(path)).digest('base64')}`;
}

const index = read('index.html');
const sw = read('sw.js');
const runtimeHealth = read('src/boot/runtime-health.js');
const pkg = JSON.parse(read('package.json'));
const readme = read('README.md');
const handoff = read('HANDOFF.md');
const qaReport = read('qa/QA_REPORT.md');

const BOOT_KEY = ['h=boot-sri-v1659-readiness-corp','h=boot-sri-v156','h=boot-sri-v155','h=boot-sri-v154'].find(key => index.includes(key));
assert(index.includes(`src/boot/runtime-health.js?v=1.6.59-readiness-corp-security-hardening&${BOOT_KEY}`), 'runtime health boot cache-bust key missing from index');
assert(index.includes(`src/boot/performance-diagnostics.js?v=1.6.59-readiness-corp-security-hardening&${BOOT_KEY}`), 'performance diagnostics boot cache-bust key missing from index');
assert(index.includes(`src/app.js?v=1.6.59-readiness-corp-security-hardening&${BOOT_KEY}`), 'app boot cache-bust key missing from index');
assert(sw.includes(`./src/boot/runtime-health.js?v=1.6.59-readiness-corp-security-hardening&${BOOT_KEY}`), 'runtime health boot cache-bust key missing from service worker');
assert(sw.includes(`./src/boot/performance-diagnostics.js?v=1.6.59-readiness-corp-security-hardening&${BOOT_KEY}`), 'performance diagnostics boot cache-bust key missing from service worker');
assert(sw.includes(`./src/app.js?v=1.6.59-readiness-corp-security-hardening&${BOOT_KEY}`), 'app boot cache-bust key missing from service worker');
assert(sw.includes("foxbear-shell-v1.5.4-boot-sri-recovery") || sw.includes("foxbear-shell-v1.5.5-update-safety") || sw.includes("foxbear-shell-v1.5.6-export-progress-recovery") || sw.includes("foxbear-shell-v1.6.59-readiness-corp-security-hardening"), 'service worker cache generation was not bumped');

assert(index.includes(sri('src/boot/runtime-health.js')), 'runtime health SRI does not match file bytes');
assert(index.includes(sri('src/boot/performance-diagnostics.js')), 'performance diagnostics SRI does not match file bytes');
assert(index.includes(sri('src/app.js')), 'app SRI does not match file bytes');

assert(runtimeHealth.includes("/^foxbear-|^workbox-|^precache-/i"), 'runtime recovery does not clear broad app/workbox/precache caches');
assert(runtimeHealth.includes('reg.update?.()'), 'runtime recovery does not request service worker update before unregister');
assert(runtimeHealth.includes('foxbearBypassSwOnce'), 'runtime recovery does not mark one-shot service worker bypass intent');

assert(pkg.qaChecks.includes('node qa/v154_boot_sri_recovery_smoke.js'), 'package qaChecks missing v154 boot SRI recovery smoke');
assert(readme.includes('v1.5.4 Boot SRI Recovery'), 'README missing v1.5.4 boot recovery section');
assert(handoff.includes('v1.5.4 boot SRI recovery'), 'HANDOFF missing v1.5.4 boot recovery section');
assert(/\b(\d+)\/\1 PASS\b/.test(qaReport), 'QA report missing a self-consistent PASS target');

console.log('PASS v1.5.4 boot SRI recovery smoke');
