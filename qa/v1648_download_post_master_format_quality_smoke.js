#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const serviceSource = read('src/download/download-service.js');
const dialog = read('src/ui/download-dialog-view.js');
const app = read('src/app.js');
const css = read('assets/css/download-dialog.css');

assert(serviceSource.includes("conversionMode = current"), 'download option conversion mode classification missing');
assert(serviceSource.includes("'mastered-file-transcode'"), 'completed master file transcode option missing');
assert(serviceSource.includes('decodeMasteredOutputAsync'), 'post-master decode fallback missing');
assert(serviceSource.includes("conversionSource = sourceBuffer ? 'mastered-pcm' : 'mastered-file'"), 'conversion source tracking missing');
assert(serviceSource.includes('const decodeMasteredOutputForDownload = async'), 'download service completed-output decoder missing');
assert(app.includes('encodeMasterOutputAsync'), 'app encoder bridge missing');
assert(dialog.includes("listLabel.textContent = '파일 확장자 및 음질'"), 'download-time extension/quality label missing');
assert(dialog.includes("quickQualityRow.className = 'download-format-quick-select'"), 'always-visible quality selector missing');
assert(dialog.includes("quickQualitySelect.addEventListener('change'"), 'quality selector change handler missing');
assert(dialog.includes('const familyDefault = getFamilySelection(family.id)'), 'extension click must immediately choose the remembered/default quality');
assert(css.includes('.download-format-quick-select {'), 'always-visible quality selector styling missing');

const makeWavBlob = () => {
  const bytes = new Uint8Array(96);
  bytes.set(Buffer.from('RIFF'), 0);
  bytes.set(Buffer.from('WAVE'), 8);
  return new Blob([bytes], { type: 'audio/wav' });
};
const makeMp3Blob = () => {
  const bytes = new Uint8Array(256);
  bytes.set(Buffer.from('ID3'), 0);
  return new Blob([bytes], { type: 'audio/mpeg' });
};

(async () => {
  const sandbox = {
    console, Blob, URL, Date, Math, Number, String, Boolean, Array, Object, Map, Set, WeakMap,
    JSON, Promise, Uint8Array, Int16Array, Float32Array, ArrayBuffer, DataView,
    navigator: {}, document: {}, setTimeout, clearTimeout,
    FoxBearAudioDecodeService: { decodeAudioFile() {} }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(serviceSource, sandbox, { filename: 'download-service.js' });
  const service = sandbox.FoxBearDownloadService;
  assert(service, 'download service did not initialize');

  const track = {
    id: 'track-1',
    name: 'mix.wav',
    outName: 'mix_mastered.wav',
    outFormat: 'wav24',
    outBlob: makeWavBlob(),
    masteredBuffer: null,
    masteredDurationSec: 60,
    analysis: { duration: 60, sampleRate: 48000, channels: 2 }
  };
  const options = service.getDownloadFormatOptions(track);
  assert.strictEqual(options.length, 7, 'full MP3/WAV download option set should remain visible');
  assert(options.every(option => option.available), 'all formats should be selectable from a completed master file');
  assert.strictEqual(options.find(option => option.format === 'mp3_320').conversionMode, 'mastered-file-transcode');
  assert.strictEqual(options.find(option => option.format === 'wav24').conversionMode, 'reuse-current');

  let decodeCalls = 0;
  let encodeCalls = 0;
  const fakeBuffer = { length: 48000, duration: 1, sampleRate: 48000, numberOfChannels: 2 };
  const progress = [];
  const exported = await service.prepareTrackDownloadBlob(track, 'mp3_320', {
    decodeMasteredOutputAsync: async value => {
      decodeCalls += 1;
      assert.strictEqual(value, track);
      return fakeBuffer;
    },
    encodeMasterOutputAsync: async (buffer, format, optionsValue) => {
      encodeCalls += 1;
      assert.strictEqual(buffer, fakeBuffer);
      assert.strictEqual(format, 'mp3_320');
      optionsValue.onProgress?.({ percent: 50, stage: 'MP3 인코딩', detail: '테스트' });
      return { blob: makeMp3Blob(), format, extension: 'mp3', mime: 'audio/mpeg' };
    },
    buildMasteredFileName: (value, encoded) => `mix_mastered.${encoded.extension}`
  }, {
    onProgress: item => progress.push(item)
  });
  assert.strictEqual(decodeCalls, 1, 'completed output should be decoded once');
  assert.strictEqual(encodeCalls, 1, 'selected quality should be encoded once');
  assert.strictEqual(exported.format, 'mp3_320');
  assert.strictEqual(exported.fileName, 'mix_mastered.mp3');
  assert.strictEqual(exported.conversionSource, 'mastered-file');
  assert(progress.some(item => item.stage === '완성 파일 읽기'), 'decode stage progress missing');
  assert(progress.some(item => item.stage === 'MP3 인코딩' && item.percent > 20 && item.percent < 98), 'transcode progress mapping missing');

  const lossyTrack = { ...track, outFormat: 'mp3_192', outName: 'mix_mastered.mp3', outBlob: makeMp3Blob() };
  const wavOption = service.getDownloadFormatOptions(lossyTrack).find(option => option.format === 'wav24');
  assert(wavOption.qualityWarning.includes('복원'), 'MP3-to-WAV quality restoration warning missing');

  console.log('PASS v1.6.48 post-master extension/quality selection and output transcode smoke');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
