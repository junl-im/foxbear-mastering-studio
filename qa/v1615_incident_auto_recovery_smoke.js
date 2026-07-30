#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const firebase = read('src/firebase-bootstrap.js');
const reporter = read('src/boot/incident-reporter.js');
const lifecycle = read('src/boot/incident-lifecycle-service.js');
const html = read('index.html');
const css = read('assets/css/components/support-settings.css');

assert.strictEqual(pkg.version, '1.6.40');
assert(firebase.includes("classification: 'client-offline'"), 'offline endpoint classification missing');
assert(firebase.includes("const opaqueResponse = await request('no-cors')"), 'opaque reachability fallback missing');
assert(firebase.includes("classification: 'endpoint-reachable-opaque'"), 'CORS-readable response distinction missing');
assert(firebase.includes("code: 'FOXBEAR_INCIDENT_CALLABLE_RESPONSE_BLOCKED'"), 'response-blocked error code missing');
assert(firebase.includes('corsReadable: false'), 'opaque endpoint response metadata missing');
assert(reporter.includes('const SERVICE_RECOVERY_DELAYS_MS = Object.freeze([5000, 15000, 45000]);'), 'bounded retry schedule missing');
assert(reporter.includes('function scheduleServiceRecovery'), 'automatic recovery scheduler missing');
assert(reporter.includes('async function runServiceAutoRecovery'), 'automatic recovery runner missing');
assert(reporter.includes('async function copyIncidentDiagnostics'), 'sanitized diagnostic copy action missing');
assert(reporter.includes('function buildSanitizedDiagnostics'), 'sanitized diagnostic builder missing');
assert(reporter.includes("'server-response-blocked'"), 'CORS response-blocked user state missing');
assert(lifecycle.includes("addEventListener?.('online'"), 'online lifecycle trigger missing');
assert(lifecycle.includes("addEventListener?.('offline'"), 'offline lifecycle trigger missing');
assert(reporter.includes('onOnline:') && reporter.includes('onOffline:'), 'reporter lifecycle recovery callbacks missing');
assert(reporter.includes('flushQueue().catch'), 'queued anonymous report retry missing');
assert(reporter.includes('serviceRecoveryAttempt'), 'recovery attempt state missing');
for (const id of ['incidentAutoRecoveryStatus', 'incidentAutoRecovery', 'incidentDiagnosticsCopy']) {
  assert(html.includes(`id="${id}"`), `${id} UI missing`);
}
assert(css.includes('.incident-auto-recovery-card'), 'auto recovery status styling missing');
assert(css.includes('#incidentDiagnosticsCopy'), 'diagnostic copy action styling missing');
assert(!reporter.includes('audioData') && !reporter.includes('localPath'), 'sanitized diagnostics must not introduce audio or local path fields');

console.log('PASS v1.6.15 self-healing anonymous incident diagnostics');
