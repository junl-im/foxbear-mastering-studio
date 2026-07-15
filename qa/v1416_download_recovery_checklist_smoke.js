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

must(pkg.version === '1.5.17', 'package version should be 1.5.17');
must(pkg.name === 'foxbear-mastering-studio', 'package name should be v1-4-26');
must(html.includes('data-build="1.5.17"'), 'index build marker should be 1.5.17');
must(html.includes('1.5.17-browser-contract-fix'), 'index should use v1.5.17 asset key');
must(sw.includes('foxbear-shell-v1.5.17-browser-contract-fix'), 'service worker cache should use v1.5.17 key');

must(service.includes('getDownloadRecoveryChecklist'), 'download service should expose recovery checklist helper');
must(service.includes('copyDownloadRecoveryChecklist'), 'download service should expose checklist copy helper');
must(service.includes('serializeDownloadRecoveryChecklist'), 'download service should serialize checklist text');
must(service.includes('recovery-checklist-copy'), 'download service should record checklist copy event');
must(service.includes("version: '1.5.17'"), 'download helpers should report v1.5.17');
must(runtime.includes('FoxBearDownloadService.getDownloadRecoveryChecklist'), 'runtime health should require checklist helper');
must(runtime.includes('FoxBearDownloadService.copyDownloadRecoveryChecklist'), 'runtime health should require checklist copy helper');

must(dialog.includes('download-options-checklist'), 'dialog should render recovery checklist block');
must(dialog.includes('renderChecklist(action, exported)'), 'receipt rendering should refresh checklist');
must(dialog.includes('체크리스트 복사'), 'dialog should include checklist copy action');
must(dialog.includes('copyDownloadRecoveryChecklist'), 'dialog should call checklist copy helper');
must(css.includes('Download recovery checklist'), 'CSS should include v1.5.17 checklist comment');
must(css.includes('.download-assist-checklist'), 'CSS should style assist checklist');
must(css.includes('.download-options-checklist'), 'CSS should style dialog checklist');

must(pkg.qaChecks.includes('node qa/v1416_download_recovery_checklist_smoke.js'), 'package qaChecks should include v1.5.17 smoke');
must(fs.existsSync(path.join(root, 'qa/BROWSER_BACK_QA_MATRIX_1.4.26.md')), 'v1.5.17 browser matrix should exist');
must(qaReport.includes('v1.5.17'), 'QA report should mention v1.5.17');
must(changelog.includes('v1.5.17'), 'changelog should mention v1.5.17');
must(handoff.includes('v1.5.17'), 'handoff should mention v1.5.17');
console.log('PASS v1.4.26 download recovery checklist smoke');
