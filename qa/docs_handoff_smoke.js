#!/usr/bin/env node
'use strict';

const fs = require('fs');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const handoff = fs.readFileSync('HANDOFF.md', 'utf8');
const notes = fs.readFileSync('PROJECT_NOTES.md', 'utf8');

assert(changelog.includes('Stage6'), 'CHANGELOG.md does not mention Stage6');
assert(changelog.includes('waveform-compare-view.js'), 'CHANGELOG.md does not mention compare view module');
assert(handoff.includes('다음 패치 후보'), 'HANDOFF.md is missing next patch section');
assert(handoff.includes('npm run check'), 'HANDOFF.md does not include QA command');
assert(notes.includes('Stage6'), 'PROJECT_NOTES.md was not updated for Stage6');

console.log('PASS docs handoff smoke');
