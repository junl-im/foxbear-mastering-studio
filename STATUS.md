# Current Status and Invariants

This document contains rules that remain true across releases. Actual changes belong in `CHANGELOG.md`; historical implementation details belong in `docs/history/`; architectural decisions belong in `docs/decisions/`.

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

- Product version: `1.5.32`
- Build ID: `kakao-external-browser-local-flow`
- Asset version: `1.5.32-kakao-external-browser-local-flow`
- Service worker cache: `foxbear-shell-v1.5.32-kakao-external-browser-local-flow`
- Static QA target: `216/216 PASS`
- Browser QA target: `14/14 PASS` on actual Chromium plus the GitHub Actions gate
- Visible release labels remain repaired by `FoxBearReleasePresentation`.
- KakaoTalk entry must route to the lightweight external-browser landing before import/mastering unless the user explicitly chooses the in-app bypass.
- The external-browser landing must accept same-origin targets only and must not imply that Kakao WebView Blob memory transfers into Chrome/Safari.
- The preferred Kakao workflow is external browser first, then local import/master/encode/download without server upload.
- Mastering completion must preserve a currently playing original Dock player and must not mount a second player outside an explicit user-gesture crossfade.
- Normal browsers may retain one bounded selected-track PCM for MP3/WAV re-encoding; restricted in-app browsers expose only the completed file.
- The download dialog and save-assist panel remain compact; diagnostics and historical guidance helpers may exist without being mounted by default.
- Active and pending import analysis must be cancellable; removed tracks must never receive stale decode, worker, cache, or recommendation results.
- Waiting service workers must defer activation while analysis, mastering, decoding, rendering, or playback is active and require a stable idle window.
- Network-first script, style, worker, and navigation requests must recover from current or retained legacy caches on offline failures and HTTP non-success responses.
- Header command metadata and designer signature remain one-line, borderless, engraved, and independent from Settings width.
- Detached playback audio elements and their listeners must be pruned; queue teardown must return playback and managed AudioContext diagnostics to zero.
- Local JavaScript/CSS SRI coverage must be complete, correctly shaped, and hash-valid.

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

