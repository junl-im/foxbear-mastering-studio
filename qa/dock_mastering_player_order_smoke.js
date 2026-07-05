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
assert(app.includes('async function runDockRemoteMaster'), 'missing dock remote master handler');
assert(app.includes('masterTrack(track, false'), 'dock master should call masterTrack directly');
assert(app.includes('installDockRemoteDelegation'), 'missing dock remote delegated fallback');
assert(app.includes('마스터링을 시작합니다'), 'dock master start toast missing');
assert(app.includes("addEventListener('click', event => runDockRemoteMaster(event))"), 'dock master click should route through remote controller');

const waveformIndex = html.indexOf('id="bottomPreviewWaveformBtn"');
const playerIndex = html.indexOf('id="bottomPreviewPlayer"');
const controlsIndex = html.indexOf('class="bottom-preview-controls"');
const modesIndex = html.indexOf('id="bottomPreviewTranslationModes"');
assert(waveformIndex >= 0 && playerIndex > waveformIndex, 'player must be after peak waveform');
assert(controlsIndex > playerIndex, 'actions must be after player');
assert(modesIndex >= 0, 'translation modes must exist');
assert(/\.bottom-preview-controls\s*\{[\s\S]*order:\s*3/.test(dockCss), 'actions must render before translation modes by CSS order');
assert(/\.bottom-preview-translation-modes\s*\{[\s\S]*order:\s*4/.test(dockCss), 'translation modes must render after action row by CSS order');

assert(dockCss.includes('.bottom-preview-player'), 'player CSS missing');
assert(/\.bottom-preview-player\s*\{[\s\S]*order:\s*2/.test(dockCss), 'player order CSS missing');
assert(/\.bottom-preview-controls\s*\{[\s\S]*z-index:\s*3/.test(dockCss), 'controls z-index protection missing');
console.log('PASS dock mastering/player order smoke');
