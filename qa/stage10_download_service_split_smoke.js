#!/usr/bin/env node
'use strict';

const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL stage10_download_service_split_smoke: ${message}`);
    process.exit(1);
  }
}

const index = read('index.html');
const app = read('src/app.js');
const service = read('src/download/download-service.js');
const sw = read('sw.js');
const pkg = JSON.parse(read('package.json'));
const changelog = read('CHANGELOG.md');
const handoff = read('HANDOFF.md');
const notes = read('PROJECT_NOTES.md');

const servicePos = index.indexOf('src/download/download-service.js');
const dialogPos = index.indexOf('src/ui/download-dialog-view.js');
const appPos = index.indexOf('src/app.js');

assert(servicePos > -1, 'download-service.js is missing from index.html');
assert(servicePos < dialogPos && dialogPos < appPos, 'download service should load before dialog view and app.js');
assert(service.includes('global.FoxBearDownloadService'), 'download service global export missing');
assert(service.includes('prepareTrackDownloadBlob'), 'download blob preparation not moved to service');
assert(service.includes('getDownloadEnvironmentInfo'), 'download environment detector not moved to service');
assert(service.includes('showDownloadAssist'), 'download assist UI not moved to service');
assert(service.includes('supportsWebShareDownloadFiles'), 'web share download guard missing from service');
assert(service.includes('openCurrentPageInExternalBrowser'), 'external browser fallback missing from service');
assert(app.includes('function getDownloadService()'), 'app.js download service adapter missing');
assert(app.includes('getDownloadService().prepareTrackDownloadBlob'), 'prepareTrackDownloadBlob wrapper should delegate to service');
assert(app.includes('getDownloadService().downloadBlob'), 'downloadBlob wrapper should delegate to service');
assert(!app.includes('const shareApi = Boolean(navigator.share && typeof File'), 'download environment implementation should not remain in app.js');
assert(!app.includes('panel.id = \'downloadAssist\''), 'download assist DOM builder should not remain in app.js');
assert(app.split(/\r?\n/).length < 13650, 'app.js should shrink after download service split');
assert(sw.includes('./src/download/download-service.js?v=1.3.84-stage14-runtime-recovery'), 'service worker should precache download service');
assert(/stage(?:10|11|12|13|14)/.test(sw), 'service worker cache should be bumped to stage10');
assert(pkg.qaChecks.includes('node --check src/download/download-service.js'), 'package QA should syntax-check download service');
assert(pkg.qaChecks.includes('node qa/stage10_download_service_split_smoke.js'), 'package QA should include stage10 smoke');
assert(changelog.includes('Stage10'), 'CHANGELOG.md should mention Stage10');
assert(handoff.includes('Stage10'), 'HANDOFF.md should mention Stage10');
assert(notes.includes('Stage10'), 'PROJECT_NOTES.md should mention Stage10');

console.log('PASS stage10 download service split smoke');
