'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '1.6.94', 'package version must be v1.6.94');
assert(/^[a-z0-9][a-z0-9-]*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current build id must remain valid kebab-case');

const css = read('assets/css/download-dialog.css');
assert(css.includes('--foxbear-download-visual-height'), 'mobile download sheet must consume visual viewport height');
assert(css.includes('--foxbear-download-visual-bottom-inset'), 'mobile download backdrop must account for visual viewport bottom inset');
assert(css.includes('min-height: min(76dvh, 680px, calc(var(--foxbear-download-visual-height'), 'mobile min-height must not override the shrunken visual viewport');
assert(css.includes('.download-options-panel-v1574.working .download-options-actions-primary'), 'working download sheet must remove sticky action overlay');
assert(css.includes('position: static;'), 'working primary actions must stop covering encoding progress');

const dialog = read('src/ui/download-dialog-view.js');
assert(dialog.includes('const syncDownloadVisualViewport'), 'download dialog must synchronize visualViewport geometry');
assert(dialog.includes("progressCard.scrollIntoView({ block: 'center', inline: 'nearest' })"), 'viewport changes during encoding must re-reveal progress');
assert(dialog.includes("--foxbear-download-visual-bottom-inset"), 'download dialog must publish keyboard/browser chrome bottom inset');

const runtimeCountersSource = read('src/boot/runtime-fault-counters.js');
const context = { window: {}, globalThis: {}, Date, Map, Object, Math, String, Number, Array };
context.window = context;
context.globalThis = context;
vm.runInNewContext(runtimeCountersSource, context, { filename: 'runtime-fault-counters.js' });
const counters = context.FoxBearRuntimeFaultCounters;
assert(counters && typeof counters.record === 'function', 'runtime fault counter service must load');
counters.record('incident-storage', 'read-failed');
counters.record('incident-storage', 'read-failed');
counters.record('service-worker', 'client-state-post-failed');
const snapshot = counters.getSnapshot();
assert.strictEqual(snapshot.totalCount, 3, 'runtime fault total count must aggregate');
assert.strictEqual(snapshot.uniqueCount, 2, 'runtime fault keys must stay bounded and grouped');
assert.strictEqual(snapshot.recentCount, 3, 'recent fault count must count occurrences, not lifetime totals for recently-touched keys');
assert(snapshot.entries.every(item => !('message' in item) && !('stack' in item)), 'runtime fault diagnostics must not retain free-form messages/stacks');

const index = read('index.html');
const sw = read('sw.js');
assert(index.includes('src/boot/runtime-fault-counters.js?v=1.6.94-release-integrity-hardening'), 'runtime fault counters must load from index');
assert(sw.includes('./src/boot/runtime-fault-counters.js?v=1.6.94-release-integrity-hardening'), 'runtime fault counters must be precached');

const perf = read('src/boot/performance-diagnostics.js');
assert(perf.includes('runtimeFaults = safeCall'), 'performance diagnostics must collect runtime fault counters');
assert(perf.includes("warnings.push('recoverable-runtime-faults')"), 'repeated recoverable faults must surface as a diagnostic warning');

const downloadService = read('src/download/download-service.js');
const incidentSupport = read('src/boot/incident-support-service.js');
const swUpdate = read('src/boot/service-worker-update-service.js');
assert(downloadService.includes("record?.('download-object-url', 'revoke-failed')"), 'download object URL cleanup failure must be counted');
assert(downloadService.includes('recoverableFaults: global.FoxBearRuntimeFaultCounters?.getSnapshot?.() || null'), 'download diagnostics must include fault counter snapshot');
assert(incidentSupport.includes("record?.('incident-storage', 'read-failed')") && incidentSupport.includes("record?.('incident-storage', 'write-failed')"), 'incident storage fallback failures must be counted');
assert(swUpdate.includes("record?.('service-worker', 'client-state-post-failed')"), 'service worker client state failures must be counted');

assert(pkg.qaChecks.includes('node qa/v1676_download_viewport_runtime_fault_diagnostics_smoke.js'), 'v1.6.94 smoke must be registered');
console.log('PASS v1.6.76 visual viewport download progress and runtime fault diagnostics smoke');
