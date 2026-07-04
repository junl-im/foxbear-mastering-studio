# FoxBear Pro v1.3.43 QA Report

## Phone/Laptop/Mono Preview Translation Modes

- Added dock-level preview environment controls: `원음`, `폰`, `노트북`, `모노`.
- Added `PREVIEW_TRANSLATION_MODES` and `previewTranslationMode` state.
- Added WebAudio playback-only routing for small-speaker and mono checks.
- Phone/Laptop modes use HPF, low-shelf trim, body/presence shaping, and LPF to expose translation risks.
- Mono mode uses a ChannelSplitter/ChannelMerger matrix to fold left/right to dual-mono playback.
- The final render and saved master are unchanged by preview translation mode.
- Added `qa/preview_translation_smoke.js`.

## Validation

- `node --check src/app.js`
- `node --check src/state/app-state.js`
- `npm run check`
- SRI validation
- Runtime smoke
- Recommendation popup smoke
- Shared DSP profile smoke
- Dock waveform smoke
- Engine QA Bench
- Strength profiles smoke
- Preview translation smoke
