# v1.6.46 project notes

- `auth/network-request-failed` occurs before the `siteAdmins/{UID}` read; do not change administrator documents to diagnose this stage.
- Keep `authDomain` limited to the two approved Firebase Hosting domains and use the current host when it matches.
- Keep one redirect fallback attempt only; never allow an authentication redirect loop.
- Diagnostics may contain error code and origins but must not retain query strings, OAuth parameters, ID tokens, or account credentials.
- Keep App Check disabled and preserve the narrow Trusted Types gapi allowlist.

# v1.6.45 project notes

- `cmd.exe` is not a FoxBear source file and must never be committed, hosted, or archived.
- On Windows, do not directly spawn `npm.cmd`; run the npm CLI entry with the active Node executable.
- App Check is intentionally disabled and removed from the client runtime. Administrator authorization remains Google Auth plus Firestore Rules.
- Do not remove the exact Firebase Auth gapi module Trusted Types allowance introduced in v1.6.44.
- Preserve `DELIVERY_RULES.md` and the two-ZIP delivery contract.

# v1.6.43 project notes

- Keep `require-trusted-types-for 'script'`; do not disable Trusted Types to make Google Auth work.
- The `default` policy may allow only the exact Firebase Auth gapi loader, existing reCAPTCHA paths, and controlled same-origin script directories.
- Keep document CSP and Firebase Hosting header CSP synchronized.
- Preserve `same-origin-allow-popups` while Google popup authentication is supported.
- Preserve `DELIVERY_RULES.md` and the two-ZIP delivery contract.

# v1.6.41 project notes

- The Settings item may be visible, but the real administrator secret must never be shipped to the browser.
- Administrator access is granted only by the server Callable Function and expires after eight hours.
- Keep UID and hashed-network attempt limits; do not log the submitted PIN or raw IP address.
- App Check enforcement remains off until the production web key is configured, then should be enabled and verified.
- Preserve `DELIVERY_RULES.md` and the two-ZIP delivery contract.

# v1.6.40 project notes

- Evaluate every matching retry resource node; do not let a stale failed node mask a successful replacement.
- Post-load inserted resources remain pending until their own settlement or the retry deadline.
- Preserve `DELIVERY_RULES.md` and the two-ZIP delivery contract.

# v1.6.39 project notes

- A visible shell with failed critical JavaScript is degraded, not healthy.
- Do not label unresolved script downloads as failed before the window load boundary or an explicit resource error.
- A shell probe response is valid only while its request ID is active and expects that client ID.
- Re-check active clients after the probe timeout so a tab closed mid-probe cannot block retirement forever.
- Preserve `DELIVERY_RULES.md` and the two-ZIP delivery contract.

# v1.6.38 project notes

- Preserve the current shell plus the latest rollback shell.
- Optional older retained shells may be removed only after all controlled clients answer the generation probe.
- UI-shell fallback must not classify unresolved stylesheet loading as failure before the load boundary.
- Runtime Health owns the visible recovery panel when both recovery systems detect the same issue.

# v1.6.37 project notes

- Never purge every previous shell cache while `clients.claim()` can take over an already-open previous-generation document.
- A stale-generation asset may be served only from an exact cache-key match; never return current bytes under old SRI metadata.
- Keep the boot-level UI shell fallback independent from the main app bundle.
- Do not remove `DELIVERY_RULES.md`.

# v1.6.36 project notes

- Do not remove `DELIVERY_RULES.md`; final delivery requires work summary, two ZIPs, and next work.
- A service-worker activation claim is not final until token and generation still match after the settlement window.
- Stale timers and controller events may release only their captured generation.
- Concurrent AudioContext cleanup must join the pending close Promise.

# v1.6.35 project notes

- Do not remove `DELIVERY_RULES.md`; final delivery requires work summary, two ZIPs, and next work.
- History terminal recovery retains only the exact generation for a short boundary grace.
- Service-worker activation uses localStorage lease ownership and timeout release.
- Same Object URL replacement in download assist must not revoke the live panel URL.

# v1.6.33 notes

- A completed History traversal without `popstate` must be settled from the exact base generation by the watchdog.
- Never retry `history.back()` solely because the sentinel is still current; a delayed first traversal could otherwise skip the exit guard.
- Pending delayed release generations remain metadata-only and are bounded to eight entries and 30 seconds.
- Preserve the three-section final report rule in `DELIVERY_RULES.md`.

# v1.6.32 notes

- Overlay history now uses paired base/sentinel generations.
- Exact generation matching prevents delayed internal cleanup from consuming a newer user Back.
- BFCache restore reconciles suspended transactions and avoids duplicate exit guards.
- New regression: `qa/v1632_overlay_history_generation_bfcache_recovery_smoke.js`.

# Current Project Notes - v1.6.30


## v1.6.34 update

- Terminal overlay history hard-stall recovery after 30 seconds without duplicate traversal.
- BFCache-safe service-worker activity heartbeat/channel pause and resume.
- Idempotent service-worker registration observers and expanded anonymous diagnostics.
- Configured cumulative static/behavioral target: 374 checks.

## v1.6.30 current focus

- Distinguish user navigation from internal overlay history-sentinel cleanup.
- Do not depend on popstate listener registration order for correctness.
- Mark a popstate overlay-handled only when an overlay action was actually consumed.
- Preserve the workspace exit confirmation for genuine Back with meaningful work state.
- Preserve the three-section final report rule.

# Current Project Notes - v1.6.29

## v1.6.29 current focus

- Treat `submissionKey` as the immutable identity of one incident occurrence across local queue, Callable, Firestore fallback, and delayed retries.
- Do not use the retry time when generating a report ID.
- A lease token without the matching generation is not ownership.
- Polling fallback must remain bounded and adapt to queue and page visibility state.
- Keep controls rendering and binding separated from reporting orchestration.
- Preserve the three-section final report rule.

## v1.6.28 current focus

- Treat a failed lease renewal, token replacement, or expired watchdog as immediate ownership loss; network recovery must stop through the shared AbortSignal.
- Release active ownership on BFCache pagehide and reconcile queue state on pageshow, focus, and visible-state restoration.
- Keep fallback polling bounded and metadata-only; never include report contents, tab IDs, audio, filenames, credentials, IP, SSID, or location.
- Keep diagnostic DOM rendering and incident status event construction inside `incident-diagnostics-view-service.js`.
- Preserve the three-section final report rule.

## v1.6.27 current focus

- Keep each tab's writes isolated in its own incident queue shard; never return to a shared array read-modify-write path.
- All network queue recovery must hold verified cross-tab ownership and stop if ownership is lost.
- Delivery tombstones identify one exact queued occurrence and remain bounded; a future occurrence of the same fingerprint must still be reportable.
- Peer diagnostics may expose counts and lock state only, never report text, stacks, audio, filenames, credentials, network identity, or location.
- Preserve the three-section final report rule.

## v1.6.26 current focus

- Keep local queue persistence and conflict-safe commit semantics inside `incident-local-queue-service.js`.
- A flush may remove only fingerprints confirmed delivered; it must preserve entries added after the snapshot.
- Keep Firebase service error classification and diagnostic row view models inside `incident-service-diagnostics.js`.
- Queue diagnostics remain metadata-only and may not expose report content, stack traces, filenames, audio, credentials, or local paths.
- Preserve the three-section final report rule.

## v1.6.24 current focus

- Keep recovery-sweep orchestration in `incident-recovery-sweep-service.js`; the reporter should inject operations rather than regain the coalescing loop.
- Every sweep result must be bounded, privacy-safe, and published even when the browser is offline.
- Lifecycle callback failures may expose phase, normalized code, and bounded message only; never include report text, filenames, audio, tokens, Secrets, IP, SSID, or location.
- Preserve the single active sweep plus one merged pending request contract to prevent reconnect/resume storms.
- Preserve the three-section final report rule.

## v1.6.23 current focus

- Route-health reads and writes share one persisted preparation step; do not add a mutation path that bypasses elapsed-time decay.
- Keep time decay and network decay independent so both execute when a stale snapshot is first read on a changed network.
- Browser event listeners must absorb callback rejection; direct controller methods may still reject for explicit test and caller control.
- `DELIVERY_RULES.md` is the canonical final-output contract and must stay in both the full release and cumulative overwrite package.
- Preserve audio/filename/report-body/token/Secret privacy boundaries in all incident diagnostics.
- Preserve the three-section final report rule.

## v1.6.21 current focus

- Keep online/offline, visibility, and connection-type event ownership inside `incident-lifecycle-service.js`.
- Long-resume recovery must remain deduplicated and bounded; do not start parallel queue, mail, service, or readiness sweeps.
- Exploration alternates only actual transport attempts. Passive UI rendering and health reads must not consume exploration budget.
- Network context is coarse (`online`, connection type, effective type, save-data) and must never gain IP, SSID, carrier, location, or report-content fields.
- Administrator browser-route cards are local diagnostics, not server-wide operational statistics.
- Preserve the three-section final report rule.

## v1.6.18 current focus

- Keep the adaptive cooldown limited to transient network/availability failures; never hide permission, authentication, validation, or missing-deployment errors behind route switching.
- A successful Callable request must immediately restore the primary route.
- Treat local mail-test/readiness snapshots as untrusted and schema-normalize every read and write.
- Hosting rewrites and Functions remain one atomic deployment unit.
- Preserve the three-section final report rule.

## v1.6.17 current focus

- Keep incident transport metrics metadata-only and local to the browser.
- Confirm Hosting rewrite fallback and queue recovery counters after production deployment.
- Continue reducing `incident-reporter.js` by moving history and readiness persistence into dedicated services only when regression coverage exists.
- Preserve the three-section final report rule.

# Current Project Notes - v1.6.16

## v1.6.16 focus

- Same-origin incident fallback is not a second unauthenticated API. Preserve Firebase ID-token and optional App Check headers and the Callable protocol envelope.
- Hosting rewrites and Functions must be deployed atomically; a Hosting-only deploy creates routes that point to stale or missing function contracts.
- The Firestore compatibility path remains the last submission/status fallback and must keep owner-only report IDs and rules.
- Promote only interactive or blocking child windows to the overlay stack. Hover tooltips and passive status hints should remain lightweight.
- Browser Back owns one overlay sentinel, not one permanent history entry per dialog. Closing the final dialog must release the sentinel without trapping navigation.
- Failure-specific recovery actions must call existing tested controls rather than duplicating deployment, retry, or mail-test implementations.

# Current Project Notes - v1.6.15

## v1.6.15 focus

- Use nested fixed overlays only when an action is opened from inside the active dialog; unrelated top-level navigation should retain replacement behavior.
- Every blocking layer participates in one body-scroll lock, z-order stack, Escape policy, focus handoff, and visual-viewport clamp.
- Floating help/assist panels may opt out of document scroll locking but must still unregister on every close and cleanup path.
- Incident recovery is bounded and evidence-based. An opaque `no-cors` response proves endpoint reachability but does not prove Callable health.
- Sanitized diagnostics may contain version and health metadata only; never add audio samples, filenames, local paths, report text, auth tokens, or Firebase Secret values.
- Production verification still requires the matching Hosting CSP, Functions deployment, and real Gmail delivery confirmation.

# Current Project Notes - v1.6.14

## v1.6.14 focus

- Never place the download quality list inside the scrolling sheet layout; keep it as a viewport-fixed portal.
- Reposition the menu on window, visual viewport, and panel scroll changes, and remove every listener on close.
- Treat saved download preferences as untrusted local data and normalize them before use.
- A Callable `functions/internal` error is not proof of a network block. Use exact CSP inspection and the bounded direct endpoint probe to classify it.
- Production confirmation still requires deploying the matching Hosting CSP and `getIncidentServiceStatus` Function.

# v1.6.13 project notes

- MP3/WAV are format families; bitrate and bit depth remain encoder format IDs and must not be collapsed in the download service.
- The quality menu is presentation-only and must not mutate the selected output until a concrete quality item is chosen.
- Escape closes the quality menu before it closes the containing download dialog.
- Same-format output reuse, transient user activation, worker cancellation, and recovery actions remain release invariants.

# v1.6.12 project notes

- Preserve the sequential order of mobile resonance guard, dynamic de-esser, and multiband dynamics; their outputs intentionally feed the next stage.
- Channel specialization may remove loop/object overhead but must not reorder filter calls, detector updates, or Float32 output writes.
- K-weighted power aggregation must retain `Math.fround` at the former Float32-buffer boundary so loudness metrics remain exact.
- Performance changes require same-input sample comparison, engine QA, golden audio, and the cumulative static gate.

## v1.6.10 project notes

- Readiness health is now derived from the complete required-check contract, not only the server's top-level success flag.
- Exact CSP source-token matching prevents lookalike hosts from producing false healthy diagnostics.
- Cached results preserve one bounded history record and accurately disclose local reuse.
- Local storage is treated as untrusted input and malformed history entries are discarded.
- Next focus: split the oversized incident reporter into storage, readiness, mail-history, and view-controller modules without changing the public bridge.


## v1.5.74

Batch pause/resume, current-track skip, pending queue reorder, completion summary, and mobile MP3/WAV two-stage download sheet.

## v1.5.73 focus

- Batch cancellation is signal-driven and must not discard already completed outputs.
- Failed-only retry starts a fresh batch identity and clears only failed-track error state.
- ETA is advisory, uses observed durations, and should remain blank until a defensible estimate exists.
- Result filtering is presentation-only and must never mutate track lifecycle state.

## v1.5.70 focus

- Mail health is not complete at SMTP acceptance; explicit inbox/spam confirmation is required.
- Only unconfirmed tests newer than the latest confirmed receipt contribute to current overdue health.
- Search and CSV export operate on sanitized metadata only and never include Gmail Secret values or message bodies.

# v1.5.64 운영 메모

- `incidentOperations/mail` is server-owned operational telemetry; clients may read it only when the current UID is an active administrator.
- SMTP health is evidence-based. Do not claim a known app-password expiry date because Google does not expose one.
- An SMTP outage cannot alert through the same SMTP channel; preserve the Firestore/admin-dashboard critical state and send recovery after authentication returns.
- Long-undelivered thresholds, alert transition cooldown, and audit lease fencing are release invariants.
- Administrator incident-day counts use KST server ranges, not ISO UTC string prefixes.

# v1.5.63 운영 메모

- Incident quota day key is KST, not UTC.
- Quota deferral must remain retryable; never restore permanent `suppressed-rate-limit` behavior.
- Daily reservation ownership lives in the report delivery map and must be cleared on every terminal branch.
- Summary retries cover the latest three completed KST dates and use deterministic Message-IDs.

# Current Project Notes - v1.5.62

## v1.5.62 focus

- Incident email processing is an explicit queue with pending, sending, retrying, emailed, failed, and dead-letter states.
- A transaction may finalize only the lease ID it reserved; stale completions are observable but cannot mutate current delivery state.
- The same report reuses one SMTP Message-ID across retries to reduce ambiguous duplicate delivery.
- Terminal retries require an active administrator request with `forceTerminal=true`.
- Packaging entrypoints must reject stale release metadata and incomplete handoff files before writing a ZIP.

# Current Project Notes - v1.5.46

## v1.5.46 focus

- Recommendation mapping must tolerate missing, stale, and non-finite analysis metadata without producing NaN DSP settings.
- Master reports distinguish recommended values, user-requested values, and safety-adjusted effective DSP values.
- Quality gating uses finalizer True Peak telemetry when available and keeps sample peak as diagnostic fallback.
- Filenames and export reports reflect the render-time target snapshot rather than mutable global controls.
- Firebase CDN modules are pinned to 12.16.0.

# Current Project Notes - v1.5.45

## v1.5.45 focus

- Queue pause is stateful but never auto-saves; every file still requires a fresh user gesture.
- Background return restores the current item and UI state without advancing the queue.
- Delivery errors are classified into actionable recovery groups instead of one generic failure.
- Service-worker activity publication must reflect the actual active queue state and return to false on teardown.

# Current Project Notes - v1.5.42

## v1.5.42 focus

- ZIP creation is a single owned Worker job; cancellation terminates the Worker rather than throwing from a JSZip callback.
- A ZIP snapshot must not race queue clearing, mastering, automatic remastering, or service-worker activation.
- Archive filenames must remain safe after extraction on case-insensitive Windows/macOS file systems.
- Exact versioned Worker URLs must be available offline, not only unversioned source paths.

# Current Project Notes - v1.5.41

## v1.5.41 focus

- ETA is advisory and must never be treated as an exact completion guarantee.
- A failed browser download start must leave the dialog visible and actionable.
- One export action owns all dialog controls; only explicit cancellation stays enabled.
- Progress timers and page lifecycle listeners must not survive dialog replacement or close.

# Current Project Notes - v1.5.40

## v1.5.40 focus

- Worker progress is advisory UI telemetry, not a terminal response.
- MP3/WAV conversion cancellation must terminate the active worker and re-enable the same dialog for retry.
- Timeout and user cancellation have distinct error codes and user guidance.
- Finalizer/encoder progress may update only the track owning the current mastering job ID.
- Same-format output remains a validation-only path and must not spawn an unnecessary encoder.

# Current Project Notes - v1.5.32

## v1.5.32 focus

- KakaoTalk detection occurs before the heavy studio boot and before the user selects an audio file.
- The external-browser landing accepts only same-origin targets and provides a deliberate in-app bypass to prevent redirect loops.
- Local processing means browser-local memory, not device-global shared memory; Kakao WebView Blob URLs and AudioBuffers do not migrate into Chrome/Safari.
- The preferred flow is external browser first, local import/master/encode second, normal browser download last.
- Existing completed output inside Kakao should use Web Share/file open before leaving; otherwise the source file must be selected again outside Kakao.

# Current Project Notes - v1.5.31

## v1.5.31 focus

- Mastering completion must never append a second Dock player during active original playback.
- Programmatic source refreshes do not crossfade or autoplay; only direct user gestures may create a temporary transition pair.
- Normal-browser alternate-format download relies on one bounded selected-track PCM cache; restricted in-app browsers remain release-after-encode.
- The download dialog first screen contains format choices and essential actions only.
- Kakao file delivery is best-effort through Web Share/file open; a guaranteed cross-browser download URL would require a temporary backend upload.

# Current Project Notes - v1.5.27

## v1.5.27 focus

- Runtime refresh code must preserve structured header markup; plain `textContent` replacement is not safe for badges containing glyph elements.
- Compact-width design rules may scale device glyphs but must not remove them.
- SRI correctness includes valid tag shape and complete local JavaScript/CSS coverage, not only matching hashes on tags that happen to contain `integrity`.
- Header design changes remain isolated from audio routing and mastering DSP.

# Current Project Notes - v1.5.26

## v1.5.26 focus

- Browser readiness must wait for queue, render, media, and layout stability instead of a single DOM condition.
- Hidden descendants of transparent or `aria-hidden` overlay roots are not blocking dialogs.
- Uninterrupted routing is defined by one media element with zero explicit replay/pause calls during mode changes.
- Browser test claims are based on actual Chromium execution, not static collection alone.

# Current Project Notes - v1.5.24

## v1.5.24 focus

- Browser QA must target the control actually visible at the active viewport; desktop-only IDs are not a cross-device contract.
- Modal readiness is based on rendered visibility, not merely `aria-modal` DOM presence.
- A false E2E failure must be corrected in the test contract without weakening production behavior or bypassing the real playback click.
- The v1.5.22 persistent MediaElementSource and smooth translation routing remain unchanged.

# Current Project Notes - v1.5.22

## v1.5.22 focus

- Header metadata should read as a subtle engraved signature, not as three competing cards.
- Preview translation must never replace the active media element merely to change phone/laptop/mono coloration.
- One managed AudioContext and one MediaElementSource should serve all translation modes for a player lifecycle; only the active DSP route should remain after each crossfade.
- Mode changes use short gain ramps and preserve playback position, transport state, waveform sync, Wake Lock, and Media Session.

# Current Project Notes - v1.5.21

## v1.5.21 focus

- Keep `frame-ancestors` in deploy HTTP headers only; meta CSP must stay free of unsupported directives.
- Browser history QA must account for the exit-guard sentinel without swallowing failed navigation.

- Core browser QA is deterministic and does not depend on Firebase CDN/backend availability.
- Optional remote isolation must not weaken local request, page exception, Runtime Health, PWA, or service-worker checks.
- The local server ownership probe prevents accidental testing of an unrelated process on the configured port.
- Package filenames are release-metadata-managed; archive verifiers reject symlinks, unsafe paths, and scratch artifacts.

# Current Project Notes - v1.5.14

- The owner uses GitHub Desktop for fetch, branch review, commit, and push. Handoffs must not assume command-line Git.
- `HANDOFF_PACKAGE.json` is now the transferable package contract.
- `npm run handoff:check` validates the applied repository before the release gate.
- Overwrite and release ZIPs are both verified after creation.
- `.firebaserc` remains local and is intentionally excluded from transferable release archives.

# Project Notes - v1.5.13

## Handoff and cumulative package integrity

- The v1.5.12 CI logic was documented correctly, but `playwright.config.js` was missing from the cumulative overwrite archive.
- Handoff correctness now includes artifact completeness: the generated overwrite ZIP is self-verified before it can be distributed.
- Playwright worker QA inspects the effective configuration under `CI=true`, avoiding formatting-sensitive source assertions.
- Any future root-level runtime or CI configuration added to the overwrite package must be covered by the archive verifier.

# Project Notes - v1.5.11

## AudioContext lifecycle and browser QA stability

- Web Audio context ownership is centralized and inspectable by purpose, owner, state, age, resume count, and recent lifecycle events.
- Preview/difference/spectrum/decode paths release their managed contexts through a common API.
- Browser E2E readiness now follows `DOMContentLoaded` plus FoxBear Runtime Health instead of global network idleness.
- CI navigation failures terminate earlier and retain downloadable Playwright diagnostics.
- The next structural focus is controller extraction from `src/app.js` after this lifecycle boundary is stable.

# Project Notes - v1.5.10

## Header Settings relocation

- Settings is now a header utility beside the designer card instead of a Dock-adjacent floating control.
- The trigger mounts into `#headerSettingsHost`; the panel stays portaled to `document.body` to avoid hero clipping.
- Responsive behavior preserves a readable desktop label and compact tablet/mobile controls.
- Bulk HUD restore remains independent from Settings placement.
- The next structural focus remains centralized AudioContext ownership and lifecycle management.

# Project Notes - v1.5.9

## Version display and stale-shell recovery

- Visible release labels are runtime-bound to `FoxBearBuildInfo` through `FoxBearReleasePresentation`.
- Navigation uses a no-store network attempt before cached-shell fallback, while service-worker generation can be queried for diagnostics.
- Manifest description, Update Safety release metadata, and legacy cache lists are release-tool-managed.
- v1.5.8 PCM/ZIP memory protections remain unchanged.

# Project Notes - v1.5.8

## PCM and ZIP memory hardening

- Completed mastered PCM now follows `release-after-encode`; encoded Blobs and playback URLs remain available while `masteredBuffer` is released after the track reaches `done`.
- ZIP export uses a preflight memory sweep, JSZip `STORE`, `streamFiles`, and a working-set safety ceiling with per-track fallback.
- Alternate output formats require re-mastering after PCM release; the download dialog disables unavailable choices instead of serving the current format under a different label.
- Carry-forward systems remain active: Spectrum detail rendering, Exit Guard and its fallback screen, FoxBear Performance Diagnostics, and adaptive diagnostics refresh behavior.

# Project Notes - v1.5.7

## Release foundation cleanup

- Product, build, asset, and service-worker identifiers are now explicitly separated.
- `package.json` is the release source of truth; use `npm run version:sync` and `npm run version:check`.
- Persistent invariants moved to `STATUS.md`; the Dock FFT decision moved to ADR 0001.
- `npm run check:release` is the release gate and includes real Chromium Playwright tests.
- The 35-track deep flow remains an explicit release-candidate/manual test.

# v1.5.1 Notes - Real Browser Automation

- Real browser automation is now opt-in through Playwright rather than included in the default static smoke suite.
- `npm run qa:browser` starts a local static server and checks Runtime Health in real Chromium.
- `npm run qa:browser:deep` enables the longer 35-track import/master/export path.
- Keep `npm run check` fast and deterministic; use browser QA before release/deploy or when debugging PWA/mobile/regression issues.
- Next focus after browser automation: tune memory and export behavior against actual PC/iOS/Android runs, then consider deeper engine/reference matching changes.

# v1.4.28 Notes - App Slim-down Orchestration Split

- Import analysis queue orchestration has moved behind `FoxBearImportQueueService.createTrackAnalysisQueue()`.
- Selected/all-track mastering batch loops now run through `FoxBearMasteringOrchestratorService.createMasteringBatchRunner()`.
- Keep the existing runtime/cache asset key `1.4.26-wake-lock-state-sync` until the deployment line is intentionally bumped.
- Next focus: v1.4.29 real 35-track memory profiling and buffer-retention tuning.

# Project Notes - v1.4.27

This patch starts the next roadmap without risky engine rewrites. It cleans the release handoff, adds code-fence validation, and introduces reusable services that `src/app.js` can delegate to while the full split continues in later patches.

## Current engineering focus

- Keep the Bulk Import HUD and Bulk Mastering HUD continuity intact.
- Reduce future app.js pressure through service boundaries.
- Preserve download Blob availability while releasing completed non-selected `masteredBuffer` references.
- Make memory state inspectable through `FoxBearMemoryGuard.getSnapshot()` and performance diagnostics.
- Prepare Playwright browser QA for later real-device/full-flow coverage.

## Carry-forward anchors

- Stage7: compare modal and `waveform-compare-view.js`.
- Stage9: Dock waveform CSS split.
- Stage9.1: cumulative overwrite packaging remains supported.
- Stage10: download service split.
- Stage11.1: runtime mobile hotfix remains supported.
- Stage11/Stage12: large modular renovation and detail view split.
- Stage27/Stage28: waveform control service/view split. Stage28 unmanaged waveform audit remains documented.
- Wake Lock state sync, Bulk Import HUD, Bulk Mastering HUD continuity, and Bulk HUD close hotfix remain active.

# Project Notes - v1.4.26

- Wake Lock now has a clear split between saved user setting and automatic temporary protection.
- Settings panel can show `AUTO` when work protection is active while the user setting is otherwise OFF.
- Performance diagnostics include the wake lock snapshot and warnings for auto-active/error states.

## v1.4.26 Notes - Exit Guard fallback

- Problem: choosing leave after browser Back could appear stuck when the app was launched directly and there was no previous history entry.
- Fix: leave path now records attempt metadata, removes navigation blockers, calls `history.go(-1)`, attempts `window.close()`, and renders a safe fallback screen if still visible.
- Browser limitation remains: normal web pages cannot always close tabs/windows programmatically, so the fallback screen is intentional.

## v1.4.26 project notes

v1.4.26 focuses on user visibility during large imports. v1.4.20 prevented 35-track decode storms; v1.4.21 reduced render pressure; v1.4.22 and v1.4.23 improved mastering/decode diagnostics. This patch adds the missing UX layer: a dedicated scrollable Bulk Import HUD with one row per song.

Direction after this patch: real-device PC 35-track validation, then optional batch mastering HUD reuse and `src/app.js` slimming.

## v1.4.26 project notes

The v1.4.26 patch focuses on the second half of the 35-track stability work: after v1.4.20 made decode/analysis sequential and v1.4.21 throttled general renders, v1.4.26 prevents mastering progress updates from forcing repeated full UI renders. Diagnostics now expose active mastering state with render queue state so PC lag reports can be tied to import, render, or mastering work.


- v1.4.21 performance diagnostics can be used with bulk import queue snapshots for PC crash investigations.
## v1.4.21 notes - bulk import memory safety

The 35-track import path previously risked launching all decode/analysis jobs concurrently. v1.4.21 changes this to queued analysis after batch registration, reducing peak ArrayBuffer, AudioContext and render pressure. This is expected to mitigate PC Chrome/Edge `STATUS_BREAKPOINT` crashes on maximum-size imports.

# Project Notes - FoxBear AI Mastering Studio

## v1.4.21 Download dialog micro hint
- v1.4.17 made the recovery checklist compact, but the first dialog could still feel verbose.
- v1.4.21 adds `getDownloadDialogCompactHint()` for a micro first-screen hint.
- The dialog now shows only the most practical next actions first.
- Advanced support actions remain in `추가 옵션` instead of occupying the main screen.
- The dialog flow-step append path was cleaned to avoid duplicate append logic.

## Download/share design direction
- Keep Dock clean.
- Use main download popup for normal export actions.
- Use save-assist popup when downloads are hidden, blocked, or confusing.
- Show micro guidance first; keep diagnostics/checklist copy for support.

## Legacy anchors
- Stage7: compare modal and `waveform-compare-view.js`.
- Stage9: Dock waveform CSS split.
- Stage9.1: cumulative overwrite packaging remains supported.
- Stage13: Runtime Health.
- Stage14: Runtime recovery.
- Stage23: playback orchestration.
- Stage27: common waveform control service.
- Stage28: `waveform-control-view.js` extraction.

## Compatibility anchor notes
- Stage8: async mobile Dock safeguards remain supported.
- Stage9.1: cumulative overwrite packaging remains supported.
- Stage10: download service split remains supported.
- Stage11 and Stage11.1: modular renovation and mobile runtime hotfix remain supported.
- Stage12: detail view split remains supported.
- Stage13 / Stage14: Runtime Health and runtime recovery remain supported.
- Stage27: waveform-control-service remains the shared waveform logic module.
- Stage28: unmanaged waveform audit and waveform-control-view.js extraction remain valid.
- Dock mini FFT was removed by design; renderMini removed and detail-only FFT remains.
- Exit Guard remains active for refresh/back protection.
- v1.4.21 performance diagnostics remain available with adaptive refresh and copy support.

## v1.4.21 cumulative compatibility anchors
- stability notes: navigation confirm debounce, FFT lifecycle stabilization, and external analyser coverage remain active.
- Dock FFT removal remains intentional and settings gear alignment remains active.
- Performance diagnostics remain available with adaptive refresh and copy support.
- Packaging polish remains active for version-synced overwrite ZIP names.
- Download/share reliability remains active with a shorter first-screen dialog.


## v1.4.21 Download dialog first-screen declutter
- Added `FoxBearDownloadService.getDownloadDialogDisplayProfile()` to keep the initial download/share dialog short.
- The first open state uses `download-options-panel-v5`, `data-download-display-mode`, and an idle receipt.
- The full checklist stays hidden on open and appears only after a download/share/assist action needs it.
- Advanced diagnostics, address copy, guide copy, checklist copy, and external-browser guidance remain under `추가 옵션`.
- Final static QA target: `142/142 PASS`.

## v1.4.21 - Render Scheduler + Bulk Import UI Throttle

- Added `FoxBearRenderScheduler` to merge repeated `renderAll()` calls into scheduled frame updates during analysis/import.
- Bulk import analysis remains sequential, and large-batch UI refreshes are throttled so 35-track imports are less likely to stutter or crash.
- Automatic Wake Lock activation during analysis/playback is now silent; manual settings toggles still show user feedback.
- Single-file imports keep the AI recommendation choice dialog, while multi-file and large-batch imports auto-apply each track's AI recommendation without one popup per file.
- Playback transitions use a smoother 140ms fade and wait for the next audio element to be media-ready before fading out the old source.
- Analysis cache keys now use `ANALYSIS_ENGINE_CACHE_VERSION` instead of `APP_VERSION`, reducing unnecessary re-analysis across patch releases.
- Added `FoxBearAudioDecodeService` as the first decode-path split from `src/app.js`.

Dock mini FFT was removed and remains removed in v1.4.21 while detail-only FFT is preserved.

renderMini was removed with the Dock mini FFT cleanup and remains removed in v1.4.21.


## v1.4.26 carry-forward anchors

Spectrum detail-only FFT, Exit Guard, Dock mini FFT removal, renderMini cleanup, stability, confirm, Download dialog compact hint, getDownloadDialogDisplayProfile, Stage28, Stage27, Stage26, Stage25, Stage23, Stage21, Stage20, Stage18, Stage17.


## v1.4.26 Carry-forward QA anchors
- Dock mini FFT was removed; detail-only FFT remains the supported spectrum view.
- renderMini removed from Dock spectrum/runtime health carry-forward.
- v1.4.26 performance diagnostics keeps adaptive refresh, getSummary, and copy/복사 support.
- Download flow polish and action clarity remain in the compact first-screen dialog.

## v1.4.26 - Audio Decode Memory Guard

- Added audio decode diagnostics in `FoxBearAudioDecodeService.getDiagnostics()`.
- Tracks active/completed/failed decodes, recent decode events, last decoded PCM size, and last error.
- `decodeAudioFile()` now explicitly releases its temporary `ArrayBuffer` reference in `finally` after Web Audio decoding.
- Performance diagnostics now include `audioDecode` and warn on `audio-decode-active` / `audio-decode-last-error`.
- Runtime Health now requires `FoxBearAudioDecodeService.getDiagnostics`.
- v1.4.22 mastering queue throttle, v1.4.21 render scheduler, and 35-track sequential import guard remain carried forward.


### v1.4.26 carry-forward QA notes

- stability, Dock FFT removal, settings gear alignment, renderMini cleanup, performance diagnostics, download flow polish, download action clarity, micro hint/declutter, Render Scheduler, Mastering Queue Throttle, Audio Decode Memory Guard, and Bulk Import HUD remain carried forward.
- Stage13, Stage14, Stage27, and Stage28 documentation anchors remain intentionally referenced for legacy QA/handoff continuity.
- Dock mini FFT was removed; detail FFT remains detail-only.
- Dock FFT removal and settings gear alignment remain part of the current regression line.
- Stage27 waveform-control-service and Stage28 waveform-control-view.js extraction remain active; unmanaged waveform audit remains tracked.

## v1.4.26 Carry-forward Notes

- Performance diagnostics use adaptive refresh and can copy diagnostic reports.
- renderMini removed; detail-only FFT is the current supported path.
- Download flow polish, action clarity, micro hint, and first-screen declutter remain active.


## v1.4.26 Historical QA anchors

Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage27, and Stage28 remain documented as current carry-forward anchors.

- Stage27 waveform-control-service remains active.
- Stage28 unmanaged waveform audit and waveform-control-view.js extraction remain active.
- Dock mini FFT was removed; detail FFT remains detail-only.
- Exit Guard fallback is current in v1.4.26.

## Legacy QA compatibility notes

- v1.4.26 Exit Guard fallback remains active for back navigation and direct-launch fallback behavior.
- Dock mini FFT was removed by design; renderMini remains removed and detail-only FFT is the intended path.
- v1.4.26 performance diagnostics remain available with adaptive refresh and copy support.

## v1.5.3 note - Bulk HUD visibility controls

- `접기` in the large HUD is now `숨김` and hides the current bulk HUD batch.
- The floating mobile/native settings layer creates `#bulkImportHudRestore` (`보이기`) only for hidden, restorable bulk batches.
- `#bulkImportHudMasterAll` delegates to the existing main `#masterAllBtn` full-mastering behavior.


## v1.5.15 E2E runtime classification

- 선택적 Firebase 원격 실패와 앱의 치명적 런타임 오류를 분리했다.
- Wake Lock/Service Worker Playwright 시나리오의 상태 격리를 강화했다.
- 실제 실패 시 Runtime Health 전체 JSON이 Actions 로그에 노출된다.
- index.html에 남아 있던 v1.5.13 자산 세대도 현재 릴리스로 복구했다.
## v1.5.23 audit note

The v1.5.22 browser failure was caused by a test-fixture race: single-file analysis could open the AI recommendation modal between media readiness and the Dock play-button click. The preview-routing scenario now opts into targeted automatic-dialog isolation and validates click ownership before playback.

