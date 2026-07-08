#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL stage20_detail_panels_css_split_smoke: ${message}`);
    process.exit(1);
  }
};

const version = '1.4.20-bulk-import-guard';
const index = read('index.html');
const sw = read('sw.js');
const app = read('src/app.js');
const detailView = read('src/ui/detail-view.js');
const panelsView = read('src/ui/detail-panels-view.js');
const runtimeHealth = read('src/boot/runtime-health.js');
const formsCss = read('assets/css/components/forms.css');
const cardsCss = read('assets/css/components/cards.css');
const pkg = read('package.json');
const overwrite = read('tools/create-overwrite-zip.sh');

assert(index.includes(`assets/css/components/forms.css?v=${version}`), 'index should load forms.css with Stage20 version');
assert(index.includes(`assets/css/components/cards.css?v=${version}`), 'index should load cards.css with Stage20 version');
assert(index.includes(`src/ui/detail-panels-view.js?v=${version}`), 'index should load detail-panels-view.js');
assert(index.indexOf('src/ui/waveform-compare-view.js') < index.indexOf('src/ui/detail-panels-view.js'), 'detail panels should load after waveform compare helpers');
assert(index.indexOf('src/ui/detail-panels-view.js') < index.indexOf('src/ui/detail-view.js'), 'detail panels should load before detail-view');
assert(index.indexOf('src/ui/detail-view.js') < index.indexOf('src/app.js'), 'detail-view should still load before app.js');

assert(sw.includes(`./assets/css/components/forms.css?v=${version}`), 'service worker should precache forms.css');
assert(sw.includes(`./assets/css/components/cards.css?v=${version}`), 'service worker should precache cards.css');
assert(sw.includes(`./src/ui/detail-panels-view.js?v=${version}`), 'service worker should precache detail-panels-view.js');
assert(sw.includes('foxbear-shell-v1.4.20-bulk-import-guard'), 'service worker cache should use Stage20 key');

assert(panelsView.includes('FoxBearDetailPanelsView'), 'detail panels module should export FoxBearDetailPanelsView');
[
  'renderQualityGatePanel',
  'renderMasterReportPanel',
  'renderEngineSafetyPanel',
  'renderMasterComparisonPanel',
  'renderProcessingFlowPanel',
  'renderABStudioPanel',
  'renderLowMonoPanel'
].forEach(name => assert(panelsView.includes(`function ${name}`) || panelsView.includes(`${name},`), `${name} should live in detail panels module`));
assert(app.includes('getDetailPanelsView()'), 'app should resolve detail panels module through a getter');
assert(app.includes('return getDetailPanelsView().renderQualityGatePanel'), 'app quality gate wrapper should delegate to module');
assert(app.includes('return getDetailPanelsView().renderMasterComparisonPanel'), 'app comparison wrapper should delegate to module');
assert(app.includes('return getDetailPanelsView().renderMasterReportPanel'), 'app report wrapper should delegate to module');
assert(detailView.includes('renderMasterComparisonPanel(track);'), 'detail-view should keep panel orchestration intact');
assert(runtimeHealth.includes('FoxBearDetailPanelsView.renderQualityGatePanel'), 'runtime health should require detail panels module');

assert(formsCss.includes('Stage20') && formsCss.includes('.field-row') && formsCss.includes('.pitch-control') && formsCss.includes('.btn-primary'), 'forms.css should own form/control selectors');
assert(cardsCss.includes('Stage20') && cardsCss.includes('.track-card') && cardsCss.includes('.detail-box') && cardsCss.includes('.preview-card'), 'cards.css should own card/panel selectors');
assert(pkg.includes('node --check src/ui/detail-panels-view.js'), 'package should syntax-check detail panels view');
assert(pkg.includes('node qa/stage20_detail_panels_css_split_smoke.js'), 'package should include Stage20 smoke');
assert(overwrite.includes('v1.4.20'), 'overwrite package default should be Stage20');
assert(index.includes(version) && sw.includes(version), 'Stage20 asset version should be consistent');

console.log('PASS stage20 detail panels and CSS split smoke');
