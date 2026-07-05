#!/usr/bin/env node
const fs = require('fs');

const app = fs.readFileSync('src/app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const dockCss = fs.readFileSync('assets/css/dock.css', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL dock mastering/player order smoke: ${message}`);
    process.exit(1);
  }
}

assert(app.includes('function getBottomPreviewDockTrack()'), 'missing dock track resolver');
assert(app.includes('clearStaleBusyFlagIfIdle('), 'missing stale busy recovery');
assert(app.includes('isDockMasteringBusyBlocked()'), 'missing scoped dock busy guard');
assert(app.includes("state.selectedId = track.id;\n    state.bottomPreviewTrackId = track.id;"), 'dock master does not force current dock track');
assert(app.includes('마스터링을 시작합니다'), 'dock master start toast missing');
assert(app.includes("addEventListener('click', event => masterBottomPreviewTrack(event))"), 'dock master click does not pass event');

const waveformIndex = html.indexOf('id="bottomPreviewWaveformBtn"');
const playerIndex = html.indexOf('id="bottomPreviewPlayer"');
const modesIndex = html.indexOf('id="bottomPreviewTranslationModes"');
const controlsIndex = html.indexOf('class="bottom-preview-controls"');
assert(waveformIndex >= 0 && playerIndex > waveformIndex, 'player must be after peak waveform');
assert(modesIndex > playerIndex, 'translation modes must be after player');
assert(controlsIndex > modesIndex, 'actions must remain after translation modes');

assert(dockCss.includes('v1.3.68 Dock mastering click path'), 'missing v1.3.68 dock CSS note');
assert(/\.bottom-preview-player\s*\{[\s\S]*order:\s*2/.test(dockCss), 'player order CSS missing');
assert(/\.bottom-preview-controls\s*\{[\s\S]*z-index:\s*3/.test(dockCss), 'controls z-index protection missing');
console.log('PASS dock mastering/player order smoke');
