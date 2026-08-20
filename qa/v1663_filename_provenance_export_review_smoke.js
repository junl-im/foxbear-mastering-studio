#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const context = { console, Blob, Intl, setTimeout, clearTimeout };
context.globalThis = context;
context.window = context;
vm.createContext(context);
vm.runInContext(read('src/download/file-name-policy-service.js'), context, { filename: 'file-name-policy-service.js' });
vm.runInContext(read('src/download/file-name-workflow-service.js'), context, { filename: 'file-name-workflow-service.js' });
vm.runInContext(read('src/download/export-guard-service.js'), context, { filename: 'export-guard-service.js' });

const policy = context.FoxBearFileNamePolicyService;
const workflow = context.FoxBearFileNameWorkflowService;
const guard = context.FoxBearExportGuardService;
assert(policy && workflow && guard, 'v1.6.110 filename services should load together');

const familyEmoji = '👨‍👩‍👧‍👦';
const exactLimit = policy.utf8Length(`긴 제목 ${familyEmoji}`);
assert.strictEqual(policy.truncateUtf8(`긴 제목 ${familyEmoji}`, exactLimit), `긴 제목 ${familyEmoji}`, 'grapheme-safe truncation should preserve a complete emoji family');
const clipped = policy.truncateUtf8(`${'a'.repeat(238)}${familyEmoji}`, 240);
assert(!/[\u200d\u0300-\u036f\ufe00-\ufe0f]$/u.test(clipped), 'truncation must not leave a dangling joiner, combining mark, or variation selector');

assert.strictEqual(
  policy.buildMasteredFileName({
    sourceName: '실제 제목 15LUFS wav24.wav',
    targetLufs: -14,
    style: 'streaming',
    format: 'wav24',
    extension: 'wav',
    preserveExactTitle: true
  }),
  '실제 제목 15LUFS wav24 mastered 14LUFS streaming wav24.wav',
  'callers should have an explicit escape hatch when metadata-like words are part of the real title'
);

const track = {
  id: 'source-provenance',
  name: '화면에서 바뀐 이름.wav',
  sourceFileName: '처음 불러온 제목.wav',
  outFormat: 'wav24',
  outputNameMeta: Object.freeze({
    sourceName: '마스터링 당시 제목.wav',
    targetLufs: -15,
    style: 'streaming',
    platform: '',
    format: 'wav24',
    extension: 'wav'
  })
};
assert.strictEqual(
  workflow.buildMasteredFileName(track, {}, { fileNamePolicy: policy, state: {} }),
  '마스터링 당시 제목 mastered 15LUFS streaming wav24.wav',
  'captured source filename provenance should outrank later mutable track labels'
);

const blob = new Blob([new Uint8Array(128)], { type: 'audio/wav' });
const completed = [
  { id: 'a', name: 'a.wav', sourceFileName: 'a.wav', outName: 'a.wav', outFormat: 'wav24', outBlob: blob },
  { id: 'b', name: 'b.wav', sourceFileName: 'b.wav', outName: 'b.wav', outFormat: 'wav24', outBlob: blob },
  { id: 'c', name: 'c.wav', sourceFileName: 'c.wav', outName: 'c.wav', outFormat: 'wav24', outBlob: blob }
];
const preferences = policy.loadFileNamePreferences({ getItem: () => null });
const beforeKey = workflow.buildSummaryKey(completed, 3, preferences);
completed[1].outName = '중간 곡 이름 변경.wav';
const afterKey = workflow.buildSummaryKey(completed, 3, preferences);
assert.notStrictEqual(afterKey, beforeKey, 'export filename summary must refresh when a middle track changes while the count and last track stay the same');

const longProposed = `${'가'.repeat(120)}.wav`;
const plan = guard.prepareZipExportPlan([
  { id: 'long', name: 'long.wav', sourceFileName: 'long.wav', outBlob: blob, outFormat: 'wav24' }
], { fileNameForTrack: () => longProposed });
assert.strictEqual(plan.adjustedNameCount, 1, 'preflight should report a filename adjusted for the byte budget');
assert.strictEqual(plan.nameAdjustments[0].truncated, true, 'preflight diagnostics should distinguish byte-length truncation');
assert.strictEqual(plan.nameAdjustments[0].sanitizedChanged, true, 'the adjusted final name should be visible to the review UI');

const lifecycleSource = read('src/state/track-lifecycle-service.js');
const appSource = read('src/app.js');
const dialogSource = read('src/ui/download-dialog-view.js');
const workflowSource = read('src/download/file-name-workflow-service.js');
const dialogCss = read('assets/css/download-dialog.css');
const exportCss = read('assets/css/export.css');
assert(lifecycleSource.includes('sourceFileName: file.name'), 'track creation should retain the exact imported filename separately');
assert(appSource.includes("sourceName: String(track?.sourceFileName || track?.name || 'track')"), 'mastering completion should freeze source filename provenance');
assert(workflowSource.includes('completed.forEach(track =>'), 'summary cache keys should include every completed track, not only the last row');
assert(workflowSource.includes('export-name-review-list'), 'bulk export should expose a bounded filename review list');
assert(workflowSource.includes('전체 파일명 복사'), 'bulk export should support copying the complete final filename list');
assert(dialogSource.includes('download-filename-copy'), 'download dialog should expose a direct filename copy action');
assert(dialogSource.includes("fileNameCopyStatus.setAttribute('aria-live', 'polite')"), 'filename copy feedback should be announced accessibly');
assert(dialogCss.includes('.download-filename-actions'), 'download filename actions should wrap safely on narrow screens');
assert(dialogCss.includes('@media (forced-colors: active)'), 'download filename controls should remain visible in forced-colors mode');
assert(exportCss.includes('.export-name-summary-actions'), 'export filename review actions should have dedicated responsive layout');
assert(exportCss.includes('max-height: min(34vh, 250px)'), 'large filename reviews should be scroll-bounded instead of stretching the console');

console.log('PASS v1.6.63 filename provenance, grapheme truncation, export review, and responsive copy controls smoke');
