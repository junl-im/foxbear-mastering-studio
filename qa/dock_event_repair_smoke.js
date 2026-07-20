const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function must(c,m){ if(!c){ console.error('FAIL ' + m); process.exit(1);} }
const app=read('src/app.js'); const dockCss=read('assets/css/dock.css'); const html=read('index.html'); const pkg=JSON.parse(read('package.json')); const sw=read('sw.js');
must(app.includes("const APP_VERSION = 'Pro v1.5.36'"),'version');
must(html.includes('data-build="1.5.36"'),'build');
must(pkg.version==='1.5.36','package version');
must(sw.includes('foxbear-shell-v1.5.36-interaction-lifecycle-hardening'),'sw cache');
must(html.includes('src/ui/dock-controller.js?v=1.5.36-interaction-lifecycle-hardening'),'dock controller loaded');
must(app.includes("runDockRemoteSourceMode('original', event)"),'original dispatcher');
must(app.includes("runDockRemoteSourceMode('mastered', event)"),'mastered dispatcher');
must(app.includes('function runDockRemoteTranslationMode'),'translation dispatcher');
must(html.includes('data-dock-action="bottomPreviewOriginalBtn"') && html.includes('data-dock-action="bottomPreviewMasteredBtn"'),'source actions explicit');
must(dockCss.includes('v1.4.0 Dock / Modal State Machine Refactor'),'css section');
console.log('PASS dock event repair smoke');
