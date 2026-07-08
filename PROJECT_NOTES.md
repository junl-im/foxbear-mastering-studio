# v1.5.1 Notes - Real Browser Automation

- Real browser automation is now opt-in through Playwright rather than included in the default static smoke suite.
- `npm run qa:browser` starts a local static server and checks Runtime Health in real Chromium.
- `npm run qa:browser:deep` enables the longer 35-track import/master/export path.
- Keep `npm run check` fast and deterministic; use browser QA before release/deploy or when debugging PWA/mobile/regression issues.
- Next focus after browser automation: tune memory and export behavior against actual PC/iOS/Android runs, then consider deeper engine/reference matching changes.

# v1.4.28 Notes - App Slim-down Orchestration Split

- Import analysis queue orchestration has moved behind `FoxBearImportQueueService.createTrackAnalysisQueue()`.
- Selected/all-track mastering batch loops now run through `FoxBearMasteringOrchestratorService.createMasteringBatchRunner()`.
- Keep the existing runtime/cache asset key `1.4.26-wake-lock-state-sync` until the deployment line is intentionally bumped.
- Next focus: v1.4.29 real 35-track memory profiling and buffer-retention tuning.

# Project Notes - v1.4.27

This patch starts the next roadmap without risky engine rewrites. It cleans the release handoff, adds code-fence validation, and introduces reusable services that `src/app.js` can delegate to while the full split continues in later patches.

## Current engineering focus

- Keep the Bulk Import HUD and Bulk Mastering HUD continuity intact.
- Reduce future app.js pressure through service boundaries.
- Preserve download Blob availability while releasing completed non-selected `masteredBuffer` references.
- Make memory state inspectable through `FoxBearMemoryGuard.getSnapshot()` and performance diagnostics.
- Prepare Playwright browser QA for later real-device/full-flow coverage.

## Carry-forward anchors

- Stage7: compare modal and `waveform-compare-view.js`.
- Stage9: Dock waveform CSS split.
- Stage9.1: cumulative overwrite packaging remains supported.
- Stage10: download service split.
- Stage11.1: runtime mobile hotfix remains supported.
- Stage11/Stage12: large modular renovation and detail view split.
- Stage27/Stage28: waveform control service/view split. Stage28 unmanaged waveform audit remains documented.
- Wake Lock state sync, Bulk Import HUD, Bulk Mastering HUD continuity, and Bulk HUD close hotfix remain active.

# Project Notes - v1.4.26

- Wake Lock now has a clear split between saved user setting and automatic temporary protection.
- Settings panel can show `AUTO` when work protection is active while the user setting is otherwise OFF.
- Performance diagnostics include the wake lock snapshot and warnings for auto-active/error states.

## v1.4.26 Notes - Exit Guard fallback

- Problem: choosing leave after browser Back could appear stuck when the app was launched directly and there was no previous history entry.
- Fix: leave path now records attempt metadata, removes navigation blockers, calls `history.go(-1)`, attempts `window.close()`, and renders a safe fallback screen if still visible.
- Browser limitation remains: normal web pages cannot always close tabs/windows programmatically, so the fallback screen is intentional.

## v1.4.26 project notes

v1.4.26 focuses on user visibility during large imports. v1.4.20 prevented 35-track decode storms; v1.4.21 reduced render pressure; v1.4.22 and v1.4.23 improved mastering/decode diagnostics. This patch adds the missing UX layer: a dedicated scrollable Bulk Import HUD with one row per song.

Direction after this patch: real-device PC 35-track validation, then optional batch mastering HUD reuse and `src/app.js` slimming.

## v1.4.26 project notes

The v1.4.26 patch focuses on the second half of the 35-track stability work: after v1.4.20 made decode/analysis sequential and v1.4.21 throttled general renders, v1.4.26 prevents mastering progress updates from forcing repeated full UI renders. Diagnostics now expose active mastering state with render queue state so PC lag reports can be tied to import, render, or mastering work.


- v1.4.21 performance diagnostics can be used with bulk import queue snapshots for PC crash investigations.
## v1.4.21 notes - bulk import memory safety

The 35-track import path previously risked launching all decode/analysis jobs concurrently. v1.4.21 changes this to queued analysis after batch registration, reducing peak ArrayBuffer, AudioContext and render pressure. This is expected to mitigate PC Chrome/Edge `STATUS_BREAKPOINT` crashes on maximum-size imports.

# Project Notes - FoxBear AI Mastering Studio

## v1.4.21 Download dialog micro hint
- v1.4.17 made the recovery checklist compact, but the first dialog could still feel verbose.
- v1.4.21 adds `getDownloadDialogCompactHint()` for a micro first-screen hint.
- The dialog now shows only the most practical next actions first.
- Advanced support actions remain in `추가 옵션` instead of occupying the main screen.
- The dialog flow-step append path was cleaned to avoid duplicate append logic.

## Download/share design direction
- Keep Dock clean.
- Use main download popup for normal export actions.
- Use save-assist popup when downloads are hidden, blocked, or confusing.
- Show micro guidance first; keep diagnostics/checklist copy for support.

## Legacy anchors
- Stage7: compare modal and `waveform-compare-view.js`.
- Stage9: Dock waveform CSS split.
- Stage9.1: cumulative overwrite packaging remains supported.
- Stage13: Runtime Health.
- Stage14: Runtime recovery.
- Stage23: playback orchestration.
- Stage27: common waveform control service.
- Stage28: `waveform-control-view.js` extraction.

## Compatibility anchor notes
- Stage8: async mobile Dock safeguards remain supported.
- Stage9.1: cumulative overwrite packaging remains supported.
- Stage10: download service split remains supported.
- Stage11 and Stage11.1: modular renovation and mobile runtime hotfix remain supported.
- Stage12: detail view split remains supported.
- Stage13 / Stage14: Runtime Health and runtime recovery remain supported.
- Stage27: waveform-control-service remains the shared waveform logic module.
- Stage28: unmanaged waveform audit and waveform-control-view.js extraction remain valid.
- Dock mini FFT was removed by design; renderMini removed and detail-only FFT remains.
- Exit Guard remains active for refresh/back protection.
- v1.4.21 performance diagnostics remain available with adaptive refresh and copy support.

## v1.4.21 cumulative compatibility anchors
- stability notes: navigation confirm debounce, FFT lifecycle stabilization, and external analyser coverage remain active.
- Dock FFT removal remains intentional and settings gear alignment remains active.
- Performance diagnostics remain available with adaptive refresh and copy support.
- Packaging polish remains active for version-synced overwrite ZIP names.
- Download/share reliability remains active with a shorter first-screen dialog.


## v1.4.21 Download dialog first-screen declutter
- Added `FoxBearDownloadService.getDownloadDialogDisplayProfile()` to keep the initial download/share dialog short.
- The first open state uses `download-options-panel-v5`, `data-download-display-mode`, and an idle receipt.
- The full checklist stays hidden on open and appears only after a download/share/assist action needs it.
- Advanced diagnostics, address copy, guide copy, checklist copy, and external-browser guidance remain under `추가 옵션`.
- Final static QA target: `142/142 PASS`.

## v1.4.21 - Render Scheduler + Bulk Import UI Throttle

- Added `FoxBearRenderScheduler` to merge repeated `renderAll()` calls into scheduled frame updates during analysis/import.
- Bulk import analysis remains sequential, and large-batch UI refreshes are throttled so 35-track imports are less likely to stutter or crash.
- Automatic Wake Lock activation during analysis/playback is now silent; manual settings toggles still show user feedback.
- Single-file imports keep the AI recommendation choice dialog, while multi-file and large-batch imports auto-apply each track's AI recommendation without one popup per file.
- Playback transitions use a smoother 140ms fade and wait for the next audio element to be media-ready before fading out the old source.
- Analysis cache keys now use `ANALYSIS_ENGINE_CACHE_VERSION` instead of `APP_VERSION`, reducing unnecessary re-analysis across patch releases.
- Added `FoxBearAudioDecodeService` as the first decode-path split from `src/app.js`.

Dock mini FFT was removed and remains removed in v1.4.21 while detail-only FFT is preserved.

renderMini was removed with the Dock mini FFT cleanup and remains removed in v1.4.21.


## v1.4.26 carry-forward anchors

Spectrum detail-only FFT, Exit Guard, Dock mini FFT removal, renderMini cleanup, stability, confirm, Download dialog compact hint, getDownloadDialogDisplayProfile, Stage28, Stage27, Stage26, Stage25, Stage23, Stage21, Stage20, Stage18, Stage17.


## v1.4.26 Carry-forward QA anchors
- Dock mini FFT was removed; detail-only FFT remains the supported spectrum view.
- renderMini removed from Dock spectrum/runtime health carry-forward.
- v1.4.26 performance diagnostics keeps adaptive refresh, getSummary, and copy/복사 support.
- Download flow polish and action clarity remain in the compact first-screen dialog.

## v1.4.26 - Audio Decode Memory Guard

- Added audio decode diagnostics in `FoxBearAudioDecodeService.getDiagnostics()`.
- Tracks active/completed/failed decodes, recent decode events, last decoded PCM size, and last error.
- `decodeAudioFile()` now explicitly releases its temporary `ArrayBuffer` reference in `finally` after Web Audio decoding.
- Performance diagnostics now include `audioDecode` and warn on `audio-decode-active` / `audio-decode-last-error`.
- Runtime Health now requires `FoxBearAudioDecodeService.getDiagnostics`.
- v1.4.22 mastering queue throttle, v1.4.21 render scheduler, and 35-track sequential import guard remain carried forward.


### v1.4.26 carry-forward QA notes

- stability, Dock FFT removal, settings gear alignment, renderMini cleanup, performance diagnostics, download flow polish, download action clarity, micro hint/declutter, Render Scheduler, Mastering Queue Throttle, Audio Decode Memory Guard, and Bulk Import HUD remain carried forward.
- Stage13, Stage14, Stage27, and Stage28 documentation anchors remain intentionally referenced for legacy QA/handoff continuity.
- Dock mini FFT was removed; detail FFT remains detail-only.
- Dock FFT removal and settings gear alignment remain part of the current regression line.
- Stage27 waveform-control-service and Stage28 waveform-control-view.js extraction remain active; unmanaged waveform audit remains tracked.

## v1.4.26 Carry-forward Notes

- Performance diagnostics use adaptive refresh and can copy diagnostic reports.
- renderMini removed; detail-only FFT is the current supported path.
- Download flow polish, action clarity, micro hint, and first-screen declutter remain active.


## v1.4.26 Historical QA anchors

Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage27, and Stage28 remain documented as current carry-forward anchors.

- Stage27 waveform-control-service remains active.
- Stage28 unmanaged waveform audit and waveform-control-view.js extraction remain active.
- Dock mini FFT was removed; detail FFT remains detail-only.
- Exit Guard fallback is current in v1.4.26.

## Legacy QA compatibility notes

- v1.4.26 Exit Guard fallback remains active for back navigation and direct-launch fallback behavior.
- Dock mini FFT was removed by design; renderMini remains removed and detail-only FFT is the intended path.
- v1.4.26 performance diagnostics remain available with adaptive refresh and copy support.
