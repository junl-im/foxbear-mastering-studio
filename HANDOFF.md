# v1.4.14 handoff - Download action clarity

Latest build: `v1.4.14`. Runtime asset key: `1.4.14-download-action-clarity`.

Validation target: `npm run check` -> 133/133 PASS after SRI update. Use `foxbear-mastering-studio-v1.4.14-overwrite.zip` for cumulative overwrite deployment.

## What changed

- Download/share reliability from v1.4.11 remains active for Kakao/in-app browsers.
- Download diagnostics from v1.4.12 remain active for copied support reports.
- Recommended-flow card from v1.4.13 remains active.
- v1.4.14 fixes action clarity: visible buttons now map to explicit `data-download-action` values.
- Primary, secondary, and tertiary actions are routed through one dispatcher instead of three separate handlers.
- The recommended button gets `data-recommended="true"` and a small `추천` badge.
- App dependencies are now passed into share/download/assist/copy helpers from the dialog, preserving toast and active object URL tracking.
- `진단 복사`, `안내 복사`, `주소 복사`, and `외부 브라우저` remain available after expanding advanced options.

## QA

- `qa/v1412_download_share_reliability_smoke.js` guards the Kakao/share/download fallback line.
- `qa/v1412_download_diagnostics_followup_smoke.js` guards the diagnostics event/copy flow.
- `qa/v1413_download_flow_polish_smoke.js` guards the recommended-flow card and collapsed advanced actions.
- `qa/v1414_download_action_clarity_smoke.js` guards action metadata, unified dispatch, dependency passing, and recommended badge CSS.
- `qa/BROWSER_BACK_QA_MATRIX_1.4.14.md` contains Kakao/Chrome/Safari/PWA manual checks.

## Manual QA priorities

- KakaoTalk Android in-app: 추천 공유/저장 should open the share/save path first, then fallback to save help if blocked.
- KakaoTalk Android in-app: 저장 도움 should open the help sheet directly.
- KakaoTalk Android in-app: 진단 복사 should copy diagnostics without re-encoding.
- Chrome Android: popup should recommend normal download first, with advanced options collapsed.
- Desktop Chrome/Edge: primary buttons and the 추천 badge should stay aligned without clipping.

## Keep in mind

- External-browser open cannot transfer the in-memory mastered Blob. Users may need to reopen and rerun/download in Chrome/Safari.
- Diagnostics JSON may include a user-agent string. Treat it as support/debug information.
- Dock FFT remains intentionally removed. Detail-panel FFT remains available.

## 다음 패치 후보

- v1.4.15: real-device Kakao/Chrome/Safari/PWA download QA tuning based on copied diagnostics and observed popup behavior.

## Cumulative QA anchors kept for current v1.4.14

- Stage7 waveform compare CSS cleanup remains cumulative.
- Stage9 Dock waveform CSS split remains cumulative.
- Stage27 waveform-control-service remains the common waveform math/control layer.
- Stage28 waveform-control-view.js view extraction remains active for unmanaged waveform audit.
- Spectrum from v1.4.1 remains detail-only after Dock FFT removal.
- Exit Guard from v1.4.1 remains active for refresh/back protection.
- PC settings gear alignment from v1.4.7 remains retained.
- FoxBearPerformanceDiagnostics remains available through `FoxBearPerformanceDiagnostics.collectSnapshot()` and `FoxBearPerformanceDiagnostics.getSummary()`.
- Packaging polish remains active; overwrite ZIP naming follows `package.json`.


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

## v1.4.14 cumulative stability/renderMini notes

- v1.4.14 stability anchors remain active.
- detail-only FFT remains active; Dock mini FFT is intentionally absent.
- `renderMini` remains removed and runtime health should not require it.
