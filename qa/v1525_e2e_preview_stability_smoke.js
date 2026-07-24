#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const spec = read('qa/browser/preview-translation-playback-playwright.spec.js');
const runner = read('qa/browser/run-browser-e2e.js');
const sync = read('tools/sync-release-metadata.js');

assert(spec.includes('for (let node = element; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement)'),
  'dialog visibility must inspect the full ancestor chain');
assert(spec.includes("node.getAttribute('aria-hidden') === 'true'")
  && spec.includes("style.pointerEvents === 'none'")
  && spec.includes("Number.parseFloat(style.opacity || '1') <= 0.01"),
  'hidden modal ancestors must not be classified as blockers');
assert(spec.includes('window.FoxBearBulkImportGuard?.getSnapshot?.()')
  && spec.includes('window.FoxBearRenderScheduler?.getSnapshot?.()')
  && spec.includes('performance.now() - previous.since >= 220'),
  'preview playback must wait for import, render, and control-layout stability');
assert(spec.includes('createSyntheticWavFiles(1, { seconds: 12, gain: 0.08 })'),
  'preview fixture must be long enough to avoid natural end under CI load');
assert(spec.includes('probe.playCalls += 1') && spec.includes('probe.pauseCalls += 1'),
  'routing must track explicit media method calls rather than browser event timing');
assert(spec.includes('routing called audio.pause()') && spec.includes('routing called audio.play()'),
  'routing failures must identify the exact forbidden media method');
assert(sync.includes("'foxbear-shell-v1.5.4-boot-sri-recovery'")
  && sync.includes("'foxbear-shell-v1.5.5-update-safety'")
  && sync.includes("'foxbear-shell-v1.5.6-export-progress-recovery'"),
  'release sync must permanently retain foundational recovery cache generations');
assert(!spec.includes('expect(result.pauseCount).toBe(0)') && !spec.includes('expect(result.playCount).toBe(0)'),
  'flaky media event-count assertions must not return');
assert(runner.includes('function hasExplicitTestTarget(args = [])')
  && runner.includes('function buildPlaywrightArgs(playwrightCli, forwardedArgs = [], options = {})'),
  'browser runner must expose deterministic target construction');
const { buildPlaywrightArgs, hasExplicitTestTarget } = require('./browser/run-browser-e2e');
assert.strictEqual(hasExplicitTestTarget(['qa/browser/preview-translation-playback-playwright.spec.js']), true);
assert.strictEqual(hasExplicitTestTarget(['--project=chromium-mobile-pwa']), false);
assert.deepStrictEqual(
  buildPlaywrightArgs('playwright-cli', ['qa/browser/preview-translation-playback-playwright.spec.js']),
  ['playwright-cli', 'test', 'qa/browser/preview-translation-playback-playwright.spec.js'],
  'explicit browser spec should not be preceded by the complete suite target'
);

console.log('PASS v1.5.25 deterministic preview routing stability');
