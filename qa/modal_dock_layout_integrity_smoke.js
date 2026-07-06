const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/studio.css'), 'utf8');
const dockCss = fs.readFileSync(path.join(root, 'assets/css/dock.css'), 'utf8');

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL modal/dock layout integrity smoke: ${message}`);
    process.exit(1);
  }
}

must(app.includes("const APP_VERSION = 'Pro v1.3.82'"), 'app version should be Pro v1.3.82');
must(app.includes("const SHARED_DSP_PROFILE_VERSION = 'v1.3.82-pc-dock-modal-rootfix'"), 'DSP slug should be v1.3.82');
must(html.includes('data-build="1.3.82"'), 'index build should be v1.3.82');
must(html.includes('id="featureDialog" class="feature-dialog-backdrop" hidden'), 'feature dialog should start hard-hidden');
must(html.includes('id="previewDialog" class="preview-dialog-backdrop" hidden'), 'preview dialog should start hard-hidden');
must(html.includes('data-preview-dialog-close="true"'), 'preview dialog close fallback marker missing');
must(app.includes('function installPreviewDialogFallback'), 'preview dialog fallback binder missing');
must(app.includes('window.FoxBearCloseFeatureDialog = closeFeatureDialogFromEvent'), 'feature dialog close global fallback missing');
must(app.includes('dialog.hidden = true;') && app.includes("dialog.style.display = 'none'"), 'feature dialog hard close missing');
must(app.includes('el.previewDialog.hidden = true;') && app.includes("el.previewDialog.style.display = 'none'"), 'preview dialog hard close missing');
must(app.includes('el.previewDialog.hidden = false;') && app.includes("el.previewDialog.style.display = 'flex'"), 'preview dialog hard open missing');
must(css.includes('v1.3.82 PC Dock / Modal Root Fix'), 'studio CSS v1.3.82 section missing');
must(dockCss.includes('v1.3.82 PC Dock / Modal Root Fix'), 'dock CSS v1.3.82 section missing');
must(css.includes('grid-template-columns: minmax(0, 1fr) auto'), 'dock top line must keep title left and genre/compare right');
must(html.includes('id="bottomPreviewPlayBtn"'), 'PC dock left meta should now be an external play button');
must(css.includes('grid-template-columns: clamp(160px, 21vw, 270px) minmax(0, 1fr)'), 'PC dock two-column layout should be restored with left play column');
must(css.includes('flex-direction: column !important') && css.includes('aria-label\', \'재생 시간 / 전체 러닝타임') || app.includes("time.setAttribute('aria-label', '재생 시간 / 전체 러닝타임')"), 'player source/time vertical partition missing');
must(!html.includes('PATCH_NOTES_v1.3.82'), 'no per-version patch note should be referenced');
console.log('PASS modal/dock layout integrity smoke');
