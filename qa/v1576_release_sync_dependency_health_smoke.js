#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { synchronizeLockfileVersion } = require('../tools/sync-release-metadata');
const { collectDirectDependencies, isExactVersion } = require('../tools/check-dependency-health');

const read = file => fs.readFileSync(file);
const digest = file => crypto.createHash('sha256').update(read(file)).digest('hex');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const syncSource = fs.readFileSync('tools/sync-release-metadata.js', 'utf8');
const gateSource = fs.readFileSync('tools/run-release-gate.js', 'utf8');
const dependencySource = fs.readFileSync('tools/check-dependency-health.js', 'utf8');

assert.strictEqual(pkg.version, '1.6.44');
assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain valid kebab-case');
assert.strictEqual(pkg.scripts['version:dry-run'], 'node tools/sync-release-metadata.js --dry-run');
assert.strictEqual(pkg.scripts['dependencies:check'], 'node tools/check-dependency-health.js');
assert(gateSource.includes("'dependencies:check'"), 'release gate must include dependency health diagnostics');
assert(syncSource.includes('FOXBEAR_SYNC_STAGED'), 'release sync must use an isolated staging workspace');
assert(syncSource.includes('commitStagedFiles'), 'release sync must commit validated staged files');
assert(syncSource.includes("read('package-lock.json')"), 'release sync must update the root lockfile');
assert(syncSource.includes('FOXBEAR_PYTHON_BIN'), 'release sync must expose a controllable SRI interpreter boundary');
assert(dependencySource.includes('Playwright Chromium binary is not installed'), 'dependency diagnostics must explain missing Chromium recovery');
const gitignore = fs.readFileSync('.gitignore', 'utf8');
const handoffContract = JSON.parse(fs.readFileSync('HANDOFF_PACKAGE.json', 'utf8'));
assert(gitignore.includes('__pycache__/') && gitignore.includes('*.py[cod]'), 'Python bytecode must be ignored');
assert(handoffContract.deletePaths.includes('qa/__pycache__') && handoffContract.deletePaths.includes('tools/__pycache__'), 'overwrite handoff must delete legacy Python bytecode caches');
assert(syncSource.includes("includes('__pycache__')") && syncSource.includes('/\\.py[co]$/i'), 'release staging must ignore generated Python bytecode');

const originalLock = { version: '1.0.0', packages: { '': { version: '1.0.0' } } };
const synchronized = synchronizeLockfileVersion(originalLock, '2.0.0');
assert.strictEqual(synchronized.version, '2.0.0');
assert.strictEqual(synchronized.packages[''].version, '2.0.0');
assert.strictEqual(originalLock.version, '1.0.0', 'lockfile synchronization must not mutate the caller input');
assert.deepStrictEqual(collectDirectDependencies({ dependencies: { a: '1.0.0' }, devDependencies: { b: '2.0.0' } }), { a: '1.0.0', b: '2.0.0' });
assert(isExactVersion('1.2.3'));
assert(!isExactVersion('^1.2.3'));

const protectedFiles = ['package.json', 'package-lock.json', 'index.html', 'sw.js'];
const beforeFailure = Object.fromEntries(protectedFiles.map(file => [file, digest(file)]));
const failedStage = spawnSync(process.execPath, ['tools/sync-release-metadata.js', '--dry-run'], {
  cwd: process.cwd(),
  env: { ...process.env, FOXBEAR_PYTHON_BIN: '__foxbear_missing_python__' },
  encoding: 'utf8'
});
assert.notStrictEqual(failedStage.status, 0, 'forced staged SRI failure must fail');
for (const file of protectedFiles) {
  assert.strictEqual(digest(file), beforeFailure[file], `failed staged sync changed ${file}`);
}

const dependencyCheck = spawnSync(process.execPath, ['tools/check-dependency-health.js'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.strictEqual(dependencyCheck.status, 0, dependencyCheck.stderr || dependencyCheck.stdout);
assert(/PASS dependency health/.test(dependencyCheck.stdout), 'dependency health summary missing');

console.log('PASS v1.5.76 atomic release sync, root lock synchronization, and dependency health diagnostics');
