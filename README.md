# FoxBear AI Mastering Studio

## Pro v1.3.43 Phone/Laptop/Mono Preview Translation Modes

This update adds playback-only translation checks to the bottom preview dock. The final render is not changed; users can quickly audition the selected original, 15-second result preview, or mastered output through small-speaker and mono simulation modes.

### Highlights

- Added preview environment buttons to the dock: `원음`, `폰`, `노트북`, `모노`.
- Added WebAudio playback routing for Phone/Laptop/Mono checks without changing the exported master.
- Phone mode trims lows and emphasizes the 2–5 kHz region so speaker ringing, vocal glare, and boxiness are easier to catch.
- Laptop mode checks small-speaker midrange translation with less aggressive filtering than Phone mode.
- Mono mode folds stereo playback to dual-mono to reveal width, vocal, and low-end compatibility issues.
- Rebuilds the dock player when the preview environment changes, preventing stale audio routing.

### QA

Run:

```bash
npm run check
```

The check validates syntax, SRI, runtime smoke tests, recommendation popup, shared DSP profile, dock waveform, engine QA bench, strength profile behavior, and preview translation controls.
