#!/usr/bin/env node
'use strict';

const fs = require('fs');
const pkg = require('../package.json');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

const specPath = 'qa/browser/runtime-health-playwright.spec.js';
assert(fs.existsSync(specPath), 'Playwright runtime-health spec missing');
assert(pkg.scripts && pkg.scripts['qa:browser'], 'qa:browser script missing');
assert(pkg.scripts['qa:browser'].includes('playwright test'), 'qa:browser does not run Playwright');
const spec = fs.readFileSync(specPath, 'utf8');
assert(spec.includes('FoxBearRuntimeHealth.getReport'), 'spec does not inspect runtime health report');
assert(spec.includes('resourceFailures'), 'spec does not check resource failures');
assert(spec.includes('missingGlobals'), 'spec does not check missing globals');
assert(spec.includes('FOXBEAR_E2E_URL'), 'spec does not support external E2E URL override');

console.log('PASS v1.5.1 browser QA scaffold smoke');
