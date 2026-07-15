const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function must(c,m){ if(!c){ console.error('FAIL ' + m); process.exit(1);} }
const app=read('src/app.js'); const html=read('index.html');
must(app.includes("const APP_VERSION = 'Pro v1.5.18'"),'version');
must(html.includes('data-build="1.5.18"'),'build');
must(app.includes('function getDockActionTrack()'),'dock action track resolver');
must(app.includes('function preparePrimaryActionTrack(track)'),'primary action sync');
must(app.includes('async function runDockRemoteMasterPreview(event = null)'),'preview handler');
must(app.includes('async function runDockRemoteMaster(event = null)'),'master handler');
must(app.includes('masterTrack(track, false'),'master direct call');
must(html.includes('data-dock-action="bottomPreviewMasterPreviewBtn"'),'explicit preview action');
must(app.includes('return completedSuccessfully;'),'masterTrack result');
console.log('PASS dock action runtime fix smoke');
