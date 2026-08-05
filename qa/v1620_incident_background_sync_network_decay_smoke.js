'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
assert.strictEqual(pkg.version, '1.6.63');
assert.match(pkg.foxbearRelease.buildId, /^[a-z0-9][a-z0-9-]*$/);
assert.strictEqual(pkg.foxbearRelease.assetVersion, `${pkg.version}-${pkg.foxbearRelease.buildId}`);

function load(file, context) { vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }); }
const listeners = {};
const timers = [];
const document = { visibilityState: 'visible', addEventListener(type, fn){ listeners[type]=fn; }, removeEventListener(type){ delete listeners[type]; } };
let syncs = 0;
const mailContext = { document, Date, console, setTimeout(fn, ms){ timers.push({fn,ms}); return timers.length; }, clearTimeout(){}, globalThis: null };
mailContext.globalThis=mailContext;
load('src/boot/incident-mail-sync-service.js', mailContext);
const svc = mailContext.FoxBearIncidentMailSync;
const active = [{ reportId:'r1', status:'pending', terminal:false }];
assert.strictEqual(svc.plan(active, Date.now(), ()=>({remainingMs:0}), {hidden:false}).delayMs, 15000);
assert.strictEqual(svc.plan(active, Date.now(), ()=>({remainingMs:0}), {hidden:true}).delayMs, 60000);
const controller = svc.createController({ document, setTimeout: mailContext.setTimeout, clearTimeout(){} });
controller.schedule(active, { lastSyncAt: 0, retryAvailability:()=>({remainingMs:0}), sync: async()=>{syncs++;}, render(){} });
document.visibilityState='visible';
Promise.resolve(listeners.visibilitychange()).then(()=>{
  assert.strictEqual(syncs, 1, 'visible resume should sync active mail immediately');
  controller.dispose();

  const store = new Map();
  let effectiveType = '4g';
  const routeContext = { Date, console, navigator:{onLine:true, connection:{get effectiveType(){return effectiveType;}, type:'wifi', saveData:false}}, localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}, globalThis:null };
  routeContext.globalThis=routeContext;
  load('src/boot/incident-route-policy.js', routeContext);
  const route = routeContext.FoxBearIncidentRoutePolicy;
  for(let i=0;i<6;i++) route.recordSuccess('callable');
  for(let i=0;i<4;i++) route.recordFailure('hosting-rewrite', {code:'unavailable'});
  const before = route.getHealth();
  effectiveType='3g';
  const after = route.getHealth();
  assert(after.networkChangedAt, 'network change should be recorded');
  assert(after.routes.callable.successes <= Math.floor(before.routes.callable.successes * 0.5), 'old route score should decay after network change');
  assert.strictEqual(after.routes['hosting-rewrite'].coolingDown, false, 'network change should clear stale cooldown');
  console.log('v1.6.20 background sync and network decay smoke passed');
}).catch(error=>{ console.error(error); process.exitCode=1; });
