#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { qaChecks: configuredChecks } = require('../package.json');
const { cleanPythonBytecode } = require('./python-bytecode-hygiene');

const DEFAULT_CHECK_TIMEOUT_MS = 60000;
const DEFAULT_ROOT = path.resolve(__dirname, '..');

function buildQaChildEnv(base = process.env) {
  return {
    ...base,
    PYTHONDONTWRITEBYTECODE: '1'
  };
}

function runAllChecks(checks = configuredChecks, options = {}) {
  if (!Array.isArray(checks) || !checks.length) {
    console.error('FAIL package.json qaChecks is missing or empty');
    return { status: 1, results: [] };
  }

  const cwd = path.resolve(options.cwd || DEFAULT_ROOT);
  const cleanupRoot = path.resolve(options.cleanupRoot || cwd);
  const timeout = Number(options.timeout || DEFAULT_CHECK_TIMEOUT_MS);
  const stdio = options.stdio || 'inherit';
  const env = buildQaChildEnv(options.env || process.env);
  const results = [];

  cleanPythonBytecode(cleanupRoot);
  try {
    for (const command of checks) {
      const started = Date.now();
      const result = spawnSync(command, {
        cwd,
        shell: true,
        stdio,
        timeout,
        env
      });
      const elapsed = Date.now() - started;
      const ok = result.status === 0;
      results.push({ command, ok, status: result.status, signal: result.signal, elapsed });
      const label = ok ? 'PASS' : 'FAIL';
      console.log(`${label} ${command} (${elapsed}ms${result.signal ? `, signal ${result.signal}` : ''})`);
    }
  } finally {
    cleanPythonBytecode(cleanupRoot);
  }

  const failed = results.filter(item => !item.ok);
  console.log('\nFoxBear QA summary');
  console.log(`  Passed: ${results.length - failed.length}/${results.length}`);
  console.log(`  Failed: ${failed.length}/${results.length}`);
  if (failed.length) {
    console.log('\nFailed checks:');
    failed.forEach(item => console.log(`  - ${item.command} (status ${item.status}${item.signal ? `, signal ${item.signal}` : ''})`));
  }
  return { status: failed.length ? 1 : 0, results };
}

if (require.main === module) {
  process.exit(runAllChecks().status);
}

module.exports = {
  DEFAULT_CHECK_TIMEOUT_MS,
  buildQaChildEnv,
  runAllChecks
};
