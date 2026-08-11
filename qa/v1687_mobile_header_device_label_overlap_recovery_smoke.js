#!/usr/bin/env node
'use strict';
const fs=require('fs'); const assert=require('assert');
const css=fs.readFileSync('assets/css/header-command-bar.css','utf8');
const runtime=fs.readFileSync('qa/browser/runtime-health-playwright.spec.js','utf8');
assert(/@media \(max-width: 430px\)[\s\S]*?\.brand-command-device-text\s*\{[\s\S]*?display:\s*none !important;/.test(css), '430px header must hide redundant device text');
assert(/@media \(max-width: 430px\)[\s\S]*?\.brand-command-device-icons[\s\S]*?display:\s*inline-flex;/.test(css), 'device glyphs must remain visible');
assert(runtime.includes('expect(headerSettings.rowOverlap).toBeLessThanOrEqual(1);'), 'runtime overlap gate must stay strict');
assert(runtime.includes("expect(headerSettings.deviceText).toBe('모바일 · PC 호환');"), 'accessible device text contract must remain');
console.log('PASS v1.6.87 mobile header device-label overlap recovery');
