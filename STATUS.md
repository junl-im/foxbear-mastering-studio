# Current Status and Invariants

This document contains rules that remain true across releases. Actual changes belong in `CHANGELOG.md`; historical implementation details belong in `docs/history/`; architectural decisions belong in `docs/decisions/`.

## Release invariants

- `package.json` is the release metadata source of truth.
- Product version, manifest version, visible UI version, service worker generation, and package filename must pass `npm run version:check`.
- A release candidate must pass `npm run check:release`; static QA alone is not a release gate.
- The opt-in 35-track deep browser path remains a separate release-candidate/manual check because it is intentionally expensive.

## Audio and UI invariants

- Spectrum FFT is shown in the detailed analysis view only.
- Dock mini FFT remains removed; `#bottomPreviewSpectrum` and the former `renderMini` path must not return without a new measured performance decision.
- Loudness-matched A/B behavior remains the intended comparison model.
- Completed download Blobs remain available while mastered PCM buffers may be released under the Memory Guard policy.
- Bulk import analysis remains sequential and general UI rendering remains scheduler/throttle controlled for large batches.
- Wake Lock distinguishes user intent from temporary automatic protection.

## Security and resilience invariants

- CSP, Trusted Types, SRI verification, Runtime Health, Update Safety, and service worker cache recovery remain enabled.
- Original audio is processed locally and is not uploaded to Firebase Storage by the mastering flow.
- ZIP export must validate readiness and generated Blob integrity and provide a per-track fallback.

## Current release

- Product version: `1.5.7`
- Build ID: `release-foundation-cleanup`
- Asset version: `1.5.7-release-foundation`
- Service worker cache: `foxbear-shell-v1.5.7-release-foundation`
