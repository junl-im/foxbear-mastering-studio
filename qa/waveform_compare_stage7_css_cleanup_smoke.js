#!/usr/bin/env node
'use strict';

const fs = require('fs');

const studioCss = fs.readFileSync('assets/css/studio.css', 'utf8');
const dockCss = fs.readFileSync('assets/css/dock.css', 'utf8');
const compareCss = fs.readFileSync('assets/css/waveform-compare.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const handoff = fs.readFileSync('HANDOFF.md', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

assert(compareCss.includes('FoxBear Stage7 waveform compare popup layer'), 'Stage7 compare CSS banner is missing');
assert(!studioCss.includes('waveform-compare-'), 'studio.css should not own waveform compare class rules after Stage7 cleanup');
assert(!dockCss.includes('waveform-compare-'), 'dock.css should not own waveform compare class rules after Stage7 cleanup');
assert(compareCss.includes('padding-bottom: calc(var(--bottom-preview-panel-bottom'), 'compare CSS should own dock-safe modal offset');
assert(compareCss.includes('--waveform-playhead-pct') && compareCss.includes('--waveform-progress-pct'), 'compare CSS should own popup timeline variables');
assert(compareCss.includes('터치 이동') && compareCss.includes('timeline model'), 'compare CSS should preserve popup seek hint text');
assert(compareCss.includes('width: 1px !important') && compareCss.includes('width: 6px !important'), 'compare CSS should keep thin line plus small cap playhead');
assert(/stage(?:[789]|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28)/.test(sw) || sw.includes('foxbear-shell-v1.5.30-inapp-playback-recovery'), 'service worker cache name should be bumped to stage7 or later');
assert(changelog.includes('Stage7') && handoff.includes('Stage7'), 'handoff docs should mention Stage7');

console.log('PASS waveform compare stage7 CSS cleanup smoke');
