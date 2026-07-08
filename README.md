## v1.4.24 - Bulk Import HUD

Current patch: **v1.4.24 Bulk Import HUD**.

This patch adds a long, scrollable, multi-track HUD for imports of 2 or more files. A 35-track PC batch now keeps sequential analysis safety while showing each song row with status, progress, and error state.

- Full release ZIP: `dist/foxbear-mastering-studio-v1.4.24-release.zip`
- Overwrite ZIP: `dist/foxbear-mastering-studio-v1.4.24-overwrite.zip`
- QA: `146/146 PASS`

## v1.4.24 - Mastering Queue Throttle

Current patch: **v1.4.24 Mastering Queue Throttle**.

This patch keeps v1.4.21's 35-track import protection and adds a lighter mastering progress path. Progress updates are still visible, but they are scheduled through the render scheduler instead of forcing a full `renderAll()` for every progress step. Use `?perf=1` or `FoxBearMasteringGuard.getSnapshot()` to inspect active mastering state.

- Full release ZIP: `dist/foxbear-mastering-studio-v1.4.24-release.zip`
- Overwrite ZIP: `dist/foxbear-mastering-studio-v1.4.24-overwrite.zip`


### v1.4.21 performance diagnostics

Use `?perf=1` or Ctrl/Command + Alt + P to open Performance diagnostics while a bulk import is queued.
## v1.4.21 detail-only FFT note

Dock mini FFT remains removed; spectrum visualizer remains detail-only while bulk import guard handles 35-track PC imports.

## v1.4.21 bulk import guard

v1.4.21 addresses a PC crash report where selecting 35 songs could trigger a browser `STATUS_BREAKPOINT` page error. The app still accepts up to 35 tracks, but decoding and analysis now run through a safe single-lane queue so many files do not allocate ArrayBuffers and AudioContexts at the same time.

# FoxBear AI Mastering Studio Pro v1.4.21

Current patch: **v1.4.21 Download dialog micro hint**.

## Highlights
- The download popup now shows a shorter first-screen hint for Kakao/in-app and mobile browsers.
- Kakao/in-app users see the practical order first: `공유/저장 → 파일 열기`.
- Diagnostics, `안내 복사`, `진단 복사`, and `체크리스트 복사` remain under `추가 옵션`.
- The flow-step rendering path was cleaned so each step is appended once.
- Dock FFT remains removed; FFT is detail-screen only.

## QA

```bash
npm run check
```

## Release artifacts
- Full release ZIP: `dist/foxbear-mastering-studio-v1.4.21-release.zip`
- Overwrite ZIP: `dist/foxbear-mastering-studio-v1.4.21-overwrite.zip`

## Diagnostics
- Performance diagnostics: open with `?perf=1` or `Ctrl/Command + Alt + P`.
- Download diagnostics: use `추가 옵션 → 진단 복사`.
- User-friendly save order: use `추가 옵션 → 체크리스트 복사`.

## Detail-only FFT
- v1.4.21 keeps FFT detail-only. Dock mini FFT and `renderMini` remain removed.


## v1.4.21 Download dialog first-screen declutter
- Added `FoxBearDownloadService.getDownloadDialogDisplayProfile()` to keep the initial download/share dialog short.
- The first open state uses `download-options-panel-v5`, `data-download-display-mode`, and an idle receipt.
- The full checklist stays hidden on open and appears only after a download/share/assist action needs it.
- Advanced diagnostics, address copy, guide copy, checklist copy, and external-browser guidance remain under `추가 옵션`.
- Final static QA target: `142/142 PASS`.

## Download dialog micro hint

v1.4.21 keeps the Download dialog micro hint flow while adding bulk import protection.

## v1.4.21 - Render Scheduler + Bulk Import UI Throttle

- Added `FoxBearRenderScheduler` to merge repeated `renderAll()` calls into scheduled frame updates during analysis/import.
- Bulk import analysis remains sequential, and large-batch UI refreshes are throttled so 35-track imports are less likely to stutter or crash.
- Automatic Wake Lock activation during analysis/playback is now silent; manual settings toggles still show user feedback.
- Single-file imports keep the AI recommendation choice dialog, while multi-file and large-batch imports auto-apply each track's AI recommendation without one popup per file.
- Playback transitions use a smoother 140ms fade and wait for the next audio element to be media-ready before fading out the old source.
- Analysis cache keys now use `ANALYSIS_ENGINE_CACHE_VERSION` instead of `APP_VERSION`, reducing unnecessary re-analysis across patch releases.
- Added `FoxBearAudioDecodeService` as the first decode-path split from `src/app.js`.

v1.4.21 detail-only FFT note: Dock mini FFT remains removed; detail-only FFT remains available in the analysis detail screen.

Download dialog micro hint carry-forward: v1.4.21 keeps the short first-screen download hint while advanced diagnostics stay under additional options.


## v1.4.24 carry-forward anchors

Spectrum detail-only FFT, Exit Guard, Dock mini FFT removal, renderMini cleanup, stability, confirm, Download dialog compact hint, getDownloadDialogDisplayProfile, Stage28, Stage27, Stage26, Stage25, Stage23, Stage21, Stage20, Stage18, Stage17.


## v1.4.24 Carry-forward notes
- Spectrum remains detail-only; Dock mini FFT stays removed.
- Performance diagnostics remains available with Ctrl/Command + Alt + P, getSummary, and 복사 controls.
- Download/share dialog keeps compact hints, additional options, and diagnostics copy flows.

## v1.4.24 - Audio Decode Memory Guard

- Added audio decode diagnostics in `FoxBearAudioDecodeService.getDiagnostics()`.
- Tracks active/completed/failed decodes, recent decode events, last decoded PCM size, and last error.
- `decodeAudioFile()` now explicitly releases its temporary `ArrayBuffer` reference in `finally` after Web Audio decoding.
- Performance diagnostics now include `audioDecode` and warn on `audio-decode-active` / `audio-decode-last-error`.
- Runtime Health now requires `FoxBearAudioDecodeService.getDiagnostics`.
- v1.4.22 mastering queue throttle, v1.4.21 render scheduler, and 35-track sequential import guard remain carried forward.

