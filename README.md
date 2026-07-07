# FoxBear AI Mastering Studio Pro v1.4.12

## Current patch: v1.4.12 Download diagnostics follow-up

- Runtime asset cache key: `1.4.12-download-diagnostics`
- Service worker cache: `foxbear-shell-v1.4.12-download-diagnostics`
- Package version: `1.4.12`
- Manual QA doc: `qa/BROWSER_BACK_QA_MATRIX_1.4.12.md`

### v1.4.12 focus

v1.4.11 improved Kakao/in-app browser download and share fallback. v1.4.12 adds copyable diagnostics so failures can be understood instead of guessed.

- Main download dialog and save-help sheet include `진단 복사`.
- Download service records recent save/share events in a bounded in-memory history.
- Diagnostic snapshot includes browser environment, file size/type, share support, anchor download support, File System Access support, PWA/standalone mode, and recent download/share events.
- Save-help sheet shows capability badges for fast manual QA.
- Runtime health checks the new diagnostics helpers.

### Manual check

Open the app in a target browser, finish a mastering output, open the download dialog, try share/download, then press `진단 복사` if something fails. The copied JSON is intended for private support/debug handoff.

## Cumulative compatibility notes

- Download/share fallback from v1.4.11 remains active.
- Hidden performance diagnostics from v1.4.9/v1.4.10 remain available with `?perf=1` or `Ctrl/Command + Alt + P`.
- Dock mini FFT remains removed; FFT stays detail-panel only.
- PC/PWA floating settings gear alignment remains retained.
- Crossfade, waveform zoom, browser exit guard, and analyser tap support remain cumulative.
- Stage7, Stage9, Stage27, and Stage28 QA anchors remain part of the cumulative release line.

## Cumulative visible/hidden tools

- Spectrum detail view and Exit Guard remain cumulative.
- Performance diagnostics remain available through `?perf=1` or `Ctrl/Command + Alt + P`; use 복사 for diagnostics handoff.
- Download diagnostics are copied through `진단 복사` in the download/help flow.
- detail-only FFT remains active; Dock mini FFT and `renderMini` remain removed.
