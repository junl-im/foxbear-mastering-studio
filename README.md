# FoxBear AI Mastering Studio Pro v1.4.28

## Current patch: v1.4.28 App Slim-down Orchestration Split

This maintenance patch continues the roadmap after the Bulk HUD, Wake Lock, and release-cleanup fixes. It keeps the existing `1.4.26-wake-lock-state-sync` asset key for deployment compatibility while documenting the current maintenance layer as `v1.4.28`.

## What changed

- Added `src/audio/mastering-orchestrator-service.js` and delegated selected/all-track batch mastering through `getMasteringBatchRunner().runBatch()`.
- Expanded `src/audio/import-queue-service.js` with `createTrackAnalysisQueue()` so queue pumping and per-track analysis execution are owned by the service layer.
- Reduced `src/app.js` to below the v1.4.28 slim-down budget while preserving legacy smoke compatibility anchors.
- Added `qa/v1428_app_slimdown_orchestration_smoke.js` for the orchestration split.
- Cleaned the top-level README/HANDOFF/QA documents so current release notes are separated from historical v1.4.21-v1.4.26 notes.
- Moved legacy accumulated handoff notes into `docs/history/`.
- Added Markdown code-fence parity checks to `qa/docs_handoff_smoke.js`.
- Updated worker header comments to the current release line.
- Added extracted service modules for the next app.js slim-down phase:
  - `src/audio/import-queue-service.js`
  - `src/audio/analysis-cache-service.js`
  - `src/audio/memory-guard-service.js`
  - `src/audio/quality-gate-service.js`
  - `src/state/track-lifecycle-service.js`
- Added `FoxBearMemoryGuard.getSnapshot()` and completed-batch mastered-buffer release policy.
- Added a browser QA scaffold for Playwright without forcing Playwright into the default `npm run check` path.

## Runtime compatibility

The app still uses:

```text
1.4.26-wake-lock-state-sync
```

This is intentional. The cache key remains stable to avoid surprising deployed users, while the release documentation and new modules mark the maintenance work as v1.4.28.

## QA

Run the default static/smoke suite:

```bash
npm run sri:update
npm run check
```

Current expected result after this patch:

```text
160/160 PASS
```

Optional real-browser scaffold:

```bash
npm run qa:browser
```

The browser command requires Playwright browsers to be installed in the local development environment.

## Historical notes

Older v1.4.21-v1.4.26 accumulated notes are preserved in:

```text
docs/history/README_legacy_v1.4.21_to_v1.4.26.md
docs/history/HANDOFF_legacy_v1.4.21_to_v1.4.26.md
docs/history/QA_REPORT_legacy_v1.4.21_to_v1.4.26.md
```

## Carry-forward user notes

- v1.4.26 detail-only FFT remains active; Dock mini FFT/renderMini stay removed.
- v1.4.26 Performance diagnostics can be opened with `?perf=1` or `Ctrl/Command + Alt + P`, and the diagnostics panel keeps a 복사 action for support reports.
- Download dialog micro hint and first-screen declutter remain active for Kakao/in-app and mobile download flows.
