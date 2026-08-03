#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/download/download-service.js'), 'utf8');
const dialog = fs.readFileSync(path.join(root, 'src/ui/download-dialog-view.js'), 'utf8');

assert(source.includes('MAX_CACHED_VARIANTS_PER_SOURCE = 1'), 'download variant cache must stay bounded to one alternate file per mastered source');
assert(source.includes('MAX_CACHED_VARIANT_BYTES = 64 * 1024 * 1024'), 'download variant cache byte limit missing');
assert(source.includes("'cached-download-variant'"), 'cached download conversion mode missing');
assert(source.includes("recordDownloadEvent('variant-cache-hit'"), 'download variant cache hit diagnostics missing');
assert(dialog.includes("option.conversionMode === 'cached-download-variant'"), 'download dialog cached-variant preparation hint missing');

const makeWavBlob = (size = 256) => {
    const bytes = new Uint8Array(size);
    bytes.set(Buffer.from('RIFF'), 0);
    bytes.set(Buffer.from('WAVE'), 8);
    return new Blob([bytes], { type: 'audio/wav' });
};
const makeMp3Blob = (size = 512) => {
    const bytes = new Uint8Array(size);
    bytes.set(Buffer.from('ID3'), 0);
    return new Blob([bytes], { type: 'audio/mpeg' });
};

(async () => {
    const sandbox = {
        console, Blob, URL, Date, Math, Number, String, Boolean, Array, Object, Map, Set, WeakMap,
        JSON, Promise, Uint8Array, Int16Array, Float32Array, ArrayBuffer, DataView,
        navigator: {}, document: {}, setTimeout, clearTimeout
    };
    sandbox.window = sandbox;
    sandbox.FoxBearAudioDecodeService = { decodeAudioFile() {} };
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, { filename: 'download-service.js' });

    const service = sandbox.FoxBearDownloadService;
    assert(service, 'download service did not initialize');

    const track = {
        id: 'cache-track',
        name: 'cache-source.wav',
        outName: 'cache-source_mastered.wav',
        outFormat: 'wav24',
        outBlob: makeWavBlob(),
        masteredBuffer: null,
        masteredDurationSec: 60,
        analysis: { duration: 60, sampleRate: 48000, channels: 2 }
    };
    const fakeBuffer = { length: 48000, duration: 1, sampleRate: 48000, numberOfChannels: 2 };
    let decodeCalls = 0;
    let encodeCalls = 0;
    const deps = {
        decodeMasteredOutputAsync: async () => {
            decodeCalls += 1;
            return fakeBuffer;
        },
        encodeMasterOutputAsync: async (buffer, format) => {
            encodeCalls += 1;
            assert.strictEqual(buffer, fakeBuffer);
            if (String(format).startsWith('mp3_')) return { blob: makeMp3Blob(), format, extension: 'mp3', mime: 'audio/mpeg' };
            return { blob: makeWavBlob(), format, extension: 'wav', mime: 'audio/wav' };
        },
        buildMasteredFileName: (value, encoded) => `${String(value.name).replace(/\.[^.]+$/, '')}_mastered.${encoded.extension}`
    };

    const first = await service.prepareTrackDownloadBlob(track, 'mp3_320', deps);
    assert.strictEqual(first.cached, undefined, 'first alternate-format render must be newly encoded');
    assert.strictEqual(first.conversionSource, 'mastered-file');
    assert.strictEqual(decodeCalls, 1);
    assert.strictEqual(encodeCalls, 1);

    const cachedOption = service.getDownloadFormatOptions(track).find(option => option.format === 'mp3_320');
    assert.strictEqual(cachedOption.conversionMode, 'cached-download-variant', 'cached format should be shown as an immediate reuse option');
    const cachedEstimate = service.getDownloadSizeEstimate(track, 'mp3_320');
    assert.strictEqual(cachedEstimate.exact, true);
    assert.strictEqual(cachedEstimate.source, 'cached-download-variant');
    assert.strictEqual(cachedEstimate.bytes, first.blob.size);

    const progress = [];
    const second = await service.prepareTrackDownloadBlob(track, 'mp3_320', deps, { onProgress: item => progress.push(item) });
    assert.strictEqual(second.cached, true, 'second identical request should reuse the converted file');
    assert.strictEqual(second.reused, true);
    assert.strictEqual(second.conversionSource, 'download-variant-cache');
    assert.strictEqual(second.blob, first.blob, 'cached download must reuse the exact verified Blob');
    assert.strictEqual(decodeCalls, 1, 'cached request must not decode again');
    assert.strictEqual(encodeCalls, 1, 'cached request must not encode again');
    assert(progress.some(item => item.stage === '변환 파일 재사용' && item.percent === 100), 'cache reuse progress message missing');

    const third = await service.prepareTrackDownloadBlob(track, 'wav16', deps);
    assert.strictEqual(third.format, 'wav16');
    assert.strictEqual(decodeCalls, 2);
    assert.strictEqual(encodeCalls, 2);
    assert.strictEqual(service.getCachedDownloadVariant(track, 'mp3_320'), null, 'one-entry cache must evict the older alternate format');
    assert(service.getCachedDownloadVariant(track, 'wav16'), 'newest alternate format should remain cached');

    await service.prepareTrackDownloadBlob(track, 'mp3_320', deps);
    assert.strictEqual(decodeCalls, 3, 'evicted format must be decoded again');
    assert.strictEqual(encodeCalls, 3, 'evicted format must be encoded again');

    const lossyTrack = {
        ...track,
        outFormat: 'mp3_192',
        outName: 'cache-source_mastered.mp3',
        outBlob: makeMp3Blob()
    };
    const lossyOptions = service.getDownloadFormatOptions(lossyTrack);
    const mp3Warning = lossyOptions.find(option => option.format === 'mp3_320').qualityWarning;
    const wavWarning = lossyOptions.find(option => option.format === 'wav24').qualityWarning;
    assert(mp3Warning.includes('더 높은 비트레이트'), 'MP3-to-MP3 warning should describe lossy re-encoding');
    assert(!mp3Warning.includes('WAV를 선택'), 'MP3-to-MP3 warning must not incorrectly describe a WAV selection');
    assert(wavWarning.includes('WAV를 선택'), 'MP3-to-WAV warning should explain that lossy detail is not restored');

    const diagnostics = service.getDownloadDiagnosticEvents();
    assert(diagnostics.some(event => event.type === 'variant-cache-store'), 'cache store diagnostic missing');
    assert(diagnostics.some(event => event.type === 'variant-cache-hit'), 'cache hit diagnostic missing');

    console.log('PASS v1.6.49 bounded download variant cache reuse and source-quality warning smoke');
})().catch(error => {
    console.error(error);
    process.exit(1);
});
