# FoxBear Mastering Studio Pro v1.3.72

## Dock Remote Controller Fix

- Dock를 별도 기능 복사본이 아니라 본문 활성 곡을 조작하는 리모컨으로 재정의했습니다.
- Dock `마스터링`은 현재 본문 활성 곡을 기준으로 `masterTrack()`을 직접 호출합니다.
- Dock `추천구간 미리듣기`는 현재 본문 활성 곡을 기준으로 `renderMasterPreviewForTrack()`을 직접 호출합니다.
- Dock 버튼은 더 이상 disabled로 죽지 않고, 누르면 실행하거나 차단 사유를 토스트로 보여줍니다.
- 분석 중인 곡은 분석 완료를 기다린 뒤 마스터링/추천구간 미리듣기를 이어서 실행합니다.
- 전역 캡처 기반 Dock 리모컨 fallback을 추가해 일반 이벤트 바인딩이 꼬여도 Dock 액션이 동작하도록 했습니다.
