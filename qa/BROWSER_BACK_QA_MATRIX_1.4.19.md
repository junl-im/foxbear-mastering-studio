# v1.4.21 Download dialog first-screen declutter QA Matrix

## Scope
v1.4.21 keeps all v1.4.11~v1.4.18 Kakao/mobile download fallback tools, but reduces what is visible when the download dialog first opens.

## Static expectations
- `FoxBearDownloadService.getDownloadDialogDisplayProfile()` exists and reports `restricted-declutter` / `standard-declutter` modes.
- Runtime Health requires `FoxBearDownloadService.getDownloadDialogDisplayProfile`.
- Main download dialog uses `download-options-panel-v5` and `data-download-display-mode`.
- Initial dialog render calls `renderReceipt(..., { initial: true })`.
- Initial receipt uses `.is-idle`.
- Full checklist stays hidden on open with `.download-options-checklist.is-empty`.
- After download/share/assist/diagnostics/copy actions, receipt and checklist can render normally.
- Advanced actions remain behind `추가 옵션` by default.

## Manual QA targets

| Environment | Expected first screen | Expected fallback |
| --- | --- | --- |
| KakaoTalk Android in-app | Short message: use `공유/저장` first | `저장 도움` -> `파일 열기`, then `추가 옵션` for diagnostics/address |
| Android Chrome | `다운로드` remains primary | Download folder, then save assist only if needed |
| iOS Safari | Popup fits viewport; no long checklist on open | Share/save sheet or file open remains reachable |
| Android PWA | Dialog remains short and scrollable above Dock | Additional options remain collapsed |
| Desktop Chrome/Edge | Download remains primary; advanced options are not noisy | Diagnostics/copy remain available under additional options |

## Regression checks
- Dock FFT remains removed.
- Performance diagnostics remain hidden unless enabled.
- Download/share diagnostics remain available.
- `npm run sri:update`, `npm run check`, `npm run package:clean`, and `npm run package:overwrite` should pass.

## Carry-forward legacy anchors
- KakaoTalk, Chrome Android, Safari iOS, PWA, beforeunload, popstate are still part of the browser-back matrix.
- Performance diagnostics remain available behind `?perf=1` and `Ctrl/Command + Alt + P`.
- v1.4.21 Download flow polish carry-forward: recommendations, receipt, checklist, and diagnostics copy remain connected.
- v1.4.21 Download action clarity carry-forward: all primary buttons keep `data-download-action` metadata.
- v1.4.21 Download dialog micro hint carry-forward: `download-options-compact-hint` remains visible.
- Advanced actions are hidden behind `추가 옵션` / additional options by default.
- Diagnostics copy / 진단 복사 remains available under additional options.
- FFT external analyser / external analyser coverage remains intact for realtime preview paths.
- Back confirm behavior still covers confirm, beforeunload, and popstate handling.
- Dock mini FFT remains removed; `#bottomPreviewSpectrum` should not exist.
- runtime health does not require `renderMini` after Dock spectrum cleanup.
