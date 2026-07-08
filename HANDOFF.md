# Handoff - v1.5.0 Engine Quality Gate

## Current status

Latest package layer: `v1.5.0` maintenance patch on top of the `1.4.26-wake-lock-state-sync` runtime/cache key.

The previous Bulk HUD asset/close-button hotfix, Bulk Mastering HUD continuity patch, v1.4.27 release cleanup, v1.4.28 app-slimdown orchestration split, and v1.4.29 Memory Stabilization carry-forward are active.

## Key changes in this patch

- `src/audio/quality-gate-service.js` now owns QualityGate v2.1 result evaluation with short-term LUFS, limiter/de-esser overcorrection, multiband overcorrection, mobile translation amount checks, and risk flags.
- `src/workers/master-finalizer.worker.js` and the app fallback now emit `shortTermLufs` telemetry.
- `createMasterReport()` now carries `loudness.shortTermBefore` and `loudness.shortTermAfter` for detail panels and QA diagnostics.
- `src/audio/reference-profile-service.js` provides 64/96-band log-spectrum profile helpers for the upcoming reference-match upgrade.
- `qa/v150_engine_quality_gate_smoke.js` locks the new engine quality gate surface.
- `src/audio/memory-guard-service.js` still owns the v1.4.29 large-batch memory policy.
- `FoxBearMemoryGuard.getSnapshot()` now reports retained mastered-buffer count/bytes, Blob bytes, preview Blob bytes, low-memory mode, pressure level, policy budget, released completed buffer count, and largest retained buffers.
- `FoxBearMemoryGuard.diagnose()` now runs a before/after completed-batch policy sweep for console debugging.
- `src/app.js` now calls a post-batch memory sweep through `afterMasteringBatchMemorySweep()` after selected/all-track mastering batches.
- `finishPerformanceProfile()` records `performanceInfo.masteredBufferBytes` and `performanceInfo.outBlobBytes` for completed masters.
- The policy keeps completed download Blobs but releases non-selected completed `masteredBuffer` objects when the batch is large or low-memory/mobile conditions are detected.
- `qa/v1429_memory_stabilization_smoke.js` locks this behavior.

## QA

Default QA command:

```bash
npm run check
```

Expected result:

```text
163/163 PASS
```

Optional browser QA scaffold:

```bash
npm run qa:browser
```

## Console checks for manual 35-track testing

After importing and mastering a large batch, run:

```js
FoxBearMemoryGuard.getSnapshot()
```

Then run:

```js
FoxBearMemoryGuard.diagnose()
```

Expected shape:

```text
masteredBufferCount should stay near the policy max
outBlobBytes should remain available for downloads
releasedCompletedBufferCount should increase after large-batch sweeps
pressure should be normal or medium after the sweep, not high
```

## Next patch candidates

1. v1.5.1 actual browser automation
   - Playwright E2E with real file import fixtures
   - PWA back navigation
   - Wake Lock mock
   - service worker update path
   - 35-track import/master/export scenario

2. Follow-up memory tuning after real-device runs
   - tune buffer byte budgets against PC/iOS/Android results
   - add user-facing low-memory warning if pressure remains high
   - add export verification after completed buffers are released

## Carry-forward anchors

Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage27, Stage28, Wake Lock state sync, Bulk Import HUD, Bulk Mastering HUD continuity, Bulk HUD asset/close hotfix, v1.4.27 release cleanup, and v1.4.28 app-slimdown orchestration remain active.

- Stage9.1 누적 덮어쓰기 packaging remains active for cumulative overwrite ZIP releases.
- Stage27 다음 대화 인수인계: `src/audio/waveform-control-service.js` remains the shared waveform service boundary.
- Stage28 view extraction: `src/ui/waveform-control-view.js` remains the managed waveform view module.

## Legacy QA compatibility anchors

- v1.4.26 Spectrum update remains carried forward with detail-only FFT behavior.
- v1.4.26 stability entry remains active for spectrum lifecycle and navigation guard diagnostics.
- Dock FFT removal and settings gear alignment remain active; the Dock mini FFT stays removed by design.
- v1.4.26 detail-only FFT remains active; full spectrum rendering belongs in the detail panel only.
- FoxBearPerformanceDiagnostics remains available with collectSnapshot, getSummary, copy, and adaptive summary diagnostics.
- v1.4.26 뒤로가기 / Exit Guard fallback remains active for browser and PWA back navigation.
