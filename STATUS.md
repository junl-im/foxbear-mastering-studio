# FoxBear Status - v1.5.64

## v1.5.64 current focus

- A 15-minute operations audit records SMTP/Secret readiness, stale delivery queues, dead letters, summary failures, and KST quota reservations in `incidentOperations/mail`.
- Operational alert and recovery emails are transition-aware and use a 12-hour persistent-issue cooldown; SMTP failure remains visible in the administrator dashboard even when self-emailing is impossible.
- The administrator incident dashboard uses exact KST-day counts and displays operations health, long-undelivered reports, SMTP/Secret status, and daily quota use.
- Operations audits use fenced leases and preserve explicit limitations: Gmail app-password expiry dates are not exposed, so readiness is determined by secret validation and live SMTP authentication.

## v1.5.63 current focus

- Incident mail quotas use KST date buckets and quota-limited reports automatically resume after the next KST midnight.
- Delivery reservations are explicitly owned by each report and are returned after success, failure, duplicate suppression, quota deferral, or missing-report cleanup.
- Daily summaries paginate beyond 500 reports, expose truncation, use deterministic Message-IDs, and backfill missing summaries for three days.
- SMTP success requires at least one accepted recipient and the Gmail app password must normalize to exactly 16 characters.

## v1.5.62 current focus

- Incident documents enter an explicit pending queue and are recovered through status-specific Firestore indexes.
- Delivery leases are fenced by unique IDs; late completions cannot overwrite a newer retry.
- Exhausted SMTP attempts become dead letters that administrators can deliberately restart.
- Release and overwrite archives refuse to build when version or handoff metadata drifts.

## v1.5.60 current focus

- KakaoTalk opens the studio in-app by default instead of forcing the external-browser landing.
- 404 recovery targets the concrete `index.html` entry and carries a legacy bypass marker to break cached redirect loops.
- Preflight and observed memory pressure govern processing quality, True Peak cost, waveform density, and PCM release timing.

## v1.5.59 current focus

- Kakao runtime failures expose a one-tap external-browser recovery action.
- The handoff token transfers only sanitized settings and expires after 20 minutes; audio, filenames, and local paths never leave the WebView.
- Mastering diagnostics record known simultaneous PCM buffers, browser heap where available, projected Kakao peak memory, budget, and pressure by processing stage.

## v1.5.57 current focus

- All true modal dialogs use one shared top-right close-control component.
- Runtime-created AI, download, save-assist, mobile settings, and select dialogs inherit the same close geometry.
- Escape dismissal and focus restoration are required for runtime-created modal surfaces.
- Legacy per-dialog CSS may remain for panel layout, but final close-button ownership belongs to `modal-close-system.css`.


## v1.5.55 current focus

- Automatic incident collection covers critical boot, resource, runtime, mastering, quality-recovery, export, update-safety, and release-generation failures.
- Audio, filenames, PCM data, full local paths, email addresses, long tokens, and URL query secrets are excluded or redacted.
- Firestore ingestion is create-only; owners can read only their own delivery status and administrators can list reports.
- The Cloud Function sends to `mcwoogi@gmail.com` using a Secret Manager-bound Gmail app password, with duplicate and daily rate limits.
- Deployment still requires the real Firebase secret, Functions deployment, and a live test email.

## Current status

Automatic incident reporting is implemented in source. Static/package verification is required before release; real email delivery remains pending until the Firebase secret and Cloud Function are deployed.

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

- Product version: `1.5.64`
- Build ID: `incident-operations-health-self-diagnostics`
- Asset version: `1.5.64-incident-operations-health-self-diagnostics`
- Service worker cache: `foxbear-shell-v1.5.64-incident-operations-health-self-diagnostics`
- Browser QA target: risk-specific recovery success, injected recovery exception preservation, silent/short rejection, cancellation during expensive stages, mono/high-rate mastering, and malformed-analysis safety

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

- Product version: `1.5.64`
- Build ID: `incident-operations-health-self-diagnostics`
- Asset version: `1.5.64-incident-operations-health-self-diagnostics`
- Service worker cache: `foxbear-shell-v1.5.64-incident-operations-health-self-diagnostics`
