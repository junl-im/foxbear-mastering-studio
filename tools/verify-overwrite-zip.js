#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');


function findTransientArtifacts(root) {
  const found = [];
  const forbiddenDirs = new Set(['node_modules', 'dist', 'browser-results', 'test-results', 'playwright-report', 'coverage']);
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const relative = path.relative(root, full).split(path.sep).join('/');
      if (entry.isDirectory()) {
        if (forbiddenDirs.has(entry.name)) {
          found.push(`${relative}/`);
          continue;
        }
        walk(full);
        continue;
      }
      if (entry.name === '.DS_Store' || entry.name === '.last-run.json' || /\.(?:log|zip)$/i.test(entry.name)) found.push(relative);
    }
  };
  walk(root);
  return found;
}

function assertNoTransientArtifacts(root) {
  const found = findTransientArtifacts(root);
  if (!found.length) return;
  console.error(`Archive contains transient build artifacts: ${found.slice(0, 20).join(', ')}`);
  process.exit(1);
}

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

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-overwrite-verify-'));
try {
  const unzip = spawnSync('unzip', ['-q', resolved, '-d', tempDir], { encoding: 'utf8' });
  if (unzip.status !== 0) {
    process.stderr.write(unzip.stderr || 'Unable to extract overwrite ZIP.\n');
    process.exit(unzip.status || 1);
  }
  assertNoTransientArtifacts(tempDir);
  const verify = spawnSync(process.execPath, [path.join(tempDir, 'tools/verify-handoff-state.js'), '--root', tempDir, '--archive'], {
    encoding: 'utf8',
    env: process.env
  });
  process.stdout.write(verify.stdout || '');
  process.stderr.write(verify.stderr || '');
  if (verify.status !== 0) process.exit(verify.status || 1);

  const entries = spawnSync('unzip', ['-Z1', resolved], { encoding: 'utf8' });
  const count = entries.status === 0 ? entries.stdout.split(/\r?\n/).filter(Boolean).length : 0;
  console.log(`PASS overwrite ZIP contents verified: ${path.basename(resolved)} (${count} entries)`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
