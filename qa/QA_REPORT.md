# QA Report - v1.5.2 Export Guard + Low Memory UX

## Result

```text
172/172 PASS
```

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

v1.4.26 final QA carry-forward remains documented for legacy smoke compatibility. Current QA is higher because v1.5.2 adds Export Guard checks on top of v1.5.1 real-browser automation smokes on top of v1.5.0 engine quality gate checks on top of v1.4.29 Memory Stabilization, release cleanup, service-module, app-slimdown orchestration, memory-guard, and browser-scaffold checks.
