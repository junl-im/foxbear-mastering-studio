#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const playwrightCli = require.resolve('@playwright/test/cli');
const { APP_URL, DEFAULT_PORT, DEFAULT_BIND_HOST, startStaticServer } = require('./helpers/foxbear-e2e-helpers');

const RESULTS_DIR = path.resolve(process.cwd(), 'qa/browser-results');
const PLAYWRIGHT_JSON_PATH = path.join(RESULTS_DIR, 'results.json');
const STATIC_SERVER_LOG_PATH = path.join(RESULTS_DIR, 'static-server.log');

function waitForServer(url, timeoutMs = 12000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, res => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return resolve();
        retry();
      });
      req.on('error', retry);
      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) return reject(new Error(`Timed out waiting for ${url}`));
      setTimeout(attempt, 250);
    };
    attempt();
  });
}

function mergeNoProxy(value) {
  const localBypass = ['127.0.0.1', 'localhost', '::1'];
  return Array.from(new Set(String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .concat(localBypass)))
    .join(',');
}

function runChildProcess(command, args, options = {}) {
  return new Promise(resolve => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
      stdio: options.stdio || 'inherit'
    });
    let settled = false;
    const finish = result => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    child.once('error', error => finish({ status: 1, signal: null, error }));
    child.once('exit', (code, signal) => finish({
      status: Number.isInteger(code) ? code : 1,
      signal: signal || null,
      error: null
    }));
  });
}

function ensureResultsDir() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

function firstUsefulErrorText(result) {
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const first = errors.find(error => error && (error.message || error.stack));
  const raw = first?.message || first?.stack || result?.error?.message || result?.error?.stack || '';
  return String(raw).replace(/\x1B\[[0-9;]*m/g, '').split(/\r?\n/).filter(Boolean).slice(0, 4).join(' | ');
}

function collectPlaywrightFailures(report) {
  const failures = [];
  const walkSuite = (suite, parents = []) => {
    const currentParents = suite?.title ? [...parents, suite.title] : parents;
    for (const spec of suite?.specs || []) {
      for (const test of spec?.tests || []) {
        const results = Array.isArray(test.results) ? test.results : [];
        const failedResults = results.filter(result => !['passed', 'skipped'].includes(result?.status));
        const unexpected = test.status === 'unexpected' || failedResults.length > 0;
        if (!unexpected) continue;
        const last = failedResults[failedResults.length - 1] || results[results.length - 1] || {};
        const title = [...currentParents, spec.title, test.projectName].filter(Boolean).join(' › ');
        failures.push({ title, message: firstUsefulErrorText(last) || `status=${test.status || last.status || 'failed'}` });
      }
    }
    for (const child of suite?.suites || []) walkSuite(child, currentParents);
  };
  for (const suite of report?.suites || []) walkSuite(suite, []);
  return failures;
}

function printPlaywrightFailureSummary(jsonPath = PLAYWRIGHT_JSON_PATH) {
  if (!fs.existsSync(jsonPath)) {
    console.error(`\nFoxBear browser failure summary unavailable: ${path.relative(process.cwd(), jsonPath)} was not produced.`);
    return [];
  }
  try {
    const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const failures = collectPlaywrightFailures(report);
    if (!failures.length) {
      console.error('\nFoxBear browser failure summary: reporter recorded a non-zero run without a parsed failed test.');
      return [];
    }
    console.error(`\nFoxBear browser failure summary (${failures.length}):`);
    failures.slice(0, 10).forEach((failure, index) => {
      console.error(`  ${index + 1}. ${failure.title}`);
      console.error(`     ${failure.message}`);
    });
    if (failures.length > 10) console.error(`  ... ${failures.length - 10} more failure(s) are stored in qa/browser-results/results.json`);
    return failures;
  } catch (error) {
    console.error(`\nFoxBear browser failure summary could not be parsed: ${error?.message || error}`);
    return [];
  }
}

function summarizeStaticServerOutput(output) {
  const lines = String(output || '').split(/\r?\n/).filter(Boolean);
  const requests = [];
  const suspicious = [];
  const statusCounts = new Map();
  for (const line of lines) {
    const match = line.match(/"(GET|POST|HEAD|PUT|PATCH|DELETE|OPTIONS)\s+([^\s]+)\s+HTTP\/[^"]+"\s+(\d{3})\b/);
    if (match) {
      const status = Number(match[3]);
      requests.push({ line, method: match[1], url: match[2], status });
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    } else if (/error|exception|traceback|failed|broken pipe|address already in use/i.test(line)) {
      suspicious.push(line);
    }
  }
  const failedRequests = requests.filter(request => request.status >= 400);
  const uniquePaths = new Set(requests.map(request => request.url.split('?')[0]));
  const statusText = [...statusCounts.entries()].sort((a, b) => a[0] - b[0]).map(([status, count]) => `${status}:${count}`).join(', ') || 'none';
  return {
    requestCount: requests.length,
    uniquePathCount: uniquePaths.size,
    statusText,
    failedRequests,
    suspicious,
    lastLines: lines.slice(-12)
  };
}

function persistAndPrintStaticServerDiagnostics(output) {
  ensureResultsDir();
  fs.writeFileSync(STATIC_SERVER_LOG_PATH, String(output || ''), 'utf8');
  const summary = summarizeStaticServerOutput(output);
  console.error(`\nFoxBear static server summary: requests=${summary.requestCount}, uniquePaths=${summary.uniquePathCount}, statuses=${summary.statusText}`);
  if (summary.failedRequests.length) {
    console.error('HTTP failures:');
    summary.failedRequests.slice(0, 12).forEach(request => console.error(`  ${request.method} ${request.url} -> ${request.status}`));
  }
  if (summary.suspicious.length) {
    console.error('Server warnings/errors:');
    summary.suspicious.slice(-12).forEach(line => console.error(`  ${line}`));
  }
  if (!summary.failedRequests.length && !summary.suspicious.length && summary.lastLines.length) {
    console.error('Last server requests:');
    summary.lastLines.forEach(line => console.error(`  ${line}`));
  }
  console.error(`Full server log: ${path.relative(process.cwd(), STATIC_SERVER_LOG_PATH)}`);
  return summary;
}

async function main() {
  const externalUrl = Boolean(process.env.FOXBEAR_E2E_URL);
  const server = externalUrl ? null : startStaticServer({ cwd: process.cwd(), port: DEFAULT_PORT, host: DEFAULT_BIND_HOST });
  let exitCode = 0;
  try {
    await waitForServer(APP_URL);
    ensureResultsDir();
    const forwardedArgs = process.argv.slice(2);
    const args = [playwrightCli, 'test', 'qa/browser', ...forwardedArgs];
    const childEnv = {
      ...process.env,
      FOXBEAR_E2E_URL: APP_URL,
      NO_PROXY: mergeNoProxy(process.env.NO_PROXY),
      no_proxy: mergeNoProxy(process.env.no_proxy)
    };
    console.log(`FoxBear browser QA target: ${APP_URL}`);

    // Keep the parent event loop alive while Playwright runs. The local Python
    // server writes one access-log line per asset request; using spawnSync here
    // prevents its stdout/stderr pipes from being drained and eventually blocks
    // the server, which makes every later page.goto() time out in CI.
    const result = await runChildProcess(process.execPath, args, { env: childEnv });
    if (result.error) console.error(`FAIL browser E2E process: ${result.error.message || result.error}`);
    if (result.signal) console.error(`FAIL browser E2E process terminated by signal ${result.signal}`);
    exitCode = result.status;
    if (exitCode !== 0) {
      printPlaywrightFailureSummary();
      if (server) persistAndPrintStaticServerDiagnostics(server.getOutput());
    }
  } catch (error) {
    console.error(`FAIL browser E2E bootstrap: ${error && error.message ? error.message : error}`);
    if (server) persistAndPrintStaticServerDiagnostics(server.getOutput());
    exitCode = 1;
  } finally {
    if (server) server.stop();
  }
  process.exitCode = exitCode;
}

if (require.main === module) {
  main().catch(error => {
    console.error(`FAIL browser E2E runner: ${error && error.stack ? error.stack : error}`);
    process.exitCode = 1;
  });
}

module.exports = {
  collectPlaywrightFailures,
  main,
  mergeNoProxy,
  persistAndPrintStaticServerDiagnostics,
  printPlaywrightFailureSummary,
  runChildProcess,
  summarizeStaticServerOutput,
  waitForServer
};
