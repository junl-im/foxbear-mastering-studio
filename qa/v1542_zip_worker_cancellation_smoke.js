'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

async function runZipWorkerRuntime() {
  const JSZip = require(path.join(root, 'vendor/jszip/jszip.min.js'));
  const source = read('src/workers/zip-encoder.worker.js');
  const messages = [];
  let finish;
  const done = new Promise(resolve => { finish = resolve; });
  const context = { Blob, Uint8Array, Number, String, Object, Array, Math, Date, console, setTimeout, clearTimeout };
  context.self = context;
  context.importScripts = () => { context.JSZip = JSZip; };
  context.postMessage = message => {
    messages.push(message);
    if (message && (message.ok === true || message.ok === false)) finish(message);
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'zip-encoder.worker.js' });
  context.onmessage({ data: {
    __foxbearJobId: 'zip-qa',
    files: [
      { fileName: 'CON.wav', blob: new Blob([new Uint8Array([1, 2, 3, 4])]) },
      { fileName: 'Song.wav', blob: new Blob([new Uint8Array([5, 6, 7, 8])]) },
      { fileName: 'song.wav', blob: new Blob([new Uint8Array([9, 10, 11, 12])]) }
    ]
  } });
  const result = await Promise.race([done, new Promise((_, reject) => setTimeout(() => reject(new Error('ZIP worker runtime timeout')), 5000))]);
  assert(result.ok, result.error || 'ZIP worker failed');
  assert(result.blob instanceof Blob && result.blob.size > 128, 'ZIP worker did not produce a valid Blob');
  const signature = new Uint8Array(await result.blob.slice(0, 4).arrayBuffer());
  assert(signature[0] === 0x50 && signature[1] === 0x4b, 'ZIP worker output lacks PK signature');
  assert(messages.some(message => message.type === 'progress' && message.__foxbearJobId === 'zip-qa'), 'ZIP worker progress missing');
}

function runArchiveNameRuntime() {
  const source = read('src/download/export-guard-service.js');
  const context = {
    window: {
      navigator: { userAgent: 'Chrome', deviceMemory: 8 },
      matchMedia: () => ({ matches: false })
    },
    Blob,
    console
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'export-guard-service.js' });
  const blob = new Blob([new Uint8Array(256)]);
  const plan = context.window.FoxBearExportGuardService.prepareZipExportPlan([
    { id: '1', name: 'a', outName: 'CON.wav', outBlob: blob },
    { id: '2', name: 'b', outName: 'Song.wav', outBlob: blob },
    { id: '3', name: 'c', outName: 'song.wav', outBlob: blob },
    { id: '4', name: 'd', outName: '../bad/name?.wav ', outBlob: blob }
  ]);
  const names = plan.files.map(file => file.fileName);
  const lower = names.map(name => name.toLowerCase());
  assert.strictEqual(new Set(lower).size, names.length, 'ZIP names must be unique on case-insensitive file systems');
  assert(!names.some(name => /[\\/:*?"<>|]/.test(name) || /[. ]$/.test(name)), 'ZIP names contain unsafe path characters');
  assert(!/^con(?:\.|$)/i.test(names[0]), 'Windows reserved archive name was not protected');
}

async function main() {
  const app = read('src/app.js');
  const config = read('src/config/app-runtime-config.js');
  const progress = read('src/download/export-progress-view.js');
  const zipService = read('src/download/zip-export-service.js');
  const update = read('src/boot/service-worker-update-service.js');
  const index = read('index.html');
  const sw = read('sw.js');
  const pkg = JSON.parse(read('package.json'));

  assert(config.includes('ZIP_ENCODER_WORKER_URL') && config.includes('src/workers/zip-encoder.worker.js'), 'ZIP worker URL is not runtime-configured');
  assert((app.includes('getZipExportService()?.start') || app.includes('zipService.start({')) && app.includes('workerUrl: ZIP_ENCODER_WORKER_URL'), 'downloadZip is not delegated to the ZIP service');
  assert(zipService.includes('state.controller') && zipService.includes("cancel('pagehide')") && zipService.includes('getSnapshot().active'), 'duplicate ZIP or pagehide cancellation guard missing');
  assert(app.includes("showToast('ZIP 내보내기를 먼저 취소하거나 완료해 주세요.')"), 'queue clearing is not blocked during ZIP export');
  assert(index.includes('id="exportProgressCancel"') && index.includes('src/download/zip-export-service.js?v=1.5.79-preview-download-ownership-recovery'), 'ZIP cancel UI/service asset missing');
  assert(progress.includes("foxbear:zip-export-cancel") && progress.includes("state: 'cancelled'"), 'ZIP cancel view contract missing');
  assert(update.includes('FoxBearZipExport') && update.includes('exporting:'), 'service-worker update activity does not include ZIP export');
  assert(sw.includes("'./src/workers/zip-encoder.worker.js'") && sw.includes("'./src/workers/zip-encoder.worker.js?v=1.5.79-preview-download-ownership-recovery'"), 'versioned ZIP worker is not cached by the service worker');
  assert(pkg.qaChecks.includes('node --check src/download/zip-export-service.js') && pkg.qaChecks.includes('node qa/v1542_zip_worker_cancellation_smoke.js'), 'v1.5.79 QA is not registered');

  runArchiveNameRuntime();
  await runZipWorkerRuntime();
  console.log('PASS v1.5.42 ZIP worker cancellation smoke');
}

main().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
