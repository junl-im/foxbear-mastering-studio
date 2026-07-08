# FoxBear AI Mastering Studio Pro v1.4.26

## v1.4.26 Wake Lock state sync

This release separates the persistent `화면켜짐유지` user setting from temporary automatic Wake Lock protection used during playback, analysis, import, and mastering. Automatic protection is shown as `AUTO` and stays silent; manual toggles remain explicit `ON/OFF`.

## FoxBear AI Mastering Studio Pro v1.4.26

This build adds an Exit Guard fallback hotfix. If a user presses browser Back and chooses to leave, the app now navigates away when possible and shows a clear exit fallback screen when the browser/PWA refuses to close the tab/window automatically.

## v1.4.26 - Bulk Import HUD

Current patch: **v1.4.26 Bulk Import HUD**.

This patch adds a long, scrollable, multi-track HUD for imports of 2 or more files. A 35-track PC batch now keeps sequential analysis safety while showing each song row with status, progress, and error state.

- Full release ZIP: `dist/foxbear-mastering-studio-v1.4.26-release.zip`
- Overwrite ZIP: `dist/foxbear-mastering-studio-v1.4.26-overwrite.zip`
- QA: `146/146 PASS`

## v1.4.26 - Mastering Queue Throttle

Current patch: **v1.4.26 Mastering Queue Throttle**.

This patch keeps v1.4.21's 35-track import protection and adds a lighter mastering progress path. Progress updates are still visible, but they are scheduled through the render scheduler instead of forcing a full `renderAll()` for every progress step. Use `?perf=1` or `FoxBearMasteringGuard.getSnapshot()` to inspect active mastering state.

- Full release ZIP: `dist/foxbear-mastering-studio-v1.4.26-release.zip`
- Overwrite ZIP: `dist/foxbear-mastering-studio-v1.4.26-overwrite.zip`


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

## v1.4.26 Diagnostics and Download Notes

- Performance diagnostics: open with `?perf=1` or `Ctrl/Command + Alt + P`; use 복사 to copy the report.
- Download dialog micro hint and first-screen declutter remain active.
- detail-only FFT remains active; Dock mini FFT/renderMini remain removed.

