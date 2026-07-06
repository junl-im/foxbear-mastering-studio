# FoxBear AI Mastering Studio Pro v1.4.0

## Latest: Dock / Modal State Machine Refactor

v1.4.0는 Dock/Modal 영역의 반복 회귀를 줄이기 위한 구조 패치입니다.

- `src/ui/modal-controller.js` 신설
  - 버튼형 적용 팝업, 마스터링 설정 미리듣기 팝업의 열기/닫기/ESC/배경 클릭을 단일 상태 머신으로 관리합니다.
- `src/ui/dock-controller.js` 신설
  - Dock 내부 클릭만 Dock root에서 처리하고, document 전체 캡처 fallback 난립을 줄였습니다.
- PC Dock 재생 버튼 정리
  - 아이콘 겹침을 줄이기 위해 큰 재생 버튼은 명확한 `▶ / Ⅱ` glyph와 `재생 / 일시정지 / 대기` 라벨을 사용합니다.
- PC Dock 정보줄 보강
  - 파일명은 좌측, 장르와 `비교보기`는 우측 한 줄에 유지합니다.
  - 긴 장르명은 Dock 폭 안에서 ellipsis 처리되며 비교보기 버튼은 밀리지 않게 고정합니다.
- 플레이어 우측 정보 보강
  - 위: `원곡 / 마스터링 / 하이라이트`
  - 아래: `진행시간 / 전체 러닝타임`
- QA 실행 구조 변경
  - `npm run check`는 이제 `qa/run_all_checks.js`를 실행합니다.
  - 중간 실패가 있어도 끝까지 실행하고 마지막에 PASS/FAIL 요약을 보여줍니다.
- 기록 정책
  - 개별 `PATCH_NOTES_v1.3.xx.md` 파일은 만들지 않습니다.
  - 변경 이력과 인수인계 내용은 `PROJECT_NOTES.md`에 누적합니다.

## 배포 후 확인

브라우저에서 `v1.4.0`가 표시되는지 확인하세요. 이전 Service Worker나 정적 캐시가 남으면 Dock UI가 예전 상태로 보일 수 있습니다.

## QA

```bash
npm run check
```

현재 v1.4.0 기준 전체 QA는 67/67 PASS입니다.
