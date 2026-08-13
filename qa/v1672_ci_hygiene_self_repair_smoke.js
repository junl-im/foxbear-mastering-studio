#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
};

function run(command, args, cwd, env = process.env) {
  return spawnSync(command, args, { cwd, encoding: 'utf8', env });
}

function initializeFixture(temp, files) {
  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(temp, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
  let result = run('git', ['init', '-q'], temp);
  assert(result.status === 0, `git init failed: ${result.stderr}`);
  run('git', ['config', 'user.name', 'FoxBear QA'], temp);
  run('git', ['config', 'user.email', 'qa@example.invalid'], temp);
  result = run('git', ['add', '-A'], temp);
  assert(result.status === 0, `git add failed: ${result.stderr}`);
  result = run('git', ['commit', '-qm', 'fixture'], temp);
  assert(result.status === 0, `git commit failed: ${result.stderr}`);
}

const gate = read('tools/run-source-hygiene-gate.js');
const repair = read('tools/repair-source-hygiene.js');
const pages = read('.github/workflows/pages.yml');
const fallback = read('.github/workflows/pages-branch-fallback.yml');

assert(gate.includes("'ci-safe'"), 'ci-safe source hygiene mode is missing');
assert(gate.includes("FOXBEAR_ALLOW_CI_HYGIENE_REPAIR: '1'"), 'ci-safe mode must explicitly authorize allowlisted cleanup');
assert(repair.includes('Source hygiene auto-repair'), 'GitHub warning annotation for auto-repair is missing');
assert(repair.includes("'.firebaserc'"), '.firebaserc must remain in the narrow allowlist');
assert(repair.includes("'.firebase'"), '.firebase must remain in the narrow allowlist');
assert(repair.includes("'qa/static-audit.txt'"), 'qa/static-audit.txt must remain in the narrow allowlist');
for (const [name, workflow] of [['pages', pages], ['fallback', fallback]]) {
  assert(workflow.includes('FOXBEAR_SOURCE_HYGIENE_MODE: strict'), `${name} workflow must use strict mode for the normal release path`);
  assert(!workflow.includes('FOXBEAR_SOURCE_HYGIENE_MODE: ci-safe'), `${name} workflow must not auto-repair source hygiene during release`);
}
assert(gate.includes("const mode = requestedMode || 'strict';"), 'source hygiene gate must default to strict mode');

const exactFailureFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1672-ci-safe-'));
try {
  initializeFixture(exactFailureFixture, {
    '.firebaserc': '{"projects":{"default":"local-only"}}\n',
    '.firebase/hosting..cache': 'generated-cache\n',
    'qa/static-audit.txt': 'generated-audit\n',
    'safe.txt': 'safe\n'
  });
  const result = run(process.execPath, [path.join(ROOT, 'tools/run-source-hygiene-gate.js'), '--root', exactFailureFixture], ROOT, {
    ...process.env,
    GITHUB_ACTIONS: 'true',
    FOXBEAR_SOURCE_HYGIENE_MODE: 'ci-safe'
  });
  const output = `${result.stdout}\n${result.stderr}`;
  assert(result.status === 0, `ci-safe mode must pass the reported three-path failure: ${output}`);
  assert(!fs.existsSync(path.join(exactFailureFixture, '.firebaserc')), '.firebaserc was not removed from CI workspace');
  assert(!fs.existsSync(path.join(exactFailureFixture, '.firebase')), '.firebase directory was not removed from CI workspace');
  assert(!fs.existsSync(path.join(exactFailureFixture, 'qa/static-audit.txt')), 'qa/static-audit.txt was not removed from CI workspace');
  assert((output.match(/::warning file=/g) || []).length === 3, 'ci-safe mode must emit exactly three warning annotations for the reported paths');
  assert(!output.includes('::error file='), 'ci-safe allowlisted cleanup must not emit error annotations');
  assert(output.includes('PASS source hygiene verified for Git-tracked files'), 'strict verification must run after CI cleanup');
} finally {
  fs.rmSync(exactFailureFixture, { recursive: true, force: true });
}

const secretFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1672-secret-'));
try {
  initializeFixture(secretFixture, {
    '.firebaserc': '{"projects":{"default":"remove-me"}}\n',
    '.env.production': 'SECRET=must-still-fail\n',
    'safe.txt': 'safe\n'
  });
  const result = run(process.execPath, [path.join(ROOT, 'tools/run-source-hygiene-gate.js'), '--root', secretFixture], ROOT, {
    ...process.env,
    GITHUB_ACTIONS: 'true',
    FOXBEAR_SOURCE_HYGIENE_MODE: 'ci-safe'
  });
  const output = `${result.stdout}\n${result.stderr}`;
  assert(result.status !== 0, 'ci-safe mode must still fail secret-like files');
  assert(!fs.existsSync(path.join(secretFixture, '.firebaserc')), 'allowlisted local state should be removed before the strict check');
  assert(fs.existsSync(path.join(secretFixture, '.env.production')), 'secret-like file must never be auto-deleted');
  assert(output.includes('::error file=.env.production'), 'secret-like file must retain an error annotation');
} finally {
  fs.rmSync(secretFixture, { recursive: true, force: true });
}

const strictFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1672-strict-'));
try {
  initializeFixture(strictFixture, {
    '.firebaserc': '{"projects":{"default":"strict-audit"}}\n',
    'safe.txt': 'safe\n'
  });
  const result = run(process.execPath, [path.join(ROOT, 'tools/run-source-hygiene-gate.js'), '--root', strictFixture], ROOT, {
    ...process.env,
    GITHUB_ACTIONS: 'true',
    FOXBEAR_SOURCE_HYGIENE_MODE: 'strict'
  });
  assert(result.status !== 0, 'explicit strict audit mode must remain available');
  assert(fs.existsSync(path.join(strictFixture, '.firebaserc')), 'strict audit mode must not mutate the workspace');
} finally {
  fs.rmSync(strictFixture, { recursive: true, force: true });
}

console.log('PASS v1.6.72 CI allowlisted hygiene self-repair regression');
