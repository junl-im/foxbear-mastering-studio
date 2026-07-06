# Changelog

## Stage11 - Large modular renovation

- Added `src/recommendation/recommendation-engine.js` as the dedicated recommendation engine module. Genre scoring, candidate reasons/cautions, explainability chips, and safe fallback recommendation logic now live outside `src/app.js`.
- Replaced the large recommendation engine bodies in `src/app.js` with stable adapter wrappers, preserving existing public function names for current UI code and QA.
- Added `assets/css/components/base-components.css` as the first large component CSS layer. Base upload, button, track-card, stats, toast, pitch/control, and early responsive component rules were moved out of `studio.css`.
- Kept `studio.css` as the legacy override/hotfix layer so late-stage override order remains stable.
- Added the new JS/CSS modules to `index.html`, `sw.js` precache, and SRI.
- Bumped `sw.js` cache name to stage11.
- Added `qa/stage11_large_modular_renovation_smoke.js`.
- QA result: `npm run check` -> 88/88 PASS.

## Stage10 - Download service split

- Added `src/download/download-service.js` as the dedicated owner for download environment detection, format options, Blob filename normalization, Web Share/File System Access helpers, and the download assist panel.
- Replaced the heavy download helper bodies in `src/app.js` with thin adapters that delegate to `window.FoxBearDownloadService`.
- Kept the public app-level wrapper names (`getDownloadEnvironmentInfo`, `prepareTrackDownloadBlob`, `downloadBlob`, etc.) so existing UI modules and QA remain compatible.
- Added the new service to `index.html` before `download-dialog-view.js` and `src/app.js`, with SRI updated.
- Added the new service to `sw.js` precache and bumped the service worker cache to stage10.
- Updated legacy stage smoke tests so stage10 cache names are accepted.
- Added `qa/stage10_download_service_split_smoke.js`.
- QA result: `npm run check` -> 86/86 PASS.

## Stage9.1 - Cumulative overwrite packaging hotfix

- Fixed the Stage9 overwrite package problem where Stage8 runtime fixes could be missed when users applied only the latest overwrite ZIP on top of an older tree.
- Added `tools/create-overwrite-zip.sh` to build cumulative overwrite packages instead of delta-only packages.
- The overwrite package now includes runtime source, assets, vendor files, QA, tools, workflows, docs, `index.html`, `sw.js`, `manifest.webmanifest`, and deployment config.
- Added `npm run package:overwrite` for repeatable overwrite ZIP creation.
- Bumped `sw.js` cache name to stage9.1 so clients refresh after the cumulative hotfix.
- Added `qa/stage9_1_cumulative_overwrite_manifest_smoke.js` to prevent this packaging regression.
- QA result: `npm run check` -> 84/84 PASS.

# Changelog

## Stage9 - Dock waveform CSS split

- Added `assets/css/dock-waveform.css` as the dedicated owner for Dock waveform/timeline/live playhead styles.
- Moved Dock waveform selectors out of `assets/css/dock.css`: `.bottom-preview-waveform`, `.bottom-waveform-bars`, `.dock-integrated-waveform-bars`, and hot/clip marker rules now live in the new file.
- Preserved CSS load order: `dock.css` -> `dock-waveform.css` -> `waveform-compare.css`, so Dock layout loads first, Dock waveform overrides second, and compare-popup overrides last.
- Added `dock-waveform.css` to `index.html` with SRI and to `sw.js` precache.
- Bumped `sw.js` cache name to stage9.
- Updated waveform QA scripts to read the new dedicated CSS layer.
- Added `qa/stage9_dock_waveform_css_split_smoke.js`.
- QA result: `npm run check` -> 83/83 PASS.

## Stage8 - Async playback/import guard + compact mobile Dock overlays

- Fixed noisy global `앱 비동기 오류` reporting for benign mobile browser playback promise interruptions. Autoplay/paused/new-load rejections now show a playback-specific Dock guidance message instead of a scary app error.
- Hardened `runInitStep()` so async initialization steps are caught the same way as synchronous init steps. This prevents background init failures from bypassing the normal status/toast path.
- Hardened the audio analysis rejection handler so a render/toast failure while reporting an import error cannot create a second unhandled rejection.
- Reduced mobile Dock overlay gaps: toast stack, processing HUD, download hints, wake-lock/status pill, and mobile quick panel now sit much closer to the Dock.
- Bumped `sw.js` cache name to stage8.
- Added `qa/stage8_async_mobile_dock_smoke.js`.
- QA result: `npm run check` -> 82/82 PASS.


## Stage7.2 - GitHub Pages deploy hardening hotfix

- Fixed GitHub Pages deployment workflow resilience after `actions/deploy-pages@v5` produced `Deployment failed, try again later` after artifact upload.
- Switched official Pages deployment action pair to `actions/upload-pages-artifact@v4` + `actions/deploy-pages@v4`, matching the stable example still shown in the official deploy-pages README.
- Disabled `cancel-in-progress` for the Pages concurrency group to avoid interrupting active Pages deployments during rapid patch pushes.
- Moved static artifact preparation into `tools/prepare-pages-site.sh` so the official Pages workflow and fallback workflow share the exact same deploy payload.
- Added a single retry attempt for the official Pages deploy step.
- Added manual fallback workflow `.github/workflows/pages-branch-fallback.yml` that publishes `_site` to the `gh-pages` branch if the official Pages deployment backend keeps failing.
- Added `qa/pages_deploy_hardening_smoke.js` and updated `qa/deploy_pages_artifact_smoke.js` to prevent regression in deploy workflow hardening.
- QA result: `npm run check` -> 81/81 PASS.

## Stage7.1 - CI QA overwrite packaging hotfix

- Fixed the Stage7 overwrite package manifest so legacy QA files are not left behind in downstream working folders.
- Confirmed `qa/module_split_stage4_smoke.js` passes on the Stage7 full tree and included all QA scripts in the overwrite package to avoid stale smoke-test failures.
- No runtime UI/audio behavior changes in this hotfix.
- Verification: `npm run check` => 80/80 PASS.

# FoxBear AI Mastering Studio Changelog

## Stage7 · Waveform Compare CSS Cleanup

- `assets/css/waveform-compare.css`를 비교 팝업의 단일 CSS owner로 정리했습니다.
- `studio.css`와 `dock.css`에 남아 있던 `.waveform-compare-*` selector를 제거하고, 필요한 offset/playhead/seek 스타일은 `waveform-compare.css`로 흡수했습니다.
- Dock 자체 파형/모바일 Dock 보정 rule은 유지하되 비교 팝업 전용 rule과 섞이지 않게 분리했습니다.
- `sw.js` cache name을 stage7로 갱신했습니다.
- `qa/waveform_compare_stage7_css_cleanup_smoke.js`를 추가해 legacy CSS에 compare selector가 다시 들어오지 않도록 고정했습니다.
- 기존 QA 중 compare CSS 위치를 보던 항목은 dedicated CSS layer를 기준으로 검사하도록 보정했습니다.

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
