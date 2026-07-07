# FoxBear AI Mastering Studio Pro v1.4.6

## Current patch: v1.4.6 Stability Polish

This patch stabilizes the spectrum visualizer and browser exit guard after the recent FFT/live preview work. v1.4.6 keeps the external analyser taps from v1.4.5, then adds disconnected canvas pruning, hidden-tab FFT throttling, visibility recovery, runtime diagnostics, and duplicate Back-confirm debounce.

- Runtime asset cache key: `1.4.6-stability-polish`
- Service worker cache: `foxbear-shell-v1.4.6-stability-polish`
- Package version: `1.4.6`
- New QA: `qa/v146_stability_polish_smoke.js`
- Manual QA doc: `qa/BROWSER_BACK_QA_MATRIX_1.4.6.md`

## Validation

Run:

```bash
npm run sri:update
npm run check
npm run package:clean
npm run package:overwrite
```

Expected smoke target: `124/124 PASS`.
