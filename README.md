# FoxBear AI Mastering Studio Pro v1.4.10

## Current patch: v1.4.10 Performance diagnostics polish

This patch adds a hidden, lightweight diagnostics layer for tracking the kind of real-world lag reports that are hard to reproduce in static QA. It does not add another always-visible Dock element.

- Runtime asset cache key: `1.4.10-perf-polish`
- Service worker cache: `foxbear-shell-v1.4.10-perf-polish`
- Package version: `1.4.10`
- Validation target: `npm run check`
- Manual QA doc: `qa/BROWSER_BACK_QA_MATRIX_1.4.10.md`

### v1.4.10 focus

- Added `src/boot/performance-diagnostics.js` and `assets/css/boot/performance-diagnostics.css`.
- Exposed `window.FoxBearPerformanceDiagnostics.collectSnapshot()` and `getSummary()` for quick runtime snapshots and warning summaries.
- Hidden diagnostics panel can be opened with `?perf=1`, `localStorage.foxbear-perf-diagnostics = 'on'`, or `Ctrl/Command + Alt + P`.
- Snapshot includes audio counts, canvas/spectrum state, runtime-health summary, navigation guard state, playback orchestration summary, optional memory info, and long-task hints when supported.
- Diagnostics panel now includes 새로고침, 복사, 초기화, and 닫기 controls; use 복사 to hand off a JSON snapshot.
- Diagnostics refresh is adaptive so hidden/background tabs do less work.
- Overwrite ZIP packaging now follows the package version instead of a hard-coded default.
- Dock mini FFT remains removed; FFT stays detail-panel only.
- PC/PWA floating settings gear alignment from v1.4.7 remains retained.
- Crossfade, waveform zoom, browser exit guard, and analyser tap support remain cumulative.

## Cumulative QA anchors kept for v1.4.10

Spectrum and Exit Guard remain cumulative from v1.4.1. Dock mini FFT remains removed, `#bottomPreviewSpectrum` should not exist, and `renderMini` remains removed. The current FFT policy is detail-only FFT. PC settings gear alignment remains retained. Stage27 waveform-control-service and Stage28 waveform-control-view.js unmanaged waveform audit remain active.
