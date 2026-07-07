# FoxBear AI Mastering Studio Pro v1.4.14

## Current patch: v1.4.14 Download action clarity

- Runtime asset cache key: `1.4.14-download-action-clarity`
- Service worker cache: `foxbear-shell-v1.4.14-download-action-clarity`
- Package version: `1.4.14`
- Manual QA doc: `qa/BROWSER_BACK_QA_MATRIX_1.4.14.md`

### v1.4.14 focus

v1.4.13 made the download popup cleaner, but the visible button labels could still be confusing in Kakao/in-app browsers. v1.4.14 keeps the same fallback stack and makes the recommended button, secondary button, and help button map to explicit actions.

### Download/share support

- Main popup still shows the recommended save path for the current browser.
- Main action buttons now expose `data-download-action` so QA can confirm what each button actually does.
- The recommended button gets a small `추천` badge.
- 카카오/인앱 브라우저: 공유/저장 → 저장 도움 → 외부 브라우저 순서로 안내합니다.
- 일반 브라우저: 다운로드 우선, 파일 공유는 보조 선택으로 유지합니다.
- 주소 복사, 안내 복사, 진단 복사, 외부 브라우저는 `추가 옵션`에서 확인합니다.

## Cumulative compatibility notes

- Download/share fallback from v1.4.11 remains active.
- Hidden performance diagnostics from v1.4.9/v1.4.10 remain available with `?perf=1` or `Ctrl/Command + Alt + P`.
- Dock mini FFT remains removed; FFT stays detail-panel only.
- PC/PWA floating settings gear alignment remains retained.
- Crossfade, waveform zoom, browser exit guard, and analyser tap support remain cumulative.
- Stage7, Stage9, Stage27, and Stage28 QA anchors remain part of the cumulative release line.

## Cumulative visible/hidden tools

- Spectrum detail view and Exit Guard remain cumulative.
- Performance diagnostics remain available through `?perf=1` or `Ctrl/Command + Alt + P`; use 복사 for diagnostics handoff.
- Download diagnostics are copied through `진단 복사` in the download/help flow.
- detail-only FFT remains active; Dock mini FFT and `renderMini` remain removed.


## Cumulative compatibility smoke anchors

- Stage8 compact mobile Dock overlay anchors remain documented.
- Stage9 Dock waveform CSS split remains documented.
- Stage9.1 cumulative overwrite manifest and 누적 덮어쓰기 packaging remain documented.
- Stage10 download service split remains documented.
- Stage11 large modular renovation remains documented.
- Stage11.1 runtime/mobile hotfix remains documented.
- Stage12 detail view split remains documented.
- Stage27 다음 대화 인수인계: `waveform-control-service.js` remains the shared waveform calculation/control service.
- v1.4.14 Exit Guard remains active for refresh/back protection.
- v1.4.14 Spectrum remains available in the detail-only FFT panel.
- v1.4.14 stability polish remains active for FFT lifecycle and Back confirm debounce.
- FFT external analyser coverage remains documented for preview translation and difference listen graphs.
- Dock FFT removal remains intentional; `#bottomPreviewSpectrum` should not exist.
- renderMini cleanup remains intentional; `renderMini` is removed and FFT is detail-only.
- Performance diagnostics remain available; `FoxBearPerformanceDiagnostics.getSummary()` and snapshot 복사 remain supported.
- Performance diagnostics uses adaptive refresh and keeps Packaging overwrite naming synced with `package.json`.
- Safari iOS, Chrome Android, Kakao Android, Desktop Chrome/Edge, and installed PWA remain part of manual QA coverage.

## Detail-only FFT note

v1.4.14 keeps FFT as detail-only. Dock mini FFT and `renderMini` remain removed to keep the Dock lighter.
