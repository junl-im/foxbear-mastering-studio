# QA Report - v1.5.9 Version Display and Cache Recovery

## Result

```text
185/185 PASS
Browser QA: runner/spec discovery verified; standard Chromium execution still required
```

v1.5.9 final QA static target: `185/185 PASS`. This is not a browser QA pass.

Previous v1.5.8 static target: `183/183 PASS`.

Previous v1.5.7 static target: `182/182 PASS`.
Previous v1.5.6 static target: `178/178 PASS`.
Previous v1.5.5 static target: `176/176 PASS`.

Commands:

```bash
npm run version:check
npm run check
npm run qa:browser
```

## Verified

- Syntax checks for extracted service modules.
- Existing SRI verification.
- Existing runtime, modular, audio engine, dock, download, Wake Lock, Bulk Import HUD, Bulk Mastering HUD, asset/close-button, release-cleanup, browser-scaffold, and orchestration carry-forward smokes.
- Markdown code-fence parity for current docs and historical docs.
- Static verification for the v1.5.0 QualityGate v2.1 checks, short-term LUFS telemetry, limiter/de-esser/multiband overcorrection detection, mobile translation amount warnings, 64/96-band reference profile service, v1.4.29 memory policy carry-forward, v1.5.1 Playwright browser automation coverage, and v1.5.2 Export Guard ZIP validation/low-memory UX coverage.

## New check

- `qa/v1429_memory_stabilization_smoke.js`
- `qa/v150_engine_quality_gate_smoke.js`
- `qa/v151_real_browser_automation_smoke.js`
- `qa/v152_export_guard_low_memory_smoke.js`
- `qa/v153_bulk_hud_visibility_masterall_smoke.js`
- `qa/v154_boot_sri_recovery_smoke.js`
- `qa/v155_update_safety_asset_health_smoke.js`
- `qa/v156_export_progress_recovery_smoke.js`
- `qa/v157_release_foundation_smoke.js`
- `qa/v158_pcm_zip_memory_hardening_smoke.js`
- `qa/v159_version_display_cache_recovery_smoke.js`

## Manual follow-up still needed

- Real PC 35-track import → analysis → master all → export.
- Check `FoxBearMemoryGuard.getSnapshot()` before/after export and after several repeated mastering runs.
- Real mobile/PWA Bulk HUD scrolling, close button feel, and low-memory policy behavior.
- Required Playwright execution on a normal development machine or CI runner with the pinned browser installed: `npm run qa:browser`.
- Deep 35-track browser flow remains opt-in via `npm run qa:browser:deep` because it can take significantly longer than static QA.
- Review-container note for v1.5.9: the runner discovered all 10 desktop/mobile tests, but the pinned Playwright Chromium executable is not installed in this container. The launch error occurs before app navigation and is not counted as a product failure or a browser pass.

## Historical reports

Previous accumulated v1.4.21-v1.4.26 QA notes are preserved in:

```text
docs/history/QA_REPORT_legacy_v1.4.21_to_v1.4.26.md
```

## Carry-forward v1.4.26 QA anchor

v1.4.26 final QA carry-forward remains documented for legacy smoke compatibility. Current QA is higher because v1.5.5 adds Update Safety asset-health checks and v1.5.4 adds boot SRI/cache recovery checks and v1.5.3 adds Bulk HUD visibility/master-all UX checks on top of v1.5.2 Export Guard checks on top of v1.5.1 real-browser automation smokes on top of v1.5.0 engine quality gate checks on top of v1.4.29 Memory Stabilization, release cleanup, service-module, app-slimdown orchestration, memory-guard, and browser-scaffold checks.





## v1.5.9 coverage

- Executes `FoxBearReleasePresentation` against stale v1.4.26 HTML labels and verifies the visible button, info heading, title, body build markers, and metadata are repaired to the generated release version.
- Verifies the manifest description follows the current product version/build ID.
- Verifies service-worker navigation uses preload/no-store before offline fallback and exposes `FOXBEAR_GET_RELEASE_INFO`.
- Verifies Update Safety derives patch/boot metadata from `FoxBearBuildInfo`.
- Verifies the active cache generation is absent from `LEGACY_CACHE_NAMES`.

## v1.5.8 coverage

- Executes the Memory Guard in a VM and verifies default completed PCM retention is zero.
- Verifies the newly completed track reaches `done` before the release policy runs.
- Verifies explicit bounded re-encode retention remains opt-in and budget-limited.
- Executes Export Guard planning for safe desktop and unsafe low-memory mobile batches.
- Verifies ZIP strategy is `STORE` + `streamFiles` with a working-set ceiling and per-track fallback.
- Verifies alternate-format requests fail with `FORMAT_REQUIRES_REMASTER` instead of returning a mislabeled current-format Blob.

## v1.5.7 coverage

- Verifies package/manifest/UI/build/cache metadata synchronization from `package.json`.
- Verifies generated `src/config/build-info.js`, release documentation, and version synchronization tooling.
- Verifies `@playwright/test` is pinned and represented in `package-lock.json`.
- Verifies deployment workflows run `npm ci`, install Chromium, and execute `npm run check:release`.
- Verifies CHANGELOG no longer contains duplicate headings or repeated carry-forward sections.
- Verifies release synchronization preserves historical QA labels instead of renaming old regression guards to the current release.

## v1.5.6 coverage

- Verifies `src/download/export-progress-view.js` is loaded after Export Guard and before `src/app.js`.
- Verifies the visible export panel IDs, progress bar, checklist, and fallback `곡별 다운로드 위치 보기` action exist.
- Verifies `downloadZip()` updates `FoxBearExportProgressView` for plan, progress, completion, validation failure, and errors.
- Verifies boot/update safety keys moved to `boot-sri-v156` and `update-safety-v156`, and service worker cache generation is `foxbear-shell-v1.5.6-export-progress-recovery`.

## v1.5.5 coverage

- Verifies `src/boot/update-safety-service.js` is loaded before other deferred boot diagnostics and exposed as `FoxBearUpdateSafety`.
- Verifies boot-critical assets use `h=boot-sri-v155` in both `index.html` and `sw.js`.
- Verifies the service worker cache generation is `foxbear-shell-v1.5.5-update-safety` and v1.5.4 is treated as legacy.
- Verifies Runtime Health can copy Update Safety diagnostics and can request `FOXBEAR_PURGE_CACHES` before unregister/reload.
- Verifies patched JS/CSS service-worker fetches use network-first no-store handling for patch-busted assets.

## v1.5.3 coverage

- Verifies the large bulk HUD `숨김` copy and removal of the legacy `접기` button text.
- Verifies hidden HUD restore through a `보이기` control beside the floating settings gear.
- Verifies the large HUD inline `전체 마스터링` action delegates to the existing main full-mastering button.
- Verifies v1.5.3 stale-cache keys and service worker precache alignment.


## v1.5.4 coverage

- Verifies boot-critical `runtime-health.js`, `performance-diagnostics.js`, and `app.js` use the fresh `h=boot-sri-v154` cache-bust key in both `index.html` and `sw.js`.
- Verifies the generated SRI hashes match the actual bytes for the three boot-critical scripts.
- Verifies the service worker shell cache name was bumped to `foxbear-shell-v1.5.4-boot-sri-recovery`.
- Verifies Runtime Health cache recovery clears broader app/workbox/precache caches and unregisters service workers before reload.
