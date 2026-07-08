## v1.4.24 handoff - Bulk Import HUD

- Latest version: `1.4.24` with cache key `1.4.24-bulk-import-hud`.
- Main user issue: 2+ and especially 35-track imports needed a dedicated long progress HUD instead of vague single-track messages.
- Added `bulkImportHud` DOM, scrollable row list, collapse/hide controls, `FoxBearBulkImportHud.getSnapshot()`, runtime health check, and performance diagnostics integration.
- QA target: `qa/v1424_bulk_import_hud_smoke.js`; matrix: `qa/BROWSER_BACK_QA_MATRIX_1.4.24.md`.
- Final QA: `146/146 PASS`.

## v1.4.24 handoff - Mastering Queue Throttle

- Latest version: `1.4.24` with cache key `1.4.24-bulk-import-hud`.
- New runtime diagnostic: `FoxBearMasteringGuard.getSnapshot()`.
- Mastering progress renders are throttled through `scheduleRenderAll('mastering-progress', ...)`; final completion flushes immediately.
- Performance diagnostics now capture `masteringQueue` beside import/render queue snapshots.
- QA target: `qa/v1422_mastering_queue_throttle_smoke.js`; matrix: `qa/BROWSER_BACK_QA_MATRIX_1.4.24.md`.
- Next safe direction: split mastering queue/worker orchestration out of `src/app.js`, then add a memory cleanup policy for very large completed batches.


- v1.4.21 FoxBearPerformanceDiagnostics remains available; combine with FoxBearBulkImportGuard.getSnapshot() for 35-track import debugging.
## v1.4.21 stability handoff - 35-track PC import crash guard

- Base: v1.4.19.
- User report: selecting 35 songs on PC caused a `STATUS_BREAKPOINT` page error.
- Patch: `handleFiles()` now registers tracks in a batch, renders once, then calls `queueTracksForAnalysis()` instead of starting `analyzeTrack()` for every track immediately.
- New guard: `FoxBearBulkImportGuard.getSnapshot()` exposes pending/active/concurrency diagnostics.
- Config: `IMPORT_ANALYSIS_CONCURRENCY = 1`, `LARGE_IMPORT_BATCH_THRESHOLD = 12`, `IMPORT_QUEUE_YIELD_MS = 90`.
- QA: `qa/v1421_bulk_import_guard_smoke.js` plus browser matrix `qa/BROWSER_BACK_QA_MATRIX_1.4.21.md`.

# Handoff - FoxBear AI Mastering Studio Pro v1.4.21

## Current patch
v1.4.21 focuses on decluttering the first screen of the download/share dialog while keeping all Kakao/mobile fallback tools intact.

## What changed
- Added display profile helper:
  - `FoxBearDownloadService.getDownloadDialogDisplayProfile()`
- Kept micro hint helper:
  - `FoxBearDownloadService.getDownloadDialogCompactHint()`
- Main download popup now includes:
  - `.download-options-compact-hint`
  - `download-options-panel-v5`
  - `data-download-display-mode`
  - idle initial receipt with the full checklist hidden on open
- Advanced recovery tools remain under `추가 옵션`:
  - 주소 복사
  - 안내 복사
  - 진단 복사
  - 체크리스트 복사
  - 외부 브라우저
- App-level deps pass receipt/checklist/compact-hint/display-profile helpers explicitly.
- Runtime Health requires the dialog display profile helper.
- Cache key is `1.4.24-bulk-import-hud`.

## QA
Run:

```bash
npm run sri:update
npm run check
npm run package:clean
npm run package:overwrite
```

Expected current result: `142/142 PASS`.

## Manual QA focus
- Kakao in-app browser: verify the dialog first screen is short and points to `공유/저장 → 파일 열기`.
- Kakao in-app browser: verify diagnostics/checklist copy remain under `추가 옵션`.
- Android Chrome: verify normal download remains primary and the micro hint is not distracting.
- iOS Safari/PWA: verify the popup fits in the viewport and buttons remain reachable.
- Desktop Chrome/Edge: verify format options and primary actions remain clear.

## 다음 패치 후보
- v1.4.21: real-device Kakao/Android/iOS wording tuning if screenshots or copied diagnostics are available.
- Further reduce download popup copy if users still find it dense.
- Consider a one-tap simple save mode for non-technical users.

## Legacy anchors for QA continuity
- Stage7: `waveform-compare-view.js` split and compare modal cleanup.
- Stage9: Dock waveform CSS split and cumulative overwrite QA.
- Stage13: Runtime Health boot monitor.
- Stage14: Runtime recovery and asset mismatch reporting.
- Stage23: playback orchestration.
- Stage25: compare controls rehome.
- Stage26: unified waveform controls.
- Stage27: waveform control service.
- Stage28: waveform control view extraction.

## Cumulative QA anchors
- Stage8: async mobile Dock and compact overlay behavior.
- Stage9.1: 누적 덮어쓰기 packaging remains documented.
- Stage10: download service split.
- Stage11: recommendation/base-components modular renovation.
- Stage11.1: runtime mobile hotfix.
- Stage12: detail view split.
- Stage13: runtime health.
- Stage14: runtime recovery.
- Stage27 다음 대화 인수인계: waveform-control-service remains active.
- Stage28 view extraction: waveform-control-view.js remains active.
- Dock FFT removal and settings gear alignment remain active.
- detail-only FFT remains the current Spectrum behavior.
- Exit Guard remains active for refresh/back protection.
- FoxBearPerformanceDiagnostics remains available; use `getSummary` or Ctrl/Command + Alt + P for diagnostics.

## v1.4.21 cumulative compatibility anchors
- stability: navigation confirm debounce and FFT lifecycle stabilization remain active.
- Dock FFT removal and settings gear alignment remain active.
- Performance diagnostics use adaptive refresh and copy support.
- Packaging polish remains active for release/overwrite ZIP naming.
- Download/share fallback remains active while first-screen dialog copy is shorter.

## v1.4.21 - Render Scheduler + Bulk Import UI Throttle

- Added `FoxBearRenderScheduler` to merge repeated `renderAll()` calls into scheduled frame updates during analysis/import.
- Bulk import analysis remains sequential, and large-batch UI refreshes are throttled so 35-track imports are less likely to stutter or crash.
- Automatic Wake Lock activation during analysis/playback is now silent; manual settings toggles still show user feedback.
- Single-file imports keep the AI recommendation choice dialog, while multi-file and large-batch imports auto-apply each track's AI recommendation without one popup per file.
- Playback transitions use a smoother 140ms fade and wait for the next audio element to be media-ready before fading out the old source.
- Analysis cache keys now use `ANALYSIS_ENGINE_CACHE_VERSION` instead of `APP_VERSION`, reducing unnecessary re-analysis across patch releases.
- Added `FoxBearAudioDecodeService` as the first decode-path split from `src/app.js`.


Stability carry-forward: v1.4.21 keeps render scheduler and bulk import stability checks active.

Dock FFT removal carry-forward: Dock FFT removal remains active and the settings gear alignment patch is retained in v1.4.21.

v1.4.21 detail-only FFT carry-forward: Dock mini spectrum/renderMini stays removed; detail-only FFT stays available.


## v1.4.24 carry-forward anchors

Spectrum detail-only FFT, Exit Guard, Dock mini FFT removal, renderMini cleanup, stability, confirm, Download dialog compact hint, getDownloadDialogDisplayProfile, Stage28, Stage27, Stage26, Stage25, Stage23, Stage21, Stage20, Stage18, Stage17.


## v1.4.24 Carry-forward QA anchors
- Dock FFT removal remains active; PC settings gear alignment patch is retained for the floating settings gear.
- Detail-only FFT remains active and `renderMini` is removed from Dock/runtime health paths.
- FoxBearPerformanceDiagnostics remains available with getSummary and adaptive refresh/copy support.
- Download action clarity, checklist, compact hints, and first-screen declutter remain carried forward.

## v1.4.24 - Audio Decode Memory Guard

- Added audio decode diagnostics in `FoxBearAudioDecodeService.getDiagnostics()`.
- Tracks active/completed/failed decodes, recent decode events, last decoded PCM size, and last error.
- `decodeAudioFile()` now explicitly releases its temporary `ArrayBuffer` reference in `finally` after Web Audio decoding.
- Performance diagnostics now include `audioDecode` and warn on `audio-decode-active` / `audio-decode-last-error`.
- Runtime Health now requires `FoxBearAudioDecodeService.getDiagnostics`.
- v1.4.22 mastering queue throttle, v1.4.21 render scheduler, and 35-track sequential import guard remain carried forward.

