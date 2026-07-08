#!/usr/bin/env node
'use strict';

const fs = require('fs');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const readme = read('README.md');
const handoff = read('HANDOFF.md');
const qaReport = read('qa/QA_REPORT.md');
const history = [
  'docs/history/README_legacy_v1.4.21_to_v1.4.26.md',
  'docs/history/HANDOFF_legacy_v1.4.21_to_v1.4.26.md',
  'docs/history/QA_REPORT_legacy_v1.4.21_to_v1.4.26.md'
];

assert(readme.includes('v1.4.28 App Slim-down') || readme.includes('v1.4.27 Release Cleanup'), 'README missing current release cleanup/slim-down heading');
assert(handoff.includes('v1.4.28 App Slim-down') || handoff.includes('v1.4.27 Release Cleanup'), 'HANDOFF missing current release cleanup/slim-down heading');
assert(qaReport.includes('160/160 PASS'), 'QA report missing current final count');
assert(readme.includes('docs/history/README_legacy_v1.4.21_to_v1.4.26.md'), 'README missing historical docs pointer');
history.forEach(path => assert(fs.existsSync(path), `${path} missing`));

const activeDocs = [readme, handoff, qaReport].join('\n');
assert(!activeDocs.includes('146/146 PASS'), 'active docs still contain old 146/146 count');
assert(!activeDocs.includes('147/147 PASS'), 'active docs still contain old 147/147 count');
assert(!activeDocs.includes('149/149 PASS'), 'active docs still contain old 149/149 count');
assert(!activeDocs.includes('150/150 PASS'), 'active docs still contain old 150/150 count');

assert(read('src/workers/analysis.worker.js').startsWith('// FoxBear analysis worker v1.4.27'), 'analysis worker header not updated');
assert(read('src/workers/master-finalizer.worker.js').startsWith('// FoxBear Pro finalizer worker v1.4.27'), 'finalizer worker header not updated');

console.log('PASS v1.4.27 release cleanup smoke');
