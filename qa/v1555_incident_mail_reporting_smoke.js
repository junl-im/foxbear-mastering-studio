#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const reporter = read('src/boot/incident-reporter.js');
const firebase = read('src/firebase-bootstrap.js');
const rules = read('firestore.rules');
const functions = read('functions/index.js');
const firebaseJson = JSON.parse(read('firebase.json'));
const releaseScript = read('tools/create-release-zip.sh');
const overwriteScript = read('tools/create-overwrite-zip.sh');

assert.strictEqual(pkg.version, '1.5.91');
assert.strictEqual(pkg.foxbearRelease.assetVersion, '1.5.91-cancellable-audio-pipeline-performance-guards');
assert(index.includes('src/boot/incident-reporter.js?v=1.5.91-cancellable-audio-pipeline-performance-guards'));
assert(index.indexOf('src/boot/runtime-health.js') < index.indexOf('src/boot/incident-reporter.js'));
assert(index.indexOf('src/boot/incident-reporter.js') < index.indexOf('src/app.js'));
assert(sw.includes('./src/boot/incident-reporter.js?v=1.5.91-cancellable-audio-pipeline-performance-guards'));
assert(!index.includes('</body>\n    <script'), 'scripts must not be placed after </body>');
assert(index.includes('id="incidentReportingToggle"'));
assert(index.includes('id="incidentReportingTest"'));
assert(index.includes('오디오·파일명·전체 로컬 경로는 포함하지 않으며'));

for (const token of ['redactSensitiveText', 'MAX_AUTOMATIC_PER_SESSION', 'MAX_AUTOMATIC_PER_DAY', 'DUPLICATE_WINDOW_MS', 'QUEUE_KEY', 'waitForDelivery']) {
  assert(reporter.includes(token), `incident reporter missing ${token}`);
}
assert(!reporter.includes('GMAIL_APP_PASSWORD'), 'client must not contain the Gmail secret name');
assert(!read('src/firebase-bootstrap.js').includes('nodemailer'), 'client must not send SMTP directly');
assert(firebase.includes('getIncidentDelivery'));
assert(firebase.includes('deduplicated: true'));
assert(rules.includes('match /incidentReports/{reportId}'));
assert(rules.includes('allow create: if validIncidentCreate()'));
assert(rules.includes('resource.data.uid == request.auth.uid'));
assert(rules.includes('allow list: if isAdmin()'));
assert(rules.includes('match /incidentMailState/{document=**}'));

for (const token of [
  "defineSecret('FOXBEAR_GMAIL_APP_PASSWORD')",
  "ALERT_RECIPIENT = 'mcwoogi@gmail.com'",
  "document: 'incidentReports/{reportId}'",
  'retry: false',
  'DUPLICATE_WINDOW_MS',
  'RESERVATION_WINDOW_MS',
  'DAILY_EMAIL_LIMIT',
  'escapeHtml',
  "status: 'emailed'",
  "status: 'failed'"
]) assert(functions.includes(token), `server mailer missing ${token}`);
assert(!functions.includes('console.log(GMAIL_APP_PASSWORD'), 'secret must never be logged');
assert(Array.isArray(firebaseJson.functions) && firebaseJson.functions[0].source === 'functions');
assert(firebaseJson.hosting.ignore.includes('functions/**'), 'functions source must not be hosted publicly');
assert(releaseScript.includes("-x '*/node_modules/*'"));
assert(overwriteScript.includes('copy_path "functions"'));
assert(overwriteScript.includes("-name 'node_modules'"));

console.log('PASS v1.5.55 automatic incident mail reporting smoke');
