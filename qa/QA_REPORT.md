# FoxBear Pro v1.3.39 QA Report

## Pro v1.3.39 Dock Waveform Mini View

- Added dock-top waveform/peak mini view.
- Added compact waveform comparison popup.
- Renamed 15s preview wording to `결과 미리듣기`.
- Reordered and compacted bottom dock controls.
- Added `qa/dock_waveform_smoke.js`.
- See `qa/QA_REPORT_DOCK_WAVEFORM_1.3.39.md`.


## Pro v1.3.38 Shared DSP Preview/Render Profile

### Changed
- Added a shared DSP profile layer used by realtime preview and offline render.
- Realtime preview now uses the same effective settings, intensity, spatial budget, tone gains, compressor values, limiter settings, and output gain calculation path as the offline render control profile.
- Offline render marks the applied shared DSP profile on the track analysis metadata.
- 15-second mastering preview and final full render pass the shared DSP profile into finalizer metadata.
- Export/master reports include shared DSP profile metadata for later debugging.

### Retained from v1.3.37
- Recommendation popup runtime hotfix.
- `원본선택` stays manual and non-default.
- Safe recommendation fallback remains active.

### Validation
- `node --check src/app.js`
- `npm run check`
- SRI validation
- Runtime script-order smoke test
- Recommendation popup smoke test
- Shared DSP profile smoke test

### Detailed reports
- `qa/QA_REPORT_SHARED_DSP_PROFILE_1.3.38.md`
- `qa/QA_REPORT_RECOMMENDATION_POPUP_HOTFIX_1.3.37.md`
- `qa/QA_REPORT_REFERENCE_24BAND_1.3.36.md`
- `qa/QA_REPORT_APP_MODULE_SPLIT_1.3.35.md`
- `qa/QA_REPORT_AB_PREVIEW_ORIGINAL_1.3.34.md`
