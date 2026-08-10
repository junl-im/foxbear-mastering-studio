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
const handoff = read('HANDOFF.md');
const status = read('STATUS.md');
const docs = read('docs/V1.5.63_INCIDENT_MAIL_QUOTA_SUMMARY_RECOVERY.md');

assert.strictEqual(pkg.version, '1.6.86');
assert.strictEqual(meta.assetVersion, '1.6.86-header-order-mobile-overflow-browser-gate-recovery');

for (const token of [
  'dailyKst_${dayKey}',
  'kstDateKey(new Date(now))',
  'nextKstDayRetryAt(now)',
  "status: 'failed'",
  "reason: 'daily-email-limit'",
  "queryIncidentStatus('suppressed-rate-limit', 'createdAt')",
  'reservationActive: true',
  'reservationDayKey: dayKey',
  'releasePreviousDailyReservation',
  'otherReservedCount',
  'assertSmtpAccepted(info)',
  'FOXBEAR_SMTP_NO_ACCEPTED_RECIPIENT',
  'summaryMessageId(range.dateKey)',
  "'X-FoxBear-Summary-Date'",
  'loadDailyIncidentReports',
  '.startAfter(cursor)',
  'DAILY_SUMMARY_MAX_REPORTS',
  'DAILY_SUMMARY_OFFSETS',
  "schedule: '0 9,12,15,18,21 * * *'",
  'finalizeDailySummary',
  ".orderBy('createdAt', 'desc')",
  'manualResetCount: Math.max(0, Number(delivery.manualResetCount || 0)) + (forceTerminal ? 1 : 0)',
  "status: 'stale-completion'"
]) assert(functionsSource.includes(token), `v1.6.86 mail recovery missing ${token}`);

assert(!functionsSource.includes('function utcDateKey'), 'UTC quota helper must not remain in the mail path');
assert(!functionsSource.includes("const rateStatus = options.retry ? 'failed' : 'suppressed-rate-limit'"), 'new incidents can still be permanently suppressed at the daily limit');
assert(functionsSource.includes("if (!/^[a-z0-9]{16}$/i.test(password))"), 'Gmail app password validation is not exact');
assert(handoff.includes('## v1.5.63 인수인계'));
assert(status.includes('## v1.5.63 current focus'));
assert(docs.includes('KST'));

let secretValue = 'abcd efgh ijkl mnop';
const Timestamp = {
  fromMillis(value) {
    return { toMillis: () => value, value };
  }
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
    if (request === 'nodemailer') return { createTransport: () => ({ sendMail: async () => ({}) }) };
    if (request === 'node:crypto') return { randomUUID: () => '00000000-0000-4000-8000-000000000000' };
    if (request === './app-check-policy') return require(path.join(root, 'functions/app-check-policy.js'));
    throw new Error(`unexpected require: ${request}`);
  }
};
vm.runInNewContext(functionsSource, sandbox, { filename: 'functions/index.js' });
const test = moduleRecord.exports.__test;
assert(test, 'functions test exports are missing');

const justAfterKstMidnight = new Date('2026-07-21T15:30:00.000Z');
assert.strictEqual(test.kstDateKey(justAfterKstMidnight), '2026-07-22');
assert.strictEqual(new Date(test.nextKstDayRetryAt(justAfterKstMidnight.getTime())).toISOString(), '2026-07-22T15:05:00.000Z');
assert.strictEqual(test.normalizedGmailAppPassword(), 'abcdefghijklmnop');
secretValue = 'too-short';
assert.throws(() => test.normalizedGmailAppPassword(), error => error.code === 'FOXBEAR_GMAIL_SECRET_INVALID');
secretValue = 'abcdefghijklmnop';
assert.strictEqual(test.assertSmtpAccepted({ accepted: ['mcwoogi@gmail.com'] }), 1);
assert.throws(() => test.assertSmtpAccepted({ accepted: [], rejected: ['mcwoogi@gmail.com'] }), error => error.code === 'FOXBEAR_SMTP_NO_ACCEPTED_RECIPIENT');

const now = Date.parse('2026-07-22T00:00:00.000Z');
assert.strictEqual(test.isIncidentDeliveryDue({
  createdAt: Timestamp.fromMillis(now - 3 * 60 * 1000),
  delivery: { status: 'suppressed-rate-limit', attemptCount: 0 }
}, now), true, 'legacy rate-limited incidents are not recovered');
assert.strictEqual(test.isIncidentDeliveryDue({
  createdAt: Timestamp.fromMillis(now - 3 * 60 * 1000),
  delivery: { status: 'failed', attemptCount: 0, nextRetryAt: Timestamp.fromMillis(now + 1000) }
}, now), false, 'future retry was treated as due');

const summary = test.buildDailySummaryMail([{ severity: 'error', category: 'mastering', fingerprint: 'abc', delivery: { status: 'failed' } }], '2026-07-21', { truncated: true });
assert(summary.subject.includes('1+건'));
assert(summary.text.includes('집계 제한'));
assert(summary.html.includes('최신 5000건'));
assert.strictEqual(test.summaryMessageId('2026-07-21'), '<foxbear-summary-2026-07-21@foxbear-music.firebaseapp.com>');

console.log(`PASS v${meta.productVersion} KST incident quota, reservation accounting, SMTP acceptance, and summary backfill recovery`);
