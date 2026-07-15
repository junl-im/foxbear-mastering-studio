#!/usr/bin/env node
'use strict';

const http = require('http');
const { spawnSync } = require('child_process');
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

(async () => {
  const externalUrl = Boolean(process.env.FOXBEAR_E2E_URL);
  const server = externalUrl ? null : startStaticServer({ cwd: process.cwd(), port: DEFAULT_PORT, host: DEFAULT_BIND_HOST });
  let exitCode = 0;
  try {
    await waitForServer(APP_URL);
    const args = [playwrightCli, 'test', 'qa/browser'];
    const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, FOXBEAR_E2E_URL: APP_URL } });
    exitCode = Number.isInteger(result.status) ? result.status : 1;
  } catch (error) {
    console.error(`FAIL browser E2E bootstrap: ${error && error.message ? error.message : error}`);
    if (server) console.error(server.getOutput());
    exitCode = 1;
  } finally {
    if (server) server.stop();
  }
  process.exitCode = exitCode;
})();
