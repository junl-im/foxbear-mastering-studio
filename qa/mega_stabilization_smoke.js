#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const detail = fs.existsSync(path.join(root, 'src/ui/detail-view.js')) ? fs.readFileSync(path.join(root, 'src/ui/detail-view.js'), 'utf8') : '';
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const state = fs.readFileSync(path.join(root, 'src/state/app-state.js'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
function must(cond, msg) { if (!cond) throw new Error(msg); }
must(app.includes("const APP_VERSION = 'Pro v1.6.86'"), 'app version should be v1.4.0');
must(html.includes('data-build="1.6.86"'), 'index data-build should be v1.6.86');
must(html.includes('referenceStrengthSelect'), 'reference strength select missing');
must(!html.includes('id="adaptiveLufsToggle"'), 'adaptive LUFS checkbox should stay hidden from loudness target UI');
must(html.includes('src/audio/mastering-inspector.js'), 'mastering inspector module missing');
must(state.includes('adaptiveTargetLufs: true'), 'adaptive target state missing');
must(state.includes('referenceMatchStrength: 0.62'), 'reference strength state missing');
must(app.includes('resolveTargetLufsForTrack(track)'), 'adaptive LUFS resolver not wired');
must((app + detail).includes('DSP 적용량 Inspector'), 'DSP amount inspector detail row missing');
must(app.includes('getReferenceMatchStrengthAmount()'), 'reference strength helper missing');
must(pkg.includes('golden_audio_qa_pack.js') && pkg.includes('mega_stabilization_smoke.js'), 'mega QA checks missing');
must(fs.existsSync(path.join(root, 'assets/css/dock.css')), 'dock split CSS missing');
must(fs.existsSync(path.join(root, 'assets/css/export.css')), 'export split CSS missing');
console.log('PASS mega stabilization smoke');
