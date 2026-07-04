# FoxBear Pro v1.3.34 QA Report — A/B Translation Preview + Original Selection

## Scope
- Added `원본선택` to AI recommendation flows so users can reject automatic genre coloration and begin from the neutral custom/original baseline.
- Added a 15-second mastering preview path before full-track rendering.
- Added full-width `마스터링 전 미리보기 · 15초` action above the track detail area.
- Added Dock `마스터링 미리보기` button and a third bottom-preview state for the temporary 15-second mastered sample.

## Engine behavior
- The preview uses the detected A/B highlight start when available, otherwise a safe one-third position fallback.
- The preview segment is sliced from the original track, edge-faded, DC-cleaned, pitch/BPM processed, optionally instrument-layered, passed through the same mastering chain, finalized with LUFS/TP guard, and encoded as WAV16 for quick browser playback.
- Preview output is invalidated when mastering settings or manual preset choices invalidate the final mastered output.
- Existing full-track mastering output and ZIP/report export remain unchanged.

## UI behavior
- AI popup rows now include `원본선택 / 원음 / 수동` in addition to recommended genre candidates.
- AI mastering candidate chips also expose `원본선택` for manual adjustment workflows.
- Dock preview supports `원본 프리뷰`, `마스터링 미리보기`, and `마스터링 프리뷰` without treating the 15-second sample as the completed downloadable master.

## Validation
- `node --check src/app.js`: PASS
- `npm run check`: PASS after SRI refresh
- SRI validation: PASS

## Changed files
- `index.html`
- `assets/css/studio.css`
- `src/app.js`
- `README.md`
- `package.json`
- `qa/QA_REPORT.md`
- `qa/QA_REPORT_AB_PREVIEW_ORIGINAL_1.3.34.md`
