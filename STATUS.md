# FoxBear Status - v1.5.41

## Current status

Export progress now includes elapsed time, advisory ETA, stalled/background guidance, and complete dialog action ownership. Download-start failures remain visible because the dialog closes only after initiation succeeds.

The release gate must verify timer/listener cleanup, complete button locking, stalled-progress messaging, and download-close ordering in addition to the existing worker cancellation and timeout contracts.

## Release invariants

- `package.json` is the release metadata source of truth.
- Product version, manifest version, visible UI version, service worker generation, and package filename must pass `npm run version:check`.
- Visible release labels must be runtime-bound to generated `FoxBearBuildInfo`; stale static HTML labels are repaired by `FoxBearReleasePresentation`.
- A release candidate must pass `npm run check:release`; static QA alone is not a release gate.
- A cumulative overwrite package is not releasable until `tools/verify-overwrite-zip.js` confirms required root configuration, workflows, runtime trees, and exclusions.
- Browser QA readiness must wait for `FoxBearRuntimeHealth.appReady`; creation of the health object is not boot completion.
- The opt-in 35-track deep browser path remains a separate release-candidate/manual check because it is intentionally expensive.

## Audio and UI invariants

- Spectrum FFT is shown in the detailed analysis view only.
- Dock mini FFT remains removed; `#bottomPreviewSpectrum` and the former `renderMini` path must not return without a new measured performance decision.
- Loudness-matched A/B behavior remains the intended comparison model.
- Completed download Blobs and playback URLs remain available; completed mastered PCM uses `release-after-encode` by default, with at most one selected-track bounded re-encode buffer retained in normal browsers.
- Bulk import analysis remains sequential and general UI rendering remains scheduler/throttle controlled for large batches.
- Wake Lock distinguishes user intent from temporary automatic protection.
- All managed Web Audio contexts must be created and released through `FoxBearAudioContextManager`; diagnostics must remain visible through Runtime Health/Performance Diagnostics.
- The Settings trigger remains in the upper-right brand action row; its panel stays a body-level viewport portal and must not return to a Dock-obscuring floating position.

## Security and resilience invariants

- Optional Firebase/Firestore network outages are Runtime Health warnings; they must not be promoted to fatal application errors. Browser QA must isolate these optional remotes from the core runtime contract.

- CSP, Trusted Types, SRI verification, Runtime Health, Update Safety, and service worker cache recovery remain enabled.
- Original audio is processed locally and is not uploaded to Firebase Storage by the mastering flow.
- ZIP export must pre-release completed PCM, package audio with `STORE`, enforce a working-set safety limit, validate generated Blob integrity, and provide a per-track fallback.

## Current release

- Product version: `1.5.41`
- Build ID: `export-eta-download-recovery`
- Asset version: `1.5.41-export-eta-download-recovery`
- Service worker cache: `foxbear-shell-v1.5.41-export-eta-download-recovery`
- Static QA result: `231/231 PASS` (four deterministic chunks)
- Browser QA target: long export ETA, background restore, stalled progress, download failure visibility, and retry
- Worker progress events must carry the active job ID and must never be treated as terminal responses.
- Download-dialog replacement and track removal must abort their active conversion worker.
- Timeout failures must remain visible and must not silently change the requested output format.


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

