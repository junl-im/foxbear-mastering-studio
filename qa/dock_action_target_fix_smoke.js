const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
function assert(cond, msg) { if (!cond) { console.error('FAIL dock action target fix smoke:', msg); process.exit(1); } }
assert(app.includes('selectedIds.add(track.id)'), 'imported tracks must be added to selectedIds');
assert(app.includes('track.analysisPromise = analysisJob'), 'analysis promise must be retained for dock action wait');
assert(app.includes('function getPrimaryActionTracks'), 'primary action fallback helper must exist');
assert(app.includes('async function runDockRemoteMaster'), 'dock mastering remote action must exist');
assert(app.includes('masterTrack(track, false'), 'dock mastering must call the single selected-track master action directly');
assert(app.includes("String(options.source || '').startsWith('dock') ? '추천구간 미리듣기' : '미리듣기'"), 'dock preview must wait for analysis');
assert(!app.includes("track.status === 'processing' || track.status === 'analyzing' || Boolean(track.error);"), 'dock buttons must not be disabled solely because analysis is running');
console.log('PASS dock action target fix smoke');
