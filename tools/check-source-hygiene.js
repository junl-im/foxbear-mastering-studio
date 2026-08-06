#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootArgIndex = process.argv.indexOf('--root');
const ROOT = path.resolve(rootArgIndex >= 0 && process.argv[rootArgIndex + 1] ? process.argv[rootArgIndex + 1] : path.join(__dirname, '..'));

const FORBIDDEN_EXACT = new Set([
  '.firebaserc',
  'qa/static-audit.txt',
  'firebase-debug.log',
  'npm-debug.log'
]);
const FORBIDDEN_PREFIXES = [
  '.firebase/',
  '.audit-results/',
  'dist/',
  'node_modules/',
  'functions/node_modules/',
  'qa/browser-results/',
  'qa/browser-history/',
  'test-results/',
  'playwright-report/'
];

function normalize(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function isSecretEnvFile(relative) {
  const name = path.posix.basename(relative);
  if (!name.startsWith('.env')) return false;
  return !/\.example$/i.test(name);
}

function isForbidden(relative) {
  const value = normalize(relative);
  if (FORBIDDEN_EXACT.has(value)) return true;
  if (FORBIDDEN_PREFIXES.some(prefix => value === prefix.slice(0, -1) || value.startsWith(prefix))) return true;
  if (/^qa\/(?:static-audit|browser-check|static-check)[^/]*\.txt$/i.test(value)) return true;
  return isSecretEnvFile(value);
}

function trackedFiles() {
  if (!fs.existsSync(path.join(ROOT, '.git'))) return null;
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Unable to inspect tracked files.');
  }
  return result.stdout.split('\0').filter(Boolean).map(normalize);
}

function walkFiles(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    const relative = normalize(path.relative(ROOT, full));
    if (entry.isSymbolicLink()) {
      output.push(`${relative} -> symlink`);
      continue;
    }
    if (entry.isDirectory()) {
      if (isForbidden(`${relative}/`)) {
        output.push(`${relative}/`);
        continue;
      }
      walkFiles(full, output);
      continue;
    }
    if (isForbidden(relative)) output.push(relative);
  }
  return output;
}

try {
  const tracked = trackedFiles();
  const failures = tracked
    ? tracked.filter(relative => isForbidden(relative) && fs.existsSync(path.join(ROOT, relative)))
    : walkFiles(ROOT);
  if (failures.length) {
    console.error('FAIL source hygiene found local, generated, or secret-like files that must not ship:');
    failures.slice(0, 50).forEach(file => console.error(`  - ${file}`));
    if (failures.length > 50) console.error(`  - ... ${failures.length - 50} more`);
    process.exit(1);
  }
  console.log(`PASS source hygiene verified${tracked ? ' for Git-tracked files' : ' for archive files'}`);
} catch (error) {
  console.error(`FAIL source hygiene check: ${error?.message || error}`);
  process.exit(1);
}
