#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL stage27_waveform_control_service_smoke: ${message}`);
    process.exit(1);
  }
};

const version = '1.5.14-github-desktop-handoff-preflight';
const index = read('index.html');
const sw = read('sw.js');
const pkg = read('package.json');
const app = read('src/app.js');
const service = read('src/audio/waveform-control-service.js');
const runtime = read('src/boot/runtime-health.js');
const overwrite = read('tools/create-overwrite-zip.sh');
const handoff = read('HANDOFF.md');
const notes = read('PROJECT_NOTES.md');

assert(index.includes(`src/audio/waveform-control-service.js?v=${version}`), 'waveform control service should be loaded in index');
assert(sw.includes(`./src/audio/waveform-control-service.js?v=${version}`), 'service worker should precache waveform control service');
assert(sw.includes(`foxbear-shell-v${version}`), 'service worker should use Stage27 cache key');
assert(pkg.includes('node --check src/audio/waveform-control-service.js'), 'package should syntax-check waveform service');
assert(pkg.includes('node qa/stage27_waveform_control_service_smoke.js'), 'package should run Stage27 smoke');
assert(overwrite.includes('package.json') && overwrite.includes("'v' + (p.version || 'dev')"), 'overwrite default should be Stage28 or later');

[
  'FoxBearWaveformControlService',
  'pointerToPercent',
  'audioPercentToVisualPercent',
  'setPlayhead',
  'seekAudioToPercent',
  'findStrongestPeakPercent',
  'renderBars',
  'stampManagedElement'
].forEach(token => assert(service.includes(token), `service should expose ${token}`));

assert(app.includes('window.FoxBearWaveformControlService'), 'app should delegate waveform logic to service');
assert(app.includes('service.pointerToPercent(event, element)'), 'pointer mapping should use service');
assert(app.includes('service.setPlayhead(element, percent, playing)'), 'playhead updates should use service');
assert(app.includes('service.seekAudioToPercent(audio, pct * 100, duration)'), 'local waveform seek should use service');
assert(app.includes('service.findStrongestPeakPercent(values)'), 'peak jump should use service');
assert(app.includes('createManagedWaveformBars'), 'Dock waveform bars should be created through managed waveform view helper');
assert(app.includes('role: `ab-${mode}`'), 'A/B waveform bars should still carry managed role metadata');
assert(runtime.includes('FoxBearWaveformControlService.setPlayhead'), 'runtime health should require waveform service');
assert(handoff.includes('Stage27') && handoff.includes('다음 대화 인수인계'), 'handoff should include Stage27 next-chat handoff');
assert(notes.includes('Stage27') && notes.includes('waveform-control-service'), 'project notes should mention Stage27 waveform service');

console.log('PASS stage27 waveform control service smoke');
