# FoxBear Status - v1.5.47

## v1.5.47 current focus

- Silent, corrupt, and unusably short input cannot report a successful master.
- Finalizer and recommendation inputs remain finite under malformed analysis caches.
- Mono, 96kHz, and 192kHz rendering preserve target loudness and True Peak limits.
- Mastering cancellation is checked after every expensive asynchronous stage.

## Current status

Engine edge-case quality coverage is active. Static and regression QA is `241/241 PASS`, including deterministic input-guard, high-sample-rate, malformed-analysis, clipping-stress, recommendation, and cancellation checks.

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

- Product version: `1.5.47`
- Build ID: `engine-edgecase-quality-gate`
- Asset version: `1.5.47-engine-edgecase-quality-gate`
- Service worker cache: `foxbear-shell-v1.5.47-engine-edgecase-quality-gate`
- Browser QA target: silent/short rejection, cancellation during expensive stages, mono/high-rate mastering, and malformed-analysis safety

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
- Asset version: `1.5.47-engine-edgecase-quality-gate`
- Service worker cache: `foxbear-shell-v1.5.47-engine-edgecase-quality-gate`
