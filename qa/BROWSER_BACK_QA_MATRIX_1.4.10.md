# Browser/PWA QA Matrix - v1.4.11 Performance diagnostics

## Scope

v1.4.11 keeps Dock FFT removed and polishes hidden performance diagnostics with adaptive refresh, warning summaries, copyable snapshots, and package-version synced overwrite ZIP generation. This matrix focuses on confirming that diagnostics are available for troubleshooting without changing the normal user experience.

## Common checks

| Area | Expected result |
| --- | --- |
| Normal launch | Diagnostics panel is hidden by default. |
| URL toggle | Opening with `?perf=1` shows the diagnostics panel. |
| Keyboard toggle | `Ctrl/Command + Alt + P` opens/closes the panel. |
| Snapshot API | `window.FoxBearPerformanceDiagnostics.collectSnapshot()` returns audio, DOM, runtime, spectrum, navigation guard, and playback summaries. |
| Summary API | `window.FoxBearPerformanceDiagnostics.getSummary()` returns warning flags for likely lag causes. |
| Copy action | Diagnostics panel 복사 button or `serializeSnapshot()` can provide JSON for support handoff. |
| Hidden tab | Diagnostics refresh is throttled while the document is hidden/backgrounded. |
| Packaging | `npm run package:overwrite` creates a ZIP that follows `package.json` version. |
| Dock | Dock has no mini FFT/spectrum row. |
| Detail spectrum | Detail panel FFT still renders only when the detail panel is mounted. |
| Back guard | Active work still triggers one back/exit confirmation, not stacked confirmations. |

## Device/browser pass

| Environment | Launch | Diagnostics | Dock | Back/refresh |
| --- | --- | --- | --- | --- |
| Desktop Chrome/Edge | Load app normally | `Ctrl/Alt/P` toggles panel | No FFT row | Confirm appears during active work |
| Chrome Android | Load app normally | `?perf=1` shows panel | No FFT row | Hardware/browser Back guarded |
| Kakao in-app browser Android | Load app normally | `?perf=1` shows panel if supported | No FFT row | Back guarded when possible |
| Safari iOS | Load app normally | `?perf=1` shows panel | No FFT row | Native beforeunload wording may be browser-controlled |
| Android PWA | Launch installed app | `?perf=1` route or localStorage toggle | No FFT row | Hardware Back guarded |
| iOS standalone PWA | Launch installed app | localStorage toggle before install if needed | No FFT row | PWA exit behavior is platform-controlled |

## Notes

- Long-task entries appear only on browsers that support the Long Tasks API.
- Memory values appear only where `performance.memory` is available.
- Diagnostics should be used for QA/troubleshooting and kept off for normal users.

## Cumulative retained checks

- KakaoTalk in-app browser should still show the guarded Back/exit behavior when supported.
- Chrome Android, Safari iOS, PWA, beforeunload, and popstate remain covered.
- External analyser coverage remains important for realtime mastering, preview translation, and difference listen WebAudio graphs.
- v1.4.11 retains Dock mini FFT removal and Back confirm focus from the stability polish line.
- Dock mini FFT and `#bottomPreviewSpectrum` should not exist.
- Runtime health does not require `renderMini`.
- The diagnostics panel should help inspect performance without reintroducing Dock FFT.

## Exact audit phrases

external analyser coverage remains part of the WebAudio QA path.
runtime health does not require `renderMini` after Dock spectrum cleanup.

- v1.4.11 Performance diagnostics polish includes adaptive refresh, getSummary, copyable snapshots, and Packaging sync.
