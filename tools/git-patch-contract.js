#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

function normalize(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
}

function assertSafeDeletePath(relative) {
  const value = normalize(relative);
  if (!value || value === '.' || value.startsWith('/') || /^[A-Za-z]:\//.test(value)) {
    throw new Error(`Unsafe delete path: ${relative}`);
  }
  const parts = value.split('/');
  if (parts.includes('..') || parts.includes('.git')) throw new Error(`Unsafe delete path: ${relative}`);
  return value;
}

function normalizeDeletePaths(values) {
  return [...new Set((values || []).map(assertSafeDeletePath))].sort();
}

function deletePathCovers(relative, declared) {
  const target = normalize(relative);
  return normalizeDeletePaths(declared).some(entry => target === entry || target.startsWith(`${entry}/`));
}

function readGitChangeSet(root) {
  const result = spawnSync('git', ['diff', '--name-status', '-z', '-M', 'HEAD'], { cwd: root, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Unable to inspect Git change state.');
  const tokens = String(result.stdout || '').split('\0').filter(Boolean);
  const changed = [];
  const deleted = [];
  for (let index = 0; index < tokens.length;) {
    const status = tokens[index++];
    if (/^[RC]/.test(status)) {
      const from = normalize(tokens[index++]);
      const to = normalize(tokens[index++]);
      if (status.startsWith('R')) deleted.push(from);
      changed.push(to);
      continue;
    }
    const relative = normalize(tokens[index++]);
    if (status === 'D') deleted.push(relative);
    else changed.push(relative);
  }
  return Object.freeze({
    changed: [...new Set(changed)].sort(),
    deleted: [...new Set(deleted)].sort()
  });
}

function assertDeclaredGitDeletions(deleted, declared) {
  const safeDeclared = normalizeDeletePaths(declared);
  const missing = [...new Set((deleted || []).map(normalize))].filter(relative => !deletePathCovers(relative, safeDeclared));
  if (missing.length) {
    throw new Error(`DELETE_PATHS.txt is missing tracked deletions/rename sources: ${missing.slice(0, 20).join(', ')}`);
  }
  return safeDeclared;
}

module.exports = {
  assertDeclaredGitDeletions,
  assertSafeDeletePath,
  deletePathCovers,
  normalize,
  normalizeDeletePaths,
  readGitChangeSet
};
