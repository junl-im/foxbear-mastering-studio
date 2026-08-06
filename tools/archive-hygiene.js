#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FORBIDDEN_DIRS = new Set([
  '.git',
  '.firebase',
  '.audit-results',
  'node_modules',
  'dist',
  'browser-results',
  'browser-history',
  'test-results',
  'playwright-report',
  'coverage',
  '__pycache__'
]);

function normalizeRelative(root, full) {
  return path.relative(root, full).split(path.sep).join('/');
}

function isTransientFile(relative, name) {
  if (name === '.DS_Store' || name === '.last-run.json' || name === '.firebaserc') return true;
  if (name.startsWith('.env') && !/\.example$/i.test(name)) return true;
  if (/^\.foxbear-e2e-probe-.*\.txt$/i.test(name)) return true;
  if (/\.(?:log|zip|tmp|trace|pyc|pyo|exe|dll|bat|cmd|com|msi|scr|ps1)$/i.test(name)) return true;
  if (/(?:^|\/)qa\/(?:static-audit|browser-check|static-check)[^/]*\.txt$/i.test(relative)) return true;
  return false;
}

function findTransientArtifacts(root) {
  const found = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const relative = normalizeRelative(root, full);
      if (entry.isSymbolicLink()) {
        found.push(`${relative} -> symlink`);
        continue;
      }
      if (entry.isDirectory()) {
        if (FORBIDDEN_DIRS.has(entry.name)) {
          found.push(`${relative}/`);
          continue;
        }
        walk(full);
        continue;
      }
      if (isTransientFile(relative, entry.name)) found.push(relative);
    }
  };
  walk(root);
  return found;
}

function assertNoTransientArtifacts(root) {
  const found = findTransientArtifacts(root);
  if (!found.length) return;
  throw new Error(`Archive contains transient or unsafe artifacts: ${found.slice(0, 20).join(', ')}`);
}

function listZipEntries(zipPath) {
  const result = spawnSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Unable to list ZIP entries.');
  }
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function findUnsafeZipEntryPaths(entries) {
  return entries.filter(raw => {
    const entry = String(raw).replace(/\\/g, '/');
    if (!entry || entry.includes('\0')) return true;
    if (entry.startsWith('/') || /^[A-Za-z]:\//.test(entry)) return true;
    const parts = entry.split('/').filter(Boolean);
    return parts.some(part => part === '..');
  });
}

function findZipSymlinkEntries(zipPath) {
  const result = spawnSync('zipinfo', ['-l', zipPath], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Unable to inspect ZIP entry types.');
  }
  return result.stdout
    .split(/\r?\n/)
    .filter(line => /^l[rwx-]{9}\s/.test(line))
    .map(line => line.trim());
}

function assertSafeZipStructure(zipPath) {
  const entries = listZipEntries(zipPath);
  const unsafePaths = findUnsafeZipEntryPaths(entries);
  if (unsafePaths.length) {
    throw new Error(`Archive contains unsafe entry paths: ${unsafePaths.slice(0, 20).join(', ')}`);
  }
  const symlinks = findZipSymlinkEntries(zipPath);
  if (symlinks.length) {
    throw new Error(`Archive contains symbolic-link entries: ${symlinks.slice(0, 10).join(' | ')}`);
  }
  return entries;
}

module.exports = {
  FORBIDDEN_DIRS,
  assertNoTransientArtifacts,
  assertSafeZipStructure,
  findTransientArtifacts,
  findUnsafeZipEntryPaths,
  findZipSymlinkEntries,
  isTransientFile,
  listZipEntries
};
