#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const read = file => fs.readFileSync(file, 'utf8');
const sw = read('sw.js');
const runtime = read('src/boot/runtime-health.js');
const app = read('src/app.js');
const recovery = read('src/boot/service-worker-recovery-service.js');
const page404 = read('404.html');
const index = read('index.html');
const prepare = read('tools/prepare-pages-site.sh');
const overwrite = read('tools/create-overwrite-zip.sh');

assert(sw.includes('const INSTALL_ASSETS = [') && sw.includes('CORE_ASSETS.filter'), 'service worker boot install graph is not derived atomically');
assert(sw.includes('const WARM_ASSETS = CORE_ASSETS.filter') && sw.includes('!INSTALL_ASSET_SET.has(asset)'), 'optional warm graph is missing');
assert(sw.includes('isStaleAssetGeneration(url)') && sw.includes('return Response.error()') && !sw.includes('matchFoxBearRecoveryCache'), 'stale generation rejection is missing');
assert(sw.includes('isCanonicalShellRequest(url)') && sw.includes('Response.redirect(getCanonicalAppRootUrl().toString(), 302)'), 'bad navigation paths are not redirected to the application root');
assert(runtime.includes("new URL('../../', RUNTIME_SCRIPT_URL)"), 'runtime recovery does not derive the canonical app root from its script URL');
assert(runtime.includes('probeDeployedGeneration') && runtime.includes('recoverStaleGeneration'), 'runtime generation mismatch recovery probe is missing');
assert(recovery.includes('consumeOneShotBypass') && recovery.includes('global.caches.keys()'), 'one-shot service worker/cache cleanup is incomplete');
assert(app.includes('FoxBearServiceWorkerRecoveryService?.consumeOneShotBypass'), 'app does not consume the recovery service');
assert(page404.includes('foxbear-root.json') && page404.includes('getRegistrations') && page404.includes('location.replace(target.href)'), '404 recovery does not locate root and purge stale runtime state');
assert(prepare.includes('required_files=(index.html 404.html foxbear-root.json manifest.webmanifest sw.js)'), 'Pages artifact does not require the root marker');
assert(overwrite.includes('copy_path "foxbear-root.json"'), 'overwrite package omits the root marker');
assert(!read('firebase.json').includes('"destination": "/index.html"'), 'Firebase must not serve index.html at an invalid relative-asset URL');
assert(index.includes('src/boot/service-worker-recovery-service.js?v=1.5.97-worker-recovery-diagnostics'), 'service worker recovery module is not loaded');
assert(sw.includes('./src/boot/service-worker-recovery-service.js?v=1.5.97-worker-recovery-diagnostics'), 'service worker recovery module is not cached');

function runtimeHardRefreshUsesScriptRoot() {
  const scripts=[{src:'https://user.github.io/foxbear-mastering-studio/src/boot/runtime-health.js?v=test'}];
  const location={href:'https://user.github.io/foxbear-mastering-studio/bad/route',replaced:'',replace(url){this.replaced=url;}};
  const body={appendChild(){}};
  const document={currentScript:scripts[0],scripts,body,readyState:'complete',addEventListener(){},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return [];},createElement(){return {classList:{add(){}},append(){},appendChild(){},addEventListener(){},querySelector(){return null;},set hidden(v){},get hidden(){return false;}};}};
  const window={location,document,navigator:{},sessionStorage:{setItem(){},getItem(){return null;}},addEventListener(){},dispatchEvent(){},setTimeout(){return 1;},clearTimeout(){},fetch:async()=>({ok:false}),console,URL,Date,Array,Object,String,Number,Boolean,Math,Set,Map,Promise,CustomEvent:function(){}};
  window.window=window;
  vm.createContext(window);
  vm.runInContext(runtime,window,{filename:'runtime-health.js'});
  window.FoxBearRuntimeHealth.hardRefresh();
  assert(location.replaced.startsWith('https://user.github.io/foxbear-mastering-studio/?'), 'runtime recovery did not return to the project root');
}

async function exerciseServiceWorkerGenerationIsolation() {
  const listeners = new Map();
  const currentEntries = new Map();
  const legacyEntries = new Map();
  const fetched=[];
  const makeCache = entries => ({
    async match(key){return entries.get(typeof key === 'string' ? key : key.url) || null;},
    async put(key,value){entries.set(typeof key === 'string' ? key : key.url,value);},
    async addAll(){}
  });
  const cachesApi={
    async open(name){return name.includes('1.5.30') ? makeCache(legacyEntries) : makeCache(currentEntries);},
    async keys(){return ['foxbear-shell-v1.5.30-inapp-playback-recovery','foxbear-shell-v1.5.97-worker-recovery-diagnostics'];},
    async delete(){return true;}
  };
  const context={console,URL,Request,Response,Set,Map,Promise,Math,Date,indexedDB:{},caches:cachesApi,fetch:async request=>{fetched.push(String(request.url||request));return new Response('missing',{status:404});},self:{location:{origin:'https://user.github.io'},registration:{scope:'https://user.github.io/foxbear-mastering-studio/',navigationPreload:null},clients:{async claim(){}},async skipWaiting(){},addEventListener(type,handler){listeners.set(type,handler);}}};
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(`${sw}\n;globalThis.__v1549={INSTALL_ASSETS,WARM_ASSETS,networkFirstNoFallbackOnIntegrityAssets,networkFirstNavigation};`,context,{filename:'sw.js'});
  const api=context.__v1549;
  assert(api.WARM_ASSETS.length>20,'optional warm graph should remain meaningful');
  const bootRefs=[...index.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(path=>/\.(?:js|css)(?:[?#]|$)/.test(path));
  bootRefs.forEach(path=>assert(api.INSTALL_ASSETS.includes(`./${path}`),`boot asset missing from atomic install graph: ${path}`));

  const oldUrl='https://user.github.io/foxbear-mastering-studio/src/audio/playback-link-service.js?v=1.5.30-inapp-playback-recovery';
  const oldResponse=new Response('old-generation',{status:200});
  legacyEntries.set(oldUrl,oldResponse);
  const stale=await api.networkFirstNoFallbackOnIntegrityAssets(new Request(oldUrl));
  assert.strictEqual(stale.type,'error','stale HTML generation assets must fail instead of reviving a partial legacy shell');
  assert.strictEqual(fetched.length,0,'stale generation must not fetch and mix current bytes');

  const badNavigation=new Request('https://user.github.io/foxbear-mastering-studio/bad/route',{headers:{accept:'text/html'}});
  const redirected=await api.networkFirstNavigation(badNavigation,Promise.resolve(null));
  assert.strictEqual(redirected.status,302,'bad route must redirect rather than serve index at the wrong base URL');
  assert(redirected.headers.get('location').startsWith('https://user.github.io/foxbear-mastering-studio/?'),'bad route redirect target must be the app root');
}

runtimeHardRefreshUsesScriptRoot();
exerciseServiceWorkerGenerationIsolation().then(()=>console.log('PASS v1.5.49 asset generation and route recovery smoke')).catch(error=>{console.error(error);process.exit(1);});
