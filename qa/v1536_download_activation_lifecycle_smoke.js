'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const serviceSource = fs.readFileSync(path.join(root, 'src/download/download-service.js'), 'utf8');
const dialogSource = fs.readFileSync(path.join(root, 'src/ui/download-dialog-view.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');

assert(serviceSource.includes('const verifiedBlobInspections = typeof WeakMap'), 'verified Blob cache missing');
assert(serviceSource.includes('const pickerPromise = global.showSaveFilePicker({'), 'file picker is not invoked immediately');
assert(serviceSource.indexOf('const pickerPromise = global.showSaveFilePicker({') < serviceSource.indexOf('await assertDownloadBlob(blob);', serviceSource.indexOf('const saveBlobWithPicker')), 'Blob validation still runs before file picker');
assert(serviceSource.includes('const previousUrl = previous.dataset.downloadUrl'), 'previous assist URL cleanup missing');
assert(serviceSource.includes('scheduleDownloadUrlRevoke(url, deps, 10 * 60 * 1000)'), 'assist URL lifetime guard missing');
assert(serviceSource.includes("global.open(buildKakaoExternalBrowserUrl(pageUrl.href), '_blank')"), 'iOS Kakao custom scheme still replaces current page');
assert(dialogSource.includes('getImmediateTrackDownloadBlob(track, selectedFormat)'), 'same-format immediate share path missing');
assert(dialogSource.includes('The actual share call belongs to the assist button'), 'converted share second-gesture path missing');
assert(!dialogSource.includes('clearNativeBadgeIfDone();\n            state.busy = false;'), 'download completion still clears global mastering busy state');
assert(dialogSource.includes('let actionInFlight = false'), 'download action re-entry guard missing');
assert(appSource.includes('await getDownloadService().assertDownloadBlob(encoded.blob);'), 'master output is not prevalidated/cached');
assert(appSource.includes('await downloadBlob(zipBlob'), 'ZIP download rejection is still unhandled');
assert(appSource.includes("console.warn('Report download failed:'"), 'report download rejection guard missing');

const order = [];
const revoked = [];
class TestFile extends Blob {
  constructor(parts, name, options) {
    super(parts, options);
    this.name = name;
  }
}
const context = {
  console,
  Blob,
  File: TestFile,
  WeakMap,
  Map,
  Set,
  URL: {
    createObjectURL: () => 'blob:test',
    revokeObjectURL: url => revoked.push(url)
  },
  navigator: {
    userAgent: 'Mozilla/5.0 Chrome',
    share: null,
    canShare: null
  },
  location: { href: 'https://example.test/index.html' },
  document: {
    body: { appendChild() {} },
    createElement() { return { style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, remove() {}, click() {} }; },
    getElementById() { return null; },
    visibilityState: 'visible'
  },
  isSecureContext: true,
  showSaveFilePicker() {
    order.push('picker');
    return Promise.resolve({
      createWritable: async () => ({
        write: async () => order.push('write'),
        close: async () => order.push('close'),
        abort: async () => order.push('abort')
      })
    });
  },
  setTimeout,
  clearTimeout,
  requestAnimationFrame: callback => callback(),
  open() { return {}; }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(serviceSource, context, { filename: 'download-service.js' });

const bytes = new Uint8Array(128);
bytes.set([82, 73, 70, 70], 0);
bytes.set([87, 65, 86, 69], 8);
const fakeBlob = {
  size: bytes.length,
  type: 'audio/wav',
  slice() {
    return {
      arrayBuffer() {
        order.push('inspect');
        return Promise.resolve(bytes.buffer.slice(0));
      }
    };
  }
};

(async () => {
  const service = context.FoxBearDownloadService;
  await service.saveBlobWithPicker(fakeBlob, 'test.wav', { showToast() {} });
  assert.deepStrictEqual(order.slice(0, 2), ['picker', 'inspect'], 'file picker did not run before asynchronous Blob inspection');
  assert(order.includes('write') && order.includes('close'), 'validated Blob was not written and closed');
  const immediate = service.getImmediateTrackDownloadBlob({ outBlob: fakeBlob, outFormat: 'wav24', outName: 'test.wav' }, 'wav24');
  assert(immediate && immediate.blob === fakeBlob, 'verified same-format Blob is not available for immediate share');
  console.log('PASS v1.5.36 download activation, re-entry, and Blob URL lifecycle smoke');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
