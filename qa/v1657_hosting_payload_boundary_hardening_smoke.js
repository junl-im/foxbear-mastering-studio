#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  PUBLIC_DIRECTORIES,
  PUBLIC_ROOT_FILES,
  stageHostingPayload
} = require('../tools/stage-hosting-payload');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const firebase = JSON.parse(read('firebase.json'));
const gitignore = read('.gitignore');
const hostingCheckSource = read('tools/check-hosting-payload.js');

assert(Number(pkg.version.split('.').join('')) >= 1657);
assert.strictEqual(firebase.hosting.public, 'dist/hosting');
assert(firebase.hosting.predeploy.includes('npm run hosting:check'));
assert.strictEqual(pkg.scripts['hosting:stage'], 'node tools/stage-hosting-payload.js');
assert.strictEqual(pkg.scripts['hosting:check'], 'node tools/check-hosting-payload.js');
assert(/^\.firebase\/$/m.test(gitignore));
assert(/^dist\/$/m.test(gitignore));
assert(hostingCheckSource.includes('Firebase Hosting payload boundary verified'));

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-hosting-boundary-'));
try {
  for (const file of PUBLIC_ROOT_FILES) {
    const target = path.join(fixture, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `fixture:${file}\n`);
  }
  for (const directory of PUBLIC_DIRECTORIES) {
    fs.mkdirSync(path.join(fixture, directory), { recursive: true });
    fs.writeFileSync(path.join(fixture, directory, 'fixture.txt'), directory);
  }
  fs.mkdirSync(path.join(fixture, '.git'), { recursive: true });
  fs.writeFileSync(path.join(fixture, '.git', 'config'), 'private');
  fs.mkdirSync(path.join(fixture, 'functions'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'functions', 'index.js'), 'private');
  fs.mkdirSync(path.join(fixture, 'qa'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'qa', 'fixture.js'), 'private');
  fs.writeFileSync(path.join(fixture, 'README.md'), 'private');
  fs.writeFileSync(path.join(fixture, '.env'), 'private');

  const output = path.join(fixture, 'dist', 'hosting');
  const result = stageHostingPayload({ root: fixture, output });
  const stagedPaths = result.manifest.files.map(file => file.path);
  assert(stagedPaths.includes('index.html'));
  assert(stagedPaths.includes('src/fixture.txt'));
  assert(!stagedPaths.some(file => file.startsWith('.git/')));
  assert(!stagedPaths.some(file => file.startsWith('functions/')));
  assert(!stagedPaths.some(file => file.startsWith('qa/')));
  assert(!stagedPaths.includes('README.md'));
  assert(!stagedPaths.includes('.env'));

  fs.writeFileSync(path.join(fixture, 'src', '.env'), 'forbidden');
  assert.throws(
    () => stageHostingPayload({ root: fixture, output }),
    /Hidden file is forbidden|Secret-like file is forbidden/
  );
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

const check = spawnSync(process.execPath, ['tools/check-hosting-payload.js'], {
  cwd: root,
  encoding: 'utf8',
  timeout: 120000
});
assert.strictEqual(check.status, 0, check.stderr || check.stdout);
assert(check.stdout.includes('Firebase Hosting payload boundary verified'));

const manifest = JSON.parse(read('dist/hosting-manifest.json'));
assert.strictEqual(manifest.publicRoot, 'dist/hosting');
assert(manifest.fileCount > 0);
for (const entry of manifest.files) {
  assert(!/(^|\/)(?:\.git|\.firebase|functions|qa|tools|docs)(?:\/|$)/.test(entry.path), entry.path);
  assert(!/^(?:package(?:-lock)?\.json|\.firebaserc|README\.md)$/.test(entry.path), entry.path);
}

console.log('PASS v1.6.57 Firebase Hosting allowlist staging, private-file isolation, and direct-deploy preflight');
