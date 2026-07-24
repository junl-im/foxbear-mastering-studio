'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

async function testWorkerDiagnostics() {
    const source = fs.readFileSync(path.join(root, 'src/utils/worker-job-service.js'), 'utf8');
    let now = 1000;
    class FakeDate extends Date { static now() { return now; } }
    let worker = null;
    class FakeWorker {
        constructor() { worker = this; this.terminated = false; }
        postMessage(payload, transfer) { this.payload = payload; this.transfer = transfer; }
        terminate() { this.terminated = true; }
    }
    const window = {
        Date: FakeDate,
        ArrayBuffer,
        Object,
        Map,
        Set,
        Promise,
        console,
        setTimeout() { return 1; },
        clearTimeout() {}
    };
    const context = vm.createContext({ window, Date: FakeDate, ArrayBuffer, Object, Map, Set, Promise, console });
    vm.runInContext(source, context, { filename: 'worker-job-service.js' });
    const service = window.FoxBearWorkerJobService;
    const buffer = new ArrayBuffer(32);
    const job = service.run({
        createWorker: () => new FakeWorker(),
        payload: { value: 1 },
        transfer: [buffer, buffer],
        label: 'transfer-probe',
        jobId: 'transfer-probe-1'
    });
    let diagnostics = service.getDiagnostics();
    assert.strictEqual(worker.transfer.length, 1, 'duplicate transferables must be removed');
    assert.strictEqual(diagnostics.activeCount, 1);
    assert.strictEqual(diagnostics.activeTransferBytes, 32);
    assert.strictEqual(diagnostics.peakActiveTransferBytes, 32);
    assert.strictEqual(diagnostics.active[0].transferCount, 1);
    assert.strictEqual(diagnostics.active[0].transferBytes, 32);
    now += 16001;
    diagnostics = service.getDiagnostics();
    assert.strictEqual(diagnostics.stalledCount, 1, 'job without progress for 15s must be marked stalled');
    worker.onmessage({ data: { type: 'progress', __foxbearProgress: true, __foxbearJobId: 'transfer-probe-1', percent: 25, stage: 'working' } });
    diagnostics = service.getDiagnostics();
    assert.strictEqual(diagnostics.stalledCount, 0, 'progress must clear stalled state');
    worker.onmessage({ data: { ok: true, __foxbearJobId: 'transfer-probe-1', result: 42 } });
    const result = await job;
    assert.strictEqual(result.data.result, 42);
    diagnostics = service.getDiagnostics();
    assert.strictEqual(diagnostics.activeCount, 0);
    assert.strictEqual(diagnostics.recent.at(-1).transferBytes, 32);
    assert.strictEqual(worker.terminated, true);
}

async function testExternalAdapterCancellation() {
    const adapterPath = path.join(root, 'src/engines/pitch-engine-adapter.js');
    const source = fs.readFileSync(adapterPath, 'utf8');
    assert.match(source, /signal\s*=\s*null/);
    assert.match(source, /processPitchSpeed\(\{ sourceBuffer, transform, makeAudioBuffer, qualityMode, signal \}\)/);
    assert.match(source, /throwIfAborted\(signal, 'external-pitch-after-process'\)/);
    const adapterUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
    const adapter = await import(adapterUrl);
    const controller = new AbortController();
    controller.abort('cancel-probe');
    await assert.rejects(
        adapter.processPitchSpeed({ sourceBuffer: {}, transform: {}, makeAudioBuffer() {}, qualityMode: 'balanced', signal: controller.signal }),
        error => error && error.name === 'AbortError' && error.code === 'FOXBEAR_WORKER_JOB_CANCELLED'
    );
}

async function testAdminCsvDownloadOwnership() {
    const source = fs.readFileSync(path.join(root, 'src/ui/admin-incident-monitor-view.js'), 'utf8');
    const appSource = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
    assert.doesNotMatch(source, /setTimeout\(\(\) => URL\.revokeObjectURL\(url\), 1000\)/);
    assert.match(source, /const downloadBlob = typeof options\.downloadBlob === 'function'/);
    assert.match(source, /button\.setAttribute\('aria-busy', 'true'\)/);
    assert.match(source, /setTimeout\(\(\) => \{ try \{ URL\.revokeObjectURL\(url\); \} catch \(error\) \{\} \}, 60000\)/);
    assert.match(appSource, /getFirebaseStatusNotice,\s*showToast,\s*downloadBlob/);

    class FakeButton {
        constructor() { this.dataset = {}; this.disabled = false; this.attrs = new Map(); this.listeners = {}; }
        addEventListener(type, listener) { this.listeners[type] = listener; }
        setAttribute(name, value) { this.attrs.set(name, value); }
        removeAttribute(name) { this.attrs.delete(name); }
    }
    const button = new FakeButton();
    let releaseDownload;
    let calls = 0;
    const downloadPromise = new Promise(resolve => { releaseDownload = resolve; });
    const window = {
        localStorage: { getItem() { return null; }, setItem() {} },
        FoxBearFirebase: null
    };
    const context = vm.createContext({ window, Blob, URL, Map, WeakSet, Date, setTimeout, clearTimeout, console });
    vm.runInContext(source, context, { filename: 'admin-incident-monitor-view.js' });
    window.FoxBearAdminIncidentMonitorView.create({
        state: {
            adminMailTestFilteredItems: [{ checkedAt: '2026-07-24', status: 'ok', subject: 'test' }]
        },
        el: { adminIncidentMailTestExport: button },
        safeNumber: value => Number(value || 0),
        formatTime: value => String(value || ''),
        limitText: value => String(value || ''),
        getFirebaseStatusNotice: () => '',
        showToast() {},
        downloadBlob: async (blob, fileName) => { calls += 1; assert.ok(blob.size > 0); assert.match(fileName, /\.csv$/); return downloadPromise; }
    });
    const first = button.listeners.click();
    const second = button.listeners.click();
    await Promise.resolve();
    assert.strictEqual(calls, 1, 'rapid export clicks must start only one download');
    assert.strictEqual(button.disabled, true);
    assert.strictEqual(button.attrs.get('aria-busy'), 'true');
    releaseDownload({ ok: true });
    await Promise.all([first, second]);
    assert.strictEqual(button.disabled, false);
    assert.strictEqual(button.attrs.has('aria-busy'), false);
}

(async () => {
    await testWorkerDiagnostics();
    await testExternalAdapterCancellation();
    await testAdminCsvDownloadOwnership();
    console.log('PASS v1.5.93 external pitch cancellation, worker transfer diagnostics, and admin CSV lifecycle');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
