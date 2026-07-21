# Handoff - v1.5.57

## v1.5.57 handoff focus

- Open program info, feature, preview, admin, download, AI recommendation, save assist, and enhanced select dialogs.
- Confirm every top-right close control has the same circular geometry, inset, icon weight, hover state, and keyboard focus ring.
- Confirm feature and preview controls no longer drift with header layout.
- Confirm AI, download, and save-assist dialogs close with Escape and restore focus to the previous control.
- Confirm active download conversion keeps its close control disabled until cancellation or completion.

## v1.5.52 handoff focus

- Confirm static and browser release gates run as parallel GitHub Actions jobs.
- Confirm a newer push cancels the older Pages workflow for the same ref.
- Confirm Playwright browser cache is restored and failed browser diagnostics are uploaded only on failure.
- Confirm the build artifact waits for both QA jobs before deployment.

## v1.5.51 handoff focus

- Confirm `runtime-health.js` and `service-worker-recovery-service.js` load exactly once with the current asset generation.
- Confirm `index.html`, runtime config, service worker precache, and release metadata all use v1.5.51.
- Confirm stale v1.5.49 or v1.5.50 local asset generations fail release validation.
- Run the full static suite and the PWA Playwright test in GitHub Actions.
## v1.5.45 handoff focus

- Start `곡별 순차 저장`, pause it, and confirm the current file cannot be delivered until `저장 계속` is pressed.
- Move the app to the background and return; confirm the current file remains selected and no automatic save prompt opens.
- Simulate storage and permission failures and confirm targeted recovery guidance remains visible.
- Complete or cancel the queue and confirm pending service-worker activation is no longer blocked.

```text
product: 1.5.45
build: export-queue-recovery
asset generation: 1.5.45-export-queue-recovery
service worker cache: foxbear-shell-v1.5.45-export-queue-recovery
```


## v1.5.44 handoff focus

- Complete two or more tracks and confirm `곡별 순차 저장` prepares the list without starting automatic downloads.
- Confirm each `다음 파일 저장` click delivers exactly one file and advances only after success.
- Dismiss a file picker and confirm the same file remains retryable; then test skip and queue cancel.
- In Kakao or another restricted browser, confirm the queue uses file sharing only when `navigator.canShare({files})` accepts every queued file.
- Keep the queue active and confirm mastering, ZIP creation, queue clearing, and service-worker activation remain blocked.

```text
product: 1.5.44
build: export-queue-gesture-safety
asset generation: 1.5.44-export-queue-gesture-safety
service worker cache: foxbear-shell-v1.5.44-export-queue-gesture-safety
```

## v1.5.43 handoff focus

- Confirm the ZIP button opens the export progress panel and starts one Worker job.
- Remove the ZIP service script locally and confirm Runtime Health reports the missing module instead of a silent click.
- Run SRI update twice and confirm every local asset tag still has exactly one integrity attribute.
- Create the overwrite ZIP, extract it, and confirm required runtime entry assets are loaded exactly once.
- Create a large ZIP and compare peak memory against v1.5.42; capable browser workers should avoid eager full-file copies.

```text
product: 1.5.43
build: export-pipeline-integrity
asset generation: 1.5.43-export-pipeline-integrity
service worker cache: foxbear-shell-v1.5.43-export-pipeline-integrity
```

## CI install rule

- GitHub Actions must use `npm ci --ignore-scripts`.
- `package.json` must not define `prepare` for Git hook installation.
- Local hooks are optional and installed manually with `npm run hooks:install`.
- The overwrite archive must include `.githooks/pre-commit`, but its absence must still never break `npm ci`.

## v1.5.36 handoff focus

- In Chrome/Edge, select the already-generated format and confirm Share opens from the first click without a permission error.
- Select a different MP3/WAV format and confirm conversion completes, then the save-assist Share button works on the second explicit click.
- Use Direct Save and confirm the file picker opens before any asynchronous validation delay.
- Open and replace the save-assist panel repeatedly, close it, and confirm no stale Blob URL keeps the exit warning active.
- Start mastering on one track while completing a download action on another and confirm the download does not clear the mastering busy state.
- Navigate away and restore with browser back/forward cache, then confirm the exit guard and back confirmation still operate normally.

## Current patch: v1.5.36 Interaction lifecycle hardening

```text
product: 1.5.36
build: interaction-lifecycle-hardening
asset generation: 1.5.36-interaction-lifecycle-hardening
service worker cache: foxbear-shell-v1.5.36-interaction-lifecycle-hardening
```

Verification:

```bash
npm ci
npm run version:check
npm run handoff:check
npm run check
npm run qa:browser
npm run package:all
npm run package:verify:release
npm run package:verify:overwrite
```

## Previous handoff: v1.5.27 device glyph and SRI hardening

v1.5.22 header signature and uninterrupted preview routing

Changes:

- Converts the version/device/designer header cards into compact borderless engraved labels and shrinks the Settings trigger so the top copy does not wrap downward.
- Adds a persistent four-path Web Audio translation graph for studio, phone, laptop, and mono playback.
- Switches translation modes by crossfading gain paths without replacing the active audio element or restarting playback.
- Keeps translation contexts under `FoxBearAudioContextManager` ownership and closes them with the player lifecycle.
- Adds static and simulated routing coverage in `qa/v1522_header_preview_routing_smoke.js`.

```text
product: 1.5.22
build: header-preview-routing-polish
asset generation: 1.5.22-header-preview-routing-polish
service worker cache: foxbear-shell-v1.5.22-header-preview-routing-polish
```

Verification:

```bash
npm ci
npm run version:check
npm run handoff:check
npm run check
npm run qa:browser
npm run package:all
npm run package:verify:release
npm run package:verify:overwrite
```

Expected static result: `204/204 PASS`.

## Previous handoff: v1.5.21 History and CSP Console Contract Fix

The v1.5.21 CSP and history-sentinel fixes remain included.

## Previous handoff: v1.5.20 Idempotent PWA Cache Warm

The v1.5.20 cache warm fetches only missing current-cache assets, reports cache hits, and requires the repeated warm path to perform zero additional fetches.

## Previous handoff: v1.5.19 CI Runtime Isolation and Package Hardening


Changes:

- Playwright replaces optional Firebase CDN modules with deterministic local E2E modules, removing external-network console noise from the core runtime test.
- Same-origin request failures, uncaught page exceptions, and application console errors are asserted separately with their actual values in the failure message.
- The local Python server exposes a unique ownership probe; an occupied port or exited server process now fails before Playwright starts.
- History QA requires both backward and forward navigation and no longer catches and discards navigation failures.
- `version:sync` owns the versioned Release/Overwrite verification script filenames.
- Archive verification rejects symlinks, unsafe ZIP paths, scratch audit text, temporary files, traces, logs, nested ZIPs, and browser-result trees.
- `qa/v1519_ci_runtime_isolation_packaging_smoke.js` protects these contracts.

```text
product: 1.5.19
build: ci-runtime-isolation-package-hardening
asset generation: 1.5.19-ci-runtime-isolation-package-hardening
service worker cache: foxbear-shell-v1.5.19-ci-runtime-isolation-package-hardening
```

Verification:

```bash
npm ci
npm run version:check
npm run handoff:check
npm run check
npm run qa:browser
npm run package:all
npm run package:verify:release
npm run package:verify:overwrite
```

Expected static result: `199/199 PASS`.

## Previous handoff: v1.5.18 CI Diagnostics and PWA Readiness

The v1.5.18 service-worker readiness and concise failure diagnostics remain included.

## Previous handoff: v1.5.17 Browser Contract Fix

The v1.5.17 manual Wake Lock, Trusted Types service-worker registration, and header order corrections remain included.

## Previous handoff: v1.5.16 E2E Static Server Pipe Deadlock Fix


## Maintainer workflow

The project owner applies patches and commits with **GitHub Desktop**. Extract the cumulative overwrite ZIP into a temporary folder, copy its contents into the repository root, review the changed root files, commit, push, and inspect the GitHub Actions release gate.

## Current patch: E2E static-server pipe deadlock fix

The release gate failure was not an application boot defect. `qa/browser/run-browser-e2e.js` started Python's static server with piped stdout/stderr, then launched Playwright with `spawnSync`. While the synchronous child ran, the parent Node event loop could not drain those pipes. After enough HTML/CSS/JS requests, Python blocked while writing access logs, and all later Playwright navigations timed out at `domcontentloaded`.

Changes:

- Playwright now runs through an awaited asynchronous child process.
- The local server's output buffer is bounded to the latest 256 KiB.
- Browser failures print the static server diagnostic tail.
- `qa/v1516_e2e_server_pipe_deadlock_smoke.js` sends 1,800 requests during an asynchronous child run and verifies the final request and a follow-up request succeed.
- The overwrite ZIP is cumulative and includes all v1.5.7-v1.5.16 runtime, QA, workflow, and packaging files.

```text
product: 1.5.16
build: e2e-server-pipe-deadlock-fix
asset generation: 1.5.16-e2e-server-pipe-deadlock-fix
service worker cache: foxbear-shell-v1.5.16-e2e-server-pipe-deadlock-fix
```

Verification:

```bash
npm ci
npm run version:check
npm run handoff:check
npm run check
npm run qa:browser
npm run package:all
```

Expected static result: `196/196 PASS`. Browser PASS must be confirmed in GitHub Actions when Chromium is available.

## Previous handoff: v1.5.13 Handoff Package Integrity

## Root cause of the 188/189 CI failure

The v1.5.12 handoff correctly stated that CI Playwright workers were capped at two, but the cumulative overwrite ZIP did not include `playwright.config.js`. Applying that ZIP therefore delivered `qa/v1512_ci_runtime_readiness_smoke.js` while leaving the repository's v1.5.11 Playwright config unchanged. The smoke test correctly failed because the transferred code and transferred configuration were inconsistent.

This was a delivery-package defect, not an undocumented runtime decision.

### v1.5.13 changes

- `tools/create-overwrite-zip.sh` now copies `playwright.config.js`.
- Every overwrite archive is verified after creation by `tools/verify-overwrite-zip.js`.
- Required root config, both Pages workflows, browser helpers, QA, tools, runtime sources, and assets must exist in the produced ZIP.
- `node_modules`, browser results, test results, and report trees are rejected.
- The CI worker regression test now loads the effective Playwright config with `CI=true` and accepts only 1-2 workers instead of depending on one exact source-code spelling.

```text
product: 1.5.13
build: handoff-package-integrity
asset generation: 1.5.13-handoff-package-integrity
service worker cache: foxbear-shell-v1.5.13-handoff-package-integrity
```

Verification:

```bash
npm ci
npm run version:check
npm run check
npm run package:overwrite
node tools/verify-overwrite-zip.js dist/foxbear-mastering-studio-v1.5.13-overwrite.zip
npm run qa:browser
```

Expected static result: `191/191 PASS`. Browser PASS must be confirmed by GitHub Actions.

## Previous handoff: v1.5.12 CI Runtime Readiness and Node 24 Actions

### v1.5.12 changes

The v1.5.11 browser gate still raced because `waitForRuntimeHealth()` only waited for the Runtime Health object, not for `appReady`. v1.5.12 waits for the application-owned ready state, reports the last health snapshot on timeout, waits explicitly for an active service worker, creates fresh Wake Lock sentinels, and caps CI Playwright workers at two.

GitHub workflow actions were migrated to `actions/checkout@v6`, `actions/setup-node@v6`, and `actions/upload-artifact@v6` for Node 24 runtime compatibility.

```text
product: 1.5.12
build: ci-runtime-readiness
asset generation: 1.5.12-ci-runtime-readiness
service worker cache: foxbear-shell-v1.5.12-ci-runtime-readiness
```

Verification:

```bash
npm ci
npm run version:check
npm run check
npm run qa:browser
```

Expected static result: `189/189 PASS`. Browser PASS must be confirmed by GitHub Actions.

## Previous handoff: v1.5.11 AudioContext Lifecycle and CI Navigation Stability


## What changed

- Web Audio contexts are created and released through `FoxBearAudioContextManager`.
- Realtime preview, difference A/B, translation preview, spectrum, and decode contexts report purpose/state diagnostics and close on owner disposal or page hide.
- Playwright navigation now waits for `domcontentloaded` and then FoxBear Runtime Health instead of waiting for global network idleness.
- Browser navigation has a 20-second ceiling, local proxy bypass values are normalized, and GitHub Actions uploads browser artifacts after failures.

## CI failure fixed

The previous 10-test failure stopped at each `page.goto()` call because `waitUntil: 'networkidle'` could not complete while optional Firebase/PWA traffic remained active. The browser suite now waits for the application-owned readiness signal.

## Verification

```bash
npm ci
npm run version:check
npm run check
npm run qa:browser
```

Expected static result: `188/188 PASS`.

Release metadata:

```text
product: 1.5.11
build: audio-context-ci-stability
asset generation: 1.5.11-audio-context-ci-stability
service worker cache: foxbear-shell-v1.5.11-audio-context-ci-stability
```

## Previous patch: v1.5.10 Header Settings Relocation

The top-right Settings layout and viewport-safe panel positioning remain active.

## Previous patch: v1.5.9 Version Display and Cache Recovery

The runtime-bound version labels, manifest synchronization, navigation no-store recovery, and service-worker generation diagnostics remain active.

## Archived v1.5.9 handoff details
## What changed

- The top version badge and program-info version are synchronized at runtime from generated `FoxBearBuildInfo` by `FoxBearReleasePresentation`.
- PWA manifest description now follows the current product version/build ID.
- Service-worker navigation bypasses the HTTP cache before falling back offline, reducing stale HTML after deployment.
- The page can query the active service worker with `FOXBEAR_GET_RELEASE_INFO` and compare cache/asset generations.
- Update Safety no longer carries a stale v1.5.6 patch ID.
- Release synchronization removes the active cache name from `LEGACY_CACHE_NAMES`.

## Verification

```bash
npm ci
npm run version:check
npm run check
npm run qa:browser
```

Expected static result: `185/185 PASS`.

Deployment console checks:

```js
FoxBearReleasePresentation.getReport()
await FoxBearReleasePresentation.requestServiceWorkerReleaseInfo()
FoxBearUpdateSafety.getReport()
```

## Previous handoff: v1.5.8 PCM and ZIP Memory Hardening


## What changed

- Completed `masteredBuffer` PCM is released by default after encoding and after the track is marked `done`.
- `outBlob`, `masteredUrl`, reports, waveform overview, and download state remain available.
- The download dialog disables formats that would require a released PCM buffer instead of silently serving the wrong/current format.
- ZIP export force-releases PCM before planning, uses JSZip `STORE` with `streamFiles`, and estimates a browser working-set ceiling.
- Unsafe low-memory/mobile ZIP attempts stop before allocation and open the per-track download recovery path.

## Verification

```bash
npm ci
npm run version:check
npm run check
npm run qa:browser
```

Expected static result: `183/183 PASS`.

Manual large-batch checks:

```js
FoxBearMemoryGuard.getSnapshot()
FoxBearExportGuard.getReadiness()
FoxBearExportGuard.getDiagnostics()
```

The expected completed-master snapshot is `masteredBufferCount: 0` unless a future feature explicitly opts into the bounded re-encode cache.

## Previous handoff: v1.5.7 Release Foundation Cleanup

### Current status

Latest product release: `v1.5.7`; build ID `release-foundation-cleanup`; asset generation `1.5.7-release-foundation`; service worker cache `foxbear-shell-v1.5.7-release-foundation`.

Release workflow:

```bash
npm ci
npm run qa:browser:install
npm run check:release
```

Durable rules are in `STATUS.md`; version semantics are in `VERSIONING.md`; release steps are in `RELEASE_CHECKLIST.md`. Dock FFT remains intentionally removed per `docs/decisions/0001-dock-fft-removal.md`.

Compatibility note: previous maintenance layers `v1.5.5 Update Safety`, `v1.5.4 Boot SRI Recovery`, `v1.5.3 Bulk HUD Visibility + Inline Master All`, and `v1.5.2 Export Guard + Low Memory UX` remain carried forward.

The previous Bulk HUD asset/close-button hotfix, Bulk Mastering HUD continuity patch, v1.4.27 release cleanup, v1.4.28 app-slimdown orchestration split, v1.4.29 Memory Stabilization, v1.5.0 Engine Quality Gate, and v1.5.1 browser automation carry-forward are active.


## v1.5.6 export progress recovery

- Added `src/download/export-progress-view.js` and the `FoxBearExportProgressView` browser global.
- Added a visible ZIP/export progress panel under the main action buttons with readiness checklist, progress bar, completion state, and failure state.
- `downloadZip()` now updates the panel during `JSZip.generateAsync()` and surfaces validation failures with `곡별 다운로드 위치 보기`.
- The panel dispatches `foxbear:export-show-track-downloads`, and `src/app.js` focuses the first completed track download action as a safe fallback path.
- Boot-critical scripts now use `h=boot-sri-v156`; `update-safety-service.js` uses `h=update-safety-v156`.
- Service worker cache generation is now `foxbear-shell-v1.5.6-export-progress-recovery`, with v1.5.5 listed as a legacy cache generation.
- Static QA added: `qa/v156_export_progress_recovery_smoke.js`.


## v1.5.5 update safety

- Added `src/boot/update-safety-service.js` and the `FoxBearUpdateSafety` browser global.
- `FoxBearUpdateSafety.getReport()` inventories local assets, verifies boot-critical cache-bust keys, reports SRI/load-block risk from Runtime Health, and returns a recovery plan.
- Boot-critical scripts now use `h=boot-sri-v155`; `update-safety-service.js` uses `h=update-safety-v155`.
- Service worker cache generation is now `foxbear-shell-v1.5.5-update-safety`, with v1.5.4 listed as a legacy cache generation.
- Runtime Health recovery now also sends `FOXBEAR_PURGE_CACHES` to active service workers before unregistering and reloading.
- Service worker script/style fetches with patch-bust keys use network-first no-store handling to reduce stale JS/CSS fallback risk.
- Static QA added: `qa/v155_update_safety_asset_health_smoke.js`.

## v1.5.4 boot SRI recovery

- Added fresh boot cache-bust keys (`h=boot-sri-v154`) to `runtime-health.js`, `performance-diagnostics.js`, and `app.js`.
- Bumped the service worker shell cache generation to `foxbear-shell-v1.5.4-boot-sri-recovery` so stale shell entries cannot satisfy the new boot-critical script URLs.
- Strengthened Runtime Health `캐시 초기화 후 재시도` to clear `foxbear-*`, `workbox-*`, and `precache-*` caches, request service worker update, unregister service workers, and then reload with a fresh URL.
- Added `qa/v154_boot_sri_recovery_smoke.js` to lock boot script SRI/cache-bust alignment.

## v1.5.3 bulk HUD visibility and inline full-mastering action

- The large bulk HUD no longer uses the confusing `접기` copy; the control now says `숨김` and hides the whole current bulk HUD batch.
- A small `보이기` button is created beside the floating settings gear and is only visible when the current bulk HUD batch was hidden but can still be restored.
- The large HUD now includes `전체 마스터링`, delegating to the existing main full-mastering button so behavior stays identical.
- Changed assets use targeted cache-bust keys: `bulk-hud-v153`, `bulk-hud-restore-v153`, and `ui=v153`; the service worker precache mirrors those keys.
- Static QA added: `qa/v153_bulk_hud_visibility_masterall_smoke.js`.

## v1.5.2 export guard and low-memory UX

- `src/download/export-guard-service.js` now owns ZIP/export readiness planning, generated ZIP Blob validation, memory-pressure classification, and export diagnostics.
- `downloadZip()` calls Export Guard before creating the ZIP and validates the generated Blob before triggering download.
- `FoxBearExportGuard.getReadiness()` exposes completed count, output bytes, estimated ZIP bytes, memory pressure, and warnings from the browser console.
- `FoxBearExportGuard.getDiagnostics()` keeps recent ZIP plan/validation events for manual debugging.
- The post-batch memory sweep now warns when pressure remains medium/high so users can choose per-track downloads before a large ZIP export.
- The 35-track Playwright deep scenario now checks Export Guard readiness before clicking ZIP export.

## v1.5.1 browser QA automation

- `playwright.config.js` now defines desktop Chromium and mobile PWA-style Chromium projects.
- `qa/browser/run-browser-e2e.js` starts a local static server before invoking Playwright, so `npm run qa:browser` can be run from the project root.
- `qa/browser/helpers/foxbear-e2e-helpers.js` provides synthetic WAV generation, Runtime Health assertions, Wake Lock mocking, service worker snapshots, and static server utilities.
- `qa/browser/runtime-health-playwright.spec.js` checks browser boot, Runtime Health, resource failures, missing globals/DOM ids, asset version mismatches, runtime errors, and console errors.
- `qa/browser/pwa-back-wakelock-sw-playwright.spec.js` covers PWA back/forward resilience, mocked Wake Lock request/release, and service worker update registration.
- `qa/browser/bulk-35-import-master-export-playwright.spec.js` uploads 35 generated WAV files and verifies Bulk HUD continuity. With `FOXBEAR_E2E_DEEP=1`, it proceeds into full master/export assertions.
- `npm run check` remains the fast static suite, but release sign-off must use `npm run check:release`, which includes the desktop/mobile Playwright gate.

## Key changes in this patch

- `src/audio/quality-gate-service.js` now owns QualityGate v2.1 result evaluation with short-term LUFS, limiter/de-esser overcorrection, multiband overcorrection, mobile translation amount checks, and risk flags.
- `src/workers/master-finalizer.worker.js` and the app fallback now emit `shortTermLufs` telemetry.
- `createMasterReport()` now carries `loudness.shortTermBefore` and `loudness.shortTermAfter` for detail panels and QA diagnostics.
- `src/audio/reference-profile-service.js` provides 64/96-band log-spectrum profile helpers for the upcoming reference-match upgrade.
- `qa/v150_engine_quality_gate_smoke.js` locks the new engine quality gate surface.
- `src/audio/memory-guard-service.js` still owns the v1.4.29 large-batch memory policy.
- `FoxBearMemoryGuard.getSnapshot()` now reports retained mastered-buffer count/bytes, Blob bytes, preview Blob bytes, low-memory mode, pressure level, policy budget, released completed buffer count, and largest retained buffers.
- `FoxBearMemoryGuard.diagnose()` now runs a before/after completed-batch policy sweep for console debugging.
- `src/app.js` now calls a post-batch memory sweep through `afterMasteringBatchMemorySweep()` after selected/all-track mastering batches.
- `finishPerformanceProfile()` records `performanceInfo.masteredBufferBytes` and `performanceInfo.outBlobBytes` for completed masters.
- The policy keeps completed download Blobs but releases non-selected completed `masteredBuffer` objects when the batch is large or low-memory/mobile conditions are detected.
- `qa/v1429_memory_stabilization_smoke.js` locks this behavior.

## QA

Default QA command:

```bash
npm run check
```

Expected result:

```text
182/182 PASS (static suite)
Playwright desktop/mobile suite PASS (release environment)
```

Release browser QA automation:

```bash
npm run qa:browser:install
npm run qa:browser
```

## Console checks for manual 35-track testing

After importing and mastering a large batch, run:

```js
FoxBearMemoryGuard.getSnapshot()
```

Then run:

```js
FoxBearMemoryGuard.diagnose()
```

Expected shape:

```text
masteredBufferCount should stay near the policy max
outBlobBytes should remain available for downloads
releasedCompletedBufferCount should increase after large-batch sweeps
pressure should be normal or medium after the sweep, not high
```

## Next patch candidates

1. Follow-up memory tuning after real-device runs
   - tune buffer byte budgets against PC/iOS/Android results
   - tune Export Guard thresholds against real PC/iOS/Android results
   - add a richer low-memory panel if toast-only warnings are not visible enough

## Carry-forward anchors

Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage27, Stage28, Wake Lock state sync, Bulk Import HUD, Bulk Mastering HUD continuity, Bulk HUD asset/close hotfix, v1.4.27 release cleanup, and v1.4.28 app-slimdown orchestration remain active.

- Stage9.1 누적 덮어쓰기 packaging remains active for cumulative overwrite ZIP releases.
- Stage27 다음 대화 인수인계: `src/audio/waveform-control-service.js` remains the shared waveform service boundary.
- Stage28 view extraction: `src/ui/waveform-control-view.js` remains the managed waveform view module.

## Legacy QA compatibility anchors

- v1.4.26 Spectrum update remains carried forward with detail-only FFT behavior.
- v1.4.26 stability entry remains active for spectrum lifecycle and navigation guard diagnostics.
- Dock FFT removal and settings gear alignment remain active; the Dock mini FFT stays removed by design.
- v1.4.26 detail-only FFT remains active; full spectrum rendering belongs in the detail panel only.
- FoxBearPerformanceDiagnostics remains available with collectSnapshot, getSummary, copy, and adaptive summary diagnostics.
- v1.4.26 뒤로가기 / Exit Guard fallback remains active for browser and PWA back navigation.

## v1.5.15 browser QA classification

- GitHub Actions의 선택적 Firebase/Firestore 네트워크 실패는 `runtimeWarnings`로 기록하며 앱 boot 실패로 판정하지 않습니다.
- `runtimeErrors`에는 실제 앱 예외만 남아야 합니다.
- 브라우저 QA가 실패하면 Actions 로그의 `[FoxBear E2E Runtime Health]` JSON을 먼저 확인합니다.
- GitHub Desktop에서 누적 ZIP 적용 후 `package.json`, `package-lock.json`, `src/boot/runtime-health.js`, `qa/browser/` 변경이 모두 표시되는지 확인합니다.
