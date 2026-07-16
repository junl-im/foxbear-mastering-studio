#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const read = file => fs.readFileSync(file, 'utf8');
const queueSource = read('src/audio/import-queue-service.js');
const decodeSource = read('src/audio/audio-decode-service.js');
const appSource = read('src/app.js');
const updateSource = read('src/boot/service-worker-update-service.js');
const index = read('index.html');
const sw = read('sw.js');

assert(queueSource.includes('const activeTasks = new Map()'), 'analysis queue must track active task objects');
assert(queueSource.includes('cancelTrack(trackOrId'), 'analysis queue must support per-track cancellation');
assert(queueSource.includes('cancelAll(reason'), 'analysis queue must support active and pending cancellation');
assert(queueSource.includes('options.runTrack(track, task)'), 'analysis queue must pass the cancellation task to the app');
assert(queueSource.includes('cancelledCount'), 'analysis queue diagnostics must report cancellation count');
assert(decodeSource.includes('options.signal'), 'audio decode must accept an AbortSignal');
assert(decodeSource.includes('awaitWithAbort(file.arrayBuffer()'), 'file reading must be cancellation-aware');
assert(decodeSource.includes("decodeAudioDataCompat(audioContext, arrayBuffer), signal"), 'decodeAudioData must be cancellation-aware');
assert(appSource.includes('assertAnalysisTaskActive(track, task'), 'app analysis must reject stale task results');
assert(appSource.includes("cancelAll?.('queue-cleared')"), 'queue clear must cancel active analysis');
assert(appSource.includes("cancelTrack?.(id, 'track-removed')"), 'track removal must cancel its active analysis');
assert(appSource.includes('const unsafeClearBusy =') && appSource.includes('el.clearBtn.disabled = !hasTracks || unsafeClearBusy'), 'clear control must remain available during cancellable analysis');
assert(appSource.includes("window.FoxBearServiceWorkerUpdateService?.coordinate?.(registration"), 'service worker registration must use the update coordinator');
assert(index.includes('src/boot/service-worker-update-service.js'), 'update coordinator must be loaded by index.html');
assert(updateSource.includes('stableIdleMs'), 'update coordinator must require a stable idle window');
for (const activity of ['analysis', 'mastering', 'decoding', 'rendering', 'playback']) {
  assert(updateSource.includes(`${activity}:`), `update coordinator must inspect ${activity}`);
}
const installBody = sw.match(/self\.addEventListener\('install'[\s\S]*?\n\}\);/)?.[0] || '';
assert(installBody && !installBody.includes('skipWaiting'), 'install must not force activation while a tab may be busy');
assert(sw.includes('matchCurrentOrRecovery'), 'network-first requests must share current/legacy cache recovery');
assert(sw.includes('return await matchCurrentOrRecovery(cache, request) || fresh'), 'HTTP non-success assets must fall back to cache');
assert(sw.includes("return await matchCurrentOrRecovery(cache, request, './index.html') || fresh"), 'HTTP non-success navigation must fall back to the shell');

async function exerciseQueueCancellation() {
  const context = {
    window: null,
    console,
    setTimeout,
    clearTimeout,
    AbortController,
    Promise,
    Object,
    Map,
    Set,
    Array,
    Math,
    Date,
    String,
    Number,
    Boolean,
    Error
  };
  context.window = context;
  vm.runInNewContext(queueSource, context, { filename: 'import-queue-service.js' });
  const started = [];
  const completed = [];
  const controller = context.FoxBearImportQueueService.createTrackAnalysisQueue({
    concurrency: 1,
    yieldMs: 0,
    isTrackStillImported: () => true,
    runTrack: async (track, task) => {
      started.push(track.id);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 1000);
        task.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          const error = new Error('cancelled');
          error.name = 'AbortError';
          error.code = 'FOXBEAR_ANALYSIS_CANCELLED';
          reject(error);
        }, { once: true });
      });
      task.throwIfCancelled();
      completed.push(track.id);
    }
  });
  const tracks = [{ id: 'a', name: 'a.wav' }, { id: 'b', name: 'b.wav' }];
  controller.queueTracks(tracks);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepStrictEqual(started, ['a'], 'first task should be active before cancellation');
  const snapshot = controller.cancelAll('smoke-clear');
  assert.strictEqual(snapshot.pending, 0, 'pending queue must be cleared');
  await new Promise(resolve => setTimeout(resolve, 30));
  const finalSnapshot = controller.getSnapshot();
  assert.strictEqual(finalSnapshot.active, 0, 'active task must settle after abort');
  assert.strictEqual(finalSnapshot.pending, 0, 'pending task must not restart');
  assert.strictEqual(completed.length, 0, 'cancelled tasks must not apply completion');
  assert(finalSnapshot.cancelledCount >= 2, 'active and pending cancellations must be counted');
}

exerciseQueueCancellation().then(() => {
  console.log('PASS v1.5.29 analysis/update lifecycle smoke');
}).catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
