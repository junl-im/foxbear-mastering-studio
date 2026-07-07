# v1.4.8 handoff - Dock spectrum cleanup / detail-only FFT stability

Latest build: `v1.4.8`. Runtime asset key: `1.4.8-dock-spectrum-cleanup`.

Validation target: `npm run check` should pass after SRI update. Use `foxbear-mastering-studio-v1.4.8-overwrite.zip` for cumulative overwrite deployment.

## What changed

- Dock FFT removal remains active: Dock mini FFT remains removed from the persistent bottom Dock.
- Removed the leftover `FoxBearSpectrumVisualizer.renderMini()` API and internal `miniCanvases` registry.
- Removed `FoxBearSpectrumVisualizer.renderMini` from runtime health required globals.
- Kept `FoxBearSpectrumVisualizer.renderPanel()` for the detail analysis view only.
- Live FFT now only connects when the detail spectrum canvas is mounted; normal Dock playback should not start FFT canvas/audio work.
- PC/PWA settings gear alignment from v1.4.7 is retained.

## Keep in mind

- Do not re-add Dock mini FFT unless it returns behind an explicit user toggle with a clearer explanation.
- Detail-only FFT is still useful as optional visual evidence, but it should not run during ordinary Dock playback.
- Crossfade, waveform zoom, browser exit guard, external analyser taps, and detail spectrum panel are cumulative from v1.4.1-v1.4.7.

## Manual QA priorities

- PC: floating settings gear is centered and aligned above Dock.
- PC/mobile: Dock no longer shows FFT row and feels shorter/lighter.
- Playback: original/master/highlight crossfade still works.
- Detail view: spectrum panel renders static analysis and can animate live only when opened.
- Runtime health: no missing global for `FoxBearSpectrumVisualizer.renderMini`.
- Back/refresh guard: confirm still appears once during active work.

## Cumulative history anchors

Stage7 waveform compare CSS cleanup, Stage8 async/mobile Dock anchors, Stage9 Dock waveform CSS split, Stage9.1 누적 덮어쓰기 packaging, Stage10 download service split, Stage11 large modular renovation, Stage11.1 runtime mobile hotfix, Stage12 detail view split, Stage12.1 Dock UI repair, Stage12.2 cache/runtime fix, Stage13 runtime health, Stage14 runtime recovery, Stage16 mobile settings/version release, Stage17 highlight compare sync, Stage18 settings persistence, Stage19 highlight diagnostics, Stage20 detail panels CSS split, Stage21 unified preview system, Stage22 playback link audit, Stage23 playback orchestration, Stage24 settings overlay cleanup, Stage25 compare controls rehome, Stage26 unified waveform controls, Stage27 waveform-control-service, and Stage28 waveform-control-view.js unmanaged waveform audit are all cumulative in this v1.4.8 build.

## 다음 패치 후보

- v1.4.9: lightweight performance diagnostics toggle or real-device browser/PWA QA polish.

## 다음 대화 인수인계

Stage27 waveform-control-service와 Stage28 waveform-control-view.js 분리는 v1.4.8에서도 유지됩니다. 다음 대화에서는 Dock FFT 제거 후 실제 PC/PWA Dock 높이, 설정 아이콘 정렬, 상세 Spectrum 패널 성능, runtime health missing-global 여부만 확인하면 됩니다.
