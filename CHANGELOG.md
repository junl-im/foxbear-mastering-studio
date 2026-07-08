
- v1.4.20 Performance diagnostics remain available while bulk import guard reports queued import state.
# v1.4.20 stability - Bulk Import Guard / 35-Track PC Crash Hotfix

- Fixed a PC bulk import crash path reported when selecting 35 songs at once.
- Track registration now batches UI rendering and queues decoding/analysis instead of starting every file immediately.
- Added a single-lane import analysis queue (`FoxBearBulkImportGuard`) to avoid simultaneous `file.arrayBuffer()` + `AudioContext.decodeAudioData()` storms.
- Added large-batch status messaging so 12+ selected songs show safe queue progress.
- Added `qa/v1420_bulk_import_guard_smoke.js` and `qa/BROWSER_BACK_QA_MATRIX_1.4.20.md`.

# Changelog

## v1.4.20 - Download dialog first-screen declutter
- Added `FoxBearDownloadService.getDownloadDialogDisplayProfile()` so the dialog can separate initial/open-state copy from post-action guidance.
- Main download popup now uses `download-options-panel-v5` and `data-download-display-mode` for `restricted-declutter` / `standard-declutter` modes.
- Initial receipt renders in idle mode and hides the full checklist until the user presses download/share/assist/diagnostics/copy.
- Kept `getDownloadDialogCompactHint()` and all diagnostics/checklist copy tools as fallback support behind `추가 옵션`.
- App download dialog dependencies now pass receipt/checklist/compact-hint/display-profile helpers explicitly.
- Runtime Health now checks the dialog display profile helper.
- Updated cache key to `1.4.20-bulk-import-guard`.

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
- v1.4.20 Spectrum / Exit Guard stability: Spectrum remains detail-only, Exit Guard remains enabled.
- v1.4.20 Dock FFT removal: Dock FFT removal remains intentional; settings gear alignment remains active.
- v1.4.20 renderMini cleanup: removed Dock mini FFT renderMini path remains removed.
- v1.4.20 Performance diagnostics: `FoxBearPerformanceDiagnostics` remains available with `getSummary`, adaptive refresh, and 복사 actions.
- v1.4.20 Packaging: overwrite packages derive the version from package.json.

## v1.4.20 cumulative compatibility anchors
- stability: navigation confirm debounce, FFT lifecycle stabilization, and external analyser coverage remain active.
- Dock FFT removal and settings gear alignment remain active.
- Performance diagnostics and adaptive refresh remain available.
- Packaging polish remains active: overwrite ZIP naming follows `package.json`.
- renderMini cleanup remains active; runtime health does not require `renderMini` and FFT remains detail-only.
- Download/share fallback remains active: share/save, save assist, diagnostics copy, checklist copy, and external browser guidance remain available.
- Dock FFT removal remains active; `#bottomPreviewSpectrum` should not exist and detail-only FFT remains intentional.

- v1.4.20 carry-forward: getDownloadDialogCompactHint remains active for the compact download first screen.
- v1.4.20 carry-forward: getDownloadDialogDisplayProfile keeps first-screen declutter behavior.
