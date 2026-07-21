# FoxBear Status - v1.5.45

## v1.5.45 current focus

- Export queue pause/resume and background recovery preserve the current file without automatic delivery.
- Delivery failures expose targeted recovery hints and remain retryable where safe.
- Picker-mode file and remaining-time estimates are advisory only.
- Service-worker export activity returns to idle after completion or cancellation.

## Current status

Static and regression QA is `238/238 PASS`, including v1.5.45 queue recovery coverage. Targets now include the gesture-safe individual export queue. Completed output Blobs are validated before delivery, and each file requires a fresh user click so picker/share/download permissions are not consumed by an automatic batch. Retry, skip, cancel, mastering-control freeze, export ownership, and service-worker update protection are active.


## Release invariants

- `package.json` is the release metadata source of truth.
- Product version, manifest version, visible UI version, service worker generation, and package filename must pass `npm run version:check`.
- Visible release labels are runtime-repaired and diagnosed by `FoxBearReleasePresentation`.
- A release candidate must pass `npm run check:release`; static QA alone is not a release gate.
- A cumulative overwrite package must pass archive verification and a clean-install reverse check.
- Dock mini FFT remains removed; detailed analysis owns spectrum visualization.
- Completed mastered PCM follows `release-after-encode`; downloads and playback retain encoded Blobs and URLs.
- ZIP export must pre-release completed PCM, package audio with `STORE`, enforce working-set limits, run outside the main thread, expose cancellation, reject duplicate jobs, and validate the resulting Blob.
- ZIP and individual export queue activity block service-worker activation, queue clearing, mastering, and automatic remastering until completion or cancellation.
- Archive names must be path-safe, case-insensitively unique, and protected from Windows reserved device names.
- CSP, Trusted Types, SRI, Runtime Health, Update Safety, and service-worker cache recovery remain enabled.

## Current release

- Product version: `1.5.45`
- Build ID: `export-queue-recovery`
- Asset version: `1.5.45-export-queue-recovery`
- Service worker cache: `foxbear-shell-v1.5.45-export-queue-recovery`
- Browser QA target: one-file-per-gesture delivery, picker dismissal retry, restricted-browser share, background return, and export ownership

## v1.5.25 deterministic preview stability invariant

- Blocking-dialog visibility must include hidden/transparent ancestors, not only the dialog node itself.
- Preview playback must begin only after import and render queues are idle and the chosen control has a stable hit-test.
- Translation routing must be judged by explicit media method calls; incidental browser event timing is not the contract.
- The synthetic preview fixture must remain long enough that natural media completion cannot overlap the routing assertions.

## v1.5.24 responsive browser-control invariant

- Cross-device E2E scenarios must select controls by actual rendered visibility, not by assuming a desktop ID is visible on mobile.
- Blocking dialogs must be classified by computed visibility and layout bounds; permanently mounted hidden modal roots are not blockers.
- The preview-routing scenario must still perform a real user click on the visible play control before asserting uninterrupted mode transitions.

## v1.5.23 browser readiness invariant

- Feature-specific browser scenarios must explicitly isolate unrelated blocking dialogs rather than relying on timing.
- A playback click is actionable only after the target is visible, enabled, and owns the center-point hit test.
- E2E-only flags must be opt-in per scenario and must not globally change production behavior.
## v1.5.28 audit status

- Compact 320px header priority rule is guarded by static and rendered geometry tests.
- Playback Link Service exposes lifecycle diagnostics and must return to zero after queue teardown.
- Queue clear and track removal use centralized resource release.
- The newest two legacy service-worker caches are preserved as actual offline recovery sources.
- Stale E2E ownership probes are cleaned before each server start.

