# FoxBear AI Mastering Studio Changelog

## Stage6 · Waveform Compare Module / Handoff Docs

- `src/ui/waveform-compare-view.js`를 추가해 비교 팝업 DOM 구성, 파형 정렬, 하이라이트 slicing, 팝업 재생/정지 컨트롤을 `src/app.js`에서 분리했습니다.
- `src/app.js`는 비교 팝업 열기와 Dock 상태 동기화만 담당하고, 실제 view 생성은 `window.FoxBearWaveformCompareView`에 위임합니다.
- `assets/css/waveform-compare.css`를 추가해 비교 팝업 전용 CSS layer를 분리했습니다.
- `index.html`에 새 JS/CSS를 연결하고 SRI를 갱신할 수 있도록 구성했습니다.
- `sw.js` cache name을 stage6로 갱신하고 새 JS/CSS 파일을 precache 목록에 추가했습니다.
- `qa/run_all_checks.js`가 `package.json`의 `qaChecks`를 직접 읽도록 정리해 QA 목록 중복 관리 문제를 줄였습니다.
- `qa/waveform_compare_stage6_module_smoke.js`를 추가해 모듈 로딩 순서, app.js delegate, service worker precache를 고정했습니다.
- `qa/docs_handoff_smoke.js`를 추가해 변경 기록과 인수인계 MD 누락을 QA에서 잡도록 했습니다.

## Stage5 · Waveform Compare Alignment / Mobile Dock Repair

- 비교 팝업에서 원곡/마스터링 파형 길이 기준을 맞췄습니다.
- 15초 하이라이트 비교 시 원곡도 같은 시작점/길이로 잘라 표시합니다.
- 비교 팝업 상단에 재생/정지 컨트롤을 추가했습니다.
- Dock/비교 팝업 playhead 전체 라인을 1px로 줄이고 작은 상단 cap만 유지했습니다.
- 모바일 Dock 상단 장르/소스 표기가 우측 화면 밖으로 밀리지 않도록 좌측 정렬과 overflow를 보정했습니다.

## Stage4 · App/CSS Modularization

- 다운로드 옵션 팝업 view를 `src/ui/download-dialog-view.js`로 분리했습니다.
- `theme.css`, `layout.css`를 추가하고 `studio.css`에서 일부 기반 스타일을 분리했습니다.
- 모듈 로딩 순서와 service worker precache를 보정했습니다.

## Stage3 · Runtime Config / Guards / Mobile View Split

- 런타임 상수는 `src/config/app-runtime-config.js`로 분리했습니다.
- 도메인/UI guard는 `src/security/site-guards.js`로 분리했습니다.
- 모바일 네이티브 UI 생성부는 `src/ui/mobile-native-view.js`로 분리했습니다.

## Stage2 · CSP / HTML Injection Guard

- 남아 있던 `innerHTML` 사용을 DOM API로 교체했습니다.
- HTML injection 방지 QA를 추가했습니다.
- SRI 자동 갱신 도구 `tools/update-sri.py`를 추가했습니다.

## Stage1 · Master Preview Fix / Packaging

- `getMasterPreviewStartSec` 중복 선언 문제를 수정했습니다.
- 중복 함수 방지 QA를 추가했습니다.
- clean release ZIP 생성 스크립트를 추가했습니다.
