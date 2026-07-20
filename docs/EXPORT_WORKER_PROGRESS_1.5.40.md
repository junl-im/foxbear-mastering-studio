# v1.5.40 Export Worker Progress and Cancellation

## Goal

Long MP3/WAV conversion and master-finalizer work must never look frozen. The runtime now reports worker phases, exposes a cancel action, surfaces timeout recovery, and ignores stale progress or completion messages from older jobs.

## Runtime changes

- `FoxBearWorkerJobService.run()` recognizes progress messages separately from terminal worker responses.
- MP3, WAV, and master-finalizer workers emit bounded progress events with the active job ID.
- The download dialog shows stage, percent, detail, and a `변환 취소` button.
- Cancellation terminates the worker through `AbortController`; late messages cannot update the current job.
- Worker timeouts remain visible instead of silently falling back to another format.
- Track mastering cards receive finalizer and encoder phase telemetry during the last processing stages.

## Safety rules

- Progress callbacks cannot settle a worker promise.
- A response with a different job ID is ignored.
- Closing or replacing the download dialog aborts its active conversion.
- Same-format downloads still validate the existing Blob without unnecessary re-encoding.
- Timeout and user cancellation produce different recovery guidance.
