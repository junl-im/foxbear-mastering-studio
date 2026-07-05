# v1.3.70 Dock Peak Popup / Toast Stack

## Fixed
- Dock 피크 미니뷰 클릭이 파형 seek로 먹히면서 비교 팝업이 열리지 않던 문제를 수정했습니다.
- Dock 피크 그래프와 플레이어 seek 게이지의 수평 시작/끝 라인을 맞췄습니다.
- 토스트가 Dock과 겹치거나 연속 알림이 덮어쓰이던 문제를 스택형 알림으로 개편했습니다.

## Changed
- Dock 줄 순서를 피크, 플레이어, 마스터링/프리뷰 액션, 재생환경 순으로 정리했습니다.
- Dock 피크 미니뷰는 팝업 전용이고, 구간 seek는 팝업 내부 파형에서만 동작합니다.

## QA
- Added `qa/dock_peak_toast_stack_smoke.js`.
- `npm run check` PASS 기준으로 SRI, 런타임 스모크, Dock layout smoke를 검증합니다.
