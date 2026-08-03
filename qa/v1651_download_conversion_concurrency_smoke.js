#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/download/download-service.js'), 'utf8');

assert(source.includes("recordDownloadEvent('variant-job-start'"), 'in-flight conversion start diagnostics missing');
assert(source.includes("recordDownloadEvent('variant-job-join'"), 'in-flight conversion join diagnostics missing');
assert(source.includes("recordDownloadEvent('variant-job-abort-unused'"), 'unused shared conversion cancellation missing');
assert(source.includes('downloadVariantJobs = typeof WeakMap'), 'source-scoped in-flight conversion registry missing');
assert(source.includes('remainingSubscribers: job.subscribers.size'), 'subscriber-aware cancellation diagnostics missing');

const makeWavBlob = (size = 512) => {
    const bytes = new Uint8Array(size);
    bytes.set(Buffer.from('RIFF'), 0);
    bytes.set(Buffer.from('WAVE'), 8);
    return new Blob([bytes], { type: 'audio/wav' });
};

const makeMp3Blob = (size = 1024) => {
    const bytes = new Uint8Array(size);
    bytes.set(Buffer.from('ID3'), 0);
    return new Blob([bytes], { type: 'audio/mpeg' });
};

const makeAbortError = reason => {
    const error = new Error(String(reason || 'aborted'));
    error.name = 'AbortError';
    error.code = 'FOXBEAR_WORKER_JOB_CANCELLED';
    return error;
};

(async () => {
    const sandbox = {
        console, Blob, URL, Date, Math, Number, String, Boolean, Array, Object, Map, Set, WeakMap,
        JSON, Promise, Uint8Array, Int16Array, Float32Array, ArrayBuffer, DataView, AbortController,
        navigator: {}, document: {}, setTimeout, clearTimeout
    };
    sandbox.window = sandbox;
    sandbox.FoxBearAudioDecodeService = { decodeAudioFile() {} };
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, { filename: 'download-service.js' });

    const service = sandbox.FoxBearDownloadService;
    assert(service, 'download service did not initialize');

    const track = {
        id: 'shared-job-track',
        name: 'shared.wav',
        outName: 'shared_mastered.wav',
        outFormat: 'wav24',
        outBlob: makeWavBlob(),
        masteredBuffer: null,
        masteredDurationSec: 60,
        analysis: { duration: 60, sampleRate: 48000, channels: 2 }
    };
    const fakeBuffer = { length: 48000, duration: 1, sampleRate: 48000, numberOfChannels: 2 };
    let decodeCalls = 0;
    let encodeCalls = 0;
    let releaseDecode = null;
    let internalSignal = null;
    const deps = {
        decodeMasteredOutputAsync: async (value, options = {}) => {
            decodeCalls += 1;
            internalSignal = options.signal || null;
            options.onProgress?.({ percent: 8, stage: '공유 디코딩', detail: '공유 작업을 시작합니다.' });
            return new Promise((resolve, reject) => {
                releaseDecode = () => resolve(fakeBuffer);
                options.signal?.addEventListener?.('abort', () => reject(makeAbortError(options.signal.reason)), { once: true });
            });
        },
        encodeMasterOutputAsync: async (buffer, format, options = {}) => {
            encodeCalls += 1;
            assert.strictEqual(buffer, fakeBuffer);
            assert.strictEqual(format, 'mp3_320');
            assert.strictEqual(options.signal, internalSignal, 'decode and encode must share one internal cancellation signal');
            options.onProgress?.({ percent: 55, stage: '공유 인코딩', detail: '한 번만 인코딩합니다.' });
            return { blob: makeMp3Blob(), format, extension: 'mp3', mime: 'audio/mpeg' };
        },
        buildMasteredFileName: (value, encoded) => `${value.id}.${encoded.extension}`
    };

    const firstController = new AbortController();
    const secondController = new AbortController();
    const firstProgress = [];
    const secondProgress = [];
    const first = service.prepareTrackDownloadBlob(track, 'mp3_320', deps, {
        signal: firstController.signal,
        jobId: 'shared:first',
        onProgress: progress => firstProgress.push(progress)
    });
    const second = service.prepareTrackDownloadBlob(track, 'mp3_320', deps, {
        signal: secondController.signal,
        jobId: 'shared:second',
        onProgress: progress => secondProgress.push(progress)
    });

    assert.strictEqual(decodeCalls, 1, 'overlapping identical requests must share one decode');
    assert(internalSignal && !internalSignal.aborted, 'shared conversion needs an independent internal signal');
    assert(firstProgress.some(item => item.stage === '공유 디코딩'), 'first subscriber should receive conversion progress');
    assert(secondProgress.some(item => item.stage === '공유 디코딩'), 'late subscriber should receive the latest shared progress');

    firstController.abort('first-dialog-closed');
    await assert.rejects(first, error => error?.name === 'AbortError' && error?.code === 'FOXBEAR_WORKER_JOB_CANCELLED');
    assert.strictEqual(internalSignal.aborted, false, 'one subscriber cancellation must not terminate another active request');

    releaseDecode();
    const sharedResult = await second;
    assert.strictEqual(sharedResult.format, 'mp3_320');
    assert.strictEqual(decodeCalls, 1);
    assert.strictEqual(encodeCalls, 1, 'overlapping identical requests must share one encode');
    assert(secondProgress.some(item => item.stage === '공유 인코딩'), 'remaining subscriber should continue receiving encode progress');

    const cached = await service.prepareTrackDownloadBlob(track, 'mp3_320', deps);
    assert.strictEqual(cached.cached, true, 'completed shared conversion must populate the bounded reuse cache');
    assert.strictEqual(cached.blob, sharedResult.blob);
    assert.strictEqual(decodeCalls, 1);
    assert.strictEqual(encodeCalls, 1);


    const originalBlob = makeWavBlob(896);
    const replacementBlob = makeWavBlob(960);
    const mutableTrack = {
        ...track,
        id: 'source-replacement-track',
        outBlob: originalBlob,
        outFormat: 'wav24'
    };
    let releaseMutableDecode = null;
    const mutableDeps = {
        decodeMasteredOutputAsync: async () => new Promise(resolve => { releaseMutableDecode = () => resolve(fakeBuffer); }),
        encodeMasterOutputAsync: async (buffer, format) => ({ blob: makeMp3Blob(1280), format, extension: 'mp3', mime: 'audio/mpeg' })
    };
    const mutablePending = service.prepareTrackDownloadBlob(mutableTrack, 'mp3_320', mutableDeps);
    mutableTrack.outBlob = replacementBlob;
    mutableTrack.outFormat = 'wav16';
    releaseMutableDecode();
    const mutableResult = await mutablePending;
    assert.strictEqual(mutableResult.format, 'mp3_320');
    assert.strictEqual(service.getCachedDownloadVariant(mutableTrack, 'mp3_320'), null, 'an old conversion must never be cached under a replacement master Blob');
    const originalSourceView = { outBlob: originalBlob, outFormat: 'wav24' };
    assert(service.getCachedDownloadVariant(originalSourceView, 'mp3_320'), 'completed conversion should remain associated only with its original source Blob');

    const cancelTrack = {
        ...track,
        id: 'all-cancel-track',
        outBlob: makeWavBlob(768)
    };
    let cancelDecodeCalls = 0;
    let cancelEncodeCalls = 0;
    let cancelInternalSignal = null;
    const cancelDeps = {
        decodeMasteredOutputAsync: async (value, options = {}) => {
            cancelDecodeCalls += 1;
            cancelInternalSignal = options.signal || null;
            return new Promise((resolve, reject) => {
                options.signal?.addEventListener?.('abort', () => reject(makeAbortError(options.signal.reason)), { once: true });
            });
        },
        encodeMasterOutputAsync: async () => {
            cancelEncodeCalls += 1;
            return { blob: makeMp3Blob(), format: 'mp3_320', extension: 'mp3', mime: 'audio/mpeg' };
        }
    };
    const cancelA = new AbortController();
    const cancelB = new AbortController();
    const pendingA = service.prepareTrackDownloadBlob(cancelTrack, 'mp3_320', cancelDeps, { signal: cancelA.signal });
    const pendingB = service.prepareTrackDownloadBlob(cancelTrack, 'mp3_320', cancelDeps, { signal: cancelB.signal });
    assert.strictEqual(cancelDecodeCalls, 1, 'all-cancel scenario must still start only one decode');
    cancelA.abort('cancel-a');
    assert(cancelInternalSignal && !cancelInternalSignal.aborted, 'shared job must stay active while one subscriber remains');
    cancelB.abort('cancel-b');
    const cancelled = await Promise.allSettled([pendingA, pendingB]);
    assert(cancelled.every(item => item.status === 'rejected' && item.reason?.name === 'AbortError'));
    assert.strictEqual(cancelInternalSignal.aborted, true, 'shared job must abort when the last subscriber leaves');
    assert.strictEqual(cancelEncodeCalls, 0, 'encoding must not start after all subscribers cancel during decode');

    await new Promise(resolve => setTimeout(resolve, 0));
    const diagnostics = service.getDownloadDiagnosticEvents();
    assert(diagnostics.some(event => event.type === 'variant-job-start'));
    assert(diagnostics.some(event => event.type === 'variant-job-join'));
    assert(diagnostics.some(event => event.type === 'variant-job-subscriber-abort'));
    assert(diagnostics.some(event => event.type === 'variant-job-abort-unused'));
    assert(diagnostics.some(event => event.type === 'variant-job-complete'));

    console.log('PASS v1.6.51 shared download conversion, independent subscriber cancellation, and unused-worker abort smoke');
})().catch(error => {
    console.error(error);
    process.exit(1);
});
