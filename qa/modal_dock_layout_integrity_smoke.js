const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function must(c,m){ if(!c){ console.error('FAIL ' + m); process.exit(1);} }
const app=read('src/app.js'); const html=read('index.html'); const dockCss=read('assets/css/dock.css');
must(app.includes("const APP_VERSION = 'Pro v1.6.44'"),'version');
must(app.includes("const SHARED_DSP_PROFILE_VERSION = 'v1.4.0-dock-modal-state-machine'"),'slug');
must(html.includes('data-build="1.6.44"'),'build');
must(html.includes('id="featureDialog" class="feature-dialog-backdrop" hidden'),'feature hidden');
must(html.includes('id="previewDialog" class="preview-dialog-backdrop" hidden'),'preview hidden');
must(html.includes('data-preview-dialog-close="true"'),'preview close marker');
must(app.includes('function installManagedModalController'),'managed modal controller');
must(app.includes('state.modalController = controller'),'single modal controller state');
must(app.includes("hardSetModalState(el.previewDialog, true, 'preview-dialog-open')"),'preview hard open');
must(app.includes("hardSetModalState(el.previewDialog, false, 'preview-dialog-open')"),'preview hard close');
must(dockCss.includes('v1.4.0 Dock / Modal State Machine Refactor'),'dock css v1.4.0 section');
must(dockCss.includes('grid-template-columns: minmax(160px, 1fr) minmax(220px, 48%)'),'top line one-row pc layout');
must(html.includes('id="bottomPreviewPlayBtn"'),'external play button');
must(app.includes("time.setAttribute('aria-label', '재생 시간 / 전체 러닝타임')"),'source/time partition');
console.log('PASS modal/dock layout integrity smoke');
