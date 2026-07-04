# QA Report — v1.3.47 Dock A/B Loudness Match + Difference Listen

## Scope
- Dock level-match toggle.
- Dock difference-listen mode.
- Playback continuity with existing bottom-preview transport.
- Version/cache/SRI validation.

## Checks
- `node --check src/app.js`
- `node --check src/state/app-state.js`
- `python3 qa/verify_sri.py`
- `node qa/ab_loudness_difference_smoke.js`
- Full `npm run check`

## Result
PASS.
