#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const spectrumSource = fs.readFileSync('src/ui/spectrum-visualizer.js', 'utf8');
const compareSource = fs.readFileSync('src/ui/waveform-compare-view.js', 'utf8');
const mobileSource = fs.readFileSync('src/ui/mobile-native-view.js', 'utf8');
const appSource = fs.readFileSync('src/app.js', 'utf8');
const runtimeHealthSource = fs.readFileSync('src/boot/runtime-health.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert.strictEqual(pkg.version, '1.5.98');
assert(/^[a-z0-9][a-z0-9-]*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain valid kebab-case');
assert(fs.existsSync('docs/V1.5.77_RUNTIME_RESOURCE_LIFECYCLE_RECOVERY.md'));
assert(pkg.qaChecks.includes('node qa/v1577_runtime_resource_lifecycle_smoke.js'));
assert(spectrumSource.includes('function unregisterAudio(audio, reason = \'unregister\')'));
assert(spectrumSource.includes('function pruneDisconnectedAudio()'));
assert(spectrumSource.includes("global.addEventListener?.('pagehide', handlePageHide)"));
assert(spectrumSource.includes('state.lifecycleObserver = new global.MutationObserver'));
assert(compareSource.includes('controls._foxbearDispose = () =>'));
assert(compareSource.includes('wrap._foxbearDispose = () =>'));
assert(appSource.includes("unregisterPlaybackLinkedAudio(audio, 'bottom-preview-clear')"));
assert(appSource.includes("clearPreviewDialogBody('waveform-compare-open')"));
assert(runtimeHealthSource.includes('FoxBearSpectrumVisualizer.unregisterAudio'));
assert(runtimeHealthSource.includes('FoxBearSpectrumVisualizer.pruneDisconnectedAudio'));
assert(mobileSource.includes("globalObject.visualViewport?.addEventListener?.('resize', positionPanel"));
assert(mobileSource.includes('panel._foxbearDisposePositioning = () =>'));

class FakeAudio {
  constructor() {
    this.dataset = {};
    this.listeners = new Map();
    this.isConnected = true;
    this.paused = true;
    this.ended = false;
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }
  removeEventListener(type, handler) {
    this.listeners.get(type)?.delete(handler);
  }
  listenerCount() {
    return Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0);
  }
}

const documentListeners = new Map();
const windowListeners = new Map();
const fakeDocument = {
  visibilityState: 'visible',
  documentElement: {},
  querySelectorAll: () => [],
  addEventListener(type, handler) { documentListeners.set(type, handler); },
  removeEventListener(type, handler) { if (documentListeners.get(type) === handler) documentListeners.delete(type); }
};
class FakeMutationObserver {
  constructor(callback) { this.callback = callback; this.disconnected = false; }
  observe() {}
  disconnect() { this.disconnected = true; }
}
const fakeWindow = {
  document: fakeDocument,
  navigator: { userAgent: '' },
  performance: { now: () => Date.now() },
  setTimeout,
  clearTimeout,
  requestAnimationFrame: callback => setTimeout(() => callback(Date.now()), 0),
  cancelAnimationFrame: clearTimeout,
  MutationObserver: FakeMutationObserver,
  addEventListener(type, handler) { windowListeners.set(type, handler); },
  removeEventListener(type, handler) { if (windowListeners.get(type) === handler) windowListeners.delete(type); }
};
vm.runInNewContext(spectrumSource, { window: fakeWindow, console, Uint8Array, Date, Object, Array, Math, Number, String, Boolean, Promise, Reflect, Set, WeakMap });
const spectrum = fakeWindow.FoxBearSpectrumVisualizer;
const audio = new FakeAudio();
spectrum.registerAudio(audio, { trackId: 'track-1', mode: 'original', label: 'test' });
assert.strictEqual(spectrum.getDiagnostics().registeredAudioCount, 1);
assert(audio.listenerCount() >= 4, 'spectrum listeners were not installed');
audio.isConnected = false;
assert.strictEqual(spectrum.pruneDisconnectedAudio(), 1);
assert.strictEqual(spectrum.getDiagnostics().registeredAudioCount, 0);
assert.strictEqual(audio.listenerCount(), 0, 'detached audio listeners were not removed');
assert.strictEqual(audio.dataset.spectrumBound, undefined);
assert.strictEqual(spectrum.dispose('qa'), true);
assert.strictEqual(documentListeners.size, 0, 'document lifecycle listener remained after dispose');
assert.strictEqual(windowListeners.size, 0, 'window lifecycle listener remained after dispose');

console.log('PASS v1.5.77 runtime audio, popup timer, and mobile viewport lifecycle recovery');
