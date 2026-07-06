# FoxBear Stage6 인수인계 메모

## 현재 상태

- 기준 버전: `1.3.84` Stage6 패치 누적본
- 앱 형태: build step 없는 정적 웹앱
- 주요 진입점: `index.html`, `src/app.js`
- 전체 검증 명령: `npm run check`
- SRI 갱신 명령: `npm run sri:update`
- 릴리즈 ZIP 생성 명령: `npm run package:clean`

## Stage6 핵심 변경

- 비교 팝업 렌더링이 `src/ui/waveform-compare-view.js`로 분리되었습니다.
- `src/app.js`는 `renderWaveformCompareDialog()` wrapper에서 dependency object를 넘기는 방식으로 모듈을 호출합니다.
- 비교 팝업 CSS는 `assets/css/waveform-compare.css`에 dedicated layer로 추가되었습니다.
- `sw.js`의 `CACHE_NAME`은 stage6로 bump 되었고, 새 JS/CSS가 `CORE_ASSETS`에 포함되어 있습니다.
- `qa/run_all_checks.js`는 이제 `package.json`의 `qaChecks`를 읽습니다. 새 QA를 추가할 때는 `package.json`만 갱신하면 됩니다.

## 주의할 점

- 아직 `src/app.js`는 13,000줄 이상으로 큽니다. 다음 모듈 분리는 기능 단위로 작게 진행하는 편이 안전합니다.
- `studio.css`에는 legacy/hotfix 스타일이 많이 남아 있습니다. selector 순서 의존성이 있으므로 큰 단위 일괄 이동보다는 전용 CSS layer를 만든 뒤 중복을 줄이는 방식이 안전합니다.
- 새 JS/CSS를 추가하거나 수정하면 `npm run sri:update` 후 `npm run check`를 실행해야 합니다.
- Service Worker cache name을 변경하지 않으면 사용자가 오래된 asset을 볼 수 있습니다.

## 다음 패치 후보

1. `src/download/` 분리
   - `getDownloadEnvironmentInfo`, `getDownloadFormatOptions`, `prepareTrackDownloadBlob` 주변 로직을 view와 service로 나눕니다.

2. `assets/css/components/` 분리
   - 버튼, 폼, 카드, 패널 순서로 작은 CSS 파일을 만들어 `studio.css`의 legacy 영역을 줄입니다.

3. `src/ui/detail-view.js` 분리
   - `renderDetail`, mastering panel, recommendation panel을 화면 view 모듈로 분리합니다.

4. 비교 팝업 CSS 중복 정리
   - 이번 Stage6에서는 dedicated override layer를 추가했습니다. 다음 단계에서는 `studio.css`/`dock.css`에 남아 있는 오래된 `.waveform-compare-*` rule을 안전하게 제거할 수 있습니다.

## 빠른 검증 체크리스트

- `npm run check` 통과
- 비교 팝업 열기: 원곡/마스터링/하이라이트 줄이 화면 폭 안에 들어오는지 확인
- 비교 팝업 재생/정지 버튼이 Dock 소스와 동기화되는지 확인
- 모바일 Dock 상단 장르/소스 텍스트가 우측 화면 밖으로 밀리지 않는지 확인
- 새 파일 추가 후 `index.html` SRI와 `sw.js` precache가 맞는지 확인
