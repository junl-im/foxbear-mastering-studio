#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const runtime = fs.readFileSync('src/boot/runtime-health.js', 'utf8');
const helper = fs.readFileSync('qa/browser/helpers/foxbear-e2e-helpers.js', 'utf8');
const pwa = fs.readFileSync('qa/browser/pwa-back-wakelock-sw-playwright.spec.js', 'utf8');
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

assert(runtime.includes('runtimeWarnings: []'), 'optional runtime warnings must be tracked separately');
assert(runtime.includes('isOptionalRemoteRuntimeIssue'), 'runtime issue classifier must exist');
assert(runtime.includes('firebaseIdentity && networkFailure'), 'only Firebase-like network failures may be downgraded');
assert(runtime.includes('runtimeWarnings: state.runtimeWarnings.slice()'), 'runtime report must expose optional warnings');
assert(helper.includes('[FoxBear E2E Runtime Health]'), 'critical runtime report must be printed in CI logs');
assert(helper.includes('[FoxBear E2E Optional Runtime Warnings]'), 'optional warning report must be visible without failing');
assert(helper.includes('registration has no worker'), 'service-worker readiness must inspect worker state rather than only ready promise');
assert(pwa.includes('playwright-reset'), 'wake-lock test must reset previous sentinel state');
assert(pwa.includes('navigator.serviceWorker.getRegistrations()'), 'service-worker update test must use existing registration directly');
assert(changelog.includes('# v1.5.15 - E2E Runtime Classification & Browser API Stability'), 'v1.5.15 release history missing');
console.log('PASS v1.5.15 E2E runtime classification and browser API stability smoke');
