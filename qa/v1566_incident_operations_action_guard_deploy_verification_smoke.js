#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { getReleaseMetadata } = require('../tools/release-metadata');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const meta = getReleaseMetadata(pkg);
const functionsSource = read('functions/index.js');
const firebaseSource = read('src/firebase-bootstrap.js');
const monitorSource = read('src/ui/admin-incident-monitor-view.js');
const appSource = read('src/app.js');
const indexSource = read('index.html');
const cssSource = read('assets/css/components/admin-incident-monitor.css');
const rules = read('firestore.rules');
const handoff = read('HANDOFF.md');
const status = read('STATUS.md');
const docs = read('docs/V1.5.66_INCIDENT_OPERATIONS_ACTION_GUARD_DEPLOY_VERIFICATION.md');

assert.strictEqual(pkg.version, '1.6.79');
assert.strictEqual(meta.assetVersion, '1.6.79-manifestless-patch-playback-retirement');
for (const name of ['testIncidentAlertChannelRequest', 'verifyIncidentDeploymentRequest']) {
  assert(pkg.scripts['deploy:incident'].includes(`functions:${name}`), `deploy script missing ${name}`);
}

for (const token of [
  "const PRODUCT_VERSION = '1.6.79'",
  'const OPERATIONS_SCHEMA_VERSION =',
  "const ADMIN_ACTION_STATE_COLLECTION = 'incidentAdminActionState'",
  'recommendedActionForIssue',
  'claimAdminAction',
  'finishAdminAction',
  'ADMIN_RETRY_COOLDOWN_MS',
  'ADMIN_BATCH_COOLDOWN_MS',
  'ADMIN_ALERT_TEST_COOLDOWN_MS',
  'ADMIN_DEPLOY_VERIFY_COOLDOWN_MS',
  'exports.testIncidentAlertChannelRequest',
  "document: 'incidentAlertTestRequests/{requestId}'",
  'verifyIncidentDeployment',
  'exports.verifyIncidentDeploymentRequest',
  "document: 'incidentDeploymentVerificationRequests/{requestId}'",
  'recommendedActions: reasonCodes.map(recommendedActionForIssue)',
  'productVersion: PRODUCT_VERSION'
]) assert(functionsSource.includes(token), `v1.6.79 function contract missing ${token}`);

for (const token of [
  'normalizeIncidentDeployment',
  'requestIncidentAlertChannelTest',
  'getIncidentAlertChannelTestRequest',
  'requestIncidentDeploymentVerification',
  'getIncidentDeploymentVerificationRequest',
  "getDoc(doc(bridgeState.db, 'incidentOperations', 'deployment'))",
  'recommendedActions',
  'setDoc'
]) assert(firebaseSource.includes(token), `v1.6.79 Firebase bridge contract missing ${token}`);

for (const id of [
  'adminIncidentTestWebhook', 'adminIncidentVerifyDeployment', 'adminIncidentDeploymentStatus',
  'adminIncidentHistoryDetails', 'adminIncidentHistoryRows'
]) {
  assert(indexSource.includes(`id="${id}"`), `v1.6.79 HTML missing ${id}`);
  assert(appSource.includes(`'${id}'`), `v1.6.79 app element cache missing ${id}`);
}

for (const token of [
  "appendSummaryCard('배포 검증'",
  'requestAlertChannelTest',
  'requestDeploymentVerification',
  'maybeAutoVerifyDeployment',
  'renderHistory',
  'collectRecommendations',
  'formatDeploymentStatus'
]) assert(monitorSource.includes(token), `v1.6.79 monitor contract missing ${token}`);

assert(cssSource.includes('.admin-incident-history-details'));
assert(cssSource.includes('.admin-incident-action-recommendation'));
for (const token of [
  'validIncidentAlertTestRequest',
  'match /incidentAlertTestRequests/{requestId}',
  'validIncidentDeploymentVerificationRequest',
  'match /incidentDeploymentVerificationRequests/{requestId}',
  'match /incidentAdminActionState/{document=**}'
]) assert(rules.includes(token), `v1.6.79 Firestore rule missing ${token}`);
assert(handoff.includes('## v1.5.66 인수인계'));
assert(handoff.includes('진행된 내용`, `배포 파일 2종`, `다음 예상 내용'));
assert(status.includes('## v1.5.66 current focus'));
assert(docs.includes('배포 후 자동 상태 검증'));

let secretValue = 'abcd efgh ijkl mnop';
const Timestamp = { fromMillis(value) { return { toMillis: () => value, value }; } };
const moduleRecord = { exports: {} };
const sandbox = {
  module: moduleRecord,
  exports: moduleRecord.exports,
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
  URL,
  AbortController,
  setTimeout,
  clearTimeout,
  fetch: async () => ({ ok: true, status: 204, text: async () => '' }),
  process: { env: {} },
  require(request) {
    if (request === 'firebase-functions/v2/firestore') return { onDocumentCreated: (options, handler) => ({ options, handler }) };
    if (request === 'firebase-functions/v2/scheduler') return { onSchedule: (options, handler) => ({ options, handler }) };
    if (request === 'firebase-functions/v2/https') return { onCall: (options, handler) => ({ options, handler }), HttpsError: class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } } };
    if (request === 'firebase-functions/params') return { defineSecret: () => ({ value: () => secretValue }) };
    if (request === 'firebase-admin/app') return { initializeApp() {} };
    if (request === 'firebase-admin/firestore') {
      return {
        FieldValue: { serverTimestamp: () => ({ serverTimestamp: true }), delete: () => ({ delete: true }) },
        Timestamp,
        getFirestore: () => ({ collection: () => ({}) })
      };
    }
    if (request === 'nodemailer') return { createTransport: () => ({ verify: async () => true, sendMail: async () => ({}), close() {} }) };
    if (request === 'node:crypto') return { randomUUID: () => '00000000-0000-4000-8000-000000000000' };
    if (request === './app-check-policy') return require(path.join(root, 'functions/app-check-policy.js'));
    throw new Error(`unexpected require: ${request}`);
  }
};
vm.runInNewContext(functionsSource, sandbox, { filename: 'functions/index.js' });
const test = moduleRecord.exports.__test;
assert(test, 'functions test exports are missing');
assert(test.recommendedActionForIssue('smtp-auth-failed').includes('앱 비밀번호'));
assert(test.recommendedActionForIssue('dead-letter-present').includes('강제 재전송'));
assert.strictEqual(test.adminActionStateId('abc/user', 'batch-dead-letter'), 'abc_user_batch-dead-letter');
const testPayload = test.buildOperationsWebhookPayload({
  status: 'warning', queue: {}, quota: {}, smtp: { status: 'ok' }, reasons: [{ message: 'test' }]
}, { status: 'healthy' }, 'test', 'slack');
assert(testPayload.text.includes('보조 경보 채널 테스트'));
secretValue = 'too-short';
assert.throws(() => test.normalizedGmailAppPassword(), error => error.code === 'FOXBEAR_GMAIL_SECRET_INVALID');

console.log(`PASS v${meta.productVersion} guarded admin actions, alert test, detailed history, recommendations, and deployment verification`);
