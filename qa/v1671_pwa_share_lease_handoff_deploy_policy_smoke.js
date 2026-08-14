#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const policy = require('../src/config/pwa-share-policy.js');
const canonicalAppCheck = JSON.parse(read('app-check-policy.json'));

assert.strictEqual(pkg.version, '1.6.99');
assert(/^[a-z0-9][a-z0-9-]*$/.test(String(pkg.foxbearRelease.buildId || '')), 'current release build ID must remain valid kebab-case');
assert(pkg.qaChecks.includes('node qa/v1671_pwa_share_lease_handoff_deploy_policy_smoke.js'));
assert(pkg.qaChecks.includes('node --check src/config/pwa-share-policy.js'));
assert(pkg.qaChecks.includes('node --check src/boot/pwa-runtime-bridge.js'));
assert.strictEqual(canonicalAppCheck.contractVersion, 2);

const MiB = 1024 * 1024;
const exactSizes = Array.from({ length: 11 }, () => 42 * MiB).concat(50 * MiB);
const exact = policy.selectFiles(exactSizes.map((size, index) => ({ name: `${index}.wav`, type: 'audio/wav', size })), policy.createPolicy());
assert.strictEqual(exact.files.length, 12);
assert.strictEqual(exact.totalBytes, 512 * MiB);
const overflow = policy.selectFiles([...exactSizes, 1].map((size, index) => ({ name: `${index}.wav`, type: 'audio/wav', size })), policy.createPolicy());
assert.strictEqual(overflow.files.length, 12);
assert.strictEqual(overflow.rejected, 1);
const now = Date.now();
const retention = policy.planRetention([
  { key: 'active', createdAt: now - 2000, totalBytes: 240 * MiB, claimOwner: 'tab-a', claimExpiresAt: now + 60000 },
  { key: 'old', createdAt: now - 1000, totalBytes: 200 * MiB }
], now, 512 * MiB, policy.createPolicy());
assert.strictEqual(retention.canAccept, true);
assert(retention.retainKeys.includes('active'), 'active imports must survive share-store pruning');
assert(!retention.deleteKeys.includes('active'), 'active imports must never be deleted by quota recovery');
const blocked = policy.planRetention([
  { key: 'active-large', createdAt: now, totalBytes: 300 * MiB, claimOwner: 'tab-a', claimExpiresAt: now + 60000 }
], now, 512 * MiB, policy.createPolicy());
assert.strictEqual(blocked.canAccept, false, 'new share must be rejected instead of deleting an active import');
assert(policy.isQuotaExceededError(Object.assign(new Error('disk full'), { name: 'QuotaExceededError' })));

const sw = read('sw.js');
for (const token of [
  'assertShareStorageCapacity',
  'share-storage-quota',
  'recoverSharedFileRecords',
  'FOXBEAR_SHARE_HANDOFF_READY',
  'FOXBEAR_RECOVER_SHARE_STORAGE',
  'claimOwner',
  'claimExpiresAt',
  'schemaVersion: SHARE_POLICY.schemaVersion'
]) assert(sw.includes(token), `service worker missing ${token}`);
assert(sw.indexOf('recoverSharedFileRecords()') < sw.indexOf('await self.clients.claim()'), 'share handoff recovery must happen before clients are claimed');

const shareService = read('src/boot/pwa-share-target-service.js');
for (const token of ['claimSharedAudio', 'renewClaim', 'releaseClaim', 'completeClaim', 'claimed-by-other-tab', 'CLAIM_HEARTBEAT_MS']) {
  assert(shareService.includes(token), `share service missing ${token}`);
}
const app = read('src/app.js');
assert(app.includes('FoxBearPwaRuntimeBridge?.createBridge'));
assert(!app.includes("const registration = await navigator.serviceWorker.register(resolveFoxBearScriptUrl(SERVICE_WORKER_URL))"), 'service worker orchestration must remain split from app.js');
assert(read('src/boot/pwa-runtime-bridge.js').includes('registerServiceWorker'));
assert(app.split(/\r?\n/).length < 13300, 'app.js structural gate exceeded');

const appCheckResult = spawnSync(process.execPath, ['tools/check-app-check-policy.js'], { cwd: ROOT, encoding: 'utf8' });
assert.strictEqual(appCheckResult.status, 0, appCheckResult.stderr || appCheckResult.stdout);
assert(read('firebase.json').includes('npm run appcheck:deploy:verify'));
assert(pkg.scripts['audit:prod:official'].includes('registry.npmjs.org'));
assert(pkg.scripts['functions:audit:official'].includes('registry.npmjs.org'));

const browserSpec = read('qa/browser/pwa-share-lease-handoff-playwright.spec.js');
for (const title of ['success removes record', 'failed import survives reload', 'two tabs cannot import', 'Android-sized policy', 'service-worker activation preserves']) {
  assert(browserSpec.includes(title), `browser E2E missing ${title}`);
}

const workflow = read('.github/workflows/pages.yml');
assert(workflow.includes('needs: static-qa'));

async function verifyDeployedPolicyMock() {
  const originalFetch = global.fetch;
  const makeResponse = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) });
  global.fetch = async (url, options = {}) => {
    const value = String(url);
    if (value.includes('identitytoolkit.googleapis.com')) return makeResponse({ idToken: 'mock-token' });
    if (value.includes('/app-check-policy.json')) return makeResponse(canonicalAppCheck);
    if (value.includes('/api/incident/status')) return makeResponse({ result: {
      productVersion: pkg.version,
      appCheckPolicyVersion: canonicalAppCheck.contractVersion,
      appCheckMode: canonicalAppCheck.mode,
      appCheckEnforced: canonicalAppCheck.enforced,
      appCheckPolicyReason: canonicalAppCheck.reason
    } });
    return makeResponse({ error: 'not-found' }, 404);
  };
  try {
    const { verify } = require('../tools/verify-deployed-app-check-policy.js');
    const result = await verify({ origin: 'https://mock.test' });
    assert.strictEqual(result.policy.contractVersion, 2);
  } finally {
    global.fetch = originalFetch;
  }
}

verifyDeployedPolicyMock().then(() => {
  console.log('PASS v1.6.71 PWA lease/handoff, Android boundary, App Check deployment gate, audit, E2E, and app split');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
