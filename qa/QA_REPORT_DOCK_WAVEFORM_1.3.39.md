# QA Report — Pro v1.3.39 Dock Waveform Mini View

## Scope
- Added a compact waveform/peak mini view above the bottom dock controls.
- The mini view follows the active dock source: original, 15s result listening, or mastered output.
- Clicking the mini view opens a centered compact waveform comparison popup.
- Renamed the 15s mastering preview UX to `결과 미리듣기`.
- Reordered dock actions so `마스터링 진행` appears before `결과 미리듣기`.
- Reduced the four dock action/listening buttons by roughly one third and aligned the two action buttons left and the two listening tabs right.
- Moved the processing HUD closer to the dock top edge.

## Implementation notes
- Analysis now stores a cached original waveform overview for dock rendering.
- 15s result listening stores its own waveform overview in `masterPreviewInfo`.
- Full mastering still stores before/after waveform overview through the existing final render path.
- The comparison popup reuses the existing preview dialog shell with a compact waveform mode.

## Checks
- `node --check src/app.js`
- `npm run check`
- SRI validation
- `qa/dock_waveform_smoke.js`
