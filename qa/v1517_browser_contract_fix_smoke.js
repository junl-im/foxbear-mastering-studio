#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/mobile-native.css'), 'utf8');

assert(
  app.includes("const SERVICE_WORKER_URL = `./sw.js?v=${FoxBearBuildInfo.assetVersion")
    && /TRUSTED_SCRIPT_PATHS = Object\.freeze\(\[[\s\S]*SERVICE_WORKER_URL/.test(app),
  'service worker URL is not part of the Trusted Types script allowlist'
);
assert(
  app.includes('navigator.serviceWorker.register(resolveFoxBearScriptUrl(SERVICE_WORKER_URL))'),
  'service worker registration does not pass a TrustedScriptURL under the enforced CSP'
);
assert(
  app.includes("if (!auto && options.arm !== false) mobile.wakeLockDesired = true;"),
  'manual Wake Lock requests are not armed against immediate idle synchronization release'
);
assert(
  /\.header-settings-host\s*\{[\s\S]*?order:\s*3;[\s\S]*?\}/.test(css),
  'header settings host is not ordered to the right of the designer card'
);

console.log('PASS v1.5.17 browser contract fix: Trusted Types SW, manual Wake Lock, header order');
