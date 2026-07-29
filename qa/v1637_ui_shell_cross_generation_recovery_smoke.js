#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const swSource = read('sw.js');
const uiSource = read('src/boot/ui-shell-recovery-service.js');
const css = read('assets/css/boot/ui-shell-recovery.css');

assert(index.includes('src/boot/ui-shell-recovery-service.js'), 'UI shell recovery service is not loaded');
assert(index.includes('assets/css/boot/ui-shell-recovery.css'), 'UI shell fallback CSS is not loaded');
assert(swSource.includes('RETAINED_LEGACY_SHELL_COUNT = 2'), 'legacy shell retention is missing');
assert(swSource.includes('matchExactAcrossShellCaches'), 'cross-generation exact cache matcher is missing');
assert(swSource.includes('return await matchExactAcrossShellCaches(request) || Response.error()'), 'stale assets do not use exact retained generation fallback');
assert(css.includes('foxbear-ui-shell-styles-missing'), 'minimal style fallback is missing');

function classList() {
  const set = new Set();
  return { add: (...v) => v.forEach(x => set.add(x)), remove: (...v) => v.forEach(x => set.delete(x)), toggle: (v,on) => on ? set.add(v) : set.delete(v), contains: v => set.has(v) };
}
const listeners = new Map();
const shell = {
  hidden: true,
  style: { display: 'none', visibility: 'hidden', opacity: '0', removeProperty(name) { this[name] = ''; } },
  attrs: new Map([['aria-hidden','true'],['inert','']]),
  setAttribute(k,v){ this.attrs.set(k,String(v)); }, getAttribute(k){ return this.attrs.get(k)||null; },
  removeAttribute(k){ this.attrs.delete(k); }, hasAttribute(k){ return this.attrs.has(k); },
  getBoundingClientRect(){ return { width: 0, height: 0 }; }
};
const body = { classList: classList(), appendChild(node){ this.notice=node; }, querySelector(){ return null; } };
const html = { classList: classList() };
const links = [
  { getAttribute:()=> 'assets/css/theme.css', sheet:null },
  { getAttribute:()=> 'assets/css/layout.css', sheet:null },
  { getAttribute:()=> 'assets/css/studio.css', sheet:null }
];
const document = {
  body, documentElement: html,
  querySelector(sel){ return sel === '.app-shell' ? shell : null; },
  querySelectorAll(){ return links; },
  getElementById(){ return body.notice || null; },
  createElement(){ return { setAttribute(){}, className:'', id:'', textContent:'' }; },
  addEventListener(type, fn){ listeners.set(type, fn); }
};
const sandbox = {
  console, document, Date, Object, Array, String, Number, Boolean, Set, Map,
  FoxBearBuildInfo: { assetVersion: pkg.foxbearRelease.assetVersion },
  getComputedStyle(){ return { display:'none', visibility:'hidden', opacity:'0' }; },
  addEventListener(){}, setTimeout(fn){ fn(); return 1; }, clearTimeout(){}
};
sandbox.window=sandbox; sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(uiSource, sandbox, { filename:'ui-shell-recovery-service.js' });
listeners.get('DOMContentLoaded')?.();
const snap = sandbox.FoxBearUiShellRecoveryService.getSnapshot();
assert.strictEqual(shell.hidden, false, 'hidden shell was not unhidden');
assert(html.classList.contains('foxbear-ui-shell-styles-missing'), 'missing stylesheet fallback class was not applied');
assert(snap.recoveries >= 1, 'recovery was not diagnosed');
assert(body.notice && /안전 UI/.test(body.notice.textContent), 'recovery notice was not created');
console.log('PASS v1.6.37 UI shell visibility and cross-generation cache recovery');
