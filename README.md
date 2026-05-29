# FoxBear AI Mastering Studio Pro v4.5

GitHub Pages-ready modular browser mastering studio.

## v4.5 upgrades

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


## Pro v4.5
- Queue preview moved above loaded tracks.
- AI humanize mastering chain added: mid warmth, de-esser, high-frequency taming, 16 kHz musical low-pass.
- Track card mastering button restored.
- Auto remaster refresh after completed-track parameter edits.

## Pro v4.5 additional refinements
- AI 티 완화 엔진을 버튼형 기능으로 분리해 필요 시 ON/OFF할 수 있습니다.
- 스마트 과처리 방지를 추가해 고강도 마스터링에서도 밝기, 저역, 피크 과잉을 렌더 직전에 보정합니다.
- 금속성·초고역이 강한 소스는 Clarity/Intensity가 자동으로 살짝 완화되어 멜로디 손상을 줄입니다.


## Pro v4.5 refinements
- 피치/속도 기본값 배지 정리 및 초기화 버튼 제거
- 커스텀 프리뷰 플레이어 버튼을 아이콘형 컨트롤로 정리
- 모바일 플레이 게이지 및 상단 웨이브 반응형 개선
- 보컬 보호 모드 추가: 보컬 중심 곡에서 치찰음과 Exciter를 섬세하게 제어
- 상단 설명 문단 자동 줄바꿈 및 모바일 가독성 개선


## Pro v4.5 advanced engine upgrades

- Phase-coherent WSOLA pitch/BPM worker: stereo channels share one SOLA alignment plan to reduce image smear.
- Low-End Anchor: keeps low frequency energy more centered and stable for mobile playback.
- Melody Preserve Engine: protects vocal/lead/acoustic melody bands from over-exciting and over-compression.
- Transient Refine: softens brittle hi-hat, clap, and click peaks while keeping punch.
- DC-safe 2-pass finalizer with higher max-quality oversampling.
