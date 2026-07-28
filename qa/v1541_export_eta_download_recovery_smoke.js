'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const dialog = read('src/ui/download-dialog-view.js');
const app = read('src/app.js');
const css = read('assets/css/download-dialog.css');

assert(dialog.includes('download-options-worker-progress-timing'), 'export timing/ETA line is missing');
assert(dialog.includes("suffix = `약 ${formatDuration(remainingMs)} 남음`"), 'remaining-time estimate is missing');
assert(dialog.includes("progressCard.classList.add('is-stalled')"), 'stalled-task visual state is missing');
assert(dialog.includes("document.hidden\n                    ? '백그라운드 제한으로 느려질 수 있음'"), 'background throttling guidance is missing');
assert(dialog.includes("[...panel.querySelectorAll('button'), ...qualityMenu.querySelectorAll('button')].filter(button => button !== cancelAction)"), 'all dialog and portalled quality actions are not locked during export');
assert(dialog.includes('previous?.__foxbearCleanup?.()'), 'replaced dialog does not clean timers/listeners');
assert(dialog.includes('backdrop.__foxbearCleanup = () =>'), 'dialog lifecycle cleanup hook is missing');
assert(app.includes('panel.__foxbearCleanup?.()'), 'app dialog close path does not call lifecycle cleanup');
assert(css.includes('.download-options-worker-progress.is-stalled'), 'stalled progress styling is missing');

const renderIndex = dialog.indexOf("renderReceipt('download', exported, '다운로드를 시작합니다.')");
const awaitIndex = dialog.indexOf('await downloadBlob(exported.blob, exported.fileName, deps);', renderIndex);
const closeIndex = dialog.indexOf('closeDownloadOptionsDialog(backdrop);', renderIndex);
assert(renderIndex >= 0 && awaitIndex > renderIndex && closeIndex > awaitIndex, 'download dialog still closes before download start succeeds');

const timerStart = dialog.indexOf('progressTimer = setInterval(updateProgressTiming, 1000)');
const timerStop = dialog.indexOf('if (progressTimer) clearInterval(progressTimer)');
assert(timerStart >= 0 && timerStop >= 0, 'progress clock start/stop lifecycle is incomplete');

console.log('PASS v1.5.41 export ETA, stall recovery, button lock, and download failure visibility smoke');
