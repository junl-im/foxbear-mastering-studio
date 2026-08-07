#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { assertNoTransientArtifacts, assertSafeZipStructure, listZipEntries } = require('./archive-hygiene');

const zipPath = process.argv[2];
if (!zipPath) {
  console.error('Usage: node tools/verify-patch-zip.js <zip-path>');
  process.exit(2);
}

const resolved = path.resolve(zipPath);
if (!fs.existsSync(resolved)) {
  console.error(`Patch ZIP not found: ${resolved}`);
  process.exit(2);
}

function normalize(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
}

try {
  assertSafeZipStructure(resolved);
} catch (error) {
  console.error(error?.message || error);
  process.exit(1);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-patch-verify-'));
try {
  const integrity = spawnSync('unzip', ['-tqq', resolved], { encoding: 'utf8' });
  if (integrity.status !== 0) {
    process.stderr.write(integrity.stderr || integrity.stdout || 'Patch ZIP integrity check failed.\n');
    process.exit(integrity.status || 1);
  }
  const unzip = spawnSync('unzip', ['-q', resolved, '-d', tempDir], { encoding: 'utf8' });
  if (unzip.status !== 0) {
    process.stderr.write(unzip.stderr || 'Unable to extract patch ZIP.\n');
    process.exit(unzip.status || 1);
  }
  assertNoTransientArtifacts(tempDir);

  const actual = new Set(listZipEntries(resolved).filter(entry => !entry.endsWith('/')).map(normalize));
  if (actual.has('PATCH_MANIFEST.json')) throw new Error('PATCH_MANIFEST.json is a legacy generated artifact and must not be extracted into the repository.');

  for (const required of ['package.json', 'HANDOFF_PACKAGE.json', 'PATCH_NOTES.md', 'DELETE_PATHS.txt']) {
    if (!actual.has(required)) throw new Error(`Patch ZIP must include ${required}.`);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(String(pkg.version || ''))) throw new Error('Patch package version is invalid.');
  const assetVersion = String(pkg.foxbearRelease?.assetVersion || '');
  if (!assetVersion || !assetVersion.startsWith(`${pkg.version}-`)) throw new Error('Patch package assetVersion is invalid.');
  const indexPath = path.join(tempDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const index = fs.readFileSync(indexPath, 'utf8');
    if (!index.includes(`data-build=\"${pkg.version}\"`) || !index.includes(`?v=${assetVersion}`)) {
      throw new Error('Patch index.html does not match package release generation.');
    }
  }

  const deleteFile = fs.readFileSync(path.join(tempDir, 'DELETE_PATHS.txt'), 'utf8')
    .split(/\r?\n/).map(line => normalize(line.trim())).filter(Boolean);
  if (!deleteFile.includes('PATCH_MANIFEST.json')) throw new Error('DELETE_PATHS.txt must remove legacy PATCH_MANIFEST.json.');

  const gitRoot = path.join(__dirname, '..');
  if (fs.existsSync(path.join(gitRoot, '.git'))) {
    const git = args => {
      const result = spawnSync('git', args, { cwd: gitRoot, encoding: 'utf8' });
      if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Unable to inspect Git patch state.');
      return String(result.stdout || '').split(/\r?\n/).map(line => normalize(line.trim())).filter(Boolean);
    };
    const forbiddenDirs = new Set(['.git', '.firebase', '.audit-results', 'node_modules', 'dist', 'browser-results', 'browser-history', 'test-results', 'playwright-report', 'coverage', '__pycache__']);
    const safePatchFile = relative => {
      const value = normalize(relative);
      if (!value || value.startsWith('/') || value.split('/').includes('..')) return false;
      if (value === 'PATCH_MANIFEST.json') return false;
      const parts = value.split('/');
      if (parts.some(part => forbiddenDirs.has(part))) return false;
      const name = parts.at(-1);
      if (name === '.DS_Store' || name === '.last-run.json' || name === '.firebaserc') return false;
      if (name.startsWith('.env') && !/\.example$/i.test(name)) return false;
      if (/\.(?:log|zip|tmp|trace|pyc|pyo|exe|dll|bat|cmd|com|msi|scr|ps1)$/i.test(name)) return false;
      if (/(?:^|\/)qa\/(?:static-audit|browser-check|static-check)[^/]*\.txt$/i.test(value)) return false;
      return fs.existsSync(path.join(gitRoot, value));
    };
    const modified = git(['diff', '--name-only', '--diff-filter=ACMRTUXB', 'HEAD']);
    const untracked = git(['ls-files', '--others', '--exclude-standard']);
    const expected = new Set([...modified, ...untracked].filter(safePatchFile));
    for (const required of ['package.json', 'HANDOFF_PACKAGE.json', 'PATCH_NOTES.md', 'DELETE_PATHS.txt']) expected.add(required);
    const missing = [...expected].filter(entry => !actual.has(entry));
    const extras = [...actual].filter(entry => !expected.has(entry));
    if (missing.length) throw new Error(`Patch ZIP is missing expected Git files: ${missing.slice(0, 20).join(', ')}`);
    if (extras.length) throw new Error(`Patch ZIP contains files outside the expected Git patch: ${extras.slice(0, 20).join(', ')}`);
  }

  console.log(`PASS manifestless changed-file patch ZIP verified: ${path.basename(resolved)} (${actual.size} overwrite files, ${deleteFile.length} delete paths)`);
} catch (error) {
  console.error(`FAIL patch ZIP verification: ${error?.message || error}`);
  process.exit(1);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
