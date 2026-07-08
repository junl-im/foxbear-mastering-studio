# Handoff - v1.5.1 Real Browser Automation

## Current status

Latest package layer: `v1.5.1` maintenance patch on top of the `1.4.26-wake-lock-state-sync` runtime/cache key.

The previous Bulk HUD asset/close-button hotfix, Bulk Mastering HUD continuity patch, v1.4.27 release cleanup, v1.4.28 app-slimdown orchestration split, v1.4.29 Memory Stabilization, and v1.5.0 Engine Quality Gate carry-forward are active.

## v1.5.1 browser QA automation

- `playwright.config.js` now defines desktop Chromium and mobile PWA-style Chromium projects.
- `qa/browser/run-browser-e2e.js` starts a local static server before invoking Playwright, so `npm run qa:browser` can be run from the project root.
- `qa/browser/helpers/foxbear-e2e-helpers.js` provides synthetic WAV generation, Runtime Health assertions, Wake Lock mocking, service worker snapshots, and static server utilities.
- `qa/browser/runtime-health-playwright.spec.js` checks browser boot, Runtime Health, resource failures, missing globals/DOM ids, asset version mismatches, runtime errors, and console errors.
- `qa/browser/pwa-back-wakelock-sw-playwright.spec.js` covers PWA back/forward resilience, mocked Wake Lock request/release, and service worker update registration.
- `qa/browser/bulk-35-import-master-export-playwright.spec.js` uploads 35 generated WAV files and verifies Bulk HUD continuity. With `FOXBEAR_E2E_DEEP=1`, it proceeds into full master/export assertions.
- Browser automation remains opt-in and is not part of `npm run check` because Playwright browsers may not be installed on every packaging machine.

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
170/170 PASS
```

Optional browser QA automation:

```bash
npm run qa:browser:install
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

1. Follow-up memory tuning after real-device runs
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
