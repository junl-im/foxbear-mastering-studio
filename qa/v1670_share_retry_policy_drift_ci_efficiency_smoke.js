#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '1.6.91');
assert(pkg.foxbearRelease.assetVersion.startsWith(`${pkg.version}-`), 'current release metadata must remain synchronized');
assert(pkg.qaChecks.includes('node qa/v1670_share_retry_policy_drift_ci_efficiency_smoke.js'));

const fallbackWorkflow = read('.github/workflows/pages-branch-fallback.yml');
const staticGateIndex = fallbackWorkflow.indexOf('- name: Run static release gate');
const browserScopeIndex = fallbackWorkflow.indexOf('- name: Select browser QA impact scope');
const chromiumIndex = fallbackWorkflow.indexOf('- name: Install Chromium for browser QA');
assert(staticGateIndex >= 0 && staticGateIndex < browserScopeIndex, 'fallback static gate must finish before browser scope/setup');
assert(staticGateIndex < chromiumIndex, 'fallback must not install Chromium before static QA passes');

const selector = require('./browser/select-browser-scope');
const beforePackage = {
  name: 'foxbear-mastering-studio',
  version: '1.6.91',
  private: true,
  scripts: {
    'package:verify:full': 'node tools/verify-release-zip.js dist/foxbear-mastering-studio-v1.6.91-full.zip',
    'package:verify:patch': 'node tools/verify-patch-zip.js dist/foxbear-mastering-studio-v1.6.91-patch.zip'
  },
  foxbearRelease: {
    buildId: 'old-build',
    assetVersion: '1.6.91-old-build',
    cacheName: 'foxbear-shell-v1.6.91-old-build',
    bootRevision: 'boot-sri-v1669-old',
    updateSafetyRevision: 'update-safety-v1669-old',
    serviceWorkerRevision: 'sw-v1669-old'
  }
};
const afterPackage = JSON.parse(JSON.stringify(beforePackage));
afterPackage.version = '1.6.91';
afterPackage.scripts['package:verify:full'] = 'node tools/verify-release-zip.js dist/foxbear-mastering-studio-v1.6.91-full.zip';
afterPackage.scripts['package:verify:patch'] = 'node tools/verify-patch-zip.js dist/foxbear-mastering-studio-v1.6.91-patch.zip';
afterPackage.foxbearRelease = {
  buildId: 'new-build',
  assetVersion: '1.6.91-new-build',
  cacheName: 'foxbear-shell-v1.6.91-new-build',
  bootRevision: 'boot-sri-v1670-new',
  updateSafetyRevision: 'update-safety-v1670-new',
  serviceWorkerRevision: 'sw-v1670-new'
};
assert.strictEqual(selector.isReleaseMetadataOnlyChange(
  'package.json',
  JSON.stringify(beforePackage),
  JSON.stringify(afterPackage),
  selector.releaseMetadataFromPackage(beforePackage),
  selector.releaseMetadataFromPackage(afterPackage)
), true, 'delivery ZIP verifier paths must not turn a pure version bump into a full browser run');

const incidentSupportSource = read('src/boot/incident-support-service.js');
const diagnosticsSource = read('src/boot/incident-service-diagnostics.js');
const diagnosticsSandbox = {
  console,
  navigator: { userAgent: 'test', platform: 'test' },
  localStorage: { getItem: () => null, setItem() {} }
};
diagnosticsSandbox.window = diagnosticsSandbox;
diagnosticsSandbox.globalThis = diagnosticsSandbox;
vm.createContext(diagnosticsSandbox);
vm.runInContext(incidentSupportSource, diagnosticsSandbox, { filename: 'incident-support-service.js' });
vm.runInContext(diagnosticsSource, diagnosticsSandbox, { filename: 'incident-service-diagnostics.js' });
const drift = diagnosticsSandbox.FoxBearIncidentServiceDiagnostics.buildViewModel({
  service: {
    status: 'ready',
    appCheckEnforced: false,
    appCheckTokenPresent: false,
    appCheckPolicyVersion: 1,
    appCheckMode: 'disabled',
    appCheckPolicyReason: 'server-reason-drift',
    clientAppCheck: { contractVersion: 1, mode: 'disabled', reason: 'spark-hosting-no-app-check' }
  },
  bridge: {},
  csp: { ok: true }
});
assert.strictEqual(drift.appCheckStatus.tone, 'warning');
assert(drift.appCheckStatus.text.includes('정책 불일치'));

const swSource = read('sw.js');
const listeners = new Map();
const swSandbox = {
  console,
  URL,
  Response,
  Request,
  Headers,
  setTimeout,
  clearTimeout,
  Math,
  Date,
  Promise,
  Object,
  Array,
  Set,
  Map,
  Number,
  String,
  Boolean,
  Error,
  self: {
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000070' },
    registration: { scope: 'https://example.test/app/' },
    addEventListener(type, handler) { listeners.set(type, handler); },
    clients: { matchAll: async () => [], claim: async () => undefined },
    skipWaiting: async () => undefined,
    location: { origin: 'https://example.test' }
  }
};
swSandbox.globalThis = swSandbox.self;
vm.createContext(swSandbox);
vm.runInContext(swSource, swSandbox, { filename: 'sw.js' });
swSandbox.retentionSamples = [
  { key: '1700000003000-new', createdAt: 1700000003000, totalBytes: 200 * 1024 * 1024 },
  { key: '1700000002000-mid', createdAt: 1700000002000, totalBytes: 200 * 1024 * 1024 },
  { key: '1700000001000-old', createdAt: 1700000001000, totalBytes: 100 * 1024 * 1024 }
];
const retention = vm.runInContext('planSharedRecordRetention(retentionSamples, 1700000004000, 512 * 1024 * 1024)', swSandbox);
assert.deepStrictEqual(Array.from(retention.retainKeys), ['1700000003000-new']);
assert.deepStrictEqual(Array.from(retention.deleteKeys), ['1700000002000-mid', '1700000001000-old']);
assert(retention.retainedBytes + 512 * 1024 * 1024 <= 768 * 1024 * 1024);
assert(swSource.includes('SHARE_STORE_MAX_BYTES = 768 * 1024 * 1024'));
assert(swSource.includes('openCursor()'), 'share cleanup must inspect record byte metadata without reading Blob bytes into ArrayBuffers');

function createIndexedDb(records) {
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore() {},
    close() {},
    transaction(storeName, mode) {
      const tx = { error: null, oncomplete: null, onerror: null, onabort: null };
      const complete = () => setTimeout(() => tx.oncomplete?.(), 0);
      const store = {
        get(id) {
          const request = { result: null, error: null, onsuccess: null, onerror: null };
          setTimeout(() => {
            request.result = records.get(id) || null;
            request.onsuccess?.();
            complete();
          }, 0);
          return request;
        },
        put(value) {
          records.set(value.id, value);
          return { result: value, error: null, onsuccess: null, onerror: null };
        },
        delete(id) {
          const request = { error: null, onsuccess: null, onerror: null };
          records.delete(id);
          return request;
        }
      };
      tx.objectStore = () => store;
      return tx;
    }
  };
  return {
    open() {
      const request = { result: null, error: null, onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null };
      setTimeout(() => {
        request.result = db;
        request.onsuccess?.();
      }, 0);
      return request;
    }
  };
}

async function runShareScenario({ id, handleFiles, expectRemoved, expectHistory }) {
  const records = new Map([[id, {
    id,
    createdAt: Date.now(),
    files: [{ name: 'shared.wav', type: 'audio/wav', size: 1024 }]
  }]]);
  const historyCalls = [];
  const sandbox = {
    console,
    URL,
    URLSearchParams,
    Date,
    Math,
    Number,
    Object,
    Array,
    Promise,
    Error,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    indexedDB: createIndexedDb(records),
    location: {
      href: `https://example.test/app/?foxbearSharedAudio=${id}&shareCount=1`,
      search: `?foxbearSharedAudio=${id}&shareCount=1`
    },
    history: { replaceState(...args) { historyCalls.push(args); } },
    document: { title: 'FoxBear' },
    FoxBearRuntimeConfig: {}
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('src/boot/pwa-share-target-service.js'), sandbox, { filename: 'pwa-share-target-service.js' });
  const result = await sandbox.FoxBearPwaShareTargetService.processLaunch({
    state: { sharedLaunchHandled: false },
    validateAudioFile: () => ({ ok: true }),
    handleFiles,
    showToast() {}
  });
  assert.strictEqual(records.has(id), !expectRemoved);
  assert.strictEqual(historyCalls.length > 0, expectHistory);
  return result;
}

(async () => {
  let finished = false;
  const success = await runShareScenario({
    id: 'share-success',
    handleFiles: async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      finished = true;
      return { added: 1 };
    },
    expectRemoved: true,
    expectHistory: true
  });
  assert.strictEqual(finished, true, 'share launch must await the actual import pipeline');
  assert.strictEqual(success.ok, true);
  assert.strictEqual(success.count, 1);

  const retry = await runShareScenario({
    id: 'share-retry',
    handleFiles: async () => { throw new Error('transient-import-failure'); },
    expectRemoved: false,
    expectHistory: false
  });
  assert.strictEqual(retry.ok, false);
  assert.strictEqual(retry.retryable, true, 'transient import failures must keep the record and launch query for reload retry');

  console.log('PASS v1.6.70 atomic share retry, storage budget, App Check drift diagnostics, and CI efficiency');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
