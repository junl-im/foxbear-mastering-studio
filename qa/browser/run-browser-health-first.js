#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const { ALL_BROWSER_SPECS } = require('./select-browser-scope');
const { parseSelectedBrowserSpecs, hasLastFailedFlag } = require('./run-browser-e2e');
const { runBrowserPreflight } = require('./run-browser-preflight');

const RUNTIME_HEALTH_SPEC = 'qa/browser/runtime-health-playwright.spec.js';
const RUNNER_PATH = path.resolve(__dirname, 'run-browser-e2e.js');

function normalizeSpecs(specs) {
  return Array.from(new Set((specs || []).map(value => String(value || '').replace(/\\/g, '/').trim()).filter(Boolean)));
}

function explicitSpecsFromArgs(args = []) {
  return normalizeSpecs(args.filter(value => {
    const item = String(value || '');
    return !item.startsWith('-') && /^qa\/browser\/.+\.spec\.js$/.test(item.replace(/\\/g, '/'));
  }));
}

function buildHealthFirstPlan(options = {}) {
  const forwardedArgs = options.forwardedArgs || [];
  if (hasLastFailedFlag(forwardedArgs)) {
    return { mode: 'retry', sentinel: [], remaining: [], forwardedArgs: [...forwardedArgs] };
  }

  const explicit = explicitSpecsFromArgs(forwardedArgs);
  const selected = explicit.length
    ? explicit
    : parseSelectedBrowserSpecs(options.selectedSpecs ?? process.env.FOXBEAR_BROWSER_SPECS);
  const targetSpecs = normalizeSpecs(selected.length ? selected : (options.allSpecs || ALL_BROWSER_SPECS));
  const sentinel = [RUNTIME_HEALTH_SPEC];
  const remaining = targetSpecs.filter(spec => spec !== RUNTIME_HEALTH_SPEC);
  return {
    mode: remaining.length ? 'health-first' : 'health-only',
    sentinel,
    remaining,
    forwardedArgs: forwardedArgs.filter(value => !explicit.includes(String(value || '').replace(/\\/g, '/')))
  };
}

function runPhase(specs, forwardedArgs = [], options = {}) {
  const args = [RUNNER_PATH, ...specs, ...forwardedArgs];
  const result = (options.spawnSync || spawnSync)(process.execPath, args, {
    cwd: options.cwd || process.cwd(),
    stdio: options.stdio || 'inherit',
    env: {
      ...process.env,
      ...options.env,
      FOXBEAR_BROWSER_PREFLIGHT_DONE: '1'
    }
  });
  if (result.error) {
    console.error(`FAIL browser health-first phase: ${result.error.message || result.error}`);
    return 1;
  }
  return Number.isInteger(result.status) ? result.status : 1;
}

function executeHealthFirstPlan(plan, options = {}) {
  if (plan.mode === 'retry') return runPhase([], plan.forwardedArgs, options);

  console.log('FoxBear browser sentinel: Runtime Health runs before heavier browser scenarios.');
  const sentinelStatus = runPhase(plan.sentinel, plan.forwardedArgs, options);
  if (sentinelStatus !== 0) {
    console.error('FAIL browser sentinel: heavier browser scenarios were skipped because Runtime Health failed.');
    return sentinelStatus;
  }
  if (!plan.remaining.length) {
    console.log('PASS browser sentinel: Runtime Health was the only selected browser target.');
    return 0;
  }

  console.log(`PASS browser sentinel: continuing with ${plan.remaining.length} remaining browser spec(s).`);
  return runPhase(plan.remaining, plan.forwardedArgs, options);
}

function main() {
  try {
    runBrowserPreflight();
  } catch (error) {
    console.error(`FAIL browser QA preflight: ${error && error.message ? error.message : error}`);
    process.exitCode = 1;
    return;
  }
  const plan = buildHealthFirstPlan({ forwardedArgs: process.argv.slice(2) });
  process.exitCode = executeHealthFirstPlan(plan);
}

if (require.main === module) main();

module.exports = {
  RUNTIME_HEALTH_SPEC,
  RUNNER_PATH,
  buildHealthFirstPlan,
  executeHealthFirstPlan,
  explicitSpecsFromArgs,
  normalizeSpecs,
  runPhase
};
