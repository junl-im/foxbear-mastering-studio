#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const { qaChecks: checks } = require('../package.json');

if (!Array.isArray(checks) || !checks.length) {
  console.error('FAIL package.json qaChecks is missing or empty');
  process.exit(1);
}

const DEFAULT_CHECK_TIMEOUT_MS = 60000;

const results = [];
for (const command of checks) {
  const started = Date.now();
  const result = spawnSync(command, { shell: true, stdio: 'inherit', timeout: DEFAULT_CHECK_TIMEOUT_MS });
  const elapsed = Date.now() - started;
  const ok = result.status === 0;
  results.push({ command, ok, status: result.status, signal: result.signal, elapsed });
  const label = ok ? 'PASS' : 'FAIL';
  console.log(`${label} ${command} (${elapsed}ms${result.signal ? `, signal ${result.signal}` : ''})`);
}

const failed = results.filter(item => !item.ok);
console.log('\nFoxBear QA summary');
console.log(`  Passed: ${results.length - failed.length}/${results.length}`);
console.log(`  Failed: ${failed.length}/${results.length}`);
if (failed.length) {
  console.log('\nFailed checks:');
  failed.forEach(item => console.log(`  - ${item.command} (status ${item.status}${item.signal ? `, signal ${item.signal}` : ''})`));
  process.exit(1);
}
