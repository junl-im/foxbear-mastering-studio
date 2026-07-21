#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { console.error(`FAIL v1.5.8 PCM/ZIP memory hardening smoke: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

function loadBrowserModule(file, extras = {}) {
    const context = {
        console,
        Date,
        Math,
        JSON,
        Object,
        Array,
        Set,
        Map,
        Promise,
        Error,
        Uint8Array,
        Blob,
        navigator: { userAgent: '', deviceMemory: 8 },
        performance: {},
        matchMedia: () => ({ matches: false }),
        ...extras
    };
    context.window = context;
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(read(file), context, { filename: file });
    return context;
}

const pkg = JSON.parse(read('package.json'));
const { getReleaseMetadata } = require('../tools/release-metadata');
const currentRelease = getReleaseMetadata();
const historicalVersion = ['1', '5', '8'].join('.');
const app = read('src/app.js');
const memorySource = read('src/audio/memory-guard-service.js');
const exportSource = read('src/download/export-guard-service.js');
const downloadSource = read('src/download/download-service.js');
const dialogSource = read('src/ui/download-dialog-view.js');
const progressSource = read('src/download/export-progress-view.js');
const zipServiceSource = read('src/download/zip-export-service.js');
const status = read('STATUS.md');
const changelog = read('CHANGELOG.md');
const readme = read('README.md');
const handoff = read('HANDOFF.md');
const qaReport = read('qa/QA_REPORT.md');

assert(pkg.version === currentRelease.productVersion, 'package version should match current release metadata');
assert(pkg.qaChecks.includes('node qa/v158_pcm_zip_memory_hardening_smoke.js'), 'v1.5.62 smoke missing from package QA');
assert(memorySource.includes('release-after-encode') && memorySource.includes('maxRetainedBuffers: retainCompletedPcm ? maxRetainedBuffers : 0'), 'release-after-encode policy missing');
assert(exportSource.includes("compression: 'STORE'") && exportSource.includes('estimatedWorkingSetBytes') && exportSource.includes('requiresIndividualDownload'), 'ZIP STORE/working-set strategy missing');
assert(downloadSource.includes('FORMAT_REQUIRES_REMASTER'), 'alternate-format remaster error missing');
assert(dialogSource.includes('option.available === false') && dialogSource.includes('재마스터링 필요') && dialogSource.includes("dataset.permanentDisabled === 'true'"), 'download dialog unavailable-format UX missing');
assert(app.includes("applyCompletedMasteringMemoryPolicy('zip-preflight-release'"), 'ZIP preflight PCM release missing');
assert(progressSource.includes('예상 작업 메모리') && progressSource.includes('workingSetLimitBytes'), 'export progress should expose ZIP working-set budget');
assert(exportSource.includes("compression: 'STORE'") && zipServiceSource.includes('plan?.files'), 'ZIP export should preserve the STORE-only plan in the delegated service');
assert(zipServiceSource.includes('plan?.requiresIndividualDownload'), 'delegated ZIP individual fallback gate missing');
const statusDoneIndex = app.indexOf("track.status = 'done';", app.indexOf('track.masteredBuffer = finalBuffer;'));
const policyIndex = app.indexOf('applyCompletedMasteringMemoryPolicy(calledFromBatch', app.indexOf('track.masteredBuffer = finalBuffer;'));
assert(statusDoneIndex > 0 && policyIndex > statusDoneIndex, 'newly completed track must become done before PCM release policy runs');

const memoryContext = loadBrowserModule('src/audio/memory-guard-service.js');
const memory = memoryContext.FoxBearMemoryGuardService;
const fakeBuffer = frames => ({ numberOfChannels: 2, length: frames });
const tracks = [
    { id: 'a', status: 'done', masteredBuffer: fakeBuffer(44100 * 60), outBlob: { size: 20 * 1024 * 1024 } },
    { id: 'b', status: 'done', masteredBuffer: fakeBuffer(44100 * 30), outBlob: { size: 10 * 1024 * 1024 } }
];
const release = memory.releaseCompletedMasteredBuffers(tracks, { reason: 'qa-release-after-encode' });
assert(release.released === 2 && release.retainedBuffers === 0, 'default policy should release all completed PCM buffers');
assert(tracks.every(track => track.masteredBuffer === null), 'released tracks should not retain PCM');
assert(memory.getSnapshot(tracks).masteredBufferCount === 0, 'snapshot should report zero retained PCM buffers');

const retainedTracks = [
    { id: 'a', status: 'done', masteredBuffer: fakeBuffer(1000), outBlob: { size: 1000 }, updatedAt: 1 },
    { id: 'b', status: 'done', masteredBuffer: fakeBuffer(1000), outBlob: { size: 1000 }, updatedAt: 2 }
];
const retained = memory.releaseCompletedMasteredBuffers(retainedTracks, {
    retainCompletedPcm: true,
    forceReleaseAll: false,
    keepSelected: false,
    keepRecent: 1,
    maxRetainedBuffers: 1,
    maxMasteredBufferBytes: 1024 * 1024
});
assert(retained.retainedBuffers === 1 && retained.released === 1, 'explicit bounded re-encode cache should retain only one PCM buffer');

const exportContext = loadBrowserModule('src/download/export-guard-service.js');
const guard = exportContext.FoxBearExportGuardService;
const smallPlan = guard.prepareZipExportPlan([
    { id: 'a', status: 'done', name: 'a.wav', outBlob: { size: 10 * 1024 * 1024 }, outName: 'a.wav' }
], { mobile: false, deviceMemoryGb: 8, memorySnapshot: { pressure: 'normal', masteredBufferBytes: 0, previewBlobBytes: 0 } });
assert(smallPlan.ok && smallPlan.canCreateZip && smallPlan.strategy === 'zip-store', 'small desktop export should use ZIP STORE');
assert(smallPlan.compression === 'STORE' && smallPlan.streamFiles === true, 'ZIP plan should require STORE + streamFiles');
const blockedPlan = guard.prepareZipExportPlan([
    { id: 'a', status: 'done', name: 'a.wav', outBlob: { size: 260 * 1024 * 1024 }, outName: 'a.wav' }
], { mobile: true, deviceMemoryGb: 2, memorySnapshot: { pressure: 'normal', masteredBufferBytes: 0, previewBlobBytes: 0, policy: { lowMemory: true } } });
assert(blockedPlan.requiresIndividualDownload && !blockedPlan.canCreateZip, 'large low-memory mobile export should be blocked to individual downloads');

const downloadContext = loadBrowserModule('src/download/download-service.js');
const download = downloadContext.FoxBearDownloadService;
const currentTrack = { outBlob: new Blob([new Uint8Array(128)]), outFormat: 'wav24', outName: 'track.wav', masteredBuffer: null };
const same = download.prepareTrackDownloadBlob(currentTrack, 'wav24');
Promise.resolve(same).then(result => {
    assert(result.blob === currentTrack.outBlob && result.reused === true, 'current completed format should reuse output Blob');
    return download.prepareTrackDownloadBlob(currentTrack, 'mp3_320')
        .then(() => fail('alternate format should not silently reuse the wrong Blob'))
        .catch(error => assert(error.code === 'FORMAT_REQUIRES_REMASTER', 'alternate format should require remaster after PCM release'));
}).then(() => {
    assert(status.includes('release-after-encode') && status.includes('STORE'), 'STATUS invariants missing new memory/export rules');
    assert(changelog.includes(`# v${historicalVersion} - PCM and ZIP Memory Hardening`), 'CHANGELOG v1.5.8 history missing');
    assert(readme.includes(`v${historicalVersion} PCM and ZIP Memory Hardening`), 'README v1.5.8 carry-forward missing');
    assert(handoff.includes(`v${historicalVersion} PCM and ZIP Memory Hardening`), 'HANDOFF v1.5.8 carry-forward missing');
    assert(qaReport.includes('183/183 PASS') && qaReport.includes(`v${historicalVersion} coverage`), 'QA report missing v1.5.8 result/coverage');
    console.log('PASS v1.5.8 PCM/ZIP memory hardening smoke');
}).catch(error => fail(error?.stack || error?.message || String(error)));
