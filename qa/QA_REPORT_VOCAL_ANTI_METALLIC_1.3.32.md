# QA Report - v1.3.32 Vocal Anti-Metallic Engine Tuning

## Scope

This patch checks and tunes the mastering engine for user-reported vocal artifacts described as mechanical, metallic, or steel-like. It also audits the recommendation system so vocal sibilance/presence is not overinterpreted as an electronic genre cue.

## Findings

- `createHighFrequencyExciterNode()` previously used intensity and clarity only. It could excite 3.6-5.6 kHz+ material and then add an 8.2 kHz shelf without checking vocal/sibilance risk.
- `createToneChain()` could add presence/high-shelf energy independently of the exciter, especially with loud/bright styles.
- `createMetallicRemovalNode()` used narrow, deep static notches. On vocal-like material this can reduce harshness, but if too aggressive it can also add phasey/ringing coloration.
- Reference matching could add clarity/presence/air when the reference was brighter, even if the source already had sibilant vocal risk.
- Genre recommendation used `metallicHint` as one feature for synth/electronic profiles, which could bias sibilant vocals toward brighter electronic-style processing.

## Changes

- Added `isVocalLikeAnalysis()` and `estimateVocalMetallicRisk()` helpers.
- Added effective-settings guard to reduce clarity, intensity, punch, and stereo groove when vocal metallic risk is high.
- Scaled down reference presence/air/brightness boosts when vocal metallic risk is high.
- Added recommendation penalties for Future Bass/Synthpop/EDM/Spatial when sibilant vocal features appear without explicit filename hints.
- Changed `createToneChain()` to reduce high-frequency aggression under vocal metallic risk.
- Changed `createMetallicRemovalNode()` to use less narrow/deep notches on vocal-like material.
- Changed `createHighFrequencyExciterNode()` to risk-scale drive/wet mix and bypass high-risk vocal material.
- Added `createVocalMetallicComfortNode()` after the exciter to smooth throat glare, sibilance, and glassy air.

## Validation

- `node --check src/app.js` passed.
- Full `npm run check` passed after SRI update.

## Notes

This patch intentionally avoids heavy-handed dulling. It keeps sparkle on non-vocal electronic material while making vocal masters less likely to develop metallic/robotic sibilance.
