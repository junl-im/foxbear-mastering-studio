# v1.4.11 project notes - Download/share reliability

v1.4.11 focuses on user-facing file save reliability. The main risk was relying on client-side Blob downloads in Kakao/in-app browsers. The new flow prefers share/save and presents a larger save-help sheet with fallback instructions.

## Design decision

- Keep the file client-side; no server upload was added.
- Warn users that external-browser opening cannot carry the in-memory mastered Blob with it.
- Use feature detection for `navigator.share`, `navigator.canShare(files)`, anchor download, and File System Access instead of browser-name-only logic.
- Make the dialog bigger because the previous compact popup could hide important Kakao guidance.

## Follow-up

Real-device Kakao tests are still required. If Kakao blocks file share as well as anchor download, the most reliable production-grade fix would be a server-side download endpoint with proper `Content-Disposition` headers.

---

# v1.4.11 project notes - Performance diagnostics

v1.4.11 keeps patch release versioning and uses the runtime/cache key `1.4.11-download-share-reliability`.

## Decision

After Dock FFT was removed, the next useful patch is not another visible control. The app needs a small way to diagnose lag reports without guessing. v1.4.11 adds a hidden diagnostics layer that can be enabled only during QA or troubleshooting.

## Technical notes

- `FoxBearPerformanceDiagnostics.collectSnapshot(reason)` returns a compact runtime snapshot.
- `FoxBearPerformanceDiagnostics.getSummary()` returns warning flags for multiple audible audio, long tasks, canvas buildup, hidden spectrum loops, and runtime-health issues.
- `serializeSnapshot()` and `copySnapshotToClipboard()` make support handoff easier when the user reports 랙.
- The diagnostics panel refresh is adaptive: foreground uses the normal interval, hidden tabs use throttled refresh, and `visibilitychange` reschedules the next check.
- `tools/create-overwrite-zip.sh` now derives the default overwrite ZIP name from `package.json`, avoiding stale overwrite ZIP names in later patch releases.
- Snapshot fields include audio totals/playing/audible counts, canvas and spectrum panel counts, runtime health summary, navigation guard state, playback orchestration summary, memory info where supported, and recent long-task entries where supported.
- `PerformanceObserver` for `longtask` is only started when diagnostics are enabled.
- The diagnostics panel is hidden by default and uses external CSS to satisfy the current CSP.
- Keyboard toggle: `Ctrl/Command + Alt + P`.
- URL/localStorage toggles: `?perf=1`, `?foxbearPerf=1`, or `localStorage['foxbear-perf-diagnostics']='on'`.
- Dock mini FFT remains removed and `renderMini` remains absent.
- `FoxBearSpectrumVisualizer.activateAudio()` still bails when no detail canvas is mounted.
- Keep `index.html`, `sw.js`, runtime health, package version, and SRI on the same `1.4.11-download-share-reliability` cache key.

## Next suggested patch

Use the diagnostics panel during real device QA. If a concrete hotspot appears, v1.4.11 should tune that hotspot rather than adding broad new UI.

## Cumulative history anchors

Stage7 through Stage28 remain cumulative. Stage27 owns `waveform-control-service.js`; Stage28 owns `waveform-control-view.js` and unmanaged waveform audit. v1.4.1-v1.4.8 remain cumulative for spectrum detail view, exit guard, crossfade, waveform zoom, FFT cleanup, settings gear alignment, and Dock cleanup.

## Cumulative QA anchors kept for current v1.4.11

- Stage12 remains part of the cumulative line.
- Stage27 waveform-control-service remains active and documented.
- Stage28 unmanaged waveform audit remains active through waveform-control-view.js.
- Spectrum and Exit Guard from v1.4.1 remain active.
- Dock mini FFT was removed and should remain removed unless a future explicit toggle explains it clearly.
- `renderMini` was removed and runtime health does not require `FoxBearSpectrumVisualizer.renderMini`.
- Dock FFT removal and PC settings gear alignment are retained.
- Stability polish for FFT lifecycle and Back confirm debounce remains active.
- External analyser coverage remains important for WebAudio previews.
- v1.4.11 polishes performance diagnostics with adaptive refresh and copyable summaries, not a visible Dock feature.

## Legacy cumulative anchors for QA wording

Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage13, Stage14, Stage16, Stage17, Stage18, Stage19, Stage20, Stage21, Stage22, Stage23, Stage24, Stage25, Stage26, Stage27, and Stage28 remain cumulative.
Stage9.1 cumulative overwrite manifest and Stage10 download service split are retained.

## v1.4.11 cumulative compatibility notes

- Dock mini FFT was removed and remains removed.
- renderMini was removed; detail-only FFT is the supported path.

