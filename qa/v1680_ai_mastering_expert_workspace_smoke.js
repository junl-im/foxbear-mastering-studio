#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('assets/css/ui-mode.css', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const stateSource = fs.readFileSync('src/state/app-state.js', 'utf8');
const serviceSource = fs.readFileSync('src/ui/ui-mode-service.js', 'utf8');

assert.strictEqual(pkg.version, '1.6.97');
assert(/^[a-z0-9][a-z0-9-]*$/.test(String(pkg.foxbearRelease?.buildId || '')));
assert.strictEqual(pkg.foxbearRelease?.assetVersion, `${pkg.version}-${pkg.foxbearRelease?.buildId}`);
assert(pkg.qaChecks.includes('node qa/v1680_ai_mastering_expert_workspace_smoke.js'));
assert(html.includes('id="uiModeChooser"'));
assert(html.includes('id="uiModeAiBtn"'));
assert(html.includes('id="uiModeExpertBtn"'));
assert(html.includes('aria-hidden="false" data-required="true">'), 'first-entry chooser must be visible in initial HTML');
assert(/<script src="src\/ui\/ui-mode-service\.js\?/.test(html), 'UI mode service must run synchronously for pre-paint session restore');
assert(css.includes('html[data-ui-mode-pref="ai"] .ui-mode-chooser:not(.show)'));
assert(css.includes('html[data-ui-mode-pref="expert"] .ui-mode-chooser:not(.show)'));
assert(serviceSource.includes('function publishPrepaintMode()'));
assert(serviceSource.includes("setAttribute('data-ui-mode-pref', restored || 'unselected')"));
assert(html.includes('>AI 마스터링<'));
assert(html.includes('>전문가 모드<'));
assert(html.includes('같은 AI 분석 · 마스터링 엔진과 Dock'));
assert(html.indexOf('src/ui/ui-mode-service.js') < html.indexOf('src/app.js'), 'UI mode service must load before app.js');
assert(css.includes('body[data-ui-mode="ai"] .console-panel > :not(.control-zone-load) { display: none !important; }'));
assert(css.includes('body[data-ui-mode="ai"] .queue-action-stack > .action-panel { display: none !important; }'));
assert(css.includes('body[data-ui-mode="ai"] .workspace-stack > .inspect-panel'));
assert(css.includes('body[data-ui-mode="ai"] .control-zone-load .upload-stage'));
assert(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr)) !important;'));
assert(!css.includes('body[data-ui-mode="ai"] .bottom-preview-dock { display: block; }'), 'AI mode must not force hidden/empty Dock visible');
assert(css.includes('body[data-ui-mode="ai"] .bottom-preview-dock.show[aria-hidden="false"] { display: block; }'));
assert(css.includes('body[data-ui-mode="ai"] .bottom-preview-dock[aria-hidden="true"],'));
assert(css.includes('body[data-ui-mode="ai"] .bottom-preview-dock:not(.show) { display: none !important; }'));
assert(app.includes("runInitStep('작업 방식 선택', initUiModeExperience, { critical: true })"));
assert(app.includes('window.FoxBearUiModeController = uiModeController'));
assert(stateSource.includes("uiMode: ''"));

class FakeClassList {
    constructor() { this.items = new Set(); }
    add(...names) { names.forEach(name => this.items.add(name)); }
    remove(...names) { names.forEach(name => this.items.delete(name)); }
    contains(name) { return this.items.has(name); }
}
class FakeElement {
    constructor(id, documentRef) {
        this.id = id;
        this.ownerDocument = documentRef;
        this.dataset = {};
        this.classList = new FakeClassList();
        this.hidden = false;
        this.attributes = new Map();
        this.listeners = new Map();
        this.textContent = '';
    }
    addEventListener(type, handler) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(handler);
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) || null; }
    focus() { this.ownerDocument.activeElement = this; }
    contains(node) { return node === this; }
    closest() { return null; }
    querySelectorAll() { return []; }
}
class FakeStorage {
    constructor() { this.values = new Map(); }
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
    setItem(key, value) { this.values.set(key, String(value)); }
}
function makeDocument() {
    const documentRef = {
        elements: new Map(),
        activeElement: null,
        getElementById(id) { return this.elements.get(id) || null; },
        contains(node) { return [...this.elements.values()].includes(node) || node === this.body; }
    };
    documentRef.body = new FakeElement('body', documentRef);
    ['uiModeChooser','uiModeChooserPanel','uiModeChooserClose','uiModeAiBtn','uiModeExpertBtn','uiModeSwitchBtn','uiModeSwitchLabel','fileDrop']
        .forEach(id => documentRef.elements.set(id, new FakeElement(id, documentRef)));
    const panel = documentRef.getElementById('uiModeChooserPanel');
    panel.contains = node => ['uiModeChooserPanel','uiModeChooserClose','uiModeAiBtn','uiModeExpertBtn'].includes(node?.id);
    panel.querySelectorAll = () => [documentRef.getElementById('uiModeAiBtn'), documentRef.getElementById('uiModeExpertBtn'), documentRef.getElementById('uiModeChooserClose')];
    return documentRef;
}

const documentRef = makeDocument();
const storage = new FakeStorage();
const fakeWindow = {
    document: documentRef,
    sessionStorage: storage,
    requestAnimationFrame: callback => { callback(); return 1; },
    setTimeout: callback => { callback(); return 1; },
    addEventListener() {}
};
vm.runInNewContext(serviceSource, { window: fakeWindow, console, Object, String, Boolean, Array, Map, Set });
const service = fakeWindow.FoxBearUiModeService;
assert(service, 'UI mode service did not expose itself');
const changes = [];
const controller = service.createController({ document: documentRef, sessionStorage: storage, onModeChange: (next, prev) => changes.push([next, prev]) });
let snapshot = controller.init();
assert.strictEqual(documentRef.body.dataset.uiMode, 'unselected');
assert.strictEqual(snapshot.chooserOpen, true, 'first visit must open mode chooser');
assert.strictEqual(snapshot.chooserRequired, true, 'first mode chooser must require a choice');
assert.strictEqual(controller.closeChooser(), false, 'required first chooser must not close without a selection');
assert.strictEqual(controller.select('ai'), true);
snapshot = controller.getSnapshot();
assert.strictEqual(snapshot.mode, 'ai');
assert.strictEqual(snapshot.chooserOpen, false);
assert.strictEqual(documentRef.body.dataset.uiMode, 'ai');
assert.strictEqual(storage.getItem(service.SESSION_KEY), 'ai');
assert.strictEqual(documentRef.getElementById('uiModeSwitchLabel').textContent, 'AI 마스터링');
assert.strictEqual(documentRef.activeElement.id, 'fileDrop', 'AI mode should return focus to file import');
controller.openChooser({ required: false });
assert.strictEqual(controller.select('expert'), true);
assert.strictEqual(controller.getSnapshot().mode, 'expert');
assert.strictEqual(documentRef.body.dataset.uiMode, 'expert');
assert.strictEqual(documentRef.getElementById('uiModeSwitchLabel').textContent, '전문가 모드');
assert(changes.some(([next, prev]) => next === 'expert' && prev === 'ai'));

const restoredDocument = makeDocument();
const restoredController = service.createController({ document: restoredDocument, sessionStorage: storage });
const restored = restoredController.init();
assert.strictEqual(restored.mode, 'expert');
assert.strictEqual(restored.chooserOpen, false, 'same browsing session should restore the chosen mode without reopening the required chooser');
assert.strictEqual(restoredDocument.body.dataset.uiMode, 'expert');

console.log('PASS v1.6.80 AI mastering / expert workspace mode selection and single-column layout contract');
