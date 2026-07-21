# QA Report - v1.5.59 Kakao Session Handoff and Memory Diagnostics

- Added privacy-safe, expiring work-setting handoff for external-browser recovery.
- Added per-stage mastering memory diagnostics with known PCM/blob peaks and available Chromium heap data.
- Restores global DSP/output settings first, then reapplies the selected-track profile after AI analysis without transferring audio or filenames.
- Static and regression target: all configured checks PASS in bounded continuation segments.

## v1.5.59 coverage

- one-time 20-minute handoff token and address-bar cleanup
- fallback URL copy retains recovery state
- sane defaults for missing pitch, speed, output, and loudness values
- per-stage memory peak, pressure ratio, and environment diagnostics
- app slim-down and existing Kakao runtime recovery preservation

# QA Report - v1.5.58 Kakao Mastering Runtime Recovery

- Removed duplicate compressed-file buffers from Web Audio decoding.
- Added Kakao/in-app peak-memory planning, early PCM release, and lightweight finalizer protection.
- Preserves the valid first render for non-critical quality failures instead of starting a second memory-heavy render.
- Distinguishes a playable file rejected by Web Audio from an actually unreadable or invalid source.
- Static and regression target: `261/261 PASS` in bounded continuation segments.

## v1.5.58 coverage

- Kakao WebView decode memory pressure
- truthful source-file error classification
- non-critical quality retry deferral
- critical invalid/clipping output protection
- route recovery explanation after WebView restart

# QA Report - v1.5.57 Modal Close Consistency

- Unified the visual and interaction contract for program, feature, preview, admin, download, AI recommendation, save-assist, mobile-settings, and enhanced-select close controls.
- Verified the final rendered geometry at 38x38px with 12px top/right offsets on desktop and a 36px mobile touch target.
- Added Escape priority handling so the top runtime popup closes without also dismissing a managed modal underneath it.
- Added focus restoration for runtime-generated AI, download, and save-assist dialogs.
- Static and regression target: `259/259 PASS` in bounded continuation segments.

## v1.5.57 coverage

- shared close icon and panel inset ownership
- legacy Dock/modal CSS override precedence
- dynamic popup close creation
- Escape dismissal ordering
- focus restoration and busy-download close protection
- service-worker cache and SRI parity

# QA Report - v1.5.54 Risk-Specific Quality Recovery and Browser QA

- Added deterministic recovery-profile coverage for integrity, loudness, low-end pumping, stereo phase, high-frequency preservation, and combined risk modifiers.
- Added real-browser contracts for one-shot recovery success and first-render preservation after an injected post-render exception.
- Static and regression target: `253/253 PASS` when executed in bounded continuation segments.
- Existing download receipt, recovery checklist, Wake Lock AUTO state, export, PWA, and memory guards remain required carry-forward checks.
- Playwright collection found both desktop and mobile scenarios; live sandbox navigation was blocked by administrator policy before app code loaded.

## v1.5.54 coverage

- risk-code preservation from quality audit to recovery planner
- deterministic profile priority and cumulative modifiers
- one-shot retry enforcement
- recovery exception atomic rollback and encoded output preservation
- desktop and mobile Chromium recovery scenario

# QA Report - v1.5.52 CI Parallel Release Gate

## v1.5.52 coverage

- Parallel static and browser release jobs
- Superseded workflow cancellation
- Playwright browser cache contract
- Build/deploy dependency gating
- Phase-aware local release command


- Prevents partial legacy HTML generations from mixing with current SRI-protected assets.
- Verifies canonical project-root recovery, one-shot service-worker bypass consumption, GitHub Pages 404 recovery, and exact runtime/cache graph parity.
- Static and regression target: `245/245 PASS`. Historical anchor: `183/183 PASS`.

## v1.5.51 coverage

- stale generation asset isolation
- atomic full runtime generation installation
- canonical recovery URL and 404 route repair
- exact HTML-to-service-worker asset parity
- engine, recommendation, export, and mobile regression preservation

# QA Report - v1.5.48 Engine Performance Quality Regression

- Added bounded before/after quality checks for dynamic collapse, high-frequency loss, low-end pumping, stereo phase risk, and invalid output samples.
- The audit samples at most 65,536 frames per buffer to keep engine overhead predictable.
- Engine bench, golden audio pack, recommendation mapping, and release regressions are included.
- Static and regression target: `245/245 PASS`. Historical anchor: `183/183 PASS`.

## v1.5.48 coverage

- mastering input signal gate
- finalizer defense-in-depth signal validation
- high-sample-rate and mono quality boundaries
- malformed recommendation/finalizer analysis normalization
- clipping stress quality-gate classification
- asynchronous mastering cancellation checkpoints

# QA Report - v1.5.46 Engine, Recommendation, and API Audit

- Engine bench and golden-audio pack remain required release gates.
- Added deterministic checks for finite-safe recommendations, duplicate-apply removal, render-time target reporting, Firebase 12.16.0, and True Peak-first quality gating.
- Static and regression result: `239/239 PASS` (the final latest-release segment was completed separately after the long-run time ceiling).

## v1.5.46 coverage

- recommendation finite-value normalization
- recommended/requested/effective DSP audit trail
- True Peak ceiling warning with sample-peak fallback
- adaptive target filename and export-report integrity
- Firebase 12.16.0 pin and browser capability guards

# QA Report - v1.5.45 Export Queue Recovery

- Static and regression result: `238/238 PASS` (completed by continuing the registered list after the runner time ceiling).
- Added deterministic coverage for pause/resume, background recovery, storage failure diagnosis, picker ETA, retry, and service-worker activity teardown.
- Confirms the queue remains gesture-safe and never auto-delivers after foreground restoration.

## v1.5.45 coverage

- queue pause and resume
- background/BFCache current-item recovery
- storage, permission, unsupported, filesystem, and network error guidance
- advisory picker save ETA
- activity release after completion and cancellation

# QA Report - v1.5.44 Gesture-Safe Individual Export Queue

- Static and regression result: `237/237 PASS` (completed in deterministic continuation segments after the runner time ceiling).
- Added deterministic runtime coverage for ordered delivery, one-file advancement, picker dismissal retry, skip, cancellation, and duplicate ownership.
- Verifies the queue service is loaded exactly once, precached, required by Runtime Health, included in handoff archives, and freezes output-mutating controls while active.
- Confirms service-worker activation observes queue preparing/delivering states.
- Confirms the UI exposes next-file, skip, and cancel controls without automatic batch downloads.

## v1.5.44 coverage

- prevalidated output Blob queue
- fresh user gesture per file
- direct-save/download/share delivery modes
- retry, skip, cancel, BFCache refresh
- export conflict and update activation guards
- origin-cache advisory without claiming device Downloads free space

# QA Report - v1.5.43 Export Pipeline Integrity

- Static and regression result: `235/235 PASS` (the registered list was executed in three deterministic segments to avoid the runner ceiling).
- `zip-export-service.js` is required to exist and load exactly once from `index.html`.
- Runtime Health reports missing ZIP guard/progress/service globals instead of allowing silent button failure.
- The SRI updater removes empty, stale, and duplicated integrity attributes before writing one canonical SHA-384 value.
- Archive verification checks required runtime entry assets against the extracted package, not only the source folder.
- Capable browser ZIP workers pass Blob inputs directly to JSZip and avoid eager full-file ArrayBuffer copies.
- Existing Wake Lock, download recovery, codec, player, Kakao, service-worker, and CI lifecycle guards remain enabled.
- Playwright browser execution was attempted, but Chromium was unavailable before application launch; the static server responded normally.

## v1.5.43 coverage

- source/index/runtime entry parity
- duplicate SRI runtime repair
- ZIP module-unavailable recovery
- low-copy Blob worker path and compatibility fallback
- extracted archive runtime-asset verification

# QA Report - v1.5.42 ZIP Worker Cancellation and Archive Safety

- Static and regression result: `233/233 PASS` (the full registered list was completed in deterministic continuation segments after the runner time ceiling).
- ZIP generation executes in a dedicated Worker and produces a PK-signed Blob.
- AbortSignal cancellation terminates the Worker and prevents download initiation.
- Duplicate ZIP requests, queue clearing, mastering, and service-worker activation are blocked while export is active.
- Archive names are safe and unique on case-insensitive extraction targets.
- Exact versioned Worker URLs are cached for offline execution.

## v1.5.42 coverage

- Worker runtime ZIP generation and progress
- explicit ZIP cancel UI and lifecycle
- duplicate job and destructive-action locking
- timeout and stale-result isolation
- Windows/case-insensitive archive-name hardening
- versioned Worker cache presence

# QA Report - v1.5.41 Export ETA and Download Recovery

- Static and regression result: `231/231 PASS` (executed in four deterministic chunks to avoid the tool runtime ceiling).
- Download dialog closes only after `downloadBlob()` resolves successfully.
- Elapsed time and advisory ETA are shown during worker conversion.
- Twelve seconds without progress enters a visible stalled/background state.
- All dialog buttons except cancel are disabled while an export owns the dialog.
- Replacement and app-close paths remove timers and lifecycle listeners.

## v1.5.41 coverage

- ETA and elapsed-time rendering
- stalled/background progress guidance
- complete action locking
- download failure visibility and retry readiness
- dialog timer/listener cleanup

# QA Report - v1.5.40 Export Worker Progress and Cancellation

- Static and regression target: `230/230 PASS`.
- Worker progress messages are job-scoped and cannot settle terminal promises.
- MP3/WAV conversion cancellation terminates the worker and restores actionable download controls.
- Timeout errors remain visible and are not hidden by fallback encoding.
- Finalizer and encoder phase telemetry is connected to the active track job only.

## v1.5.40 coverage

- progress delivery and monotonic percent normalization
- explicit download-dialog cancellation and retry readiness
- timeout-specific recovery messaging
- stale worker response isolation
- finalizer/encoder track progress wiring

```text
230/230 PASS target
```

# QA Report - v1.5.39 CI Hook Lifecycle Hardening

- Static and regression target: `229/229 PASS`.
- Clean checkout simulation: `.git` present, `.githooks/pre-commit` absent, `npm ci --offline` passed.
- Reverse guard simulation: reintroducing a hook-installing `prepare` script was rejected by handoff verification.
- GitHub Pages workflows install with `npm ci --ignore-scripts`.

## v1.5.39 coverage

- npm install lifecycle isolation
- fail-soft optional local Git hook installation
- cumulative overwrite inclusion of `.githooks`
- archive and handoff rejection of hook-installing lifecycle scripts

# FoxBear QA Report - v1.5.36

Current release target: metadata, handoff, SRI, and 224/224 static checks. The new tests execute file-picker ordering and BFCache restoration in isolated runtimes, while cumulative download, Wake Lock, player, codec, worker, service-worker, and security checks remain enabled.

## v1.5.36 coverage

- Proves `showSaveFilePicker()` is called before asynchronous Blob inspection so transient user activation remains valid.
- Requires verified same-format output to enter Web Share without an avoidable async preparation boundary.
- Requires converted-format and restricted-browser sharing to use a fresh explicit save-assist click.
- Verifies repeated save-assist panels revoke old Blob URLs and bound the replacement URL lifetime.
- Prevents download completion from clearing an unrelated global mastering busy state and rejects duplicate action entry.
- Awaits ZIP/report download rejection paths instead of leaving unhandled promises.
- Simulates BFCache pagehide/pageshow and verifies navigation protection is rebuilt with `pageHiding` cleared.
- Retains Wake Lock state synchronization and all previous runtime exception checks.

```text
224/224 PASS target
Browser QA: Chrome/Safari direct save/share, Kakao Android/iPhone external browser, and BFCache restoration remain release-candidate device checks
```

# FoxBear QA Report - v1.5.35

Current release result: metadata, handoff, SRI, and 222/222 static checks passed. The new test executes cancellation races, batch exception isolation, queue normalization, and invalid worker payload rejection rather than checking strings only. Playwright was invoked, but the Chromium executable is not installed in this workspace, so browser cases stopped before application launch.

## v1.5.35 coverage

- Detects undefined spectrum timing helpers and requires closed capture-stream graphs to be recreated.
- Reproduces a synchronous metadata-probe abort that previously could access a timer before initialization.
- Proves one batch track exception does not stop later tracks and setup exceptions always clear the busy flag.
- Verifies numeric track IDs cancel correctly and invalid concurrency falls back to one worker.
- Rejects non-finite MP3/finalizer values, negative WAV channels, and oversized RIFF output requests.
- Requires atomic mastered URL replacement, explicit state defaults, IndexedDB abort/blocked handling, and partial file-write abort cleanup.

```text
222/222 PASS
Browser QA: attempted; blocked before launch by missing Playwright Chromium executable. Actual Chrome/Safari/Edge plus KakaoTalk Android/iPhone remains a release-candidate device check
```

# FoxBear QA Report - v1.5.34

Current release result: metadata, handoff, SRI, and 221 static checks passed after restoring the locked npm dependencies. KakaoTalk Android/iPhone real-device link opening remains the final manual validation item.

## v1.5.34 coverage

- Confirms the Kakao entry guard only redirects to a normal same-origin HTML landing.
- Rejects timer-driven automatic custom-scheme or Android-intent navigation.
- Simulates Android and iPhone Kakao user agents and verifies external launch begins only after an explicit click.
- Requires the landing to remain visible with direct-link, address-copy, in-app bypass, and top-right menu guidance fallbacks.
- Keeps earlier codec, download, Wake Lock, player, service-worker, and security regressions in the cumulative suite.

```text
221/221 PASS target
Real device QA: open the production link from KakaoTalk on Android and iPhone; verify the landing remains visible before any user action
```

# FoxBear QA Report - v1.5.33

Current release result: metadata/handoff/SRI checks and 220/220 static checks passed. Playwright was invoked, but this workspace has no Chromium executable, so real browser and device codec matrices remain required for final release validation.

## v1.5.33 coverage

- Requires dynamic `canPlayType()`-based picker filtering instead of a broad `audio/*` claim.
- Rejects CAF, WMA, AMR, and 3GP-family inputs before queue registration.
- Exercises the bundled PCM AIFF/AIFC fallback parser with synthetic 44.1 kHz samples.
- Ensures file decoding does not wait for AudioContext playback resume and has a bounded timeout.
- Validates WAV/MP3 output headers before download, direct save, or share preparation.
- Requires normal anchor downloads to stay in the current page and File System Access saving to require a secure context.

```text
220/220 PASS target
Browser QA: attempted here; blocked before launch because the Playwright Chromium executable is not installed. Run in GitHub Actions or an unrestricted local environment; codec-device matrix remains a manual release-candidate check
```

# FoxBear QA Report - v1.5.32

Current release gate target: metadata/handoff checks and 216 static checks. Real KakaoTalk device validation remains a release-candidate manual check because the Kakao WebView and OS browser handoff cannot be emulated faithfully by static Node tests.

## v1.5.32 coverage

- Requires the Kakao entry guard to load before build information and all heavy application modules.
- Simulates Kakao, normal-browser, and explicit in-app-bypass entry behavior.
- Verifies the lightweight landing contains Kakao scheme, Android intent, copy, and continue controls.
- Requires same-origin target validation to prevent open redirects.
- Requires the service worker and cumulative overwrite ZIP to include the landing and guard assets.
- Preserves the local-only workflow while explicitly guarding against the false assumption that an in-memory Blob transfers between Kakao WebView and an external browser.

```text
216/216 PASS target
Browser QA: run in GitHub Actions or an unrestricted local environment; final Kakao handoff requires an Android/iOS device
```

# FoxBear QA Report - v1.5.31

Current release gate: metadata/handoff checks and 215 static checks. A focused Playwright run was attempted, but this workspace does not contain the required Chromium executable; actual browser QA remains a CI or unrestricted-local gate.

## v1.5.31 coverage

- Preserves the single active original Dock player when mastering completes during playback; no automatic second player or non-gesture crossfade is created.
- Deduplicates Dock refreshes, removes stale player shells, and keeps source switches user-gesture-bound.
- Retains one selected-track PCM within a bounded memory budget in normal browsers for MP3 128/192/320 kbps and WAV 16/24/32-bit re-encoding.
- Keeps restricted Kakao/in-app browsers on the completed-file-only policy and provides compact share/save, file-open, and external-browser fallbacks.
- Verifies the simplified download and save-assist surfaces while preserving legacy diagnostics helpers without mounting verbose cards.

```text
215/215 PASS
Browser QA: not executed here - Playwright Chromium executable is not installed; run in GitHub Actions or an unrestricted local environment
```

# FoxBear QA Report - v1.5.29

Current release gate: metadata/handoff checks, 213 static checks, and 14 desktop/mobile Playwright tests.

## v1.5.29 coverage

- Cancels active and pending import analysis across file read, decode, worker analysis, cache write, and state application.
- Rejects stale asynchronous results after queue clear, track removal, or replacement.
- Defers waiting service-worker activation while analysis, mastering, decoding, rendering, or playback is active.
- Requires a stable idle window before automatic `SKIP_WAITING` and suppresses duplicate activation requests while controller change is pending.
- Recovers script, style, worker, and navigation requests from current or retained legacy caches for offline failures and HTTP non-success responses.
- Browser QA clears active bulk analysis, verifies no stale resurrection, imports a replacement track, and confirms real playback.

```text
213/213 PASS
Browser QA: desktop 7/7 PASS, mobile 7/7 PASS on actual Chromium
```

# FoxBear QA Report - v1.5.28

Current release gate target: metadata/handoff checks, 210 static checks, and 12 desktop/mobile Playwright tests.

## v1.5.28 coverage

- Measures 320px command-header geometry and essential-control visibility in a real browser.
- Exercises repeated studio/phone/laptop/mono switching and then clears the queue, requiring zero retained playback registrations and managed AudioContexts.
- Simulates detached-audio pruning and verifies listener removal through Playback Link Service diagnostics.
- Verifies Preview Translation teardown uses the managed AudioContext service; actual Chromium queue teardown must return managed context count to zero.
- Verifies clear-queue/remove-track resource release and stale E2E ownership-probe cleanup.
- Verifies service-worker activation retains only the newest two recovery generations and that an offline request can be served from a legacy cache.

```text
210/210 PASS
Browser QA target: desktop 6/6, mobile 6/6
```

# FoxBear QA Report - v1.5.27

Current release gate target: metadata/handoff checks, 209 static checks, and 12 desktop/mobile Playwright tests.

## v1.5.27 coverage

- Verifies the runtime admin-state refresh preserves and rebuilds the desktop/phone glyph structure.
- Verifies compact mobile CSS keeps both device glyphs rendered and the command-header divider removed.
- Verifies every local JavaScript/CSS asset has exactly one valid SHA-384 integrity attribute.
- Verifies malformed `/ integrity=` tags are both repaired by the updater and rejected by the verifier.
- Browser QA measures the rendered glyph boxes and zero-width divider on desktop and mobile.

```text
209/209 PASS
Browser QA: desktop 6/6 PASS, mobile 6/6 PASS on actual Chromium
```

# FoxBear QA Report - v1.5.26

Current release gate target: metadata/handoff checks, 208 static checks, and 12 desktop/mobile Playwright tests.

## v1.5.26 coverage

- Verifies the command header uses the requested left/right text order.
- Verifies the build version token remains runtime-bound without destroying the nested header markup.
- Verifies the designer signature is `DESIGNED BY 곰같은여우` with no visible `with AI` suffix.
- Verifies the Settings trigger contains only one gear glyph and no pseudo-element label.
- Verifies the final header CSS is SRI-protected and included in both install and warm service-worker caches.
- Browser QA measures one-line geometry, ordering, overflow, transparent surfaces, and Settings-panel placement on desktop and mobile.

```text
208/208 PASS
Browser QA: desktop 6/6 PASS, mobile 6/6 PASS on local Chromium
```

# FoxBear QA Report - v1.5.25

Current release gate target: metadata/handoff checks, 207 static checks, and 12 desktop/mobile Playwright tests.

## v1.5.25 coverage

- Verifies dialog visibility through hidden, transparent, pointer-disabled, and `aria-hidden` ancestors.
- Verifies import queue and render scheduler idle state before preview playback.
- Verifies a stable viewport-specific play control before the real click.
- Verifies one persistent audio element with zero explicit `play()`/`pause()` calls through studio/phone/laptop/mono routing.
- Verifies targeted spec arguments do not expand into the full browser suite.

```text
207/207 PASS
Browser QA: desktop 6/6 PASS, mobile 6/6 PASS on local Chromium
```

# FoxBear QA Report - v1.5.24

Current release gate target: metadata/handoff checks, 206 static checks, and 12 desktop/mobile Playwright tests.

## v1.5.24 coverage

- Verifies the preview-routing browser test chooses the external desktop control or integrated mobile control according to the rendered viewport.
- Verifies hidden modal roots are excluded using computed rendered visibility rather than DOM presence.
- Verifies Dock repair CSS loads after base Dock CSS and exposes the mobile integrated play toggle.
- Carries forward the persistent audio element, one MediaElementSource, one steady-state DSP route, and no play/pause calls during mode switching.

```text
206/206 PASS
Browser QA: GitHub Actions confirmation required
```

# FoxBear QA Report - v1.5.22

Current release gate target: metadata/handoff checks, 203 static checks, and 12 desktop/mobile Playwright tests.

## v1.5.22 coverage

- Verifies the header version/device/designer signature is borderless, compact, and no longer displaced by Settings.
- Verifies one persistent MediaElementSource owns studio, phone, laptop, and mono routes.
- Verifies translation mode changes ramp route gains without calling media `play()` or `pause()`.
- Verifies the translation service is SRI-protected and included in the service-worker release cache.
- Re-runs engine, golden audio, AudioContext lifecycle, Update Safety, PWA, and package integrity checks.

```text
204/204 PASS
Browser QA: GitHub Actions confirmation required
```

# FoxBear QA Report - v1.5.21

Current release gate target: metadata/handoff checks, 201 static checks, and 12 desktop/mobile Playwright tests.

## v1.5.21 coverage

- Verifies meta-delivered CSP does not include unsupported `frame-ancestors` and therefore does not produce Chromium console errors.
- Verifies Firebase Hosting's effective HTTP CSP retains `frame-ancestors 'none'`.
- Verifies browser forward navigation traverses the FoxBear exit-guard sentinel and reaches the E2E hash entry without swallowing failures.
- Carries forward v1.5.20 idempotent cache-warm and v1.5.19 deterministic Firebase isolation contracts.

```text
201/201 PASS
Browser QA: GitHub Actions confirmation required
```

# QA Report - v1.5.18 CI Diagnostics and PWA Readiness

## Result

```text
198/198 PASS
Browser QA: GitHub Actions confirmation required
```

v1.5.18 final QA static target: `198/198 PASS`. The bundled Playwright Chromium run must still be confirmed by GitHub Actions.

Historical static anchors retained for regression compatibility:

- v1.5.9: `185/185 PASS`
- v1.5.8: `183/183 PASS`
- v1.5.2 Export Guard + Low Memory UX remains covered.

Commands:

```bash
npm ci
npm run version:check
npm run handoff:check
npm run check
npm run qa:browser
npm run package:all
```

## v1.5.18 coverage

- Verifies service-worker installation uses a critical shell and background warm phase instead of blocking activation on the full asset list.
- Verifies service-worker readiness uses one bounded timeout and distinguishes registration from active readiness.
- Verifies Playwright JSON diagnostics preserve failed test names and useful assertion messages at the end of the run.
- Verifies full server logs are saved to browser artifacts while Actions output remains compact.
- Verifies release and overwrite archives exclude and reject transient logs, results, reports, and coverage directories.

## v1.5.17 coverage

- Verifies manual Wake Lock requests remain active until an explicit release instead of being immediately cleared by idle synchronization.
- Verifies the service worker registration URL passes through the Trusted Types policy before `navigator.serviceWorker.register()`.
- Verifies the header settings host renders after the designer card through an explicit flex order.
- Retains the v1.5.16 asynchronous static-server runner and pipe-deadlock stress guard.

## v1.5.16 coverage

- Replaces the blocking Playwright `spawnSync` execution with an awaited asynchronous child process.
- Keeps the Node event loop available to drain Python static-server stdout/stderr while browser assets are requested.
- Bounds captured server output to the latest 256 KiB and prints it when browser QA fails.
- Stress-tests 1,800 HTTP requests and a follow-up request to guard against pipe-buffer deadlock.
- Retains all v1.5.7-v1.5.15 release, Runtime Health, PWA, export, audio, and handoff checks.

## v1.5.15 coverage

- Separates optional Firebase/Firestore network outages into Runtime Health warnings rather than fatal runtime errors.
- Logs complete critical Runtime Health JSON directly in GitHub Actions output.
- Resets Wake Lock sentinel state before manual request/release E2E.
- Validates service-worker registrations by active/waiting/installing worker state instead of relying only on `navigator.serviceWorker.ready`.
- Recovers `index.html` release asset metadata from the stale v1.5.13 generation.

## Historical reports

Previous accumulated v1.4.21-v1.4.26 QA notes are preserved in:

```text
docs/history/QA_REPORT_legacy_v1.4.21_to_v1.4.26.md
```

## Carry-forward v1.4.26 QA anchor

v1.4.26 final QA carry-forward remains documented for legacy smoke compatibility. Current QA is higher because v1.5.5 adds Update Safety asset-health checks and v1.5.4 adds boot SRI/cache recovery checks and v1.5.3 adds Bulk HUD visibility/master-all UX checks on top of v1.5.2 Export Guard checks on top of v1.5.1 real-browser automation smokes on top of v1.5.0 engine quality gate checks on top of v1.4.29 Memory Stabilization, release cleanup, service-module, app-slimdown orchestration, memory-guard, and browser-scaffold checks.





## v1.5.9 coverage

- Executes `FoxBearReleasePresentation` against stale v1.4.26 HTML labels and verifies the visible button, info heading, title, body build markers, and metadata are repaired to the generated release version.
- Verifies the manifest description follows the current product version/build ID.
- Verifies service-worker navigation uses preload/no-store before offline fallback and exposes `FOXBEAR_GET_RELEASE_INFO`.
- Verifies Update Safety derives patch/boot metadata from `FoxBearBuildInfo`.
- Verifies the active cache generation is absent from `LEGACY_CACHE_NAMES`.

## v1.5.8 coverage

- Executes the Memory Guard in a VM and verifies default completed PCM retention is zero.
- Verifies the newly completed track reaches `done` before the release policy runs.
- Verifies explicit bounded re-encode retention remains opt-in and budget-limited.
- Executes Export Guard planning for safe desktop and unsafe low-memory mobile batches.
- Verifies ZIP strategy is `STORE` + `streamFiles` with a working-set ceiling and per-track fallback.
- Verifies alternate-format requests fail with `FORMAT_REQUIRES_REMASTER` instead of returning a mislabeled current-format Blob.

## v1.5.7 coverage

- Verifies package/manifest/UI/build/cache metadata synchronization from `package.json`.
- Verifies generated `src/config/build-info.js`, release documentation, and version synchronization tooling.
- Verifies `@playwright/test` is pinned and represented in `package-lock.json`.
- Verifies deployment workflows run `npm ci`, install Chromium, and execute `npm run check:release`.
- Verifies CHANGELOG no longer contains duplicate headings or repeated carry-forward sections.
- Verifies release synchronization preserves historical QA labels instead of renaming old regression guards to the current release.

## v1.5.6 coverage

- Verifies `src/download/export-progress-view.js` is loaded after Export Guard and before `src/app.js`.
- Verifies the visible export panel IDs, progress bar, checklist, and fallback `곡별 다운로드 위치 보기` action exist.
- Verifies `downloadZip()` updates `FoxBearExportProgressView` for plan, progress, completion, validation failure, and errors.
- Verifies boot/update safety keys moved to `boot-sri-v156` and `update-safety-v156`, and service worker cache generation is `foxbear-shell-v1.5.6-export-progress-recovery`.

## v1.5.5 coverage

- Verifies `src/boot/update-safety-service.js` is loaded before other deferred boot diagnostics and exposed as `FoxBearUpdateSafety`.
- Verifies boot-critical assets use `h=boot-sri-v155` in both `index.html` and `sw.js`.
- Verifies the service worker cache generation is `foxbear-shell-v1.5.5-update-safety` and v1.5.4 is treated as legacy.
- Verifies Runtime Health can copy Update Safety diagnostics and can request `FOXBEAR_PURGE_CACHES` before unregister/reload.
- Verifies patched JS/CSS service-worker fetches use network-first no-store handling for patch-busted assets.

## v1.5.3 coverage

- Verifies the large bulk HUD `숨김` copy and removal of the legacy `접기` button text.
- Verifies hidden HUD restore through a `보이기` control beside the floating settings gear.
- Verifies the large HUD inline `전체 마스터링` action delegates to the existing main full-mastering button.
- Verifies v1.5.3 stale-cache keys and service worker precache alignment.


## v1.5.4 coverage

- Verifies boot-critical `runtime-health.js`, `performance-diagnostics.js`, and `app.js` use the fresh `h=boot-sri-v154` cache-bust key in both `index.html` and `sw.js`.
- Verifies the generated SRI hashes match the actual bytes for the three boot-critical scripts.
- Verifies the service worker shell cache name was bumped to `foxbear-shell-v1.5.4-boot-sri-recovery`.
- Verifies Runtime Health cache recovery clears broader app/workbox/precache caches and unregisters service workers before reload.


## Final regression status

- v1.5.51 registered QA checks: 247/247 PASS
