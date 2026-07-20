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
const dockWaveformCss = fs.readFileSync('assets/css/dock-waveform.css', 'utf8');
const compareCss = fs.readFileSync('assets/css/waveform-compare.css', 'utf8');
const manifest = fs.readFileSync('manifest.webmanifest', 'utf8');

must(app.includes("const APP_VERSION = 'Pro v1.5.36'"), 'app version should be v1.4.0');
must(html.includes('data-build="1.5.36"'), 'index build should be v1.5.36');
must(app.includes('function mapAudioPercentToWaveformVisualPercent'), 'visual playhead mapping helper missing');
must(app.includes('function mapWaveformPointerToAudioPercent'), 'pointer-to-bar mapping helper missing');
must(app.includes('bars.addEventListener(\'pointerdown\', onWaveformBarsPointerSeek)'), 'touch pointer seek handler missing');
must(app.includes('bar.dataset.waveformPercent'), 'bar percent dataset missing');
must(app.includes('element.dataset.waveformPlaybackPercent'), 'playback percent dataset missing');
must(dockWaveformCss.includes('Stage9: Dock waveform dedicated CSS layer') && dockWaveformCss.includes('touch-action: none'), 'dedicated dock waveform CSS section missing');
must(dockWaveformCss.includes('touch-action: none') || compareCss.includes('touch-action: none'), 'touch action override missing');
must(app.includes('getAudioImportCapabilityService') && app.includes('getFoxBearFilePickerTypes'), 'runtime codec capability bridge missing');
must(html.includes('.aiff') && !html.includes('.caf') && !html.includes('.amr') && !html.includes('.wma'), 'input accept list must expose stable codecs only before runtime probe');
must(manifest.includes('.opus') && !manifest.includes('.caf') && !manifest.includes('.3gp') && !manifest.includes('.amr') && !manifest.includes('.wma'), 'share target codec list must exclude unsupported formats');
must(app.includes('getAudioImportDecodeHint'), 'codec-specific import hint missing');
must(app.includes('MP4/MOV') || fs.readFileSync('src/audio/audio-decode-service.js','utf8').includes('MP4/MOV'), 'container decode hint missing');

console.log('PASS dock waveform import 1.3.57 smoke');
