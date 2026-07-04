# FoxBear Pro v1.3.44 QA Report

## App Module Split Stage 2

### Scope

This patch continues the low-risk app modularization work. It extracts pure utility logic from `src/app.js` into `src/utils/core-utils.js` while preserving the existing static-site deployment model and classic deferred script loading.

### Changes

- Added `src/utils/core-utils.js`.
- Moved generic math helpers out of `src/app.js`:
  - `clamp`
  - `clamp01`
  - `map`
  - `dbToAmp`
  - `median`
- Moved waveform utility helpers out of `src/app.js`:
  - `normalizeWaveformValues`
  - `sampleMarkersFromValues`
  - `createWaveformOverview`
  - `sampleWaveformOverview`
  - `samplePeakMarkers`
- Removed the duplicate `makeHannWindow()` declaration, keeping the existing shared implementation.
- Updated `index.html` script order so `core-utils.js` loads before `app.js`.
- Added `qa/module_split_stage2_smoke.js`.
- Updated package check pipeline.

### Validation

- PASS: `node --check src/utils/core-utils.js`
- PASS: `node --check src/app.js`
- PASS: `python3 qa/verify_sri.py`
- PASS: `node qa/module_split_stage2_smoke.js`
- PASS: full `npm run check`

### Notes

This is a structural stability patch. No mastering DSP behavior, recommendation score, preview mode, or export format is intentionally changed.
