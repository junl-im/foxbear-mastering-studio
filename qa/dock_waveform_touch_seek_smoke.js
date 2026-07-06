const fs = require('fs');

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

const app = fs.readFileSync('src/app.js', 'utf8');
const studioCss = fs.readFileSync('assets/css/studio.css', 'utf8');

must(app.includes('function seekDockToWaveformPercent'), 'waveform percent seek helper missing');
must(app.includes('function getWaveformPointerPercent'), 'waveform pointer percent helper missing');
must(app.includes('function onWaveformBarsSeek'), 'waveform click seek handler missing');
must(app.includes("attachWaveformSeekHandlers(bars, targetMode, 'dock-player')"), 'dock integrated waveform seek handler missing');
must(app.includes("attachWaveformSeekHandlers(bars, sourceMode || tone || state.bottomPreviewMode, 'popup')"), 'popup waveform handlers not attached');
must(app.includes('getMasterPreviewStartSec(track) + localSec') || app.includes('getMasterPreviewStartSec(track) + scopedLocalSec'), 'master preview absolute seek mapping missing');
must(studioCss.includes('--waveform-playhead-pct'), 'live playhead CSS variable missing');
must(studioCss.includes('.dock-integrated-waveform-bars.has-live-playhead'), 'dock integrated live playhead styling missing');

console.log('PASS dock waveform popup/touch seek smoke');
