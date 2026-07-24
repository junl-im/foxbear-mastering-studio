#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const browserDir = path.join(root, 'qa/browser');
const builderSource = fs.readFileSync(path.join(browserDir, 'helpers/visual-fixture-builders.js'), 'utf8');
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
  if (!source.includes("require('./helpers/visual-fixture-builders')")) {
    failures.push(`${name} does not use the shared Trusted Types-safe fixture builder`);
  }
}

const bulkSource = fs.readFileSync(path.join(browserDir, targetSpecs[0]), 'utf8');
if (!bulkSource.includes('stageBulkMasteringHudFixture')) {
  failures.push('bulk mastering visual spec does not call the shared fixture builder');
}
const downloadSource = fs.readFileSync(path.join(browserDir, targetSpecs[1]), 'utf8');
if (!downloadSource.includes('stageDownloadOptionsFixture')) {
  failures.push('download visual spec does not call the shared fixture builder');
}
if (!builderSource.includes('list.replaceChildren(...rows)')) {
  failures.push('shared bulk mastering fixture does not atomically replace rows');
}
if (!builderSource.includes('sheet.append(families, optionsList, actions)')) {
  failures.push('shared download fixture does not append its structured DOM sections');
}

if (failures.length) {
  failures.forEach(message => console.error(`FAIL ${message}`));
  process.exit(1);
}

console.log('PASS v1.5.84 Trusted Types-safe browser visual fixtures');
