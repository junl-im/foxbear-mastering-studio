# Handoff - v1.4.28 App Slim-down Orchestration Split

## Current status

Latest package layer: `v1.4.28` maintenance patch on top of the `1.4.26-wake-lock-state-sync` runtime/cache key.

The previous Bulk HUD asset/close-button hotfix and Bulk Mastering HUD continuity patch are carried forward. The large HUD should still remain visible from 2+ track import analysis into selected/all-track mastering.

## Key changes in this patch

- `src/audio/mastering-orchestrator-service.js` now owns selected/all-track mastering batch orchestration.
- `src/audio/import-queue-service.js` now owns the track-analysis queue pump through `createTrackAnalysisQueue()`.
- `src/app.js` delegates import queue scheduling and mastering batch loops instead of owning those loops directly.
- `src/app.js` is back under the v1.4.28 slim-down budget.
- `qa/v1428_app_slimdown_orchestration_smoke.js` locks the new service boundaries.
- README/HANDOFF/QA top sections were cleaned so current release notes are not mixed with old v1.4.21-v1.4.26 blocks.
- Historical accumulated notes moved to `docs/history/`.
- `qa/docs_handoff_smoke.js` now checks Markdown code-fence parity for current docs and history docs.
- Worker headers were updated from old v1.3.44 labels to the current v1.4.27 carry-forward line.
- New service modules added as the first safe app.js slim-down foundation:
  - `src/audio/import-queue-service.js`
  - `src/audio/analysis-cache-service.js`
  - `src/audio/memory-guard-service.js`
  - `src/audio/quality-gate-service.js`
  - `src/state/track-lifecycle-service.js`
- `src/app.js` now delegates analysis cache operations, track creation/cleanup, QualityGate report creation, and completed-master buffer release policy through these services when available.
- `FoxBearMemoryGuard.getSnapshot()` is exposed for memory diagnostics.
- Performance diagnostics now includes `memoryGuard` in its snapshots.
- Playwright browser QA scaffold added under `qa/browser/` with the optional command `npm run qa:browser`.

## QA

Default QA command:

```bash
npm run check
```

Expected result:

```text
160/160 PASS
```

Optional browser QA scaffold:

```bash
npm run qa:browser
```

## Next patch candidates

1. v1.4.29 memory stabilization
   - tune completed-batch buffer retention after real 35-track PC tests
   - add memory warning UI when retained Blob/AudioBuffer budgets are high
   - add low-memory mode for mobile/in-app browsers

2. v1.5.0 engine strengthening
   - QualityGate v2 thresholds from real audio golden set
   - 64/96-band reference profile
   - short-term LUFS and limiter/de-esser overcorrection detection
   - mobile speaker translation improvements

3. v1.5.1 actual browser automation
   - Playwright E2E with real file import fixtures
   - PWA back navigation
   - Wake Lock mock
   - service worker update path
   - 35-track import/master/export scenario

## Carry-forward anchors

Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage27, Stage28, Wake Lock state sync, Bulk Import HUD, Bulk Mastering HUD continuity, and Bulk HUD asset/close hotfix remain active.

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
