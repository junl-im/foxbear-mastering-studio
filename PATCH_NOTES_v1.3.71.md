# FoxBear AI Mastering Studio Pro v1.3.71

## Dock Main Action Bridge

- Dock의 `마스터링` 버튼을 별도 우회 로직이 아니라 메인 화면의 선택 곡 마스터링 액션과 같은 기준으로 실행하도록 단순화했습니다.
- 메인 `마스터링`도 체크박스식 `selectedIds`가 비어 있으면 현재 활성 곡(`selectedId`)을 자동 대상화하도록 수정했습니다.
- 파일을 불러온 직후 체크 선택이 없어도 현재 화면에 보이는 곡을 바로 마스터링할 수 있게 했습니다.
- Dock `추천구간 미리듣기`는 메인 화면에서 선택된 곡을 우선 기준으로 잡고, 같은 `renderMasterPreviewForTrack()` 경로를 타도록 정리했습니다.
- 분석 중인 곡도 버튼이 조용히 막히지 않고 분석 완료를 기다린 뒤 이어서 마스터링/추천구간 미리듣기를 진행하도록 했습니다.
- `qa/dock_main_action_bridge_smoke.js`를 추가해 Dock 버튼이 메인 액션 브리지로 연결되어 있는지 검증합니다.
- 앱/SW 캐시 키와 SRI 해시를 `v1.3.71-dock-main-action-bridge`로 갱신했습니다.
