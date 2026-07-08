# Handoff - v1.4.26 Bulk HUD Asset / Close Button Hotfix

Latest hotfix addresses the reported `bulk-import-hud.css` `load-error-or-sri-block` by changing only that stylesheet URL to `?v=1.4.26-wake-lock-state-sync&h=bulk-hud-close-hotfix` and mirroring it in `sw.js`. This keeps Runtime Health version checks stable while forcing a fresh CSS cache entry.

The Bulk HUD close button now uses the shared overlay-style circular `×` control with `aria-label="대량 작업 HUD 숨기기"` and fixed 30px/28px desktop/mobile centering. Key files: `index.html`, `sw.js`, `assets/css/bulk-import-hud.css`, `qa/v1427_1_bulk_hud_asset_close_hotfix_smoke.js`. QA result: `150/150 PASS`.

# Handoff - v1.4.26 Bulk Mastering HUD Continuity Patch

Latest patch keeps the existing large `bulkImportHud` alive across the next workflow step. For 2+ selected/all-track mastering, `beginBulkMasteringHudBatch()` calls `FoxBearBulkImportHudView.beginMasteringBatch()` so the same scrollable HUD switches from analysis counts to mastering counts.

Key files: `src/ui/bulk-import-hud-view.js`, `src/app.js`, `assets/css/bulk-import-hud.css`, `qa/v1427_bulk_mastering_hud_smoke.js`. QA result: `149/149 PASS`.

# Handoff - v1.4.26 Wake Lock State Sync

Latest release: v1.4.26. The Wake Lock setting is now state-synced: user intent is `ON/OFF`, temporary runtime protection is `AUTO`, and automatic protection should not emit `화면유지 ON` toast messages. Use `window.FoxBearWakeLockController.getSnapshot()` to inspect live state.

## v1.4.26 Handoff - 뒤로가기 나가기 fallback

- Latest version: `Pro v1.4.26` / cache key `1.4.26-wake-lock-state-sync`.
- Back navigation guard now has a confirmed-leave fallback path for direct browser/PWA launches where `history.back()` cannot close the tab/window.
- If the browser refuses to close, users see an exit-complete screen with “뒤로가기 한 번 더” and “작업 화면 다시 열기”.
- Carry forward v1.4.26 bulk import HUD, v1.4.23 audio decode diagnostics, v1.4.22 mastering throttle, and v1.4.21 render scheduler.

## v1.4.26 handoff - Bulk Import HUD

- Latest version: `1.4.26` with cache key `1.4.26-wake-lock-state-sync`.
- Main user issue: 2+ and especially 35-track imports needed a dedicated long progress HUD instead of vague single-track messages.
- Added `bulkImportHud` DOM, scrollable row list, collapse/hide controls, `FoxBearBulkImportHud.getSnapshot()`, runtime health check, and performance diagnostics integration.
- QA target: `qa/v1424_bulk_import_hud_smoke.js`; matrix: `qa/BROWSER_BACK_QA_MATRIX_1.4.26.md`.
- Final QA: `146/146 PASS`.

## v1.4.26 handoff - Mastering Queue Throttle

- Latest version: `1.4.26` with cache key `1.4.26-wake-lock-state-sync`.
- New runtime diagnostic: `FoxBearMasteringGuard.getSnapshot()`.
- Mastering progress renders are throttled through `scheduleRenderAll('mastering-progress', ...)`; final completion flushes immediately.
- Performance diagnostics now capture `masteringQueue` beside import/render queue snapshots.
- QA target: `qa/v1422_mastering_queue_throttle_smoke.js`; matrix: `qa/BROWSER_BACK_QA_MATRIX_1.4.26.md`.
- Next safe direction: split mastering queue/worker orchestration out of `src/app.js`, then add a memory cleanup policy for very large completed batches.


- v1.4.21 FoxBearPerformanceDiagnostics remains available; combine with FoxBearBulkImportGuard.getSnapshot() for 35-track import debugging.
## v1.4.21 stability handoff - 35-track PC import crash guard

- Base: v1.4.19.
- User report: selecting 35 songs on PC caused a `STATUS_BREAKPOINT` page error.
- Patch: `handleFiles()` now registers tracks in a batch, renders once, then calls `queueTracksForAnalysis()` instead of starting `analyzeTrack()` for every track immediately.
- New guard: `FoxBearBulkImportGuard.getSnapshot()` exposes pending/active/concurrency diagnostics.
- Config: `IMPORT_ANALYSIS_CONCURRENCY = 1`, `LARGE_IMPORT_BATCH_THRESHOLD = 12`, `IMPORT_QUEUE_YIELD_MS = 90`.
- QA: `qa/v1421_bulk_import_guard_smoke.js` plus browser matrix `qa/BROWSER_BACK_QA_MATRIX_1.4.21.md`.

# Handoff - FoxBear AI Mastering Studio Pro v1.4.21

## Current patch
v1.4.21 focuses on decluttering the first screen of the download/share dialog while keeping all Kakao/mobile fallback tools intact.

## What changed
- Added display profile helper:
  - `FoxBearDownloadService.getDownloadDialogDisplayProfile()`
- Kept micro hint helper:
  - `FoxBearDownloadService.getDownloadDialogCompactHint()`
- Main download popup now includes:
  - `.download-options-compact-hint`
  - `download-options-panel-v5`
  - `data-download-display-mode`
  - idle initial receipt with the full checklist hidden on open
- Advanced recovery tools remain under `추가 옵션`:
  - 주소 복사
  - 안내 복사
  - 진단 복사
  - 체크리스트 복사
  - 외부 브라우저
- App-level deps pass receipt/checklist/compact-hint/display-profile helpers explicitly.
- Runtime Health requires the dialog display profile helper.
- Cache key is `1.4.26-wake-lock-state-sync`.

## QA
Run:

```bash
npm run sri:update

## v1.4.26 Carry-forward Diagnostics Notes

- FoxBearPerformanceDiagnostics and getSummary remain available for performance diagnostics.
- detail-only FFT remains active; Dock mini FFT and renderMini remain removed.
- Download dialog micro hint and first-screen declutter helpers carry forward.


## v1.4.26 Historical QA anchors

Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage13, Stage14, Stage27, Stage28 carry-forward anchors are retained for current QA.

- Stage7 waveform compare popup layer cleanup remains active.
- Stage8 async/mobile Dock behavior remains active.
- Stage9 Dock waveform CSS split remains active.
- Stage9.1 누적 덮어쓰기 packaging remains active.
- Stage10 download service split remains active.
- Stage11 large modular renovation remains active.
- Stage11.1 runtime mobile hotfix remains active.
- Stage12 detail view split remains active.
- Stage27 다음 대화 인수인계: waveform-control-service remains active.
- Stage28 waveform-control-view.js extraction remains active.
- v1.4.26 Spectrum update and Exit Guard fallback are current.
- Dock FFT removal and settings gear alignment remain carried forward.
- 다음 패치 후보: app.js slim-down, real-device PWA back navigation QA, and memory pressure profiling.
- QA command: npm run check
```
