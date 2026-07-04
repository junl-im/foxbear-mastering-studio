# FoxBear Pro v1.3.46 QA Report

## Pro v1.3.46 Dock Continuity + Download/Share

- PASS: `npm run check`
- PASS: SRI validation
- PASS: runtime smoke
- PASS: recommendation popup smoke
- PASS: recommendation explainability smoke
- PASS: shared DSP profile smoke
- PASS: dock waveform smoke
- PASS: engine QA bench
- PASS: strength profile smoke
- PASS: preview translation smoke
- PASS: module split stage 2 smoke

See `qa/QA_REPORT_RECOMMENDATION_EXPLAINABILITY_1.3.45.md`.

## v1.3.46 Dock Continuity + Download/Share
- Dock player keeps timeline position across original/result/master preview and preview environment switches.
- Playing Dock audio resumes automatically after source/environment rebuilds.
- Waveform compare popup no longer pauses Dock playback.
- Download UX now requires selecting a format first, then pressing Download or Share.
- Added explicit file share path and strengthened Kakao/in-app browser fallback guidance.
- Added `qa/dock_continuity_download_smoke.js`.
