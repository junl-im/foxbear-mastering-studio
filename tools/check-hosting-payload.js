#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase.json'), 'utf8'));
const ignore = new Set(config.hosting?.ignore || []);
const requiredExecutableIgnores = [
  '**/*.exe',
  '**/*.dll',
  '**/*.bat',
  '**/*.cmd',
  '**/*.com',
  '**/*.msi',
  '**/*.scr',
  '**/*.ps1'
];
const missing = requiredExecutableIgnores.filter(pattern => !ignore.has(pattern));
if (missing.length) {
  console.error(`Firebase Hosting executable ignore rules are missing: ${missing.join(', ')}`);
  process.exit(1);
}

const skippedDirectories = new Set(['.git', '.firebase', 'node_modules', 'dist', 'test-results', 'playwright-report', 'coverage']);
const executablePattern = /\.(?:exe|dll|bat|cmd|com|msi|scr|ps1)$/i;
const found = [];

function walk(directory, relative = '') {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, nextRelative);
    else if (entry.isFile() && executablePattern.test(entry.name)) found.push(nextRelative);
  }
}

walk(ROOT);
if (found.length) {
  console.warn(`Firebase Hosting will exclude executable files: ${found.slice(0, 20).join(', ')}`);
}
console.log('PASS Firebase Hosting Spark executable-file hygiene verified.');
