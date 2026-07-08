# Browser / Download QA Matrix - v1.4.20

## v1.4.20 Download action clarity
- Verify every primary download/share/help button exposes `data-download-action`.
- Verify the recommended button keeps `data-recommended="true"` and a visible 추천 badge.
- Advanced actions are hidden behind the `추가 옵션` toggle on first open.

## v1.4.20 Download recovery compact checklist
- Kakao in-app: download dialog shows a compact 3-step save order, not the full diagnostics text.
- Kakao in-app: if sharing fails, save-assist opens and the compact checklist remains readable.
- Android Chrome: normal download remains the recommended action, and the checklist is limited to core fallback steps.
- iOS Safari/PWA: file share/save and assist flows still show next-step receipt text.
- Support case: `체크리스트 복사` copies short instructions, while `진단 복사` copies JSON.

## Navigation / PWA sanity
- Browser back guard still shows one confirmation at a time.
- Refresh/close guard still uses native browser confirmation where supported.
- Download dialogs can be closed without leaving stale body state.

## Compatibility anchors retained for cumulative smoke QA
- KakaoTalk in-app browser must remain covered for share/save fallback.
- FFT external analyser / external analyser coverage remains documented for preview-translation and difference-compare graphs.
- v1.4.20 stability focus: confirm debounce, navigation guard, and Dock mini FFT removal remain valid.
- Dock mini FFT removal: `#bottomPreviewSpectrum` should not exist in the Dock DOM.
- renderMini cleanup: `FoxBearSpectrumVisualizer.renderMini` should remain removed; detail-only FFT is intentional.
- Performance diagnostics remain available with `?perf=1`, `Ctrl/Command + Alt + P`, `getSummary`, and copy support.
- v1.4.20 Download flow polish: recommended flow card, advanced actions hidden behind 추가 옵션, and diagnostics copy / 진단 복사 remain available.
- Packaging polish: release and overwrite ZIP names follow package version automatically.

## Device rows retained from browser-back QA matrix
- KakaoTalk
- Chrome Android
- Chrome Android PWA
- Safari iOS
- iOS standalone PWA
- desktop Chrome

## Detail-only FFT cleanup confirmation
- runtime health does not require `renderMini`.
- beforeunload native guard remains covered.
- popstate app guard remains covered.
