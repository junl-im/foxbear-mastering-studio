const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 stability audit smoke: ${message}`);
    process.exit(1);
  }
};

const app = read('src/app.js');
const spectrum = read('src/ui/spectrum-visualizer.js');
const html = read('index.html');
const sw = read('sw.js');
const pkg = JSON.parse(read('package.json'));
const matrix = read('qa/BROWSER_BACK_QA_MATRIX_1.4.26.md');

must(pkg.version === '1.5.20', 'package version should be 1.5.20');
must(html.includes('data-build="1.5.20"'), 'index build marker should be 1.5.20');
must(html.includes('1.5.20-idempotent-pwa-cache-warm'), 'index should use v1.5.20 cache key');
must(sw.includes('foxbear-shell-v1.5.20-idempotent-pwa-cache-warm'), 'service worker cache should use v1.5.20 key');

must(spectrum.includes('externalAnalyserNodes'), 'spectrum visualizer should track external analyser nodes');
must(spectrum.includes('function registerExternalAnalyser'), 'spectrum visualizer should expose external analyser registration');
must(spectrum.includes('externalAnalyserNodes.get(audio)'), 'live FFT should prefer an external analyser when one exists');
must(spectrum.includes('updateAudioMeta(audio, meta)'), 'spectrum audio registration should refresh metadata on repeated calls');
must(spectrum.includes('registerExternalAnalyser,'), 'external analyser API should be exported');

must(app.includes('function createSpectrumAnalyserTap'), 'app should create reusable spectrum analyser taps');
must(app.includes('function registerExternalSpectrumAnalyser'), 'app should register external spectrum analysers safely');
must(app.includes('nodes.spectrumAnalyser'), 'realtime mastering preview should expose a spectrum analyser');
must(app.includes("role: 'preview-translation'"), 'preview translation WebAudio graph should register a spectrum tap');
must(app.includes("role: 'difference-compare'"), 'difference listen graph should register a spectrum tap');
must(app.includes('output.connect(spectrumAnalyser).connect(context.destination)'), 'difference/translation graph should place analyser before destination');
must(matrix.includes('external analyser') || matrix.includes('FFT external analyser'), 'browser matrix should mention external analyser coverage');

console.log('PASS v1.4.26 stability audit smoke');
