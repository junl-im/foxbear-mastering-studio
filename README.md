# FoxBear AI Mastering Studio Pro v1.4.4

## Current patch: v1.4.4 FFT Live Hotfix

This patch fixes the realtime FFT visualizer path that could look unresponsive in the Dock mini spectrum. The v1.4.2/v1.4.3 visualizer loop required the full detail spectrum canvas, so mini-only usage could activate the analyser and then immediately stop. v1.4.4 allows the live loop to run when either the detail canvas or any Dock mini canvas is mounted.

- Runtime asset cache key: `1.4.4-fft-live-hotfix`
- Main affected modules: `src/ui/spectrum-visualizer.js`, `src/boot/runtime-health.js`, `index.html`, `sw.js`, `package.json`
- Retained v1.4.3 feature: playback transition service with safer crossfade recovery
- Retained v1.4.2 features: Dock/A-B crossfade, detail waveform zoom, Dock mini FFT spectrum, browser back QA matrix
- New QA: `qa/v144_fft_live_hotfix_smoke.js`
- Manual QA doc: `qa/BROWSER_BACK_QA_MATRIX_1.4.4.md`

## Recent patches

### v1.4.2 Crossfade + Waveform Zoom + Dock Mini Spectrum

Dock and A/B source changes gained a short fade-out/fade-in path to reduce click/pop artifacts. Detail waveforms can be zoomed with controls plus double-tap/pinch gestures, and the Dock shows a compact live/static FFT mini spectrum.

### v1.4.1 Spectrum Visualizer + Exit Guard

The analysis detail view gained an FFT spectrum canvas backed by existing `analysis.spectrumProfile` data and live Web Audio analyser data when playback is active. Browser refresh/close/back protection was added with native `beforeunload` and app-level `popstate` handling.

### Stage28 Waveform Control View Extraction

Waveform DOM bar creation was centralized in `src/ui/waveform-control-view.js`, while `src/audio/waveform-control-service.js` remains the math/control owner for seek/playhead/peak behavior.
