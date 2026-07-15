const fs = require('fs');

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL audio_import_reliability_smoke: ${message}`);
    process.exit(1);
  }
}

const app = fs.readFileSync('src/app.js', 'utf8');
const decodeService = fs.readFileSync('src/audio/audio-decode-service.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

must(app.includes("const APP_VERSION = 'Pro v1.5.15'"), 'app version must be v1.4.0');
must(app.includes('handleNativeInputFiles'), 'native input change wrapper missing');
must(app.includes('updateImportStatus(`${count}개') || app.includes('showToastSafe(`${count}개'), 'selected file count feedback missing');
must(app.includes('clickNativeFileInput(el.fileInput'), 'native file input first path missing');
must(app.includes('마우스/터치 클릭에서는 preventDefault()를 쓰지 않아'), 'label default click path comment missing');
must(decodeService.includes('decodeAudioDataCompat'), 'decodeAudioData compatibility fallback missing in decode service');
must(decodeService.includes('verifyMediaElementCanLoad'), 'media metadata codec diagnostic missing in decode service');
must(decodeService.includes('getAudioCodecFailureHint'), 'codec failure hint helper missing in decode service');
must(app.includes('FoxBearAudioDecodeService'), 'app should delegate decoding to audio decode service');
must(!/if \(supportsSystemFilePicker\(\)\) \{\s*openSystemFilePicker\(\)\.then/.test(app), 'file tile must not prefer async system picker before native input');
const bindStart = app.indexOf('function bindNativeUploadLabel');
const bindEnd = app.indexOf('function setupDropZone', bindStart);
const bindBlock = app.slice(bindStart, bindEnd);
const filePreventPattern = /kind === 'file'[\s\S]{0,220}event\.preventDefault\(\)/;
must(!filePreventPattern.test(bindBlock), 'file label click must not prevent native input default');
must(html.includes('src/app.js?v=1.5.15-e2e-runtime-classification'), 'index app cache bust key missing');
must(sw.includes('foxbear-shell-v1.5.15-e2e-runtime-classification') || (/foxbear-shell-v1\.4\.0/.test(sw) && /stage(?:28|27|26|25|24|23|22|21|20|19|18|17|16|15|14|13|12(?:\.1|\.2)?|11|10|9)/.test(sw)), 'service worker cache key missing or stale');
console.log('PASS audio import reliability smoke');
