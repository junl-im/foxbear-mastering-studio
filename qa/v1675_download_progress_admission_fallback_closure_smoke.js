'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '1.6.87', 'package version must be v1.6.87');
assert(/^[a-z0-9][a-z0-9-]*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current build id must remain valid kebab-case');

const css = read('assets/css/download-dialog.css');
assert(css.includes('max-height: min(92dvh, 840px);'), 'desktop download dialog must be taller');
assert(css.includes('height: min(98dvh, 920px);'), 'mobile download sheet must use the taller viewport height');
assert(css.includes('scroll-margin-block: 14px 118px;'), 'worker progress needs scroll clearance above the sticky actions');
assert(css.includes('scroll-padding-bottom: calc(118px + env(safe-area-inset-bottom));'), 'mobile sheet needs bottom scroll padding for visible progress');

const dialog = read('src/ui/download-dialog-view.js');
assert(dialog.includes('panel.append(close, title, name, warning, listLabel, formatPicker, selectedSummary, progressCard, fileNameCard, actions);'), 'worker progress must mount above filename controls while active');
assert(dialog.includes("progressCard.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })"), 'busy download conversion must reveal the worker progress card');

const firebaseBootstrap = read('src/firebase-bootstrap.js');
assert(firebaseBootstrap.includes('function getIncidentAdmissionRejection(error)'), 'Firebase bridge needs explicit admission rejection classification');
assert(firebaseBootstrap.includes('error.foxbearAdmission = admissionRejection'), 'admission rejection metadata must survive to the reporter');
assert(firebaseBootstrap.includes('if (admissionRejection) {'), 'admission rejection must be detected before Firestore fallback');
const logIncidentStart = firebaseBootstrap.indexOf('async function logIncident(payload = {})');
const rejectIndex = firebaseBootstrap.indexOf('if (admissionRejection) {', logIncidentStart);
const fallbackIndex = firebaseBootstrap.indexOf("submissionTransport: 'firestore-fallback'", logIncidentStart);
assert(rejectIndex > logIncidentStart && rejectIndex < fallbackIndex, 'server admission rejection must stop before direct Firestore fallback');
assert(firebaseBootstrap.includes("error.details = { ...source.details }"), 'same-origin Callable errors must preserve structured details');

const reporter = read('src/boot/incident-reporter.js');
assert(reporter.includes('function classifyAdmissionRejection(error)'), 'reporter needs server admission classification');
assert(reporter.includes("reason: admission.kind === 'disabled' ? 'server-disabled' : 'server-rate-limit'"), 'reporter must expose a stable admission suppression reason');
assert(reporter.includes('queued: false'), 'newly rejected incidents must not enter the local retry queue');
assert(reporter.indexOf('const admission = classifyAdmissionRejection(error);') < reporter.indexOf('queueIncident(payload);', reporter.indexOf('async function report(')), 'admission classification must run before local queueing');

assert(pkg.qaChecks.includes('node qa/v1675_download_progress_admission_fallback_closure_smoke.js'), 'v1.6.87 smoke must be registered');

console.log('PASS v1.6.75 download progress visibility and incident admission fallback closure smoke');
