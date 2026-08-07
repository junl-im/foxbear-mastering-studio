#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { getReleaseMetadata } = require('../tools/release-metadata');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const meta = getReleaseMetadata();
const pkg = JSON.parse(read('package.json'));
const functions = read('functions/index.js');
const firebase = read('src/firebase-bootstrap.js');
const reporter = read('src/boot/incident-reporter.js');
const rules = read('firestore.rules');
const indexes = JSON.parse(read('firestore.indexes.json'));
const adminView = read('src/ui/admin-incident-monitor-view.js');
const adminCss = read('assets/css/components/admin-incident-monitor.css');
const handoff = read('HANDOFF.md');
const releaseScript = read('tools/create-release-zip.sh');
const overwriteScript = read('tools/create-overwrite-zip.sh');

assert.strictEqual(pkg.version, '1.6.76');
assert.strictEqual(meta.assetVersion, '1.6.76-download-viewport-runtime-fault-diagnostics');
assert(handoff.includes('## 필수 결과 보고 형식'));
for (const heading of ['진행된 내용', '배포 파일 2종', '다음 예상 내용']) assert(handoff.includes(heading));

for (const token of [
  "require('node:crypto')",
  'incidentMessageId',
  "messageId: incidentMessageId(reportRef.id)",
  "'X-FoxBear-Report-ID'",
  'createDeliveryLeaseId',
  'currentDelivery.leaseId',
  "status: 'stale-completion'",
  "terminal ? 'dead-letter' : 'failed'",
  'collectDueIncidentReports',
  "queryIncidentStatus('pending', 'createdAt')",
  "queryIncidentStatus('failed', 'delivery.nextRetryAt')",
  "queryIncidentStatus('sending', 'delivery.leaseUntil')",
  'forceTerminal',
  "reason: 'daily-email-limit'",
  'terminal: false'
]) assert(functions.includes(token), `functions watchdog missing ${token}`);

assert(firebase.includes("delivery: { status: 'pending', attemptCount: 0 }"), 'client does not initialize the server-owned delivery queue');
assert(firebase.includes('requestIncidentRetry(reportId, options = {})'), 'admin retry options are missing');
assert(firebase.includes('forceTerminal: options.forceTerminal === true'), 'terminal retry flag is not persisted');
assert(reporter.includes("'dead-letter'"), 'client test flow does not recognize dead-letter delivery');

for (const token of [
  "'mastering-memory'",
  "request.resource.data.delivery.status == 'pending'",
  'request.resource.data.delivery.attemptCount == 0',
  "'forceTerminal'",
  'request.resource.data.forceTerminal is bool'
]) assert(rules.includes(token), `Firestore rules missing ${token}`);

assert(indexes.indexes.length >= 3, 'incident watchdog must retain at least the three queue indexes');
const indexedFields = indexes.indexes.map(index => index.fields.map(field => field.fieldPath).join('|'));
for (const field of ['delivery.status|createdAt', 'delivery.status|delivery.nextRetryAt', 'delivery.status|delivery.leaseUntil']) {
  assert(indexedFields.includes(field), `missing Firestore queue index ${field}`);
}

assert(adminView.includes("status === 'failed' || status === 'dead-letter'"));
assert(adminView.includes("requestIncidentRetry(reportId, { forceTerminal })"));
assert(adminView.includes('강제 재전송'));
assert(adminCss.includes('.incident-status-dead-letter'));
assert(pkg.scripts['deploy:incident'].includes('firestore:indexes'), 'incident deployment omits Firestore indexes');
for (const script of [releaseScript, overwriteScript]) {
  assert(script.includes('tools/sync-release-metadata.js" --check'), 'package creation must reject version drift');
  assert(script.includes('tools/verify-handoff-state.js'), 'package creation must reject handoff drift');
}

console.log(`PASS v${meta.productVersion} incident delivery watchdog and package gate smoke`);
