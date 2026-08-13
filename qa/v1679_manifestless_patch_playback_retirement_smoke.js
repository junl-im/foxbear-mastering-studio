#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const recoverySource = fs.readFileSync('src/audio/playback-source-recovery-service.js', 'utf8');
const deliverySource = fs.readFileSync('tools/create-delivery-zips.js', 'utf8');
const verifierSource = fs.readFileSync('tools/verify-patch-zip.js', 'utf8');
const hygieneSource = fs.readFileSync('tools/check-source-hygiene.js', 'utf8');
const deletePaths = fs.readFileSync('DELETE_PATHS.txt', 'utf8');

assert.strictEqual(pkg.version, '1.6.95');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current buildId must remain kebab-case');
assert.strictEqual(pkg.foxbearRelease?.assetVersion, `${pkg.version}-${pkg.foxbearRelease.buildId}`);
assert(pkg.qaChecks.includes('node qa/v1679_manifestless_patch_playback_retirement_smoke.js'));
assert(recoverySource.includes('function isUrlActivelyPlaying(url, documentRef = global.document)'));
assert(recoverySource.includes('now - Number(entry.createdAt || now) >= maxWaitMs'));
assert(recoverySource.includes('expired && !activelyPlaying'));
assert(!deliverySource.includes("fs.writeFileSync(path.join(patchRoot, 'PATCH_MANIFEST.json')"));
assert(verifierSource.includes('PATCH_MANIFEST.json is a legacy generated artifact'));
assert(verifierSource.includes('expected Git patch'));
assert(hygieneSource.includes("'PATCH_MANIFEST.json'"));
assert(deletePaths.split(/\r?\n/).includes('PATCH_MANIFEST.json'));


const hygieneFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1679-hygiene-'));
try {
  fs.writeFileSync(path.join(hygieneFixture, 'PATCH_MANIFEST.json'), '{}\n');
  const strict = spawnSync(process.execPath, ['tools/check-source-hygiene.js', '--root', hygieneFixture], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notStrictEqual(strict.status, 0, 'strict source hygiene must reject a legacy patch manifest');
  const ciSafe = spawnSync(process.execPath, ['tools/run-source-hygiene-gate.js', '--root', hygieneFixture], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, GITHUB_ACTIONS: 'true', FOXBEAR_SOURCE_HYGIENE_MODE: 'ci-safe' }
  });
  assert.strictEqual(ciSafe.status, 0, `ci-safe cleanup should remove the legacy manifest without failing: ${(ciSafe.stdout || '') + (ciSafe.stderr || '')}`);
  assert(!fs.existsSync(path.join(hygieneFixture, 'PATCH_MANIFEST.json')), 'ci-safe cleanup did not remove the legacy manifest');
} finally {
  fs.rmSync(hygieneFixture, { recursive: true, force: true });
}

let now = 1000;
const audios = [];
const revoked = [];
const documentRef = { querySelectorAll: selector => selector === 'audio' ? audios : [] };
const fakeWindow = {
  document: documentRef,
  URL: { revokeObjectURL: url => revoked.push(url), createObjectURL: () => 'blob:new' },
  setTimeout: () => 1,
  clearTimeout: () => {},
};
class FakeDate extends Date { static now() { return now; } }
const context = { window: fakeWindow, document: documentRef, console, Date: FakeDate, Math, Number, String, Boolean, Object, Array, Set, Map, WeakMap, Promise, Error };
vm.runInNewContext(recoverySource, context);
const service = fakeWindow.FoxBearPlaybackSourceRecoveryService;
const track = { id: 't' };
const paused = { src: 'blob:paused', currentSrc: 'blob:paused', paused: true, ended: false, getAttribute: () => 'blob:paused' };
audios.push(paused);
service.retireObjectUrl(track, 'blob:paused', { document: documentRef, revokeObjectURL: fakeWindow.URL.revokeObjectURL, recheckMs: 999999 });
assert(!revoked.includes('blob:paused'), 'paused URL should not retire before max wait');
now += service.RETIRE_MAX_WAIT_MS + 1;
assert.strictEqual(service.flushRetiredUrls(track, { document: documentRef, revokeObjectURL: fakeWindow.URL.revokeObjectURL }), 1);
assert(revoked.includes('blob:paused'), 'expired paused stale URL must retire');

const playing = { src: 'blob:playing', currentSrc: 'blob:playing', paused: false, ended: false, getAttribute: () => 'blob:playing' };
audios.push(playing);
service.retireObjectUrl(track, 'blob:playing', { document: documentRef, revokeObjectURL: fakeWindow.URL.revokeObjectURL, recheckMs: 999999 });
now += service.RETIRE_MAX_WAIT_MS + 1;
assert.strictEqual(service.flushRetiredUrls(track, { document: documentRef, revokeObjectURL: fakeWindow.URL.revokeObjectURL }), 0);
assert(!revoked.includes('blob:playing'), 'actively playing URL must survive retirement deadline');
playing.paused = true;
assert.strictEqual(service.flushRetiredUrls(track, { document: documentRef, revokeObjectURL: fakeWindow.URL.revokeObjectURL }), 1);
assert(revoked.includes('blob:playing'), 'expired URL must retire after playback stops');

console.log('PASS v1.6.79 manifestless patch delivery and bounded playback URL retirement');
