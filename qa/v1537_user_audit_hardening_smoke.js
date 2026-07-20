'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const sw = read('sw.js');
const app = read('src/app.js');
const runtimeConfig = read('src/config/app-runtime-config.js');
const waveform = read('src/audio/waveform-control-service.js');
const firebase = read('src/firebase-bootstrap.js');
const pkg = JSON.parse(read('package.json'));
const hook = read('.githooks/pre-commit');
const hookInstaller = read('tools/install-git-hooks.sh');

assert(sw.includes("requestUrl.startsWith('blob:') || requestUrl.startsWith('data:')"), 'service worker does not bypass blob/data URLs');
assert(sw.includes("url.protocol !== 'http:' && url.protocol !== 'https:'"), 'service worker does not reject non-network protocols');

assert(app.includes('if (mobile || (deviceMemoryGb > 0 && deviceMemoryGb <= 4)) return {};'), 'mobile/low-memory mastered PCM is still retained');
const importQueue = read('src/audio/import-queue-service.js');
assert(importQueue.includes('maxFiles: lowMemory ? lowMemoryMaxFiles : maxFiles'), 'low-memory import count limit missing');
assert(importQueue.includes('maxBatchBytes: lowMemory ? lowMemoryBatchBytes'), 'low-memory aggregate import budget missing');
assert(app.includes('importQueueYieldMs: importPolicy.queueYieldMs'), 'adaptive import queue cooldown missing');
assert(runtimeConfig.includes('LOW_MEMORY_MAX_FILES: 10'), 'low-memory max files is not configured');
assert(runtimeConfig.includes('LOW_MEMORY_IMPORT_BATCH_BYTES: 400 * 1024 * 1024'), '400MB low-memory batch budget missing');

const queueSandbox = { window: null, console, navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', deviceMemory: 4 }, setTimeout, clearTimeout, AbortController };
queueSandbox.window = queueSandbox;
vm.runInNewContext(importQueue, queueSandbox, { filename: 'import-queue-service.js' });
const planner = queueSandbox.FoxBearImportQueueService;
const fakeFiles = Array.from({ length: 11 }, (_, index) => ({ name: `track-${index}.wav`, size: 40 * 1024 * 1024 }));
const lowMemoryPlan = planner.planImportFiles(fakeFiles, 0, { maxFiles: 35, maxFileSize: 220 * 1024 * 1024, lowMemoryMaxFiles: 10, lowMemoryMaxFileSize: 128 * 1024 * 1024, lowMemoryBatchBytes: 400 * 1024 * 1024, normalYieldMs: 90, lowMemoryYieldMs: 200, largeBatchThreshold: 12, coarsePointer: true }, () => ({ ok: true, label: 'WAV' }));
assert.strictEqual(lowMemoryPlan.policy.maxFiles, 10, 'low-memory policy did not reduce file count');
assert.strictEqual(lowMemoryPlan.accepted.length, 10, 'low-memory planner did not accept the bounded set');
assert.strictEqual(lowMemoryPlan.skippedByLimit, 1, 'low-memory planner did not reject the 11th file');
assert.strictEqual(lowMemoryPlan.policy.queueYieldMs, 200, 'low-memory planner did not apply cooldown');

assert(waveform.includes("element.style.setProperty('--waveform-progress-pct'"), 'waveform CSS progress variable missing');
assert(!waveform.includes("bar.classList.toggle('is-played'"), 'waveform still toggles every bar on each progress update');
assert(app.includes('dockWaveformPlayheadRaf = requestAnimationFrame'), 'dock waveform progress is not rAF-throttled');

assert(!/^import\s+.*firebase/m.test(firebase), 'Firebase SDK still uses eager static imports');
assert(firebase.includes('firebaseModulesPromise = Promise.all(['), 'Firebase dynamic module loader missing');
assert(firebase.includes('window.requestIdleCallback(start, { timeout: 2500 })'), 'Firebase boot is not deferred to idle time');

assert.strictEqual(pkg.scripts['version:check'], 'node tools/sync-release-metadata.js --check', 'version check script missing');
assert.strictEqual(pkg.scripts['hooks:install'], 'bash tools/install-git-hooks.sh', 'Git hook install script missing');
assert(hook.includes('npm run version:check'), 'pre-commit hook does not enforce release metadata');
assert(hookInstaller.includes('git config core.hooksPath .githooks'), 'hook installer does not set core.hooksPath');

const bars = [{ classList: { remove() {} } }, { classList: { remove() {} } }];
let queryCount = 0;
const element = {
  dataset: {},
  style: { values: {}, setProperty(key, value) { this.values[key] = value; }, removeProperty(key) { delete this.values[key]; } },
  classList: { add() {}, remove() {}, toggle() {} },
  setAttribute() {},
  removeAttribute() {},
  getBoundingClientRect() { return { left: 0, right: 100, width: 100 }; },
  querySelectorAll() { queryCount += 1; return bars; }
};
bars[0].getBoundingClientRect = () => ({ left: 0, right: 1 });
bars[1].getBoundingClientRect = () => ({ left: 99, right: 100 });
const sandbox = { window: null, console };
sandbox.window = sandbox;
vm.runInNewContext(waveform, sandbox, { filename: 'waveform-control-service.js' });
const service = sandbox.window.FoxBearWaveformControlService;
service.stampManagedElement(element, 'test');
const afterStampQueries = queryCount;
for (let index = 0; index < 20; index += 1) service.setPlayhead(element, index * 5, true);
assert.strictEqual(queryCount, afterStampQueries, 'waveform progress re-queries all bars during playback');
assert(element.style.values['--waveform-progress-pct'], 'waveform CSS progress value was not updated');

console.log('PASS v1.5.37 user-reported SW, memory, import, waveform, Firebase, and version hardening smoke');
