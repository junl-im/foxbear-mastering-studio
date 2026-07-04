# QA Report — Pro v1.3.40 Engine QA Bench

## Scope

v1.3.40 adds an automated synthetic audio bench for the mastering engine. This patch is intentionally focused on quality gates and regression protection rather than a new user-facing DSP feature.

## Added

- `qa/engine_qa_bench.js`
- Synthetic audio cases:
  - `balancedPop`
  - `vocalMetallic`
  - `mobileBoom`
  - `peakStress`
- Worker-level execution through a VM-backed `self.onmessage` harness for:
  - `src/workers/analysis.worker.js`
  - `src/workers/master-finalizer.worker.js`

## Checks

The bench verifies:

- Analysis worker returns finite values.
- FFT analysis produces a 24-band `spectrumProfile`.
- K-weighted integrated loudness is finite and sane.
- Finalizer output contains no `NaN` or `Infinity` samples.
- 4x true peak path is active.
- Final true peak stays below the -1.0 dBTP ceiling tolerance.
- Final loudness remains within a practical range around the target.
- Limiter and multiband reduction values remain within bounded ranges.
- Mobile-boom synthetic material triggers mobile risk/cut metadata.
- Peak-stress synthetic material triggers limiter or safety gain behavior.

## Commands

```bash
npm run check
node qa/engine_qa_bench.js
```

## Result

PASS

## Notes

This is not a replacement for human listening QA. It is a regression guard designed to catch broken analysis/finalizer paths, unsafe peaks, non-finite samples, and obvious metadata failures before shipping future DSP changes.
