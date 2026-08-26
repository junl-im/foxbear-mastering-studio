#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const worker = fs.readFileSync('src/workers/analysis.worker.js', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const serviceSource = fs.readFileSync('src/audio/reference-profile-service.js', 'utf8');

assert.match(worker, /spectrumProfile64:\s*spectrum\.spectrumProfile64/);
assert.match(worker, /makeLogSpectrumProfile\(avgPower, sampleRate, fftSize, totalPower, 64\)/);
assert.match(worker, /24-band compatibility \+ 64-band log reference profile/);
assert.match(app, /spectrumProfile64Source:\s*'analysis'/);
assert.match(app, /spectrumProfile64Source:\s*'blended-reference'/);
assert.match(app, /highResolutionReference/);
assert.match(app, /highResolutionAnalysis/);
assert.match(app, /resolution:\s*64/);
assert.match(app, /resolution:\s*24/);

const context = { window: {} };
vm.createContext(context);
vm.runInContext(serviceSource, context);
const service = context.window.FoxBearReferenceProfileService;
assert.ok(service);
const bands = service.createLogBands(64, 20, 20000);
assert.equal(bands.length, 64);
assert.equal(bands[0].fromHz, 20);
assert.equal(bands.at(-1).toHz, 20000);
const profile = service.makeProfileFromBands({ bass: 0.3, lowMid: 0.2, mid: 0.3, high: 0.2 }, 64);
assert.equal(profile.length, 64);
assert.ok(Math.abs(profile.reduce((sum, value) => sum + value, 0) - 1) < 1e-4);

console.log('PASS v1.6.114 64-band uploaded-reference profile upgrade');
