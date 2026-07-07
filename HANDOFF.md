# v1.4.5 handoff - Stability audit

Latest build: `v1.4.5`. Runtime asset key: `1.4.5-stability-audit`.

Validation target: `npm run check` should pass 123/123 after SRI update. Use `foxbear-mastering-studio-v1.4.5-overwrite.zip` for cumulative overwrite deployment.

## 핵심 변경

- v1.4.4 fixed the Dock-mini-only FFT loop, but one more live FFT path needed stabilization: audio elements already routed through WebAudio preview graphs cannot safely call `createMediaElementSource()` a second time.
- `src/ui/spectrum-visualizer.js` now exposes `registerExternalAnalyser(audio, analyser, context, meta)`. When an external analyser exists, the spectrum visualizer uses it instead of creating a second `MediaElementAudioSourceNode`.
- `src/app.js` now creates spectrum analyser taps for realtime mastering preview, preview translation modes, and difference-listen output graphs.
- Repeated `registerAudio()` calls now refresh spectrum metadata instead of returning early with stale labels/track IDs.
- v1.4.4 mini-only FFT loop fix remains active: the live loop runs when either the full detail canvas or Dock mini canvas is mounted.
- Added `qa/v145_stability_audit_smoke.js` and carried the browser/PWA matrix forward as `qa/BROWSER_BACK_QA_MATRIX_1.4.5.md`.

## 회귀 주의 포인트

- Do not create a second `createMediaElementSource(audio)` for an audio element that already belongs to realtime mastering, preview translation, or difference-listen graphs. Use `registerExternalAnalyser()` instead.
- Do not remove the `allowAudioElements` path in `bindExclusivePreview()`. It is required so a 96ms crossfade is not immediately killed by exclusive playback.
- Any new player should register through `registerPlaybackLinkedAudio(audio, { role, shell, trackId, mode, ... })` so playback orchestration and spectrum routing stay aligned.
- The transition service must load before `src/app.js`; it is required by runtime health.
- Browser refresh/close still uses native `beforeunload` copy. Custom Korean copy is reliable only in the app-level `popstate` confirm path.
- Keep Service Worker cache, asset query strings, runtime-health fallback version, package version, and SRI hashes moving together.

## 다음 추천

For v1.4.6, target **real-device browser/PWA QA polish**: Kakao in-app browser, Chrome Android, Safari iOS, Android PWA, and iOS standalone PWA. Focus on back/refresh prompts, crossfade audibility, FFT movement in all preview modes, and pinch/double-tap zoom gesture conflicts.


## 다음 패치 후보

- v1.4.6: real-device browser/PWA QA polish for Kakao/Chrome/Safari/PWA.
- Later cleanup: CSS ownership audit for legacy waveform selectors and manual QA screenshots/notes.

## 다음 대화 인수인계

Start from `foxbear-mastering-studio-v1.4.5-full.zip` or this working tree. Apply the cumulative overwrite package first when updating an existing deployment.

## Legacy handoff anchors for cumulative smoke tests

This build remains cumulative over Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage27, and Stage28.

- Stage27: `src/audio/waveform-control-service.js` still owns waveform control math.
- Stage28: `src/ui/waveform-control-view.js` still owns managed waveform DOM creation.
- v1.4.1 Spectrum / Exit Guard remains active and is carried through v1.4.5.
- v1.4.2 Crossfade / Zoom / Dock mini spectrum remains active.
- v1.4.3 Playback transition service remains active.
- v1.4.4 Dock-mini-only FFT loop hotfix remains active.

## 누적 덮어쓰기 안내

Use the cumulative overwrite package, `foxbear-mastering-studio-v1.4.5-overwrite.zip`, when applying this patch over any earlier Stage7+ or v1.4.x build.
