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
const performanceSource = read('src/boot/performance-diagnostics.js');
const orchestratorSource = read('src/audio/mastering-orchestrator-service.js');
const hudSource = read('src/ui/bulk-import-hud-view.js');
const handoff = read('HANDOFF.md');

assert(/^1\.(?:6|[7-9]|[1-9]\d+)\.\d+$/.test(pkg.version));
assert(/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(pkg.foxbearRelease.buildId));
assert(pkg.scripts['deploy:incident'].includes('functions:checkIncidentDeploymentReadiness'));
assert(pkg.qaChecks.length >= 330);
assert(html.includes('id="incidentDeploymentCheck"'));
assert(html.includes('id="incidentDeploymentChecks"'));
for (const key of ['csp', 'functions', 'firestore', 'mailRouting', 'smtpSecret', 'smtpConnection']) assert(html.includes(`data-deploy-check="${key}"`));
assert(css.includes('.incident-deployment-checks'));
assert(css.includes('.incident-deployment-check-button'));
assert(/const INCIDENT_SERVICE_SCHEMA_VERSION = [5-9]\d*/.test(functionsSource));
assert(functionsSource.includes('exports.checkIncidentDeploymentReadiness = onCall'));
assert(functionsSource.includes('async function inspectIncidentDeploymentReadiness'));
assert(functionsSource.includes("readinessCheck: 'checkIncidentDeploymentReadiness'"));
assert(functionsSource.includes('userRetryAvailableAt:'));
assert(firebaseSource.includes("invokeIncidentCallable('checkIncidentDeploymentReadiness'"));
assert(firebaseSource.includes('function normalizeDeploymentReadiness'));
assert(reporterSource.includes('async function refreshTestHistoryFromServer'));
assert(reporterSource.includes('async function runDeploymentSelfCheck'));
assert(reporterSource.includes('function getHistoryRetryAvailability'));
assert(performanceSource.includes('recoveryRequired: AMBIENT_RECOVERY_CONFIRM_SAMPLES'));
assert(orchestratorSource.includes('performanceRecoverySamples'));
assert(hudSource.includes('function performanceHoldLabel'));
assert(hudSource.includes('정상화 확인'));
assert(handoff.startsWith(`# Handoff - v${pkg.version}`));

const memory = new Map();
const now = Date.now();
const deliveryById = new Map();
const cspContent = "default-src 'self'; connect-src 'self' https://asia-northeast3-foxbear-music.cloudfunctions.net";
const reporterSandbox = {
  console, Date, Math, Object, String, Number, Boolean, Array, Map, Set, RegExp, Error,
  setTimeout, clearTimeout,
  navigator: { userAgent: 'Chrome', language: 'ko-KR', onLine: true },
  location: { pathname: '/' }, innerWidth: 1280, innerHeight: 720,
  localStorage: { getItem: key => memory.has(key) ? memory.get(key) : null, setItem: (key, value) => memory.set(key, String(value)) },
  document: {
    body: { dataset: { build: '1.7.0' } }, visibilityState: 'visible',
    getElementById: () => null,
    querySelector(selector) {
      if (selector === 'meta[http-equiv="Content-Security-Policy"]') return { getAttribute: () => cspContent };
      return null;
    },
    addEventListener() {}, createElement: () => ({ setAttribute() {}, style: {}, select() {}, remove() {} })
  },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  FoxBearBuildInfo: { productVersion: '1.7.0', assetVersion: '1.7.0-adaptive-mastering-decision-phase1' }
};
reporterSandbox.FoxBearFirebase = {
  ready: true,
  incidentFunctionsOrigin: 'https://asia-northeast3-foxbear-music.cloudfunctions.net',
  logIncident: async () => ({ queued: true }),
  getIncidentDelivery: async reportId => deliveryById.get(reportId) || { status: 'failed' },
  checkIncidentDeploymentReadiness: async () => ({
    ok: true,
    checkedAt: new Date().toISOString(),
    service: { productVersion: '1.7.0', functionsOrigin: 'https://asia-northeast3-foxbear-music.cloudfunctions.net' },
    checks: {
      functions: { ok: true, status: 'ready', message: 'functions ok' },
      firestore: { ok: true, status: 'ready', message: 'firestore ok' },
      smtpSecret: { ok: true, status: 'ready', message: 'secret ok' },
      smtpConnection: { ok: true, status: 'ready', message: 'smtp ok' }
    }
  })
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
const availability = reporter.getHistoryRetryAvailability({
  reportId: 'uid_test', status: 'smtp-auth-failed', userRetryCount: 1, userRetryLimit: 2,
  userRetryAvailableAt: new Date(now + 30000).toISOString()
}, now);
assert.strictEqual(availability.visible, true);
assert.strictEqual(availability.ready, false);
assert.strictEqual(availability.remainingSeconds, 30);
assert.strictEqual(reporter.inspectClientCsp('https://asia-northeast3-foxbear-music.cloudfunctions.net').ok, true);
reporter.appendTestHistory('smtp-network-failed', {
  result: { reportId: 'uid_retry_test' },
  delivery: {
    attemptCount: 1, nextRetryAt: new Date(now + 1000).toISOString(), userRetryCount: 1, userRetryLimit: 2,
    userRetryRequestedAt: new Date(now - 30000).toISOString(), userRetryAvailableAt: new Date(now + 30000).toISOString()
  }
}, 'SMTP 연결 실패');
deliveryById.set('uid_retry_test', {
  status: 'emailed', attemptCount: 2, terminal: false, messageId: 'message-auto-retry',
  userRetryCount: 1, userRetryLimit: 2, checkedAt: new Date().toISOString()
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
      FieldValue: { serverTimestamp: () => ({}), delete: () => ({}) },
      Timestamp: { fromMillis: value => ({ toMillis: () => value, toDate: () => new Date(value) }) },
      getFirestore: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: false }), set: async () => true }) }) })
    };
    if (request === 'nodemailer') return { createTransport: () => ({ verify: async () => true, sendMail: async () => ({}), close() {} }) };
    if (request === 'node:crypto') return { randomUUID: () => '00000000-0000-4000-8000-000000000000' };
    if (request === './app-check-policy') return require(path.join(root, 'functions/app-check-policy.js'));
    throw new Error(`unexpected require: ${request}`);
  }
};
vm.runInNewContext(functionsSource, functionSandbox, { filename: 'functions/index.js' });
const readinessCallable = moduleRecord.exports.checkIncidentDeploymentReadiness;
assert(readinessCallable && typeof readinessCallable.handler === 'function');

(async () => {
  await reporter.refreshTestHistoryFromServer();
  const synced = reporter.loadTestHistory()[0];
  assert.strictEqual(synced.status, 'emailed');
  assert.strictEqual(synced.attemptCount, 2);
  assert.strictEqual(synced.messageId, 'message-auto-retry');
  const readiness = await reporter.runDeploymentSelfCheck();
  assert.strictEqual(readiness.ok, true);
  assert.strictEqual(readiness.checks.csp.ok, true);

  const serverReadiness = await readinessCallable.handler({ auth: { uid: 'guest-1' }, app: null });
  assert.strictEqual(serverReadiness.ok, true);
  assert.strictEqual(serverReadiness.scope, 'public');
  assert.strictEqual(serverReadiness.sensitiveChecksRestricted, true);
  assert.strictEqual(serverReadiness.checks.firestore.ok, true);
  assert.strictEqual(serverReadiness.checks.smtpSecret.ok, true);
  assert.strictEqual(serverReadiness.checks.smtpSecret.restricted, true);
  assert.strictEqual(serverReadiness.checks.smtpConnection.ok, true);
  assert.strictEqual(serverReadiness.checks.smtpConnection.restricted, true);
  assert(serverReadiness.service.serviceSchemaVersion >= 5);

  const listeners = new Map();
  const pauseEvents = [];
  const starts = [];
  const perfSandbox = {
    window: null, console, AbortController, setTimeout, clearTimeout,
    addEventListener(name, handler) { listeners.set(name, handler); }
  };
  perfSandbox.window = perfSandbox;
  vm.runInNewContext(orchestratorSource, perfSandbox, { filename: 'mastering-orchestrator-service.js' });
  const runner = perfSandbox.FoxBearMasteringOrchestratorService.createMasteringBatchRunner({
    beginHudBatch: items => ({ batchId: `v1607-${items.length}` }),
    onPauseChanged: meta => pauseEvents.push(meta),
    onTrackStart: track => starts.push(track.id),
    masterTrack: () => new Promise(resolve => setTimeout(() => resolve(true), 35))
  });
  const running = runner.runBatch([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  await new Promise(resolve => setTimeout(resolve, 6));
  listeners.get('foxbear:ambient-health-change')({ detail: {
    level: 'danger', measuredLevel: 'danger', warnings: ['worker-stalled'],
    confirmation: { recoverySamples: 0, recoveryRequired: 2 }
  } });
  let snapshot = runner.getActiveBatchSnapshot();
  assert.strictEqual(snapshot.autoPaused, true);
  assert.strictEqual(snapshot.performanceWarnings[0], 'worker-stalled');
  await new Promise(resolve => setTimeout(resolve, 45));
  assert.deepStrictEqual(starts, ['a']);
  listeners.get('foxbear:ambient-health-change')({ detail: {
    level: 'danger', measuredLevel: 'normal', warnings: [],
    confirmation: { recoverySamples: 1, recoveryRequired: 2 }
  } });
  snapshot = runner.getActiveBatchSnapshot();
  assert.strictEqual(snapshot.performanceMeasuredLevel, 'normal');
  assert.strictEqual(snapshot.performanceRecoverySamples, 1);
  assert.strictEqual(snapshot.autoPaused, true);
  listeners.get('foxbear:ambient-health-change')({ detail: {
    level: 'normal', measuredLevel: 'normal', warnings: [],
    confirmation: { recoverySamples: 2, recoveryRequired: 2 }
  } });
  const result = await running;
  assert.strictEqual(result.completed, 3);
  assert.deepStrictEqual(starts, ['a', 'b', 'c']);
  assert(pauseEvents.some(event => event.paused && event.autoPaused));
  assert(pauseEvents.some(event => !event.paused && event.reason === 'performance-recovered'));
  console.log('PASS v1.6.7 deployment readiness, live mail history sync, retry cooldown, and performance recovery HUD');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
