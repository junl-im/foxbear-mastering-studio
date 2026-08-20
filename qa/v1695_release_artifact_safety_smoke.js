#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const { assertDeclaredGitDeletions, readGitChangeSet } = require('../tools/git-patch-contract');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const run = (command, args, cwd, env = process.env) => spawnSync(command, args, { cwd, encoding: 'utf8', env });
const pkg = JSON.parse(read('package.json'));
const hygiene = read('tools/check-source-hygiene.js');
const delivery = read('tools/create-delivery-zips.js');
const releaseZip = read('tools/create-release-zip.sh');
const patchVerifier = read('tools/verify-patch-zip.js');
const dockService = read('src/ui/bottom-preview-dock-integrity-service.js');

assert.strictEqual(pkg.version, '1.6.112');
assert(pkg.qaChecks.includes('node qa/v1695_release_artifact_safety_smoke.js'));
assert(hygiene.includes('Always scan the physical workspace'), 'strict hygiene must scan the worktree, not only Git tracked files');
assert(!delivery.includes("tools/repair-source-hygiene.js"), 'delivery packaging must be non-mutating');
assert(delivery.includes('assertDeclaredGitDeletions(changes.deleted, deletePaths)'), 'delivery must validate tracked deletions');
assert(patchVerifier.includes('assertDeclaredGitDeletions(changes.deleted, deleteFile)'), 'patch verification must validate tracked deletions');
assert(releaseZip.includes('tools/check-source-hygiene.js'), 'release ZIP must preflight strict source hygiene');
assert(releaseZip.includes("-x '.env.production'"), 'release ZIP must explicitly exclude root production env secrets');
assert(releaseZip.includes("-x '*/.env.production'"), 'release ZIP must explicitly exclude nested production env secrets');
assert(!releaseZip.includes("-x '.env.*'") && !releaseZip.includes("-x '*/.env.*'"), '.env.example must not be removed by a broad wildcard');
assert(releaseZip.includes('cleanup_failed_archive'), 'release ZIP must remove failed output archives');

// Git-ignored secrets must still block strict source hygiene.
{
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1695-secret-'));
  try {
    fs.writeFileSync(path.join(temp, '.gitignore'), '.env*\n');
    fs.writeFileSync(path.join(temp, 'safe.txt'), 'safe\n');
    let result = run('git', ['init', '-q'], temp);
    assert.strictEqual(result.status, 0);
    run('git', ['config', 'user.name', 'FoxBear QA'], temp);
    run('git', ['config', 'user.email', 'qa@example.invalid'], temp);
    run('git', ['add', '-A'], temp);
    result = run('git', ['commit', '-qm', 'fixture'], temp);
    assert.strictEqual(result.status, 0);
    fs.writeFileSync(path.join(temp, '.env.production'), 'SECRET=ignored-but-blocked\n');
    result = run(process.execPath, [path.join(ROOT, 'tools/check-source-hygiene.js'), '--root', temp], ROOT);
    assert.notStrictEqual(result.status, 0, 'ignored secret must fail strict hygiene');
    assert(`${result.stdout}\n${result.stderr}`.includes('.env.production'), 'ignored secret failure must name the file');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

// npm ci dependency folders are allowed as untracked worktree artifacts, but never when tracked.
{
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1695-node-modules-'));
  try {
    fs.writeFileSync(path.join(temp, '.gitignore'), 'node_modules/\n');
    fs.writeFileSync(path.join(temp, 'safe.txt'), 'safe\n');
    let result = run('git', ['init', '-q'], temp);
    assert.strictEqual(result.status, 0);
    run('git', ['config', 'user.name', 'FoxBear QA'], temp);
    run('git', ['config', 'user.email', 'qa@example.invalid'], temp);
    run('git', ['add', '-A'], temp);
    run('git', ['commit', '-qm', 'fixture'], temp);
    fs.mkdirSync(path.join(temp, 'node_modules', 'demo'), { recursive: true });
    fs.writeFileSync(path.join(temp, 'node_modules', 'demo', 'index.js'), 'module.exports = 1;\n');
    result = run(process.execPath, [path.join(ROOT, 'tools/check-source-hygiene.js'), '--root', temp], ROOT);
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);

    fs.rmSync(path.join(temp, '.gitignore'));
    run('git', ['add', '-f', 'node_modules/demo/index.js'], temp);
    run('git', ['commit', '-qm', 'track forbidden dependency'], temp);
    result = run(process.execPath, [path.join(ROOT, 'tools/check-source-hygiene.js'), '--root', temp], ROOT);
    assert.notStrictEqual(result.status, 0, 'tracked node_modules must remain forbidden');
    assert(`${result.stdout}\n${result.stderr}`.includes('node_modules/'), 'tracked dependency failure must name node_modules');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

// Git deletions and rename sources must be represented by DELETE_PATHS.txt.
{
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1695-delete-'));
  try {
    fs.writeFileSync(path.join(temp, 'old.txt'), 'old\n');
    fs.writeFileSync(path.join(temp, 'removed.txt'), 'removed\n');
    let result = run('git', ['init', '-q'], temp);
    assert.strictEqual(result.status, 0);
    run('git', ['config', 'user.name', 'FoxBear QA'], temp);
    run('git', ['config', 'user.email', 'qa@example.invalid'], temp);
    run('git', ['add', '-A'], temp);
    run('git', ['commit', '-qm', 'fixture'], temp);
    run('git', ['mv', 'old.txt', 'renamed.txt'], temp);
    run('git', ['rm', '-q', 'removed.txt'], temp);
    const changes = readGitChangeSet(temp);
    assert(changes.changed.includes('renamed.txt'));
    assert(changes.deleted.includes('old.txt'), 'rename source must be treated as a delete path');
    assert(changes.deleted.includes('removed.txt'), 'deleted tracked file must be reported');
    assert.throws(() => assertDeclaredGitDeletions(changes.deleted, ['old.txt']), /removed\.txt/);
    assert.doesNotThrow(() => assertDeclaredGitDeletions(changes.deleted, ['old.txt', 'removed.txt']));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

// Patch cleanup must apply declared paths, not only the historical fixed repair allowlist.
{
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1695-apply-delete-'));
  try {
    fs.mkdirSync(path.join(temp, 'legacy'), { recursive: true });
    fs.writeFileSync(path.join(temp, 'legacy', 'old-runtime.js'), 'stale\n');
    fs.writeFileSync(path.join(temp, 'DELETE_PATHS.txt'), 'legacy/old-runtime.js\n');
    const result = run(process.execPath, [path.join(ROOT, 'tools/apply-delete-paths.js'), '--root', temp], ROOT);
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert(!fs.existsSync(path.join(temp, 'legacy', 'old-runtime.js')), 'declared patch deletion was not applied');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

// Stale selection with remaining tracks must be unhealthy even when Dock is hidden.
{
  const state = {
    tracks: [{ id: 'a' }],
    selectedId: 'stale',
    selectedIds: new Set(),
    bottomPreviewTrackId: null,
    bottomPreviewRepairCount: 0,
    bottomPreviewLastRepairReason: '',
    bottomPreviewLastIntegrityAt: 0,
    bottomPreviewIntegrityRaf: 0
  };
  const fakeWindow = { setTimeout, clearTimeout };
  vm.runInNewContext(dockService, { window: fakeWindow, globalThis: fakeWindow, console, Object, String, Array, Set, Date });
  const controller = fakeWindow.FoxBearBottomPreviewDockIntegrityService.createController({
    state,
    document: { body: { classList: { contains: () => false } } },
    getSelectedTrack: () => null,
    getDock: () => ({
      classList: { contains: () => false },
      getAttribute: name => name === 'aria-hidden' ? 'true' : '',
      getBoundingClientRect: () => ({ width: 0, height: 0 })
    }),
    getPlayer: () => ({ children: [], dataset: {}, querySelector: () => null, querySelectorAll: () => [] }),
    getComputedStyle: () => ({ display: 'none', visibility: 'hidden', opacity: '0' })
  });
  const snapshot = controller.getSnapshot();
  assert.strictEqual(snapshot.selectedValid, false);
  assert.strictEqual(snapshot.selectionIntegrity, false);
  assert.strictEqual(snapshot.healthy, false, 'hidden Dock must not mask a stale active selection');
}

console.log('PASS v1.6.95 release artifact safety + deletion + Dock selection integrity contract');
