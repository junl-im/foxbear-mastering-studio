# QA Report - v1.4.7 Dock FFT Removal / Stability Polish

Date: 2026-07-07

## Scope

- Remove Dock mini FFT from the persistent bottom Dock.
- Keep detail-page spectrum visualization intact.
- Reduce perceived lag by avoiding live FFT analyser connection when no spectrum canvas is mounted.
- Fix PC floating settings gear alignment.
- Preserve crossfade, waveform zoom, browser exit guard, and external analyser tap stability.

## Static QA coverage

- Version/cache/SRI coverage.
- Dock mini FFT host and renderer removed.
- Detail spectrum panel still available.
- `activateAudio()` has a no-canvas early return guard.
- PC settings gear CSS alignment rules present.
- Browser/PWA QA matrix refreshed for v1.4.7.

## Manual QA still required

Real Kakao browser, Chrome Android, Safari iOS, Android PWA, and iOS PWA should be checked for Dock height, settings gear alignment, playback smoothness, and Back/refresh prompts.
