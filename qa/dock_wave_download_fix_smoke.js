
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const downloadDialogView = fs.readFileSync(path.join(root, 'src/ui/download-dialog-view.js'), 'utf8');
const appAndDownloadDialog = `${app}\n${downloadDialogView}`;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/studio.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL dock_wave_download_fix_smoke: ${message}`);
    process.exit(1);
  }
}
assert(html.includes('v1.6.65'), 'index version updated');
assert(app.includes("const APP_VERSION = 'Pro v1.6.65'"), 'app version updated');
assert(app.includes('getDockWaveformSignature'), 'Dock waveform signature added');
assert(app.includes('dock-integrated-waveform-placeholder'), 'placeholder waveform class added');
assert(app.includes('wave:${waveformSignature}'), 'Dock player key includes waveform signature');
assert(app.includes("forceRefreshBottomPreviewDock(track, 'analysis-complete')") || app.includes('requestAnimationFrame(() => renderBottomPreviewDock({ keepPlaying: true }))'), 'analysis completion refreshes Dock waveform');
assert(app.includes('bindFeatureOpenHardFallback'), 'feature open hard fallback added');
assert(css.includes('#featureOpenBtn') && css.includes('pointer-events: auto'), 'feature open css guard added');
assert(app.includes("target.scrollIntoView({ behavior: 'smooth', block: 'center'") || app.includes('download-focus-card'), 'download action line scrolls to center');
assert(appAndDownloadDialog.includes('isRestrictedDownloadBrowser() && supportsWebShareFiles'), 'restricted browser share-first download flow added');
assert(pkg.version === '1.6.65', 'package version updated');
console.log('PASS dock waveform/download fix smoke');
