# FoxBear handoff notes

## Stage7.1 - CI QA overwrite packaging hotfix

### 왜 필요한가

Stage7 전체 ZIP에서는 `npm run check`가 80/80 PASS였지만, 덮어쓰기 ZIP에 `qa/module_split_stage4_smoke.js`가 포함되지 않아 기존 작업 폴더에 남아 있던 구버전 QA가 CI에서 실행될 수 있었다. 이 hotfix는 앱 기능 변경 없이 QA/패키징 구성만 보정한다.

### 적용 내용

- Stage7.1 overwrite ZIP에 모든 QA 스크립트(`qa/*.js`, `qa/*.py`)를 포함한다.
- `qa/module_split_stage4_smoke.js`가 최신 모듈/CSS 분리 구조 기준으로 포함되도록 보장한다.
- Stage8 진행 전 CI 실패 원인을 제거한다.

### 검증

```bash
npm run check
# Passed: 80/80
# Failed: 0/80
```

### 다음 패치 후보

- Stage8: `assets/css/dock-waveform.css` 분리
- Stage9: `src/download/` service/view 분리

# FoxBear Stage7 인수인계 메모

## 현재 상태

- 기준 버전: `1.3.84` Stage7 패치 누적본
- 앱 형태: build step 없는 정적 웹앱
- 주요 진입점: `index.html`, `src/app.js`
- 전체 검증 명령: `npm run check`
- SRI 갱신 명령: `npm run sri:update`
- 릴리즈 ZIP 생성 명령: `npm run package:clean`

## Stage7 핵심 변경

- 비교 팝업 CSS 책임을 `assets/css/waveform-compare.css`로 집중했습니다.
- `studio.css`, `dock.css`에서 `.waveform-compare-*` selector를 제거했습니다.
- 비교 팝업의 dock-safe offset, z-index, transport, seek cursor, playhead line/cap, hint text는 이제 `waveform-compare.css`가 담당합니다.
- Dock 자체 파형과 모바일 Dock text repair는 `dock.css`/`studio.css`에 남겨 비교 팝업 스타일과 분리했습니다.
- `qa/waveform_compare_stage7_css_cleanup_smoke.js`를 추가해 legacy CSS에 compare selector가 재유입되는 것을 방지합니다.
- `sw.js`의 `CACHE_NAME`은 stage7로 bump 되었습니다.

## 주의할 점

- `waveform-compare.css`는 `dock.css` 뒤에 로드되어야 합니다. 현재 `index.html`의 CSS 순서는 이 전제를 만족합니다.
- 비교 팝업 스타일을 수정할 때는 `studio.css`나 `dock.css`가 아니라 `assets/css/waveform-compare.css`를 우선 수정하세요.
- 새 JS/CSS를 추가하거나 수정하면 `npm run sri:update` 후 `npm run check`를 실행해야 합니다.
- Service Worker cache name을 변경하지 않으면 사용자가 오래된 asset을 볼 수 있습니다.

## 다음 패치 후보

1. `src/download/` 분리
   - `getDownloadEnvironmentInfo`, `getDownloadFormatOptions`, `prepareTrackDownloadBlob` 주변 로직을 service/view로 나눕니다.

2. `assets/css/components/` 분리
   - 버튼, 폼, 카드, 패널 순서로 작은 CSS 파일을 만들어 `studio.css`의 legacy 영역을 줄입니다.

3. `src/ui/detail-view.js` 분리
   - `renderDetail`, mastering panel, recommendation panel을 화면 view 모듈로 분리합니다.

4. Dock waveform CSS dedicated layer 분리
   - 이번 Stage7은 compare CSS를 정리했습니다. 다음에는 Dock waveform 전용 rule을 `assets/css/dock-waveform.css`로 분리할 수 있습니다.

## 빠른 검증 체크리스트

- `npm run check` 통과
- 비교 팝업 열기: 원곡/마스터링/하이라이트 줄이 화면 폭 안에 들어오는지 확인
- 비교 팝업 재생/정지 버튼이 Dock 소스와 동기화되는지 확인
- 모바일 Dock 상단 장르/소스 텍스트가 우측 화면 밖으로 밀리지 않는지 확인
- `studio.css`/`dock.css`에 `.waveform-compare-*` selector가 다시 생기지 않았는지 확인
