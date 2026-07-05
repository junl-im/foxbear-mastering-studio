# FoxBear Mastering Studio Pro v1.3.69

## Dock Action Target Fix

- 파일을 불러온 직후 `selectedId`만 잡히고 `selectedIds`가 비어 있어 일부 마스터링 경로가 “곡을 선택하세요”로 빠지던 문제를 수정했습니다.
- 불러온 트랙을 즉시 작업 대상(`selectedIds`)으로 등록하고 Dock 기준 트랙(`bottomPreviewTrackId`)도 동기화합니다.
- 분석 중인 곡에서 Dock `마스터링` 또는 `추천구간 미리듣기`를 누르면 버튼이 먹통처럼 보이지 않고, 분석 완료를 기다린 뒤 이어서 실행합니다.
- 분석 Promise를 트랙에 보관해 Dock 액션이 실제 분석 완료 시점을 기다릴 수 있게 했습니다.
- Dock 액션 타깃 QA(`qa/dock_action_target_fix_smoke.js`)를 추가했습니다.
- 앱/SW 캐시 키와 SRI 해시를 `v1.3.69-dock-action-target-fix`로 갱신했습니다.
