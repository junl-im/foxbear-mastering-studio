v1.4.20 final QA: 139/139 PASS

# v1.4.20 QA addendum - bulk import guard

- Added static regression coverage for the 35-track import crash hotfix.
- Checks that v1.4.20 exposes `FoxBearBulkImportGuard`, uses a single-lane analysis queue, no longer starts every analysis job immediately inside `handleFiles()`, and updates the cache/version keys.
- Full QA target: 139 checks after adding `qa/v1420_bulk_import_guard_smoke.js`.

# QA Report - v1.4.20 Download dialog first-screen declutter

## Result
- Static qaChecks: 138/138 PASS
- Note: the full `npm run check` output exceeded the tool runtime/log window in this environment, so the same `package.json` `qaChecks` list was verified in segmented runs after the initial suite output reached the mobile Dock checks.

## Added QA
- `qa/v1419_download_dialog_declutter_smoke.js`
- `qa/BROWSER_BACK_QA_MATRIX_1.4.20.md`

## Scope
- `FoxBearDownloadService.getDownloadDialogDisplayProfile()` is exposed and required by Runtime Health.
- Main download dialog uses `download-options-panel-v5` and `data-download-display-mode`.
- Initial receipt renders in idle mode with `renderReceipt(..., { initial: true })`.
- The full checklist stays hidden on first open and only appears after an action needs more guidance.
- Advanced diagnostics/copy/external-browser tools remain behind `추가 옵션`.
- App-level download dialog dependencies now pass the receipt/checklist/compact-hint/display-profile helpers explicitly.
- Cache/version/SRI packaging path updated to `1.4.20-bulk-import-guard`.

## Manual QA still needed
Actual KakaoTalk in-app browser, Android Chrome, iOS Safari, Android PWA, and iOS PWA tests were not run in this environment.

Legacy carry-forward count anchor: 138/138 PASS.
