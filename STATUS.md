# FoxBear Status - v1.5.46

## v1.5.46 current focus

- Recommendation values remain finite under incomplete analysis caches.
- Recommended, requested, and effective DSP settings are auditable per render.
- True Peak is the primary peak ceiling signal when finalizer telemetry exists.
- Render-time LUFS and ceiling values drive filenames and export reports.
- Firebase CDN modules are pinned to 12.16.0.

## Current status

Engine bench, golden-audio, shared-DSP, recommendation explainability, strength-profile, quality-gate, and v1.5.46 audit coverage are active. Static and regression QA is `239/239 PASS` after completing the registered list in deterministic continuation segments.

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
- Asset version: `1.5.46-engine-recommendation-api-audit`
- Service worker cache: `foxbear-shell-v1.5.46-engine-recommendation-api-audit`
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


## Release metadata

- Product version: `1.5.46`
- Build ID: `engine-recommendation-api-audit`
- Asset version: `1.5.46-engine-recommendation-api-audit`
- Service worker cache: `foxbear-shell-v1.5.46-engine-recommendation-api-audit`
