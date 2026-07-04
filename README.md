# FoxBear AI Mastering Studio

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
