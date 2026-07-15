'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_PORT = Number(process.env.FOXBEAR_E2E_PORT || 4173);
const DEFAULT_HOST = process.env.FOXBEAR_E2E_HOST || '127.0.0.1';
const DEFAULT_BIND_HOST = process.env.FOXBEAR_E2E_BIND_HOST || '127.0.0.1';
const APP_URL = process.env.FOXBEAR_E2E_URL || `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;

function makeTinyWavBuffer({ seconds = 0.35, sampleRate = 16000, frequency = 440, gain = 0.12 } = {}) {
  const channels = 1;
  const bitsPerSample = 16;
  const blockAlign = channels * bitsPerSample / 8;
  const byteRate = sampleRate * blockAlign;
  const sampleCount = Math.max(1, Math.floor(seconds * sampleRate));
  const dataSize = sampleCount * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < sampleCount; i += 1) {
    const envelope = Math.min(1, i / Math.max(1, sampleRate * 0.02), (sampleCount - i) / Math.max(1, sampleRate * 0.02));
    const sample = Math.sin(2 * Math.PI * frequency * (i / sampleRate)) * gain * Math.max(0, envelope);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), 44 + i * 2);
  }
  return buffer;
}

function createSyntheticWavFiles(count = 35, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-e2e-audio-'));
  const files = [];
  for (let i = 0; i < count; i += 1) {
    const frequency = Number(options.frequency || 220) + (i % 12) * 17;
    const buffer = makeTinyWavBuffer({ ...options, frequency });
    const filePath = path.join(dir, `foxbear-e2e-${String(i + 1).padStart(2, '0')}.wav`);
    fs.writeFileSync(filePath, buffer);
    files.push(filePath);
  }
  return { dir, files };
}

function removeDirSafe(dir) {
  if (!dir) return;
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

async function waitForRuntimeHealth(page, options = {}) {
  const timeout = Number(options.timeout || 20000);
  await page.waitForFunction(() => Boolean(window.FoxBearRuntimeHealth && window.FoxBearRuntimeHealth.getReport), null, { timeout });
  return await page.evaluate(() => window.FoxBearRuntimeHealth.getReport());
}

async function expectRuntimeHealthy(expect, page, options = {}) {
  const report = await waitForRuntimeHealth(page, options);
  expect(report.appReady, 'appReady').toBeTruthy();
  expect(report.bootFailed, 'bootFailed').toBeFalsy();
  expect(report.missingGlobals || [], 'missingGlobals').toEqual([]);
  expect(report.missingDomIds || [], 'missingDomIds').toEqual([]);
  expect(report.assetVersionMismatches || [], 'assetVersionMismatches').toEqual([]);
  expect(report.resourceFailures || [], 'resourceFailures').toEqual([]);
  expect(report.runtimeErrors || [], 'runtimeErrors').toEqual([]);
  return report;
}

async function installWakeLockMock(page) {
  await page.addInitScript(() => {
    const listeners = new Set();
    const sentinel = {
      released: false,
      type: 'screen',
      addEventListener(type, listener) {
        if (type === 'release' && typeof listener === 'function') listeners.add(listener);
      },
      removeEventListener(type, listener) {
        if (type === 'release') listeners.delete(listener);
      },
      async release() {
        this.released = true;
        listeners.forEach(listener => {
          try { listener.call(this, { type: 'release' }); } catch (_) {}
        });
      }
    };
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        async request(type) {
          window.__foxbearWakeLockRequests = (window.__foxbearWakeLockRequests || 0) + 1;
          window.__foxbearWakeLockLastType = type;
          return sentinel;
        }
      }
    });
  });
}

async function getServiceWorkerSnapshot(page) {
  return await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { supported: false };
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    return {
      supported: true,
      ready: Boolean(registration),
      controller: Boolean(navigator.serviceWorker.controller),
      registrations: registrations.length,
      scope: registration?.scope || null,
      activeScript: registration?.active?.scriptURL || null,
      waitingScript: registration?.waiting?.scriptURL || null,
      installingScript: registration?.installing?.scriptURL || null
    };
  });
}

function startStaticServer({ cwd = process.cwd(), port = DEFAULT_PORT, host = DEFAULT_BIND_HOST } = {}) {
  const child = spawn('python3', ['-m', 'http.server', String(port), '--bind', host], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk.toString(); });
  child.stderr.on('data', chunk => { output += chunk.toString(); });
  const stop = () => {
    if (!child.killed) child.kill('SIGTERM');
  };
  return { child, stop, getOutput: () => output };
}

module.exports = {
  APP_URL,
  DEFAULT_BIND_HOST,
  DEFAULT_HOST,
  DEFAULT_PORT,
  createSyntheticWavFiles,
  expectRuntimeHealthy,
  getServiceWorkerSnapshot,
  installWakeLockMock,
  makeTinyWavBuffer,
  removeDirSafe,
  startStaticServer,
  waitForRuntimeHealth
};
