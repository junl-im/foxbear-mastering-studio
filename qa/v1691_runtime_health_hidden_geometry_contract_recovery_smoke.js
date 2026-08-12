#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');

const runtime = fs.readFileSync('qa/browser/runtime-health-playwright.spec.js', 'utf8');
const headerCss = fs.readFileSync('assets/css/header-command-bar.css', 'utf8');

assert(runtime.includes("const studioIsVisible = headerSettings.studioDisplay !== 'none' && headerSettings.studioVisibleWidth > 0;"),
  'Runtime Health must distinguish visible studio geometry from display:none zero-DOMRect geometry');
assert(runtime.includes('compact header visible rail device→actions'),
  'compact Runtime Health must compare the last visible left token with the action rail');
assert(!/expect\(headerSettings\.deviceRight\)\.toBeLessThanOrEqual\(headerSettings\.studioLeft \+ 1\);/.test(runtime),
  'hidden studio left=0 must never be used by an unconditional device→studio assertion');
assert(runtime.includes('FOXBEAR_HEADER_OVERLAP_INITIAL') && runtime.includes('FOXBEAR_HEADER_OVERLAP_320'),
  'strict overlap diagnostics must remain in place after fixing hidden-element geometry');
assert(runtime.includes('.toBeLessThanOrEqual(1);'),
  'strict <=1px overlap contract must remain unchanged');
assert(headerCss.includes('--foxbear-header-contract: flex-two-rail-v1690'),
  'v1.6.93 product header CSS contract must remain unchanged by this test-only recovery');

// Exact CI signature: a visible device coordinate was incorrectly compared with
// the zero DOMRect of a display:none Studio token. The corrected compact
// contract compares the last visible left token with the right action rail.
const observedCompact = { deviceRight: 91.96875, studioLeft: 0, actionsLeft: 268 };
assert(observedCompact.deviceRight > observedCompact.studioLeft + 1,
  'historical hidden-studio comparison must reproduce the false Expected <= 1 signature');
assert(observedCompact.deviceRight <= observedCompact.actionsLeft + 1,
  'correct compact visible-rail comparison must accept the same observed device coordinate');

console.log('PASS v1.6.91 Runtime Health hidden-element geometry contract recovery smoke');
