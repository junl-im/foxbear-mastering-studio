#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const context = { console };
context.globalThis = context;
context.window = context;
vm.createContext(context);
vm.runInContext(read('src/download/file-name-policy-service.js'), context, { filename: 'file-name-policy-service.js' });

const policy = context.FoxBearFileNamePolicyService;
assert(policy, 'filename policy service should be exposed');

const sourceName = '천 개의 파랑 (A Thousand Blues).wav';
const expected = '천 개의 파랑 (A Thousand Blues) mastered 15LUFS streaming wav24.wav';
assert.strictEqual(policy.sanitizeTitle(sourceName), '천 개의 파랑 (A Thousand Blues)', 'Korean, Latin text, spaces, and parentheses should be preserved');
assert.strictEqual(policy.buildMasteredFileName({
  sourceName,
  targetLufs: -15,
  style: 'streaming',
  format: 'wav24',
  extension: 'wav'
}), expected, 'mastered filename should use readable spaces instead of underscore separators');

assert.strictEqual(
  policy.buildMasteredFileName({
    sourceName: '천_개의_파랑_A_Thousand_Blues__mastered_15LUFS_streaming_wav24.wav',
    targetLufs: -15,
    style: 'streaming',
    format: 'wav24',
    extension: 'wav'
  }),
  '천 개의 파랑 A Thousand Blues mastered 15LUFS streaming wav24.wav',
  'legacy generated suffixes should be removed before generating a new name'
);

assert.strictEqual(policy.sanitizeFileName('A/B: C*D?.wav'), 'A B C D.wav', 'only filesystem-forbidden characters should be replaced');
assert.strictEqual(policy.sanitizeFileName('CON.wav'), '_CON.wav', 'Windows reserved names should be guarded');
assert.strictEqual(policy.sanitizeFileName('  제목...   '), '제목', 'trailing dots and spaces should be removed');
assert.strictEqual(policy.sanitizeTitle('밤하늘 👨‍👩‍👧‍👦.wav'), '밤하늘 👨‍👩‍👧‍👦', 'safe emoji joiner sequences should be preserved');

const usedNames = new Set();
assert.strictEqual(policy.makeUniqueName(expected, usedNames), expected, 'first ZIP entry should keep the readable name');
assert.strictEqual(policy.makeUniqueName(expected, usedNames), '천 개의 파랑 (A Thousand Blues) mastered 15LUFS streaming wav24 (2).wav', 'ZIP duplicate names should be disambiguated without underscore suffixes');

const longName = policy.buildMasteredFileName({
  sourceName: `${'아주긴제목'.repeat(80)}.wav`,
  targetLufs: -14,
  style: 'streaming',
  format: 'wav24',
  extension: 'wav'
});
assert(policy.utf8Length(longName) <= policy.maxFileNameBytes, 'generated names should stay within the cross-platform UTF-8 byte budget');
assert(longName.endsWith(' mastered 14LUFS streaming wav24.wav'), 'length truncation should preserve mastering metadata and extension');

const appSource = read('src/app.js');
const workflowSource = read('src/download/file-name-workflow-service.js');
assert(appSource.includes('getFileNameWorkflowService().buildMasteredFileName'), 'app mastering output should use the shared filename workflow');
assert(workflowSource.includes('fileNamePolicy?.buildMasteredFileName'), 'filename workflow should delegate to the shared filename policy');
assert(appSource.includes('fileName: `FoxBear mastered ${timestampForFile()}.zip`'), 'bulk ZIP archive name should also be human-readable');
assert(!appSource.includes('_mastered_${lufsPart}_'), 'legacy underscore-based mastered filename builder should be removed');

const downloadSource = read('src/download/download-service.js');
assert(downloadSource.includes("policy?.sanitizeFileName"), 'download delivery sanitizer should use the shared filename policy');
const guardSource = read('src/download/export-guard-service.js');
assert(guardSource.includes('policy?.makeUniqueName'), 'ZIP planning should use the shared unique-name policy');
const workerSource = read('src/workers/zip-encoder.worker.js');
assert(workerSource.includes("importScripts('../download/file-name-policy-service.js?v=1.6.111-ui-mode-session-contract-hardening')"), 'ZIP worker should import the same filename policy');
assert(workerSource.includes('policy.makeUniqueName'), 'ZIP worker entries should use the shared unique-name policy');

console.log('PASS v1.6.61 human-readable download filename policy smoke');
