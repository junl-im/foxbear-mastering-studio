# FoxBear AI Mastering Studio Pro v1.3.73

## v1.3.73 Dock Event Repair

- Dock을 본문 기능의 “리모컨”으로 다시 정리했습니다.
- 마스터링은 유지하면서, 죽어 있던 재생환경 버튼(원음/폰/노트북/모노), 원곡/마스터링 프리뷰 전환, 파형 팝업 닫기를 단일 이벤트 디스패처로 복구했습니다.
- 파형/피크 팝업은 원곡과 마스터링을 한 화면에서 비교하는 용도로 열리며, 닫기 버튼/배경 클릭/ESC가 모두 동작하도록 보강했습니다.
- Dock 위 레이어의 z-index와 pointer-events를 정리해 버튼 클릭이 파형/플레이어 레이어에 가로막히지 않게 했습니다.
- 앱/SW 캐시 키와 SRI 해시를 `v1.3.73-dock-event-repair`로 갱신했습니다.
## 검증

```bash
npm run check
```