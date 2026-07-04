# QA Report - FoxBear AI Mastering Studio Pro v1.3.27

## Update

K-weighted LUFS loudness update.

## Scope

- `src/workers/master-finalizer.worker.js`
- `src/workers/analysis.worker.js`
- `src/app.js` fallback finalizer path
- `index.html` version/cache/SRI metadata
- `README.md` and aggregate QA notes

## Changes verified statically

- Finalizer worker now measures loudness with a K-weighting filter chain before EBU-style gating.
- Browser fallback `measureApproxGatedLoudness()` now delegates to K-weighted gated loudness instead of unweighted RMS gating.
- Analysis worker now fills `loudnessIntegrated` with K-weighted LUFS and exposes `loudnessStandard`.
- Detailed report labels were changed from approximate/integrated loudness wording to `K-weighted` LUFS wording.
- Finalizer info now includes `loudnessStandard: ITU-R BS.1770 K-weighting + EBU R128 gates`.
- Version strings were bumped to v1.3.27 and app SRI was refreshed.

## Command checks

```bash
npm run check
```

Passed.

## SRI checks

```bash
python3 qa/verify_sri.py
```

Passed.

## Synthetic worker smoke check

- Analysis worker measured a 2-second stereo 1 kHz sine fixture with finite K-weighted LUFS.
- Finalizer worker processed the same fixture in balanced mode and reached the requested -14 LUFS target within floating-point tolerance.

## Manual checks still recommended

- Compare one quiet, one loud, and one bass-heavy stereo file before/after rendering because standard-style stereo channel summing may read louder than the previous unweighted average method.
- Confirm target LUFS gain feels right for common presets: Streaming Safe -14 LUFS, Apple/Hi-Fi -16 LUFS, Loud Demo -12 LUFS.
- Browser memory should be checked on long mobile sessions because K-weighting currently filters into temporary channel buffers for measurement.
