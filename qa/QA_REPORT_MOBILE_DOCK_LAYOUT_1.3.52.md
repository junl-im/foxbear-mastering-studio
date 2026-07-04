# QA Report — v1.3.52 Mobile Dock Layout Final QA

## Scope

This release stabilizes the mobile bottom Dock layout after the waveform, preview translation, export, and snapshot features were added.

## Changes verified

- Dock height is measured at runtime and synced into CSS variables.
- Floating overlays use Dock-derived offsets instead of fixed pixel values.
- Toast, download assist, download options panel, and processing HUD stay above the Dock.
- Mobile Dock controls avoid unexpected wrapping and oversized height growth.
- visualViewport, orientationchange, pageshow, and ResizeObserver events trigger re-sync.
- v1.3.51 Snapshot / Undo History behavior remains intact.

## Commands

- `npm run check` — PASS
- `python3 qa/verify_sri.py` — PASS
- `node qa/mobile_dock_layout_smoke.js` — PASS
