#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const serviceSource = fs.readFileSync('src/audio/master-preview-job-service.js', 'utf8');
const appSource = fs.readFileSync('src/app.js', 'utf8');
const stateSource = fs.readFileSync('src/state/app-state.js', 'utf8');
const lifecycleSource = fs.readFileSync('src/state/track-lifecycle-service.js', 'utf8');
const downloadSource = fs.readFileSync('src/download/download-service.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');
const swSource = fs.readFileSync('sw.js', 'utf8');

assert.strictEqual(pkg.version, '1.5.94');
assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain valid kebab-case');
assert(pkg.qaChecks.includes('node --check src/audio/master-preview-job-service.js'));
assert(pkg.qaChecks.includes('node qa/v1581_master_preview_job_ownership_smoke.js'));
assert(indexSource.includes('src/audio/master-preview-job-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract'));
assert(swSource.includes('./src/audio/master-preview-job-service.js?v=1.5.94-aiff-fallback-worker-diagnostics-reporting-contract'));
assert(indexSource.indexOf('src/audio/master-preview-job-service.js') < indexSource.indexOf('src/app.js'));
assert(stateSource.includes("masterPreviewRenderingJobId: ''"));
assert(lifecycleSource.includes('masterPreviewAbortController: null'));
assert(lifecycleSource.includes("track.masterPreviewAbortController?.abort?.('track-resources-released')"));
assert(appSource.includes("decodeAudio(track.file, previewTask)"));
assert(appSource.includes('signal: previewJob.signal, jobId: `${previewJob.id}:finalizer`'));
assert(appSource.includes("encodeWavAsync(finalBuffer, 'wav16', { signal: previewJob.signal"));
assert(appSource.includes("getMasterPreviewJobService()?.cancel?.(track, reason)"));
assert(appSource.includes("getMasterPreviewJobService()?.cancel?.(removingTrack, 'track-removed')"));
assert(downloadSource.includes('let panelActionGeneration = 0'));
assert(downloadSource.includes('actionGeneration === panelActionGeneration'));
assert(downloadSource.includes('actionGeneration !== panelActionGeneration'));

function loadService() {
  const fakeWindow = { setTimeout, clearTimeout };
  vm.runInNewContext(serviceSource, {
    window: fakeWindow,
    console,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Set,
    Promise,
    Error,
    TypeError
  });
  return fakeWindow.FoxBearMasterPreviewJobService;
}

const service = loadService();
const track = { id: 'track-1', masterPreviewAbortController: null, masterPreviewJobId: '' };
const first = service.create(track, { label: 'preview' });
assert.strictEqual(service.owns(track, first), true);
const second = service.create(track, { label: 'preview' });
assert.strictEqual(first.signal.aborted, true, 'superseded preview did not receive an abort signal');
assert.strictEqual(service.owns(track, first), false, 'superseded preview retained ownership');
assert.strictEqual(service.owns(track, second), true, 'new preview did not receive ownership');
assert.throws(() => service.assertActive(track, first, () => true, 'old-result'), error => service.isAbortError(error));
assert.throws(() => service.assertActive(track, second, () => false, 'detached-track'), error => error.code === 'FOXBEAR_MASTER_PREVIEW_CANCELLED' && error.stage === 'detached-track');
assert.strictEqual(service.assertActive(track, second, () => true, 'active-track'), true);
assert.strictEqual(service.cancel(track, 'settings-changed'), true);
assert.strictEqual(second.signal.aborted, true);
assert.strictEqual(service.owns(track, second), false);
assert.strictEqual(service.finish(track, second), false, 'cancelled preview incorrectly finalized ownership');
const third = service.create(track, { label: 'preview' });
assert.strictEqual(service.finish(track, third), true);
assert.strictEqual(track.masterPreviewAbortController, null);
assert.strictEqual(track.masterPreviewJobId, '');

console.log('PASS v1.5.81 master preview cancellation ownership and stale native-result isolation');
