#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.resolve(process.cwd(), 'qa/browser-results');
const SUMMARY_PATH = path.join(RESULTS_DIR, 'retry-recovery-summary.json');

function readSummary(file = SUMMARY_PATH) {
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Browser retry recovery summary is missing: ${path.relative(process.cwd(), resolved)}`);
  }
  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (error) {
    throw new Error(`Browser retry recovery summary is invalid JSON: ${error?.message || error}`);
  }
}

function verifyRetryRecoverySummary(summary) {
  const counts = summary?.counts || {};
  const primaryFailures = Number(counts.primaryFailures || 0);
  const recovered = Number(counts.recovered || 0);
  const repeated = Number(counts.repeated || 0);
  const skipped = Number(counts.skippedRetryResults || 0);
  const missing = Number(counts.missingRetryResults || 0);
  const errors = [];

  if (primaryFailures <= 0) errors.push('The primary browser report did not contain a failed test to verify.');
  if (recovered !== primaryFailures) errors.push(`Only ${recovered}/${primaryFailures} primary failures produced a real passing retry result.`);
  if (repeated > 0) errors.push(`${repeated} browser case(s) failed again.`);
  if (skipped > 0) errors.push(`${skipped} browser case(s) were skipped instead of passing.`);
  if (missing > 0) errors.push(`${missing} browser case(s) were absent from the retry report.`);
  if (summary?.healthy !== true) errors.push('The retry recovery summary is not marked healthy.');

  return {
    ok: errors.length === 0,
    errors,
    counts: { primaryFailures, recovered, repeated, skippedRetryResults: skipped, missingRetryResults: missing }
  };
}

function main() {
  try {
    const summary = readSummary(process.argv[2] || SUMMARY_PATH);
    const result = verifyRetryRecoverySummary(summary);
    if (!result.ok) {
      result.errors.forEach(message => console.error(`FAIL browser retry integrity: ${message}`));
      process.exitCode = 1;
      return;
    }
    console.log(`PASS browser retry integrity: ${result.counts.recovered}/${result.counts.primaryFailures} failed case(s) passed on retry`);
  } catch (error) {
    console.error(`FAIL browser retry integrity: ${error?.message || error}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  SUMMARY_PATH,
  readSummary,
  verifyRetryRecoverySummary
};
