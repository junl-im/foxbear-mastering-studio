# FoxBear Mastering Studio

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

