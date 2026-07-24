'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function writeAscii(view, offset, value) {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
}

function writeExtended80(view, offset, sampleRate) {
    const exponent = Math.floor(Math.log2(sampleRate));
    const exp = exponent + 16383;
    const mantissa = sampleRate / Math.pow(2, exponent);
    view.setUint16(offset, exp, false);
    const high = Math.floor(mantissa * Math.pow(2, 31));
    const low = Math.floor((mantissa * Math.pow(2, 31) - high) * Math.pow(2, 32));
    view.setUint32(offset + 2, high >>> 0, false);
    view.setUint32(offset + 6, low >>> 0, false);
}

function createAiffHeader(frames, channels = 2, sampleRate = 44100) {
    const buffer = new ArrayBuffer(64);
    const view = new DataView(buffer);
    writeAscii(view, 0, 'FORM');
    view.setUint32(4, 56, false);
    writeAscii(view, 8, 'AIFF');
    writeAscii(view, 12, 'COMM');
    view.setUint32(16, 18, false);
    view.setUint16(20, channels, false);
    view.setUint32(22, frames, false);
    view.setUint16(26, 16, false);
    writeExtended80(view, 28, sampleRate);
    return buffer;
}

function loadDecodeService() {
    const source = fs.readFileSync(path.join(root, 'src/audio/audio-decode-service.js'), 'utf8');
    const window = {
        performance: { now: () => 0 },
        Date,
        ArrayBuffer,
        DataView,
        Float32Array,
        Math,
        Object,
        Promise,
        console,
        setTimeout,
        clearTimeout
    };
    vm.runInContext(source, vm.createContext({ window, Date, ArrayBuffer, DataView, Float32Array, Math, Object, Promise, console, setTimeout, clearTimeout }), { filename: 'audio-decode-service.js' });
    return window.FoxBearAudioDecodeService;
}

async function testAiffFallbackGuard() {
    const service = loadDecodeService();
    const timeout = new Error('timeout');
    timeout.code = 'AUDIO_DECODE_TIMEOUT';
    assert.throws(() => service.assertAiffFallbackAllowed(createAiffHeader(100), timeout, null), error => error === timeout, 'decode timeout must not enter synchronous AIFF fallback');

    const controller = new AbortController();
    controller.abort('cancelled');
    assert.throws(() => service.assertAiffFallbackAllowed(createAiffHeader(100), new Error('native'), controller.signal), error => error?.name === 'AbortError');

    const large = createAiffHeader(9 * 1024 * 1024, 2, 44100);
    assert.throws(() => service.assertAiffFallbackAllowed(large, new Error('native'), null), error => error?.code === 'FOXBEAR_AIFF_FALLBACK_TOO_LARGE' && error.channelSamples > error.limitChannelSamples);

    const small = service.assertAiffFallbackAllowed(createAiffHeader(4096, 2, 44100), new Error('native'), null);
    assert.strictEqual(small.channelSamples, 8192);
}

async function testWorkerFailureDiagnostics() {
    const source = fs.readFileSync(path.join(root, 'src/utils/worker-job-service.js'), 'utf8');
    let now = 1000;
    let timeoutCallback = null;
    class FakeDate extends Date { static now() { return now; } }
    class FakeWorker {
        postMessage() {}
        terminate() { this.terminated = true; }
    }
    const window = {
        Date: FakeDate, ArrayBuffer, Object, Map, Set, Promise, console,
        setTimeout(callback) { timeoutCallback = callback; return 1; },
        clearTimeout() {}
    };
    vm.runInContext(source, vm.createContext({ window, Date: FakeDate, ArrayBuffer, Object, Map, Set, Promise, console }), { filename: 'worker-job-service.js' });
    const service = window.FoxBearWorkerJobService;
    const timed = service.run({ createWorker: () => new FakeWorker(), jobId: 'timeout-probe', label: 'timeout-probe', timeoutMs: 1000 });
    now += 1500;
    timeoutCallback();
    await assert.rejects(timed, error => error?.code === 'FOXBEAR_WORKER_JOB_TIMEOUT');
    let recent = service.getDiagnostics().recent.at(-1);
    assert.strictEqual(recent.status, 'timeout');
    assert.strictEqual(recent.errorCode, 'FOXBEAR_WORKER_JOB_TIMEOUT');
    assert.match(recent.error, /시간이/);
    assert.ok(Number.isFinite(recent.progressAgeMs));

    const controller = new AbortController();
    const cancelled = service.run({ createWorker: () => new FakeWorker(), jobId: 'cancel-probe', label: 'cancel-probe', signal: controller.signal });
    controller.abort('user-cancelled');
    await assert.rejects(cancelled, error => error?.name === 'AbortError');
    recent = service.getDiagnostics().recent.at(-1);
    assert.strictEqual(recent.status, 'cancelled');
    assert.strictEqual(recent.errorCode, 'FOXBEAR_WORKER_JOB_CANCELLED');
    assert.match(recent.reason, /user-cancelled/);
}

function testReportingContract() {
    const handoff = fs.readFileSync(path.join(root, 'HANDOFF.md'), 'utf8');
    const status = fs.readFileSync(path.join(root, 'STATUS.md'), 'utf8');
    const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    for (const source of [handoff, status, readme]) {
        assert.match(source, /1\. 진행된 내용/);
        assert.match(source, /2\. 배포 파일 2종/);
        assert.match(source, /3\. 다음 패치 예정 라인업/);
    }
    assert.match(handoff, /전체 프로젝트 릴리스 ZIP/);
    assert.match(handoff, /누적 덮어쓰기용 패치 ZIP/);
    assert.match(handoff, /추가 독립 구역을 만들지 않는다/);
}

(async () => {
    await testAiffFallbackGuard();
    await testWorkerFailureDiagnostics();
    testReportingContract();
    console.log('PASS v1.5.94 AIFF fallback guard, Worker failure diagnostics, and reporting contract');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
