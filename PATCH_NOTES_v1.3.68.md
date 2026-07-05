# FoxBear Mastering Studio Pro v1.3.68

## Dock Action Runtime Fix

### Fixed
- 하단 Dock의 `마스터링` 버튼이 `선택한 곡을 마스터링합니다` 토스트만 띄우고 실제 렌더 단계로 진입하지 못할 수 있던 경로를 수정했습니다.
- Dock의 `추천구간 미리듣기`가 내부 선택 트랙 상태와 Dock 표시 트랙이 어긋날 때 반응하지 않는 문제를 수정했습니다.
- Dock 액션 기준을 `selectedId` 단독 의존에서 `bottomPreviewTrackId → selectedId → 첫 트랙` 순서로 통일했습니다.
- stale `state.busy` 플래그가 남아 실제 작업이 없는데도 Dock 액션이 막히는 상태를 자동 복구합니다.
- `masterTrack()`이 조용히 return하던 조건에 Dock 진단/토스트를 붙이고, 실행 결과를 반환하도록 보강했습니다.

### Changed
- Dock `마스터링`, `추천구간 미리듣기`, `원곡 프리뷰`, `마스터링 프리뷰`는 모두 Dock에 표시 중인 곡을 기준으로 동작합니다.
- 파일열기 도움말 문구를 `WAV, MP3, M4A/AAC, FLAC, OGG/Opus, AIFF, CAF, MP4/MOV 등 다양한 코덱` 안내로 확장했습니다.

### QA
- `qa/dock_action_runtime_fix_smoke.js` 추가.
- `npm run check` 전체 통과.
