# FoxBear AI Mastering Studio Pro v1.6.91

> Current release: v1.6.91 · runtime-health-hidden-geometry-contract-recovery

This release fixes the mobile Runtime Health false failure caused by measuring a hidden Studio header token as if it still had visible geometry. The production header CSS, strict overlap threshold, and v1.6.90 Mastering Engine picker isolation remain unchanged.

# FoxBear AI Mastering Studio Pro v1.6.90

> Current release: v1.6.90 · engine-control-overlay-isolation-header-contract-recovery

This release isolates the Mastering Engine option pickers from mobile PWA history/body-lock behavior, yields before applying engine-setting changes, and adds direct diagnostics for stuck controls. The strict mobile header overlap gate remains unchanged and now verifies the exact header CSS contract generation before measuring geometry.

# FoxBear AI Mastering Studio Pro v1.6.89

> Current release: v1.6.89 · mobile-header-flex-ownership-browser-gate-recovery

This release removes the remaining mobile-only Runtime Health header collision by switching the final Pixel-class command header to a deterministic two-rail Flexbox contract while keeping the strict browser geometry gate and essential workspace/settings controls.

# FoxBear AI Mastering Studio Pro v1.6.81

> Current release: v1.6.81 · ai-workspace-compact-overlay-accessibility

This release polishes the new AI Mastering workspace: the AI surface is visually reduced to the command bar plus import, queue, analysis, and the existing Dock; the mode chooser now participates in the shared overlay/history system after first selection, protects background focus with `inert`, and uses larger mobile typography and visual-viewport-safe sizing.

# FoxBear AI Mastering Studio Pro v1.6.80

> Current release: v1.6.80 · ai-mastering-expert-workspace

This release adds a first-entry **AI 마스터링 / 전문가 모드** workspace choice. AI Mastering presents the existing import, queue, analysis and Dock workflow as a mobile-first single column while Expert mode preserves the full studio controls; both modes share the same audio/mastering state.

# FoxBear AI Mastering Studio Pro v1.6.75

This release makes download encoding status easier to see by slightly extending the download sheet and surfacing worker progress above filename controls. It also closes an incident-admission bypass: server rate-limit or emergency-disabled responses can no longer fall through to direct Firestore storage or be re-added as new local retry items.

# FoxBear AI Mastering Studio Pro v1.6.74

This release hardens the incident intake boundary while preserving the project's no-App-Check policy. Callable submissions now use deterministic pre-deduplication, per-UID and global admission budgets, an emergency server control mode, and a Functions instance ceiling. Spark-only Firestore fallback reports receive an immediate 30-day TTL and explicit storage provenance, while alternate download transcoding now reuses the same decoded-memory safety limits as initial import.

Operational controls: set `incidentMailState/admissionControl.mode` to `enabled`, `degraded`, or `disabled` from the Firebase Console. Keep Firestore TTL enabled for both `incidentReports.expiresAt` and `incidentMailState.expiresAt`.

# FoxBear AI Mastering Studio Pro v1.6.73

This release prevents the recurring Static release gate failure caused by extract-overwrite leftovers. GitHub Actions now removes only the approved local/generated paths from its temporary checkout, emits warning annotations, and immediately runs the same strict hygiene validation. Secret-like files and unknown unsafe artifacts still fail the release.

# FoxBear AI Mastering Studio Pro v1.6.71

This release completes the PWA share hardening roadmap: atomic multi-tab leases, quota and deleted-storage recovery, service-worker update handoff, exact Android payload boundaries, canonical/deployed App Check policy comparison, actual Chromium E2E coverage, and a smaller main application module.

Key commands: `npm run appcheck:policy:check`, `npm run appcheck:deploy:verify`, `npm run audit:prod:official`, `npm run functions:audit:official`, and `npm run package:delivery`.

# FoxBear AI Mastering Studio Pro v1.6.69

This release tightens release ordering and two intentionally disabled/optional surfaces. Browser QA now starts only after static QA succeeds, all Callable Functions share one explicit App Check policy contract with accurate token-observation diagnostics, and Android/PWA share-target files are validated, size-bounded, expired, and cleaned before they can accumulate in IndexedDB.

# FoxBear AI Mastering Studio Pro v1.6.68

This release closes stale immutable-asset paths outside the main studio shell. Every deployed public HTML entry now uses the current asset generation, all public CSS/JavaScript SRI is updated and verified, auxiliary pages remain reachable under an active service worker, PWA icons use the current generation, and root shell documents opt out of long-lived browser caching.

# FoxBear AI Mastering Studio Pro v1.6.67

This release separates local cleanup from CI enforcement. GitHub Actions validates source hygiene without deleting committed violations, while local release and delivery commands may repair only the approved generated/local paths before running the same strict check.

# FoxBear AI Mastering Studio Pro v1.6.64

This release hardens GitHub Desktop delivery. Use `npm run package:delivery` to create the verified full-project ZIP and changed-file extract-overwrite patch ZIP. Local Git metadata, Firebase CLI state, real `.firebaserc`, dependency folders, secret environment files, caches, and generated QA output are excluded.

# FoxBear AI Mastering Studio Pro v1.6.63

## v1.6.63 filename provenance, full export review, and design hardening

- Every completed master now stores the exact source filename that created it; later UI label changes do not alter the historical export title.
- The bulk action area can review the first 12 final ZIP names and copy the complete final-name list, including ` (2)`, ` (3)` collision results.
- Filename summary invalidation includes every completed track, so changing only a middle row cannot leave a stale preview.
- Very long Unicode names are truncated by grapheme cluster, protecting joined emoji and combining characters while retaining the 240-byte limit.
- The download dialog adds a direct **파일명 복사** action with accessible status feedback and 44 px mobile controls.
- Apply the overwrite ZIP at the repository root, run the release gates, and verify one real desktop/mobile export before deployment.

# FoxBear AI Mastering Studio Pro v1.6.62

## v1.6.62 filename preview, controls, and export preflight

- Open the post-master download dialog to see the exact filename before saving.
- Expand **파일명 설정** to include or hide `mastered`, LUFS, style, quality, and platform tokens; the choice applies globally to single saves, alternate formats, sequential exports, and ZIP entries.
- Completed masters retain their real mastering-time metadata even when the current style/platform controls are changed later.
- The bulk export action area reports duplicate filename collisions before ZIP creation and resolves them as ` (2)`, ` (3)`.
- Long Korean/English/emoji titles wrap inside the dialog, and the settings collapse to one column on narrow mobile screens.
- Apply the overwrite ZIP at the repository root, run the release gates, and verify one desktop and one mobile save before deployment.

# FoxBear AI Mastering Studio Pro v1.6.61

## v1.6.61 human-readable download filenames

- Original Korean/English titles retain spaces, parentheses, and safe Unicode characters.
- Only operating-system forbidden characters are normalized, while Windows reserved names and overlong UTF-8 names are guarded.
- Every download and ZIP path uses the same readable policy, and duplicate titles become ` (2)`, ` (3)`.
- Previously exported FoxBear names can be imported again without duplicating generated mastering metadata.

# FoxBear AI Mastering Studio Pro v1.6.60

## v1.6.60 single ZIP export and active HUD navigation

- `ZIP 다운로드 · 1개 파일` always stays in the single-archive flow and never starts the separate per-track queue automatically.
- Large mobile or memory-heavy exports show a warning but still attempt one STORE ZIP below the worker's 200-file / 1,500 MB hard limits.
- ZIP completion verifies archive file count, Blob size metadata, and the final `.zip` filename.
- During multi-track mastering, the HUD re-finds and centers the row marked `현재 진행` after every track transition.
- Apply the overwrite ZIP at the repository root, run the release gates, then verify one real large-batch ZIP before deployment.

# FoxBear AI Mastering Studio Pro v1.6.59

## v1.6.59 readiness and Hosting-header security hardening

- Public deployment self-checks now validate Functions, Firestore, CSP, and version state without touching Gmail credentials or SMTP.
- Verified Google administrators registered in `siteAdmins/{uid}` receive the full Gmail Secret and SMTP connection checks.
- Public and administrator cooldowns use fixed scope caches, preventing anonymous UID rotation from bypassing the rate limit.
- Firebase Hosting keeps popup-compatible COOP and now sends the valid restrictive CORP value `same-origin`.
- Apply the overwrite ZIP at repository root, run the release gates, then deploy Hosting and the incident Functions.

# FoxBear AI Mastering Studio Pro v1.6.58

## v1.6.58 piano transient integrity

- Piano-like transient and upper-harmonic risk now reduces high-frequency excitation, narrow metallic notches, clarity drive, and excessive pre-finalizer gain.
- Normal mastering uses one authoritative worker lookahead/True-Peak limiter instead of serial Web Audio and worker limiting.
- Near-ceiling `tanh` waveshaping was removed; residual True-Peak overshoot is corrected with transparent global gain.
- The quality gate now detects newly created high-frequency glare and reports melodic-transient risk.
- Run the original and mastered WAV24 at matched loudness for the final real-audio acceptance test.

# FoxBear AI Mastering Studio Pro v1.6.57

## v1.6.57 Firebase Hosting payload boundary

- Firebase Hosting now publishes only a generated `dist/hosting` directory instead of the repository root.
- The staging allowlist contains the public pages plus `assets/`, `src/`, and `vendor/`; `.git`, Functions, QA, tools, documentation, and local configuration cannot enter the deploy payload.
- `firebase deploy` runs `npm run hosting:check` through the Hosting predeploy hook even when the wrapper scripts are bypassed.
- Hidden, executable, secret-like, and symbolic-link entries inside public trees fail the deployment preflight.
- Run `npm run check:release` before deployment and publish the synchronized v1.6.57 cache generation.

## v1.6.56 playback Blob source resilience

- Invalidated Blob audio sources are rebuilt from the retained original File or mastered/highlight Blob.
- Source recovery keeps the current playback position and resumes only when the latest transport intent still requests playback.
- Previous mastered Object URLs are retired only after connected players release them.
- Lifecycle return restores stale near-zero player volume when no active fade is running.
- Run `npm run check:release` before deployment and publish the synchronized v1.6.56 cache generation.

## v1.6.55 mobile focus resume reconciliation

- Mobile/background return now attempts one bounded Dock playback recovery when the last captured transport state was playing.
- A blocked automatic resume clears stale play intent so the next user tap starts playback instead of being misread as pause.
- Unexpected visible audio-focus pauses from route, headset, or Bluetooth changes reconcile the Dock button and Media Session immediately.
- Interrupted crossfade shells are collapsed to the active player before lifecycle recovery, preventing duplicate players after return.
- Run `npm run check:release` before deployment and publish the synchronized v1.6.55 cache generation.

# FoxBear AI Mastering Studio Pro v1.6.53

## v1.6.53 playback crossfade settlement guard

- User-gesture original/master switching now calls `play()` without a competing readiness `load()` that can interrupt the same request.
- Crossfades that finish as cancelled or stale are fully settled instead of leaving two Dock players and an `is-crossfading` state behind.
- Thrown transition failures clean up the old player before retrying only through the currently active Dock source.
- Existing post-master readiness, volume recovery, and active-player ownership rules remain in place.
- Run `npm run check:release` before deployment and publish the synchronized v1.6.53 cache generation.

# FoxBear AI Mastering Studio Pro v1.6.52

## v1.6.52 post-master playback readiness recovery

- The 100% completion render is now the single source commit for the Dock; a second forced player replacement no longer races an immediate user tap.
- Post-master repair checks the selected track, mastered mode, active Blob URL, and player ownership before rebuilding anything.
- Dock play controls target the active audio element's owning player, including during crossfade cleanup.
- Mastered and highlight Blob sources preload media data and use a longer recoverable readiness window for mobile and in-app browsers.
- Cancelled fades restore their audible target volume so a playing element cannot remain effectively muted.
- Run `npm run check:release` before deployment and publish the synchronized v1.6.52 cache generation.

# FoxBear AI Mastering Studio Pro v1.6.51

## v1.6.51 stability, input safety, and shared download conversion

- The centered Kakao notice now consumes the first dismissal gesture so a hidden upload, mastering, or download control cannot activate at the same time.
- Duplicate notice script execution reuses the existing singleton, removes orphaned notice DOM, and releases timers/listeners immediately on page exit.
- Identical overlapping alternate-format downloads now share one decode and one encode operation.
- Each caller keeps independent cancellation: one closed dialog does not cancel another active request, while the worker stops when the final subscriber cancels.
- A conversion is pinned to the mastered source Blob captured at job start, preventing a replaced master file from receiving stale cached output.
- Run `npm run check:release` before deployment and publish the synchronized v1.6.51 cache generation.

# FoxBear AI Mastering Studio Pro v1.6.50

## v1.6.50 Kakao browser entry guidance

- KakaoTalk in-app launches now show a large notice in the exact center of the screen before users begin a long mastering workflow.
- The notice explains that completed-file downloads may be unreliable inside KakaoTalk and recommends opening FoxBear in Chrome, Safari, or the device default browser.
- PWA home-screen installation is presented as an app-like alternative.
- Touch anywhere on the screen or press Escape to dismiss it with a smooth transition; otherwise it closes automatically after eight seconds.
- Normal browsers and installed PWA launches do not show the Kakao warning.
- Run `npm run check:release` before deployment and publish the synchronized v1.6.50 cache generation.

# FoxBear AI Mastering Studio Pro v1.6.49

## v1.6.49 repeated download conversion reuse

- The most recently converted alternate MP3/WAV download is reused when the same quality is selected again.
- Reopening the download dialog or moving from download to share no longer repeats the same full decode/encode work.
- The cache keeps only one alternate file per mastered source and skips files larger than 64 MB to protect browser memory.
- Cached options show an exact file size and an immediate-reuse label.
- MP3-to-MP3 bitrate conversion now warns about lossy re-encoding, while MP3-to-WAV keeps the separate no-restoration warning.
- Run `npm run check:release` before deployment and publish the synchronized v1.6.49 cache generation.

# FoxBear AI Mastering Studio Pro v1.6.48

## v1.6.48 post-master download format and quality selection

- Choose MP3 or WAV again from the download dialog after mastering is complete.
- Select MP3 128/192/256/320 kbps or WAV 16/24/32-bit float at download time.
- When the memory guard has released the completed PCM buffer, FoxBear reopens the completed master file and converts it without requiring a full remaster.
- The current mastered format still downloads immediately without unnecessary conversion.
- MP3-to-WAV conversion is clearly marked as a container/format conversion and does not claim to restore lost detail.
- Run `npm run check:release` before deployment and publish the synchronized v1.6.48 cache generation.

# FoxBear AI Mastering Studio Pro v1.6.47

## v1.6.47 GitHub Pages administrator authentication recovery

- Detects that `jurl-img.github.io` is not Firebase Hosting and keeps it on popup-only authentication.
- Waits for a delayed Google authentication state after the account chooser instead of immediately failing on `auth/network-request-failed`.
- Moves unresolved administrator login to the fixed Firebase Hosting security origin and restores non-audio settings.
- Reopens the administrator login dialog on `foxbear-music.web.app` without attempting an automatic popup outside a user gesture.
- Stops generic cross-origin `Script error.` events from replacing the normal file-import status.
- App Check remains disabled; administrator authorization still requires `siteAdmins/{UID}`.

# FoxBear AI Mastering Studio Pro v1.6.46

## v1.6.46 Google administrator authentication network recovery

- Treats the screenshot error as Firebase `auth/network-request-failed`, which occurs before `siteAdmins/{UID}` authorization.
- Uses the current approved Firebase Hosting domain as `authDomain` so the authentication helper is same-origin.
- Falls back from popup network failure to one fenced redirect attempt.
- Shows the real Firebase error code, page host, and auth domain instead of a generic network message.
- Keep App Check disabled and authorize both Firebase Hosting OAuth handler URIs described in `FIREBASE_SETUP.md`.
- Deploy with `npm run deploy:spark` after `npm run check:release`.

# FoxBear AI Mastering Studio Pro v1.6.45

## v1.6.45 Windows/Spark deployment recovery

- Fixes `spawnSync npm.cmd EINVAL` on current Windows/Node environments.
- Prevents Windows executable files from being uploaded by Firebase Hosting on the Spark plan.
- Removes Firebase App Check and reCAPTCHA setup from the runtime and deployment contract.
- Keeps administrator access on Google Authentication plus `siteAdmins/{UID}` Firestore authorization.
- Deploy with `npm run deploy:spark` after `npm run check:release`.
- Mandatory delivery remains the three sections stored in `DELIVERY_RULES.md`.

# FoxBear AI Mastering Studio Pro v1.6.44

## v1.6.44 Google authentication gapi module recovery

- Fixes the remaining `허용되지 않은 동적 스크립트 URL입니다` failure after the initial Firebase Auth loader succeeds.
- Allows only Firebase Auth's generated `apis.google.com/_/scs/apps-static/_/js/` iframe module path.
- Keeps strict Trusted Types and CSP enforcement enabled; unrelated Google and external script paths remain blocked.
- Stores only rejected origin and pathname for diagnostics, without query strings or callback values.
- Spark deployments still use `npm run deploy:spark`.
- Mandatory delivery remains the three sections stored in `DELIVERY_RULES.md`.

# FoxBear AI Mastering Studio Pro v1.6.43

## v1.6.43 Google authentication security recovery

- Fixes the TrustedScriptURL error shown when selecting `Google 계정으로 인증`.
- Keeps strict Trusted Types enforcement while adding a narrow Firebase Auth-compatible default policy.
- Allows only the exact Google API loader and existing reCAPTCHA paths; unrelated external and same-origin paths remain blocked.
- Aligns Firebase Hosting CSP and popup isolation headers with the Google administrator login flow.
- Spark deployments still use `npm run deploy:spark`; no Secret Manager or paid administrator Function is required.
- Mandatory delivery remains the three sections stored in `DELIVERY_RULES.md`.

# FoxBear AI Mastering Studio Pro v1.6.42

## v1.6.42 Spark Google administrator access

- Settings contains `관리자 모니터링` with Firebase Google sign-in.
- Spark deployments use `npm run deploy:spark`; no administrator Secret Manager or Cloud Function is required.
- Firestore Rules require a verified Google account and a matching active `siteAdmins/{UID}` document.
- Unregistered accounts see their Firebase UID so the owner can complete the one-time Firestore registration.
- Administrator logout signs out the Google account and restores an anonymous visitor session.
- Deployment instructions are in `FIREBASE_SETUP.md`.
- Mandatory delivery remains the three sections stored in `DELIVERY_RULES.md`.

# FoxBear AI Mastering Studio Pro v1.6.41 (superseded)

The temporary PIN/Secret Manager design from v1.6.41 was replaced before production use because the project remains on the Spark plan.

# FoxBear AI Mastering Studio Pro v1.6.40

## v1.6.40 retry replacement settlement

- Critical resource recovery now evaluates failed originals and replacement nodes together.
- Dynamically inserted retries remain pending until their own load/error event or the bounded deadline.
- Mandatory delivery remains the three sections stored in `DELIVERY_RULES.md`.

# FoxBear AI Mastering Studio Pro v1.6.39

## v1.6.39 partial boot and client-probe isolation

- A failed critical JavaScript asset now keeps the static UI visible while Runtime Health reports the missing feature layer.
- Pending scripts are not classified as failed before the window load boundary.
- Service-worker client probes discard expired request responses and remove clients that terminate during collection.
- Surviving clients receive one bounded retry after a service-worker restart.
- Mandatory delivery remains the three sections stored in `DELIVERY_RULES.md`.

# FoxBear AI Mastering Studio Pro v1.6.38

## v1.6.38 UI shell follow-up

- Core styles are pending until confirmed failed, preventing premature minimal-UI activation.
- Runtime Health and UI-shell recovery now share one visible recovery surface.
- Active clients report their shell generation before an optional retained cache is retired.
- The newest rollback shell remains available, and unresponsive older tabs keep both recent generations protected.
- Mandatory delivery remains the three sections stored in `DELIVERY_RULES.md`.

# FoxBear AI Mastering Studio Pro v1.6.37

## v1.6.37 UI recovery hotfix

- Prevents a newly activated service worker from deleting the exact previous-generation assets still needed by an open or BFCache-restored page.
- Keeps the two latest legacy shell caches and serves only exact stale-generation cache matches.
- Adds a boot-level UI visibility guard and readable minimal fallback styling.
- Mandatory delivery remains the three sections stored in `DELIVERY_RULES.md`.

# FoxBear AI Mastering Studio Pro v1.6.36

## v1.6.36 update

- Service-worker activation now uses token-plus-generation fencing and an 80 ms ownership settlement window.
- Competing tabs cannot both send `SKIP_WAITING` after observing the same expired or empty lease.
- BFCache pageshow reconciles a controller change that occurred while the page was frozen.
- Managed AudioContext cleanup joins concurrent close requests instead of calling native close twice.
- New Worker and AudioContext stress coverage raises the configured cumulative target to 378 checks.
- Final results remain fixed to the three sections stored in `DELIVERY_RULES.md`.

## v1.6.34 update

- Terminal overlay history hard-stall recovery after 30 seconds without duplicate traversal.
- BFCache-safe service-worker activity heartbeat/channel pause and resume.
- Idempotent service-worker registration observers and expanded anonymous diagnostics.
- Configured cumulative static/behavioral target: 374 checks.

## v1.6.33 full audit and overlay history watchdog recovery

- An omitted overlay `popstate` is reconciled from the exact destination generation instead of leaving history cleanup active indefinitely.
- A sentinel that has not moved is diagnosed as a hard stall without issuing a duplicate Back request.
- Delayed internal generations are bounded by both time and count.
- System, performance, technical, functional, engine, error, bug, and exception gates are re-audited.

## Latest patch

- New regression: `node qa/v1633_overlay_history_watchdog_recovery_smoke.js`.
- Full static and behavioral gate: `npm run check:static`.
- Mandatory final-output contract remains `DELIVERY_RULES.md`:
  1. 작업한 내역
  2. 다운로드 파일 2종
  3. 다음 예정 내역
- Configured static/regression target: 373 checks.

# FoxBear AI Mastering Studio Pro v1.6.32

## v1.6.32 overlay history generation and BFCache recovery

- Every overlay history sentinel now carries a generation shared with its exact Back destination.
- Delayed internal history cleanup can no longer consume a newer user Back event.
- BFCache restore reconciles a completed or interrupted internal release without stacking a second exit guard.
- Download, recommendation, settings, and incident dialogs share the same generation-fenced navigation contract.

## Latest patch

- The exit guard asks the modal controller whether the specific popstate belongs to an internal release.
- Pagehide suspends the release watchdog, while pageshow settles, retries, or safely abandons the exact generation.
- Performance diagnostics expose generation, suspended, recovered, mismatch, and stale-release counters without navigation URLs or user content.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1632_overlay_history_generation_bfcache_recovery_smoke.js`
- 인수인계 검사: `npm run handoff:check`
- 설정된 정적·회귀 검사: 372개.

# FoxBear AI Mastering Studio Pro v1.6.30

## v1.6.30 overlay history release and exit guard safety

- Normal dialog close no longer triggers the leave-confirmation or “exit cancelled” message.
- Internal overlay history cleanup is distinguished from a genuine browser Back action.
- Genuine Back still closes an open top dialog first and reaches the workspace exit guard when no dialog is open.

## Latest patch

- The modal controller exposes its short-lived internal history-release state.
- The exit guard ignores only that internal release instead of relying on listener execution order.
- Overlay popstate events are marked handled only when a dialog or sentinel release was actually consumed.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1630_overlay_history_release_false_exit_prompt_smoke.js`
- 인수인계 검사: `npm run handoff:check`
- 설정된 정적·회귀 검사: 370개.

# FoxBear AI Mastering Studio Pro v1.6.29


## v1.6.29 incident submission fencing and adaptive polling

- Stable per-occurrence submission identity prevents delayed local-queue recovery from creating a second server report.
- Lease-generation fencing stops stale tabs before they commit delivered entries.
- Cross-tab fallback polling now slows down for idle and hidden tabs and immediately resynchronizes on foreground return.
- Incident settings control rendering and one-time bindings are isolated from the reporter orchestration.

## Latest patch

- One stable submission key now follows an incident occurrence from local queue storage through Callable and Firestore fallback delivery.
- Delayed recovery no longer derives a new server report ID from the retry clock.
- Lease ownership is fenced by token and generation before delivery commit.
- Fallback synchronization uses active, idle, and hidden-page polling schedules with immediate foreground resync.
- Settings control rendering and one-time event binding are isolated in a dedicated view module.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1629_incident_submission_fencing_adaptive_polling_smoke.js`
- 인수인계 검사: `npm run handoff:check`
- 설정된 정적·회귀 검사: 369개.

# FoxBear AI Mastering Studio Pro v1.6.27

## Latest patch

- Local anonymous incident reports are stored in per-tab bounded shards, preventing two tabs from overwriting one shared queue array.
- Queue changes synchronize through BroadcastChannel with a storage-revision fallback.
- Only one browser tab may flush reports at a time through Web Locks or a renewable localStorage lease fallback.
- Delivered reports are committed by exact occurrence, while reports added during recovery and later matching fingerprints remain safe.
- Legacy queues migrate automatically through the coordinated path.
- Cross-tab diagnostics remain metadata-only; audio, filenames, report contents, credentials, and local paths are unchanged.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1627_incident_multitab_queue_ownership_stress_smoke.js`
- 인수인계 검사: `npm run handoff:check`
- 설정된 정적·회귀 검사: 364개.

# FoxBear AI Mastering Studio Pro v1.6.16

## Latest patch

- Firebase incident requests now use three reliability layers: direct Callable SDK, authenticated Firebase Hosting same-origin rewrite, and the existing Firestore compatibility fallback where supported.
- The error-reporting panel shows the active transport and provides one-line repair buttons selected from the actual failure class.
- Nested interactive dialogs now suspend their parent layer and mobile browser Back closes the top overlay before page navigation. The existing work-exit confirmation ignores Back events already consumed by an overlay.
- Lightweight hover tooltips remain lightweight and are not unnecessarily promoted to blocking overlays.
- Production use requires deploying Hosting rewrites and Functions together with `npm run deploy:incident`.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1616_same_origin_incident_overlay_navigation_smoke.js`
- 설정된 정적·회귀 검사: 342개.

# FoxBear AI Mastering Studio Pro v1.6.15

## Latest patch

- Popup-on-popup flows now use a conditional shared fixed-overlay stack, so a secondary dialog does not push, resize, or replace its parent when nesting is appropriate.
- Nested layers are constrained to the active visual viewport, scroll internally on short screens, preserve z-order, and restore parent focus and scroll ownership when closed.
- Automatic incident reporting now distinguishes offline, unreachable network, CORS-unreadable endpoint, missing Function, and reachable server-internal failures.
- Transient failures retry after 5, 15, and 45 seconds, queued anonymous reports retry when connectivity returns, and users can run recovery or copy sanitized diagnostics manually.
- Production Firebase confirmation still requires deploying Hosting and Functions together with `npm run deploy:incident`.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1615_nested_overlay_stack_smoke.js`
- 신규 오류신고 회귀: `node qa/v1615_incident_auto_recovery_smoke.js`
- 설정된 정적·회귀 검사: 341개.

# FoxBear AI Mastering Studio Pro v1.6.14

## Latest patch

- The mastered-file download dialog keeps MP3 and WAV visible and opens quality choices in a viewport-contained context menu.
- The popup is rendered outside the scrollable sheet, chooses above/below placement, clamps to the visible screen, and scrolls internally when the screen is short.
- The app remembers valid MP3/WAV choices and shows exact or estimated output sizes.
- Incident reporting now identifies `getIncidentServiceStatus`, its regional endpoint, direct HTTP reachability, CSP inclusion, and App Check state separately.
- Apply Hosting and Functions together with `npm run deploy:incident` before production verification.

# FoxBear AI Mastering Studio Pro v1.6.13

마스터링 파일 다운로드 창은 이제 MP3와 WAV 두 항목만 상시 표시합니다. 각 항목을 누르면 Windows 우클릭 메뉴처럼 음질 선택 메뉴가 떠서 MP3 128/192/256/320 kbps 또는 WAV 16/24/32-bit Float를 고를 수 있으며, 선택하면 메뉴가 자동으로 닫히고 기존 다운로드·공유·저장 도움 흐름을 그대로 사용합니다.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1613_download_format_context_menu_smoke.js`
- 다운로드 관련 회귀: `node qa/v1574_bulk_pause_mobile_download_smoke.js`
- 브라우저 계약 사전검사: `node qa/browser/run-browser-preflight.js`
- 설정된 정적·회귀 검사: 337개.
- MP3/WAV 인코더와 파일 생성 로직은 변경하지 않고 선택 UI만 단순화했습니다.

# FoxBear AI Mastering Studio Pro v1.6.12

현재 릴리스는 v1.6.11의 측정 재사용에 이어 finalizer의 가장 큰 잔여 병목을 줄입니다. 모노·스테레오 tone dynamics를 전용 루프로 처리하고, K-weighted 채널 버퍼 대신 샘플별 전력 배열을 공유하며, 입력·출력 안전 스캔을 결합해 음질과 최종 샘플을 유지하면서 처리 시간을 단축합니다.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1612_mastering_tone_loudness_fastpath_smoke.js`
- 엔진 벤치: `node qa/engine_qa_bench.js`
- 골든 오디오: `node qa/golden_audio_qa_pack.js`
- 설정된 정적·회귀 검사: 336개 전체 통과.
- 로컬 Node VM 1초 스테레오 강보정 비교에서 실행별 약 10~21% 처리 시간 감소를 확인했습니다. 실제 브라우저 수치는 기기별로 달라집니다.
- 과거 회귀 검사의 이전 build ID 고정 비교도 제거했습니다.

# FoxBear AI Mastering Studio Pro v1.6.10

현재 릴리스는 배포 자체 점검 응답이 일부 누락되거나 손상된 경우 상위 `ok: true`를 그대로 믿지 않고 안전하게 실패 처리합니다. 웹 CSP는 `connect-src` 안의 정확한 Callable origin만 인정하며, 60초 로컬 캐시 재사용은 같은 이력 한 건을 캐시 결과로 갱신합니다. 손상된 로컬 점검 이력은 설정 화면을 깨뜨리지 않고 제외됩니다.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1610_incident_readiness_contract_csp_cache_hardening_smoke.js`
- 오류 신고 전체 배포: `npm run deploy:incident`
- 설정된 정적·회귀 검사: 333개.

# FoxBear AI Mastering Studio Pro v1.6.9

현재 릴리스는 최근 배포 자체 점검 3회의 정상·실패 변화를 기기 내부에만 보관하고, 실패한 각 점검 카드에서 복구 명령 또는 안전한 설정 안내를 바로 복사할 수 있습니다. 같은 캐시 결과는 중복 저장하지 않으며, 오류 자동신고 상태가 바뀌면 설정 메뉴 요약도 즉시 갱신됩니다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1609_incident_readiness_history_recovery_copy_events_smoke.js`
- 오류 신고 전체 배포: `npm run deploy:incident`
- 설정된 정적·회귀 검사: 332개.

# FoxBear AI Mastering Studio Pro v1.6.8

현재 릴리스는 오류 신고 배포 자체 점검을 60초 동안 안전하게 캐시해 SMTP 인증을 반복 호출하지 않습니다. 마지막 정상 점검 시각과 다음 점검 가능 시간을 유지하고, 실패한 CSP·Functions·Firestore·Gmail Secret·SMTP 카드마다 복구 위치를 바로 표시합니다. 설정 메뉴에서도 메일 상태를 정상·확인 필요·연결됨·미확인·꺼짐으로 간단히 확인할 수 있습니다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1608_incident_readiness_recovery_summary_rate_limit_smoke.js`
- 오류 신고 전체 배포: `npm run deploy:incident`
- 설정된 정적·회귀 검사: 331개.

# FoxBear AI Mastering Studio Pro v1.6.7

현재 릴리스는 오류 자동신고 화면에서 웹 CSP·Callable Functions·Firestore·Gmail Secret·SMTP 연결을 한 번에 자체 점검합니다. 최근 메일 테스트 이력은 서버 상태를 다시 읽어 자동 재시도 결과까지 반영하며, 직접 재시도 쿨다운은 초 단위로 표시됩니다. 여러 곡 마스터링이 성능 보호로 멈춘 경우 HUD에서 위험 원인과 정상화 확인 진행도를 볼 수 있습니다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1607_incident_readiness_history_sync_performance_hud_smoke.js`
- 오류 신고 전체 배포: `npm run deploy:incident`
- 설정된 정적·회귀 검사: 330개.

# FoxBear AI Mastering Studio Pro v1.6.6

현재 릴리스는 실패한 실제 메일 테스트의 SMTP 시도 횟수와 다음 자동 재시도까지 남은 시간을 표시하고, 본인이 실행한 테스트만 제한적으로 다시 보낼 수 있게 합니다. 성능 위험이 확정되면 여러 곡 마스터링은 현재 곡을 마친 뒤 다음 곡 전에 자동 일시정지하며, 정상 상태가 안정적으로 확인된 뒤에만 이어서 실행합니다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1606_mail_retry_safe_batch_autopause_smoke.js`
- 오류 신고 전체 배포: `npm run deploy:incident`
- 설정된 정적·회귀 검사: 329개.

# FoxBear AI Mastering Studio Pro v1.6.5

현재 릴리스는 오류 자동신고 화면에서 서버 연결을 다시 확인하고 배포 명령을 바로 복사할 수 있게 합니다. 최근 실제 메일 테스트 5회의 결과를 기기 안에 보관하며, SMTP Secret·Gmail 인증·수신 거부·발송 한도·네트워크 오류를 서로 구분해 복구 방향을 표시합니다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1605_incident_mail_recovery_history_smoke.js`
- 오류 신고 전체 배포: `npm run deploy:incident`
- 설정된 정적·회귀 검사: 328개.

# FoxBear AI Mastering Studio Pro v1.6.4

현재 릴리스는 실제 메일 테스트를 막을 수 있던 Firebase Callable CSP 누락을 수정하고, Hosting CSP·Firestore 규칙·Functions를 `npm run deploy:incident` 한 번으로 함께 배포합니다. 메일 테스트 실패 시 배포 누락·CSP/네트워크 차단·인증·권한·서버 내부 오류를 구분해 코드와 복구 안내를 표시합니다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1604_incident_callable_csp_recovery_smoke.js`
- 오류 신고 전체 배포: `npm run deploy:incident`
- 설정된 정적·회귀 검사: 327개.

# FoxBear AI Mastering Studio Pro v1.6.3

현재 릴리스는 성능 상태를 두 번 연속 확인한 뒤에만 설정에 표시하고, 설정 안에서 정상·주의·위험과 현재 원인을 바로 확인할 수 있게 합니다. 동일한 위험 안내를 닫으면 30분 동안 반복하지 않으며, 토스트와 성능 안내가 모바일 화면에서 겹치지 않도록 위치를 자동 조정합니다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1603_health_acknowledgement_settings_summary_smoke.js`
- 설정된 정적·회귀 검사: 326개.

# FoxBear AI Mastering Studio Pro v1.6.2

현재 릴리스는 정상적인 불러오기·분석·마스터링 작업을 성능 오류와 구분하고, 실제 위험이 연속 확인될 때만 설정 아이콘의 작은 배지와 비차단형 안내를 표시합니다. 상태가 정상화되면 안내와 배지가 자동으로 사라지며 진단 팝업은 사용자가 직접 열 때만 표시됩니다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1602_nonblocking_health_design_polish_smoke.js`
- 설정된 정적·회귀 검사: 325개.

# FoxBear AI Mastering Studio Pro v1.6.1

현재 릴리스는 이전 버전에서 저장된 메모리 성능진단 자동 열림 상태를 제거하고, 일반 실행에서는 진단창을 숨긴 채 유지합니다. 설정이나 단축키로 연 진단창은 현재 세션에서만 표시되며, 명시적 자동 진단 모드는 런타임이 정상화되면 스스로 닫힙니다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1601_transient_performance_diagnostics_smoke.js`
- 설정된 정적·회귀 검사: 324개.

# FoxBear AI Mastering Studio Pro v1.6.0

현재 릴리스는 실제 메일 테스트를 익명 인증·서버 API·신고 대기열·SMTP 접수의 네 단계로 표시하고, 배포된 Functions 버전과 App Check 준비 상태를 설정 화면에서 확인할 수 있게 합니다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1600_incident_mail_pipeline_health_smoke.js`
- 오류 신고 서버 배포: `npm run deploy:incident`
- 설정된 정적·회귀 검사: 323개.

# FoxBear AI Mastering Studio Pro v1.5.99

현재 릴리스는 파일 불러오기 안내를 짧고 가볍게 정리하고, 실제 메일 테스트를 익명 인증 기반 Callable Functions 우선 경로로 전환해 Firestore 클라이언트 권한 오류를 우회합니다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1599_import_copy_callable_mail_recovery_smoke.js`
- 오류 신고 서버 배포: `npm run deploy:incident`
- 설정된 정적·회귀 검사: 322개.

# FoxBear AI Mastering Studio Pro v1.5.98

현재 릴리스는 정체 Worker를 취소한 뒤 분석·마스터링·15초 하이라이트 작업을 원본 트랙에서 안전하게 다시 구성하며, Worker별 진행률·무응답 시간·전송 메모리와 정상·주의·위험 상태를 표시합니다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- 전체 정적·행동 검사: `npm run check:static`
- 신규 회귀: `node qa/v1597_worker_recovery_guidance_stress_smoke.js`
- 설정된 정적·회귀 검사: 318개.

# FoxBear AI Mastering Studio Pro v1.5.96

현재 릴리스는 모든 주요 팝업의 포커스 복귀·Tab 순환·외부 클릭·Escape·모바일 스크롤 잠금을 공통화하고, 메모리 성능진단을 핵심 상태 카드와 기술 상세 로그로 분리합니다.

# FoxBear AI Mastering Studio Pro v1.5.95

## v1.5.95 Product introduction, support settings, and popup consistency

The version popup now explains the real product workflow and local-audio privacy in plain language. Incident reporting and memory diagnostics are available from the settings menu, close controls and outside-click dismissal are normalized across popup types, and the first real incident mail test no longer pre-reads a missing owner-only Firestore document.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- Run the full static/regression suite: `npm run check:static`
- Run the new regression: `node qa/v1595_popup_settings_mail_test_recovery_smoke.js`
- Configured static/regression checks: 316.

# FoxBear AI Mastering Studio Pro v1.5.94

## v1.5.94 AIFF fallback safety and Worker failure diagnostics

AIFF cancellation and decode timeout no longer enter synchronous fallback, oversized fallback workloads fail safely, Worker recent diagnostics retain failure details, and the release handoff permanently enforces the three-section result format.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

- Run the full static/regression suite: `npm run check:static`
- Run the new regression: `node qa/v1594_aiff_worker_reporting_contract_smoke.js`
- Configured static/regression checks: 315.

# FoxBear AI Mastering Studio Pro v1.5.93

## v1.5.93 External engine cancellation and operational export recovery

Optional WASM pitch engines now receive the active cancellation signal, Worker diagnostics expose transferred PCM memory and stalled jobs, and administrator CSV exports use the same resilient download lifecycle as mastered audio and reports.

- Run the full static/regression suite: `npm run check:static`
- Run the new regression: `node qa/v1593_external_engine_worker_transfer_admin_export_smoke.js`
- Inspect transfer/stall telemetry from `FoxBearMasteringGuard.getSnapshot().workerJobs`
- Review OpenAI integration priorities in `docs/OPENAI_API_OPPORTUNITIES_1.5.93.md`
- Configured static/regression checks: 314.

# FoxBear AI Mastering Studio Pro v1.5.92

## v1.5.92 CI-safe Python bytecode hygiene

Static QA now removes stale Python bytecode before execution, prevents every child Python process from writing new cache files, and performs cleanup after each check. GitHub cache actions also use the Node 24-based v5 runtime.

- Clean bytecode manually: `npm run qa:python:clean`
- Run the new regression: `node qa/v1592_python_bytecode_ci_hygiene_smoke.js`
- Run the full static/regression suite: `npm run check:static`
- Configured static/regression checks: 313.

# FoxBear AI Mastering Studio Pro v1.5.91

## v1.5.91 Cancellable audio pipeline and performance guards

Mastering cancellation now reaches decode, emergency analysis, pitch/BPM conversion, and master-preview conversion. Analysis and WSOLA use the common Worker lifecycle manager, while large tracks no longer fall back to expensive synchronous FFT or time-stretch processing that can freeze the page.

- Run the full static/regression suite: `npm run check:static`
- Run the new pipeline regression: `node qa/v1591_cancellable_audio_pipeline_performance_smoke.js`
- Inspect active Worker jobs from `FoxBearMasteringGuard.getSnapshot().workerJobs`
- Worker-declared failures are recorded as `failed`, not successful completions, and stale pitch progress cannot overwrite a replacement job.
- Configured static/regression checks: 312/312 PASS.

# FoxBear AI Mastering Studio Pro v1.5.90

## v1.5.90 Browser retry integrity and metadata-aware impact selection

Browser retry recovery now accepts only an actual passing result. A primary failure that is skipped, missing, or still failing during `--last-failed` retry blocks deployment. The changed-file selector also ignores generated release-metadata-only diffs while preserving conservative Browser QA for real runtime changes.

- Verify a retry summary: `npm run qa:browser:retry:verify`
- Preview impact selection: `npm run qa:browser:impact`
- Run the new regression: `node qa/v1590_browser_retry_integrity_metadata_scope_smoke.js`
- Configured static/regression checks: 311/311 PASS.

# FoxBear AI Mastering Studio Pro v1.5.89

## v1.5.89 Browser health-first gate and selector impact mapping

Browser QA now runs a Runtime Health sentinel before expensive visual and workflow scenarios. Shared CSS changes can be narrowed by changed selector tokens, while missing or unmapped evidence safely runs the complete suite. Repeated flaky cases also produce an issue-ready Markdown report.

- Run the Browser gate: `npm run qa:browser`
- Preview impact selection: `FOXBEAR_CHANGED_FILES="src/boot/service-worker-update-service.js" npm run qa:browser:impact`
- Run the new regression: `node qa/v1589_browser_health_first_selector_flaky_issues_smoke.js`
- Configured static/regression checks: 309/309 PASS.

# FoxBear AI Mastering Studio Pro v1.5.88

## v1.5.88 Browser impact selection and flaky history

Browser QA now decides its scope before installing dependencies or Chromium. Documentation/backend/static-only changes skip the browser job, mapped UI changes run only their related specs, and unknown or core changes safely run the full suite. Failed-only retry results also update a branch-scoped flaky-history cache so repeatedly recovered tests and unresolved cases remain visible across workflow runs.

- Preview impact selection: `FOXBEAR_CHANGED_FILES="src/ui/download-dialog-view.js" npm run qa:browser:impact`
- Run the new regression: `node qa/v1588_browser_impact_flaky_history_smoke.js`
- Configured static/regression checks: 307/307 PASS.

# FoxBear AI Mastering Studio Pro v1.5.87

## v1.5.87 Browser Retry Recovery Reporting

Browser QA now preserves a concise comparison between the primary failure and the failed-only retry. Recovered flaky cases, repeated failures, and missing retry results are written to durable artifacts and the GitHub Actions summary. Runtime Health header and PWA recovery contracts are also checked before Chromium starts.

# FoxBear AI Mastering Studio Pro v1.5.86

## v1.5.86 브라우저 실패 항목 재실행 및 fixture 계약 검사

- GitHub Actions에서 Chromium과 시스템 패키지를 설치하기 전에 브라우저 fixture 사전 검사를 실행합니다.
- 공통 시각 fixture가 실제 HUD 마크업, 다운로드 UI 생성 코드, CSS 선택자와 일치하는지 정적으로 확인합니다.
- 첫 Browser gate가 실패하면 Playwright `--last-failed` 상태로 실패 케이스만 한 번 다시 실행합니다.
- 재실행 전에 최초 JSON 결과, 정적 서버 로그, last-run 상태를 보존해 재시도로 첫 실패 증거가 사라지지 않습니다.
- Playwright 임시 artifact와 영구 진단 결과 경로를 분리해 재실행 정리 과정의 데이터 손실을 차단합니다.
- 구성된 정적·회귀 검사는 302개이며 실제 Chromium 결과는 GitHub Browser release gate에서 최종 확인합니다.

## v1.5.85 브라우저 fixture 사전 검사 및 원인 그룹화

- 대량 마스터링 HUD와 모바일 다운로드 시트의 시각 테스트 fixture를 공통 빌더로 통합했습니다.
- 공통 빌더는 `createElement`, `textContent`, `replaceChildren`만 사용하고 진행률·선택 상태 ARIA도 함께 구성합니다.
- 실제 Chromium을 시작하기 전에 브라우저 spec 전체를 검사해 위험한 HTML 문자열 sink와 문자열 기반 `evaluate`를 즉시 차단합니다.
- 동일한 원인으로 여러 프로젝트·viewport가 실패하면 개별 실패만 나열하지 않고 하나의 원인 그룹, 실패 수, 수정 명령을 먼저 표시합니다.
- 구성된 정적·회귀 검사는 299개이며 실제 Chromium 재실행은 설치된 Playwright 환경에서 최종 확인합니다.

## v1.5.84 Trusted Types 브라우저 게이트 복구

- 대량 마스터링 시각 테스트가 `innerHTML` 문자열 주입 없이 DOM 요소를 직접 생성하도록 변경했습니다.
- 모바일 다운로드 시트 시각 테스트도 `createElement`, `textContent`, `append` 기반으로 재구성해 Trusted Types 강제 정책과 호환됩니다.
- `src`뿐 아니라 `qa/browser` 전체에서 위험한 HTML 주입 sink를 정적 검사해 같은 CI 실패가 다시 들어오지 못하게 했습니다.
- v1.5.84 전용 회귀 검사가 두 문제 spec의 안전한 fixture 구성과 원자적 행 교체를 확인합니다.
- 구성된 정적·회귀 검사 295/295를 통과했으며 실제 Chromium 게이트 재실행은 Playwright 설치 환경에서 최종 확인합니다.


## v1.5.83 Worker·Dock 소유권 및 진단 강화

- 트랙 전환 중 이전 Dock 오디오의 재생 위치가 새 트랙 transport lease로 저장되지 않도록 오디오 소유권을 검증합니다.
- 교차 전환에서 비활성 이전 오디오의 `pause`·`timeupdate` 이벤트가 현재 MediaSession 메타데이터와 위치를 덮지 못합니다.
- Worker 작업 서비스가 활성 작업 수, 단계, 진행률, 예상 남은 시간, 최근 완료·취소 이력을 진단으로 제공합니다.
- 트랙 자원 해제는 미리듣기뿐 아니라 진행 중인 마스터링 Worker도 방어적으로 취소합니다.
- 재생 연결 해제 시 오디오 요소의 트랙 ID와 절대 시작 위치 dataset을 제거해 재사용 시 오래된 소유권이 남지 않습니다.
- 구성된 정적·회귀 검사는 294개이며 실제 MediaSession 잠금화면 표시는 설치 브라우저·기기에서 최종 확인합니다.

## v1.5.82 마스터링 취소 전파·복귀 재생 회복

- 품질 게이트 자동 안전 재렌더 중 사용자가 취소하거나 배치가 중단되면 첫 렌더를 성공 결과로 계속 커밋하지 않습니다.
- 취소 시 안전 프로필로 바뀐 설정과 중간 리포트를 원래 첫 렌더 상태로 복원하고 상위 마스터링 작업에 `AbortError`를 전달합니다.
- 화면 잠금·통화·앱 전환 직후 첫 재생이 일시적인 `AbortError`로 실패하면 현재 요청 소유권이 유지된 경우에만 오디오 그래프 복구 후 한 번 재시도합니다.
- 새 소스 전환·정지·UI 제거로 무효화된 재생 요청은 재시도하지 않습니다.
- 로컬 파형 재생과 A/B 전환 실패 복구도 공통 재생 소유권 서비스로 통합했습니다.
- 구성된 정적·회귀 검사는 293개이며 실제 화면 잠금·통화 복귀는 설치 브라우저와 모바일 기기에서 최종 확인합니다.

## v1.5.81 마스터 미리듣기 취소·네이티브 결과 격리

- 15초 하이라이트 생성의 디코딩·DSP·파이널라이저·WAV 워커를 하나의 취소 신호와 작업 세대로 관리합니다.
- 설정 변경·트랙 삭제·큐 초기화·자원 해제 시 진행 중인 미리듣기 작업을 즉시 무효화합니다.
- 오래된 작업은 Blob URL, 리포트, Dock 자동재생, 전역 busy 상태를 새 작업 위에 덮어쓰지 못합니다.
- 커밋 직전 소유권을 잃은 임시 Blob URL도 즉시 회수합니다.
- 닫히거나 교체된 저장 도움창으로 늦게 돌아온 공유·파일 선택기 실패는 토스트와 UI 상태를 다시 변경하지 않습니다.
- 구성된 정적·회귀 검사는 292/292 통과했습니다. 실제 네이티브 창과 장시간 메모리 회수는 설치 브라우저·기기에서 최종 확인합니다.

## v1.5.80 모바일 복귀·MediaSession·포커스 복구

- 화면 잠금·통화·앱 전환 뒤 WebKit의 `interrupted` AudioContext를 다시 재개합니다.
- 복귀 이벤트와 재생 제스처가 동시에 들어와도 실제 `resume()`은 한 번만 실행합니다.
- 모바일 백그라운드 전환으로 저장한 Dock 위치와 재생 의도는 최대 12시간 유지합니다.
- 트랙 제거 후 남아 있던 MediaSession 메타데이터와 재생·정지·탐색 핸들러를 정리합니다.
- 네이티브 공유·직접 저장이 끝나면 실행 버튼으로 포커스를 복원하고 작업 중 모든 저장 도움 제어를 잠급니다.
- 구성된 정적·회귀 검사는 290/290 통과했으며 실제 잠금·통화·공유창은 기기 환경에서 최종 확인합니다.

## v1.5.79 미리듣기 요청 소유권 및 다운로드 정리

- 닫힌 미리듣기 UI의 지연된 `play()` 완료가 분리된 오디오를 다시 재생하지 못하도록 요청 세대를 격리합니다.
- 새 재생·정지·크로스페이드가 시작되면 이전 비동기 완료 결과는 현재 오디오 상태를 변경하지 않습니다.
- 저장 도움의 공유/직접 저장은 한 번에 하나만 실행되며 버튼과 패널에 `aria-busy` 상태를 제공합니다.
- 일반 페이지 종료 시 대기 중인 다운로드 Blob URL과 타이머를 일괄 회수하고 BFCache 이동에서는 유지합니다.
- VM 회귀 검사에서 지연 재생, 분리 오디오, 공유 버튼 연타, BFCache 및 페이지 종료 정리를 검증합니다.
- 구성된 정적·회귀 검사는 289/289 통과했습니다. 실제 네이티브 공유창과 파일 선택기는 기기 환경에서 추가 확인합니다.

## v1.5.78 재생 전환 레이스 복구

- 빠르게 재생·정지를 반복해도 취소된 볼륨 페이드 Promise가 영구 대기 상태로 남지 않습니다.
- 새 재생 요청이 들어온 뒤 이전 페이드아웃 완료 로직이 오디오를 뒤늦게 정지시키는 문제를 차단합니다.
- 교차 재생이 새 전환으로 대체되면 오래된 완료 콜백은 이전 소스를 정지하거나 볼륨을 덮어쓰지 않습니다.
- 오디오 요소에 연결된 RAF와 페이드 컨트롤러는 완료·취소 시 즉시 해제됩니다.
- VM 회귀 검사에서 페이드 교체, 빠른 일시정지/재생, 취소된 크로스페이드를 검증합니다.

## v1.5.77 런타임 자원 생명주기 복구

- DOM에서 제거된 오디오의 FFT 이벤트·캡처 스트림·분석 노드·AudioContext를 명시적으로 정리합니다.
- 비교 팝업 타이머와 미리듣기/Dock 오디오 등록을 UI 제거 시 즉시 해제합니다.
- 일반 종료와 BFCache 이동을 분리하고 모바일 visual viewport 변화에 패널 위치를 다시 계산합니다.

## v1.5.76 원자적 릴리스 동기화 및 의존성 진단

- 버전 동기화는 임시 스테이징 복사본에서 SRI와 메타데이터 검증을 모두 통과한 뒤 원본에 반영합니다.
- `npm run version:dry-run`으로 실제 파일을 바꾸지 않고 변경 예정 파일을 확인할 수 있습니다.
- 루트와 Functions의 `package-lock.json` 버전을 함께 동기화합니다.
- `npm run dependencies:check`는 Playwright, Chromium, Functions 패키지 설치 상태와 lockfile 불일치를 구분해 안내합니다.
- 스테이징 중 Python/SRI 실행이 실패해도 원본 릴리스 파일이 부분 수정 상태로 남지 않습니다.
- 추적 중이던 Python `__pycache__`를 제거하고 향후 바이트코드가 Git·패치에 다시 들어오지 않도록 차단합니다.

## v1.5.75 의존성 설치 전 정적 QA 안정화

- Playwright가 아직 설치되지 않아도 브라우저 보조 모듈과 릴리스 정적 검사를 불러올 수 있습니다.
- 실제 브라우저 QA를 시작할 때만 Playwright CLI를 확인하며, 누락 시 `npm ci`와 Chromium 설치 명령을 안내합니다.
- Playwright 설정 파일은 정적 메타데이터 검사에서는 안전한 대체 장치 정의를 사용하고, 실제 설치 환경에서는 공식 장치 프로필을 그대로 사용합니다.

Release metadata:

```text
product: 1.5.85
build: browser-fixture-preflight-root-cause-diagnostics
asset generation: 1.5.85-browser-fixture-preflight-root-cause-diagnostics
service worker cache: foxbear-shell-v1.5.85-browser-fixture-preflight-root-cause-diagnostics
```

## v1.5.74 다중 작업 제어 및 모바일 다운로드

- 현재 곡을 끝낸 뒤 다음 곡 직전에 일시정지하고 계속 진행할 수 있습니다.
- 현재 곡만 건너뛰거나 아직 시작하지 않은 곡의 순서를 위·아래로 변경할 수 있습니다.
- 배치 완료 후 완료·실패·건너뜀·취소·총 소요 시간 요약을 표시합니다.
- 모바일 다운로드 화면은 하단 전체 시트로 열리고 MP3/WAV 선택 후 세부 품질을 고릅니다.
- 다운로드·공유 버튼은 모바일 화면 하단에 고정되어 작은 화면에서도 가려지지 않습니다.


## v1.5.73 다중 마스터링 제어 및 예상 시간

- 진행 중 다중 마스터링을 안전하게 취소할 수 있습니다.
- 성공한 곡은 유지하고 실패 곡만 다시 실행할 수 있습니다.
- 현재 곡 남은 시간, 곡별 완료 예상 시간, 전체 예상 남은 시간을 목록에서 확인합니다.
- 전체·현재 진행·완료·실패·취소·대기 결과 필터를 제공합니다.
- 데스크톱과 모바일 대량 HUD의 화면 넘침·버튼 가림을 브라우저 회귀 계약으로 검사합니다.


## v1.5.72 다중 곡 작업 흐름 및 관리자 UI

- 여러 곡 분석 완료 후 목록 팝업을 자동으로 숨기고 전체 마스터링 버튼으로 이동합니다.
- 여러 곡 마스터링은 단일 HUD 대신 곡 목록에서 현재 진행률과 완료·오류 결과를 표시합니다.
- 관리자 간소화 보기, 미확인 테스트 보존형 정리, 감사 로그 검색·CSV, 모바일 카드 상세 화면을 제공합니다.


## v1.5.70 mail verification operations

- Automatic warnings for untested, stale, failed, and 30-minute receipt-unconfirmed mail tests.
- Administrator statistics, troubleshooting guidance, searchable test history, and CSV export.
- Real Gmail inbox or spam placement still requires explicit administrator confirmation after deployment.


## v1.5.69 핵심 변경

- 실제 메일 테스트 SMTP 접수 이력과 받은편지함·스팸함 실수신 확인 기록
- 7일 미검증 경고와 관리자 테스트 이력 표
- 전체 운영 메일의 공통 AI마스터링 스튜디오 브랜드 템플릿


- 관리자 작업의 시작·거부·완료·실패를 개인정보를 줄인 감사 로그로 기록합니다.
- 기본 보조 웹훅의 일시 오류를 제한 재시도하고 선택형 보조 URL로 장애 전환합니다.
- 배포 상태 검증이 실제 Firestore 복합 인덱스와 최근 운영 점검 상태를 확인합니다.
- 운영 이력은 상태·원인 필터와 페이지 단위 더 보기를 지원합니다.

## v1.5.66 핵심 변경

- 관리자 재전송·일괄 복구·경보 테스트·배포 검증 요청에 서버 실행 임대와 쿨다운을 적용합니다.
- 관리자 화면에서 보조 HTTPS 웹훅을 테스트하고 최근 운영 이력의 원인 코드와 권장 조치를 상세 확인합니다.
- 화면과 Functions 버전이 다르거나 배포 검증이 오래되면 자동 상태 검증을 요청합니다.

## v1.5.64 핵심 변경

- 15분마다 문제 보고 메일 시스템을 자체 점검합니다.
- Gmail 앱 비밀번호 형식과 실제 SMTP 인증·연결 상태를 관리자 화면에 표시합니다.
- 장기 미발송, 최종 실패 누적, 요약 실패, 예약 카운터 정체를 주의/위험으로 분류합니다.
- SMTP가 정상일 때 운영 경보와 복구 메일을 자동 발송합니다.
- 관리자 오늘 오류 수를 한국 시간(KST) 기준 서버 집계로 보정했습니다.

## v1.5.63 핵심 변경

- 문제 보고 메일 한도를 한국 시간 날짜로 계산하고, 한도 초과 신고를 다음 날 자동 이월합니다.
- 중단된 메일 예약 카운터를 신고별 소유권으로 회수해 장시간 발송 정지를 방지합니다.
- 일일 요약을 500건 단위로 집계하고 최근 3일 미발송 요약을 반복 복구합니다.
- SMTP 수신 승인과 Gmail 앱 비밀번호 형식을 서버에서 엄격히 확인합니다.

## v1.5.62 핵심 변경

- 문제 보고 문서를 처음부터 `pending` 메일 큐로 기록하고 상태별 감시 쿼리로 누락 신고를 회수합니다.
- 메일 작업 임대 ID와 완료 fencing을 적용해 만료 작업이 최신 재시도 상태를 덮어쓰지 못하게 했습니다.
- 최대 재시도 실패는 `dead-letter`로 분리하고 관리자 화면에서 강제 재전송할 수 있습니다.
- 전체 릴리스 ZIP과 누적 덮어쓰기 ZIP은 버전·인수인계 검사가 통과해야만 생성됩니다.

## v1.5.60 핵심 변경

- 카카오톡 링크 진입 시 외부 브라우저 안내로 강제 이동하지 않고 FoxBear 작업 화면을 우선 엽니다.
- 잘못된 경로 복구는 프로젝트 루트의 `index.html`로 직접 이동해 404 반복을 방지합니다.
- 카카오 메모리 압력이 높으면 디코딩 전과 처리 단계별로 Fast·경량 피크·압축 파형 경로를 자동 적용합니다.

## Historical patch: v1.5.57 Modal Close Consistency

프로그램 정보, 기능, 미리듣기, 관리자, 다운로드, AI 분석 완료, 저장 도움, 선택 팝업의 우측 상단 닫기 버튼을 동일한 크기·위치·아이콘·포커스 규칙으로 통합했습니다. 동적 팝업은 ESC 닫기와 기존 조작 위치로의 포커스 복귀도 지원합니다.

## Previous patch: v1.5.52 CI Parallel Release Gate

GitHub Actions 정적 QA와 Playwright 브라우저 QA를 병렬 job으로 실행하고, 새 push가 오면 이전 Pages 실행을 취소합니다. Playwright Chromium 다운로드 캐시와 npm 오프라인 우선 설치를 사용해 반복 빌드 대기시간을 줄입니다.


## Historical patch: v1.5.51 CI Runtime Contract Hardening

부팅 필수 모듈, 자산 버전, 서비스워커 캐시 세대가 서로 어긋난 상태로 배포되지 않도록 패키징 전 계약 검사를 강화합니다.

Release metadata:

```text
product: 1.5.49
build: stale-shell-generation-recovery
asset generation: 1.5.49-stale-shell-generation-recovery
service worker cache: foxbear-shell-v1.5.49-stale-shell-generation-recovery
```

## CI and local Git hooks

`npm ci` never installs Git hooks. GitHub Actions uses `npm ci --ignore-scripts`, and the optional local pre-commit hook is enabled only when a developer explicitly runs `npm run hooks:install`.

## Historical patch: v1.5.44 Gesture-Safe Individual Export Queue

여러 파일을 자동으로 연속 다운로드하지 않고, 파일을 미리 검증한 뒤 사용자가 `다음 파일 저장`을 한 번씩 눌러 저장합니다. 일반 Chromium은 직접 저장창, 일반 브라우저는 다운로드, 카카오 등 제한 브라우저는 지원되는 경우 파일 공유창을 사용합니다. 실패 파일은 다시 시도하거나 건너뛸 수 있으며, 큐 작업 중에는 마스터링·ZIP·서비스워커 교체가 차단됩니다.

Release metadata:

```text
product: 1.5.44
build: export-queue-gesture-safety
asset generation: 1.5.44-export-queue-gesture-safety
service worker cache: foxbear-shell-v1.5.44-export-queue-gesture-safety
```

Verification:

```text
static QA target: export queue order, retry/skip/cancel, runtime entry parity
manual browser target: repeated save prompts, multi-download blocking, Web Share, background return
```

## Previous patch: v1.5.27 Device Glyph and SRI Hardening

상단의 `모바일 · PC 호환` 앞에 청록색 데스크톱과 분홍색 스마트폰 라인 아이콘을 유지하고, 헤더 아래 경계선은 제거했습니다. v1.5.26에는 아이콘 HTML이 있어도 관리자 상태 확인 과정에서 `textContent`가 내부 아이콘 요소를 지우는 코드 꼬임이 있었으며, 이번 패치에서 구조를 안전하게 다시 그리도록 수정했습니다.

릴리스 점검 중 v1.5.26 ZIP의 마지막 CSS `<link>`에 `/ integrity=`가 들어간 잘못된 SRI 태그도 발견했습니다. SRI 갱신 도구가 기존 해시만 교체하고 잘못된 슬래시 위치는 복구하지 못했던 문제로, 갱신기와 검증기를 함께 강화했습니다.

Release metadata:

```text
product: 1.5.27
build: device-glyph-sri-hardening
asset generation: 1.5.27-device-glyph-sri-hardening
service worker cache: foxbear-shell-v1.5.27-device-glyph-sri-hardening
```

## Previous patch: v1.5.24 Responsive Preview Control and Visible Dialog Readiness

데스크톱과 모바일의 실제 표시 재생 버튼을 구분하는 반응형 계약은 그대로 유지됩니다.

## Previous patch: v1.5.23 Deterministic Preview Playback Readiness

단일 파일 분석 완료 시 자동 추천 팝업을 해당 E2E 시나리오에서만 격리하는 계약은 유지됩니다. v1.5.24는 그 위에 실제 표시 상태와 반응형 재생 컨트롤 선택을 추가합니다.

## Previous patch: v1.5.22 Header Signature and Uninterrupted Preview Routing

상단의 버전 정보, PC·모바일 호환, DESIGN BY 표시는 카드 테두리를 제거하고 화면에 새겨진 듯한 한 줄 시그니처로 정리했습니다. 설정 버튼은 작은 원형 기어로 축소해 제작자 문구와 소개 글이 아래로 밀리지 않도록 했습니다.

스마트폰·노트북·모노·스튜디오 전환은 더 이상 재생 중인 오디오 요소를 삭제하고 다시 만들지 않습니다. 하나의 `MediaElementSource`에 네 출력 경로를 미리 구성하고 Gain만 120ms 동안 교차 전환하므로 재생 위치와 재생 상태를 유지합니다.

Release metadata:

```text
product: 1.5.22
build: header-preview-routing-polish
asset generation: 1.5.22-header-preview-routing-polish
service worker cache: foxbear-shell-v1.5.22-header-preview-routing-polish
```

## Previous patch: v1.5.21 History and CSP Console Contract Fix

meta CSP 경고 제거와 history sentinel 왕복 검증은 그대로 포함됩니다.

 Idempotent PWA Cache Warm

서비스워커는 현재 릴리스 캐시에 없는 자산만 보충하며, 반복 warm은 추가 fetch 0회를 요구합니다. 일반 브라우저 테스트에서는 자동 전체 warm을 생략하고 서비스워커 전용 경로에서 명시적으로 검증합니다.

## Previous patch: v1.5.19 CI Runtime Isolation and Package Hardening

Firebase 선택 원격 통신 격리, 동일 출처 요청 실패·페이지 예외·콘솔 오류 분리, 로컬 서버 ownership probe, 아카이브 보안 검증은 그대로 포함됩니다.

## Previous patch: v1.5.18 CI Diagnostics and PWA Readiness

v1.5.18의 서비스워커 준비 최적화, Playwright 실패 요약, 정적 서버 로그 보존, 패키지 임시 산출물 차단은 그대로 포함됩니다.

## Previous patch: v1.5.17 Browser Contract Fix

수동 Wake Lock 요청 유지, Trusted Types 기반 서비스워커 등록, 헤더 설정 버튼 순서 수정은 그대로 포함됩니다.

## Previous patch: v1.5.16 E2E Static Server Pipe Deadlock Fix

GitHub Actions에서 첫 브라우저 테스트 몇 개만 통과한 뒤 모든 `page.goto()`가 20초 타임아웃으로 실패하던 문제를 수정했습니다. 로컬 Python 정적 서버의 요청 로그를 파이프로 수집하면서 Playwright를 `spawnSync`로 실행해 Node 이벤트 루프가 멈췄고, 로그 파이프가 가득 차면 서버 자체가 응답을 중단하는 구조가 원인이었습니다.

Playwright 실행을 비동기 자식 프로세스로 전환해 서버 로그를 계속 비우도록 했으며, 실패 시 정적 서버 로그 tail을 출력합니다. 1,800회 연속 요청 회귀 테스트로 일반적인 파이프 버퍼 용량을 넘어선 뒤에도 서버가 정상 응답하는 것을 검증합니다.

Release metadata:

```text
product: 1.5.16
build: e2e-server-pipe-deadlock-fix
asset generation: 1.5.16-e2e-server-pipe-deadlock-fix
service worker cache: foxbear-shell-v1.5.16-e2e-server-pipe-deadlock-fix
```

## Previous patch: v1.5.15 E2E Runtime Classification

Runtime Health의 선택적 Firebase/Firestore 네트워크 오류 분류, Wake Lock 및 서비스워커 E2E 안정화 변경은 그대로 포함됩니다.

## Previous patch: v1.5.12 CI Runtime Readiness and Node 24 Actions

Playwright now waits for the application-owned `FoxBearRuntimeHealth.appReady` state instead of treating creation of the health object as boot completion. Service-worker readiness is bounded and explicit, Wake Lock mocks use a fresh sentinel per request, and CI concurrency is capped at two browser workers. GitHub workflow JavaScript actions now use Node 24-based v6 releases.

Release metadata:

```text
product: 1.5.12
build: ci-runtime-readiness
asset generation: 1.5.12-ci-runtime-readiness
service worker cache: foxbear-shell-v1.5.12-ci-runtime-readiness
```

## Previous patch: v1.5.11 AudioContext Lifecycle and CI Navigation Stability

Web Audio context ownership is centralized through `FoxBearAudioContextManager`. Realtime mastering preview, difference A/B, preview translation, spectrum visualization, and decode operations now expose purpose/state diagnostics and release contexts through a common lifecycle.

The real-browser release gate no longer waits for global `networkidle`. It navigates to `domcontentloaded` and then waits for `FoxBearRuntimeHealth.appReady`, avoiding CI timeouts caused by optional Firebase, service-worker, or other persistent network activity. Failed GitHub Actions runs upload Playwright diagnostics automatically.

Release metadata:

```text
product: 1.5.11
build: audio-context-ci-stability
asset generation: 1.5.11-audio-context-ci-stability
service worker cache: foxbear-shell-v1.5.11-audio-context-ci-stability
```

## Previous patch: v1.5.10 Header Settings Relocation

The Settings trigger remains beside the `DESIGNED BY` card, with a body-level viewport-safe panel and independent Bulk HUD recovery control.

## Previous patch: v1.5.9 Version Display and Cache Recovery

Visible release labels remain synchronized from `FoxBearBuildInfo`, and stale PWA HTML recovery remains active.

## Previous patch: v1.5.8 PCM and ZIP Memory Hardening

Completed masters use `release-after-encode`; ZIP export uses STORE packaging and working-set limits with per-track fallback. Those memory protections remain active in v1.5.9.

## Previous patch: v1.5.6 Export Progress Recovery

Compatibility note: previous maintenance layer `v1.5.5 Update Safety` remains carried forward.

This patch adds a visible ZIP/export progress panel and `src/download/export-progress-view.js`, exposed as `FoxBearExportProgressView`, so large batch exports show readiness, memory warnings, ZIP generation progress, validation success/failure, and a fallback `곡별 다운로드 위치 보기` action. Boot-critical cache keys moved to `h=boot-sri-v156`, Update Safety moved to `h=update-safety-v156`, and the service worker shell cache generation is now `foxbear-shell-v1.5.6-export-progress-recovery`.

Console checks after deployment:

```js
FoxBearExportProgressView.getSnapshot()
FoxBearExportGuard.getReadiness()
FoxBearUpdateSafety.getReport()
```

## Previous patch: v1.5.5 Update Safety

Compatibility note: previous maintenance layer `v1.5.4 Boot SRI Recovery` remains carried forward.

This patch adds `src/boot/update-safety-service.js`, exposed as `FoxBearUpdateSafety`, to inventory local scripts/styles, detect boot cache-bust drift, classify SRI/load-block risk, and provide a copyable recovery plan. Boot-critical assets now use `h=boot-sri-v155`, the service worker shell cache generation is `foxbear-shell-v1.5.5-update-safety`, and service worker cache purge can be requested via `FOXBEAR_PURGE_CACHES` before unregister/reload recovery.

Console checks after deployment:

```js
FoxBearUpdateSafety.getReport()
FoxBearUpdateSafety.getAssetInventory()
FoxBearUpdateSafety.copyReport()
```

## Previous patch: v1.5.4 Boot SRI Recovery

Compatibility note: previous maintenance layer `v1.5.3 Bulk HUD Visibility + Inline Master All` remains carried forward.

This hotfix targets the reported boot-stall case where `src/boot/performance-diagnostics.js` and `src/app.js` can be blocked by stale cached bytes that no longer match the current SRI hash. The boot-critical scripts now use a fresh `h=boot-sri-v154` cache-bust key, the service worker shell cache generation was bumped to `foxbear-shell-v1.5.4-boot-sri-recovery`, and the Runtime Health recovery action now clears broader app/workbox/precache caches while updating and unregistering service workers before a hard reload.

## Previous patch: v1.5.3 Bulk HUD Visibility + Inline Master All

Compatibility note: previous maintenance layer `v1.5.2 Export Guard + Low Memory UX` remains carried forward.

This patch refines the large bulk import/mastering HUD: `접기` is renamed to `숨김`, hidden HUDs can be restored from a small `보이기` button beside the floating settings gear, and the HUD now exposes an inline `전체 마스터링` action that delegates to the existing main full-mastering button. It keeps the existing `1.4.26-wake-lock-state-sync` runtime/cache key for deployment compatibility while documenting the current maintenance layer as `v1.5.3`.

## Export Guard + Low Memory UX additions

- Added `src/download/export-guard-service.js` as the Export Guard layer for ZIP/export readiness checks.
- `downloadZip()` now builds a validated ZIP export plan before compression and validates the generated ZIP Blob before download.
- Added `FoxBearExportGuard.getReadiness()` and `FoxBearExportGuard.getDiagnostics()` for browser-console checks during 35-track export testing.
- Low-memory and large-output conditions now produce user-facing advice before/after batch memory sweeps and before ZIP export.
- The 35-track Playwright deep scenario now inspects Export Guard readiness before export.
- Added `qa/v152_export_guard_low_memory_smoke.js` to lock the new export validation and low-memory UX surface.

## Real Browser Automation additions

- v1.5.1 browser QA remains available through `npm run qa:browser`, `npm run qa:browser:external`, and `npm run qa:browser:deep`.

- Added `playwright.config.js` with desktop Chromium and mobile PWA-style Chromium projects.
- Added `qa/browser/run-browser-e2e.js`, which starts a local static server and then runs Playwright specs.
- Added shared browser helpers in `qa/browser/helpers/foxbear-e2e-helpers.js`, including synthetic WAV fixture generation, Runtime Health assertions, Wake Lock mocks, and service worker snapshots.
- Expanded browser specs for Runtime Health, console errors, PWA back navigation resilience, Wake Lock request/release mocking, service worker update checks, and 35-track import/master/export flow coverage.
- Added `npm run qa:browser`, `npm run qa:browser:external`, `npm run qa:browser:deep`, and `npm run qa:browser:install`.
- Added `qa/v151_real_browser_automation_smoke.js` to keep the browser automation surface checked by the default static QA suite.

## Engine Quality Gate additions

- Upgraded `src/audio/quality-gate-service.js` to QualityGate v2.1 with short-term LUFS checks, limiter overcorrection detection, de-esser overcorrection detection, multiband overcorrection detection, mobile translation correction amount checks, and risk flag summaries.
- Added short-term LUFS telemetry to `src/workers/master-finalizer.worker.js` and the in-app finalizer fallback.
- Extended `createMasterReport()` with `loudness.shortTermBefore`, `loudness.shortTermAfter`, and a 3s/1s short-term LUFS standard note.
- Added `src/audio/reference-profile-service.js` as the 64/96-band log-spectrum profile helper foundation for the next reference-matching upgrade.
- Preserved v1.4.29 memory policy behavior: completed download Blobs remain available while non-selected mastered AudioBuffers are released.
- Added `qa/v150_engine_quality_gate_smoke.js` to lock the new engine QA surface.

## v1.4.29 Memory Stabilization carry-forward

- Upgraded `src/audio/memory-guard-service.js` to v1.4.29 with a large-batch retention policy for completed mastered AudioBuffers.
- Added dynamic memory policy options for large batches, low-memory/mobile environments, selected-track retention, recent-track retention, and mastered-buffer byte budgets.
- Added `FoxBearMemoryGuard.diagnose()` for before/after memory diagnostics and policy sweep reporting from the browser console.
- Added automatic post-batch memory sweep after selected/all-track mastering batches complete.
- Added per-track performance memory metadata: `performanceInfo.masteredBufferBytes` and `performanceInfo.outBlobBytes`.
- Kept completed `outBlob` downloads and mastered URLs while releasing non-selected completed `masteredBuffer` objects according to policy.
- Preserved the v1.4.28 app slim-down orchestration boundaries:
  - `src/audio/import-queue-service.js`
  - `src/audio/mastering-orchestrator-service.js`
  - `src/audio/analysis-cache-service.js`
  - `src/audio/quality-gate-service.js`
  - `src/state/track-lifecycle-service.js`
- Added `qa/v1429_memory_stabilization_smoke.js` to lock the memory policy, diagnostics bridge, and docs.

## Runtime compatibility

The current release metadata is synchronized from `package.json`:

```text
1.5.7
1.5.7-release-foundation
```

Use `npm run version:sync` after a version/build change and `npm run version:check` before release. Cache-only changes use build/asset/revision fields rather than a second semantic product version.

## Memory diagnostics

After a large batch, open the browser console and run:

```js
FoxBearMemoryGuard.getSnapshot()
```

To force a diagnostic sweep and see before/after retention data:

```js
FoxBearMemoryGuard.diagnose()
```

The snapshot now reports retained mastered-buffer count/bytes, Blob bytes, preview Blob bytes, policy budget, low-memory mode, pressure level, released completed buffer count, and the largest retained mastered buffers.

## QA

Install reproducible dependencies and Chromium on a new machine:

```bash
npm ci
npm run qa:browser:install
```

Run fast static QA during development:

```bash
npm run check
```

Run the required release gate before packaging/deploying:

```bash
npm run check:release
```

For an already deployed URL:

```bash
FOXBEAR_E2E_URL=https://example.com npm run qa:browser:external
```

For the longer 35-track master/export path, run:

```bash
npm run qa:browser:deep
```

Playwright is pinned in `devDependencies`; `npm ci` and `package-lock.json` make the test runner reproducible.

## Historical notes

Older v1.4.21-v1.4.26 accumulated notes are preserved in:

```text
docs/history/README_legacy_v1.4.21_to_v1.4.26.md
docs/history/HANDOFF_legacy_v1.4.21_to_v1.4.26.md
docs/history/QA_REPORT_legacy_v1.4.21_to_v1.4.26.md
```

## Current invariant summary

- v1.5.7 detail-only FFT remains active; Dock mini FFT/renderMini stay removed. The decision is recorded in `docs/decisions/0001-dock-fft-removal.md`.
- Performance diagnostics can be opened with `?perf=1` or `Ctrl/Command + Alt + P`, and the diagnostics panel keeps a 복사 action for support reports.
- Download dialog micro hint and first-screen declutter remain active for Kakao/in-app and mobile download flows.
- Bulk Import HUD and Bulk Mastering HUD continuity remain active for 2+ track workflows.

## v1.5.3 Bulk HUD visibility and full-mastering action

- Renamed the large HUD toggle copy from `접기` to `숨김` so it clearly means hiding the whole large HUD.
- Added a small `보이기` restore button next to the floating settings gear; it appears only while a hidden bulk HUD batch is still restorable.
- Added `전체 마스터링` inside the large HUD and wired it to the existing main `#masterAllBtn` flow, with the same disabled/busy behavior.
- Added targeted stale-cache keys for the changed HUD/mobile/app assets and mirrored them in the service worker precache.
- Added `qa/v153_bulk_hud_visibility_masterall_smoke.js` to lock the UX and packaging surface.
