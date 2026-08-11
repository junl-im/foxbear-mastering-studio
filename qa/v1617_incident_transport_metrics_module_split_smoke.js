#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const handoff = JSON.parse(read('HANDOFF_PACKAGE.json'));
const html = read('index.html');
const sw = read('sw.js');
const reporter = read('src/boot/incident-reporter.js');
const supportSource = read('src/boot/incident-support-service.js');
const policySource = read('src/boot/incident-recovery-policy.js');
const css = read('assets/css/components/support-settings.css');

assert.strictEqual(pkg.version, '1.6.89');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain kebab-case');
for (const file of ['src/boot/incident-support-service.js', 'src/boot/incident-recovery-policy.js']) {
  assert(handoff.requiredFiles.includes(file), `${file} missing from requiredFiles`);
  assert(handoff.requiredRuntimeAssets.includes(file), `${file} missing from requiredRuntimeAssets`);
  assert(sw.includes(`./${file}?v=`), `${file} missing from service-worker core assets`);
}

const supportIndex = html.indexOf('src/boot/incident-support-service.js');
const policyIndex = html.indexOf('src/boot/incident-recovery-policy.js');
const reporterIndex = html.indexOf('src/boot/incident-reporter.js');
assert(supportIndex >= 0 && policyIndex > supportIndex && reporterIndex > policyIndex, 'incident modules must load before the reporter');
for (const id of ['incidentTransportMetricsClear', 'incidentTransportSummary', 'incidentTransportRoutes', 'incidentTransportQueue']) {
  assert(html.includes(`id="${id}"`), `${id} UI missing`);
}
assert(css.includes('.incident-transport-metrics-card'), 'transport metrics styling missing');
assert(reporter.includes('const support = global.FoxBearIncidentSupport'), 'reporter must consume the support module');
assert(reporter.includes('const recoveryPolicy = global.FoxBearIncidentRecoveryPolicy'), 'reporter must consume the recovery policy module');
assert(!reporter.includes('function classifyMailTestFailure('), 'classification implementation should be outside the reporter');
assert(!reporter.includes('function redactSensitiveText('), 'sanitizer implementation should be outside the reporter');
assert(reporter.includes("recordTransport({ phase: 'incident-submit'"), 'submission transport metrics missing');
assert(reporter.includes("recordQueueResult(result)"), 'queue recovery metrics missing');
assert(reporter.includes('transportMetrics: getTransportMetrics()'), 'sanitized diagnostics/status metrics missing');

const storage = new Map();
const sandbox = {
  console,
  navigator: { userAgent: 'Mozilla/5.0 Chrome/120.0 Windows NT 10.0', platform: 'Win32' },
  localStorage: {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value))
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(supportSource, sandbox);
vm.runInContext(policySource, sandbox);
const support = sandbox.FoxBearIncidentSupport;
const policy = sandbox.FoxBearIncidentRecoveryPolicy;
assert(support && policy, 'incident support modules must expose globals');

support.recordTransportOutcome({ phase: 'service-status', ok: true, transport: 'callable' });
support.recordTransportOutcome({ phase: 'incident-submit', ok: true, transport: 'hosting-rewrite' });
support.recordTransportOutcome({ phase: 'incident-submit', ok: true, transport: 'firestore' });
support.recordTransportOutcome({ phase: 'incident-submit', ok: false, transport: 'unresolved', code: 'failed user@example.com token=ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890' });
support.recordQueueRecovery({ ok: false, delivered: 2, remaining: 1, code: 'queue-partial' });
let metrics = support.getTransportMetrics();
assert.strictEqual(metrics.totalAttempts, 4);
assert.strictEqual(metrics.successful, 3);
assert.strictEqual(metrics.failed, 1);
assert.strictEqual(metrics.fallbackSuccessful, 2);
assert.strictEqual(metrics.byTransport.callable.successful, 1);
assert.strictEqual(metrics.byTransport['hosting-rewrite'].successful, 1);
assert.strictEqual(metrics.byTransport.firestore.successful, 1);
assert.strictEqual(metrics.queueRecovered, 2);
assert.strictEqual(metrics.queueRemaining, 1);
const persisted = storage.get('foxbear-incident-reporter-v1:transport-metrics');
assert(!persisted.includes('user@example.com'), 'transport metrics must redact email addresses');
assert(!persisted.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'), 'transport metrics must redact long credentials');
assert(!/audioData|fileName|localPath/i.test(persisted), 'transport metrics must remain metadata-only');

storage.set('foxbear-incident-reporter-v1:transport-metrics', '{broken');
metrics = support.getTransportMetrics();
assert.strictEqual(metrics.totalAttempts, 0, 'corrupt metrics must fail closed to an empty snapshot');
assert.strictEqual(policy.classify('', 'functions/not-found', ''), 'server-api-not-deployed');
assert.strictEqual(policy.classify('', 'functions/internal', ''), 'server-api-internal');
assert.strictEqual(policy.classify('', 'FOXBEAR_INCIDENT_CALLABLE_NETWORK_BLOCKED', ''), 'server-network-blocked');
assert(policy.getActionPlan('smtp-auth-failed').actions.includes('mail-test'), 'SMTP authentication recovery action missing');

console.log('PASS v1.6.17 incident transport metrics and module split');
