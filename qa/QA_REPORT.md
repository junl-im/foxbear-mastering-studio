# QA Report - v1.5.4 Boot SRI Recovery

## Result

```text
174/174 PASS
```

Previous v1.5.3 static target: `173/173 PASS`.
Previous v1.5.2 static target: `172/172 PASS`.
Previous v1.5.1 static target: `170/170 PASS`.

Command:

```bash
npm run check
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

## Manual follow-up still needed

- Real PC 35-track import → analysis → master all → export.
- Check `FoxBearMemoryGuard.getSnapshot()` before/after export and after several repeated mastering runs.
- Real mobile/PWA Bulk HUD scrolling, close button feel, and low-memory policy behavior.
- Optional Playwright browser execution in a development environment with browsers installed: `npm run qa:browser`.
- Deep 35-track browser flow remains opt-in via `npm run qa:browser:deep` because it can take significantly longer than static QA.

## Historical reports

Previous accumulated v1.4.21-v1.4.26 QA notes are preserved in:

```text
docs/history/QA_REPORT_legacy_v1.4.21_to_v1.4.26.md
```

## Carry-forward v1.4.26 QA anchor

v1.4.26 final QA carry-forward remains documented for legacy smoke compatibility. Current QA is higher because v1.5.4 adds boot SRI/cache recovery checks and v1.5.3 adds Bulk HUD visibility/master-all UX checks on top of v1.5.2 Export Guard checks on top of v1.5.1 real-browser automation smokes on top of v1.5.0 engine quality gate checks on top of v1.4.29 Memory Stabilization, release cleanup, service-module, app-slimdown orchestration, memory-guard, and browser-scaffold checks.

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
