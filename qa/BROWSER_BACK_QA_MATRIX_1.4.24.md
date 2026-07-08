# FoxBear Browser Back QA Matrix v1.4.24 - Bulk Import HUD

## New v1.4.24 Scope

v1.4.24 adds a dedicated **Bulk Import HUD** for imports of 2 or more files. It targets the user report that 35곡 PC imports need a taller, scrollable list with per-song progress instead of a single vague HUD/toast.

## Expected Bulk Import HUD behavior

| Scenario | Expected result |
| --- | --- |
| Import 1 file | Existing single-track flow remains: analysis runs and recommendation selection popup can appear. Bulk Import HUD stays hidden. |
| Import 2 files | Bulk Import HUD appears with overall percent, done/active/pending/error counts, and one row per file. |
| Import 12+ files | Large-batch safe mode remains active and Bulk Import HUD shows a vertically bounded scroll list. |
| Import 35 files on PC / PC 35곡 import | Registration happens once, analysis remains sequential, and the HUD shows 35 rows in order with 스크롤 support. |
| Long file names | Row text truncates with ellipsis; status badge, progress meter, and percent remain visible. |
| Analysis in progress | Active row shows analyzing/report text; overall header shows active and pending counts. |
| Per-file decode/analysis error | Error row remains visible and the total error count increases; other files continue. |
| Batch complete | HUD shows completion briefly, then can disappear after the hold window or be hidden manually. |
| Toggle list | `접기` hides row list; `목록 보기` restores scrollable list. |
| Hide HUD | `숨김` dismisses only the current batch HUD; a new import batch can show it again. |
| Dock/processing HUD visible | Bulk HUD stacks above the processing HUD/Dock safe area and does not cover the bottom player. |
| Performance diagnostics | `FoxBearBulkImportHud.getSnapshot()` and `?perf=1` expose bulk HUD state. |

## Static QA anchors for v1.4.24

- `bulkImportHud`, `bulkImportHudList`, `bulkImportHudToggle`, `bulkImportHudClose` exist in `index.html`.
- `FoxBearBulkImportHudView.beginBatch()` assigns `bulkImportBatchId`, `bulkImportOrder`, and `bulkImportTotal` to each imported track.
- `FoxBearBulkImportHudView.update()` renders a list row per imported track without `innerHTML`.
- `.bulk-import-hud-list` is bounded and scrollable.
- Runtime health requires `FoxBearBulkImportHud.getSnapshot`.
- Performance diagnostics collects `bulkImportHud` state and warns with `bulk-import-hud-active`.

## Manual QA notes

Actual 35-track PC import, long-list scrolling, and bottom Dock stacking should be verified on a real browser/device. This environment validates static wiring, SRI, syntax, and automated smoke tests only.

# v1.4.24 Mastering Queue Throttle QA Matrix

Scope: mastering progress render throttling, queue diagnostics, and v1.4.21 bulk import carry-forward.

## Static expectations

- `FoxBearMasteringGuard.getSnapshot()` is available in runtime health.
- `FoxBearPerformanceDiagnostics.collectSnapshot()` includes `masteringQueue`.
- `setMasteringProgress()` schedules UI refresh through `scheduleRenderAll('mastering-progress', ...)` instead of forcing `renderAll()` for every 5% step.
- Mastering completion uses `scheduleRenderAll('mastering-final', { immediate: true })`.
- Transient decode/render buffers are explicitly nulled in `masterTrack()` finally.
- `FoxBearBulkImportGuard.getSnapshot()` and `FoxBearRenderScheduler.getSnapshot()` remain available.

## Manual PC checks

1. Select 35 songs.
2. Confirm page does not crash with `STATUS_BREAKPOINT`.
3. Confirm import analysis remains sequential and status mentions safe queue behavior.
4. Master several songs in batch.
5. Confirm progress UI updates but the page remains responsive.
6. Open `?perf=1` and confirm import/render/mastering queue snapshots appear.

## Manual mobile/PWA checks

1. Import multiple files if the browser supports it.
2. Confirm no repeated wake-lock toast appears per file.
3. Start mastering one file and confirm progress remains visible.
4. Confirm back/refresh guard still prompts while work is meaningful.

## Browser-back matrix

- Desktop Chrome/Edge: back during import should prompt; cancel keeps queue alive.
- Desktop Chrome/Edge: back during mastering should prompt; cancel keeps progress visible.
- Android Chrome/PWA: page should not freeze during queued analysis.
- iOS Safari/PWA: progress updates may be slower, but controls remain usable.
- Kakao in-app: download fallback behavior remains unchanged from v1.4.19.


## Carry-forward anchors for cumulative smoke tests

- v1.4.24 Render Scheduler + Bulk Import UI Throttle.
- Spectrum detail-only mode remains available; Dock mini FFT remains intentionally removed.
- Exit Guard / browser back confirm remains enabled for active import, mastering, and meaningful workspace state.
- Dock mini FFT removal remains intentional; settings gear alignment remains carried forward.
- confirm behavior: cancel keeps the app in place, leave releases preview/audio resources.
- Download dialog compact hint, display profile, recovery checklist, diagnostics copy, and declutter behavior remain active.
- Stability carry-forward: spectrum lifecycle, external analyser tap, renderMini cleanup, and Dock FFT/back confirm focus remain covered.

## Download/share carry-forward scenarios

- v1.4.24 Download flow polish: recommended flow card remains present for restricted and normal browsers.
- Advanced actions are hidden behind the additional options toggle by default.
- Download diagnostics follow-up: 진단 복사 remains available for Kakao/mobile failures.
- Download action clarity: buttons keep stable `data-download-action` values.
- Download receipt polish: action receipt appears after download/share/assist actions.
- Recovery checklist compact/micro hint/declutter flows remain carried forward.

- v1.4.24 Download dialog micro hint: first screen shows only the compact hint while advanced actions stay behind additional options.

- v1.4.24 Download dialog first-screen declutter: receipt/checklist stay hidden on initial open and appear after user action.


## v1.4.24 exact carry-forward smoke anchors

Legacy browser matrix tokens retained for automated carry-forward QA: KakaoTalk, Chrome Android, Safari iOS, PWA, beforeunload, popstate.

Dock FFT removal carry-forward: `#bottomPreviewSpectrum` should not exist in the dock. Dock mini FFT was removed and detail-only FFT remains available on the detail analysis screen.

renderMini cleanup carry-forward: runtime health does not require `renderMini`, and Dock spectrum cleanup keeps `FoxBearSpectrumVisualizer.renderMini` removed.

Performance diagnostics carry-forward: v1.4.24 Performance diagnostics must still expose `FoxBearPerformanceDiagnostics`, `collectSnapshot`, `getSummary`, adaptive refresh, copy/복사 controls, and Ctrl/Command + Alt + P access.

v1.4.24 Download action clarity: download dialog buttons keep `data-download-action` roles, recommended action badges, and dispatcher-backed actions. Advanced actions are hidden behind the additional options control.

v1.4.24 Download flow polish: recommended flow card remains concise. Advanced actions are hidden behind the additional options control.

v1.4.24 Download recovery checklist: checklist copy remains available from advanced/help flows while first screen stays compact.

v1.4.24 Download dialog micro hint: compact first-screen hint remains visible before advanced diagnostics.

v1.4.24 Download dialog first-screen declutter: receipt/checklist details stay hidden until an action or help flow asks for them.

## v1.4.24 Audio Decode Memory Guard

- `FoxBearAudioDecodeService.getDiagnostics()` is available in runtime health and console.
- Decode diagnostics expose active/completed/failed decode counts and recent decode lifecycle events.
- Temporary `ArrayBuffer` references are cleared in the decode service `finally` block after decode/failed decode.
- Performance diagnostics snapshot includes `audioDecode` and warns on active/failed decode states.
- Manual PC check: import 35 tracks, confirm sequential analysis continues and `window.FoxBearAudioDecodeService.getDiagnostics()` shows completed/active decode information without growing unbounded event history.
- Manual unsupported codec check: import an unsupported/odd codec file and confirm the user-facing error still explains conversion/browser fallback rather than a raw Web Audio exception.

