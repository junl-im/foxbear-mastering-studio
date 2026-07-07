## Stage22 notes - Playback link ownership

- Use `FoxBearPlaybackLinkService.registerAudio(audio, meta)` for any new player or preview audio element.
- New player shells should use one of these roles when possible: `bottom-dock`, `mastering-settings-preview`, `inline-preview`, `ab-switch-original`, `ab-switch-mastered`, `difference-original`, `difference-compare`, or a clear feature-specific role.
- Avoid adding new standalone `<audio>` controls without registering them; the Stage22 DOM audit will catch common selectors, but explicit registration gives better labels and start-time metadata.
- `assets/css/components/playback-link.css` owns the linked-state chip and active player outline. Keep Dock/player layout CSS in the Dock/preview CSS files.
- The global event `foxbear:playback-link-change` is now the preferred hook for future cross-panel playback-state UI.

## Stage20 notes - Detail panel ownership

- Future edits to quality gate, master report, engine safety, low-mono, and comparison/detail performance panels should start in `src/ui/detail-panels-view.js`, not `src/app.js`.
- Keep `src/app.js` wrappers thin so older detail orchestration and smoke tests keep working while modules continue to split.
- `forms.css` is the preferred home for fields, select-like controls, settings/pitch controls, and compact buttons.
- `cards.css` is the preferred home for track cards, stat cards, detail boxes, preview cards, and card-like panel shells.
- `base-components.css` still exists as a compatibility base; avoid adding new large component groups there unless they are truly shared boot/base components.

## Stage19 notes - Highlight diagnostics
- Keep highlight comparison logic centralized in `FoxBearHighlightCompareInspector`; avoid duplicating start/duration math in UI modules.
- Compare popup rows now expose `data-waveform-local-start-sec` and `data-waveform-absolute-start-sec` for future seek/UI tests.
- Stage19 intentionally does not change mastering DSP; it only hardens compare-window metadata and UI diagnostics.

## Stage18 - Settings persistence and state sync (2026-07-07)

- Added `src/settings/settings-service.js` with a versioned `foxbear-settings-v1.4.0` localStorage key.
- Restores settings during app boot before feature buttons and the mobile settings panel render.
- Persists ON/OFF settings when toggled: 화면유지 desired state, 진동피드백, 자동 하이라이트, A/B 루프, 레벨매칭, 차이듣기, 캐시자동정리, 성능가드, 안전점수.
- Added a `↩️ 설정초기화` action in the mobile settings panel to restore defaults without clearing audio files or exported downloads.
- Runtime Health now checks `FoxBearSettingsService.applyToContext` so a missing settings module is detected as a boot dependency.
- Bumped runtime asset queries and service worker cache to `1.4.0-stage20-detail-panels-split`.
- Added `qa/stage18_settings_persistence_smoke.js`.

QA result: `npm run check` -> 101/101 PASS.

## Stage17 - Highlight compare listen sync hotfix (2026-07-06)

- Fixed the waveform compare popup listen buttons so preview-scope rows preserve the same absolute highlight start time for both original and master-preview playback.
- The original-side `원곡 듣기` button now starts from the stored highlight `startSec` instead of falling back to 0 seconds or the previous Dock position.
- The master-preview-side `하이라이트 듣기` button still starts at local 0 seconds, but its transport metadata keeps the same absolute highlight start for synced playhead and future mode switches.
- Added metadata-delayed seek handling so the correct section is applied after audio metadata loads on mobile browsers.
- Bumped runtime asset queries and service worker cache to `1.4.0-stage20-detail-panels-split`.
- Added `qa/stage17_highlight_compare_sync_smoke.js` and updated legacy cache-stage smoke tests to accept Stage17.

QA result: `npm run check` -> 99/99 PASS.


## Stage16 - v1.4.0 Version Release
- Promoted the app from `v1.3.84` to `v1.4.0` after the Stage8-Stage15 runtime, Dock, settings-panel, cache/SRI, and modularization changes.
- Bumped `package.json`, visible app version, `APP_VERSION`, `SHARED_DSP_PROFILE_VERSION`, manifest metadata, asset query strings, service worker registration, and cache name to the `v1.4.0-stage16-version-release` line.
- Updated QA expectations so runtime version checks no longer pin the app to the old `1.3.84` label.
- Updated the overwrite package default to `v1.4.0-stage16` so generated ZIP names match the official release line.

## Stage16 Mobile Settings Panel

- 모바일 `퀵패널` 개념을 `⚙️ 설정` 패널로 바꿨습니다.
- Dock에 이미 있는 원음/스마트폰/노트북/모노 계열 재생 컨트롤은 설정 패널에서 제거했습니다.
- 설정 패널은 앱추가, 화면유지, 진동피드백, 저장보호, 자동 하이라이트, A/B 루프, 레벨매칭, 차이듣기, 캐시자동정리, 성능가드, 안전점수, 분석캐시정리, 재생복구 중심입니다.
- 토글형 설정에는 `ON` / `OFF` 배지를 표시하고, 실행형 항목은 `추가`, `실행`, `대기` 같은 action badge를 표시합니다.
- `src/ui/mobile-native-view.js`, `src/app.js`, `assets/css/mobile-native.css`를 수정했고 `qa/stage16_mobile_settings_panel_smoke.js`를 추가했습니다.
- cache key는 `1.4.0-stage16-version-release`입니다.

## Stage14 runtime recovery notes

- Stage14 is a stabilization patch, not a UI/engine feature patch.
- It addresses browser-side failures that previously looked like “file does not load” or “quick panel disappeared.”
- The recovery panel is only shown when a real health problem is detected or when called manually through `window.FoxBearRuntimeHealth.showRecoveryPanel()`.
- Cache recovery only deletes FoxBear shell caches and unregisters service workers; it does not remove the user’s audio files or exported downloads.
- Keep `assets/css/boot/runtime-health.css` lightweight because it is part of the earliest boot path.

# FoxBear Project Notes

## Stage12 Detail View Module Split

- `src/ui/detail-view.js`를 추가해 선택 트랙 상세 패널, 분석 상세 열림/닫힘 상태, 하이라이트 빠른 듣기 bar, AI 마스터링 상세 카드 DOM 생성을 분리했습니다.
- `src/app.js`에는 기존 함수명 wrapper와 `getDetailViewDeps()`만 남겨 기존 UI/QA 호환성을 유지했습니다.
- `index.html` 로딩 순서는 `waveform-compare-view.js` -> `detail-view.js` -> `app.js`입니다.
- `sw.js` cache name을 stage12로 갱신하고 `detail-view.js`를 precache에 추가했습니다.
- `qa/stage12_detail_view_split_smoke.js`를 추가했습니다.
- 누적 overwrite 패키지 방식을 유지합니다.

# FoxBear Project Notes

## Stage11.1 Runtime Waveform / Mobile Dock Overlay Hotfix

- 음악 파일을 불러온 뒤 Dock 파형 렌더링에서 `getWaveformMarkerForIndex is not defined`가 발생하던 문제를 수정했습니다.
- `getWaveformMarkerForIndex()`를 `src/utils/core-utils.js`의 공유 유틸로 승격했고, 보고된 `getWaveformMarkerForlndex` 오타형 alias도 함께 제공합니다.
- 모바일 Dock floating offset 계산을 강제 큰 fallback 기준이 아니라 실제 측정 Dock 높이 기준으로 바꿨습니다.
- toast, 알림, HUD, 다운로드 안내, 퀵패널이 Dock 바로 위쪽에 붙도록 `dock.css`와 `mobile-native.css`에 Stage11.1 override를 추가했습니다.
- 퀵패널 옆 상태/결과 chip을 제거하고 단일 퀵패널 아이콘만 남겼습니다.
- 퀵패널 내부 action을 compact icon label로 정리했고 닫기 버튼은 다운로드/타 팝업 close 스타일과 맞췄습니다.
- `sw.js` cache name을 stage11.1로 갱신했습니다.
- `qa/stage11_1_runtime_mobile_hotfix_smoke.js`를 추가했습니다.
- 검증: `npm run check` 89/89 PASS.

# FoxBear Project Notes

## Stage11 Large Modular Renovation

- `src/recommendation/recommendation-engine.js`를 추가해 장르 추천 점수 계산, 후보 사유/감점, 추천 설명 chip, safe fallback 추천 로직을 `src/app.js`에서 분리했습니다.
- `src/app.js`에는 기존 함수명 wrapper만 남겨 기존 UI와 QA 호환성을 유지했습니다.
- `assets/css/components/base-components.css`를 추가해 업로드 카드, 버튼, 트랙 카드, 통계, 토스트, pitch/control 초기 컴포넌트 스타일을 `studio.css`에서 분리했습니다.
- `studio.css`는 legacy override/hotfix layer로 유지합니다. 로딩 순서는 `theme.css` -> `layout.css` -> `components/base-components.css` -> `studio.css`입니다.
- `index.html`, `sw.js`, SRI, package QA를 새 모듈 기준으로 갱신했습니다.
- `sw.js` cache name을 stage11로 갱신했습니다.
- `qa/stage11_large_modular_renovation_smoke.js`를 추가했습니다.
- 검증: `npm run check` 88/88 PASS.

## Stage10 Download Service Split

- `src/download/download-service.js`를 추가해 다운로드 환경 감지, 포맷 옵션, Blob 준비, 파일명 정규화, Web Share/File System Access helper, 다운로드 도움 패널을 전담하도록 분리했습니다.
- `src/app.js`에는 기존 함수명 wrapper만 남겨 `download-dialog-view.js`와 기존 QA가 깨지지 않도록 했습니다.
- `index.html` 로딩 순서는 `download-service.js` -> `download-dialog-view.js` -> `app.js`입니다.
- `sw.js` cache name을 stage10으로 갱신하고 새 service 파일을 precache에 추가했습니다.
- `qa/stage10_download_service_split_smoke.js`를 추가했습니다.
- 검증: `npm run check` 86/86 PASS.

## Stage9.1 Cumulative Overwrite Packaging Hotfix

- Stage9 overwrite ZIP이 delta-only라서 Stage8의 `src/app.js`, `assets/css/mobile-native.css` 핫픽스가 빠질 수 있던 문제를 수정했습니다.
- 앞으로 overwrite ZIP은 최신 패치만 덮어써도 이전 stage runtime 변경이 함께 들어가는 누적 패키지로 생성합니다.
- `tools/create-overwrite-zip.sh`와 `npm run package:overwrite`를 추가했습니다.
- overwrite 패키지는 `src/`, `assets/`, `vendor/`, `qa/`, `tools/`, `.github/workflows/`, 문서/배포 설정을 포함합니다.
- `sw.js` cache name을 stage9.1로 갱신했습니다.
- `qa/stage9_1_cumulative_overwrite_manifest_smoke.js`를 추가했습니다.
- 검증: `npm run check` 84/84 PASS.

# FoxBear Project Notes

## Stage9 Dock Waveform CSS Split

- `assets/css/dock-waveform.css`를 추가해 Dock waveform/timeline/live playhead 스타일을 전용 CSS layer로 분리했습니다.
- `assets/css/dock.css`에서는 `.bottom-preview-waveform`, `.bottom-waveform-bars`, `.dock-integrated-waveform-bars` 계열 selector를 제거했습니다.
- CSS 로딩 순서는 `dock.css` -> `dock-waveform.css` -> `waveform-compare.css`입니다. Dock 기본 레이아웃, Dock 파형, 비교 팝업 override 순서를 유지해야 합니다.
- `sw.js` cache name을 stage9로 갱신하고 `dock-waveform.css`를 precache에 추가했습니다.
- `qa/stage9_dock_waveform_css_split_smoke.js`를 추가하고 기존 waveform QA를 새 CSS layer 기준으로 보정했습니다.
- 검증: `npm run check` 83/83 PASS.

## Stage8 Async Playback / Mobile Dock Overlay Hotfix

- `앱 비동기 오류`가 브라우저 재생 차단/중단 상황까지 과하게 표시되던 문제를 완화했습니다.
- `runInitStep()`의 async Promise rejection을 안전하게 잡도록 수정했습니다.
- 분석 실패 보고 중 2차 render 오류가 unhandled rejection으로 번지는 경로를 차단했습니다.
- 모바일 Dock 위 toast/알림/화면유지/퀵패널 간격을 Dock에 더 바싹 붙도록 줄였습니다.
- `qa/stage8_async_mobile_dock_smoke.js`를 추가했습니다.
- 검증: `npm run check` 82/82 PASS.


## v1.3.81 Modal / Dock Layout Integrity Audit

- 새 업로드 로고 `/mnt/data/foxbear.png`를 바깥 흰 배경만 투명 처리해 PWA/대표 아이콘 세트로 재생성.
- 생성 아이콘: 16/32/48/72/96/128/144/152/180/192/384/512 PNG, Apple touch, legacy `foxbear-music.png`.
- `manifest.webmanifest`, `index.html`, `sw.js` 아이콘 경로를 새 아이콘 세트로 갱신.
- 버튼형 적용 팝업 닫기 실패를 막기 위해 닫기 경로를 하드닝하고, `버튼 보기` 버튼 자체의 과도한 최상위 z-index를 제거.
- 기록 정책: 개별 `Archived_v*.md`를 추가하지 않고 `PROJECT_NOTES.md`와 README에 누적.


## 기록 정책
- v1.3.78부터 `Archived_v*.md` 파일을 새로 만들지 않습니다.
- 버전 요약, 인수인계, 정리 기록은 이 `PROJECT_NOTES.md`와 `README.md`에 누적합니다.


## v1.3.79 Dock Purpose Realignment

- Dock 통합 파형을 단순 재생 진행 막대가 아니라 피크/클립 위험 위치까지 읽을 수 있는 정보형 파형으로 재정렬했습니다.
- 재생된 구간 밝기 효과는 유지하되, 재생 전 구간에서도 노랑(주의 피크), 빨강(클립/초과 피크)이 보이도록 CSS 대비를 보강했습니다.
- Dock 플레이어 우측 정보 영역을 2단 파티션으로 나눠 위에는 현재 소스(`원곡`, `마스터링`, `하이라이트`), 아래에는 진행 시간/러닝타임이 표시되게 했습니다.
- 기존 별도 공간을 차지하던 `큰 비교` 영역을 없애고, 곡명/장르 표기 줄 우측의 `비교보기` 칩으로 이동했습니다.
- Dock 버튼 라인을 3구간으로 분리했습니다: 좌측 `하이라이트 듣기`, 중앙 `마스터링 시작`, 우측 `원곡 프리뷰 / 마스터링 프리뷰`.
- 마스터링 완료 후 다운로드 버튼 라인이 화면 중앙 또는 살짝 위에 보이도록 직접 스크롤 위치를 계산하고, `여기서 저장` 힌트로 강조합니다.
- 다운로드 옵션 팝업의 크기/높이/패딩을 보강해 내용이 팝업보다 커 보이거나 아래가 잘리는 문제를 줄였습니다.
- 변경 기록은 계속 이 파일에 누적하며, 개별 `Archived_v1.3.xx.md` 파일은 생성하지 않습니다.

## v1.3.78 Cleanup / Button View Layer Repair
- `버튼 보기` 버튼 자체가 모든 화면 위로 올라오는 z-index 과보정 문제를 수정합니다.
- 버튼형 적용 팝업의 닫기 버튼/배경/ESC 닫기 경로를 정리합니다.
- 개별 `Archived_v*.md` 파일을 `PROJECT_NOTES.md`로 통합하고 삭제합니다.
- 죽은 코드/중복 코드 후보는 안전 삭제 가능 항목과 보류 항목으로 구분해 기록합니다.


## v1.3.78 Dead Code / File Cleanup Audit

### 삭제 반영
- 개별 `Archived_v*.md` 17개를 `PROJECT_NOTES.md`로 통합 후 삭제했습니다.
- `src/app.js`에서 정적 참조가 1회뿐인 미사용 함수 17개를 제거했습니다.
  - `getAdaptiveTargetLabel`, `activateByKeyboard`, `supportsSystemFilePicker`, `addKeywordScore`
  - `getPhaseSafeWidthFactor`, `addKickToBuffer`, `addHatToBuffer`, `addClapToBuffer`
  - `mixMonoSample`, `mixStereoAccent`, `softLimitSample`
  - `applyPeakGuard`, `applyTruePeakGuard`, `tryShareDownloadFile`
  - `setPreviewTranslationMode`, `isDockMasteringBusyBlocked`, `selectTrack`

### 보류
- `QA_REPORT_*.md` 파일들은 실행 코드가 아니지만 과거 QA 근거 기록이므로 이번 패치에서는 삭제하지 않았습니다.
- Dock/다운로드/카카오 관련 함수는 간접 이벤트 경로가 많아 단순 문자열 검색만으로 추가 삭제하지 않았습니다.
- `createDifferencePreviewPlayer`, `toggleDockAbLevelMatch`, `toggleDockDifferenceListen`는 앱 내부 직접 호출은 없지만 A/B 차이듣기 QA와 구버전 호환 경로가 요구하므로 삭제하지 않았습니다.
- 다음 대형 정리는 `src/app.js` 모듈 분리 후 진행하는 편이 안전합니다.

## 이전 개별 패치노트 통합 기록

---

### Archived notes v1.3.60

# Patch Notes — FoxBear AI Mastering Studio Pro v1.3.60

## Fixed
- Restored robust file/folder loading with a hybrid picker path.
- Improved hidden file input CSS so native picker activation is not suppressed by negative z-index/clipping.
- Enlarged mobile upload tiles to keep 파일열기/폴더열기 visible and tappable.
- Expanded hover/touch help tooltips across Dock, preview controls, sliders, snapshots, and admin controls.
- Separated button feature groups into `마스터링 엔진` and `비교 · 관리 도구`.
- Added handling for `abDifferenceListen` in utility feature toggles.

## Validation
- `npm run check` passed after patch.
- SRI hashes in `index.html` were regenerated for changed app/CSS assets.
- Service worker cache key was bumped to `foxbear-shell-v1.3.60-upload-tooltip-hotfix`.

---

### Archived notes v1.3.61

# FoxBear AI Mastering Studio Pro v1.3.61

## UI Coverage + GitHub Pages Deploy Hotfix

### Fixed
- Repaired the local static validation failure caused by a stale `src/app.js` SRI hash in `index.html`.
- Added a deploy artifact contract check so GitHub Pages deployment fails early during the build job when `index.html`, `manifest.webmanifest`, `sw.js`, `assets`, `src`, or `vendor` are missing.
- Included `manifest.webmanifest` and `sw.js` in the GitHub Pages `_site` artifact. The previous workflow copied the app shell and source assets but left these root PWA/runtime files out.
- Added pre-upload checks that reject symbolic links and hard links in `_site`, matching GitHub Pages artifact requirements.
- Explicitly pinned the uploaded artifact name to `github-pages` and passed `artifact_name: github-pages` to the deploy step.

### Improved
- Grouped feature cards into `마스터링 엔진` and `비교 · 관리 도구` so non-engine controls no longer appear to leak into the engine area.
- Extended dynamic feature card help metadata with `data-help`, `data-tooltip`, `aria-label`, and `title`.
- Added `qa/deploy_pages_artifact_smoke.js` to `npm run check`.

### Validation
- `npm run check`: PASS
- Local `_site` artifact simulation: PASS, 33 files, about 1.6 MB

---

### Archived notes v1.3.62

# FoxBear AI Mastering Studio Pro v1.3.63

## Audio Import Reliability Hotfix

- 파일/폴더 타일의 마우스/터치 클릭은 브라우저 기본 `<label for=fileInput>` 경로를 우선 사용하도록 복구했습니다.
- `showOpenFilePicker()` 실패 후 비동기 fallback이 사용자 활성화 밖에서 차단되는 문제를 피했습니다.
- 파일 선택 직후 선택 개수/등록 상태를 토스트로 표시하고, `handleFiles()`가 등록/무효/제한 결과를 반환하도록 정리했습니다.
- Web Audio `decodeAudioData()`를 Promise/콜백 호환 경로로 보강하고, 실패 시 미디어 엘리먼트 metadata 확인으로 코덱/컨테이너 원인을 더 명확히 표시합니다.
- 코덱 실패 메시지를 확장자별로 안내하여 WAV/MP3/M4A(AAC) 변환 또는 브라우저 변경을 빠르게 판단할 수 있게 했습니다.
- 배포 캐시 키와 SRI 해시를 v1.3.63로 갱신했습니다.

---

### Archived notes v1.3.63

# FoxBear Mastering Studio Pro v1.3.63 Loudness Target UI Cleanup

## 변경 사항
- 라우드니스 타깃 선택 영역 아래에 별도로 노출되던 `곡별 Adaptive LUFS` 체크박스를 제거했습니다.
- 내부 곡별 타깃 보정 로직은 유지해 기존 마스터링 안전성은 바꾸지 않았습니다.
- 트랙 상세 정보에서도 `곡별 Adaptive LUFS`가 별도 행으로 튀어나오지 않도록 제거했습니다.
- `qa/loudness_target_ui_smoke.js`를 추가해 라우드니스 타깃 UI가 단일 select 형태로 유지되는지 검증합니다.
- 앱/SW 캐시 키와 SRI 해시를 `v1.3.63-loudness-ui`로 갱신했습니다.

## 검증
- `npm run check`

---

### Archived notes v1.3.64

# FoxBear AI Mastering Studio Pro v1.3.64

## Kakao / In-App Upload Rootfix

### Fixed
- Reworked the file/folder import tiles so the actual `<input type="file">` is nested inside each visible tile and stretched as a transparent overlay.
- This keeps the picker connected to a real user tap in KakaoTalk, Android WebView, Safari, PWA, and desktop browsers instead of relying on programmatic click or fragile hidden-label forwarding.
- Added an import status line under the upload tiles. It now shows whether the app is ready, whether a picker opened, whether selected files reached the app, and what failed if nothing was delivered.
- Added a picker-return watcher for cases where an in-app browser closes the picker without dispatching `change`.
- Added a boot-safe fallback. If full UI initialization fails, file input change handlers are still attached and a visible diagnostic is shown.
- Unknown file names/MIME types from mobile content providers are no longer rejected before decoding. The app now attempts browser decoding first and reports a codec-specific error only if decoding fails.
- Service worker now uses network-first loading for scripts/styles/workers to reduce stale asset/SRI mismatch cases that can make the app look clickable but inactive.

### QA
- Added `qa/kakao_upload_rootfix_smoke.js`.
- Updated native picker/import QA checks for the nested transparent-input architecture.
- `npm run check` passes with SRI, runtime, upload, mobile, deploy, and engine smoke checks.

---

### Archived notes v1.3.65

# FoxBear AI Mastering Studio Pro v1.3.65

## Dock / Import Init Cleanup

- 첫 화면에서 보이던 일반 초기화 오류를 줄이기 위해 앱 초기화 단계를 분리했습니다.
- 파일열기/폴더열기 이벤트는 가장 먼저 독립 바인딩되며, 다른 UI 보조 기능이 실패해도 비상 모드로 계속 동작합니다.
- 파일열기 설명을 `다양한 코덱 지원`으로 정리하고, 상태 안내에 WAV/MP3/M4A/AAC/FLAC/OGG/Opus/AIFF/CAF/MP4/MOV 등 브라우저 디코딩 기반 지원 범위를 표시했습니다.
- Dock 버튼명을 정리했습니다.
  - `마스터링 진행` → `마스터링`
  - `결과 프리뷰` → `추천구간 미리듣기`
  - `원본 프리뷰` → `원곡 프리뷰`
- Dock 배치를 정리했습니다.
  - 좌측: `마스터링`, `추천구간 미리듣기`
  - 우측: `원곡 프리뷰`, `마스터링 프리뷰`
- Dock 도움말 문구에서 어색한 `현재 화면에서 선택된 곡만...` 문장을 제거했습니다.

---

### Archived notes v1.3.67

# FoxBear Mastering Studio Pro v1.3.67

## Dock Single-Line Actions Layout Fix

- 하단 Dock의 4개 주요 버튼(`마스터링`, `추천구간 미리듣기`, `원곡 프리뷰`, `마스터링 프리뷰`)이 한 줄에 유지되도록 수정했습니다.
- 좌측 그룹은 왼쪽, 프리뷰 소스 그룹은 오른쪽 정렬을 유지하되 버튼 폭은 문구 길이에 맞게 조정했습니다.
- 좁은 모바일 화면에서도 강제 줄바꿈 대신 한 줄 유지 및 필요한 경우 가로 스크롤 fallback을 사용합니다.
- `qa/dock_action_single_line_smoke.js`를 추가해 버튼 순서, 한 줄 유지 CSS, 텍스트 맞춤 폭 규칙을 검증합니다.

---

### Archived notes v1.3.68

# FoxBear Mastering Studio Pro v1.3.69

## Dock Action Target Fix

### Fixed
- 하단 Dock의 `마스터링` 버튼이 `선택한 곡을 마스터링합니다` 토스트만 띄우고 실제 렌더 단계로 진입하지 못할 수 있던 경로를 수정했습니다.
- Dock의 `추천구간 미리듣기`가 내부 선택 트랙 상태와 Dock 표시 트랙이 어긋날 때 반응하지 않는 문제를 수정했습니다.
- Dock 액션 기준을 `selectedId` 단독 의존에서 `bottomPreviewTrackId → selectedId → 첫 트랙` 순서로 통일했습니다.
- stale `state.busy` 플래그가 남아 실제 작업이 없는데도 Dock 액션이 막히는 상태를 자동 복구합니다.
- `masterTrack()`이 조용히 return하던 조건에 Dock 진단/토스트를 붙이고, 실행 결과를 반환하도록 보강했습니다.

### Changed
- Dock `마스터링`, `추천구간 미리듣기`, `원곡 프리뷰`, `마스터링 프리뷰`는 모두 Dock에 표시 중인 곡을 기준으로 동작합니다.
- 파일열기 도움말 문구를 `WAV, MP3, M4A/AAC, FLAC, OGG/Opus, AIFF, CAF, MP4/MOV 등 다양한 코덱` 안내로 확장했습니다.

### QA
- `qa/dock_action_runtime_fix_smoke.js` 추가.
- `npm run check` 전체 통과.

---

### Archived notes v1.3.69

# FoxBear Mastering Studio Pro v1.3.69

## Dock Action Target Fix

- 파일을 불러온 직후 `selectedId`만 잡히고 `selectedIds`가 비어 있어 일부 마스터링 경로가 “곡을 선택하세요”로 빠지던 문제를 수정했습니다.
- 불러온 트랙을 즉시 작업 대상(`selectedIds`)으로 등록하고 Dock 기준 트랙(`bottomPreviewTrackId`)도 동기화합니다.
- 분석 중인 곡에서 Dock `마스터링` 또는 `추천구간 미리듣기`를 누르면 버튼이 먹통처럼 보이지 않고, 분석 완료를 기다린 뒤 이어서 실행합니다.
- 분석 Promise를 트랙에 보관해 Dock 액션이 실제 분석 완료 시점을 기다릴 수 있게 했습니다.
- Dock 액션 타깃 QA(`qa/dock_action_target_fix_smoke.js`)를 추가했습니다.
- 앱/SW 캐시 키와 SRI 해시를 `v1.3.69-dock-action-target-fix`로 갱신했습니다.

---

### Archived notes v1.3.70

# v1.3.70 Dock Peak Popup / Toast Stack

## Fixed
- Dock 피크 미니뷰 클릭이 파형 seek로 먹히면서 비교 팝업이 열리지 않던 문제를 수정했습니다.
- Dock 피크 그래프와 플레이어 seek 게이지의 수평 시작/끝 라인을 맞췄습니다.
- 토스트가 Dock과 겹치거나 연속 알림이 덮어쓰이던 문제를 스택형 알림으로 개편했습니다.

## Changed
- Dock 줄 순서를 피크, 플레이어, 마스터링/프리뷰 액션, 재생환경 순으로 정리했습니다.
- Dock 피크 미니뷰는 팝업 전용이고, 구간 seek는 팝업 내부 파형에서만 동작합니다.

## QA
- Added `qa/dock_peak_toast_stack_smoke.js`.
- `npm run check` PASS 기준으로 SRI, 런타임 스모크, Dock layout smoke를 검증합니다.

---

### Archived notes v1.3.71

# FoxBear AI Mastering Studio Pro v1.3.71

## Dock Main Action Bridge

- Dock의 `마스터링` 버튼을 별도 우회 로직이 아니라 메인 화면의 선택 곡 마스터링 액션과 같은 기준으로 실행하도록 단순화했습니다.
- 메인 `마스터링`도 체크박스식 `selectedIds`가 비어 있으면 현재 활성 곡(`selectedId`)을 자동 대상화하도록 수정했습니다.
- 파일을 불러온 직후 체크 선택이 없어도 현재 화면에 보이는 곡을 바로 마스터링할 수 있게 했습니다.
- Dock `추천구간 미리듣기`는 메인 화면에서 선택된 곡을 우선 기준으로 잡고, 같은 `renderMasterPreviewForTrack()` 경로를 타도록 정리했습니다.
- 분석 중인 곡도 버튼이 조용히 막히지 않고 분석 완료를 기다린 뒤 이어서 마스터링/추천구간 미리듣기를 진행하도록 했습니다.
- `qa/dock_main_action_bridge_smoke.js`를 추가해 Dock 버튼이 메인 액션 브리지로 연결되어 있는지 검증합니다.
- 앱/SW 캐시 키와 SRI 해시를 `v1.3.71-dock-main-action-bridge`로 갱신했습니다.

---

### Archived notes v1.3.72

# FoxBear Mastering Studio Pro v1.3.72

## Dock Remote Controller Fix

- Dock를 별도 기능 복사본이 아니라 본문 활성 곡을 조작하는 리모컨으로 재정의했습니다.
- Dock `마스터링`은 현재 본문 활성 곡을 기준으로 `masterTrack()`을 직접 호출합니다.
- Dock `추천구간 미리듣기`는 현재 본문 활성 곡을 기준으로 `renderMasterPreviewForTrack()`을 직접 호출합니다.
- Dock 버튼은 더 이상 disabled로 죽지 않고, 누르면 실행하거나 차단 사유를 토스트로 보여줍니다.
- 분석 중인 곡은 분석 완료를 기다린 뒤 마스터링/추천구간 미리듣기를 이어서 실행합니다.
- 전역 캡처 기반 Dock 리모컨 fallback을 추가해 일반 이벤트 바인딩이 꼬여도 Dock 액션이 동작하도록 했습니다.

---

### Archived notes v1.3.73

# FoxBear Mastering Studio Pro v1.3.73

## Dock Event Repair

사용자 피드백 기준으로 Dock을 전면 재점검했습니다. v1.3.72에서 마스터링은 복구됐지만 재생환경, 원곡/마스터 전환, 파형 팝업 닫기가 죽는 문제가 남아 있었습니다.

### 수정

- Dock 클릭을 단일 리모컨 디스패처로 통합했습니다.
- `마스터링`, `추천구간 미리듣기`, `원곡 프리뷰`, `마스터링 프리뷰`, `원음/폰/노트북/모노`, `피크 팝업`, `팝업 닫기`를 모두 명시적으로 처리합니다.
- 재생환경 전환은 Dock에 표시된 곡 또는 본문 활성 곡을 먼저 활성화한 뒤 적용합니다.
- 원곡/마스터링 프리뷰 전환은 disabled 상태에 묻히지 않고, 실행 가능 여부를 토스트로 설명합니다.
- 파형/피크 팝업은 원곡과 마스터링을 비교하는 용도로 열리며, 닫기 버튼/배경 클릭을 캡처 단계에서 보강합니다.
- Dock 내부 z-index와 pointer-events를 재정리해 플레이어/파형 레이어가 버튼을 가리지 않게 했습니다.

### 검증

- `npm run check`
- `qa/dock_event_repair_smoke.js`

---

### Archived notes v1.3.74

# v1.3.74 Dock Integrated Waveform Remote

## What changed

- Rebuilt the Dock preview area around an integrated waveform player.
  - Play/pause, waveform seek, current source label, and time display now live in one control.
  - The old separated player seek bar and mini peak view no longer fight for pointer events.
- Changed the Dock compare opener to a compact `큰 비교` button.
  - It opens a large waveform comparison popup for original vs mastered/highlight audio.
- Added large compare audition buttons.
  - `원곡 듣기`, `마스터링 듣기`, and `하이라이트 듣기` switch the Dock player source and start playback.
- Renamed `추천구간 미리듣기` to `하이라이트 듣기`.
- Moved `하이라이트 듣기` into the first Dock action position.
- Renamed the mastering action to `마스터링 시작` and centered it in the action row.
- Added a capture fallback for `버튼 보기` so the button-style feature popup still opens even when other UI layers are active.

## QA

- Added `qa/dock_integrated_waveform_remote_smoke.js`.
- Updated Dock waveform/action tests for the new single-line remote layout.
- `npm run check` passes.

---

### Archived notes v1.3.75

# v1.3.78 Cleanup / Button View Layer Repair

- Fixed Dock integrated waveform not appearing immediately after import by adding placeholder waveform bars and a waveform signature to the Dock player key.
- Rebuilds the Dock player when analysis waveform data becomes available.
- Added hard fallback binding for the Button Engine `버튼 보기` control.
- Scrolls the completed track's download action line to the middle of the main screen after mastering.
- Improves Kakao/in-app download flow by trying Web Share first when available, then showing save assistance / external-browser guidance.

---

### Archived notes v1.3.76

# v1.3.78 Dock Regression & Button View Stabilization

- Stabilizes the Dock integrated waveform refresh after first import, analysis completion, and mastering completion.
- Forces Dock waveform re-render when placeholder bars need to become real peak/waveform bars.
- Raises the Button View dialog above the Dock and adds pointer/touch/click fallback binding.
- Keeps Dock remote controls clickable by reinforcing pointer-event boundaries.
- Improves post-mastering scroll so the finished track download line lands near the middle of the viewport.
- Keeps Kakao/in-app download guidance flow while preserving normal browser download behavior.

---

### Archived notes v1.3.78

# FoxBear AI Mastering Studio Pro v1.3.78

## Dock Waveform Visual Polish

- Dock 통합 파형을 실제 플레이어처럼 보이도록 개선했습니다.
- 재생이 지나간 막대는 밝게, 아직 지나가지 않은 막대는 어둡게 표시합니다.
- 파형 막대를 중앙 기준 미러 스타일로 정렬해 바그래프 느낌을 줄였습니다.
- 얇은 흰 재생선 대신 청록 글로우 캡슐 playhead를 적용했습니다.
- Dock 폭을 기준으로 파형 막대 수를 동적으로 계산해 모바일/데스크톱에서 밀도와 간격을 안정화했습니다.
- 큰 비교 팝업 파형도 같은 진행 대비/글로우 playhead 스타일을 공유합니다.
- `마스터링` 등 Dock 라벨이 폭 부족으로 세로 한 글자씩 줄바꿈되는 문제를 `nowrap`으로 방지했습니다.
- QA: `qa/dock_waveform_visual_polish_smoke.js`를 추가했습니다.

## v1.3.81 Modal / Dock Layout Integrity Audit

- Dock header restored to one line: active file name stays left, genre and `비교보기` stay right aligned on the same row.
- Dock integrated player keeps its current position, while the right info cell is split vertically into source label and `current / duration` time.
- Button View modal and Realtime Preview modal no longer rely only on CSS class removal. Open/close now also controls `hidden`, inline `display`, `pointer-events`, and body state.
- Added hard fallback handlers for Button View close and Realtime Preview open/close, including touch/click/backdrop/ESC paths.
- Added `qa/modal_dock_layout_integrity_smoke.js` to lock these regressions.
- Engine path was not changed in this patch. Existing engine bench and golden audio QA remain in the full check chain.


## v1.4.0 Dock / Modal State Machine Refactor

- PC Dock 왼쪽 중복 곡정보 영역을 큰 재생/정지 버튼으로 변경했습니다.
- Dock 상단 정보줄은 파일명 좌측, 장르/비교보기 우측의 한 줄 구조로 재정렬했습니다.
- 통합 플레이어 내부의 작은 재생 버튼은 PC에서 숨기고, 왼쪽 큰 재생 버튼이 현재 원곡/마스터링/하이라이트 소스를 제어하도록 연결했습니다.
- 플레이어 우측 정보는 위쪽에 원곡/마스터링/하이라이트, 아래쪽에 진행시간/전체 러닝타임이 나오도록 폭과 줄바꿈을 보정했습니다.
- 버튼형 적용 팝업 닫기는 pointerdown에서 바로 숨기지 않도록 수정하고, click/touchend/ESC 닫기에서 이벤트 전파를 강하게 차단해 닫힌 뒤 다시 열리는 문제를 막았습니다.
- 마스터링 설정 미리듣기 버튼은 disabled로 죽지 않고 클릭 시 열리거나 이유를 토스트로 말하도록 변경했습니다.
- 엔진 코드는 변경하지 않고 engine QA/golden audio QA로 정상 여부를 확인하도록 유지했습니다.

---

## v1.4.0 Dock / Modal State Machine Refactor

- Dock/Modal 반복 회귀를 구조 문제로 보고, 증상별 fallback 추가 대신 컨트롤러 분리를 시작했습니다.
- `src/ui/modal-controller.js`를 추가했습니다.
  - 버튼형 적용 팝업과 마스터링 설정 미리듣기 팝업의 open/close/ESC/backdrop 경로를 단일 상태 머신으로 관리합니다.
  - `hidden`, `show`, `aria-hidden`, inline `display`, `pointer-events`, body class를 한 함수에서 동기화합니다.
- `src/ui/dock-controller.js`를 추가했습니다.
  - Dock root 내부의 명시적 `data-dock-action`만 처리합니다.
  - 기존 document 전체 캡처 방식의 Dock dispatcher를 제거하고 root-local dispatcher로 변경했습니다.
- `src/app.js`의 기존 modal fallback 함수들은 state-machine 설치 shim으로 축소했습니다.
- `bindEvents()`에서 버튼형/미리듣기/Dock direct click handler 중복 등록을 제거하고, 단일 컨트롤러 경로로 정리했습니다.
- PC Dock 큰 재생 버튼은 겹치는 CSS 아이콘 대신 `▶ / Ⅱ / •` glyph와 `재생 / 일시정지 / 대기` 텍스트를 사용합니다.
- PC Dock 정보줄은 파일명 좌측, 장르/비교보기 우측의 한 줄 grid로 보정했습니다.
- 플레이어 우측 source/time 파티션이 화면 밖으로 밀리지 않도록 폭과 overflow를 다시 제한했습니다.
- `qa/run_all_checks.js`를 추가해 전체 QA를 runner 방식으로 실행합니다.
  - 실패해도 다음 QA를 계속 실행하고 마지막에 요약합니다.
- 신규 QA: `qa/dock_modal_state_machine_smoke.js`.
- `npm run check` 결과: 67/67 PASS.
- 엔진 코드는 변경하지 않았습니다. `engine_qa_bench`, `golden_audio_qa_pack`는 통과했습니다.

---

## Stage6 Waveform Compare Module / Handoff Docs

- 비교 팝업 view를 `src/ui/waveform-compare-view.js`로 분리했습니다.
- 비교 팝업 전용 CSS layer `assets/css/waveform-compare.css`를 추가했습니다.
- `src/app.js`는 비교 팝업 view에 dependency object를 넘기는 wrapper만 유지합니다.
- `sw.js` cache name을 stage6로 갱신하고 새 JS/CSS를 precache에 추가했습니다.
- `CHANGELOG.md`, `HANDOFF.md`를 루트에 추가해 버전 기록과 다음 작업 인수인계를 다시 남깁니다.
- `qa/docs_handoff_smoke.js`를 추가해 MD 인수인계 누락을 QA에서 잡도록 했습니다.
- `qa/run_all_checks.js`는 `package.json`의 `qaChecks`를 읽도록 변경해 QA 목록을 한 곳에서 관리합니다.


---

## Stage7 Waveform Compare CSS Cleanup

- `assets/css/waveform-compare.css`를 비교 팝업 전용 CSS owner로 정리했습니다.
- `studio.css`와 `dock.css`에서 `.waveform-compare-*` selector를 제거했습니다.
- 비교 팝업 dock-safe offset, z-index, playhead, transport, seek hint는 `waveform-compare.css`로 이동했습니다.
- Dock 자체 파형과 모바일 Dock 보정은 legacy CSS에 남겨 비교 팝업과 책임을 분리했습니다.
- `sw.js` cache name을 stage7로 갱신했습니다.
- 신규 QA: `qa/waveform_compare_stage7_css_cleanup_smoke.js`.


## Stage7.1 CI QA overwrite packaging hotfix

- Purpose: fix downstream CI failure caused by stale `qa/module_split_stage4_smoke.js` remaining when applying the Stage7 overwrite ZIP.
- Runtime changes: none.
- Packaging change: overwrite ZIP now includes all QA scripts to prevent stale local/CI checks.
- Verification: `npm run check` passed 80/80.
## Stage7.2 handoff - GitHub Pages deployment hardening

### Why this patch exists
The GitHub Actions build/QA job passed, the Pages artifact uploaded, and `deploy-pages` created a deployment, but GitHub Pages returned `Error: Deployment failed, try again later.` This pattern points at the Pages deployment backend or deploy action path rather than local app code.

### What changed
- `.github/workflows/pages.yml` now uses `actions/upload-pages-artifact@v4` and `actions/deploy-pages@v4`.
- The workflow no longer cancels in-progress Pages deployments.
- The deploy step retries once if the first Pages deployment attempt fails.
- Artifact assembly is centralized in `tools/prepare-pages-site.sh`.
- `.github/workflows/pages-branch-fallback.yml` was added as a manual fallback that pushes the same `_site` payload to the `gh-pages` branch.

### If official Pages deployment still fails
1. In GitHub, open `Settings > Pages` and confirm the current source.
2. For the official `pages.yml` workflow, Source should be `GitHub Actions`.
3. If `deploy-pages` keeps failing with the same generic backend error, run the manual `Fallback deploy static site to gh-pages branch` workflow.
4. For that fallback path, switch `Settings > Pages > Build and deployment > Source` to `Deploy from a branch`, then select `gh-pages` and `/root`.

### QA
`npm run check` passes: 81/81.


## Stage12.1 notes

Dock UI repair was prioritized over additional feature work. The player collapse was caused by old generic `.player-time` and Dock grid rules leaking into the integrated waveform player after modular CSS splitting. The hotfix uses a final explicit layout layer instead of deleting old rules, because deleting old Dock rules in bulk would be riskier.

User-facing text changes:

- `폰` -> `📱 스마트폰`
- Dock compare -> `🌊 비교`
- Dock highlight -> `✨ 하이라이트`
- Dock mastering -> `🛠 마스터링`
- Dock original/master preview tabs use compact emoji labels.

Packaging remains cumulative overwrite ZIP only.

## Stage12.2 - Cache-bust/runtime recovery hotfix (2026-07-06)

- Fixed a deployment/runtime regression where `src/**` and `assets/**` were served with immutable one-year caching while `index.html` kept the same `?v=1.4.0-dock-modal-state-machine` asset query across many patches.
- This could make a fresh `index.html` request new SRI hashes while the browser reused older cached JS/CSS, causing the browser to block scripts. Symptoms included file import not binding, Dock/player initialization failing, and the mobile quick panel not appearing.
- Bumped every local runtime asset query in `index.html` and `sw.js` to `?v=1.4.0-stage16-version-release`.
- Bumped the service worker cache name to `foxbear-shell-v1.4.0-stage16-version-release`.
- Versioned worker URLs in `src/config/app-runtime-config.js` so analysis/finalizer/encoder workers do not remain stuck behind immutable `/src/**` caching.
- Added SRI hashes to local CSS/JS tags that were missing integrity attributes.
- Added `qa/stage12_2_cache_bust_runtime_smoke.js` to prevent stale immutable asset query regressions.
- QA: `npm run check` passed 93/93.

## Stage13 runtime health notes

- Added a browser-side health monitor to detect problems that normal Node syntax QA cannot catch:
  - missing global modules after script loading,
  - missing critical file import/Dock DOM anchors,
  - local asset query-version mismatches.
- This is especially important because Firebase Hosting keeps `/src/**` and `/assets/**` immutable for one year.
- The monitor is loaded before `src/app.js` and does not block the app. It reports via `window.FoxBearRuntimeHealth`, `foxbear:runtime-health` events, console warnings, and `#importStatus` when the app has not already marked itself ready.
- Stage13 keeps runtime behavior conservative: no audio engine changes, no Dock layout rewrite, no file import logic rewrite.
