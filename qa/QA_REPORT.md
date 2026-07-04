# FoxBear Pro v1.3.28 QA Report

## Pro v1.3.28 lookahead limiter update

- Added quality-mode lookahead limiting to the finalizer worker: 1.5ms Fast, 3ms Balanced, 5ms Max.
- Updated browser fallback finalizer to use the same lookahead envelope limiter.
- Reduced reliance on broad pre-ceiling gain trim so transient sections are controlled more locally.
- Added limiter metadata to finalizer info and JSON reports.
- Refreshed app version, cache busters, and SRI hash.
- Detailed report: `qa/QA_REPORT_LOOKAHEAD_LIMITER_1.3.28.md`.

# FoxBear Pro v1.3.16 QA Report

## Pro v1.3.26 admin UID security hotfix

- Removed client-side admin password flow.
- Added Firebase UID admin-profile gate for the statistics trigger.
- Verified `npm run check` and SHA-384 SRI hashes.
- Detailed report: `qa/QA_REPORT_ADMIN_SECURITY_1.3.26.md`.

## Scope

- Selection/non-selection visual contrast
- Track click vs explicit selection behavior
- Action panel naming polish
- Popup close button centering
- In-app browser download alternatives
- CSP/security hardening and Firebase Hosting header readiness

## Changes verified statically

- Non-selected `.track-card` variants, including `active-track` and `genre-locked`, end with black border rules and no colored outer shadow.
- Selected track cards keep colored borders so selected/non-selected states are visually distinct.
- Card click calls `activateTrackOnly()` only; selection is handled by `작업 선택` / `선택 해제` buttons.
- Double-click, Delete, and Backspace still clear selection.
- `masterSelectedTracks()` no longer falls back to the active/current track when no explicit selection exists.
- `작업 실행` section label changed to `마스터링 엔진` with an Engine / Export badge.
- Close buttons use flex centering and line-height normalization.
- Download helper now includes direct-save, native-share, file-open, and page-url-copy alternatives when browser support is available.
- `firebase.json` added with strict deploy-time HTTP security headers.

## Command checks

```bash
npm run check
```

Passed:

- `src/app.js`
- `src/workers/analysis.worker.js`
- `src/workers/wav-encoder.worker.js`
- `src/workers/mp3-encoder.worker.js`
- `src/workers/master-finalizer.worker.js`
- `src/workers/pitch-wsola.worker.js`
- `src/engines/pitch-engine-adapter.js`

## Security checks

- CSP keeps `script-src 'self'`, `style-src 'self'`, `connect-src 'self'`, `worker-src 'self'`.
- No CDN script dependency is required for JSZip/lamejs.
- Local CSS/JS SRI hashes refreshed after edits.
- Firebase Hosting config includes deploy-time HTTP headers that cannot be fully delivered by GitHub Pages meta tags alone.

## Manual checks still recommended

- KakaoTalk in-app browser download behavior must be verified on a real device because WebView download permissions vary by OS/browser build.
- Direct Save uses the File System Access API where available; unsupported browsers will show the other fallback buttons.
- Firebase Hosting headers should be checked after deployment with browser DevTools or an HTTP header scanner.
