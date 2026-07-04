# FoxBear Pro v1.3.31 Spatial Budget QA Report

## Scope

This patch addresses over-wide masters caused by independent accumulation of genre preset width, reference width matching, master style width deltas, and stereoGroove micro-delay widening.

## Implementation

- Added `getPhaseSafeSpatialBudget()` in `src/app.js`.
- The new budget combines:
  - M/S-style width matrix expansion.
  - stereoGroove micro-delay expansion.
  - source stereo width.
  - low-mono score.
  - low-side ratio.
  - FFT-derived air/presence risk.
  - existing `spatialExcessRisk`.
- Offline render now applies the budget before `createStereoWidthNode()` and `createStereoGrooveNode()`.
- Realtime preview width now uses the same budget function.
- `makeEffectiveMasterSettings()` applies the same scaling to effective render settings so width/stereoGroove values do not stack unchecked after genre/reference/style adjustments.
- Mastering reports include requested vs applied width factor and stereoGroove metadata.

## Safety behavior

- Narrow or neutral width settings are preserved.
- Width expansion above unity and stereoGroove are scaled together when the source is already wide or phase risk is high.
- `phaseSafe` remains user-controllable, but when enabled it now actively changes the rendered DSP path.

## Validation

- `npm run check`: PASS.
- SRI validation: PASS.
- Static verification confirmed the render path uses `getPhaseSafeSpatialBudget()` for both `createStereoWidthNode()` and `createStereoGrooveNode()`.

## Changed files

- `index.html`
- `package.json`
- `README.md`
- `src/app.js`
- `qa/QA_REPORT.md`
- `qa/QA_REPORT_SPATIAL_BUDGET_1.3.31.md`
