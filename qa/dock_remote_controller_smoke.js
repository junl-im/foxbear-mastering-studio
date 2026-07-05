const fs = require('fs');
const app = fs.readFileSync('src/app.js', 'utf8');
const dockCss = fs.readFileSync('assets/css/dock.css', 'utf8');
function must(cond, msg) { if (!cond) { console.error(`FAIL ${msg}`); process.exit(1); } }
must(app.includes('function resolveMainActiveTrackForDock()'), 'Dock resolves main active track');
must(app.includes('async function runDockRemoteMaster'), 'Dock master remote handler exists');
must(app.includes('masterTrack(track, false'), 'Dock master calls masterTrack directly');
must(!app.includes("return masterSelectedTracks({ track, source: 'dock' })"), 'Dock master no longer routes through selectedIds batch bridge');
must(app.includes('async function runDockRemoteMasterPreview'), 'Dock preview remote handler exists');
must(app.includes("renderMasterPreviewForTrack(track, { source: 'dock-remote' })"), 'Dock preview calls real preview renderer');
must(app.includes('installDockRemoteDelegation'), 'Dock capture fallback is installed');
must(app.includes("el.bottomPreviewMasterBtn.disabled = false"), 'Dock master button stays clickable');
must(app.includes("el.bottomPreviewMasterPreviewBtn.disabled = false"), 'Dock preview button stays clickable');
must(dockCss.includes('.bottom-preview-master-btn.soft-disabled'), 'soft disabled style exists');
console.log('PASS dock event repair smoke');
