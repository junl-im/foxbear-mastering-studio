# v1.5.44 Export Queue Gesture Safety

## Problem

Browsers can block the second and later automatic download, and File System Access or Web Share require transient user activation for every invocation. A normal loop cannot safely save multiple files.

## Implementation

- Validate all completed output Blobs before user delivery begins.
- Keep an in-memory ordered queue with ready, delivering, done, failed, and skipped states.
- Require one explicit `Next file` click per picker, download, or share action.
- Restore picker-dismissed items to ready instead of treating user dismissal as data failure.
- Freeze output-mutating controls and lock destructive mastering and update operations while the queue owns the output snapshot.
- Report origin-cache pressure only as an advisory; browsers do not expose reliable Downloads-folder free space.

## Recovery

A failed item remains retryable. The user may skip it or cancel all pending items. Non-BFCache navigation cancels the queue and releases ownership.
