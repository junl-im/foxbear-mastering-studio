# v1.4.21 Render Scheduler + Bulk Import UI Throttle QA Matrix

## Scope

This release focuses on the PC 35-track import crash follow-up and playback polish:

- Render Scheduler merges repeated `renderAll()` calls into scheduled frame updates.
- Bulk imports keep sequential analysis from v1.4.20 and throttle track-list refreshes during large batches.
- Automatic wake-lock activation during import/analysis/playback no longer spams toast messages.
- Single-file import keeps the AI recommendation choice dialog.
- Multi-file and large-batch imports auto-apply each track's AI recommendation without opening one dialog per track.
- Original/mastered and phone/laptop/mono transitions use a smoother 140ms fade and wait for next media readiness.
- Analysis cache keys use a stable engine version instead of the app patch version.
- `FoxBearAudioDecodeService` owns the browser decode path for future `app.js` slimming.

## Manual matrix

| Environment | Import expectation | Playback expectation | Notes |
| --- | --- | --- | --- |
| PC Chrome/Edge, 35 files | Page should not crash; files register quickly; analysis runs one at a time. | Switching original/mastered while playing should crossfade without a hard cut. | Watch `FoxBearBulkImportGuard.getSnapshot()` and `FoxBearRenderScheduler.getSnapshot()`. |
| PC Chrome/Edge, 1 file | AI recommendation dialog appears after analysis. | Original/mastered switch remains smooth. | No repeated wake-lock toast. |
| PC Chrome/Edge, 12+ files | No recommendation dialogs per file; AI presets auto-apply. | Phone/laptop/mono buttons should not create audible gaps when playing. | Status should explain automatic AI recommendation. |
| Android Chrome | Large import should stay responsive, with fewer UI refresh stalls. | Translation mode changes should resume playback smoothly. | Wake-lock setting may show active, but no toast per file. |
| KakaoTalk in-app browser | File input fallback remains available; bulk imports should not spam toast. | Autoplay can still be blocked by the browser; manual play should work. | Download/share fallback from v1.4.11-v1.4.19 remains unchanged. |
| iOS Safari / PWA | Import and recommendation policy should match PC. | Media readiness wait should reduce transition gaps. | Wake Lock may be unsupported; unsupported toast appears only for manual toggle. |

## Console checks

```js
window.FoxBearBulkImportGuard.getSnapshot()
window.FoxBearRenderScheduler.getSnapshot()
window.FoxBearPerformanceDiagnostics.collectSnapshot('bulk-import-check')
window.FoxBearAudioDecodeService.version
window.FoxBearPlaybackTransitionService.DEFAULT_FADE_MS
```

Expected:

- `FoxBearRenderScheduler.getSnapshot()` exists.
- Performance diagnostics include `importQueue` and `renderScheduler`.
- Bulk import snapshot includes `renderQueue`.
- `DEFAULT_FADE_MS` is 140.
- Automatic wake-lock toast should not repeat per selected file.

## Browser back / exit guard carry-forward

The existing browser back/exit guard remains unchanged and should still be checked on KakaoTalk, Chrome Android, Safari iOS, installed PWA, desktop Chrome, and desktop Edge.

- `beforeunload` native prompt remains active while files are loaded or processing.
- `popstate` app confirmation remains active for toolbar Back, Android Back, and PWA Back gestures.
- Cancelled Back prompts should re-arm instead of leaving the app unprotected.

## FFT external analyser carry-forward

Preview translation, realtime preview, and difference-listen graphs must keep external analyser coverage so the detail-only FFT can follow WebAudio-routed playback without creating duplicate `MediaElementSource` nodes.

## v1.4.21 Dock mini FFT / back confirm carry-forward

- Dock mini FFT remains removed; detail FFT remains available only in the detail analysis screen.
- Browser back `confirm` debounce remains active during large imports and scheduled renders.

## Dock FFT removal carry-forward

- `#bottomPreviewSpectrum` should not exist in the Dock.
- Dock mini FFT remains removed so the Dock stays compact during large imports.

## Dock spectrum cleanup carry-forward

- Runtime health does not require `renderMini` after Dock mini FFT removal.
- Detail-only FFT remains available from the analysis detail screen.

- runtime health does not require `renderMini` after Dock mini FFT removal.

## v1.4.21 Download flow polish carry-forward

- v1.4.21 Download flow polish remains active.
- Diagnostics copy / 진단 복사 remains behind advanced options.
- Advanced actions are hidden behind `추가 옵션`.
- v1.4.21 Download action clarity keeps `data-download-action` metadata.
- v1.4.21 Download dialog micro hint remains active.
- v1.4.21 Download dialog first-screen declutter remains active.
