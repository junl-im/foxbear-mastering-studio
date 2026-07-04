# FoxBear Pro v1.3.42 QA Report

## Pro v1.3.42 Dynamic De-esser / Harshness Suppressor

- Added dynamic de-esser/harshness suppression for vocal metallic edge and sibilance spikes.
- Integrated the stage in the offline WebAudio mastering chain, finalizer worker, and browser fallback finalizer.
- Added finalizer/report metadata: `dynamicDeEsserMode`, `dynamicDeEsserRisk`, `dynamicDeEsserReductionDb`, and `dynamicDeEsserBands`.
- Updated Engine QA Bench to verify that the `vocalMetallic` synthetic case activates the de-esser without breaking peak/LUFS safety.
- Preserved v1.3.41 Mastering Strength Profiles and all prior guardrails.

See `qa/QA_REPORT_DYNAMIC_DEESSER_1.3.42.md`.

## Validation

- `npm run check`
- SRI validation
- Runtime smoke
- Recommendation popup smoke
- Shared DSP profile smoke
- Dock waveform smoke
- Engine QA Bench
- Strength profiles smoke
