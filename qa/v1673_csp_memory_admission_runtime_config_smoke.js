'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const firebase = JSON.parse(read('firebase.json'));
const assetVersion = pkg.foxbearRelease.assetVersion;

const recoveryHtml = read('404.html');
assert(!/<style\b/i.test(recoveryHtml), '404 recovery must not use inline style under strict Firebase CSP');
assert(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(recoveryHtml), '404 recovery must not use inline script under strict Firebase CSP');
assert(recoveryHtml.includes(`assets/css/route-recovery.css?v=${assetVersion}`), '404 recovery CSS must use the current asset generation');
assert(recoveryHtml.includes(`src/boot/route-recovery.js?v=${assetVersion}`), '404 recovery JS must use the current asset generation');
assert(fs.existsSync(path.join(root, 'assets/css/route-recovery.css')), 'route recovery CSS is missing');
assert(fs.existsSync(path.join(root, 'src/boot/route-recovery.js')), 'route recovery JS is missing');

const firebaseCsp = firebase.hosting?.headers
  ?.flatMap(rule => rule.headers || [])
  ?.find(header => header.key === 'Content-Security-Policy')?.value || '';
assert(firebaseCsp.includes("script-src 'self'"), 'Firebase CSP must allow same-origin scripts');
assert(firebaseCsp.includes("style-src 'self'"), 'Firebase CSP must allow same-origin styles');
assert(!firebaseCsp.includes("'unsafe-inline'"), 'Firebase CSP must remain strict and avoid unsafe-inline');

const sw = read('sw.js');
assert(sw.includes(`./assets/css/route-recovery.css?v=${assetVersion}`), 'service worker must precache recovery CSS');
assert(sw.includes(`./src/boot/route-recovery.js?v=${assetVersion}`), 'service worker must precache recovery JS');

const runtimeConfig = read('src/config/app-runtime-config.js');
assert(runtimeConfig.includes('LOW_MEMORY_MAX_UNKNOWN_PROBE_FILE_BYTES: 48 * 1024 * 1024'), 'low-memory unknown-probe file threshold mismatch');
assert(runtimeConfig.includes('STANDARD_MAX_UNKNOWN_PROBE_FILE_BYTES: 128 * 1024 * 1024'), 'standard unknown-probe file threshold mismatch');

const preflightContext = {
  window: null,
  console,
  Object,
  Number,
  String,
  Math,
  Array,
  Promise,
  Boolean
};
preflightContext.window = preflightContext;
vm.runInNewContext(read('src/audio/import-preflight-service.js'), preflightContext, { filename: 'import-preflight-service.js' });
const preflight = preflightContext.FoxBearImportPreflightService;

(async () => {
  const unknownLarge = { name: 'unknown-large.mp3', size: 129 * 1024 * 1024 };
  const largePlan = {
    accepted: [{ file: unknownLarge, validation: { ok: true, label: 'MP3' } }],
    policy: { lowMemory: false },
    largeBatch: false
  };
  const rejected = await preflight.run(largePlan, {
    decodeService: { probeAudioFileMemory: async () => ({ known: false, fileBytes: unknownLarge.size }) },
    standardMaxDecodedPcmBytes: 768 * 1024 * 1024,
    standardMaxDecodePeakBytes: 1792 * 1024 * 1024,
    standardMaxUnknownProbeFileBytes: 128 * 1024 * 1024
  });
  assert.strictEqual(rejected.accepted.length, 0, 'large unknown-memory probe must fail closed');
  assert.strictEqual(rejected.decodedMemoryRejected.length, 1, 'large unknown-memory rejection must be reported');
  assert(/확인하지 못한/.test(rejected.decodedMemoryRejected[0].reason), 'unknown-memory rejection must explain the probe uncertainty');

  const unknownSmall = { name: 'unknown-small.mp3', size: 16 * 1024 * 1024 };
  const smallPlan = {
    accepted: [{ file: unknownSmall, validation: { ok: true, label: 'MP3' } }],
    policy: { lowMemory: false },
    largeBatch: false
  };
  const accepted = await preflight.run(smallPlan, {
    decodeService: { probeAudioFileMemory: async () => ({ known: false, fileBytes: unknownSmall.size }) },
    standardMaxDecodedPcmBytes: 768 * 1024 * 1024,
    standardMaxDecodePeakBytes: 1792 * 1024 * 1024,
    standardMaxUnknownProbeFileBytes: 128 * 1024 * 1024
  });
  assert.strictEqual(accepted.accepted.length, 1, 'small unknown-memory files should retain the existing fallback path');

  const decodeContext = {
    window: null,
    navigator: {},
    performance: { now: () => 0 },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    document: { createElement() { throw new Error('not used'); } },
    setTimeout,
    clearTimeout,
    console,
    Blob,
    DataView,
    ArrayBuffer,
    Float32Array,
    Math,
    Date,
    Error,
    Object,
    Number,
    String,
    Promise
  };
  decodeContext.window = decodeContext;
  vm.runInNewContext(read('src/audio/audio-decode-service.js'), decodeContext, { filename: 'audio-decode-service.js' });
  const decodeService = decodeContext.FoxBearAudioDecodeService;
  const safeBuffer = { numberOfChannels: 2, length: 48000 * 60, sampleRate: 48000, duration: 60 };
  const safeCheck = decodeService.assertDecodedMemoryWithinLimits(safeBuffer, 20 * 1024 * 1024, {
    maxDecodedPcmBytes: 192 * 1024 * 1024,
    maxDecodePeakBytes: 448 * 1024 * 1024
  });
  assert(safeCheck.decodedPcmBytes > 0, 'safe decoded buffer must return exact PCM bytes');

  const oversizedBuffer = { numberOfChannels: 6, length: 96000 * 600, sampleRate: 96000, duration: 600 };
  assert.throws(
    () => decodeService.assertDecodedMemoryWithinLimits(oversizedBuffer, 32 * 1024 * 1024, {
      maxDecodedPcmBytes: 768 * 1024 * 1024,
      maxDecodePeakBytes: 1792 * 1024 * 1024
    }),
    error => error?.code === 'FOXBEAR_DECODE_MEMORY_LIMIT' && error?.decodedPcmBytes > 768 * 1024 * 1024,
    'exact post-decode memory guard must reject underestimated multichannel/high-rate PCM'
  );

  const functionsIndex = read('functions/index.js');
  const envExample = read('functions/.env.example');
  assert(functionsIndex.includes("resolveOperationalEmail('FOXBEAR_ALERT_RECIPIENT'"), 'recipient environment override is missing');
  assert(functionsIndex.includes("resolveOperationalEmail('FOXBEAR_ALERT_SENDER'"), 'sender environment override is missing');
  assert(envExample.includes('FOXBEAR_ALERT_RECIPIENT=') && envExample.includes('FOXBEAR_ALERT_SENDER='), 'Functions env example is missing mail routing overrides');

  for (const relative of ['.firebaserc', '.firebase/hosting..cache', 'qa/static-audit.txt', 'PATCH_MANIFEST.json']) {
    assert(!fs.existsSync(path.join(root, relative)), `source hygiene artifact must be deleted from the release tree: ${relative}`);
  }

  console.log('PASS v1.6.73 CSP, memory admission, runtime mail config, and source hygiene smoke');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
