# FoxBear AI Mastering Studio

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
