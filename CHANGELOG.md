# Changelog

## v1.4.14 - Download action clarity

- Kept the v1.4.11 Kakao/in-app fallback, v1.4.12 diagnostics, and v1.4.13 recommended-flow card.
- Fixed the download popup button semantics so visible buttons map to explicit actions: `download`, `share`, `assist`, `diagnostics`, or `copy`.
- Added `data-download-action` and `data-recommended` metadata to the main action buttons for QA and future visual debugging.
- Routed primary, secondary, and tertiary buttons through a single action dispatcher to avoid future drift between labels and handlers.
- Passed app dependencies into download/share/save-help/copy helpers so toast and active object URL tracking remain available.
- Added `.download-options-actions-v1414` and recommended-action badge styling.
- Added `qa/v1414_download_action_clarity_smoke.js` and refreshed `qa/BROWSER_BACK_QA_MATRIX_1.4.14.md`.
- Bumped package/build/cache key to `1.4.14-download-action-clarity`.

## v1.4.12 - Download diagnostics follow-up

- Added bounded download/share diagnostic event history and copyable diagnostics JSON.
- Added capability badges to the save-help sheet.
- Added `진단 복사` to the main download dialog and save-help sheet.

## v1.4.11 - Download/share reliability + Kakao fallback

- Strengthened the mastered-file download flow for KakaoTalk/in-app browsers where client Blob downloads may silently fail.
- Enlarged the download/options popup and save-help sheet so mobile/PWA content is not clipped.
- Added share/save-first behavior, save help, file-open fallback, troubleshooting-guide copy, and Android external-browser intent fallback.

## v1.4.10 - Performance diagnostics polish + Packaging sync

- Polished the hidden performance diagnostics panel with adaptive refresh, snapshot copy, and package overwrite version sync.
- Fixed `tools/create-overwrite-zip.sh` so overwrite package names follow `package.json`.

## Historical cumulative anchors

- Stage7 waveform compare CSS cleanup and `waveform-compare-view.js` remain cumulative.
- Stage8 async/mobile Dock polish remains cumulative.
- Stage9 Dock waveform CSS split and Stage9.1 cumulative overwrite manifest remain cumulative.
- Stage10 download service split through Stage14 runtime recovery remain cumulative.
- Stage16 mobile settings/version release through Stage23 playback orchestration remain cumulative.
- Stage24 settings overlay cleanup through Stage28 waveform-control-view.js / unmanaged waveform audit remain cumulative.
- v1.4.1 Spectrum Visualizer + Exit Guard, v1.4.2 crossfade/waveform zoom, v1.4.7 Dock FFT removal, and v1.4.8 detail-only FFT cleanup remain cumulative.

## Cumulative smoke compatibility notes for v1.4.14

- Stage8 compact mobile Dock overlay anchors remain documented.
- Stage9 Dock waveform dedicated CSS layer remains documented.
- Stage9.1 cumulative overwrite manifest and 누적 덮어쓰기 packaging remain documented.
- Stage10 download service split remains documented.
- Stage11 large modular renovation and Stage11.1 runtime mobile hotfix remain documented.
- Stage12 detail view split remains documented.
- Stage13 runtime health and Stage14 runtime recovery remain documented.
- v1.4.14 Download flow polish keeps v1.4.11 Kakao fallback and v1.4.12 diagnostics cumulative.
- Dock FFT removal remains intentional; `renderMini` remains removed and FFT is detail-only.
- Performance diagnostics and Packaging polish remain cumulative.


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

- v1.4.14 stability anchors from earlier patches remain cumulative.
- Dock mini FFT remains removed and `renderMini` remains removed.
- Detail-only FFT remains the current policy.
