#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const index = read('index.html');
const app = read('src/app.js');
const css = read('assets/css/mobile-native.css');
const sw = read('sw.js');
const browserSpec = read('qa/browser/preview-translation-playback-playwright.spec.js');

assert(index.includes('src/audio/preview-translation-service.js'), 'preview translation service must load in index.html');
assert(index.indexOf('src/audio/audio-context-manager.js') < index.indexOf('src/audio/preview-translation-service.js'), 'audio context manager must load before preview translation service');
assert(index.indexOf('src/audio/preview-translation-service.js') < index.indexOf('src/app.js'), 'preview translation service must load before app.js');
assert(sw.includes('./src/audio/preview-translation-service.js?v='), 'service worker must cache preview translation service');
assert(browserSpec.includes('__foxbearTranslationPlaybackProbe') && browserSpec.includes('pauseCalls') && browserSpec.includes('playCalls') && browserSpec.includes('sameAudio'), 'real browser translation continuity contract missing');
const runtimeSpec = read('qa/browser/runtime-health-playwright.spec.js');
assert(runtimeSpec.includes("page.on('response'") && runtimeSpec.includes('response.status() >= 400'), 'browser QA must catch same-origin HTTP errors, not only network failures');
assert(runtimeSpec.includes('isOptionalRemoteUrl') && !runtimeSpec.includes('/firebase|firestore|googleapis|gstatic|identitytoolkit|firebaseio|remote config/i'), 'optional remote filtering must be URL-scoped and must not hide local firebase-bootstrap errors');
assert(runtimeSpec.includes('kickerOverflow') && runtimeSpec.includes('centerSpread') && runtimeSpec.includes('designerBackground'), 'browser QA must verify the compact engraved header layout');
assert(app.includes('audio?._foxbearTranslationController?.setMode?.(target'), 'translation buttons must switch the active graph in place');
assert(!app.includes("|dock-clean|${getPreviewTranslationMode().id}|"), 'translation mode must not force Dock audio element replacement');
assert(app.includes('persistentTranslation: true'), 'Dock player must opt into persistent in-place routing');
assert(app.includes("mode.id === 'studio' || getInAppAudioCompatibility().restricted"), 'Studio and restricted in-app playback must avoid unnecessary AudioContext graphs');
assert(app.includes('부드럽게 전환했습니다'), 'translation switch should communicate smooth in-place routing');
assert(css.includes('compact engraved header signature'), 'header signature polish marker missing');
assert(css.includes('.designer-mini::before { content: none !important; }'), 'designer signature decoration must be borderless');
assert(css.includes('border: 0 !important;') && css.includes('text-shadow:'), 'engraved header style missing');
assert(css.includes('width: 32px !important;') && css.includes('border-radius: 50% !important;'), 'settings control must remain compact');
assert(css.includes('grid-template-columns: minmax(0, 1fr) auto !important;') && css.includes('flex-wrap: nowrap !important;'), 'header must remain a single engraved row on narrow screens');

class FakeParam {
    constructor(value = 0) { this.value = value; this.events = []; }
    cancelScheduledValues(time) { this.events.push(['cancel', time]); }
    cancelAndHoldAtTime(time) { this.events.push(['hold', time]); }
    setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
    linearRampToValueAtTime(value, time) { this.value = value; this.events.push(['ramp', value, time]); }
}
class FakeNode {
    constructor(type) {
        this.type = type;
        this.connections = [];
        this.gain = new FakeParam(1);
        this.frequency = new FakeParam(0);
        this.Q = new FakeParam(0);
    }
    connect(node, output, input) { this.connections.push({ node, output, input }); return node; }
    disconnect() { this.disconnected = true; }
}
class FakeContext {
    constructor() {
        this.currentTime = 1;
        this.state = 'running';
        this.destination = new FakeNode('destination');
        this.mediaSourceCount = 0;
    }
    createMediaElementSource() { this.mediaSourceCount += 1; return new FakeNode('source'); }
    createGain() { return new FakeNode('gain'); }
    createBiquadFilter() { return new FakeNode('filter'); }
    createChannelSplitter() { return new FakeNode('splitter'); }
    createChannelMerger() { return new FakeNode('merger'); }
}
class FakeAudio {
    constructor() {
        this.dataset = {};
        this.paused = false;
        this.ended = false;
        this.listeners = new Map();
        this.playCalls = 0;
        this.pauseCalls = 0;
    }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
    play() { this.playCalls += 1; return Promise.resolve(); }
    pause() { this.pauseCalls += 1; }
}

const context = new FakeContext();
let closeCalls = 0;
const window = {
    FoxBearAudioContexts: {
        resume: () => Promise.resolve(true),
        close: () => { closeCalls += 1; return Promise.resolve(true); }
    }
};
vm.runInNewContext(read('src/audio/preview-translation-service.js'), { window, console, Promise, Object, Array, Math, Number, String, Error, setTimeout, clearTimeout });
const audio = new FakeAudio();
const controller = window.FoxBearPreviewTranslationService.attach(audio, { mode: 'studio', createContext: () => context });
assert(controller, 'controller should attach');
assert.strictEqual(context.mediaSourceCount, 1, 'one media element source should serve every translation mode');
assert.strictEqual(Object.keys(controller.paths).length, 1, 'only the active route should be built at rest');
assert.strictEqual(controller.mode, 'studio');
assert.strictEqual(controller.setMode('phone', { fadeMs: 96 }), true);
assert.strictEqual(controller.mode, 'phone');
assert.strictEqual(audio.dataset.previewTranslationMode, 'phone');
assert(controller.paths.phone.gain.gain.events.some(event => event[0] === 'ramp' && event[1] === 0.92), 'phone path should fade in');
assert(controller.paths.studio.gain.gain.events.some(event => event[0] === 'ramp' && event[1] === 0), 'studio path should fade out');
assert.strictEqual(controller.setMode('mono'), true);
assert.strictEqual(controller.mode, 'mono');
assert(Object.keys(controller.paths).length <= 3, 'crossfade should keep only active transition routes');
for (let index = 0; index < 24; index += 1) controller.setMode(['studio', 'phone', 'laptop', 'mono'][index % 4], { fadeMs: 48 });
assert.strictEqual(context.mediaSourceCount, 1, 'rapid switching must keep one MediaElementSource');
assert.strictEqual(audio.playCalls, 0, 'mode switching must not restart media playback');
assert.strictEqual(audio.pauseCalls, 0, 'mode switching must not pause media playback');

const settle = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
(async () => {
await settle(110);
assert.strictEqual(Object.keys(controller.paths).length, 1, 'inactive DSP routes must be released after the crossfade');
controller.close();
assert.strictEqual(audio.listeners.size, 0, 'controller close must remove media event listeners');

const lightContext = new FakeContext();
const lightAudio = new FakeAudio();
const lightController = window.FoxBearPreviewTranslationService.attach(lightAudio, { mode: 'phone', persistent: false, createContext: () => lightContext });
assert.strictEqual(Object.keys(lightController.paths).length, 1, 'non-persistent inline preview should build only its active route');
assert.strictEqual(lightController.setMode('mono'), false, 'single-route inline preview must not pretend to switch unavailable paths');
lightController.close();
assert.strictEqual(closeCalls, 2, 'translation contexts should close through the shared context manager');
assert.strictEqual(controller.closed, true);

console.log('PASS v1.5.22 header signature and uninterrupted preview translation routing');
})().catch(error => { console.error(error); process.exitCode = 1; });
