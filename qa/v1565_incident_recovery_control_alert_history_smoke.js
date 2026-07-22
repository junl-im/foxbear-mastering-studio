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
const docs = read('docs/V1.5.65_INCIDENT_RECOVERY_CONTROL_ALERT_HISTORY.md');
const envExample = read('functions/.env.example');

assert.strictEqual(pkg.version, '1.5.73');
assert.strictEqual(meta.assetVersion, '1.5.73-bulk-control-eta-result-filter-ui');
assert(pkg.scripts['deploy:incident'].includes('functions:retryIncidentBatchRequest'));

for (const token of [
  "const INCIDENT_BATCH_RECOVERY_LIMIT = 8",
  "const OPERATIONS_HISTORY_COLLECTION = 'incidentOperationsHistory'",
  "const OPERATIONS_ALERT_COLLECTION = 'incidentOperationsAlerts'",
  'inspectOperationsWebhookConfig',
  'buildOperationsWebhookPayload',
  'sendOperationsWebhook',
  'recordOperationsTelemetry',
  'operationsHistoryId',
  'runIncidentRecoveryBatch',
  'writeRecoveryRun',
  'collectDeadLetterReports',
  'exports.retryIncidentBatchRequest',
  "document: 'incidentBatchRecoveryRequests/{requestId}'",
  "source: 'admin-batch'",
  "source: 'scheduled'",
  "reason: 'smtp-unavailable'",
  "health.channels?.webhook?.status !== 'ready'"
]) assert(functionsSource.includes(token), `v1.5.73 function contract missing ${token}`);

for (const token of [
  'requestIncidentBatchRecovery',
  'getIncidentBatchRecoveryRequest',
  "collection(bridgeState.db, 'incidentOperationsHistory')",
  "getDoc(doc(bridgeState.db, 'incidentOperations', 'recovery'))",
  "getIncidentOperationsHistory({ limit: 24, filter: 'all' }).catch(() => ({ items: [], hasMore: false, nextCursor: 0 }))",
  'normalizeIncidentRecovery',
  'normalizeOperationsHistory'
]) assert(firebaseSource.includes(token), `v1.5.73 Firebase bridge contract missing ${token}`);

for (const token of [
  'adminIncidentRecoverDue',
  'adminIncidentRecoverDead',
  'adminIncidentRecoveryStatus'
]) {
  assert(indexSource.includes(`id="${token}"`), `v1.5.73 HTML missing ${token}`);
  assert(appSource.includes(`'${token}'`), `v1.5.73 app element cache missing ${token}`);
}

for (const token of [
  "appendSummaryCard('보조 경보'",
  "appendSummaryCard('자동 복구'",
  "appendSummaryCard('24시간 추세'",
  'requestBatchRecovery',
  "requestIncidentBatchRecovery(mode)",
  'getIncidentBatchRecoveryRequest',
  'summarizeHistory'
]) assert(monitorSource.includes(token), `v1.5.73 admin monitor missing ${token}`);

assert(cssSource.includes('.admin-incident-recovery-actions'));
assert(rules.includes('validIncidentBatchRecoveryRequest'));
assert(rules.includes('match /incidentBatchRecoveryRequests/{requestId}'));
assert(rules.includes('match /incidentOperationsHistory/{historyId}'));
assert(rules.includes('match /incidentOperationsAlerts/{alertId}'));
assert(envExample.includes('FOXBEAR_INCIDENT_ALERT_WEBHOOK_URL='));
assert(handoff.includes('## v1.5.65 인수인계'));
assert(handoff.includes('진행된 내용`, `배포 파일 2종`, `다음 예상 내용'));
assert(status.includes('## v1.5.65 current focus'));
assert(docs.includes('30일 운영 이력'));

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
  URL,
  AbortController,
  setTimeout,
  clearTimeout,
  fetch: async () => ({ ok: true, status: 204, text: async () => '' }),
  process: { env: {} },
  require(request) {
    if (request === 'firebase-functions/v2/firestore') return { onDocumentCreated: (options, handler) => ({ options, handler }) };
    if (request === 'firebase-functions/v2/scheduler') return { onSchedule: (options, handler) => ({ options, handler }) };
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
    throw new Error(`unexpected require: ${request}`);
  }
};
vm.runInNewContext(functionsSource, sandbox, { filename: 'functions/index.js' });
const test = moduleRecord.exports.__test;
assert(test, 'functions test exports are missing');

assert.strictEqual(test.inspectOperationsWebhookConfig('').status, 'disabled');
assert.strictEqual(test.inspectOperationsWebhookConfig('http://hooks.slack.com/services/test').status, 'error');
assert.strictEqual(test.inspectOperationsWebhookConfig('https://127.0.0.1/hook').status, 'error');
const slack = test.inspectOperationsWebhookConfig('https://hooks.slack.com/services/T/B/X');
assert.strictEqual(slack.status, 'ready');
assert.strictEqual(slack.provider, 'slack');
const discord = test.inspectOperationsWebhookConfig('https://discord.com/api/webhooks/1/token');
assert.strictEqual(discord.provider, 'discord');
assert.strictEqual(test.publicWebhookConfig(slack).url, undefined);

const now = Date.parse('2026-07-22T03:14:00.000Z');
const health = test.evaluateOperationsHealth({
  queue: { stale: 3, deadLetter: 2, pending: 1, failed: 1 },
  quota: { sent: 4, reserved: 1, limit: 40, reservationLeak: 0 },
  summaries: { failed: 0, locked: 0 },
  smtp: { status: 'error', reason: 'smtp-auth-failed', message: 'auth rejected' },
  channels: { webhook: { status: 'ready', provider: 'slack', reason: '' } }
});
assert.strictEqual(health.status, 'critical');
const decision = test.shouldSendOperationsAlert(health, { status: 'healthy', signature: 'old' }, now);
assert.strictEqual(decision.send, true);
assert.strictEqual(decision.kind, 'alert');
const noBackup = test.shouldSendOperationsAlert({ ...health, channels: { webhook: { status: 'disabled' } } }, { status: 'healthy' }, now);
assert.strictEqual(noBackup.send, false);
assert.strictEqual(noBackup.reason, 'smtp-unavailable');

const payload = test.buildOperationsWebhookPayload(health, { status: 'healthy' }, 'alert', 'slack');
assert(payload.text.includes('장기 미발송 3건'));
assert(payload.text.includes('최종 실패 2건'));
assert(!payload.text.includes('filename'));
assert(!payload.text.includes('audio'));
const discordPayload = test.buildOperationsWebhookPayload(health, { status: 'healthy' }, 'alert', 'discord');
assert(discordPayload.content && !discordPayload.text);

assert.strictEqual(test.operationsHistoryId(now), test.operationsHistoryId(now + 10 * 60 * 1000));
assert.notStrictEqual(test.operationsHistoryId(now), test.operationsHistoryId(now + 31 * 60 * 1000));

secretValue = 'too-short';
assert.throws(() => test.normalizedGmailAppPassword(), error => error.code === 'FOXBEAR_GMAIL_SECRET_INVALID');

console.log(`PASS v${meta.productVersion} batch incident recovery, independent webhook alerts, 30-day operations history, and recovery telemetry`);
