#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL stage21_unified_preview_system_smoke: ${message}`);
    process.exit(1);
  }
};

const app = read('src/app.js');
const css = read('assets/css/components/preview-system.css');
const index = read('index.html');
const sw = read('sw.js');
const pkg = read('package.json');
const overwrite = read('tools/create-overwrite-zip.sh');
const version = '1.5.59-kakao-session-handoff-memory-diagnostics';

assert(index.includes(`assets/css/components/preview-system.css?v=${version}`), 'index should load preview-system.css with Stage21 cache key');
assert(sw.includes(`./assets/css/components/preview-system.css?v=${version}`), 'service worker should precache preview-system.css');
assert(sw.includes(`foxbear-shell-v${version}`), 'service worker cache should be Stage21');
assert(app.includes('realtime-unified-player-card'), 'realtime preview should use unified player card class');
assert(app.includes('createDockIntegratedWaveformPlayer(track, {'), 'realtime preview should reuse dock integrated waveform player');
assert(app.includes("seekTarget: 'local'"), 'realtime player should support local waveform seeking');
assert(app.includes('createRealtimePreviewSystemBridge'), 'realtime preview should render Dock/system bridge actions');
assert(app.includes('syncRealtimePreviewFromDock'), 'realtime preview should pull Dock transport position');
assert(app.includes('sendRealtimePreviewToDock'), 'realtime preview should send its position back to Dock');
assert(app.includes('seekRealtimePreviewToPeak'), 'realtime preview should expose peak navigation');
assert(app.includes('getAudioPlaybackPercentForWaveform'), 'shared waveform percent helper should support non-Dock players');
assert(app.includes('seekLocalWaveformAudioPercent'), 'local waveform seeking should be available for non-Dock players');
assert(css.includes('.realtime-dock-linked-player'), 'preview system CSS should style dock-linked player');
assert(css.includes('.realtime-system-bridge'), 'preview system CSS should style bridge actions');
assert(!app.includes("createPreviewPlayer(track.originalUrl, 0, track.analysis?.duration, state.abLoopMode, getTrackHighlightStart(track), { translationMode: false })"), 'legacy realtime createPreviewPlayer call should be removed');
assert(index.includes(version), 'index should use Stage21 asset version');
assert(overwrite.includes('package.json') && overwrite.includes("'v' + (p.version || 'dev')"), 'overwrite package default should be Stage21');
assert(pkg.includes('node qa/stage21_unified_preview_system_smoke.js'), 'package should include Stage21 smoke');

console.log('PASS stage21 unified preview system smoke');
