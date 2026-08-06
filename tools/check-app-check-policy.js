#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const KEYS = ['contractVersion', 'mode', 'disabled', 'configured', 'enforced', 'tokenRequired', 'reason'];

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
}

function pick(value) {
  return Object.fromEntries(KEYS.map(key => [key, value?.[key]]));
}

function readClientPolicy() {
  const sandbox = { window: { FoxBearBuildInfo: {} }, console: { warn() {} } };
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/config/app-runtime-config.js'), 'utf8'), sandbox, { filename: 'app-runtime-config.js' });
  return sandbox.window.FoxBearRuntimeConfig?.APP_CHECK_POLICY || {};
}

const canonical = readJson('app-check-policy.json');
const functionsContract = readJson('functions/app-check-policy-contract.json');
const functionsPolicy = require(path.join(ROOT, 'functions/app-check-policy.js')).INCIDENT_APP_CHECK_POLICY;
const clientPolicy = readClientPolicy();
const sources = { canonical, functionsContract, functionsPolicy, clientPolicy };
const expected = JSON.stringify(pick(canonical));
const mismatches = Object.entries(sources)
  .filter(([, value]) => JSON.stringify(pick(value)) !== expected)
  .map(([name, value]) => `${name}: ${JSON.stringify(pick(value))}`);

if (mismatches.length) {
  console.error('FAIL App Check policy contract drift detected:');
  mismatches.forEach(line => console.error(`  - ${line}`));
  process.exit(1);
}
if (canonical.enforced !== canonical.tokenRequired) {
  console.error('FAIL App Check enforced and tokenRequired must move together.');
  process.exit(1);
}
console.log(`PASS App Check policy contract v${canonical.contractVersion} matches client and Functions (${canonical.mode}).`);
