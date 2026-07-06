# FoxBear AI Mastering Studio Pro v1.3.80

## v1.3.80 Icon Refresh / Button View Close Repair

- 업로드한 새 FoxBear 로고를 투명 배경 PNG 아이콘 세트로 재생성했습니다.
- favicon, Apple touch icon, PWA manifest 아이콘, shortcut 아이콘, 기존 `foxbear-music.png`를 새 로고 기반으로 교체했습니다.
- `버튼 보기` 버튼은 일반 화면 레이어로 되돌리고, 버튼형 적용 팝업만 열린 동안 Dock 위에 표시되도록 조정했습니다.
- 버튼형 적용 팝업 닫기를 `pointerdown/mousedown/click/touchend/ESC/배경 클릭` 경로에서 모두 처리하도록 보강했습니다.
- 개별 `PATCH_NOTES_v*.md` 파일은 만들지 않고 기록은 `PROJECT_NOTES.md`에 누적합니다.

## 기록 정책

- 개별 `PATCH_NOTES_v1.3.xx.md` 파일은 더 이상 만들지 않습니다.
- 버전별 변경 이력과 인수인계 내용은 `PROJECT_NOTES.md`에 누적합니다.
- README는 최신 배포 요약과 사용자가 바로 확인해야 할 내용만 유지합니다.

## 배포 후 확인

브라우저에서 `v1.3.80`가 표시되는지 확인하세요. 이전 Service Worker나 정적 캐시가 남으면 Dock UI가 예전 상태로 보일 수 있습니다.
