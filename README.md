# FoxBear AI Mastering Studio Pro v4.2

GitHub Pages-ready modular browser mastering studio.

## v4.2 upgrades

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


## Pro v4.2
- Queue preview moved above loaded tracks.
- AI humanize mastering chain added: mid warmth, de-esser, high-frequency taming, 16 kHz musical low-pass.
- Track card mastering button restored.
- Auto remaster refresh after completed-track parameter edits.

## Pro v4.2 additional refinements
- AI 티 완화 엔진을 버튼형 기능으로 분리해 필요 시 ON/OFF할 수 있습니다.
- 스마트 과처리 방지를 추가해 고강도 마스터링에서도 밝기, 저역, 피크 과잉을 렌더 직전에 보정합니다.
- 금속성·초고역이 강한 소스는 Clarity/Intensity가 자동으로 살짝 완화되어 멜로디 손상을 줄입니다.
