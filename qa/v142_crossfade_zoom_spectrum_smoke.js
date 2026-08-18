#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
const must = (condition, message) => { if (!condition) { console.error(`FAIL: ${message}`); process.exit(1); } };

const pkg=JSON.parse(read('package.json')); const app=read('src/app.js'); const index=read('index.html'); const sw=read('sw.js'); const studioCss=read('assets/css/studio.css'); const matrix=read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');
must(pkg.version==='1.6.104','package version');
must(index.includes('data-build="1.6.104"'),'index build');
must(sw.includes('foxbear-shell-v1.6.104-boot-emergency-visit-privacy-hardening'),'SW cache version');
['PLAYBACK_CROSSFADE_MS = 140','function crossfadeAudioPair','function playAudioWithFadeIn','function pauseAudioWithFadeOut','allowAudioElements','pendingCrossfade','crossfadeAudioPair(oldAudio, nextAudio, { userGesture:'].forEach(t=>must(app.includes(t),`crossfade contract missing ${t}`));
must(!index.includes('bottomPreviewSpectrum') && !app.includes('renderBottomMiniSpectrum'),'Dock mini spectrum must remain removed');
must(!exists('src/ui/spectrum-visualizer.js') && !exists('assets/css/spectrum-visualizer.css'),'detail spectrum UI must now be retired too');
['function enhanceWaveformRowZoom','onDoubleTapZoom','pinchStart','waveformZoomEnabled'].forEach(t=>must(app.includes(t),`waveform zoom missing ${t}`));
must(studioCss.includes('.waveform-zoom-controls'),'waveform zoom CSS missing');
['KakaoTalk','Chrome Android','Safari iOS','PWA','beforeunload','popstate'].forEach(t=>must(matrix.includes(t),`browser matrix missing ${t}`));
console.log('PASS crossfade/waveform zoom with spectrum UI retired');
