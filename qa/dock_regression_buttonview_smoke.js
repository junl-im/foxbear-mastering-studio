const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const css = fs.readFileSync('assets/css/studio.css', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
function must(cond, msg) { if (!cond) { console.error(msg); process.exit(1); } }

must(html.includes('data-build="1.3.82"'), 'index build should be v1.3.82');
must(app.includes("const APP_VERSION = 'Pro v1.3.82'"), 'app version should be v1.3.82');
must(app.includes("const SHARED_DSP_PROFILE_VERSION = 'v1.3.82-pc-dock-modal-rootfix'"), 'DSP profile slug should be v1.3.82');
must(pkg.version === '1.3.82', 'package version should be 1.3.82');

must(app.includes('function ensureFeatureDialogLayer()'), 'feature dialog layer guard missing');
must(app.includes("window.FoxBearOpenFeatureDialog = forceOpenFeatureDialog"), 'feature dialog global fallback missing');
must(!app.includes("['pointerdown', 'pointerup', 'click']"), 'old pointerdown/up fallback should be removed');
must(app.includes("['click', 'touchend']"), 'feature pointer/mouse/click/touch fallback missing');
must(css.includes('v1.3.82 PC Dock / Modal Root Fix'), 'v1.3.82 CSS guard missing');
must(css.includes('z-index: 24750 !important'), 'feature dialog should be above Dock without becoming top-most');
must(css.includes('z-index: auto !important'), 'feature open button z-index reset missing');

must(app.includes('function forceRefreshBottomPreviewDock'), 'Dock waveform force refresh helper missing');
must(app.includes("forceRefreshBottomPreviewDock(track, 'analysis-complete')"), 'Dock refresh after analysis missing');
must(app.includes("forceRefreshBottomPreviewDock(track, 'master-complete')"), 'Dock refresh after mastering missing');
must(app.includes("bars.dataset.waveformReady !== 'true'"), 'placeholder-to-real waveform refresh guard missing');
must(app.includes('wrap._foxbearPlay'), 'integrated player public play bridge missing');

must(app.includes('download-focus-card'), 'post-master download focus card missing');
must(app.includes('download-focus-button'), 'post-master download focus button missing');
must(css.includes('foxbear-download-focus-pulse'), 'download focus pulse CSS missing');
console.log('PASS dock regression button view smoke');
