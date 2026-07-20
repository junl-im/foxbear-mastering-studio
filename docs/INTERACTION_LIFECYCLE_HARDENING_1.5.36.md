# Interaction Lifecycle Hardening 1.5.36

## Fixed paths

- Direct file saving now calls `showSaveFilePicker()` before asynchronous Blob inspection so the browser still recognizes the user's click.
- Verified output Blobs are cached and can use same-click Web Share or anchor download paths without repeating header I/O.
- Re-encoded formats no longer attempt Web Share after the original click permission has expired; the save-assist panel provides a fresh explicit action.
- Repeated or replaced save-assist panels revoke their previous Blob URLs, and every assist URL has a bounded maximum lifetime.
- Download actions are single-flight and cannot clear unrelated global mastering state.
- ZIP and JSON report download failures are awaited and surfaced instead of becoming unhandled promise rejections.
- BFCache `pageshow` restoration rebuilds the navigation exit guard and clears stale page-hiding state.

## Manual validation

1. Test same-format Share and Direct Save in Chrome/Edge.
2. Test converted MP3/WAV sharing through the second save-assist click.
3. Test Safari file/share behavior where supported.
4. Open/close the save-assist repeatedly and confirm navigation warnings disappear after cleanup.
5. Navigate away and return with back/forward cache, then retest the exit confirmation.
6. Test Kakao Android intent and iPhone external-browser button behavior on real devices.
