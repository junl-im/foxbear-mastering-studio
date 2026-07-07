#!/usr/bin/env node
'use strict';

const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL stage11_large_modular_renovation_smoke: ${message}`);
    process.exit(1);
  }
}

const index = read('index.html');
const sw = read('sw.js');
const app = read('src/app.js');
const recommendation = read('src/recommendation/recommendation-engine.js');
const components = read('assets/css/components/base-components.css');
const studio = read('assets/css/studio.css');
const pkg = JSON.parse(read('package.json'));
const changelog = read('CHANGELOG.md');
const handoff = read('HANDOFF.md');
const notes = read('PROJECT_NOTES.md');

const layoutCssPos = index.indexOf('assets/css/layout.css');
const componentsCssPos = index.indexOf('assets/css/components/base-components.css');
const studioCssPos = index.indexOf('assets/css/studio.css');
const utilsJsPos = index.indexOf('src/utils/core-utils.js');
const recommendationJsPos = index.indexOf('src/recommendation/recommendation-engine.js');
const appJsPos = index.indexOf('src/app.js');

assert(componentsCssPos > -1, 'index.html should load base-components.css');
assert(layoutCssPos < componentsCssPos && componentsCssPos < studioCssPos, 'base-components.css should load between layout.css and studio.css');
assert(recommendationJsPos > -1, 'index.html should load recommendation-engine.js');
assert(utilsJsPos < recommendationJsPos && recommendationJsPos < appJsPos, 'recommendation-engine.js should load after core utils and before app.js');

assert(recommendation.includes('global.FoxBearRecommendationEngine'), 'recommendation engine global export missing');
assert(recommendation.includes('function recommendPreset(fileName, analysis)'), 'recommendPreset implementation should live in recommendation engine');
assert(recommendation.includes('function makeRecommendationExplanation'), 'recommendation explainability should live in recommendation engine');
assert(recommendation.includes('function buildCandidateExplainText'), 'candidate explanation should live in recommendation engine');
assert(app.includes('function getRecommendationEngine()'), 'app.js recommendation adapter missing');
assert(app.includes('getRecommendationEngine().recommendPreset'), 'app recommendPreset wrapper should delegate to module');
assert(app.includes('getRecommendationEngine().buildRecommendationExplainability'), 'app explainability wrapper should delegate to module');
assert(!app.includes('const keywordMap = {'), 'heavy recommendation scoring map should not remain in app.js');
assert(app.split(/\r?\n/).length < 13850, 'app.js should stay within the post-v1.4.6 modular size budget');

assert(components.includes('.upload-stage') && components.includes('.track-card') && components.includes('.btn-primary'), 'base component CSS should own upload, track-card, and button rules');
assert(components.includes('.toast') && components.includes('.pitch-tool'), 'base component CSS should own toast and pitch tool base rules');
assert(!studio.trimStart().startsWith('.upload-stage {'), 'studio.css should no longer start with the initial upload-stage base rule');
assert(studio.split(/\r?\n/).length < 9800, 'studio.css should shrink after base component split');

assert(/stage(?:11(?:\.1)?|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28)/.test(sw) || sw.includes('foxbear-shell-v1.4.6-stability-polish'), 'service worker cache should be bumped to stage11 or later');
assert(sw.includes('./assets/css/components/base-components.css?v=1.4.6-stability-polish'), 'service worker should precache base-components.css');
assert(sw.includes('./src/recommendation/recommendation-engine.js?v=1.4.6-stability-polish'), 'service worker should precache recommendation engine');
assert(pkg.qaChecks.includes('node --check src/recommendation/recommendation-engine.js'), 'package QA should syntax-check recommendation engine');
assert(pkg.qaChecks.includes('node qa/stage11_large_modular_renovation_smoke.js'), 'package QA should include stage11 smoke');
assert(changelog.includes('Stage11') && handoff.includes('Stage11') && notes.includes('Stage11'), 'handoff docs should mention Stage11');

console.log('PASS stage11 large modular renovation smoke');
