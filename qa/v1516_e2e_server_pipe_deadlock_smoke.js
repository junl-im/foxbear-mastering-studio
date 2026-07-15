'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { runChildProcess, waitForServer } = require('./browser/run-browser-e2e');
const { startStaticServer } = require('./browser/helpers/foxbear-e2e-helpers');

function reservePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const address = socket.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      socket.close(error => error ? reject(error) : resolve(port));
    });
  });
}

(async () => {
  const runnerSource = fs.readFileSync(path.join(__dirname, 'browser/run-browser-e2e.js'), 'utf8');
  assert(!runnerSource.includes("require('child_process').spawnSync"), 'browser runner must not use spawnSync');
  assert(!/\bspawnSync\s*\(/.test(runnerSource), 'browser runner must not block the event loop with spawnSync');
  assert(runnerSource.includes('await runChildProcess('), 'browser runner must await an asynchronous child process');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-e2e-server-pipe-'));
  const port = await reservePort();
  const url = `http://127.0.0.1:${port}/`;
  fs.writeFileSync(path.join(tempDir, 'index.html'), '<!doctype html><title>FoxBear pipe test</title>ok');
  const server = startStaticServer({ cwd: tempDir, port, host: '127.0.0.1' });

  try {
    await waitForServer(url, 5000);
    const requestScript = `
      const http = require('http');
      const target = process.argv[1];
      const total = 1800;
      let index = 0;
      const next = () => {
        if (index >= total) return process.exit(0);
        const request = http.get(target + '?request=' + index, response => {
          response.resume();
          response.once('end', () => { index += 1; next(); });
        });
        request.once('error', error => { console.error(error); process.exit(1); });
      };
      next();
    `;
    const result = await runChildProcess(process.execPath, ['-e', requestScript, url], { stdio: 'ignore' });
    assert.strictEqual(result.status, 0, `request stress child failed: ${result.error || result.signal || result.status}`);
    const output = server.getOutput();
    assert(output.includes('GET /?request=1799'), 'static server stopped draining request logs before the stress run completed');

    await new Promise((resolve, reject) => {
      http.get(url, response => {
        response.resume();
        response.once('end', resolve);
      }).once('error', reject);
    });
  } finally {
    server.stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log('PASS v1.5.16 E2E static-server pipe deadlock regression');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
