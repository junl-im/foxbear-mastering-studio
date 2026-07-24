#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL stage23_playback_orchestration_smoke: ${message}`);
    process.exit(1);
  }
};

const version = '1.5.99-incident-callable-mail-recovery';
const index = read('index.html');
const sw = read('sw.js');
const pkg = read('package.json');
const app = read('src/app.js');
const service = read('src/audio/playback-link-service.js');
const css = read('assets/css/components/playback-link.css');
const runtime = read('src/boot/runtime-health.js');
const overwrite = read('tools/create-overwrite-zip.sh');

assert(index.includes(version), 'index should use Stage23 asset query');
assert(sw.includes(`foxbear-shell-v${version}`), 'service worker should use Stage23 cache key');
assert(sw.includes(`./src/audio/playback-link-service.js?v=${version}`), 'SW should precache playback orchestration service');
assert(pkg.includes('FoxBear AI Mastering Studio'), 'package description should identify the FoxBear project');
assert(pkg.includes('node qa/stage23_playback_orchestration_smoke.js'), 'package should run Stage23 smoke');
assert(overwrite.includes('package.json') && overwrite.includes("'v' + (p.version || 'dev')"), 'overwrite package default should be Stage23');

assert(service.includes('ORCHESTRATION_EVENT_NAME'), 'service should define orchestration event');
assert(service.includes('foxbear:playback-orchestration-change'), 'service should emit orchestration event');
assert(service.includes('const registeredAudios = new Set()'), 'service should keep iterable registered audio set');
assert(service.includes('function enforceOrchestration'), 'service should enforce exclusive playback');
assert(service.includes('function pauseAllExcept'), 'service should expose pauseAllExcept');
assert(service.includes('function pauseAll'), 'service should expose pauseAll');
assert(service.includes('samePlayableSyncGroup'), 'service should preserve intentional sync-pair playback');
assert(service.includes('groupPolicy') && service.includes('sync-pair'), 'service should tag playback groups/policies');
assert(service.includes('pauseAudioSafely(other, reason)'), 'service should pause conflicting players when a new player starts');
assert(service.includes('playback-link-conflict'), 'service should flag unresolved playback conflicts');
assert(service.includes('getOrchestrationSnapshot'), 'service should expose last orchestration snapshot');

assert(app.includes('foxbear:playback-orchestration-change'), 'app should bridge orchestration events to body dataset');
assert(app.includes("FoxBearPlaybackLinkService.pauseAllExcept(audio, 'legacy-exclusive-preview')"), 'legacy exclusive preview should delegate to orchestration service');
assert(app.includes("document.body.dataset.playbackOrchestration"), 'body should expose playback orchestration state');
assert(runtime.includes('FoxBearPlaybackLinkService.pauseAllExcept'), 'runtime health should require orchestration API');

assert(css.includes('.playback-link-orchestrated'), 'CSS should style orchestrated transitions');
assert(css.includes('.playback-link-conflict'), 'CSS should style playback conflict state');
assert(css.includes('data-playback-orchestration'), 'CSS should react to body orchestration state');

console.log('PASS stage23 playback orchestration smoke');
