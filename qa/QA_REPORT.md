# FoxBear Pro v1.3.48 QA Report

## Pro v1.3.48 Dock Waveform / Transport Hotfix

- 마스터링 파형 피크 미니뷰 미표시 문제 수정
- 파형 비교 팝업 열기/닫기 시 Dock 재생 유지
- Toast/진행 HUD/다운로드 도움창 overlay 위치 상향
- waveform marker string class smoke test 추가


## Pro v1.3.47 Dock A/B Loudness Match + Difference Listen

- Dock A/B 레벨매칭 토글과 차이듣기 토글 추가 확인.
- 차이듣기 플레이어가 원본/비교 음원을 동기화하고 WebAudio 차분 그래프를 구성하도록 정적 검사.
- 기존 다운로드/공유, Dock waveform, preview translation, engine QA bench smoke test 유지.

- PASS: `npm run check`
- PASS: SRI validation
- PASS: runtime smoke
- PASS: recommendation popup smoke
- PASS: recommendation explainability smoke
- PASS: shared DSP profile smoke
- PASS: dock waveform smoke
- PASS: engine QA bench
- PASS: strength profile smoke
- PASS: preview translation smoke
- PASS: module split stage 2 smoke

See `qa/QA_REPORT_RECOMMENDATION_EXPLAINABILITY_1.3.45.md`.

## v1.3.46 Dock Continuity + Download/Share
- Dock player keeps timeline position across original/result/master preview and preview environment switches.
- Playing Dock audio resumes automatically after source/environment rebuilds.
- Waveform compare popup no longer pauses Dock playback.
- Download UX now requires selecting a format first, then pressing Download or Share.
- Added explicit file share path and strengthened Kakao/in-app browser fallback guidance.
- Added `qa/dock_continuity_download_smoke.js`.
