# QA Report - v1.4.5 Stability Audit

- Date: 2026-07-07
- Command: `npm run sri:update` then `npm run check`
- Result: 123/123 PASS
- Added checks: `qa/v145_stability_audit_smoke.js`
- Focus: FFT live routing across existing WebAudio preview graphs, Dock mini/full canvas routing, external analyser taps, cache/SRI/runtime-health coverage.

## Root cause addressed

v1.4.4 fixed the mini-only canvas loop, but WebAudio preview modes could still make the live FFT look inactive. Realtime mastering preview, preview translation modes, and difference listen already create `MediaElementAudioSourceNode` graphs. A browser only allows one `createMediaElementSource()` binding per audio element, so the spectrum visualizer had to use analyser taps from those existing graphs instead of creating another source.

## Fix summary

- Added `FoxBearSpectrumVisualizer.registerExternalAnalyser()` and external analyser preference in `connectAudio()`.
- Added metadata refresh on repeated spectrum audio registration.
- Added app-level `createSpectrumAnalyserTap()` and `registerExternalSpectrumAnalyser()` helpers.
- Wired analyser taps into realtime mastering preview, preview translation, and difference-listen WebAudio graphs.
- Carried forward v1.4.4 `hasRenderableCanvas()` / `drawEveryCanvas()` mini-only loop fix.

## Limitations

Static QA cannot prove real sound-driven analyser movement in Kakao/Chrome/Safari/PWA. Manual device QA should verify Dock/detail FFT movement while playing: normal Dock preview, realtime mastering preview, phone/laptop/mono preview translation, and difference listen.
