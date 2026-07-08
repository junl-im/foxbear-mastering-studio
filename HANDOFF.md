# Handoff - FoxBear AI Mastering Studio Pro v1.4.18

## Current patch
v1.4.18 focuses on making the download/share dialog even shorter on the first screen while keeping all Kakao/mobile fallback tools intact.

## What changed
- Added micro hint helper:
  - `FoxBearDownloadService.getDownloadDialogCompactHint()`
- Main download popup now includes:
  - `.download-options-compact-hint`
  - `data-download-hint-mode`
  - `visibleStepLimit`-capped flow steps
- Advanced recovery tools remain under `추가 옵션`:
  - 주소 복사
  - 안내 복사
  - 진단 복사
  - 체크리스트 복사
  - 외부 브라우저
- Fixed duplicate `steps.appendChild(item)` logic in `download-dialog-view.js`.
- Runtime Health requires the dialog micro hint helper.
- Cache key is `1.4.18-download-dialog-micro-hint`.

## QA
Run:

```bash
npm run sri:update
npm run check
npm run package:clean
npm run package:overwrite
```

Expected current result: `137/137 PASS`.

## Manual QA focus
- Kakao in-app browser: verify the dialog first screen is short and points to `공유/저장 → 파일 열기`.
- Kakao in-app browser: verify diagnostics/checklist copy remain under `추가 옵션`.
- Android Chrome: verify normal download remains primary and the micro hint is not distracting.
- iOS Safari/PWA: verify the popup fits in the viewport and buttons remain reachable.
- Desktop Chrome/Edge: verify format options and primary actions remain clear.

## 다음 패치 후보
- v1.4.19: real-device Kakao/Android/iOS wording tuning if screenshots or copied diagnostics are available.
- Further reduce download popup copy if users still find it dense.
- Consider a one-tap simple save mode for non-technical users.

## Legacy anchors for QA continuity
- Stage7: `waveform-compare-view.js` split and compare modal cleanup.
- Stage9: Dock waveform CSS split and cumulative overwrite QA.
- Stage13: Runtime Health boot monitor.
- Stage14: Runtime recovery and asset mismatch reporting.
- Stage23: playback orchestration.
- Stage25: compare controls rehome.
- Stage26: unified waveform controls.
- Stage27: waveform control service.
- Stage28: waveform control view extraction.

## Cumulative QA anchors
- Stage8: async mobile Dock and compact overlay behavior.
- Stage9.1: 누적 덮어쓰기 packaging remains documented.
- Stage10: download service split.
- Stage11: recommendation/base-components modular renovation.
- Stage11.1: runtime mobile hotfix.
- Stage12: detail view split.
- Stage13: runtime health.
- Stage14: runtime recovery.
- Stage27 다음 대화 인수인계: waveform-control-service remains active.
- Stage28 view extraction: waveform-control-view.js remains active.
- Dock FFT removal and settings gear alignment remain active.
- detail-only FFT remains the current Spectrum behavior.
- Exit Guard remains active for refresh/back protection.
- FoxBearPerformanceDiagnostics remains available; use `getSummary` or Ctrl/Command + Alt + P for diagnostics.

## v1.4.18 cumulative compatibility anchors
- stability: navigation confirm debounce and FFT lifecycle stabilization remain active.
- Dock FFT removal and settings gear alignment remain active.
- Performance diagnostics use adaptive refresh and copy support.
- Packaging polish remains active for release/overwrite ZIP naming.
- Download/share fallback remains active while first-screen dialog copy is shorter.
