#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { APP_URL, DEFAULT_PORT, DEFAULT_BIND_HOST, startStaticServer } = require('./helpers/foxbear-e2e-helpers');
const { runBrowserPreflight } = require('./run-browser-preflight');

const RESULTS_DIR = path.resolve(process.cwd(), 'qa/browser-results');
const PLAYWRIGHT_JSON_PATH = path.join(RESULTS_DIR, 'results.json');
const STATIC_SERVER_LOG_PATH = path.join(RESULTS_DIR, 'static-server.log');
const PLAYWRIGHT_OUTPUT_DIR = path.join(RESULTS_DIR, 'artifacts');
const LAST_RUN_PATH = path.join(PLAYWRIGHT_OUTPUT_DIR, '.last-run.json');

function resolvePlaywrightCli(resolveModule = require.resolve) {
  try {
    return resolveModule('@playwright/test/cli');
  } catch (error) {
    const missingPlaywright = error?.code === 'MODULE_NOT_FOUND'
      && String(error?.message || '').includes('@playwright/test');
    if (!missingPlaywright) throw error;

    const actionable = new Error(
      'Playwright browser QA dependency is unavailable. Run "npm ci" first, '
      + 'then install Chromium with "npm run qa:browser:install" when the browser binary is missing.'
    );
    actionable.code = 'FOXBEAR_PLAYWRIGHT_DEPENDENCY_MISSING';
    actionable.cause = error;
    throw actionable;
  }
}

function waitForServer(url, timeoutMs = 12000, options = {}) {
  const started = Date.now();
  const expectedBody = String(options.expectedBody || '');
  const child = options.child || null;
  return new Promise((resolve, reject) => {
    let lastStatus = 0;
    let lastBody = '';
    const attempt = () => {
      if (child && child.exitCode != null) {
        return reject(new Error(`FoxBear static server exited before readiness (code ${child.exitCode}).`));
      }
      const req = http.get(url, res => {
        lastStatus = Number(res.statusCode || 0);
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          lastBody = body;
          const statusOk = lastStatus >= 200 && lastStatus < 300;
          const bodyOk = !expectedBody || body.trim() === expectedBody;
          if (statusOk && bodyOk) return resolve();
          retry();
        });
      });
      req.on('error', retry);
      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        const detail = `status=${lastStatus || 'none'}, body=${JSON.stringify(lastBody.slice(0, 120))}`;
        return reject(new Error(`Timed out waiting for the FoxBear-owned server probe ${url} (${detail})`));
      }
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

function hasExplicitTestTarget(args = []) {
  return args.some(arg => {
    const value = String(arg || '');
    return !value.startsWith('-') && (value.endsWith('.spec.js') || value.startsWith('qa/browser/'));
  });
}


function hasLastFailedFlag(args = []) {
  return args.some(arg => String(arg || '') === '--last-failed');
}

function archivePreviousBrowserResults(options = {}) {
  const resultsDir = path.resolve(options.resultsDir || RESULTS_DIR);
  const lastRunPath = path.resolve(options.lastRunPath || LAST_RUN_PATH);
  fs.mkdirSync(resultsDir, { recursive: true });
  const copies = [
    [path.join(resultsDir, 'results.json'), path.join(resultsDir, 'results-primary.json')],
    [path.join(resultsDir, 'static-server.log'), path.join(resultsDir, 'static-server-primary.log')],
    [lastRunPath, path.join(resultsDir, 'last-run-primary.json')]
  ];
  const archived = [];
  for (const [source, target] of copies) {
    if (!fs.existsSync(source)) continue;
    fs.copyFileSync(source, target);
    archived.push(path.basename(target));
  }
  return archived;
}

function parseSelectedBrowserSpecs(value = process.env.FOXBEAR_BROWSER_SPECS) {
  return Array.from(new Set(String(value || '')
    .split(/[\s,]+/)
    .map(item => item.trim().replace(/\\/g, '/'))
    .filter(item => /^qa\/browser\/[^\s]+\.spec\.js$/.test(item))))
    .sort();
}

function buildPlaywrightArgs(playwrightCli, forwardedArgs = [], options = {}) {
  const retryFailed = hasLastFailedFlag(forwardedArgs);
  const explicitTarget = hasExplicitTestTarget(forwardedArgs);
  const selectedSpecs = retryFailed || explicitTarget
    ? []
    : parseSelectedBrowserSpecs(options.selectedSpecs ?? process.env.FOXBEAR_BROWSER_SPECS);
  const defaultTarget = explicitTarget || retryFailed
    ? []
    : selectedSpecs.length
      ? selectedSpecs
      : ['qa/browser'];
  return [playwrightCli, 'test', ...defaultTarget, ...forwardedArgs];
}

function firstUsefulErrorText(result) {
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const first = errors.find(error => error && (error.message || error.stack));
  const raw = first?.message || first?.stack || result?.error?.message || result?.error?.stack || '';
  return String(raw).replace(/\x1B\[[0-9;]*m/g, '').split(/\r?\n/).filter(Boolean).slice(0, 4).join(' | ');
}

function normalizeFailureSignature(message) {
  return String(message || '')
    .replace(/\x1B\[[0-9;]*m/g, '')
    .replace(/eval at evaluate \([^)]*\)/g, 'eval at evaluate')
    .replace(/<anonymous>:\d+:\d+/g, '<anonymous>')
    .replace(/\b\d+(?:\.\d+)?ms\b/g, '<duration>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
}

function classifyPlaywrightFailure(failure) {
  const message = String(failure?.message || '');
  const rules = [
    {
      code: 'TRUSTED_TYPES_FIXTURE',
      pattern: /TrustedHTML|Trusted Types|require-trusted-types-for/i,
      label: 'Trusted Types fixture violation',
      action: 'Replace HTML-string sinks with createElement/textContent/replaceChildren, then run node qa/browser/spec-preflight.js.'
    },
    {
      code: 'BROWSER_RUNTIME_MISSING',
      pattern: /executable (?:doesn['’]t|does not) exist|browserType\.launch|chromium[^|]*(?:missing|not found)/i,
      label: 'Chromium runtime unavailable',
      action: 'Run npm ci and npm run qa:browser:install, or set FOXBEAR_CHROMIUM_PATH to a compatible Chromium executable.'
    },
    {
      code: 'NAVIGATION_OR_TIMEOUT',
      pattern: /Timeout|timed out|page\.goto|waiting for .* exceeded/i,
      label: 'Navigation or readiness timeout',
      action: 'Inspect the first failing request, Runtime Health output, and qa/browser-results/static-server.log before increasing timeouts.'
    },
    {
      code: 'RUNTIME_HEALTH',
      pattern: /FoxBear E2E Runtime Health|runtime health|runtimeErrors|critical runtime/i,
      label: 'Application Runtime Health failure',
      action: 'Fix the first critical runtime error; optional Firebase/network warnings should remain non-fatal.'
    },
    {
      code: 'VISUAL_OVERFLOW',
      pattern: /toBeLessThanOrEqual|boundingBox|viewport|overflow|outside/i,
      label: 'Visual layout or viewport overflow',
      action: 'Open the retained screenshot/trace and compare the failing element bounds with the requested viewport.'
    }
  ];
  const match = rules.find(rule => rule.pattern.test(message));
  const fallback = {
    code: 'UNCLASSIFIED',
    label: 'Unclassified browser assertion',
    action: 'Inspect the first stack, screenshot, and trace for the earliest product-side failure.'
  };
  const classification = match || fallback;
  return {
    ...classification,
    signature: classification.code === 'UNCLASSIFIED'
      ? normalizeFailureSignature(message)
      : classification.code
  };
}

function groupPlaywrightFailures(failures = []) {
  const groups = new Map();
  for (const failure of failures) {
    const classification = classifyPlaywrightFailure(failure);
    const key = `${classification.code}:${classification.signature}`;
    const group = groups.get(key) || {
      code: classification.code,
      label: classification.label,
      action: classification.action,
      signature: classification.signature,
      count: 0,
      examples: []
    };
    group.count += 1;
    if (group.examples.length < 3) group.examples.push(failure.title);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
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
    const groups = groupPlaywrightFailures(failures);
    console.error(`\nFoxBear likely root causes (${groups.length} group${groups.length === 1 ? '' : 's'}):`);
    groups.slice(0, 6).forEach(group => {
      console.error(`  [${group.code}] ${group.count} failure(s) · ${group.label}`);
      console.error(`     Fix: ${group.action}`);
      group.examples.forEach(title => console.error(`     - ${title}`));
    });
    if (groups.length > 6) console.error(`  ... ${groups.length - 6} additional root-cause group(s) are stored in qa/browser-results/results.json`);

    console.error(`\nFoxBear browser failure details (${failures.length}):`);
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
  if (process.env.FOXBEAR_BROWSER_PREFLIGHT_DONE !== '1') {
    try {
      runBrowserPreflight();
    } catch (error) {
      console.error(`FAIL browser QA preflight: ${error && error.message ? error.message : error}`);
      process.exitCode = 1;
      return;
    }
  }

  const forwardedArgs = process.argv.slice(2);
  const retryFailed = hasLastFailedFlag(forwardedArgs);
  if (retryFailed && !fs.existsSync(LAST_RUN_PATH)) {
    console.error(`FAIL browser E2E retry: previous Playwright state is missing at ${path.relative(process.cwd(), LAST_RUN_PATH)}. Run npm run qa:browser first.`);
    process.exitCode = 1;
    return;
  }
  if (retryFailed) archivePreviousBrowserResults();

  let playwrightCli = '';
  try {
    playwrightCli = resolvePlaywrightCli();
  } catch (error) {
    console.error(`FAIL browser E2E bootstrap: ${error && error.message ? error.message : error}`);
    process.exitCode = 1;
    return;
  }

  const externalUrl = Boolean(process.env.FOXBEAR_E2E_URL);
  const server = externalUrl ? null : startStaticServer({ cwd: process.cwd(), port: DEFAULT_PORT, host: DEFAULT_BIND_HOST });
  let exitCode = 0;
  try {
    const readinessUrl = server ? `${APP_URL}/${server.probePath}` : APP_URL;
    await waitForServer(readinessUrl, 12000, {
      expectedBody: server?.probeToken || '',
      child: server?.child || null
    });
    ensureResultsDir();
    const args = buildPlaywrightArgs(playwrightCli, forwardedArgs);
    const childEnv = {
      ...process.env,
      FOXBEAR_E2E_URL: APP_URL,
      NO_PROXY: mergeNoProxy(process.env.NO_PROXY),
      no_proxy: mergeNoProxy(process.env.no_proxy)
    };
    const selectedSpecs = retryFailed ? [] : parseSelectedBrowserSpecs();
    const targetLabel = retryFailed
      ? 'last failed cases only'
      : selectedSpecs.length
        ? `${selectedSpecs.length} impact-selected spec(s)`
        : 'complete browser suite';
    console.log(`FoxBear browser QA target: ${APP_URL} (${targetLabel})`);

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
      if (fs.existsSync(LAST_RUN_PATH)) console.error('Retry only the failed browser cases: npm run qa:browser:retry');
      if (server) persistAndPrintStaticServerDiagnostics(server.getOutput());
    } else if (retryFailed) {
      console.log('PASS browser retry: all previously failed Playwright cases recovered');
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
  archivePreviousBrowserResults,
  buildPlaywrightArgs,
  classifyPlaywrightFailure,
  collectPlaywrightFailures,
  groupPlaywrightFailures,
  hasExplicitTestTarget,
  hasLastFailedFlag,
  main,
  mergeNoProxy,
  normalizeFailureSignature,
  parseSelectedBrowserSpecs,
  persistAndPrintStaticServerDiagnostics,
  printPlaywrightFailureSummary,
  resolvePlaywrightCli,
  runChildProcess,
  summarizeStaticServerOutput,
  waitForServer
};
