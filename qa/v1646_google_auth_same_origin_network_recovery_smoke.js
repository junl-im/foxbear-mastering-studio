#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const firebaseJson = JSON.parse(read('firebase.json'));
const firebase = read('src/firebase-bootstrap.js');
const controller = read('src/ui/admin-access-controller.js');
const index = read('index.html');
const setup = read('FIREBASE_SETUP.md');

assert(Number(pkg.version.split('.').join('')) >= 1646);
assert(firebase.includes("const FIREBASE_DEFAULT_AUTH_DOMAIN = 'foxbear-music.firebaseapp.com';"));
assert(firebase.includes("'foxbear-music.web.app'"));
assert(firebase.includes('function resolveFirebaseAuthDomain()'));
assert(firebase.includes('authDomain: resolveFirebaseAuthDomain()'));
assert(firebase.includes('FIREBASE_HOSTING_AUTH_DOMAINS.has(currentHost)'));
assert(firebase.includes("'auth/network-request-failed'"));
assert(firebase.includes('beginAdminGoogleRedirect(provider, error)'));
assert(firebase.includes("'auth/redirect-loop-prevented'"));
assert(firebase.includes("'auth/redirect-result-missing'"));
assert(firebase.includes('getAdminAuthDiagnostics: () => bridgeState.adminAuthDiagnostics'));
assert(firebase.includes('rejectedScriptUrl'));
const diagnosticSection = firebase.slice(firebase.indexOf('function recordAdminAuthDiagnostics'), firebase.indexOf('function clearAdminAuthDiagnostics'));
assert(!diagnosticSection.includes('query'));
assert(!diagnosticSection.includes('location.search'));

assert(controller.includes('Firebase Hosting 보안 주소 복구를 사용합니다.'));
assert(firebase.includes("if (isFirebaseHostingAdminOrigin() && typeof getRedirectResult === 'function')"));
assert(controller.includes('authDomain=${authDomain}'));
assert(controller.includes('getAdminAuthDiagnostics'));
assert(controller.includes("code === 'redirect-result-missing' || code === 'redirect-loop-prevented'"));

const metaCsp = index.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/i)?.[1] || '';
const headerCsp = firebaseJson.hosting.headers
  .flatMap(item => item.headers || [])
  .find(header => header.key === 'Content-Security-Policy')?.value || '';
for (const csp of [metaCsp, headerCsp]) {
  assert(csp.includes("frame-src 'self' https://foxbear-music.web.app https://foxbear-music.firebaseapp.com https://accounts.google.com"));
  assert(csp.includes("connect-src 'self' https://foxbear-music.web.app https://foxbear-music.firebaseapp.com"));
}
assert(setup.includes('https://foxbear-music.web.app/__/auth/handler'));
assert(setup.includes('OAuth 2.0 클라이언트'));

console.log('PASS v1.6.46 Google Auth same-origin and network recovery smoke');
