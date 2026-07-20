#!/usr/bin/env node
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const css = fs.readFileSync('assets/css/studio.css', 'utf8');
function must(condition, message) {
  if (!condition) {
    console.error(`FAIL snapshot_undo_smoke: ${message}`);
    process.exit(1);
  }
}
must(app.includes("const APP_VERSION = 'Pro v1.5.36'"), 'app version should be v1.4.0');
must(html.includes('snapshotRedoBtn'), 'redo button missing');
must(html.includes('snapshotAiBtn'), 'AI restore button missing');
must(html.includes('snapshotOriginalBtn'), 'original baseline button missing');
must(html.includes('snapshotHistory'), 'snapshot history line missing');
must(app.includes('function saveUndoPoint('), 'saveUndoPoint helper missing');
must(app.includes('function redoSnapshotForSelected('), 'redo helper missing');
must(app.includes('function restoreAiRecommendationSnapshotForSelected('), 'AI restore helper missing');
must(app.includes('redoSnapshots'), 'redo snapshot stack missing');
must(app.includes('saveUndoPointForSelectedOrAll'), 'global undo capture helper missing');
must(app.includes('AUTO_SNAPSHOT_COOLDOWN_MS'), 'auto snapshot cooldown missing');
must(css.includes('v1.3.51 Snapshot / Undo History'), 'snapshot CSS block missing');
console.log('PASS snapshot_undo_smoke');
