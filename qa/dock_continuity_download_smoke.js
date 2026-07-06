const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const downloadDialogView = fs.readFileSync(path.join(root, 'src/ui/download-dialog-view.js'), 'utf8');
const appAndDownloadDialog = `${app}\n${downloadDialogView}`;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/studio.css'), 'utf8');
function must(condition, message) {
  if (!condition) throw new Error(message);
}
must(app.includes('function captureBottomPreviewTransport'), 'dock transport capture missing');
must(app.includes('absoluteToLocalPreviewTime'), 'absolute/local time mapping missing');
must(app.includes('applyBottomPreviewStart'), 'dock start restore missing');
must(appAndDownloadDialog.includes('download-options-actions'), 'download action row missing');
must(appAndDownloadDialog.includes('supportsWebShareDownloadFiles'), 'web share feature guard missing');
must(appAndDownloadDialog.includes('await shareDownloadFile(exported.blob, exported.fileName)'), 'explicit share export missing');
must(!app.includes('clearBottomPreviewPlayer();\n    renderBottomPreviewDock({ autoPlay: false });'), 'translation mode still clears player before capture');
must(html.includes('하이라이트 듣기') && html.includes('원곡 프리뷰') && html.includes('마스터링 프리뷰'), 'dock preview labels not updated');
must(css.includes('v1.3.46 dock continuity'), 'v1.3.46 css override missing');
console.log('dock continuity/download smoke: PASS');
