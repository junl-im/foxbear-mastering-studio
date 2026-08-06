#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function functionStart(source, name, offset = 0) {
  const asyncStart = source.indexOf(`async function ${name}`, offset);
  const plainStart = source.indexOf(`function ${name}`, offset);
  if (asyncStart >= 0 && (plainStart < 0 || asyncStart <= plainStart)) return asyncStart;
  return plainStart;
}

function extractFunction(source, name, nextName) {
  const start = functionStart(source, name);
  assert(start >= 0, `missing function ${name}`);
  const end = nextName ? functionStart(source, nextName, start + 1) : -1;
  assert(end > start, `missing function boundary after ${name}`);
  return source.slice(start, end);
}

async function verifyVisitWriteFence(firebaseSource) {
  const code = `${extractFunction(firebaseSource, 'visitDocumentId', 'logVisit')}\n${extractFunction(firebaseSource, 'logVisit', 'safeIncidentNumber')}`;
  let setFailure = null;
  let duplicateSnapshot = null;
  const writes = [];
  const context = {
    Object,
    Error,
    String,
    RegExp,
    Promise,
    bridgeState: { db: { name: 'db' } },
    limitText: (value, max) => String(value ?? '').slice(0, max),
    getDateKey: () => '2026-08-06',
    signInGuest: async () => ({ uid: 'anon-user-1' }),
    normalizeVisitPayload: payload => ({
      dateKey: payload.dateKey || '2026-08-06',
      clientAt: '2026-08-06T02:00:00.000Z',
      source: 'foxbear-web-client',
      storageUsed: false
    }),
    doc: (_db, collection, id) => ({ collection, id }),
    setDoc: async (ref, payload) => {
      writes.push({ ref, payload });
      if (setFailure) throw setFailure;
    },
    getDoc: async () => duplicateSnapshot,
    serverTimestamp: () => 'SERVER_TIMESTAMP'
  };
  vm.createContext(context);
  vm.runInContext(`${code}\nthis.visitDocumentId = visitDocumentId; this.logVisit = logVisit;`, context, { filename: 'firebase-visit-write-fence.vm.js' });

  assert.strictEqual(context.visitDocumentId('anon-user-1', '2026-08-06'), 'anon-user-1_2026-08-06');
  assert.strictEqual(context.visitDocumentId('anon-user-1', 'invalid'), 'anon-user-1_2026-08-06');

  const first = await context.logVisit({ dateKey: '2026-08-06' });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(first)), {
    logged: true,
    deduplicated: false,
    visitId: 'anon-user-1_2026-08-06'
  });
  assert.strictEqual(writes[0].ref.id, 'anon-user-1_2026-08-06');
  assert.strictEqual(writes[0].payload.uid, 'anon-user-1');
  assert.strictEqual(writes[0].payload.visitorId, 'anon-user-1');

  setFailure = Object.assign(new Error('permission denied'), { code: 'permission-denied' });
  duplicateSnapshot = {
    exists: () => true,
    data: () => ({ uid: 'anon-user-1' })
  };
  const duplicate = await context.logVisit({ dateKey: '2026-08-06' });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(duplicate)), {
    logged: true,
    deduplicated: true,
    visitId: 'anon-user-1_2026-08-06'
  });

  duplicateSnapshot = { exists: () => false, data: () => ({}) };
  await assert.rejects(() => context.logVisit({ dateKey: '2026-08-06' }), /permission denied/);
}

function verifyCallableCanonicalId(functionsSource) {
  const code = `${extractFunction(functionsSource, 'incidentSubmissionKey', 'callableReportId')}\n${extractFunction(functionsSource, 'callableReportId', 'timestampToIso')}`;
  class HttpsError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
  const context = {
    Date,
    Math,
    Number,
    String,
    RegExp,
    Error,
    HttpsError,
    cleanText: (value, max) => String(value ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max)
  };
  vm.createContext(context);
  vm.runInContext(`${code}\nthis.incidentSubmissionKey = incidentSubmissionKey; this.callableReportId = callableReportId;`, context, { filename: 'functions-report-id.vm.js' });
  const incident = {
    submissionKey: 'inc_0123456789abcdef',
    fingerprint: 'fingerprint',
    clientAt: '2026-08-06T02:00:00.000Z'
  };
  const expected = 'anon-user-1_inc_0123456789abcdef';
  assert.strictEqual(context.callableReportId('anon-user-1', '', incident), expected);
  assert.strictEqual(context.callableReportId('anon-user-1', expected, incident), expected);
  assert.throws(
    () => context.callableReportId('anon-user-1', 'anon-user-1_attacker-chosen-id', incident),
    error => error?.code === 'invalid-argument'
  );
}

async function main() {
  const pkg = JSON.parse(read('package.json'));
  const firebase = read('src/firebase-bootstrap.js');
  const rules = read('firestore.rules');
  const functions = read('functions/index.js');
  const changelog = read('CHANGELOG.md');
  const featureDoc = read('docs/V1.6.65_FIRESTORE_WRITE_FENCING_VISIT_DEDUP.md');
  const featureVersion = ['1', '6', '65'].join('.');

  assert(/^\d+\.\d+\.\d+$/.test(pkg.version));
  assert(pkg.qaChecks.includes('node qa/v1665_firestore_write_fencing_visit_dedup_smoke.js'));
  assert(changelog.includes(`# v${featureVersion} - Firestore Write Fencing and Daily Visit Deduplication`));
  assert(featureDoc.includes('siteVisits'));

  for (const token of [
    'function visitDocumentId(uid, dateKey)',
    "const visitRef = doc(bridgeState.db, 'siteVisits', visitId)",
    'deduplicated: true',
    'duplicate?.exists?.()'
  ]) assert(firebase.includes(token), `firebase write fence missing ${token}`);

  for (const token of [
    'function validVisitCreate(visitId)',
    "request.resource.data.dateKey.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')",
    "visitId == request.auth.uid + '_' + request.resource.data.dateKey",
    'allow create: if validVisitCreate(visitId)',
    'function validIncidentCreate(reportId)',
    "request.resource.data.submissionKey.matches('^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$')",
    "reportId == request.auth.uid + '_' + request.resource.data.submissionKey",
    'allow create: if validIncidentCreate(reportId)'
  ]) assert(rules.includes(token), `Firestore rule fence missing ${token}`);

  for (const token of [
    'const expected = `${cleanUid}_${incidentSubmissionKey(incident)}`.slice(0, 180)',
    "throw new HttpsError('invalid-argument', '문제 신고 문서 ID가 제출 키와 일치하지 않습니다.')"
  ]) assert(functions.includes(token), `Callable ID fence missing ${token}`);

  await verifyVisitWriteFence(firebase);
  verifyCallableCanonicalId(functions);
  console.log(`PASS v${featureVersion} Firestore write fencing, daily visit deduplication, and canonical incident IDs`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
