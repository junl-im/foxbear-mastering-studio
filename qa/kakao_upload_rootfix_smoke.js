const fs = require('fs');

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL kakao_upload_rootfix_smoke: ${message}`);
    process.exit(1);
  }
}

const app = fs.readFileSync('src/app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('assets/css/studio.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

must(app.includes("const APP_VERSION = 'Pro v1.5.50'"), 'app version must be v1.4.0');
must(html.includes('data-build="1.5.50"'), 'index data-build must be v1.5.50');
must(html.includes('id="importStatus"'), 'visible import status is missing');
must(/<label id="fileDrop"[\s\S]*?<input type="file" id="fileInput"[\s\S]*?<\/label>/.test(html), 'file input must be nested inside file tile');
must(/<label id="folderDrop"[\s\S]*?<input type="file" id="folderInput"[\s\S]*?<\/label>/.test(html), 'folder input must be nested inside folder tile');
must(css.includes('native-picker-input-overlay') && css.includes('pointer-events: auto'), 'transparent input overlay CSS missing');
must(app.includes('safeInit') && app.includes('bindEmergencyUploadOnly'), 'boot fallback upload binding missing');
must(app.includes('armPickerReturnWatch'), 'picker return diagnostic missing');
must(app.includes('카카오톡/인앱 브라우저'), 'Kakao/in-app diagnostic copy missing');
must(app.includes('capabilityService?.getFileCapability') && app.includes('오디오 파일 형식을 확인할 수 없습니다'), 'truthful unknown type validation missing');
must(sw.includes("['script', 'style', 'worker'].includes(request.destination)"), 'service worker should network-first scripts/styles');
must(html.includes('src/app.js?v=1.5.50-pwa-current-cache-test-recovery'), 'app cache bust key missing');
must(sw.includes('foxbear-shell-v1.5.50-pwa-current-cache-test-recovery'), 'SW cache key missing');
console.log('PASS kakao upload rootfix smoke');
