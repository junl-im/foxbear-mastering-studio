'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

function runSriRepairRuntime() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-sri-repair-'));
  try {
    fs.mkdirSync(path.join(temp, 'tools'), { recursive: true });
    fs.writeFileSync(path.join(temp, 'tools/update-sri.py'), read('tools/update-sri.py'));
    fs.writeFileSync(path.join(temp, 'asset.js'), "console.log('asset');\n");
    fs.writeFileSync(path.join(temp, 'index.html'), '<script src="asset.js?v=test" integrity="" integrity="sha384-stale"></script>\n');
    const result = spawnSync('python3', ['-B', 'tools/update-sri.py'], { cwd: temp, encoding: 'utf8' });
    assert.strictEqual(result.status, 0, result.stderr || result.stdout || 'SRI updater failed');
    const repaired = fs.readFileSync(path.join(temp, 'index.html'), 'utf8');
    assert.strictEqual((repaired.match(/\sintegrity="[^"]*"/g) || []).length, 1, 'SRI updater did not canonicalize duplicate integrity attributes');
    assert(/integrity="sha384-[A-Za-z0-9+/=]+"/.test(repaired), 'SRI updater did not write a SHA-384 value');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

async function runLowCopyWorkerRuntime() {
  const source = read('src/workers/zip-encoder.worker.js');
  const messages = [];
  let fullReads = 0;
  let storedPayload = null;
  let finish;
  const done = new Promise(resolve => { finish = resolve; });

  class ProbeBlob extends Blob {
    async arrayBuffer() {
      fullReads += 1;
      return super.arrayBuffer();
    }
  }

  class MockZip {
    constructor() { this.files = []; }
    file(name, payload) {
      storedPayload = payload;
      this.files.push({ name, payload });
      return this;
    }
    async generateAsync(options, onProgress) {
      onProgress?.({ percent: 50, currentFile: this.files[0]?.name || '' });
      return new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04]), new Uint8Array(256)], { type: 'application/zip' });
    }
  }
  MockZip.support = { blob: true };

  const context = {
    Blob,
    Uint8Array,
    Number,
    String,
    Object,
    Array,
    Math,
    Date,
    console,
    FileReaderSync: function FileReaderSync() {}
  };
  context.self = context;
  context.importScripts = (...urls) => {
    for (const url of urls) {
      if (String(url).includes('file-name-policy-service.js')) vm.runInContext(read('src/download/file-name-policy-service.js'), context, { filename: 'file-name-policy-service.js' });
      else if (String(url).includes('jszip.min.js')) context.JSZip = MockZip;
    }
  };
  context.postMessage = message => {
    messages.push(message);
    if (message?.ok === true || message?.ok === false) finish(message);
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'zip-encoder.worker.js' });
  const input = new ProbeBlob([new Uint8Array(512)], { type: 'audio/wav' });
  context.onmessage({ data: { __foxbearJobId: 'low-copy', files: [{ fileName: 'test.wav', blob: input }] } });
  const result = await Promise.race([done, new Promise((_, reject) => setTimeout(() => reject(new Error('low-copy worker timeout')), 3000))]);
  assert(result.ok, result.error || 'low-copy worker failed');
  assert.strictEqual(storedPayload, input, 'worker did not pass the original Blob to JSZip on the supported path');
  assert.strictEqual(fullReads, 0, 'worker eagerly copied the full Blob despite Blob support');
  assert(messages.some(message => message.type === 'progress'), 'worker progress was not emitted');
}

async function main() {
  const index = read('index.html');
  const app = read('src/app.js');
  const health = read('src/boot/runtime-health.js');
  const worker = read('src/workers/zip-encoder.worker.js');
  const sriUpdater = read('tools/update-sri.py');
  const sriVerifier = read('qa/verify_sri.py');
  const handoffVerifier = read('tools/verify-handoff-state.js');
  const handoff = JSON.parse(read('HANDOFF_PACKAGE.json'));
  const pkg = JSON.parse(read('package.json'));

  const zipTags = index.match(/<script\b[^>]*src="src\/download\/zip-export-service\.js[^>]*>/g) || [];
  assert.strictEqual(zipTags.length, 1, 'ZIP export service must be loaded exactly once by index.html');
  assert.strictEqual((zipTags[0].match(/\sintegrity="[^"]*"/g) || []).length, 1, 'ZIP export service tag must have exactly one integrity attribute');
  assert(/integrity="sha384-[A-Za-z0-9+/=]+"/.test(zipTags[0]), 'ZIP export service tag lacks a valid SHA-384 value');

  assert(app.includes('moduleUnavailable: true') && app.includes('zipService.start({'), 'ZIP module-unavailable recovery or explicit service ownership is missing');
  assert(health.includes("'FoxBearZipExportService.start'") && health.includes("'FoxBearExportProgressView.begin'"), 'runtime health does not require the ZIP pipeline globals');
  assert(worker.includes("typeof self.FileReaderSync === 'function'") && worker.includes('blobSupported ? blob : new Uint8Array(await blob.arrayBuffer())'), 'ZIP worker low-copy/compatibility split is missing');
  assert(sriUpdater.includes("INTEGRITY_ATTR_RE.sub('', tag)"), 'SRI updater does not remove all existing integrity attributes');
  assert(sriVerifier.includes('INTEGRITY_ATTR_RE.findall(tag)'), 'SRI verifier does not inspect all integrity attributes');
  assert(handoffVerifier.includes('requiredRuntimeAssets') && handoffVerifier.includes('must be loaded exactly once by index.html'), 'archive verifier does not enforce runtime entry loading');
  assert(Array.isArray(handoff.requiredRuntimeAssets) && handoff.requiredRuntimeAssets.includes('src/download/zip-export-service.js'), 'handoff manifest does not declare ZIP service as a required runtime asset');
  assert(pkg.qaChecks.includes('node qa/v1543_export_pipeline_integrity_smoke.js'), 'v1.6.91 QA is not registered');

  runSriRepairRuntime();
  await runLowCopyWorkerRuntime();
  console.log('PASS v1.5.43 export pipeline integrity smoke');
}

main().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
