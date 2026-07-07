# v1.4.12 project notes - Download diagnostics follow-up

v1.4.12 keeps the v1.4.11 Kakao/in-app download fallback work and adds support diagnostics for the cases that still fail on real devices.

## Decision

Client-side Blob downloads can fail differently across KakaoTalk WebView, Android Chrome, iOS Safari, and PWA standalone mode. Instead of guessing, the download service now records a short event history and exposes a one-tap diagnostics copy path.

## Technical notes

- `FoxBearDownloadService.getDownloadDiagnostics(blob, fileName)` returns file, capability, environment, and recent event data.
- `copyDownloadDiagnostics(blob, fileName, deps)` copies the diagnostics JSON through Clipboard API or textarea fallback.
- The event history is capped by `MAX_DOWNLOAD_DIAGNOSTIC_EVENTS` so it cannot grow unbounded.
- Recorded events include share start/success/failure, unsupported/cannot-share cases, object URL creation, anchor clicks, assist opens, external browser attempts, guide copy, diagnostics copy, and file-picker saves.
- The main dialog and assist sheet both expose `진단 복사`.
- The assist sheet now shows capability badges: share support, anchor download support, File System Access, and PWA/browser mode.
- Runtime health requires `FoxBearDownloadService.getDownloadDiagnostics` and `FoxBearDownloadService.copyDownloadDiagnostics`.

## Follow-up

Use real-device Kakao/Chrome/Safari/PWA testing to collect diagnostics from failures. If Kakao still blocks all client-side options, the production-grade fix remains a server download endpoint with proper `Content-Disposition` headers.

## Cumulative history anchors

Stage7 through Stage28 remain cumulative. Stage27 owns `waveform-control-service.js`; Stage28 owns `waveform-control-view.js` and unmanaged waveform audit. v1.4.1-v1.4.12 remain cumulative for spectrum detail view, exit guard, crossfade, waveform zoom, FFT cleanup, settings gear alignment, performance diagnostics, and download/share reliability.

## Cumulative smoke compatibility notes

- Stage8 compact mobile Dock overlay anchors remain part of the cumulative line.
- Stage9 Dock waveform CSS split remains part of the cumulative line.
- Stage9.1 누적 덮어쓰기 manifest remains part of the cumulative line.
- Stage10 download service split remains part of the cumulative line.
- Stage11 large modular renovation remains part of the cumulative line.
- Stage11.1 runtime/mobile hotfix remains part of the cumulative line.
- Stage12 detail view split remains part of the cumulative line.
- Stage13 runtime health and Stage14 runtime recovery remain part of the cumulative line.
- Stage27 waveform-control-service remains active.
- v1.4.12 Exit Guard remains active for refresh/back protection.
- Dock mini FFT was removed and should stay removed unless a future explicit toggle explains it clearly.
- `renderMini` was removed as part of the detail-only FFT cleanup.
- Performance diagnostics remain available through `FoxBearPerformanceDiagnostics` and adaptive refresh.
