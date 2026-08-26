#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const firebase = read('src/firebase-bootstrap.js');
const controller = read('src/ui/admin-access-controller.js');
const app = read('src/app.js');
const runtimeHealth = read('src/boot/runtime-health.js');
const setup = read('FIREBASE_SETUP.md');

{ const [major, minor, patch] = pkg.version.split('.').map(Number); assert(major > 1 || (major === 1 && (minor > 6 || (minor === 6 && patch >= 47)))); }
assert(firebase.includes("const FIREBASE_SECURE_ADMIN_ORIGIN = 'https://foxbear-music.web.app';"));
assert(firebase.includes("mode: isFirebaseHostingAdminOrigin() ? 'firebase-hosting' : 'external-popup'"));
assert(firebase.includes('getSecureAdminLaunchUrl'));
assert(firebase.includes('async function waitForGoogleAdminUser'));
assert(firebase.includes('const recoveredUser = await waitForGoogleAdminUser()'));
assert(firebase.includes("if (!isFirebaseHostingAdminOrigin()) throw makeSecureOriginRequiredError(sourceError)"));
assert(firebase.includes("if (isFirebaseHostingAdminOrigin() && typeof getRedirectResult === 'function')"));
assert(firebase.includes("error.code = 'auth/secure-origin-required'"));

function loadFirebaseBridge(hostname) {
  const location = {
    hostname,
    protocol: 'https:',
    origin: `https://${hostname}`,
    href: `https://${hostname}/`
  };
  const window = {
    location,
    navigator: { onLine: true },
    requestIdleCallback() {},
    dispatchEvent() {},
    setTimeout,
    clearTimeout,
    console
  };
  const context = {
    window,
    location,
    navigator: window.navigator,
    requestIdleCallback: window.requestIdleCallback,
    setTimeout,
    clearTimeout,
    URL,
    Date,
    Set,
    Object,
    Promise,
    console,
    CustomEvent: class CustomEvent {}
  };
  window.window = window;
  window.globalThis = context;
  context.globalThis = context;
  vm.runInNewContext(firebase, context, { filename: 'firebase-bootstrap.js' });
  return window.FoxBearFirebase;
}

const external = loadFirebaseBridge('jurl-img.github.io');
assert.strictEqual(external.authDomain, 'foxbear-music.firebaseapp.com');
assert.strictEqual(external.adminAuth.mode, 'external-popup');
assert.strictEqual(external.adminAuth.onSecureOrigin, false);
assert.strictEqual(external.adminAuth.redirectSupported, false);
assert.strictEqual(new URL(external.getSecureAdminLaunchUrl()).origin, 'https://foxbear-music.web.app');
assert.strictEqual(new URL(external.getSecureAdminLaunchUrl()).searchParams.get('foxbearAdmin'), '1');

const secure = loadFirebaseBridge('foxbear-music.web.app');
assert.strictEqual(secure.authDomain, 'foxbear-music.web.app');
assert.strictEqual(secure.adminAuth.mode, 'firebase-hosting');
assert.strictEqual(secure.adminAuth.onSecureOrigin, true);
assert.strictEqual(secure.adminAuth.redirectSupported, true);

assert(controller.includes("const SECURE_ADMIN_MARKER = 'foxbearAdmin'"));
assert(controller.includes("reason: 'admin-secure-origin-recovery'"));
assert(controller.includes("target.hostname !== 'foxbear-music.web.app'"));
assert(controller.includes("global.location.assign(secureUrl)"));
assert(controller.includes('consumeSecureAdminLaunchMarker()'));
assert(controller.includes('GitHub Pages 주소에서는 Google 팝업을 먼저 시도'));

assert(app.includes("window.addEventListener('error', handleGlobalWindowError)"));
assert(app.includes('function isOpaqueExternalScriptErrorEvent'));
assert(app.includes("/^Script error\\.?$/i"));
assert(app.includes('OPAQUE_EXTERNAL_SCRIPT_ERROR'));
assert(runtimeHealth.includes('function isOpaqueExternalRuntimeIssue'));
assert(runtimeHealth.includes('isOpaqueExternalRuntimeIssue(issue) || isOptionalRemoteRuntimeIssue(issue)'));

assert(setup.includes('GitHub Pages'));
assert(setup.includes('Firebase Hosting 보안 주소'));
assert(setup.includes('signInWithRedirect'));

console.log('PASS v1.6.47 external-host admin auth and opaque script-error recovery smoke');
