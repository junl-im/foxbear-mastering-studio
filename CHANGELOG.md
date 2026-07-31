# v1.6.46 - Google Auth Same-Origin Network Recovery

- Uses the active approved Firebase Hosting hostname as `authDomain`, keeping the authentication helper same-origin on `foxbear-music.web.app` and `foxbear-music.firebaseapp.com`.
- Adds both Hosting origins to synchronized CSP frame and connection allowlists.
- Retries `auth/network-request-failed`, blocked popup, and unsupported popup environments once through redirect authentication.
- Prevents redirect loops and reports a missing redirect result explicitly.
- Preserves safe diagnostics with error code, page origin, auth domain, online state, and query-free Trusted Types rejection path only.
- Adds dedicated regression coverage, raising the configured target to 391 checks.

# v1.6.45 - Windows Release Gate, Spark Hosting Hygiene, and No-App-Check Policy

- Fixes Windows `spawnSync npm.cmd EINVAL` by executing the npm CLI JavaScript entry with the active Node runtime.
- Excludes Windows executable and command files from Firebase Hosting, Git tracking, release ZIPs, and overwrite ZIPs.
- Adds `npm run hosting:check` before Spark and incident deployments.
- Removes the App Check SDK, site key, token header, reCAPTCHA CSP/Trusted Types allowances, and setup requirement.
- Keeps Google administrator access on Firebase Auth plus strict `siteAdmins/{UID}` Firestore Rules.
- Adds dedicated regression coverage, raising the configured target to 390 checks.

# v1.6.44 - Google Auth gapi Module Trusted Types Recovery

- Allows the second-stage Firebase Auth gapi iframe module under the exact `https://apis.google.com/_/scs/apps-static/_/js/` prefix.
- Keeps the first-stage `/js/api.js` loader and existing reCAPTCHA paths while continuing to reject lookalike or unrelated script URLs.
- Adds query-free rejected-path diagnostics and normalizes the FoxBear Trusted Types rejection in the administrator sign-in flow.
- Adds dedicated regression coverage, raising the configured target to 389 checks.

# v1.6.43 - Google Auth Trusted Types and CSP Recovery

- Fixes the administrator Google sign-in failure caused by strict TrustedScriptURL enforcement.
- Installs an early, narrow Trusted Types `default` policy for the exact Firebase Auth Google API loader, existing reCAPTCHA loaders, and FoxBear same-origin script directories.
- Aligns document and Firebase Hosting CSP allowlists for Google Auth scripts, account endpoints, and the Firebase authentication iframe.
- Changes COOP to `same-origin-allow-popups` so the Google account chooser can complete without weakening frame ancestry controls.
- Precaches the security bootstrap and adds a friendly stale-cache recovery message.
- Adds syntax and dedicated security regression coverage, raising the configured target to 388 checks.

# v1.6.42 - Spark Google Administrator Authentication

- Replaces the Blaze-only administrator PIN and Secret Manager flow with Firebase Google Authentication that works on the Spark plan.
- Adds a Settings-based Google account selector and displays the signed-in email and Firebase UID when one-time administrator registration is required.
- Requires a verified `google.com` identity plus an active matching `siteAdmins/{UID}` document in Firestore Rules.
- Adds explicit Google administrator logout and restores an anonymous Firebase session afterward.
- Removes administrator PIN Callable Functions and adds `npm run deploy:spark` for Hosting, Firestore Rules, and indexes without paid APIs.
- Adds dedicated regression coverage while keeping the configured target at 386 checks.

# v1.6.41 - Secret Manager Administrator PIN Session

- Adds a visible `관리자 모니터링` entry inside Settings while keeping the administrator secret out of HTML, JavaScript, environment examples, and release archives.
- Verifies the submitted PIN only in the Firebase Callable Function `unlockAdminAccess` using Secret Manager and constant-time digest comparison.
- Issues an eight-hour Firestore administrator session for the current anonymous UID and enforces its expiration in both client state and Firestore Rules.
- Adds UID and hashed-network rate limiting: five failures within ten minutes trigger a fifteen-minute lock without storing the raw network address.
- Supports optional Firebase App Check enforcement after the production App Check site key is configured.
- Adds dedicated regression coverage, raising the configured target to 386 checks.

# v1.6.40 - UI Shell Retry Replacement Settlement

- Evaluates all matching critical resource candidates so a stale failed node cannot mask a successful replacement.
- Keeps post-load replacement resources pending until their own load/error event or a bounded 2.5-second deadline.
- Detects dynamically inserted critical resources and starts settlement automatically.
- Keeps the recovery surface visible until retry settlement completes.
- Adds dedicated regression coverage, raising the configured target to 384 checks.

# v1.6.39 - UI Shell Partial Script Recovery and Probe Isolation

- Adds critical JavaScript pending, failure, and recovery classification alongside the existing core-style recovery state.
- Keeps the static interface visible and routes confirmed script failures into Runtime Health instead of silently resolving recovery.
- Rejects late responses from expired service-worker shell probes so terminated tabs cannot repopulate cache-retention state.
- Reconciles clients that disappear during a probe and retries surviving non-responders once before deciding whether cache retirement is safe.
- Adds two dedicated regressions, raising the configured target to 383 checks.

# v1.6.38 - UI Shell Runtime Health and Cache Retirement

- Separates pending core styles from confirmed failures so normal loading does not trigger a false safe-UI warning.
- Resolves fallback state after styles recover and deduplicates the shell notice with the Runtime Health recovery panel.
- Adds page-to-service-worker shell generation reporting and retires an inactive older retained cache only after every controlled client responds.
- Keeps the latest rollback cache and preserves both retained generations whenever an older client cannot report its version.
- Adds dedicated regression coverage, raising the configured target to 381 checks.

# v1.6.37 - UI Shell Cross-Generation Recovery

- Retains the two latest legacy service-worker shell caches so already-open clients can finish loading exact previous-generation assets.
- Serves stale CSS/JS/Worker requests only from an exact retained cache-key match, preserving SRI instead of mixing generations.
- Adds a boot-level UI shell recovery service and minimal fallback stylesheet so the interface remains visible when core styles are blocked.
- Adds dedicated UI-shell and cross-generation regression coverage, raising the configured target to 380 checks.

# v1.6.36 - Service-Worker Activation Generation Fencing and Resource Stress

- Adds generation-fenced two-phase activation claims so competing tabs settle to one `SKIP_WAITING` sender.
- Prevents stale watchdog and release paths from deleting a newer activation lease generation.
- Reconciles a controller change missed during BFCache freeze and deduplicates the later controllerchange event.
- Coalesces concurrent managed AudioContext close calls and exposes pending cleanup diagnostics.
- Adds 301-worker lifecycle and 120-context concurrent cleanup stress, raising the configured target to 378 checks.

# v1.6.35 - History Terminal Race and Service-Worker Activation Lease

- Keeps a short exact-generation grace after terminal overlay recovery so a boundary-late internal popstate cannot trigger the workspace exit guard.
- Clears active overlay release state on non-BFCache page unload instead of preserving a transaction that cannot resume.
- Adds a cross-tab service-worker activation lease and controller-change timeout recovery so one tab owns `SKIP_WAITING`.
- Preserves a reused download-assist Object URL and adds 200-cycle managed AudioContext cleanup stress.
- Adds two regressions and raises the configured cumulative target to 376 checks.

# v1.6.34 - History Hard-Stall and Service-Worker Activity Lifecycle

- Adds a 30-second terminal recovery for an overlay history release that never traverses and never emits `popstate`.
- Neutralizes a stale sentinel without issuing a second Back, or retains it when a dialog reopened during the stalled transaction.
- Suspends and resumes service-worker cross-tab activity heartbeat and BroadcastChannel ownership across BFCache.
- Deduplicates repeated service-worker registration observers and exposes lifecycle diagnostics.
- Adds terminal-stall, BFCache heartbeat, and observer-idempotency regression coverage and raises the configured cumulative target to 374 checks.

# v1.6.33 - Full Audit and Overlay History Watchdog Recovery

- Recovers an internal overlay history release when traversal completed but the browser omitted `popstate`.
- Avoids a second programmatic Back when the current sentinel has not moved, preventing accidental traversal beyond the workspace exit guard.
- Bounds delayed release-generation tracking to eight entries in addition to the 30-second expiry.
- Adds watchdog recovery, hard-stall, and pending-generation pressure diagnostics without recording navigation URLs or user content.
- Re-runs system, performance, technology, functionality, engine, error, exception, handoff, and archive gates and raises the configured cumulative target to 373 checks.

# v1.6.32 - Overlay History Generation and BFCache Recovery

- Adds matching generation markers to each overlay sentinel and its destination history entry.
- Consumes a popstate as internal cleanup only when its destination generation matches a pending release.
- Prevents a delayed programmatic popstate from swallowing a newer genuine user Back action.
- Recovers suspended overlay-history transactions across pagehide and BFCache pageshow without duplicating the workspace exit guard.
- Adds representative download, recommendation, settings, and incident dialog cycles and raises the configured cumulative target to 372 checks.

# v1.6.30 - Overlay History Release and Exit Guard Safety

- Fixes an event-order race where closing a dialog normally could be mistaken for a browser Back action.
- Exposes internal modal history-sentinel release state so the navigation exit guard can ignore only that programmatic popstate.
- Stops the modal controller from marking genuine Back events as consumed when no overlay is open.
- Adds integrated listener-order coverage and raises the configured cumulative target to 370 checks.

# v1.6.29 - Stable Incident Submission Fencing and Adaptive Polling

- Adds `incident-submission-identity-service.js` so a queued occurrence keeps one deterministic submission key and report ID even when recovery happens after the previous 15-minute window.
- Returns and verifies the submission key across Callable and Firestore compatibility paths, preventing a stale acknowledgement from committing the wrong queued occurrence.
- Adds lease-generation fencing so a same-token generation replacement aborts the stale owner before local queue commit.
- Replaces fixed two-second fallback polling with active, idle, and hidden-page schedules and immediate foreground resynchronization.
- Extracts incident settings control rendering, one-time event binding, and transient button feedback into `incident-controls-view-service.js`.
- Adds 500-write quota pressure, generation replacement, adaptive polling, stable identity, and idempotent DOM binding coverage and raises the configured cumulative target to 369 checks.

# v1.6.28 - Incident Lease Takeover, Fallback Sync, and Diagnostics UI Safety

- Releases queue ownership immediately on BFCache pagehide and validates it again on pageshow, focus, and visible-state restoration.
- Reclaims expired crash leases, aborts on lock-token replacement, and treats lease renewal storage failure as an ownership loss.
- Adds bounded revision polling so peer queue changes remain observable when BroadcastChannel or storage events are unavailable or unreliable.
- Extracts service diagnostic DOM rendering, queue status text, and status-event dispatch into `incident-diagnostics-view-service.js`.
- Adds stale-lease, BFCache, polling-only, renewal-failure, 200-write pressure, rendering, and cleanup coverage and raises the configured cumulative target to 366 checks.

# v1.6.27 - Multi-Tab Incident Queue Ownership Safety

- Adds per-tab bounded queue shards so simultaneous localStorage writes cannot overwrite another tab's report.
- Adds BroadcastChannel and storage-revision synchronization for peer queue changes and delivered-entry compaction.
- Adds Web Locks ownership with a renewable localStorage lease fallback so only one tab can flush reports at a time.
- Commits exact fingerprint-plus-client-time occurrences, preventing stale delivery resurrection without permanently suppressing a later matching issue.
- Migrates the legacy single-key queue through the coordinated read and commit path.
- Adds two-tab write storms, 50-owner contention, concurrent enqueue/commit, exact tombstone, and legacy migration coverage and raises the configured cumulative target to 364 checks.

# v1.6.26 - Incident Diagnostics and Conflict-Safe Local Queue

- Extracts Firebase incident-service failure classification and seven-row diagnostic UI view-model generation into `incident-service-diagnostics.js`.
- Extracts local report parsing, deduplication, bounds, quota fallback, and flush commits into `incident-local-queue-service.js`.
- Fixes a race where a report queued during active recovery could be overwritten by a stale queue snapshot.
- Removes successfully delivered entries even when a later delivery fails or recovery is aborted, preventing duplicate resubmission.
- Reports the actual persisted queue count after the eight-item cap and exposes metadata-only queue storage health.
- Adds 50-enqueue, conflict-merge, malformed-storage, oversized-storage, and quota-pressure regression coverage and raises the configured cumulative target to 362 checks.

# v1.6.25 - Incident Recovery Timeout, Abort, and Trigger-Storm Hardening

- Extracts automatic service-recovery timers, retry budget, active ownership, and phase execution into `incident-service-recovery-controller.js`.
- Fixes retries being dropped when a failed run tried to schedule while its in-flight flag was still active.
- Adds 22s service, 30s queue, and 45s deployment deadlines with shared AbortSignal propagation.
- Pauses retries offline without consuming attempts and suspends unused retries when the settings surface closes.
- Adds bounded timeout, abort, and slow-phase metadata to anonymous diagnostics.
- Adds deterministic 50-trigger and 50-schedule stress coverage and raises the configured cumulative target to 359 checks.

# v1.6.24 - Incident Recovery Sweep Module Split and Observability

- Extracts lifecycle recovery coalescing and phase orchestration into `incident-recovery-sweep-service.js`.
- Preserves single-flight queue, history, service, and deployment recovery with bounded merged reasons.
- Records offline recovery attempts as diagnostic snapshots instead of leaving the previous online result visible.
- Surfaces contained lifecycle callback failures through reporter status and anonymous diagnostics.
- Deduplicates and bounds normalized phase-error summaries while retaining phase-level observer events.
- Adds `qa/v1624_incident_recovery_sweep_observability_smoke.js` and raises the configured cumulative target to 357 checks.

# v1.6.23 - Persisted Route Decay, Lifecycle Rejection Containment, and Handoff Safety

- Persists elapsed-time Callable and Hosting route-score decay instead of returning a temporary decayed view.
- Applies elapsed-time and network decay before every route attempt, success, and failure mutation.
- Contains asynchronous lifecycle callback failures at browser event boundaries and reports sanitized phase diagnostics through `onError`.
- Verifies current handoff metadata, GitHub Desktop guide version, configured QA target, and the mandatory delivery-rule document.
- Adds `qa/v1623_route_decay_lifecycle_handoff_safety_smoke.js` and raises the configured cumulative target to 355 checks.

# v1.6.22 - Incident Recovery Coalescing and Route Time Decay

- Coalesces simultaneous online, network-change, and long-resume recovery requests into one in-flight sweep.
- Merges stronger pending service and deployment checks into one bounded follow-up sweep.
- Exposes merged lifecycle reasons in anonymous diagnostics.
- Decays Callable and Hosting success/failure evidence by 15% per elapsed day, capped at eight steps.
- Adds `qa/v1622_incident_recovery_coalescing_time_decay_smoke.js` and raises the configured cumulative target to 354 checks.

# v1.6.21 - Incident Lifecycle Recovery and Network Exploration

- Adds `incident-lifecycle-service.js` to coordinate online/offline transitions, long-background resume, and connection-type changes.
- Runs one deduplicated recovery sweep for queued anonymous reports, mail-delivery history, service health, and stale deployment readiness after connectivity or long-resume events.
- Starts a four-attempt route exploration window after network changes and alternates Callable and Hosting same-origin paths to rebuild current-network evidence quickly.
- Records route attempts separately from outcomes so exploration cannot be consumed by passive status rendering.
- Shows the current browser route and local anonymous report queue in the administrator incident summary without exposing report contents.
- Adds `qa/v1621_incident_lifecycle_network_exploration_smoke.js` and raises the configured cumulative target to 353 checks.

# v1.6.19 - Incident Mail Sync and Route Scoring

- Extracts mail-test polling, retry countdown scheduling, and refresh timing into `incident-mail-sync-service.js`.
- Uses bounded success-rate evidence to prefer Hosting only when it is materially more reliable than Callable.
- Keeps non-transient server, permission, and deployment failures visible instead of hiding them behind route switching.
- Adds `qa/v1619_incident_mail_sync_route_scoring_smoke.js` and raises the configured cumulative target to 350 checks.

# v1.6.18 - Incident State Service and Adaptive Route Policy

- Moves mail-test history, deployment-readiness snapshots, and deployment history into `incident-state-service.js`.
- Normalizes corrupt local snapshots and redacts email, credential-like, and local-path text before incident history is persisted.
- Adds `incident-route-policy.js`, which opens a bounded Callable cooldown after repeated transient failures and temporarily prefers the authenticated Hosting same-origin route.
- Resets the cooldown immediately after a successful primary request and never opens it for permission, authentication, or invalid-request failures.
- Shows the active adaptive route state in the incident settings panel and clears it together with privacy-safe transport counters.
- Keeps Firestore as the final compatibility path and preserves Firebase ID-token, optional App Check, and Callable protocol behavior.
- Adds `qa/v1618_incident_state_adaptive_route_smoke.js` and raises the configured cumulative target to 348 checks.

# v1.6.17 - Incident Transport Metrics and Module Split

- Splits privacy-safe storage, sanitization, version helpers, and transport metrics into `incident-support-service.js`.
- Splits failure classification and status-specific recovery actions into `incident-recovery-policy.js`.
- Keeps `incident-reporter.js` focused on reporting orchestration, Firebase bridge coordination, and UI rendering.
- Adds local-only success/failure counters for Callable, Hosting same-origin rewrite, and Firestore compatibility routes.
- Shows recovered and remaining local queue counts and the most recent privacy-safe transport outcome.
- Redacts email addresses, credentials, tokens, and local paths before any transport diagnostic code is persisted.
- Recovers corrupt local metrics to an empty fail-safe snapshot and allows users to clear metrics without deleting queued reports or settings.
- Adds `qa/v1617_incident_transport_metrics_module_split_smoke.js` and raises the configured cumulative target to 345 checks.

# v1.6.16 - Same-Origin Incident Recovery and Overlay Back Navigation

- Adds Firebase Hosting same-origin rewrites for incident status, submission, delivery status, and readiness checks.
- Falls back from the Firebase Callable SDK to the authenticated same-origin Callable protocol before using the existing Firestore compatibility path.
- Adds failure-specific one-line recovery actions for network, deployment, authentication, Firestore, Gmail Secret, SMTP authentication, recipient, rate-limit, and SMTP network states.
- Shows whether the incident service is using the primary Callable route or the Hosting same-origin recovery route.
- Extends the shared overlay manager with external parent ownership, parent input suspension, explicit close callbacks, and mobile browser-back handling that closes the top dialog before leaving the page.
- Coordinates overlay Back consumption with the existing unsaved-work exit guard so one `popstate` cannot both close a popup and trigger page-exit confirmation.
- Keeps simple non-interactive tooltips lightweight; only blocking or interactive popup-on-popup flows join the shared overlay stack.
- Adds `qa/v1616_same_origin_incident_overlay_navigation_smoke.js` and raises the configured cumulative static/regression target to 342 checks.

# v1.6.15 - Conditional Nested Overlays and Incident Auto-Recovery

- Generalizes the viewport-safe download popup into a shared fixed-overlay stack for appropriate popup-on-popup flows.
- Keeps parent dialogs mounted but inert while child overlays own focus and restores the parent cleanly after close.
- Constrains dialog and floating layers to the active visual viewport with internal scrolling and mobile viewport updates.
- Registers AI recommendation, select popup, download dialog, and download assistance panels with the shared manager.
- Separates offline, true network block, CORS-unreadable endpoint, missing deployment, and reachable server-internal incident states.
- Adds bounded 5/15/45-second service recovery, online-triggered queue retry, a manual recovery action, and privacy-safe diagnostic copy.
- Adds two v1.6.15 regression checks and raises the cumulative configured target to 341 checks.

# v1.6.14 - Viewport-Safe Download Quality and Incident Endpoint Diagnostics

- Moves the MP3/WAV quality list into a fixed overlay so opening it no longer increases or pushes the download sheet below the visible screen.
- Clamps the menu to the current visual viewport, chooses above/below placement, caps height, and enables internal scrolling.
- Makes the mobile download sheet taller but viewport-bounded with internal scrolling and safe-area padding.
- Remembers the last MP3 bitrate, WAV bit depth, and selected format using guarded local storage.
- Shows exact current-output size and estimated alternate MP3/WAV sizes.
- Displays the exact `getIncidentServiceStatus` function, endpoint, direct HTTP reachability, CSP status, and App Check status separately.
- Stops treating generic reachable `functions/internal` errors as network blocking; distinguishes missing deployment, CSP/network failure, and server-internal failure.
- Adds two v1.6.14 regression checks and raises the configured cumulative target to 339 checks.

# v1.6.13 - MP3/WAV Context Quality Menu

- Keeps only MP3 and WAV format-family buttons visible in the mastered-file download dialog.
- Opens bitrate or bit-depth choices in a compact Windows-style context menu anchored to the selected format.
- Closes the quality menu after selection, outside interaction, repeated format click, or Escape.
- Adds Arrow Up/Down, Home, End, and focus-return keyboard behavior with menuitemradio accessibility semantics.
- Preserves the existing encoder formats, download/share/recovery flows, mobile bottom sheet, and current-output reuse path.
- Adds v1.6.13 regression coverage for compact visibility, menu anchoring, quality ranges, keyboard behavior, and versioned assets.

# v1.6.12 - Mastering Tone and Loudness Fast Path

- Specializes the finalizer tone-dynamics loops for mono and stereo buffers, removing repeated channel-loop and scratch-object overhead.
- Replaces temporary per-channel K-weighted audio buffers with one Float64 per-sample power array while preserving Float32 filter rounding and exact LUFS results.
- Shares the same power fast path across integrated and short-term loudness in the Worker and the main-thread fallback.
- Fuses input validation with sanitization and final DC removal with the final safety sanitize pass.
- Preserves output samples and reported loudness/peak/limiter values in same-input v1.6.11 comparisons.
- Adds v1.6.12 regression coverage for metric equivalence, malformed-input behavior, specialized tone loops, fallback reuse, and output ceiling safety.

# v1.6.11 - Mastering Speed Measurement Reuse

- Reuses exact-length transferred finalizer channel buffers instead of allocating and copying each channel again.
- Derives pre-limiter peak from the existing peak and constant gain, removing a redundant 4x FIR True Peak scan.
- Shares one K-weighted filtered signal between final integrated LUFS and short-term LUFS calculations.
- Reuses the post-safety `peakAfter` value as the final peak, removing another redundant True Peak scan.
- Preserves output samples, final LUFS, final True Peak, limiter behavior, and short-term loudness on same-input comparison.
- Fixes two historical regression tests that incorrectly pinned the previous release build ID.
- Adds a dedicated regression for zero-copy ownership, shared measurement equivalence, peak reuse, and ceiling safety.

# v1.6.10 - Incident Readiness Contract, CSP, and Cache Hardening

- Fails closed when a deployment-readiness payload claims success but omits required checks or core metadata.
- Validates cached readiness on both the Firebase client bridge and Callable server before reuse.
- Converts malformed success responses into an actionable Functions contract error.
- Verifies the exact normalized Callable origin inside the CSP `connect-src` directive instead of using substring matching.
- Marks local cooldown reuse as cached while deduplicating the same check timestamp.
- Filters corrupt local readiness-history entries without breaking the settings UI.
- Persists the required final report format as `작업한 내역 / 다운로드 파일 2종 / 다음 예정 내역`.
- Adds regression coverage for malformed contracts, CSP lookalikes, cache accuracy, and storage corruption.

# v1.6.9 - Incident Readiness History and Recovery Copy

- Keeps the latest three deployment readiness outcomes locally with normal/failure transitions.
- Deduplicates repeated cached readiness results by their check timestamp.
- Adds per-card recovery copy actions for CSP, Functions, Firestore, Gmail Secret, and SMTP failures.
- Copies only the deploy command or privacy-safe setup guidance and never exposes Firebase Secret identifiers or values.
- Emits a shared incident status event and refreshes the Settings summary immediately when readiness or reporting enablement changes.
- Adds mobile-friendly recovery buttons and compact readiness history cards.
- Adds regression coverage for bounded history, copy privacy, deduplication, and status events.

# v1.6.8 - Cached Incident Readiness and Recovery Guidance

- Rate-limits deployment readiness checks for 60 seconds on both the client and Callable server to avoid repeated Gmail SMTP verification.
- Persists the latest readiness result, last successful check time, and next eligible check time locally and server-side.
- Adds concise recovery directions to each failed CSP, Functions, Firestore, Gmail Secret, and SMTP card.
- Summarizes incident mail health directly in Settings as normal, needs attention, connected, unchecked, or disabled.
- Improves narrow-screen readiness cards, action sizing, and modal overscroll containment.
- Adds regression coverage for server cache reuse, local cache reuse, health summary state, and recovery guidance.

# v1.6.7 - Incident Deployment Readiness and Recovery Progress HUD

- Adds an authenticated deployment self-check for Callable Functions, Firestore Admin access, Gmail Secret format, and SMTP authentication/connectivity.
- Verifies the currently served HTML CSP contains the canonical regional Callable origin.
- Synchronizes the latest five manual mail-test records with server delivery state so scheduled automatic retry results appear without rerunning the test.
- Shows direct-retry cooldown in seconds and disables retry until the server-provided availability time.
- Exposes performance danger reason and stable-recovery sample progress in the multi-track mastering HUD.
- Adds regression coverage for readiness checks, history synchronization, cooldown enforcement, and staged performance recovery.

# v1.6.6 - Mail Retry Countdown and Performance-Safe Batch Pause

- Shows SMTP attempt count, direct retry usage, and a live human-readable countdown to the next automatic retry in local mail-test history.
- Adds an authenticated `retryOwnIncidentReport` callable limited to the signed-in user's manual mail tests, two direct retries, and a 60-second cooldown.
- Refuses direct retry for already-delivered, non-failed, foreign, automatic, or terminal/dead-letter reports.
- Pauses active multi-track mastering before the next track after a confirmed performance danger state.
- Prevents manual resume while the confirmed danger condition remains and resumes automatically only after the performance monitor returns to stable normal.
- Adds regression coverage for retry privacy/rate limits, countdown formatting, and automatic batch pause/resume behavior.

# v1.6.5 - Incident Mail Recovery Controls and SMTP Diagnostics

- Adds one-click server connection recheck and a copyable `npm run deploy:incident` recovery command to the incident settings dialog.
- Keeps the latest five manual mail-test outcomes locally with bounded, privacy-safe report and Message-ID summaries.
- Separates invalid Secret, Gmail authentication rejection, recipient rejection, rate limiting, and SMTP network failures.
- Stores normalized SMTP failure reason and raw provider code independently and exposes the next retry timestamp.
- Extends incident service metadata with the Gmail provider and required Firebase Secret name.
- Adds regression coverage for bounded history, clipboard recovery, server metadata, and SMTP classification.

# v1.6.4 - Incident Callable CSP Recovery

- Adds the exact regional Firebase Callable origin to the HTML and Hosting `connect-src` policies.
- Makes `deploy:incident` publish Hosting CSP, Firestore rules/indexes, and incident Functions together.
- Adds callable endpoint metadata and transport error normalization for CSP/network failures.
- Separates missing deployment, network/CSP blocking, unavailable SDK, internal Functions errors, authentication failures, and permission denials.
- Shows actionable recovery guidance, raw failure codes, and the affected endpoint in the incident-reporting dialog.
- Bumps incident service metadata to schema v2 and adds behavioral regression coverage.

# v1.6.3 - Health Acknowledgement and Settings Summary

- Removes duplicate decode-activity accounting from performance diagnostics.
- Requires two consecutive watch or danger samples before changing the visible settings state.
- Adds a concise normal/watch/danger reason inside the Settings panel.
- Persists acknowledgement of the same danger condition for 30 minutes while retaining the settings badge.
- Keeps different danger conditions visible immediately and clears the full notice after healthy recovery.
- Coordinates the bottom health notice with the live toast stack to prevent mobile overlap.
- Adds behavioral regression coverage for reload acknowledgement, state hysteresis, settings summaries, and overlay spacing.

# v1.6.2 - Non-Blocking Health Status and Design Polish

- Separates routine import, decode, mastering, wake-lock, and render activity from actionable performance warnings.
- Expires long-task, decode-failure, and wake-lock warnings after bounded recent windows.
- Adds a compact settings health badge that stays hidden during normal operation.
- Adds a non-blocking danger notice only after consecutive danger samples and removes it after stable recovery.
- Hides empty recommendations, empty Worker detail sections, and unavailable recovery controls in the normal diagnostic view.
- Adds behavioral regression coverage for transient warnings, badge state, notice confirmation, and recovery dismissal.

# v1.6.1 - Transient Performance Diagnostics

- Stops a legacy `foxbear-perf-diagnostics=on` preference from reopening memory diagnostics on every app launch.
- Makes Settings and keyboard diagnostic openings session-only instead of persisting future startup behavior.
- Keeps normal startup hidden by default and reserves automatic opening for explicit `?perf=1` or `?foxbearPerf=1` requests.
- Automatically dismisses an explicitly auto-opened panel after two healthy runtime samples once boot stabilization is complete.
- Cancels auto-dismiss when the user interacts with the panel and adds lifecycle diagnostics plus regression coverage.

# v1.6.0 - Incident Mail Pipeline Health

- Adds four-stage mail-test progress for authentication, callable API, queue persistence, and SMTP acceptance.
- Adds an authenticated incident service-status callable with deployed version, region, schema, and App Check monitor metadata.
- Warns when the deployed Functions version is older than the current web release.
- Shows App Check readiness while preserving anonymous reporting in optional monitor mode.
- Adds regression coverage for service metadata, version comparison, stage rendering, and authenticated status access.

# v1.5.99 - Lightweight Import Guidance and Callable Mail Recovery

- Replaces the codec-heavy upload status banner with a short instruction to load one or more mastering files.
- Adds authenticated callable Functions for incident creation and delivery-status lookup.
- Uses Admin SDK writes on the server so stale or restrictive client Firestore rules do not block the real mail test.
- Retains the create-first Firestore path as a compatibility fallback for staggered deployments.
- Adds clear UI guidance when the new callable endpoints have not been deployed.
- Extends the incident deployment command and adds regression coverage for import copy, callable transport, authenticated ownership, and fallback behavior.

# v1.5.98 - Safe Worker Retry, Health Levels, and 30-Track Resource Stress

- Adds a high-level recovery coordinator that rebuilds analysis, mastering, and 15-second preview work from retained track sources after a stalled Worker is cancelled.
- Prevents unsafe low-level retry of detached transfer buffers and excludes ZIP/general export jobs from automatic retry.
- Adds per-Worker detail cards for stage, progress, no-progress age, transfer memory, and targeted stalled-only cancellation.
- Classifies runtime health as normal, watch, or danger using Worker stalls, transfer memory, runtime health, heap pressure, and long-task duration.
- Adds retry controls for cancelled recoverable work and deduplicates repeated jobs by track and operation type.
- Expands stress coverage to 30 track resource releases, 90 Blob URL revocations, 60 abort-owner releases, and 30 AudioContext closures.

# v1.5.97 - Stalled Worker Recovery and Actionable Performance Guidance

- Adds targeted and stalled-only cancellation to the shared Worker job service without cancelling healthy active jobs.
- Exposes the common 15-second stall threshold and per-job cancellation capability in diagnostics.
- Adds a guarded `정체 Worker 취소` action to memory/performance diagnostics with confirmation and live recovery status.
- Replaces internal warning codes in the primary diagnostic view with plain-language Korean recovery guidance.
- Adds a 30-job sequential resource-release regression and verifies active Worker and transfer-byte accounting return to zero after completion and manual recovery.
- Keeps recent Worker diagnostics bounded to 24 entries while preserving peak transfer memory telemetry.

# v1.5.96 - Modal Focus Lifecycle and Readable Memory Diagnostics

- Centralizes modal opener memory, focus return, Tab cycling, Escape/backdrop close, and page scroll locking.
- Moves program information and incident settings onto the shared modal controller.
- Adds readable memory, audio, Worker, long-task, and retained-PCM cards with expandable technical logs.
- Reduces diagnostic polling overhead and restores focus to the settings button after close.
- Adds behavioral regression coverage for layered scroll locks and focus lifecycle contracts.

# v1.5.95 - Compact Support Settings, Popup Consistency, and Mail-Test Permission Recovery

- Rewrites the version/about popup as a concise explanation of smart analysis, quality protection, A/B preview, batch workflow, export support, and local audio privacy; also shortens the initial supported-format notice.
- Moves incident reporting and memory/performance diagnostics into dedicated settings entries and dialogs.
- Refines the shared circular close button to a compact 32px geometry, reserves a consistent header lane, and adds a generic role-dialog backdrop dismissal fallback across popup types.
- Adds outside-click dismissal to the settings panel, performance diagnostics, and download assist while preserving in-flight action safety.
- Fixes the first real incident mail test by removing the owner-only Firestore pre-read of a document that does not yet exist.
- Adds single-flight mail testing, busy ARIA state, and actionable Firebase permission diagnostics.
- Adds regression coverage for popup dismissal, close-control geometry, support settings discoverability, and incident create-first behavior.

# v1.5.94 - AIFF Fallback Safety, Worker Failure Diagnostics, and Reporting Contract

- Prevents cancellation and decode-timeout errors from entering the synchronous AIFF PCM fallback.
- Rejects oversized AIFF fallback workloads with `FOXBEAR_AIFF_FALLBACK_TOO_LARGE` before large main-thread allocation and parsing.
- Records timeout, cancellation, and failure error code/name/reason plus last-progress age in Worker recent diagnostics.
- Promotes the user-required three-section release report format to a persistent HANDOFF, STATUS, README, and regression contract.
- Adds behavior coverage for AIFF timeout/cancel/size guards, Worker failure diagnostics, and report headings.

# v1.5.93 - External Engine Cancellation, Worker Transfer Diagnostics, and Admin Export Recovery

- Forwards `AbortSignal` into optional external WASM pitch engines and rejects stale output after processing.
- Adds deduplicated Worker transfer lists plus active/recent transfer-byte, peak concurrency, and stalled-job diagnostics.
- Routes administrator mail-test and audit CSV files through the shared download lifecycle instead of revoking Blob URLs after one second.
- Prevents repeated CSV clicks, exposes `aria-busy`, and restores disabled state from the current filtered result count.
- Adds a server-side-first OpenAI API opportunity guide covering structured mastering advice, File Search, Batch evaluation, transcription, and Realtime voice.
- Adds behavioral regression coverage for cancellation, transfer telemetry, stalled jobs, and CSV download ownership.

# v1.5.92 - Python Bytecode CI Hygiene and Node 24 Cache Actions

- Removes stale repository Python bytecode before static QA begins and after every configured check.
- Forces `PYTHONDONTWRITEBYTECODE=1` for every QA child process instead of relying only on individual `python3 -B` commands.
- Adds a reusable bytecode cleanup utility and a behavioral regression covering pre-existing caches and indirect Python imports.
- Runs the isolated SRI repair subprocess with `-B`.
- Upgrades GitHub Actions cache restore/save usage from v4 to Node 24-based v5.

# v1.5.91 - Cancellable Audio Pipeline and Large-Track Performance Guards

- Propagates mastering cancellation into file decoding, emergency analysis, pitch/BPM transformation, and 15-second master-preview transformation.
- Routes analysis and pitch/BPM workers through the shared Worker job service for timeout, cancellation, stale-result isolation, progress telemetry, and guaranteed termination.
- Adds Worker job identity and staged progress messages to analysis and WSOLA workers.
- Prevents failed or unavailable workers from falling back to blocking main-thread FFT/WSOLA work for large tracks.
- Preserves lightweight synchronous fallback for small tracks and keeps cancellation from showing false worker-failure warnings.
- Removes an avoidable per-channel allocation when slicing master-preview PCM by copying from `subarray()` directly into the destination buffer.
- Treats explicit Worker `{ok:false}` responses as failed jobs instead of completed diagnostics, preserving error code/name and terminating the Worker immediately.
- Prevents stale pitch progress from updating a track after its mastering job has been replaced or cancelled.
- Adds behavioral regression coverage for worker ownership, cancellation propagation, large-track fallback guards, failure diagnostics, progress identity, and the existing app line budget.

# v1.5.90 - Browser Retry Integrity, Metadata-Aware Scope, and Full Audit Hardening

- Distinguishes a real retry pass from skipped, repeated, and missing Playwright results.
- Adds a fail-closed retry integrity verifier so a skipped failed case cannot silently unblock deployment.
- Adds the integrity verification step to both GitHub Pages deployment workflows after retry reporting.
- Treats generated version, build, cache, revision, SRI, and lockfile-only changes as release metadata rather than browser-runtime changes.
- Keeps real package, runtime, service-worker, and UI modifications on the conservative selected/full Browser QA path.
- Expires flaky-history entries after 45 days so resolved historical noise does not remain a permanent warning.
- Creates every custom JSON, Markdown, and issue-output parent directory and prevents custom report tests from leaking artifacts into the project tree.
- Adds regression coverage for skipped retry rejection, CLI verification, metadata-only Git diff detection, stale-history expiry, nested output paths, and workflow ordering.

# v1.5.89 - Browser Health-First Gate, Selector Impact, and Flaky Issue Report

- Runs the Runtime Health browser specification as a sentinel before heavier visual, bulk, playback, and PWA scenarios.
- Stops the remaining Browser gate immediately when the Runtime Health sentinel fails.
- Keeps failed-only retry behavior bound to Playwright's stored last-failed state.
- Expands impact mapping for Runtime Health detail panels, PWA update/recovery, admin operations, quality reports, and comparison waveform changes.
- Adds conservative selector-level impact mapping for shared CSS files; unavailable or unmapped selector diffs safely promote to the full suite.
- Produces an issue-ready flaky report sorted with unresolved cases ahead of recurring retry recoveries.
- Expands dependency-light production contracts for admin operations and quality-recovery diagnostics.
- Adds regression coverage for health-first phase control, selector impact mapping, issue report generation, and fixture contracts.

# v1.5.88 - Browser Impact Selection and Flaky History

- Adds a dependency-light changed-file selector before dependency and Chromium installation.
- Skips Browser QA for documentation, backend-only, packaging-only, and dependency-light static-test changes.
- Runs mapped browser specs for known download, bulk-mastering, playback, quality, import, and mobile-header changes.
- Defaults core, unknown, truncated, or unavailable change sets to the complete browser suite.
- Passes selected specs safely through `FOXBEAR_BROWSER_SPECS` while preserving explicit targets and `--last-failed` retry behavior.
- Restores and saves a branch-scoped flaky-history cache across GitHub Actions runs.
- Reports recurring retry recoveries and unresolved repeated/missing outcomes in JSON, Markdown, annotations, and the Job Summary.
- Excludes cached flaky history from Git and every release package.
- Adds dependency-light regression coverage for scope classification, Playwright argument construction, workflow ordering, history accumulation, and archive hygiene.

# v1.5.87 - Browser Retry Recovery Reporting

- Compares primary and failed-only Playwright reports to identify recovered flaky cases, repeated failures, and missing retry results.
- Writes durable JSON and Markdown retry summaries and publishes the same evidence to the GitHub Actions Job Summary.
- Emits GitHub warning/error annotations without masking the real Playwright step outcome.
- Expands dependency-light fixture contracts to cover the Runtime Health release header and PWA wake-lock/service-worker recovery paths.
- Adds regression coverage for report classification, artifact creation, workflow integration, and expanded production contracts.

# v1.5.86 - Browser Failed-Only Retry & Fixture Contracts

- Runs browser fixture preflight in GitHub Actions before Chromium and system dependency installation.
- Adds production fixture contracts that validate shared visual builders against current markup, UI source tokens, and CSS selectors.
- Adds `npm run qa:browser:retry` using Playwright `--last-failed` state instead of rerunning every browser specification.
- Preserves the primary JSON report, static-server log, and last-run state before a failed-only retry.
- Separates transient Playwright artifacts from durable browser diagnostics so retry cleanup cannot erase the first failure evidence.
- Adds default and fallback workflow recovery plus dependency-light regression coverage for target selection and report preservation.

# v1.5.85 - Browser Fixture Preflight & Root-Cause Diagnostics

- Centralizes bulk-mastering and download-sheet visual fixtures in reusable, Trusted Types-safe Playwright builders.
- Adds a dependency-light browser-spec preflight that rejects HTML-string sinks and string-based evaluate calls before Chromium startup.
- Runs the browser preflight before Playwright dependency resolution, avoiding multi-minute CI runs for source-level fixture violations.
- Groups duplicate Playwright failures by likely root cause and prints one actionable remediation with affected test examples.
- Adds regression coverage that collapses ten duplicate Trusted Types failures into one diagnostic group and verifies unsafe fixture code is rejected.

# v1.5.84 - Trusted Types Browser Gate Recovery

- Rebuilds the bulk-mastering visual fixture with `createElement`, `textContent`, and `replaceChildren` instead of assigning HTML strings.
- Rebuilds the mobile download-sheet fixture with structured DOM APIs so strict `require-trusted-types-for 'script'` enforcement cannot reject the test setup.
- Expands the unsafe HTML sink audit to include Playwright browser specifications, preventing future visual tests from reintroducing `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write`.
- Adds a dedicated dependency-light regression guard for the two CI failures and their Trusted Types-safe fixture contracts.

# v1.5.83 - Worker Lifecycle and Dock Ownership Diagnostics

- Rejects Dock transport snapshots when the mounted audio belongs to a different track, preventing cross-track seek leakage during rapid selection changes.
- Ignores inactive crossfade audio when synchronizing MediaSession metadata, playback state, and position.
- Adds active/recent Worker job diagnostics with progress-derived remaining-time estimates and guaranteed cleanup on completion, timeout, error, and cancellation.
- Aborts both mastering and master-preview jobs from the generic track resource lifecycle cleanup path.
- Clears track ownership datasets when playback-linked audio is unregistered.
- Adds VM regression coverage for Worker cleanup, cross-track transport fencing, stale MediaSession events, and lifecycle cancellation.

# v1.5.82 - Mastering Cancellation and Foreground Playback Recovery

- Propagates cancellation out of quality-gate automatic re-rendering instead of treating a user or batch abort as a recoverable render failure.
- Restores the first-render settings and report state before cancelled quality recovery exits.
- Prevents cancelled recovery from committing the preserved first render as a successful completed master.
- Retries a still-owned media `play()` once after a transient foreground-return `AbortError` and audio-graph resume.
- Prevents superseded, detached, or explicitly cancelled playback requests from using the retry path.
- Routes local waveform and A/B fallback playback through the same owned transition service.
- Adds VM regression coverage for cancellation propagation, state restoration, single retry, and stale-request suppression.

# v1.5.81 - Master Preview Cancellation and Native Result Isolation

- Adds cancellable ownership for the complete 15-second master-preview decode, DSP, finalizer, WAV encoding, and Blob URL commit pipeline.
- Aborts preview jobs when settings change, tracks are removed, the queue is cleared, or track resources are released.
- Prevents stale preview jobs from changing busy state, reports, Dock autoplay state, or newer preview output.
- Revokes locally created preview URLs when ownership is lost before commit.
- Suppresses native share/file-picker errors that arrive after the download-assist panel has closed or been replaced.
- Adds service-level and DOM-harness regression coverage for job supersession, detached tracks, cleanup, and late native results.

# v1.5.80 - Mobile Return, MediaSession, and Focus Recovery

- Recovers managed Web Audio contexts from WebKit `interrupted` state and deduplicates concurrent resume requests.
- Preserves Dock position and play intent for long screen-lock and app-switch intervals while keeping ordinary snapshots short-lived.
- Coalesces duplicate foreground restore events and clears stale MediaSession metadata, position, and action handlers.
- Resolves MediaSession pause/seek actions against the current Dock audio instead of a removed element.
- Restores focus after native share/direct-save completion and locks every save-assist control during the operation.
- Adds VM regression coverage for interrupted context recovery, long-lock transport leases, stale media handlers, and focus contracts.

# v1.5.79 - Preview and Download Ownership Recovery

- Adds per-audio playback request generations so late `play()` and readiness completions cannot mutate a newer preview state.
- Invalidates and pauses pending preview playback before disposed audio is unregistered from spectrum and playback-link services.
- Prevents detached audio from resuming after its UI has been removed.
- Adds single-flight guards and accessible busy states to native share, direct-save, and download option actions.
- Tracks download Blob URL ownership centrally and revokes all pending URLs on normal page exit while preserving BFCache navigation.
- Adds VM regression coverage for playback ownership, duplicate native-action prevention, and URL lifecycle cleanup.

# v1.5.78 - Playback Transition Race Recovery

- Settles cancelled fade promises immediately instead of leaving callers and audio references pending indefinitely.
- Prevents a superseded fade-out from pausing audio after a newer play request has already started.
- Prevents stale crossfade completion handlers from pausing or resetting sources after a newer transition takes ownership.
- Clears per-audio animation-frame and fade-controller references on completion and cancellation.
- Adds VM-based regression coverage for fade replacement, rapid pause/play, and cancelled crossfade behavior.

# v1.5.77 - Runtime Resource Lifecycle Recovery

- Explicitly unregisters detached spectrum audio, event listeners, capture streams, analyser nodes, and owned AudioContext resources.
- Disposes waveform comparison timers and preview/Dock audio registrations when their UI is removed.
- Separates normal page exit cleanup from BFCache suspension and restores only mounted active audio.
- Repositions mobile settings panels on visual viewport changes and supports older WebView scheduling fallbacks.

# v1.5.76 - Atomic Release Sync and Dependency Health Diagnostics

- Runs release metadata synchronization inside an isolated staging copy before touching the working tree.
- Commits only validated changed files and restores already-written files when a commit error occurs.
- Adds `npm run version:dry-run` to preview every metadata change without modifying the project.
- Synchronizes the root and Functions lockfile versions from the release version source of truth.
- Adds dependency and browser-runtime health diagnostics that remain useful before dependencies are installed.
- Adds regression coverage proving a forced SRI bootstrap failure leaves release files unchanged.
- Removes tracked Python bytecode caches and adds overwrite-handoff deletion instructions so generated files cannot linger between releases.

# v1.5.75 - Dependency-Light Static QA and Playwright Bootstrap Hardening

- Made Playwright browser helper modules import-safe before development dependencies are installed.
- Moved Playwright CLI resolution from module load time to the actual browser QA entrypoint.
- Added actionable recovery guidance for missing `@playwright/test` and Chromium installations.
- Added a dependency-free fallback for Playwright configuration metadata probes while preserving real device descriptors when Playwright is installed.
- Added regression coverage that reproduces the missing-dependency environment and verifies static QA remains usable.

# v1.5.74 - Batch Pause, Skip, Queue Reorder, and Mobile Download Sheet

- Added between-track pause/resume without interrupting the active track.
- Added safe current-track skip and reorder controls for tracks that have not started.
- Added completion summaries with completed, failed, skipped, cancelled, elapsed, and average duration metrics.
- Rebuilt the mobile download dialog as a near-full-height bottom sheet with MP3/WAV family selection and quality-specific choices.
- Added a sticky mobile save/share action area so the final action remains visible on short screens.

# v1.5.73 - Cancellable Multi-Mastering, Failed Retry, ETA, and Result Filters

- Added safe cancellation for the active multi-track mastering job and preserves remaining tracks as cancelled results.
- Added failed-track-only retry without reprocessing successful tracks.
- Added current-track remaining time, per-track completion estimates, and overall batch ETA based on observed durations.
- Added live result filters for current, completed, failed, cancelled, and pending tracks.
- Added desktop/mobile browser layout screenshot and bounding-box regression contracts for the batch HUD.

# v1.5.72 - Bulk Workflow, Admin Audit, and Mobile Detail UI

- Auto-hides the multi-file analysis popup and navigates to the full-mastering action after all analyses settle.
- Replaces the single-track processing HUD with a current-track batch list during multi-track mastering.
- Highlights and auto-follows the active mastering row while preserving completed and failed results.
- Adds a persistent compact administrator view, preserved cleanup of old unconfirmed mail tests, and searchable/exportable paginated audit logs.
- Adds labeled mobile card views for mail-test and administrator-audit details.

# v1.5.70 - Mail Test Verification Alerts, Troubleshooter, Statistics, and Export

- Added automatic operations warnings for never-run, stale, failed, and receipt-overdue real mail tests.
- Added 30-minute SMTP-to-Gmail receipt confirmation tracking without carrying forward pre-confirmation historical misses.
- Added administrator mail-test statistics, cause-specific troubleshooting guidance, local search/status filters, and UTF-8 CSV export.
- Added deployment capability flags and regression coverage for the new verification workflow.

# v1.5.69 - Mail Receipt Confirmation, Test History, and Branded Templates

- Added administrator inbox/spam receipt confirmation for SMTP-accepted manual tests.
- Added 90-day mail-test history and latest verification state with seven-day freshness warnings.
- Added administrator test-history UI and last successful SMTP/receipt timestamps.
- Unified test, incident, operations, recovery, and daily-summary HTML email design.
- Added Firestore rules, Functions trigger, deployment capability checks, and regression QA.

# v1.5.67 - Incident Admin Audit, Webhook Failover, Index and Health Verification

- Added privacy-minimized administrator action audit logs with 90-day TTL.
- Added bounded transient webhook retries and optional secondary-channel failover.
- Added real Firestore composite-index probes to deployment verification.
- Added operations history status/reason filters and cursor pagination.
- Added a scheduled six-hour post-deployment comprehensive health check.

# v1.5.66 - Incident Operations Action Guard and Deployment Verification

- Added transaction-backed administrator action leases and cooldowns for retry, batch recovery, alert testing, and deployment verification.
- Added an administrator webhook test flow with provider and response status reporting.
- Added detailed operations history with issue codes and recommended remediation actions.
- Added automatic post-deployment verification when Functions state is missing, stale, or version-mismatched.
- Added Firestore rules and release QA for the new request collections and server-owned action state.
- Preserved the existing Wake Lock state synchronization and automatic work-protection contracts during the operations upgrade.

# v1.5.65 - Incident Recovery Control and Alert History

- Added administrator batch recovery for recoverable and dead-letter incident mail.
- Added optional approved-host HTTPS webhook operations alerts independent from Gmail SMTP.
- Added 30-day operations history, alert channel outcomes, and recovery run telemetry.
- Added safe administrator history fallback before new Firestore rules reach production.

# v1.5.64 - Incident Operations Health Self-Diagnostics

- Added a 15-minute incident-mail operations audit with fenced execution leases.
- Added live SMTP/Secret authentication checks with healthy/degraded refresh intervals.
- Added stale queue, dead-letter, summary failure, and quota reservation-leak classification.
- Added transition-aware operations alert and recovery emails with persistent-issue cooldown.
- Added administrator-readable `incidentOperations/mail` telemetry and dashboard cards.
- Corrected administrator “today” incident counts to use an exact KST server-side date range.
- Added Firestore rule/index coverage and release QA for the new operations path.

# v1.5.63 - 2026-07-22

## Incident mail quota and summary recovery

- Changes incident mail quotas from UTC documents to KST date buckets.
- Defers quota-limited reports to the next KST day instead of permanently suppressing them, including recovery of legacy suppressed reports.
- Tracks and releases per-report daily reservations across crashes, retries, duplicate suppression, and date rollover.
- Paginates daily summary aggregation, marks truncated summaries, and retries missing summaries for the previous three days.
- Requires an accepted SMTP recipient and validates the Gmail app password as exactly 16 characters.

# v1.5.62 - 2026-07-22

## Incident delivery watchdog and package gate

- Initializes every new incident with an explicit pending delivery state so scheduled recovery can query it without relying on a creation trigger.
- Adds status-specific queue scans, expiring lease IDs, stale-completion fencing, and deterministic SMTP Message-IDs to reduce lost or duplicate incident mail.
- Moves exhausted deliveries into a visible dead-letter state and lets an authenticated administrator force a new retry cycle.
- Adds Firestore indexes for pending, retry, and expired-lease queues, and exposes failure reasons and lease timing in the operations monitor.
- Blocks both release ZIP entrypoints when release metadata or handoff state is inconsistent.
- Records the required three-section result report format in the handoff documents and protects it with QA.

# v1.5.60 - 2026-07-22

## Kakao in-app entry recovery and adaptive memory governor

- KakaoTalk no longer forces every launch into the external-browser landing page.
- Route recovery now targets `index.html` directly and carries the in-app bypass marker to avoid recovery loops with cached entry guards.
- The external-browser guide remains available only through an explicit recovery action.
- Pre-decode and runtime memory pressure can automatically select Fast processing, lightweight peak analysis, compact waveform work, and earlier PCM release.
- Added deterministic guards for direct Kakao entry, 404 recovery, and adaptive mastering memory decisions.

# v1.5.59 - Kakao Session Handoff & Memory Diagnostics

- 카카오 인앱 브라우저에서 외부 브라우저로 이동할 때 출력·DSP·피치/BPM·악기 레이어 설정을 만료 토큰으로 복원합니다.
- 오디오, 파일명, 로컬 경로는 전달하지 않으며 사용자는 외부 브라우저에서 원곡만 다시 선택합니다.
- 마스터링 단계별 동시 PCM 버퍼, 브라우저 heap, 카카오 예상 피크·예산·압력 비율을 진단 화면에 표시합니다.
- 오류 트랙 카드에 외부 브라우저 복구 버튼을 추가했습니다.

# v1.5.58 - Kakao mastering runtime recovery

- Removed full compressed-file clones from the Web Audio decode compatibility path.
- Added Kakao/in-app PCM peak-memory estimation and automatic Fast/lightweight finalizer protection.
- Preserves the valid first render instead of launching a second full render for non-critical quality failures on memory-risk Kakao sessions.
- Releases source and intermediate PCM references earlier during mastering.
- Separates playable-file Web Audio rejection from source-file corruption and fixes misleading user error copy.
- Clarifies Kakao route recovery after a WebView renderer restart.

# v1.5.57 - Modal Close Consistency

- Unified all modal top-right close controls under one shared geometry, icon, hover, focus, and mobile touch-target system.
- Repositioned feature and preview close controls into the same fixed top-right lane used by program, admin, download, and AI dialogs.
- Added a close control to enhanced select popups.
- Added Escape dismissal and focus restoration to AI recommendation, download options, and download assist dialogs.
- Added regression coverage for shared styling, runtime-generated dialogs, service-worker caching, and dismissal behavior.

# v1.5.52 - CI Parallel Release Gate

- Split static QA and Playwright browser QA into parallel GitHub Actions jobs.
- Cancel superseded Pages workflows on newer pushes to the same ref.
- Added Playwright browser download caching and npm offline-preferred installs.
- Preserved the single local `npm run check:release` command through a phase-aware release-gate runner.
- Added CI topology regression checks for job dependencies, cache use, and deployment gating.

# v1.5.51 - CI Runtime Contract Hardening

- Restored the runtime-health and service-worker recovery modules in the real boot graph with the current asset generation.
- Added release validation for missing or duplicate critical boot modules, stale local asset generations, and service-worker precache mismatches.
- Added a dedicated regression test that locks the HTML, runtime config, service worker, and release metadata to one generation.
- Corrected the three CI failures caused by stale v1.5.49 HTML references in the v1.5.50 package.
- Preserved the existing Wake Lock runtime and diagnostics contract while hardening the boot graph.

# v1.5.49 - Stale Shell Generation Recovery

- Prevented service workers from serving legacy HTML and current JavaScript in the same page generation.
- Purged all older FoxBear shell caches during activation instead of retaining partial recovery generations.
- Validated navigation HTML against the current asset generation before serving or caching it.
- Canonicalized runtime and Kakao recovery URLs from the boot script location to prevent repository-path 404 pages.
- Added a deployment-path regression test for stale v1.5.30 shells, SRI blocks, and nested-route recovery.

# v1.5.49 - Stale Shell Generation Recovery

- Prevented old cached HTML from loading current assets with obsolete SRI hashes.
- Redirected invalid nested navigation routes to the canonical app root instead of serving index.html at the wrong URL.
- Added a 404 recovery flow that discovers the app root, purges FoxBear caches, unregisters stale service workers, and reloads once without service-worker interception.
- Removed the Firebase catch-all rewrite that preserved invalid nested URLs.
- Added atomic boot-asset generation checks and stale-generation isolation tests.

# v1.5.48 - Engine Performance Quality Regression

- Added a bounded before/after audio audit for dynamic collapse, high-frequency loss, low-end pumping, stereo phase risk, and invalid output samples.
- Limited each audit pass to at most 65,536 sampled frames so quality checks have predictable runtime cost.
- Integrated audit flags into the mastering quality gate and release QA.

# v1.5.47 - Engine Edge-Case Quality Gate

- Rejected silent, corrupt, and sub-0.10-second decoded inputs before mastering can report a false success.
- Added matching finalizer-side input signal checks as defense in depth.
- Normalized nested mobile-speaker and frequency analysis fields against NaN and Infinity.
- Hardened recommendation features when cached analysis values are missing or non-finite.
- Added cancellation checkpoints after decode, emergency analysis, pitch/speed preparation, and master rendering.
- Added deterministic mono, 96/192kHz, clipped-transient, malformed-analysis, silence, and short-input engine QA.

# v1.5.46 - Engine, Recommendation, and API Audit

- Hardened recommendation mapping against incomplete or non-finite analysis values.
- Removed a duplicate recommendation assignment in the genre-lock path.
- Changed quality-gate peak auditing to prefer finalizer True Peak telemetry over sample peak fallback.
- Recorded recommended, requested, and effective DSP settings in each master report.
- Bound mastered filenames and export reports to the target actually used by the render.
- Updated Firebase CDN modules from 12.14.0 to 12.16.0 and added v1.5.46 regression coverage.

# v1.5.45 - Export Queue Recovery and Diagnostics

- Added pause/resume controls for the gesture-safe individual export queue.
- Restores the current file after background/BFCache return without auto-triggering a save action.
- Classifies storage, permission, unsupported-browser, filesystem, and network delivery failures with targeted retry guidance.
- Added advisory per-file and remaining direct-save time estimates for picker-based saves.
- Fixed export activity publication so service-worker activation is released after queue completion or cancellation.
- Added v1.5.45 regression coverage for pause, recovery, error diagnosis, ETA, and activity teardown.

# v1.5.44 - Gesture-Safe Individual Export Queue

- Added a one-file-at-a-time export queue so browsers receive a fresh user gesture for every download, file picker, or Web Share request.
- Pre-validates completed output Blobs before the queue becomes actionable, preserving transient activation on each `Next file` click.
- Added retry, skip, cancel, duplicate-start protection, queue-state restoration after BFCache, and late-result isolation.
- Freezes mastering controls and blocks mastering, automatic remastering, queue clearing, ZIP creation, and service-worker activation while an individual export queue owns the output snapshot.
- Added a cautious `navigator.storage.estimate()` advisory for origin cache pressure while explicitly distinguishing it from unavailable Downloads-folder free-space information.
- Added runtime-entry, archive, service-worker cache, and v1.5.44 queue regression coverage.

# v1.5.43 - Export Pipeline Integrity and Low-Copy ZIP Input

- Restored `zip-export-service.js` as an actual `index.html` runtime entry after discovering it was cached and tested but absent from the source boot graph.
- Added visible ZIP-module recovery and Runtime Health requirements so a missing export module cannot fail silently.
- Canonicalized local asset tags to exactly one SHA-384 `integrity` attribute, repairing empty, stale, and duplicated attributes.
- Added archive/runtime parity checks for required entry assets and exact single loading from `index.html`.
- Changed capable browser ZIP workers to pass Blob inputs directly to JSZip instead of eagerly copying every completed file into an ArrayBuffer.
- Preserved a bounded compatibility conversion path for environments without worker Blob support.
- Added v1.5.43 runtime regression coverage for SRI repair, boot-graph parity, module recovery, and low-copy ZIP input.

# v1.5.42 - ZIP Worker Cancellation and Archive Safety

- Moved STORE-only ZIP creation off the main thread into a dedicated cancellable Worker.
- Added one-job locking, explicit ZIP cancellation, bounded timeouts, stale-result rejection, and page-exit cleanup.
- Prevented mastering, automatic remastering, and queue clearing while ZIP owns its output snapshot.
- Added ZIP activity to cross-tab service-worker update protection.
- Hardened archive filenames for case-insensitive collisions, path characters, trailing dots/spaces, Windows device names, Unicode, and length.
- Cached exact versioned Worker URLs for reliable offline execution.
- Added v1.5.42 runtime regression coverage for PK output, progress, safe names, UI cancellation, and update coordination.

# v1.5.41 - Export ETA and Download Recovery

- Kept the download dialog mounted until the browser download path succeeds so failures remain visible and retryable.
- Added elapsed time and advisory remaining-time estimates to MP3/WAV conversion progress.
- Added stalled-worker and background-throttling guidance after a bounded progress silence window.
- Locked every dialog action except explicit cancellation while one export operation is active.
- Added timer/listener cleanup for dialog replacement, normal close, and application-driven close paths.
- Added v1.5.41 regression coverage for ETA, stalled-state recovery, lifecycle cleanup, button locking, and download-close ordering.

# v1.5.40 - Export Worker Progress and Cancellation

- Added job-ID-scoped progress messages for MP3, WAV, and master-finalizer workers without allowing progress events to settle worker promises.
- Added a compact download-dialog progress panel with stage, percent, detail, and an explicit conversion cancel button.
- Propagated AbortSignal and progress callbacks through alternate-format re-encoding, terminating workers and ignoring late responses after cancellation.
- Surfaced worker timeout errors instead of silently masking them with fallback encoding, with distinct timeout and user-cancel recovery guidance.
- Connected finalizer and encoder phase telemetry to the active track mastering UI during the final processing stages.
- Added v1.5.40 runtime regression coverage for progress delivery, cancellation, timeout contracts, stale-result isolation, and UI wiring.
- Retained Wake Lock state synchronization and the compact `getDownloadDialogCompactHint` recovery contract while adding the new progress panel.

# v1.5.39 - CI Hook Lifecycle Hardening

- Removed Git hook installation from the npm `prepare` lifecycle so `npm ci` cannot fail when `.githooks/pre-commit` is absent from a checkout or overwrite patch.
- Made `tools/install-git-hooks.sh` an explicit, optional, fail-soft local developer command with CI, Git worktree, file existence, permission, and config guards.
- Changed both GitHub Pages workflows to `npm ci --ignore-scripts` as defense in depth against future install-lifecycle side effects.
- Added `.githooks` to cumulative overwrite packages and required the hook plus installer in the handoff archive contract.
- Added archive and handoff verification that rejects npm lifecycle scripts which attempt to install optional Git hooks.
- Added a clean temporary Git-repository regression test covering missing-hook, CI-skip, and successful manual installation paths.

# v1.5.36 - Interaction Lifecycle Hardening

- Preserved transient user activation for direct file saving by invoking `showSaveFilePicker()` before asynchronous Blob inspection.
- Added verified-Blob caching so current mastered files can enter Web Share and anchor download paths without an avoidable async boundary.
- Changed converted-format and restricted-browser sharing to open a second explicit save/share action instead of calling Web Share after the original click permission expired.
- Added download-dialog re-entry protection and stopped download completion from clearing an unrelated global mastering busy state.
- Bounded save-assist Blob URL lifetime, revoked replaced assist URLs immediately, and prevented stale URLs from keeping navigation warnings and memory alive.
- Prevented Kakao iOS external-browser custom schemes from replacing the current page, while Android continues through an explicit intent action.
- Awaited ZIP/report download failures so rejected Blob validation no longer becomes an unhandled promise rejection.
- Rebuilt navigation-exit state after BFCache restoration so `pageHiding` and one-way leave flags cannot remain stuck after browser back/forward recovery.
- Added v1.5.36 regression coverage for download activation order, same-format immediate sharing, URL lifecycle cleanup, action deduplication, and BFCache exit-guard restoration.

# v1.5.35 - Runtime Exception Hardening

- Fixed an undefined `now()` call in the spectrum visualizer timeout/hidden-tab frame path and made closed capture-stream audio graphs disposable and reconnectable.
- Closed decode cancellation races around metadata probing so aborts cannot become codec failures or trigger a temporal-dead-zone exception.
- Initialized previously implicit UI/controller state fields to stable boolean, numeric, and nullable defaults.
- Isolated mastering batch failures per track and guaranteed busy-state/final-render cleanup even when setup, callbacks, or one track throws.
- Made mastered Blob URL replacement atomic so a failed new output cannot revoke the last working master first.
- Finite-normalized import queue concurrency/delay controls and normalized numeric/string track IDs across queue, run, and cancellation paths.
- Added MP3/WAV/finalizer worker payload bounds, finite-number checks, channel validation, and RIFF size protection.
- Added partial File System Access write aborts, IndexedDB blocked/aborted transaction handling, and v1.5.35 runtime exception regression coverage.

# v1.5.34 - Kakao Landing Recovery

- Removed the timer-driven `kakaotalk://` auto-launch that could replace the landing with a blank or blocked page before users saw any controls.
- Kept Kakao entry navigation limited to a normal same-origin HTML page; external schemes and Android intents now run only from an explicit user click.
- Made the landing progressively usable even when JavaScript fails by keeping ordinary direct links for the target page and in-app bypass.
- Added an always-visible Kakao menu fallback telling users to choose `다른 브라우저로 열기` from the top-right menu.
- Avoided optional chaining in the earliest Kakao boot guard for older Android WebView compatibility.
- Added v1.5.34 simulated Kakao Android/iOS regression coverage that verifies the landing remains visible and no automatic scheme timer is scheduled.

# v1.5.33 - Codec Truth and Download Hardening

- Replaced the broad static input claim with runtime codec probing based on the current browser, exposing only formats that are stable or reported as playable.
- Removed CAF, WMA, AMR, and 3GP-family formats from the advertised picker because no bundled decoder exists for them.
- Added an application-level PCM AIFF/AIFC fallback decoder for NONE/twos/sowt and 32-bit float files when native Web Audio decoding fails.
- Removed the unnecessary AudioContext resume wait from offline file decoding and added bounded decode timeouts plus container-signature diagnostics.
- Added WAV/MP3/ZIP/JSON Blob signature validation before download or direct save, restored MP3 256 kbps in the format picker, and prevented normal downloads from opening a blank tab.
- Restricted File System Access saving to secure contexts and made the download dialog await validated download startup.
- Added v1.5.33 codec/download regression coverage and service-worker caching for the capability service.
- Passed 220/220 static checks, including runtime AIFF sample decoding and invalid WAV/MP3 Blob rejection; local Playwright launch remains blocked only by the missing Chromium executable.

# v1.5.32 - Kakao External Browser Local Flow

- Added a synchronous KakaoTalk entry guard before the main application boot so restricted in-app sessions are moved to a lightweight external-browser landing before any audio file is selected or mastered.
- Added a same-origin validated landing page that tries the Kakao external-browser scheme, provides an Android intent fallback, supports address copy, and allows an explicit in-app bypass without redirect loops.
- Preserved the local-only privacy model: after opening Chrome, Samsung Internet, or Safari, import, mastering, MP3/WAV encoding, and download all remain inside that browser on the device.
- Documented the hard boundary that an already-generated Blob in Kakao WebView memory cannot be transferred to a newly opened browser context; users must share/save it first or reopen the source file in the external browser.
- Upgraded the download fallback to prefer the Kakao external-browser scheme and include an Android browser fallback URL.
- Added service-worker/offline packaging coverage and v1.5.32 regression tests for the entry guard, safe target validation, launcher controls, and cumulative overwrite packaging.

# v1.5.31 - Player and Download Stability

- Prevented mastering completion from creating a second Dock player while the original track is playing; the active original player remains in place until the user explicitly selects the mastered tab.
- Limited Dock crossfades to real user-gesture source switches, deduplicated refresh requests, and pruned stale player elements left by interrupted transitions.
- Retained one selected-track master PCM buffer within a bounded memory budget in normal browsers so MP3/WAV formats can be chosen without remastering.
- Kept restricted in-app browsers on release-after-encode memory policy and reduced their format list to the already completed file.
- Replaced the verbose download dialog with a one-screen format picker and essential actions only.
- Simplified Kakao/in-app fallback to native file share/save, file open, and external-browser actions; compacted the secondary save-assist panel.
- Added v1.5.31 regression coverage for single-player completion, refresh deduplication, bounded re-encode retention, simplified download UI, and Kakao fallbacks.
- Kept the legacy `getDownloadDialogCompactHint` helper and Wake Lock state-sync contract covered while removing their verbose first-screen presentation.

# v1.5.30 - In-App Playback Recovery

- Kept default Studio playback on the native HTMLMediaElement route so KakaoTalk and restrictive Android WebViews cannot mute it behind a suspended AudioContext.
- Added inline/mobile media attributes and an in-app compatibility policy that safely falls back from WebAudio translation and realtime processing to native playback.
- Started source switches, A/B crossfades, realtime graph resume, and difference-listen media playback inside the original user gesture instead of after deferred metadata/context waits.
- Stopped mastering completion from attempting policy-blocked autoplay; the mastered source is selected and starts reliably on the next user tap.
- Reworked the detail FFT input to use captureStream/MediaStreamSource when available, avoiding createMediaElementSource ownership of the audible playback route.
- Preserved managed AudioContexts across BFCache pagehide and rebuilt closed translation routes after app/browser restoration.
- Added v1.5.30 regression guards for native Studio routing, BFCache lifecycle, gesture-safe transitions, non-invasive spectrum capture, and the updated lazy translation E2E contract.

# v1.5.29 - Analysis and Update Lifecycle

- Added cancellable import-analysis tasks so queue clear and track removal abort pending file reads, decoding, worker analysis, and stale result application.
- Prevented completed work from mutating tracks that were removed or replaced while analysis was running.
- Added a service-worker update coordinator that defers `SKIP_WAITING` while analysis, mastering, decoding, rendering, or playback is active and activates only after a stable idle window.
- Hardened service-worker network-first recovery so HTTP 404/5xx responses fall back to current or retained legacy caches instead of replacing a working offline shell with an error response.
- Added a real-browser cancellation/replacement scenario that clears active bulk analysis, verifies no stale resurrection, imports a replacement track, and confirms playback.
- Added `qa/v1529_analysis_update_lifecycle_smoke.js`; the release gate passed 213 static checks and actual Chromium desktop 7/7 plus mobile 7/7 browser tests.

# v1.5.28 - Resilience, Lifecycle, and Offline Recovery

- Prevented 320px-class command-header overlap by hiding only the optional studio descriptor while preserving BUILD, version, device glyphs, compatibility text, designer identity, and Settings.
- Added explicit unregister/prune lifecycle support to Playback Link Service so removed audio elements and their event listeners are not retained across repeated Dock/player rebuilds.
- Fixed Preview Translation teardown calling the nonexistent `window.FoxBearAudioContexts` alias; it now closes contexts through `FoxBearAudioContextManager` and prunes disconnected controllers.
- Centralized track resource release for queue clear and single-track removal, including bottom preview teardown, auto-remaster timer cancellation, object URL release, and transport state reset.
- Made service-worker recovery caches functional: activation retains the newest two legacy caches and offline fetch/navigation can fall back to them when the current generation is unavailable.
- Added stale E2E ownership-probe cleanup before server startup and on child exit.
- Excluded and rejected Python `__pycache__`, `*.pyc`, and `*.pyo` artifacts after independent ZIP extraction exposed bytecode contamination.
- Expanded real-browser coverage for 320px header geometry, repeated preview-mode switching plus clear-queue cleanup, and an offline legacy-cache recovery probe.
- Added `qa/v1528_resilience_lifecycle_offline_smoke.js`; the release gate now contains 210 static checks and 12 desktop/mobile browser tests.

# v1.5.27 - Device Glyph and SRI Hardening

- Preserved the cyan desktop and pink phone glyphs through the runtime administrator-state refresh instead of letting `textContent` erase their structured markup after boot.
- Kept the device glyph pair visible on compact mobile widths and removed the command-header bottom divider.
- Hardened the SRI updater so a slash accidentally placed before `integrity` is normalized into a valid self-closing local asset tag.
- Hardened SRI verification to reject malformed tag shape, missing integrity attributes, duplicate integrity attributes, missing local assets, and hash mismatches for every local JavaScript/CSS asset.
- Extended browser geometry coverage to require rendered device glyphs and a zero-width header divider on desktop and mobile.
- Added `qa/v1527_header_device_sri_hardening_smoke.py`; the release gate now contains 209 static checks and 12 desktop/mobile browser tests.

# v1.5.26 - Engraved Command Header

- Rebuilt the top metadata row as a compact command bar: `BUILD`, runtime version, `모바일 · PC 호환`, and `AI MUSIC MASTERING STUDIO` on the left; `DESIGNED BY 곰같은여우` and an icon-only Settings control on the right.
- Removed the legacy card/badge treatment and the `with AI` suffix from the visible designer signature.
- Added a dedicated final CSS layer so historical mobile/studio rules cannot push the designer signature or Settings control onto another line.
- Added responsive spacing, engraved typography, tiny device glyphs, and a subtle divider while preserving the program-info and Settings behaviors.
- Added `qa/v1526_engraved_command_header_smoke.js`; static QA is `208/208 PASS` and actual Chromium browser QA is desktop `6/6` plus mobile `6/6`.

# v1.5.25 - Deterministic Preview E2E Stability

- Fixed rendered-dialog detection to walk the full ancestor chain, so hidden select-popup panels inside an `aria-hidden`/transparent backdrop are not misclassified as blockers.
- Waits for the import queue, render scheduler, active audio metadata, and the viewport-specific play control to remain stable before the real user click.
- Increased the synthetic preview fixture to 12 seconds and replaced flaky media event-count assertions with explicit `audio.play()`/`audio.pause()` call tracking.
- Fixed the browser runner so an explicitly requested spec path runs only that spec instead of silently prepending the entire browser suite.
- Verified the preview scenario three consecutive times on desktop and mobile, then completed the full desktop 6/6 and mobile 6/6 Chromium suites locally.
- Added `qa/v1525_e2e_preview_stability_smoke.js`; current static QA target is `207/207 PASS`.

# v1.5.24 - Responsive Preview Control and Visible Dialog Readiness

- Fixed the preview-routing browser scenario to use the visible desktop external play control or the visible mobile integrated Dock play control instead of requiring a desktop-only button at every viewport.
- Replaced DOM-presence modal counting with rendered-visibility checks that respect `hidden`, `aria-hidden`, computed display/visibility/opacity, and non-zero layout bounds.
- Added viewport-specific assertions so desktop must use `#bottomPreviewPlayBtn` while mobile must use `.dock-integrated-toggle`.
- Added `qa/v1524_e2e_responsive_preview_control_smoke.js` to protect CSS load order, responsive control selection, and visible-dialog classification.
- Kept the v1.5.22 persistent audio element and crossfade engine unchanged; this patch corrects the E2E contract that was producing the two false failures.

# v1.5.23 - Deterministic Preview Playback Readiness

- Fixed the new uninterrupted preview Playwright test racing the single-track AI recommendation modal after analysis.
- Added a targeted `disableAutoDialogs` E2E navigation option; it is enabled only by the preview-routing scenario and does not globally suppress dialogs in browser QA or production.
- Added explicit checks that the Dock play button is visible, enabled, unobstructed at its center point, and free of blocking modal overlays before playback begins.
- Added click-interception diagnostics so future failures report the topmost blocking element instead of consuming the full test timeout.
- Added `qa/v1523_e2e_preview_readiness_smoke.js` to protect the isolation and readiness contract.

# v1.5.22 - Header Signature and Uninterrupted Preview Routing

- Restyled the top version, device compatibility, and designer labels as compact borderless engraved text so the Settings control no longer pushes the designer label or hero copy downward.
- Reduced the header Settings trigger to a compact circular gear while keeping the settings panel in its viewport portal.
- Replaced smartphone, laptop, mono, and studio mode changes that rebuilt the active audio element with one persistent MediaElementSource and lazily created crossfade routes.
- Translation modes now crossfade gain paths in place without pausing, reloading, or restarting the media element.
- Added `src/audio/preview-translation-service.js` and `qa/v1522_header_preview_routing_smoke.js` to verify one MediaElementSource, one steady-state route, temporary crossfade routes, listener/context cleanup, no play/pause calls during mode changes, compact header layout, and release-cache inclusion.
- Re-ran the engine bench, golden audio pack, AudioContext lifecycle checks, Update Safety checks, and release packaging checks.

# v1.5.21 - History and CSP Console Contract Fix

- Removed `frame-ancestors` from HTML meta CSP declarations because Chromium ignores that directive in meta-delivered policies and reports it as a console error; retained the effective directive in Firebase Hosting HTTP headers.
- Updated Playwright back/forward coverage to account for FoxBear's same-URL exit-guard history sentinel while still requiring real forward traversal to the E2E hash entry.
- Added `qa/v1521_history_csp_console_contract_smoke.js` to protect the meta/header CSP split and history-sentinel contract.
- Reconciled release documentation that remained labeled v1.5.19 after the v1.5.20 cache-warm release.

# v1.5.20 - Idempotent PWA Cache Warm

- Changed service-worker cache warming to fetch only assets missing from the current release cache instead of reloading the full warm set on every app visit.
- Added cache-warm result counters for newly cached assets, existing cache hits, failures, totals, and forced refreshes.
- Disabled automatic full cache warming in ordinary Playwright scenarios and retained explicit warm validation in the service-worker browser test.
- Added a repeat-warm regression contract requiring zero additional fetches when all warm assets are already cached.
- Added `qa/v1520_service_worker_cache_warm_smoke.js`.

# v1.5.19 - CI Runtime Isolation and Package Hardening

- Isolated optional Firebase SDK/backend traffic in Playwright with deterministic E2E modules, preventing remote console noise from failing the core runtime-health contract while preserving same-origin request and page-error checks.
- Added actionable assertion labels for console errors, page exceptions, and local request failures.
- Added an ownership probe for the local QA server so a different process on port 4173 cannot be mistaken for the FoxBear app.
- Strengthened history coverage to require a successful back and forward round trip without swallowing navigation errors.
- Synchronized versioned package verification script filenames from `package.json` and added validation so they cannot remain pinned to an older release.
- Hardened Release/Overwrite archives against symbolic links, path traversal, QA scratch reports, temporary files, and trace leakage.
- Added `qa/v1519_ci_runtime_isolation_packaging_smoke.js`.

# v1.5.18 - CI Diagnostics and PWA Readiness

- Split service-worker installation into a small critical shell and a bounded background cache warm, so `navigator.serviceWorker.ready` is not blocked by the full 90+ asset pack.
- Wait for the active service-worker state with one consistent timeout and report a distinct readiness error when registration exists but activation does not complete.
- Added a Playwright JSON reporter and a concise end-of-run failure summary so the real assertion remains visible after GitHub Actions truncates long logs.
- Persist full static-server output to the browser QA artifact while printing only request counts, HTTP failures, warnings, and the final twelve requests in the Actions log.
- Removed transient `*.log`, browser-result, report, coverage, and `.last-run.json` files from release packages and made both ZIP verifiers reject them.
- Added `qa/v1518_ci_diagnostics_packaging_smoke.js`.

# v1.5.17 - Browser Contract Fix

- Fixed manual Wake Lock requests being released immediately by the idle activity synchronizer.
- Fixed service worker registration under the enforced Trusted Types CSP by adding the versioned worker URL to the trusted script allowlist and passing a TrustedScriptURL to `navigator.serviceWorker.register()`.
- Fixed the header settings control rendering to the left of the designer card despite its DOM position by assigning the settings host a flex order after the designer card.
- Added `qa/v1517_browser_contract_fix_smoke.js` to protect all three browser contracts.
- Retained the v1.5.16 asynchronous E2E server runner fix.

# v1.5.16 - E2E Static Server Pipe Deadlock Fix

- Fixed the GitHub Actions browser gate deadlock that appeared after the first successful Playwright page loads.
- Replaced the synchronous Playwright child process with an awaited asynchronous process so Node can continuously drain the local Python static server's access-log pipes.
- Added bounded static-server diagnostics and prints the server log tail automatically when browser QA fails.
- Added a regression stress test that completes 1,800 HTTP requests while the child process runs, exceeding normal pipe-buffer capacity and proving the server remains responsive.
- Kept the cumulative GitHub Desktop overwrite workflow so this patch includes every change from v1.5.7 through v1.5.16.

# v1.5.15 - E2E Runtime Classification & Browser API Stability

- Runtime Health now separates optional Firebase/Firestore network outages into `runtimeWarnings` instead of treating them as fatal app errors.
- Playwright prints the full critical Runtime Health report directly in Actions logs when a browser assertion fails.
- Wake Lock E2E resets any previous sentinel before the manual request/release scenario.
- Service-worker E2E validates an actual active/waiting/installing worker and updates the existing registration without relying only on `navigator.serviceWorker.ready`.
- Recovered runtime HTML metadata that was still pinned to the v1.5.13 asset generation.
- GitHub Desktop remains the default patch handoff workflow.

# v1.5.14 - GitHub Desktop Handoff Preflight

- Recorded GitHub Desktop as the default handoff client and added `GITHUB_DESKTOP_HANDOFF.md` with branch, extract, review, commit, push, and Actions-failure steps.
- Added `HANDOFF_PACKAGE.json` as a versioned package contract for required files, required trees, forbidden archive content, and future deletion instructions.
- Added `npm run handoff:check` and `tools/verify-handoff-state.js` to detect wrong-folder extraction, missing root configuration, release metadata mismatch, unbounded Playwright workers, and incomplete workflow transfer before browser QA.
- Made `check:release` run the handoff preflight before static and browser QA.
- Expanded cumulative overwrite packaging to include `.gitignore`, `design-preview.html`, `robots.txt`, `docs/`, the GitHub Desktop guide, and the package contract.
- Reworked overwrite verification to validate the extracted archive against the package contract instead of hard-coding one historical patch file.
- Added full-release ZIP verification and excluded local `.firebaserc` project binding from transferable release archives.
- Added `qa/v1514_github_desktop_handoff_smoke.js`.

# v1.5.13 - Handoff Package Integrity

- Fixed the v1.5.12 cumulative overwrite package, which documented the two-worker Playwright limit but accidentally omitted `playwright.config.js`; this caused the new v1.5.12 smoke test to arrive without the configuration it validated.
- Added `playwright.config.js` to every cumulative overwrite ZIP.
- Added `tools/verify-overwrite-zip.js`; overwrite packaging now fails immediately when required root configuration, workflows, QA helpers, or source trees are absent, or when dependency/test-result trees leak into the archive.
- Changed the v1.5.12 worker smoke from an exact source-string assertion to a semantic config probe that loads Playwright with `CI=true` and requires an effective worker count of 1-2.
- Extended the cumulative overwrite manifest regression guard and added `qa/v1513_handoff_package_integrity_smoke.js`.

# v1.5.12 - CI Runtime Readiness and Node 24 Actions

- Fixed the Playwright Runtime Health race: browser QA now waits for `FoxBearRuntimeHealth.getReport().appReady` or an explicit boot failure instead of stopping as soon as the health object exists.
- Added timeout diagnostics that include the latest Runtime Health report, making CI failures actionable without opening a trace first.
- Added bounded service-worker readiness polling and changed PWA tests to wait for an active registration before update assertions.
- Reworked the Wake Lock mock to create a fresh sentinel for every request and avoid stale release listeners across app activity.
- Limited CI Playwright concurrency to two workers so mobile/PWA boot checks are not starved by six simultaneous audio-heavy contexts.
- Restricted the console-error assertion to application errors while ignoring browser-only optional remote network noise already covered by Runtime Health resource checks.
- Migrated `actions/checkout`, `actions/setup-node`, and `actions/upload-artifact` from v4 to Node 24-based v6 actions.
- Added `qa/v1512_ci_runtime_readiness_smoke.js`; current static QA target is `189/189 PASS`.

# v1.5.11 - AudioContext Lifecycle and CI Navigation Stability

- Added `src/audio/audio-context-manager.js` to centralize Web Audio creation, resume, close, owner cleanup, pagehide cleanup, and diagnostics.
- Routed realtime mastering preview, difference preview, translation preview, spectrum visualization, and decode contexts through the lifecycle manager.
- Added AudioContext counts and purpose/state diagnostics to Performance Diagnostics and Runtime Health.
- Fixed a CI-wide Playwright timeout: browser tests no longer wait for `networkidle`, which can remain pending while Firebase/PWA connections are active.
- Added `navigateToApp()` with `domcontentloaded` plus the existing Runtime Health readiness assertion, and applied it to all desktop/mobile browser specs.
- Added a 20-second navigation ceiling and local proxy-bypass environment normalization so failures stop quickly and report the actual boot issue.
- GitHub Actions now uploads Playwright traces, screenshots, videos, and error context when the release gate fails.
- Added `qa/v1511_audio_context_lifecycle_smoke.js`; current static QA target is `188/188 PASS`.

# v1.5.10 - Header Settings Relocation

- Moved the settings trigger from the lower-left Dock edge to the top-right brand area, immediately to the right of the `DESIGNED BY` card.
- Added a dedicated `#headerSettingsHost` mount so the header layout remains deterministic instead of relying on a fixed floating control.
- Kept the settings panel as a body-level fixed portal and aligned it to the trigger at runtime, preventing the hero card's decorative `overflow: hidden` from clipping the panel.
- Added responsive trigger layouts: labeled `⚙️ 설정` on wide desktop, compact square gear on tablet, and smaller safe-area-aware controls on narrow mobile screens.
- Kept the hidden Bulk HUD restore button independent at the lower-left Dock edge so moving Settings does not remove batch recovery access.
- Added viewport-bound panel sizing and repositioning on resize, orientation change, and scroll.
- Extended real-browser QA to verify the settings trigger is to the right of the designer card and that the opened panel remains inside the viewport.
- Added `qa/v1510_header_settings_relocation_smoke.js`; current static QA target is `186/186 PASS`.

# v1.5.9 - Version Display and Cache Recovery

- Added `src/boot/release-presentation-service.js` so the visible top version button, program-info eyebrow, document title, body build markers, and metadata are repaired from generated `FoxBearBuildInfo` at runtime instead of relying only on duplicated static strings.
- Fixed the PWA manifest description that was still reporting `v1.4.26` even while `manifest.version` and the application were on v1.5.8.
- Changed service-worker navigation handling to use navigation preload or a `cache: 'no-store'` network request before falling back to the cached shell, reducing stale top-version HTML after deployments.
- Added service-worker release-generation diagnostics through `FOXBEAR_GET_RELEASE_INFO`; the page can now compare its expected asset/cache generation with the active worker.
- Made Update Safety derive its patch ID and boot revision from `FoxBearBuildInfo`, removing another stale hard-coded v1.5.6 identifier.
- Fixed release synchronization so the current cache generation cannot remain inside `LEGACY_CACHE_NAMES` after a version bump.
- Added executable regression coverage in `qa/v159_version_display_cache_recovery_smoke.js`; current static QA target is `185/185 PASS`.

# v1.5.8 - PCM and ZIP Memory Hardening

- Changed completed-master PCM retention to `release-after-encode`: once the encoded `outBlob` and playback URL exist, `masteredBuffer` is released by default, including the just-completed selected track.
- Fixed the memory-policy ordering bug where the newly completed track was still marked `processing` when the release sweep ran and therefore escaped cleanup.
- Made alternate download formats explicit: the current encoded format remains immediately downloadable, while unavailable re-encoding choices are disabled and explain that re-mastering is required after PCM release.
- Added a ZIP preflight sweep that force-releases completed PCM before export planning.
- Changed audio ZIP packaging from DEFLATE level 5 to `STORE` with `streamFiles`, avoiding low-value audio recompression CPU and compression-buffer overhead.
- Added estimated ZIP working-set limits by mobile/device-memory tier; unsafe exports are blocked before allocation and redirected to per-track downloads.
- Strengthened STORE ZIP size validation and exposed strategy, working-set estimate, safety limit, and individual-download requirement through `FoxBearExportGuard`.
- Added executable regression coverage in `qa/v158_pcm_zip_memory_hardening_smoke.js`; current static QA target is `183/183 PASS`.

# v1.5.7 - Release Foundation Cleanup

- Unified the product release line at `1.5.7` across package, manifest, visible UI, runtime metadata, service worker generation, and package naming.
- Added generated `src/config/build-info.js` plus `tools/release-metadata.js` and `tools/sync-release-metadata.js`; `package.json` is now the release metadata source of truth.
- Added `VERSIONING.md`, `STATUS.md`, `RELEASE_CHECKLIST.md`, and ADR 0001 for the intentional Dock FFT removal.
- Added a pinned Playwright development dependency and lock file workflow; browser QA now uses the local Playwright CLI instead of an accidental global/downloaded command.
- Added `check:release` and made deployment workflows install dependencies/Chromium and run the real browser QA gate.
- Removed repeated carry-forward paragraphs and the duplicate Changelog heading; CHANGELOG now records actual changes while ongoing rules live in STATUS/ADR documents.
- Added `qa/v157_release_foundation_smoke.js` and forward-compatible release metadata checks.
- Limited release metadata synchronization to executable metadata while preserving historical QA PASS/FAIL labels, so older regression guards keep their original release identity.
- Documentation migration index: Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Spectrum stability, Dock FFT removal, `renderMini` cleanup, Performance diagnostics, Packaging, Exit Guard, Wake Lock, `getDownloadDialogCompactHint`, and `getDownloadDialogDisplayProfile` are now tracked through `STATUS.md`, history docs, and ADRs instead of repeated release bullets.

# v1.5.6 - Export Progress Recovery

- Added `src/download/export-progress-view.js` and the `FoxBearExportProgressView` browser global for visible ZIP/export progress diagnostics.
- Added an export progress panel under the main action buttons with readiness checklist, progress bar, completion state, failure state, and `곡별 다운로드 위치 보기` fallback.
- Updated `downloadZip()` to call the progress panel during plan validation, `JSZip.generateAsync()` progress callbacks, ZIP Blob validation, success, and failure.
- Bumped boot/update safety cache-bust keys to `boot-sri-v156` and `update-safety-v156`.
- Bumped the service worker shell cache to `foxbear-shell-v1.5.6-export-progress-recovery` and carried v1.5.5 as a legacy cache generation.
- Added `qa/v156_export_progress_recovery_smoke.js`; current default QA target is `178/178 PASS`.

# v1.5.5 - Update Safety + Asset Health

- Added `src/boot/update-safety-service.js` and the `FoxBearUpdateSafety` diagnostics global.
- Boot-critical scripts now use `h=boot-sri-v155`; `update-safety-service.js` uses `h=update-safety-v155`.
- Bumped the service worker shell cache generation to `foxbear-shell-v1.5.5-update-safety` and retained v1.5.4 as a legacy cache generation.
- Runtime Health recovery now asks the active service worker to purge app caches through `FOXBEAR_PURGE_CACHES` before unregister/reload.
- Service worker JS/CSS requests with patch-bust keys now use network-first no-store handling to reduce stale fallback risk.
- Added `qa/v155_update_safety_asset_health_smoke.js`; current default QA target is `176/176 PASS`.

# v1.5.4 - Boot SRI Recovery

- Added fresh boot cache-bust keys for `runtime-health.js`, `performance-diagnostics.js`, and `app.js` to avoid stale cached JS bytes causing SRI blocks after deployment.
- Bumped the service worker shell cache generation to `foxbear-shell-v1.5.4-boot-sri-recovery`.
- Strengthened Runtime Health `캐시 초기화 후 재시도` to clear broader app/workbox/precache caches, update/unregister service workers, and reload with a fresh URL.
- Added `qa/v154_boot_sri_recovery_smoke.js`; current default QA target is `174/174 PASS`.

# v1.5.3 - Bulk HUD Visibility + Inline Master All

- Renamed the large bulk HUD toggle copy from `접기` to `숨김` and made it hide the current bulk HUD batch.
- Added a small `보이기` restore button next to the floating settings gear; it is visible only while a hidden bulk HUD batch is restorable.
- Added an inline `전체 마스터링` button inside the large HUD that delegates to the existing main full-mastering flow.
- Added targeted stale-cache keys for the changed HUD/mobile/app assets and mirrored the keys in `sw.js`.
- Added `qa/v153_bulk_hud_visibility_masterall_smoke.js`; current default QA target is `173/173 PASS`.

# v1.5.2 - Export Guard + Low Memory UX

- Added `src/download/export-guard-service.js` for ZIP/export readiness planning, generated ZIP Blob validation, memory-pressure classification, and export diagnostics.
- Wired `downloadZip()` through Export Guard before compression and after ZIP Blob generation, with a safe fallback to per-track downloads if validation fails.
- Added `FoxBearExportGuard.getReadiness()` and `FoxBearExportGuard.getDiagnostics()` for console-based 35-track export checks.
- Added low-memory/large-output UX warnings around completed-batch memory sweeps and ZIP export attempts.
- Extended the 35-track Playwright deep flow to inspect Export Guard readiness before ZIP export.
- Added `qa/v152_export_guard_low_memory_smoke.js`; current default QA target is `172/172 PASS`.

# v1.5.1 - Real Browser Automation

- Added Playwright browser automation for runtime health, console errors, PWA back navigation, Wake Lock mock request/release, service worker update, and 35-track import/master/export scenarios.
- Added `playwright.config.js` with desktop Chromium and mobile PWA-style Chromium projects.
- Added `qa/browser/run-browser-e2e.js` to start a local static server and invoke Playwright from `npm run qa:browser`.
- Added `qa/browser/helpers/foxbear-e2e-helpers.js` with synthetic WAV fixtures, Runtime Health assertions, Wake Lock mocks, and service worker snapshots.
- Added `npm run qa:browser`, `npm run qa:browser:external`, `npm run qa:browser:deep`, and `npm run qa:browser:install`.
- Added `qa/v151_real_browser_automation_smoke.js`; current default QA target is `170/170 PASS`.

# v1.5.0 - Engine Quality Gate

- Upgraded `src/audio/quality-gate-service.js` to QualityGate v2.1 with short-term LUFS, limiter overcorrection, de-esser overcorrection, multiband overcorrection, mobile translation correction amount, and risk flag checks.
- Added short-term LUFS telemetry to the master finalizer worker and in-app fallback finalizer.
- Extended master reports with `loudness.shortTermBefore` and `loudness.shortTermAfter` for diagnostics and future detail-panel surfacing.
- Added `src/audio/reference-profile-service.js` as the 64/96-band log-spectrum helper foundation for the next reference-matching upgrade.
- Kept v1.4.29 large-batch memory stabilization behavior carried forward.
- Added `qa/v150_engine_quality_gate_smoke.js`; current default QA target is `163/163 PASS`.

# v1.4.29 - Memory Stabilization

- Upgraded `src/audio/memory-guard-service.js` with dynamic large-batch and low-memory retention policy for completed mastered AudioBuffers.
- Added `FoxBearMemoryGuard.diagnose()` for before/after completed-batch memory sweeps from the browser console.
- Added automatic post-batch memory sweep after selected/all-track mastering batches complete.
- Added performance memory metadata for completed masters: `masteredBufferBytes` and `outBlobBytes`.
- Completed download Blobs remain available while non-selected completed `masteredBuffer` objects are released according to policy.
- Added `qa/v1429_memory_stabilization_smoke.js`; current default QA target is `161/161 PASS`.

# v1.4.28 - App Slim-down Orchestration Split

- Added `src/audio/mastering-orchestrator-service.js` for selected/all-track mastering batch orchestration.
- Expanded `src/audio/import-queue-service.js` with `createTrackAnalysisQueue()` so analysis queue pumping is service-owned.
- `src/app.js` now delegates import queue operations through `getImportAnalysisQueueController()` and mastering batches through `getMasteringBatchRunner().runBatch()`.
- `src/app.js` is under the v1.4.28 slim-down line budget while keeping Bulk Import HUD, Bulk Mastering HUD continuity, memory guard, and Wake Lock behavior carried forward.
- Added `qa/v1428_app_slimdown_orchestration_smoke.js`; current default QA target is `160/160 PASS`.

# v1.4.27 - Release Cleanup + Modular Guard Foundation

- Cleaned current README/HANDOFF/QA docs and moved legacy v1.4.21-v1.4.26 accumulated notes into `docs/history/`.
- Added Markdown code-fence parity checks to `qa/docs_handoff_smoke.js`.
- Updated worker headers to the current v1.4.27 carry-forward line.
- Added the first safe app.js slim-down support modules: `import-queue-service.js`, `analysis-cache-service.js`, `memory-guard-service.js`, `quality-gate-service.js`, and `track-lifecycle-service.js`.
- Added `FoxBearMemoryGuard.getSnapshot()` and a completed-batch mastered-buffer release policy so 35-track mastering can keep Blob downloads while releasing non-selected AudioBuffers.
- Performance diagnostics now includes `memoryGuard` data.
- Added optional Playwright browser QA scaffold under `qa/browser/`; default QA remains static/smoke.
- Current QA target: `158/158 PASS`.

# v1.4.26 - Bulk HUD Asset / Close Button Hotfix

- Fixed a potential `assets/css/bulk-import-hud.css` stale-cache/SRI boot failure by adding a targeted cache-bust parameter to the Bulk HUD stylesheet URL while keeping the existing `v=1.4.26-wake-lock-state-sync` runtime version.
- Service worker precache now uses the same cache-busted Bulk HUD CSS URL, avoiding old cached CSS being checked against the new stylesheet SRI.
- Reworked the Bulk HUD close control to match the shared overlay close-button feel: circular `×`, accessible label, fixed equal dimensions, and centered inline-flex alignment.
- Added `qa/v1427_1_bulk_hud_asset_close_hotfix_smoke.js`; final QA is now `150/150 PASS`.

# v1.4.26 - Bulk Mastering HUD Continuity Patch

- Extended the existing 2+ track Bulk Import HUD so it can switch into a mastering phase instead of disappearing after analysis completes.
- Added `beginMasteringBatch()` to `src/ui/bulk-import-hud-view.js` with per-track mastering order, pending/active/done/error counts, and mastering-specific labels.
- `masterSelectedTracks()` and `masterAllTracks()` now start the large HUD for multi-track mastering batches, reusing the import batch when possible.
- `setMasteringProgress()`, mastering queue start, and mastering queue end now refresh the large HUD directly so 35-track batches visibly continue from analysis to mastering.
- Added `qa/v1427_bulk_mastering_hud_smoke.js`; final QA is now `149/149 PASS`.

# v1.4.26 - Wake Lock State Sync Hotfix

- Fixed the confusing state where automatic screen wake protection could be active while the settings panel still looked like a normal OFF toggle.
- Split Wake Lock into user setting `ON/OFF` and temporary work-protection `AUTO` mode.
- Automatic playback/import/mastering Wake Lock acquisition stays silent; only manual user toggles may show a toast.
- Manual Wake Lock request failure now reverts the saved setting back to OFF instead of leaving a false ON state.
- Added `FoxBearWakeLockController.getSnapshot()` and performance diagnostics integration.

## v1.5.48 - Engine performance quality regression

- Added bounded before/after audio quality audit for dynamic collapse, high-frequency loss, low-end pumping, stereo phase risk, and invalid output samples.
- Quality audit scans at most 65,536 samples per buffer to keep runtime cost bounded.
- Integrated audit flags into the mastering quality gate and release QA.

## v1.4.26 - Exit Guard Fallback Hotfix

- Fixed the browser/PWA back-navigation leave path where confirming “나가기” could appear to do nothing when there was no previous browser history entry to navigate to.
- The leave path now removes `beforeunload`/`popstate` guards, attempts `history.go(-1)`, then tries `window.close()`, and finally renders a safe exit fallback screen if the browser refuses to close the tab/window.
- Added leave-attempt diagnostics to `FoxBearSiteGuards.getNavigationExitGuardState()`.
- Added v1.4.26 QA coverage for exit fallback behavior.

## v1.4.26 - Bulk Import HUD

- Added a dedicated scrollable Bulk Import HUD for 2+ track imports.
- The HUD shows overall percent, completed/active/pending/error counts, and one row per imported song.
- 35-track PC imports keep the v1.4.20 safe sequential analysis queue, but now the user can see where the batch is.
- Added collapse and hide controls for the current batch HUD.
- Added `FoxBearBulkImportHud.getSnapshot()` and performance diagnostics integration.
- Runtime Health now checks `FoxBearBulkImportHud.getSnapshot`.
- Added `qa/v1424_bulk_import_hud_smoke.js` and `qa/BROWSER_BACK_QA_MATRIX_1.4.26.md`.
- Final QA target: 146/146 PASS.


## v1.4.26 - Audio Decode Memory Guard

- Added audio decode diagnostics in `FoxBearAudioDecodeService.getDiagnostics()`.
- Tracks active/completed/failed decodes, recent decode events, last decoded PCM size, and last error.
- `decodeAudioFile()` now explicitly releases its temporary `ArrayBuffer` reference in `finally` after Web Audio decoding.
- Performance diagnostics now include `audioDecode` and warn on `audio-decode-active` / `audio-decode-last-error`.
- Runtime Health now requires `FoxBearAudioDecodeService.getDiagnostics`.
- v1.4.22 mastering queue throttle, v1.4.21 render scheduler, and 35-track sequential import guard remain carried forward.
- Dock FFT removal carry-forward: Dock mini FFT remains removed and detail-only spectrum stays available.

## v1.4.26 - Mastering Queue Throttle / Diagnostics

- Added `FoxBearMasteringGuard.getSnapshot()` for active mastering diagnostics.
- `setMasteringProgress()` now uses `scheduleRenderAll('mastering-progress', ...)` so every 5% progress step does not force an immediate full render.
- Mastering final UI refresh still flushes immediately through `scheduleRenderAll('mastering-final', { immediate: true })`.
- Added explicit transient buffer cleanup in the mastering `finally` path.
- Performance diagnostics now include `masteringQueue` and a `mastering-active` warning.
- Added `qa/v1422_mastering_queue_throttle_smoke.js` and `qa/BROWSER_BACK_QA_MATRIX_1.4.26.md`.
- v1.4.21 render scheduler, silent wake-lock import, stable analysis cache key, and audio decode service carry forward.


- v1.4.21 Performance diagnostics remain available while bulk import guard reports queued import state.
# v1.4.21 stability - Bulk Import Guard / 35-Track PC Crash Hotfix

- Fixed a PC bulk import crash path reported when selecting 35 songs at once.
- Track registration now batches UI rendering and queues decoding/analysis instead of starting every file immediately.
- Added a single-lane import analysis queue (`FoxBearBulkImportGuard`) to avoid simultaneous `file.arrayBuffer()` + `AudioContext.decodeAudioData()` storms.
- Added large-batch status messaging so 12+ selected songs show safe queue progress.
- Added `qa/v1421_bulk_import_guard_smoke.js` and `qa/BROWSER_BACK_QA_MATRIX_1.4.21.md`.


## v1.4.21 - Download dialog first-screen declutter
- Added `FoxBearDownloadService.getDownloadDialogDisplayProfile()` so the dialog can separate initial/open-state copy from post-action guidance.
- Main download popup now uses `download-options-panel-v5` and `data-download-display-mode` for `restricted-declutter` / `standard-declutter` modes.
- Initial receipt renders in idle mode and hides the full checklist until the user presses download/share/assist/diagnostics/copy.
- Kept `getDownloadDialogCompactHint()` and all diagnostics/checklist copy tools as fallback support behind `추가 옵션`.
- App download dialog dependencies now pass receipt/checklist/compact-hint/display-profile helpers explicitly.
- Runtime Health now checks the dialog display profile helper.
- Updated cache key to `1.4.26-wake-lock-state-sync`.

## v1.4.17 - Download recovery compact polish
- Added `FoxBearDownloadService.getDownloadCompactRecoveryPlan()` for a shorter user-facing save order.
- Kept full `getDownloadRecoveryChecklist()` and diagnostics JSON for support/debugging, but made the visible dialog checklist more compact.
- Fixed the clipboard textarea fallback so it does not attempt to remove the same temporary element twice.

## v1.4.16 - Download recovery checklist
- Added save recovery checklist helpers and checklist copy.

## v1.4.15 - Download receipt polish
- Added download action receipts and next-step status cards.
- Improved Kakao/mobile post-action guidance.

## v1.4.14 - Download action clarity
- Unified download/share/assist action dispatch.
- Added explicit `data-download-action` QA anchors.

## v1.4.13 - Download flow polish
- Added recommended download flow cards.
- Collapsed secondary copy/diagnostics options.

## v1.4.12 - Download diagnostics follow-up
- Added download diagnostics JSON copy and event tracing.

## v1.4.11 - Download/share reliability
- Added Kakao/in-app browser fallback path for Blob download restrictions.

## v1.4.10 - Performance diagnostics packaging polish
- Improved hidden performance diagnostics and package version sync.

## v1.4.9 - Performance diagnostics
- Added hidden performance diagnostics panel.

## v1.4.8 - Dock spectrum cleanup
- Fully removed Dock mini FFT remnants.

## v1.4.7 - Dock FFT removal
- Removed Dock FFT to simplify the player and reduce render work.

## v1.4.6 - Stability polish
- Stabilized FFT lifecycle and navigation guard state.

## v1.4.5 - FFT analyser stabilization
- Stabilized WebAudio analyser taps.

## v1.4.4 - FFT live hotfix
- Fixed mini-only FFT loop issue.

## v1.4.3 - Playback transition audit
- Split playback transition service and hardened fade recovery.

## v1.4.2 - Crossfade / zoom / Dock spectrum
- Added crossfade, waveform zoom, and Dock mini spectrum.

## v1.4.1 - Spectrum / exit guard
- Added spectrum visualizer and refresh/back guard.

## Stage28
- Extracted `waveform-control-view.js` and kept managed waveform rendering paths.

## Stage27
- Added common waveform control service.

## Stage26
- Unified waveform controls.

## Stage25
- Rehomed compare controls.

## Stage23
- Added playback orchestration foundations.

## Stage14
- Runtime recovery and asset health monitoring.

## Stage13
- Runtime health checks and boot failure visibility.

## Stage9
- Dock waveform CSS split and cumulative overwrite manifest checks.

## Stage7
- `waveform-compare-view.js` split and compare modal cleanup.

