#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanPythonBytecode, findPythonBytecode } = require('./python-bytecode-hygiene');
const { buildQaChildEnv, runAllChecks } = require('./run_all_checks');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1592-'));
try {
  fs.mkdirSync(path.join(temp, 'qa', '__pycache__'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'tools', '__pycache__'), { recursive: true });
  fs.writeFileSync(path.join(temp, 'qa', '__pycache__', 'stale.cpython-312.pyc'), 'stale');
  fs.writeFileSync(path.join(temp, 'tools', 'legacy.pyo'), 'stale');
  fs.writeFileSync(path.join(temp, 'keep.py'), 'VALUE = 1\n');
  assert.equal(findPythonBytecode(temp).length, 3);
  const removed = cleanPythonBytecode(temp);
  assert.equal(removed.length, 3);
  assert.deepEqual(findPythonBytecode(temp), []);
  assert.equal(fs.existsSync(path.join(temp, 'keep.py')), true);

  fs.writeFileSync(path.join(temp, 'probe.py'), 'VALUE = 42\n');
  const env = buildQaChildEnv({ PATH: process.env.PATH || '' });
  assert.equal(env.PYTHONDONTWRITEBYTECODE, '1');
  const result = runAllChecks([
    "python3 -c \"import probe; assert probe.VALUE == 42\""
  ], {
    cwd: temp,
    cleanupRoot: temp,
    stdio: 'pipe',
    env
  });
  assert.equal(result.status, 0);
  assert.deepEqual(findPythonBytecode(temp), [], 'QA child Python process created bytecode despite the shared guard');

  const runner = fs.readFileSync(path.resolve(__dirname, 'run_all_checks.js'), 'utf8');
  assert(runner.includes("PYTHONDONTWRITEBYTECODE: '1'"));
  assert(runner.includes('cleanPythonBytecode(cleanupRoot)'));

  for (const workflowPath of [
    path.resolve(__dirname, '../.github/workflows/pages.yml'),
    path.resolve(__dirname, '../.github/workflows/pages-branch-fallback.yml')
  ]) {
    const workflow = fs.readFileSync(workflowPath, 'utf8');
    assert(!workflow.includes('actions/cache@v4'));
    assert(!workflow.includes('actions/cache/restore@v4'));
    assert(!workflow.includes('actions/cache/save@v4'));
    assert(workflow.includes('actions/cache@v5') || workflow.includes('actions/cache/restore@v5'));
  }

  const v1543 = fs.readFileSync(path.resolve(__dirname, 'v1543_export_pipeline_integrity_smoke.js'), 'utf8');
  assert(v1543.includes("spawnSync('python3', ['-B', 'tools/update-sri.py']"));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('PASS v1.5.92 CI-safe Python bytecode hygiene and Node 24 cache actions');
