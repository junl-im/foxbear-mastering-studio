#!/usr/bin/env node
'use strict';

const http = require('http');
const { spawnSync } = require('child_process');
const { APP_URL, DEFAULT_PORT, DEFAULT_HOST, startStaticServer } = require('./helpers/foxbear-e2e-helpers');

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
  const server = externalUrl ? null : startStaticServer({ cwd: process.cwd(), port: DEFAULT_PORT, host: DEFAULT_HOST });
  try {
    await waitForServer(APP_URL);
    const args = ['playwright', 'test', 'qa/browser'];
    const result = spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, FOXBEAR_E2E_URL: APP_URL } });
    process.exit(result.status || 0);
  } catch (error) {
    console.error(`FAIL browser E2E bootstrap: ${error && error.message ? error.message : error}`);
    if (server) console.error(server.getOutput());
    process.exit(1);
  } finally {
    if (server) server.stop();
  }
})();
