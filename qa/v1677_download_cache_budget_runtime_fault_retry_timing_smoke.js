'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '1.6.111', 'package version must be v1.6.111');
assert(/^[a-z0-9][a-z0-9-]*$/.test(String(pkg.foxbearRelease?.buildId || '')), 'current build id must remain valid kebab-case');

const downloadSource = read('src/download/download-service.js');
assert(downloadSource.includes('LOW_MEMORY_VARIANT_CACHE_BUDGET_BYTES = 64 * 1024 * 1024'), 'low-memory cache byte budget missing');
assert(downloadSource.includes('STANDARD_VARIANT_CACHE_BUDGET_BYTES = 192 * 1024 * 1024'), 'standard cache byte budget missing');
assert(downloadSource.includes('LOW_MEMORY_VARIANT_CACHE_MAX_ENTRIES = 2'), 'low-memory cache entry budget missing');
assert(downloadSource.includes('STANDARD_VARIANT_CACHE_MAX_ENTRIES = 5'), 'standard cache entry budget missing');
assert(downloadSource.includes('variant-cache-evict-budget'), 'cache budget eviction diagnostics missing');
assert(downloadSource.includes('getDownloadVariantCacheDiagnostics'), 'download cache diagnostics must be exposed');
assert(!downloadSource.includes("getToast(deps)('자동 저장을 시작하지 못했습니다. 저장 도움의 직접 저장 또는 파일 열기를 사용하세요.');\n            getToast(deps)('자동 저장을 시작하지 못했습니다. 저장 도움의 직접 저장 또는 파일 열기를 사용하세요.');"), 'download fallback toast must not be duplicated');

const makeFakeWav = size => ({
  size,
  type: 'audio/wav',
  slice() {
    const bytes = new Uint8Array(64);
    bytes.set(Buffer.from('RIFF'), 0);
    bytes.set(Buffer.from('WAVE'), 8);
    return { arrayBuffer: async () => bytes.buffer };
  }
});

const downloadContext = {
  window: null,
  globalThis: null,
  navigator: { deviceMemory: 8, userAgent: 'Desktop QA' },
  matchMedia: () => ({ matches: false }),
  WeakMap, WeakRef, Map, Set, Object, Array, Date, Math, Number, String, Promise,
  AbortController, URL: { revokeObjectURL() {} },
  console, setTimeout, clearTimeout
};
downloadContext.window = downloadContext;
downloadContext.globalThis = downloadContext;
downloadContext.addEventListener = () => {};
vm.runInNewContext(downloadSource, downloadContext, { filename: 'download-service.js' });
const downloadService = downloadContext.FoxBearDownloadService;
assert(downloadService, 'download service must load');

(async () => {
  for (let index = 0; index < 6; index += 1) {
    const track = {
      id: `cache-${index}`,
      name: `cache-${index}.mp3`,
      outBlob: makeFakeWav(1024 + index),
      outFormat: 'mp3_320',
      masteredBuffer: { length: 1 },
      analysis: { sampleRate: 48000, channels: 2, duration: 60 }
    };
    await downloadService.prepareTrackDownloadBlob(track, 'wav24', {
      encodeMasterOutputAsync: async () => ({ blob: makeFakeWav(10 * 1024 * 1024), format: 'wav24' }),
      buildMasteredFileName: () => `cache-${index}.wav`
    });
  }
  const cacheSnapshot = downloadService.getDownloadVariantCacheDiagnostics();
  assert(cacheSnapshot.supported, 'WeakRef cache budget should be supported in QA runtime');
  assert(cacheSnapshot.entryCount <= 5, 'global variant cache must evict beyond standard entry budget');
  assert(cacheSnapshot.bytes <= 192 * 1024 * 1024, 'global variant cache must stay within byte budget');

  const runtimeContext = { window: null, globalThis: null, Date, Map, Object, Math, String, Number, Array };
  runtimeContext.window = runtimeContext;
  runtimeContext.globalThis = runtimeContext;
  vm.runInNewContext(read('src/boot/runtime-fault-counters.js'), runtimeContext, { filename: 'runtime-fault-counters.js' });
  const counters = runtimeContext.FoxBearRuntimeFaultCounters;
  counters.record('a', 'one');
  counters.record('b', 'one');
  counters.record('c', 'one');
  let faultSnapshot = counters.getSnapshot();
  assert.strictEqual(faultSnapshot.recentCount, 3, 'recent total must remain available');
  assert.strictEqual(faultSnapshot.maxRecentKeyCount, 1, 'three unrelated one-off faults must not look like one repeating fault');
  counters.record('a', 'one');
  counters.record('a', 'one');
  faultSnapshot = counters.getSnapshot();
  assert.strictEqual(faultSnapshot.maxRecentKeyCount, 3, 'same fault repeated three times must be identified as a burst');
  assert(faultSnapshot.repeatedKeys.some(item => item.key === 'a:one' && item.count === 3), 'repeated key summary missing');

  const perf = read('src/boot/performance-diagnostics.js');
  assert(perf.includes('runtimeFaultMaxRepeated >= 3 || runtimeFaultRecentCount >= 6'), 'performance warning must distinguish repeated bursts from unrelated one-offs');
  assert(perf.includes("warnings.push('download-variant-cache-pressure')"), 'download cache pressure must surface in performance diagnostics');

  const lifecycle = read('src/state/track-lifecycle-service.js');
  const app = read('src/app.js');
  assert(lifecycle.includes('FoxBearDownloadService?.clearDownloadVariantCache?.(track.outBlob)'), 'track release must clear cached variants');
  assert(app.includes('getDownloadService()?.clearDownloadVariantCache?.(track.outBlob)'), 'output invalidation must clear cached variants');

  const functions = read('functions/index.js');
  assert(functions.includes("function incidentAdmissionRetryAfterSeconds(scope = 'minute'"), 'incident admission needs exact bucket retry timing');
  assert(functions.includes("incidentAdmissionRetryAfterSeconds('day', now)"), 'daily admission retry must point to next KST day boundary');
  assert(functions.includes('KST_OFFSET_MS = 9 * 60 * 60 * 1000'), 'daily retry boundary must use KST');

  const dialog = read('src/ui/download-dialog-view.js');
  assert(dialog.includes("global.addEventListener('orientationchange', handleQualityMenuViewportChange"), 'download sheet must resync on mobile rotation');
  assert(dialog.includes('syncDownloadVisualViewport({ revealProgress: actionInFlight });'), 'pageshow/progress restore must also resync visual viewport');

  assert(pkg.qaChecks.includes('node qa/v1677_download_cache_budget_runtime_fault_retry_timing_smoke.js'), 'v1.6.111 smoke must be registered');
  console.log('PASS v1.6.77 download cache budget, runtime fault precision, and admission retry timing smoke');
})().catch(error => { console.error(error); process.exit(1); });
