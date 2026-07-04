# FoxBear Mastering Studio Pro v1.3.51

## Pro v1.3.51 Preset Snapshot / Undo History

이번 빌드는 사용자가 마스터링 설정을 만지는 동안 안전하게 되돌릴 수 있도록 스냅샷/되돌리기 흐름을 강화한 안정화 패치입니다.

### 변경 사항
- 장르, 슬라이더, 피치/BPM, 악기, 마스터링 성향, 출력 목표 변경 전에 자동 되돌리기 기록을 남깁니다.
- 최근 기록으로 되돌리기와 다시 적용 기능을 추가했습니다.
- `AI 복원` 버튼으로 분석 결과 기반 추천값을 빠르게 복원할 수 있습니다.
- `원본 기준` 버튼으로 AI 프리셋 없이 원음 기준 커스텀 상태로 전환할 수 있습니다.
- 스냅샷 패널에 최근 기록 설명을 추가했습니다.
- v1.3.51 버전, 캐시버스터, SRI, snapshot undo smoke test를 갱신했습니다.

### 검증
- `npm run check` 통과
- SRI 검증 통과
- Engine QA Bench 통과
- Snapshot Undo smoke test 통과
