#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('src/app.js', 'utf8');
const recovery = fs.readFileSync('src/audio/post-master-playback-recovery-service.js', 'utf8');
const transition = fs.readFileSync('src/audio/playback-transition-service.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.foxbearRelease.assetVersion;

assert.strictEqual(pkg.version, '1.6.76');
assert(pkg.qaChecks.includes('node --check src/audio/post-master-playback-recovery-service.js'));
assert(pkg.qaChecks.includes('node qa/v1652_post_master_playback_readiness_smoke.js'));
assert(index.includes(`src/audio/post-master-playback-recovery-service.js?v=${version}`), 'recovery service should load in index');
assert(index.indexOf('src/audio/post-master-playback-recovery-service.js') < index.indexOf('src/app.js'), 'recovery service must load before app');
assert(sw.includes(`./src/audio/post-master-playback-recovery-service.js?v=${version}`), 'recovery service should be precached');

assert(app.includes('stabilizeBottomPreviewDockAfterMastering(track, { preserveOriginalPlayback: preserveOriginalDockPlayback })'), 'master completion should use the non-destructive Dock stabilizer');
assert(!app.includes("forceRefreshBottomPreviewDock(track, 'master-complete')"), 'master completion must not force a second player replacement');
assert(app.includes('FoxBearPostMasterPlaybackRecoveryService.createController'), 'app should delegate recovery ownership to the extracted service');

assert(recovery.includes("isAligned(track, 'mastered', current)"), 'master completion should verify the committed mastered source before rebuilding');
assert(recovery.includes('if (current && (current._foxbearFadeState || !current.paused)) return false;'), 'an active user playback request must not be replaced');
assert(recovery.includes('postMasterPlaybackToken'), 'post-master repair should be generation fenced');
assert(recovery.includes('DEFAULT_READY_TIMEOUT_MS = 2200'), 'freshly rendered Blob playback needs an extended readiness window');
assert(recovery.includes('if (target.ended)'), 'ended media should rewind before replay');
assert(recovery.includes('findPlayerOwner'), 'active audio should resolve its owning player');
assert(recovery.includes('target.isConnected === false'), 'detached audio recovery is missing');

const playFunction = app.match(/function playBottomPreviewAudio\(options = \{\}\) \{([\s\S]*?)\n\}/)?.[1] || '';
assert(playFunction.includes('getBottomPreviewAudio()'), 'Dock play should resolve the active audio element');
assert(playFunction.includes('getBottomPreviewPlayerOwner(audio)'), 'Dock play should resolve the owner of the active audio element');
assert(!playFunction.includes('firstElementChild'), 'Dock play must not select a stale first crossfade child');
assert(playFunction.includes('player._foxbearPlay(options)'), 'user gesture options should follow the active player');
assert(app.includes("if (mode === 'mastered' || mode === 'masterPreview') audio.preload = 'auto';"), 'rendered master sources should warm media data');
assert(app.includes("audio.addEventListener('error'"), 'media source errors should update the player state');

assert(transition.includes('if (!completed && ownsRequest && connected) audio.volume = target;'), 'cancelled play fades should restore audible volume');
assert(transition.includes('if (oldAudio) oldAudio.volume = oldTarget;') && transition.includes('if (nextAudio) nextAudio.volume = nextTarget;'), 'cancelled crossfades should restore both target volumes');
assert(app.split(/\r?\n/).length < 13300, 'app orchestration line budget should remain intact');

console.log('PASS v1.6.52 post-master Dock stability, active-player ownership, media readiness, and audible-volume recovery');
