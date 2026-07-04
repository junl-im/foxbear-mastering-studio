# FoxBear Mastering Studio

## Pro v1.3.41 Mastering Strength Profiles

This update adds a practical mastering strength selector so users can choose the engine behavior before rendering.

- Added `Natural`, `Balanced`, `Modern`, `Loud`, `Vocal Safe`, and `Mobile Safe` profiles.
- `Balanced` keeps the current v1.3.40 sound as the default.
- `Vocal Safe` lowers clarity/width/punch and strengthens metallic/sibilance protection for vocals that sound sharp or mechanical.
- `Mobile Safe` lowers warmth/punch/stereo groove and strengthens phone-speaker resonance protection.
- Strength profile metadata is stored in shared DSP profile summaries, master reports, snapshots, and exported reports.
- Added `qa/strength_profiles_smoke.js`; `npm run check` now validates profile behavior together with the engine QA bench.

Previous v1.3.40 changes are retained: synthetic engine QA bench, 24-band FFT checks, K-weighted LUFS checks, 4x true-peak ceiling checks, and non-finite sample protection.


## Pro v1.3.40 Engine QA Bench

This update improves the bottom dock listening workflow and makes waveform/peak checking visible without opening the full detail panel.

- Added a dock-top waveform/peak mini view that follows the active source: original, 15-second result listening, or mastered output.
- Clicking the mini view opens a centered compact waveform comparison popup.
- Renamed the old 15-second mastering preview wording to `결과 미리듣기`.
- Reordered the dock controls: `마스터링 진행` → `결과 미리듣기` → `원본 미리듣기` → `마스터링 미리듣기`.
- Reduced the dock control widths and aligned the left two action buttons to the left and the right two listening tabs to the right.
- Moved the processing HUD closer to the top edge of the dock.

Previous v1.3.38 changes are retained: shared DSP profile for realtime preview, 15-second result listening, and final render.
### v1.3.40 Engine QA Bench

- Added `qa/engine_qa_bench.js` synthetic audio safety bench.
- Bench covers balanced pop, vocal metallic risk, mobile boom/box risk, and peak stress cases.
- Checks 24-band FFT analysis, K-weighted LUFS, 4x true-peak ceiling, limiter/multiband sanity, mobile guard metadata, and non-finite sample protection.
- `npm run check` now runs the engine QA bench after the existing runtime/recommendation/shared-DSP/dock waveform smoke tests.

