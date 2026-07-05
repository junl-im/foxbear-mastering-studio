# FoxBear AI Mastering Studio Pro v1.3.61


## v1.3.61 UI Coverage + GitHub Pages Deploy Hotfix
- 버튼형 적용 기능 팝업을 `마스터링 엔진`과 `비교 · 관리 도구` 그룹으로 분리해 엔진 밖 보조 기능이 섞여 보이지 않도록 정리했습니다.
- 동적 기능 카드에 `data-help`, `data-tooltip`, `aria-label`, `title`을 함께 부여해 마우스온/터치온 설명 누락 구간을 줄였습니다.
- `abDifferenceListen`를 비교/관리 도구 액션으로 연결해 카드가 보여도 아무 동작이 없는 상태를 제거했습니다.
- GitHub Pages artifact 생성 단계에 `manifest.webmanifest`, `sw.js`를 필수 포함하고, 누락/심볼릭 링크/하드 링크를 배포 전에 실패시키는 검증을 추가했습니다.
- Pages artifact 이름을 `github-pages`로 명시하고 deploy 단계에서도 `artifact_name`을 고정해 artifact 선택을 안정화했습니다.
- `qa/deploy_pages_artifact_smoke.js`를 추가해 Pages 워크플로 필수 파일/디렉터리/검증 루틴이 `npm run check`에서 계속 확인되도록 했습니다.
- `src/app.js` 변경 후 불일치하던 SRI 해시를 재생성했습니다.

## v1.3.60 Upload Picker + Tooltip Hotfix
- 파일열기/폴더열기 타일 클릭 경로를 하이브리드로 보강했습니다. Chrome/Edge/PWA는 `showOpenFilePicker`/`showDirectoryPicker`를 우선 사용하고, Safari/iOS/인앱은 `label for=input` 기본 동작을 유지합니다.
- 숨겨진 file input의 `z-index:-1`/`clip-path` 강제 숨김을 완화해 일부 환경에서 선택기가 조용히 막히는 문제를 줄였습니다.
- 모바일에서 불러오기 타일을 1열로 키워 파일열기/폴더열기가 사라진 것처럼 보이는 문제를 완화했습니다.
- 버튼형 적용 기능 팝업을 `마스터링 엔진`과 `비교 · 관리 도구`로 분리해 엔진 영역 밖 기능이 섞여 보이지 않도록 정리했습니다.
- 누락되던 마우스온/터치온 설명을 하단 Dock, 재생환경, 슬라이더, 스냅샷, 관리자 버튼까지 확장했습니다.
- 앱/SW 캐시 키와 SRI 해시를 `v1.3.60-upload-tooltip-hotfix`로 갱신했습니다.


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

## v1.3.60 Dock Waveform Timeline Model
- Dock 미니 파형과 팝업 파형의 LIVE 위치/터치 seek 계산을 하나의 timeline model로 통합했습니다.
- 플레이헤드는 막대 중심 스냅이 아니라 실제 그려진 파형 plot span 기준으로 연속 이동합니다.
- 파형 터치 위치와 실제 재생 시작 위치가 같은 좌표계를 쓰도록 개선했습니다.
- 팝업의 원본/마스터/15초 프리뷰 행은 각각 full/preview scope를 분리해 표시합니다.
- 접근성을 위해 파형 seek 영역을 slider role로 정리하고 `aria-valuenow`를 동기화합니다.
