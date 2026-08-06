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

  const manifestPath = path.join(tempDir, 'PATCH_MANIFEST.json');
  if (!fs.existsSync(manifestPath)) throw new Error('PATCH_MANIFEST.json is missing.');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 1) throw new Error(`Unsupported patch schema: ${manifest.schemaVersion}`);
  if (!/^\d+\.\d+\.\d+$/.test(String(manifest.productVersion || ''))) throw new Error('Patch productVersion is invalid.');
  if (!Array.isArray(manifest.files) || !manifest.files.length) throw new Error('Patch manifest files list is missing or empty.');
  if (!Array.isArray(manifest.deletePaths)) throw new Error('Patch manifest deletePaths must be an array.');

  const expected = new Set(['PATCH_MANIFEST.json', ...manifest.files.map(normalize)]);
  const actual = new Set(listZipEntries(resolved).filter(entry => !entry.endsWith('/')).map(normalize));
  const missing = [...expected].filter(entry => !actual.has(entry));
  const extras = [...actual].filter(entry => !expected.has(entry));
  if (missing.length) throw new Error(`Patch ZIP is missing manifest files: ${missing.slice(0, 20).join(', ')}`);
  if (extras.length) throw new Error(`Patch ZIP contains undeclared files: ${extras.slice(0, 20).join(', ')}`);

  for (const required of ['package.json', 'HANDOFF_PACKAGE.json', 'PATCH_NOTES.md', 'DELETE_PATHS.txt']) {
    if (!expected.has(required)) throw new Error(`Patch manifest must include ${required}.`);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8'));
  if (pkg.version !== manifest.productVersion) throw new Error('Patch manifest version does not match package.json.');

  const deleteFile = fs.readFileSync(path.join(tempDir, 'DELETE_PATHS.txt'), 'utf8')
    .split(/\r?\n/).map(line => normalize(line.trim())).filter(Boolean);
  const manifestDeletes = manifest.deletePaths.map(normalize);
  if (JSON.stringify(deleteFile) !== JSON.stringify(manifestDeletes)) {
    throw new Error('DELETE_PATHS.txt does not match PATCH_MANIFEST.json deletePaths.');
  }

  console.log(`PASS changed-file patch ZIP verified: ${path.basename(resolved)} (${manifest.files.length} files, ${manifest.deletePaths.length} delete paths)`);
} catch (error) {
  console.error(`FAIL patch ZIP verification: ${error?.message || error}`);
  process.exit(1);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
