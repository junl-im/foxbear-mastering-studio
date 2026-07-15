#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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

const result = spawnSync('unzip', ['-Z1', resolved], { encoding: 'utf8' });
if (result.status !== 0) {
  process.stderr.write(result.stderr || 'Unable to inspect overwrite ZIP.\n');
  process.exit(result.status || 1);
}

const entries = new Set(result.stdout.split(/\r?\n/).map(line => line.replace(/^\.\//, '')).filter(Boolean));
const requiredFiles = [
  'index.html',
  'sw.js',
  'manifest.webmanifest',
  'package.json',
  'package-lock.json',
  'playwright.config.js',
  'HANDOFF.md',
  'RELEASE_CHECKLIST.md',
  '.github/workflows/pages.yml',
  '.github/workflows/pages-branch-fallback.yml',
  'qa/browser/helpers/foxbear-e2e-helpers.js',
  'qa/v1512_ci_runtime_readiness_smoke.js',
  'tools/create-overwrite-zip.sh',
  'tools/verify-overwrite-zip.js'
];
const requiredPrefixes = ['src/', 'assets/', 'qa/', 'tools/', 'vendor/'];
const forbiddenPrefixes = ['node_modules/', 'dist/', 'qa/browser-results/', 'test-results/', 'playwright-report/'];

const missing = requiredFiles.filter(file => !entries.has(file));
const missingPrefixes = requiredPrefixes.filter(prefix => ![...entries].some(entry => entry.startsWith(prefix)));
const forbidden = [...entries].filter(entry => forbiddenPrefixes.some(prefix => entry.startsWith(prefix)));

if (missing.length || missingPrefixes.length || forbidden.length) {
  missing.forEach(file => console.error(`MISSING required overwrite file: ${file}`));
  missingPrefixes.forEach(prefix => console.error(`MISSING required overwrite tree: ${prefix}`));
  forbidden.forEach(file => console.error(`FORBIDDEN overwrite entry: ${file}`));
  process.exit(1);
}

console.log(`PASS overwrite ZIP contents verified: ${path.basename(resolved)} (${entries.size} entries)`);
