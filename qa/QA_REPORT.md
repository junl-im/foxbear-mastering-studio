# QA Report - v1.4.8 Dock Spectrum Cleanup / Detail-only FFT

Date: 2026-07-07

## Scope

- Keep Dock mini FFT removed from the persistent bottom Dock.
- Remove leftover `renderMini` and `miniCanvases` code from the spectrum visualizer.
- Keep detail-page spectrum visualization intact.
- Reduce perceived lag by avoiding live FFT analyser connection when no detail spectrum canvas is mounted.
- Preserve PC floating settings gear alignment, crossfade, waveform zoom, browser exit guard, and external analyser tap stability.

## Static QA coverage

- Version/cache/SRI coverage.
- Dock mini FFT host and renderer removed.
- Runtime health no longer requires removed `FoxBearSpectrumVisualizer.renderMini`.
- Detail spectrum panel still available through `renderPanel`.
- `activateAudio()` has a no-canvas early return guard.
- PC settings gear CSS alignment rules present.
- Browser/PWA QA matrix refreshed for v1.4.8.

## Manual QA still required

Real Kakao browser, Chrome Android, Safari iOS, Android PWA, and iOS PWA should be checked for Dock height, settings gear alignment, playback smoothness, detail spectrum behavior, and Back/refresh prompts.
