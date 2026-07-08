# FoxBear v1.4.21 Browser QA Matrix - Bulk Import Guard

## Focus

This matrix covers the PC crash report where selecting 35 songs caused a `STATUS_BREAKPOINT` page error. v1.4.21 should keep the maximum 35-track selection limit, but analysis must run through a safe queue instead of starting every decode job at once.

## PC Chrome / Edge

1. Open the app fresh after clearing the old service worker cache.
2. Select 35 supported audio files at once.
3. Expected: the page must not crash or show `STATUS_BREAKPOINT`.
4. Expected: tracks appear in the list quickly after selection.
5. Expected: import status mentions safe queue / queued analysis.
6. Expected: only a small number of tracks show active analyzing at a time; the rest remain queued.
7. Expected: playback/Dock UI remains responsive while analysis continues.

## Lower memory laptop

1. Repeat with 25-35 MP3/WAV/M4A files.
2. Expected: memory pressure should be lower than v1.4.19 because `file.arrayBuffer()` and `AudioContext.decodeAudioData()` are not launched for every file at once.
3. Expected: closing/reopening detail panels should not start duplicate analysis jobs.

## Regression checks

- Single-file import still opens the AI recommendation flow as before.
- Folder import still respects `MAX_FILES = 35`.
- Drag/drop import uses the same guarded queue.
- Existing download/share v1.4.11-v1.4.19 flows remain unchanged.
- `window.FoxBearBulkImportGuard.getSnapshot()` returns active/pending/concurrency values.

## Legacy regression coverage anchors

- KakaoTalk Android: import 35 files, back button guard, download/share popup remains responsive.
- Chrome Android: multi-file picker returns files and queued analysis progresses.
- Safari iOS: single-file import and browser back `beforeunload`/`popstate` guards remain intact.
- PWA: installed standalone mode should keep upload queue, Dock and back guard stable.
- beforeunload: refreshing during queued analysis should show the browser confirmation.
- popstate: browser back during queued analysis should use the app exit guard.

## Audio visualizer regression anchors

- external analyser coverage: realtime mastering preview, phone/laptop/mono translation preview and difference-listen paths should continue routing into the detail FFT analyser without creating duplicate media element source nodes.
- Dock FFT remains removed; detail spectrum renderPanel remains available.

## v1.4.21 Dock mini FFT / back confirm regression

- Dock mini FFT remains removed while detail FFT stays available.
- Browser back confirm and refresh confirm should still appear during active import/analysis work.

## Dock FFT removal assertion

- `#bottomPreviewSpectrum` should not exist in the Dock.
- Detail FFT remains available from the detail analysis screen only.

## renderMini cleanup assertion

- runtime health does not require `renderMini`; `FoxBearSpectrumVisualizer.renderPanel` is the detail-only FFT entrypoint.

## Performance diagnostics regression

- Performance diagnostics remain available with `?perf=1` and Ctrl/Command + Alt + P.
- During a 35-track queued import, use `FoxBearPerformanceDiagnostics.collectSnapshot()` and `FoxBearBulkImportGuard.getSnapshot()` to confirm active/pending counts.

## v1.4.21 Download flow polish

- Diagnostics copy / 진단 복사 should remain available from download advanced options.
- Download/share fallback UI should remain responsive while 35-track import analysis is queued.
- Advanced actions are hidden behind 추가 옵션 by default and remain available on demand.

## v1.4.21 Download action clarity

- Primary/secondary/tertiary buttons must expose `data-download-action` metadata.
- Recommended action badge should remain visible and match the actual handler.

## v1.4.21 Download dialog micro hint

- First-screen hint should show only the short recommended action.
- Extra diagnostics/copy/checklist actions should stay behind 추가 옵션.

## v1.4.21 Download dialog first-screen declutter

- Download dialog should open with short idle receipt and no checklist until a download/share/help action is used.
