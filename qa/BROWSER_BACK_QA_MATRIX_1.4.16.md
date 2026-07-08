# Browser / Download QA Matrix - v1.4.20

## Focus
Download/share recovery checklist readability and fallback clarity.

| Environment | Download popup | Save assist | Checklist copy | Notes |
| --- | --- | --- | --- | --- |
| KakaoTalk Android in-app | Verify share/save is recommended | Verify file open/external browser guidance | Verify copied text is readable | Blob auto download may be blocked |
| Chrome Android | Verify download-first flow | Verify assist only when needed | Verify optional copy | Check downloaded file name |
| Safari iOS | Verify share/Files behavior | Verify file open wording | Verify copy works where supported | Clipboard may require gesture |
| Android PWA | Verify download/share buttons | Verify no layout cutoff | Verify diagnostics still available | Check safe-area spacing |
| iOS PWA | Verify share/save wording | Verify no clipped bottom sheet | Verify fallback copy | File handoff can be limited |
| Desktop Chrome/Edge | Verify normal download flow | Verify assist is unobtrusive | Verify checklist is not noisy | Confirm no regression |

## v1.4.20 Download flow polish
- Advanced actions are hidden behind the `추가 옵션` toggle.
- Diagnostics copy / 진단 복사 remains available when saving fails.
- `체크리스트 복사` provides a lighter support text than full diagnostics.

## v1.4.20 Download action clarity
- Buttons expose `data-download-action` for download/share/assist/diagnostics/copy checks.
- Primary button shows a recommended action badge.
- Advanced actions are hidden behind the collapsed fallback area by default.

## Navigation / browser back coverage
- KakaoTalk Android in-app: verify beforeunload fallback, popstate confirm, and share/save flow.
- Chrome Android: verify beforeunload, popstate, download, and PWA flow.
- Safari iOS: verify popstate, share sheet, and PWA limitations.
- PWA: verify beforeunload behavior where supported and fallback confirm where not.

## FFT / Spectrum compatibility coverage
- external analyser coverage: preview translation, realtime mastering preview, and difference listen should keep FFT external analyser taps.
- Dock mini FFT: removed from Dock; `#bottomPreviewSpectrum` should not exist.
- runtime health does not require `renderMini`.
- renderMini cleanup: Dock mini canvas management should stay removed.
- Detail-only FFT remains available on analysis/detail screen.

## Stability / performance coverage
- v1.4.20 confirm debounce: repeated back presses should not stack confirm dialogs.
- Dock FFT/back confirm focus: Dock mini FFT remains removed while back/refresh confirm remains protected.
- Performance diagnostics: `FoxBearPerformanceDiagnostics.collectSnapshot()` and `getSummary()` should work.
- Packaging: overwrite ZIP name should follow package.json version.
