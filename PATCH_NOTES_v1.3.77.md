# FoxBear AI Mastering Studio Pro v1.3.77

## Dock Waveform Visual Polish

- Dock 통합 파형을 실제 플레이어처럼 보이도록 개선했습니다.
- 재생이 지나간 막대는 밝게, 아직 지나가지 않은 막대는 어둡게 표시합니다.
- 파형 막대를 중앙 기준 미러 스타일로 정렬해 바그래프 느낌을 줄였습니다.
- 얇은 흰 재생선 대신 청록 글로우 캡슐 playhead를 적용했습니다.
- Dock 폭을 기준으로 파형 막대 수를 동적으로 계산해 모바일/데스크톱에서 밀도와 간격을 안정화했습니다.
- 큰 비교 팝업 파형도 같은 진행 대비/글로우 playhead 스타일을 공유합니다.
- `마스터링` 등 Dock 라벨이 폭 부족으로 세로 한 글자씩 줄바꿈되는 문제를 `nowrap`으로 방지했습니다.
- QA: `qa/dock_waveform_visual_polish_smoke.js`를 추가했습니다.
