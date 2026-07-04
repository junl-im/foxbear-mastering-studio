# FoxBear AI Mastering Studio

## Pro v1.3.44 App Module Split Stage 2

This update continues the safe modularization started in v1.3.35. Core math/audio utility helpers and dock waveform sampling helpers are now loaded from a small shared utility module before the main app script. The user-facing mastering flow is intentionally unchanged.

### Highlights

- Added `src/utils/core-utils.js` for shared pure helpers.
- Moved clamp/map/db/median helpers out of the large app file.
- Moved dock waveform normalization, peak-marker sampling, and waveform overview helpers into the shared utility module.
- Removed a duplicate `makeHannWindow()` declaration from `src/app.js`.
- Added a dedicated module split smoke test so script order and shared utility availability are checked automatically.
- Updated version, cache busting, SRI, and QA documentation for v1.3.44.

### QA

Run:

```bash
npm run check
```

The check validates syntax, SRI, runtime smoke tests, recommendation popup, shared DSP profile, dock waveform, engine QA bench, strength profile behavior, preview translation controls, and the v1.3.44 module split.
