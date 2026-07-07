# FoxBear v1.4.10 Browser Back / Refresh QA Matrix

Purpose: verify that the v1.4.1 exit guard still protects active mastering sessions after v1.4.10 Dock/player changes.

## Expected behavior

- Refresh, tab close, or browser close: native browser `beforeunload` confirmation appears when there is an imported/active/processing/export-ready session. Custom text is not guaranteed because modern browsers replace it with their own wording.
- Browser Back / Android hardware Back / PWA Back: app-level confirmation appears through the `popstate` guard. Cancel keeps the workspace open; confirm allows the browser to leave.
- Idle empty workspace: navigation should not be blocked.

## Manual matrix

| Surface | Refresh / close | Back gesture / button | Notes |
| --- | --- | --- | --- |
| KakaoTalk in-app browser Android | Native beforeunload prompt when active | App confirm via popstate where the webview exposes history | Some Kakao versions may suppress beforeunload on forced close; Back is the primary protection. |
| Chrome Android browser | Native beforeunload prompt when active | App confirm on Android Back and toolbar Back | Verify imported file, active playback, and completed render cases. |
| Chrome Android installed PWA | Native beforeunload may not show on OS task kill | App confirm on hardware Back | Main PWA target. Cancel must push state back to the workspace. |
| Safari iOS browser | Native beforeunload support varies | App confirm on browser Back when history event is delivered | iOS can discard tabs without unload; local state should remain resilient. |
| iOS standalone PWA | Native prompt is limited | App confirm where standalone Back is available | No hardware Back; test gesture/history paths only. |
| Desktop Chrome/Edge | Native beforeunload prompt when active | App confirm on toolbar Back | Also verify keyboard Alt-left / Cmd-left. |

## v1.4.10 regression focus

- Dock source switches with crossfade must not create extra history entries.
- Dock mini spectrum rendering must not trigger navigation guard state by itself.
- Waveform zoom double-tap/pinch must not bubble into browser page zoom or back gestures.
