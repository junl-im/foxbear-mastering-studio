'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/download/download-service.js'), 'utf8');
const must = (condition, message) => { if (!condition) throw new Error(message); };

const sandbox = {
    window: { isSecureContext: true, setTimeout, clearTimeout },
    navigator: { userAgent: 'Mozilla/5.0', share: null, canShare: null, clipboard: null },
    document: { createElement: () => ({ download: '', remove() {} }) },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    Blob,
    File: typeof File === 'undefined' ? undefined : File,
    Uint8Array,
    ArrayBuffer,
    DataView,
    TextDecoder,
    console,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Error,
    Promise,
    setTimeout,
    clearTimeout
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'download-service.js' });

const service = sandbox.window.FoxBearDownloadService;
must(service && typeof service.inspectDownloadBlob === 'function', 'download inspector API missing');

function makeWavBlob(valid = true) {
    const bytes = new Uint8Array(44);
    bytes.set([...Buffer.from(valid ? 'RIFF' : 'NOPE')], 0);
    bytes.set([...Buffer.from('WAVE')], 8);
    bytes.set([...Buffer.from('fmt ')], 12);
    bytes.set([...Buffer.from('data')], 36);
    return new Blob([bytes], { type: 'audio/wav' });
}

(async () => {
    const validWav = await service.inspectDownloadBlob(makeWavBlob(true));
    must(validWav.ok && validWav.kind === 'wav', 'valid WAV blob rejected');
    const invalidWav = await service.inspectDownloadBlob(makeWavBlob(false));
    must(!invalidWav.ok && /헤더/.test(invalidWav.reason), 'invalid WAV header accepted');

    const mp3Bytes = new Uint8Array(160);
    mp3Bytes.set([0x49, 0x44, 0x33], 0);
    const validMp3 = await service.inspectDownloadBlob(new Blob([mp3Bytes], { type: 'audio/mpeg' }));
    must(validMp3.ok && validMp3.kind === 'mp3', 'valid MP3 blob rejected');

    const tinyMp3 = await service.inspectDownloadBlob(new Blob([new Uint8Array([0x49, 0x44, 0x33])], { type: 'audio/mpeg' }));
    must(!tinyMp3.ok && /작습니다/.test(tinyMp3.reason), 'tiny MP3 blob accepted');

    let rejected = false;
    try { await service.assertDownloadBlob(makeWavBlob(false)); }
    catch (error) { rejected = error && error.code === 'INVALID_DOWNLOAD_BLOB'; }
    must(rejected, 'assertDownloadBlob did not reject invalid output');
    console.log('PASS v1.5.33 download blob runtime validation smoke');
})().catch(error => {
    console.error(error);
    process.exit(1);
});
