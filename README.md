# FoxBear AI Mastering Studio Pro v1.3.72

## v1.3.72 Dock Remote Controller

Dock의 `마스터링` / `추천구간 미리듣기` 버튼을 메인 화면의 현재 선택 곡 액션과 같은 기준으로 연결한 핫픽스입니다.

- `마스터링`: 본화면에서 활성화된 곡을 그대로 마스터링합니다.
- `추천구간 미리듣기`: 본화면에서 활성화된 곡의 추천 구간 프리뷰를 생성/재생합니다.
- 체크박스식 선택(`selectedIds`)이 비어 있어도 현재 활성 곡(`selectedId`)이 있으면 작업 대상으로 처리합니다.
- 분석 중인 곡은 분석 완료를 기다린 뒤 이어서 작업합니다.
- 앱/SW 캐시 키와 SRI 해시를 `v1.3.72-dock-remote-controller`로 갱신했습니다.

## 검증

```bash
npm run check
```
