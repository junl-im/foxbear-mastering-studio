# FoxBear Status - v1.6.50

## Current release

- Product version: `1.6.50`
- Build ID: `kakao-centered-entry-notice`
- Asset version: `1.6.50-kakao-centered-entry-notice`
- Service worker cache: `foxbear-shell-v1.6.50-kakao-centered-entry-notice`
- Configured static/regression target: 396 checks.

## Current focus

- Warn KakaoTalk users about mastered-file download limitations before they invest time in a full master.
- Keep the warning large, centered, readable, and non-blocking.
- Support first-touch and Escape dismissal with a smooth exit plus an eight-second timeout.
- Promote external/default browsers and PWA installation without showing the notice in those environments.

## Verified

- Official configured static and behavioral checks: **396/396 passed** in three bounded slices (`132/132`, `132/132`, and `132/132`).
- Dedicated Kakao notice regression and historical Kakao entry, external-browser, PWA, download, toast, service-worker, and security regressions passed.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency health reported 0 errors and 5 expected missing-install warnings.
- Installed browser execution remains unavailable because Playwright/Chromium is not installed; real KakaoTalk Android/iOS visual verification remains an external environment gate.
- Full release and overwrite archives contain **700 entries each** and pass compressed-data integrity and executable-payload checks.

## Production deployment required

- Deploy the synchronized v1.6.50 assets so the new service-worker cache replaces v1.6.49.
- Verify the centered notice in KakaoTalk on Android and iOS.
- Confirm a first screen touch dismisses it and no interaction closes it after eight seconds.
- Confirm normal browser and installed PWA launches do not show the notice.

# FoxBear Status - v1.6.49

## Current release

- Product version: `1.6.49`
- Build ID: `download-variant-cache-reuse`
- Asset version: `1.6.49-download-variant-cache-reuse`
- Service worker cache: `foxbear-shell-v1.6.49-download-variant-cache-reuse`
- Configured static/regression target: 394 checks.

## Current focus

- Avoid repeating the same completed-output decode and encode for repeated alternate-format downloads.
- Keep the reuse cache bounded to one variant and 64 MB per mastered source.
- Expose cached reuse and exact file size in the download dialog.
- Keep lossy MP3 conversion guidance accurate for the selected target family.

## Verified

- Official configured static and behavioral checks: **394/394 passed** in bounded slices (`130/130`, `130/130`, and `134/134`).
- Dedicated cache-reuse regression and the existing download, Blob validation, codec, cancellation, and PCM/ZIP memory regressions passed.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency health reported 0 errors and 5 expected missing-install warnings.
- Installed browser execution remains unavailable because Playwright/Chromium is not installed; real-device repeated download/share verification remains an external environment gate.
- Full release and overwrite archives contain **696 entries each** and pass package integrity and executable-payload checks.

## Production deployment required

- Deploy the synchronized v1.6.49 assets so the new service-worker cache replaces v1.6.48.
- Verify repeated alternate-format download and share flows on desktop and mobile.
- Run `npm run check:release` before production deployment.

# FoxBear Status - v1.6.48

## Current release

- Product version: `1.6.48`
- Build ID: `post-master-download-format-quality`
- Asset version: `1.6.48-post-master-download-format-quality`
- Service worker cache: `foxbear-shell-v1.6.48-post-master-download-format-quality`
- Configured static/regression target: 393 checks.

## Current focus

- Keep download-time MP3/WAV extension and quality selection available after mastering.
- Convert from the completed mastered file when memory policy has released the PCM buffer.
- Preserve memory safety while avoiding a forced remaster for ordinary format changes.
- Keep MP3-to-WAV quality limitations explicit.

## Verified

- Official configured static and behavioral checks: **393/393 passed**.
- Dedicated post-master download format/quality regression and the existing download context-menu, size-estimate, Blob validation, and PCM/ZIP memory regressions passed.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency health reported 0 errors and 4 expected missing-install warnings.
- Installed browser execution remains unavailable because Playwright/Chromium is not installed; device and restricted in-app browser verification remains an external environment gate.
- Full release and overwrite archives contain **694 entries each** and pass package integrity and executable-payload checks.

## Production deployment required

- Deploy the synchronized v1.6.48 assets so the new service-worker cache replaces v1.6.47.
- Verify MP3 and WAV downloads on desktop, iOS/Android, and at least one restricted in-app browser.
- Run `npm run check:release` before production deployment.

# FoxBear Status - v1.6.47

## Current release

- Product version: `1.6.47`
- Build ID: `external-host-admin-auth-opaque-error-recovery`
- Asset version: `1.6.47-external-host-admin-auth-opaque-error-recovery`
- Service worker cache: `foxbear-shell-v1.6.47-external-host-admin-auth-opaque-error-recovery`
- Configured static/regression target: 392 checks.

## Current focus

- Keep GitHub Pages on popup-only Firebase Google authentication.
- Reconcile delayed auth state before external-host recovery.
- Move unresolved administrator auth to the fixed Firebase Hosting origin.
- Isolate opaque cross-origin script errors from application import status.

## Verified

- Official configured QA: **392/392 passed** in three bounded execution chunks.
- Browser fixture preflight, Hosting payload hygiene, Functions syntax, metadata, SRI, dependency, and handoff checks passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution remains unavailable because Playwright/Chromium is not installed.
- Full and overwrite ZIP packages: **692 entries each**, executable payloads: **0**.

## Production deployment required

- Deploy the same v1.6.47 assets to GitHub Pages and Firebase Hosting.
- Keep `jurl-img.github.io` and both Firebase Hosting domains in Firebase Authentication Authorized domains.
- Run `npm run check:release` and `npm run deploy:spark`.
- Clear stale site data once, then verify Google login and `siteAdmins/{UID}` authorization on the secure Hosting origin.

# FoxBear Status - v1.6.46

## Current release

- Product version: `1.6.46`
- Build ID: `google-auth-same-origin-network-recovery`
- Asset version: `1.6.46-google-auth-same-origin-network-recovery`
- Service worker cache: `foxbear-shell-v1.6.46-google-auth-same-origin-network-recovery`
- Configured static/regression target: 391 checks.

## Current focus

- Recover Firebase `auth/network-request-failed` before the administrator document stage.
- Keep Firebase Hosting auth helpers same-origin on the active approved project domain.
- Retry popup transport failures once through redirect without allowing a loop.
- Preserve query-free diagnostics and the existing no-App-Check policy.

## Verified

- Official configured QA: **391/391 passed** in bounded release-gate chunks.
- Browser fixture preflight, Hosting payload hygiene, Functions syntax, metadata, SRI, dependency, and handoff checks passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution remains unavailable because Playwright/Chromium is not installed.
- Full and overwrite ZIP packages: **690 entries each**, executable payloads: **0**.

## Production deployment required

- Add both Firebase Hosting `/__/auth/handler` URLs to the Firebase Google OAuth web client.
- Keep both project Hosting domains in Firebase Authentication Authorized domains.
- Run `npm run check:release` and `npm run deploy:spark`.
- Clear site data once, then retry Google administrator authentication.

# FoxBear Status - v1.6.45

## Current release

- Product version: `1.6.45`
- Build ID: `windows-release-gate-spark-hosting-no-app-check`
- Asset version: `1.6.45-windows-release-gate-spark-hosting-no-app-check`
- Service worker cache: `foxbear-shell-v1.6.45-windows-release-gate-spark-hosting-no-app-check`
- Configured static/regression target: 390 checks.

## Current focus

- Restore release-gate execution on current Windows/Node installations.
- Prevent `.exe`, `.cmd`, and related executable payloads from entering Spark Hosting or release archives.
- Operate without Firebase App Check while preserving Firebase Auth and Firestore Rules authorization.
- Preserve the narrow Google Auth Trusted Types allowlist.

## Verified

- Official configured QA: **390/390 passed** through the Windows-compatible release gate.
- Browser fixture preflight, Hosting payload hygiene, Functions syntax, metadata, SRI, and handoff checks passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution remains unavailable because Playwright/Chromium is not installed.
- Full and overwrite ZIP packages: **688 entries each**, executable payloads: **0**.

## Production deployment required

- Delete any old repository-root `cmd.exe`.
- Keep App Check enforcement disabled in Firebase Console.
- Run `npm run check:release` and `npm run deploy:spark`.
- Clear the old service worker/site data, then retry Google administrator authentication.

# FoxBear Status - v1.6.44

## Current release

- Product version: `1.6.44`
- Build ID: `google-auth-gapi-module-trusted-types-recovery`
- Asset version: `1.6.44-google-auth-gapi-module-trusted-types-recovery`
- Service worker cache: `foxbear-shell-v1.6.44-google-auth-gapi-module-trusted-types-recovery`
- Configured static/regression target: 389 checks.

## Current focus

- Allow Firebase Auth's second-stage gapi iframe module without weakening Trusted Types globally.
- Keep the allowlist restricted to the exact Google API loader and generated apps-static JavaScript module prefix.
- Preserve query-free rejected-path diagnostics for future production failures.
- Preserve Spark-plan Google administrator authentication and Firestore UID authorization.

## Verified

- Official configured QA: **389/389 passed** in bounded execution chunks.
- Dedicated v1.6.43 loader and v1.6.44 generated-module Trusted Types regressions: passed.
- Release metadata, SRI, handoff, browser fixture preflight, and Firebase Functions syntax: passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Playwright/Chromium runtime is not installed in this sandbox; real deployed Google account selection remains an external gate.
- Engine synthetic safety bench: passed.
- Golden audio: four fixtures remained at **-14.00 LUFS**.
- Full and overwrite ZIP packages: **683 entries each**, compressed-data errors: **0**.
- Change scope versus v1.6.43: **261 modified, 2 added, 0 deleted**.

## Production deployment required

- Deploy with `npm run deploy:spark`.
- Close all existing FoxBear tabs and reopen the site so the new service-worker generation is active.
- Retry Settings → 관리자 모니터링 → Google 계정으로 인증.

# FoxBear Status - v1.6.43

## Current release

- Product version: `1.6.43`
- Build ID: `google-auth-trusted-types-csp-recovery`
- Asset version: `1.6.43-google-auth-trusted-types-csp-recovery`
- Service worker cache: `foxbear-shell-v1.6.43-google-auth-trusted-types-csp-recovery`
- Configured static/regression target: 388 checks.

## Current focus

- Recover Firebase Google administrator authentication under strict Trusted Types enforcement.
- Keep the dynamic-script allowlist narrow instead of disabling CSP or Trusted Types.
- Keep document and Hosting CSP policies synchronized for Google Auth.
- Preserve Spark-plan deployment and Firestore UID authorization.

## Verified

- Official configured QA: **388/388 passed**.
- Dedicated Trusted Types/CSP regression: passed.
- Static release gate, browser fixture preflight, and Firebase Functions syntax: passed.
- Dependency metadata: 0 errors, 5 expected missing-install warnings.
- Command-line Chromium was present but did not complete startup in this sandbox; real production Google login remains an external gate.
- Engine balanced fixture: approximately **1.93x realtime**.
- Golden audio: four fixtures remained at **-14.00 LUFS**.
- Full and overwrite ZIP packages: **681 entries each**, compressed-data errors: **0**.
- Change scope versus v1.6.42: **262 modified, 3 added, 0 deleted**.

## Production deployment required

- Deploy with `npm run deploy:spark`.
- Force-refresh the deployed site once so the new service-worker generation and CSP headers replace v1.6.42.
- Retry Settings → 관리자 모니터링 → Google 계정으로 인증.

# FoxBear Status - v1.6.42

## Current release

- Product version: `1.6.42`
- Build ID: `spark-google-admin-auth`
- Asset version: `1.6.42-spark-google-admin-auth`
- Service worker cache: `foxbear-shell-v1.6.42-spark-google-admin-auth`
- Configured static/regression target: 386 checks.

## Current focus

- Keep administrator monitoring available on the Firebase Spark plan.
- Authenticate administrators through Google instead of a shared browser PIN.
- Enforce verified Google identity and matching `siteAdmins/{UID}` authorization in Firestore Rules.
- Show the signed-in UID for one-time administrator document registration.
- Sign out the administrator Google account and restore anonymous browsing explicitly.

## Verified

- Official configured QA: **386/386 passed**.
- Static release gate, browser fixture preflight, and Firebase Functions syntax: passed.
- Release metadata, SRI, service-worker cache, and GitHub Desktop handoff: passed.
- Dependency metadata: 0 errors, 5 expected missing-install warnings.
- Embedded administrator password values: **0 occurrences** in current source and release content.
- Administrator PIN Secret and unlock/revoke Callable exports: removed.
- Engine balanced fixture: approximately **1.89x realtime**.
- Golden audio: four fixtures remained at **-14.00 LUFS**.
- Installed Playwright/Chromium execution: unavailable in this sandbox.
- Full and overwrite ZIP packages: **678 entries each**, compressed-data errors: **0**.
- Change scope from the v1.6.42 PIN draft: **262 modified, 2 added, 4 deleted**.

## Production deployment required

- Enable Anonymous and Google providers in Firebase Authentication.
- Run `npm run deploy:spark` from the project root.
- Sign in once, copy the displayed Google Firebase UID, and create `siteAdmins/{UID}` with the fields documented in `FIREBASE_SETUP.md`.
- Re-open administrator monitoring with the same Google account.

# FoxBear Status - v1.6.41

## Current release

- Product version: `1.6.41`
- Build ID: `admin-secret-pin-session`
- Asset version: `1.6.41-admin-secret-pin-session`
- Service worker cache: `foxbear-shell-v1.6.41-admin-secret-pin-session`
- Configured static/regression target: 386 checks.

## Current focus

- Expose administrator monitoring inside the Settings surface.
- Keep the administrator PIN exclusively in Firebase Secret Manager.
- Verify access through an authenticated Callable Function rather than client-side comparison.
- Bound brute-force attempts by anonymous UID and hashed network fingerprint.
- Grant an expiring eight-hour administrator session and enforce expiry in Firestore Rules.
- Allow optional App Check enforcement after production configuration.

## Verified

- Official configured QA: **386/386 passed**.
- Browser fixture preflight and Firebase Functions syntax: passed.
- Dependency metadata: 0 errors, 5 expected missing-install warnings.
- Repository and both release archives contain no embedded administrator PIN literal.
- Engine balanced fixture: approximately **1.95x realtime**.
- Golden audio: four fixtures remained at **-14.00 LUFS**.
- Installed Playwright/Chromium execution: unavailable in this sandbox.
- Full and overwrite ZIP packages: **678 entries each**, compressed-data errors: **0**.
- Change scope versus v1.6.40: **262 modified, 3 added, 0 deleted**.

## Production deployment required

- Retired in v1.6.42: do not configure the former Secret Manager administrator credential.
- Deploy `unlockAdminAccess`, Hosting, Firestore Rules, and indexes with `npm run deploy:incident`.
- Add Firestore TTL for `adminAccessAttempts.expiresAt`.
- Enable `FOXBEAR_ADMIN_REQUIRE_APP_CHECK=true` only after the web App Check key is configured.

# FoxBear Status - v1.6.40

## Current release

- Product version: `1.6.40`
- Build ID: `ui-shell-retry-replacement-settlement`
- Asset version: `1.6.40-ui-shell-retry-replacement-settlement`
- Service worker cache: `foxbear-shell-v1.6.40-ui-shell-retry-replacement-settlement`
- Configured static/regression target: 384 checks.

## Current focus

- Settle retried critical resources from all matching DOM candidates.
- Prevent stale failed nodes from masking a successful replacement.
- Prevent post-load replacement nodes from being assumed healthy before load.
- Detect dynamically inserted critical replacement nodes and schedule settlement automatically.
- Bound silent replacement retries and keep recovery visible until settlement.

## Verified

- Official configured QA: **384/384 passed**.
- Browser fixture preflight and Functions syntax: passed.
- Dependency metadata: 0 errors, 5 expected missing-install warnings.
- Engine balanced fixture: approximately **1.83x realtime**.
- Golden audio: four fixtures at **-14.00 LUFS**.
- Installed Playwright/Chromium execution: unavailable in this sandbox.
- Full and overwrite ZIP packages: **675 entries each**, compressed-data errors: **0**.
- Change scope: **257 modified, 2 added, 2 deleted**.

# FoxBear Status - v1.6.39

## Current release

- Product version: `1.6.39`
- Build ID: `ui-shell-partial-script-probe-isolation`
- Asset version: `1.6.39-ui-shell-partial-script-probe-isolation`
- Service worker cache: `foxbear-shell-v1.6.39-ui-shell-partial-script-probe-isolation`
- Configured static/regression target: 383 checks.

## Current focus

- Keep the static UI available when one critical JavaScript asset fails.
- Distinguish pending scripts from confirmed boot failures.
- Prevent expired or terminated client probe responses from retaining stale caches.
- Recollect active shell generations safely after service-worker restart.

## Verified

- Official configured QA: **383/383 passed**.
- Browser fixture preflight and Functions syntax: passed.
- Dependency metadata: 0 errors, 5 expected missing-install warnings.
- Engine balanced fixture: approximately **1.81x realtime**.
- Golden audio: four fixtures at **-14.00 LUFS**.
- Installed Playwright/Chromium execution: unavailable in this sandbox.
- Full and overwrite ZIP packages: **673 entries each**, compressed-data errors: **0**.
- Change scope: **256 modified, 3 added, 0 deleted**.

# FoxBear Status - v1.6.38

## Current release

- Product version: `1.6.38`
- Build ID: `ui-shell-runtime-health-cache-retirement`
- Asset version: `1.6.38-ui-shell-runtime-health-cache-retirement`
- Service worker cache: `foxbear-shell-v1.6.38-ui-shell-runtime-health-cache-retirement`
- Configured static/regression target: 381 checks.

## Current focus

- Prevent false safe-UI activation while CSS is still loading.
- Merge UI-shell and Runtime Health recovery feedback.
- Retire only client-confirmed inactive legacy shell generations.

## Verified

- Official configured QA: **381/381 passed**.
- Browser fixture preflight and Functions syntax: passed.
- Dependency metadata: 0 errors, 5 expected missing-install warnings.
- Engine balanced fixture: approximately **2.12x realtime**.
- Golden audio: four fixtures at **-14.00 LUFS**.
- Installed Playwright/Chromium execution: unavailable in this sandbox.
- Full and overwrite ZIP packages: **670 entries each**, compressed-data errors: **0**.
- Change scope: **258 modified, 2 added, 0 deleted**.

# FoxBear Status - v1.6.37

- UI shell disappearance after cross-generation service-worker activation: patched.
- Exact previous-generation CSS/JS/Worker cache fallback: implemented.
- Boot-level hidden-shell and missing-style recovery: implemented.
- Configured cumulative QA target: 380.
- Final configured QA: **380/380 passed**.
- Browser fixture preflight and Functions syntax: passed.
- Dependency metadata: 0 errors, 5 expected missing-install warnings.
- Mandatory three-section delivery rule remains in `DELIVERY_RULES.md`.
- Full and overwrite ZIP packages: 668 entries each; compressed-data errors: 0.

# FoxBear Status - v1.6.36

- Service-worker activation claim: generation-fenced and settled before `SKIP_WAITING`.
- BFCache controller reconciliation: implemented with duplicate-event suppression.
- Managed AudioContext concurrent close: single-Promise cleanup.
- Configured cumulative QA target: 378.
- Final configured QA: **378/378 passed**.
- Browser fixture preflight and Functions syntax: passed.
- Dependency metadata: 0 errors, 5 expected missing-install warnings.
- Installed Playwright/Chromium execution: unavailable in this sandbox.
- Mandatory three-section delivery rule remains in `DELIVERY_RULES.md`.

# FoxBear Status - v1.6.35

- Terminal history boundary race: patched with exact-generation 500 ms grace.
- Service-worker activation: serialized across tabs with a 15-second lease and 12-second recovery watchdog.
- Download assist same-URL ownership: patched.
- Managed AudioContext stress: 200 create/close cycles return to zero active contexts.
- Configured cumulative QA target: 376.
- Final configured QA: **376/376 passed**.
- Browser fixture preflight and Functions syntax: passed.
- Installed Playwright/Chromium execution: unavailable in this sandbox.
- Dependency metadata: 0 errors, 5 expected missing-install warnings.

# FoxBear Status - v1.6.34

## Current release

- Product version: `1.6.37`
- Build ID: `ui-shell-cross-generation-recovery`
- Asset version: `1.6.37-ui-shell-cross-generation-recovery`
- Service worker cache: `foxbear-shell-v1.6.37-ui-shell-cross-generation-recovery`
- Configured static/regression target: 373 checks.

## v1.6.34 current focus

- Terminally recover an overlay sentinel when History traversal remains unchanged for 30 seconds.
- Preserve a reopened dialog sentinel without duplicate Back requests.
- Pause and resume cross-tab service-worker activity resources across BFCache.
- Keep registration update observers idempotent and visible in diagnostics.


## v1.6.33 current focus

- Recover completed overlay-history traversal when a browser omits `popstate`.
- Avoid duplicate Back traversal during a hard stall.
- Bound delayed generation state by count and time.
- Preserve engine, download, Firebase, PWA, handoff, archive, and three-section delivery contracts.

## Release metadata

- Product version: `1.6.50`
- Build ID: `kakao-centered-entry-notice`
- Asset version: `1.6.50-kakao-centered-entry-notice`
- Service worker cache: `foxbear-shell-v1.6.50-kakao-centered-entry-notice`

# FoxBear Status - v1.6.32

## Current release

- Product version: `1.6.32`
- Build ID: `overlay-history-generation-bfcache-recovery`
- Asset version: `1.6.32-overlay-history-generation-bfcache-recovery`
- Service worker cache: `foxbear-shell-v1.6.32-overlay-history-generation-bfcache-recovery`
- Configured static/regression target: 372 checks.

## v1.6.32 current focus

- Generation-fenced overlay history cleanup is implemented.
- Out-of-order delayed popstate and BFCache restore paths have dedicated runtime regression coverage.
- Remaining external gates are installed Android/iOS/PWA gesture testing and real browser BFCache timing.

## v1.6.30 status

- Programmatic overlay history cleanup is no longer classified as user Back navigation.
- Genuine Back events remain available to the workspace exit guard when no overlay is open.
- Listener registration order no longer changes navigation behavior.
- Audio, download, Firebase, incident-report, and authentication contracts are unchanged.
- Installed-browser and real-device navigation remain environment gates.

# FoxBear Status - v1.6.29

## Current release

- Product version: `1.6.29`
- Build ID: `incident-submission-fencing-adaptive-polling`
- Asset version: `1.6.29-incident-submission-fencing-adaptive-polling`
- Service worker cache: `foxbear-shell-v1.6.29-incident-submission-fencing-adaptive-polling`
- Configured static/regression target: 369 checks.

## v1.6.29 status

- Stable occurrence identity prevents retry-time windows from generating duplicate server reports.
- Callable and Firestore acknowledgements are fenced by the original submission key.
- Lease token and generation must both match before delivery commit or lease cleanup.
- Fallback synchronization adapts to active, idle, hidden, and foreground-resume states.
- Primary incident control rendering and binding are isolated from reporter orchestration.
- Production Firebase, Gmail receipt, App Check, installed-browser rendering, and real Safari/iOS behavior remain environment gates.

# FoxBear Status - v1.6.28

## Current release

- Product version: `1.6.29`
- Build ID: `incident-submission-fencing-adaptive-polling`
- Asset version: `1.6.29-incident-submission-fencing-adaptive-polling`
- Service worker cache: `foxbear-shell-v1.6.29-incident-submission-fencing-adaptive-polling`

## Release metadata

- Product version: `1.6.32`
- Build ID: `overlay-history-generation-bfcache-recovery`
- Asset version: `1.6.32-overlay-history-generation-bfcache-recovery`
- Service worker cache: `foxbear-shell-v1.6.32-overlay-history-generation-bfcache-recovery`

## v1.6.28 status

- BFCache transitions release active local queue ownership immediately and resynchronize on return.
- Expired crash leases are reclaimed; lock replacement, expiry, and renewal failure abort the old owner.
- Revision polling supplements BroadcastChannel and storage-event synchronization in restricted browsers.
- Service diagnostic DOM and status-event responsibilities are isolated in a dedicated view module.
- Configured cumulative static/regression target: 366 checks.
- Production Firebase, Gmail receipt, App Check, installed-browser rendering, and real Safari/iOS WebView lifecycle behavior remain environment gates.

# FoxBear Status - v1.6.27

## Current release

- Product version: `1.6.27`
- Build ID: `incident-multitab-queue-ownership-safety`
- Asset version: `1.6.27-incident-multitab-queue-ownership-safety`
- Service worker cache: `foxbear-shell-v1.6.27-incident-multitab-queue-ownership-safety`

## Release metadata

- Product version: `1.6.27`
- Build ID: `incident-multitab-queue-ownership-safety`
- Asset version: `1.6.27-incident-multitab-queue-ownership-safety`
- Service worker cache: `foxbear-shell-v1.6.27-incident-multitab-queue-ownership-safety`

## v1.6.27 status

- Local anonymous incident queues use per-tab shards and merge into the existing global eight-item visible bound.
- BroadcastChannel and storage revision events synchronize peer queue changes without exposing report contents.
- Web Locks or a renewable lease enforce one active cross-tab flush owner.
- Exact delivery occurrence tombstones prevent stale retry resurrection and preserve later matching reports.
- Legacy queue data remains readable and is migrated through coordinated commits.
- Configured cumulative static/regression target: 364 checks.
- Production Firebase, Gmail receipt, App Check, installed-browser rendering, and real-device multi-tab behavior remain environment gates.

## v1.6.26 status

- Incident service classification and diagnostic row generation are isolated from reporter state mutation.
- The local report queue is bounded by item count and serialized size and handles quota pressure by retaining newest entries.
- Flush completion removes delivered fingerprints from current storage, preserving reports queued during recovery.
- Abort and partial failure paths commit successful deliveries before returning or rethrowing.
- Configured cumulative static/regression target: 362 checks.
- Production Firebase, Gmail receipt, App Check, installed-browser rendering, and real-device lifecycle behavior remain environment gates.

## v1.6.25 status

- Automatic incident service recovery is owned by a dedicated timeout and abort-aware controller.
- Retry scheduling occurs after active cleanup, offline waiting consumes no attempt, and repeated triggers remain single-flight.
- Service, queue, and deployment deadlines produce bounded anonymous diagnostics.
- Configured cumulative static/regression target: 359 checks.
- Production Firebase, Gmail receipt, App Check, installed-browser rendering, and real-device lifecycle behavior remain environment gates.

# FoxBear Status - v1.6.19

## Current release

- Product version: `1.6.19`
- Build ID: `incident-mail-sync-route-scoring`
- Asset version: `1.6.19-incident-mail-sync-route-scoring`
- Service worker cache: `foxbear-shell-v1.6.19-incident-mail-sync-route-scoring`

## v1.6.18 status

- Mail-test and deployment-readiness persistence has moved out of the main incident reporter.
- Local incident history is normalized and privacy-redacted before storage.
- Repeated transient Callable failures temporarily prefer the authenticated Hosting rewrite path.
- The incident settings panel exposes the adaptive route state without storing report contents.
- Configured cumulative static/regression target: 348 checks.
- Production Firebase routing and Gmail receipt remain environment gates.

# FoxBear Status - v1.6.17

## Current release

- Product version: `1.6.17`
- Build ID: `incident-transport-metrics-module-split`
- Asset version: `1.6.17-incident-transport-metrics-module-split`
- Service worker cache: `foxbear-shell-v1.6.17-incident-transport-metrics-module-split`

## v1.6.17 status

- Incident support and recovery policy have been split out of the main reporter.
- Privacy-safe local metrics identify which Firebase transport path succeeds or fails.
- Queue recovery counts and remaining queued reports are visible without exposing report contents.
- Corrupt metrics fail closed and the user can clear only the metrics snapshot.
- Configured cumulative static/regression target: 345 checks.
- Production Firebase, Gmail receipt, and installed mobile browser confirmation remain environment gates.

# FoxBear Status - v1.6.16

## Current release

- Product version: `1.6.16`
- Build ID: `same-origin-incident-overlay-back-navigation`
- Asset version: `1.6.16-same-origin-incident-overlay-back-navigation`
- Service worker cache: `foxbear-shell-v1.6.16-same-origin-incident-overlay-back-navigation`

## v1.6.16 status

- Incident Callable traffic has an authenticated same-origin Hosting fallback for status, submission, delivery status, and readiness.
- Failure-class recovery buttons now expose the next safe action directly in the settings dialog.
- Nested external overlays suspend their parent and browser Back closes the top blocking layer first.
- Configured cumulative static/regression target: 342 checks.
- Production Hosting rewrite, Functions, App Check, and Gmail delivery confirmation remain pending environment gates.

# FoxBear Status - v1.6.15

## Current release

- Product version: `1.6.15`
- Build ID: `nested-overlay-incident-auto-recovery`
- Asset version: `1.6.15-nested-overlay-incident-auto-recovery`
- Service worker cache: `foxbear-shell-v1.6.15-nested-overlay-incident-auto-recovery`

## v1.6.15 status

- Conditional nested dialogs and floating panels use a shared fixed visual-viewport overlay stack.
- Parent dialog focus, inert state, z-order, body scroll lock, and cleanup are centrally managed.
- Incident diagnostics distinguish offline, network blocked, response blocked, not deployed, and server internal states.
- Transient service failures receive bounded automatic recovery and queued anonymous reports retry after connectivity returns.
- Manual recovery and sanitized diagnostic-copy controls are available in the error-reporting settings.
- Configured regression target: 341 checks.

# FoxBear Status - v1.6.14

## Current release

- Product version: `1.6.14`
- Build ID: `download-viewport-incident-diagnostics`
- Asset version: `1.6.14-download-viewport-incident-diagnostics`
- Service worker cache: `foxbear-shell-v1.6.14-download-viewport-incident-diagnostics`

## v1.6.14 status

- Download quality popup is portalled outside the sheet and constrained to the visual viewport.
- Mobile sheet height, scrolling, safe areas, remembered quality, and file-size estimates are implemented.
- Incident status UI separates function name, endpoint, direct HTTP response, CSP, and App Check diagnostics.
- Generic Functions internal errors are no longer classified as network blocks without reachability evidence.
- Configured regression target: 339 checks.

# FoxBear Status - v1.6.13

## v1.6.13 current focus

- The download dialog shows only MP3 and WAV until the user asks for quality choices.
- Each format opens a Windows-style anchored quality menu instead of expanding every bitrate/bit-depth inline.
- Quality selection closes the menu and preserves current download, share, assist, cancellation, and recovery behavior.
- Keyboard and mobile touch navigation are included in the same menu contract.
- Configured static/regression target: 337 checks before installed-browser confirmation.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

# FoxBear Status - v1.6.12

## v1.6.12 current focus

- Mono and stereo tone-dynamics loops avoid generic channel iteration and temporary scratch objects.
- K-weighted integrated and short-term loudness use one exact Float32-equivalent power representation.
- Input validation/sanitization and final DC/safety cleanup each use one fewer full-buffer pass.
- Worker and fallback final loudness paths share the same measurement work.
- Same-input regression preserves output samples and reported quality metrics.
- Configured static/regression target: 336 checks before installed-browser confirmation.
- Local Node VM 1-second stereo stress comparisons show roughly 10-21% lower processing time across measured runs.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

# FoxBear Status - v1.6.11

## v1.6.11 current focus

- Finalizer exact-length transfer buffers are reused without a second full channel copy.
- Final integrated and short-term LUFS share one K-weighted filter pass.
- Two redundant 4x True Peak scans are eliminated through mathematically safe measurement reuse.
- Same-input comparison preserves every output sample and final quality metric.
- Historical build-ID assertions no longer fail valid future releases.
- Local synthetic benchmark median processing time decreased by about 40% in Node VM.
- Configured static/regression target: 334 checks before installed-browser confirmation.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

# FoxBear Status - v1.6.10

## v1.6.10 current focus

- Deployment readiness is fail-closed when required checks, timestamps, server version, or Functions origin are incomplete.
- Cached server readiness is reused only when its required check contract is complete.
- CSP verification requires an exact normalized origin token in `connect-src`.
- Local cached rechecks update one history record and mark it as cached.
- Invalid local history entries are ignored safely.
- Configured static/regression target: 333 checks before installed-browser confirmation.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

# FoxBear Status - v1.6.9

## v1.6.9 current focus

- Deployment readiness keeps a bounded local history of the latest three checks and status transitions.
- Failed readiness cards expose copyable deploy commands or safe setup guidance without Secret identifiers.
- Cached checks deduplicate by check timestamp.
- Settings incident-mail summary updates immediately through the shared incident status event.
- Configured static/regression target: 332 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.6.8

## v1.6.8 current focus

- Incident deployment self-checks use a 60-second client/server cache to prevent repeated SMTP verification calls.
- The dialog preserves the most recent healthy check timestamp and shows whether a cached result was used.
- Failed CSP, Functions, Firestore, Gmail Secret, and SMTP cards show concise recovery directions.
- The Settings entry exposes a compact mail-health summary without opening the diagnostic dialog.
- Configured static/regression target: 331 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.6.7

## v1.6.7 current focus

- Incident settings performs a single deployment readiness check across web CSP, Callable Functions, Firestore, Gmail Secret, and SMTP connectivity.
- Local manual-test history synchronizes pending and failed records with current server delivery state, including scheduled automatic retries.
- Direct retry buttons expose the server-provided cooldown countdown and remain disabled until eligible.
- Performance-protected multi-track mastering exposes the danger reason and stable-normal recovery sample progress in the HUD.
- Configured static/regression target: 330 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.6.6

## v1.6.6 current focus

- Manual mail-test history shows SMTP attempts, direct retry usage, and the remaining automatic retry time.
- Authenticated users can safely retry only their own failed manual test reports, with a two-request limit and a 60-second cooldown.
- Terminal/dead-letter, already-delivered, automatic, and foreign reports cannot use the user retry path.
- Confirmed performance danger pauses multi-track mastering before the next track and stable normal health resumes only auto-paused work.
- Configured static/regression target: 329 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.6.5

## v1.6.5 current focus

- Incident settings exposes server recheck and deploy-command copy actions without requiring developer-console discovery.
- The latest five real mail-test outcomes remain available locally and can be cleared by the user.
- SMTP failures distinguish Secret format, Gmail authentication, recipient rejection, quota/rate limiting, and network connectivity.
- Delivery diagnostics retain normalized reason, provider code, and next retry time separately.
- Configured static/regression target: 328 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.6.4

## v1.6.4 current focus

- Firebase Callable requests are allowed by both deployed and meta Content Security Policies.
- Incident deployment updates Hosting CSP, Firestore rules/indexes, and Functions in one command.
- Mail test errors expose the failing transport category, endpoint, code, and recovery action.
- Server status schema v2 reports the canonical Functions origin.
- Configured static/regression target: 327 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.6.3

## v1.6.3 current focus

- Settings exposes normal, watch, or danger with the current performance reason.
- Watch and danger indicators require two consecutive samples to prevent transient flicker.
- Repeated identical danger notices are suppressed for 30 minutes after acknowledgement, including after reload.
- Toast and health-notice overlays reserve separate mobile space.
- Configured static/regression target: 326 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.6.2

## v1.6.2 current focus

- Routine audio activity no longer creates false performance warnings.
- Stale long-task, decode, and wake-lock errors automatically expire from the active health state.
- Settings displays only a compact watch/danger badge; normal state has no persistent marker.
- Sustained danger uses a non-blocking notice that disappears after stable recovery.
- Configured static/regression target: 325 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.6.1

## v1.6.1 current focus

- Normal startup no longer opens memory/performance diagnostics from a stale persisted preference.
- Settings and keyboard openings are session-only.
- Explicit automatic diagnostics close after runtime health remains normal for two samples after boot stabilization.
- User interaction disables automatic dismissal for the current panel session.
- Configured static/regression target: 324 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.6.0

## v1.6.0 current focus

- The real mail test displays anonymous authentication, server API, queue, and SMTP acceptance as distinct stages.
- The client checks the deployed incident Functions version and warns about web/server skew.
- App Check readiness is visible without blocking anonymous incident reporting.
- Configured static/regression target: 323 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.5.99

## v1.5.99 current focus

- The upload status message is reduced to a short instruction to load one or more audio files.
- Authenticated callable Functions are the primary incident report and delivery-status transport.
- The client Firestore create-first path remains a compatibility fallback for staggered deployments.
- The incident deployment command includes both callable endpoints and the existing email trigger stack.
- Configured static/regression target: 322 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.5.98

## v1.5.98 current focus

- Safe recovery retries rebuild analysis, mastering, and master-preview tasks from retained track files instead of reusing detached Worker transfer buffers.
- Worker diagnostics exposes per-job progress, stage, no-progress age, transfer memory, and normal/watch/danger health.
- Stalled jobs can be cancelled individually or together, then deduplicated and retried by track and operation type.
- ZIP/general export retries stay manual to prevent duplicate file-save actions.
- Configured static/regression target: 321 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.5.97

## v1.5.97 current focus

- The shared Worker lifecycle supports targeted cancellation and stalled-only recovery after the published 15-second no-progress threshold.
- Memory/performance diagnostics shows plain-language recovery guidance instead of raw internal warning codes.
- The recovery button is enabled only when stalled cancellable jobs exist and confirms before discarding in-flight results.
- Thirty sequential Worker jobs plus a manual stalled recovery must return active Worker and transfer-memory accounting to zero.
- Configured static/regression target: 318 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.5.96

## v1.5.96 current focus

- Shared modal focus trapping, opener restoration, layered scroll locking, Escape, and outside-click dismissal are centralized.
- Program information, incident reporting, and performance diagnostics follow the same close lifecycle.
- Memory diagnostics exposes readable health cards and a separate expandable technical log.
- Configured static/regression target: 317 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.5.95

## v1.5.95 current focus

- The version popup clearly explains smart analysis, quality protection, A/B preview, batch workflow, export formats, and local audio privacy; support tools remain discoverable from the header settings panel.
- Incident reporting and memory/performance diagnostics open in dedicated dialogs with compact 32px close controls and shared backdrop dismissal.
- The first incident mail test creates before duplicate lookup, avoiding missing-document permission denial.
- Settings, performance diagnostics, and download assist close from outside interaction while active operations remain protected.
- Configured static/regression target: 316 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.5.94

## v1.5.94 current focus

- Cancellation and decode timeout cannot enter the synchronous AIFF PCM fallback.
- Oversized AIFF fallback workloads fail before allocating a large AudioBuffer or blocking the main thread.
- Worker recent diagnostics preserve timeout/cancel/failure codes, reasons, and progress age.
- Future patch reports use only the persistent three-section contract below.
- Configured static/regression target: 315 checks before installed-browser confirmation.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

# FoxBear Status - v1.5.93

## v1.5.93 current focus

- External WASM pitch processing receives cancellation ownership and stale results cannot enter the mastering chain.
- Worker diagnostics report active and peak transferred PCM bytes, transfer counts, and 15-second no-progress stalls.
- Administrator mail-test and audit CSV exports share the production download lifecycle with duplicate-action and ARIA guards.
- OpenAI integration is documented as server-side, metadata-first, explicit-consent architecture.
- Configured static/regression target: 314 checks before installed-browser confirmation.

## v1.5.92 previous focus

- Static QA cleans inherited Python bytecode and forces no-bytecode child execution.
- GitHub cache actions use the Node 24-based v5 runtime.


## v1.5.91 current focus

- Mastering cancellation now reaches decode, emergency analysis, pitch/BPM processing, and master-preview transformation.
- Analysis and WSOLA workers use the shared lifecycle manager with job identity, progress, timeout, abort, and guaranteed termination.
- Large tracks cannot fall back to blocking main-thread FFT or WSOLA after Worker failure or unavailability.
- Small compatibility fallbacks remain available and cancellation is never reported as a worker failure.
- Master-preview PCM slicing avoids an extra per-channel segment allocation.
- Configured static/regression checks: 312/312 PASS before installed-browser confirmation.

## v1.5.90 previous focus

- Retry recovery distinguishes pass, skip, repeat failure, and missing results.
- A new workflow verifier blocks deployment unless every primary browser failure genuinely passes on retry.
- Browser impact selection recognizes generated release-metadata-only diffs across package, lock, HTML, service-worker, and runtime metadata files.
- Real functional changes remain mapped to selected specs or promoted to the full suite.
- Browser flaky history uses a 45-day retention window and explicit skipped-outcome tracking.
- Nested custom report paths are created safely without leaking default artifacts into the repository.
- Configured static/regression checks: 311/311 PASS before installed-browser confirmation.

# FoxBear Status - v1.5.89

## v1.5.89 current focus

- Runtime Health runs as the first browser sentinel and blocks heavier specs when application boot health is not clean.
- Browser impact mapping covers Runtime Health detail, PWA recovery, admin operations, quality reports, and comparison waveform paths.
- Shared CSS files use conservative selector-level mapping when reliable diff tokens are available.
- Unmapped selector changes and missing diff context continue to use the complete browser suite.
- Flaky history generates an issue-ready report with unresolved cases sorted first.
- Configured static/regression checks: 309/309 PASS.

# FoxBear Status - v1.5.88


## v1.5.88 current focus

- Browser QA impact selection runs before dependency and Chromium installation.
- Documentation/backend/static-only changes skip browser execution; mapped UI changes select related specs; unknown/core changes use the full suite.
- Failed-only retry results update a branch-scoped cumulative flaky-history cache.
- Recurring retry recoveries and unresolved repeated/missing outcomes appear in artifacts, annotations, and the GitHub Job Summary.
- Cached history is ignored by Git and excluded from release packages.
- Configured static/regression target: 307/307 before final verification.

## v1.5.86 previous focus

- Browser fixture safety and production selector contracts run before Chromium installation in both deployment workflows.
- Shared visual fixtures are checked against current markup IDs, UI creation tokens, and CSS selectors without Playwright.
- A failed primary browser run preserves its evidence and retries only Playwright's last failed cases once.
- Durable JSON/server diagnostics are separated from Playwright's cleaned artifact directory.
- Configured static and regression checks: 302/302 PASS; real Chromium execution remains GitHub CI confirmation.

## v1.5.85 previous focus

- Browser visual fixture setup is centralized in reusable Trusted Types-safe builders with consistent ARIA and deterministic cleanup.
- A dependency-light browser-spec preflight rejects HTML parsing sinks and string-based evaluate calls before Playwright or Chromium startup.
- Duplicate browser failures are grouped into likely root causes with failure counts, examples, and direct remediation guidance.
- The reported ten-way Trusted Types failure pattern is covered by a synthetic JSON diagnostic regression.
- Configured static and regression checks: 299/299 PASS; real Chromium rerun remains the final CI confirmation.

## v1.5.84 previous focus

- Browser visual fixtures no longer assign HTML strings under the production Trusted Types enforcement policy.
- Bulk mastering rows are created with DOM APIs and atomically installed with `replaceChildren`.
- Mobile download-sheet controls are staged with structured elements and text-only assignments.
- The unsafe HTML sink audit now covers both application source and Playwright browser specifications.
- Configured static and regression checks: 295/295 PASS; real Chromium rerun remains the final CI confirmation.

## v1.5.83 current focus

- Dock transport snapshots are accepted only from audio owned by the target track, preventing cross-track position leakage during rapid selection changes.
- Inactive crossfade audio cannot overwrite current MediaSession metadata, playback state, or position.
- Worker jobs expose bounded active/recent lifecycle diagnostics and progress-based remaining-time estimates.
- Generic track cleanup aborts both mastering and master-preview work and clears stale playback ownership datasets.
- Configured static and regression checks: 294/294 PASS after final verification; real lock-screen MediaSession presentation remains installed-device verification.

## v1.5.82 previous focus

- Cancelling quality-gate automatic recovery exits the complete mastering job instead of falling back to a successful first-render commit.
- First-render settings and report metadata are restored before a cancelled recovery leaves the track.
- A transient foreground-return media interruption receives one owned retry after audio-graph resume.
- Superseded or detached audio requests cannot retry or modify the current player.
- Configured static and regression checks: 293/293 PASS after final verification; real mobile interruption and browser audio timing remain installed-device verification.

## v1.5.81 previous focus

- Master-preview decoding, DSP, finalization, WAV encoding, and URL commit share one cancellable job owner.
- Settings invalidation, track removal, queue clearing, and lifecycle release abort stale preview work and prevent detached result commits.
- Busy/rendering state is job-owned so an older completion cannot clear or overwrite newer state.
- Closed or replaced download-assist panels ignore late native share and file-picker rejection results.
- Configured static and regression checks: 292/292 PASS; real worker termination, native sheets, and long-session heap reclamation remain installed-browser/device verification.

## v1.5.80 previous focus

- Interrupted Web Audio contexts recover after mobile screen lock, calls, and app switching, with concurrent resume requests deduplicated.
- Lifecycle-captured Dock transport retains position and play intent for up to 12 hours and duplicate foreground events are coalesced.
- MediaSession state and handlers are cleared when the Dock source disappears and controls resolve the current audio dynamically.
- Native share/direct-save completion restores focus and all assist controls remain locked during the active operation.
- Configured static and regression checks: 290/290 PASS; real mobile interruption and native picker behavior remain device verification.

## v1.5.79 previous focus

- Pending preview playback is owned by a per-audio request generation and stale completions cannot revive detached audio.
- Audio disposal invalidates pending play/fade work before unregistering spectrum and playback-link resources.
- Download assist native actions are single-flight with synchronized disabled and `aria-busy` states.
- Normal page exit revokes all tracked download Blob URLs; BFCache navigation preserves active URLs for restoration.
- Configured static and regression checks: 289/289 PASS; real native share/file-picker behavior remains device verification.

## v1.5.78 previous focus

- Cancelled playback fades settle immediately and release their animation-frame/controller references.
- A superseded fade-out cannot issue a stale pause after a newer play request.
- Cancelled crossfades skip stale source cleanup and completion callbacks.
- VM regression coverage verifies replacement fade settlement, rapid pause/play ownership, and stale crossfade isolation.

## v1.5.77 previous focus

- Detached spectrum audio registrations, captured streams, analyser nodes, popup timers, and preview/Dock bindings are explicitly released.
- BFCache suspension is separated from normal page disposal and mounted audio is restored on return.
- Mobile settings positioning follows visual viewport resize and scroll changes.

## v1.5.76 previous focus

- Release metadata synchronization is staged outside the working tree, validated with SRI, and committed only after the staged copy passes.
- A dry-run reports exact file changes without writing to the repository.
- Root and Functions lockfile versions are synchronized together, eliminating a manual release drift point.
- Dependency health separates lockfile contract failures from expected missing-install warnings for Playwright, Chromium, and Firebase Functions packages.
- A forced staged SRI failure is regression-tested to leave protected release files unchanged.

## v1.5.75 previous focus

- Static and packaging QA can import browser-runner helpers before Playwright development dependencies are installed.
- The browser runner resolves the Playwright CLI only when browser QA actually starts and reports actionable installation commands when unavailable.
- Playwright configuration metadata probes retain bounded CI workers and desktop/mobile project definitions through a dependency-free fallback.
- Configured static/regression checks include a missing-dependency simulation; real Chromium execution remains a CI or installed-environment verification task.

## v1.5.74 previous focus

- Multi-track mastering supports between-track pause/resume, current-track skip, and pending-queue reordering.
- Batch completion summaries retain completed, failed, skipped, and cancelled outcomes with elapsed-time metrics.
- Mobile download uses a near-full-height bottom sheet, MP3/WAV family tabs, quality choices, and sticky primary actions.
- Configured static/regression checks include v1.5.74 orchestration and mobile layout contracts; real-device and real-Chromium visual verification remain deployment tasks.


## v1.5.73 previous focus

- Multi-track mastering can be cancelled through a shared batch signal that reaches the active track worker and stops all not-yet-started tracks.
- Failed tracks can be retried as a new batch without reprocessing completed outputs.
- The batch list shows observed-duration ETA for the current track, pending tracks, and the whole batch.
- Result filters separate active, completed, failed, cancelled, and pending tracks while retaining all audit-visible outcomes.
- Desktop and 375px mobile browser contracts capture the batch HUD and reject viewport overflow or hidden controls.
- Configured static/regression checks: 282/282 PASS in bounded continuation segments; real Chromium execution remains a deployment verification task.


## v1.5.70 current focus

- The 15-minute operations audit treats never-run, stale, failed, and overdue-receipt mail tests as explicit health reasons.
- SMTP-accepted tests become overdue when no inbox/spam confirmation is recorded within 30 minutes after the latest confirmed test.
- The administrator monitor summarizes SMTP and receipt-confirmation rates and provides reason-specific troubleshooting steps.
- Recent mail-test history supports local search, status filters, and UTF-8 CSV export without exposing Gmail credentials or message bodies.
- Configured static and regression checks: 279/279 PASS in bounded continuation segments; production Firebase deployment and real Gmail placement verification remain deployment tasks.


## v1.5.69 current focus

- SMTP-accepted manual tests are retained in `incidentMailTestHistory` with subject, Message-ID, and delivery outcome.
- Administrators can explicitly record whether the test arrived in the inbox or spam folder.
- Mail verification becomes stale after seven days and is surfaced as an administrator warning.
- Test, incident, operations, recovery, and daily-summary HTML mail share one branded accessible template.
- Configured static and regression checks: 278, with real browser and Gmail placement verification remaining deployment tasks.

## v1.5.67 current focus

- Administrator operations write privacy-minimized start, rejection, completion, and failure audit events.
- Operations webhooks retry transient failures and can fail over to an independently configured secondary approved HTTPS endpoint.
- Deployment verification executes real Firestore composite-index probes and checks recent operations-audit freshness.
- Operations history supports status/reason filters and cursor-based pagination; a six-hour scheduled post-deployment health check keeps deployment state current.

## v1.5.66 current focus

- Administrator retry, batch recovery, alert test, and deployment verification actions use server-side leases and cooldowns.
- The administrator monitor can test the approved HTTPS webhook without exposing its URL.
- Operations history stores issue codes and recommended remediation actions for detailed review.
- Missing, stale, or version-mismatched Functions deployments trigger a guarded verification request from the administrator screen.

## v1.5.65 current focus

- Optional approved-host HTTPS webhooks provide an operations alert path independent from Gmail SMTP.
- Administrator batch recovery processes up to eight recoverable or dead-letter reports while preserving leases, KST quotas, and duplicate protection.
- Scheduled and manual recovery runs are summarized in `incidentOperations/recovery`.
- Thirty-minute aggregate health samples are retained in `incidentOperationsHistory` for 30 days; alert channel outcomes are retained in `incidentOperationsAlerts`.
- Administrator history reads degrade safely when new Firestore rules have not yet reached production.

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

## v1.5.72 current focus

- Multi-file analysis completion closes the analysis HUD and moves focus to the full-mastering action.
- Multi-track mastering owns progress presentation through the batch list; the single processing HUD is reserved for single-track work.
- Administrator compact view, preserved unconfirmed-test cleanup, audit search/export/pagination, and mobile detail cards are release requirements.

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

- Product version: `1.6.13`
- Build ID: `download-format-context-menu`
- Asset version: `1.6.13-download-format-context-menu`
- Service worker cache: `foxbear-shell-v1.6.13-download-format-context-menu`
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

- Product version: `1.6.24`
- Build ID: `incident-recovery-sweep-observability`
- Asset version: `1.6.24-incident-recovery-sweep-observability`
- Service worker cache: `foxbear-shell-v1.6.24-incident-recovery-sweep-observability`
## v1.5.68 current focus

- 실제 Gmail SMTP 테스트 메일 경로와 접수 영수증 표시
- 발신자명 `AI마스터링 스튜디오` 통일
- 메일 종류별 검색 가능한 제목 규칙
- 배포 후 Gmail 받은편지함·스팸함 대조 절차

