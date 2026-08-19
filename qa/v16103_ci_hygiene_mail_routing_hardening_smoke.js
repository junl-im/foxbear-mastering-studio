#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const functionsSource = read('functions/index.js');
const reporter = read('src/boot/incident-reporter.js');
const stateService = read('src/boot/incident-state-service.js');
const index = read('index.html');
const sw = read('sw.js');
const envExample = read('functions/.env.example');
const policy = require('../tools/source-hygiene-policy');

assert.strictEqual(pkg.version, '1.6.109');
assert(/^[a-z0-9][a-z0-9-]*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current build ID must remain valid kebab-case');
assert.strictEqual(pkg.foxbearRelease?.assetVersion, `${pkg.version}-${pkg.foxbearRelease.buildId}`);
assert(pkg.qaChecks.includes('node qa/v16103_ci_hygiene_mail_routing_hardening_smoke.js'));
assert(!fs.existsSync(path.join(ROOT, 'README.txt')), 'accidental helper README.txt must be physically absent from release source');
assert(policy.isForbidden('README.txt') && policy.isRepairable('README.txt'), 'README.txt must remain both forbidden and repairable');
assert(policy.PATCH_CLEANUP_PATHS.includes('README.txt'), 'patch cleanup must retain README.txt deletion contract');

assert(functionsSource.includes('const INCIDENT_SERVICE_SCHEMA_VERSION = 8;'));
assert(functionsSource.includes('function incidentMailRoutingMetadata()'));
assert(functionsSource.includes("code: 'FOXBEAR_MAIL_ROUTING_FALLBACK'"));
assert(functionsSource.includes('mailRoutingReadinessRequiresAdmin: true'));
assert(functionsSource.includes("const INCIDENT_READINESS_CHECK_KEYS = Object.freeze(['functions', 'firestore', 'mailRouting', 'smtpSecret', 'smtpConnection'])"));
assert(index.includes('data-deploy-check="mailRouting"'));
assert(stateService.includes("'firestore', 'mailRouting', 'smtpSecret'"));
assert(reporter.includes("mailRouting: ['Functions 운영 환경에서 FOXBEAR_ALERT_RECIPIENT와 FOXBEAR_ALERT_SENDER를 설정하세요.'"));
assert(reporter.includes("item.status === 'restricted' || item.status === 'warning'"), 'warning readiness rows must render as warnings even while operational');
assert(envExample.includes('Production should set BOTH mail routing variables'));

for (const name of [
  'SHARE_MAX_FILES', 'SHARE_MAX_FILE_BYTES', 'SHARE_MAX_TOTAL_BYTES', 'SHARE_RECORD_TTL_MS',
  'SHARE_RECORD_LIMIT', 'SHARE_STORE_MAX_BYTES', 'SHARE_AUDIO_EXTENSIONS', 'SHARE_VIDEO_AUDIO_TYPES'
]) assert(!sw.includes(name), `dead duplicate Service Worker share constant must be removed: ${name}`);
assert(sw.includes('const SHARE_POLICY = SHARE_POLICY_API.createPolicy();'), 'shared native-share policy must remain authoritative');

function loadFunctionsWithEnv(env) {
  const moduleRecord = { exports: {} };
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  const timestamp = value => ({ toMillis: () => value, toDate: () => new Date(value) });
  const db = { collection: () => ({ doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }), set: async () => {} }) }) };
  const sandbox = {
    module: moduleRecord, exports: moduleRecord.exports, console, Date, Math, Object, String, Number, Boolean, Array, Map, Set, RegExp, Error, URL,
    AbortController, setTimeout, clearTimeout, fetch: async () => ({ ok: true, status: 204, headers: { get: () => null }, text: async () => '' }),
    process: { env: { ...env } },
    require(request) {
      if (request === 'firebase-functions/v2/firestore') return { onDocumentCreated: (options, handler) => ({ options, handler }) };
      if (request === 'firebase-functions/v2/scheduler') return { onSchedule: (options, handler) => ({ options, handler }) };
      if (request === 'firebase-functions/v2/https') return { onCall: (options, handler) => ({ options, handler }), HttpsError };
      if (request === 'firebase-functions/params') return { defineSecret: () => ({ value: () => 'abcd efgh ijkl mnop' }) };
      if (request === 'firebase-admin/app') return { initializeApp() {} };
      if (request === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => timestamp(Date.now()), delete: () => ({}) }, Timestamp: { fromMillis: timestamp }, getFirestore: () => db };
      if (request === 'nodemailer') return { createTransport: () => ({ verify: async () => true, sendMail: async () => ({}), close() {} }) };
      if (request === 'node:crypto') return { randomUUID: () => '00000000-0000-4000-8000-000000000000' };
      if (request === './app-check-policy') return require(path.join(ROOT, 'functions/app-check-policy.js'));
      throw new Error(`unexpected require: ${request}`);
    }
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(functionsSource, sandbox, { filename: 'functions/index.js' });
  return moduleRecord.exports;
}

const configured = loadFunctionsWithEnv({
  FOXBEAR_ALERT_RECIPIENT: 'ops-recipient@example.test',
  FOXBEAR_ALERT_SENDER: 'ops-sender@example.test'
});
const routing = configured.__test.incidentMailRoutingMetadata();
assert.deepStrictEqual(JSON.parse(JSON.stringify(routing)), {
  configured: true,
  fallbackActive: false,
  recipientSource: 'env',
  senderSource: 'env'
});
assert(!JSON.stringify(routing).includes('@'), 'routing diagnostics must expose source state, never operational addresses');
const service = configured.__test.incidentServiceMetadata({ app: null });
assert.strictEqual(service.mailRoutingReadinessRequiresAdmin, true);

console.log('PASS v1.6.103 CI helper deletion, private mail-routing observability, and shared SW share-policy cleanup');
