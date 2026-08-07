#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const reporterSource = read('src/boot/incident-reporter.js');
const incidentRecoverySweepSource = read('src/boot/incident-recovery-sweep-service.js');
const incidentSupportSource = read('src/boot/incident-support-service.js');
const incidentStateSource = read('src/boot/incident-state-service.js');
const incidentRecoveryPolicySource = read('src/boot/incident-recovery-policy.js');
const incidentLocalQueueSource = read('src/boot/incident-local-queue-service.js');
const incidentQueueCoordinationSource = read('src/boot/incident-queue-coordination-service.js');
const incidentServiceDiagnosticsSource = read('src/boot/incident-service-diagnostics.js');
const incidentDiagnosticsViewSource = read('src/boot/incident-diagnostics-view-service.js');
const incidentSubmissionIdentitySource = read('src/boot/incident-submission-identity-service.js');
const incidentControlsViewSource = read('src/boot/incident-controls-view-service.js');
const firebaseSource = read('src/firebase-bootstrap.js');
const functionsSource = read('functions/index.js');
const handoff = read('HANDOFF.md');

assert.strictEqual(pkg.version, '1.6.74');
assert(/^[a-z0-9][a-z0-9-]*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current build ID is invalid');
assert(pkg.qaChecks.length >= 333);
assert(firebaseSource.includes('FOXBEAR_INCIDENT_READINESS_CONTRACT_INVALID'));
assert(firebaseSource.includes('requiredCheckKeys.every'));
assert(functionsSource.includes('function isIncidentReadinessResultComplete'));
assert(functionsSource.includes('isIncidentReadinessResultComplete(previous?.result)'));
for (const heading of ['1. 작업한 내역', '2. 다운로드 파일 2종', '3. 다음 예정 내역']) assert(handoff.includes(heading));

const memory = new Map();
const events = [];
const origin = 'https://asia-northeast3-foxbear-music.cloudfunctions.net';
let cspContent = `default-src 'self'; connect-src 'self' ${origin};`;
let readinessCalls = 0;
class CustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}
const makeElement = tag => ({
  tagName: String(tag || '').toUpperCase(), dataset: {}, style: {}, hidden: false, textContent: '', value: '', children: [],
  setAttribute() {}, removeAttribute() {}, select() {}, remove() {}, append(...items) { this.children.push(...items); }, appendChild(item) { this.children.push(item); return item; },
  replaceChildren(...items) { this.children = items; }, querySelector() { return null; }, closest() { return null; }, addEventListener() {}
});
const sandbox = {
  console, Date, Math, Object, String, Number, Boolean, Array, Map, Set, RegExp, Error, URL, CustomEvent,
  setTimeout, clearTimeout,
  navigator: { userAgent: 'Chrome', language: 'ko-KR', onLine: true, clipboard: { writeText: async () => {} } },
  location: { pathname: '/', origin: 'https://foxbear-music.web.app' }, innerWidth: 1280, innerHeight: 720,
  localStorage: {
    getItem: key => memory.has(key) ? memory.get(key) : null,
    setItem: (key, value) => memory.set(key, String(value))
  },
  document: {
    body: { dataset: { build: '1.6.74' }, appendChild() {} }, visibilityState: 'visible',
    getElementById: () => null,
    querySelector(selector) {
      if (selector === 'meta[http-equiv="Content-Security-Policy"]') return { getAttribute: () => cspContent };
      return null;
    },
    addEventListener() {}, createElement: makeElement, execCommand: () => true
  },
  addEventListener() {}, removeEventListener() {}, dispatchEvent(event) { events.push(event); return true; },
  FoxBearBuildInfo: { productVersion: '1.6.74', assetVersion: '1.6.74-incident-admission-spark-retention-download-memory' }
};
const completeRemote = () => {
  const checkedAt = new Date().toISOString();
  return {
    ok: true,
    cached: false,
    checkedAt,
    lastHealthyAt: checkedAt,
    nextCheckAt: new Date(Date.now() + 60000).toISOString(),
    service: { status: 'ready', productVersion: '1.6.74', functionsOrigin: origin },
    checks: {
      functions: { ok: true, status: 'ready', message: 'functions ok' },
      firestore: { ok: true, status: 'ready', message: 'firestore ok' },
      smtpSecret: { ok: true, status: 'ready', message: 'secret ok' },
      smtpConnection: { ok: true, status: 'ready', message: 'smtp ok' }
    }
  };
};
sandbox.FoxBearFirebase = {
  ready: true,
  incidentFunctionsOrigin: origin,
  logIncident: async () => ({ queued: true }),
  getIncidentDelivery: async () => ({ status: 'failed' }),
  checkIncidentDeploymentReadiness: async () => {
    readinessCalls += 1;
    return completeRemote();
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(incidentSupportSource, sandbox, { filename: 'incident-support-service.js' });
vm.runInContext(incidentStateSource, sandbox, { filename: 'incident-state-service.js' });

vm.runInContext(incidentRecoveryPolicySource, sandbox, { filename: 'incident-recovery-policy.js' });

vm.runInContext(incidentRecoverySweepSource, sandbox, { filename: 'incident-recovery-sweep-service.js' });
vm.runInContext(incidentLocalQueueSource, sandbox, { filename: 'incident-local-queue-service.js' });
vm.runInContext(incidentQueueCoordinationSource, sandbox, { filename: 'incident-queue-coordination-service.js' });
vm.runInContext(incidentServiceDiagnosticsSource, sandbox, { filename: 'incident-service-diagnostics.js' });
vm.runInContext(incidentDiagnosticsViewSource, sandbox, { filename: 'incident-diagnostics-view-service.js' });
vm.runInContext(incidentSubmissionIdentitySource, sandbox, { filename: 'incident-submission-identity-service.js' });
vm.runInContext(incidentControlsViewSource, sandbox, { filename: 'incident-controls-view-service.js' });
vm.runInContext(reporterSource, sandbox, { filename: 'incident-reporter.js' });
const reporter = sandbox.FoxBearIncidentReporter;

(async () => {
  assert.strictEqual(reporter.inspectClientCsp(`${origin}/`).ok, true, 'trailing slash should normalize to the same origin');
  cspContent = `connect-src 'self' ${origin}.evil.example;`;
  assert.strictEqual(reporter.inspectClientCsp(origin).ok, false, 'substring CSP matches must not pass');
  cspContent = `default-src 'self'; connect-src 'self' ${origin};`;

  const malformed = completeRemote();
  delete malformed.checks.smtpConnection;
  const normalizedMalformed = reporter.normalizeDeploymentReadinessSnapshot({
    ...malformed,
    checks: { ...malformed.checks, csp: reporter.inspectClientCsp(origin) }
  });
  assert.strictEqual(normalizedMalformed.ok, false, 'missing required check must fail closed');
  assert.strictEqual(normalizedMalformed.contractValid, false);
  assert.strictEqual(normalizedMalformed.checks.functions.code, 'FOXBEAR_INCIDENT_READINESS_CONTRACT_INVALID');

  const first = await reporter.runDeploymentSelfCheck();
  assert.strictEqual(first.ok, true);
  assert.strictEqual(readinessCalls, 1);
  const second = await reporter.runDeploymentSelfCheck();
  assert.strictEqual(second.ok, true);
  assert.strictEqual(second.localCached, true);
  assert.strictEqual(readinessCalls, 1, 'local cooldown must avoid another SMTP readiness request');
  const history = reporter.loadDeploymentHistory();
  assert.strictEqual(history.length, 1, 'same checkedAt must update rather than duplicate');
  assert.strictEqual(history[0].cached, true, 'local cache reuse must be reflected in history');

  memory.set('foxbear-incident-reporter-v1:deployment-history', JSON.stringify([null, 'bad', { checkedAt: 'not-a-date' }, history[0]]));
  const recoveredHistory = reporter.loadDeploymentHistory();
  assert.strictEqual(recoveredHistory.length, 1, 'corrupt history entries must be ignored safely');
  assert.strictEqual(recoveredHistory[0].checkedAt, history[0].checkedAt);

  const statusEvents = events.filter(event => event.type === 'foxbear:incident-status-change');
  assert(statusEvents.length >= 2);
  console.log('PASS v1.6.10 readiness contract, exact CSP origin, cache history, and corrupt-storage hardening');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
