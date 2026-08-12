#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
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
const handoff = read('HANDOFF.md');

assert.strictEqual(pkg.version, '1.6.93');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.foxbearRelease.buildId), 'release build ID must remain valid kebab-case');
assert(html.includes('id="incidentServiceRetry"'));
assert(html.includes('id="incidentDeployCopy"'));
assert(html.includes('id="incidentReportingHistory"'));
assert(html.includes('id="incidentHistoryClear"'));
assert(css.includes('.incident-history li[data-state=\'error\']'));
assert(incidentStateSource.includes("const MAX_TEST_HISTORY = 5"));
assert(reporterSource.includes("const DEPLOY_COMMAND = 'npm run deploy:incident'"));
assert(reporterSource.includes('async function copyDeployCommand'));
assert(reporterSource.includes('appendTestHistory(status, result, finalMessage)'));
assert(firebaseSource.includes("smtpCredential: limitText(value.smtpCredential || '', 40)"));
assert(firebaseSource.includes("code: limitText(delivery.code || '', 80)"));
assert(/const INCIDENT_SERVICE_SCHEMA_VERSION = [3-9][0-9]*;/.test(functionsSource), 'incident service schema must preserve v3+ mail diagnostics');
assert(functionsSource.includes("smtpProvider: 'gmail'"));
assert(functionsSource.includes("smtpCredential: 'firebase-secret'"));
assert(functionsSource.includes('const classifiedError = classifySmtpError(outcome.error);'));
assert(handoff.startsWith('# Handoff - v1.6.93'));

const memory = new Map();
const localStorage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value))
};
let copied = '';
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  navigator: {
    userAgent: 'Chrome', language: 'ko-KR', onLine: true,
    clipboard: { writeText: async value => { copied = value; } }
  },
  location: { pathname: '/' },
  innerWidth: 1280,
  innerHeight: 720,
  document: {
    body: { dataset: { build: '1.6.93' } },
    visibilityState: 'visible',
    getElementById: () => null,
    addEventListener() {},
    createElement: () => ({ setAttribute() {}, style: {}, select() {}, remove() {} })
  },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, localStorage,
  FoxBearBuildInfo: { productVersion: '1.6.93', assetVersion: '1.6.93-mobile-dock-visibility-integrity-recovery' }
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
assert.strictEqual(reporter.classifyMailTestFailure('failed', 'FOXBEAR_GMAIL_SECRET_INVALID', ''), 'smtp-secret-invalid');
assert.strictEqual(reporter.classifyMailTestFailure('failed', 'EAUTH', '535 bad credentials'), 'smtp-auth-failed');
assert.strictEqual(reporter.classifyMailTestFailure('failed', 'EENVELOPE', '550 recipient rejected'), 'smtp-recipient-rejected');
assert.strictEqual(reporter.classifyMailTestFailure('failed', '454', 'quota exceeded'), 'smtp-rate-limited');
assert.strictEqual(reporter.classifyMailTestFailure('failed', 'ETIMEDOUT', 'smtp timeout'), 'smtp-network-failed');
for (let index = 0; index < 7; index += 1) {
  reporter.appendTestHistory(index === 0 ? 'emailed' : 'smtp-auth-failed', {
    result: { reportId: `guest_report_${index}` },
    delivery: { messageId: index === 0 ? 'message-1' : '' }
  }, `test result ${index}`);
}
const history = reporter.loadTestHistory();
assert.strictEqual(history.length, 5);
assert.strictEqual(history[0].reportId, 'guest_report_6');
assert.strictEqual(history[4].reportId, 'guest_report_2');

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
    if (request === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => ({}), delete: () => ({}) }, Timestamp: { fromMillis: value => ({ toMillis: () => value }) }, getFirestore: () => ({ collection: () => ({}) }) };
    if (request === 'nodemailer') return { createTransport: () => ({ verify: async () => true, sendMail: async () => ({}), close() {} }) };
    if (request === 'node:crypto') return { randomUUID: () => '00000000-0000-4000-8000-000000000000' };
    if (request === './app-check-policy') return require(path.join(root, 'functions/app-check-policy.js'));
    throw new Error(`unexpected require: ${request}`);
  }
};
vm.runInNewContext(functionsSource, functionSandbox, { filename: 'functions/index.js' });
const test = moduleRecord.exports.__test;
assert.strictEqual(test.classifySmtpError({ code: 'EAUTH', message: '535 rejected' }).reason, 'smtp-auth-failed');
assert.strictEqual(test.classifySmtpError({ code: '454', message: 'quota exceeded' }).reason, 'smtp-rate-limited');
assert.strictEqual(test.classifySmtpError({ code: 'EENVELOPE', message: '550 recipient rejected' }).reason, 'recipient-rejected');
assert.strictEqual(test.classifySmtpError({ code: 'ETIMEDOUT', message: 'network timeout' }).reason, 'smtp-connection-failed');
const serialized = test.serializeIncidentDelivery({ exists: true, data: () => ({ delivery: {
  status: 'failed', reason: 'smtp-auth-failed', code: 'EAUTH', nextRetryAt: { toDate: () => new Date('2026-07-24T09:00:00Z') }
} }) });
assert.strictEqual(serialized.code, 'EAUTH');
assert.strictEqual(serialized.nextRetryAt, '2026-07-24T09:00:00.000Z');
const metadata = test.incidentServiceMetadata({ app: null });
assert(metadata.serviceSchemaVersion >= 3);
assert.strictEqual(metadata.smtpProvider, 'gmail');
assert.strictEqual(metadata.smtpCredential, 'firebase-secret');

reporter.copyDeployCommand().then(copiedOk => {
  assert.strictEqual(copiedOk, true);
  assert.strictEqual(copied, 'npm run deploy:incident');
  console.log('PASS v1.6.5 incident mail recovery controls, history, and SMTP diagnostics');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
