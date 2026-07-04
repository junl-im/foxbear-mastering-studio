# QA Report — v1.3.49 Dock Cleanup + Floating HUD Anchor

## 변경 범위
- Dock의 레벨매칭/차이듣기 버튼 라인 제거
- Dock 재생은 원본/결과/마스터 프리뷰 및 폰/노트북/모노 전환 시 기존 타임라인 유지 구조 유지
- Dock 높이를 실제 DOM 높이로 측정해 overlay 위치 CSS 변수 동기화
- Toast, 다운로드 도움창, 마스터링 진행 HUD가 Dock 위로 따라다니도록 보정
- `qa/dock_cleanup_overlay_smoke.js` 추가

## 원인/개선
- v1.3.47에서 Dock에 A/B 비교 도구가 추가되며 Dock 높이가 늘었고, v1.3.48에서 고정 px offset으로 올렸지만 기기/반응형 높이에 따라 여전히 겹칠 수 있었습니다.
- v1.3.49에서는 고정 offset 대신 `syncBottomPreviewFloatingOffset()`가 실제 Dock 높이를 측정해 `--bottom-preview-height`, `--bottom-preview-floating-bottom`, `--bottom-preview-hud-bottom`을 갱신합니다.
- Dock에서 비교 도구 라인을 제거하고, 숨겨진 `abLevelMatch`/`abDifferenceListen` 상태가 Dock 재생에 개입하지 않도록 Dock playback key/gain/difference path를 clean transport 기준으로 고정했습니다.

## 검증
- `node --check src/app.js` 통과
- `python3 qa/verify_sri.py` 통과
- `qa/dock_cleanup_overlay_smoke.js` 통과
- `npm run check` 전체 통과
