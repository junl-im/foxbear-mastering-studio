# QA Report — Pro v1.3.38 Shared DSP Preview/Render Profile

## Objective
Reduce perceptual mismatch between realtime preview, 15-second mastering preview, and the final offline render without adding a new heavy DSP stage.

## Implementation
- Added `SHARED_DSP_PROFILE_VERSION = v1.3.38-shared-dsp-profile`.
- Added `createSharedDspProfile(settings, analysis, preset, options)`.
- Added `createSharedRealtimePreviewParams()` so realtime preview no longer recomputes tone/compressor/width values independently.
- Added `markSharedDspProfileApplied()` to store the actual applied profile on `analysis.sharedDspProfileApplied`.
- Added `getSharedDspSummaryForReport()` to keep export/finalizer report metadata compact and stable.

## Shared fields
- Effective settings after master goal/style/smart guards.
- Mastering intensity.
- Phase-safe spatial budget.
- Realtime EQ/compressor/limiter/output-gain values.
- Finalizer analysis payload summary.

## Safety notes
- This is a control-profile unification patch, not a complete DSP-code merge.
- Offline render still uses its full high-quality chain.
- Realtime preview stays lightweight, but now follows the same decision profile so tone/width/dynamics choices are less likely to diverge.

## Validation
- `node --check src/app.js`
- `node qa/shared_dsp_profile_smoke.js`
- `npm run check`
- SRI validation
