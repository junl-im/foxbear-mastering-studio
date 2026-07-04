# QA Report — v1.3.48 Dock Waveform / Transport Hotfix

## 변경 범위
- Dock 파형 피크 미니뷰의 마스터링 파형 표시 호환성 수정
- 파형 비교 팝업 open/close 시 Dock 재생 유지
- Toast/다운로드 도움창/마스터링 진행 HUD 위치 상향 조정
- waveform marker CSS class 생성 로직 수정

## 원인
- v1.3.44에서 `createWaveformOverview()`가 `original/mastered` 필드명을 사용하도록 분리됐지만, Dock/detail UI 일부는 기존 `before/after/peakMarkers`를 계속 읽고 있었습니다.
- `openWaveformCompareDialog()`가 `pauseAllPreviewAudio()`를 호출해 파형 팝업을 여는 순간 Dock 플레이어까지 멈췄습니다.
- v1.3.39 이후 Dock이 높아졌지만 일부 overlay offset fallback이 낮아 Toast/HUD가 Dock과 겹칠 수 있었습니다.

## 검증
- `node --check src/app.js` 통과
- `node --check src/utils/core-utils.js` 통과
- `qa/dock_waveform_transport_hotfix_smoke.js` 통과
- `npm run check` 전체 통과 대상에 포함
