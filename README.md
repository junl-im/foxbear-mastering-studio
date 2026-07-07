# FoxBear AI Mastering Studio Pro v1.4.7

## Current patch: v1.4.7 Dock FFT removal + stability polish

This patch removes the Dock mini FFT/spectrum view because it was taking persistent Dock space without being clear to users. The detailed AI spectrum panel remains available in the analysis/detail view for users who want frequency evidence.

- Runtime asset cache key: `1.4.7-dock-fft-removal`
- Service worker cache: `foxbear-shell-v1.4.7-dock-fft-removal`
- Package version: `1.4.7`
- Validation target: `npm run check`
- Manual QA doc: `qa/BROWSER_BACK_QA_MATRIX_1.4.7.md`

### v1.4.7 focus

- Removed Dock mini FFT host and renderer calls.
- Kept detail-page spectrum visualizer and static/live FFT evidence.
- Added a render guard so FFT does not connect live audio when no spectrum canvas is mounted.
- Cleaned PC floating settings gear alignment.
- Kept crossfade, waveform zoom, browser exit guard, and analyser tap support from earlier v1.4.x patches.
