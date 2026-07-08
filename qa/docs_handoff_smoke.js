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

function countCodeFences(text) {
  const matches = text.match(/^```/gm);
  return matches ? matches.length : 0;
}

function assertBalancedCodeFences(path) {
  const text = read(path);
  const count = countCodeFences(text);
  assert(count % 2 === 0, `${path} has unbalanced Markdown code fences (${count})`);
}

const changelog = read('CHANGELOG.md');
const handoff = read('HANDOFF.md');
const notes = read('PROJECT_NOTES.md');
const readme = read('README.md');
const qaReport = read('qa/QA_REPORT.md');

assert(changelog.includes('Stage7'), 'CHANGELOG.md does not mention Stage7');
assert(changelog.includes('Stage9'), 'CHANGELOG.md does not mention Stage9');
assert(changelog.includes('waveform-compare-view.js'), 'CHANGELOG.md does not mention compare view module');
assert(handoff.includes('Stage7'), 'HANDOFF.md does not mention Stage7');
assert(handoff.includes('Stage9'), 'HANDOFF.md does not mention Stage9');
assert(handoff.includes('Next patch candidates') || handoff.includes('Next safe direction') || handoff.includes('다음 패치 후보'), 'HANDOFF.md is missing next patch section');
assert(handoff.includes('npm run check'), 'HANDOFF.md does not include QA command');
assert(notes.includes('Stage7'), 'PROJECT_NOTES.md was not updated for Stage7');
assert(notes.includes('Stage9'), 'PROJECT_NOTES.md was not updated for Stage9');
assert(readme.includes('docs/history/'), 'README.md does not point to historical docs');
assert(qaReport.includes('docs/history/'), 'QA_REPORT.md does not point to historical docs');

[
  'README.md',
  'HANDOFF.md',
  'qa/QA_REPORT.md',
  'PROJECT_NOTES.md',
  'CHANGELOG.md',
  'docs/history/README_legacy_v1.4.21_to_v1.4.26.md',
  'docs/history/HANDOFF_legacy_v1.4.21_to_v1.4.26.md',
  'docs/history/QA_REPORT_legacy_v1.4.21_to_v1.4.26.md'
].forEach(assertBalancedCodeFences);

console.log('PASS docs handoff smoke');
