#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const downloadDialogView = fs.readFileSync(path.join(root, 'src/ui/download-dialog-view.js'), 'utf8');
const css = [
  'assets/css/theme.css',
  'assets/css/layout.css',
  'assets/css/studio.css',
  'assets/css/download-dialog.css'
].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const appAndDownloadDialog = `${app}\n${downloadDialogView}`;
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL export reliability smoke: ${message}`);
    process.exit(1);
  }
}

must(app.includes("const APP_VERSION = 'Pro v1.6.86'"), 'app version should be v1.4.0');
must(app.includes('function getDownloadEnvironmentInfo()'), 'download environment detector missing');
must(app.includes('function canShareTinyAudioProbe()'), 'share capability probe missing');
must(appAndDownloadDialog.includes('download-options-panel-v3'), 'download options v3 panel missing');
must(appAndDownloadDialog.includes('download-options-env'), 'download environment UI missing');
must(appAndDownloadDialog.includes('download-options-selected-summary'), 'selected format summary missing');
must(appAndDownloadDialog.includes('저장 도움'), 'download assist action missing');
must(appAndDownloadDialog.includes('주소 복사'), 'copy URL fallback missing');
must(appAndDownloadDialog.includes('외부 브라우저'), 'external browser fallback missing');
must(app.includes('function createTrackExportReadyPanel(track)'), 'track export-ready panel function missing');
must(!app.includes('suggestedName: fileName,\n        suggestedName: fileName'), 'duplicate suggestedName should be removed');
must(css.includes('.track-export-ready-panel'), 'export-ready panel CSS block missing');
must(css.includes('.track-export-ready-panel'), 'export-ready panel CSS missing');
must(css.includes('.download-options-env'), 'download environment CSS missing');
must(css.includes('download-options-panel-v3'), 'download panel v3 CSS missing');
must(pkg.includes('export_reliability_smoke.js'), 'package check should include export reliability smoke');
console.log('PASS export reliability smoke');
