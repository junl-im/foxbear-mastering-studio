# ADR 0001: Keep FFT Out of the Dock Player

- Status: Accepted
- Original decision: v1.4.7-v1.4.8
- Reconfirmed: v1.5.7

## Context

A Dock mini-spectrum was introduced in v1.4.2. The implementation then required fixes for a mini-only animation loop and Web Audio analyser lifecycle. It was removed in v1.4.7 to reduce render work, and remaining `renderMini`/Dock spectrum paths were removed in v1.4.8.

## Decision

The Dock player provides waveform and transport controls only. Full FFT rendering belongs to the detailed analysis view.

## Consequences

- `#bottomPreviewSpectrum` must remain absent.
- Runtime Health must not require `renderMini`.
- A future Dock spectrum experiment requires a new decision with measured frame cost, a single animation loop, visibility suspension, AudioContext lifecycle ownership, and low-end mobile testing.
