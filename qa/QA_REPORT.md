# FoxBear QA Report - v1.4.10

## Summary

- Build: `v1.4.10`
- Runtime/cache key: `1.4.10-perf-polish`
- Focus: performance diagnostics polish, adaptive refresh, copyable support snapshots, package-version synced overwrite ZIP, Dock FFT remains removed, detail-only FFT retained.
- Command: `npm run check`
- Result: `129/129 PASS`

## Added in this patch

- `src/boot/performance-diagnostics.js`
- `assets/css/boot/performance-diagnostics.css`
- `qa/v149_performance_diagnostics_smoke.js`
- `qa/v1410_performance_packaging_polish_smoke.js`
- Updated `qa/BROWSER_BACK_QA_MATRIX_1.4.10.md`

## Manual QA reminder

- Normal launch should not show diagnostics.
- `?perf=1` or `Ctrl/Command + Alt + P` should show the diagnostics panel.
- Diagnostics 새로고침/복사/초기화 buttons should work when the panel is open.
- `window.FoxBearPerformanceDiagnostics.getSummary()` should return warning flags for likely lag causes.
- `npm run package:overwrite` should create a ZIP named from the current package version.
- Dock should remain free of FFT/spectrum rows.
- PC settings gear should remain centered.
- Back/refresh guard should still prompt once during active work.
