# FoxBear AI Mastering Studio Pro v1.3.64

## Kakao / In-App Upload Rootfix

### Fixed
- Reworked the file/folder import tiles so the actual `<input type="file">` is nested inside each visible tile and stretched as a transparent overlay.
- This keeps the picker connected to a real user tap in KakaoTalk, Android WebView, Safari, PWA, and desktop browsers instead of relying on programmatic click or fragile hidden-label forwarding.
- Added an import status line under the upload tiles. It now shows whether the app is ready, whether a picker opened, whether selected files reached the app, and what failed if nothing was delivered.
- Added a picker-return watcher for cases where an in-app browser closes the picker without dispatching `change`.
- Added a boot-safe fallback. If full UI initialization fails, file input change handlers are still attached and a visible diagnostic is shown.
- Unknown file names/MIME types from mobile content providers are no longer rejected before decoding. The app now attempts browser decoding first and reports a codec-specific error only if decoding fails.
- Service worker now uses network-first loading for scripts/styles/workers to reduce stale asset/SRI mismatch cases that can make the app look clickable but inactive.

### QA
- Added `qa/kakao_upload_rootfix_smoke.js`.
- Updated native picker/import QA checks for the nested transparent-input architecture.
- `npm run check` passes with SRI, runtime, upload, mobile, deploy, and engine smoke checks.
