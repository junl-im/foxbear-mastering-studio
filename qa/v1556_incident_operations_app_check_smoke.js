#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const app = read('src/app.js');
const state = read('src/state/app-state.js');
const firebase = read('src/firebase-bootstrap.js');
const rules = read('firestore.rules');
const functions = read('functions/index.js');
const firebaseJson = JSON.parse(read('firebase.json'));
const adminIncidentCss = read('assets/css/components/admin-incident-monitor.css');
const adminIncidentView = read('src/ui/admin-incident-monitor-view.js');

assert.strictEqual(pkg.version, '1.5.95');
assert.strictEqual(pkg.foxbearRelease.assetVersion, '1.5.95-popup-settings-mail-test-recovery');
assert(index.includes('name="foxbear-app-check-site-key"'));
assert(index.includes('id="adminIncidentsTab"'));
assert(index.includes('id="adminIncidentsRows"'));
assert(index.includes('id="adminIncidentsSummary"'));
assert(index.includes('Operations Monitor'));

for (const token of [
  'firebase-app-check.js',
  'initializeAppCheck',
  'ReCaptchaEnterpriseProvider',
  'isTokenAutoRefreshEnabled: true',
  'refreshAppCheckToken',
  'getAdminIncidents',
  'requestIncidentRetry',
  'getIncidentRetryRequest'
]) assert(firebase.includes(token), `firebase bridge missing ${token}`);
assert(firebase.indexOf('await initializeFoxBearAppCheck()') < firebase.indexOf('bridgeState.auth = getAuth'), 'App Check must initialize before Firebase services');
assert(!firebase.includes('FOXBEAR_GMAIL_APP_PASSWORD'), 'client must never contain Gmail secret name');

for (const token of [
  'setAdminMonitorView',
  'getAdminIncidentMonitorViewController',
  'renderAdminIncidentsDialog'
]) assert(app.includes(token), `admin monitor missing ${token}`);
assert(state.includes("adminMonitorView: 'visits'"));
assert(state.includes("adminIncidentsRemoteError: ''"));

for (const token of [
  'validIncidentRetryRequest',
  'match /incidentRetryRequests/{requestId}',
  "request.resource.data.source == 'foxbear-admin-dashboard'",
  'allow get, list: if isAdmin()'
]) assert(rules.includes(token), `rules missing ${token}`);

for (const token of [
  "require('firebase-functions/v2/scheduler')",
  'MAX_DELIVERY_ATTEMPTS = 3',
  'RETRY_DELAYS_MS',
  "schedule: 'every 15 minutes'",
  "schedule: '0 9,12,15,18,21 * * *'",
  "document: 'incidentRetryRequests/{requestId}'",
  'buildDailySummaryMail',
  'reservedCount',
  'sentCount: sentCount + (outcome.ok ? 1 : 0)',
  "options.retry ? 'retrying' : 'sending'",
  "status: 'failed'"
]) assert(functions.includes(token), `functions missing ${token}`);
assert(!functions.includes('sentCount: sentCount + 1,\n      lastReservedAt'), 'SMTP reservation must not count as a successful send');

const csp = firebaseJson.hosting.headers[0].headers.find(item => item.key === 'Content-Security-Policy')?.value || '';
for (const origin of [
  'https://www.google.com/recaptcha/',
  'https://www.gstatic.com/recaptcha/',
  'https://recaptcha.google.com/recaptcha/',
  'https://firebaseappcheck.googleapis.com'
]) assert(csp.includes(origin), `CSP missing ${origin}`);

assert(index.includes('assets/css/components/admin-incident-monitor.css'), 'admin incident monitor stylesheet should be loaded');
assert(adminIncidentCss.includes('.admin-monitor-tabs'), 'admin incident monitor stylesheet should include monitor tabs');
assert(index.includes('src/ui/admin-incident-monitor-view.js'), 'admin incident monitor view should load before app');
for (const token of ['getAdminIncidents', 'requestIncidentRetry', 'formatStatus']) {
  assert(adminIncidentView.includes(token), `admin incident view missing ${token}`);
}

console.log('PASS v1.5.56 incident operations and App Check smoke');
