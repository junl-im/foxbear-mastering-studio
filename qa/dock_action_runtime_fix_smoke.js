#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function must(cond, msg) { if (!cond) { console.error('FAIL', msg); process.exit(1); } }
must(app.includes("const APP_VERSION = 'Pro v1.3.73'"), 'app version should be v1.3.73');
must(html.includes('data-build="1.3.73"'), 'index build should be v1.3.73');
must(app.includes('function getDockActionTrack()'), 'dock action track resolver missing');
must(app.includes('function preparePrimaryActionTrack(track)'), 'primary action selection sync missing');
must(app.includes("bottomPreviewMasterPreviewBtn.addEventListener('click', event => runDockRemoteMasterPreview(event))"), 'dock preview button must use remote handler');
must(app.includes('async function runDockRemoteMasterPreview(event = null)'), 'dock preview remote handler missing');
must(app.includes('async function runDockRemoteMaster(event = null)'), 'dock master remote handler missing');
must(app.includes('masterTrack(track, false'), 'dock master button must directly call single-track master action');
must(app.includes('async function masterTrack(track, calledFromBatch = false, options = {})'), 'masterTrack options guard missing');
must(app.includes('return completedSuccessfully;'), 'masterTrack should return result for dock diagnostics');
must(app.includes('WAV, MP3, M4A/AAC, FLAC, OGG/Opus, AIFF, CAF, MP4/MOV'), 'expanded codec help text missing');
console.log('PASS dock action runtime fix smoke');
