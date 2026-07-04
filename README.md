# FoxBear AI Mastering Studio

## Pro v1.3.42 Dynamic De-esser / Harshness Suppressor

This update adds a practical dynamic de-esser and harshness suppressor so vocal sibilance, metallic edge, and phone-speaker glare are controlled only when they actually spike.

### Highlights

- Added a dynamic de-esser/harshness stage to the offline mastering chain after the exciter and before vocal comfort guards.
- Added the same sample-domain dynamic de-esser to the finalizer worker and browser fallback path.
- Tracks presence harshness, sibilance, and air-band fizz separately with attack/release envelope followers.
- Final reports now include de-esser risk, reduction, active band details, and target frequency.
- Engine QA Bench now asserts that the vocal-metallic synthetic case triggers the de-esser safely.

### QA

Run:

```bash
npm run check
```

The check validates syntax, SRI, runtime smoke tests, recommendation popup, shared DSP profile, dock waveform, engine QA bench, and strength profile behavior.
