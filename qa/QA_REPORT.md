# FoxBear Pro v1.3.37 QA Report

## Pro v1.3.37 Recommendation popup hotfix

### Fixed
- Restored AI recommendation popup after single audio upload.
- Fixed `recommendPreset()` runtime error from an undefined `mid` variable.
- Prevented the `원본선택` candidate from looking active before the user manually selects it.
- Added safe recommendation fallback and regression smoke coverage.

### Validation
- `npm run check`
- SRI validation
- Runtime script-order smoke test
- Recommendation popup smoke test

### Detailed reports
- `qa/QA_REPORT_RECOMMENDATION_POPUP_HOTFIX_1.3.37.md`
- `qa/QA_REPORT_REFERENCE_24BAND_1.3.36.md`
- `qa/QA_REPORT_APP_MODULE_SPLIT_1.3.35.md`
- `qa/QA_REPORT_AB_PREVIEW_ORIGINAL_1.3.34.md`
