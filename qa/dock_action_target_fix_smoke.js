const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
function assert(cond, msg) { if (!cond) { console.error('FAIL dock action target fix smoke:', msg); process.exit(1); } }
assert(app.includes("selectedIds.add(track.id)"), 'imported tracks must be added to selectedIds');
assert(app.includes('track.analysisPromise = analysisJob'), 'analysis promise must be retained for dock action wait');
assert(app.includes('waitForTrackAnalysisIfNeeded(track, \'Dock 마스터링\')'), 'dock mastering must wait for analysis instead of asking for selection');
assert(app.includes("await masterTrack(track, false, { notifyBlocked: true, forceIfIdle: true, awaitAnalysis: true, source: 'dock' })"), 'dock mastering must call masterTrack with awaitAnalysis');
assert(app.includes("waitForTrackAnalysisIfNeeded(track, options.source === 'dock' ? '추천구간 미리듣기' : '미리듣기')"), 'dock preview must wait for analysis');
assert(!app.includes("track.status === 'processing' || track.status === 'analyzing' || Boolean(track.error);"), 'dock buttons must not be disabled solely because analysis is running');
console.log('PASS dock action target fix smoke');
