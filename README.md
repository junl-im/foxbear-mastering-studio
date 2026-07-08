# FoxBear AI Mastering Studio Pro v1.5.0

## Current patch: v1.5.0 Engine Quality Gate

This patch strengthens the mastering result evaluation layer on top of the v1.4.29 memory stabilization work. It keeps the existing `1.4.26-wake-lock-state-sync` runtime/cache key for deployment compatibility while documenting the current maintenance layer as `v1.5.0`.

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

The app still uses:

```text
1.4.26-wake-lock-state-sync
```

This is intentional. The cache key remains stable to avoid surprising deployed users, while the release documentation and new modules mark the current maintenance work as v1.5.0.

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

Run the default static/smoke suite:

```bash
npm run sri:update
npm run check
```

Current expected result after this patch:

```text
163/163 PASS
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
- Bulk Import HUD and Bulk Mastering HUD continuity remain active for 2+ track workflows.
