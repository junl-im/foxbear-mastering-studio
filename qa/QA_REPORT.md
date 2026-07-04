# FoxBear Pro v1.3.36 QA Report

## Pro v1.3.36 Reference 24-band matching update
- Expanded FFT compact profiles from 12 to 24 bands for uploaded tracks and reference tracks.
- Added 24-band normalization and legacy 12-band upsampling helpers so older values do not break reference logic.
- Reworked the reference matcher into sub, bass, mud, body, vocal, presence, harshness, sibilance, and air decisions.
- Added vocal metallic and mobile harshness safety scaling to prevent bright references from creating brittle vocals or phone-speaker resonance.
- Bumped app version, cache busters, package metadata, analysis cache DB, and SRI hashes.
- Detailed report: `qa/QA_REPORT_REFERENCE_24BAND_1.3.36.md`.

## Static checks
- `node --check src/config/mastering-presets.js`: PASS
- `node --check src/config/genre-presets.js`: PASS
- `node --check src/config/reference-targets.js`: PASS
- `node --check src/state/app-state.js`: PASS
- `node --check src/app.js`: PASS
- `node --check src/workers/analysis.worker.js`: PASS
- `npm run check`: PASS
- SRI validation: PASS
- Runtime script-order smoke test: PASS

## Changed files
- `index.html`
- `package.json`
- `README.md`
- `src/app.js`
- `src/workers/analysis.worker.js`
- `qa/QA_REPORT.md`
- `qa/QA_REPORT_REFERENCE_24BAND_1.3.36.md`
- `qa/static-audit.txt`
