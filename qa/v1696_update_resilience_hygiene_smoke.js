#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const swSource = read('sw.js');
const hygieneSource = read('tools/check-source-hygiene.js');
const syncSource = read('tools/sync-release-metadata.js');

assert.strictEqual(pkg.version, '1.7.0');
assert(/^\d+\.\d+\.\d+$/.test(pkg.version), 'package version must remain semantic');
assert(pkg.description.includes(`v${pkg.version}`) && pkg.description.includes(String(pkg.foxbearRelease?.buildId || '').replace(/-/g, ' ')), 'package description must follow current release metadata');
assert(swSource.includes('cache.addAll(REQUIRED_INSTALL_ASSETS)'), 'minimum recovery shell hard-fail install phase missing');
assert(swSource.includes('const WARM_ASSETS = CORE_ASSETS.filter(asset => !REQUIRED_INSTALL_ASSET_SET.has(asset))'), 'post-activation warm graph missing');
assert(!swSource.includes('cacheInstallAssetsBestEffort') && !swSource.includes('OPTIONAL_INSTALL_ASSETS'), 'service worker install must not wait on optional boot assets');
assert(!swSource.includes('activate-pre-claim'), 'activation must not purge shell caches before client generation probing');
assert(swSource.indexOf('await self.clients.claim()') < swSource.indexOf("purgeLegacyShellCaches({ probeClients: true, reason: 'activate-post-claim' })"), 'client claim must precede active-generation cache retirement');
assert(hygieneSource.includes('const trackedFailures = tracked ? tracked.filter(isForbidden) : [];'), 'tracked forbidden paths must fail until their deletions are committed');
assert(syncSource.includes('pkg.description = `FoxBear AI Mastering Studio Pro v${meta.productVersion}'), 'release sync must update package description');
assert(syncSource.includes("'package.json description is not synchronized'"), 'release validation must cover package description');

function makeSwSandbox({ cacheNames, clients }) {
  const listeners = new Map();
  const deleted = [];
  const names = new Set(cacheNames);
  const sandbox = {
    console, URL, Date, Math, Object, Array, String, Number, Boolean, Set, Map, Promise,
    setTimeout, clearTimeout,
    caches: {
      async keys() { return Array.from(names); },
      async delete(name) { deleted.push(name); return names.delete(name); },
      async open() { return { addAll: async () => {}, match: async () => null, put: async () => {} }; }
    },
    fetch: async () => ({ ok: true, clone() { return this; } }),
    Response: { error: () => ({ error: true }), redirect: () => ({ redirect: true }) },
    indexedDB: { open() { return {}; } },
    self: {
      location: { origin: 'https://example.test' },
      registration: { scope: 'https://example.test/', navigationPreload: { enable: async () => {} } },
      clients: { matchAll: async () => clients, claim: async () => {} },
      addEventListener(type, fn) { listeners.set(type, fn); },
      skipWaiting() {}
    }
  };
  sandbox.globalThis = sandbox.self;
  vm.createContext(sandbox);
  vm.runInContext(swSource, sandbox, { filename: 'sw.js' });
  return { sandbox, listeners, deleted, names };
}

(async () => {
  const currentCache = pkg.foxbearRelease.cacheName;
  const oldActiveCache = 'foxbear-shell-v1.6.92-spectrum-panel-mount-lifecycle-recovery';
  const unrelatedCache = 'foxbear-shell-v1.6.94-release-integrity-hardening';
  const legacyNames = [...swSource.matchAll(/'foxbear-shell-v[^']+'/g)].map(match => match[0].slice(1, -1));
  const rollbackCache = legacyNames.at(-1);
  assert(rollbackCache && rollbackCache !== currentCache, 'latest rollback cache should be discoverable from current SW metadata');
  let listeners;
  const activeClient = {
    id: 'client-v1692',
    postMessage(payload) {
      if (payload.type !== 'FOXBEAR_QUERY_CLIENT_SHELL_STATE') return;
      listeners.get('message')?.({
        data: { type: 'FOXBEAR_CLIENT_SHELL_STATE', requestId: payload.requestId, assetVersion: '1.6.92-spectrum-panel-mount-lifecycle-recovery', cacheName: oldActiveCache, active: true },
        source: activeClient,
        waitUntil() {}
      });
    }
  };
  const first = makeSwSandbox({ cacheNames: [currentCache, oldActiveCache, unrelatedCache, rollbackCache], clients: [activeClient] });
  listeners = first.listeners;
  const result = await vm.runInContext("purgeLegacyShellCaches({ probeClients: true, reason: 'qa-active-old-client' })", first.sandbox);
  assert.strictEqual(result.probe.complete, true, 'active old client probe should complete');
  assert(!first.deleted.includes(oldActiveCache), 'active v1.6.92 shell cache must be preserved');
  assert(!first.deleted.includes(rollbackCache), 'latest rollback cache must be preserved');
  assert(first.deleted.includes(unrelatedCache), 'inactive intermediate shell cache should retire');

  const silentClient = { id: 'client-silent', postMessage() {} };
  const second = makeSwSandbox({ cacheNames: [currentCache, oldActiveCache, unrelatedCache, rollbackCache], clients: [silentClient] });
  const deferred = await vm.runInContext("purgeLegacyShellCaches({ probeClients: true, reason: 'qa-incomplete-probe' })", second.sandbox);
  assert.strictEqual(deferred.probe.complete, false, 'silent client probe should be incomplete');
  assert.strictEqual(deferred.deferred, true, 'incomplete client probe must defer cache retirement');
  assert.deepStrictEqual(second.deleted, [], 'no shell cache may be deleted when active generation probing is incomplete');

  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1696-hygiene-'));
  try {
    fs.writeFileSync(path.join(fixture, 'PATCH_MANIFEST.json'), '{"legacy":true}\n');
    fs.writeFileSync(path.join(fixture, 'safe.txt'), 'safe\n');
    let git = spawnSync('git', ['init', '-q'], { cwd: fixture, encoding: 'utf8' });
    assert.strictEqual(git.status, 0, git.stderr || 'git init failed');
    spawnSync('git', ['config', 'user.name', 'FoxBear QA'], { cwd: fixture });
    spawnSync('git', ['config', 'user.email', 'qa@example.invalid'], { cwd: fixture });
    spawnSync('git', ['add', '-A'], { cwd: fixture });
    git = spawnSync('git', ['commit', '-qm', 'fixture'], { cwd: fixture, encoding: 'utf8' });
    assert.strictEqual(git.status, 0, git.stderr || 'fixture commit failed');
    fs.rmSync(path.join(fixture, 'PATCH_MANIFEST.json'));
    let check = spawnSync(process.execPath, [path.join(ROOT, 'tools/check-source-hygiene.js'), '--root', fixture], { cwd: ROOT, encoding: 'utf8' });
    assert.notStrictEqual(check.status, 0, 'worktree-only deletion of tracked forbidden path must not pass hygiene');
    assert(`${check.stdout}\n${check.stderr}`.includes('PATCH_MANIFEST.json'), 'pending tracked deletion must identify the forbidden path');
    git = spawnSync('git', ['rm', '--cached', '--ignore-unmatch', '--', 'PATCH_MANIFEST.json'], { cwd: fixture, encoding: 'utf8' });
    assert.strictEqual(git.status, 0, git.stderr || 'git rm --cached failed');
    check = spawnSync(process.execPath, [path.join(ROOT, 'tools/check-source-hygiene.js'), '--root', fixture], { cwd: ROOT, encoding: 'utf8' });
    assert.strictEqual(check.status, 0, check.stderr || check.stdout || 'hygiene should pass after index deletion is staged');
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }

  console.log('PASS v1.6.96 update resilience, active-client cache protection, tracked-deletion hygiene, and metadata sync');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
