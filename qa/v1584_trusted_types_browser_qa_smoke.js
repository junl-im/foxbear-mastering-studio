#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const browserDir = path.join(root, 'qa/browser');
const targetSpecs = [
  'v1573-bulk-mastering-controls-visual.spec.js',
  'v1574-mobile-download-batch-controls-visual.spec.js'
];
const forbidden = [
  /\.innerHTML\s*=/,
  /\.outerHTML\s*=/,
  /insertAdjacentHTML\s*\(/,
  /document\.write\s*\(/
];

const failures = [];
for (const name of targetSpecs) {
  const source = fs.readFileSync(path.join(browserDir, name), 'utf8');
  if (forbidden.some(pattern => pattern.test(source))) {
    failures.push(`${name} still uses an HTML string injection sink`);
  }
  if (!source.includes('document.createElement(')) {
    failures.push(`${name} does not construct its staged fixture with DOM APIs`);
  }
}

const bulkSource = fs.readFileSync(path.join(browserDir, targetSpecs[0]), 'utf8');
if (!bulkSource.includes('list.replaceChildren(...rows)')) {
  failures.push('bulk mastering visual fixture does not atomically replace rows');
}
const downloadSource = fs.readFileSync(path.join(browserDir, targetSpecs[1]), 'utf8');
if (!downloadSource.includes('sheet.append(families, options, actions)')) {
  failures.push('download visual fixture does not append its structured DOM sections');
}

if (failures.length) {
  failures.forEach(message => console.error(`FAIL ${message}`));
  process.exit(1);
}

console.log('PASS v1.5.84 Trusted Types-safe browser visual fixtures');
