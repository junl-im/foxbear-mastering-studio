#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('src/ui/ui-mode-service.js','utf8');
assert(source.includes("const ENTRY_KEY = 'foxbear-ui-mode-entry-v1'"));
assert(source.includes("sameTabReload: 'show-chooser'"));
assert(source.includes("sameUrlReentry: 'show-chooser'"));
assert(source.includes('consumeEntryState(storage)'));
class Storage { constructor(){this.m=new Map();} getItem(k){return this.m.has(k)?this.m.get(k):null;} setItem(k,v){this.m.set(k,String(v));} }
function node(id=''){ return {id,hidden:true,dataset:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},focus(){},contains(){return true;},querySelectorAll(){return [];}}; }
function makeDoc(){ const nodes={uiModeChooser:node('uiModeChooser'),uiModeChooserPanel:node('uiModeChooserPanel'),uiModeChooserClose:node('uiModeChooserClose'),uiModeAiBtn:node('uiModeAiBtn'),uiModeExpertBtn:node('uiModeExpertBtn'),uiModeSwitchBtn:node('uiModeSwitchBtn'),uiModeSwitchLabel:node('uiModeSwitchLabel')}; const shell=node('shell'); shell.inert=false; return {nodes,documentElement:{setAttribute(){}},body:{dataset:{},classList:{add(){},remove(){}}},activeElement:null,contains(){return true;},addEventListener(){},getElementById(id){return nodes[id]||null;},querySelector(sel){return sel==='.app-shell'?shell:null;}}; }
const storage=new Storage();
const firstDoc=makeDoc();
const win={document:firstDoc,sessionStorage:storage,addEventListener(){},requestAnimationFrame(cb){cb();return 1;},setTimeout(cb){cb();return 1;},dispatchEvent(){},CustomEvent:function(){}};
vm.runInNewContext(source,{window:win,console,Object,String,Boolean,Array,Map,Set,Promise,CustomEvent:function(){}},{filename:'ui-mode-service.js'});
const service=win.FoxBearUiModeService;
let c=service.createController({document:firstDoc,sessionStorage:storage});
let snap=c.init();
assert.strictEqual(snap.mode,'expert');
assert.strictEqual(snap.chooserOpen,false,'first entry must remain direct Expert Studio');
assert.strictEqual(storage.getItem(service.ENTRY_KEY),'1');
delete win.__FOXBEAR_PENDING_UI_MODE__;
const revisitDoc=makeDoc();
c=service.createController({document:revisitDoc,sessionStorage:storage});
snap=c.init();
assert.strictEqual(snap.mode,'expert');
assert.strictEqual(snap.chooserOpen,true,'reload/same-url re-entry must show mode chooser');
assert.strictEqual(snap.chooserRequired,false,'revisit chooser must be closable while Expert remains the safe default');
assert.strictEqual(snap.revisitPrompt,true);
console.log('PASS v1.7.4 reload and same-URL re-entry mode chooser');
