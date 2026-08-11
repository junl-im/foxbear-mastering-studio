#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

const css = fs.readFileSync('assets/css/header-command-bar.css', 'utf8');
const runtime = fs.readFileSync('qa/browser/runtime-health-playwright.spec.js', 'utf8');
const repair = fs.readFileSync('tools/repair-source-hygiene.js', 'utf8');

assert(/v1\.6\.89:[\s\S]*?@media \(max-width: 430px\)[\s\S]*?\.brand-topline\.brand-command-bar\s*\{[\s\S]*?display:\s*flex !important;[\s\S]*?flex-flow:\s*row nowrap !important;/.test(css),
  'Pixel header must end in a nowrap flex ownership contract');
assert(/@media \(max-width: 430px\)[\s\S]*?\.brand-command-left\s*\{[\s\S]*?flex:\s*1 1 0 !important;[\s\S]*?width:\s*0 !important;/.test(css),
  'left mobile header rail must consume only remaining flex space');
assert(/@media \(max-width: 430px\)[\s\S]*?\.brand-command-bar \.brand-right-actions\s*\{[\s\S]*?flex:\s*0 0 auto !important;[\s\S]*?margin-left:\s*auto !important;/.test(css),
  'right mobile header rail must keep intrinsic width and own the trailing edge');
assert(runtime.includes('FOXBEAR_HEADER_OVERLAP_INITIAL'), 'initial header overlap must throw geometry diagnostics');
assert(runtime.includes('FOXBEAR_HEADER_OVERLAP_320'), '320px header overlap must throw geometry diagnostics');
assert(runtime.includes('leftRect: { left: leftRect.left, right: leftRect.right, width: leftRect.width }'), 'narrow diagnostics must record left bounds');
assert(runtime.includes('actionsRect: { left: actionsRect.left, right: actionsRect.right, width: actionsRect.width }'), 'narrow diagnostics must record action bounds');
assert(runtime.includes('.toBeLessThanOrEqual(1);'), 'strict <=1px browser overlap contract must remain');
assert(repair.includes("QUIET_GITHUB_REPAIR_PATHS = new Set(['PATCH_MANIFEST.json'])"), 'legacy manifest must be a narrow quiet-repair exception');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'foxbear-v1689-hygiene-'));
try {
  fs.writeFileSync(path.join(temp, 'PATCH_MANIFEST.json'), '{}\n');
  const result = spawnSync(process.execPath, [path.resolve('tools/repair-source-hygiene.js'), '--root', temp], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_ACTIONS: 'true',
      FOXBEAR_ALLOW_CI_HYGIENE_REPAIR: '1',
      FOXBEAR_HYGIENE_REPAIR_CONTEXT: 'v1689-regression'
    }
  });
  const output = `${result.stdout}\n${result.stderr}`;
  assert.strictEqual(result.status, 0, output);
  assert(!fs.existsSync(path.join(temp, 'PATCH_MANIFEST.json')), 'legacy manifest must still be removed');
  assert(!output.includes('::warning file=PATCH_MANIFEST.json'), 'legacy manifest cleanup must not create a warning annotation');
  assert(output.includes('retired known legacy path without annotation: PATCH_MANIFEST.json'), 'quiet cleanup must remain visible in plain CI logs');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('PASS v1.6.89 mobile header flex ownership + CI diagnostics regression');
