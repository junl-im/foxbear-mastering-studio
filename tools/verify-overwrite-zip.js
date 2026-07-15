#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { assertNoTransientArtifacts, assertSafeZipStructure, listZipEntries } = require('./archive-hygiene');

const zipPath = process.argv[2];
if (!zipPath) {
  console.error('Usage: node tools/verify-overwrite-zip.js <zip-path>');
  process.exit(2);
}

const resolved = path.resolve(zipPath);
if (!fs.existsSync(resolved)) {
  console.error(`Overwrite ZIP not found: ${resolved}`);
  process.exit(2);
}

try {
  assertSafeZipStructure(resolved);
} catch (error) {
  console.error(error?.message || error);
  process.exit(1);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-overwrite-verify-'));
try {
  const unzip = spawnSync('unzip', ['-q', resolved, '-d', tempDir], { encoding: 'utf8' });
  if (unzip.status !== 0) {
    process.stderr.write(unzip.stderr || 'Unable to extract overwrite ZIP.\n');
    process.exit(unzip.status || 1);
  }
  try {
    assertNoTransientArtifacts(tempDir);
  } catch (error) {
    console.error(error?.message || error);
    process.exit(1);
  }
  const verify = spawnSync(process.execPath, [path.join(tempDir, 'tools/verify-handoff-state.js'), '--root', tempDir, '--archive'], {
    encoding: 'utf8',
    env: process.env
  });
  process.stdout.write(verify.stdout || '');
  process.stderr.write(verify.stderr || '');
  if (verify.status !== 0) process.exit(verify.status || 1);

  const count = listZipEntries(resolved).length;
  console.log(`PASS overwrite ZIP contents verified: ${path.basename(resolved)} (${count} entries)`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
