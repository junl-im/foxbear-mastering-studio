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
const mode = requestedMode || (process.env.GITHUB_ACTIONS === 'true' ? 'ci-safe' : 'repair');
const supportedModes = new Set(['strict', 'repair', 'ci-safe']);

if (!supportedModes.has(mode)) {
  console.error(`FAIL unsupported source hygiene mode: ${mode}`);
  process.exit(2);
}

function run(script, extraEnv = {}) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'tools', script), '--root', targetRoot], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`FoxBear source hygiene gate mode: ${mode}`);
if (mode === 'repair') {
  run('repair-source-hygiene.js');
} else if (mode === 'ci-safe') {
  run('repair-source-hygiene.js', {
    FOXBEAR_ALLOW_CI_HYGIENE_REPAIR: '1',
    FOXBEAR_HYGIENE_REPAIR_CONTEXT: 'ci-safe'
  });
}
run('check-source-hygiene.js');
