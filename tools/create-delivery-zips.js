#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { FORBIDDEN_DIRS, isTransientFile } = require('./archive-hygiene');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = String(pkg.version || '').trim();
const dist = path.join(ROOT, 'dist');
const legacyFull = path.join(dist, `foxbear-mastering-studio-v${version}-release.zip`);
const fullZip = path.join(dist, `foxbear-mastering-studio-v${version}-full.zip`);
const patchZip = path.join(dist, `foxbear-mastering-studio-v${version}-patch.zip`);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd || ROOT, encoding: options.encoding, stdio: options.stdio || 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
  return result;
}

function gitLines(args) {
  const result = run('git', args, { encoding: 'utf8', stdio: 'pipe' });
  return String(result.stdout || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function normalize(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function safePatchFile(relative) {
  const value = normalize(relative);
  if (!value || value.startsWith('/') || value.split('/').includes('..')) return false;
  const parts = value.split('/');
  if (parts.some(part => FORBIDDEN_DIRS.has(part))) return false;
  return !isTransientFile(value, parts.at(-1));
}

function copyPatchFile(relative, patchRoot) {
  const source = path.join(ROOT, relative);
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error(`Patch refuses symbolic links: ${relative}`);
  if (!stat.isFile()) throw new Error(`Patch entry is not a file: ${relative}`);
  const target = path.join(patchRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  fs.chmodSync(target, stat.mode);
}

run(process.execPath, [path.join(ROOT, 'tools/sync-release-metadata.js'), '--check']);
run(process.execPath, [path.join(ROOT, 'tools/repair-source-hygiene.js')]);
run(process.execPath, [path.join(ROOT, 'tools/check-source-hygiene.js')]);
run(process.execPath, [path.join(ROOT, 'tools/sync-release-metadata.js'), '--check']);
run('bash', [path.join(ROOT, 'tools/create-release-zip.sh')]);
run(process.execPath, [path.join(ROOT, 'tools/sync-release-metadata.js'), '--check']);

fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(legacyFull, fullZip);

const modified = gitLines(['diff', '--name-only', '--diff-filter=ACMRTUXB', 'HEAD']);
const untracked = gitLines(['ls-files', '--others', '--exclude-standard']);
const files = [...new Set([...modified, ...untracked].map(normalize))]
  .filter(safePatchFile)
  .filter(relative => fs.existsSync(path.join(ROOT, relative)))
  .sort();
for (const required of ['package.json', 'HANDOFF_PACKAGE.json', 'PATCH_NOTES.md', 'DELETE_PATHS.txt', 'APPLY_PATCH_CLEANUP.sh', 'APPLY_PATCH_CLEANUP.cmd']) {
  if (!files.includes(required)) files.push(required);
}
files.sort();

const deletePaths = fs.readFileSync(path.join(ROOT, 'DELETE_PATHS.txt'), 'utf8')
  .split(/\r?\n/).map(line => normalize(line.trim())).filter(Boolean);
const baseCommit = gitLines(['rev-parse', 'HEAD'])[0] || '';
const patchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-patch-build-'));
try {
  files.forEach(relative => copyPatchFile(relative, patchRoot));
  fs.rmSync(patchZip, { force: true });
  run('zip', ['-qr', patchZip, '.'], { cwd: patchRoot });
} finally {
  fs.rmSync(patchRoot, { recursive: true, force: true });
}

run(process.execPath, [path.join(ROOT, 'tools/verify-release-zip.js'), fullZip]);
run(process.execPath, [path.join(ROOT, 'tools/verify-patch-zip.js'), patchZip]);

console.log('FoxBear GitHub Desktop delivery artifacts');
console.log(`  FULL : ${fullZip}`);
console.log(`  PATCH: ${patchZip}`);
console.log(`  BASE : ${baseCommit}`);
console.log(`  FILES: ${files.length} overwrite files / ${deletePaths.length} delete paths / no generated patch manifest`);
