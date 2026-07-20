'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const pkg = JSON.parse(read('package.json'));
const installer = read('tools/install-git-hooks.sh');
const overwriteBuilder = read('tools/create-overwrite-zip.sh');
const handoff = JSON.parse(read('HANDOFF_PACKAGE.json'));

const installLifecycleNames = ['preinstall', 'install', 'postinstall', 'prepare', 'prepublish', 'prepublishOnly'];
for (const name of installLifecycleNames) {
  const value = String(pkg.scripts?.[name] || '');
  assert(!/install-git-hooks|hooks:install|core\.hooksPath/.test(value), `npm lifecycle ${name} must not install Git hooks`);
}
assert(!Object.prototype.hasOwnProperty.call(pkg.scripts || {}, 'prepare'), 'prepare must be absent so npm ci cannot depend on local Git hook files');
assert.strictEqual(pkg.scripts?.['hooks:install'], 'bash tools/install-git-hooks.sh', 'manual hooks:install command is missing');
assert(installer.includes('CI detected; optional Git hook installation skipped'), 'hook installer does not skip CI');
assert(installer.includes('[ ! -f "$hook_file" ]'), 'hook installer does not guard a missing hook file');
assert(installer.includes('exit 0'), 'hook installer is not fail-soft');
assert(overwriteBuilder.includes('copy_path ".githooks"'), 'cumulative overwrite archive omits .githooks');
assert(handoff.requiredFiles.includes('.githooks/pre-commit'), 'handoff contract does not require the pre-commit hook');
assert(handoff.requiredFiles.includes('tools/install-git-hooks.sh'), 'handoff contract does not require the hook installer');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-hook-lifecycle-'));
try {
  fs.mkdirSync(path.join(tempRoot, 'tools'), { recursive: true });
  fs.copyFileSync(path.join(root, 'tools/install-git-hooks.sh'), path.join(tempRoot, 'tools/install-git-hooks.sh'));
  let result = spawnSync('git', ['init', '-q'], { cwd: tempRoot, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr || 'unable to initialize temporary Git repository');

  result = spawnSync('bash', ['tools/install-git-hooks.sh'], {
    cwd: tempRoot,
    encoding: 'utf8',
    env: { ...process.env, CI: '', GITHUB_ACTIONS: '', FOXBEAR_INSTALL_GIT_HOOKS: '' }
  });
  assert.strictEqual(result.status, 0, result.stderr || 'missing optional hook must not fail');
  assert(/missing; optional hook installation skipped/.test(result.stdout), 'missing hook skip reason was not reported');

  result = spawnSync('bash', ['tools/install-git-hooks.sh'], {
    cwd: tempRoot,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true', GITHUB_ACTIONS: 'true', FOXBEAR_INSTALL_GIT_HOOKS: '' }
  });
  assert.strictEqual(result.status, 0, result.stderr || 'CI hook installer path must not fail');
  assert(/CI detected/.test(result.stdout), 'CI skip reason was not reported');

  fs.mkdirSync(path.join(tempRoot, '.githooks'), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, '.githooks/pre-commit'), '#!/usr/bin/env bash\nexit 0\n');
  result = spawnSync('bash', ['tools/install-git-hooks.sh'], {
    cwd: tempRoot,
    encoding: 'utf8',
    env: { ...process.env, CI: '', GITHUB_ACTIONS: '', FOXBEAR_INSTALL_GIT_HOOKS: '' }
  });
  assert.strictEqual(result.status, 0, result.stderr || 'manual local hook installation failed');
  const configured = spawnSync('git', ['config', '--local', '--get', 'core.hooksPath'], { cwd: tempRoot, encoding: 'utf8' });
  assert.strictEqual(configured.stdout.trim(), '.githooks', 'manual local hook installation did not configure core.hooksPath');
  assert((fs.statSync(path.join(tempRoot, '.githooks/pre-commit')).mode & 0o111) !== 0, 'manual local hook installation did not set executable permission');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log('PASS v1.5.39 CI-safe npm lifecycle and fail-soft Git hook installation smoke');
