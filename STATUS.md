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
- Completed download Blobs and playback URLs remain available; completed mastered PCM uses `release-after-encode` and must be zero-retention by default.
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

- Product version: `1.5.20`
- Build ID: `idempotent-pwa-cache-warm`
- Asset version: `1.5.20-idempotent-pwa-cache-warm`
- Service worker cache: `foxbear-shell-v1.5.20-idempotent-pwa-cache-warm`
