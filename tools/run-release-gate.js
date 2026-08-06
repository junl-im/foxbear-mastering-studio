#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const phase = String(process.env.FOXBEAR_RELEASE_PHASE || 'full').trim().toLowerCase();
const phases = {
  static: ['source:hygiene', 'version:check', 'handoff:check', 'dependencies:check', 'check:static'],
  browser: ['qa:browser'],
  full: ['source:hygiene', 'version:check', 'handoff:check', 'dependencies:check', 'check:static', 'qa:browser']
};

if (!Object.prototype.hasOwnProperty.call(phases, phase)) {
  console.error(`Unknown FOXBEAR_RELEASE_PHASE: ${phase}`);
  process.exit(2);
}

function resolveNpmCli() {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.cjs')
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate)) || '';
}

const npmCli = resolveNpmCli();
if (!npmCli) {
  console.error('Unable to locate the npm CLI. Run this gate through `npm run check:release` or reinstall Node.js/npm.');
  process.exit(1);
}

console.log(`FoxBear release gate phase: ${phase}`);
for (const script of phases[phase]) {
  const result = spawnSync(process.execPath, [npmCli, 'run', script], {
    stdio: 'inherit',
    env: process.env
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}
