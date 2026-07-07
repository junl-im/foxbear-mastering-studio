const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function must(c,m){ if(!c){ console.error('FAIL ' + m); process.exit(1);} }
const html=read('index.html'); const app=read('src/app.js'); const dockCss=read('assets/css/dock.css'); const sw=read('sw.js'); const manifest=JSON.parse(read('manifest.webmanifest')); const pkg=JSON.parse(read('package.json'));
must(pkg.version==='1.4.0','package version');
must(html.includes('data-build="1.4.0"'),'build');
must(app.includes("const APP_VERSION = 'Pro v1.4.0'"),'app version');
must(html.includes('assets/icons/foxbear-icon-512.png?v=1.4.0-stage26-unified-waveform-controls'),'512 icon cache key');
must(html.includes('assets/icons/apple-touch-icon.png?v=1.4.0-stage26-unified-waveform-controls'),'apple icon cache key');
must(html.includes('data-feature-dialog-close="true"'),'feature close hook');
must(app.includes('function closeFeatureDialogFromEvent'),'close helper');
must(app.includes('function installManagedModalController'),'state machine install');
must(dockCss.includes('v1.4.0 Dock / Modal State Machine Refactor'),'css state machine section');
must(dockCss.includes('#featureDialogClose') && dockCss.includes('pointer-events: auto'),'close pointer css');
const sizes=new Set(manifest.icons.map(i=>i.sizes)); ['48x48','72x72','96x96','128x128','144x144','152x152','180x180','192x192','384x384','512x512'].forEach(size=>must(sizes.has(size),`manifest missing ${size}`));
['foxbear-icon-16.png','foxbear-icon-32.png','foxbear-icon-192.png','foxbear-icon-512.png','apple-touch-icon.png','foxbear-music.png'].forEach(name=>must(fs.existsSync(path.join(root,'assets/icons',name)),`missing icon ${name}`));
console.log('PASS icon button view close smoke');
