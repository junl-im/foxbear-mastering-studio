# FoxBear Mastering Studio Pro v1.3.63 Loudness Target UI Cleanup

## 변경 사항
- 라우드니스 타깃 선택 영역 아래에 별도로 노출되던 `곡별 Adaptive LUFS` 체크박스를 제거했습니다.
- 내부 곡별 타깃 보정 로직은 유지해 기존 마스터링 안전성은 바꾸지 않았습니다.
- 트랙 상세 정보에서도 `곡별 Adaptive LUFS`가 별도 행으로 튀어나오지 않도록 제거했습니다.
- `qa/loudness_target_ui_smoke.js`를 추가해 라우드니스 타깃 UI가 단일 select 형태로 유지되는지 검증합니다.
- 앱/SW 캐시 키와 SRI 해시를 `v1.3.63-loudness-ui`로 갱신했습니다.

## 검증
- `npm run check`
