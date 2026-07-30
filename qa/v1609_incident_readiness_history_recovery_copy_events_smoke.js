#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const html = read('index.html');
const css = read('assets/css/components/support-settings.css');
const reporterSource = read('src/boot/incident-reporter.js');
const incidentRecoverySweepSource = read('src/boot/incident-recovery-sweep-service.js');
const incidentSupportSource = read('src/boot/incident-support-service.js');
const incidentStateSource = read('src/boot/incident-state-service.js');
const incidentRecoveryPolicySource = read('src/boot/incident-recovery-policy.js');
const incidentLocalQueueSource = read('src/boot/incident-local-queue-service.js');
const incidentQueueCoordinationSource = read('src/boot/incident-queue-coordination-service.js');
const incidentServiceDiagnosticsSource = read('src/boot/incident-service-diagnostics.js');
const incidentDiagnosticsViewSource = read('src/boot/incident-diagnostics-view-service.js');
const incidentSubmissionIdentitySource = read('src/boot/incident-submission-identity-service.js');
const incidentControlsViewSource = read('src/boot/incident-controls-view-service.js');
const handoff = read('HANDOFF.md');

assert.strictEqual(pkg.version, '1.6.42');
assert(/^[a-z0-9][a-z0-9-]*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current build ID is invalid');
assert(pkg.qaChecks.length >= 332);
assert.strictEqual((html.match(/data-deploy-copy/g) || []).length, 5);
assert(html.includes('id="incidentDeploymentHistory"'));
assert(html.includes('id="incidentDeploymentHistoryClear"'));
assert(css.includes('v1.6.9 readiness history, recovery copy, and immediate status polish'));
assert(incidentStateSource.includes('const DEPLOYMENT_HISTORY_KEY'));
assert(incidentStateSource.includes('const MAX_DEPLOYMENT_HISTORY = 3'));
assert(reporterSource.includes("const INCIDENT_STATUS_EVENT = 'foxbear:incident-status-change'"));
assert(reporterSource.includes('function copyDeploymentRecovery'));
assert(reporterSource.includes('function renderDeploymentHistory'));
assert(handoff.startsWith('# Handoff - v1.6.42'));

const memory = new Map();
const copied = [];
const events = [];
const origin = 'https://asia-northeast3-foxbear-music.cloudfunctions.net';
class CustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}
const sandbox = {
  console, Date, Math, Object, String, Number, Boolean, Array, Map, Set, RegExp, Error, CustomEvent,
  setTimeout, clearTimeout,
  navigator: { userAgent: 'Chrome', language: 'ko-KR', onLine: true, clipboard: { writeText: async value => copied.push(String(value)) } },
  location: { pathname: '/' }, innerWidth: 1280, innerHeight: 720,
  localStorage: { getItem: key => memory.has(key) ? memory.get(key) : null, setItem: (key, value) => memory.set(key, String(value)) },
  document: {
    body: { dataset: { build: '1.6.42' }, appendChild() {} }, visibilityState: 'visible',
    getElementById: () => null,
    querySelector(selector) {
      if (selector === 'meta[http-equiv="Content-Security-Policy"]') return { getAttribute: () => `connect-src 'self' ${origin}` };
      return null;
    },
    addEventListener() {}, createElement: () => ({ setAttribute() {}, style: {}, select() {}, remove() {} })
  },
  addEventListener() {}, removeEventListener() {}, dispatchEvent(event) { events.push(event); return true; },
  FoxBearBuildInfo: { productVersion: '1.6.42', assetVersion: '1.6.42-spark-google-admin-auth' }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(incidentSupportSource, sandbox, { filename: 'incident-support-service.js' });
vm.runInContext(incidentStateSource, sandbox, { filename: 'incident-state-service.js' });

vm.runInContext(incidentRecoveryPolicySource, sandbox, { filename: 'incident-recovery-policy.js' });

vm.runInContext(incidentRecoverySweepSource, sandbox, { filename: 'incident-recovery-sweep-service.js' });
vm.runInContext(incidentLocalQueueSource, sandbox, { filename: 'incident-local-queue-service.js' });
vm.runInContext(incidentQueueCoordinationSource, sandbox, { filename: 'incident-queue-coordination-service.js' });
vm.runInContext(incidentServiceDiagnosticsSource, sandbox, { filename: 'incident-service-diagnostics.js' });
vm.runInContext(incidentDiagnosticsViewSource, sandbox, { filename: 'incident-diagnostics-view-service.js' });
vm.runInContext(incidentSubmissionIdentitySource, sandbox, { filename: 'incident-submission-identity-service.js' });
vm.runInContext(incidentControlsViewSource, sandbox, { filename: 'incident-controls-view-service.js' });
vm.runInContext(reporterSource, sandbox, { filename: 'incident-reporter.js' });
const reporter = sandbox.FoxBearIncidentReporter;

(async () => {
  const base = Date.now() - 10000;
  const makeReadiness = (index, ok, failedKey = '') => ({
    ok,
    checkedAt: new Date(base + index * 1000).toISOString(),
    lastHealthyAt: ok ? new Date(base + index * 1000).toISOString() : new Date(base).toISOString(),
    nextCheckAt: '',
    service: { productVersion: '1.6.42', functionsOrigin: origin },
    checks: {
      csp: { ok: failedKey !== 'csp' }, functions: { ok: failedKey !== 'functions' }, firestore: { ok: failedKey !== 'firestore' },
      smtpSecret: { ok: failedKey !== 'smtpSecret' }, smtpConnection: { ok: failedKey !== 'smtpConnection' }
    }
  });
  reporter.saveDeploymentReadiness(makeReadiness(1, true));
  reporter.saveDeploymentReadiness(makeReadiness(2, false, 'functions'));
  reporter.saveDeploymentReadiness(makeReadiness(3, true));
  reporter.saveDeploymentReadiness(makeReadiness(4, false, 'smtpSecret'));
  const history = reporter.loadDeploymentHistory();
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[0].failed[0], 'smtpSecret');
  assert.strictEqual(history[1].ok, true);
  assert.strictEqual(history[2].failed[0], 'functions');
  reporter.saveDeploymentReadiness(makeReadiness(4, false, 'smtpSecret'));
  assert.strictEqual(reporter.loadDeploymentHistory().length, 3, 'same checkedAt must update instead of duplicating');

  await reporter.copyDeploymentRecovery('smtpSecret');
  assert(copied.at(-1).includes('FIREBASE_SETUP.md'));
  assert(!copied.at(-1).includes('GMAIL_APP_PASSWORD'));
  reporter.saveDeploymentReadiness(makeReadiness(5, false, 'csp'));
  await reporter.copyDeploymentRecovery('csp');
  assert.strictEqual(copied.at(-1), 'npm run deploy:incident');

  const statusEvents = events.filter(event => event.type === 'foxbear:incident-status-change');
  assert(statusEvents.length >= 5);
  assert.strictEqual(statusEvents.at(-1).detail.summary.label, '확인 필요');
  reporter.setEnabled(false);
  assert.strictEqual(events.at(-1).detail.summary.label, '꺼짐');
  reporter.clearDeploymentHistory();
  assert.strictEqual(reporter.loadDeploymentHistory().length, 0);
  console.log('PASS v1.6.9 incident readiness history, recovery copy, privacy, and immediate status events');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
