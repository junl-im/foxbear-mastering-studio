'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function fail(message) {
  console.error(`FAIL v1.6.92 spectrum panel mount lifecycle smoke: ${message}`);
  process.exit(1);
}
function assert(condition, message) { if (!condition) fail(message); }

class FakeGradient { addColorStop() {} }
class FakeContext {
  constructor() { this.paintCount = 0; this.textCount = 0; }
  clearRect() {}
  createLinearGradient() { return new FakeGradient(); }
  fillRect() { this.paintCount += 1; }
  save() {}
  restore() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  stroke() {}
  quadraticCurveTo() {}
  closePath() {}
  fill() { this.paintCount += 1; }
  setLineDash() {}
  fillText() { this.textCount += 1; }
}
class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.attributes = {};
    this.className = '';
    this.textContent = '';
    this.isConnected = false;
    this.width = this.tagName === 'CANVAS' ? 640 : 0;
    this.height = this.tagName === 'CANVAS' ? 180 : 0;
    this.clientWidth = this.tagName === 'CANVAS' ? 356 : 0;
    this.clientHeight = this.tagName === 'CANVAS' ? 120 : 0;
    this._context = this.tagName === 'CANVAS' ? new FakeContext() : null;
  }
  append(...items) { items.forEach(item => this.appendChild(item)); }
  appendChild(item) {
    if (!item) return item;
    this.children.push(item);
    item.parentNode = this;
    if (this.isConnected) item._setConnected(true);
    return item;
  }
  _setConnected(value) {
    this.isConnected = Boolean(value);
    this.children.forEach(child => child._setConnected?.(value));
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] || ''; }
  addEventListener() {}
  removeEventListener() {}
  getContext() { return this._context; }
  getBoundingClientRect() {
    if (this.tagName !== 'CANVAS') return { width: 0, height: 0 };
    return this.isConnected ? { width: 356, height: 120 } : { width: 0, height: 0 };
  }
}

const timers = [];
let nextTimerId = 1;
const documentElement = new FakeElement('html');
documentElement._setConnected(true);
const document = {
  visibilityState: 'visible',
  documentElement,
  createElement: tag => new FakeElement(tag),
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {}
};
const window = {
  document,
  navigator: { userAgent: 'FakeBrowser' },
  performance: { now: () => 100 },
  devicePixelRatio: 1,
  setTimeout(callback) { const id = nextTimerId++; timers.push({ id, callback }); return id; },
  clearTimeout(id) { const item = timers.find(timer => timer.id === id); if (item) item.cancelled = true; },
  addEventListener() {},
  removeEventListener() {}
};
window.window = window;

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'spectrum-visualizer.js'), 'utf8');
vm.runInNewContext(source, { window, console, Uint8Array, WeakMap, Set, Object, Array, Number, Math, String, Boolean, Date });
const visualizer = window.FoxBearSpectrumVisualizer;
assert(visualizer && typeof visualizer.renderPanel === 'function', 'visualizer renderPanel API missing');

const track = {
  id: 'spectrum-smoke',
  analysis: {
    spectrumProfile: [0.08,0.12,0.18,0.28,0.40,0.55,0.70,0.90,0.82,0.68,0.60,0.52,0.50,0.45,0.39,0.32,0.25,0.22,0.18,0.16,0.14,0.11,0.08,0.05],
    spectralCentroidHz: 2100,
    targetDynamicFreq: 5200,
    spectrumBands: { bass: 0.24, presence: 0.19, air: 0.08 }
  }
};
const panel = visualizer.renderPanel({ document, track, getActiveAudio: () => null });
const before = visualizer.getDiagnostics();
assert(before.canvasPendingMount === true, 'new canvas should remain protected while awaiting DOM mount');
assert(before.hasPanelCanvas === false, 'detached canvas should not report as renderable');
assert(before.lastDrawSucceeded === false, 'detached canvas must not claim a completed draw');

const canvas = panel.children.find(child => child.tagName === 'CANVAS');
assert(canvas, 'spectrum panel canvas missing');
assert(canvas._context.paintCount === 0, 'canvas should not paint before it is mounted');
documentElement.appendChild(panel);

while (timers.length) {
  const timer = timers.shift();
  if (!timer.cancelled) timer.callback();
}
const after = visualizer.getDiagnostics();
assert(after.hasPanelCanvas === true, 'mounted canvas should remain registered');
assert(after.canvasPendingMount === false, 'mount pending flag should clear after connection');
assert(after.lastStaticValueCount === 24, 'mounted panel should render the 24-band analysis profile');
assert(after.lastDrawMode === 'static', 'idle mounted panel should render static FFT evidence');
assert(after.lastDrawSucceeded === true, 'mounted static FFT draw should succeed');
assert(canvas._context.paintCount > 10, 'mounted spectrum canvas should contain painted FFT/grid content');

console.log('PASS v1.6.92 spectrum panel mount lifecycle smoke');
