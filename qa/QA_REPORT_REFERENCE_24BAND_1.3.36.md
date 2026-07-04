# QA Report — Pro v1.3.36 Reference 24-band Matching

## Scope
- Upgrade reference matching from a broad 12-band compact curve to a 24-band tonal profile.
- Keep existing UI, recommendation, and mastering flows compatible.
- Improve reference matching without reintroducing harsh vocal brightness, metallic tone, phone-speaker resonance, or stereo over-expansion.

## Implementation
- `src/app.js`
  - Bumped app version to `Pro v1.3.36`.
  - Bumped analysis cache DB to `foxbear-analysis-cache-v1336` so older 12-band analysis results are not reused.
  - Added `SPECTRUM_PROFILE_24_RANGES` and changed compact FFT profile output to 24 frequency bands.
  - Added profile helpers for normalizing 24-band profiles and upsampling older 12-band profiles.
  - Added synthetic 24-band profiles for built-in preset reference targets.
  - Reworked `getSpectrumProfileDelta()` to return refined sub/bass/mud/body/vocal/presence/harsh/sibilance/air deltas.
  - Reworked `createPresetReferenceMatchNode()` from 4 broad EQ moves into a gentle 9-stage tonal matching chain.
  - Added vocal metallic and mobile resonance safety scaling to reference-driven presence and air boosts.
  - Updated reference metrics UI to show whether a reference was analyzed with a 24-band profile.
- `src/workers/analysis.worker.js`
  - Changed worker FFT compact profile generation to the same 24-band ranges.
  - Updated mobile speaker risk region mapping so new 24-band profiles and legacy 12-band profiles both remain valid.
- `index.html`, `package.json`, `README.md`, QA files
  - Version, cache-busters, metadata, and SRI hashes updated.

## Safety notes
- Bright references are not allowed to force full presence/air boosts when vocal metallic risk or mobile harshness risk is high.
- The reference matcher remains a subtle tonal shaper; maximum individual EQ moves are clamped below aggressive mastering values.
- Legacy 12-band cached profiles are invalidated by the v1.3.36 analysis cache bump.

## Checks
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
