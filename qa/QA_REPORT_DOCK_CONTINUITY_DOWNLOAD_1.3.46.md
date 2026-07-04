# QA Report — v1.3.46 Dock Continuity + Download/Share

## Scope
- Bottom Dock player transport continuity.
- Preview translation switching without unintended playback stop.
- Waveform popup playback safety.
- Download dialog UX: format selection before download/share.
- Kakao/in-app browser fallback guidance.

## Changes verified
- Added Dock transport capture/restore helpers:
  - `captureBottomPreviewTransport()`
  - `localToAbsolutePreviewTime()`
  - `absoluteToLocalPreviewTime()`
  - `applyBottomPreviewStart()`
- Switching original/master/result preview now restores the same absolute musical timeline where possible.
- Switching Phone/Laptop/Mono/Studio preview modes rebuilds the WebAudio route but resumes if the Dock was playing.
- Waveform compare dialog is treated as a visual-only popup and does not pause Dock playback on close.
- Dock labels restored to preview wording.
- Download dialog now separates extension selection from actions.
- Added explicit file share action using `navigator.share({ files })` when available.
- Restricted/in-app browser path keeps a longer-lived Blob URL and opens the assist panel instead of relying on automatic anchor download.

## Automated checks
- `npm run check`
- `qa/dock_continuity_download_smoke.js`

## Notes
- Native sharing support depends on browser/OS support for Web Share file payloads.
- Kakao in-app browsers may still block Blob downloads; the build now exposes explicit share, file open, page copy, and external browser guidance.
