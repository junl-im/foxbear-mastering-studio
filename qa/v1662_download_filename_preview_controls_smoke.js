#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); }
  };
}

const storage = createStorage();
const context = {
  console,
  Blob,
  localStorage: storage,
  navigator: { userAgent: 'Chrome Desktop', deviceMemory: 8 },
  matchMedia: () => ({ matches: false })
};
context.globalThis = context;
context.window = context;
vm.createContext(context);
vm.runInContext(read('src/download/file-name-policy-service.js'), context, { filename: 'file-name-policy-service.js' });
vm.runInContext(read('src/download/export-guard-service.js'), context, { filename: 'export-guard-service.js' });
vm.runInContext(read('src/download/file-name-workflow-service.js'), context, { filename: 'file-name-workflow-service.js' });

const policy = context.FoxBearFileNamePolicyService;
const guard = context.FoxBearExportGuardService;
const workflow = context.FoxBearFileNameWorkflowService;
assert(policy, 'filename policy should load');
assert(guard, 'export guard should load');
assert(workflow, 'filename workflow should load');
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(policy.loadFileNamePreferences(storage))),
  { includeMastered: true, includeLoudness: true, includeStyle: true, includeFormat: true, includePlatform: true },
  'filename preferences should default to the readable full metadata mode'
);

const sourceName = '천 개의 파랑 (A Thousand Blues).wav';
const build = preferences => policy.buildMasteredFileName({
  sourceName,
  targetLufs: -15,
  style: 'streaming',
  format: 'wav24',
  extension: 'wav',
  platform: 'youtube',
  preferences
});
assert.strictEqual(
  build({ includeMastered: true, includeLoudness: true, includeStyle: true, includeFormat: true, includePlatform: true }),
  '천 개의 파랑 (A Thousand Blues) mastered 15LUFS streaming wav24 youtube.wav',
  'full metadata preference should retain every generated token'
);
assert.strictEqual(
  build({ includeMastered: false, includeLoudness: true, includeStyle: false, includeFormat: true, includePlatform: false }),
  '천 개의 파랑 (A Thousand Blues) 15LUFS wav24.wav',
  'individual metadata tokens should be independently removable'
);
assert.strictEqual(
  build({ includeMastered: false, includeLoudness: false, includeStyle: false, includeFormat: false, includePlatform: false }),
  '천 개의 파랑 (A Thousand Blues).wav',
  'title-only mode should remain valid and preserve the extension'
);
assert.strictEqual(
  policy.buildMasteredFileName({
    sourceName: '천 개의 파랑 (A Thousand Blues) 15LUFS wav24.wav',
    targetLufs: -15,
    style: 'streaming',
    format: 'wav24',
    extension: 'wav',
    preferences: { includeMastered: true, includeLoudness: true, includeStyle: true, includeFormat: true, includePlatform: false }
  }),
  '천 개의 파랑 (A Thousand Blues) mastered 15LUFS streaming wav24.wav',
  'reimporting a configurable partial suffix should not duplicate generated metadata'
);

policy.saveFileNamePreferences({ includeMastered: false, includeLoudness: true, includeStyle: false, includeFormat: true, includePlatform: false }, storage);
assert.strictEqual(
  policy.buildMasteredFileName({ sourceName, targetLufs: -15, style: 'streaming', format: 'wav24', extension: 'wav', storage }),
  '천 개의 파랑 (A Thousand Blues) 15LUFS wav24.wav',
  'saved preferences should be applied when explicit preferences are omitted'
);
policy.resetFileNamePreferences(storage);
assert.strictEqual(policy.loadFileNamePreferences(storage).includeMastered, true, 'reset should restore defaults');

const blockedStorage = {
  getItem() { throw new Error('storage blocked'); },
  setItem() { throw new Error('storage blocked'); },
  removeItem() { throw new Error('storage blocked'); }
};
policy.saveFileNamePreferences({ includeMastered: false, includeLoudness: true, includeStyle: false, includeFormat: false, includePlatform: false }, blockedStorage);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(policy.loadFileNamePreferences(blockedStorage))),
  { includeMastered: false, includeLoudness: true, includeStyle: false, includeFormat: false, includePlatform: false },
  'blocked localStorage should fall back to session memory instead of silently reverting the UI'
);
policy.resetFileNamePreferences(blockedStorage);
assert.strictEqual(policy.loadFileNamePreferences(blockedStorage).includeMastered, true, 'blocked-storage reset should clear the session fallback');

const blob = new Blob([new Uint8Array(128)], { type: 'audio/wav' });
const tracks = [
  { id: 'a', name: '같은 제목.wav', outBlob: blob, outFormat: 'wav24' },
  { id: 'b', name: '같은 제목.wav', outBlob: blob, outFormat: 'wav24' }
];
const plan = guard.prepareZipExportPlan(tracks, {
  fileNameForTrack: track => policy.buildMasteredFileName({ sourceName: track.name, targetLufs: -14, style: 'streaming', format: 'wav24', extension: 'wav' })
});
assert.strictEqual(plan.collisionCount, 1, 'ZIP preflight should expose duplicate filename collisions');
assert.strictEqual(plan.files[1].fileName, '같은 제목 mastered 14LUFS streaming wav24 (2).wav', 'duplicate ZIP entries should show the final disambiguated name');
assert(plan.nameAdjustments.some(item => item.collision), 'collision details should be retained for diagnostics and UI summaries');

const frozenTrack = {
  name: sourceName,
  outFormat: 'wav24',
  outputNameMeta: Object.freeze({ targetLufs: -15, style: 'streaming', platform: 'youtube', format: 'wav24', extension: 'wav' })
};
assert.strictEqual(
  workflow.buildMasteredFileName(frozenTrack, {}, {
    fileNamePolicy: policy,
    state: { targetLufs: -8, masterStyle: 'club', outputFormat: 'mp3_320' },
    getPlatformFileSuffix: () => 'social'
  }),
  '천 개의 파랑 (A Thousand Blues) mastered 15LUFS streaming wav24 youtube.wav',
  'captured mastering metadata should outrank later global controls'
);

const appSource = read('src/app.js');
const workflowSource = read('src/download/file-name-workflow-service.js');
assert(appSource.includes('track.outputNameMeta = Object.freeze'), 'mastering completion should freeze the metadata used for future filenames');
assert(workflowSource.includes('captured.style || track?.masterReport?.target?.masterStyle'), 'later UI setting changes must not rewrite the actual mastering style in filenames');
assert(workflowSource.includes('preferences: encoded.preferences'), 'dialog previews should use the unsaved in-session preference state even when storage is blocked');
assert(appSource.includes('onFileNamePreferencesChange: refreshCompletedOutputNames'), 'filename preference changes should refresh every completed output name');
assert(appSource.includes('renderExportFileNameSummary();'), 'the action panel should render ZIP collision and filename preflight information');
assert(appSource.includes('buildMasteredFileName(track, { format: track.outFormat'), 'bulk export should rebuild names from the current filename policy instead of trusting stale outName values');
assert(workflowSource.includes('renderExportFileNameSummary'), 'bulk filename preflight rendering should remain isolated from the app orchestrator');

const downloadSource = read('src/download/download-service.js');
assert(downloadSource.includes("const fileName = getFallbackMasteredFileName(track, deps"), 'same-format downloads should rebuild the current preferred filename');
assert(!downloadSource.includes("const fileName = track.outName || getFallbackMasteredFileName(track, deps"), 'stale mastered-time names must not override later user filename preferences');

const dialogSource = read('src/ui/download-dialog-view.js');
[
  'download-filename-card',
  'download-filename-preview',
  'download-filename-option-grid',
  'saveFileNamePreferences',
  'resetFileNamePreferences',
  'updateFileNamePreview()',
  'onFileNamePreferencesChange?.(fileNamePreferences)',
  "classList.toggle('is-checked'"
].forEach(token => assert(dialogSource.includes(token), `download dialog should include ${token}`));

const dialogCss = read('assets/css/download-dialog.css');
assert(dialogCss.includes('.download-filename-preview'), 'filename preview should have a dedicated visual container');
assert(dialogCss.includes('overflow-wrap: anywhere'), 'long multilingual filenames should wrap without distorting the dialog');
assert(!dialogCss.includes(':has('), 'filename option styling should not depend on the newer :has selector');
assert(dialogCss.includes('@media (max-width: 420px)'), 'filename settings should include a narrow mobile layout');
const exportCss = read('assets/css/export.css');
assert(exportCss.includes('.export-name-summary'), 'the main action panel should expose export filename preflight styling');

console.log('PASS v1.6.62 download filename preview, controls, collision preflight, and layout smoke');
