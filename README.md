# FoxBear AI Mastering Studio Pro v1.5.20

## Current patch: v1.5.19 CI Runtime Isolation and Package Hardening

GitHub Actions에서 남은 두 실패는 핵심 앱 부팅 오류가 아니라 Firebase 원격 SDK/백엔드가 남긴 선택적 콘솔 오류를 `runtime-health` 테스트가 치명 오류로 취급한 문제였습니다. 브라우저 QA는 이제 Firebase 모듈을 결정적으로 모킹해 핵심 앱, PWA, 서비스워커, UI 계약을 외부 네트워크와 분리합니다. 대신 같은 출처의 요청 실패, 처리되지 않은 페이지 예외, 실제 애플리케이션 `console.error`는 별도 배열로 더 엄격하게 검사합니다.

로컬 QA 서버에는 실행마다 고유한 ownership probe를 생성해, 포트 4173을 다른 프로세스가 점유해도 잘못된 페이지를 테스트하지 않습니다. 뒤로/앞으로 테스트는 오류를 삼키지 않고 실제 왕복을 검증합니다. 패키징은 버전별 검증 명령 자동 동기화, 심볼릭 링크·경로 탈출·QA 임시 파일 차단을 포함합니다.

Release metadata:

```text
product: 1.5.19
build: ci-runtime-isolation-package-hardening
asset generation: 1.5.19-ci-runtime-isolation-package-hardening
service worker cache: foxbear-shell-v1.5.19-ci-runtime-isolation-package-hardening
```

## Previous patch: v1.5.18 CI Diagnostics and PWA Readiness

v1.5.18의 서비스워커 준비 최적화, Playwright 실패 요약, 정적 서버 로그 보존, 패키지 임시 산출물 차단은 그대로 포함됩니다.

## Previous patch: v1.5.17 Browser Contract Fix

수동 Wake Lock 요청 유지, Trusted Types 기반 서비스워커 등록, 헤더 설정 버튼 순서 수정은 그대로 포함됩니다.

## Previous patch: v1.5.16 E2E Static Server Pipe Deadlock Fix

GitHub Actions에서 첫 브라우저 테스트 몇 개만 통과한 뒤 모든 `page.goto()`가 20초 타임아웃으로 실패하던 문제를 수정했습니다. 로컬 Python 정적 서버의 요청 로그를 파이프로 수집하면서 Playwright를 `spawnSync`로 실행해 Node 이벤트 루프가 멈췄고, 로그 파이프가 가득 차면 서버 자체가 응답을 중단하는 구조가 원인이었습니다.

Playwright 실행을 비동기 자식 프로세스로 전환해 서버 로그를 계속 비우도록 했으며, 실패 시 정적 서버 로그 tail을 출력합니다. 1,800회 연속 요청 회귀 테스트로 일반적인 파이프 버퍼 용량을 넘어선 뒤에도 서버가 정상 응답하는 것을 검증합니다.

Release metadata:

```text
product: 1.5.16
build: e2e-server-pipe-deadlock-fix
asset generation: 1.5.16-e2e-server-pipe-deadlock-fix
service worker cache: foxbear-shell-v1.5.16-e2e-server-pipe-deadlock-fix
```

## Previous patch: v1.5.15 E2E Runtime Classification

Runtime Health의 선택적 Firebase/Firestore 네트워크 오류 분류, Wake Lock 및 서비스워커 E2E 안정화 변경은 그대로 포함됩니다.

## Previous patch: v1.5.12 CI Runtime Readiness and Node 24 Actions

Playwright now waits for the application-owned `FoxBearRuntimeHealth.appReady` state instead of treating creation of the health object as boot completion. Service-worker readiness is bounded and explicit, Wake Lock mocks use a fresh sentinel per request, and CI concurrency is capped at two browser workers. GitHub workflow JavaScript actions now use Node 24-based v6 releases.

Release metadata:

```text
product: 1.5.12
build: ci-runtime-readiness
asset generation: 1.5.12-ci-runtime-readiness
service worker cache: foxbear-shell-v1.5.12-ci-runtime-readiness
```

## Previous patch: v1.5.11 AudioContext Lifecycle and CI Navigation Stability

Web Audio context ownership is centralized through `FoxBearAudioContextManager`. Realtime mastering preview, difference A/B, preview translation, spectrum visualization, and decode operations now expose purpose/state diagnostics and release contexts through a common lifecycle.

The real-browser release gate no longer waits for global `networkidle`. It navigates to `domcontentloaded` and then waits for `FoxBearRuntimeHealth.appReady`, avoiding CI timeouts caused by optional Firebase, service-worker, or other persistent network activity. Failed GitHub Actions runs upload Playwright diagnostics automatically.

Release metadata:

```text
product: 1.5.11
build: audio-context-ci-stability
asset generation: 1.5.11-audio-context-ci-stability
service worker cache: foxbear-shell-v1.5.11-audio-context-ci-stability
```

## Previous patch: v1.5.10 Header Settings Relocation

The Settings trigger remains beside the `DESIGNED BY` card, with a body-level viewport-safe panel and independent Bulk HUD recovery control.

## Previous patch: v1.5.9 Version Display and Cache Recovery

Visible release labels remain synchronized from `FoxBearBuildInfo`, and stale PWA HTML recovery remains active.

## Previous patch: v1.5.8 PCM and ZIP Memory Hardening

Completed masters use `release-after-encode`; ZIP export uses STORE packaging and working-set limits with per-track fallback. Those memory protections remain active in v1.5.9.

## Previous patch: v1.5.6 Export Progress Recovery

Compatibility note: previous maintenance layer `v1.5.5 Update Safety` remains carried forward.

This patch adds a visible ZIP/export progress panel and `src/download/export-progress-view.js`, exposed as `FoxBearExportProgressView`, so large batch exports show readiness, memory warnings, ZIP generation progress, validation success/failure, and a fallback `곡별 다운로드 위치 보기` action. Boot-critical cache keys moved to `h=boot-sri-v156`, Update Safety moved to `h=update-safety-v156`, and the service worker shell cache generation is now `foxbear-shell-v1.5.6-export-progress-recovery`.

Console checks after deployment:

```js
FoxBearExportProgressView.getSnapshot()
FoxBearExportGuard.getReadiness()
FoxBearUpdateSafety.getReport()
```

## Previous patch: v1.5.5 Update Safety

Compatibility note: previous maintenance layer `v1.5.4 Boot SRI Recovery` remains carried forward.

This patch adds `src/boot/update-safety-service.js`, exposed as `FoxBearUpdateSafety`, to inventory local scripts/styles, detect boot cache-bust drift, classify SRI/load-block risk, and provide a copyable recovery plan. Boot-critical assets now use `h=boot-sri-v155`, the service worker shell cache generation is `foxbear-shell-v1.5.5-update-safety`, and service worker cache purge can be requested via `FOXBEAR_PURGE_CACHES` before unregister/reload recovery.

Console checks after deployment:

```js
FoxBearUpdateSafety.getReport()
FoxBearUpdateSafety.getAssetInventory()
FoxBearUpdateSafety.copyReport()
```

## Previous patch: v1.5.4 Boot SRI Recovery

Compatibility note: previous maintenance layer `v1.5.3 Bulk HUD Visibility + Inline Master All` remains carried forward.

This hotfix targets the reported boot-stall case where `src/boot/performance-diagnostics.js` and `src/app.js` can be blocked by stale cached bytes that no longer match the current SRI hash. The boot-critical scripts now use a fresh `h=boot-sri-v154` cache-bust key, the service worker shell cache generation was bumped to `foxbear-shell-v1.5.4-boot-sri-recovery`, and the Runtime Health recovery action now clears broader app/workbox/precache caches while updating and unregistering service workers before a hard reload.

## Previous patch: v1.5.3 Bulk HUD Visibility + Inline Master All

Compatibility note: previous maintenance layer `v1.5.2 Export Guard + Low Memory UX` remains carried forward.

This patch refines the large bulk import/mastering HUD: `접기` is renamed to `숨김`, hidden HUDs can be restored from a small `보이기` button beside the floating settings gear, and the HUD now exposes an inline `전체 마스터링` action that delegates to the existing main full-mastering button. It keeps the existing `1.4.26-wake-lock-state-sync` runtime/cache key for deployment compatibility while documenting the current maintenance layer as `v1.5.3`.

## Export Guard + Low Memory UX additions

- Added `src/download/export-guard-service.js` as the Export Guard layer for ZIP/export readiness checks.
- `downloadZip()` now builds a validated ZIP export plan before compression and validates the generated ZIP Blob before download.
- Added `FoxBearExportGuard.getReadiness()` and `FoxBearExportGuard.getDiagnostics()` for browser-console checks during 35-track export testing.
- Low-memory and large-output conditions now produce user-facing advice before/after batch memory sweeps and before ZIP export.
- The 35-track Playwright deep scenario now inspects Export Guard readiness before export.
- Added `qa/v152_export_guard_low_memory_smoke.js` to lock the new export validation and low-memory UX surface.

## Real Browser Automation additions

- v1.5.1 browser QA remains available through `npm run qa:browser`, `npm run qa:browser:external`, and `npm run qa:browser:deep`.

- Added `playwright.config.js` with desktop Chromium and mobile PWA-style Chromium projects.
- Added `qa/browser/run-browser-e2e.js`, which starts a local static server and then runs Playwright specs.
- Added shared browser helpers in `qa/browser/helpers/foxbear-e2e-helpers.js`, including synthetic WAV fixture generation, Runtime Health assertions, Wake Lock mocks, and service worker snapshots.
- Expanded browser specs for Runtime Health, console errors, PWA back navigation resilience, Wake Lock request/release mocking, service worker update checks, and 35-track import/master/export flow coverage.
- Added `npm run qa:browser`, `npm run qa:browser:external`, `npm run qa:browser:deep`, and `npm run qa:browser:install`.
- Added `qa/v151_real_browser_automation_smoke.js` to keep the browser automation surface checked by the default static QA suite.

## Engine Quality Gate additions

- Upgraded `src/audio/quality-gate-service.js` to QualityGate v2.1 with short-term LUFS checks, limiter overcorrection detection, de-esser overcorrection detection, multiband overcorrection detection, mobile translation correction amount checks, and risk flag summaries.
- Added short-term LUFS telemetry to `src/workers/master-finalizer.worker.js` and the in-app finalizer fallback.
- Extended `createMasterReport()` with `loudness.shortTermBefore`, `loudness.shortTermAfter`, and a 3s/1s short-term LUFS standard note.
- Added `src/audio/reference-profile-service.js` as the 64/96-band log-spectrum profile helper foundation for the next reference-matching upgrade.
- Preserved v1.4.29 memory policy behavior: completed download Blobs remain available while non-selected mastered AudioBuffers are released.
- Added `qa/v150_engine_quality_gate_smoke.js` to lock the new engine QA surface.

## v1.4.29 Memory Stabilization carry-forward

- Upgraded `src/audio/memory-guard-service.js` to v1.4.29 with a large-batch retention policy for completed mastered AudioBuffers.
- Added dynamic memory policy options for large batches, low-memory/mobile environments, selected-track retention, recent-track retention, and mastered-buffer byte budgets.
- Added `FoxBearMemoryGuard.diagnose()` for before/after memory diagnostics and policy sweep reporting from the browser console.
- Added automatic post-batch memory sweep after selected/all-track mastering batches complete.
- Added per-track performance memory metadata: `performanceInfo.masteredBufferBytes` and `performanceInfo.outBlobBytes`.
- Kept completed `outBlob` downloads and mastered URLs while releasing non-selected completed `masteredBuffer` objects according to policy.
- Preserved the v1.4.28 app slim-down orchestration boundaries:
  - `src/audio/import-queue-service.js`
  - `src/audio/mastering-orchestrator-service.js`
  - `src/audio/analysis-cache-service.js`
  - `src/audio/quality-gate-service.js`
  - `src/state/track-lifecycle-service.js`
- Added `qa/v1429_memory_stabilization_smoke.js` to lock the memory policy, diagnostics bridge, and docs.

## Runtime compatibility

The current release metadata is synchronized from `package.json`:

```text
1.5.7
1.5.7-release-foundation
```

Use `npm run version:sync` after a version/build change and `npm run version:check` before release. Cache-only changes use build/asset/revision fields rather than a second semantic product version.

## Memory diagnostics

After a large batch, open the browser console and run:

```js
FoxBearMemoryGuard.getSnapshot()
```

To force a diagnostic sweep and see before/after retention data:

```js
FoxBearMemoryGuard.diagnose()
```

The snapshot now reports retained mastered-buffer count/bytes, Blob bytes, preview Blob bytes, policy budget, low-memory mode, pressure level, released completed buffer count, and the largest retained mastered buffers.

## QA

Install reproducible dependencies and Chromium on a new machine:

```bash
npm ci
npm run qa:browser:install
```

Run fast static QA during development:

```bash
npm run check
```

Run the required release gate before packaging/deploying:

```bash
npm run check:release
```

For an already deployed URL:

```bash
FOXBEAR_E2E_URL=https://example.com npm run qa:browser:external
```

For the longer 35-track master/export path, run:

```bash
npm run qa:browser:deep
```

Playwright is pinned in `devDependencies`; `npm ci` and `package-lock.json` make the test runner reproducible.

## Historical notes

Older v1.4.21-v1.4.26 accumulated notes are preserved in:

```text
docs/history/README_legacy_v1.4.21_to_v1.4.26.md
docs/history/HANDOFF_legacy_v1.4.21_to_v1.4.26.md
docs/history/QA_REPORT_legacy_v1.4.21_to_v1.4.26.md
```

## Current invariant summary

- v1.5.7 detail-only FFT remains active; Dock mini FFT/renderMini stay removed. The decision is recorded in `docs/decisions/0001-dock-fft-removal.md`.
- Performance diagnostics can be opened with `?perf=1` or `Ctrl/Command + Alt + P`, and the diagnostics panel keeps a 복사 action for support reports.
- Download dialog micro hint and first-screen declutter remain active for Kakao/in-app and mobile download flows.
- Bulk Import HUD and Bulk Mastering HUD continuity remain active for 2+ track workflows.

## v1.5.3 Bulk HUD visibility and full-mastering action

- Renamed the large HUD toggle copy from `접기` to `숨김` so it clearly means hiding the whole large HUD.
- Added a small `보이기` restore button next to the floating settings gear; it appears only while a hidden bulk HUD batch is still restorable.
- Added `전체 마스터링` inside the large HUD and wired it to the existing main `#masterAllBtn` flow, with the same disabled/busy behavior.
- Added targeted stale-cache keys for the changed HUD/mobile/app assets and mirrored them in the service worker precache.
- Added `qa/v153_bulk_hud_visibility_masterall_smoke.js` to lock the UX and packaging surface.
