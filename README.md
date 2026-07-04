# FoxBear Mastering Studio Pro v1.3.49

## Pro v1.3.49 Dock Cleanup + Floating HUD Anchor

- Dock의 레벨매칭/차이듣기 버튼 라인을 제거해 transport 영역을 더 단순하게 정리했습니다.
- Dock 플레이어는 원본/결과/마스터 프리뷰 전환과 재생환경 전환 시 기존 타임라인 유지 구조를 유지합니다.
- Toast, 다운로드 도움창, 마스터링 진행 HUD가 실제 Dock 높이를 기준으로 자동 계산된 위치에 뜨도록 `--bottom-preview-height`, `--bottom-preview-floating-bottom`, `--bottom-preview-hud-bottom` CSS 변수를 동기화합니다.
- v1.3.49 버전, 캐시버스터, SRI, Dock cleanup smoke test를 갱신했습니다.

## Pro v1.3.48 Dock Waveform / Transport Hotfix

- 마스터링 완료 후 Dock 파형 피크 미니뷰가 `original/mastered` 필드명을 읽지 못해 마스터링 파형이 비는 문제를 수정했습니다.
- `createWaveformOverview()`가 `original/mastered`와 기존 `before/after/peakMarkers` alias를 함께 저장하도록 보강했습니다.
- 파형 비교 팝업을 열 때 Dock 플레이어를 멈추던 `pauseAllPreviewAudio()` 호출을 제거하고, 현재 transport 위치만 저장하도록 변경했습니다.
- 파형 비교 팝업 닫기 시에도 waveform-only 모드는 Dock 재생을 건드리지 않도록 기존 조건을 유지했습니다.
- Toast, 다운로드 도움창, 마스터링 진행 HUD가 높아진 Dock과 겹치지 않도록 overlay bottom offset을 더 위로 조정했습니다.
- v1.3.48 버전, 캐시버스터, SRI, QA smoke test를 갱신했습니다.


## Pro v1.3.47 Dock A/B Loudness Match + Difference Listen

- Dock에 레벨매칭 ON/OFF와 차이듣기 버튼을 추가했습니다.
- 원본/마스터링/15초 결과 프리뷰를 전환해도 기존 타임라인과 재생 상태를 최대한 유지합니다.
- 차이듣기는 마스터 신호에서 원본을 반전 차감해 마스터링으로 실제 달라진 성분을 확인하는 비교 모드입니다.
- 차이듣기에서도 A/B 레벨 매칭 설정을 반영해 더 공정한 비교가 가능합니다.
- 버전, 캐시버스터, SRI, QA smoke test를 v1.3.47로 갱신했습니다.

## Pro v1.3.46 Dock Continuity + Download/Share

This static build improves the bottom Dock player transport behavior and separates export format selection from the actual download/share action.

### What changed
- Dock player now preserves the current timeline position when switching between original, result preview, and mastered preview.
- If Dock audio is already playing, switching preview source or phone/laptop/mono translation mode resumes playback automatically at the same musical position.
- Waveform comparison popup no longer stops Dock playback when opened/closed.
- Dock labels now use `프리뷰` wording again: `원본 프리뷰`, `결과 프리뷰`, `마스터링 프리뷰`.
- Toast/download assist/processing HUD positioning was adjusted upward to stay attached just above the taller Dock.
- Download dialog now works as: choose extension/quality first, then press `다운로드` or `공유`.
- Added explicit native file sharing button for supported browsers using Web Share file payloads.
- Kakao/in-app browser fallback guidance was strengthened: share/save first, file-open fallback, external browser/open-page guidance.
- Updated version, cache busting, SRI, and QA documentation for v1.3.46.

### Verify
```bash
npm run check
```

The check validates syntax, SRI, runtime smoke tests, recommendation popup, shared DSP profile, dock waveform, engine QA bench, strength profile behavior, preview translation controls, module split stage 2, recommendation explainability, and dock continuity/download UI guards.
