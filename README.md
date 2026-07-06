## Latest Patch

### v1.3.81 Modal / Dock Layout Integrity Audit

- Dock 파일명 / 장르 / 비교보기 행을 다시 한 줄 구조로 정리했습니다.
- Dock 플레이어 우측 정보 영역을 `원곡/마스터링` 위, `진행시간 / 러닝타임` 아래 2단으로 고정했습니다.
- 버튼형 적용 팝업 닫기와 마스터링 설정 미리듣기 팝업 열기/닫기 경로를 hard open/close 방식으로 보강했습니다.
- 엔진 자체는 변경하지 않았고, 기존 엔진 QA 체인을 유지합니다.
- 상세 기록은 `PROJECT_NOTES.md`에 누적합니다.

# FoxBear AI Mastering Studio Pro v1.3.81

## v1.3.81 Modal / Dock Layout Integrity Audit

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

브라우저에서 `v1.3.81`가 표시되는지 확인하세요. 이전 Service Worker나 정적 캐시가 남으면 Dock UI가 예전 상태로 보일 수 있습니다.
