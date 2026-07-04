# FoxBear Pro v1.3.31 QA Report

## Pro v1.3.31 unified phase-safe spatial budget update
- Added a shared phase-safe spatial budget that combines `width` and `stereoGroove` into one effective expansion calculation.
- Final offline rendering now scales width matrix expansion and micro-delay stereoGroove together when spatial risk, low-mono risk, low-side energy, or FFT air/presence risk is high.
- Realtime preview width now uses the same budget function as offline rendering to reduce preview/final mismatch.
- `phaseSafe` now performs actual DSP intervention instead of only reducing a safety score.
- Added mastering report/detail metadata for requested vs applied width factor and stereoGroove values.
- Refreshed app version, cache busters, and SRI hash.
- Detailed report: `qa/QA_REPORT_SPATIAL_BUDGET_1.3.31.md`.

## Pro v1.3.30 4x FIR True Peak + gentle multiband dynamics update
- Replaced final true-peak interpolation with 4x windowed-sinc FIR oversampling.
- Added gentle 3-band dynamic control to the finalizer and browser fallback path.
- Added a lightweight multiband dynamics node to the offline mastering chain.
- Added finalizer report fields for oversample mode and multiband band reductions.
- Refreshed app version, cache busters, and SRI hash.
- Detailed report: `qa/QA_REPORT_TRUEPEAK_MULTIBAND_1.3.30.md`.

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
- `qa/QA_REPORT.md`
- `qa/QA_REPORT_SPATIAL_BUDGET_1.3.31.md`
- `qa/QA_REPORT_TRUEPEAK_MULTIBAND_1.3.30.md`
