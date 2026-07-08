# v1.5.6 - Export Progress Recovery

- Added `src/download/export-progress-view.js` and the `FoxBearExportProgressView` browser global for visible ZIP/export progress diagnostics.
- Added an export progress panel under the main action buttons with readiness checklist, progress bar, completion state, failure state, and `곡별 다운로드 위치 보기` fallback.
- Updated `downloadZip()` to call the progress panel during plan validation, `JSZip.generateAsync()` progress callbacks, ZIP Blob validation, success, and failure.
- Bumped boot/update safety cache-bust keys to `boot-sri-v156` and `update-safety-v156`.
- Bumped the service worker shell cache to `foxbear-shell-v1.5.6-export-progress-recovery` and carried v1.5.5 as a legacy cache generation.
- Added `qa/v156_export_progress_recovery_smoke.js`; current default QA target is `178/178 PASS`.

# v1.5.5 - Update Safety + Asset Health

- Added `src/boot/update-safety-service.js` and the `FoxBearUpdateSafety` diagnostics global.
- Boot-critical scripts now use `h=boot-sri-v155`; `update-safety-service.js` uses `h=update-safety-v155`.
- Bumped the service worker shell cache generation to `foxbear-shell-v1.5.5-update-safety` and retained v1.5.4 as a legacy cache generation.
- Runtime Health recovery now asks the active service worker to purge app caches through `FOXBEAR_PURGE_CACHES` before unregister/reload.
- Service worker JS/CSS requests with patch-bust keys now use network-first no-store handling to reduce stale fallback risk.
- Added `qa/v155_update_safety_asset_health_smoke.js`; current default QA target is `176/176 PASS`.

# v1.5.4 - Boot SRI Recovery

- Added fresh boot cache-bust keys for `runtime-health.js`, `performance-diagnostics.js`, and `app.js` to avoid stale cached JS bytes causing SRI blocks after deployment.
- Bumped the service worker shell cache generation to `foxbear-shell-v1.5.4-boot-sri-recovery`.
- Strengthened Runtime Health `캐시 초기화 후 재시도` to clear broader app/workbox/precache caches, update/unregister service workers, and reload with a fresh URL.
- Added `qa/v154_boot_sri_recovery_smoke.js`; current default QA target is `174/174 PASS`.

# v1.5.3 - Bulk HUD Visibility + Inline Master All

- Renamed the large bulk HUD toggle copy from `접기` to `숨김` and made it hide the current bulk HUD batch.
- Added a small `보이기` restore button next to the floating settings gear; it is visible only while a hidden bulk HUD batch is restorable.
- Added an inline `전체 마스터링` button inside the large HUD that delegates to the existing main full-mastering flow.
- Added targeted stale-cache keys for the changed HUD/mobile/app assets and mirrored the keys in `sw.js`.
- Added `qa/v153_bulk_hud_visibility_masterall_smoke.js`; current default QA target is `173/173 PASS`.

# v1.5.2 - Export Guard + Low Memory UX

- Added `src/download/export-guard-service.js` for ZIP/export readiness planning, generated ZIP Blob validation, memory-pressure classification, and export diagnostics.
- Wired `downloadZip()` through Export Guard before compression and after ZIP Blob generation, with a safe fallback to per-track downloads if validation fails.
- Added `FoxBearExportGuard.getReadiness()` and `FoxBearExportGuard.getDiagnostics()` for console-based 35-track export checks.
- Added low-memory/large-output UX warnings around completed-batch memory sweeps and ZIP export attempts.
- Extended the 35-track Playwright deep flow to inspect Export Guard readiness before ZIP export.
- Added `qa/v152_export_guard_low_memory_smoke.js`; current default QA target is `172/172 PASS`.

# v1.5.1 - Real Browser Automation

- Added Playwright browser automation for runtime health, console errors, PWA back navigation, Wake Lock mock request/release, service worker update, and 35-track import/master/export scenarios.
- Added `playwright.config.js` with desktop Chromium and mobile PWA-style Chromium projects.
- Added `qa/browser/run-browser-e2e.js` to start a local static server and invoke Playwright from `npm run qa:browser`.
- Added `qa/browser/helpers/foxbear-e2e-helpers.js` with synthetic WAV fixtures, Runtime Health assertions, Wake Lock mocks, and service worker snapshots.
- Added `npm run qa:browser`, `npm run qa:browser:external`, `npm run qa:browser:deep`, and `npm run qa:browser:install`.
- Added `qa/v151_real_browser_automation_smoke.js`; current default QA target is `170/170 PASS`.

# v1.5.0 - Engine Quality Gate

- Upgraded `src/audio/quality-gate-service.js` to QualityGate v2.1 with short-term LUFS, limiter overcorrection, de-esser overcorrection, multiband overcorrection, mobile translation correction amount, and risk flag checks.
- Added short-term LUFS telemetry to the master finalizer worker and in-app fallback finalizer.
- Extended master reports with `loudness.shortTermBefore` and `loudness.shortTermAfter` for diagnostics and future detail-panel surfacing.
- Added `src/audio/reference-profile-service.js` as the 64/96-band log-spectrum helper foundation for the next reference-matching upgrade.
- Kept v1.4.29 large-batch memory stabilization behavior carried forward.
- Added `qa/v150_engine_quality_gate_smoke.js`; current default QA target is `163/163 PASS`.

# v1.4.29 - Memory Stabilization

- Upgraded `src/audio/memory-guard-service.js` with dynamic large-batch and low-memory retention policy for completed mastered AudioBuffers.
- Added `FoxBearMemoryGuard.diagnose()` for before/after completed-batch memory sweeps from the browser console.
- Added automatic post-batch memory sweep after selected/all-track mastering batches complete.
- Added performance memory metadata for completed masters: `masteredBufferBytes` and `outBlobBytes`.
- Completed download Blobs remain available while non-selected completed `masteredBuffer` objects are released according to policy.
- Added `qa/v1429_memory_stabilization_smoke.js`; current default QA target is `161/161 PASS`.

# v1.4.28 - App Slim-down Orchestration Split

- Added `src/audio/mastering-orchestrator-service.js` for selected/all-track mastering batch orchestration.
- Expanded `src/audio/import-queue-service.js` with `createTrackAnalysisQueue()` so analysis queue pumping is service-owned.
- `src/app.js` now delegates import queue operations through `getImportAnalysisQueueController()` and mastering batches through `getMasteringBatchRunner().runBatch()`.
- `src/app.js` is under the v1.4.28 slim-down line budget while keeping Bulk Import HUD, Bulk Mastering HUD continuity, memory guard, and Wake Lock behavior carried forward.
- Added `qa/v1428_app_slimdown_orchestration_smoke.js`; current default QA target is `160/160 PASS`.

# v1.4.27 - Release Cleanup + Modular Guard Foundation

- Cleaned current README/HANDOFF/QA docs and moved legacy v1.4.21-v1.4.26 accumulated notes into `docs/history/`.
- Added Markdown code-fence parity checks to `qa/docs_handoff_smoke.js`.
- Updated worker headers to the current v1.4.27 carry-forward line.
- Added the first safe app.js slim-down support modules: `import-queue-service.js`, `analysis-cache-service.js`, `memory-guard-service.js`, `quality-gate-service.js`, and `track-lifecycle-service.js`.
- Added `FoxBearMemoryGuard.getSnapshot()` and a completed-batch mastered-buffer release policy so 35-track mastering can keep Blob downloads while releasing non-selected AudioBuffers.
- Performance diagnostics now includes `memoryGuard` data.
- Added optional Playwright browser QA scaffold under `qa/browser/`; default QA remains static/smoke.
- Current QA target: `158/158 PASS`.


## Legacy v1.4.26 carry-forward anchors

- v1.4.26 Spectrum stability and Exit Guard behavior remain carried forward.
- v1.4.26 stability polish remains active.
- v1.4.26 Dock FFT removal and renderMini cleanup remain active; detail-only FFT remains available.
- v1.4.26 Performance diagnostics and Packaging polish remain active.
- Download dialog micro hint and display profile helpers remain active: `getDownloadDialogCompactHint` and `getDownloadDialogDisplayProfile`.

# v1.4.26 - Bulk HUD Asset / Close Button Hotfix

- Fixed a potential `assets/css/bulk-import-hud.css` stale-cache/SRI boot failure by adding a targeted cache-bust parameter to the Bulk HUD stylesheet URL while keeping the existing `v=1.4.26-wake-lock-state-sync` runtime version.
- Service worker precache now uses the same cache-busted Bulk HUD CSS URL, avoiding old cached CSS being checked against the new stylesheet SRI.
- Reworked the Bulk HUD close control to match the shared overlay close-button feel: circular `×`, accessible label, fixed equal dimensions, and centered inline-flex alignment.
- Added `qa/v1427_1_bulk_hud_asset_close_hotfix_smoke.js`; final QA is now `150/150 PASS`.

# v1.4.26 - Bulk Mastering HUD Continuity Patch

- Extended the existing 2+ track Bulk Import HUD so it can switch into a mastering phase instead of disappearing after analysis completes.
- Added `beginMasteringBatch()` to `src/ui/bulk-import-hud-view.js` with per-track mastering order, pending/active/done/error counts, and mastering-specific labels.
- `masterSelectedTracks()` and `masterAllTracks()` now start the large HUD for multi-track mastering batches, reusing the import batch when possible.
- `setMasteringProgress()`, mastering queue start, and mastering queue end now refresh the large HUD directly so 35-track batches visibly continue from analysis to mastering.
- Added `qa/v1427_bulk_mastering_hud_smoke.js`; final QA is now `149/149 PASS`.

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
