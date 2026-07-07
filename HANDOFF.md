# v1.4.7 handoff - Dock FFT removal / stability polish

Latest build: `v1.4.7`. Runtime asset key: `1.4.7-dock-fft-removal`.

Validation target: `npm run check` should pass after SRI update. Use `foxbear-mastering-studio-v1.4.7-overwrite.zip` for cumulative overwrite deployment.

## What changed

- Removed Dock mini FFT from the persistent bottom Dock.
- Removed `#bottomPreviewSpectrum` from `index.html`.
- Removed the `renderBottomMiniSpectrum()` Dock render path and Dock calls from `src/app.js`.
- Kept `FoxBearSpectrumVisualizer.renderPanel()` for detail analysis view.
- Added a guard in `FoxBearSpectrumVisualizer.activateAudio()` so live FFT does not create or connect an analyser when there is no mounted spectrum canvas. This reduces unnecessary WebAudio/canvas work and should help perceived lag.
- Added PC/PWA settings gear alignment CSS in `assets/css/mobile-native.css`.

## Keep in mind

- Do not re-add Dock mini FFT unless there is a clearer user-facing explanation/toggle.
- Detail spectrum remains optional visual evidence; it should not run live when no panel is mounted.
- Crossfade, waveform zoom, browser exit guard, external analyser taps, and FFT detail panel are cumulative from v1.4.1-v1.4.6.

## Manual QA priorities

- PC: floating settings gear is centered and aligned above Dock.
- PC/mobile: Dock no longer shows FFT row and feels shorter/lighter.
- Playback: original/master/highlight crossfade still works.
- Detail view: spectrum panel still renders static analysis and live FFT when opened.
- Back/refresh guard: confirm still appears once during active work.
## Cumulative history anchors

Stage7 waveform compare CSS cleanup, Stage8 async/mobile Dock anchors, Stage9 Dock waveform CSS split, Stage9.1 누적 덮어쓰기 packaging, Stage10 download service split, Stage11 large modular renovation, Stage11.1 runtime mobile hotfix, Stage12 detail view split, Stage12.1 Dock UI repair, Stage12.2 cache/runtime fix, Stage13 runtime health, Stage14 runtime recovery, Stage16 mobile settings/version release, Stage17 highlight compare sync, Stage18 settings persistence, Stage19 highlight diagnostics, Stage20 detail panels CSS split, Stage21 unified preview system, Stage22 playback link audit, Stage23 playback orchestration, Stage24 settings overlay cleanup, Stage25 compare controls rehome, Stage26 unified waveform controls, Stage27 waveform-control-service, and Stage28 waveform-control-view.js unmanaged waveform audit are all cumulative in this v1.4.7 build.

- v1.4.1 Spectrum Visualizer and Exit Guard remain active in the detail view / navigation guard.
- v1.4.2 crossfade and waveform zoom remain active, but Dock mini spectrum is intentionally removed in v1.4.7.
- v1.4.5 external analyser taps remain active for detail spectrum when a spectrum panel is mounted.
- 누적 덮어쓰기 package: `foxbear-mastering-studio-v1.4.7-overwrite.zip`.

## 다음 패치 후보

- v1.4.8: 실기기 브라우저/PWA QA polish and lightweight performance diagnostics.

## 다음 대화 인수인계

Stage27 waveform-control-service와 Stage28 waveform-control-view.js 분리는 v1.4.7에서도 유지됩니다. 다음 대화에서는 Dock FFT 제거 후 실제 PC/PWA Dock 높이, 설정 아이콘 정렬, 상세 Spectrum 패널 성능만 확인하면 됩니다.
