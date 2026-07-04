# FoxBear Pro v1.3.41 QA Report

## Pro v1.3.41 Mastering Strength Profiles

- Added user-selectable mastering strength profiles: Natural, Balanced, Modern, Loud, Vocal Safe, and Mobile Safe.
- Integrated strength profiles into effective master settings, shared DSP profile summaries, detail panels, master reports, snapshots, and export report payloads.
- Balanced preserves the previous default behavior; Vocal Safe and Mobile Safe apply conservative safety caps for harsh vocal tone and phone-speaker resonance.
- Added `qa/strength_profiles_smoke.js` and included it in `npm run check`.
- Existing engine QA bench, dock waveform, recommendation popup, shared DSP, runtime, and SRI checks remain active.
- See `qa/QA_REPORT_MASTERING_STRENGTH_1.3.41.md`.


## Pro v1.3.40 Engine QA Bench

- Added synthetic audio engine regression bench.
- Bench validates analysis worker and master finalizer worker together.
- Checks 24-band FFT profile, K-weighted LUFS, 4x true peak ceiling safety, limiter/multiband sanity, mobile risk metadata, and non-finite sample protection.
- Existing dock waveform, recommendation popup, shared DSP profile, runtime, and SRI checks remain active.
- See `qa/QA_REPORT_ENGINE_QA_BENCH_1.3.40.md`.


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
