#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const sw = read('sw.js');
const worker = read('src/workers/zip-encoder.worker.js');
const functionsSource = read('functions/index.js');
const firebaseSource = read('src/firebase-bootstrap.js');
assert.strictEqual(pkg.version, '1.6.110');
const jsZipUrl = `vendor/jszip/jszip.min.js?v=${pkg.foxbearRelease.assetVersion}&lib=3.10.1`;
assert(!index.includes(jsZipUrl), 'JSZip must not be eagerly loaded on the main thread');
assert(sw.includes(`./${jsZipUrl}`), 'JSZip must remain available in the SW cache for ZIP worker startup');
assert(worker.includes(`../../${jsZipUrl}`), 'ZIP worker must remain the only runtime owner of JSZip');
const initialScripts = [...index.matchAll(/<script\b[^>]+src="([^"]+)"/g)].map(m => m[1]);
assert(initialScripts.length <= 93, `initial script budget regressed: ${initialScripts.length}`);
assert(!functionsSource.includes("smtpResponse: cleanText(outcome.response || '', 300)"), 'incident report documents must not persist raw SMTP response text');
assert(!functionsSource.includes("recipient: cleanText(outcome.recipient || ALERT_RECIPIENT, 180)"), 'incident report documents must not persist operations recipient');
assert(!firebaseSource.includes("recipient: limitText(delivery.recipient || '', 180)"), 'public Firestore fallback must not expose operations recipient');
assert(!firebaseSource.includes("smtpResponse: limitText(delivery.smtpResponse || '', 300)"), 'public Firestore fallback must not expose SMTP response text');
let exported;
const sandbox = {
  module: { exports: {} }, exports: {}, console, Date, Math, Object, String, Number, Boolean, Array, Map, Set, RegExp, Error, URL,
  AbortController, setTimeout, clearTimeout, fetch: async () => ({ ok: true, status: 204, headers: { get: () => null }, text: async () => '' }),
  process: { env: {} },
  require(request) {
    if (request === 'firebase-functions/v2/firestore') return { onDocumentCreated: (o,h)=>({o,h}) };
    if (request === 'firebase-functions/v2/scheduler') return { onSchedule: (o,h)=>({o,h}) };
    if (request === 'firebase-functions/v2/https') return { onCall: (o,h)=>({o,h}), HttpsError: class HttpsError extends Error {} };
    if (request === 'firebase-functions/params') return { defineSecret: () => ({ value: () => 'secret' }) };
    if (request === 'firebase-admin/app') return { initializeApp() {} };
    if (request === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp:()=>({}), delete:()=>({}) }, Timestamp: { fromMillis:v=>({toMillis:()=>v}) }, getFirestore:()=>({collection:()=>({})}) };
    if (request === 'nodemailer') return { createTransport:()=>({ verify:async()=>true, sendMail:async()=>({}), close(){} }) };
    if (request === 'node:crypto') return { randomUUID:()=> '00000000-0000-4000-8000-000000000000' };
    if (request === './app-check-policy') return require(path.join(root,'functions/app-check-policy.js'));
    throw new Error(`unexpected require: ${request}`);
  }
};
sandbox.exports=sandbox.module.exports;
vm.runInNewContext(functionsSource, sandbox, { filename: 'functions/index.js' });
exported=sandbox.module.exports.__test;
const serialized=exported.serializeIncidentDelivery({ exists:true, data:()=>({delivery:{status:'emailed',recipient:'ops@example.com',smtpResponse:'250 SMTP detail',messageId:'id-1'}}) });
assert.strictEqual(serialized.status,'emailed');
assert.strictEqual(serialized.messageId,'id-1');
assert(!Object.prototype.hasOwnProperty.call(serialized,'recipient'));
assert(!Object.prototype.hasOwnProperty.call(serialized,'smtpResponse'));
console.log('PASS v1.6.97 boot payload and incident delivery privacy hardening');
