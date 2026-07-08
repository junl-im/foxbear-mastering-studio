# v1.4.21 Download dialog micro hint QA matrix

## Scope
v1.4.21 keeps the v1.4.11-v1.4.17 download/share fallback stack, but makes the first download dialog shorter.

## Static expectations
- Build markers use `1.4.23-audio-decode-memory-guard`.
- `FoxBearDownloadService.getDownloadDialogCompactHint()` is exposed.
- Runtime Health checks `FoxBearDownloadService.getDownloadDialogCompactHint`.
- Main dialog renders `.download-options-compact-hint` before warning/receipt/checklist content.
- First-screen flow steps are capped by `visibleStepLimit`.
- Diagnostics, guide copy, checklist copy, and external browser actions remain under `추가 옵션`.
- Each compact flow step is appended once; no duplicate `steps.appendChild(item)` path remains in download dialog view.

## Manual device matrix

| Environment | Expected result |
| --- | --- |
| KakaoTalk Android in-app browser | Download popup shows a short micro hint: 공유/저장 first, then 파일 열기. Additional diagnostics stay under 추가 옵션. |
| Android Chrome | Download remains the recommended primary action. First screen is not crowded by diagnostic copy controls. |
| Android PWA | Download/share buttons remain usable and micro hint does not overlap Dock or settings layer. |
| iOS Safari | Share/assist wording stays short; extra copy/diagnostic actions remain available after 추가 옵션. |
| iOS standalone PWA | Compact hint remains visible; popup content fits within the viewport. |
| Desktop Chrome/Edge | Download remains primary; popup still shows format options and action buttons clearly. |

## Regression coverage
- v1.4.11 share/download fallback remains active.
- v1.4.12 diagnostics copy remains available.
- v1.4.13 additional options remain collapsed by default.
- v1.4.14 explicit `data-download-action` roles remain active.
- v1.4.15 action receipt remains active.
- v1.4.16 recovery checklist copy remains available.
- v1.4.17 compact recovery fallback remains available.

## Browser back compatibility anchors
- KakaoTalk browser back: beforeunload may be limited, popstate remains the app-level guard.
- Chrome Android browser back: beforeunload and popstate should both be checked.
- Safari iOS browser back: beforeunload coverage varies; popstate should remain stable.
- PWA browser back: standalone PWA hardware/back gestures should not lose work silently.

## Audio analyser regression anchor
- FFT external analyser coverage remains active for realtime preview, translation preview, and difference-listen paths.

## Stability regression anchor
- v1.4.21 confirm behavior remains covered through beforeunload/popstate checks.
- Dock mini FFT remains removed by design; the download dialog micro hint patch must not reintroduce Dock spectrum UI.

## Dock FFT removal regression anchor
- `#bottomPreviewSpectrum` should not exist in the DOM.
- Dock mini FFT should not exist; detail-only FFT remains the intended behavior.
- renderMini cleanup remains active; `FoxBearSpectrumVisualizer.renderMini` should not be required and Dock mini spectrum CSS should stay removed.
- runtime health does not require `renderMini`; Dock mini spectrum remains removed and detail FFT remains available.

## Performance diagnostics regression anchor
- v1.4.21 Performance diagnostics remain available through `?perf=1` and Ctrl/Command + Alt + P.

## v1.4.21 Download flow polish diagnostics anchor
- Diagnostics copy / 진단 복사 remains available from 추가 옵션 and save-assist paths.
- Advanced actions are hidden behind `추가 옵션` by default so the first download screen stays short.

## v1.4.21 Download action clarity anchor
- Primary and secondary buttons keep explicit `data-download-action` values for download/share/assist/diagnostics/copy.
