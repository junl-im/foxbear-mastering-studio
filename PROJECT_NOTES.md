# v1.4.8 project notes - Dock spectrum cleanup

v1.4.8 keeps patch release versioning and uses the runtime/cache key `1.4.8-dock-spectrum-cleanup`.

## Decision

The Dock mini FFT was removed in v1.4.7 because it was not self-explanatory and consumed always-visible screen space. v1.4.8 finishes that decision by removing the remaining `renderMini` API and `miniCanvases` registry, leaving FFT as a detail-only evidence panel.

## Technical notes

- `#bottomPreviewSpectrum` remains removed from the Dock DOM.
- `renderBottomMiniSpectrum()` remains removed from the Dock render path.
- `FoxBearSpectrumVisualizer.renderMini()` is removed.
- `FoxBearSpectrumVisualizer.getDiagnostics()` no longer reports `miniCanvasCount`.
- Runtime health no longer requires `FoxBearSpectrumVisualizer.renderMini`.
- `FoxBearSpectrumVisualizer.activateAudio()` bails out early when no detail canvas is mounted, preventing unnecessary `createMediaElementSource()` work during normal Dock playback.
- PC settings gear alignment remains stabilized with explicit inline-flex centering and desktop safe-area positioning.
- Keep `index.html`, `sw.js`, runtime health, package version, and SRI on the same `1.4.8-dock-spectrum-cleanup` cache key.

## Next suggested patch

Consider v1.4.9 for a small performance diagnostics toggle or a real-device QA polish pass after testing Kakao, Chrome Android, Safari iOS, Android PWA, and iOS PWA.

## Cumulative history anchors

Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage12.1, Stage12.2, Stage13, Stage14, Stage16, Stage17, Stage18, Stage19, Stage20, Stage21, Stage22, Stage23, Stage24, Stage25, Stage26, Stage27, and Stage28 remain cumulative. Stage28 specifically covers `waveform-control-view.js` and unmanaged waveform audit.

Exit Guard from v1.4.1 remains active. Spectrum from v1.4.1 remains available in the detail panel only; Dock mini FFT and `renderMini` are intentionally removed in v1.4.8.

The latest cache key is `1.4.8-dock-spectrum-cleanup`. Start from `foxbear-mastering-studio-v1.4.8-full.zip` or this working tree. Provide users the overwrite ZIP first: `foxbear-mastering-studio-v1.4.8-overwrite.zip`.

Stage27 waveform-control-service remains active through `src/audio/waveform-control-service.js` and continues to own pointer mapping, playhead updates, peak jump, and managed waveform service rules.
