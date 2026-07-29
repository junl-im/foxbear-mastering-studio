#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const downloadSource = fs.readFileSync(path.join(root, 'src/download/download-service.js'), 'utf8');
const audioContextSource = fs.readFileSync(path.join(root, 'src/audio/audio-context-manager.js'), 'utf8');

assert(
  downloadSource.includes('if (previousUrl && previousUrl !== url) revokeDownloadUrl(previousUrl, deps);'),
  'reopening download assist with the same Object URL would revoke the live URL'
);
assert(
  downloadSource.indexOf('if (url) addActiveUrl(url, deps);') > downloadSource.indexOf('if (previousUrl && previousUrl !== url)'),
  'new download URL ownership is registered before previous-panel reconciliation'
);

class MockAudioContext {
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
    this.state = 'closed';
    for (const handler of this.listeners.get('statechange') || []) handler();
  }
}

(async () => {
  const context = { console, AudioContext: MockAudioContext };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(audioContextSource, context, { filename: 'audio-context-manager.js' });
  const manager = context.FoxBearAudioContextManager;
  const contexts = [];
  for (let index = 0; index < 200; index += 1) {
    contexts.push(manager.create({ purpose: 'v1635-stress', ownerId: `owner-${index % 5}` }));
  }
  assert.strictEqual(manager.getDiagnostics().activeCount, 200, 'AudioContext manager lost active contexts during stress creation');
  await Promise.all(contexts.map((audioContext, index) => manager.close(audioContext, `stress-close-${index}`)));
  const diagnostics = manager.getDiagnostics();
  assert.strictEqual(diagnostics.activeCount, 0, 'AudioContext manager retained closed contexts');
  assert.strictEqual(Object.keys(diagnostics.byPurpose).length, 0, 'AudioContext purpose index retained closed contexts');
  console.log('PASS v1.6.35 same-URL download assist ownership and 200-cycle AudioContext lifecycle stress');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
