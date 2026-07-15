#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const http = require('http');
const { FIREBASE_E2E_MODULES } = require('./browser/helpers/foxbear-e2e-helpers');
const { waitForServer } = require('./browser/run-browser-e2e');
const { findTransientArtifacts, findUnsafeZipEntryPaths } = require('../tools/archive-hygiene');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const version = pkg.version;

assert.strictEqual(
  pkg.scripts['package:verify:overwrite'],
  `node tools/verify-overwrite-zip.js dist/foxbear-mastering-studio-v${version}-overwrite.zip`,
  'overwrite verifier script must follow package.json.version'
);
assert.strictEqual(
  pkg.scripts['package:verify:release'],
  `node tools/verify-release-zip.js dist/foxbear-mastering-studio-v${version}-release.zip`,
  'release verifier script must follow package.json.version'
);

const sync = read('tools/sync-release-metadata.js');
assert(sync.includes("pkg.scripts['package:verify:overwrite']"), 'metadata sync must update overwrite verifier filename');
assert(sync.includes("pkg.scripts['package:verify:release']"), 'metadata sync must update release verifier filename');

const helpers = read('qa/browser/helpers/foxbear-e2e-helpers.js');
assert(helpers.includes("page.route('https://www.gstatic.com/firebasejs/**'"), 'browser QA must isolate optional Firebase SDK traffic');
assert(helpers.includes('FIREBASE_E2E_MODULES'), 'browser QA must provide deterministic Firebase module mocks');
assert(helpers.includes('__FOXBEAR_SKIP_OPTIONAL_REMOTE__'), 'browser QA must expose the optional-remote skip flag');
assert(helpers.includes('.foxbear-e2e-probe-'), 'local server must expose an ownership probe');
assert(helpers.includes('probeToken'), 'server ownership probe must verify response content');

const requiredFirebaseExports = {
  'firebase-app.js': ['initializeApp'],
  'firebase-auth.js': ['getAuth', 'onAuthStateChanged', 'signInAnonymously'],
  'firebase-firestore.js': ['addDoc', 'collection', 'doc', 'getCountFromServer', 'getDoc', 'getDocs', 'getFirestore', 'limit', 'orderBy', 'query', 'serverTimestamp', 'where'],
  'firebase-remote-config.js': ['fetchAndActivate', 'getRemoteConfig', 'getValue', 'isSupported']
};
const moduleTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1519-firebase-modules-'));
try {
  for (const [fileName, exports] of Object.entries(requiredFirebaseExports)) {
    const body = FIREBASE_E2E_MODULES[fileName];
    assert(body, `missing Firebase E2E module: ${fileName}`);
    exports.forEach(name => assert(new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`).test(body), `${fileName} must export ${name}`));
    const modulePath = path.join(moduleTemp, fileName.replace(/\.js$/, '.mjs'));
    fs.writeFileSync(modulePath, body);
    const syntax = spawnSync(process.execPath, ['--check', modulePath], { encoding: 'utf8' });
    assert.strictEqual(syntax.status, 0, `${fileName} mock syntax failed: ${syntax.stderr || syntax.stdout}`);
  }
} finally {
  fs.rmSync(moduleTemp, { recursive: true, force: true });
}

const runner = read('qa/browser/run-browser-e2e.js');
assert(runner.includes('expectedBody: server?.probeToken'), 'runner must require its own server probe body');
assert(runner.includes('FoxBear static server exited before readiness'), 'runner must fail fast when the local server process exits');

const runtimeSpec = read('qa/browser/runtime-health-playwright.spec.js');
assert(runtimeSpec.includes("page.on('pageerror'"), 'runtime browser QA must capture uncaught page errors');
assert(runtimeSpec.includes("page.on('requestfailed'"), 'runtime browser QA must capture same-origin request failures');
assert(runtimeSpec.includes('localRequestFailures ·'), 'request failure assertions must include actionable values');
assert(runtimeSpec.includes('consoleErrors ·'), 'console failure assertions must include actionable values');

const pwaSpec = read('qa/browser/pwa-back-wakelock-sw-playwright.spec.js');
assert(pwaSpec.includes('page.goBack({ timeout: 15000 })'), 'history QA must fail when backward navigation fails');
assert(pwaSpec.includes('page.goForward({ timeout: 15000 })'), 'history QA must verify forward navigation');
assert(!pwaSpec.includes('.catch(() => null)'), 'history QA must not swallow navigation failures');

const releaseScript = read('tools/create-release-zip.sh');
const overwriteScript = read('tools/create-overwrite-zip.sh');
assert(releaseScript.includes('Release source contains symbolic links'), 'release packaging must reject source symlinks');
assert(releaseScript.includes("qa/static-audit*.txt"), 'release packaging must exclude QA scratch reports');
assert(overwriteScript.includes('Overwrite package contains symbolic links'), 'overwrite packaging must reject symlinks');
assert(overwriteScript.includes("static-audit*.txt"), 'overwrite packaging must delete QA scratch reports');

const unsafe = findUnsafeZipEntryPaths(['ok/file.js', '../escape.js', '/absolute.js', 'C:/drive.js', 'nested/../../escape.js']);
assert.deepStrictEqual(unsafe, ['../escape.js', '/absolute.js', 'C:/drive.js', 'nested/../../escape.js']);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1519-hygiene-'));
try {
  fs.mkdirSync(path.join(temp, 'qa'), { recursive: true });
  fs.writeFileSync(path.join(temp, 'qa/static-audit.txt'), 'scratch');
  fs.writeFileSync(path.join(temp, '.foxbear-e2e-probe-crash.txt'), 'probe');
  fs.symlinkSync(path.join(temp, 'qa/static-audit.txt'), path.join(temp, 'qa/audit-link'));
  const found = findTransientArtifacts(temp);
  assert(found.some(item => item === 'qa/static-audit.txt'), 'hygiene check must reject QA scratch reports');
  assert(found.some(item => item === '.foxbear-e2e-probe-crash.txt'), 'hygiene check must reject stale server probes');
  assert(found.some(item => item.includes('qa/audit-link -> symlink')), 'hygiene check must reject symlinks');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

(async () => {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/plain' });
    response.end('unrelated-server');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = server.address();
    const url = `http://127.0.0.1:${address.port}/probe`;
    await assert.rejects(
      waitForServer(url, 350, { expectedBody: 'foxbear-owned-server' }),
      /FoxBear-owned server probe/,
      'ownership probe must reject an unrelated server on the configured port'
    );
    await waitForServer(url, 1000, { expectedBody: 'unrelated-server' });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
  console.log('PASS v1.5.19 CI runtime isolation and package hardening smoke');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
