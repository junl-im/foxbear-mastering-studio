const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const modal = fs.readFileSync(path.join(root, 'src/ui/modal-controller.js'), 'utf8');
const dock = fs.readFileSync(path.join(root, 'src/ui/dock-controller.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dockCss = fs.readFileSync(path.join(root, 'assets/css/dock.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function must(condition, message) {
  if (!condition) {
    console.error(`FAIL dock modal state machine smoke: ${message}`);
    process.exit(1);
  }
}

must(pkg.version === '1.5.13', 'package version should be 1.5.13');
must(html.includes('data-build="1.5.13"'), 'index build should be 1.5.13');
must(app.includes("const APP_VERSION = 'Pro v1.5.13'"), 'app version should be Pro v1.5.13');
must(app.includes("const SHARED_DSP_PROFILE_VERSION = 'v1.4.0-dock-modal-state-machine'"), 'DSP slug should be state machine slug');
must(html.includes('src/ui/modal-controller.js?v=1.5.13-handoff-package-integrity'), 'modal controller script should be loaded');
must(html.includes('src/ui/dock-controller.js?v=1.5.13-handoff-package-integrity'), 'dock controller script should be loaded');
must(modal.includes('class FoxBearModalStateMachine'), 'modal state machine class missing');
must(modal.includes('setOpen(name, open'), 'modal controller must centralize hard open/close');
must(modal.includes("document.addEventListener('click'"), 'modal controller should own modal click dispatch');
must(dock.includes('class FoxBearDockController'), 'dock controller class missing');
must(dock.includes('this.root.addEventListener'), 'dock controller should bind to the Dock root, not global document');
must(app.includes('function installManagedModalController'), 'app must install managed modal controller');
must(app.includes('state.modalController = controller'), 'app should keep one modal controller reference');
must(app.includes('function installDockRemoteDelegation') && app.includes('state.dockController = controller'), 'dock delegation should install controller once');
must(!app.includes("document.addEventListener('click', event => {\n        const target = event.target && typeof event.target.closest"), 'old global Dock click capture block should be removed');
must(html.includes('data-dock-action="bottomPreviewPlayBtn"'), 'Dock play action should be explicit');
must(html.includes('data-dock-action="bottomPreviewMasterBtn"'), 'Dock master action should be explicit');
must(dockCss.includes('v1.4.0 Dock / Modal State Machine Refactor'), 'final Dock/modal CSS section missing');
must(dockCss.includes('.bottom-preview-play-glyph'), 'PC play glyph CSS missing');
must(app.includes('bottom-preview-play-glyph'), 'PC play button should use text glyph instead of overlapping icon layers');
must(!fs.existsSync(path.join(root, 'PATCH_NOTES_v1.4.0.md')), 'no per-version patch note should be created');
console.log('PASS dock modal state machine smoke');
