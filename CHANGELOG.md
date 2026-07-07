# Changelog

## v1.4.12 - Download diagnostics follow-up

- Added a bounded download/share diagnostic event history inside `src/download/download-service.js`.
- Added `FoxBearDownloadService.getDownloadDiagnostics()`, `serializeDownloadDiagnostics()`, `copyDownloadDiagnostics()`, and `getDownloadDiagnosticEvents()`.
- Recorded key save/share events: share start/success/failure, unsupported share, object URL creation, anchor download click/failure, assist-sheet open, external-browser open, guide copy, diagnostics copy, and file-picker save.
- Added a `진단 복사` action to the download options dialog and enlarged save-help sheet so real-device Kakao/Chrome/Safari/PWA failures can be reported with useful environment/capability data.
- Added capability badges to the save-help sheet: share, anchor download, file picker, PWA/browser mode.
- Runtime health now requires `FoxBearDownloadService.getDownloadDiagnostics` and `FoxBearDownloadService.copyDownloadDiagnostics`.
- Added `qa/v1412_download_diagnostics_followup_smoke.js` and refreshed `qa/BROWSER_BACK_QA_MATRIX_1.4.12.md`.
- Bumped package/build/cache key to `1.4.12-download-diagnostics`.

## v1.4.11 - Download/share reliability + Kakao fallback

- Strengthened the mastered-file download flow for KakaoTalk/in-app browsers where client Blob downloads may silently fail.
- Enlarged the download/options popup and save-help sheet so mobile/PWA content is not clipped.
- Added share/save-first behavior, save help, file-open fallback, troubleshooting-guide copy, and Android external-browser intent fallback.
- Added runtime health checks for download troubleshooting and capability helpers.

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

## Cumulative smoke compatibility notes for v1.4.12

- Stage8 compact mobile Dock overlay anchors remain documented.
- Stage9 Dock waveform dedicated CSS layer remains documented.
- Stage9.1 cumulative overwrite manifest and 누적 덮어쓰기 packaging remain documented.
- Stage10 download service split remains documented.
- Stage11 large modular renovation and Stage11.1 runtime mobile hotfix remain documented.
- Stage12 detail view split remains documented.
- Stage13 runtime health and Stage14 runtime recovery remain documented.
- v1.4.12 Spectrum and Exit Guard remain cumulative.
- v1.4.12 stability polish remains cumulative for FFT lifecycle and Back confirm debounce.
- v1.4.12 Dock FFT removal remains intentional.
- v1.4.12 renderMini cleanup remains intentional; `renderMini` is removed and FFT is detail-only.
- v1.4.12 Performance diagnostics and Packaging polish remain cumulative.
