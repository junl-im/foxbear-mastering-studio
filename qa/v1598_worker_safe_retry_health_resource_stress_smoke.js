#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const workerSource = read('src/utils/worker-job-service.js');
const coordinatorSource = read('src/boot/worker-recovery-coordinator.js');
const bridgeSource = read('src/boot/worker-recovery-app-bridge.js');
const diagnosticsSource = read('src/boot/performance-diagnostics.js');
const diagnosticsCss = read('assets/css/boot/performance-diagnostics.css');
const appSource = read('src/app.js');
const index = read('index.html');
const sw = read('sw.js');
const handoff = read('HANDOFF.md');

assert.strictEqual(pkg.version, '1.6.34');
assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain kebab-case');
assert(index.includes('src/boot/worker-recovery-coordinator.js?v=1.6.34-history-hard-stall-sw-activity-lifecycle'));
assert(index.includes('src/boot/worker-recovery-app-bridge.js?v=1.6.34-history-hard-stall-sw-activity-lifecycle'));
assert(sw.includes('./src/boot/worker-recovery-coordinator.js?v=1.6.34-history-hard-stall-sw-activity-lifecycle'));
assert(sw.includes('./src/boot/worker-recovery-app-bridge.js?v=1.6.34-history-hard-stall-sw-activity-lifecycle'));
assert(workerSource.includes('function cancelStalledJob(identifier, options = {})'));
assert(workerSource.includes("healthLevel, activeCount: jobs.length"));
assert(workerSource.includes('watchThresholdMs: WATCH_THRESHOLD_MS'));
assert(coordinatorSource.includes('async function retryJobs(jobs, context = {})'));
assert(bridgeSource.includes("id: 'foxbear-track-worker-recovery'"));
assert(bridgeSource.includes("if (target.kind === 'analysis') return retryAnalysis(track)"));
assert(bridgeSource.includes("if (target.kind === 'mastering') return retryMastering(track)"));
assert(bridgeSource.includes("if (target.kind === 'preview') return retryPreview(track)"));
assert(appSource.includes("label: `master-preview:${track.id}`"), 'preview Worker IDs must retain track ownership for safe retry');
assert(diagnosticsSource.includes("workerTitle.textContent = 'Worker 작업 상세'"));
assert(diagnosticsSource.includes('retryRecoveredWorkers()'));
assert(diagnosticsSource.includes('cancelSingleStalledWorker(item)'));
assert(diagnosticsSource.includes("return 'danger'"));
assert(diagnosticsCss.includes('.foxbear-perf-worker-list'));
assert(diagnosticsCss.includes('.foxbear-perf-health-badge'));
assert(handoff.startsWith('# Handoff - v1.6.34'));

let clock = 1_000_000;
const workerSandbox = { console, ArrayBuffer, Date: { now: () => clock }, setTimeout, clearTimeout };
workerSandbox.window = workerSandbox;
vm.createContext(workerSandbox);
vm.runInContext(workerSource, workerSandbox);
const workerService = workerSandbox.FoxBearWorkerJobService;

class StalledWorker {
    constructor() { this.onmessage = null; this.onerror = null; this.onmessageerror = null; this.terminated = false; }
    postMessage() {}
    terminate() { this.terminated = true; }
}

const coordinatorSandbox = { console, setTimeout, clearTimeout };
coordinatorSandbox.window = coordinatorSandbox;
vm.createContext(coordinatorSandbox);
vm.runInContext(coordinatorSource, coordinatorSandbox);
let retryCount = 0;
coordinatorSandbox.FoxBearWorkerRecoveryCoordinator.registerHandler({
    id: 'qa-analysis',
    match: job => /^analysis:(.+)$/.test(job.jobId) ? { trackId: job.jobId.slice(9) } : null,
    canRetry: target => target.trackId === 'track-1',
    getKey: target => target.trackId,
    retry: async () => { retryCount += 1; return true; }
});

const bridgeTrack = { id: 'track-bridge', file: { name: 'track.wav' }, analysis: null, analysisPromise: null, analysisTask: null, error: null, status: 'error', progress: 10, report: '' };
let bridgeQueued = 0;
const bridgeSandbox = {
    console,
    Date,
    setTimeout,
    clearTimeout,
    state: { tracks: [bridgeTrack], busy: false },
    getImportAnalysisQueueController: () => ({ queueTrack: () => { bridgeQueued += 1; return true; }, schedule: () => true }),
    scheduleRenderAll: () => true,
    clearStaleBusyFlagIfIdle: () => true,
    hasActiveBlockingWork: () => false,
    preparePrimaryActionTrack: () => bridgeTrack,
    renderAll: () => true,
    masterTrack: async () => true,
    renderMasterPreviewForTrack: async () => true
};
bridgeSandbox.window = bridgeSandbox;
vm.createContext(bridgeSandbox);
vm.runInContext(coordinatorSource, bridgeSandbox);
vm.runInContext(bridgeSource, bridgeSandbox);

const lifecycleSandbox = {
    console,
    Date,
    Math,
    crypto: { randomUUID: (() => { let id = 0; return () => `track-${++id}`; })() },
    URL: { createObjectURL: () => '', revokeObjectURL: () => {} }
};
lifecycleSandbox.window = lifecycleSandbox;
vm.createContext(lifecycleSandbox);
vm.runInContext(read('src/state/track-lifecycle-service.js'), lifecycleSandbox);

const audioSandbox = {
    console,
    Date,
    performance: { now: () => clock },
    setTimeout,
    clearTimeout,
    addEventListener: () => {}
};
audioSandbox.window = audioSandbox;
vm.createContext(audioSandbox);
vm.runInContext(read('src/audio/audio-context-manager.js'), audioSandbox);

(async () => {
    const stalledPromise = workerService.run({
        createWorker: () => new StalledWorker(),
        payload: {},
        transfer: [new ArrayBuffer(140 * 1024 * 1024)],
        timeoutMs: 120000,
        jobId: 'analysis:track-1',
        label: '오디오 분석'
    });
    clock += 9000;
    let snapshot = workerService.getDiagnostics();
    assert.strictEqual(snapshot.healthLevel, 'watch');
    assert.strictEqual(snapshot.active[0].healthLevel, 'watch');
    assert.strictEqual(workerService.cancelStalledJob('analysis:track-1').reason, 'job-not-stalled');
    clock += 7000;
    snapshot = workerService.getDiagnostics();
    assert.strictEqual(snapshot.healthLevel, 'danger');
    assert.strictEqual(snapshot.stalledCount, 1);
    const cancelled = workerService.cancelStalledJob('analysis:track-1', { reason: 'qa-specific-recovery' });
    assert.strictEqual(cancelled.cancelled, true);
    assert.strictEqual(cancelled.job.jobId, 'analysis:track-1');
    assert.strictEqual(cancelled.job.healthLevel, 'danger');
    await assert.rejects(stalledPromise, error => error?.code === 'FOXBEAR_WORKER_JOB_CANCELLED');
    assert.strictEqual(workerService.getDiagnostics().activeTransferBytes, 0);

    const retried = await coordinatorSandbox.FoxBearWorkerRecoveryCoordinator.retryJobs([
        { jobId: 'analysis:track-1' },
        { jobId: 'analysis:track-1' },
        { jobId: 'unknown:job' }
    ]);
    assert.strictEqual(retried.startedCount, 1);
    assert.strictEqual(retried.uniqueCount, 2);
    assert.strictEqual(retryCount, 1, 'duplicate recovery jobs must not run twice');

    assert.strictEqual(bridgeSandbox.FoxBearWorkerRecoveryAppBridge.parseTarget({ jobId: 'analysis:track-bridge' }).kind, 'analysis');
    assert.strictEqual(bridgeSandbox.FoxBearWorkerRecoveryAppBridge.parseTarget({ jobId: 'master:track-bridge:abc:1:pitch' }).kind, 'mastering');
    assert.strictEqual(bridgeSandbox.FoxBearWorkerRecoveryAppBridge.parseTarget({ jobId: 'master-preview:track-bridge:abc:1:wav' }).kind, 'preview');
    const bridgeRetry = await bridgeSandbox.FoxBearWorkerRecoveryCoordinator.retryJob({ jobId: 'analysis:track-bridge' });
    assert.strictEqual(bridgeRetry.ok, true);
    assert.strictEqual(bridgeQueued, 1);
    assert.strictEqual(bridgeTrack.status, 'queued');

    const revoked = [];
    let abortCount = 0;
    for (let index = 0; index < 30; index += 1) {
        const track = lifecycleSandbox.FoxBearTrackLifecycleService.createTrackModel({ name: `track-${index}.wav`, size: 1024, type: 'audio/wav' }, {
            customPreset: {},
            createObjectURL: () => `blob:original-${index}`
        });
        track.masteredUrl = `blob:mastered-${index}`;
        track.masterPreviewUrl = `blob:preview-${index}`;
        track.masteredBuffer = { length: 48000, numberOfChannels: 2 };
        track.masterPreviewBlob = { size: 4096 };
        track.outBlob = { size: 8192 };
        track.masteringAbortController = { abort: () => { abortCount += 1; } };
        track.masterPreviewAbortController = { abort: () => { abortCount += 1; } };
        const result = lifecycleSandbox.FoxBearTrackLifecycleService.releaseTrackResources(track, { revokeObjectURL: url => revoked.push(url) });
        assert.strictEqual(result.revoked, 3);
        assert.strictEqual(track.masteredBuffer, null);
        assert.strictEqual(track.masterPreviewBlob, null);
        assert.strictEqual(track.outBlob, null);
    }
    assert.strictEqual(revoked.length, 90, '30 tracks must revoke original, mastered, and preview URLs');
    assert.strictEqual(abortCount, 60, '30 tracks must abort mastering and preview ownership');

    let closedContexts = 0;
    for (let index = 0; index < 30; index += 1) {
        const context = { state: 'running', close: async () => { context.state = 'closed'; closedContexts += 1; } };
        audioSandbox.FoxBearAudioContextManager.register(context, { purpose: 'qa-stress', ownerId: `track-${index}`, transient: true });
    }
    assert.strictEqual(audioSandbox.FoxBearAudioContextManager.getDiagnostics().activeCount, 30);
    await audioSandbox.FoxBearAudioContextManager.closeAll('qa-30-track-release');
    assert.strictEqual(audioSandbox.FoxBearAudioContextManager.getDiagnostics().activeCount, 0);
    assert.strictEqual(closedContexts, 30);

    console.log('PASS v1.5.98 safe Worker retry, health levels, detail diagnostics, and 30-track resource release stress');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
