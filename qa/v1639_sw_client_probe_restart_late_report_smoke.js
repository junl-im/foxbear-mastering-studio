'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const assetVersion = pkg.foxbearRelease.assetVersion;
const cacheName = pkg.foxbearRelease.cacheName;

assert(swSource.includes('ignoredLateClientShellReportCount'), 'late probe response diagnostics are missing');
assert(swSource.includes('pruneClientShellReports'), 'stale client report pruning is missing');
assert(swSource.includes('disappearedCount'), 'probe-time client termination handling is missing');
assert(swSource.includes('CLIENT_SHELL_PROBE_RETRY_MS'), 'surviving client retry window is missing');

(async () => {
  const listeners = new Map();
  let matchCount = 0;
  const activeClient = {
    id: 'client-active',
    postMessage(payload) {
      if (payload.type !== 'FOXBEAR_QUERY_CLIENT_SHELL_STATE') return;
      listeners.get('message')?.({
        data: {
          type: 'FOXBEAR_CLIENT_SHELL_STATE',
          requestId: payload.requestId,
          assetVersion,
          cacheName,
          active: true,
          updatedAt: Date.now()
        },
        source: activeClient,
        waitUntil() {}
      });
    }
  };
  const closingClient = { id: 'client-closing', postMessage() {} };
  const cacheNames = new Set([
    cacheName,
    'foxbear-shell-v1.6.37-ui-shell-cross-generation-recovery',
    'foxbear-shell-v1.6.111-ui-mode-session-contract-hardening'
  ]);
  const sandbox = {
    console, URL, Date, Math, Object, Array, String, Number, Boolean, Set, Map, Promise,
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {},
    caches: {
      async keys() { return Array.from(cacheNames); },
      async delete(name) { return cacheNames.delete(name); },
      async open() { return { addAll: async () => {}, match: async () => null, put: async () => {} }; }
    },
    fetch: async () => null,
    Response: { error: () => ({ error: true }), redirect: () => ({ redirect: true }) },
    indexedDB: { open() { return {}; } },
    self: {
      location: { origin: 'https://example.test' },
      registration: { scope: 'https://example.test/', navigationPreload: { enable: async () => {} } },
      clients: {
        async matchAll() {
          matchCount += 1;
          return matchCount === 1 ? [activeClient, closingClient] : [activeClient];
        },
        claim: async () => {}
      },
      addEventListener(type, fn) { listeners.set(type, fn); },
      skipWaiting() {}
    }
  };
  sandbox.globalThis = sandbox.self;
  vm.createContext(sandbox);
  vm.runInContext(swSource, sandbox, { filename: 'sw.js' });

  const result = await vm.runInContext('queryActiveClientShellVersions()', sandbox);
  assert.strictEqual(result.complete, true, 'a client that disappears during a probe must not keep cleanup incomplete');
  assert.strictEqual(result.clientCount, 1, 'terminated client should be removed from the expected set');
  assert.strictEqual(result.reportedCount, 1, 'surviving client report should be retained');
  assert.strictEqual(result.disappearedCount, 1, 'terminated client should be diagnosed');

  const reportsBeforeLate = vm.runInContext('clientShellReports.size', sandbox);
  const acceptedLate = vm.runInContext(`rememberClientShellState({ source: { id: 'client-active' } }, { type: 'FOXBEAR_CLIENT_SHELL_STATE', requestId: 'expired-probe', assetVersion: '${assetVersion}', cacheName: '${cacheName}', active: true })`, sandbox);
  assert.strictEqual(acceptedLate, false, 'response from an expired probe must be ignored');
  assert.strictEqual(vm.runInContext('clientShellReports.size', sandbox), reportsBeforeLate, 'late response must not repopulate report state');
  assert(vm.runInContext('ignoredLateClientShellReportCount', sandbox) >= 1, 'ignored late response should be counted');

  vm.runInContext(`rememberClientShellState({ source: { id: 'stale-client' } }, { type: 'FOXBEAR_CLIENT_SHELL_STATE', assetVersion: '1.6.37-ui-shell-cross-generation-recovery', cacheName: 'foxbear-shell-v1.6.37-ui-shell-cross-generation-recovery', active: true })`, sandbox);
  assert(vm.runInContext('clientShellReports.has("stale-client")', sandbox), 'unsolicited active state should be temporarily remembered');
  await vm.runInContext('queryActiveClientShellVersions()', sandbox);
  assert.strictEqual(vm.runInContext('clientShellReports.has("stale-client")', sandbox), false, 'report for a non-existent client should be pruned');
  assert(vm.runInContext('prunedClientShellReportCount', sandbox) >= 1, 'stale report pruning should be diagnosed');

  console.log('PASS v1.6.39 service-worker restart probe, terminated-client, and late-report isolation');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
