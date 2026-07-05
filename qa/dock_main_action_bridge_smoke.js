const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL dock main action bridge smoke: ${message}`);
    process.exit(1);
  }
}

assert(app.includes('function getPrimaryActionTracks'), 'primary action target helper is missing');
assert(app.includes('function preparePrimaryActionTrack'), 'primary action preparation helper is missing');
assert(/const actionTracks = getPrimaryActionTracks\(\);/.test(app), 'renderButtons must use active-track fallback for action buttons');
assert(/const candidates = getPrimaryActionTracks\(explicitTrack\)/.test(app), 'masterSelectedTracks must fall back to active track when checked selection is empty');
assert(!app.includes("showToast('작업 선택 버튼으로 마스터링할 곡을 먼저 선택해주세요.')"), 'old checked-selection-only warning still exists');
assert(/return masterSelectedTracks\(\{ track, source: 'dock' \}\);/.test(app), 'Dock mastering must bridge to the same main mastering action');
assert(/preparePrimaryActionTrack\(getSelectedTrack\(\) \|\| getDockActionTrack\(\)\)/.test(app), 'Dock actions must prefer the main-screen selected track');
assert(/await renderMasterPreviewForTrack\(track, \{ source: 'dock' \}\)/.test(app), 'Dock preview must call the same preview renderer after target preparation');
assert(/track\.status !== 'processing'/.test(app), 'master action should allow analyzing tracks so it can wait instead of going silent');
console.log('PASS dock main action bridge smoke');
