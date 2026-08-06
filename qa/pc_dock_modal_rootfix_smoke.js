const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function must(c,m){ if(!c){ console.error('FAIL ' + m); process.exit(1);} }
const app=read('src/app.js'); const html=read('index.html'); const dockCss=read('assets/css/dock.css'); const pkg=JSON.parse(read('package.json'));
must(pkg.version==='1.6.66','package version');
must(html.includes('data-build="1.6.66"'),'build');
must(app.includes("const APP_VERSION = 'Pro v1.6.66'"),'app version');
must(html.includes('id="bottomPreviewPlayBtn"'),'PC dock external play button');
must(app.includes('bottom-preview-play-glyph'),'clear play glyph');
must(app.includes('function toggleBottomPreviewExternalPlayback'),'external play toggle');
must(app.includes('function syncBottomPreviewExternalPlayButton'),'external play sync');
must(dockCss.includes('grid-template-columns: clamp(104px, 10.5vw, 136px) minmax(0, 1fr)'),'PC dock left play column');
must(dockCss.includes('v1.4.0 Dock / Modal State Machine Refactor'),'dock css v1.4.0 override');
must(dockCss.includes('.dock-integrated-toggle') && dockCss.includes('display: none !important'),'internal toggle hidden on PC');
must(app.includes('el.previewOpenBtn.disabled = false;'),'preview open remains clickable');
must(app.includes('function installManagedModalController'),'modal state machine installed');
must(!fs.readdirSync(root).some(name=>/^PATCH_NOTES_v.*\.md$/.test(name)),'no individual patch notes');
console.log('PASS pc dock modal rootfix smoke');
