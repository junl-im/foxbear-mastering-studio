# v1.4.14 project notes - Download action clarity

v1.4.14 keeps the v1.4.11 Kakao/in-app fallback, v1.4.12 diagnostics, and v1.4.13 recommended-flow card, then fixes the remaining ambiguity between button labels and actual handlers.

## Decision

The popup should not just look cleaner; each button must do what the label suggests. v1.4.14 routes visible buttons through a single action dispatcher and tags them with `data-download-action` so QA can verify action semantics without guessing.

## Technical notes

- `FoxBearDownloadDialogView.showDownloadOptionsDialog()` now computes `primaryAction`, `secondaryAction`, and `tertiaryAction` from the recommended flow and browser capability.
- `applyActionMeta()` writes `data-download-action` and `data-recommended` metadata.
- `runAction()` dispatches to `runDownloadFlow`, `runShareFlow`, `runAssistFlow`, `runDiagnosticsFlow`, or `runCopyFlow`.
- The dialog now passes dependencies into `shareDownloadFile`, `downloadBlob`, `showDownloadAssist`, `copyCurrentPageUrl`, `copyDownloadDiagnostics`, and `openCurrentPageInExternalBrowser`.
- CSS adds `.download-options-actions-v1414` and a small recommended-action badge.

## Follow-up

Use real-device Kakao/Chrome/Safari/PWA testing to confirm whether the recommended action and save-help flow match user expectations. If Kakao blocks all client-side options, the production-grade fix remains a server download endpoint with proper `Content-Disposition` headers.

## Cumulative history anchors

Stage7 through Stage28 remain cumulative. Stage27 owns `waveform-control-service.js`; Stage28 owns `waveform-control-view.js` and unmanaged waveform audit. v1.4.1-v1.4.14 remain cumulative for spectrum detail view, exit guard, crossfade, waveform zoom, FFT cleanup, settings gear alignment, performance diagnostics, and download/share reliability.

## Cumulative smoke compatibility notes

- Stage8 compact mobile Dock overlay anchors remain part of the cumulative line.
- Stage9 Dock waveform CSS split remains part of the cumulative line.
- Stage9.1 누적 덮어쓰기 manifest remains part of the cumulative line.
- Stage10 download service split remains part of the cumulative line.
- Stage11 large modular renovation remains part of the cumulative line.
- Stage11.1 runtime/mobile hotfix remains part of the cumulative line.
- Stage12 detail view split remains part of the cumulative line.
- Stage13 runtime health and Stage14 runtime recovery remain part of the cumulative line.
- Dock mini FFT was removed and should stay removed unless a future explicit toggle explains it clearly.
- Performance diagnostics remain available through `FoxBearPerformanceDiagnostics` and adaptive refresh.


## Cumulative compatibility smoke anchors

- Stage8 compact mobile Dock overlay anchors remain documented.
- Stage9 Dock waveform CSS split remains documented.
- Stage9.1 cumulative overwrite manifest and 누적 덮어쓰기 packaging remain documented.
- Stage10 download service split remains documented.
- Stage11 large modular renovation remains documented.
- Stage11.1 runtime/mobile hotfix remains documented.
- Stage12 detail view split remains documented.
- Stage27 다음 대화 인수인계: `waveform-control-service.js` remains the shared waveform calculation/control service.
- v1.4.14 Exit Guard remains active for refresh/back protection.
- v1.4.14 Spectrum remains available in the detail-only FFT panel.
- v1.4.14 stability polish remains active for FFT lifecycle and Back confirm debounce.
- FFT external analyser coverage remains documented for preview translation and difference listen graphs.
- Dock FFT removal remains intentional; `#bottomPreviewSpectrum` should not exist.
- renderMini cleanup remains intentional; `renderMini` is removed and FFT is detail-only.
- Performance diagnostics remain available; `FoxBearPerformanceDiagnostics.getSummary()` and snapshot 복사 remain supported.
- Performance diagnostics uses adaptive refresh and keeps Packaging overwrite naming synced with `package.json`.
- Safari iOS, Chrome Android, Kakao Android, Desktop Chrome/Edge, and installed PWA remain part of manual QA coverage.
