#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const source = fs.readFileSync('src/ui/ui-mode-service.js','utf8');
const browser = fs.readFileSync('qa/browser/runtime-health-playwright.spec.js','utf8');
assert.strictEqual(pkg.version, '1.6.111');
assert(pkg.qaChecks.includes('node qa/v16111_ui_mode_session_contract_smoke.js'));
assert(source.includes("sameTabReload: 'restore'"));
assert(source.includes("freshBrowsingSession: 'require-choice'"));
assert(source.includes("manualSwitch: 'reopen'"));
assert(source.includes("source: 'session'"));
assert(browser.includes('across same-tab refresh'));
assert(browser.includes('page.reload'));
assert(browser.includes("restoredSource).toBe('session')"));
assert(browser.includes('browser.newContext()'));
assert(browser.includes("toHaveAttribute('data-required', 'false')"));

class Storage { constructor(){this.m=new Map();} getItem(k){return this.m.has(k)?this.m.get(k):null;} setItem(k,v){this.m.set(k,String(v));} }
const storage=new Storage();
const doc={documentElement:{setAttribute(){}},addEventListener(){},getElementById(){return null;},querySelector(){return null;},body:null};
const win={document:doc,sessionStorage:storage,addEventListener(){},setTimeout(){},requestAnimationFrame(cb){cb();return 1;}};
vm.runInNewContext(source,{window:win,console,Object,String,Boolean,Array,Map,Set,Promise,CustomEvent:function(){}},{filename:'ui-mode-service.js'});
const service=win.FoxBearUiModeService;
assert.strictEqual(service.SESSION_CONTRACT.storage,'sessionStorage');
storage.setItem(service.SESSION_KEY,'expert');
const restored=service.createController({document:doc,sessionStorage:storage}).getSnapshot();
assert.strictEqual(restored.restored,true);
assert.strictEqual(restored.restoredSource,'session');
const fresh=service.createController({document:doc,sessionStorage:new Storage()}).getSnapshot();
assert.strictEqual(fresh.restored,false);
assert.strictEqual(fresh.restoredSource,'unselected');
console.log('PASS v1.6.111 UI mode session persistence contract');
