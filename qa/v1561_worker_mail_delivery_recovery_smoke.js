#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { getReleaseMetadata } = require('../tools/release-metadata');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const meta = getReleaseMetadata();
const index = read('index.html');
const reporter = read('src/boot/incident-reporter.js');
const functions = read('functions/index.js');
const workerService = read('src/utils/worker-job-service.js');
const sw = read('sw.js');
const runtimeHealth = read('src/boot/runtime-health.js');
const firebase = read('src/firebase-bootstrap.js');
const handoff = JSON.parse(read('HANDOFF_PACKAGE.json'));
const releasePack = read('tools/create-release-zip.sh');

const workerUrl = `src/utils/worker-job-service.js?v=${meta.assetVersion}`;
assert(index.includes(workerUrl), 'worker job service is not loaded by index.html');
assert(index.indexOf(workerUrl) < index.indexOf('src/app.js'), 'worker job service must load before app.js');
assert(new RegExp(`src/utils/worker-job-service\\.js\\?v=${meta.assetVersion.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}" integrity="sha384-`).test(index), 'worker job service SRI is missing');
assert(sw.includes(`./${workerUrl}`), 'service worker does not precache the worker job service');
assert(workerService.includes('global.FoxBearWorkerJobService = Object.freeze'), 'worker job service global export is missing');
assert(runtimeHealth.includes("'FoxBearWorkerJobService.run'"), 'runtime health does not require the worker job service');
assert(handoff.requiredRuntimeAssets.includes('src/utils/worker-job-service.js'), 'handoff manifest omits the worker job service');
assert(releasePack.includes("-not -path '*/node_modules/*'"), 'release packaging still rejects nested installed dependency symlinks');

for (const token of [
  'waitForFirebaseBridge',
  'current?.ready === true',
  'FIREBASE_READY_TIMEOUT_MS',
  'DELIVERY_STATUS_TIMEOUT_MS = 45000',
  'fingerprint: `manual-test-${testId}`',
  "status: 'status-check-failed'",
  'FOXBEAR_INCIDENT_BRIDGE_UNAVAILABLE'
]) assert(reporter.includes(token), `incident reporter recovery missing ${token}`);

for (const token of [
  'normalizedGmailAppPassword',
  "error.code = 'FOXBEAR_GMAIL_SECRET_INVALID'",
  'connectionTimeout: 15000',
  'socketTimeout: 30000',
  'isIncidentDeliveryDue',
  ".orderBy('createdAt', 'desc')",
  "status === 'sending' || status === 'retrying'",
  'reservationActive: true',
  'releasePreviousDailyReservation',
  "data.category === 'manual-test' && data.automatic === false"
]) assert(functions.includes(token), `server mail recovery missing ${token}`);

assert(!functions.includes(".where('delivery.status', '==', 'failed')"), 'retry scheduler still ignores pending or stalled reports');
assert(reporter.includes("'mastering-memory'") && firebase.includes("'mastering-memory'"), 'mastering memory incidents are degraded to unknown');
console.log(`PASS v${meta.productVersion} worker boot and incident mail delivery recovery smoke`);
