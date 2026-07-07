# v1.4.12 handoff - Download diagnostics follow-up

Latest build: `v1.4.12`. Runtime asset key: `1.4.12-download-diagnostics`.

Validation target: `npm run check` should pass after SRI update. Use `foxbear-mastering-studio-v1.4.12-overwrite.zip` for cumulative overwrite deployment.

## What changed

- Download/share reliability from v1.4.11 remains active for Kakao/in-app browsers.
- Added a bounded diagnostic event history to `FoxBearDownloadService` so failed save/share flows can be inspected.
- Added `FoxBearDownloadService.getDownloadDiagnostics()`, `serializeDownloadDiagnostics()`, `copyDownloadDiagnostics()`, and `getDownloadDiagnosticEvents()`.
- Added `진단 복사` buttons to both the main download dialog and the save-help sheet.
- Added capability badges to the save-help sheet so QA can quickly see whether the current browser supports file share, anchor download, File System Access, or PWA mode.
- Runtime health now checks the diagnostics globals.

## QA

- `qa/v1412_download_share_reliability_smoke.js` guards the v1.4.11/v1.4.12 download fallback line.
- `qa/v1412_download_diagnostics_followup_smoke.js` guards the new diagnostics event/copy flow.
- `qa/BROWSER_BACK_QA_MATRIX_1.4.12.md` contains Kakao/Chrome/Safari/PWA manual checks.

## Manual QA priorities

- KakaoTalk Android in-app: download a WAV/MP3, cancel share once, then press `진단 복사` and confirm JSON is copied.
- Chrome Android: normal download should still start, and diagnostics should show an anchor download event.
- iOS Safari: file share should use Web Share when available; otherwise the assist sheet should stay readable.
- Desktop Chrome/Edge: File System Access direct save should record file-picker diagnostics when available.

## Keep in mind

- External-browser open cannot transfer the in-memory mastered Blob. Users may need to reopen and rerun/download in Chrome/Safari.
- Diagnostics JSON may include a user-agent string. Treat it as support/debug information.
- Dock FFT remains intentionally removed. Detail-panel FFT remains available.

## 다음 패치 후보

- v1.4.13: real-device Kakao/Chrome/Safari/PWA download QA tuning based on copied diagnostics.

## Cumulative QA anchors kept for current v1.4.12

- Stage7 waveform compare CSS cleanup remains cumulative.
- Stage9 Dock waveform CSS split remains cumulative.
- Stage27 waveform-control-service remains the common waveform math/control layer.
- Stage28 waveform-control-view.js view extraction remains active for unmanaged waveform audit.
- Spectrum from v1.4.1 remains detail-only after Dock FFT removal.
- Exit Guard from v1.4.1 remains active for refresh/back protection.
- PC settings gear alignment from v1.4.7 remains retained.

## Cumulative smoke compatibility notes

- Stage8 remains documented for compact mobile Dock overlay anchors.
- Stage9 remains documented for Dock waveform CSS split.
- Stage9.1 remains documented for 누적 덮어쓰기 packaging.
- Stage10 remains documented for download service split.
- Stage11 remains documented for large modular renovation.
- Stage11.1 remains documented for runtime/mobile hotfix.
- Stage12 remains documented for detail view split.
- Stage13 and Stage14 remain documented for runtime health and runtime recovery.
- Stage27 다음 대화 인수인계: `waveform-control-service.js` remains the shared waveform calculation/control service.
- v1.4.12 Spectrum remains available in the detail-only FFT panel.
- v1.4.12 stability polish remains active for FFT lifecycle and Back confirm debounce.
- Dock FFT removal remains intentional; `#bottomPreviewSpectrum` should not exist.
- detail-only FFT remains the current policy.
- settings gear alignment remains retained.
- FoxBearPerformanceDiagnostics remains available; `FoxBearPerformanceDiagnostics.collectSnapshot()` and `FoxBearPerformanceDiagnostics.getSummary()` are the diagnostics globals.
- Packaging polish remains active; overwrite ZIP naming follows `package.json`.
