#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const rootArgIndex = process.argv.indexOf('--root');
const targetRoot = path.resolve(rootArgIndex >= 0 && process.argv[rootArgIndex + 1]
  ? process.argv[rootArgIndex + 1]
  : ROOT);
const requestedMode = String(process.env.FOXBEAR_SOURCE_HYGIENE_MODE || '').trim().toLowerCase();
const strictMode = requestedMode === 'strict' || process.env.GITHUB_ACTIONS === 'true';
const mode = strictMode ? 'strict' : 'repair';

function run(script) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'tools', script), '--root', targetRoot], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`FoxBear source hygiene gate mode: ${mode}`);
if (!strictMode) run('repair-source-hygiene.js');
run('check-source-hygiene.js');
