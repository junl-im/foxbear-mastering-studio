# QA Report - v1.4.4 FFT Live Hotfix

- Date: 2026-07-07
- Command: `npm run sri:update` then `npm run check`
- Result: 122/122 PASS
- Added checks: `qa/v144_fft_live_hotfix_smoke.js` plus runtime-health coverage for `FoxBearSpectrumVisualizer.renderMini`
- Focus: Dock mini FFT realtime loop, full/mini canvas renderability, AudioContext resume handling, RAF fallback, cache/SRI/runtime-health coverage.

## Root cause

The Dock mini FFT could look static or unresponsive because the realtime spectrum loop in `src/ui/spectrum-visualizer.js` required `state.canvas`, the full detail spectrum canvas. When the Dock mini canvas existed without the detail panel canvas, the analyser could activate but `startLoop()` exited immediately.

## Fix summary

- Added `hasRenderableCanvas()` so the visualizer accepts either the full detail canvas or one or more Dock mini canvases.
- Updated the live loop to use `hasRenderableCanvas()` instead of directly requiring `state.canvas`.
- Kept all live draws routed through `drawEveryCanvas()`, so full and mini canvases stay synchronized.
- Added `scheduleFrame()`/`cancelFrame()` fallback and explicit suspended `AudioContext` resume before starting the live loop.
- Added runtime-health required global coverage for `FoxBearSpectrumVisualizer.renderMini`.

## Limitations

Static QA cannot prove real sound-driven analyser movement in Kakao/Chrome/Safari/PWA. Manual device QA should verify that the Dock FFT moves while audio plays and returns to the static profile when paused.
