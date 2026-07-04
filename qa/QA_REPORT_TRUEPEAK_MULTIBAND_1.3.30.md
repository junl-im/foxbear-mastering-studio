# FoxBear Pro v1.3.30 True Peak + Multiband QA Report

## Scope
- Added 4x windowed-sinc FIR true-peak measurement to the master finalizer.
- Replaced linear true-peak interpolation in the browser fallback with the same FIR measurement path.
- Added gentle 3-band dynamic control before LUFS normalization in the worker and fallback finalizer.
- Added a lightweight multiband dynamics node to the offline master render chain.
- Added report metadata: `oversampleMode`, `multibandMode`, `multibandReductionDb`, and `multibandBands`.

## Quality notes
- The multiband stage is intentionally gentle and linked across channels to avoid image shift, pumping, and over-colored masters.
- True Peak remains the final safety authority after multiband and loudness gain, so multiband-created peaks are still caught by the limiter/safety gain.
- Spatial over-expansion guards from v1.3.29 remain active.

## Validation
- `npm run check`: PASS
- SRI validation: PASS
- Master finalizer synthetic smoke test: PASS
- Browser fallback function syntax check: PASS

## Changed files
- `index.html`
- `package.json`
- `README.md`
- `src/app.js`
- `src/workers/master-finalizer.worker.js`
- `qa/QA_REPORT.md`
- `qa/QA_REPORT_TRUEPEAK_MULTIBAND_1.3.30.md`
