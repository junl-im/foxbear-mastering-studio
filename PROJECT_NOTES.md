# v1.4.7 project notes - Dock FFT removal

v1.4.7 keeps patch release versioning and uses the runtime/cache key `1.4.7-dock-fft-removal`.

## Decision

The Dock mini FFT was removed because it was not self-explanatory and consumed always-visible screen space. The detail spectrum panel remains for users who want FFT evidence, while the Dock returns to transport, waveform, source switching, and key actions.

## Technical notes

- `#bottomPreviewSpectrum` is removed from the Dock DOM.
- `renderBottomMiniSpectrum()` is removed from the Dock render path.
- `FoxBearSpectrumVisualizer.activateAudio()` now bails out early when no renderable canvas is mounted, preventing unnecessary `createMediaElementSource()` work during normal Dock playback.
- PC settings gear alignment was stabilized with explicit inline-flex centering and desktop safe-area positioning.
- Keep `index.html`, `sw.js`, runtime health, package version, and SRI on the same `1.4.7-dock-fft-removal` cache key.

## Next suggested patch

Consider v1.4.8 for a small performance diagnostics panel or a true user-facing performance mode toggle, after real device testing.
## Cumulative history anchors

Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage12.1, Stage12.2, Stage13, Stage14, Stage16, Stage17, Stage18, Stage19, Stage20, Stage21, Stage22, Stage23, Stage24, Stage25, Stage26, Stage27, and Stage28 remain cumulative. Stage28 specifically covers `waveform-control-view.js` and unmanaged waveform audit.

Exit Guard from v1.4.1 remains active. Spectrum from v1.4.1 remains available in the detail panel only; Dock mini FFT is intentionally removed in v1.4.7.

The latest cache key is `1.4.7-dock-fft-removal`. Start from `foxbear-mastering-studio-v1.4.7-full.zip` or this working tree. Provide users the overwrite ZIP first: `foxbear-mastering-studio-v1.4.7-overwrite.zip`.

Stage27 waveform-control-service remains active through `src/audio/waveform-control-service.js` and continues to own pointer mapping, playhead updates, peak jump, and managed waveform service rules.
