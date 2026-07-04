# FoxBear Pro v1.3.29 QA Report

## Pro v1.3.29 FFT analyzer update
- Added 4096-point FFT analysis with Hann windowing and 75% overlap frame sampling.
- Added FFT-derived spectrum bands, centroid, rolloff, flatness, flux, and compact spectrum profile.
- Improved genre recommendation, EQ/reference matching, and phase-safe width decisions.
- Added guards to avoid unnecessary spaciousness when the source is already wide or low-mono compatibility is weak.
- Bumped analysis cache DB so older pre-FFT cached analysis is not reused.
- Refreshed app version, cache busters, and SRI hash.
- Detailed report: `qa/QA_REPORT_FFT_ANALYZER_1.3.29.md`.

## Static checks
- `npm run check`: PASS
- SRI validation: PASS

## Changed files
- `index.html`
- `package.json`
- `README.md`
- `src/app.js`
- `src/workers/analysis.worker.js`
- `qa/QA_REPORT.md`
- `qa/QA_REPORT_FFT_ANALYZER_1.3.29.md`
