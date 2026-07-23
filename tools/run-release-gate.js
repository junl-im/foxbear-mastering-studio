#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const phase = String(process.env.FOXBEAR_RELEASE_PHASE || 'full').trim().toLowerCase();
const phases = {
  static: ['version:check', 'handoff:check', 'dependencies:check', 'check:static'],
  browser: ['qa:browser'],
  full: ['version:check', 'handoff:check', 'dependencies:check', 'check:static', 'qa:browser']
};

if (!Object.prototype.hasOwnProperty.call(phases, phase)) {
  console.error(`Unknown FOXBEAR_RELEASE_PHASE: ${phase}`);
  process.exit(2);
}

console.log(`FoxBear release gate phase: ${phase}`);
for (const script of phases[phase]) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], {
    stdio: 'inherit',
    env: process.env
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}
