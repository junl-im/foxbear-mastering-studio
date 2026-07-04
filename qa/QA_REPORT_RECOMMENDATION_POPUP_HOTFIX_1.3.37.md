# QA Report — Pro v1.3.37 Recommendation Popup Hotfix

## Scope
- Single-track upload should analyze normally and show the recommendation popup.
- AI recommendation must not crash and leave the track stuck in the initial `custom` state.
- `원본선택` remains available, but only as an explicit manual choice.

## Root cause
`recommendPreset()` used `mid` in the vocal/electronic guard section, but `mid` was not included in the destructured feature list. When analysis completed, this threw a runtime `ReferenceError`, so the track stayed on its initial `custom` preset and the popup flow never completed.

## Changes
- Added `mid` to the `extractGenreFeatures()` destructuring in `recommendPreset()`.
- Added `safeRecommendPreset(fileName, analysis, source)` to prevent future recommendation exceptions from breaking the track lifecycle.
- Updated track analysis, emergency pre-master analysis, and reference analysis to use `safeRecommendPreset()`.
- Moved `원본선택` to the end of the popup/card candidate list.
- Changed the original-selection active rule to `track.originalManualSelected` only.
- Added `qa/recommendation_popup_smoke.js`.

## Validation
- `node --check src/app.js`
- `npm run check`
- `python3 qa/verify_sri.py`
- `node qa/runtime_smoke.js`
- `node qa/recommendation_popup_smoke.js`

## Expected UX
1. Load one audio file.
2. Analysis finishes.
3. Recommended preset is assigned, not `custom`, unless the user chooses `원본선택`.
4. Recommendation popup opens.
5. `원본선택` appears as a manual option at the bottom of the list.
