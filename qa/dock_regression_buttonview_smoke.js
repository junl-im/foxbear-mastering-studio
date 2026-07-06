const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function must(c,m){ if(!c){ console.error('FAIL ' + m); process.exit(1);} }
const app=read('src/app.js'); const html=read('index.html'); const dockCss=read('assets/css/dock.css');
must(html.includes('id="featureDialog" class="feature-dialog-backdrop" hidden'),'feature dialog hidden initially');
must(html.includes('data-feature-dialog-close="true"'),'feature close marker');
must(app.includes('function installManagedModalController'),'managed modal installer');
must(app.includes('window.FoxBearOpenFeatureDialog'),'feature global open bridge');
must(app.includes('window.FoxBearCloseFeatureDialog'),'feature global close bridge');
must(dockCss.includes('.feature-dialog-backdrop.show:not([hidden])'),'feature modal visible state css');
console.log('PASS dock regression/buttonview smoke');
