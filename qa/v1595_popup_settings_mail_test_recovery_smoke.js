#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const pkg = JSON.parse(read('package.json'));
const sw = read('sw.js');
const index = read('index.html');
const app = read('src/app.js');
const firebase = read('src/firebase-bootstrap.js');
const reporter = read('src/boot/incident-reporter.js');
const incidentControls = read('src/boot/incident-controls-view-service.js');
const performance = read('src/boot/performance-diagnostics.js');
const mobile = read('src/ui/mobile-native-view.js');
const downloadService = read('src/download/download-service.js');
const downloadDialog = read('src/ui/download-dialog-view.js');
const modalController = read('src/ui/modal-controller.js');
const closeCss = read('assets/css/components/modal-close-system.css');
const studioCss = read('assets/css/studio.css');
const supportCss = read('assets/css/components/support-settings.css');

assert.strictEqual(pkg.version, '1.6.93');
assert.match(pkg.foxbearRelease.buildId, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'current build ID must remain kebab-case');

assert(index.includes('program-info-panel program-info-panel-compact'), 'program info must use the compact layout');
assert(index.includes('스마트 분석과 추천') && index.includes('음질 보호 마스터링') && index.includes('듣고 비교하며 조정') && index.includes('일괄 작업과 안전한 저장'), 'program info must explain the actual product workflow');
assert(index.includes('원본 음원은 서버로 전송하지 않습니다'), 'program info must explain local audio privacy');
assert(index.includes('WAV · MP3 · AIFF 권장 · 추가 형식은 브라우저 지원 시 표시'), 'initial import format notice must be concise');
const programInfoStart = index.indexOf('id="programInfoDialog"');
const incidentDialogStart = index.indexOf('id="incidentReportingDialog"');
const programInfoMarkup = index.slice(programInfoStart, incidentDialogStart);
assert(programInfoStart >= 0 && incidentDialogStart > programInfoStart, 'program and incident dialogs must be separate siblings');
assert(!programInfoMarkup.includes('id="incidentReportingToggle"'), 'incident controls must not remain hidden inside the version/about popup');
assert(index.includes('id="incidentReportingDialog" class="support-settings-backdrop" hidden'), 'incident reporting must have a dedicated settings dialog');
for (const id of ['incidentReportingClose', 'incidentReportingToggle', 'incidentReportingTest', 'incidentReportingStatus']) {
    assert(index.includes(`id="${id}"`), `missing incident setting control ${id}`);
}

assert(mobile.includes("['incident-reporting', '📨', '오류 자동신고'"), 'settings must expose incident reporting');
assert(mobile.includes("['performance-diagnostics', '📊', '메모리 성능진단'"), 'settings must expose performance diagnostics');
assert(app.includes("case 'incident-reporting':") && app.includes('openIncidentReportingDialog({ returnFocus })'), 'incident settings action must open its own dialog');
assert(app.includes("case 'performance-diagnostics':") && app.includes('openPerformanceDiagnosticsPanel({ returnFocus })'), 'performance settings action must open its own dialog');
assert(app.includes("document.addEventListener('pointerdown'") && app.includes('mobile.quickPanelOpen'), 'settings panel must close on outside pointer interaction');

const logIncidentStart = firebase.indexOf('async function logIncident');
const logIncidentEnd = firebase.indexOf('async function getIncidentDelivery', logIncidentStart);
const logIncident = firebase.slice(logIncidentStart, logIncidentEnd);
assert(logIncident.includes('await setDoc(reportRef'), 'incident flow must create first');
assert(!logIncident.includes('const existing = await getDoc(reportRef)'), 'incident flow must not pre-read a missing owner-only document');
assert(logIncident.indexOf('await setDoc(reportRef') < logIncident.indexOf('await getDoc(reportRef)'), 'duplicate read is allowed only after create/update failure');
assert(reporter.includes('testInFlight'), 'real mail test must be single-flight');
assert(reporter.includes("'permission-denied': '오류 신고 서버가 요청을 허용하지 않았습니다."), 'permission failures must have actionable guidance');
assert(incidentControls.includes("setAttribute?.('aria-busy'") && reporter.includes('controlsView.render'), 'mail test must expose busy state through the controls view contract');

assert(performance.includes("backdrop.className = 'foxbear-perf-backdrop'"), 'performance diagnostics must be a modal backdrop');
assert(performance.includes("close.className = 'foxbear-perf-panel-close foxbear-modal-close'"), 'performance diagnostics must use the shared close control');
assert(performance.includes('if (event.target === backdrop) setPanelVisible(false);'), 'performance diagnostics must close from backdrop click');
assert(performance.includes("event.key === 'Escape' && state.panelVisible"), 'performance diagnostics must close on Escape');

assert(downloadService.includes("document.addEventListener('pointerdown', handleOutsidePointer, true)"), 'download assist must close on outside pointer interaction');
assert(downloadDialog.includes('event.target === backdrop') && downloadDialog.includes('closeDownloadOptionsDialog(backdrop)'), 'download options must close from its backdrop');
assert(app.includes('event.target === el.programInfoDialog') && app.includes('event.target === el.incidentReportingDialog'), 'static support dialogs must close from backdrop clicks');
assert(app.includes('event.target === backdrop) closeAiRecommendationDialog(backdrop)'), 'AI recommendation dialog must close from backdrop click');
assert(app.includes('event.target === backdrop) closeSelectPopup()'), 'select popup must close from backdrop click');
assert(modalController.includes('cfg.closeOnBackdrop && dialog && target === dialog'), 'managed feature and preview dialogs must retain shared backdrop dismissal');
assert(modalController.includes('closeGenericBackdrop(target, event)') && modalController.includes('button[aria-label*="닫기"]'), 'unregistered dialog backdrops must have a shared outside-click fallback');

assert(closeCss.includes('--foxbear-modal-close-size: 32px'), 'shared close circle must use compact 32px geometry');
assert(closeCss.includes('--foxbear-modal-close-offset: 12px'), 'desktop close control must be inset from rounded corners');
assert(closeCss.includes('--foxbear-modal-close-line: 10px'), 'close glyph must remain visually smaller than the circle');
assert(closeCss.includes('overflow: hidden !important') && closeCss.includes('box-sizing: border-box !important'), 'close glyph must not bleed across the circle');
assert(closeCss.includes('.support-settings-panel') && closeCss.includes('.foxbear-perf-panel') && closeCss.includes('.mobile-native-panel'), 'new and settings popups must reserve the shared close lane');
assert(!studioCss.includes('.program-info-panel-compact') && !studioCss.includes('.support-settings-backdrop'), 'popup styles must not regrow studio.css');
assert(supportCss.includes('.program-info-panel-compact') && supportCss.includes('.support-settings-backdrop'), 'dedicated intro and settings dialog styles are required');
assert(index.includes('assets/css/components/support-settings.css'), 'support settings stylesheet must be loaded');
assert(sw.includes('./assets/css/components/support-settings.css?v=1.6.93-mobile-dock-visibility-integrity-recovery'), 'support settings stylesheet must be precached');

const modalSandbox = { console };
modalSandbox.window = modalSandbox;
vm.createContext(modalSandbox);
vm.runInContext(modalController, modalSandbox);
let closeClicks = 0;
const genericClose = { disabled: false, getAttribute: () => null, click: () => { closeClicks += 1; } };
const genericBackdrop = {
    nodeType: 1,
    dataset: {},
    classList: ['custom-support-backdrop'],
    getAttribute: name => name === 'role' ? 'dialog' : null,
    querySelector: () => genericClose
};
const genericController = new modalSandbox.FoxBearModalStateMachine.FoxBearModalStateMachine({ document: { getElementById: () => null, body: { contains: () => true } } });
const genericEvent = { preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} };
assert.strictEqual(genericController.closeGenericBackdrop(genericBackdrop, genericEvent), true, 'generic backdrop must close through its close control');
assert.strictEqual(closeClicks, 1, 'generic backdrop close control must run exactly once');

console.log('PASS v1.5.95 popup consistency, settings support entry, and first mail-test permission recovery');
