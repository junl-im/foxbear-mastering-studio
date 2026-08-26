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
const firebase = read('src/firebase-bootstrap.js');
const reporter = read('src/boot/incident-reporter.js');
const supportSource = read('src/boot/incident-support-service.js');
const stateSource = read('src/boot/incident-state-service.js');
const routeSource = read('src/boot/incident-route-policy.js');
const policySource = read('src/boot/incident-recovery-policy.js');

assert.strictEqual(pkg.version, '1.7.0');
assert.match(pkg.foxbearRelease.buildId, /^[a-z0-9][a-z0-9-]*$/);
for (const file of ['src/boot/incident-route-policy.js', 'src/boot/incident-state-service.js']) {
  assert(handoff.requiredFiles.includes(file), `${file} missing from requiredFiles`);
  assert(handoff.requiredRuntimeAssets.includes(file), `${file} missing from requiredRuntimeAssets`);
  assert(sw.includes(`./${file}?v=`), `${file} missing from service worker core assets`);
}
const routeIndex = html.indexOf('src/boot/incident-route-policy.js');
const firebaseIndex = html.indexOf('src/firebase-bootstrap.js');
const supportIndex = html.indexOf('src/boot/incident-support-service.js');
const stateIndex = html.indexOf('src/boot/incident-state-service.js');
const recoveryIndex = html.indexOf('src/boot/incident-recovery-policy.js');
const reporterIndex = html.indexOf('src/boot/incident-reporter.js');
assert(routeIndex >= 0 && routeIndex < firebaseIndex, 'adaptive route policy must load before firebase bootstrap');
assert(supportIndex >= 0 && stateIndex > supportIndex && recoveryIndex > stateIndex && reporterIndex > recoveryIndex, 'incident state module load order invalid');
assert(html.includes('id="incidentTransportAdaptive"'), 'adaptive route status UI missing');
assert(reporter.includes('const stateStore = global.FoxBearIncidentState'), 'reporter must consume incident state service');
assert(!reporter.includes('const TEST_HISTORY_KEY'), 'test history storage ownership must be outside reporter');
assert(!reporter.includes('const DEPLOYMENT_READINESS_KEY'), 'readiness storage ownership must be outside reporter');
assert(firebase.includes("incidentRoutePolicy.shouldAttempt('callable')"), 'callable cooldown routing missing');
assert(firebase.includes("incidentRoutePolicy.recordSuccess('hosting-rewrite')"), 'hosting route recovery success tracking missing');
assert(firebase.includes('getIncidentRouteHealth'), 'public route health bridge missing');

const storage = new Map();
const sandbox = {
  console,
  Date,
  Math,
  Object,
  String,
  Number,
  Boolean,
  Array,
  Map,
  Set,
  RegExp,
  Error,
  navigator: { userAgent: 'Chrome Windows', platform: 'Win32' },
  localStorage: {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value))
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(supportSource, sandbox, { filename: 'incident-support-service.js' });
vm.runInContext(stateSource, sandbox, { filename: 'incident-state-service.js' });
vm.runInContext(routeSource, sandbox, { filename: 'incident-route-policy.js' });
vm.runInContext(policySource, sandbox, { filename: 'incident-recovery-policy.js' });

const state = sandbox.FoxBearIncidentState;
const route = sandbox.FoxBearIncidentRoutePolicy;
assert(state && route, 'new incident services must expose globals');
for (let index = 0; index < 7; index += 1) {
  const history = state.loadTestHistory();
  history.unshift({ at: new Date(1700000000000 + index * 1000).toISOString(), status: 'failed', reportId: `guest_${index}`, detail: `user${index}@example.com token=ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890` });
  state.saveTestHistory(history);
}
const history = state.loadTestHistory();
assert.strictEqual(history.length, 5, 'mail test history limit must remain five');
const persistedHistory = storage.get('foxbear-incident-reporter-v1:test-history');
assert(!persistedHistory.includes('@example.com'), 'mail history must redact email addresses');
assert(!persistedHistory.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'), 'mail history must redact credentials');
storage.set('foxbear-incident-reporter-v1:deployment-readiness', '{broken');
assert.strictEqual(state.loadDeploymentReadiness(), null, 'corrupt readiness state must fail closed');

const networkError = Object.assign(new Error('Failed to fetch'), { code: 'functions/unavailable' });
route.recordFailure('callable', networkError);
assert.strictEqual(route.shouldAttempt('callable'), true, 'first transient failure must not open circuit');
route.recordFailure('callable', networkError);
let health = route.getHealth();
assert.strictEqual(health.routes.callable.coolingDown, true, 'second transient failure must open callable cooldown');
assert.strictEqual(route.shouldAttempt('callable'), false, 'cooling route must be skipped');
route.recordSuccess('callable');
health = route.getHealth();
assert.strictEqual(health.routes.callable.coolingDown, false, 'success must close callable circuit');
assert.strictEqual(health.routes.callable.consecutiveTransientFailures, 0, 'success must reset failure streak');
route.recordFailure('hosting-rewrite', Object.assign(new Error('permission denied'), { code: 'functions/permission-denied' }));
assert.strictEqual(route.getHealth().routes['hosting-rewrite'].coolingDown, false, 'non-transient permission errors must not open circuit');

console.log('PASS v1.6.18 incident state service and adaptive route policy');
