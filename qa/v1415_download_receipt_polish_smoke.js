const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function must(condition, message) { if (!condition) { console.error('FAIL', message); process.exit(1); } }
const pkg = JSON.parse(read('package.json'));
const html = read('index.html');
const sw = read('sw.js');
const service = read('src/download/download-service.js');
const dialog = read('src/ui/download-dialog-view.js');
const css = read('assets/css/download-dialog.css');
const runtime = read('src/boot/runtime-health.js');
const qaReport = read('qa/QA_REPORT.md');
const changelog = read('CHANGELOG.md');
const handoff = read('HANDOFF.md');

must(pkg.version === '1.5.38', 'package version should be current 1.5.38');
must(pkg.name === 'foxbear-mastering-studio', 'package name should be current v1-4-26');
must(html.includes('data-build="1.5.38"'), 'index build marker should be current');
must(html.includes('1.5.38-preflight-worker-multitab-hardening'), 'index should use current asset key');
must(sw.includes('foxbear-shell-v1.5.38-preflight-worker-multitab-hardening'), 'service worker cache should use current key');

must(service.includes('getDownloadActionReceipt'), 'download service should expose action receipt helper');
must(service.includes("version: '1.5.38'"), 'download receipt/diagnostics should report current version');
must(service.includes('nextSteps'), 'download receipt should include next steps');
must(runtime.includes('FoxBearDownloadService.getDownloadActionReceipt'), 'runtime health should require receipt helper');

must(dialog.includes('download-options-receipt'), 'dialog should render receipt/status block');
must(dialog.includes("renderReceipt(primaryAction, null, '', { initial: true })") || dialog.includes('renderReceipt(primaryAction)'), 'dialog should initialize receipt with primary action');
must(dialog.includes("renderReceipt('assist', exported"), 'dialog should show assist receipt after fallback');
must(dialog.includes("renderReceipt('diagnostics'"), 'dialog should show diagnostics receipt');
must(dialog.includes('aria-live'), 'receipt should be polite live region');
must(css.includes('.download-options-receipt'), 'download dialog CSS should style receipt');
must(css.includes('Download receipt polish'), 'CSS should include receipt polish comment');

must(pkg.qaChecks.includes('node qa/v1415_download_receipt_polish_smoke.js'), 'package qaChecks should include receipt smoke');
must(fs.existsSync(path.join(root, 'qa/BROWSER_BACK_QA_MATRIX_1.4.26.md')), 'current browser matrix should exist');
must(qaReport.includes('v1.5.38'), 'QA report should mention current version');
must(changelog.includes('v1.5.38'), 'changelog should mention current version');
must(handoff.includes('v1.5.38'), 'handoff should mention current version');
console.log('PASS v1.4.15 download receipt polish smoke on current line');
