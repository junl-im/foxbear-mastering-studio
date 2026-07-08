# QA Report - v1.4.18 Download dialog micro hint

## Result
- `npm run check`: 137/137 PASS

## Added QA
- `qa/v1418_download_dialog_micro_hint_smoke.js`
- `qa/BROWSER_BACK_QA_MATRIX_1.4.18.md`

## Scope
- `FoxBearDownloadService.getDownloadDialogCompactHint()` is exposed and required by Runtime Health.
- Main download dialog renders `.download-options-compact-hint`.
- First-screen flow steps are capped with `visibleStepLimit`.
- Additional diagnostics/copy/external-browser tools remain behind `추가 옵션`.
- Duplicate flow-step append logic was removed from `download-dialog-view.js`.
- v1.4.17 compact recovery checklist remains available as a fallback and carry-forward smoke.
- Cache/version/SRI packaging path.

## Manual QA still needed
Actual KakaoTalk in-app browser, Android Chrome, iOS Safari, Android PWA, and iOS PWA tests were not run in this environment.
