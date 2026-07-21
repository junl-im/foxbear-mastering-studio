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
const status = read('STATUS.md');
const versioning = read('VERSIONING.md');
const releaseChecklist = read('RELEASE_CHECKLIST.md');
const desktopHandoff = read('GITHUB_DESKTOP_HANDOFF.md');
const handoffPackage = JSON.parse(read('HANDOFF_PACKAGE.json'));
const dockFftDecision = read('docs/decisions/0001-dock-fft-removal.md');

assert(changelog.includes('Stage7'), 'CHANGELOG.md does not mention the actual Stage7 change');
assert(changelog.includes('Stage9'), 'CHANGELOG.md does not mention the actual Stage9 change');
assert(changelog.includes('waveform-compare-view.js'), 'CHANGELOG.md does not mention the actual compare view module change');
assert(status.includes('Dock mini FFT remains removed'), 'STATUS.md is missing the Dock FFT invariant');
assert(versioning.includes('source of truth'), 'VERSIONING.md is missing source-of-truth guidance');
assert(releaseChecklist.includes('npm run check:release'), 'RELEASE_CHECKLIST.md is missing the release gate');
assert(desktopHandoff.includes('GitHub Desktop') && desktopHandoff.includes('Push origin'), 'GitHub Desktop handoff guide is incomplete');
assert(handoffPackage.targetClient === 'GitHub Desktop', 'HANDOFF_PACKAGE.json target client is incorrect');
assert(dockFftDecision.includes('renderMini'), 'Dock FFT ADR is missing the renderMini decision');
assert(handoff.includes('Stage7'), 'HANDOFF.md does not mention Stage7');
assert(handoff.includes('Stage9'), 'HANDOFF.md does not mention Stage9');
assert(handoff.includes('Next patch candidates') || handoff.includes('Next safe direction') || handoff.includes('다음 패치 후보'), 'HANDOFF.md is missing next patch section');
assert(handoff.includes('npm run check'), 'HANDOFF.md does not include QA command');
assert(handoff.includes('## 필수 결과 보고 형식'), 'HANDOFF.md is missing the required result report format');
assert(handoff.includes('진행된 내용') && handoff.includes('배포 파일 2종') && handoff.includes('다음 예상 내용'), 'HANDOFF.md result report format is incomplete');
assert(desktopHandoff.includes('진행된 내용') && desktopHandoff.includes('배포 파일 2종') && desktopHandoff.includes('다음 예상 내용'), 'GitHub Desktop handoff is missing the result report rule');
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
  'STATUS.md',
  'VERSIONING.md',
  'RELEASE_CHECKLIST.md',
  'GITHUB_DESKTOP_HANDOFF.md',
  'docs/decisions/0001-dock-fft-removal.md',
  'docs/history/README_legacy_v1.4.21_to_v1.4.26.md',
  'docs/history/HANDOFF_legacy_v1.4.21_to_v1.4.26.md',
  'docs/history/QA_REPORT_legacy_v1.4.21_to_v1.4.26.md'
].forEach(assertBalancedCodeFences);

console.log('PASS docs handoff smoke');
