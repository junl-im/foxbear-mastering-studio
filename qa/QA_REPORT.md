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
