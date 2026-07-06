# Stage10 handoff - Download service split

## Why this patch exists

Download behavior had grown across `src/app.js` and the download dialog view. That made it harder to reason about in-app browser restrictions, Web Share support, filename normalization, and the download assist panel. Stage10 moves the download service logic into a dedicated module while preserving the existing app wrappers.

## What changed

- New file: `src/download/download-service.js`.
- `src/app.js` now keeps thin wrappers for `getDownloadEnvironmentInfo()`, `getDownloadFormatOptions()`, `prepareTrackDownloadBlob()`, `downloadBlob()`, `showDownloadAssist()`, and related helpers.
- The new service owns environment detection, format options, alternate-format encoding preparation, Web Share support checks, File System Access saving, external-browser fallback, filename normalization/sanitization, Object URL revocation, and the download assist panel.
- `index.html` loads `src/download/download-service.js` before `src/ui/download-dialog-view.js` and `src/app.js`.
- `sw.js` precaches the new service and uses the stage10 cache name.
- Overwrite packages remain cumulative. The latest overwrite ZIP should be safe to apply without replaying every previous stage.

## QA

```bash
npm run check
# Passed: 86/86
# Failed: 0/85
```

## Manual checks

1. PC: complete mastering and download WAV/MP3 from the options dialog.
2. Mobile/in-app browser: open download options and confirm the save/share assist panel still appears.
3. Confirm `앱 비동기 오류` does not appear for normal mobile playback interruption cases from Stage8.
4. Confirm latest overwrite ZIP includes `src/`, `assets/`, `qa/`, `tools/`, workflows, and docs.

## Next patch candidate

Continue with `assets/css/components/` split or begin extracting `src/ui/detail-view.js` from the remaining large `src/app.js` render-detail logic.

---

# Stage9.1 handoff - Cumulative overwrite packaging hotfix

## Why this patch exists

The Stage9 full ZIP contained the Stage8 async playback/import guard and mobile Dock overlay fixes. However, the Stage9 overwrite ZIP was delta-only and did not include `src/app.js` or `assets/css/mobile-native.css`. If a user applied Stage9 overwrite directly on top of Stage7.2, the Stage8 fixes were not actually installed.

## What changed

- Added `tools/create-overwrite-zip.sh`.
- Added `npm run package:overwrite`.
- Overwrite packages are now cumulative, not delta-only. This is the new 누적 덮어쓰기 packaging rule. They include:
  - `src/`
  - `assets/`
  - `vendor/`
  - `qa/`
  - `tools/`
  - `.github/workflows/`
  - root runtime/deploy/docs files
- Bumped the service worker cache to stage9.1 to force client refresh.
- Added `qa/stage9_1_cumulative_overwrite_manifest_smoke.js`.

## QA

```bash
npm run check
# Passed: 84/84
# Failed: 0/84
```

## Manual checks

1. Apply only the latest Stage9.1 overwrite ZIP on top of a Stage7.2 tree.
2. Confirm `src/app.js` contains `handleUnhandledRejection`, `isBenignPlaybackRejection`, and the async `runInitStep()` guard.
3. Confirm mobile Dock toast/wake-lock/status UI sits close to the Dock.
4. Confirm Dock waveform still renders using `assets/css/dock-waveform.css`.

## 다음 패치 후보

Continue with `src/download/` module separation after this hotfix is deployed cleanly.

---

# Stage9 handoff - Dock waveform CSS split

## Why this patch exists

Dock waveform/timeline styling had accumulated inside `assets/css/dock.css` alongside broader Dock layout, toast anchors, mobile text repair, and modal z-index fixes. After Stage7 moved compare-popup styles into `waveform-compare.css`, the next safe split was to give Dock waveform styles their own layer.

## What changed

- New file: `assets/css/dock-waveform.css`.
- `dock.css` no longer owns `.bottom-preview-waveform`, `.bottom-waveform-bars`, `.dock-integrated-waveform-bars`, `.dock-integrated-waveform-hot`, or `.dock-integrated-waveform-clip`.
- `dock-waveform.css` owns the Dock timeline model, touch seek cursor, progress gradient, integrated waveform visual contrast, and 1px live playhead line plus small cap.
- `index.html` loads CSS in this order: `dock.css`, `dock-waveform.css`, `waveform-compare.css`.
- `sw.js` precaches `dock-waveform.css` and uses the stage9 cache name.
- Existing waveform QA scripts were updated to inspect the dedicated waveform layer.
- Added `qa/stage9_dock_waveform_css_split_smoke.js`.

## QA

```bash
npm run check
# Passed: 83/83
# Failed: 0/83
```

## Manual checks

1. PC: import a song and confirm the Dock waveform renders and the playhead moves.
2. PC: use Dock waveform seek/click and confirm playback jumps to the expected position.
3. Mobile: confirm Dock waveform/timeline still fits after the Stage8 compact overlay hotfix.
4. Compare popup: confirm its popup waveform styling is unchanged because `waveform-compare.css` still loads last.

## 다음 패치 후보

1. `src/download/` 분리: download environment, format options, blob preparation service/view 분리.
2. `assets/css/components/` 분리: buttons/forms/cards/panels 순서로 `studio.css` legacy 영역 축소.
3. `src/ui/detail-view.js` 분리: detail panel/rendering logic을 `app.js`에서 분리.

---

# Stage8 handoff - Async playback/import guard + compact mobile Dock overlays

## Why this patch exists

Users could see `앱 비동기 오류` after importing audio or trying to use the player, especially on mobile/in-app browsers. Some of these were not real app crashes: they were browser playback Promise interruptions such as autoplay blocking, pause/load race, or async init rejections that were not classified cleanly. Mobile Dock-related floating UI was also visually too far above the Dock.

## What changed

- `window.unhandledrejection` now routes through `handleUnhandledRejection()`.
- `isBenignPlaybackRejection()` classifies common playback Promise interruptions and shows a Dock playback hint instead of reporting a full app async error.
- `runInitStep()` now attaches `.catch()` to returned Promises so async init failures use the same non-fatal status path as sync failures.
- The analysis error handler now catches secondary render/report failures.
- `syncBottomPreviewFloatingOffset()` uses tighter mobile gaps: floating/HUD gap 4px, panel gap 10px.
- `assets/css/dock.css` and `assets/css/mobile-native.css` include Stage8 mobile compact overlay anchors.
- `sw.js` cache name is bumped to stage8.

## QA

```bash
npm run check
# Passed: 82/82
# Failed: 0/82
```

## Manual checks

1. Mobile: import an audio file and verify that the Dock/player appears after the file is registered.
2. Mobile: tap Dock play once if the browser blocks autoplay; the status should mention playback guidance, not `앱 비동기 오류`.
3. Mobile: confirm toast, screen-keep/wake-lock status, quick panel, and processing HUD sit close to the Dock.
4. PC: confirm existing Dock layout is unchanged.

## Next patch candidate

Continue Stage8/Stage9 with `assets/css/dock-waveform.css` separation once this hotfix is deployed cleanly.

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

