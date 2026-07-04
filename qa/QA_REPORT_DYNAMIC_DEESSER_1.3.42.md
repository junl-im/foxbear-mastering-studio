# QA Report — Pro v1.3.42 Dynamic De-esser / Harshness Suppressor

## Scope

v1.3.42 adds dynamic vocal de-essing and harshness suppression to reduce metallic, robotic, and sibilant vocal edges without dulling the whole mix.

## Implementation

- Added `estimateDynamicDeEsserNeed()` to combine vocal metallic risk, sibilance, presence harshness, exciter intensity, and mobile harshness.
- Added `createDynamicDeEsserNode()` to the offline WebAudio chain using presence/sibilance/air split bands with gentle compression.
- Added `applyDynamicDeEsserBuffer()` to the browser fallback finalizer.
- Added `applyDynamicDeEsser()` to `master-finalizer.worker.js` using sample-domain envelope followers and dynamic subtraction per band.
- Added report details for presence, sibilance, air reduction, active percentage, and target frequency.

## Safety Intent

The stage only activates when the de-esser risk score crosses the light threshold. Balanced songs remain bypassed. Vocal Safe and Mobile Safe profiles benefit from stronger protection through their existing settings and analysis risk values.

## Validation

- `node --check src/app.js`
- `node --check src/workers/master-finalizer.worker.js`
- `npm run check`
- Engine QA Bench confirms the `vocalMetallic` case triggers dynamic de-essing while keeping output true peak under the ceiling.
