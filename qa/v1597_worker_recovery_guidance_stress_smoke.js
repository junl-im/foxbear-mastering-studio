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
const diagnosticsSource = read('src/boot/performance-diagnostics.js');
const diagnosticsCss = read('assets/css/boot/performance-diagnostics.css');
const handoff = read('HANDOFF.md');

assert.strictEqual(pkg.version, '1.6.45');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain valid kebab-case');
assert(workerSource.includes('function cancelJob(identifier'), 'worker service must support targeted cancellation');
assert(workerSource.includes('function cancelStalledJobs(options = {})'), 'worker service must support stalled-job recovery');
assert(workerSource.includes('stallThresholdMs: STALL_THRESHOLD_MS'), 'worker diagnostics must publish the stall threshold');
assert(workerSource.includes("canCancel: typeof record.cancel === 'function'"), 'active diagnostics must expose cancellation capability');
assert(diagnosticsSource.includes("recover.textContent = '정체 Worker 취소'"), 'diagnostics must provide a recovery action');
assert(diagnosticsSource.includes('cancelStalledWorkers()'), 'diagnostics recovery action must be implemented');
assert(diagnosticsSource.includes('const WARNING_GUIDANCE = Object.freeze'), 'diagnostics must translate internal warnings for users');
assert(diagnosticsSource.includes('권장 조치를 순서대로 확인해 주세요.'), 'diagnostics summary must direct users to actionable guidance');
assert(diagnosticsCss.includes('.foxbear-perf-recommendations'), 'user guidance requires visible styles');
assert(diagnosticsCss.includes('.foxbear-perf-recovery-button:not(:disabled)'), 'stalled Worker recovery must have an enabled state');
assert(handoff.startsWith('# Handoff - v1.6.45'), 'handoff must lead with the current release');

let clock = 1_000_000;
const sandbox = {
    console,
    ArrayBuffer,
    Date: { now: () => clock },
    setTimeout,
    clearTimeout
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(workerSource, sandbox);
const service = sandbox.FoxBearWorkerJobService;

class CompletingWorker {
    constructor() {
        this.onmessage = null;
        this.onerror = null;
        this.onmessageerror = null;
        this.terminated = false;
    }
    postMessage(payload) {
        setTimeout(() => {
            if (this.terminated) return;
            clock += 5;
            this.onmessage?.({ data: { type: 'progress', __foxbearJobId: payload.__foxbearJobId, percent: 50, stage: 'stress', detail: 'half' } });
            clock += 5;
            this.onmessage?.({ data: { ok: true, __foxbearJobId: payload.__foxbearJobId, stage: 'done' } });
        }, 0);
    }
    terminate() { this.terminated = true; }
}

class StalledWorker {
    constructor() {
        this.onmessage = null;
        this.onerror = null;
        this.onmessageerror = null;
        this.terminated = false;
    }
    postMessage() {}
    terminate() { this.terminated = true; }
}

(async () => {
    for (let index = 0; index < 30; index += 1) {
        clock += 20;
        const transfer = new ArrayBuffer(2048 + index);
        const result = await service.run({
            createWorker: () => new CompletingWorker(),
            payload: { index },
            transfer: [transfer, transfer],
            timeoutMs: 5000,
            jobId: `stress:${index}`,
            label: '30곡 자원 회수 검사'
        });
        assert.strictEqual(result.data.ok, true);
        const diagnostics = service.getDiagnostics();
        assert.strictEqual(diagnostics.activeCount, 0, `iteration ${index} must release active workers`);
        assert.strictEqual(diagnostics.activeTransferBytes, 0, `iteration ${index} must release transfer accounting`);
    }

    const afterStress = service.getDiagnostics();
    assert.strictEqual(afterStress.recent.length, 24, 'recent diagnostics must remain bounded after 30 jobs');
    assert(afterStress.peakActiveTransferBytes >= 2048, 'peak transfer memory must be retained for diagnostics');

    clock += 100;
    const stalledPromise = service.run({
        createWorker: () => new StalledWorker(),
        payload: {},
        transfer: [new ArrayBuffer(4096)],
        timeoutMs: 120000,
        jobId: 'stalled:manual-recovery',
        label: '정체 복구 검사'
    });
    clock += 16001;
    const stalledSnapshot = service.getDiagnostics();
    assert.strictEqual(stalledSnapshot.activeCount, 1);
    assert.strictEqual(stalledSnapshot.stalledCount, 1);
    assert.strictEqual(stalledSnapshot.active[0].canCancel, true);
    assert.strictEqual(stalledSnapshot.stallThresholdMs, 15000);

    const recovery = service.cancelStalledJobs({ reason: 'qa-manual-recovery' });
    assert.strictEqual(recovery.cancelledCount, 1);
    await assert.rejects(stalledPromise, error => error?.name === 'AbortError' && error?.code === 'FOXBEAR_WORKER_JOB_CANCELLED');

    const finalSnapshot = service.getDiagnostics();
    assert.strictEqual(finalSnapshot.activeCount, 0, 'manual recovery must release the Worker');
    assert.strictEqual(finalSnapshot.activeTransferBytes, 0, 'manual recovery must clear transfer memory accounting');
    assert.strictEqual(finalSnapshot.stalledCount, 0);
    assert.strictEqual(finalSnapshot.recent.at(-1).status, 'cancelled');
    assert.strictEqual(finalSnapshot.recent.at(-1).reason, 'qa-manual-recovery');
    assert.strictEqual(service.cancelJob('missing-job'), false, 'unknown jobs must not report a successful cancellation');

    console.log('PASS v1.5.97 stalled Worker recovery, user guidance, and 30-job resource release stress');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
