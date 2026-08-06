#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const importSource = read('src/audio/audio-import-capability-service.js');
const firebaseSource = read('src/firebase-bootstrap.js');
const reporterSource = read('src/boot/incident-reporter.js');
const functionsSource = read('functions/index.js');
const handoff = read('HANDOFF.md');

assert.strictEqual(pkg.version, '1.6.66');
assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId));
assert(pkg.scripts['deploy:incident'].includes('functions:submitIncidentReport'));
assert(pkg.scripts['deploy:incident'].includes('functions:getIncidentDeliveryStatus'));
assert(importSource.includes("return '마스터링할 오디오 파일을 불러오세요. 여러 곡도 한 번에 선택할 수 있습니다.'"));
assert(!importSource.includes('내부 코덱은 불러올 때 실제 디코딩으로 최종 확인합니다.'));
assert(firebaseSource.includes('firebase-functions.js'));
assert(firebaseSource.includes("getFunctions(bridgeState.app, FIREBASE_FUNCTIONS_REGION)"));
assert(firebaseSource.includes("invokeIncidentCallable('submitIncidentReport'"));
assert(firebaseSource.includes("invokeIncidentCallable('getIncidentDeliveryStatus'"));
assert(firebaseSource.includes("transport: 'callable'"));
assert(firebaseSource.includes('Compatibility fallback for deployments that have not published the callable'));
assert(functionsSource.includes("const { onCall, HttpsError } = require('firebase-functions/v2/https')"));
assert(functionsSource.includes('exports.submitIncidentReport = onCall'));
assert(functionsSource.includes('exports.getIncidentDeliveryStatus = onCall'));
assert(functionsSource.includes("if (!uid) throw new HttpsError('unauthenticated'"));
assert(functionsSource.includes('await reportRef.create({'));
assert(functionsSource.includes("if (!reportId || !reportId.startsWith(`${uid}_`))"));
assert(reporterSource.includes("'server-api-not-deployed': '최신 오류 신고 서버 기능이 아직 배포되지 않았습니다."));
assert(handoff.startsWith('# Handoff - v1.6.66'));

const sandbox = {
  console,
  document: {
    createElement: () => ({ canPlayType: () => '' })
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(importSource, sandbox);
const service = sandbox.FoxBearAudioImportCapabilityService;
const statusElement = { textContent: '' };
const fileInput = { attrs: {}, dataset: {}, setAttribute(name, value) { this.attrs[name] = value; } };
service.applyToInputs({ fileInput, statusElement });
assert.strictEqual(statusElement.textContent, '마스터링할 오디오 파일을 불러오세요. 여러 곡도 한 번에 선택할 수 있습니다.');
assert(fileInput.attrs.accept.includes('.wav'));
assert(fileInput.attrs.accept.includes('.mp3'));
assert(fileInput.attrs.accept.includes('.aiff'));

const moduleRecord = { exports: {} };
const functionsSandbox = {
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
  fetch: async () => ({ ok: true, status: 204, headers: { get: () => null }, text: async () => '' }),
  process: { env: {} },
  require(request) {
    if (request === 'firebase-functions/v2/firestore') return { onDocumentCreated: (options, handler) => ({ options, handler }) };
    if (request === 'firebase-functions/v2/scheduler') return { onSchedule: (options, handler) => ({ options, handler }) };
    if (request === 'firebase-functions/v2/https') return { onCall: (options, handler) => ({ options, handler }), HttpsError: class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } } };
    if (request === 'firebase-functions/params') return { defineSecret: () => ({ value: () => 'abcd efgh ijkl mnop' }) };
    if (request === 'firebase-admin/app') return { initializeApp() {} };
    if (request === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => ({}), delete: () => ({}) }, Timestamp: { fromMillis: value => ({ toMillis: () => value }) }, getFirestore: () => ({ collection: () => ({}) }) };
    if (request === 'nodemailer') return { createTransport: () => ({ verify: async () => true, sendMail: async () => ({}), close() {} }) };
    if (request === 'node:crypto') return { randomUUID: () => '00000000-0000-4000-8000-000000000000' };
    throw new Error(`unexpected require: ${request}`);
  }
};
vm.runInNewContext(functionsSource, functionsSandbox, { filename: 'functions/index.js' });
const functionTest = moduleRecord.exports.__test;
const normalized = functionTest.normalizeCallableIncident({ category: 'manual-test', severity: 'warning', message: 'mail test', memoryGb: 200, cpuCores: -5 });
assert.strictEqual(normalized.category, 'manual-test');
assert.strictEqual(normalized.severity, 'warning');
assert.strictEqual(normalized.memoryGb, 64);
assert.strictEqual(normalized.cpuCores, 0);
const canonicalId = `uid123_${normalized.submissionKey}`;
assert.strictEqual(functionTest.callableReportId('uid123', canonicalId, normalized), canonicalId);
assert.throws(
  () => functionTest.callableReportId('uid123', 'uid123_bucket_manual', normalized),
  error => error?.code === 'invalid-argument'
);
const generatedId = functionTest.callableReportId('uid123', '', { fingerprint: 'manual-test-1', clientAt: '2026-08-06T02:00:00.000Z' });
assert(generatedId.startsWith('uid123_inc_'));
const serialized = functionTest.serializeIncidentDelivery({ exists: true, data: () => ({ delivery: { status: 'emailed', attemptCount: 1, acceptedCount: 1 } }) });
assert.strictEqual(serialized.status, 'emailed');
assert.strictEqual(serialized.acceptedCount, 1);

console.log('PASS v1.5.99 lightweight import guidance and callable-first incident mail recovery');
