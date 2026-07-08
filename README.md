
### v1.4.20 performance diagnostics

Use `?perf=1` or Ctrl/Command + Alt + P to open Performance diagnostics while a bulk import is queued.
## v1.4.20 detail-only FFT note

Dock mini FFT remains removed; spectrum visualizer remains detail-only while bulk import guard handles 35-track PC imports.

## v1.4.20 bulk import guard

v1.4.20 addresses a PC crash report where selecting 35 songs could trigger a browser `STATUS_BREAKPOINT` page error. The app still accepts up to 35 tracks, but decoding and analysis now run through a safe single-lane queue so many files do not allocate ArrayBuffers and AudioContexts at the same time.

# FoxBear AI Mastering Studio Pro v1.4.20

Current patch: **v1.4.20 Download dialog micro hint**.

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
- Full release ZIP: `dist/foxbear-mastering-studio-v1.4.20-release.zip`
- Overwrite ZIP: `dist/foxbear-mastering-studio-v1.4.20-overwrite.zip`

## Diagnostics
- Performance diagnostics: open with `?perf=1` or `Ctrl/Command + Alt + P`.
- Download diagnostics: use `추가 옵션 → 진단 복사`.
- User-friendly save order: use `추가 옵션 → 체크리스트 복사`.

## Detail-only FFT
- v1.4.20 keeps FFT detail-only. Dock mini FFT and `renderMini` remain removed.


## v1.4.20 Download dialog first-screen declutter
- Added `FoxBearDownloadService.getDownloadDialogDisplayProfile()` to keep the initial download/share dialog short.
- The first open state uses `download-options-panel-v5`, `data-download-display-mode`, and an idle receipt.
- The full checklist stays hidden on open and appears only after a download/share/assist action needs it.
- Advanced diagnostics, address copy, guide copy, checklist copy, and external-browser guidance remain under `추가 옵션`.
- Final static QA target: `138/138 PASS`.

## Download dialog micro hint

v1.4.20 keeps the Download dialog micro hint flow while adding bulk import protection.
