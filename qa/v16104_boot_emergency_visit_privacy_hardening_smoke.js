#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const app = fs.readFileSync('src/app.js', 'utf8');
const firebase = fs.readFileSync('src/firebase-bootstrap.js', 'utf8');
const uiModeSource = fs.readFileSync('src/ui/ui-mode-service.js', 'utf8');

assert.strictEqual(pkg.version, '1.6.104');
assert(app.includes('releaseEmergencyUploadBlockers();\n        bindEmergencyUploadOnly();'), 'critical init recovery must release blocking UI before emergency upload binding');
assert(app.includes("fileInput.dataset.nativeInputChangeBound !== 'true'"), 'file emergency binding must not duplicate the normal change handler');
assert(app.includes("folderInput.dataset.nativeInputChangeBound !== 'true'"), 'folder emergency binding must not duplicate the normal change handler');
assert(app.indexOf('window.FoxBearUiModeController = uiModeController;') < app.indexOf('const snapshot = uiModeController.init();'), 'UI mode controller must be exposed before init can throw');
assert(app.includes("const pagePath = location.pathname || '/';"), 'visit telemetry must derive page from pathname only');
assert(!app.includes("page: `${location.pathname || '/'}${location.search || ''}`"), 'visit telemetry must not persist launch query parameters');
assert(firebase.includes("String(payload.page || pathValue || '/').split(/[?#]/, 1)[0] || '/'"), 'Firebase visit normalization must strip query/hash data defensively');
assert(uiModeSource.includes('function releaseForEmergency()'), 'UI mode controller must expose an emergency release path');

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
    hasAttribute(name) { return this.attributes.has(name); }
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
const fakeWindow = {
    document: documentRef,
    sessionStorage: storage,
    requestAnimationFrame: callback => { callback(); return 1; },
    setTimeout: callback => { callback(); return 1; },
    addEventListener() {},
    getComputedStyle() { return { display: 'block', visibility: 'visible' }; },
    FoxBearModalStateMachine: {
        setExternalLayerOpen(layer, open) {
            overlayCalls.push({ id: layer?.id || '', open: Boolean(open) });
            return true;
        }
    }
};
vm.runInNewContext(uiModeSource, { window: fakeWindow, console, Object, String, Boolean, Array, Map, Set });
const controller = fakeWindow.FoxBearUiModeService.createController({ document: documentRef, sessionStorage: storage });
let snapshot = controller.init();
const chooser = documentRef.getElementById('uiModeChooser');
assert.strictEqual(snapshot.chooserOpen, true);
assert.strictEqual(snapshot.chooserRequired, true);
assert.strictEqual(documentRef.appShell.inert, true, 'required chooser must inert the app shell before recovery');
assert.strictEqual(documentRef.body.classList.contains('ui-mode-choice-open'), true, 'required chooser must lock body before recovery');
assert.strictEqual(controller.releaseForEmergency(), true);
snapshot = controller.getSnapshot();
assert.strictEqual(snapshot.chooserOpen, false);
assert.strictEqual(snapshot.chooserRequired, false);
assert.strictEqual(snapshot.overlayRegistered, false);
assert.strictEqual(chooser.hidden, true, 'emergency release must hide the required chooser');
assert.strictEqual(chooser.getAttribute('aria-hidden'), 'true');
assert.strictEqual(chooser.dataset.required, 'false');
assert.strictEqual(documentRef.appShell.inert, false, 'emergency release must restore file-upload interaction');
assert.strictEqual(documentRef.body.classList.contains('ui-mode-choice-open'), false, 'emergency release must unlock body scrolling');
assert(overlayCalls.some(call => call.open === false && call.id === 'uiModeChooser'), 'emergency release must unregister the chooser overlay');

console.log('PASS v1.6.104 boot emergency upload and visit privacy hardening');
