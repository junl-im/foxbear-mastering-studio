#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { console.error(`FAIL v1.5.31 player/download stability smoke: ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const pkg = JSON.parse(read('package.json'));
const app = read('src/app.js');
const dialog = read('src/ui/download-dialog-view.js');
const download = read('src/download/download-service.js');
const css = read('assets/css/download-dialog.css');

assert(pkg.qaChecks.includes('node qa/v1531_player_download_stability_smoke.js'), 'QA command missing');
assert(app.includes('preserveOriginalDockPlayback'), 'original playback preservation guard missing');
assert(app.includes("state.bottomPreviewMode = preserveOriginalDockPlayback ? 'original' : 'mastered'"), 'master completion mode preservation missing');
assert(app.includes('options.userGesture && transitionOldAudio'), 'programmatic Dock source changes must not create a crossfade player');
assert(app.includes('previewRefreshToken'), 'Dock refresh deduplication token missing');
assert(app.includes('children.length > 1') && app.includes('child.remove()'), 'stale duplicate Dock player cleanup missing');
assert(app.includes('getSingleTrackDownloadReencodePolicy'), 'single-track format re-encode retention policy missing');
assert(app.includes('isRestrictedDownloadBrowser()) return {}'), 'restricted browser PCM retention guard missing');
assert(app.includes('maxRetainedBuffers: 1'), 'single retained PCM limit missing');

assert(dialog.includes('download-options-panel-simple'), 'simple download panel mode missing');
assert(dialog.includes("const visibleOptions = env.restricted ? options.filter"), 'restricted format list reduction missing');
assert(dialog.includes("'선택 형식 다운로드'"), 'normal browser format download action missing');
assert(dialog.includes("'기기에 저장/공유'"), 'in-app native share/save action missing');
assert(dialog.includes("'파일 열기'"), 'in-app file-open fallback missing');
assert(dialog.includes("'외부 브라우저'"), 'in-app external browser fallback missing');
assert(!dialog.includes('panel.append(close, title, name, envBox, flowCard'), 'verbose environment/flow cards are still appended');
assert(download.includes('download-assist-simple'), 'compact save assist mode missing');
assert(download.includes("panel.append(closeTop, title, message, file, actions)"), 'save assist should only append essential controls');
assert(css.includes('.download-options-panel-simple') && css.includes('.download-assist-simple'), 'simple download styles missing');

console.log('PASS v1.5.31 player/download stability smoke');
