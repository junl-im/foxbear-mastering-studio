# UI·UX 개선 후보와 첫 패치

검토일: 2026-10-10 (Asia/Seoul).

## 적용 범위

- 실제 작업 상태를 반영하는 불러오기 → 분석·설정 → 마스터링 → 비교·저장 안내.
- 빈 대기열의 다음 행동 안내와 출력 형식·LUFS·피크 설정 도움말.
- 모바일 2열 단계 표시, 현재 단계의 aria-current, 변경 시에만 갱신되는 live region, 키보드로 여는 기본 details 요소.
- app.js에는 렌더 연결만 추가하고 안내 로직은 기존 UI 모듈에 배치.
- PR에서도 기존 정적·브라우저 게이트를 실행하고 실제 Pages 패키징과 배포는 main push/수동 실행으로 제한.

## 후속 후보

1. 원본·마스터·레퍼런스의 음량 일치 비교를 한곳에 정리하고 구간 반복 지원.
2. 분석 수치와 추천 설정 변경의 근거를 연결해 표시.
3. 실제 저장된 MP3의 재분석과 피크 초과 알림.
4. 리미터 투명도와 레퍼런스 EQ 정밀화는 수치·청취 비교 후 구현.

참고: [Ozone 비교 도구](https://downloads.izotope.com/docs/ozone8/general-functions/index.html), [Pro-L 2 True Peak](https://www.fabfilter.com/help/pro-l/using/truepeaklimiting), [Matchering](https://github.com/sergree/matchering), [libebur128](https://github.com/jiixyj/libebur128).
