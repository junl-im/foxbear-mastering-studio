const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const must = (condition, message) => {
  if (!condition) {
    console.error(`FAIL v1.4.26 playback transition audit smoke: ${message}`);
    process.exit(1);
  }
};

const version = '1.6.7-incident-readiness-history-sync-performance-hud';
const app = read('src/app.js');
const service = read('src/audio/playback-transition-service.js');
const index = read('index.html');
const sw = read('sw.js');
const runtime = read('src/boot/runtime-health.js');
const pkg = JSON.parse(read('package.json'));

must(pkg.version === '1.6.7', 'package version should be 1.6.7');
must(index.includes(`src/audio/playback-transition-service.js?v=${version}`), 'transition service should load before app');
must(index.indexOf('src/audio/playback-transition-service.js') < index.indexOf('src/audio/waveform-control-service.js'), 'transition service should load before dependent playback UI');
must(sw.includes(`./src/audio/playback-transition-service.js?v=${version}`), 'transition service should be precached');
must(sw.includes(`foxbear-shell-v${version}`) || sw.includes(`foxbear-shell-${version}`) || sw.includes(`foxbear-shell-v1.6.7-incident-readiness-history-sync-performance-hud`), 'service worker cache should use v1.6.7 key');
must(runtime.includes('FoxBearPlaybackTransitionService.crossfadePair'), 'runtime health should require transition service');

must(service.includes('SERVICE_VERSION = \'1.6.7-incident-readiness-history-sync-performance-hud\''), 'transition service version missing');
must(service.includes('function playWithFadeIn'), 'playWithFadeIn missing');
must(service.includes('function pauseWithFadeOut'), 'pauseWithFadeOut missing');
must(service.includes('function crossfadePair'), 'crossfadePair missing');
must(service.includes('catch(error =>') && service.includes('audio.volume = target'), 'fade-in rejection should restore target volume');
must(service.includes('oldAudio && nextAudio && oldAudio === nextAudio'), 'same-audio crossfade guard missing');
must(service.includes('requestAnimationFrame') && service.includes('setTimeout'), 'RAF fallback missing');

must(app.includes('function getPlaybackTransitionService'), 'app transition service gateway missing');
must(app.includes('service.crossfadePair(oldAudio, nextAudio'), 'app should delegate crossfade to service');
must(!app.includes('function fadeAudioVolume(audio, toVolume = 1, durationMs = PLAYBACK_CROSSFADE_MS) {\n    if (!audio) return Promise.resolve(false);'), 'legacy inline fade implementation should be removed from app');

must(app.includes("{ trackId: track.id, mode: 'original', label: '원음 미리듣기' }"), 'original detail preview should register track id for spectrum routing');
must(app.includes("{ trackId: track.id, mode: 'mastered', label: '마스터 미리듣기' }"), 'mastered detail preview should register track id for spectrum routing');
must(app.includes('trackId: options.trackId ||'), 'createPreviewPlayer should pass track id into playback registration');

must(pkg.qaChecks.includes('node --check src/audio/playback-transition-service.js'), 'transition service syntax check should be in qaChecks');
must(pkg.qaChecks.includes('node qa/v143_playback_transition_audit_smoke.js'), 'v1.6.7 smoke should be in qaChecks');

console.log('PASS v1.4.26 playback transition audit smoke');
