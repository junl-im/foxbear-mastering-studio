#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { getReleaseMetadata } = require('../tools/release-metadata');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const meta = getReleaseMetadata();
const pkg = JSON.parse(read('package.json'));
const functionsSource = read('functions/index.js');
const firebaseSource = read('src/firebase-bootstrap.js');
const monitorSource = read('src/ui/admin-incident-monitor-view.js');
const rules = read('firestore.rules');
const indexes = JSON.parse(read('firestore.indexes.json'));
const handoff = read('HANDOFF.md');
const status = read('STATUS.md');
const docs = read('docs/V1.5.64_INCIDENT_OPERATIONS_HEALTH_SELF_DIAGNOSTICS.md');

assert.strictEqual(pkg.version, '1.6.75');
assert.strictEqual(meta.assetVersion, '1.6.75-download-progress-admission-fallback-closure');
assert(pkg.scripts['deploy:incident'].includes('functions:auditIncidentMailOperations'));

for (const token of [
  "const OPERATIONS_HEALTH_DOC_ID = 'mail'",
  'SMTP_HEALTHY_CHECK_INTERVAL_MS',
  'SMTP_DEGRADED_CHECK_INTERVAL_MS',
  'OPERATIONS_ALERT_COOLDOWN_MS',
  'countIncidentStatusBefore',
  'isLongUndelivered',
  'inspectSmtpHealth',
  'evaluateOperationsHealth',
  'collectOperationsHealth',
  'reserveOperationsAudit',
  'finalizeOperationsAudit',
  'buildOperationsAlertMail',
  'operationAlertMessageId',
  "schedule: 'every 15 minutes'",
  'exports.auditIncidentMailOperations',
  "db.collection('incidentOperations').doc(OPERATIONS_HEALTH_DOC_ID)",
  "code: 'long-undelivered'",
  "code: 'dead-letter-present'",
  "code: 'quota-reservation-leak'",
  "reason: 'smtp-unavailable'",
  "kind: 'recovery'"
]) assert(functionsSource.includes(token), `v1.6.75 operations health missing ${token}`);

for (const token of [
  "getDoc(doc(bridgeState.db, 'incidentOperations', 'mail'))",
  'normalizeIncidentOperations',
  'getKstDayRange',
  "where('createdAt', '>=', kstRange.start)",
  'operations: normalizeIncidentOperations(operationsSnapshot)'
]) assert(firebaseSource.includes(token), `v1.6.75 admin bridge missing ${token}`);

for (const token of [
  "appendSummaryCard('메일 운영'",
  "appendSummaryCard('장기 미발송'",
  "appendSummaryCard('SMTP/Secret'",
  'formatOperationsStatus',
  '운영 점검은 15분마다 실행됩니다'
]) assert(monitorSource.includes(token), `v1.6.75 monitor UI missing ${token}`);

assert(rules.includes('match /incidentOperations/{documentId}'));
assert(rules.includes('allow get: if isAdmin();'));
assert(indexes.indexes.some(index => index.fields.some(field => field.fieldPath === 'delivery.checkedAt' && field.order === 'DESCENDING')));
assert(handoff.includes('## v1.5.64 인수인계'));
assert(status.includes('## v1.5.64 current focus'));
assert(docs.includes('SMTP/Secret'));

let secretValue = 'abcd efgh ijkl mnop';
const Timestamp = {
  fromMillis(value) { return { toMillis: () => value, value }; }
};
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

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(test.classifySmtpError({ code: 'EAUTH', message: '535 bad credentials' }))),
  { reason: 'smtp-auth-failed', code: 'EAUTH', message: '535 bad credentials' }
);
assert.strictEqual(test.classifySmtpError({ code: 'ETIMEDOUT', message: 'timeout' }).reason, 'smtp-connection-failed');
assert.strictEqual(test.classifySmtpError({ code: 'FOXBEAR_GMAIL_SECRET_INVALID', message: 'bad secret' }).reason, 'secret-invalid');

const now = Date.parse('2026-07-22T03:00:00.000Z');
assert.strictEqual(test.isLongUndelivered({
  createdAt: Timestamp.fromMillis(now - 11 * 60 * 1000),
  delivery: { status: 'pending' }
}, now), true);
assert.strictEqual(test.isLongUndelivered({
  delivery: { status: 'retrying', leaseUntil: Timestamp.fromMillis(now - 6 * 60 * 1000) }
}, now), true);
assert.strictEqual(test.isLongUndelivered({
  delivery: { status: 'failed', nextRetryAt: Timestamp.fromMillis(now + 1000) }
}, now), false);

const healthy = test.evaluateOperationsHealth({
  queue: { stale: 0, deadLetter: 0 },
  quota: { reservationLeak: 0 },
  summaries: { failed: 0, locked: 0 },
  smtp: { status: 'ok' }
});
assert.strictEqual(healthy.status, 'healthy');
assert.strictEqual(test.shouldSendOperationsAlert(healthy, { status: 'critical' }, now).kind, 'recovery');

const warning = test.evaluateOperationsHealth({
  queue: { stale: 1, deadLetter: 1 },
  quota: { reservationLeak: 0 },
  summaries: { failed: 0, locked: 0 },
  smtp: { status: 'ok' }
});
assert.strictEqual(warning.status, 'warning');
assert.strictEqual(test.shouldSendOperationsAlert(warning, { status: 'healthy', signature: 'old' }, now).kind, 'alert');

const critical = test.evaluateOperationsHealth({
  queue: { stale: 3, deadLetter: 0 },
  quota: { reservationLeak: 0 },
  summaries: { failed: 0, locked: 0 },
  smtp: { status: 'ok' }
});
assert.strictEqual(critical.status, 'critical');
const blocked = test.shouldSendOperationsAlert({ ...critical, smtp: { status: 'error' } }, { status: 'healthy' }, now);
assert.strictEqual(blocked.send, false);
assert.strictEqual(blocked.reason, 'smtp-unavailable');

const mail = test.buildOperationsAlertMail(warning, healthy, 'alert');
assert(mail.subject.includes('[AI마스터링 스튜디오]'));
assert(/\[(운영 경고|긴급 장애|복구 완료)\]/.test(mail.subject));
assert(mail.text.includes('장기 미발송'));
assert(mail.html.includes('Firebase 관리자 화면'));
assert.strictEqual(
  test.operationAlertMessageId('alert', warning.signature, now),
  test.operationAlertMessageId('alert', warning.signature, now)
);

secretValue = 'too-short';
assert.throws(() => test.normalizedGmailAppPassword(), error => error.code === 'FOXBEAR_GMAIL_SECRET_INVALID');

console.log(`PASS v${meta.productVersion} incident operations health, SMTP/Secret diagnostics, alert transitions, and KST admin telemetry`);
