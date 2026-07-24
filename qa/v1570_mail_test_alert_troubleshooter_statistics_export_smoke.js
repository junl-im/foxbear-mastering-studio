#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const functionsSource = read('functions/index.js');
const firebaseSource = read('src/firebase-bootstrap.js');
const adminSource = read('src/ui/admin-incident-monitor-view.js');
const indexSource = read('index.html');
const cssSource = read('assets/css/components/admin-incident-monitor.css');
const indexes = read('firestore.indexes.json');
const handoff = read('HANDOFF.md');
const docs = read('docs/V1.5.70_MAIL_TEST_ALERT_TROUBLESHOOTING_STATISTICS_EXPORT.md');
assert.strictEqual(pkg.version, '1.5.98');
assert.strictEqual(pkg.foxbearRelease.assetVersion, '1.5.98-worker-retry-health-levels');
for (const token of [
  'MAIL_RECEIPT_OVERDUE_MS', 'MAIL_TEST_HISTORY_SCAN_LIMIT', 'inspectMailTestVerification(',
  "code: 'mail-test-never-run'", "code: 'mail-test-verification-stale'", "code: 'mail-receipt-unconfirmed'",
  'mailTestVerificationAlerts: true', 'mailReceiptOverdueTracking: true', 'mailTestHistorySearchExport: true'
]) assert(functionsSource.includes(token), `functions contract missing: ${token}`);
for (const token of ['getIncidentMailTestHistory', 'summarizeMailTestHistory', 'receiptOverdue', 'mailTestStats', 'overdueReceiptCount']) {
  assert(firebaseSource.includes(token), `firebase bridge contract missing: ${token}`);
}
for (const token of ['buildMailTroubleshootingSteps', 'applyMailTestFilters', 'exportMailTestHistory', 'matchesMailTestFilter', 'adminIncidentMailTestExport']) {
  assert(adminSource.includes(token), `admin mail-test contract missing: ${token}`);
}
for (const token of ['메일 점검 마법사', 'CSV 내보내기', 'adminIncidentMailTestSearch', 'adminIncidentMailTestFilter', '30분 초과 미확인']) {
  assert(indexSource.includes(token), `index mail-test UI missing: ${token}`);
}
assert(cssSource.includes('.admin-mail-troubleshooter'));
assert(cssSource.includes('.admin-mail-test-stats'));
assert(indexes.includes('incidentMailTestHistory'));
assert(indexes.includes('checkedAt'));
assert(handoff.includes('## v1.5.70 인수인계'));
assert(docs.includes('SMTP 접수 후 30분'));
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
const never = test.evaluateOperationsHealth({ smtp: { status: 'ok' }, queue: {}, summaries: {}, quota: {}, mailVerification: { neverTested: true } });
assert(never.reasons.some(item => item.code === 'mail-test-never-run'));
const overdue = test.evaluateOperationsHealth({ smtp: { status: 'ok' }, queue: {}, summaries: {}, quota: {}, mailVerification: { lastTestStatus: 'emailed', overdueReceiptCount: 2, latestReceiptOverdue: true } });
assert(overdue.reasons.some(item => item.code === 'mail-receipt-unconfirmed'));
assert.strictEqual(test.recommendedActionForIssue('mail-test-verification-stale').includes('7일'), true);
console.log('PASS v1.5.70 mail-test alerts, troubleshooting, statistics, missing receipt tracking, search, and CSV export contract');
