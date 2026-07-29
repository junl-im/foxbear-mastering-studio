#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const audioSource = fs.readFileSync(path.join(root, 'src/audio/audio-context-manager.js'), 'utf8');
const workerSource = fs.readFileSync(path.join(root, 'src/utils/worker-job-service.js'), 'utf8');
assert(audioSource.includes("pushEvent('close-join'"), 'concurrent AudioContext close join is missing');
assert(audioSource.includes('closePending: Boolean(record.closePromise)'), 'AudioContext close diagnostics are missing');

function makeEvents() {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    dispatch(type, event = {}) {
      for (const handler of [...(listeners.get(type) || [])]) handler(event);
    }
  };
}

class MockAudioContext {
  static nativeCloseCalls = 0;
  constructor() {
    this.state = 'running';
    this.listeners = new Map();
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }
  async resume() { this.state = 'running'; }
  async close() {
    MockAudioContext.nativeCloseCalls += 1;
    if (this._nativeCloseStarted) throw new Error('native close called twice');
    this._nativeCloseStarted = true;
    await Promise.resolve();
    this.state = 'closed';
    for (const handler of this.listeners.get('statechange') || []) handler();
  }
}

(async () => {
  const events = makeEvents();
  const audioContext = {
    console,
    AudioContext: MockAudioContext,
    addEventListener: events.addEventListener.bind(events),
    Date,
    Map,
    WeakMap,
    Set,
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Math
  };
  audioContext.window = audioContext;
  audioContext.globalThis = audioContext;
  vm.createContext(audioContext);
  vm.runInContext(audioSource, audioContext, { filename: 'audio-context-manager.js' });
  const manager = audioContext.FoxBearAudioContextManager;

  const contexts = Array.from({ length: 120 }, (_, index) => manager.create({ purpose: 'v1636-race', ownerId: `owner-${index % 8}` }));
  const explicit = contexts.map((context, index) => manager.close(context, `explicit-${index}`));
  events.dispatch('pagehide', { persisted: false });
  const joined = contexts.map((context, index) => manager.close(context, `late-${index}`));
  const pendingDiagnostics = manager.getDiagnostics();
  assert(pendingDiagnostics.events.some(event => event.type === 'close-join'), 'concurrent close joins were not diagnosed');
  assert(pendingDiagnostics.contexts.every(item => item.closePending), 'pending concurrent closes were not exposed in diagnostics');
  const results = await Promise.all([...explicit, ...joined]);
  assert(results.every(Boolean), 'concurrent AudioContext cleanup returned a failure');
  assert.strictEqual(MockAudioContext.nativeCloseCalls, contexts.length, 'AudioContext native close was invoked more than once per context');
  const audioDiagnostics = manager.getDiagnostics();
  assert.strictEqual(audioDiagnostics.activeCount, 0, 'concurrent AudioContext cleanup retained active contexts');

  let terminated = 0;
  class FakeWorker {
    constructor(mode) {
      this.mode = mode;
      this.onmessage = null;
      this.onerror = null;
      this.onmessageerror = null;
      this.terminated = false;
    }
    postMessage(payload) {
      if (this.mode === 'hold') return;
      queueMicrotask(() => {
        if (this.terminated) return;
        if (this.mode === 'fail') this.onmessage?.({ data: { __foxbearJobId: payload.__foxbearJobId, ok: false, error: 'expected-failure' } });
        else this.onmessage?.({ data: { __foxbearJobId: payload.__foxbearJobId, ok: true, value: 1 } });
      });
    }
    terminate() {
      if (this.terminated) return;
      this.terminated = true;
      terminated += 1;
    }
  }

  const workerContext = {
    console,
    Date,
    Map,
    Set,
    Promise,
    Object,
    String,
    Number,
    Boolean,
    Math,
    ArrayBuffer,
    AbortController,
    DOMException,
    setTimeout,
    clearTimeout,
    queueMicrotask
  };
  workerContext.window = workerContext;
  workerContext.globalThis = workerContext;
  vm.createContext(workerContext);
  vm.runInContext(workerSource, workerContext, { filename: 'worker-job-service.js' });
  const jobs = workerContext.FoxBearWorkerJobService;
  const promises = [];

  for (let index = 0; index < 100; index += 1) {
    const completeId = `complete-${index}`;
    promises.push(jobs.run({ jobId: completeId, label: 'complete', createWorker: () => new FakeWorker('complete') }));

    const failId = `fail-${index}`;
    promises.push(jobs.run({ jobId: failId, label: 'fail', createWorker: () => new FakeWorker('fail') }).catch(error => error));

    const cancelId = `cancel-${index}`;
    const cancelled = jobs.run({ jobId: cancelId, label: 'cancel', createWorker: () => new FakeWorker('hold') }).catch(error => error);
    assert.strictEqual(jobs.cancelJob(cancelId, 'v1636-stress-cancel'), true, `worker ${cancelId} could not be cancelled`);
    promises.push(cancelled);
  }

  await Promise.all(promises);
  const finalCancel = jobs.run({ jobId: 'cancel-final', label: 'cancel-final', createWorker: () => new FakeWorker('hold') }).catch(error => error);
  assert.strictEqual(jobs.cancelJob('cancel-final', 'v1636-final-cancel'), true, 'final worker could not be cancelled');
  await finalCancel;
  const workerDiagnostics = jobs.getDiagnostics();
  assert.strictEqual(workerDiagnostics.activeCount, 0, 'worker stress retained active jobs');
  assert.strictEqual(workerDiagnostics.recent.length, 24, 'worker recent history exceeded or missed its bound');
  assert.strictEqual(terminated, 301, 'not every worker was terminated exactly once');
  assert(workerDiagnostics.recent.some(job => job.status === 'cancelled'), 'cancelled worker outcome was not retained');
  assert(workerDiagnostics.recent.some(job => job.status === 'failed'), 'failed worker outcome was not retained');

  console.log('PASS v1.6.36 concurrent AudioContext cleanup and 300-cycle Worker lifecycle stress');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
