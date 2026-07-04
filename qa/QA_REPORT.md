# FoxBear Pro v1.3.43 QA Report

## Pro v1.3.43 Phone/Laptop/Mono Preview Translation Modes

- Added playback-only preview translation modes to the bottom dock: `원음`, `폰`, `노트북`, `모노`.
- Added WebAudio simulation routing for phone and laptop speaker checks without altering the final render.
- Added mono fold-down preview to catch stereo-width, vocal, and low-end compatibility issues.
- Preview mode changes rebuild the dock player, so stale WebAudio routing does not remain active.
- Preserved v1.3.42 Dynamic De-esser, v1.3.41 Mastering Strength Profiles, and all prior guardrails.

See `qa/QA_REPORT_PREVIEW_TRANSLATION_1.3.43.md`.

## Validation

- `npm run check`
- SRI validation
- Runtime smoke
- Recommendation popup smoke
- Shared DSP profile smoke
- Dock waveform smoke
- Engine QA Bench
- Strength profiles smoke
- Preview translation smoke
