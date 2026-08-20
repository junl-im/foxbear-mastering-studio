#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const serviceSource = fs.readFileSync('src/ui/ui-mode-service.js', 'utf8');

assert.strictEqual(pkg.version, '1.6.110');
assert(pkg.qaChecks.includes('node qa/v16110_ui_mode_early_choice_boot_recovery_smoke.js'));
assert(serviceSource.includes('function installEarlyChoiceBridge()'));
assert(serviceSource.includes('function applyEarlyModeSelection(nextMode)'));
assert(serviceSource.includes("documentRef.addEventListener('click'"));
assert(serviceSource.includes("global.__FOXBEAR_PENDING_UI_MODE__ = normalized"));
assert(serviceSource.includes('safeReadSession(storage) || safeReadPendingMode() || safeReadE2eMode()'));

class FakeClassList {
    constructor(values = []) { this.items = new Set(values); }
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
        this.disabled = false;
        this.parentElement = null;
    }
    addEventListener(type, handler) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(handler);
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) || null; }
    hasAttribute(name) { return this.attributes.has(name); }
    focus() { this.ownerDocument.activeElement = this; }
    contains(node) { return node === this; }
    querySelectorAll() { return []; }
    closest(selector) {
        if (selector.includes(`#${this.id}`)) return this;
        if (selector.includes('#uiModeAiBtn') && this.id === 'uiModeAiBtn') return this;
        if (selector.includes('#uiModeExpertBtn') && this.id === 'uiModeExpertBtn') return this;
        return null;
    }
}

class FakeStorage {
    constructor() { this.values = new Map(); }
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
    setItem(key, value) { this.values.set(key, String(value)); }
}

function makeDocument() {
    const documentRef = {
        listeners: new Map(),
        elements: new Map(),
        activeElement: null,
        documentElement: {
            dataset: {},
            attributes: new Map(),
            setAttribute(name, value) { this.attributes.set(name, String(value)); }
        },
        addEventListener(type, handler) {
            if (!this.listeners.has(type)) this.listeners.set(type, []);
            this.listeners.get(type).push(handler);
        },
        getElementById(id) { return this.elements.get(id) || null; },
        querySelector(selector) { return selector === '.app-shell' ? this.appShell : null; },
        contains(node) { return [...this.elements.values()].includes(node) || node === this.body || node === this.appShell; }
    };
    documentRef.body = new FakeElement('body', documentRef);
    documentRef.body.classList.add('ui-mode-choice-open');
    documentRef.appShell = new FakeElement('appShell', documentRef);
    documentRef.appShell.inert = true;
    ['uiModeChooser','uiModeChooserPanel','uiModeChooserClose','uiModeAiBtn','uiModeExpertBtn','uiModeSwitchBtn','uiModeSwitchLabel','fileDrop']
        .forEach(id => documentRef.elements.set(id, new FakeElement(id, documentRef)));
    const chooser = documentRef.getElementById('uiModeChooser');
    chooser.classList.add('show');
    chooser.dataset.required = 'true';
    chooser.setAttribute('aria-hidden', 'false');
    const panel = documentRef.getElementById('uiModeChooserPanel');
    panel.contains = node => ['uiModeChooserPanel','uiModeChooserClose','uiModeAiBtn','uiModeExpertBtn'].includes(node?.id);
    panel.querySelectorAll = () => [documentRef.getElementById('uiModeAiBtn'), documentRef.getElementById('uiModeExpertBtn'), documentRef.getElementById('uiModeChooserClose')];
    return documentRef;
}

function clickEvent(target) {
    return {
        target,
        prevented: false,
        stopped: false,
        preventDefault() { this.prevented = true; },
        stopPropagation() { this.stopped = true; }
    };
}

const documentRef = makeDocument();
const storage = new FakeStorage();
const dispatched = [];
class FakeCustomEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}
const fakeWindow = {
    document: documentRef,
    sessionStorage: storage,
    requestAnimationFrame: callback => { callback(); return 1; },
    setTimeout: callback => { callback(); return 1; },
    addEventListener() {},
    dispatchEvent(event) { dispatched.push(event); return true; }
};

vm.runInNewContext(serviceSource, {
    window: fakeWindow,
    console,
    CustomEvent: FakeCustomEvent,
    Object,
    String,
    Boolean,
    Array,
    Map,
    Set,
    Promise
}, { filename: 'ui-mode-service.js' });

const service = fakeWindow.FoxBearUiModeService;
assert(service, 'UI mode service should expose itself');
const clickHandlers = documentRef.listeners.get('click') || [];
assert.strictEqual(clickHandlers.length, 1, 'early mode bridge should bind exactly once from the head-loaded service');

const aiClick = clickEvent(documentRef.getElementById('uiModeAiBtn'));
clickHandlers[0](aiClick);
assert.strictEqual(aiClick.prevented, true);
assert.strictEqual(aiClick.stopped, true);
assert.strictEqual(storage.getItem(service.SESSION_KEY), 'ai', 'early selection should persist before app.js boot');
assert.strictEqual(fakeWindow.__FOXBEAR_PENDING_UI_MODE__, 'ai');
assert.strictEqual(documentRef.body.dataset.uiMode, 'ai');
assert.strictEqual(documentRef.body.classList.contains('ui-mode-choice-open'), false);
assert.strictEqual(documentRef.appShell.inert, false, 'early selection must release the app shell inert blocker');
assert.strictEqual(documentRef.getElementById('uiModeChooser').hidden, true, 'early selection must hide the required chooser');
assert.strictEqual(documentRef.getElementById('uiModeChooser').classList.contains('show'), false);
assert.strictEqual(documentRef.getElementById('uiModeChooser').dataset.required, 'false');
assert.strictEqual(documentRef.getElementById('uiModeSwitchLabel').textContent, 'AI 마스터링');
assert(dispatched.some(event => event.type === 'foxbear:ui-mode-early-selected' && event.detail?.mode === 'ai'));

// When app.js eventually boots, the normal controller must adopt the early choice.
const controller = service.createController({ document: documentRef, sessionStorage: storage });
const snapshot = controller.init();
assert.strictEqual(snapshot.mode, 'ai');
assert.strictEqual(snapshot.chooserOpen, false);
assert.strictEqual(documentRef.body.dataset.uiMode, 'ai');

// Once the normal controller exists, the capture bridge delegates to it and avoids duplicate target handlers.
let delegated = '';
fakeWindow.FoxBearUiModeController = { select(mode) { delegated = mode; return true; } };
const expertClick = clickEvent(documentRef.getElementById('uiModeExpertBtn'));
clickHandlers[0](expertClick);
assert.strictEqual(delegated, 'expert');
assert.strictEqual(expertClick.prevented, true);
assert.strictEqual(expertClick.stopped, true);

console.log('PASS v1.6.110 UI mode early-choice boot recovery');
