#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const functionsSource = read('functions/index.js');
const firebaseSource = read('src/firebase-bootstrap.js');
const adminSource = read('src/ui/admin-incident-monitor-view.js');
const appSource = read('src/app.js');
const indexSource = read('index.html');
const cssSource = read('assets/css/components/admin-incident-monitor.css');
const handoff = read('HANDOFF.md');
const docs = read('docs/V1.5.71_ADMIN_OPERATIONS_UI_MAIL_PERIOD_TRENDS.md');
assert.strictEqual(pkg.version, '1.5.84');
assert.strictEqual(pkg.foxbearRelease.assetVersion, '1.5.84-trusted-types-browser-gate-recovery');
for (const token of [
  "const PRODUCT_VERSION = '1.5.84'", 'nextVerificationDueAt', 'verificationAgeDays', 'scheduleStatus',
  'mailTestPeriodTrends: true', 'mailVerificationSchedule: true', 'adminOperationsUiHierarchy: true'
]) assert(functionsSource.includes(token), `functions contract missing: ${token}`);
for (const token of ['nextVerificationDueAt', 'verificationAgeDays', 'scheduleStatus', 'getIncidentMailTestHistory({ limit: 200 })']) {
  assert(firebaseSource.includes(token), `firebase bridge contract missing: ${token}`);
}
for (const token of [
  'renderHealthHero', 'pickPrimaryAction', 'mailTestPeriodCutoff', 'summarizeMailTestItems', 'renderMailTestTrend',
  "state.adminMailTestPeriod = state.adminMailTestPeriod || '30d'", 'admin-mail-status-chip'
]) assert(adminSource.includes(token), `admin view contract missing: ${token}`);
for (const token of ['adminIncidentHealthHero', 'adminIncidentMailTestPeriod', 'adminIncidentMailTestTrend', '현재 상태 요약']) {
  assert(indexSource.includes(token) || docs.includes(token), `admin HTML/docs contract missing: ${token}`);
}
for (const token of ['adminIncidentHealthHero', 'adminIncidentMailTestPeriod', 'adminIncidentMailTestTrend']) {
  assert(appSource.includes(token), `app element binding missing: ${token}`);
}
for (const token of ['.admin-incident-health-hero', '.admin-incident-action-grid', '.admin-mail-test-trend-bars', '.admin-mail-status-chip', '@media (max-width: 720px)']) {
  assert(cssSource.includes(token), `admin UI CSS missing: ${token}`);
}
assert(handoff.includes('## v1.5.71 인수인계'));
assert(docs.includes('최근 7일'));
assert(docs.includes('다음 실수신 검증 예정 시각'));
console.log('PASS v1.5.71 admin operations UI hierarchy, responsive polish, verification schedule, period statistics, and mail trend contract');
