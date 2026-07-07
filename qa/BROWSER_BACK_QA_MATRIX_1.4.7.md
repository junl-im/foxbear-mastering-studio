# Browser Back / Refresh QA Matrix - v1.4.12

v1.4.12 removes the Dock mini FFT view because it was not clear enough for users and consumed Dock space. The detail-page spectrum panel remains available for users who want the FFT evidence view.

Purpose: verify that removing Dock FFT does not break active-session exit protection, Dock playback, crossfade, waveform zoom, or real-time detail spectrum.

## Browser / PWA surfaces

| Surface | Refresh / close | Back gesture / button | v1.4.12 focus |
| --- | --- | --- | --- |
| KakaoTalk in-app browser Android | Native beforeunload prompt when supported | App confirm via popstate where available | Dock has no FFT row; Back confirm appears once; playback remains smooth. |
| Chrome Android browser | Native beforeunload prompt when active | Android Back and toolbar Back | No Dock FFT canvas; crossfade and waveform seek still work. |
| Chrome Android PWA | Native prompt may vary | Hardware Back should trigger app confirm | Dock height is lower; settings gear stays reachable and aligned above Dock. |
| Safari iOS | Native prompt is limited | Toolbar Back | Detail spectrum can still show static/live FFT when opened. |
| iOS standalone PWA | Limited native prompt | No hardware Back | No stale Dock FFT canvas after background/foreground. |
| Desktop Chrome/Edge | Native beforeunload prompt when active | Toolbar Back / keyboard Back | PC settings gear alignment and Dock compact layout. |

## v1.4.12 regression focus

- `#bottomPreviewSpectrum` should not exist in the Dock DOM.
- Dock render should not call `renderBottomMiniSpectrum()`.
- FFT live connection should not create an analyser when no spectrum canvas is mounted.
- Detail spectrum panel still renders through `FoxBearSpectrumVisualizer.renderPanel()`.
- External analyser support remains for realtime mastering preview, preview translation, and difference listen.
- PC floating settings gear should be centered in its circular button and aligned above the Dock.
- Hidden-tab visibility recovery should remain intact for the detail spectrum panel.

- external analyser coverage remains for detail spectrum paths when the panel is mounted.
