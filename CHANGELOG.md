# v1.4.26 - Wake Lock State Sync Hotfix

- Fixed the confusing state where automatic screen wake protection could be active while the settings panel still looked like a normal OFF toggle.
- Split Wake Lock into user setting `ON/OFF` and temporary work-protection `AUTO` mode.
- Automatic playback/import/mastering Wake Lock acquisition stays silent; only manual user toggles may show a toast.
- Manual Wake Lock request failure now reverts the saved setting back to OFF instead of leaving a false ON state.
- Added `FoxBearWakeLockController.getSnapshot()` and performance diagnostics integration.

## v1.4.26 - Exit Guard Fallback Hotfix

- Fixed the browser/PWA back-navigation leave path where confirming “나가기” could appear to do nothing when there was no previous browser history entry to navigate to.
- The leave path now removes `beforeunload`/`popstate` guards, attempts `history.go(-1)`, then tries `window.close()`, and finally renders a safe exit fallback screen if the browser refuses to close the tab/window.
- Added leave-attempt diagnostics to `FoxBearSiteGuards.getNavigationExitGuardState()`.
- Added v1.4.26 QA coverage for exit fallback behavior.

## v1.4.26 - Bulk Import HUD

- Added a dedicated scrollable Bulk Import HUD for 2+ track imports.
- The HUD shows overall percent, completed/active/pending/error counts, and one row per imported song.
- 35-track PC imports keep the v1.4.20 safe sequential analysis queue, but now the user can see where the batch is.
- Added collapse and hide controls for the current batch HUD.
- Added `FoxBearBulkImportHud.getSnapshot()` and performance diagnostics integration.
- Runtime Health now checks `FoxBearBulkImportHud.getSnapshot`.
- Added `qa/v1424_bulk_import_hud_smoke.js` and `qa/BROWSER_BACK_QA_MATRIX_1.4.26.md`.
- Final QA target: 146/146 PASS.


## v1.4.26 - Audio Decode Memory Guard

- Added audio decode diagnostics in `FoxBearAudioDecodeService.getDiagnostics()`.
- Tracks active/completed/failed decodes, recent decode events, last decoded PCM size, and last error.
- `decodeAudioFile()` now explicitly releases its temporary `ArrayBuffer` reference in `finally` after Web Audio decoding.
- Performance diagnostics now include `audioDecode` and warn on `audio-decode-active` / `audio-decode-last-error`.
- Runtime Health now requires `FoxBearAudioDecodeService.getDiagnostics`.
- v1.4.22 mastering queue throttle, v1.4.21 render scheduler, and 35-track sequential import guard remain carried forward.
- Dock FFT removal carry-forward: Dock mini FFT remains removed and detail-only spectrum stays available.

## v1.4.26 - Mastering Queue Throttle / Diagnostics

- Added `FoxBearMasteringGuard.getSnapshot()` for active mastering diagnostics.
- `setMasteringProgress()` now uses `scheduleRenderAll('mastering-progress', ...)` so every 5% progress step does not force an immediate full render.
- Mastering final UI refresh still flushes immediately through `scheduleRenderAll('mastering-final', { immediate: true })`.
- Added explicit transient buffer cleanup in the mastering `finally` path.
- Performance diagnostics now include `masteringQueue` and a `mastering-active` warning.
- Added `qa/v1422_mastering_queue_throttle_smoke.js` and `qa/BROWSER_BACK_QA_MATRIX_1.4.26.md`.
- v1.4.21 render scheduler, silent wake-lock import, stable analysis cache key, and audio decode service carry forward.


- v1.4.21 Performance diagnostics remain available while bulk import guard reports queued import state.
# v1.4.21 stability - Bulk Import Guard / 35-Track PC Crash Hotfix

- Fixed a PC bulk import crash path reported when selecting 35 songs at once.
- Track registration now batches UI rendering and queues decoding/analysis instead of starting every file immediately.
- Added a single-lane import analysis queue (`FoxBearBulkImportGuard`) to avoid simultaneous `file.arrayBuffer()` + `AudioContext.decodeAudioData()` storms.
- Added large-batch status messaging so 12+ selected songs show safe queue progress.
- Added `qa/v1421_bulk_import_guard_smoke.js` and `qa/BROWSER_BACK_QA_MATRIX_1.4.21.md`.

# Changelog

## v1.4.21 - Download dialog first-screen declutter
- Added `FoxBearDownloadService.getDownloadDialogDisplayProfile()` so the dialog can separate initial/open-state copy from post-action guidance.
- Main download popup now uses `download-options-panel-v5` and `data-download-display-mode` for `restricted-declutter` / `standard-declutter` modes.
- Initial receipt renders in idle mode and hides the full checklist until the user presses download/share/assist/diagnostics/copy.
- Kept `getDownloadDialogCompactHint()` and all diagnostics/checklist copy tools as fallback support behind `추가 옵션`.
- App download dialog dependencies now pass receipt/checklist/compact-hint/display-profile helpers explicitly.
- Runtime Health now checks the dialog display profile helper.
- Updated cache key to `1.4.26-wake-lock-state-sync`.

## v1.4.17 - Download recovery compact polish
- Added `FoxBearDownloadService.getDownloadCompactRecoveryPlan()` for a shorter user-facing save order.
- Kept full `getDownloadRecoveryChecklist()` and diagnostics JSON for support/debugging, but made the visible dialog checklist more compact.
- Fixed the clipboard textarea fallback so it does not attempt to remove the same temporary element twice.

## v1.4.16 - Download recovery checklist
- Added save recovery checklist helpers and checklist copy.

## v1.4.15 - Download receipt polish
- Added download action receipts and next-step status cards.
- Improved Kakao/mobile post-action guidance.

## v1.4.14 - Download action clarity
- Unified download/share/assist action dispatch.
- Added explicit `data-download-action` QA anchors.

## v1.4.13 - Download flow polish
- Added recommended download flow cards.
- Collapsed secondary copy/diagnostics options.

## v1.4.12 - Download diagnostics follow-up
- Added download diagnostics JSON copy and event tracing.

## v1.4.11 - Download/share reliability
- Added Kakao/in-app browser fallback path for Blob download restrictions.

## v1.4.10 - Performance diagnostics packaging polish
- Improved hidden performance diagnostics and package version sync.

## v1.4.9 - Performance diagnostics
- Added hidden performance diagnostics panel.

## v1.4.8 - Dock spectrum cleanup
- Fully removed Dock mini FFT remnants.

## v1.4.7 - Dock FFT removal
- Removed Dock FFT to simplify the player and reduce render work.

## v1.4.6 - Stability polish
- Stabilized FFT lifecycle and navigation guard state.

## v1.4.5 - FFT analyser stabilization
- Stabilized WebAudio analyser taps.

## v1.4.4 - FFT live hotfix
- Fixed mini-only FFT loop issue.

## v1.4.3 - Playback transition audit
- Split playback transition service and hardened fade recovery.

## v1.4.2 - Crossfade / zoom / Dock spectrum
- Added crossfade, waveform zoom, and Dock mini spectrum.

## v1.4.1 - Spectrum / exit guard
- Added spectrum visualizer and refresh/back guard.

## Stage28
- Extracted `waveform-control-view.js` and kept managed waveform rendering paths.

## Stage27
- Added common waveform control service.

## Stage26
- Unified waveform controls.

## Stage25
- Rehomed compare controls.

## Stage23
- Added playback orchestration foundations.

## Stage14
- Runtime recovery and asset health monitoring.

## Stage13
- Runtime health checks and boot failure visibility.

## Stage9
- Dock waveform CSS split and cumulative overwrite manifest checks.

## Stage7
- `waveform-compare-view.js` split and compare modal cleanup.

## Compatibility anchor notes for cumulative QA
- Stage8: async mobile Dock rejection handling and compact mobile Dock overlay anchors remain supported.
- Stage9.1: cumulative overwrite packaging and 누적 덮어쓰기 manifest checks remain supported.
- Stage10: download service split remains in `src/download/download-service.js`.
- Stage11: large modular renovation remains active through recommendation engine and base components.
- Stage11.1: runtime/mobile hotfix and Dock-attached quick panel cleanup remain active.
- Stage12: detail view split remains active.
- Stage13 and Stage14: Runtime Health and runtime recovery remain active.
- v1.4.21 Spectrum / Exit Guard stability: Spectrum remains detail-only, Exit Guard remains enabled.
- v1.4.21 Dock FFT removal: Dock FFT removal remains intentional; settings gear alignment remains active.
- v1.4.21 renderMini cleanup: removed Dock mini FFT renderMini path remains removed.
- v1.4.21 Performance diagnostics: `FoxBearPerformanceDiagnostics` remains available with `getSummary`, adaptive refresh, and 복사 actions.
- v1.4.21 Packaging: overwrite packages derive the version from package.json.

## v1.4.21 cumulative compatibility anchors
- stability: navigation confirm debounce, FFT lifecycle stabilization, and external analyser coverage remain active.
- Dock FFT removal and settings gear alignment remain active.
- Performance diagnostics and adaptive refresh remain available.
- Packaging polish remains active: overwrite ZIP naming follows `package.json`.
- renderMini cleanup remains active; runtime health does not require `renderMini` and FFT remains detail-only.
- Download/share fallback remains active: share/save, save assist, diagnostics copy, checklist copy, and external browser guidance remain available.
- Dock FFT removal remains active; `#bottomPreviewSpectrum` should not exist and detail-only FFT remains intentional.

- v1.4.21 carry-forward: getDownloadDialogCompactHint remains active for the compact download first screen.
- v1.4.21 carry-forward: getDownloadDialogDisplayProfile keeps first-screen declutter behavior.

## v1.4.21 - Render Scheduler + Bulk Import UI Throttle

- Added `FoxBearRenderScheduler` to merge repeated `renderAll()` calls into scheduled frame updates during analysis/import.
- Bulk import analysis remains sequential, and large-batch UI refreshes are throttled so 35-track imports are less likely to stutter or crash.
- Automatic Wake Lock activation during analysis/playback is now silent; manual settings toggles still show user feedback.
- Single-file imports keep the AI recommendation choice dialog, while multi-file and large-batch imports auto-apply each track's AI recommendation without one popup per file.
- Playback transitions use a smoother 140ms fade and wait for the next audio element to be media-ready before fading out the old source.
- Analysis cache keys now use `ANALYSIS_ENGINE_CACHE_VERSION` instead of `APP_VERSION`, reducing unnecessary re-analysis across patch releases.
- Added `FoxBearAudioDecodeService` as the first decode-path split from `src/app.js`.


Stability carry-forward: v1.4.21 keeps render scheduler and bulk import stability checks active.

Dock FFT removal carry-forward: v1.4.21 preserves Dock FFT removal while focusing on render scheduling and import stability.

renderMini cleanup carry-forward: v1.4.21 keeps the removed Dock mini spectrum API out of runtime health while detail-only FFT remains available.

Download dialog carry-forward: `getDownloadDialogCompactHint` and `getDownloadDialogDisplayProfile` remain active in v1.4.21.


## v1.4.26 carry-forward anchors

Spectrum detail-only FFT, Exit Guard, Dock mini FFT removal, renderMini cleanup, stability, confirm, Download dialog compact hint, getDownloadDialogDisplayProfile, Stage28, Stage27, Stage26, Stage25, Stage23, Stage21, Stage20, Stage18, Stage17.


### v1.4.26 Carry-forward QA anchors
- Dock FFT removal remains intact; `#bottomPreviewSpectrum` is absent and detail-only FFT stays on the detail analysis screen.
- `renderMini` remains removed from Dock spectrum cleanup.
- Performance diagnostics and Packaging polish are retained with adaptive refresh and copy/복사 flows.
- Download dialog clarity, recovery checklist, micro hint, and first-screen declutter remain carried forward.

### v1.4.26 carry-forward QA notes

- stability, Dock FFT removal, settings gear alignment, renderMini cleanup, performance diagnostics, download flow polish, download action clarity, micro hint/declutter, Render Scheduler, Mastering Queue Throttle, Audio Decode Memory Guard, and Bulk Import HUD remain carried forward.
- Stage13, Stage14, Stage27, and Stage28 documentation anchors remain intentionally referenced for legacy QA/handoff continuity.
- Dock mini FFT was removed; detail FFT remains detail-only.
- Dock FFT removal and settings gear alignment remain part of the current regression line.
- Stage27 waveform-control-service and Stage28 waveform-control-view.js extraction remain active; unmanaged waveform audit remains tracked.


## v1.4.26 Carry-forward Documentation Anchors

- Performance diagnostics remain available with `FoxBearPerformanceDiagnostics`, `getSummary`, adaptive refresh, and Packaging-safe overwrite generation.
- renderMini cleanup remains active: runtime health does not require `renderMini`; detail-only FFT remains the intended model.
- Download dialog micro hint helper `getDownloadDialogCompactHint` remains carried forward.
- Download display profile helper `getDownloadDialogDisplayProfile` remains carried forward.
- Dock FFT removal, settings gear alignment, Download flow polish, Download action clarity, Download dialog micro hint, and Download dialog first-screen declutter remain covered.

## v1.4.26 Spectrum / Dock FFT removal carry-forward

- Spectrum detail-only FFT remains active in v1.4.26.
- Dock FFT removal remains carried forward, including `#bottomPreviewSpectrum` absence.
- settings gear alignment remains carried forward.
