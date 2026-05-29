# FoxBear AI Mastering Studio Pro v4.1

GitHub Pages-ready modular browser mastering studio.

## v4.1 upgrades

- IndexedDB analysis cache for faster repeat loads
- Optional external WASM pitch engine adapter with WSOLA Worker fallback
- A/B level-matched preview mode
- Mastering difference meter and LUFS before/after graph
- Clipping-risk indicator
- Genre preset lock for manual genre corrections
- 24-bit WAV, 32-bit float WAV, and MP3 compatibility output
- 2-pass loudness finalizer and oversampled peak guard

## Run locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Optional external pitch engine

Put a compatible bridge at `vendor/wasm/pitch-engine.js`. If absent, the app uses its built-in WSOLA Worker.


## Pro v4.1
- Queue preview moved above loaded tracks.
- AI humanize mastering chain added: mid warmth, de-esser, high-frequency taming, 16 kHz musical low-pass.
- Track card mastering button restored.
- Auto remaster refresh after completed-track parameter edits.
