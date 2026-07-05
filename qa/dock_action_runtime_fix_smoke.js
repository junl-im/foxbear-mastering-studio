#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function must(cond, msg) { if (!cond) { console.error('FAIL', msg); process.exit(1); } }
must(app.includes("const APP_VERSION = 'Pro v1.3.70'"), 'app version should be v1.3.70');
must(html.includes('data-build="1.3.70"'), 'index build should be v1.3.70');
must(app.includes('function getDockActionTrack()'), 'dock action track resolver missing');
must(app.includes('function prepareTrackForDockAction(track)'), 'dock action selection sync missing');
must(app.includes("bottomPreviewMasterPreviewBtn.addEventListener('click', event => renderDockMasterPreview(event))"), 'dock preview button must use dock-specific handler');
must(app.includes('async function renderDockMasterPreview(event = null)'), 'dock preview handler missing');
must(app.includes('await masterTrack(track, false, { notifyBlocked: true, forceIfIdle: true, awaitAnalysis: true, source: \'dock\' })'), 'dock master button must force explicit runtime path');
must(app.includes('async function masterTrack(track, calledFromBatch = false, options = {})'), 'masterTrack options guard missing');
must(app.includes('return completedSuccessfully;'), 'masterTrack should return result for dock diagnostics');
must(app.includes('WAV, MP3, M4A/AAC, FLAC, OGG/Opus, AIFF, CAF, MP4/MOV'), 'expanded codec help text missing');
console.log('PASS dock action target fix smoke');
