# FoxBear Pro v1.3.8 QA Report

## Scope
- UI text patch: `기능 더 보기` -> `버튼 활성화`
- Mastering settings header microcopy removal
- Mobile reference track layout optimization
- Realtime preview popup with stacked mastering controls
- Popup transparency/alignment polish
- Typography normalization
- ZIP fallback when external JSZip cannot load

## Automated Checks
- `npm run check`: PASS
- `npm run check` second pass: PASS
- `node --check src/app.js`: PASS
- Worker syntax checks: PASS
- Duplicate HTML ID check: PASS
- Local asset existence check: PASS
- CSS brace balance check: PASS
- Realtime preview function presence check: PASS

## Notes
- The realtime popup uses a WebAudio live chain for EQ, warmth, width matrix, metallic reduction, compressor, limiter, and gain preview. It does not replace the final high-quality offline render path.
- Pitch/BPM transformation remains in the final render path through WSOLA worker or optional external WASM adapter. This is safer for vocal quality than forcing browser realtime pitch shifting in the preview popup.
- Headless Chromium in this container timed out before completing visual capture, so real audio device playback still needs a local browser smoke test with actual audio files.
