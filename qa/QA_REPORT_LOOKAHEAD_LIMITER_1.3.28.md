# QA Report - FoxBear AI Mastering Studio Pro v1.3.28

## Update

K-weighted LUFS finalizer with lookahead limiter.

## Scope

- `src/workers/master-finalizer.worker.js`
- `src/app.js` fallback finalizer path
- `index.html` version/cache/SRI metadata
- `README.md` and aggregate QA notes

## Changes verified statically

- Finalizer worker now applies a future-window peak scan before the ceiling stage.
- Quality modes map to lookahead windows: Fast 1.5ms, Balanced 3ms, Max 5ms.
- The limiter now attenuates transient sections with a time-varying gain envelope instead of relying on broad pre-ceiling gain reduction.
- Browser fallback `applyTransparentLimiterGuard()` now uses the same lookahead envelope approach.
- Finalizer info and JSON export reports include limiter metadata: `limiterMode`, `lookaheadMs`, `lookaheadSamples`, `limiterReductionDb`, and `preLimiterPeak`.
- Version strings were bumped to v1.3.28 and app SRI was refreshed.

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

- Finalizer worker processed a stereo transient fixture in balanced mode.
- The returned metadata reported a 3ms lookahead window.
- Output stayed finite and below the requested ceiling after the final safety stage.

## Manual checks still recommended

- Compare drum-heavy, EDM, and vocal tracks to confirm transient punch feels more transparent than the previous global peak trim behavior.
- Check Fast mode on long mobile files because lookahead adds a temporary peak envelope and deque allocation proportional to track length.
- Verify A/B preview expectations: final export now has a more precise offline limiter than the real-time Web Audio preview chain.
