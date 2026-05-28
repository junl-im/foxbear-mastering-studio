# FoxBear AI Mastering Studio Pro v3.0

GitHub Pages compatible modular browser mastering studio by 곰같은여우 with AI.

## Pro v3.0 upgrades

- Modular HTML/CSS/JS project for GitHub instead of single-file HTML
- Analysis Worker for large-file feature extraction
- Pitch/BPM WSOLA Worker for off-main-thread pitch and time preparation
- 2-Pass Master Finalizer Worker
  - LUFS-like target loudness
  - oversampled true-peak ceiling
  - final soft ceiling protection
- 24-bit PCM WAV export
- 32-bit Float WAV export
- MP3 320/192 kbps compatibility path with WAV fallback when native browser MP3 encoding is unavailable
- GitHub Pages workflow included

## Run locally

Workers need an HTTP server. Do not open `index.html` with `file://`.

```bash
python3 -m http.server 8080
```

Then open:

```txt
http://localhost:8080
```

## GitHub Pages

Push this project to GitHub. The included `.github/workflows/pages.yml` can publish the project with GitHub Pages Actions.

## Notes

Browser-based mastering can be powerful, but pitch/BPM processing is never mathematically lossless when speed or pitch changes are applied. Pro v3.0 uses a Worker-based SOLA-style engine and 2-pass finalizer to reduce UI blocking and improve final loudness/peak consistency.
