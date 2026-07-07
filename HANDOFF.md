# v1.4.4 handoff - Playback transition service audit

Latest build: `v1.4.4`. Runtime asset key: `1.4.4-fft-live-hotfix`.

Validation target: `npm run check` should pass 122/122 after SRI update. Use `foxbear-mastering-studio-v1.4.4-overwrite.zip` for cumulative overwrite deployment.

## 핵심 변경

- Root cause found for “FFT has no reaction”: the v1.4.2/v1.4.3 realtime spectrum loop required the full detail `state.canvas`. When only the Dock mini FFT canvas existed, the loop stopped immediately after activation.
- `src/ui/spectrum-visualizer.js` now uses `hasRenderableCanvas()` so either the full detail canvas or any Dock mini canvas can keep the live analyser loop running.
- `drawEveryCanvas()` now returns render status and keeps full/mini canvases synchronized from the same analyser values.
- Added `scheduleFrame()` / `cancelFrame()` fallback for limited WebViews and resume handling for suspended `AudioContext` before starting the loop.
- Runtime health now requires both `FoxBearSpectrumVisualizer.renderPanel` and `FoxBearSpectrumVisualizer.renderMini`.
- Added `qa/v144_fft_live_hotfix_smoke.js` to guard the mini-only live FFT path.
- v1.4.3 playback transition service audit remains intact.

## 회귀 주의 포인트

- Do not remove the `allowAudioElements` path in `bindExclusivePreview()`. It is required so a 96ms crossfade is not immediately killed by exclusive playback.
- Any new player should register through `registerPlaybackLinkedAudio(audio, { role, shell, trackId, mode, ... })` so playback orchestration and spectrum routing stay aligned.
- The transition service must load before `src/app.js`; it is also required by runtime health.
- Browser refresh/close still uses native `beforeunload` copy. Custom Korean copy is reliable only in the app-level `popstate` confirm path.
- Keep Service Worker cache, asset query strings, runtime-health fallback version, package version, and SRI hashes moving together.

## 다음 추천

For v1.4.5, target **real-device navigation/playback QA polish**: Kakao in-app browser, Chrome Android, Safari iOS, Android PWA, and iOS standalone PWA. Focus on back/refresh prompts, crossfade audibility, spectrum live routing, and pinch/double-tap zoom gesture conflicts.

## 다음 패치 후보

- v1.4.5: real-device navigation/playback QA polish for Kakao/Chrome/Safari/PWA.
- Later cleanup: CSS ownership audit for legacy waveform selectors and manual QA screenshots/notes.

## Legacy handoff anchors for cumulative smoke tests

This build remains cumulative over Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage27, and Stage28.

- Stage7: waveform compare CSS cleanup lineage is retained.
- Stage8: async/mobile Dock lineage is retained.
- Stage9 / Stage9.1: Dock waveform CSS split and cumulative overwrite manifest lineage is retained.
- Stage10: download service split lineage is retained.
- Stage11 / Stage11.1: modular renovation and runtime/mobile hotfix lineage is retained.
- Stage12: detail view split lineage is retained.
- Stage27: waveform-control-service next-chat handoff remains valid; `src/audio/waveform-control-service.js` still owns waveform control math.
- Stage28: `waveform-control-view.js` extraction remains valid; unmanaged waveform audit rules still apply.
- v1.4.1 Spectrum / Exit Guard remains active and is carried through v1.4.4.

## Stage27 다음 대화 인수인계

Stage27 waveform-control-service lineage is retained in v1.4.4. Continue to treat `src/audio/waveform-control-service.js` as the shared waveform math/control service.

## 누적 덮어쓰기 안내

Use the cumulative overwrite package, `foxbear-mastering-studio-v1.4.4-overwrite.zip`, when applying this patch over any earlier Stage7+ or v1.4.x build.
