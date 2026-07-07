# v1.4.6 handoff - Stability polish

Latest build: `v1.4.6`. Runtime asset key: `1.4.6-stability-polish`.

Validation target: `npm run check` should pass 124/124 after SRI update. Use `foxbear-mastering-studio-v1.4.6-overwrite.zip` for cumulative overwrite deployment.

## 핵심 변경

- v1.4.6 is a focused stability pass over the v1.4.4/v1.4.5 FFT work.
- `src/ui/spectrum-visualizer.js` now prunes disconnected full/detail canvases and Dock mini canvases before every render pass, preventing stale canvas refs after detail panel refresh or Dock rerender.
- The FFT loop now has a visibility lifecycle: when the app returns from hidden/background state it restarts the live loop or reactivates the current audio; while hidden it falls back to a throttled frame cadence.
- `FoxBearSpectrumVisualizer.getDiagnostics()` exposes live state, analyser state, canvas counts, context state, and last error for future device QA.
- `src/security/site-guards.js` now debounces rapid Back/popstate confirms and re-arms the cancelled Back guard asynchronously. Re-installing the guard refreshes options instead of keeping stale callbacks.
- `FoxBearSiteGuards.getNavigationExitGuardState()` exposes Back guard state for runtime-health and manual QA.
- Runtime health now requires `FoxBearSpectrumVisualizer.getDiagnostics` and `FoxBearSiteGuards.getNavigationExitGuardState`.
- Added `qa/v146_stability_polish_smoke.js` and refreshed `qa/BROWSER_BACK_QA_MATRIX_1.4.6.md`.

## 회귀 주의 포인트

- Do not create a second `createMediaElementSource(audio)` for an audio element that already belongs to realtime mastering, preview translation, or difference-listen graphs. Use `registerExternalAnalyser()` instead.
- Do not remove the Dock mini-only FFT path: live rendering must work with either the full detail canvas or only mini canvases mounted.
- Keep disconnected canvas pruning in place whenever detail panels or Dock mini spectrum hosts are rerendered.
- Do not remove the `allowAudioElements` path in `bindExclusivePreview()`. It is required so a 96ms crossfade is not immediately killed by exclusive playback.
- Browser refresh/close still uses native `beforeunload` copy. Custom Korean copy is reliable only in the app-level `popstate` confirm path.
- Keep Service Worker cache, asset query strings, runtime-health fallback version, package version, and SRI hashes moving together.

## 다음 추천

For v1.4.7, target **real-device browser/PWA QA polish**: Kakao in-app browser, Chrome Android, Safari iOS, Android PWA, and iOS standalone PWA. Focus on back/refresh prompts, crossfade audibility, FFT movement in all preview modes, hidden/foreground FFT recovery, and pinch/double-tap zoom gesture conflicts.


## 다음 패치 후보

- v1.4.7: real-device browser/PWA QA polish for Kakao/Chrome/Safari/PWA.
- v1.4.8: optional diagnostics overlay for FFT/back-guard state during manual QA.
- Later cleanup: CSS ownership audit for legacy waveform selectors and manual QA screenshots/notes.

## 다음 대화 인수인계

Start from `foxbear-mastering-studio-v1.4.6-full.zip` or this working tree. Apply the cumulative overwrite package first when updating an existing deployment.

## Legacy handoff anchors for cumulative smoke tests

This build remains cumulative over Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage27, and Stage28.

- Stage27: `src/audio/waveform-control-service.js` still owns waveform control math.
- Stage28: `src/ui/waveform-control-view.js` still owns managed waveform DOM creation.
- v1.4.1 Spectrum / Exit Guard remains active and is carried through v1.4.6.
- v1.4.2 Crossfade / Zoom / Dock mini spectrum remains active.
- v1.4.3 Playback transition service remains active.
- v1.4.4 Dock-mini-only FFT loop hotfix remains active.
- v1.4.5 External analyser taps remain active.

## 누적 덮어쓰기 안내

Use the cumulative overwrite package, `foxbear-mastering-studio-v1.4.6-overwrite.zip`, when applying this patch over any earlier Stage7+ or v1.4.x build.
