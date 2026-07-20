# Runtime Exception Hardening 1.5.35

This release hardens failure paths that are difficult to reproduce through the normal interface: hidden-tab spectrum scheduling, closed AudioContext reconnection, decode abort races, per-track batch exceptions, implicit UI state, invalid queue options, malformed worker messages, partial direct-save writes, blocked IndexedDB upgrades, and atomic replacement of mastered Blob URLs.

The main invariant is that a recoverable failure must not leave the app permanently busy, revoke the last valid output, resurrect a cancelled analysis, stall a queue with `NaN`, or convert cancellation into an unsupported-codec error.
