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

const pkg = JSON.parse(read('package.json'));
const releaseGate = read('tools/run-release-gate.js');
const repair = read('tools/repair-source-hygiene.js');
const pages = read('.github/workflows/pages.yml');
const fallback = read('.github/workflows/pages-branch-fallback.yml');

assert(pkg.scripts?.['source:hygiene:gate'] === 'node tools/run-source-hygiene-gate.js', 'source hygiene gate script missing');
assert(releaseGate.includes("static: ['source:hygiene:gate',"), 'static release gate must use policy-aware hygiene gate');
assert(releaseGate.includes("full: ['source:hygiene:gate',"), 'full release gate must use policy-aware hygiene gate');
assert(!releaseGate.includes("static: ['source:hygiene:repair'"), 'static release gate must use the policy-aware gate instead of direct repair');
assert(repair.includes("policy-aware ci-safe gate explicitly enables"), 'direct CI repair guard missing');
for (const [name, workflow] of [['pages', pages], ['fallback', fallback]]) {
  const hygieneIndex = workflow.indexOf('Verify source hygiene before install');
  const installIndex = workflow.indexOf('Install pinned dependencies');
  assert(hygieneIndex >= 0 && installIndex >= 0 && hygieneIndex < installIndex, `${name} workflow must check hygiene before dependency installation`);
  assert(workflow.includes('FOXBEAR_SOURCE_HYGIENE_MODE: strict'), `${name} workflow strict hygiene mode missing`);
}

const strictFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-hygiene-strict-'));
try {
  initializeFixture(strictFixture, {
    '.firebaserc': '{"projects":{"default":"must-fail"}}\n',
    'safe.txt': 'safe\n'
  });
  const env = {
    ...process.env,
    GITHUB_ACTIONS: 'true',
    FOXBEAR_SOURCE_HYGIENE_MODE: 'strict'
  };
  const result = run(process.execPath, [path.join(ROOT, 'tools/run-source-hygiene-gate.js'), '--root', strictFixture], ROOT, env);
  const output = `${result.stdout}\n${result.stderr}`;
  assert(result.status !== 0, 'strict CI mode must fail committed local Firebase state');
  assert(fs.existsSync(path.join(strictFixture, '.firebaserc')), 'strict CI mode must not delete the offending file');
  assert(output.includes('::error file=.firebaserc'), 'strict CI mode must emit a GitHub file annotation');
  assert(output.includes('npm run source:hygiene:repair'), 'strict CI failure must include local remediation');
} finally {
  fs.rmSync(strictFixture, { recursive: true, force: true });
}

const repairFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-hygiene-local-'));
try {
  initializeFixture(repairFixture, {
    '.firebaserc': '{"projects":{"default":"repair-local"}}\n',
    'safe.txt': 'safe\n'
  });
  const env = {
    ...process.env,
    GITHUB_ACTIONS: 'false',
    FOXBEAR_SOURCE_HYGIENE_MODE: 'repair'
  };
  const result = run(process.execPath, [path.join(ROOT, 'tools/run-source-hygiene-gate.js'), '--root', repairFixture], ROOT, env);
  assert(result.status === 0, `local repair mode should pass: ${result.stderr || result.stdout}`);
  assert(!fs.existsSync(path.join(repairFixture, '.firebaserc')), 'local repair mode must remove known repairable state');
} finally {
  fs.rmSync(repairFixture, { recursive: true, force: true });
}

const secretFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-hygiene-secret-'));
try {
  initializeFixture(secretFixture, {
    '.env.production': 'SECRET=must-not-delete\n',
    'safe.txt': 'safe\n'
  });
  const env = {
    ...process.env,
    GITHUB_ACTIONS: 'false',
    FOXBEAR_SOURCE_HYGIENE_MODE: 'repair'
  };
  const result = run(process.execPath, [path.join(ROOT, 'tools/run-source-hygiene-gate.js'), '--root', secretFixture], ROOT, env);
  assert(result.status !== 0, 'repair mode must still fail secret-like files');
  assert(fs.existsSync(path.join(secretFixture, '.env.production')), 'repair mode must not delete secret-like files');
} finally {
  fs.rmSync(secretFixture, { recursive: true, force: true });
}

console.log('PASS v1.6.67 strict mode remains available while workflows use later policy-aware mode');
