#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const state = fs.readFileSync(path.join(root, 'src/state/app-state.js'), 'utf8');
function must(cond, msg) { if (!cond) throw new Error(msg); }
must(html.includes('data-build="1.5.41"'), 'index build should be v1.5.41');
must(html.includes('<label for="targetLufsSelect">라우드니스 타깃 (Loudness Target)</label>'), 'loudness target select label missing');
must(html.includes('id="targetLufsSelect"'), 'loudness target select missing');
must(!html.includes('id="adaptiveLufsToggle"'), 'separate adaptive LUFS checkbox should not be visible in loudness target panel');
must(!html.includes('곡별 Adaptive LUFS</label>'), 'separate adaptive LUFS label should be removed');
must(state.includes('adaptiveTargetLufs: true'), 'adaptive target logic should remain internally enabled');
must(app.includes('resolveTargetLufsForTrack(track)'), 'adaptive target resolver should remain wired');
must(!app.includes("addRow('곡별 Adaptive LUFS'"), 'track details should not render adaptive LUFS as a separate row');
console.log('PASS loudness target UI smoke');
