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
const firebaseJson = JSON.parse(read('firebase.json'));
const firebaseSource = read('src/firebase-bootstrap.js');
const reporterSource = read('src/boot/incident-reporter.js');
const functionsSource = read('functions/index.js');
const css = read('assets/css/components/support-settings.css');
const handoff = read('HANDOFF.md');
const origin = 'https://asia-northeast3-foxbear-music.cloudfunctions.net';

assert.strictEqual(pkg.version, '1.6.10');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain kebab-case');
assert(pkg.scripts['deploy:incident'].startsWith('firebase deploy --only hosting,firestore:rules,firestore:indexes,'));
const metaCsp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)" \/>/)?.[1] || '';
const headerCsp = firebaseJson.hosting.headers[0].headers.find(item => item.key === 'Content-Security-Policy')?.value || '';
assert(metaCsp.includes(origin), 'HTML CSP must allow the exact callable origin');
assert(headerCsp.includes(origin), 'Hosting CSP must allow the exact callable origin');
assert(firebaseSource.includes('const FIREBASE_FUNCTIONS_ORIGIN ='));
assert(firebaseSource.includes('normalizeIncidentCallableError'));
assert(firebaseSource.includes('FOXBEAR_INCIDENT_CALLABLE_NETWORK_BLOCKED'));
assert(firebaseSource.includes('incidentFunctionsOrigin: FIREBASE_FUNCTIONS_ORIGIN'));
assert(firebaseSource.includes('functionsOrigin: limitText(value.functionsOrigin || FIREBASE_FUNCTIONS_ORIGIN'));
assert(reporterSource.includes("'server-network-blocked'"));
assert(reporterSource.includes('classifyMailTestFailure'));
assert(reporterSource.includes('renderRecoveryGuidance'));
assert(reporterSource.includes('Hosting CSP와 Functions를 함께 배포'));
assert(/const INCIDENT_SERVICE_SCHEMA_VERSION = [2-9]\d*;/.test(functionsSource));
assert(functionsSource.includes('functionsOrigin: INCIDENT_FUNCTIONS_ORIGIN'));
assert(css.includes(".support-settings-guidance[data-tone='error']"));
assert(handoff.startsWith('# Handoff - v1.6.10'));

const elements = {
  incidentReportingGuidance: { textContent: '', dataset: {} },
  incidentServiceStatus: { textContent: '', dataset: {} },
  incidentAppCheckStatus: { textContent: '', dataset: {} }
};
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  navigator: { userAgent: 'Chrome', language: 'ko-KR', onLine: true },
  location: { pathname: '/' },
  innerWidth: 1280,
  innerHeight: 720,
  document: {
    body: { dataset: { build: '1.6.10' } },
    visibilityState: 'visible',
    getElementById: id => elements[id] || null,
    addEventListener() {}
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  localStorage: { getItem: () => null, setItem() {} },
  FoxBearBuildInfo: { productVersion: '1.6.10', assetVersion: '1.6.10-incident-readiness-contract-csp-cache-hardening' },
  FoxBearFirebase: { incidentFunctionsOrigin: origin }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(reporterSource, sandbox, { filename: 'incident-reporter.js' });
const reporter = sandbox.FoxBearIncidentReporter;
assert.strictEqual(reporter.classifyMailTestFailure('', 'functions/not-found', ''), 'server-api-not-deployed');
assert.strictEqual(reporter.classifyMailTestFailure('', 'FOXBEAR_INCIDENT_CALLABLE_NETWORK_BLOCKED', 'Failed to fetch'), 'server-network-blocked');
assert.strictEqual(reporter.classifyMailTestFailure('', 'functions/internal', 'internal'), 'server-api-internal');
assert.strictEqual(reporter.classifyMailTestFailure('', 'permission-denied', 'Missing or insufficient permissions'), 'permission-denied');
assert.strictEqual(reporter.classifyMailTestFailure('', 'unauthenticated', ''), 'authentication-failed');
reporter.renderRecoveryGuidance('server-network-blocked', 'FOXBEAR_INCIDENT_CALLABLE_NETWORK_BLOCKED', 'Failed to fetch');
assert(elements.incidentReportingGuidance.textContent.includes('npm run deploy:incident'));
assert(elements.incidentReportingGuidance.textContent.includes(origin));
assert.strictEqual(elements.incidentReportingGuidance.dataset.tone, 'error');

const moduleRecord = { exports: {} };
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const functionSandbox = {
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
    if (request === 'firebase-functions/v2/https') return { onCall: (options, handler) => ({ options, handler }), HttpsError };
    if (request === 'firebase-functions/params') return { defineSecret: () => ({ value: () => 'abcd efgh ijkl mnop' }) };
    if (request === 'firebase-admin/app') return { initializeApp() {} };
    if (request === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => ({}), delete: () => ({}) }, Timestamp: { fromMillis: value => ({ toMillis: () => value }) }, getFirestore: () => ({ collection: () => ({}) }) };
    if (request === 'nodemailer') return { createTransport: () => ({ verify: async () => true, sendMail: async () => ({}), close() {} }) };
    if (request === 'node:crypto') return { randomUUID: () => '00000000-0000-4000-8000-000000000000' };
    throw new Error(`unexpected require: ${request}`);
  }
};
vm.runInNewContext(functionsSource, functionSandbox, { filename: 'functions/index.js' });
const metadata = moduleRecord.exports.__test.incidentServiceMetadata({ app: null });
assert.strictEqual(metadata.productVersion, '1.6.10');
assert(metadata.serviceSchemaVersion >= 2);
assert.strictEqual(metadata.functionsOrigin, origin);

console.log('PASS v1.6.4 callable CSP recovery and actionable mail diagnostics');
