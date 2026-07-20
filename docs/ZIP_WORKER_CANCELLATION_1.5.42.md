# v1.5.42 ZIP Worker Cancellation and Archive Safety

## Problem

ZIP export previously ran `JSZip.generateAsync()` on the main thread. The progress callback could not safely cancel generation, the ZIP button could start a second concurrent job, and the progress panel close button hid the only visible status without stopping work. Queue clearing or remastering could also run while an archive represented an older output snapshot.

Archive names were case-sensitive during deduplication even though common extraction targets are case-insensitive, and Windows-reserved names were not protected. Versioned Worker requests were not explicitly warmed by the service worker.

## Changes

- Moved STORE-only ZIP generation to `src/workers/zip-encoder.worker.js`.
- Routed ZIP jobs through `FoxBearWorkerJobService` for job IDs, timeout, AbortSignal cancellation, Worker termination, and stale-result isolation.
- Added a visible `ZIP 생성 취소` action and prevented the panel from being hidden during active generation.
- Added duplicate-export locking and disabled mastering/queue clearing while ZIP owns an immutable output snapshot.
- Included ZIP export in cross-tab service-worker update activity.
- Sanitized archive names for path characters, trailing dots/spaces, Windows device names, length, Unicode normalization, and case-insensitive duplicates.
- Cached both plain and versioned Worker URLs for offline execution.
- Marked completion only after the browser download path starts successfully.

## Verification

- Runtime-generated ZIP starts with the PK signature.
- Progress messages retain the active job ID.
- Cancel dispatch reaches the active AbortController and terminates the Worker.
- `CON.wav`, `Song.wav`, and `song.wav` produce safe unique archive names.
- Static regression test: `node qa/v1542_zip_worker_cancellation_smoke.js`.
