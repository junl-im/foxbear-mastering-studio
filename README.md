# FoxBear AI Mastering Studio Pro v1.4.8

## Current patch: v1.4.8 Dock spectrum cleanup + detail-only FFT

This patch finishes the Dock FFT cleanup. The Dock mini FFT/spectrum view was removed because it took persistent Dock space without being clear to users. v1.4.8 also removes the leftover `renderMini` API so the spectrum system is now detail-only.

- Runtime asset cache key: `1.4.8-dock-spectrum-cleanup`
- Service worker cache: `foxbear-shell-v1.4.8-dock-spectrum-cleanup`
- Package version: `1.4.8`
- Validation target: `npm run check`
- Manual QA doc: `qa/BROWSER_BACK_QA_MATRIX_1.4.8.md`

### v1.4.8 focus

- Dock mini FFT host and renderer calls remain removed.
- Removed `FoxBearSpectrumVisualizer.renderMini()` and the internal mini canvas set.
- Kept detail-page spectrum visualizer and static/live FFT evidence.
- Live FFT does not connect audio unless the detail spectrum canvas is mounted.
- Kept PC floating settings gear alignment from v1.4.7.
- Kept crossfade, waveform zoom, browser exit guard, and analyser tap support from earlier v1.4.x patches.
