#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/studio.css'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL export reliability smoke: ${message}`);
    process.exit(1);
  }
}

must(app.includes("const APP_VERSION = 'Pro v1.3.53'"), 'app version should be v1.3.53');
must(app.includes('function getDownloadEnvironmentInfo()'), 'download environment detector missing');
must(app.includes('function canShareTinyAudioProbe()'), 'share capability probe missing');
must(app.includes('download-options-panel-v3'), 'download options v3 panel missing');
must(app.includes('download-options-env'), 'download environment UI missing');
must(app.includes('download-options-selected-summary'), 'selected format summary missing');
must(app.includes('저장 도움'), 'download assist action missing');
must(app.includes('주소 복사'), 'copy URL fallback missing');
must(app.includes('외부 브라우저'), 'external browser fallback missing');
must(app.includes('function createTrackExportReadyPanel(track)'), 'track export-ready panel function missing');
must(!app.includes('suggestedName: fileName,\n        suggestedName: fileName'), 'duplicate suggestedName should be removed');
must(css.includes('.track-export-ready-panel'), 'export-ready panel CSS block missing');
must(css.includes('.track-export-ready-panel'), 'export-ready panel CSS missing');
must(css.includes('.download-options-env'), 'download environment CSS missing');
must(css.includes('download-options-panel-v3'), 'download panel v3 CSS missing');
must(pkg.includes('export_reliability_smoke.js'), 'package check should include export reliability smoke');
console.log('PASS export reliability smoke');
