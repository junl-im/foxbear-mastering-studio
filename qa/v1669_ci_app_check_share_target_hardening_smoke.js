#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const sharePolicySource = read('src/config/pwa-share-policy.js');

assert.strictEqual(pkg.version, '1.6.111');
assert(String(pkg.foxbearRelease.buildId || '').trim(), 'current release buildId must remain configured');
assert(pkg.qaChecks.includes('node qa/v1669_ci_app_check_share_target_hardening_smoke.js'));

const pages = read('.github/workflows/pages.yml');
const browserJob = pages.match(/\n  browser-qa:\n([\s\S]*?)(?=\n  build:)/)?.[1] || '';
assert(browserJob.includes('needs: static-qa'), 'browser QA must not consume runner/install time before static QA passes');
assert(pages.includes('needs: [static-qa, browser-qa]'), 'Pages build must retain both release gates');

const policy = require('../functions/app-check-policy');
const canonicalPolicy = JSON.parse(read('app-check-policy.json'));
assert.deepStrictEqual(policy.INCIDENT_APP_CHECK_POLICY, canonicalPolicy);
assert(Number(policy.INCIDENT_APP_CHECK_POLICY.contractVersion) >= 1);
assert.strictEqual(policy.incidentCallableOptions({ enforceAppCheck: true }).enforceAppCheck, false, 'callers must not bypass the release policy');
assert.strictEqual(policy.incidentAppCheckMetadata({ app: null }).appCheckTokenPresent, false);
assert.strictEqual(policy.incidentAppCheckMetadata({ app: { appId: 'observed' } }).appCheckTokenPresent, true, 'monitoring metadata must report a presented token even when enforcement is disabled');

const functionsSource = read('functions/index.js');
assert.strictEqual((functionsSource.match(/onCall\(incidentCallableOptions\(/g) || []).length, 5, 'all public callables must share the App Check option contract');
assert(!functionsSource.includes('enforceAppCheck: false'), 'direct callable App Check literals must not drift outside the policy module');
assert(functionsSource.includes('...incidentAppCheckMetadata(request)'));

const runtimeConfigSource = read('src/config/app-runtime-config.js');
const runtimeSandbox = { console };
runtimeSandbox.window = runtimeSandbox;
runtimeSandbox.FoxBearBuildInfo = { appVersion: 'Pro v1.6.111', assetVersion: pkg.foxbearRelease.assetVersion };
vm.createContext(runtimeSandbox);
vm.runInContext(runtimeConfigSource, runtimeSandbox, { filename: 'app-runtime-config.js' });
const clientPolicy = runtimeSandbox.FoxBearRuntimeConfig.APP_CHECK_POLICY;
assert.strictEqual(clientPolicy.mode, policy.INCIDENT_APP_CHECK_POLICY.mode);
assert.strictEqual(clientPolicy.enforced, policy.INCIDENT_APP_CHECK_POLICY.enforced);
assert.strictEqual(clientPolicy.reason, policy.INCIDENT_APP_CHECK_POLICY.reason);
assert(Object.isFrozen(clientPolicy));

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
const diagnostics = diagnosticsSandbox.FoxBearIncidentServiceDiagnostics;
const enforcedMissing = diagnostics.buildViewModel({
  service: { status: 'ready', appCheckEnforced: true, appCheckTokenPresent: false },
  bridge: {}, csp: { ok: true }
});
assert.strictEqual(enforcedMissing.appCheckStatus.tone, 'warning');
assert(enforcedMissing.appCheckStatus.text.includes('토큰 미확인'));
const observedToken = diagnostics.buildViewModel({
  service: { status: 'ready', appCheckEnforced: false, appCheckTokenPresent: true },
  bridge: {}, csp: { ok: true }
});
assert.strictEqual(observedToken.appCheckStatus.tone, 'neutral');
assert(observedToken.appCheckStatus.text.includes('비강제 토큰 감지'));

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
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000069' },
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
swSandbox.samples = [
  { name: 'valid.wav', type: '', size: 10 * 1024 * 1024 },
  { name: 'video.mov', type: 'video/quicktime', size: 20 * 1024 * 1024 },
  { name: 'oversize.wav', type: 'audio/wav', size: 221 * 1024 * 1024 },
  { name: 'notes.txt', type: 'text/plain', size: 1000 },
  { name: 'large-a.wav', type: 'audio/wav', size: 220 * 1024 * 1024 },
  { name: 'large-b.wav', type: 'audio/wav', size: 220 * 1024 * 1024 },
  { name: 'large-c.wav', type: 'audio/wav', size: 220 * 1024 * 1024 }
];
const selected = vm.runInContext('selectSharedAudioFiles(samples)', swSandbox);
assert.strictEqual(selected.files.length, 4, 'unsupported, per-file oversize, and total overflow files must be rejected before IndexedDB');
assert(selected.totalBytes <= 512 * 1024 * 1024);
assert.strictEqual(selected.rejected, 3);
assert.strictEqual(vm.runInContext("createShareRecordId(1700000000000)", swSandbox), '1700000000000-00000000-0000-4000-8000-000000000069');
assert(swSource.includes('pruneSharedFileRecords'));
assert(sharePolicySource.includes('recordTtlMs: 24 * 60 * 60 * 1000'));
assert(sharePolicySource.includes('recordLimit: 8'));
assert(!swSource.includes('SHARE_RECORD_TTL_MS') && !swSource.includes('SHARE_RECORD_LIMIT = 8'), 'share retention limits must not be duplicated in the service worker');

const appSource = read('src/app.js');
const shareTargetServiceSource = read('src/boot/pwa-share-target-service.js');
assert(appSource.includes('FoxBearPwaRuntimeBridge?.createBridge') || appSource.includes('FoxBearPwaShareTargetService.processLaunch'));
assert(shareTargetServiceSource.includes('clearLaunchQuery'));
assert(shareTargetServiceSource.includes("code === 'unsupported'") || shareTargetServiceSource.includes("shareError === 'unsupported'"));
assert(shareTargetServiceSource.includes('MOBILE_NATIVE_SHARE_MAX_AGE_MS'));
assert(shareTargetServiceSource.includes("url.searchParams.delete('shareCount')"));
assert(read('index.html').includes(`src/boot/pwa-share-target-service.js?v=${pkg.foxbearRelease.assetVersion}`));
assert(swSource.includes(`./src/boot/pwa-share-target-service.js?v=${pkg.foxbearRelease.assetVersion}`));

console.log('PASS v1.6.69 CI ordering, App Check policy drift guard, and PWA share-target hardening');
