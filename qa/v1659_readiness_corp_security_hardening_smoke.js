#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const firebase = JSON.parse(read('firebase.json'));
const functionsSource = read('functions/index.js');
const incidentStateSource = read('src/boot/incident-state-service.js');
const incidentReporterSource = read('src/boot/incident-reporter.js');

const headers = new Map((firebase.hosting?.headers || [])
  .flatMap(rule => rule.headers || [])
  .map(item => [item.key, item.value]));
assert.strictEqual(headers.get('Cross-Origin-Opener-Policy'), 'same-origin-allow-popups');
assert.strictEqual(headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
assert(!String(headers.get('Cross-Origin-Resource-Policy') || '').includes('allow-popups'));
assert(functionsSource.includes('verifiedGoogleCallableIdentity'));
assert(functionsSource.includes("doc(scope)"));
assert(functionsSource.includes('sensitiveChecksRestricted'));
assert(functionsSource.includes('maxInstances: 2'));
assert(functionsSource.includes('smtpReadinessRequiresAdmin: true'));
assert(incidentStateSource.includes('restricted: value?.restricted === true'));
assert(incidentReporterSource.includes("SMTP 심층 점검은 관리자 전용"));

const timestamp = value => ({ toMillis: () => value, toDate: () => new Date(value) });
const firestoreDocs = new Map([
  ['siteAdmins/admin-google', { active: true, role: 'admin', email: 'admin@example.com', authProvider: 'google.com' }],
  ['incidentOperations/mail', { status: 'healthy' }]
]);
let smtpVerifyCount = 0;
let smtpTransportCount = 0;

const makeDoc = (collection, id) => ({
  async get() {
    if (collection === 'siteAdmins' && id === 'lookup-error') throw new Error('simulated administrator lookup failure');
    const value = firestoreDocs.get(`${collection}/${id}`);
    return { exists: value !== undefined, data: () => value };
  },
  async set(value, options = {}) {
    const key = `${collection}/${id}`;
    const previous = firestoreDocs.get(key) || {};
    firestoreDocs.set(key, options.merge ? { ...previous, ...value } : value);
  }
});

const moduleRecord = { exports: {} };
class HttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
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
  fetch: async () => ({ ok: true, status: 204, headers: { get: () => null }, text: async () => '' }),
  process: { env: {} },
  require(request) {
    if (request === 'firebase-functions/v2/firestore') return { onDocumentCreated: (options, handler) => ({ options, handler }) };
    if (request === 'firebase-functions/v2/scheduler') return { onSchedule: (options, handler) => ({ options, handler }) };
    if (request === 'firebase-functions/v2/https') return { onCall: (options, handler) => ({ options, handler }), HttpsError };
    if (request === 'firebase-functions/params') return { defineSecret: () => ({ value: () => 'abcd efgh ijkl mnop' }) };
    if (request === 'firebase-admin/app') return { initializeApp() {} };
    if (request === 'firebase-admin/firestore') return {
      FieldValue: { serverTimestamp: () => timestamp(Date.now()), delete: () => ({}) },
      Timestamp: { fromMillis: timestamp },
      getFirestore: () => ({ collection: name => ({ doc: id => makeDoc(name, id) }) })
    };
    if (request === 'nodemailer') return {
      createTransport: () => {
        smtpTransportCount += 1;
        return {
          verify: async () => { smtpVerifyCount += 1; return true; },
          sendMail: async () => ({}),
          close() {}
        };
      }
    };
    if (request === 'node:crypto') return { randomUUID: () => '00000000-0000-4000-8000-000000000000' };
    if (request === './app-check-policy') return require(path.join(root, 'functions/app-check-policy.js'));
    throw new Error(`unexpected require: ${request}`);
  }
};

vm.runInNewContext(functionsSource, sandbox, { filename: 'functions/index.js' });
const callable = moduleRecord.exports.checkIncidentDeploymentReadiness;
assert(callable && typeof callable.handler === 'function');
assert.strictEqual(callable.options.maxInstances, 2);

(async () => {
  const publicFirst = await callable.handler({
    auth: { uid: 'anonymous-a', token: { firebase: { sign_in_provider: 'anonymous' } } },
    app: null,
    data: {}
  });
  const publicSecond = await callable.handler({
    auth: { uid: 'anonymous-b', token: { firebase: { sign_in_provider: 'anonymous' } } },
    app: null,
    data: {}
  });
  assert.strictEqual(publicFirst.ok, true);
  assert.strictEqual(publicFirst.cached, false);
  assert.strictEqual(publicSecond.cached, true);
  assert.strictEqual(publicFirst.scope, 'public');
  assert.strictEqual(publicFirst.sensitiveChecksRestricted, true);
  assert.strictEqual(publicFirst.service.serviceSchemaVersion, 7);
  assert.strictEqual(publicFirst.service.smtpReadinessRequiresAdmin, true);
  assert.strictEqual(publicFirst.checks.smtpSecret.status, 'restricted');
  assert.strictEqual(publicFirst.checks.smtpConnection.status, 'restricted');
  assert.strictEqual(smtpTransportCount, 0);
  assert.strictEqual(smtpVerifyCount, 0);
  assert(firestoreDocs.has('incidentDeploymentReadiness/public'));
  assert(!firestoreDocs.has('incidentDeploymentReadiness/anonymous-a'));
  assert(!firestoreDocs.has('incidentDeploymentReadiness/anonymous-b'));

  const spoofedAdmin = await callable.handler({
    auth: { uid: 'admin-google', token: { email: 'admin@example.com', email_verified: true, firebase: { sign_in_provider: 'anonymous' } } },
    app: null,
    data: {}
  });
  assert.strictEqual(spoofedAdmin.scope, 'public');
  assert.strictEqual(spoofedAdmin.sensitiveChecksRestricted, true);
  assert.strictEqual(smtpVerifyCount, 0);

  const mismatchedEmail = await callable.handler({
    auth: { uid: 'admin-google', token: { email: 'other@example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } } },
    app: null,
    data: {}
  });
  assert.strictEqual(mismatchedEmail.scope, 'public');
  assert.strictEqual(mismatchedEmail.sensitiveChecksRestricted, true);
  assert.strictEqual(smtpVerifyCount, 0);

  const lookupFailure = await callable.handler({
    auth: { uid: 'lookup-error', token: { email: 'admin@example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } } },
    app: null,
    data: {}
  });
  assert.strictEqual(lookupFailure.scope, 'public');
  assert.strictEqual(lookupFailure.sensitiveChecksRestricted, true);
  assert.strictEqual(smtpVerifyCount, 0);

  const adminRequest = () => callable.handler({
    auth: { uid: 'admin-google', token: { email: 'admin@example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } } },
    app: null,
    data: {}
  });
  const [adminFirst, adminConcurrent] = await Promise.all([adminRequest(), adminRequest()]);
  const adminSecond = await adminRequest();
  assert.strictEqual(adminFirst.ok, true);
  assert.strictEqual(adminFirst.cached, false);
  assert.strictEqual(adminConcurrent.cached, false);
  assert.strictEqual(adminSecond.cached, true);
  assert.strictEqual(adminFirst.scope, 'admin');
  assert.strictEqual(adminFirst.sensitiveChecksRestricted, false);
  assert.strictEqual(adminFirst.checks.smtpSecret.status, 'ready');
  assert.strictEqual(adminFirst.checks.smtpConnection.status, 'ready');
  assert.strictEqual(smtpTransportCount, 1);
  assert.strictEqual(smtpVerifyCount, 1);
  assert(firestoreDocs.has('incidentDeploymentReadiness/admin'));
  assert.strictEqual(pkg.qaChecks.filter(item => item.includes('v1659_readiness_corp_security_hardening_smoke.js')).length, 1);
  console.log('PASS v1.6.59 readiness scope cache, admin-only SMTP verification, and valid CORP header hardening');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
