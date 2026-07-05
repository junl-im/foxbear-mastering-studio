# FoxBear AI Mastering Studio Pro v1.3.56

Static local-first AI mastering studio build.

## v1.3.56 Dock Waveform Sync / Touch Seek
- Smart Wake Lock for mastering/playback protection.
- Haptic feedback for mobile taps, switches, completion and error states.
- MediaSession metadata and lock-screen transport controls for Dock playback.
- PWA manifest with standalone display, icons, shortcuts and share target.
- Service worker share target receiver for audio files sent from mobile share sheets.
- Persistent Storage request path for project/cache preservation.
- Page Visibility/pageshow recovery for Dock transport and layout state.
- One-thumb quick panel for original/master/phone/mono/peak/download/share/install actions without increasing Dock height.
- Waveform popup peak jump chips.
- Mobile safe mode hints for in-app/low-resource browsers.
- App Badge update for completed files waiting to be saved.

Run checks:

```bash
npm run check
```


## v1.3.56 File/Folder Open Hotfix
- 파일열기/폴더열기 버튼이 모바일/PWA/인앱 브라우저에서 실패하는 문제를 줄였습니다.
- 지원 브라우저에서는 시스템 파일/폴더 선택기를 우선 사용합니다.
- 폴더 선택 미지원 환경에서는 여러 파일 선택으로 대체합니다.
- 서비스워커가 이전 캐시를 계속 보여주는 문제를 줄이도록 navigation을 network-first로 변경했습니다.
