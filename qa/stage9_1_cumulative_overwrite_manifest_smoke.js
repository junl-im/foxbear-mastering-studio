#!/usr/bin/env node
'use strict';

const fs = require('fs');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

const scriptPath = 'tools/create-overwrite-zip.sh';
const script = fs.readFileSync(scriptPath, 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const handoff = fs.readFileSync('HANDOFF.md', 'utf8');
const notes = fs.readFileSync('PROJECT_NOTES.md', 'utf8');

[
  'src',
  'assets',
  'vendor',
  'docs',
  'qa',
  'tools',
  '.github/workflows',
  'index.html',
  'sw.js',
  'package.json',
  'playwright.config.js',
  '.gitignore',
  'robots.txt',
  'GITHUB_DESKTOP_HANDOFF.md',
  'HANDOFF_PACKAGE.json',
  'CHANGELOG.md',
  'HANDOFF.md',
  'PROJECT_NOTES.md'
].forEach(required => {
  assert(script.includes(`copy_path "${required}"`), `overwrite package script does not include ${required}`);
});

assert(packageJson.scripts && packageJson.scripts['package:overwrite'], 'package.json is missing package:overwrite script');
assert(script.includes('verify-overwrite-zip.js'), 'overwrite package script does not verify the produced archive');
assert(changelog.includes('Stage9.1'), 'CHANGELOG.md does not mention Stage9.1');
assert(handoff.includes('Stage9.1'), 'HANDOFF.md does not mention Stage9.1');
assert(notes.includes('Stage9.1'), 'PROJECT_NOTES.md does not mention Stage9.1');
assert(handoff.includes('누적 덮어쓰기'), 'HANDOFF.md does not explain cumulative overwrite packaging');

console.log('PASS stage9.1 cumulative overwrite manifest smoke');
