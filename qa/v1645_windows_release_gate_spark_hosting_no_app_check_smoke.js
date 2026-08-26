#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const firebaseJson = JSON.parse(read('firebase.json'));
const releaseGate = read('tools/run-release-gate.js');
const hostingCheck = read('tools/check-hosting-payload.js');
const archiveHygiene = require('../tools/archive-hygiene');
const firebase = read('src/firebase-bootstrap.js');
const trustedTypes = read('src/security/trusted-types-bootstrap.js');
const adminView = read('src/ui/admin-incident-monitor-view.js');
const functions = read('functions/index.js');
const appCheckPolicy = read('functions/app-check-policy.js');
const appCheckPolicyContract = JSON.parse(read('functions/app-check-policy-contract.json'));
const index = read('index.html');

{ const [major, minor, patch] = pkg.version.split('.').map(Number); assert(major > 1 || (major === 1 && (minor > 6 || (minor === 6 && patch >= 45)))); }
assert(pkg.scripts['deploy:spark'].startsWith('npm run hosting:check && '));
assert(pkg.scripts['deploy:incident'].startsWith('npm run hosting:check && '));
assert.strictEqual(pkg.scripts['hosting:check'], 'node tools/check-hosting-payload.js');

assert(releaseGate.includes('process.env.npm_execpath'));
assert(releaseGate.includes('spawnSync(process.execPath'));
assert(!releaseGate.includes("process.platform === 'win32' ? 'npm.cmd'"));
assert(hostingCheck.includes('Firebase Hosting Spark executable-file hygiene verified'));

for (const pattern of ['**/*.exe', '**/*.dll', '**/*.bat', '**/*.cmd', '**/*.com', '**/*.msi', '**/*.scr', '**/*.ps1']) {
  assert(firebaseJson.hosting.ignore.includes(pattern), `Hosting ignore missing ${pattern}`);
}
for (const filename of ['cmd.exe', 'tool.cmd', 'installer.msi', 'script.ps1']) {
  assert.strictEqual(archiveHygiene.isTransientFile(filename, filename), true, `${filename} must be rejected from archives`);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-hosting-check-'));
try {
  const result = spawnSync(process.execPath, ['--check', path.join(root, 'tools/check-hosting-payload.js')], { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

for (const forbidden of [
  'firebase-app-check.js',
  'initializeAppCheck',
  'ReCaptchaEnterpriseProvider',
  'X-Firebase-AppCheck',
  'firebaseappcheck.googleapis.com',
  'foxbear-app-check-site-key'
]) {
  assert(!`${firebase}\n${index}`.includes(forbidden), `App Check runtime/config must be absent: ${forbidden}`);
}
assert(!trustedTypes.includes('GOOGLE_RECAPTCHA'));
assert(firebase.includes('FIREBASE_APP_CHECK_POLICY'));
assert(firebase.includes('appCheckPolicySnapshot'));
assert(functions.includes('incidentCallableOptions'));
assert.strictEqual(appCheckPolicyContract.mode, 'disabled');
assert.strictEqual(appCheckPolicyContract.enforced, false);
assert(appCheckPolicy.includes("require('./app-check-policy-contract.json')"));
assert(adminView.includes("appendSummaryCard('App Check', '미사용 정책'"));
assert(!adminView.includes('단계적으로 강제 적용하세요'));

console.log('PASS v1.6.45 Windows release gate, Spark Hosting hygiene, and no-App-Check policy smoke');
