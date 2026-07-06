#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'src');
const FORBIDDEN = [
  /\.innerHTML\s*=/,
  /\.outerHTML\s*=/,
  /insertAdjacentHTML\s*\(/,
  /document\.write\s*\(/
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.js') ? [full] : [];
  });
}

const violations = [];
for (const file of walk(ROOT)) {
  const relative = path.relative(path.resolve(__dirname, '..'), file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (FORBIDDEN.some(pattern => pattern.test(line))) {
      violations.push(`${relative}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (violations.length) {
  console.error('FAIL unsafe HTML injection sinks found:');
  violations.forEach(item => console.error(`  - ${item}`));
  process.exit(1);
}

console.log('PASS no unsafe HTML injection sinks in src');
