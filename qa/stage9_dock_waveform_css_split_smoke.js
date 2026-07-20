#!/usr/bin/env node
'use strict';

const fs = require('fs');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL stage9_dock_waveform_css_split_smoke: ${message}`);
    process.exit(1);
  }
}

const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const dockCss = fs.readFileSync('assets/css/dock.css', 'utf8');
const dockWaveformCss = fs.readFileSync('assets/css/dock-waveform.css', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const handoff = fs.readFileSync('HANDOFF.md', 'utf8');
const notes = fs.readFileSync('PROJECT_NOTES.md', 'utf8');

assert(index.includes('assets/css/dock-waveform.css'), 'index.html should load dock-waveform.css');
assert(index.indexOf('assets/css/dock.css') < index.indexOf('assets/css/dock-waveform.css'), 'dock-waveform.css should load after dock.css');
assert(index.indexOf('assets/css/dock-waveform.css') < index.indexOf('assets/css/waveform-compare.css'), 'waveform-compare.css should remain after dock-waveform.css');
assert(sw.includes('foxbear-shell-v1.5.34-kakao-landing-recovery') || (/foxbear-shell-v1\.4\.0/.test(sw) && /stage(?:9(?:\.1)?|10|11|12(?:\.1|\.2)?|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28)/.test(sw)), 'service worker cache should be bumped to stage9 or later');
assert(sw.includes('./assets/css/dock-waveform.css?v=1.5.34-kakao-landing-recovery'), 'service worker should precache dock-waveform.css');

assert(dockWaveformCss.includes('Stage9: Dock waveform dedicated CSS layer'), 'dock-waveform.css should declare Stage9 layer ownership');
assert(dockWaveformCss.includes('.bottom-waveform-bars') && dockWaveformCss.includes('.dock-integrated-waveform-bars'), 'dock waveform selectors should live in dock-waveform.css');
assert(dockWaveformCss.includes('--waveform-progress-pct') && dockWaveformCss.includes('--waveform-playhead-pct'), 'timeline CSS variables should live in dock-waveform.css');
assert(dockWaveformCss.includes('touch-action: none'), 'touch seek override should live in dock-waveform.css');
assert(dockWaveformCss.includes('width: 1px !important') && dockWaveformCss.includes('width: 6px !important'), 'thin playhead line and small cap should stay in dock-waveform.css');
assert(!dockCss.includes('.bottom-waveform-bars'), 'dock.css should no longer own bottom waveform bar selectors');
assert(!dockCss.includes('.dock-integrated-waveform-bars'), 'dock.css should no longer own integrated waveform selectors');
assert(!dockCss.includes('.bottom-preview-waveform'), 'dock.css should no longer own bottom preview waveform selectors');

assert(pkg.qaChecks.includes('node qa/stage9_dock_waveform_css_split_smoke.js'), 'package QA list should include stage9 smoke');
assert(changelog.includes('Stage9') && handoff.includes('Stage9') && notes.includes('Stage9'), 'handoff docs should mention Stage9');

console.log('PASS stage9 dock waveform CSS split smoke');
