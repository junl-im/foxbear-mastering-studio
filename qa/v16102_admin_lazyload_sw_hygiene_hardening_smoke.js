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
const index = read('index.html');
const app = read('src/app.js');
const loaderSource = read('src/ui/admin-incident-loader-service.js');
const sw = read('sw.js');
const policy = require('../tools/source-hygiene-policy');

assert(/^1\.6\.\d+$/.test(pkg.version), 'current release must remain v1.6.x');
assert(pkg.foxbearRelease?.assetVersion?.startsWith(`${pkg.version}-`), 'current asset version must match package version');
assert(index.includes('src/ui/admin-incident-loader-service.js'), 'small admin lazy loader service must load before app');
assert(!/admin-incident-monitor-view\.js[^\n]*<\/script>/.test(index), 'heavy admin incident view must remain absent from eager HTML');
assert(app.includes('FoxBearAdminIncidentLoaderService') && !app.includes('function appendLazyScript('), 'admin lazy loading must be delegated out of app.js');
assert(loaderSource.includes('removeNode(stale)') && loaderSource.includes("script.dataset.foxbearLazyState = 'failed'"), 'failed/stale admin script nodes must be retired before retry');
assert(loaderSource.includes('로드 시간이 초과되었습니다') && loaderSource.includes('activeLoads.delete(LAZY_KEY)'), 'admin loader timeout/retry settlement contract missing');
assert(loaderSource.includes('options.resolveScriptUrl(options.src)') && loaderSource.includes('script.integrity = String(options.integrity)'), 'dynamic admin script must retain Trusted Types URL resolution and SRI');
assert(!sw.includes('admin-incident-monitor-view.js'), 'heavy admin incident module must not be preinstalled or background-warmed by the service worker');
assert(sw.includes('admin-incident-loader-service.js'), 'small eager admin loader service must stay in the normal core graph');
assert(sw.includes('const REQUIRED_INSTALL_ASSETS = CORE_ASSETS.filter') && sw.includes('const WARM_ASSETS = CORE_ASSETS.filter(asset => !REQUIRED_INSTALL_ASSET_SET.has(asset))'), 'service worker install/warm split missing');
assert(sw.includes('await cache.addAll(REQUIRED_INSTALL_ASSETS);') && !sw.includes('cacheInstallAssetsBestEffort') && !sw.includes('OPTIONAL_INSTALL_ASSETS'), 'service worker install must wait only for the minimum recovery shell');
assert(fs.readFileSync(path.join(ROOT, 'src/app.js'), 'utf8').split(/\r?\n/).length < 13250, 'app.js should regain architecture headroom after extracting the lazy loader');

const deletePaths = fs.readFileSync(path.join(ROOT, 'DELETE_PATHS.txt'), 'utf8').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
assert.deepStrictEqual([...deletePaths].sort(), [...policy.PATCH_CLEANUP_PATHS].sort(), 'DELETE_PATHS.txt must match the shared source-hygiene cleanup policy');
assert(policy.isForbidden('README.txt'), 'temporary helper README.txt must be forbidden');
assert(policy.isForbidden('APPLY_V16101_HELPER_CLEANUP_NO_GIT.cmd'), 'one-off NO_GIT helper pattern must be forbidden');
assert(!policy.isForbidden('APPLY_PATCH_CLEANUP.cmd'), 'permanent patch cleanup helper must remain allowed');

function createScriptNode() {
  const listeners = new Map();
  return {
    dataset: {},
    removed: false,
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); },
    dispatch(type) { listeners.get(type)?.({ type }); },
    remove() { this.removed = true; },
    set src(value) { this._src = String(value); },
    get src() { return this._src || ''; }
  };
}

async function exerciseAdminLoaderRetry() {
  let current = null;
  const appended = [];
  const document = {
    head: { appendChild(node) { current = node; appended.push(node); } },
    createElement(type) { assert.strictEqual(type, 'script'); return createScriptNode(); },
    querySelector() { return current && !current.removed ? current : null; }
  };
  const sandbox = { console, Promise, Map, Object, String, Number, Boolean, Math, document, setTimeout, clearTimeout };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(loaderSource, sandbox, { filename: 'admin-incident-loader-service.js' });
  const service = sandbox.FoxBearAdminIncidentLoaderService;
  const options = {
    document,
    src: 'src/ui/admin-incident-monitor-view.js?v=test',
    integrity: 'sha384-test',
    resolveScriptUrl: value => `https://example.test/${value}`,
    isReady: () => Boolean(sandbox.FoxBearAdminIncidentMonitorView?.create),
    timeoutMs: 5000
  };

  const first = service.load(options);
  assert.strictEqual(appended.length, 1, 'first admin lazy request should append one script');
  appended[0].dispatch('error');
  await assert.rejects(first, /불러오지 못했습니다/);
  assert.strictEqual(appended[0].removed, true, 'failed admin script node must be removed');

  const second = service.load(options);
  assert.strictEqual(appended.length, 2, 'retry must append a fresh script instead of waiting on a settled node');
  sandbox.FoxBearAdminIncidentMonitorView = { create() {} };
  appended[1].dispatch('load');
  const result = await second;
  assert.strictEqual(result.ready, true, 'fresh retry should resolve after factory initialization');
}

function exerciseHygieneRepair() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v16102-hygiene-'));
  try {
    fs.mkdirSync(path.join(fixture, 'src/ui'), { recursive: true });
    fs.mkdirSync(path.join(fixture, 'assets/css'), { recursive: true });
    fs.writeFileSync(path.join(fixture, 'README_FIRST.txt'), 'legacy helper\n');
    fs.writeFileSync(path.join(fixture, 'README.txt'), 'temporary helper\n');
    fs.writeFileSync(path.join(fixture, 'APPLY_CUSTOM_CLEANUP_NO_GIT.cmd'), '@echo off\n');
    fs.writeFileSync(path.join(fixture, 'src/ui/spectrum-visualizer.js'), 'legacy\n');
    fs.writeFileSync(path.join(fixture, 'assets/css/spectrum-visualizer.css'), 'legacy\n');

    let run = spawnSync(process.execPath, [path.join(ROOT, 'tools/check-source-hygiene.js'), '--root', fixture], { encoding: 'utf8' });
    assert.notStrictEqual(run.status, 0, 'forbidden temporary helper fixture must fail hygiene');
    run = spawnSync(process.execPath, [path.join(ROOT, 'tools/repair-source-hygiene.js'), '--root', fixture], { encoding: 'utf8' });
    assert.strictEqual(run.status, 0, run.stderr || run.stdout || 'repair failed');
    run = spawnSync(process.execPath, [path.join(ROOT, 'tools/check-source-hygiene.js'), '--root', fixture], { encoding: 'utf8' });
    assert.strictEqual(run.status, 0, run.stderr || run.stdout || 'hygiene should pass after shared-policy repair');
    ['README_FIRST.txt','README.txt','APPLY_CUSTOM_CLEANUP_NO_GIT.cmd','src/ui/spectrum-visualizer.js','assets/css/spectrum-visualizer.css']
      .forEach(relative => assert(!fs.existsSync(path.join(fixture, relative)), `repair left forbidden path: ${relative}`));
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

exerciseAdminLoaderRetry()
  .then(() => { exerciseHygieneRepair(); console.log('PASS v1.6.102 admin lazy retry, true network on-demand, app split, and unified source hygiene'); })
  .catch(error => { console.error(error); process.exit(1); });
