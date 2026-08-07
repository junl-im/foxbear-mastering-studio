#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
};

const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const index = read('index.html');
const sw = read('sw.js');
const spectrum = read('src/ui/spectrum-visualizer.js');
const spectrumCss = read('assets/css/spectrum-visualizer.css');
const studioCss = read('assets/css/studio.css');
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');

must(pkg.version === '1.6.76', 'package version should be 1.6.76');
must(app.includes("const APP_VERSION = 'Pro v1.6.76'"), 'app version should be Pro v1.6.76');
must(index.includes('data-build="1.6.76"'), 'index build marker should be 1.6.76');
must(index.includes('1.6.76-download-viewport-runtime-fault-diagnostics'), 'index asset key should be v1.6.76 cache key');
must(sw.includes('foxbear-shell-v1.6.76-download-viewport-runtime-fault-diagnostics'), 'service worker cache should be bumped');

must(app.includes('PLAYBACK_CROSSFADE_MS = 140'), 'crossfade duration constant missing');
must(app.includes('function crossfadeAudioPair'), 'crossfade pair helper missing');
must(app.includes('function playAudioWithFadeIn'), 'fade-in helper missing');
must(app.includes('function pauseAudioWithFadeOut'), 'fade-out helper missing');
must(app.includes('allowAudioElements'), 'exclusive playback should allow crossfade overlap');
must(app.includes('pendingCrossfade'), 'Dock source transition crossfade path missing');
must(app.includes('crossfadeAudioPair(oldAudio, nextAudio, { userGesture:'), 'A/B switch gesture-safe crossfade path missing');

must(!index.includes('id="bottomPreviewSpectrum"'), 'Dock mini spectrum host should be removed in v1.6.76');
must(!app.includes('bottomPreviewSpectrum'), 'Dock mini spectrum element should not be cached in app refs');
must(!app.includes('function renderBottomMiniSpectrum'), 'Dock mini spectrum renderer should be removed');
must(!spectrumCss.includes('.spectrum-mini-panel'), 'Dock mini spectrum CSS should be removed');
must(spectrum.includes('function renderPanel'), 'detail spectrum panel should remain available');
must(spectrum.includes('if (!hasRenderableCanvas())'), 'spectrum visualizer should skip live work when no canvas is mounted');

must(app.includes('function enhanceWaveformRowZoom'), 'detail waveform zoom enhancer missing');
must(app.includes('onDoubleTapZoom'), 'double-tap zoom handler missing');
must(app.includes('pinchStart'), 'pinch zoom state missing');
must(app.includes('waveformZoomEnabled'), 'waveform zoom dataset missing');
must(studioCss.includes('.waveform-zoom-controls'), 'waveform zoom CSS missing');

['KakaoTalk', 'Chrome Android', 'Safari iOS', 'PWA', 'beforeunload', 'popstate'].forEach(token => {
  must(matrix.includes(token), `browser back QA matrix missing ${token}`);
});
must(pkg.qaChecks.includes('node qa/v142_crossfade_zoom_spectrum_smoke.js'), 'v1.6.76 smoke should be in package qaChecks');

console.log('PASS v1.4.26 crossfade zoom spectrum smoke');
