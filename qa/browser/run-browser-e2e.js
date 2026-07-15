#!/usr/bin/env node
'use strict';

const http = require('http');
const { spawn } = require('child_process');
const playwrightCli = require.resolve('@playwright/test/cli');
const { APP_URL, DEFAULT_PORT, DEFAULT_BIND_HOST, startStaticServer } = require('./helpers/foxbear-e2e-helpers');

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

async function main() {
  const externalUrl = Boolean(process.env.FOXBEAR_E2E_URL);
  const server = externalUrl ? null : startStaticServer({ cwd: process.cwd(), port: DEFAULT_PORT, host: DEFAULT_BIND_HOST });
  let exitCode = 0;
  try {
    await waitForServer(APP_URL);
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
    if (exitCode !== 0 && server) {
      const serverOutput = server.getOutput().trim();
      if (serverOutput) console.error(`\nFoxBear static server diagnostics (tail):\n${serverOutput}`);
    }
  } catch (error) {
    console.error(`FAIL browser E2E bootstrap: ${error && error.message ? error.message : error}`);
    if (server) console.error(server.getOutput());
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

module.exports = { main, mergeNoProxy, runChildProcess, waitForServer };
