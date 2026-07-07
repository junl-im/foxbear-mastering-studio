# v1.4.10 handoff - Performance diagnostics polish + Packaging sync

Latest build: `v1.4.10`. Runtime asset key: `1.4.10-perf-polish`.

Validation target: `npm run check` should pass after SRI update. Use `foxbear-mastering-studio-v1.4.10-overwrite.zip` for cumulative overwrite deployment.

## What changed

- Added `src/boot/performance-diagnostics.js` as a hidden diagnostics utility.
- Added `assets/css/boot/performance-diagnostics.css` for the optional diagnostics panel.
- Exposed `window.FoxBearPerformanceDiagnostics` with `collectSnapshot()`, `getSummary()`, `serializeSnapshot()`, `copySnapshotToClipboard()`, `clearHistory()`, `getSnapshot()`, `togglePanel()`, and long-task sample helpers.
- Diagnostics are off by default and can be opened via `?perf=1`, `foxbearPerf=1`, `localStorage['foxbear-perf-diagnostics']='on'`, or `Ctrl/Command + Alt + P`.
- Runtime health now requires `FoxBearPerformanceDiagnostics.collectSnapshot` and `FoxBearPerformanceDiagnostics.getSummary` so missing diagnostics assets are caught early.
- Diagnostics panel refresh is adaptive: normal refresh is short, hidden-tab refresh is throttled, and `visibilitychange` reschedules the loop.
- The diagnostics panel now has 새로고침, 복사, 초기화, and 닫기 controls.
- `tools/create-overwrite-zip.sh` now derives the default overwrite ZIP version from `package.json`.
- Service worker precaches the diagnostics JS/CSS assets.
- Dock mini FFT remains removed; detail-panel FFT remains available.

## Keep in mind

- This patch is intentionally diagnostic, not a visible user feature.
- The diagnostics panel should remain hidden by default and should not consume CPU unless enabled.
- PerformanceObserver long-task tracking is optional and only activates when diagnostics are enabled.
- Do not re-add Dock FFT unless it returns behind a clear user toggle and explanation.

## Manual QA priorities

- Open with `?perf=1` and confirm a small diagnostics panel appears.
- Press `Ctrl/Command + Alt + P` to toggle the diagnostics panel.
- Confirm ordinary app load does not show the panel by default.
- Confirm Dock remains free of FFT/spectrum rows.
- Confirm PC floating settings gear remains centered.
- Confirm detail spectrum panel still renders only when opened.
- Confirm back/refresh guard still works during active work.

## Next patch candidate

- v1.4.11: use diagnostics results to tune any real lag hotspot found on PC/PWA/Kakao/Safari.

## Cumulative QA anchors kept for current v1.4.10

- Stage7 waveform compare CSS cleanup remains cumulative.
- Stage8 async/mobile Dock remains cumulative.
- Stage9 Dock waveform CSS split remains cumulative.
- Stage9.1 cumulative overwrite manifest remains cumulative.
- Stage10 download service split remains cumulative.
- Stage11 large modular renovation remains cumulative.
- Stage11.1 runtime mobile hotfix remains cumulative.
- Stage12 detail view split remains cumulative.
- Stage27 다음 대화 인수인계: `waveform-control-service.js` remains the common waveform math/control layer.
- Stage28 waveform-control-view.js view extraction remains active for the unmanaged waveform audit.
- Spectrum from v1.4.1 remains available in the detail-only FFT panel.
- Exit Guard from v1.4.1 remains active for refresh/back protection.
- Dock FFT removal remains intentional; `#bottomPreviewSpectrum` should not exist.
- PC/PWA settings gear alignment remains retained.
- Stability polish remains active through v1.4.6-v1.4.10.
- Detail-only FFT remains the current policy; runtime health does not require `renderMini`.
- FoxBearPerformanceDiagnostics is the v1.4.10 troubleshooting global.

## 다음 패치 후보

- v1.4.11: use performance diagnostics results for targeted stability/performance tuning.

## Legacy cumulative anchors for QA wording

Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage13, Stage14, Stage16, Stage17, Stage18, Stage19, Stage20, Stage21, Stage22, Stage23, Stage24, Stage25, Stage26, Stage27, and Stage28 remain cumulative.
누적 덮어쓰기 packaging remains supported by the overwrite ZIP.
v1.4.10 stability entry: performance diagnostics are for stability troubleshooting.
