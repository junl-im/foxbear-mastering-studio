#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const modal = read('src/ui/modal-controller.js');
const perf = read('src/boot/performance-diagnostics.js');
const perfCss = read('assets/css/boot/performance-diagnostics.css');
const handoff = read('HANDOFF.md');

assert.strictEqual(pkg.version, '1.6.20');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.foxbearRelease.buildId), 'current build ID must remain kebab-case');

assert(modal.includes('const FOCUSABLE_SELECTOR'), 'modal controller must own the shared focusable selector');
assert(modal.includes('rememberReturnFocus(name, options = {})'), 'modal controller must remember the actual opener');
assert(modal.includes('restoreFocus(name, cfg)'), 'modal controller must restore focus after close');
assert(modal.includes('trapFocus(event)'), 'modal controller must trap Tab focus');
assert(modal.includes("event.key !== 'Tab'"), 'Tab focus loop must be explicit');
assert(modal.includes("body.style.position = 'fixed'"), 'shared modal lock must freeze mobile page scroll');
assert(modal.includes('body.dataset.foxbearModalScrollY'), 'shared modal lock must preserve scroll position');
assert(modal.includes('setExternalLayerOpen'), 'dynamic dialogs must join the shared modal lock');
assert(modal.includes('getOpenLayerCount'), 'modal lock diagnostics must expose active layer count');
assert(modal.includes('cfg.closeOnBackdrop && dialog && target === dialog'), 'managed backdrops must close from outside click');
assert(modal.includes("this.close(this.active, event, { restoreFocus: true })"), 'Escape must restore focus');

assert(app.includes(".register('programInfo'"), 'program info must use the common modal controller');
assert(app.includes(".register('incidentReporting'"), 'incident reporting must use the common modal controller');
assert(app.includes("opener: options.returnFocus || event?.currentTarget"), 'program info must retain its real opener');
assert(app.includes("returnFocus: options.returnFocus || el.mobileNativeQuickToggle"), 'performance diagnostics must return to settings');
assert(app.includes("const first = el.mobileNativePanel?.querySelector('button:not([disabled])"), 'settings panel must focus its first action');
assert(app.includes('const focusWasInside = Boolean(el.mobileNativePanel?.contains(document.activeElement))'), 'settings close must detect internal focus');

assert(perf.includes('const PANEL_REFRESH_MS = 2500'), 'diagnostics refresh must avoid a high-frequency polling loop');
assert(perf.includes("const workerJobs = safeCall(() => global.FoxBearWorkerJobService?.getDiagnostics?.(), null)"), 'diagnostics must include Worker jobs');
assert(perf.includes("summaryGrid.className = 'foxbear-perf-summary-grid'"), 'diagnostics must render a readable card summary');
assert(perf.includes("detailsSummary.textContent = '기술 상세 로그 보기'"), 'raw diagnostics must be placed behind an expandable detail section');
assert(perf.includes("label: '브라우저 메모리'"), 'diagnostics must explain browser memory');
assert(perf.includes("label: 'Worker 작업'"), 'diagnostics must explain Worker activity');
assert(perf.includes("label: '완료 PCM 보유'"), 'diagnostics must expose retained PCM');
assert(perf.includes('global.FoxBearModalStateMachine?.setExternalLayerOpen?.(state.backdrop, state.panelVisible'), 'performance dialog must join shared scroll locking');
assert(perf.includes('state.returnFocus = candidate'), 'performance dialog must remember the opener');
assert(perf.includes('returnFocus.focus({ preventScroll: true })'), 'performance dialog must restore opener focus');
assert(perf.includes("if (event.target === backdrop) setPanelVisible(false);"), 'performance dialog must close from outside click');

assert(perfCss.includes('.foxbear-perf-summary-grid'), 'diagnostics summary grid styles are required');
assert(perfCss.includes('.foxbear-perf-card'), 'diagnostics card styles are required');
assert(perfCss.includes(".foxbear-perf-summary-lead[data-tone='warn']"), 'diagnostics warning state must be visible');
assert(perfCss.includes('body.foxbear-modal-layer-open'), 'shared modal scroll state must have CSS protection');
assert(handoff.startsWith('# Handoff - v1.6.20'), 'handoff must lead with the current release');
assert(handoff.includes('# 필수 결과 보고 형식'), 'three-section report contract must remain persistent');

function classList(initial = []) {
    const values = new Set(initial);
    return {
        add: (...names) => names.forEach(name => values.add(name)),
        remove: (...names) => names.forEach(name => values.delete(name)),
        toggle: (name, force) => {
            if (force === true) values.add(name);
            else if (force === false) values.delete(name);
            else if (values.has(name)) values.delete(name);
            else values.add(name);
            return values.has(name);
        },
        contains: name => values.has(name),
        [Symbol.iterator]: function* () { yield* values; }
    };
}

const body = {
    style: { position: '', top: '', left: '', right: '', width: '', overflow: '', touchAction: '' },
    dataset: {},
    classList: classList(),
    scrollTop: 0,
    contains: () => true
};
const rootElement = { style: { overflow: '' }, scrollTop: 0 };
const fakeDocument = { body, documentElement: rootElement, activeElement: body, getElementById: () => null };
const sandbox = {
    console,
    document: fakeDocument,
    scrollY: 345,
    scrollToCalls: [],
    scrollTo(...args) { this.scrollToCalls.push(args); },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' })
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(modal, sandbox);

function fakeDialog(name) {
    const attributes = new Map([['role', 'dialog']]);
    return {
        nodeType: 1,
        name,
        ownerDocument: fakeDocument,
        hidden: true,
        style: {},
        dataset: {},
        classList: classList(['test-backdrop']),
        setAttribute(key, value) { attributes.set(key, String(value)); },
        getAttribute(key) { return attributes.get(key) || null; },
        querySelector: () => null,
        querySelectorAll: () => []
    };
}

const first = fakeDialog('first');
const second = fakeDialog('second');
const api = sandbox.FoxBearModalStateMachine;
assert.strictEqual(api.hardSet(first, true, 'first-open'), true);
assert.strictEqual(api.getOpenLayerCount(), 1);
assert.strictEqual(api.isDocumentLocked(), true);
assert.strictEqual(body.style.position, 'fixed');
assert.strictEqual(body.dataset.foxbearModalScrollY, '345');
api.setExternalLayerOpen(second, true);
api.hardSet(first, false, 'first-open');
assert.strictEqual(api.getOpenLayerCount(), 1, 'closing one of two layers must retain the lock');
assert.strictEqual(api.isDocumentLocked(), true);
api.setExternalLayerOpen(second, false);
assert.strictEqual(api.getOpenLayerCount(), 0);
assert.strictEqual(api.isDocumentLocked(), false);
assert.strictEqual(body.style.position, '');
assert.strictEqual(sandbox.scrollToCalls.length, 1, 'unlock must restore the preserved scroll position once');

console.log('PASS v1.5.96 shared modal focus/scroll lifecycle and readable memory diagnostics');
