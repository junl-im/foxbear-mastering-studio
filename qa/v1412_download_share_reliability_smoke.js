#!/usr/bin/env node
const fs = require('fs');

const read = file => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 download/share reliability smoke: ${message}`);
    process.exit(1);
  }
};

const service = read('src/download/download-service.js');
const dialog = read('src/ui/download-dialog-view.js');
const css = read('assets/css/download-dialog.css');
const runtime = read('src/boot/runtime-health.js');
const app = read('src/app.js');
const sw = read('sw.js');
const index = read('index.html');
const pkg = JSON.parse(read('package.json'));

assert(pkg.version === '1.5.69', 'package version should be 1.5.69');
assert(index.includes('data-build="1.5.69"'), 'index data-build should be 1.5.69');
assert(index.includes('1.5.69-mail-receipt-confirmation-history-branded-template'), 'index assets should use v1.5.69 cache key');
assert(sw.includes('foxbear-shell-v1.5.69-mail-receipt-confirmation-history-branded-template'), 'service worker cache should use v1.5.69 key');

assert(service.includes('getDownloadTroubleshootingText'), 'download service should expose troubleshooting text');
assert(service.includes('copyDownloadTroubleshootingGuide'), 'download service should expose troubleshooting guide copy');
assert(service.includes('getDownloadCapabilitySummary'), 'download service should expose capability summary');
assert(service.includes('getDownloadDiagnostics'), 'download service should expose diagnostics summary');
assert(service.includes('copyDownloadDiagnostics'), 'download service should expose diagnostics copy');
assert(service.includes('recordDownloadEvent'), 'download service should record download/share events');
assert(service.includes('downloadDiagnosticEvents'), 'download service should keep bounded diagnostic events');
assert(service.includes('buildExternalBrowserIntentUrl'), 'download service should build Android external browser intent');
assert(service.includes('카카오톡 안에서는 자동 다운로드가 조용히 실패할 수 있습니다'), 'Kakao assist should explain silent blob download failures');
assert(service.includes('공유/저장') && service.includes('파일 열기') && service.includes('외부 브라우저'), 'assist should include share/open/external fallbacks');
assert(service.includes('navigator.canShare') && service.includes('navigator.share'), 'share flow should feature-detect Web Share API');
assert(service.includes('download-assist-v2'), 'download assist should use v2 enlarged panel');

assert(dialog.includes('download-options-panel-v4'), 'download dialog should use v4 enlarged panel');
assert(dialog.includes('공유/저장 먼저'), 'restricted browser primary CTA should be share/save first');
assert(dialog.includes('안내 복사'), 'dialog should include troubleshooting guide copy action');
assert(dialog.includes('진단 복사'), 'dialog should include diagnostics copy action');
assert(dialog.includes('외부 브라우저로 열면 현재 메모리의 완성 파일은 넘어가지 않을 수 있습니다'), 'dialog should warn about memory-only blob when opening external browser');
assert(dialog.includes('openAssistForExport'), 'share failures should open the assist panel');
assert(app.includes('copyDownloadTroubleshootingGuide'), 'app should pass troubleshooting guide dependency to dialog');
assert(app.includes('copyDownloadDiagnostics'), 'app should pass diagnostics dependency to dialog');

assert(css.includes('.download-options-panel-v4'), 'CSS should style enlarged options panel');
assert(css.includes('max-height: min(88dvh, 760px)'), 'options panel should be taller to avoid clipped content');
assert(css.includes('.download-assist.download-assist-v2'), 'CSS should style enlarged assist panel');
assert(css.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), 'assist actions should support multi-column layout');
assert(css.includes('.download-assist-support'), 'assist panel should show capability badges');
assert(css.includes('max-height: calc(100dvh - 22px'), 'mobile dialog should use dynamic viewport height');

assert(runtime.includes('FoxBearDownloadService.copyDownloadTroubleshootingGuide'), 'runtime health should require guide copy global');
assert(runtime.includes('FoxBearDownloadService.getDownloadCapabilitySummary'), 'runtime health should require capability summary global');
assert(runtime.includes('FoxBearDownloadService.getDownloadDiagnostics'), 'runtime health should require diagnostics global');
assert(runtime.includes('FoxBearDownloadService.copyDownloadDiagnostics'), 'runtime health should require diagnostics copy global');

console.log('PASS v1.4.26 download/share reliability smoke');
