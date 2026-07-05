# QA Report — v1.3.59 Dock Waveform Timeline Model

## Scope
- Dock mini waveform and popup waveform now use a shared timeline model.
- LIVE playhead is mapped to the plotted waveform span, not the outer button box or snapped bar center.
- Pointer/touch seek uses the same plotted span, so the touched position and playback start position match.
- Popup rows compute playback percent per row: original/mastered use full-song scope, master preview uses local preview scope.
- Waveform bars expose slider semantics and `aria-valuenow` updates for accessibility.

## Checks
- `node --check src/app.js`
- `python3 qa/verify_sri.py`
- `node qa/dock_waveform_timeline_model_smoke.js`
- Full `npm run check`

## Result
PASS — Dock/popup waveform mapping and touch seek model verified.
