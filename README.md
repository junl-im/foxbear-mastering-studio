# FoxBear AI Mastering Studio Pro v1.4.5

## Current patch: v1.4.5 Stability Audit

This patch stabilizes the FFT visualizer after the Dock mini live-loop hotfix. The key issue was WebAudio ownership: realtime mastering preview, phone/laptop/mono preview translation, and difference listen already create `MediaElementAudioSourceNode` graphs, so the spectrum visualizer must not try to create a second source from the same audio element. v1.4.5 adds external analyser taps and routes those existing graphs into the same full/detail and Dock mini spectrum visualizer.

- Runtime asset cache key: `1.4.5-stability-audit`
- Main affected modules: `src/ui/spectrum-visualizer.js`, `src/app.js`, `index.html`, `sw.js`, `package.json`
- New visualizer API: `FoxBearSpectrumVisualizer.registerExternalAnalyser()`
- New app helpers: `createSpectrumAnalyserTap()` and `registerExternalSpectrumAnalyser()`
- New QA: `qa/v145_stability_audit_smoke.js`
- Manual QA doc: `qa/BROWSER_BACK_QA_MATRIX_1.4.5.md`

## Recent patches

### v1.4.4 FFT Live Hotfix

Fixed the Dock mini FFT appearing static/unresponsive when no full detail spectrum panel was mounted.

### v1.4.3 Playback Transition Service Audit

Moved crossfade behavior into `src/audio/playback-transition-service.js` and improved play rejection volume recovery.

### v1.4.2 Crossfade + Waveform Zoom + Dock Mini Spectrum

Dock and A/B source changes gained a short fade-out/fade-in path to reduce click/pop artifacts. Detail waveforms can be zoomed with controls plus double-tap/pinch gestures, and the Dock shows a compact live/static FFT mini spectrum.

### v1.4.1 Spectrum Visualizer + Exit Guard

The analysis detail view gained an FFT spectrum canvas backed by existing `analysis.spectrumProfile` data and live Web Audio analyser data when playback is active. Browser refresh/close/back protection was added with native `beforeunload` and app-level `popstate` handling.

### Stage28 Waveform Control View Extraction

Waveform DOM bar creation was centralized in `src/ui/waveform-control-view.js`, while `src/audio/waveform-control-service.js` remains the math/control owner for seek/playhead/peak behavior.
