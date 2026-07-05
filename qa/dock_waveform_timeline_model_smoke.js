const fs = require('fs');

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL dock_waveform_timeline_model_smoke: ${message}`);
    process.exit(1);
  }
}

const app = fs.readFileSync('src/app.js', 'utf8');
const dockCss = fs.readFileSync('assets/css/dock.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

must(app.includes("const APP_VERSION = 'Pro v1.3.61'"), 'app version should be v1.3.61');
must(html.includes('data-build="1.3.61"'), 'index build should be v1.3.61');
must(app.includes('function getWaveformTimelineModel'), 'timeline model helper missing');
must(app.includes('model.plotLeft + model.plotWidth * (pct / 100)'), 'continuous visual playhead mapping missing');
must(app.includes('(x - model.plotLeft) / Math.max(1, model.plotWidth)'), 'continuous pointer mapping missing');
must(app.includes('function getWaveformElementPlaybackPercent'), 'per-element playback percent helper missing');
must(app.includes('bars.dataset.waveformScope = getWaveformModeScope'), 'waveform scope dataset missing');
must(app.includes('role\', \'slider') || app.includes('role", "slider'), 'waveform should expose slider role');
must(app.includes('state.bottomPreviewMode === \'masterPreview\' ? local : absoluteToLocalPreviewTime'), 'masterPreview local/full conversion missing');
must(dockCss.includes('v1.3.59 Dock waveform timeline model'), 'dock CSS timeline section missing');
must(dockCss.includes('--waveform-progress-pct'), 'waveform progress CSS variable missing');
must(dockCss.includes('cursor: ew-resize'), 'seek cursor missing');

console.log('PASS dock waveform timeline model smoke');
