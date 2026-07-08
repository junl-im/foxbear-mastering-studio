# Browser Back / Refresh QA Matrix - v1.4.18

v1.4.18 is a stability-polish pass over v1.4.5. It keeps the external analyser tap coverage, then adds spectrum visibility lifecycle checks and duplicate Back-confirm debounce checks for real browser/PWA testing.

Purpose: verify that the v1.4.1 exit guard still protects active mastering sessions after v1.4.18 FFT lifecycle and navigation guard changes.

## Expected behavior

- Refresh, tab close, or browser close: native browser `beforeunload` confirmation appears when there is an imported/active/processing/export-ready session. Custom text is not guaranteed because modern browsers replace it with their own wording.
- Browser Back / Android hardware Back / PWA Back: app-level confirm appears through the `popstate` guard. Cancel keeps the workspace open; confirm allows the browser to leave.
- Rapid double Back: only one confirm should be open at a time; a cancelled prompt should asynchronously re-arm the guard.
- Idle empty workspace: navigation should not be blocked.

## Manual matrix

| Surface | Refresh / close | Back gesture / button | v1.4.18 stability focus |
| --- | --- | --- | --- |
| KakaoTalk in-app browser Android | Native beforeunload prompt when active, if supported | App confirm via popstate where the webview exposes history | Confirm debounce, Dock mini FFT recovery after returning from hidden/foreground state. |
| Chrome Android browser | Native beforeunload prompt when active | App confirm on Android Back and toolbar Back | Verify rapid Back taps, cancelled prompt re-arm, and live FFT after screen lock/unlock. |
| Chrome Android installed PWA | Native beforeunload may not show on OS task kill | App confirm on hardware Back | Primary PWA target. Cancel must push state back to the workspace. |
| Safari iOS browser | Native beforeunload support varies | App confirm on browser Back when history event is delivered | Test visibility changes from app switcher and audio resume behavior. |
| iOS standalone PWA | Native prompt is limited | App confirm where standalone Back/history is available | No hardware Back; check visibility lifecycle and FFT static fallback. |
| Desktop Chrome/Edge | Native beforeunload prompt when active | App confirm on toolbar Back and keyboard Back | Also verify Alt-left / Cmd-left and hidden-tab FFT throttling. |

## v1.4.18 regression focus

- Dock mini spectrum rendering must resume after document visibility changes from hidden to visible.
- Hidden-tab FFT should throttle instead of burning a full render loop.
- Full detail spectrum and Dock mini spectrum must release disconnected canvases instead of drawing stale refs.
- Back confirm must be debounced so rapid Back does not stack multiple dialogs.
- Cancelled Back must re-arm the guard asynchronously and leave the workspace usable.
- External analyser modes from v1.4.5 must still drive live FFT: realtime mastering preview, preview translation, and difference listen.
- Dock source switches with crossfade must not create extra history entries.
- Waveform zoom double-tap/pinch must not bubble into browser page zoom or back gestures.
