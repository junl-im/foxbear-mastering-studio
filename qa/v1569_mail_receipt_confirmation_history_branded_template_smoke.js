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
const rules = read('firestore.rules');
const handoff = read('HANDOFF.md');
const docs = read('docs/V1.5.69_MAIL_RECEIPT_CONFIRMATION_HISTORY_BRANDED_TEMPLATE.md');
assert.strictEqual(pkg.version, '1.5.80');
assert.strictEqual(pkg.foxbearRelease.assetVersion, '1.5.80-mobile-return-media-focus-recovery');
for (const token of [
  "const MAIL_TEST_HISTORY_COLLECTION = 'incidentMailTestHistory'",
  "const MAIL_RECEIPT_CONFIRMATION_COLLECTION = 'incidentMailReceiptConfirmationRequests'",
  "const MAIL_VERIFICATION_DOC_ID = 'mailVerification'",
  'MAIL_TEST_WARNING_AFTER_MS', 'recordMailTestResult(', 'confirmMailReceipt(',
  'exports.confirmIncidentMailReceiptRequest', 'buildBrandedEmailHtml(', 'emailTable('
]) assert(functionsSource.includes(token), `functions contract missing: ${token}`);
for (const token of [
  'requestIncidentMailReceiptConfirmation', 'getIncidentMailReceiptConfirmationRequest',
  'normalizeMailVerification', 'normalizeMailTestHistory', "'incidentMailTestHistory'", "'mailVerification'"
]) assert(firebaseSource.includes(token), `firebase bridge contract missing: ${token}`);
for (const token of [
  'formatMailVerification', 'renderMailTestHistory', 'requestMailReceiptConfirmation',
  'adminIncidentConfirmInbox', 'adminIncidentConfirmSpam', 'adminIncidentMailVerificationStatus'
]) assert(adminSource.includes(token), `admin UI contract missing: ${token}`);
for (const token of ['받은편지함 수신 확인', '스팸함 수신 확인', '실제 메일 테스트 이력', 'adminIncidentMailTestRows']) {
  assert(indexSource.includes(token), `index mail verification UI missing: ${token}`);
}
for (const token of ['validIncidentMailReceiptConfirmationRequest', 'incidentMailReceiptConfirmationRequests', 'incidentMailTestHistory']) {
  assert(rules.includes(token), `Firestore rule missing: ${token}`);
}
assert(handoff.includes('## v1.5.69 인수인계'));
assert(docs.includes('7일 이상 검증하지 않으면 경고'));
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
const manual = test.buildMail({ category: 'manual-test', severity: 'warning', fingerprint: 'manual-test-v1569', appVersion: '1.5.80' }, 'mail_test_v1569');
assert(manual.html.includes('AI MASTERING STUDIO'));
assert(manual.html.includes('실제 발송 테스트'));
assert(manual.html.includes('발신자: AI마스터링 스튜디오'));
const ops = test.buildOperationsAlertMail({ status: 'critical', reasons: [{ message: 'SMTP 장애' }] }, {}, 'alert');
assert(ops.html.includes('메일 시스템 긴급 장애'));
const summary = test.buildDailySummaryMail([], '2026-07-22');
assert(summary.html.includes('일일 오류 요약'));
console.log('PASS v1.5.69 mail receipt confirmation, test history, freshness warning, and branded template contract');
