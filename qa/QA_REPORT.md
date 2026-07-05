
## v1.3.57 Dock Waveform Sync + Broad Audio Import
- Dock 파형 LIVE 위치를 실제 막대 중심 좌표에 맞춰 정렬.
- Dock/팝업 파형 터치 시 같은 좌표 변환으로 해당 구간 재생.
- WAV/MP3/M4A/AAC/FLAC/OGG/OPUS/WEBM/AIFF/CAF/MP4/MOV/3GP/AMR/WMA 계열 입력 시도 범위 확대.
- 미지원 코덱은 브라우저별 decode 실패 안내로 안전 처리.
- `dock_waveform_import_1357_smoke.js` 추가.

# FoxBear Pro v1.3.53 QA Report

## Pro v1.3.53 Mega Stabilization Pack

PASS — Large combined stabilization build.

### Included
- Reference Match Strength control.
- Adaptive LUFS per-track target assist.
- DSP Amount Inspector.
- Golden Audio QA Pack.
- Dock/export CSS split.
- A/B legacy Dock isolation documentation.

### Checks
- `npm run check`
- SRI verification
- Runtime smoke
- Recommendation popup smoke
- Shared DSP profile smoke
- Dock waveform and layout smoke
- Engine QA bench
- Export reliability smoke
- Snapshot undo smoke
- Golden Audio QA Pack
- Mega stabilization smoke

See `qa/QA_REPORT_MEGA_STABILIZATION_1.3.53.md`.

## v1.3.54 Dock Player Polish / Progress Reality
- Dock 플레이어 3열 transport 구조로 재생 버튼/게이지/시간 overflow를 안정화했습니다.
- 파형 피크 미니뷰와 팝업에 LIVE 재생 위치 표시를 추가했습니다.
- 파형 팝업/Toast/HUD가 Dock과 겹치거나 과하게 멀어지지 않도록 offset을 재조정했습니다.
- 마스터링 진행률을 5% 단위에 가깝게 세분화하고 HUD tick/scan 애니메이션을 추가했습니다.
- `qa/dock_player_polish_smoke.js`를 추가했습니다.

## v1.3.55 Mobile Native UX Pack
- Wake Lock, 햅틱, MediaSession, PWA manifest, Share Target, 서비스워커 공유 수신, 저장소 보호, App Badge를 progressive enhancement 방식으로 추가했습니다.
- Dock 높이는 키우지 않고 좌하단 퀵패널/상태 pill로 원본·마스터·폰·모노·피크점프·다운로드·공유·설치를 제공합니다.
- Page Visibility/pageshow 복구로 모바일 앱 전환 후 Dock 위치와 재생 상태를 재동기화합니다.
- 파형 팝업에 LIVE/최대 피크/후렴 추정/뒤쪽 피크 점프 칩을 추가했습니다.
- `manifest.webmanifest`, `sw.js`, `assets/css/mobile-native.css`, `qa/mobile_native_ux_smoke.js`를 추가했습니다.

## v1.3.56 File/Folder Open Hotfix
- 파일열기/폴더열기/레퍼런스 파일 버튼을 robust picker helper로 통합.
- System File Picker / Directory Picker 지원 시 우선 사용하고, 미지원 시 기본 input fallback.
- 모바일에서 display:none file input이 열리지 않는 문제를 줄이기 위해 off-screen hidden 방식 적용.
- 서비스워커 navigation cache를 network-first로 전환해 이전 캐시 잔존 문제 완화.
- `qa/file_folder_open_hotfix_smoke.js` 추가.

## v1.3.56 Dock Waveform Touch Seek
- Dock 파형/팝업 파형의 클릭 좌표를 같은 percent 계산으로 통일.
- 파형 터치/클릭 시 해당 구간부터 Dock 플레이어가 재생되도록 연결.
- 결과 프리뷰는 로컬 15초 구간과 원본 절대 시간을 분리해 seek 위치가 밀리지 않도록 처리.
- LIVE playhead CSS/JS 연결 검증 추가.
- `qa/dock_waveform_touch_seek_smoke.js` 추가.
