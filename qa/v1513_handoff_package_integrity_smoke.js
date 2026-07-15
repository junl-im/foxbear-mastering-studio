#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const overwriteScript = fs.readFileSync('tools/create-overwrite-zip.sh', 'utf8');
const verifier = fs.readFileSync('tools/verify-overwrite-zip.js', 'utf8');
const contract = JSON.parse(fs.readFileSync('HANDOFF_PACKAGE.json', 'utf8'));
const handoff = fs.readFileSync('HANDOFF.md', 'utf8');
const checklist = fs.readFileSync('RELEASE_CHECKLIST.md', 'utf8');
const stage91 = fs.readFileSync('qa/stage9_1_cumulative_overwrite_manifest_smoke.js', 'utf8');

assert(overwriteScript.includes('copy_path "playwright.config.js"'), 'overwrite ZIP must carry playwright.config.js');
assert(overwriteScript.includes('node "$ROOT_DIR/tools/verify-overwrite-zip.js" "$ZIP_PATH"'), 'overwrite ZIP creation must verify its produced archive');
assert(contract.requiredFiles.includes('playwright.config.js'), 'package contract must require playwright.config.js');
assert(contract.requiredFiles.includes('.github/workflows/pages.yml'), 'package contract must require the primary Pages workflow');
assert(contract.requiredFiles.includes('.github/workflows/pages-branch-fallback.yml'), 'package contract must require the fallback Pages workflow');
assert(contract.forbiddenArchivePrefixes.includes('node_modules/') && contract.forbiddenArchivePrefixes.includes('qa/browser-results/'), 'package contract must reject dependency and browser-result trees');
assert(verifier.includes('verify-handoff-state.js'), 'archive verifier must use the shared handoff contract preflight');
assert(stage91.includes("'playwright.config.js'"), 'cumulative overwrite manifest smoke must cover playwright.config.js');
assert(handoff.includes('playwright.config.js') && /(?:omitted|did not include|빠졌|누락)/i.test(handoff), 'handoff must document the actual transfer-package omission');
assert(checklist.includes('verify-overwrite-zip.js'), 'release checklist must require overwrite archive verification');

console.log('PASS v1.5.13 handoff and overwrite package integrity');
