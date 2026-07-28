#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const reporterSource = read('src/boot/incident-reporter.js');
const incidentSupportSource = read('src/boot/incident-support-service.js');
const incidentStateSource = read('src/boot/incident-state-service.js');
const incidentRecoveryPolicySource = read('src/boot/incident-recovery-policy.js');
const firebaseSource = read('src/firebase-bootstrap.js');
const functionsSource = read('functions/index.js');
const orchestratorSource = read('src/audio/mastering-orchestrator-service.js');
const hudSource = read('src/ui/bulk-import-hud-view.js');
const css = read('assets/css/components/support-settings.css');

assert.strictEqual(pkg.version, '1.6.20');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.foxbearRelease.buildId), 'release build ID must remain valid kebab-case');
assert(pkg.scripts['deploy:incident'].includes('functions:retryOwnIncidentReport'));
assert(functionsSource.includes('exports.retryOwnIncidentReport = onCall'));
assert(functionsSource.includes('const USER_MAIL_TEST_RETRY_LIMIT = 2'));
assert(functionsSource.includes('const USER_MAIL_TEST_RETRY_COOLDOWN_MS = 60 * 1000'));
assert(/const INCIDENT_SERVICE_SCHEMA_VERSION = ([4-9]|[1-9][0-9]+);/.test(functionsSource), 'incident schema must preserve v4+ retry metadata');
assert((functionsSource.match(/userRetryCount: clampIncidentNumber\(currentDelivery\.userRetryCount/g) || []).length >= 2, 'user retry count must survive both SMTP success and failure finalization');
assert(firebaseSource.includes('async function retryOwnIncidentReport(reportId)'));
assert(reporterSource.includes('function formatRetryCountdown'));
assert(reporterSource.includes('function retryHistoryItem'));
assert(css.includes('.incident-history-retry'));
assert(orchestratorSource.includes("pauseActiveBatch('performance-danger')"));
assert(orchestratorSource.includes("resumeActiveBatch('performance-recovered')"));
assert(hudSource.includes('performanceHoldLabel') && hudSource.includes('정상화 확인'), 'HUD must preserve performance-protected recovery guidance');

const memory = new Map();
const reporterSandbox = {
  console, Date, Math, Object, String, Number, Boolean, Array, Map, Set, RegExp, Error,
  setTimeout, clearTimeout,
  navigator: { userAgent: 'Chrome', language: 'ko-KR', onLine: true },
  location: { pathname: '/' }, innerWidth: 1280, innerHeight: 720,
  localStorage: { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, String(value)) },
  document: {
    body: { dataset: { build: '1.6.20' } }, visibilityState: 'visible',
    getElementById: () => null, addEventListener() {},
    createElement: () => ({ setAttribute() {}, style: {}, select() {}, remove() {} })
  },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  FoxBearBuildInfo: { productVersion: '1.6.20', assetVersion: '1.6.20-incident-background-sync-network-decay' }
};
reporterSandbox.window = reporterSandbox;
reporterSandbox.globalThis = reporterSandbox;
vm.createContext(reporterSandbox);
vm.runInContext(incidentSupportSource, reporterSandbox, { filename: 'incident-support-service.js' });
vm.runInContext(incidentStateSource, reporterSandbox, { filename: 'incident-state-service.js' });

vm.runInContext(incidentRecoveryPolicySource, reporterSandbox, { filename: 'incident-recovery-policy.js' });

vm.runInContext(reporterSource, reporterSandbox, { filename: 'incident-reporter.js' });
const reporter = reporterSandbox.FoxBearIncidentReporter;
const now = Date.parse('2026-07-24T08:00:00Z');
assert.strictEqual(reporter.formatRetryCountdown('2026-07-24T08:12:00Z', now), '자동 재시도까지 약 12분');
assert.strictEqual(reporter.formatRetryCountdown('2026-07-24T10:05:00Z', now), '자동 재시도까지 약 2시간 5분');
assert.strictEqual(reporter.formatRetryCountdown('2026-07-24T07:59:00Z', now), '자동 재시도 가능');
assert.strictEqual(reporter.canRetryHistoryItem({ reportId: 'uid_test', status: 'smtp-auth-failed', userRetryCount: 1, userRetryLimit: 2 }), true);
assert.strictEqual(reporter.canRetryHistoryItem({ reportId: 'uid_test', status: 'smtp-auth-failed', userRetryCount: 2, userRetryLimit: 2 }), false);
assert.strictEqual(reporter.canRetryHistoryItem({ reportId: 'uid_test', status: 'dead-letter', terminal: true }), false);
reporter.appendTestHistory('smtp-network-failed', {
  result: { reportId: 'uid_manual_test' },
  delivery: { attemptCount: 2, nextRetryAt: '2026-07-24T08:12:00Z', userRetryCount: 1, userRetryLimit: 2 }
}, 'SMTP 연결 실패');
const history = reporter.loadTestHistory();
assert.strictEqual(history[0].attemptCount, 2);
assert.strictEqual(history[0].userRetryCount, 1);
assert.strictEqual(history[0].nextRetryAt, '2026-07-24T08:12:00Z');

(async () => {
  const listeners = new Map();
  const pauseEvents = [];
  const starts = [];
  const sandbox = {
    window: null, console, AbortController, setTimeout, clearTimeout,
    addEventListener(name, handler) { listeners.set(name, handler); }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(orchestratorSource, sandbox, { filename: 'mastering-orchestrator-service.js' });
  const runner = sandbox.FoxBearMasteringOrchestratorService.createMasteringBatchRunner({
    beginHudBatch: items => ({ batchId: `v1606-${items.length}` }),
    onPauseChanged: meta => pauseEvents.push({ paused: meta.paused, autoPaused: meta.autoPaused, reason: meta.reason }),
    onTrackStart: track => starts.push(track.id),
    masterTrack: () => new Promise(resolve => setTimeout(() => resolve(true), 35))
  });
  const running = runner.runBatch([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  await new Promise(resolve => setTimeout(resolve, 6));
  listeners.get('foxbear:ambient-health-change')({ detail: { level: 'danger' } });
  assert.strictEqual(runner.getActiveBatchSnapshot().autoPaused, true);
  assert.strictEqual(runner.resumeActiveBatch('user-resume'), false, 'manual resume must not bypass a confirmed danger pause');
  await new Promise(resolve => setTimeout(resolve, 48));
  assert.deepStrictEqual(starts, ['a'], 'danger pause must stop before starting the next track');
  listeners.get('foxbear:ambient-health-change')({ detail: { level: 'normal' } });
  const result = await running;
  assert.strictEqual(result.completed, 3);
  assert.deepStrictEqual(starts, ['a', 'b', 'c']);
  assert.deepStrictEqual(pauseEvents, [
    { paused: true, autoPaused: true, reason: 'performance-danger' },
    { paused: false, autoPaused: false, reason: 'performance-recovered' }
  ]);
  console.log('PASS v1.6.6 mail retry countdown and performance-safe batch auto-pause');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
