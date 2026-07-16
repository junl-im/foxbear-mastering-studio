#!/usr/bin/env node
const fs = require('fs');
const app = fs.readFileSync('src/app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const state = fs.readFileSync('src/state/app-state.js', 'utf8');
const css = fs.readFileSync('assets/css/studio.css', 'utf8');
function must(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}
must(app.includes("const APP_VERSION = 'Pro v1.5.24'"), 'app version should be v1.4.0');
must(state.includes('abDifferenceListen: false'), 'abDifferenceListen state missing');
must(app.includes('function createDifferencePreviewPlayer'), 'difference player function missing for full comparison UI');
must(app.includes('createMediaElementSource(originalAudio)'), 'difference WebAudio original source missing');
must(app.includes('originalInvert.gain.value = -1'), 'phase-inverted original gain missing');
must(app.includes('toggleDockAbLevelMatch'), 'legacy Dock A/B toggle function kept for compatibility');
must(app.includes('toggleDockDifferenceListen'), 'legacy Dock difference toggle function kept for compatibility');
must(!html.includes('bottomPreviewAbMatchBtn'), 'Dock level-match button should be removed in v1.3.53');
must(!html.includes('bottomPreviewDifferenceBtn'), 'Dock difference button should be removed in v1.3.53');
must(css.includes('difference-preview-player'), 'difference player CSS missing');
must(css.includes('bottom-preview-compare-tools'), 'Dock compare tools defensive CSS missing');
console.log('PASS ab_loudness_difference_smoke');
