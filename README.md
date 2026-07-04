# FoxBear Mastering Studio

## Pro v1.3.38 Shared DSP Preview/Render Profile

This update reduces mismatch between realtime preview, 15-second mastering preview, and full final render by making them share one normalized DSP decision profile.

- Added `SHARED_DSP_PROFILE_VERSION` and `createSharedDspProfile()`.
- Realtime preview, offline master chain, 15-second A/B preview, and finalizer metadata now use the same effective settings, mastering intensity, phase-safe spatial budget, realtime tone map, and finalizer analysis payload.
- Stored shared DSP metadata in analysis/finalizer/export reports so preview vs final render differences can be audited.
- Preserved the v1.3.37 recommendation popup hotfix: `원본선택` remains a manual option and the AI recommendation popup is protected by safe fallback.
- Added `qa/shared_dsp_profile_smoke.js` to verify the shared profile can be created, applied to analysis metadata, and summarized for reports.

Previous v1.3.36 changes are retained: 24-band reference matching, mobile/vocal safety, spatial budget, A/B preview, and module extraction.
