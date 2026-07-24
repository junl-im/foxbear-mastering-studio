#!/usr/bin/env node
'use strict';

const { assertBrowserSpecSafety } = require('./spec-preflight');
const { assertFixtureContracts } = require('./fixture-contract-preflight');

function runBrowserPreflight() {
  assertBrowserSpecSafety();
  assertFixtureContracts();
  return { safeSpecTree: true, fixtureContractsCurrent: true };
}

if (require.main === module) {
  try {
    runBrowserPreflight();
    console.log('PASS browser QA preflight: safe specs and current production fixture contracts');
  } catch (error) {
    console.error(`FAIL ${error.message || error}`);
    process.exitCode = 1;
  }
}

module.exports = { runBrowserPreflight };
