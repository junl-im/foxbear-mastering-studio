#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL stage22_playback_link_audit_smoke: ${message}`);
    process.exit(1);
  }
};

const version = '1.6.42-spark-google-admin-auth';
const index = read('index.html');
const sw = read('sw.js');
const app = read('src/app.js');
const service = read('src/audio/playback-link-service.js');
const css = read('assets/css/components/playback-link.css');
const runtime = read('src/boot/runtime-health.js');
const pkg = read('package.json');
const overwrite = read('tools/create-overwrite-zip.sh');

assert(index.includes(`assets/css/components/playback-link.css?v=${version}`), 'index should load playback-link.css with Stage23 key');
assert(index.includes(`src/audio/playback-link-service.js?v=${version}`), 'index should load playback-link-service.js with Stage23 key');
assert(sw.includes(`./assets/css/components/playback-link.css?v=${version}`), 'service worker should precache playback-link.css');
assert(sw.includes(`./src/audio/playback-link-service.js?v=${version}`), 'service worker should precache playback link service');
assert(sw.includes(`foxbear-shell-v${version}`) || sw.includes(`foxbear-shell-${version}`), 'service worker cache should use Stage23 key');

assert(service.includes('FoxBearPlaybackLinkService'), 'playback link service should expose global service');
assert(service.includes('registerAudio'), 'service should register audio players');
assert(service.includes('installDomAudit'), 'service should install DOM audit observer');
assert(service.includes('foxbear:playback-link-change'), 'service should emit global playback-link event');
assert(service.includes('AUDIO_SELECTOR'), 'service should scan known player audio selectors');

assert(app.includes('const FoxBearPlaybackLinkService = window.FoxBearPlaybackLinkService || {};'), 'app should read playback link service');
assert(app.includes("runInitStep('플레이어 연동 상태 감시', installPlaybackLinkStatusBridge);"), 'app should install playback link audit during init');
assert(app.includes('function registerPlaybackLinkedAudio'), 'app should provide register wrapper');
assert(app.includes("role: options.playerRole || (options.waveformRole === 'dock-player' ? 'bottom-dock' : 'inline-preview')"), 'dock-integrated players should register with role metadata');
assert(app.includes("role: 'ab-switch-original'"), 'A/B original player should be registered');
assert(app.includes("role: 'ab-switch-mastered'"), 'A/B mastered player should be registered');
assert(app.includes("role: 'difference-compare'"), 'difference compare player should be registered');
assert(app.includes("role: 'difference-original'"), 'difference original player should be registered');
assert(app.includes('전역 재생상태 연동'), 'settings preview bridge should show global playback bus linkage');

assert(css.includes('.playback-link-chip'), 'CSS should define playback link chip');
assert(css.includes('.playback-link-active'), 'CSS should show active linked player state');
assert(runtime.includes('FoxBearPlaybackLinkService.registerAudio'), 'runtime health should require playback link service');
assert(pkg.includes('node --check src/audio/playback-link-service.js'), 'package should syntax-check playback link service');
assert(pkg.includes('node qa/stage22_playback_link_audit_smoke.js'), 'package should include Stage23 smoke');
assert(overwrite.includes('package.json') && overwrite.includes("'v' + (p.version || 'dev')"), 'overwrite package default should be Stage23');

console.log('PASS stage22 playback link audit smoke');
