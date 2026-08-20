#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const modalSource = fs.readFileSync('src/ui/modal-controller.js', 'utf8');
const serviceSource = fs.readFileSync('src/ui/ui-mode-service.js', 'utf8');

assert.strictEqual(pkg.version, '1.6.112');
assert(/^[a-z0-9][a-z0-9-]*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current build ID must remain valid kebab-case');
assert.strictEqual(pkg.foxbearRelease?.assetVersion, `${pkg.version}-${pkg.foxbearRelease.buildId}`);
assert(pkg.qaChecks.includes('node qa/v1682_overlay_focus_ancestor_hardening_smoke.js'));
assert(modalSource.includes("getAttribute?.('tabindex') === '-1'"));
assert(modalSource.includes("current.parentElement"));
assert(modalSource.includes("style.contentVisibility === 'hidden'"));
assert(serviceSource.includes('FoxBearModalStateMachine?.getFocusable'));
assert(serviceSource.includes("current.parentElement || null"));

class FakeClassList {
    constructor() { this.items = new Set(); }
    add(...names) { names.forEach(name => this.items.add(name)); }
    remove(...names) { names.forEach(name => this.items.delete(name)); }
    toggle(name, force) { if (force) this.items.add(name); else this.items.delete(name); }
}

class FakeElement {
    constructor(id, documentRef, parent = null) {
        this.id = id;
        this.ownerDocument = documentRef;
        this.parentElement = parent;
        this.dataset = {};
        this.classList = new FakeClassList();
        this.hidden = false;
        this.inert = false;
        this.disabled = false;
        this.attributes = new Map();
        this.listeners = new Map();
        this.nodeType = 1;
        this.isConnected = true;
        this.style = { setProperty() {}, removeProperty() {} };
    }
    addEventListener(type, handler) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(handler);
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    hasAttribute(name) { return this.attributes.has(name); }
    focus() { this.ownerDocument.activeElement = this; }
    contains(node) {
        let current = node;
        while (current) {
            if (current === this) return true;
            current = current.parentElement;
        }
        return false;
    }
    closest() { return null; }
    querySelectorAll() { return []; }
    querySelector() { return null; }
}

const documentRef = {
    activeElement: null,
    body: null,
    documentElement: null,
    querySelector() { return null; },
    addEventListener() {},
    contains(node) { return Boolean(node?.isConnected); }
};
documentRef.body = new FakeElement('body', documentRef);
documentRef.documentElement = new FakeElement('html', documentRef);

const fakeWindow = {
    document: documentRef,
    history: { state: {}, pushState() {}, replaceState() {}, back() {} },
    location: { href: 'https://example.test/' },
    addEventListener() {},
    removeEventListener() {},
    setTimeout() { return 1; },
    clearTimeout() {},
    requestAnimationFrame(callback) { callback(); return 1; },
    scrollTo() {},
    getComputedStyle(node) {
        return {
            display: node?.dataset?.display || 'block',
            visibility: node?.dataset?.visibility || 'visible',
            contentVisibility: node?.dataset?.contentVisibility || 'visible'
        };
    }
};

vm.runInNewContext(modalSource, { window: fakeWindow, console, Object, String, Boolean, Array, Map, Set, WeakMap, Date, Math, Number });
const manager = fakeWindow.FoxBearModalStateMachine;
assert(manager?.getFocusable, 'shared modal getFocusable must be exposed');

const panel = new FakeElement('panel', documentRef);
const visible = new FakeElement('visible', documentRef, panel);
const tabExcluded = new FakeElement('tabExcluded', documentRef, panel);
tabExcluded.setAttribute('tabindex', '-1');
const ariaDisabled = new FakeElement('ariaDisabled', documentRef, panel);
ariaDisabled.setAttribute('aria-disabled', 'true');
const hiddenParent = new FakeElement('hiddenParent', documentRef, panel);
hiddenParent.dataset.display = 'none';
const hiddenDescendant = new FakeElement('hiddenDescendant', documentRef, hiddenParent);
const inertParent = new FakeElement('inertParent', documentRef, panel);
inertParent.inert = true;
const inertDescendant = new FakeElement('inertDescendant', documentRef, inertParent);
panel.querySelectorAll = () => [visible, tabExcluded, ariaDisabled, hiddenDescendant, inertDescendant];

assert.deepStrictEqual(Array.from(manager.getFocusable(panel), node => node.id), ['visible'], 'focus trap must exclude tabindex=-1, aria-disabled, hidden-ancestor, and inert-ancestor controls');

const elements = new Map();
const chooser = new FakeElement('uiModeChooser', documentRef);
const chooserPanel = new FakeElement('uiModeChooserPanel', documentRef, chooser);
const close = new FakeElement('uiModeChooserClose', documentRef, chooserPanel);
const ai = new FakeElement('uiModeAiBtn', documentRef, chooserPanel);
const expert = new FakeElement('uiModeExpertBtn', documentRef, chooserPanel);
const ghostParent = new FakeElement('ghostParent', documentRef, chooserPanel);
ghostParent.dataset.display = 'none';
const ghost = new FakeElement('ghost', documentRef, ghostParent);
const switcher = new FakeElement('uiModeSwitchBtn', documentRef);
const label = new FakeElement('uiModeSwitchLabel', documentRef);
const fileDrop = new FakeElement('fileDrop', documentRef);
[chooser, chooserPanel, close, ai, expert, ghost, switcher, label, fileDrop].forEach(node => elements.set(node.id, node));
chooserPanel.querySelectorAll = () => [ai, ghost, expert, close];
documentRef.getElementById = id => elements.get(id) || null;
documentRef.querySelector = selector => selector === '.app-shell' ? new FakeElement('appShell', documentRef) : null;

const storage = { getItem() { return null; }, setItem() {} };
fakeWindow.sessionStorage = storage;
vm.runInNewContext(serviceSource, { window: fakeWindow, console, Object, String, Boolean, Array, Map, Set });
const controller = fakeWindow.FoxBearUiModeService.createController({ document: documentRef, sessionStorage: storage });
controller.init();
const keydown = chooser.listeners.get('keydown')?.[0];
assert(keydown, 'chooser keydown handler missing');
documentRef.activeElement = ai;
let prevented = false;
keydown({ key: 'Tab', shiftKey: true, preventDefault() { prevented = true; } });
assert.strictEqual(prevented, true);
assert.strictEqual(documentRef.activeElement, close, 'shared focus order must skip hidden-ancestor controls');

console.log('PASS v1.6.82 overlay focus filtering excludes tabindex=-1 and hidden/inert ancestor controls');
