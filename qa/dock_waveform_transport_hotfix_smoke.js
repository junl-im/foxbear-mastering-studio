#!/usr/bin/env node
const fs = require('fs');
const app = fs.readFileSync('src/app.js', 'utf8');
const utils = fs.readFileSync('src/utils/core-utils.js', 'utf8');
const css = fs.readFileSync('assets/css/studio.css', 'utf8');
function must(condition, message) {
  if (!condition) throw new Error(message);
}
must(app.includes("const APP_VERSION = 'Pro v1.3.48'"), 'app version not updated');
must(app.includes('track?.waveformOverview?.mastered'), 'Dock/detail master waveform does not read canonical mastered field');
must(app.includes('getTrackMasterWaveformMarkers'), 'master waveform marker compatibility helper missing');
must(!app.includes('cleanupRealtimePreview();\n    pauseAllPreviewAudio();\n    el.previewDialogBody.textContent = \'\';'), 'waveform popup still pauses all preview audio on open');
must(app.includes('captureBottomPreviewTransport(track, state.bottomPreviewMode);\n    el.previewDialogBody.textContent'), 'waveform popup does not preserve Dock transport before opening');
must(utils.includes('before: original') && utils.includes('after: mastered') && utils.includes('peakMarkers: masteredPeaks'), 'waveform overview legacy aliases missing');
must(utils.includes("return 'clip';") && utils.includes("return 'hot';") && utils.includes("return 'ok';"), 'waveform markers should be CSS class strings');
must(css.includes('v1.3.48 Dock waveform/transport hotfix'), 'v1.3.48 overlay offset CSS missing');
must(css.includes('bottom: calc(198px + env(safe-area-inset-bottom))'), 'toast/download offset not lifted');
must(css.includes('bottom: calc(224px + env(safe-area-inset-bottom))'), 'mobile overlay offset not lifted');
console.log('PASS dock waveform transport hotfix smoke: mastered waveform, popup playback, overlay offsets');
