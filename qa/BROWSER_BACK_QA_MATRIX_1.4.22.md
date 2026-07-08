# v1.4.23 Mastering Queue Throttle QA Matrix

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

- v1.4.23 Render Scheduler + Bulk Import UI Throttle.
- Spectrum detail-only mode remains available; Dock mini FFT remains intentionally removed.
- Exit Guard / browser back confirm remains enabled for active import, mastering, and meaningful workspace state.
- Dock mini FFT removal remains intentional; settings gear alignment remains carried forward.
- confirm behavior: cancel keeps the app in place, leave releases preview/audio resources.
- Download dialog compact hint, display profile, recovery checklist, diagnostics copy, and declutter behavior remain active.
- Stability carry-forward: spectrum lifecycle, external analyser tap, renderMini cleanup, and Dock FFT/back confirm focus remain covered.

## Download/share carry-forward scenarios

- v1.4.23 Download flow polish: recommended flow card remains present for restricted and normal browsers.
- Advanced actions are hidden behind the additional options toggle by default.
- Download diagnostics follow-up: 진단 복사 remains available for Kakao/mobile failures.
- Download action clarity: buttons keep stable `data-download-action` values.
- Download receipt polish: action receipt appears after download/share/assist actions.
- Recovery checklist compact/micro hint/declutter flows remain carried forward.

- v1.4.23 Download dialog micro hint: first screen shows only the compact hint while advanced actions stay behind additional options.

- v1.4.23 Download dialog first-screen declutter: receipt/checklist stay hidden on initial open and appear after user action.


## v1.4.23 exact carry-forward smoke anchors

Legacy browser matrix tokens retained for automated carry-forward QA: KakaoTalk, Chrome Android, Safari iOS, PWA, beforeunload, popstate.

Dock FFT removal carry-forward: `#bottomPreviewSpectrum` should not exist in the dock. Dock mini FFT was removed and detail-only FFT remains available on the detail analysis screen.

renderMini cleanup carry-forward: runtime health does not require `renderMini`, and Dock spectrum cleanup keeps `FoxBearSpectrumVisualizer.renderMini` removed.

Performance diagnostics carry-forward: v1.4.23 Performance diagnostics must still expose `FoxBearPerformanceDiagnostics`, `collectSnapshot`, `getSummary`, adaptive refresh, copy/복사 controls, and Ctrl/Command + Alt + P access.

v1.4.23 Download action clarity: download dialog buttons keep `data-download-action` roles, recommended action badges, and dispatcher-backed actions. Advanced actions are hidden behind the additional options control.

v1.4.23 Download flow polish: recommended flow card remains concise. Advanced actions are hidden behind the additional options control.

v1.4.23 Download recovery checklist: checklist copy remains available from advanced/help flows while first screen stays compact.

v1.4.23 Download dialog micro hint: compact first-screen hint remains visible before advanced diagnostics.

v1.4.23 Download dialog first-screen declutter: receipt/checklist details stay hidden until an action or help flow asks for them.
