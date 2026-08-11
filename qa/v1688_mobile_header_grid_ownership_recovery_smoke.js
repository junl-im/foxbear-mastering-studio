#!/usr/bin/env node
'use strict';
const fs = require('fs');
const assert = require('assert');
const css = fs.readFileSync('assets/css/header-command-bar.css', 'utf8');
const runtime = fs.readFileSync('qa/browser/runtime-health-playwright.spec.js', 'utf8');
assert(/\.brand-command-left\s*\{[\s\S]*?grid-column:\s*1 \/ 2 !important;[\s\S]*?width:\s*auto !important;[\s\S]*?min-width:\s*0 !important;[\s\S]*?max-width:\s*100% !important;/.test(css), 'left command rail must own grid column 1 and neutralize legacy width:100%');
assert(/\.brand-command-bar \.brand-right-actions\s*\{[\s\S]*?grid-column:\s*2 \/ 3 !important;[\s\S]*?justify-self:\s*end !important;[\s\S]*?width:\s*auto !important;/.test(css), 'right actions must own grid column 2');
assert(/@media \(max-width: 430px\)[\s\S]*?\.brand-command-left\s*\{[\s\S]*?grid-column:\s*1 \/ 2 !important;[\s\S]*?width:\s*auto !important;/.test(css), 'compact header must reassert left grid ownership');
assert(runtime.includes('initial header overlap · viewport='), 'initial Runtime Health overlap failure must identify its viewport');
assert(runtime.includes('320px header overlap · viewport='), 'narrow Runtime Health overlap failure must identify its viewport');
assert(runtime.includes('.toBeLessThanOrEqual(1);'), 'strict <=1px overlap contract must remain');
console.log('PASS v1.6.88 mobile header grid ownership recovery');
