# QA Report - v1.3.33 Mobile Speaker Translation Guard

## Scope
- Addressed phone-speaker ringing / boxy resonance concerns during mastered playback.
- Added mobile speaker resonance risk metadata to the FFT analysis path.
- Added mobile translation correction in the offline master chain and finalizer paths.
- Tuned recommendation and setting generation so high-risk mobile playback material is less likely to receive excessive warmth, punch, clarity, wide, or electronic/spatial bias.

## Engine changes
- Added `estimateMobileSpeakerRisk()` with boom, box, honk, phone harshness, and density sub-scores.
- Analysis output now includes:
  - `mobileSpeakerRisk`
  - `mobileSpeakerRiskLabel`
  - `mobileSpeakerDetail`
- `createTranslationGuardNode()` now controls:
  - sub/upper-bass bloom around 90 Hz
  - low-mid mud / box tone around 255-470 Hz
  - honk around 2.9 kHz
  - phone-speaker harsh resonance around 4.2 kHz
- Finalizer worker and browser fallback now run a post-render `mobileSpeakerResonanceGuard` before loudness normalization and true-peak limiting.
- Mastering details now show the applied mobile speaker guard cuts when active.

## Recommendation changes
- `makeRecommendedSettings()` now lowers warmth, punch, clarity, and raises metallic removal when mobile playback risk is high.
- `recommendPreset()` now penalizes Future Bass, EDM, House, Spatial, and Punch when phone-speaker ringing risk is high unless the audio/file-name evidence is strong.
- Genre reason text now includes `폰울림 위험` when the risk is relevant.

## Validation
- `node --check src/app.js`: PASS
- `node --check src/workers/analysis.worker.js`: PASS
- `node --check src/workers/master-finalizer.worker.js`: PASS
- `npm run check`: PASS
- SRI validation: PASS
- Synthetic analysis/finalizer smoke test: PASS
  - Generated a synthetic 330 Hz + 4.3 kHz resonance signal.
  - Analyzer returned mobile-speaker risk metadata.
  - Finalizer returned `mobileSpeakerResonanceGuard` metadata and cut values.

## Changed files
- `index.html`
- `package.json`
- `README.md`
- `src/app.js`
- `src/workers/analysis.worker.js`
- `src/workers/master-finalizer.worker.js`
- `qa/QA_REPORT.md`
- `qa/QA_REPORT_MOBILE_TRANSLATION_1.3.33.md`
