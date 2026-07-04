# FoxBear Mastering Studio Pro v1.3.52

## Pro v1.3.52 Mobile Dock Layout Final QA

- Dock의 실제 높이를 JS에서 지속 측정해 `--bottom-preview-height`, `--bottom-preview-floating-bottom`, `--bottom-preview-hud-bottom`, `--bottom-preview-panel-bottom` CSS 변수로 동기화합니다.
- 세로 모바일 화면에서 Dock 버튼/재생환경/파형 미니뷰가 줄바꿈으로 과도하게 커지지 않도록 최종 레이아웃 override를 추가했습니다.
- Toast, 다운로드 도움창, 다운로드 옵션 패널, 마스터링 진행 HUD가 Dock 위로 따라붙도록 하단 anchoring을 통일했습니다.
- ResizeObserver, visualViewport resize/scroll, orientationchange, pageshow 이벤트로 브라우저 UI 변화와 키보드/주소창 변화에도 위치를 재계산합니다.
- v1.3.52 버전, 캐시버스터, SRI, mobile dock layout smoke test를 갱신했습니다.

이 빌드는 v1.3.51 Snapshot / Undo History 기능을 유지하면서 모바일 Dock 겹침 안정성을 보강한 릴리즈입니다.
