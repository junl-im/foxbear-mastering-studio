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
const rules = read('firestore.rules');
const indexes = read('firestore.indexes.json');
const handoff = read('HANDOFF.md');
const status = read('STATUS.md');
const docs = read('docs/V1.5.67_INCIDENT_ADMIN_AUDIT_WEBHOOK_FAILOVER_INDEX_HEALTH.md');

assert.strictEqual(pkg.version, '1.5.84');
assert.strictEqual(meta.assetVersion, '1.5.84-trusted-types-browser-gate-recovery');
assert(pkg.scripts['deploy:incident'].includes('functions:verifyIncidentPostDeployHealth'));
for (const token of [
  "const PRODUCT_VERSION = '1.5.84'", 'const OPERATIONS_SCHEMA_VERSION =',
  "const ADMIN_AUDIT_COLLECTION = 'incidentAdminAuditLog'", 'writeAdminAuditEvent',
  'OPERATIONS_WEBHOOK_FALLBACK_ENV_NAME', 'OPERATIONS_WEBHOOK_RETRY_DELAYS_MS',
  'inspectOperationsWebhookChannels', 'deliverOperationsWebhook', 'failover: true',
  'probeFirestoreIndexes', 'inspectPostDeployHealth', 'exports.verifyIncidentPostDeployHealth'
]) assert(functionsSource.includes(token), `v1.5.84 function contract missing ${token}`);

for (const token of ['getIncidentOperationsHistory', 'getIncidentAdminAuditLog', 'parseHistoryFilter', 'historyNextCursor', 'auditLog']) {
  assert(firebaseSource.includes(token), `v1.5.84 Firebase bridge contract missing ${token}`);
}
for (const id of ['adminIncidentHistoryFilter', 'adminIncidentHistoryMore', 'adminIncidentHistoryStatus', 'adminIncidentAuditDetails', 'adminIncidentAuditRows']) {
  assert(indexSource.includes(`id="${id}"`), `v1.5.84 HTML missing ${id}`);
  assert(appSource.includes(`'${id}'`), `v1.5.84 app element cache missing ${id}`);
}
for (const token of ['loadHistoryPage', 'renderAuditLog', 'updateHistoryControls', '이중화']) {
  assert(monitorSource.includes(token), `v1.5.84 monitor contract missing ${token}`);
}
assert(rules.includes('match /incidentAdminAuditLog/{auditId}'));
assert(indexes.includes('incidentOperationsHistory'));
assert(indexes.includes('"arrayConfig": "CONTAINS"'));
assert(handoff.includes('## v1.5.67 인수인계'));
assert(handoff.includes('진행된 내용`, `배포 파일 2종`, `다음 예상 내용'));
assert(status.includes('## v1.5.67 current focus'));
assert(docs.includes('실제 복합 쿼리'));

let secretValue = 'abcd efgh ijkl mnop';
const Timestamp = { fromMillis(value) { return { toMillis: () => value, value }; } };
const moduleRecord = { exports: {} };
const sandbox = {
  module: moduleRecord, exports: moduleRecord.exports, console, Date, Math, Object, String, Number, Boolean, Array, Map, Set, RegExp, Error, URL,
  AbortController, setTimeout, clearTimeout, fetch: async () => ({ ok: true, status: 204, headers: { get: () => null }, text: async () => '' }),
  process: { env: {} },
  require(request) {
    if (request === 'firebase-functions/v2/firestore') return { onDocumentCreated: (options, handler) => ({ options, handler }) };
    if (request === 'firebase-functions/v2/scheduler') return { onSchedule: (options, handler) => ({ options, handler }) };
    if (request === 'firebase-functions/params') return { defineSecret: () => ({ value: () => secretValue }) };
    if (request === 'firebase-admin/app') return { initializeApp() {} };
    if (request === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => ({}), delete: () => ({}) }, Timestamp, getFirestore: () => ({ collection: () => ({}) }) };
    if (request === 'nodemailer') return { createTransport: () => ({ verify: async () => true, sendMail: async () => ({}), close() {} }) };
    if (request === 'node:crypto') return { randomUUID: () => '00000000-0000-4000-8000-000000000000' };
    throw new Error(`unexpected require: ${request}`);
  }
};
vm.runInNewContext(functionsSource, sandbox, { filename: 'functions/index.js' });
const test = moduleRecord.exports.__test;
assert(test, 'functions test exports are missing');
assert.strictEqual(test.isWebhookRetryableStatus(429), true);
assert.strictEqual(test.isWebhookRetryableStatus(503), true);
assert.strictEqual(test.isWebhookRetryableStatus(400), false);
sandbox.process.env.FOXBEAR_INCIDENT_ALERT_WEBHOOK_URL = 'https://hooks.slack.com/services/test';
sandbox.process.env.FOXBEAR_INCIDENT_ALERT_WEBHOOK_FALLBACK_URL = 'https://discord.com/api/webhooks/test';
const channels = test.inspectOperationsWebhookChannels();
assert.strictEqual(channels.status, 'ready');
assert.strictEqual(channels.failoverReady, true);
assert(test.recommendedActionForIssue('firestore-index-missing').includes('indexes'));
secretValue = 'too-short';
assert.throws(() => test.normalizedGmailAppPassword(), error => error.code === 'FOXBEAR_GMAIL_SECRET_INVALID');

console.log(`PASS v${meta.productVersion} admin audit, webhook retry/failover, index probes, paged history, and scheduled health verification`);
