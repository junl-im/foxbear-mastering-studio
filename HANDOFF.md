## Stage18 - Settings persistence and state sync (2026-07-07)

- Added `src/settings/settings-service.js` with a versioned `foxbear-settings-v1.4.0` localStorage key.
- Restores settings during app boot before feature buttons and the mobile settings panel render.
- Persists ON/OFF settings when toggled: 화면유지 desired state, 진동피드백, 자동 하이라이트, A/B 루프, 레벨매칭, 차이듣기, 캐시자동정리, 성능가드, 안전점수.
- Added a `↩️ 설정초기화` action in the mobile settings panel to restore defaults without clearing audio files or exported downloads.
- Runtime Health now checks `FoxBearSettingsService.applyToContext` so a missing settings module is detected as a boot dependency.
- Bumped runtime asset queries and service worker cache to `1.4.0-stage18-settings-persistence`.
- Added `qa/stage18_settings_persistence_smoke.js`.

QA result: `npm run check` -> 101/101 PASS.

## Stage17 - Highlight compare listen sync hotfix (2026-07-06)

- Fixed the waveform compare popup listen buttons so preview-scope rows preserve the same absolute highlight start time for both original and master-preview playback.
- The original-side `원곡 듣기` button now starts from the stored highlight `startSec` instead of falling back to 0 seconds or the previous Dock position.
- The master-preview-side `하이라이트 듣기` button still starts at local 0 seconds, but its transport metadata keeps the same absolute highlight start for synced playhead and future mode switches.
- Added metadata-delayed seek handling so the correct section is applied after audio metadata loads on mobile browsers.
- Bumped runtime asset queries and service worker cache to `1.4.0-stage18-settings-persistence`.
- Added `qa/stage17_highlight_compare_sync_smoke.js` and updated legacy cache-stage smoke tests to accept Stage17.

QA result: `npm run check` -> 99/99 PASS.


## Stage16 - v1.4.0 Version Release
- Promoted the app from `v1.3.84` to `v1.4.0` after the Stage8-Stage15 runtime, Dock, settings-panel, cache/SRI, and modularization changes.
- Bumped `package.json`, visible app version, `APP_VERSION`, `SHARED_DSP_PROFILE_VERSION`, manifest metadata, asset query strings, service worker registration, and cache name to the `v1.4.0-stage16-version-release` line.
- Updated QA expectations so runtime version checks no longer pin the app to the old `1.3.84` label.
- Updated the overwrite package default to `v1.4.0-stage16` so generated ZIP names match the official release line.

## Stage16 handoff - Mobile settings panel refresh

### Why this patch exists

The former mobile quick panel overlapped conceptually with the Dock: it repeated original/mastered/phone/mono style playback controls while the user expected a settings surface. Stage16 converts it into a compact `⚙️ 설정` panel and keeps playback-mode controls in the Dock.

### What changed

- Floating mobile toggle is now `⚙️` and opens a panel titled `설정`.
- The panel no longer renders duplicate Dock playback controls such as original, smartphone, mono, download/share playback actions.
- Settings now show direct state badges: `ON` / `OFF`; action-only items show `추가`, `실행`, or `대기`.
- Settings map to existing app state through `toggleUtilityFeature()` where possible:
  - 자동 하이라이트, A/B 루프, 레벨매칭, 차이듣기, 캐시자동정리, 성능가드, 안전점수.
  - 앱추가, 화면유지, 진동피드백, 저장보호, 분석캐시정리, 재생복구 remain native/mobile actions.
- Runtime asset query and service worker cache use `1.4.0-stage16-version-release`.
- QA guard: `qa/stage16_mobile_settings_panel_smoke.js`.

### Manual checks

1. Mobile: confirm the Dock still owns 원음/스마트폰/노트북/모노 controls.
2. Mobile: tap `⚙️`; confirm the settings panel opens with no extra status/result rows at the top.
3. Toggle settings and confirm the badge changes between `ON` and `OFF`.
4. Confirm `앱추가` uses an action badge, not an ON/OFF toggle unless already installed.

## Stage14 handoff - Runtime recovery / early load diagnostics

### Why this patch exists

After cache/SRI issues, a normal syntax QA pass was not enough: if a browser blocks a script or stylesheet during real page load, file import and the mobile quick panel can disappear before app code runs. Stage14 moves the runtime health monitor to the earliest practical head position and gives the user a visible recovery path.

### What changed

- `src/boot/runtime-health.js` now loads before ordinary CSS and before all app modules.
- The monitor listens for resource load failures in capture phase, so blocked JS/CSS/image requests can be reported.
- A new recovery panel appears when module/global/DOM/version/resource/boot-stall problems are detected.
- Recovery actions: fresh reload, clear FoxBear shell caches and unregister service workers, copy report.
- New CSS layer: `assets/css/boot/runtime-health.css`.
- All runtime asset queries, service worker registration, and `CACHE_NAME` now use `1.4.0-stage16-version-release`.
- QA guard: `qa/stage14_runtime_recovery_smoke.js`.

### Caution

Do not move `runtime-health.js` back below the app modules. It is intentionally synchronous and early so it can see SRI/cache failures that happen before `src/app.js` executes.

# Stage12 handoff - Detail view module split

## Why this patch exists

`src/app.js` still owned the selected-track detail panel after the recommendation and download splits. Stage12 moves the detail panel rendering layer into `src/ui/detail-view.js` while keeping the same public wrapper names in `src/app.js`. This keeps runtime behavior stable and reduces the main app file without touching audio import, Dock waveform, or mastering engine logic.

## What changed

- New file: `src/ui/detail-view.js`.
- The detail view module now owns `renderDetail()`, detail expand/collapse state helpers, the master-preview quick bar, the AI mastering card, and the AI metric DOM helper.
- `src/app.js` now has `getDetailView()` / `getDetailViewDeps()` plus thin wrappers for the old function names.
- `index.html` loads `detail-view.js` after `waveform-compare-view.js` and before `src/app.js`.
- `sw.js` precaches `detail-view.js` and uses the stage12 cache name.
- Overwrite packages remain cumulative.

## QA

```bash
npm run check
# Expected: 91/91 PASS
```

## Manual checks

1. Import one track and confirm no `getWaveformMarkerForIndex` regression.
2. Select a track and confirm the detail panel title, compact summary, and status pill render.
3. Toggle 분석 상세보기/닫기 on mobile and desktop.
4. Confirm AI mastering card buttons still apply recommendations and start AI mastering.
5. Confirm master-preview quick bar still creates/plays the 15-second highlight.

## Next patch candidate

Next large-but-safe target: extract additional detail subpanels (`quality gate`, `master report`, `engine safety`, `comparison panels`) into `src/ui/detail-panels-view.js`, or split `assets/css/components/forms.css` and `cards.css`.

---

# Stage11.1 handoff - Runtime waveform marker and mobile Dock overlay hotfix

## Why this patch exists

After the Stage11 split, importing audio could crash the Dock renderer with `getWaveformMarkerForIndex is not defined`. The helper had effectively become local to the waveform compare module while the Dock waveform path in `src/app.js` still called it directly. Mobile users also reported that toast/HUD/quick-panel controls were still visually detached from the Dock, and the quick panel had an extra side status/result chip.

## What changed

- `src/utils/core-utils.js` now exports `getWaveformMarkerForIndex()` and a compatibility alias `getWaveformMarkerForlndex`.
- `src/app.js` imports the shared helper and uses measured Dock height for mobile floating offsets.
- Mobile floating gaps are now 1px for toast/HUD and 4px for panel calculations.
- `src/ui/mobile-native-view.js` removes the side status chip and upgrades quick action labels to compact icon labels.
- `assets/css/mobile-native.css` pins the quick panel to the Dock, hides any legacy status chip, and aligns the close button with the download/options close style.
- `assets/css/dock.css` adds a final Stage11.1 mobile overlay anchor layer for toast, HUD, download hints, and stacked toasts.
- `sw.js`, SRI, package QA, and docs were updated.

## QA

```bash
npm run check
# Passed: 89/89
# Failed: 0/89
```

## Manual checks

1. Mobile and PC: import one audio file and confirm Dock waveform renders without `getWaveformMarkerForIndex` errors.
2. Mobile: confirm toast, notification, processing HUD, and quick panel controls sit just above the Dock instead of floating far away.
3. Mobile: confirm only the quick panel icon remains beside the Dock; the side status/result chip is gone.
4. Mobile: open the quick panel and confirm icon grid layout and close button match the other popups.
5. Confirm Stage11 recommendation and base component split still works.

## Next patch candidate

Once this runtime hotfix is confirmed, continue with `src/ui/detail-view.js` extraction or a second CSS component split.

---

# Stage11 handoff - Large modular renovation

## Why this patch exists

The app is stable, but `src/app.js` and `assets/css/studio.css` were still carrying too much responsibility. Stage11 performs a larger structural renovation without changing the core audio engine behavior: recommendation logic and base component CSS are moved into dedicated modules while old function names and CSS ordering stay compatible.

## What changed

- New file: `src/recommendation/recommendation-engine.js`.
- `src/app.js` now delegates `recommendPreset()`, `safeRecommendPreset()`, `extractGenreFeatures()`, recommendation explainability, and candidate explanation helpers to `window.FoxBearRecommendationEngine`.
- New file: `assets/css/components/base-components.css`.
- Early base component rules were moved from `assets/css/studio.css` into the new component layer.
- `studio.css` remains loaded after `base-components.css` and now acts as the legacy override / late-stage hotfix layer.
- `index.html` loads `base-components.css` after `layout.css` and loads `recommendation-engine.js` after `core-utils.js`, before `app.js`.
- `sw.js` precaches the new modules and uses the stage11 cache name.
- Overwrite packages remain cumulative.

## QA

```bash
npm run check
# Passed: 88/88
# Failed: 0/87
```

## Manual checks

1. Import a track and confirm AI preset recommendation still appears.
2. Open the recommendation popup and confirm reasons/chips/candidate explanations still render.
3. Apply AI recommendation and confirm sliders/selected preset update.
4. Confirm upload card, track cards, buttons, stats, toast, and mobile responsive layout still look unchanged.
5. Confirm latest overwrite ZIP alone includes `src/recommendation/` and `assets/css/components/`.

## Next patch candidate

Next high-impact target is extracting `src/ui/detail-view.js` or splitting additional CSS into `assets/css/components/forms.css`, `cards.css`, and `panels.css`.

---

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

- 기준 버전: `1.4.0` Stage7 패치 누적본
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


## Stage12.1 handoff - Dock UI repair

### Why this hotfix exists

After Stage12, the Dock integrated waveform player could visually collapse: the peak waveform was pushed toward the right, runtime text could drop to a lower implicit grid row, and the file-info genre/compare chip could wrap below the title. The immediate cause was overlapping legacy Dock CSS selectors, especially `.bottom-preview-player .player-time`, competing with the newer integrated waveform player layout.

### What changed

- New final CSS layer: `assets/css/dock-ui-repair.css`.
- Explicit Dock player placement:
  - desktop: waveform + source/time column, integrated mini-toggle hidden because the large Dock play button is visible;
  - mobile: mini-toggle + full-width waveform + compact source/time column.
- Reset `.player-time.dock-integrated-time` grid placement to avoid implicit grid columns/rows.
- Kept file info in a compact title/genre/compare row and hid the secondary compare-chip subtitle in Dock.
- Quick panel phone action is now `📱 스마트폰`.
- Dock controls now use compact emoji labels.

### QA guard

`qa/stage12_1_dock_ui_repair_smoke.js` verifies the new repair layer, cache bump, smartphone label, emoji labels, and one-line Dock layout protections.

### Next caution

Do not remove `dock-ui-repair.css` until older Dock rules in `studio.css` and `dock.css` are fully consolidated. It is intentionally loaded last to override the accumulated legacy Dock rules safely.

## Stage12.2 - Cache-bust/runtime recovery hotfix (2026-07-06)

- Fixed a deployment/runtime regression where `src/**` and `assets/**` were served with immutable one-year caching while `index.html` kept the same `?v=1.4.0-dock-modal-state-machine` asset query across many patches.
- This could make a fresh `index.html` request new SRI hashes while the browser reused older cached JS/CSS, causing the browser to block scripts. Symptoms included file import not binding, Dock/player initialization failing, and the mobile quick panel not appearing.
- Bumped every local runtime asset query in `index.html` and `sw.js` to `?v=1.4.0-stage16-version-release`.
- Bumped the service worker cache name to `foxbear-shell-v1.4.0-stage16-version-release`.
- Versioned worker URLs in `src/config/app-runtime-config.js` so analysis/finalizer/encoder workers do not remain stuck behind immutable `/src/**` caching.
- Added SRI hashes to local CSS/JS tags that were missing integrity attributes.
- Added `qa/stage12_2_cache_bust_runtime_smoke.js` to prevent stale immutable asset query regressions.
- QA: `npm run check` passed 93/93.

## Stage13 handoff - Runtime health / cache safety hardening

### Why this patch exists

Recent regressions were hard to distinguish between actual app logic failures and browser-side asset blocking caused by immutable cache/SRI mismatches. Stage13 adds a small runtime health layer so missing modules, stale asset versions, or broken boot wiring become visible near the import status instead of silently disabling file import or the mobile quick panel.

### What changed

- New module: `src/boot/runtime-health.js`.
- `index.html` loads it after all shared modules and before `src/app.js`.
- `sw.js` precaches the module and uses `foxbear-shell-v1.4.0-stage16-version-release`.
- `src/config/app-runtime-config.js`, `index.html`, `sw.js`, and service worker registration now use `1.4.0-stage16-version-release`.
- `src/app.js` calls `FoxBearRuntimeHealth.markAppReady()` after successful boot and `markBootFailed(error)` on critical init failure.
- `qa/stage13_runtime_health_smoke.js` locks this wiring so future patches cannot accidentally ship stale query strings or omit the health monitor.

### Caution

Do not remove the runtime health script while `/src/**` and `/assets/**` are served with immutable cache headers. It is intentionally non-blocking and only warns when module/global/asset-version problems are detected.

### QA

Run `npm run sri:update` after modifying any loaded asset, then run `npm run check`.
