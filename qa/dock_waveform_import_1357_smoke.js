const fs = require('fs');

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

const app = fs.readFileSync('src/app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const dockCss = fs.readFileSync('assets/css/dock.css', 'utf8');
const manifest = fs.readFileSync('manifest.webmanifest', 'utf8');

must(app.includes("const APP_VERSION = 'Pro v1.3.64'"), 'app version should be v1.3.64');
must(html.includes('data-build="1.3.64"'), 'index build should be v1.3.64');
must(app.includes('function mapAudioPercentToWaveformVisualPercent'), 'visual playhead mapping helper missing');
must(app.includes('function mapWaveformPointerToAudioPercent'), 'pointer-to-bar mapping helper missing');
must(app.includes('bars.addEventListener(\'pointerdown\', onWaveformBarsPointerSeek)'), 'touch pointer seek handler missing');
must(app.includes('bar.dataset.waveformPercent'), 'bar percent dataset missing');
must(app.includes('element.dataset.waveformPlaybackPercent'), 'playback percent dataset missing');
must(dockCss.includes('v1.3.57 Dock waveform aligned touch seek'), 'v1.3.57 dock CSS section missing');
must(dockCss.includes('touch-action: none'), 'touch action override missing');
must(app.includes("'.opus'") && app.includes("'.caf'") && app.includes("'.3gp'") && app.includes("'.amr'"), 'broad audio extension list incomplete');
must(html.includes('.opus') && html.includes('.caf') && html.includes('.3gp') && html.includes('.amr'), 'input accept list not broadened');
must(manifest.includes('.opus') && manifest.includes('.caf') && manifest.includes('.3gp') && manifest.includes('.amr'), 'share target accept list not broadened');
must(app.includes('getAudioImportDecodeHint'), 'codec-specific import hint missing');
must(app.includes('컨테이너는 AAC/ALAC'), 'container decode hint missing');

console.log('PASS dock waveform import 1.3.57 smoke');
