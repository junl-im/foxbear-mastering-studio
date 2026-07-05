const fs = require('fs');

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

const app = fs.readFileSync('src/app.js', 'utf8');
const dockCss = fs.readFileSync('assets/css/dock.css', 'utf8');

must(app.includes('function seekDockToWaveformPercent'), 'waveform percent seek helper missing');
must(app.includes('function getWaveformPointerPercent'), 'waveform pointer percent helper missing');
must(app.includes('function onWaveformBarsSeek'), 'waveform click seek handler missing');
must(!app.includes('attachWaveformSeekHandlers(bars, mode, \'dock\')'), 'dock mini waveform should open popup instead of seeking');
must(app.includes("bars.dataset.waveformRole = 'dock-popup'"), 'dock mini waveform popup role missing');
must(app.includes('attachWaveformSeekHandlers(bars, sourceMode || tone || state.bottomPreviewMode, \'popup\')'), 'popup waveform handlers not attached');
must(app.includes('getMasterPreviewStartSec(track) + localSec'), 'master preview absolute seek mapping missing');
must(dockCss.includes('--waveform-playhead-pct'), 'live playhead CSS variable missing');
must(dockCss.includes('.bottom-waveform-bars.has-live-playhead'), 'live playhead styling missing');

console.log('PASS dock waveform popup/touch seek smoke');
