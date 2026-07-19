const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('src/app.js');
const transition = read('src/audio/playback-transition-service.js');
const contexts = read('src/audio/audio-context-manager.js');
const spectrum = read('src/ui/spectrum-visualizer.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(app.includes('function getInAppAudioCompatibility()'), 'in-app browser compatibility detector missing');
assert(app.includes("mode.id === 'studio' || getInAppAudioCompatibility().restricted"), 'Studio/native playback bypass missing');
assert(transition.includes("audio.setAttribute?.('playsinline', '')"), 'playsinline compatibility attribute missing');
assert(transition.includes("audio.setAttribute?.('webkit-playsinline', '')"), 'webkit playsinline compatibility attribute missing');
assert(transition.includes('audio?._foxbearResumeAudioGraph?.()'), 'user-gesture WebAudio resume hook missing');
assert(app.includes('userGesture: true'), 'user-gesture source/translation transition marker missing');
assert(app.includes('playSynchronizedPair(context, [originalAudio, compareAudio]'), 'difference player must start media play in the click task');
assert(app.includes('state.bottomPreviewAutoplayTrackId = null'), 'mastering completion must not force policy-blocked autoplay');

assert(transition.includes('if (options.userGesture && nextAudio'), 'crossfade user-gesture fast path missing');
assert(transition.includes('immediatePlay = nextAudio.play()'), 'crossfade must call play immediately for user gestures');
assert(transition.includes('function playSynchronizedPair('), 'synchronized activation helper missing');

assert(contexts.includes("global.addEventListener('pagehide', event =>"), 'pagehide lifecycle handler missing');
assert(contexts.includes("if (!event?.persisted) closeAll('pagehide')"), 'BFCache restore must preserve live contexts');

assert(spectrum.includes('audio.captureStream || audio.mozCaptureStream'), 'non-invasive spectrum capture route missing');
assert(spectrum.includes('context.createMediaStreamSource(stream)'), 'spectrum MediaStream source missing');
assert(!spectrum.includes('context.createMediaElementSource(audio)'), 'spectrum must not hijack the audible media element route');

const events = [];
const window = {
  navigator: { userAgent: 'Mozilla/5.0 KAKAOTALK 11.0' },
  setTimeout,
  clearTimeout,
  requestAnimationFrame: callback => setTimeout(() => callback(Date.now()), 0),
  cancelAnimationFrame: clearTimeout,
  performance: { now: () => Date.now() },
  FoxBearAudioContextManager: { resume: () => { events.push('resume'); return Promise.resolve(true); } }
};
vm.runInNewContext(transition, { window, console, Promise, Object, Array, Math, Number, String, Error, Date, setTimeout, clearTimeout });
const service = window.FoxBearPlaybackTransitionService;
assert(service.getInAppCompatibility().kakao && service.getInAppCompatibility().restricted, 'KakaoTalk runtime detection failed');
const attributes = {};
const configured = service.configureAudioElement({ setAttribute: (name, value) => { attributes[name] = value; } });
assert(configured.playsInline === true && attributes.playsinline === '' && attributes['webkit-playsinline'] === '', 'inline audio runtime configuration failed');

(async () => {
  await service.playSynchronizedPair({ state: 'suspended' }, [
    { play: () => { events.push('play-a'); return Promise.resolve(); } },
    { play: () => { events.push('play-b'); return Promise.resolve(); } }
  ], 'qa-gesture');
  assert(events.join(',') === 'resume,play-a,play-b', 'synchronized playback must start in one activation task');
  console.log('v1.5.30 in-app playback compatibility smoke passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
