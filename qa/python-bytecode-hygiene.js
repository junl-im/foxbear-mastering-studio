#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', '_site']);

function normalizeRoot(root) {
  return path.resolve(root || DEFAULT_ROOT);
}

function cleanPythonBytecode(root = DEFAULT_ROOT) {
  const base = normalizeRoot(root);
  const removed = [];
  if (!fs.existsSync(base)) return removed;

  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__pycache__') {
          fs.rmSync(full, { recursive: true, force: true });
          removed.push(path.relative(base, full) || entry.name);
          continue;
        }
        if (SKIP_DIRECTORIES.has(entry.name)) continue;
        walk(full);
        continue;
      }
      if (entry.isFile() && /\.py[co]$/i.test(entry.name)) {
        fs.rmSync(full, { force: true });
        removed.push(path.relative(base, full) || entry.name);
      }
    }
  }

  walk(base);
  return removed;
}

function findPythonBytecode(root = DEFAULT_ROOT) {
  const base = normalizeRoot(root);
  const found = [];
  if (!fs.existsSync(base)) return found;

  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__pycache__') {
          found.push(path.relative(base, full) || entry.name);
          continue;
        }
        if (SKIP_DIRECTORIES.has(entry.name)) continue;
        walk(full);
      } else if (entry.isFile() && /\.py[co]$/i.test(entry.name)) {
        found.push(path.relative(base, full) || entry.name);
      }
    }
  }

  walk(base);
  return found.sort();
}

if (require.main === module) {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ROOT;
  const removed = cleanPythonBytecode(root);
  console.log(`FoxBear Python bytecode cleanup: removed ${removed.length} path(s).`);
}

module.exports = {
  DEFAULT_ROOT,
  cleanPythonBytecode,
  findPythonBytecode
};
