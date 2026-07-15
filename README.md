# FoxBear AI Mastering Studio Pro v1.5.7



## Current patch: v1.5.7 Release Foundation Cleanup

This patch makes `package.json` the release metadata source of truth, adds generated `src/config/build-info.js`, separates durable rules into `STATUS.md` and `docs/decisions/`, pins Playwright through `package-lock.json`, and adds a release gate that runs both static QA and real Chromium automation. See `VERSIONING.md` and `RELEASE_CHECKLIST.md`.

Release metadata:

```text
product: 1.5.7
build: release-foundation-cleanup
asset generation: 1.5.7-release-foundation
service worker cache: foxbear-shell-v1.5.7-release-foundation
```

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
