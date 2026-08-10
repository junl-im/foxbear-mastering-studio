#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('assets/css/header-command-bar.css', 'utf8');
const runtime = fs.readFileSync('qa/browser/runtime-health-playwright.spec.js', 'utf8');

assert(/\.brand-command-bar \.designer-mini \{[\s\S]*?order:\s*0\s*!important;/.test(css),
  'header command bar must neutralize the legacy designer order so DOM order stays designer -> mode -> settings');
assert(/@media \(max-width:\s*430px\)[\s\S]*?\.brand-command-bar \.designer-mini \{[\s\S]*?display:\s*none\s*!important;/.test(css),
  'Pixel-class header must retire the nonessential creator token before it compresses the left status group');
assert(runtime.includes('expect(headerSettings.modeSwitchLeft).toBeGreaterThanOrEqual(headerSettings.designerRight - 2);'),
  'runtime browser sentinel must keep checking desktop visual order');
assert(runtime.includes('expect(headerSettings.rowOverlap).toBeLessThanOrEqual(1);'),
  'runtime browser sentinel must keep checking mobile header overlap');
assert(runtime.includes('expect(narrowHeader.leftOverflow).toBeLessThanOrEqual(2);'),
  'runtime browser sentinel must keep checking 320px overflow');

console.log('PASS v1.6.86 header order + mobile overflow browser gate regression checks');
