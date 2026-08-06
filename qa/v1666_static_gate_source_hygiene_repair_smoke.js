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

function run(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: 'utf8' });
}

const pkg = JSON.parse(read('package.json'));
const gate = read('tools/run-release-gate.js');
const delivery = read('tools/create-delivery-zips.js');
assert(pkg.scripts?.['source:hygiene:repair'] === 'node tools/repair-source-hygiene.js', 'repair script command missing');
assert(gate.includes("static: ['source:hygiene:repair', 'source:hygiene'"), 'static gate must repair before checking');
assert(gate.includes("full: ['source:hygiene:repair', 'source:hygiene'"), 'full gate must repair before checking');
assert(delivery.indexOf('repair-source-hygiene.js') < delivery.indexOf('check-source-hygiene.js'), 'delivery packaging must repair before checking');
assert(fs.existsSync(path.join(ROOT, 'APPLY_PATCH_CLEANUP.sh')), 'shell cleanup launcher missing');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-hygiene-repair-'));
try {
  fs.mkdirSync(path.join(temp, '.firebase'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'qa'), { recursive: true });
  fs.writeFileSync(path.join(temp, '.firebaserc'), '{"projects":{"default":"local-test"}}\n');
  fs.writeFileSync(path.join(temp, '.firebase', 'hosting..cache'), 'cache\n');
  fs.writeFileSync(path.join(temp, 'qa', 'static-audit.txt'), 'generated\n');
  fs.writeFileSync(path.join(temp, '.env.production'), 'SECRET=must-remain-blocked\n');

  let result = run('git', ['init', '-q'], temp);
  assert(result.status === 0, `git init failed: ${result.stderr}`);
  run('git', ['config', 'user.name', 'FoxBear QA'], temp);
  run('git', ['config', 'user.email', 'qa@example.invalid'], temp);
  result = run('git', ['add', '-A'], temp);
  assert(result.status === 0, `git add failed: ${result.stderr}`);
  result = run('git', ['commit', '-qm', 'fixture'], temp);
  assert(result.status === 0, `git commit failed: ${result.stderr}`);

  result = run(process.execPath, [path.join(ROOT, 'tools/repair-source-hygiene.js'), '--root', temp], ROOT);
  assert(result.status === 0, `repair failed: ${result.stderr || result.stdout}`);
  assert(!fs.existsSync(path.join(temp, '.firebaserc')), '.firebaserc was not removed');
  assert(!fs.existsSync(path.join(temp, '.firebase')), '.firebase directory was not removed');
  assert(!fs.existsSync(path.join(temp, 'qa', 'static-audit.txt')), 'static audit was not removed');
  assert(fs.existsSync(path.join(temp, '.env.production')), 'secret env file must not be auto-deleted');

  result = run(process.execPath, [path.join(ROOT, 'tools/check-source-hygiene.js'), '--root', temp], ROOT);
  assert(result.status !== 0, 'secret env file must continue to fail source hygiene');
  assert(`${result.stdout}\n${result.stderr}`.includes('.env.production'), 'secret env failure must name the blocked file');

  fs.rmSync(path.join(temp, '.env.production'));
  result = run(process.execPath, [path.join(ROOT, 'tools/check-source-hygiene.js'), '--root', temp], ROOT);
  assert(result.status === 0, `clean fixture should pass: ${result.stderr || result.stdout}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('PASS v1.6.66 static gate source hygiene repair regression');
