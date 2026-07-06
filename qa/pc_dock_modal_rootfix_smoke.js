const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/studio.css'), 'utf8');
const dockCss = fs.readFileSync(path.join(root, 'assets/css/dock.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
function must(condition, message) {
  if (!condition) {
    console.error(`FAIL pc dock modal rootfix smoke: ${message}`);
    process.exit(1);
  }
}
must(pkg.version === '1.3.82', 'package version should be 1.3.82');
must(html.includes('data-build="1.3.82"'), 'index build should be 1.3.82');
must(app.includes("const APP_VERSION = 'Pro v1.3.82'"), 'app version should be Pro v1.3.82');
must(app.includes("const SHARED_DSP_PROFILE_VERSION = 'v1.3.82-pc-dock-modal-rootfix'"), 'DSP profile slug should be v1.3.82');
must(html.includes('id="bottomPreviewPlayBtn"'), 'PC dock external play button missing');
must(app.includes("'bottomPreviewPlayBtn'"), 'bottomPreviewPlayBtn must be cached');
must(app.includes('function toggleBottomPreviewExternalPlayback'), 'external dock play toggle function missing');
must(app.includes('function syncBottomPreviewExternalPlayButton'), 'external dock play sync function missing');
must(css.includes('grid-template-columns: clamp(160px, 21vw, 270px) minmax(0, 1fr)') || dockCss.includes('grid-template-columns: clamp(160px, 21vw, 270px) minmax(0, 1fr)'), 'PC dock should use left play column and right content column');
must(dockCss.includes('v1.3.82 PC Dock / Modal Root Fix'), 'dock css v1.3.82 override missing');
must(css.includes('.dock-integrated-toggle') && css.includes('display: none !important'), 'internal player toggle should be hidden on PC');
must(css.includes('grid-template-columns: minmax(0, 1fr) clamp(116px, 11vw, 154px)'), 'playerbar should keep waveform and two-line source/time partition');
must(app.includes('el.previewOpenBtn.disabled = false;'), 'mastering settings preview button must remain clickable');
must(app.includes("stopImmediatePropagation"), 'modal close handlers should block reopen propagation');
must(app.includes("el.featureDialogClose.addEventListener('touchend', closeFeatureDialogFromEvent"), 'feature close touch fallback missing');
must(app.includes("el.featureDialogClose.addEventListener('pointerdown', event =>"), 'feature close pointerdown propagation guard missing');
must(!fs.readdirSync(root).some(name => /^PATCH_NOTES_v.*\.md$/.test(name)), 'individual PATCH_NOTES files should not exist');
console.log('PASS pc dock modal rootfix smoke');
