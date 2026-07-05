const fs = require('fs');

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL audio_import_reliability_smoke: ${message}`);
    process.exit(1);
  }
}

const app = fs.readFileSync('src/app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

must(app.includes("const APP_VERSION = 'Pro v1.3.62'"), 'app version must be v1.3.62');
must(app.includes('handleNativeInputFiles'), 'native input change wrapper missing');
must(app.includes("showToast(`${count}개"), 'selected file count feedback missing');
must(app.includes('clickNativeFileInput(el.fileInput'), 'native file input first path missing');
must(app.includes('마우스/터치 클릭은 label의 기본 for=input 동작을 절대 막지 않습니다'), 'label default click path comment missing');
must(app.includes('decodeAudioDataCompat'), 'decodeAudioData compatibility fallback missing');
must(app.includes('verifyMediaElementCanLoad'), 'media metadata codec diagnostic missing');
must(app.includes('getAudioCodecFailureHint'), 'codec failure hint helper missing');
must(!/if \(supportsSystemFilePicker\(\)\) \{\s*openSystemFilePicker\(\)\.then/.test(app), 'file tile must not prefer async system picker before native input');
const bindStart = app.indexOf('function bindNativeUploadLabel');
const bindEnd = app.indexOf('function setupDropZone', bindStart);
const bindBlock = app.slice(bindStart, bindEnd);
const filePreventPattern = /kind === 'file'[\s\S]{0,220}event\.preventDefault\(\)/;
must(!filePreventPattern.test(bindBlock), 'file label click must not prevent native input default');
must(html.includes('src/app.js?v=1.3.62-audio-import'), 'index app cache bust key missing');
must(sw.includes('foxbear-shell-v1.3.62-audio-import'), 'service worker cache key missing');
console.log('PASS audio import reliability smoke');
