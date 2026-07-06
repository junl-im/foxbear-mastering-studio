#!/usr/bin/env node
'use strict';

const fs = require('fs');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
}

const app = fs.readFileSync('src/app.js', 'utf8');
const dockCss = fs.readFileSync('assets/css/dock.css', 'utf8');
const mobileCss = fs.readFileSync('assets/css/mobile-native.css', 'utf8');
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const handoff = fs.readFileSync('HANDOFF.md', 'utf8');
const notes = fs.readFileSync('PROJECT_NOTES.md', 'utf8');

assert(app.includes("window.addEventListener('unhandledrejection', handleUnhandledRejection)"), 'global unhandled rejection handler should be routed through handleUnhandledRejection');
assert(app.includes('function isBenignPlaybackRejection'), 'playback rejection classifier is missing');
assert(app.includes('function handleUnhandledRejection'), 'handleUnhandledRejection function is missing');
assert(app.includes('브라우저가 자동 재생을 잠시 막았습니다'), 'benign playback rejection should show playback-specific guidance');
assert(app.includes("result.catch(error =>") && app.includes('FoxBear async init step failed'), 'runInitStep should catch async init promise failures');
assert(app.includes('Analysis error handler failed'), 'analysis catch handler should not create unhandled rejections');
assert(/const floatingGap = mobile \? [14] : 10/.test(app), 'mobile floating gap should be compact');
assert(/const hudGap = mobile \? [14] : 8/.test(app), 'mobile HUD gap should be compact');
assert(/const panelGap = mobile \? (4|10) : 18/.test(app), 'mobile panel gap should be compact but safe');

assert(dockCss.includes('Stage8: compact mobile Dock overlay anchors'), 'dock.css should include Stage8 compact overlay section');
assert(dockCss.includes('Stage8: compact mobile Dock overlay anchors') || dockCss.includes('Stage11.1: pin mobile floating notices'), 'mobile toast/HUD should sit close to Dock');
assert(mobileCss.includes('Stage8: keep mobile wake-lock/status controls attached to the Dock'), 'mobile-native.css should include Stage8 compact status section');
assert((mobileCss.includes(' + 3px)') && mobileCss.includes(' + 2px)')) || mobileCss.includes(' + 1px)'), 'mobile native layer should use tight Dock gaps');

assert(changelog.includes('Stage8') && handoff.includes('Stage8') && notes.includes('Stage8'), 'handoff docs should mention Stage8');

console.log('PASS stage8 async/mobile Dock smoke');
