# FoxBear Mastering Studio Pro v1.3.67

## Dock Single-Line Actions Layout Fix

- 하단 Dock의 4개 주요 버튼(`마스터링`, `추천구간 미리듣기`, `원곡 프리뷰`, `마스터링 프리뷰`)이 한 줄에 유지되도록 수정했습니다.
- 좌측 그룹은 왼쪽, 프리뷰 소스 그룹은 오른쪽 정렬을 유지하되 버튼 폭은 문구 길이에 맞게 조정했습니다.
- 좁은 모바일 화면에서도 강제 줄바꿈 대신 한 줄 유지 및 필요한 경우 가로 스크롤 fallback을 사용합니다.
- `qa/dock_action_single_line_smoke.js`를 추가해 버튼 순서, 한 줄 유지 CSS, 텍스트 맞춤 폭 규칙을 검증합니다.
