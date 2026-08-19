#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const handoff = JSON.parse(read('HANDOFF_PACKAGE.json'));
const gitignore = read('.gitignore');
const delivery = read('tools/create-delivery-zips.js');
const archiveHygiene = read('tools/archive-hygiene.js');
const patchVerifier = read('tools/verify-patch-zip.js');
const deletePaths = read('DELETE_PATHS.txt').split(/\r?\n/).map(value => value.trim()).filter(Boolean);

assert.strictEqual(pkg.version, '1.6.109');
assert(pkg.qaChecks.includes('node qa/v1684_git_tracked_cleanup_static_gate_smoke.js'));
assert(fs.existsSync(path.join(ROOT, 'APPLY_PATCH_CLEANUP.cmd')), 'Windows cleanup helper must exist in the release tree');
assert(gitignore.includes('*.cmd'), 'broad Windows executable hygiene must remain enabled');
assert(gitignore.includes('!APPLY_PATCH_CLEANUP.cmd'), 'the approved Windows cleanup helper must be explicitly trackable');
assert(gitignore.indexOf('!APPLY_PATCH_CLEANUP.cmd') > gitignore.indexOf('*.cmd'), 'the exact cleanup exception must follow the broad *.cmd ignore rule');
assert(!gitignore.includes('!*.cmd'), 'do not broadly unignore arbitrary cmd files');
assert(handoff.requiredFiles.includes('APPLY_PATCH_CLEANUP.cmd'), 'handoff contract must require the Windows cleanup helper');
assert(handoff.deletePaths.includes('PATCH_MANIFEST.json'), 'handoff deletion contract must retire the legacy patch manifest');
assert(deletePaths.includes('PATCH_MANIFEST.json'), 'patch cleanup list must retire the legacy patch manifest');
assert(delivery.includes("'APPLY_PATCH_CLEANUP.cmd'"), 'delivery builder must force-include the Windows cleanup helper');
assert(archiveHygiene.includes("=== 'APPLY_PATCH_CLEANUP.cmd'"), 'archive hygiene must allow only the approved cleanup cmd exception');
assert(patchVerifier.includes("value === 'APPLY_PATCH_CLEANUP.cmd'"), 'patch verifier must retain the exact cleanup cmd exception');

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1684-gitignore-'));
try {
  fs.writeFileSync(path.join(fixture, '.gitignore'), gitignore);
  fs.writeFileSync(path.join(fixture, 'APPLY_PATCH_CLEANUP.cmd'), '@echo off\r\n');
  fs.writeFileSync(path.join(fixture, 'unsafe.cmd'), '@echo off\r\n');
  let result = spawnSync('git', ['init', '-q'], { cwd: fixture, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  result = spawnSync('git', ['check-ignore', '-q', 'APPLY_PATCH_CLEANUP.cmd'], { cwd: fixture, encoding: 'utf8' });
  assert.notStrictEqual(result.status, 0, 'approved cleanup cmd must not be ignored by Git');
  result = spawnSync('git', ['check-ignore', '-q', 'unsafe.cmd'], { cwd: fixture, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, 'arbitrary cmd files must remain ignored');
  result = spawnSync('git', ['add', 'APPLY_PATCH_CLEANUP.cmd'], { cwd: fixture, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, `approved cleanup cmd must be addable: ${result.stderr || result.stdout}`);
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

console.log('PASS v1.6.84 tracked Windows cleanup helper and static gate recovery');
