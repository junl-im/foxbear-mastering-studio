'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const pkg = JSON.parse(read('package.json'));
const index = read('index.html');
const hosting = JSON.parse(read('firebase.json'));
const sw = read('sw.js');
const firebase = read('src/firebase-bootstrap.js');
const bootstrapSource = read('src/security/trusted-types-bootstrap.js');
const hostingHeaders = hosting.hosting.headers.find(entry => entry.source === '**')?.headers || [];
const header = name => hostingHeaders.find(item => item.key === name)?.value || '';
const indexCsp = index.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] || '';
const hostingCsp = header('Content-Security-Policy');

assert(pkg.version === '1.6.108', 'package version must be 1.6.108');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.foxbearRelease?.buildId || ''), 'release build id must remain kebab-case');
assert(index.includes('src/security/trusted-types-bootstrap.js'), 'Trusted Types bootstrap must be loaded by index.html');
assert(index.indexOf('src/security/trusted-types-bootstrap.js') < index.indexOf('src/firebase-bootstrap.js'), 'Trusted Types bootstrap must run before Firebase Auth');
assert(indexCsp.includes("trusted-types foxbear default"), 'document CSP must allow the narrow default Trusted Types policy');
assert(hostingCsp.includes("trusted-types foxbear default"), 'Hosting CSP must allow the narrow default Trusted Types policy');
assert(indexCsp.includes('script-src \'self\' https://apis.google.com'), 'document CSP must allow the Firebase Auth Google API loader');
assert(hostingCsp.includes('script-src \'self\' https://apis.google.com'), 'Hosting CSP must allow the Firebase Auth Google API loader');
assert(hostingCsp.includes('frame-src') && hostingCsp.includes('https://foxbear-music.firebaseapp.com') && hostingCsp.includes('https://accounts.google.com'), 'Hosting CSP must allow Firebase Auth iframe/account origins');
assert(header('Cross-Origin-Opener-Policy') === 'same-origin-allow-popups', 'Google Auth popup flow requires same-origin-allow-popups');
assert(sw.includes("'./src/security/trusted-types-bootstrap.js'"), 'service worker must precache the Trusted Types bootstrap');
assert(firebase.includes("normalized.code = trustedTypesBlocked ? 'auth/trusted-types-blocked'"), 'Firebase bridge must normalize stale Trusted Types failures');

let capturedPolicyName = '';
let capturedRules = null;
const context = {
    URL,
    console,
    location: {
        origin: 'https://foxbear.example',
        href: 'https://foxbear.example/index.html'
    },
    document: {
        baseURI: 'https://foxbear.example/index.html'
    },
    trustedTypes: {
        createPolicy(name, rules) {
            capturedPolicyName = name;
            capturedRules = rules;
            return Object.freeze({ createScriptURL: rules.createScriptURL });
        }
    }
};
context.window = context;
context.globalThis = context;
vm.runInNewContext(bootstrapSource, context, { filename: 'trusted-types-bootstrap.js' });

assert(capturedPolicyName === 'default', 'bootstrap must install the Trusted Types default policy');
assert(typeof capturedRules?.createScriptURL === 'function', 'default policy must define createScriptURL');
assert(context.FoxBearTrustedTypesBootstrap?.installed === true, 'Trusted Types bootstrap diagnostics must report installation');

const gapiUrl = 'https://apis.google.com/js/api.js?onload=__iframefcb123';
assert(capturedRules.createScriptURL(gapiUrl) === gapiUrl, 'Firebase Auth gapi loader URL must be allowed');
assert(capturedRules.createScriptURL('https://foxbear.example/src/firebase-bootstrap.js').includes('/src/firebase-bootstrap.js'), 'same-origin application scripts must be allowed');
assert(!indexCsp.includes('recaptcha'), 'document CSP must not include App Check reCAPTCHA origins');
assert(!hostingCsp.includes('recaptcha'), 'Hosting CSP must not include App Check reCAPTCHA origins');
assert(!hostingCsp.includes('firebaseappcheck.googleapis.com'), 'Hosting CSP must not include App Check API');

for (const blocked of [
    'https://www.google.com/recaptcha/enterprise.js?render=site-key',
    'https://www.gstatic.com/recaptcha/releases/test/recaptcha__ko.js',
    'https://evil.example/steal.js',
    'https://apis.google.com/js/evil.js',
    'https://foxbear.example/uploads/untrusted.js'
]) {
    let rejected = false;
    try { capturedRules.createScriptURL(blocked); } catch (error) { rejected = error instanceof TypeError || error?.name === 'TypeError'; }
    assert(rejected, `untrusted script URL must be rejected: ${blocked}`);
}

console.log('v1.6.43 Google Auth Trusted Types/CSP recovery smoke passed');
