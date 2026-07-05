# FoxBear AI Mastering Studio Pro v1.3.58

## v1.3.58 Native File/Folder Picker Reliability
- 파일열기/폴더열기 타일을 `div role=button + JS click()` 방식에서 `label for=input` 네이티브 연결 방식으로 변경했습니다.
- 모바일 Safari/카카오 인앱/PWA에서 숨겨진 input에 대한 programmatic click이 막혀도, 실제 사용자 탭이 파일 선택기에 직접 연결됩니다.
- 키보드 Enter/Space 접근성은 기존 helper fallback으로 유지했습니다.
- 파일/폴더 input의 accept 목록을 동일하게 맞춰 다양한 오디오/컨테이너 확장자를 계속 지원합니다.
- Dock 파형 touch seek 패치는 유지했습니다.

## v1.3.58 Dock Waveform Sync + Broad Audio Import
- Dock 파형 LIVE 위치를 실제로 그려진 막대 중심 기준으로 정렬했습니다.
- Dock 파형과 팝업 파형의 좌표 계산을 같은 함수로 통일했습니다.
- Dock/팝업 파형을 터치하거나 클릭하면 해당 구간부터 Dock 플레이어가 바로 재생됩니다.
- 키보드 접근성은 유지하면서 모바일 pointer/touch seek를 추가했습니다.
- 불러오기 확장자를 WAV/MP3/M4A/AAC/FLAC/OGG/OPUS/WEBM/AIFF/CAF/MP4/MOV/3GP/AMR/WMA 계열까지 넓혔습니다.
- 브라우저가 실제 디코딩하지 못하는 코덱은 파일 등록 후 분석 단계에서 형식별 안내와 함께 안전하게 실패 처리합니다.


Static local-first AI mastering studio build.

## v1.3.58 Dock Waveform Sync / Touch Seek
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


## v1.3.58 File/Folder Open Hotfix
- 파일열기/폴더열기 버튼이 모바일/PWA/인앱 브라우저에서 실패하는 문제를 줄였습니다.
- 지원 브라우저에서는 시스템 파일/폴더 선택기를 우선 사용합니다.
- 폴더 선택 미지원 환경에서는 여러 파일 선택으로 대체합니다.
- 서비스워커가 이전 캐시를 계속 보여주는 문제를 줄이도록 navigation을 network-first로 변경했습니다.
