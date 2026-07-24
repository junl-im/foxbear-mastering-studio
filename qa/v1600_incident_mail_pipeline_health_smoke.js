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
const css = read('assets/css/components/support-settings.css');
const firebaseSource = read('src/firebase-bootstrap.js');
const reporterSource = read('src/boot/incident-reporter.js');
const functionsSource = read('functions/index.js');
const handoff = read('HANDOFF.md');

assert.strictEqual(pkg.version, '1.6.4');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain kebab-case');
assert(pkg.scripts['deploy:incident'].includes('functions:getIncidentServiceStatus'));
assert(html.includes('id="incidentReportingPipeline"'));
assert(html.includes('id="incidentStageAuth"'));
assert(html.includes('id="incidentStageApi"'));
assert(html.includes('id="incidentStageQueue"'));
assert(html.includes('id="incidentStageMail"'));
assert(html.includes('id="incidentServiceStatus"'));
assert(html.includes('id="incidentAppCheckStatus"'));
assert(css.includes(".incident-reporting-pipeline li[data-state='warning']"));
assert(css.includes(".incident-reporting-pipeline li[data-state='error']"));
assert(firebaseSource.includes("invokeIncidentCallable('getIncidentServiceStatus'"));
assert(firebaseSource.includes('normalizeIncidentServiceStatus'));
assert(firebaseSource.includes('clientProductVersion'));
assert(reporterSource.includes('async function refreshServiceStatus'));
assert(reporterSource.includes('compareVersions'));
assert(reporterSource.includes("onProgress('queue', 'active'"));
assert(reporterSource.includes("onProgress('mail', 'active'"));
assert(functionsSource.includes('exports.getIncidentServiceStatus = onCall'));
assert(functionsSource.includes("appCheckMode: 'monitor'"));
assert(functionsSource.includes('appCheckTokenPresent: Boolean(request.app)'));
assert(handoff.startsWith('# Handoff - v1.6.4'));

const stageItems = {};
const elements = {};
for (const id of ['incidentStageAuth', 'incidentStageApi', 'incidentStageQueue', 'incidentStageMail']) {
  const item = { dataset: {} };
  stageItems[id] = item;
  elements[id] = { textContent: '', closest: () => item };
}
elements.incidentServiceStatus = { textContent: '', dataset: {} };
elements.incidentAppCheckStatus = { textContent: '', dataset: {} };
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  navigator: { userAgent: 'test', language: 'ko-KR', onLine: true },
  location: { pathname: '/' },
  innerWidth: 1280,
  innerHeight: 720,
  document: {
    body: { dataset: { build: '1.6.4' } },
    visibilityState: 'visible',
    getElementById: id => elements[id] || null,
    addEventListener() {}
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  localStorage: { getItem: () => null, setItem() {} },
  FoxBearBuildInfo: { productVersion: '1.6.4', assetVersion: '1.6.4-incident-callable-csp-recovery' }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(reporterSource, sandbox, { filename: 'incident-reporter.js' });
const reporter = sandbox.FoxBearIncidentReporter;
assert.strictEqual(reporter.compareVersions('2.0.0', '2.0.0'), 0);
assert.strictEqual(reporter.compareVersions('1.9.9', '2.0.0'), -1);
assert.strictEqual(reporter.compareVersions('2.0.0', '1.9.9'), 1);
reporter.updatePipelineStage('api', 'warning', '서버 업데이트 필요');
assert.strictEqual(elements.incidentStageApi.textContent, '서버 업데이트 필요');
assert.strictEqual(stageItems.incidentStageApi.dataset.state, 'warning');

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
const metadata = moduleRecord.exports.__test.incidentServiceMetadata({ app: { appId: 'verified' } });
assert.strictEqual(metadata.productVersion, '1.6.4');
assert.strictEqual(metadata.status, 'ready');
assert.strictEqual(metadata.appCheckMode, 'monitor');
assert.strictEqual(metadata.appCheckEnforced, false);
assert.strictEqual(metadata.appCheckTokenPresent, true);
const serviceStatus = moduleRecord.exports.getIncidentServiceStatus;
assert.strictEqual(serviceStatus.options.enforceAppCheck, false);
serviceStatus.handler({ auth: { uid: 'guest-1' }, app: null }).then(result => {
  assert.strictEqual(result.productVersion, '1.6.4');
  assert.strictEqual(result.appCheckTokenPresent, false);
  return serviceStatus.handler({ auth: null, app: null }).then(
    () => assert.fail('unauthenticated request should fail'),
    error => assert.strictEqual(error.code, 'unauthenticated')
  );
}).then(() => {
  console.log('PASS v1.6.0 incident mail pipeline health and server version diagnostics');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
