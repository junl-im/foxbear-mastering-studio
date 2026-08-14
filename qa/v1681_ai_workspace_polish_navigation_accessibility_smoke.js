#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('assets/css/ui-mode.css', 'utf8');
const serviceSource = fs.readFileSync('src/ui/ui-mode-service.js', 'utf8');

assert.strictEqual(pkg.version, '1.6.99');
assert(/^[a-z0-9][a-z0-9-]*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current build ID must remain valid kebab-case');
assert.strictEqual(pkg.foxbearRelease?.assetVersion, `${pkg.version}-${pkg.foxbearRelease.buildId}`);
assert(pkg.qaChecks.includes('node qa/v1681_ai_workspace_polish_navigation_accessibility_smoke.js'));
assert(html.includes('id="uiModeChooser"'));
assert(css.includes('body[data-ui-mode="ai"] .hero-mainline'));
assert(css.includes('body[data-ui-mode="ai"] .hero-knobs'));
assert(!css.includes('body[data-ui-mode="ai"] .brand-command-device,'), 'AI mobile mode must preserve the device compatibility glyph token');
assert(css.includes('var(--foxbear-visual-viewport-height, 100dvh)'));
assert(css.includes('min-height: 40px;'));
assert(serviceSource.includes('syncOverlayRegistration'));
assert(serviceSource.includes('FoxBearModalStateMachine'));
assert(serviceSource.includes('history: !chooserRequired'));
assert(serviceSource.includes('setBackgroundInert'));
assert(serviceSource.includes('getComputedStyle'));
assert(serviceSource.includes("setAttribute?.('data-ui-mode-pref', mode)"));

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
        this.inert = false;
        this.attributes = new Map();
        this.listeners = new Map();
        this.textContent = '';
        this.nodeType = 1;
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
        querySelector(selector) { return selector === '.app-shell' ? this.appShell : null; },
        contains(node) { return [...this.elements.values()].includes(node) || node === this.body || node === this.appShell; }
    };
    documentRef.documentElement = new FakeElement('html', documentRef);
    documentRef.body = new FakeElement('body', documentRef);
    documentRef.appShell = new FakeElement('appShell', documentRef);
    ['uiModeChooser','uiModeChooserPanel','uiModeChooserClose','uiModeAiBtn','uiModeExpertBtn','uiModeSwitchBtn','uiModeSwitchLabel','fileDrop']
        .forEach(id => documentRef.elements.set(id, new FakeElement(id, documentRef)));
    const panel = documentRef.getElementById('uiModeChooserPanel');
    panel.contains = node => ['uiModeChooserPanel','uiModeChooserClose','uiModeAiBtn','uiModeExpertBtn'].includes(node?.id);
    panel.querySelectorAll = () => [documentRef.getElementById('uiModeAiBtn'), documentRef.getElementById('uiModeExpertBtn'), documentRef.getElementById('uiModeChooserClose')];
    return documentRef;
}

const documentRef = makeDocument();
const storage = new FakeStorage();
const overlayCalls = [];
let activeOverlayOptions = null;
const fakeWindow = {
    document: documentRef,
    sessionStorage: storage,
    requestAnimationFrame: callback => { callback(); return 1; },
    setTimeout: callback => { callback(); return 1; },
    addEventListener() {},
    getComputedStyle(node) {
        const chooser = documentRef.getElementById('uiModeChooser');
        const hiddenRequiredClose = node?.id === 'uiModeChooserClose' && chooser?.dataset?.required === 'true';
        return { display: hiddenRequiredClose ? 'none' : 'block', visibility: 'visible' };
    },
    FoxBearModalStateMachine: {
        setExternalLayerOpen(layer, open, options = {}) {
            overlayCalls.push({ layer: layer?.id || '', open: Boolean(open), options });
            if (open) activeOverlayOptions = options;
            else activeOverlayOptions = null;
            return true;
        }
    }
};
vm.runInNewContext(serviceSource, { window: fakeWindow, console, Object, String, Boolean, Array, Map, Set });
const service = fakeWindow.FoxBearUiModeService;
const controller = service.createController({ document: documentRef, sessionStorage: storage });
let snapshot = controller.init();
assert.strictEqual(snapshot.chooserOpen, true);
assert.strictEqual(snapshot.chooserRequired, true);
assert.strictEqual(snapshot.overlayRegistered, true);
assert.strictEqual(documentRef.appShell.inert, true, 'background shell must be inert while the chooser is open');
const initialOpen = overlayCalls.find(call => call.open);
assert(initialOpen, 'mode chooser must register with the shared overlay manager');
assert.strictEqual(initialOpen.options.history, false, 'required first-entry chooser must not create a browser-back sentinel');

const chooser = documentRef.getElementById('uiModeChooser');
documentRef.activeElement = documentRef.getElementById('uiModeAiBtn');
const keydown = chooser.listeners.get('keydown')?.[0];
assert(keydown, 'chooser keydown handler missing');
let prevented = false;
keydown({ key: 'Tab', shiftKey: true, preventDefault() { prevented = true; } });
assert.strictEqual(prevented, true);
assert.strictEqual(documentRef.activeElement.id, 'uiModeExpertBtn', 'hidden required close button must not enter the focus loop');

assert.strictEqual(controller.closeChooser(), false);
assert.strictEqual(documentRef.appShell.inert, true);
assert.strictEqual(controller.select('ai'), true);
assert.strictEqual(documentRef.appShell.inert, false);
assert.strictEqual(documentRef.documentElement.getAttribute('data-ui-mode-pref'), 'ai');
assert.strictEqual(documentRef.activeElement.id, 'fileDrop');

controller.openChooser({ required: false });
snapshot = controller.getSnapshot();
assert.strictEqual(snapshot.chooserRequired, false);
assert.strictEqual(documentRef.appShell.inert, true);
const optionalOpen = overlayCalls.filter(call => call.open).at(-1);
assert.strictEqual(optionalOpen.options.history, true, 'reopened chooser must participate in browser-back overlay history');
assert(activeOverlayOptions?.onRequestClose, 'overlay manager must receive a close callback');
assert.strictEqual(activeOverlayOptions.onRequestClose(), true, 'browser-back close callback must close an optional chooser');
assert.strictEqual(controller.getSnapshot().chooserOpen, false);
assert.strictEqual(documentRef.appShell.inert, false);

controller.openChooser({ required: false });
assert.strictEqual(controller.select('expert'), true);
assert.strictEqual(documentRef.documentElement.getAttribute('data-ui-mode-pref'), 'expert');
assert.strictEqual(documentRef.body.dataset.uiMode, 'expert');

console.log('PASS v1.6.81 AI workspace compact header, overlay history, focus filtering, and background inert safety');
