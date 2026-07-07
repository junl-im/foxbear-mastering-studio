# Browser / PWA QA Matrix - v1.4.14 Dock Spectrum Cleanup

v1.4.14 finishes the Dock FFT removal by deleting the leftover mini-spectrum API/runtime requirement. The persistent Dock should stay focused on playback, waveform, source switching, and export actions. The FFT spectrum remains available only in the detail analysis panel.

| Environment | Refresh / close expectation | Back expectation | v1.4.14 checks |
| --- | --- | --- | --- |
| KakaoTalk in-app browser Android | Native beforeunload prompt if supported by WebView | App confirm via history/popstate if exposed | Dock has no FFT row; no repeated confirm dialogs; detail spectrum opens only in analysis detail. |
| Chrome Android tab | Native beforeunload prompt during active work | One app confirm, then stay on cancel | Dock playback feels lighter; original/master crossfade still works. |
| Chrome Android installed PWA | Native/browser-managed prompt if supported | Hardware Back shows one app confirm | Settings gear remains centered above Dock; FFT analyser is idle until detail spectrum is mounted. |
| Safari iOS tab | Safari-controlled unload behavior | Browser Back should keep workspace when cancelled | Detail spectrum static graph appears after analysis; live FFT starts only after panel is visible and audio plays. |
| iOS standalone PWA | Limited unload behavior | App-level history guard where supported | No Dock FFT blank strip; settings gear is not offset or clipped. |
| Desktop Chrome/Edge | Native beforeunload prompt during active work | One app confirm | PC settings icon centered; Dock height stable; runtime health does not require `renderMini`. |

## Manual smoke checklist

1. Load app, import a track, and verify the bottom Dock has no FFT/spectrum strip.
2. Play original and mastered preview from Dock; confirm there is no obvious lag spike from spectrum rendering.
3. Open detail view and verify the AI spectrum panel still renders static FFT evidence.
4. Start playback while detail spectrum is visible; live FFT may animate there only.
5. Press Back quickly twice during active work; only one confirm should appear.
6. On desktop/PWA, check that the floating settings gear is visually centered and not clipped by the Dock.


Static DOM expectation: `#bottomPreviewSpectrum` should not exist in the Dock DOM.

Compatibility note: older v1.4.6/v1.4.7 QA smoke still phrases this area as "Dock mini FFT"; in v1.4.14 the expected result is that Dock mini FFT remains removed while Back confirm behavior still works.

External analyser coverage: preview translation, realtime mastering preview, and difference-listen graphs should still feed the detail-only FFT panel through registered external analyser taps when the panel is mounted.
