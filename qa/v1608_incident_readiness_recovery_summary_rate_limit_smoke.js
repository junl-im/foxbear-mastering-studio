#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const html = read('index.html');
const css = read('assets/css/components/support-settings.css');
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
const appSource = read('src/app.js');
const handoff = read('HANDOFF.md');

assert.strictEqual(pkg.version, '1.6.99');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.foxbearRelease.buildId), 'current build id must remain valid kebab-case');
assert(pkg.qaChecks.length >= 331, 'v1.6.8 readiness contract must remain in the cumulative QA set');
assert(html.includes('id="incidentDeploymentMeta"'));
assert.strictEqual((html.match(/data-deploy-recovery/g) || []).length, 5);
assert(css.includes('readiness recovery, cache status, and mobile summary polish'));
assert(css.includes("data-incident-tone='danger'"));
assert(incidentStateSource.includes('const DEPLOYMENT_READINESS_KEY'));
assert(reporterSource.includes('function deploymentRecoveryInfo'));
assert(reporterSource.includes('function getSettingsSummary'));
assert(reporterSource.includes('function getDeploymentCheckAvailability'));
assert(firebaseSource.includes('lastHealthyAt: limitText'));
assert(functionsSource.includes("const INCIDENT_READINESS_COLLECTION = 'incidentDeploymentReadiness'"));
assert(functionsSource.includes('const INCIDENT_READINESS_COOLDOWN_MS = 60 * 1000'));
assert(functionsSource.includes('cached: true'));
assert(functionsSource.includes('lastHealthyAt: timestampToIso'));
assert(functionsSource.includes('const INCIDENT_SERVICE_SCHEMA_VERSION = 7'));
assert(appSource.includes("getSettingsSummary?.().label"));
assert(handoff.startsWith('# Handoff - v1.6.99'));

const memory = new Map();
let readinessCalls = 0;
const origin = 'https://asia-northeast3-foxbear-music.cloudfunctions.net';
const reporterSandbox = {
  console, Date, Math, Object, String, Number, Boolean, Array, Map, Set, RegExp, Error,
  setTimeout, clearTimeout,
  navigator: { userAgent: 'Chrome', language: 'ko-KR', onLine: true },
  location: { pathname: '/' }, innerWidth: 1280, innerHeight: 720,
  localStorage: { getItem: key => memory.has(key) ? memory.get(key) : null, setItem: (key, value) => memory.set(key, String(value)) },
  document: {
    body: { dataset: { build: '1.6.99' } }, visibilityState: 'visible',
    getElementById: () => null,
    querySelector(selector) {
      if (selector === 'meta[http-equiv="Content-Security-Policy"]') return { getAttribute: () => `connect-src 'self' ${origin}` };
      return null;
    },
    addEventListener() {}, createElement: () => ({ setAttribute() {}, style: {}, select() {}, remove() {} })
  },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  FoxBearBuildInfo: { productVersion: '1.6.99', assetVersion: '1.6.99-header-role-focus-integrity' }
};
reporterSandbox.FoxBearFirebase = {
  ready: true,
  incidentFunctionsOrigin: origin,
  logIncident: async () => ({ queued: true }),
  getIncidentDelivery: async () => ({ status: 'failed' }),
  checkIncidentDeploymentReadiness: async () => {
    readinessCalls += 1;
    const checkedAt = new Date().toISOString();
    return {
      ok: true, cached: false, scope: 'public', sensitiveChecksRestricted: true, checkedAt, lastHealthyAt: checkedAt,
      nextCheckAt: new Date(Date.now() + 60000).toISOString(),
      service: { status: 'ready', productVersion: '1.6.99', functionsOrigin: origin },
      checks: {
        functions: { ok: true, status: 'ready', message: 'functions ok' },
        firestore: { ok: true, status: 'ready', message: 'firestore ok' },
        smtpSecret: { ok: true, status: 'restricted', restricted: true, message: 'admin only' },
        smtpConnection: { ok: true, status: 'restricted', restricted: true, message: 'admin only' }
      }
    };
  }
};
reporterSandbox.window = reporterSandbox;
reporterSandbox.globalThis = reporterSandbox;
vm.createContext(reporterSandbox);
vm.runInContext(incidentSupportSource, reporterSandbox, { filename: 'incident-support-service.js' });
vm.runInContext(incidentStateSource, reporterSandbox, { filename: 'incident-state-service.js' });

vm.runInContext(incidentRecoveryPolicySource, reporterSandbox, { filename: 'incident-recovery-policy.js' });

vm.runInContext(incidentRecoverySweepSource, reporterSandbox, { filename: 'incident-recovery-sweep-service.js' });
vm.runInContext(incidentLocalQueueSource, reporterSandbox, { filename: 'incident-local-queue-service.js' });
vm.runInContext(incidentQueueCoordinationSource, reporterSandbox, { filename: 'incident-queue-coordination-service.js' });
vm.runInContext(incidentServiceDiagnosticsSource, reporterSandbox, { filename: 'incident-service-diagnostics.js' });
vm.runInContext(incidentDiagnosticsViewSource, reporterSandbox, { filename: 'incident-diagnostics-view-service.js' });
vm.runInContext(incidentSubmissionIdentitySource, reporterSandbox, { filename: 'incident-submission-identity-service.js' });
vm.runInContext(incidentControlsViewSource, reporterSandbox, { filename: 'incident-controls-view-service.js' });
vm.runInContext(reporterSource, reporterSandbox, { filename: 'incident-reporter.js' });
const reporter = reporterSandbox.FoxBearIncidentReporter;

const firestoreDocs = new Map();
let smtpVerifyCount = 0;
const timestamp = value => ({ toMillis: () => value, toDate: () => new Date(value) });
const makeDoc = (collection, id) => ({
  async get() {
    const value = firestoreDocs.get(`${collection}/${id}`);
    return { exists: value !== undefined, data: () => value };
  },
  async set(value, options = {}) {
    const key = `${collection}/${id}`;
    const previous = firestoreDocs.get(key) || {};
    firestoreDocs.set(key, options.merge ? { ...previous, ...value } : value);
  }
});
const moduleRecord = { exports: {} };
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const functionSandbox = {
  module: moduleRecord, exports: moduleRecord.exports, console, Date, Math, Object, String, Number, Boolean,
  Array, Map, Set, RegExp, Error, URL, AbortController, setTimeout, clearTimeout,
  fetch: async () => ({ ok: true, status: 204, headers: { get: () => null }, text: async () => '' }),
  process: { env: {} },
  require(request) {
    if (request === 'firebase-functions/v2/firestore') return { onDocumentCreated: (options, handler) => ({ options, handler }) };
    if (request === 'firebase-functions/v2/scheduler') return { onSchedule: (options, handler) => ({ options, handler }) };
    if (request === 'firebase-functions/v2/https') return { onCall: (options, handler) => ({ options, handler }), HttpsError };
    if (request === 'firebase-functions/params') return { defineSecret: () => ({ value: () => 'abcd efgh ijkl mnop' }) };
    if (request === 'firebase-admin/app') return { initializeApp() {} };
    if (request === 'firebase-admin/firestore') return {
      FieldValue: { serverTimestamp: () => timestamp(Date.now()), delete: () => ({}) },
      Timestamp: { fromMillis: timestamp },
      getFirestore: () => ({ collection: name => ({ doc: id => makeDoc(name, id) }) })
    };
    if (request === 'nodemailer') return { createTransport: () => ({ verify: async () => { smtpVerifyCount += 1; return true; }, sendMail: async () => ({}), close() {} }) };
    if (request === 'node:crypto') return { randomUUID: () => '00000000-0000-4000-8000-000000000000' };
    if (request === './app-check-policy') return require(path.join(root, 'functions/app-check-policy.js'));
    throw new Error(`unexpected require: ${request}`);
  }
};
vm.runInNewContext(functionsSource, functionSandbox, { filename: 'functions/index.js' });
const readinessCallable = moduleRecord.exports.checkIncidentDeploymentReadiness;
assert(readinessCallable && typeof readinessCallable.handler === 'function');

(async () => {
  const first = await reporter.runDeploymentSelfCheck();
  const second = await reporter.runDeploymentSelfCheck();
  assert.strictEqual(first.ok, true);
  assert.strictEqual(second.localCached, true);
  assert.strictEqual(readinessCalls, 1);
  assert.strictEqual(reporter.loadDeploymentReadiness().ok, true);
  assert.strictEqual(reporter.getSettingsSummary().label, '기본 정상');
  reporter.saveDeploymentReadiness({ ...first, checkedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), nextCheckAt: '' });
  assert.strictEqual(reporter.getSettingsSummary().label, '재확인');
  reporter.saveDeploymentReadiness(first);
  assert.strictEqual(reporter.getDeploymentCheckAvailability(first).ready, false);
  assert(reporter.deploymentRecoveryInfo('smtpSecret', { ok: false }).message.includes('FIREBASE_SETUP.md'));
  reporter.saveDeploymentReadiness({ ok: false, checkedAt: new Date().toISOString(), nextCheckAt: new Date(Date.now() + 60000).toISOString(), checks: {} });
  assert.strictEqual(reporter.getSettingsSummary().label, '확인 필요');

  const serverFirst = await readinessCallable.handler({ auth: { uid: 'guest-1608-a', token: { firebase: { sign_in_provider: 'anonymous' } } }, app: null, data: {} });
  const serverSecond = await readinessCallable.handler({ auth: { uid: 'guest-1608-b', token: { firebase: { sign_in_provider: 'anonymous' } } }, app: null, data: {} });
  assert.strictEqual(serverFirst.cached, false);
  assert.strictEqual(serverSecond.cached, true);
  assert.strictEqual(serverFirst.ok, true);
  assert.strictEqual(serverSecond.ok, true);
  assert.strictEqual(serverFirst.scope, 'public');
  assert.strictEqual(serverFirst.sensitiveChecksRestricted, true);
  assert.strictEqual(serverFirst.checks.smtpSecret.restricted, true);
  assert.strictEqual(serverFirst.checks.smtpConnection.restricted, true);
  assert.strictEqual(smtpVerifyCount, 0);
  assert(firestoreDocs.has('incidentDeploymentReadiness/public'));
  assert(!firestoreDocs.has('incidentDeploymentReadiness/guest-1608-a'));
  assert(!firestoreDocs.has('incidentDeploymentReadiness/guest-1608-b'));
  assert(serverFirst.lastHealthyAt);
  assert(serverFirst.nextCheckAt);
  assert.strictEqual(serverFirst.service.serviceSchemaVersion, 7);
  console.log('PASS v1.6.8 incident readiness recovery guidance, cached rate limit, last healthy state, and settings summary');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
