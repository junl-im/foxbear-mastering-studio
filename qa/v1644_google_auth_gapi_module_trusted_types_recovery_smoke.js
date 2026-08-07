'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const pkg = JSON.parse(read('package.json'));
const bootstrapSource = read('src/security/trusted-types-bootstrap.js');
const firebaseSource = read('src/firebase-bootstrap.js');
const index = read('index.html');
const hosting = JSON.parse(read('firebase.json'));
const hostingCsp = hosting.hosting.headers
    .find(entry => entry.source === '**')?.headers
    .find(entry => entry.key === 'Content-Security-Policy')?.value || '';

assert(pkg.version === '1.6.73', 'package version must be 1.6.73');
assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.foxbearRelease?.buildId || ''), 'release build id must remain kebab-case');
assert(bootstrapSource.includes("FIREBASE_AUTH_GAPI_MODULE_PATH_PREFIX = '/_/scs/apps-static/_/js/'"), 'Trusted Types bootstrap must declare the narrow gapi module path');
assert(firebaseSource.includes('허용되지 않은 동적 스크립트 URL'), 'Firebase error normalization must recognize FoxBear Trusted Types rejections');
assert(index.includes('https://apis.google.com'), 'document CSP must keep the Google API origin');
assert(hostingCsp.includes('https://apis.google.com'), 'Hosting CSP must keep the Google API origin');

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
            assert(name === 'default', 'bootstrap must install the default policy');
            capturedRules = rules;
            return Object.freeze({ createScriptURL: rules.createScriptURL });
        }
    }
};
context.window = context;
context.globalThis = context;
vm.runInNewContext(bootstrapSource, context, { filename: 'trusted-types-bootstrap.js' });

assert(typeof capturedRules?.createScriptURL === 'function', 'default policy must expose createScriptURL');
const loaderUrl = 'https://apis.google.com/js/api.js?onload=__iframefcb123456';
assert(capturedRules.createScriptURL(loaderUrl) === loaderUrl, 'Firebase Auth gapi bootstrap loader must remain allowed');

const moduleUrl = 'https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.ko.test.O/m=gapi_iframes,gapi_iframes_style_common/rt=j/sv=1/d=1/ed=1/am=AQ/rs=test/cb=gapi.loaded_0';
assert(capturedRules.createScriptURL(moduleUrl) === moduleUrl, 'gapi iframe module script generated after api.js must be allowed');

for (const blocked of [
    'https://apis.google.com/_/scs/abc-static/_/js/k=unrelated/cb=bad',
    'https://apis.google.com/_/scs/apps-static/_/html/untrusted.js',
    'https://apis.google.com/js/evil.js',
    'https://evil.example/_/scs/apps-static/_/js/steal.js'
]) {
    let rejected = false;
    try {
        capturedRules.createScriptURL(blocked);
    } catch (error) {
        rejected = /허용되지 않은 동적 스크립트 URL/.test(String(error?.message || error));
    }
    assert(rejected, `unapproved dynamic script URL must remain blocked: ${blocked}`);
}

const secretQueryUrl = 'https://evil.example/untrusted.js?token=do-not-copy';
try { capturedRules.createScriptURL(secretQueryUrl); } catch (error) {}
const diagnostic = context.FoxBearTrustedTypesBootstrap?.getLastRejectedScriptUrl?.() || '';
assert(diagnostic === 'https://evil.example/untrusted.js', 'diagnostics must retain origin/path without leaking query parameters');

console.log('v1.6.44 Google Auth gapi module Trusted Types recovery smoke passed');
