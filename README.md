# FoxBear Mastering Studio

## Pro v1.3.37 Recommendation popup hotfix

This hotfix restores the single-track AI recommendation popup after loading an audio file.

- Fixed a runtime exception in `recommendPreset()` caused by the missing `mid` genre feature destructuring.
- Added `safeRecommendPreset()` so recommendation failures fall back to a safe real preset instead of leaving the track in broken `custom` state.
- Moved `원본선택` to the end of recommendation candidate rows so it remains an explicit manual choice, not the first/default-looking option.
- `원본선택` is only marked active after the user actually chooses it.
- Added a recommendation popup smoke test to catch this regression.

Previous v1.3.36 changes are retained: 24-band reference matching, mobile/vocal safety, spatial budget, A/B preview, and module extraction.
