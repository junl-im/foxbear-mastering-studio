# v1.6.85 release checklist

- [x] Confirm the browser job uses Runtime Health as the sentinel and skips heavier scenarios when it fails.
- [x] Add E2E-only UI-mode fallback independent of sessionStorage availability.
- [x] Verify the requested E2E mode is established after navigation.
- [x] Remove compact-header clipping by hiding the redundant studio token at 430px and below while preserving the 40px mode-switch target.
- [x] Update Runtime Health geometry coverage for the workspace switch and responsive-hidden elements.
- [x] Emit exact repeated browser case annotations after retry.
- [ ] Commit deletion of tracked `PATCH_MANIFEST.json` in the GitHub working tree.
- [x] Run all **440/440** static/regression checks and pass source hygiene, version, Functions syntax, App Check, handoff, browser-preflight, dependency-health structure, and **161-file** Hosting boundary gates.
- [x] Build/verify the **764-file** full ZIP and **307-file** manifestless patch with **7 delete paths**; replay over v1.6.84 with a simulated legacy manifest matched exactly (`764/764`, missing 0, extra 0, changed 0).

# v1.6.84 release checklist

- [x] Reproduce the v1.6.83 CI failure with `APPLY_PATCH_CLEANUP.cmd` absent from the Git checkout.
- [x] Keep `*.cmd` globally ignored and add the exact `!APPLY_PATCH_CLEANUP.cmd` Git exception.
- [x] Require the Windows cleanup helper in `HANDOFF_PACKAGE.json`.
- [x] Add `PATCH_MANIFEST.json` to the handoff deletion contract and keep it in `DELETE_PATHS.txt`.
- [x] Add a Git-backed v1.6.84 regression proving the approved helper is trackable and arbitrary `.cmd` files remain ignored.
- [x] Run all **439/439** configured static/behavioral checks.
- [x] Pass source hygiene, version, Functions syntax, App Check, handoff, browser-preflight, dependency-health structure, and **161-file** Hosting boundary checks.
- [x] Build/verify the **762-file** full ZIP and **302-file** manifestless patch with **7 delete paths**.
- [x] Replay the patch over the v1.6.83 baseline and match v1.6.84 exactly (`762/762`, missing 0, extra 0, changed 0).

# v1.6.82 release checklist

- [x] Exclude `tabindex="-1"` and `aria-disabled` controls from shared modal focus rotation.
- [x] Exclude controls under hidden, inert, `aria-hidden`, and content-visibility-hidden ancestors.
- [x] Reuse the shared focusability filter in the workspace chooser with a safe local fallback.
- [x] Add dedicated v1.6.82 regression coverage.
- [x] Run all **437/437** configured static/behavioral checks (`110/110`, `110/110`, `110/110`, `107/107`) and release gates.
- [ ] Build and verify full/patch delivery ZIPs and patch replay.

# v1.6.81 release checklist

- [x] Compact AI Mastering header to a command surface and remove decorative hero content from AI mode only.
- [x] Preserve Expert mode full studio DOM and all shared mastering/download/Dock state.
- [x] Register optional workspace chooser with the shared overlay/history manager.
- [x] Keep the required first-entry chooser outside browser Back history.
- [x] Make the background app shell inert while workspace choice is open and restore prior inert state on close.
- [x] Exclude CSS-hidden chooser controls from keyboard focus rotation.
- [x] Increase mobile chooser readability/touch sizing and bind panel height to the visual viewport.
- [x] Add dedicated v1.6.81 regression coverage.
- [x] Run all **436/436** configured checks (`109/109` x4) and release gates.
- [x] Build/verify the **756-file** full ZIP and **297-file** manifestless patch with **7 delete paths**.
- [x] Replay the final patch over v1.6.80 and reproduce v1.6.81 exactly (`756/756`, missing 0, extra 0, changed 0).

# v1.6.80 release checklist

- [x] Add required first-entry `AI 마스터링` / `전문가 모드` chooser.
- [x] Keep the choice non-dismissible until one workspace is selected.
- [x] Reuse the same track/analysis/mastering/download/Dock runtime state in both modes.
- [x] Present AI mode as one column: import → queue → analysis.
- [x] Keep file/folder import controls side by side on mobile.
- [x] Add a header workspace switch without clearing current work.
- [x] Preserve Expert mode full studio layout and controls.
- [x] Add dedicated v1.6.80 regression coverage.
- [x] Pass all **435/435** configured checks in bounded slices (`109/109`, `109/109`, `109/109`, `108/108`).
- [x] Pass version, Functions syntax, App Check policy, source hygiene, handoff, browser-preflight, and **161-file** Hosting boundary gates.
- [x] Build/verify the **754-file** full ZIP and **296-file** manifestless patch, then replay over v1.6.79 exactly.

# v1.6.75 release checklist

- [x] Download dialog taller viewport contract.
- [x] Worker encoding progress mounted above filename controls.
- [x] Progress auto-reveal with sticky-footer safe scroll clearance.
- [x] Incident admission rejection blocks Firestore fallback bypass.
- [x] Admission rejection does not create a new local retry item.
- [x] 430/430 static/behavioral regression pass.
- [x] Functions/App Check/handoff/browser preflight/dependency/Hosting gates pass.
- [ ] Physical Kakao/Android/iOS viewport acceptance after deployment.
- [ ] Firebase admission/TTL/SMTP production acceptance after deployment.

# FoxBear v1.6.74 release checklist

- [x] Add deterministic duplicate-before-admission ordering for Callable incident reports.
- [x] Add UID minute/hour/KST-day budgets and a separate manual-test daily budget.
- [x] Add global minute/hour admission caps to reduce anonymous UID churn bursts.
- [x] Add `incidentMailState/admissionControl` `enabled/degraded/disabled` server emergency modes and Callable `maxInstances` ceiling.
- [x] Add immediate 30-day TTL and `firestore-fallback` provenance to Spark direct Firestore reports.
- [x] Distinguish Spark stored/no-mail-service state in incident delivery diagnostics.
- [x] Apply decoded-memory limits to post-master alternate-download re-decode.
- [x] Align browser automatic incident daily rollover to KST.
- [x] Add dedicated v1.6.74 regression coverage.
- [x] Run all **429/429** configured checks in bounded slices (`108/108`, `108/108`, `108/108`, `105/105`).
- [x] Run source hygiene, version, Functions syntax, App Check policy, handoff, dependency, browser-preflight, and Hosting checks.
- [x] Build and verify the **740-file** full ZIP and **290-file** patch plus manifest and 7 delete paths.
- [ ] Verify deployed Firebase admission-control modes, TTL deletion, SMTP delivery, and physical mobile/WebView memory behavior.

# FoxBear v1.6.72 release checklist

- [x] Reproduce the exact three GitHub Actions source-hygiene errors in a tracked Git fixture.
- [x] Add `ci-safe` mode with narrow allowlisted cleanup followed by strict verification.
- [x] Convert allowlisted CI cleanup annotations from errors to warnings.
- [x] Keep `.env*` and unknown unsafe files as non-repairable failures.
- [x] Preserve explicit non-mutating strict audit mode.
- [x] Update both GitHub Pages workflows before dependency installation and inside the static release gate.
- [x] Add dedicated v1.6.72 regression coverage.
- [x] Pass all 427 configured checks and the 156-file Hosting boundary.
- [x] Build the 735-file full ZIP and the 293-file patch plus manifest and 7 delete paths.
- [x] Apply the final patch over v1.6.71 and reproduce v1.6.72 exactly (`735/735`).

# FoxBear v1.6.71 release checklist

- [x] Add atomic IndexedDB lease ownership for each PWA share ID.
- [x] Renew the lease while import is active and validate ownership before deletion.
- [x] Preserve failed shares for reload retry and prevent duplicate two-tab import.
- [x] Recover expired claims during service-worker activation without deleting active claims.
- [x] Add storage estimate checks, quota cleanup, one-write retry, and deleted-database recreation.
- [x] Centralize Android limits at 12 files, 220 MiB per file, and 512 MiB total.
- [x] Add canonical App Check JSON, Functions contract, local parity gate, and postdeploy verifier.
- [x] Split service-worker registration and share launch into `pwa-runtime-bridge.js`.
- [x] Run actual Chromium success, retry, race, forced deletion, boundary, and handoff scenarios.
- [x] Run all **426/426** configured static and behavioral checks.
- [x] Run Functions syntax, browser preflight, version, SRI, source hygiene, handoff, App Check, dependency, and Hosting checks.
- [x] Verify the **156-file** Firebase Hosting boundary.
- [x] Verify root official npm production audit with 0 vulnerabilities.
- [x] Build and verify the 733-file full archive and 304-file patch plus manifest.
- [x] Apply the patch over v1.6.70 and reproduce v1.6.71 exactly (`733/733`).
- [ ] Retry Functions official audit when registry DNS is available.
- [ ] Run the deployed App Check comparison after v1.6.71 Hosting and Functions deployment.
- [ ] Complete a physical Android share-sheet acceptance pass.

# FoxBear v1.6.70 release checklist

- [x] Share launch waits for the actual asynchronous import pipeline.
- [x] Shared records are deleted only after confirmed import success or a terminal non-retryable outcome.
- [x] Transient import exceptions preserve the record and launch query for reload retry.
- [x] Share records remain bounded by 24-hour TTL, eight-record cap, and 768 MiB aggregate budget.
- [x] Shared title, text, and URL metadata are length-capped.
- [x] App Check diagnostics warn on deployed client/server policy version, mode, or reason drift.
- [x] Fallback Pages deployment runs Static release gate before browser scope and Chromium installation.
- [x] Version-only full/patch verifier path changes are treated as release metadata.
- [x] Dedicated v1.6.70 regression and share-service syntax check are configured.
- [x] Run all 421 configured checks in bounded slices (`106/106`, `105/105`, `105/105`, `105/105`).
- [x] Run metadata, SRI, source hygiene, handoff, Hosting, dependency, browser-preflight, and Functions checks.
- [x] Build and verify the 723-file full archive and 285-file changed-file patch plus manifest.
- [x] Apply the patch over v1.6.69 and reproduce v1.6.70 exactly (`723/723`).
- [ ] Complete real Chromium/PWA share-target, storage-quota, and deployed Firebase acceptance.

# FoxBear v1.6.69 release checklist

- [x] Browser release gate depends on a successful Static release gate.
- [x] All public Callable Functions use the centralized immutable App Check policy helper.
- [x] Client and Functions policy metadata agree on mode, enforcement, contract version, and reason.
- [x] Actual App Check token presence is observable without falsely claiming enforcement.
- [x] PWA share target validates type, 220 MiB per-file limit, 512 MiB total limit, and 12-file limit before storage.
- [x] Share records expire after 24 hours and retain at most eight IndexedDB records.
- [x] Share launch/error query parameters are cleared after all terminal outcomes.
- [x] Share launch logic is split into a dedicated boot service and `src/app.js` remains below 13,300 lines.
- [x] Dedicated v1.6.69 regression and share-service syntax check are configured.
- [x] Run all 420 configured checks in bounded slices (`105/105` four times).
- [x] Run metadata, SRI, source hygiene, handoff, Hosting, dependency, browser-preflight, and Functions checks.
- [x] Build and verify the 721-file full archive and 288-file changed-file patch plus manifest.
- [x] Apply the patch over v1.6.68 and reproduce v1.6.69 exactly (`721/721`).
- [ ] Complete real Chromium/PWA share-target and deployed Firebase acceptance.

# FoxBear v1.6.68 release checklist

- [x] External-browser and design-preview local assets use the current release generation.
- [x] PWA manifest and shortcut icons use versioned URLs.
- [x] SRI updater and verifier cover all three public HTML code-asset shells.
- [x] Service worker preserves allowlisted auxiliary HTML navigation and canonical offline fallback.
- [x] Root recovery and metadata documents use no-cache/no-store Hosting headers.
- [x] Generated `dist/` output is locally repairable before archive-mode packaging.
- [x] Dedicated v1.6.68 regression is configured.
- [x] Run all 418 configured checks in bounded slices (`105/105`, `105/105`, `105/105`, `103/103`).
- [x] Run metadata, SRI, source hygiene, handoff, Hosting, dependency, browser-preflight, and Functions checks.
- [x] Build and verify the 717-file full archive and 288-file changed-file patch plus manifest.
- [x] Apply the patch over v1.6.67 and reproduce v1.6.68 exactly (`717/717`).
- [ ] Complete real desktop/mobile/Kakao auxiliary-navigation acceptance with installed Chromium.

# FoxBear v1.6.63 release checklist

- [x] Track model retains exact imported `sourceFileName`.
- [x] Completed output freezes `outputNameMeta.sourceName` with actual mastering metadata.
- [x] Bulk summary key includes every completed track and changes when a middle row changes.
- [x] Export review shows at most 12 names and copies the complete final-name manifest.
- [x] ZIP preflight exposes collision, sanitization, and UTF-8 truncation adjustments.
- [x] UTF-8 truncation preserves complete grapheme clusters and removes dangling joiners/marks.
- [x] Download dialog provides filename copy with accessible success/failure feedback.
- [x] Mobile copy/settings controls are 44 px and forced-colors borders are present.
- [x] Chromium CDP fixtures render at 360x800, 430x932, and 1280x900 without horizontal overflow.
- [x] Dedicated v1.6.63 regression is configured.
- [x] Run all 413 configured checks in bounded slices (`138/138`, `138/138`, `137/137`).
- [x] Run metadata, SRI, Hosting, dependency, browser-preflight, Python hygiene, and Functions checks; handoff is verified with the final archives.
- [x] Build and verify both 732-entry v1.6.63 archives.
- [ ] Complete real desktop/mobile/Kakao clipboard and ZIP-manifest acceptance.

# FoxBear v1.6.62 release checklist

- [x] Download dialog shows the exact selected-format filename before saving.
- [x] Global switches independently control mastered, LUFS, style, format, and platform tokens.
- [x] Completed masters retain immutable mastering-time filename metadata.
- [x] Same-format, transformed, share, sequential, and ZIP paths rebuild names through one policy.
- [x] Bulk action area reports duplicate-name collisions before export.
- [x] localStorage failure falls back to current-session memory.
- [x] Long multilingual names wrap and narrow mobile controls collapse to one column.
- [x] Required selected-state styling does not depend on CSS `:has()`.
- [x] Dedicated v1.6.62 regression is configured.
- [x] Run all 412 configured checks in bounded slices (`138/138`, `137/137`, `137/137`).
- [x] Run handoff, metadata, SRI, Hosting, dependency, browser-preflight, Python hygiene, and Functions checks.
- [x] Build and verify both 730-entry release archives.
- [ ] Complete real desktop/mobile/Kakao filename and layout acceptance.

# FoxBear v1.6.60 release checklist

- [x] ZIP request remains a single archive and never starts the individual queue automatically.
- [x] Soft memory risk remains a warning below 200 files / 1,500 MB.
- [x] ZIP worker file count, size metadata, and `.zip` delivery name are validated.
- [x] HUD current-row navigation re-resolves the DOM and retries unmeasurable layout.
- [x] Dedicated v1.6.60 regression is configured.
- [ ] Run all 409 configured checks.
- [ ] Run handoff, metadata, SRI, Hosting, and archive verification.
- [ ] Complete real desktop/mobile/Kakao large-batch acceptance.

# FoxBear v1.6.59 release checklist

- [x] COOP remains `same-origin-allow-popups` for Google popup authentication.
- [x] CORP is the valid restrictive value `same-origin`.
- [x] Public readiness never reads the Gmail Secret or creates an SMTP transport.
- [x] SMTP deep checks require verified Google auth and active `siteAdmins/{uid}` authorization.
- [x] Readiness cooldown documents are fixed to `public` and `admin`, not UID.
- [x] Same-instance checks are coalesced and Callable instances are bounded to two.
- [x] Public restricted rows render as warnings and the summary says `기본 정상`.
- [x] Dedicated v1.6.59 plus historical v1.6.7/v1.6.8 regressions pass.
- [x] Complete all 408 configured checks in bounded slices (`136/136` three times).
- [x] Run metadata, SRI, handoff, dependency, Hosting, browser preflight, Python hygiene, and Functions checks.
- [x] Build and verify both 722-entry release archives.
- [ ] Deploy and verify real anonymous and Google-administrator paths.
- [ ] Run full Playwright browser automation where Chromium is installed.

# FoxBear v1.6.57 release checklist

- [x] Firebase Hosting public root is `dist/hosting`, not the repository root.
- [x] Hosting predeploy runs `npm run hosting:check` for direct CLI deployments.
- [x] Staging copies only approved root files plus `assets/`, `src/`, and `vendor/`.
- [x] Hidden, secret-like, executable, and symbolic-link payload entries are rejected.
- [x] `.firebase/` is ignored and the tracked Hosting cache is removed.
- [x] Dedicated synthetic and actual-payload regression passes.
- [x] Run all 406 configured static/regression checks and verify both release archives.
- [x] Run metadata, SRI, handoff, dependency, Hosting, browser-fixture preflight, and Functions syntax checks.
- [ ] Run browser automation after installing `@playwright/test` and Chromium.
- [ ] Re-run the aggregate `npm run check:release` wrapper in an environment without the sandbox process limit.
- [ ] Deploy to Firebase and verify private repository paths return 404.

# v1.6.47 release checklist

- [x] Non-Firebase Hosting origins do not call `getRedirectResult()`.
- [x] GitHub Pages uses popup authentication first.
- [x] Popup network failure waits for a delayed Google auth-state result.
- [x] Redirect authentication is restricted to approved Firebase Hosting origins.
- [x] External-host failure uses a fixed, validated `foxbear-music.web.app` fallback with bounded settings handoff.
- [x] The secure-origin marker is removed from the address and the administrator dialog is reopened.
- [x] Opaque cross-origin `Script error.` events do not overwrite the import status.
- [x] Same-origin application exceptions still use the visible error path.
- [x] All 392 configured checks pass in three bounded chunks.
- [x] Both verified archives contain 692 entries and zero executable payloads.
- [ ] Deploy both GitHub Pages and Firebase Hosting, then verify the real Google account and `siteAdmins/{UID}` flow.

# v1.6.46 release checklist

- [x] `auth/network-request-failed` is handled before any `siteAdmins/{UID}` authorization claim.
- [x] Approved Firebase Hosting domains resolve to same-origin `authDomain` values.
- [x] Document and Hosting CSP permit both project Hosting origins for auth frames and connections.
- [x] Popup network failure receives at most one redirect fallback attempt.
- [x] Redirect loops and missing redirect results become explicit diagnostics.
- [x] Diagnostics omit query strings, OAuth parameters, and tokens.
- [x] App Check remains disabled and Trusted Types remains narrowly enforced.
- [x] All 391 configured checks pass in bounded execution chunks.
- [x] Both verified archives contain 690 entries and zero executable payloads.
- [ ] Add both OAuth `/__/auth/handler` redirect URIs in the production Google OAuth client.
- [ ] Deploy and verify real Google administrator login.

# v1.6.45 release checklist

- [x] The release gate does not directly spawn `npm.cmd` on Windows.
- [x] Firebase Hosting ignores Windows executable and command-file extensions.
- [x] Release and overwrite ZIP verification rejects executable payloads.
- [x] `deploy:spark` runs Hosting payload hygiene before Firebase deployment.
- [x] App Check SDK, site key, token header, and reCAPTCHA CSP allowances are absent.
- [x] Administrator authorization remains Google Auth plus `siteAdmins/{UID}` Firestore Rules.
- [x] All 390 configured checks pass; both verified archives contain 688 entries.
- [ ] Deploy with `npm run deploy:spark` and verify the real Google account chooser.

# v1.6.44 release checklist

- [x] The exact Firebase Auth loader `/js/api.js` remains allowed.
- [x] Generated gapi iframe modules under `/_/scs/apps-static/_/js/` are allowed.
- [x] Lookalike Google paths and external origins remain blocked.
- [x] Rejected URL diagnostics omit query strings.
- [x] Strict Trusted Types and CSP enforcement remain enabled.
- [x] All 389 configured static and behavioral checks pass.
- [x] Both final archives contain 683 entries and pass compressed-data integrity checks.
- [ ] Deploy with `npm run deploy:spark` and verify the real Google account chooser.

# v1.6.43 release checklist

- [x] Official configured QA passes `388/388`.
- [x] Both archives contain 681 entries and pass compressed-data integrity.
- [x] Trusted Types remains enforced with a narrow Firebase Auth-compatible default policy.
- [x] Document and Hosting CSP allow the exact Google Auth loader and Firebase authentication iframe.
- [x] COOP uses `same-origin-allow-popups` for the Google account chooser.
- [x] The Trusted Types bootstrap is precached before Firebase initialization.

- [x] Settings exposes Google administrator authentication without a shared browser PIN.
- [x] Unregistered Google accounts receive their Firebase UID for one-time Firestore registration.
- [x] Firestore Rules require `google.com`, verified email, `active: true`, matching email, and matching provider fields.
- [x] Clients cannot create, update, list, or delete `siteAdmins` documents.
- [x] Administrator logout signs out Google and restores anonymous Firebase authentication.
- [x] Administrator PIN Secret Manager and Callable Function dependencies are removed.
- [x] `npm run deploy:spark` deploys Hosting, Firestore Rules, and indexes only.
- [x] All 386 configured static and behavioral checks pass.
- [x] Static release gate, browser preflight, Functions syntax, dependency, engine, and golden-audio checks pass.
- [x] Both final archives contain 678 entries and zero compressed-data errors.
- [ ] Enable Google Authentication and create the production `siteAdmins/{UID}` document.
- [ ] Perform the real deployed Google login and administrator monitor check.

# v1.6.41 release checklist

- [x] Settings exposes an administrator monitoring action on mobile and desktop layouts.
- [x] The administrator PIN is absent from HTML, JavaScript, setup examples, environment examples, and release archives.
- [x] `unlockAdminAccess` reads the PIN only from Firebase Secret Manager.
- [x] PIN comparison uses fixed-length cryptographic digests and `timingSafeEqual`.
- [x] Failed attempts are bounded by UID and hashed network fingerprint without storing the raw address.
- [x] Five failures within ten minutes create a fifteen-minute lock.
- [x] Successful verification creates an eight-hour administrator session.
- [x] Firestore Rules reject expired administrator sessions.
- [x] Optional App Check enforcement is documented and disabled until production setup is complete.
- [x] All 386 configured static and behavioral checks pass.
- [x] Browser fixture preflight and Firebase Functions syntax pass.
- [x] Dependency metadata reports 0 errors and 5 expected missing-install warnings.
- [x] Engine balanced fixture measures approximately 1.95x realtime and golden audio remains -14.00 LUFS.
- [x] Both final archives contain 678 entries and zero compressed-data errors.
- [ ] Retired in v1.6.42: do not configure the former Secret Manager administrator credential.
- [ ] Deploy Hosting, Firestore Rules/indexes, and `unlockAdminAccess`.
- [ ] Configure Firestore TTL for `adminAccessAttempts.expiresAt`.
- [ ] Enable and validate App Check in the production domain.
- [ ] Perform the real production PIN unlock and verify visit/error monitor data.

# v1.6.40 release checklist

- [x] All matching critical script and stylesheet nodes are evaluated as one candidate set.
- [x] A loaded replacement overrides an older failed duplicate.
- [x] Post-load replacement resources are not marked successful before their own load event.
- [x] Replacement retry state remains bounded to 2.5 seconds.
- [x] Silent replacement timeout becomes a confirmed failure.
- [x] Recovery remains active while a replacement is still pending.
- [x] `DELIVERY_RULES.md` remains a required package file.
- [x] Run all 384 configured checks and release gates.
- [x] Browser fixture preflight and Functions syntax pass.
- [x] Dependency metadata reports 0 errors and 5 expected missing-install warnings.
- [x] Engine balanced fixture measures approximately 1.83x realtime and golden audio remains -14.00 LUFS.
- [x] Both final archives contain 675 entries and zero compressed-data errors.
- [ ] Run installed Chromium and real Android/iOS/PWA resource-replacement timing scenarios.

# v1.6.39 release checklist

- [x] Critical scripts have pending, failed, and restored states.
- [x] Partial JavaScript failure keeps the static UI visible and opens one recovery surface.
- [x] Expired probe responses cannot repopulate client shell reports.
- [x] Clients terminated during a probe are removed from the expected set.
- [x] Surviving non-responders receive one bounded retry.
- [x] `DELIVERY_RULES.md` remains a required package file.
- [x] Run all 383 configured checks and release gates.
- [x] Browser fixture preflight and Functions syntax pass.
- [x] Dependency metadata reports 0 errors and 5 expected missing-install warnings.
- [x] Engine balanced fixture measures approximately 1.81x realtime and golden audio remains -14.00 LUFS.
- [x] Both final archives contain 673 entries and zero compressed-data errors.
- [ ] Run installed Chromium and real Android/iOS/PWA cross-generation deployment scenarios.

# v1.6.38 release checklist

- [x] Run 381 configured static and behavioral checks.
- [x] Run browser fixture preflight and Functions syntax checks.
- [x] Verify version, SRI, cache, handoff, and both archive contracts.
- [x] Confirm pending styles do not show a false recovery notice.
- [x] Confirm Runtime Health suppresses the duplicate shell notice.
- [x] Confirm current and latest rollback shell caches remain after client-aware cleanup.
- [x] Verify both final archives contain 670 entries and zero compressed-data errors.

# FoxBear v1.6.37 release checklist

- [x] Two recent legacy service-worker shell caches are retained.
- [x] Stale generation assets use exact cache-key fallback only.
- [x] UI shell recovery JS and minimal fallback CSS load before the main app.
- [x] Hidden/inert/zero-opacity shell recovery is regression-tested.
- [x] Final cumulative QA `380/380`, browser preflight, Functions, and dependency metadata are recorded.
- [x] Final archives contain 668 entries each and pass compressed-data integrity checks.

# FoxBear v1.6.36 release checklist

- [x] Competing activation claims are fenced before `SKIP_WAITING`.
- [x] Stale generation watchdog cannot remove a newer lease.
- [x] BFCache pageshow reconciles a missed controller change.
- [x] Duplicate controllerchange delivery is idempotent.
- [x] Concurrent AudioContext close calls join one native close.
- [x] 301-cycle Worker lifecycle stress returns to zero active jobs.
- [x] Final cumulative QA `378/378`, browser preflight, Functions, dependency, and engine gates.
- [ ] Final archive entry count and SHA-256 are recorded after packaging.

# FoxBear v1.6.35 release checklist

- [x] Terminal-boundary and page-unload history regressions added.
- [x] Cross-tab service-worker activation lease and timeout regression added.
- [x] Same-URL download assist ownership checked.
- [x] Managed AudioContext 200-cycle cleanup checked.
- [x] Final cumulative QA, browser preflight, Functions, and dependency metadata verified.
- [x] Full and overwrite packages verified with 661 entries each and zero compressed-data errors.

# v1.6.34 추가 릴리스 확인

- [x] 1.5초 watchdog 이후에도 history가 30초간 움직이지 않으면 중복 Back 없이 stale sentinel을 정산한다.
- [x] hard stall 중 새 팝업이 열리면 기존 sentinel을 유지해 실제 뒤로가기가 팝업을 먼저 닫는다.
- [x] BFCache pagehide에서 서비스워커 활동 heartbeat와 BroadcastChannel을 정리한다.
- [x] BFCache pageshow에서 활동 채널과 단일 heartbeat를 즉시 복구한다.
- [x] 동일 ServiceWorkerRegistration의 반복 coordinate가 `updatefound` 리스너를 누적하지 않는다.
- [x] `DELIVERY_RULES.md`의 3단 결과 형식이 두 패키지의 필수 계약으로 유지된다.
- [x] `node qa/v1634_history_hard_stall_sw_activity_lifecycle_smoke.js`가 통과한다.
- [x] 누적 정적·행동 검사 `374/374`, 엔진·골든 오디오·패키지 계약을 확인한다.
- [ ] Android/iOS/설치형 PWA의 실제 BFCache·뒤로가기·서비스워커 업데이트 시점을 검증한다.

# v1.6.33 추가 릴리스 확인

- [x] 내부 Back 이동은 완료됐지만 `popstate`가 누락된 경우 watchdog이 정확한 base 세대를 정산한다.
- [x] sentinel이 그대로인 hard stall에서는 중복 `history.back()`을 호출하지 않는다.
- [x] watchdog 복구 뒤 다음 팝업이 새 sentinel 세대를 받는다.
- [x] 지연 release 세대는 30초 TTL과 최대 8개 상한을 함께 적용한다.
- [x] `DELIVERY_RULES.md`의 3단 결과 형식이 패키지 필수 계약으로 유지된다.
- [x] `node qa/v1633_overlay_history_watchdog_recovery_smoke.js`가 통과한다.
- [x] 누적 정적·행동 검사 `373/373`, 엔진·골든 오디오·패키지 계약을 확인한다.
- [ ] Android/iOS/설치형 PWA에서 실제 history 이벤트 누락·지연을 검증한다.

# v1.6.32 추가 릴리스 확인

- [x] overlay sentinel과 목적지 base history 항목이 같은 세대 번호를 가진다.
- [x] 지연된 내부 `popstate`가 더 최신의 실제 사용자 뒤로가기를 소비하지 않는다.
- [x] 늦게 도착한 정확한 내부 세대는 두 번째 종료 확인 없이 흡수된다.
- [x] BFCache 복귀 시 완료·미완료 history 해제를 복구하고 종료 가드를 중복 생성하지 않는다.
- [x] 다운로드·추천·설정·오류 신고 팝업 반복 시나리오가 통과한다.
- [x] `node qa/v1632_overlay_history_generation_bfcache_recovery_smoke.js`가 통과한다.
- [x] 누적 정적·행동 검사 `372/372`가 통과한다.
- [ ] Android 시스템 뒤로가기, iOS Safari 스와이프, 설치형 PWA BFCache를 실제 기기에서 확인한다.

# v1.6.31 추가 릴리스 확인

- [x] 빠른 팝업 닫기·열기·닫기가 내부 `history.back()`을 한 번만 요청한다.
- [x] 내부 sentinel 해제 중 다시 열린 팝업에 popstate 완료 후 새 sentinel이 한 번만 생성된다.
- [x] 실제 뒤로가기는 열린 팝업을 먼저 닫고 다음 뒤로가기에서만 작업 화면 종료 확인을 표시한다.
- [x] history 진단은 제한된 카운터와 분류명만 포함한다.
- [x] `node qa/v1631_overlay_history_transaction_coalescing_smoke.js`가 통과한다.
- [ ] Android 시스템 뒤로가기, iOS Safari 스와이프, 설치형 PWA 제스처를 실제 기기에서 확인한다.


## v1.5.74 추가 확인

- [ ] 현재 곡 완료 후 다음 곡 전 일시정지와 계속 진행
- [ ] 현재 곡 건너뛰기 후 다음 대기 곡 자동 시작
- [ ] 대기 곡 순서 위·아래 변경과 완료 요약
- [ ] 375px/430px 모바일 다운로드 하단 시트 전체 표시
- [ ] MP3/WAV 2단계 선택 및 하단 고정 다운로드·공유 버튼

## v1.5.73 다중 마스터링 제어 확인

- [ ] 현재 곡 처리 중 `다중 작업 취소`가 워커와 인코더를 중단하고 busy 상태를 해제한다.
- [ ] 이미 완료된 출력은 취소 뒤에도 다운로드 가능하다.
- [ ] 시작 전 곡은 `취소`로 표시되고 자동 재실행되지 않는다.
- [ ] `실패 곡 다시 실행`이 성공·취소 곡을 제외한다.
- [ ] 현재 곡·대기 곡·전체 ETA가 진행에 따라 갱신된다.
- [ ] 결과 필터가 상태만 가리고 트랙 데이터를 변경하지 않는다.
- [ ] 1280px 및 375px 브라우저 계약에서 HUD가 화면 밖으로 넘치지 않는다.

## v1.5.70 mail verification release checks

- [ ] Deploy Functions and Hosting from the same v1.5.70 package.
- [ ] Run a real mail test and record inbox or spam placement.
- [ ] Confirm the 30-minute overdue counter, troubleshooting wizard, search, filters, and CSV export.
- [ ] Confirm no `node_modules`, temporary Playwright stubs, or previous ZIPs are packaged.

# v1.5.69 추가 릴리스 확인

- [ ] `confirmIncidentMailReceiptRequest`를 포함해 Functions를 배포했다.
- [ ] `incidentMailReceiptConfirmationRequests`와 `incidentMailTestHistory` 규칙을 배포했다.
- [ ] 실제 메일 테스트 후 관리자 화면에서 받은편지함 또는 스팸함 수신 확인을 기록했다.
- [ ] 마지막 SMTP 접수·실수신 확인 시각과 7일 경고를 확인했다.
- [ ] 테스트·오류·운영·요약 메일 HTML 디자인과 텍스트 대체 본문을 확인했다.

# v1.5.67 추가 릴리스 확인

- [ ] 관리자 작업 시작·거부·완료·실패가 `incidentAdminAuditLog`에 기록되고 Secret/웹훅 URL은 저장되지 않는다.
- [ ] 기본 웹훅의 재시도 후 보조 웹훅으로 장애 전환되며 중복 성공 전송은 발생하지 않는다.
- [ ] 배포 검증의 네 Firestore 인덱스 프로브가 모두 `ok`다.
- [ ] 운영 이력 상태/원인 필터와 `이력 더 보기`가 중복 없이 동작한다.
- [ ] `verifyIncidentPostDeployHealth` 예약 함수가 6시간 주기로 배포 상태를 갱신한다.
- [ ] 실제 SMTP, 기본 웹훅, 보조 웹훅 수신을 각각 확인한다.

# v1.5.64 추가 릴리스 확인

## v1.5.64 incident operations health

- [ ] `auditIncidentMailOperations`가 Firebase Scheduler에 배포되었다.
- [ ] `incidentOperations/mail` 문서가 15분 이내 갱신된다.
- [ ] 관리자 오류 화면에 메일 운영, 장기 미발송, SMTP/Secret, 오늘 발송 카드가 표시된다.
- [ ] 정상 Secret에서 SMTP 상태가 `ok`로 기록된다.
- [ ] 잘못된 Secret 테스트 환경에서 `secret-invalid` 또는 `smtp-auth-failed`가 기록된다.
- [ ] 주의/위험 전환 경보와 정상 복구 메일이 중복 폭주 없이 도착한다.
- [ ] 오늘 오류 수가 KST 자정 전후에 정확하다.
- [ ] Firestore 규칙과 `delivery.checkedAt` 복합 인덱스가 배포 완료 상태다.


- [ ] KST 00:00 경계에서 `dailyKst_YYYY-MM-DD` 키가 전환되는지 확인
- [ ] 일일 한도 초과 신고가 `failed / daily-email-limit`와 다음 재시도 시간을 갖는지 확인
- [ ] 성공·실패·중복·한도 연기 후 `reservationActive=false`인지 확인
- [ ] 500건 초과 요약이 페이지 처리되고 5,000건 초과 시 제한 문구가 표시되는지 확인
- [ ] SMTP accepted 배열이 비어 있으면 성공으로 기록되지 않는지 확인

## v1.5.46 engine, recommendation, and API audit checks

- [ ] Incomplete analysis metadata never produces NaN recommendation settings.
- [ ] Genre-lock recommendation applies exactly once.
- [ ] Master report records recommended, requested, and effective DSP values.
- [ ] True Peak ceiling warnings use finalizer telemetry when available.
- [ ] Adaptive render target appears in filename and export report.
- [ ] Firebase CDN module version is 12.16.0.
- [ ] Engine bench, golden audio, quality gate, and v1.5.46 smoke pass.

## v1.5.42 ZIP worker cancellation checks

- [ ] Large ZIP generation keeps the main UI responsive.
- [ ] `ZIP 생성 취소` terminates the active Worker and starts no download.
- [ ] Retry after cancellation completes normally.
- [ ] Repeated ZIP clicks create only one job.
- [ ] Queue clearing and mastering remain blocked while ZIP is active.
- [ ] Case-only duplicate and Windows-reserved filenames extract safely.
- [ ] Versioned ZIP Worker launches after PWA cache warm and offline transition.
- [ ] `node qa/v1542_zip_worker_cancellation_smoke.js` passes.

## v1.5.41 export ETA and download recovery checks

- [ ] Long MP3/WAV conversion shows elapsed time and a stable advisory ETA.
- [ ] Twelve seconds without progress shows response-wait or background-throttling guidance.
- [ ] Failed `downloadBlob()` keeps the dialog open with retry controls.
- [ ] All dialog buttons except `변환 취소` are disabled during an active export.
- [ ] Dialog replacement/close clears progress timers and lifecycle listeners.
- [ ] `node qa/v1541_export_eta_download_recovery_smoke.js` passes.

## v1.5.40 export worker progress checks

- [ ] Long MP3 conversion updates stage, percent, and sample detail.
- [ ] Long WAV conversion updates stage and percent without blocking the main UI.
- [ ] `변환 취소` terminates the worker and re-enables format/action controls.
- [ ] Retry after cancellation completes normally.
- [ ] Timeout displays timeout-specific guidance and does not silently fall back to another format.
- [ ] Replacing the download dialog aborts the previous conversion.
- [ ] Master finalizer and encoder phases update only the active track job.
- [ ] `node qa/v1540_export_worker_progress_smoke.js` passes.

## v1.5.27 device glyph and SRI hardening checks

- [ ] The cyan desktop and pink phone glyphs remain visible after application boot on desktop and mobile.
- [ ] `updateAdminStatsTriggerVisibility()` does not erase nested compatibility markup.
- [ ] The top command header has no bottom divider.
- [ ] `python3 qa/verify_sri.py` checks every local JavaScript/CSS asset and rejects missing or malformed integrity attributes.
- [ ] `python3 qa/v1527_header_device_sri_hardening_smoke.py` passes.
- [ ] Desktop browser project passes 6/6.
- [ ] Mobile browser project passes 6/6.

## v1.5.26 engraved command header checks

- [ ] Import queue reports `active: 0` and `pending: 0` before preview playback.
- [ ] Render scheduler reports neither pending nor in-render work before playback.
- [ ] The desktop/mobile play control owns its center-point hit test for at least 220 ms.
- [ ] Hidden select-popup panels are excluded through ancestor visibility checks.
- [ ] Studio → phone → laptop → mono → studio keeps one audio element.
- [ ] Translation changes call neither `audio.play()` nor `audio.pause()`.
- [ ] Desktop browser project passes 6/6.
- [ ] Mobile browser project passes 6/6.

## v1.5.24 responsive preview-control checks

- [ ] Desktop preview routing uses the visible `#bottomPreviewPlayBtn`.
- [ ] Mobile preview routing uses the visible `.dock-integrated-toggle`.
- [ ] Hidden `aria-modal` roots are not counted as blocking dialogs.
- [ ] The selected play control is visible, enabled, and owns its center-point hit test.
- [ ] Studio → Smartphone → Laptop → Mono → Studio keeps the same playing audio element without pause/restart.
- [ ] `node qa/v1524_e2e_responsive_preview_control_smoke.js` passes.

## v1.5.22 header and preview-routing checks

- [ ] Version, PC/mobile compatibility, and DESIGN BY labels remain on one compact line without card borders.
- [ ] Settings remains a compact header gear and opening its panel does not shift hero copy.
- [ ] While audio is playing, switch Studio → Smartphone → Laptop → Mono → Studio and confirm playback never pauses or restarts.
- [ ] Confirm transitions are smooth and retain currentTime, selected source, waveform playhead, and Media Session state.
- [ ] Confirm `FoxBearAudioContexts.getSnapshot()` does not accumulate preview-translation contexts after repeated track changes.
- [ ] `node qa/v1522_header_preview_routing_smoke.js` passes.

## v1.5.21 history and CSP console checks

- [ ] `index.html` and `design-preview.html` meta CSP omit `frame-ancestors`.
- [ ] Firebase Hosting HTTP CSP retains `frame-ancestors 'none'`.
- [ ] Back/forward Playwright coverage reaches `#foxbear-e2e-back-test` after traversing at most one exit-guard sentinel.
- [ ] Runtime Health browser QA reports no CSP console errors.
- [ ] `node qa/v1521_history_csp_console_contract_smoke.js` passes.

# Release Checklist

## Metadata and dependency reproducibility

```bash
npm ci
npm run version:check
```

Confirm that `package-lock.json` is committed and the release/package filenames use `package.json.version`.

## Automated release gate

Install Chromium once on a new machine or CI runner:

```bash
npm run qa:browser:install
```

Run the complete release gate:

```bash
npm run check:release
```

This includes release metadata validation, the static/smoke suite, and the normal desktop/mobile Chromium Playwright suite. A static-only pass is not sufficient for release sign-off.

## Release-candidate deep checks

```bash
npm run qa:browser:deep
```

Also test a real PC and at least one real mobile/PWA device with a large batch. Confirm Runtime Health, Wake Lock, navigation/back behavior, Bulk HUD, Memory Guard diagnostics, ZIP progress/validation, and per-track export fallback.

## Packaging

```bash
npm run package:clean
npm run package:overwrite
npm run package:verify:release
npm run package:verify:overwrite
```

The overwrite command also runs this verification internally through `tools/verify-overwrite-zip.js`; the release package uses `tools/verify-release-zip.js`. Confirm that `playwright.config.js`, both Pages workflows, browser helpers, and runtime source trees are present. Inspect generated ZIP names and run `npm run version:check` once more after any packaging-related edit.

## v1.5.8 memory/export checks

- After completing one and several masters, confirm `FoxBearMemoryGuard.getSnapshot().masteredBufferCount === 0`.
- Confirm the current output format downloads normally and alternate formats show the re-mastering requirement after PCM release.
- Confirm `FoxBearExportGuard.getReadiness()` reports `strategy`, `estimatedWorkingSetBytes`, and `workingSetLimitBytes`.
- On a low-memory/mobile test profile, confirm an unsafe ZIP is stopped before generation and the per-track download action is shown.
- On a normal desktop batch, confirm ZIP packaging uses `STORE`, progress reaches 100%, and the generated archive opens correctly.


## v1.5.9 version display and stale-cache checks

- Confirm the top badge reads the same product version as `FoxBearBuildInfo.productVersion`.
- Open the program information dialog and confirm its eyebrow shows the same version.
- Confirm `FoxBearReleasePresentation.getReport().productVersion` matches `package.json.version` and `recoveredStaticMismatch` is normally `false` on a fresh deployment.
- Run `await FoxBearReleasePresentation.requestServiceWorkerReleaseInfo()` and confirm `matches === true` after the new worker controls the page.
- Confirm `manifest.webmanifest.description` contains the current product version and build ID.
- Reload an upgraded PWA twice and confirm an older cached top-version label does not return.


## v1.5.10 header settings layout checks

- Confirm `#mobileNativeQuickToggle` is mounted inside `#headerSettingsHost`, after the designer card.
- Confirm wide desktop shows `⚙️ 설정`; tablet/mobile show a compact square gear without brand-row wrapping.
- Open the panel at desktop, tablet, and 320-390px mobile widths and confirm it is not clipped and stays inside the viewport.
- Rotate a mobile device or resize the browser while the panel is open and confirm its right/top alignment updates.
- Hide an active Bulk HUD and confirm the separate lower-left `보이기` recovery control still works.

## v1.5.11 AudioContext and browser CI checks

- Confirm `FoxBearAudioContextManager.getDiagnostics().activeCount` returns to zero after closing preview/difference dialogs and after decode completion.
- Confirm Performance Diagnostics includes the `audioContexts` snapshot.
- Confirm the normal Playwright suite no longer contains `waitUntil: 'networkidle'`.
- Confirm a failed Actions browser run uploads the `browser-qa-*` artifact with trace/error context.
- Confirm `npm run qa:browser` reaches the application-owned Runtime Health readiness signal instead of waiting for Firebase/PWA network silence.
## v1.5.12 CI readiness checks

- Confirm `waitForRuntimeHealth()` waits for `report.appReady || report.bootFailed` and prints the latest report on timeout.
- Confirm GitHub Actions runs no more than two Playwright workers and all 12 desktop/mobile tests finish.
- Confirm the PWA suite waits for an active service-worker registration before `registration.update()`.
- Confirm Wake Lock request/release passes with a fresh mocked sentinel.
- Confirm workflow annotations no longer report Node 20 deprecation for checkout, setup-node, or upload-artifact.
- On failure, inspect `browser-qa-*` and use the Runtime Health report embedded in the Playwright error before opening the trace.



## v1.5.13 handoff/package checks

- Confirm the cumulative overwrite ZIP contains `playwright.config.js`.
- Confirm `npm run package:overwrite` prints `PASS overwrite ZIP contents verified`.
- Confirm `CI=true node -e "const c=require('./playwright.config.js'); console.log(c.workers)"` prints `1` or `2`.
- Apply the overwrite ZIP to a clean v1.5.11 tree and confirm `npm run check` does not fail at `v1512_ci_runtime_readiness_smoke.js`.

## GitHub Desktop overwrite deletion check

- Before copying an overwrite package, inspect `HANDOFF_PACKAGE.json.deletePaths`. Remove each listed repository-relative path in GitHub Desktop's working tree before committing. An empty array means no deletion step is required.


## v1.5.19 CI isolation and archive checks

- Confirm Runtime Health browser QA reports `localRequestFailures`, `pageErrors`, or `consoleErrors` with actual values when deliberately broken.
- Confirm Firebase CDN/backend availability does not affect the normal 10-test core browser gate.
- Confirm the history test performs both `goBack` and `goForward` without a swallowed error.
- Occupy the configured E2E port with an unrelated server and confirm the ownership probe rejects it.
- Confirm both package verification scripts point to the current `package.json.version`.
- Confirm ZIP verification rejects a symbolic link, `../` entry, `qa/static-audit.txt`, `.tmp`, and `.trace` artifact.
## v1.5.23 preview playback readiness

- [ ] Preview translation browser test uses `disableAutoDialogs: true` only for the routing scenario.
- [ ] Dock play button is visible, enabled, unobstructed, and has no blocking modal before click.
- [ ] Failure output includes modal count and topmost hit-test element.


## v1.5.66 확인

- [ ] 관리자 재전송·일괄 복구 중복 요청이 서버에서 거절되는지 확인
- [ ] 보조 경보 테스트 성공·실패·쿨다운 상태 확인
- [ ] 배포 검증에서 Hosting/Functions 버전 일치 확인
- [ ] 최근 운영 이력의 원인 코드와 권장 조치 확인
- [ ] 실제 브라우저 QA에서 Firebase 모의 `setDoc` 경로 확인

## v1.5.72 확인

- [ ] 여러 곡 분석 완료 후 분석 HUD 자동 숨김 및 전체 마스터링 포커스 이동
- [ ] 여러 곡 마스터링에서 단일 HUD 미표시, 현재 곡 목록 강조 및 자동 추적
- [ ] 관리자 간소화 보기, 미확인 테스트 보존형 정리, 감사 로그 검색·CSV
- [ ] 720px 이하 메일 테스트·감사 로그 카드형 상세 화면
- [ ] `cleanupIncidentMailTestsRequest` 포함 Functions·Rules·Indexes 동시 배포
## v1.6.76 checks
- [x] Mobile encoding progress remains visible with visual viewport changes under the static/behavioral contract.
- [x] Runtime fault counters remain metadata-only and bounded.
- [x] Full 431-check regression set and release-side static gates pass.
- [ ] Physical Kakao/Android/iOS keyboard/address-bar acceptance remains a deployment/device check.

