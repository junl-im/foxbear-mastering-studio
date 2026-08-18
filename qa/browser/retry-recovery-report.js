#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { printFlakyHistoryAnnotations, writeFlakyHistoryArtifacts } = require('./flaky-history');

const RESULTS_DIR = path.resolve(process.cwd(), 'qa/browser-results');
const PRIMARY_REPORT_PATH = path.join(RESULTS_DIR, 'results-primary.json');
const RETRY_REPORT_PATH = path.join(RESULTS_DIR, 'results.json');
const JSON_OUTPUT_PATH = path.join(RESULTS_DIR, 'retry-recovery-summary.json');
const MARKDOWN_OUTPUT_PATH = path.join(RESULTS_DIR, 'retry-recovery-summary.md');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function usefulError(result) {
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const error = errors.find(item => item && (item.message || item.stack)) || result?.error || null;
  return String(error?.message || error?.stack || '')
    .replace(/\x1B\[[0-9;]*m/g, '')
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, 3)
    .join(' | ');
}

function collectTestOutcomes(report) {
  const outcomes = new Map();
  const walkSuite = (suite, parents = [], inheritedFile = '') => {
    const currentParents = suite?.title ? [...parents, suite.title] : parents;
    const suiteFile = suite?.file || inheritedFile;
    for (const spec of suite?.specs || []) {
      const specFile = spec.file || suiteFile || '';
      for (const test of spec?.tests || []) {
        const results = Array.isArray(test.results) ? test.results : [];
        const finalResult = results[results.length - 1] || {};
        const finalStatus = String(finalResult.status || test.status || 'unknown');
        const expectedStatus = String(test.expectedStatus || 'passed');
        const skipped = finalStatus === 'skipped' || test.status === 'skipped' || expectedStatus === 'skipped';
        const passed = !skipped && (
          finalStatus === 'passed'
          || (test.status === 'expected' && finalStatus === expectedStatus)
        );
        const projectName = String(test.projectName || 'default');
        const titleParts = [...currentParents, spec.title, projectName].filter(Boolean);
        const title = titleParts.join(' › ');
        const key = `${specFile}::${title}`;
        outcomes.set(key, {
          key,
          file: specFile,
          title,
          projectName,
          passed,
          skipped,
          status: passed ? 'passed' : skipped ? 'skipped' : finalStatus,
          expectedStatus,
          attempts: results.length,
          durationMs: results.reduce((sum, item) => sum + Number(item?.duration || 0), 0),
          error: passed ? '' : usefulError(finalResult)
        });
      }
    }
    for (const child of suite?.suites || []) walkSuite(child, currentParents, suiteFile);
  };
  for (const suite of report?.suites || []) walkSuite(suite, [], suite?.file || '');
  return outcomes;
}

function buildRetryRecoverySummary(primaryReport, retryReport) {
  const primary = collectTestOutcomes(primaryReport);
  const retry = collectTestOutcomes(retryReport);
  const primaryFailures = [...primary.values()].filter(item => !item.passed);
  const primaryPassed = [...primary.values()]
    .filter(item => item.passed)
    .map(item => ({
      key: item.key,
      file: item.file,
      title: item.title,
      projectName: item.projectName
    }));
  const recovered = [];
  const repeated = [];
  const skipped = [];
  const missing = [];

  for (const failure of primaryFailures) {
    const retryOutcome = retry.get(failure.key);
    const item = {
      key: failure.key,
      file: failure.file,
      title: failure.title,
      projectName: failure.projectName,
      primaryAttempts: failure.attempts,
      primaryDurationMs: failure.durationMs,
      primaryError: failure.error,
      retryAttempts: retryOutcome?.attempts || 0,
      retryDurationMs: retryOutcome?.durationMs || 0,
      retryError: retryOutcome?.error || ''
    };
    if (!retryOutcome) missing.push(item);
    else if (retryOutcome.passed) recovered.push(item);
    else if (retryOutcome.skipped) skipped.push({ ...item, retryStatus: retryOutcome.status });
    else repeated.push(item);
  }

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      primaryFailures: primaryFailures.length,
      recovered: recovered.length,
      repeated: repeated.length,
      skippedRetryResults: skipped.length,
      missingRetryResults: missing.length
    },
    primaryPassed,
    recovered,
    repeated,
    skipped,
    missing,
    healthy: primaryFailures.length > 0
      && recovered.length === primaryFailures.length
      && repeated.length === 0
      && skipped.length === 0
      && missing.length === 0
  };
}

function escapeMarkdown(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderRetryRecoveryMarkdown(summary) {
  const counts = summary.counts || {};
  const lines = [
    '## Browser retry recovery',
    '',
    `- Primary failures: **${counts.primaryFailures || 0}**`,
    `- Recovered on failed-only retry: **${counts.recovered || 0}**`,
    `- Failed again: **${counts.repeated || 0}**`,
    `- Skipped instead of passing: **${counts.skippedRetryResults || 0}**`,
    `- Missing retry results: **${counts.missingRetryResults || 0}**`,
    ''
  ];
  const addTable = (heading, items, errorKey) => {
    if (!items.length) return;
    lines.push(`### ${heading}`, '', '| Test | Attempts | Detail |', '|---|---:|---|');
    items.slice(0, 20).forEach(item => {
      const attempts = `${item.primaryAttempts || 0} → ${item.retryAttempts || 0}`;
      const detail = escapeMarkdown(item[errorKey] || item.primaryError || 'No error detail');
      lines.push(`| ${escapeMarkdown(item.title)} | ${attempts} | ${detail} |`);
    });
    if (items.length > 20) lines.push('', `_${items.length - 20} additional test(s) are stored in retry-recovery-summary.json._`);
    lines.push('');
  };
  addTable('Recovered flaky cases', summary.recovered || [], 'primaryError');
  addTable('Repeated failures', summary.repeated || [], 'retryError');
  addTable('Skipped retry cases', summary.skipped || [], 'primaryError');
  addTable('Missing retry results', summary.missing || [], 'primaryError');
  return `${lines.join('\n').trim()}\n`;
}

function appendGitHubStepSummary(markdown, file = process.env.GITHUB_STEP_SUMMARY) {
  if (!file) return false;
  fs.appendFileSync(file, markdown, 'utf8');
  return true;
}

function writeRetryRecoveryArtifacts(options = {}) {
  const primaryPath = path.resolve(options.primaryPath || PRIMARY_REPORT_PATH);
  const retryPath = path.resolve(options.retryPath || RETRY_REPORT_PATH);
  const jsonOutputPath = path.resolve(options.jsonOutputPath || JSON_OUTPUT_PATH);
  const markdownOutputPath = path.resolve(options.markdownOutputPath || MARKDOWN_OUTPUT_PATH);
  fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true });

  const primaryReport = readJson(primaryPath);
  const retryReport = readJson(retryPath);
  const summary = buildRetryRecoverySummary(primaryReport, retryReport);
  const markdown = renderRetryRecoveryMarkdown(summary);
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownOutputPath, markdown, 'utf8');
  appendGitHubStepSummary(markdown, options.githubStepSummary);
  const flakyHistory = writeFlakyHistoryArtifacts(summary, {
    historyPath: options.historyPath,
    jsonOutputPath: options.flakyJsonOutputPath,
    markdownOutputPath: options.flakyMarkdownOutputPath,
    issueOutputPath: options.flakyIssueOutputPath,
    githubStepSummary: options.githubStepSummary,
    warningThreshold: options.warningThreshold,
    retentionDays: options.retentionDays,
    now: options.now
  });
  return { summary, markdown, jsonOutputPath, markdownOutputPath, flakyHistory };
}

function escapeWorkflowCommandProperty(value) {
  return String(value || '')
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C');
}

function escapeWorkflowCommandData(value) {
  return String(value || '')
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}

function printRepeatedCaseAnnotations(summary, limit = 10) {
  const repeated = Array.isArray(summary?.repeated) ? summary.repeated : [];
  repeated.slice(0, Math.max(0, Number(limit || 0))).forEach(item => {
    const fileName = path.basename(String(item.file || 'browser-case'));
    const title = escapeWorkflowCommandProperty(`Browser repeated: ${item.projectName || 'default'} · ${fileName}`);
    const detail = escapeWorkflowCommandData(`${item.title || fileName} · ${item.retryError || item.primaryError || 'failed again'}`);
    console.log(`::error title=${title}::${detail}`);
  });
}

function printConsoleSummary(summary) {
  const counts = summary.counts;
  console.log(`Browser retry recovery: primary=${counts.primaryFailures}, recovered=${counts.recovered}, repeated=${counts.repeated}, skipped=${counts.skippedRetryResults || 0}, missing=${counts.missingRetryResults}`);
  if (counts.recovered > 0) {
    console.log(`::warning title=Browser flaky recovery::${counts.recovered} browser case(s) passed only after the failed-only retry. Review qa/browser-results/retry-recovery-summary.md.`);
  }
  if (counts.repeated > 0 || counts.skippedRetryResults > 0 || counts.missingRetryResults > 0) {
    printRepeatedCaseAnnotations(summary);
    console.log(`::error title=Browser retry incomplete::${counts.repeated} case(s) failed again, ${counts.skippedRetryResults || 0} were skipped, and ${counts.missingRetryResults} lacked retry results.`);
  }
}

function main() {
  try {
    const { summary, flakyHistory } = writeRetryRecoveryArtifacts();
    printConsoleSummary(summary);
    printFlakyHistoryAnnotations(flakyHistory.summary);
  } catch (error) {
    const message = `Browser retry recovery report unavailable: ${error?.message || error}`;
    console.log(`::warning title=Browser retry report unavailable::${message}`);
    console.warn(message);
    // Reporting must never replace the real Playwright outcome.
    process.exitCode = 0;
  }
}

if (require.main === module) main();

module.exports = {
  JSON_OUTPUT_PATH,
  MARKDOWN_OUTPUT_PATH,
  PRIMARY_REPORT_PATH,
  RETRY_REPORT_PATH,
  appendGitHubStepSummary,
  buildRetryRecoverySummary,
  collectTestOutcomes,
  escapeWorkflowCommandData,
  escapeWorkflowCommandProperty,
  printConsoleSummary,
  printRepeatedCaseAnnotations,
  renderRetryRecoveryMarkdown,
  writeRetryRecoveryArtifacts
};
