const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/studio.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
function must(condition, message) {
  if (!condition) {
    console.error('FAIL cleanup buttonview layer smoke:', message);
    process.exit(1);
  }
}
must(pkg.version === '1.5.65', 'package version should be 1.5.65');
must(html.includes('data-build="1.5.65"'), 'index build should be 1.5.65');
must(app.includes("const APP_VERSION = 'Pro v1.5.65'"), 'app version should be Pro v1.5.65');
must(app.includes("const SHARED_DSP_PROFILE_VERSION = 'v1.4.0-dock-modal-state-machine'"), 'DSP slug should be v1.4.0');
must(!fs.readdirSync(root).some(name => /^PATCH_NOTES_v.*\.md$/.test(name)), 'individual PATCH_NOTES files should be removed');
must(fs.existsSync(path.join(root, 'PROJECT_NOTES.md')), 'PROJECT_NOTES.md should exist');
must(app.includes("dialog.style.removeProperty('z-index')"), 'feature dialog inline z-index should be removed');
must(app.includes("button.style.removeProperty('z-index')"), 'feature button top-most z-index should be removed');
must(!app.includes("dialog.style.zIndex = '28050'"), 'old inline feature dialog z-index should not remain');
must(!app.includes("button.onclick = open"), 'hard onclick fallback should not override close behavior');
must(!app.includes("'pointerdown', 'pointerup', 'click'"), 'pointerdown/up capture spam should be removed');
must(css.includes('v1.4.0 Dock / Modal State Machine Refactor'), 'CSS layer repair section missing');
must(css.includes('z-index: auto !important'), 'feature open button z-index reset missing');
must(css.includes('z-index: 24750 !important'), 'feature dialog should sit above Dock but not top-most');
must(!css.includes('z-index: 28050 !important'), 'old feature dialog top z-index should not remain');
must(!css.includes('z-index: 28060 !important'), 'old feature button top z-index should not remain');
const removedNames = [
  'getAdaptiveTargetLabel','activateByKeyboard','supportsSystemFilePicker','addKeywordScore','getPhaseSafeWidthFactor',
  'addKickToBuffer','addHatToBuffer','addClapToBuffer','mixMonoSample','mixStereoAccent','softLimitSample',
  'applyPeakGuard','applyTruePeakGuard','tryShareDownloadFile','setPreviewTranslationMode',
  'isDockMasteringBusyBlocked','selectTrack'
];
for (const name of removedNames) {
  must(!app.includes(`function ${name}`), `dead function should be removed: ${name}`);
}
console.log('PASS cleanup buttonview layer smoke');
