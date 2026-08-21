'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '1.6.113', 'package version must be v1.6.113');
assert(/^[a-z0-9][a-z0-9-]*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current build id must remain valid kebab-case');

const functionsIndex = read('functions/index.js');
for (const contract of [
  "const INCIDENT_ADMISSION_MINUTE_LIMIT = 8",
  "const INCIDENT_ADMISSION_HOUR_LIMIT = 30",
  "const INCIDENT_ADMISSION_DAY_LIMIT = 60",
  "const INCIDENT_ADMISSION_MANUAL_DAY_LIMIT = 12",
  "const INCIDENT_ADMISSION_GLOBAL_MINUTE_LIMIT = 120",
  "const INCIDENT_ADMISSION_GLOBAL_HOUR_LIMIT = 600",
  "INCIDENT_ADMISSION_CONTROL_DOC_ID = 'admissionControl'",
  "mode === 'degraded'",
  "admissionMode === 'disabled'",
  "new HttpsError('resource-exhausted'",
  "maxInstances: 4",
  "submissionTransport: 'callable'",
  "expiresAt: Timestamp.fromMillis(Date.now() + REPORT_TTL_DAYS * 86400000)"
]) {
  assert(functionsIndex.includes(contract), `incident admission contract missing: ${contract}`);
}
assert(functionsIndex.includes("doc(`${INCIDENT_ADMISSION_STATE_PREFIX}global`)"), 'global admission bucket must limit UID churn');
assert(functionsIndex.indexOf('const existing = await reportRef.get();') < functionsIndex.indexOf('const admissionMode = await getIncidentAdmissionControl();'), 'duplicate report ids must be deduplicated before consuming admission budget');

const rules = read('firestore.rules');
assert(rules.includes('match /incidentReports/{reportId}'), 'incident report rules missing');
assert(rules.includes('allow create: if false;'), 'direct client incident creation must be denied');
assert(!rules.includes('function validIncidentCreate(reportId)'), 'legacy direct incident create validator must be removed');

const firebaseBootstrap = read('src/firebase-bootstrap.js');
const logIncidentStart = firebaseBootstrap.indexOf('async function logIncident(payload = {})');
const logIncidentEnd = firebaseBootstrap.indexOf('async function getIncidentDelivery(reportId)', logIncidentStart);
const logIncidentSource = firebaseBootstrap.slice(logIncidentStart, logIncidentEnd);
assert(!logIncidentSource.includes("submissionTransport: 'firestore-fallback'"), 'incident submit must not use direct Firestore fallback');
assert(!logIncidentSource.includes("setDoc(reportRef"), 'incident submit must not write incidentReports directly');
assert(logIncidentSource.includes('foxbearServerOnlyIncident'), 'server-only incident failure marker missing');

const incidentReporter = read('src/boot/incident-reporter.js');
assert(incidentReporter.includes('function getKstDateKey(now = new Date())'), 'client incident daily quota must use a KST date helper');
assert(incidentReporter.includes("new Date(source.getTime() + (9 * 60 * 60 * 1000)).toISOString().slice(0, 10)"), 'KST date helper must apply the UTC+9 offset');
assert(incidentReporter.includes("'stored-no-mail-service'"), 'mail test UI must understand Spark-only stored status');
assert(!/function getDailyState\(\) \{\s*const today = new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/.test(incidentReporter), 'incident daily quota must not use UTC date rollover');

const downloadSource = read('src/download/download-service.js');
assert(downloadSource.includes('const getDownloadDecodeMemoryPolicy = () =>'), 'download transcode path needs a decode memory policy');
assert(downloadSource.includes('maxDecodedPcmBytes: memoryPolicy.maxDecodedPcmBytes'), 'download transcode must pass decoded PCM limit');
assert(downloadSource.includes('maxDecodePeakBytes: memoryPolicy.maxDecodePeakBytes'), 'download transcode must pass resident peak limit');

const standardConfig = {
  LOW_MEMORY_MAX_DECODED_PCM_BYTES: 192 * 1024 * 1024,
  LOW_MEMORY_MAX_DECODE_PEAK_BYTES: 448 * 1024 * 1024,
  STANDARD_MAX_DECODED_PCM_BYTES: 768 * 1024 * 1024,
  STANDARD_MAX_DECODE_PEAK_BYTES: 1792 * 1024 * 1024
};
const makeDownloadContext = ({ deviceMemory = 8, userAgent = 'Desktop Chrome', coarse = false } = {}) => {
  const context = {
    window: null,
    globalThis: null,
    navigator: { deviceMemory, userAgent },
    matchMedia: () => ({ matches: coarse }),
    FoxBearRuntimeConfig: standardConfig,
    console,
    Object,
    Array,
    Map,
    WeakMap,
    Set,
    WeakSet,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Promise,
    Error,
    Blob,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    setTimeout,
    clearTimeout
  };
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(downloadSource, context, { filename: 'download-service.js' });
  return context.FoxBearDownloadService;
};

const desktopPolicy = makeDownloadContext({ deviceMemory: 8, userAgent: 'Desktop Chrome', coarse: false }).getDownloadDecodeMemoryPolicy();
assert.strictEqual(desktopPolicy.lowMemory, false, 'desktop download transcode should use standard decode budget');
assert.strictEqual(desktopPolicy.maxDecodedPcmBytes, standardConfig.STANDARD_MAX_DECODED_PCM_BYTES, 'standard download decoded limit mismatch');

const mobilePolicy = makeDownloadContext({ deviceMemory: 4, userAgent: 'Android Mobile', coarse: true }).getDownloadDecodeMemoryPolicy();
assert.strictEqual(mobilePolicy.lowMemory, true, 'mobile/low-memory download transcode must use the low-memory budget');
assert.strictEqual(mobilePolicy.maxDecodePeakBytes, standardConfig.LOW_MEMORY_MAX_DECODE_PEAK_BYTES, 'low-memory download peak limit mismatch');

const setup = read('FIREBASE_SETUP.md');
assert(setup.includes('incidentMailState/admissionControl'), 'Firebase setup must document the server admission control document');
assert(setup.includes('브라우저의 직접 Firestore fallback은 허용하지 않습니다'), 'Firebase setup must document the server-only incident boundary');

console.log('PASS v1.6.74 incident admission, Spark retention, download memory closure, and KST quota smoke');
