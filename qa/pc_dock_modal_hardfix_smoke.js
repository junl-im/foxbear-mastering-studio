const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function must(c,m){ if(!c){ console.error('FAIL ' + m); process.exit(1);} }
const app=read('src/app.js'); const html=read('index.html'); const css=read('assets/css/dock.css');
must(app.includes('function installManagedModalController'),'managed modal controller missing');
must(app.includes('installManagedModalController();'),'managed modal controller should be called from bindEvents/init');
must(app.includes('window.FoxBearModalStateMachine'),'app should use modal state machine module');
must(app.includes("hardSetModalState(el.featureDialog, true, 'feature-dialog-open')"),'feature open hard sync');
must(app.includes("hardSetModalState(dialog, false, 'feature-dialog-open')"),'feature close hard sync');
must(app.includes("hardSetModalState(el.previewDialog, true, 'preview-dialog-open')"),'preview open hard sync');
must(!/id="previewOpenBtn"[^>]*disabled/.test(html),'preview open not disabled in HTML');
must(app.includes('bottom-preview-play-label'),'PC dock play label');
must(css.includes('grid-template-columns: minmax(160px, 1fr) minmax(220px, 48%)'),'PC dock top info one row');
must(css.includes('bottom-preview-play-glyph'),'play glyph reset');
must(css.includes('max-width: none !important') && css.includes('#bottomPreviewGenre'),'genre width fix');
console.log('PASS pc dock modal hardfix smoke');
