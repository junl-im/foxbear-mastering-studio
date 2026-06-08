# FoxBear Pro v1.3.18 Mastering Hotfix QA Report

## Scope

- Mastering worker creation path
- Firebase Hosting / meta CSP Trusted Types compatibility
- Master finalizer fallback behavior
- MP3 worker vendor encoder import path under strict CSP
- Audio safety repair before finalization and encoding
- Static syntax, SRI, and asset reference checks

## Root cause found

The mastering pipeline depended on runtime worker creation for analysis, pitch/BPM, finalization, WAV encoding, and MP3 encoding. In the Firebase-ready build, the CSP enables `require-trusted-types-for 'script'` with `trusted-types foxbear`, but worker URLs and the MP3 worker `importScripts()` path were plain strings. On strict Chromium/Firebase Hosting this can block worker/script URL sinks. The finalizer worker was also constructed before its fallback `try/catch`, so a worker-construction failure could escape and mark mastering as failed instead of using the local peak guard fallback.

## Fixes applied

- Added a `foxbear` Trusted Types policy in `src/app.js`.
- Added same-origin allow-list validation for known worker/engine script paths.
- Replaced direct `new Worker(...)` calls with `createFoxBearWorker(...)`.
- Moved master finalizer worker construction inside the fallback-protected `try/catch`.
- Added safer worker error message extraction for visible mastering errors.
- Added audio buffer safety repair for non-finite or runaway samples before finalization and before encoding.
- Upgraded the main-thread finalizer fallback so it applies approximate gated loudness targeting plus true-peak/sample-peak guarding instead of peak guard only.
- Hardened `master-finalizer.worker.js` channel/length validation and input/output sanitization.
- Added a worker-side Trusted Types policy for MP3 `importScripts()` and allow-listed the bundled `vendor/lamejs/lame.min.js` path.
- Bumped app/package/UI version to `v1.3.18`.
- Recomputed `index.html` SRI hashes after code changes.

## Commands/checks run

```bash
npm run check
```

Passed:

- `src/firebase-bootstrap.js`
- `src/app.js`
- `src/workers/analysis.worker.js`
- `src/workers/wav-encoder.worker.js`
- `src/workers/mp3-encoder.worker.js`
- `src/workers/master-finalizer.worker.js`
- `src/workers/pitch-wsola.worker.js`
- `src/engines/pitch-engine-adapter.js`

Additional checks:

- `index.html` SRI verification: PASS
- `design-preview.html` SRI verification: PASS
- duplicate HTML id scan: PASS
- local HTML asset reference scan: PASS
- CSS brace balance: PASS
- `master-finalizer.worker.js` synthetic render harness: PASS
- `wav-encoder.worker.js` synthetic encode harness: PASS

## Manual browser check still recommended

Open the deployed Firebase Hosting URL in Chrome/Edge and test:

1. Load one WAV/MP3 file.
2. Run one-track mastering with output `wav24`.
3. Run one-track mastering with output `mp3_320`.
4. Confirm the mastered preview plays and file download is non-empty.

