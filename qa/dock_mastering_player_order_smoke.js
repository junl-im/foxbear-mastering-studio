const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function must(c,m){ if(!c){ console.error('FAIL ' + m); process.exit(1);} }
const app=read('src/app.js'); const html=read('index.html'); const dockCss=read('assets/css/dock.css');
must(app.includes('async function runDockRemoteMaster'),'dock remote master handler');
must(app.includes('masterTrack(track, false'),'single track master path');
must(app.includes('FoxBearDockController'),'dock controller install reference');
must(html.includes('data-dock-action="bottomPreviewMasterBtn"'),'explicit master action');
must(html.indexOf('id="bottomPreviewPlayer"') < html.indexOf('class="bottom-preview-controls"'),'player before actions');
must(html.includes('id="bottomPreviewTranslationModes"'),'translation modes exist');
must(dockCss.includes('v1.4.0 Dock / Modal State Machine Refactor'),'v1.4.0 dock css');
must(dockCss.includes('.bottom-preview-play-glyph'),'external play glyph css');
console.log('PASS dock mastering/player order smoke');
