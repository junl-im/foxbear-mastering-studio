# QA Report — v1.3.56 Dock Waveform Touch Seek

## 목적
Dock 파형 미니뷰와 파형 팝업의 좌표 계산을 통일하고, 파형을 터치/클릭하면 해당 구간부터 실제 Dock 플레이어가 재생되도록 보장한다.

## 검증 범위
- `seekDockToWaveformPercent()` 존재
- 포인터 x좌표 → 파형 percent 변환 helper 존재
- Dock 파형 bars에 seek handler 연결
- 팝업 파형 bars에 seek handler 연결
- 결과 프리뷰 구간은 `masterPreviewStartSec + localSec` 방식으로 원본 절대 위치와 매핑
- LIVE playhead CSS 변수/스타일 존재

## 결과
`node qa/dock_waveform_touch_seek_smoke.js` 통과.
