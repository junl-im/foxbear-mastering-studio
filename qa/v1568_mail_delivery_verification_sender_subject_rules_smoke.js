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
const reporterSource = read('src/boot/incident-reporter.js');
const indexSource = read('index.html');
const handoff = read('HANDOFF.md');
const docs = read('docs/V1.5.68_MAIL_DELIVERY_VERIFICATION_SENDER_SUBJECT_RULES.md');
assert.strictEqual(pkg.version, '1.5.74');
assert.strictEqual(pkg.foxbearRelease.assetVersion, '1.5.74-bulk-pause-skip-reorder-mobile-download');
for (const token of [
  "const MAIL_FROM_NAME = 'AI마스터링 스튜디오'", "const MAIL_SUBJECT_PREFIX = '[AI마스터링 스튜디오]'",
  'mailFromHeader()', 'buildIncidentSubject', "'X-AI-Mastering-Mail-Type'", 'smtpAcceptedAt: Timestamp.fromMillis(now)'
]) assert(functionsSource.includes(token), `mail contract missing ${token}`);
assert(!functionsSource.includes('FoxBear Incident Monitor <${ALERT_SENDER}>'));
for (const token of ['subject:', 'senderName:', 'recipient:', 'acceptedCount:', 'smtpAcceptedAt:', 'smtpResponse:']) {
  assert(firebaseSource.includes(token), `delivery receipt missing ${token}`);
}
assert(reporterSource.includes('Gmail SMTP 접수 완료'));
assert(reporterSource.includes('실제 Gmail SMTP 발송 검증'));
assert(indexSource.includes('실제 메일 테스트'));
assert(indexSource.includes('발신자명은 AI마스터링 스튜디오'));
assert(handoff.includes('## v1.5.68 인수인계'));
assert(docs.includes('[AI마스터링 스튜디오][메일 테스트]'));
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
assert.strictEqual(test.mailFromHeader(), 'AI마스터링 스튜디오 <mcwoogi@gmail.com>');
assert.strictEqual(test.kstTimestampLabel(Date.UTC(2026, 6, 21, 15, 0, 0)), '2026-07-22 00:00:00 KST');
const manual = test.buildMail({ category: 'manual-test', severity: 'warning', fingerprint: 'manual-test-abc123', appVersion: '1.5.74' }, 'uid_report');
assert(manual.subject.startsWith('[AI마스터링 스튜디오][메일 테스트] 실제 발송 확인'));
assert.strictEqual(manual.type, 'manual-test');
const incident = test.buildMail({ category: 'mastering', severity: 'fatal', fingerprint: 'master', appVersion: '1.5.74' }, 'uid_report_12345');
assert(incident.subject.includes('[오류 신고] 긴급 · 마스터링 오류 · v1.5.74'));
const summary = test.buildDailySummaryMail([], '2026-07-21');
assert.strictEqual(summary.subject, '[AI마스터링 스튜디오][일일 요약] 2026-07-21 · 오류 0건');
const ops = test.buildOperationsAlertMail({ status: 'critical', reasons: [] }, {}, 'alert');
assert.strictEqual(ops.subject, '[AI마스터링 스튜디오][긴급 장애] 메일 시스템 확인 필요');
console.log('PASS v1.5.68 mail delivery verification, sender identity, subjects, and SMTP receipt contract');
