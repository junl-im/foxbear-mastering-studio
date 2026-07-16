#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v141_spectrum_exit_guard_smoke: ${message}`);
    process.exit(1);
  }
};

const version = '1.5.21-history-csp-console-contract-fix';
const index = read('index.html');
const sw = read('sw.js');
const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const runtime = read('src/boot/runtime-health.js');
const visualizer = read('src/ui/spectrum-visualizer.js');
const spectrumCss = read('assets/css/spectrum-visualizer.css');
const siteGuards = read('src/security/site-guards.js');
const detailView = read('src/ui/detail-view.js');
const handoff = read('HANDOFF.md');
const notes = read('PROJECT_NOTES.md');
const changelog = read('CHANGELOG.md');

must(pkg.version === '1.5.21', 'package version should be 1.5.21');
must(index.includes('data-build="1.5.21"'), 'index build marker should be 1.5.21');
must(app.includes("const APP_VERSION = 'Pro v1.5.21'"), 'app version should be Pro v1.5.21');
must(index.includes(`assets/css/spectrum-visualizer.css?v=${version}`), 'index should load spectrum visualizer CSS');
must(index.includes(`src/ui/spectrum-visualizer.js?v=${version}`), 'index should load spectrum visualizer script');
must(sw.includes(`./assets/css/spectrum-visualizer.css?v=${version}`), 'service worker should precache spectrum CSS');
must(sw.includes(`./src/ui/spectrum-visualizer.js?v=${version}`), 'service worker should precache spectrum module');
must(sw.includes(`foxbear-shell-v${version}`), 'service worker cache should use v1.5.21 key');
must(runtime.includes('FoxBearSpectrumVisualizer.renderPanel'), 'runtime health should require spectrum visualizer');
must(pkg.qaChecks.includes('node --check src/ui/spectrum-visualizer.js'), 'package should syntax-check spectrum visualizer');
must(pkg.qaChecks.includes('node qa/v141_spectrum_exit_guard_smoke.js'), 'package should run v1.5.21 smoke');

[
  'FoxBearSpectrumVisualizer',
  'renderPanel',
  'registerAudio',
  'createMediaElementSource',
  'getByteFrequencyData',
  'spectrumProfile',
  'targetDynamicFreq',
  'spectrum-visualizer-canvas'
].forEach(token => must(visualizer.includes(token), `spectrum module should include ${token}`));

must(app.includes('window.FoxBearSpectrumVisualizer?.registerAudio?.(audio, meta)'), 'playback registration should also feed spectrum visualizer');
must(app.includes('function renderSpectrumPanel(track)'), 'app should expose renderSpectrumPanel');
must(app.includes('getActiveSpectrumAudioForTrack'), 'app should resolve active audio for live spectrum');
must(detailView.includes('renderSpectrumPanel(track)'), 'detail view should render spectrum before waveform panel');
must(spectrumCss.includes('.spectrum-visualizer-panel'), 'spectrum CSS panel selector missing');
must(spectrumCss.includes('.spectrum-visualizer-status[data-spectrum-status="live"]'), 'live status CSS missing');

[
  'installNavigationExitGuard',
  'beforeunload',
  'popstate',
  'foxbearExitGuard',
  '뒤로가기를 누르면 프로그램을 닫고 현재 작업 화면을 나갑니다. 맞습니까?'
].forEach(token => must(siteGuards.includes(token), `exit guard should include ${token}`));
must(app.includes('function hasMeaningfulWorkspaceState()'), 'app should decide when navigation protection is needed');
must(app.includes("runInitStep('나가기/새로고침 보호', initNavigationExitGuard)"), 'init should install navigation exit guard');
must(app.includes('pauseAllPreviewAudio();'), 'exit guard leave path should pause preview audio');

must(handoff.includes('v1.5.21') && handoff.includes('Spectrum'), 'handoff should mention v1.5.21 spectrum update');
must(notes.includes('Exit Guard'), 'project notes should preserve the Exit Guard invariant');
must(changelog.includes('v1.5.21') && changelog.includes('Spectrum'), 'changelog should include v1.5.21 entry');

console.log('PASS v1.4.26 spectrum visualizer and exit guard smoke');
