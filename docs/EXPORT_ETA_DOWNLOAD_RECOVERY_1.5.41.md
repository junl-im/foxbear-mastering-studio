# v1.5.41 Export ETA and Download Recovery

## Scope

- Keep the download dialog visible until the browser download path has actually started successfully.
- Show elapsed time and a bounded remaining-time estimate during MP3/WAV conversion.
- Detect long gaps between worker progress events and explain background throttling or response waits.
- Disable every dialog action except the explicit cancel button while one export action owns the dialog.
- Clean progress timers and visibility/page-show listeners when a dialog is replaced or closed.

## Failure contract

A failed `downloadBlob()` call must leave the dialog attached so the error and fallback actions remain visible. The dialog may close only after download initiation succeeds.

## Timing contract

ETA is advisory. It begins only after measurable progress, never decreases the worker percent, and changes to a stalled/background message after twelve seconds without a progress event.
