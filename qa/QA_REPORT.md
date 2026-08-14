# FoxBear QA Report - v1.6.100

## v1.6.100 SW/stereo/cleanup hardening

- Static and behavioral target: **456 checks**.
- New regression: `qa/v16100_sw_stereo_ci_cleanup_hardening_smoke.js`.
- New browser matrix: `qa/browser/mobile-ai-admin-header-matrix-playwright.spec.js`.
- CI regression: retired `spectrum-visualizer.js/css` are now first-stage Source Hygiene violations until physically deleted and committed.
- PWA regression: stale exact versioned requests can recover from any FoxBear shell cache after a Service Worker process restart.
- Audio regression: analysis is intentionally mono/stereo-only, matching final mastering output semantics.

## Verification status

- Full configured static/behavioral suite: **456/456 PASS**.
- Final Source Hygiene / Version-SRI / Handoff / App Check / Functions syntax / browser preflight: **PASS**.
- Firebase Hosting boundary: **161 files**.
- Delivery: **642-file FULL**, **317-file PATCH**, **9 cleanup paths**.
- v1.6.99 FULL + v1.6.100 PATCH + cleanup replay: **REPLAY_MATCH=YES**.

# FoxBear QA Report - v1.6.99

## v1.6.99 header role separation + focus integrity

- Compatibility PC/mobile glyph is a static status image and cannot be replaced by admin-auth state.
- Admin monitor is a separate native button with hidden/disabled auth gating and focus restoration.
- Mobile AI mode and <=430px header rules keep the compatibility glyph visible.
- Regression: `qa/v1699_header_role_separation_focus_integrity_smoke.js`.


## Configured target

- Static and behavioral checks: **453**.
- New regression: `qa/v1698_spectrum_retirement_mobile_header_integrity_smoke.js`.

## Verification scope

- Requires the user-facing AI Spectrum View JS/CSS and all runtime mount/analyser dependencies to be absent.
- Preserves the mastering engine's FFT/spectrum analysis data path used for audio decisions.
- Requires mobile AI mode to preserve the PC/phone compatibility glyph while allowing only the redundant compact text label to collapse.
- Rechecks detail rendering, playback/translation graphs, runtime health, Service Worker precache, SRI, and release packaging after the retirement.

## Verification status

- Focused v1.6.98 regression: **PASS**.
- Full configured static/behavioral suite: **453/453 PASS** across bounded ranges (114 + 114 + 114 + 111; historical spectrum contracts migrated to retirement assertions).
- Delivery verification: **637-file CLEAN FULL**, **316-file PATCH**, **9 cleanup paths**, including physical retirement of the spectrum JS/CSS: **PASS**.

# FoxBear QA Report - v1.6.97

## Configured target

- Static and behavioral checks: **453**.
- New regression: `qa/v1697_boot_payload_delivery_privacy_smoke.js`.

## Verification scope

- Preserves active old Service Worker shell generations and defers retirement on incomplete client probes.
- Requires minimum-shell hard-fail installation plus best-effort optional boot caching.
- Rejects forbidden Git-tracked paths until index deletion is staged/committed.
- Synchronizes and validates `package.json.description`.
- Removes redundant main-thread JSZip boot cost and keeps ZIP ownership inside the Worker.
- Keeps raw SMTP response and operational recipient details out of user-readable incident delivery state.

## Verification status

- Focused v1.6.97 regression: **PASS**.
- Full configured static/behavioral suite: **453/453 PASS** across bounded ranges (`114 + 114 + 114 + 111`, with the single historical-metadata assertion corrected and re-run).
- Delivery verification: **635-file CLEAN FULL**, **314-file PATCH**, **7 cleanup paths**, base-only deletion 0: **PASS**.

# FoxBear QA Report - v1.6.94

## Configured target

- Static and behavioral checks: **450**.
- Hardened regressions: Pages artifact completeness, Dock track ownership, strict release hygiene, and suite-level bytecode cleanup.

## Verification scope

- Requires `external-browser.html` in the GitHub Pages required-file set and artifact verification.
- Requires selected track, Dock state owner, and rendered player/audio owner to agree before Dock integrity can report healthy.
- Requires normal release and GitHub Pages CI hygiene paths to run in strict, non-mutating mode.
- Requires the legacy root `PATCH_MANIFEST.json` to be absent.
- Requires Python bytecode cleanup at QA suite boundaries rather than after every static check.

## Verification status

- Configured 450-check static/behavioral suite: **450/450 PASS** across bounded full-index ranges.
- Dock stale-owner reproduction: selected `b`, Dock/audio owner `a` is reported unhealthy, forces one render, then reports healthy on owner `b`: **PASS**.
- GitHub Pages build: `_site/external-browser.html` exists and is a required artifact: **PASS**.
- Default source-hygiene gate reports `strict`; legacy `PATCH_MANIFEST.json` is absent: **PASS**.
- Version/SRI, Firebase Hosting boundary (**163 files**), App Check policy, Functions syntax, browser preflight, and handoff: **PASS**.
- `src/app.js`: **13,298 lines**, still below the `<13,300` structural gate.
- QA performance hardening removes per-check bytecode scans; ZIP worker timeout cleanup reduced the focused v1.5.42 runtime from about 5.3s to about 0.3s in this environment.

# FoxBear QA Report - v1.6.93

## Configured target

- Static and behavioral checks: **450**.
- New regression: `qa/v1693_mobile_dock_visibility_integrity_recovery_smoke.js`.
- New service syntax gate: `src/ui/bottom-preview-dock-integrity-service.js`.

## Verification scope

- Requires AI mode Dock visibility to follow `.show` plus `aria-hidden=false` instead of an unconditional mode override.
- Requires stale active-track selection to recover before Dock rendering can clear a valid mobile Dock.
- Requires recovery precedence of last Dock owner → valid selection set → first remaining track.
- Requires Dock integrity diagnostics and scheduled bounded self-repair after render/layout/UI-mode lifecycle changes.

## Verification status

- Full configured suite: **450/450 PASS** across bounded ranges (`113 + 113 + 113 + 111`).
- Focused Dock/mobile/Spectrum suite: **44/44 PASS**.
- Chromium 393px CSS reconstruction: AI hidden `display:none/height=0`, AI active `display:block/height=57px`, Expert active `display:block/height=57px`, Expert hidden `display:none/height=0`: **PASS**.
- Active-selection recovery behavior cases: Dock owner, selection set, first-track fallback, already-valid selection, empty queue: **PASS**.
- `src/app.js`: **13,298 lines**, below the `<13,300` structural gate.
- Version/SRI, source hygiene, browser preflight, Functions syntax, local App Check policy, dependency structure, and handoff checks: **PASS**.
- Firebase Hosting boundary: **163 allowlisted files**.
- Delivery verification: **781-file full/release ZIP**, **307-file manifestless overwrite patch**, **7 delete paths**, no generated `PATCH_MANIFEST.json`: **PASS**.
- Full Playwright app navigation remains a GitHub Actions acceptance step because this execution environment blocks the required app navigation path.

# FoxBear QA Report - v1.6.92

## Configured target

- Static and behavioral checks: **448**.
- New regression: `qa/v1692_spectrum_panel_mount_lifecycle_smoke.js`.

## Verification scope

- Reproduces the detached AI Spectrum canvas lifecycle that previously yielded a blank graph with valid analysis data.
- Requires the pending canvas to survive until DOM mount, then render all 24 static FFT bands.
- Requires idle/paused playback to stay on the static analyzed profile instead of attempting a live capture stream.
- Adds diagnostics for pending mount state, static profile count, last draw mode, and draw success.

## Verification status

- Focused v1.6.92 spectrum lifecycle regression: **PASS**.
- Chromium synthetic 24-band mount reconstruction: **PASS**; mounted canvas paints FFT/grid content and reports `hasPanelCanvas:true`, `lastStaticValueCount:24`, `lastDrawSucceeded:true`.
- Full configured suite: **448/448 PASS** across four bounded ranges of 112 checks.
- Engine QA bench, golden audio pack, piano transient integrity, SRI, version synchronization, source hygiene, browser preflight, Functions syntax, local App Check policy, dependency structure, and handoff checks: **PASS**.
- Firebase Hosting boundary: **162 allowlisted files**.
- Delivery verification: **778-file full/release ZIP**, **305-file manifestless overwrite patch**, **7 delete paths**, no generated `PATCH_MANIFEST.json`: **PASS**.
- Full Playwright app navigation remains a GitHub Actions acceptance step because this execution environment blocks the required app navigation path.

# FoxBear QA Report - v1.6.91

## Configured target

- Static and behavioral checks: **447**.
- New regression: `qa/v1691_runtime_health_hidden_geometry_contract_recovery_smoke.js`.

## Verification scope

- Reproduces the exact annotation semantics behind `Expected: <= 1` / `Received: 91.96875`.
- Prevents visible `deviceRight` geometry from being compared with the zero DOMRect of a compact `display:none` Studio token.
- Keeps `rowOverlap <= 1px`, the v1.6.90 header CSS contract marker, and the Mastering Engine picker isolation unchanged.
- Adds relation-specific assertion messages for build→device, device→studio, studio→actions, and compact device→actions geometry.

## Verification status

- Focused v1.6.91 regression: **PASS**.
- Full configured suite: **447/447 PASS** across bounded continuation ranges.
- Engine QA bench, golden audio pack, piano transient integrity, SRI, version synchronization, source hygiene, browser preflight, Functions syntax, local App Check policy, and handoff checks: **PASS**.
- Firebase Hosting boundary: **162 allowlisted files**.
- Pixel-class static browser reconstruction with all 27 loaded CSS files: actual left/right rail overlap remains **0px** at 393px and 320px.
- Delivery verification: **776-file full ZIP**, **305-file manifestless overwrite patch**, **7 delete paths**, no generated `PATCH_MANIFEST.json`: **PASS**.
- Full Playwright app navigation remains a GitHub Actions acceptance step because this execution environment blocks the required app navigation path.

# FoxBear QA Report - v1.6.90

## Configured target

- Static and behavioral checks: **446**.
- New regression: `qa/v1690_engine_control_overlay_header_contract_recovery_smoke.js`.

## Verification scope

- Mastering Engine picker history/body-lock isolation and close-before-change ordering.
- Deferred setting dispatch plus scheduled render refresh for goal/style/strength/platform controls.
- Engine-control diagnostics in the performance support snapshot.
- Header CSS generation marker and Runtime Health source-contract assertions before strict overlap geometry.
- Legacy tracked `PATCH_MANIFEST.json` deletion.

## Verification status

- Focused v1.6.90 regression: **PASS**.
- Full configured suite: **446/446 PASS** in bounded slices (`112 + 112 + 112 + 110`).
- Engine QA bench, golden audio pack, piano transient integrity, SRI, version synchronization, source hygiene, and browser preflight: **PASS**.
- Full Playwright app navigation remains a GitHub Actions acceptance step because this execution environment blocks the required app navigation path.
- Functions syntax, local App Check policy, handoff, and Firebase Hosting staging (**162 allowlisted files**): **PASS**.
- Delivery verification: **774-file full ZIP**, **306-file manifestless overwrite patch**, **7 delete paths**, no generated `PATCH_MANIFEST.json`: **PASS**.

# FoxBear QA Report - v1.6.89

## Configured target

- Static and behavioral checks: **444**.
- New regression: `qa/v1689_mobile_header_flex_ownership_ci_diagnostics_smoke.js`.

## Verification scope

- Converts only the Pixel-class command header to a two-rail nowrap Flexbox ownership contract.
- Keeps the strict browser overlap threshold while promoting overlap details into explicit thrown diagnostics.
- Verifies legacy `PATCH_MANIFEST.json` cleanup remains active while only its known repetitive GitHub warning annotation is suppressed.

## Verification status

- Focused v1.6.89 regression: **PASS**.
- Full configured suite: **444/444 PASS** in bounded slices (`110 + 110 + 110 + 114`).
- Source hygiene, version synchronization, Functions syntax, local App Check policy, handoff, browser preflight, and Firebase Hosting staging: **PASS**.
- Firebase Hosting boundary: **161 allowlisted files**.
- Dependency health: **0 errors / 5 warnings** because installed dependencies are intentionally absent from the delivery tree.
- Full Playwright app navigation remains a GitHub Actions acceptance step in this execution environment.
- Delivery verification: **771-file full ZIP**, **306-file manifestless patch**, **7 delete paths**; replay over v1.6.88 with a simulated legacy `PATCH_MANIFEST.json` matched exactly (`771/771`, missing 0, extra 0, changed 0) and cleanup removed the manifest.

# FoxBear QA Report - v1.6.88

## Configured target

- Static and behavioral checks: **443**.
- New regression: `qa/v1688_mobile_header_grid_ownership_recovery_smoke.js`.

## Verification scope

- Gives the left and right command-header rails explicit CSS Grid column ownership.
- Neutralizes legacy `width: 100% !important` pressure on `.brand-kicker` when it is also the command-left grid item.
- Preserves the 430px device/studio/creator reductions and the workspace/settings controls.
- Keeps both initial and 320px browser overlap assertions strict while making the failing viewport explicit.

## Verification status

- Focused v1.6.88 regression: **PASS**.
- Full configured suite: **443/443 PASS** in bounded chunks.
- Source hygiene, version synchronization, Functions syntax, local App Check policy, handoff, browser preflight, and Firebase Hosting staging: **PASS**.
- Firebase Hosting boundary: **161 allowlisted files**.
- Pixel 5 Playwright-device geometry using all 27 loaded CSS files: `rowOverlap=0`, `leftOverflow=0` at 393px and 320px; desktop 1440px also reports zero overlap.
- Dependency health: **0 errors / 5 warnings** because installed dependencies are intentionally absent from the delivery tree.
- Full Playwright network navigation remains a GitHub Actions acceptance step in this environment.
- Delivery verification: **769-file full ZIP**, **307-file manifestless patch**, **7 delete paths**; replay over v1.6.87 with a simulated legacy `PATCH_MANIFEST.json` matched exactly (`769/769`, missing 0, extra 0, changed 0) and cleanup removed the manifest.

# FoxBear QA Report - v1.6.87

## Configured target

- Static and behavioral checks: **442**.
- New regression: `qa/v1687_mobile_header_device_label_overlap_recovery_smoke.js`.

## Verification scope

- Removes the final compact-header width pressure from the redundant device text at 430px and below.
- Preserves device glyphs, DOM/accessibility text, workspace switch, settings control, and strict browser overlap assertions.

## Verification status

- Focused v1.6.87 regression: **PASS**.
- Full configured suite and release gates are revalidated before delivery.

# FoxBear QA Report - v1.6.86

## Configured target

- Static and behavioral checks: **441**.
- New regression: `qa/v1686_header_order_mobile_overflow_browser_gate_smoke.js`.

## Verification scope

- Resets the stale creator-link flex order so desktop visual order matches the Runtime Health DOM contract.
- Retires the nonessential creator token at 430px and below to protect Pixel-class header width.
- Preserves the workspace mode switch and settings control at compact widths.
- Keeps the 320px overflow sentinel and source-hygiene cleanup contract.

## Verification status

- Focused v1.6.86 regression: **PASS**.
- Full configured suite: **441/441 PASS** in bounded execution.
- Source hygiene, version synchronization, Functions syntax, local App Check policy, handoff, browser preflight, and Firebase Hosting staging: **PASS**.
- Firebase Hosting boundary: **161 allowlisted files**.
- Deployed App Check verification and full Playwright browser execution require external network/browser access; GitHub Actions remains authoritative.
- Delivery verification: **766-file full ZIP**, **304-file manifestless patch**, **7 delete paths**; replay over v1.6.85 with a simulated legacy `PATCH_MANIFEST.json` matched exactly (`766/766`, missing 0, extra 0, changed 0).

# FoxBear QA Report - v1.6.85

## Configured target

- Static and behavioral checks: **440**.
- New regression: `qa/v1685_browser_sentinel_ui_mode_header_recovery_smoke.js`.

## Verification scope

- Gives Runtime Health browser QA a test-only UI-mode fallback that does not depend solely on sessionStorage.
- Preserves the 40px mobile workspace switch while hiding the redundant studio command token at 430px and below to eliminate compact-header clipping.
- Updates Runtime Health geometry assertions to measure the mode switch and responsive-hidden elements explicitly.
- Emits exact GitHub error annotations for repeated browser retry cases instead of aggregate-only counts.
- Keeps `PATCH_MANIFEST.json` in the cleanup deletion contract.

## Verification status

- Focused v1.6.85 regression: **PASS**.
- Full configured suite: **440/440 PASS** in bounded execution. A long aggregate command hit the environment's outer time limit, so the exact remaining ranges were resumed and all configured checks completed successfully.
- Source hygiene, version synchronization, Functions syntax, App Check policy, handoff, browser preflight, and Firebase Hosting staging: **PASS**.
- Firebase Hosting boundary: **161 allowlisted files**.
- Dependency health: **0 errors / 5 warnings** because installed `node_modules` is intentionally absent from the delivery tree.
- Local Chromium CSS geometry probe at 1440/430/393/375/320px: **0 left overflow / 0 row overlap** at every viewport; the mobile workspace switch remains 40px high.
- Full Playwright navigation cannot run in this environment because browser navigation is blocked by policy. GitHub Actions remains the authoritative browser execution environment.
- Delivery verification: **764-file full ZIP**, **307-file manifestless overwrite patch**, **7 delete paths**. Replay over v1.6.84 with a simulated legacy `PATCH_MANIFEST.json` matched exactly (`764/764`, missing 0, extra 0, changed 0).

# FoxBear QA Report - v1.6.84

## Configured target

- Static and behavioral checks: **439**.
- New regression: `qa/v1684_git_tracked_cleanup_static_gate_smoke.js`.

## Verification scope

- Reproduces the GitHub v1.6.83 checkout by removing the ignored Windows cleanup helper and confirms the historical v1.6.83 regression exits non-zero.
- Keeps `*.cmd` ignored globally while allowing exactly `APPLY_PATCH_CLEANUP.cmd` to be tracked and committed.
- Requires the Windows cleanup helper in `HANDOFF_PACKAGE.json` and keeps `PATCH_MANIFEST.json` in both handoff and patch deletion contracts.

## Verification status

- Focused v1.6.84 regression: **PASS**.
- Full configured suite: **439/439 PASS** in bounded execution; one long slice hit the outer runner timeout only after its completed checks had all passed, and the remaining checks were resumed from the exact next index.
- Static release prerequisites (source hygiene, version sync, App Check policy, handoff, dependency structure) and Functions syntax: **PASS**.
- Browser fixture preflight and Firebase Hosting staging: **PASS**.
- Firebase Hosting boundary: **161 allowlisted files**.
- Dependency health reports **0 errors / 5 warnings** because `node_modules` is intentionally absent from the handoff tree.
- Delivery verification: **762-file full ZIP**, **302-file manifestless overwrite patch**, **7 delete paths**; replay over the v1.6.83 baseline matched exactly (`762/762`, missing 0, extra 0, changed 0).

# FoxBear QA Report - v1.6.83

## Configured target

- Static and behavioral checks: **438**.
- New regression: `qa/v1683_browser_gate_ui_mode_fixture_source_hygiene_smoke.js`.

## Verification scope

- Existing browser E2E navigation receives an explicit Expert-mode session before application scripts initialize, preventing the required first-entry chooser from intercepting unrelated legacy scenarios.
- First-entry workspace behavior remains testable by opting out with `uiMode: false`.
- Patch ZIP generation always includes shell and Windows source-hygiene cleanup helpers and keeps `PATCH_MANIFEST.json` in the deletion list.

## Verification status

- Focused v1.6.83 regression: **PASS**.
- Full configured suite: **438/438 PASS** in bounded slices (`110/110`, `110/110`, `110/110`, `108/108`).
- Version synchronization, Functions syntax, App Check policy, source hygiene, GitHub Desktop handoff, browser preflight, and Firebase Hosting staging: **PASS**.
- Firebase Hosting boundary: **161 allowlisted files**.
- Browser Playwright execution cannot be reproduced in this container because the Playwright dependency is unavailable and local Chromium navigation is blocked by environment policy; GitHub Actions remains the authoritative browser execution environment.

# FoxBear QA Report - v1.6.82

## Configured target

- Static and behavioral checks: **437**.
- New regression: `qa/v1682_overlay_focus_ancestor_hardening_smoke.js`.

## Verification scope

- Shared modal focus rotation excludes `tabindex="-1"` and `aria-disabled` controls.
- Hidden, inert, `aria-hidden`, and content-visibility-hidden ancestor chains cannot leak descendants into the focus loop.
- Workspace chooser reuses the shared modal focus filter and keeps a dependency-light equivalent fallback.

## Verification status

- Focused v1.6.82 regression: **PASS**.
- v1.6.81 workspace/overlay regression after release-metadata advancement: **PASS**.
- Full configured suite: **437/437 PASS** in bounded slices (`110/110`, `110/110`, `110/110`, `107/107`).
- Version synchronization, Functions syntax, App Check policy, source hygiene, GitHub Desktop handoff, browser preflight, dependency structure, and Firebase Hosting staging: **PASS**.
- Firebase Hosting boundary: **161 allowlisted files**.
- Delivery archive counts are recorded after final package generation.

# FoxBear QA Report - v1.6.81

## Configured target

- Static and behavioral checks: **436**.
- New regression: `qa/v1681_ai_workspace_polish_navigation_accessibility_smoke.js`.

## Verification scope

- Compact AI Mastering command surface with the decorative hero removed while preserving import, queue, analysis, mastering actions, and Dock state.
- Required first-entry chooser stays outside browser Back history; optional reopened chooser participates in shared overlay history.
- Background shell inert ownership, hidden-close focus filtering, session mode root synchronization, and visual-viewport-safe mobile sizing.

## Verification status

- Focused v1.6.81 regression: **PASS**.
- Full configured suite: **436/436 PASS** in bounded slices (`109/109`, `109/109`, `109/109`, `109/109`).
- Overlay/history regressions v1.6.15, v1.6.16, and v1.6.30-v1.6.35: **PASS**.
- Version synchronization, Functions syntax, App Check policy, source hygiene, GitHub Desktop handoff, browser preflight, dependency structure, and Firebase Hosting staging: **PASS**.
- Firebase Hosting boundary: **161 allowlisted files**.
- Verified delivery: **756-file** full ZIP and **297-file** manifestless overwrite patch with **7 delete paths**. Applying the patch over v1.6.80 reproduced the final tree exactly (`756/756`, missing 0, extra 0, changed 0).

# FoxBear QA Report - v1.6.80

## Configured target

- Static and behavioral checks: **435**.
- New regression: `qa/v1680_ai_mastering_expert_workspace_smoke.js`.

## Verification scope

- First-entry AI Mastering / Expert mode chooser and session restore.
- AI mode single-column import → queue → analysis presentation using the existing shared DOM/state.
- Mode switching preserves mastering, Dock, download, and analysis state by avoiding duplicated runtime stores.

## Verification status

- Focused v1.6.80 smoke: **PASS**.
- Full configured suite: **435/435 PASS** in bounded slices (`109/109`, `109/109`, `109/109`, `108/108`).
- Version synchronization, Functions syntax, App Check policy, source hygiene, GitHub Desktop handoff, browser preflight, and Firebase Hosting staging: **PASS**.
- Firebase Hosting boundary: **161 allowlisted files**.
- Verified delivery: **754-file** full ZIP and **296-file** manifestless overwrite patch with **7 delete paths**.

# FoxBear QA Report - v1.6.79

## Configured target

- Static and behavioral checks: **434**.
- New regression: `qa/v1679_manifestless_patch_playback_retirement_smoke.js`.

## Verification scope

- Manifestless GitHub Desktop patch delivery with legacy `PATCH_MANIFEST.json` cleanup-only handling.
- Source-hygiene rejection of stale generated patch manifests.
- Git-aware patch ZIP file-set verification without extracting generated metadata into the repository.
- Bounded retired playback ObjectURL lifetime that preserves actively playing sources and retires expired paused stale sources.

## Final result

- Static and behavioral checks: **434/434 passed** in bounded slices (`109/109`, `109/109`, `109/109`, `107/107`).
- Dedicated v1.6.79 regression reproduced strict rejection and ci-safe cleanup of a legacy root patch manifest, then verified manifestless delivery and bounded inactive playback retirement.
- Version synchronization, Functions syntax, App Check policy, GitHub Desktop handoff, browser preflight, source hygiene, dependency structure, and Firebase Hosting staging passed.
- Firebase Hosting boundary: **159 allowlisted files**.
- Verified full ZIP: **750 files**. Patch ZIP: **296 overwrite files**, no generated `PATCH_MANIFEST.json`, with **7 delete paths**.

# FoxBear QA Report - v1.6.78

## Configured target

- Static and behavioral checks: **433**.
- New regression: `qa/v1678_release_generation_assist_url_playback_invalidation_smoke.js`.

## Verification scope

- Release generation consistency across `package.json`, `index.html`, service worker cache, 404, external browser, manifest, README/CHANGELOG, and build metadata.
- Full archive verification by extracting the ZIP and rerunning the release metadata checker inside the archive.
- Patch archive rejection when a shipped `index.html` carries a stale product/asset generation.
- Download-assist ObjectURL ownership while the panel remains open and BFCache restoration lifetime refresh.
- Playback-safe mastered-output invalidation through retired URL ownership rather than immediate revoke.
- Historical QA compatibility across future build IDs.

## Final result

- Static and behavioral checks: **433/433 passed** in bounded slices (`109/109`, `109/109`, `109/109`, `106/106`).
- Dedicated v1.6.78 regression verified package-generation gates, archive verification, assist URL ownership, BFCache refresh, and playback-safe invalidation.
- Version synchronization, Functions syntax, App Check policy, GitHub Desktop handoff, browser preflight, source hygiene, and Firebase Hosting staging passed.
- Firebase Hosting boundary: **159 allowlisted files**.
- Verified full ZIP: **748 files**. Patch ZIP: **295 overwrite files plus `PATCH_MANIFEST.json`**, with **7 delete paths**.
- v1.6.77 was found to contain a mixed v1.6.77/v1.6.76 release generation; v1.6.78 corrects it and adds archive-level prevention.

# FoxBear QA Report - v1.6.76

## Configured target

- Static and behavioral checks: **431**.
- New regression: `qa/v1676_download_viewport_runtime_fault_diagnostics_smoke.js`.

## Verification scope

- Mobile download sheet sizing against `visualViewport.height` and keyboard/browser-chrome bottom insets.
- Encoding progress visibility when the viewport resizes or scrolls during an active conversion.
- Mobile `min-height` fencing so a reduced visual viewport cannot be overridden by the older full-height sheet minimum.
- Removal of the sticky primary-action overlay while encoding is active.
- Privacy-safe bounded runtime fault counters for selected recoverable storage, service-worker, auth, and download cleanup paths.
- Performance/download/incident diagnostic integration without free-form exception messages or stacks.

## Final result

- Static and behavioral checks: **431/431 passed** in bounded slices (`108/108`, `108/108`, `108/108`, `107/107`).
- The dedicated v1.6.76 regression verified visualViewport sizing, keyboard/browser-chrome bottom inset handling, progress re-reveal, non-sticky working actions, bounded fault aggregation, and privacy-safe diagnostics.
- Version synchronization, Functions syntax, source hygiene, App Check policy, GitHub Desktop handoff, browser preflight, dependency structure, and Firebase Hosting staging passed.
- Dependency structure reported **0 errors** and 5 expected missing-install warnings because delivery ZIPs intentionally exclude `node_modules`.
- Firebase Hosting boundary: **159 allowlisted files**.
- Verified full ZIP: **745 files**. Patch ZIP: **293 overwrite files plus `PATCH_MANIFEST.json`**, with **7 delete paths**.
- Applying the v1.6.76 patch over the supplied v1.6.75 full tree and deleting `DELETE_PATHS.txt` paths reproduced the v1.6.76 full tree exactly.
- Physical-device acceptance remains for Kakao/Android/iOS keyboard/address-bar transitions and long-running encode memory behavior.

# FoxBear QA Report - v1.6.75

## Configured target

- Static and behavioral checks: **430**.
- New regression: `qa/v1675_download_progress_admission_fallback_closure_smoke.js`.

## Verification scope

- Taller desktop/mobile download dialog boundaries and safe-area scroll clearance.
- Encoding progress placement above filename controls and automatic visibility when conversion starts.
- Structured incident admission error propagation across Callable/same-origin transport.
- Server admission rejection fencing before direct Firestore fallback.
- Non-queued client handling for deliberate rate-limit/emergency-disabled rejections.

## Final result

- Static and behavioral checks: **430/430 passed** in four bounded slices (`108/108`, `108/108`, `108/108`, `106/106`).
- The dedicated v1.6.75 regression verified download progress visibility, taller mobile/desktop viewport contracts, structured admission errors, Firestore fallback fencing, and non-queued admission suppression.
- Historical download-layout regressions were updated to accept the intentionally taller sheet while preserving sticky actions and viewport containment.
- Functions syntax, App Check policy, handoff, dependency structure, browser preflight, version synchronization, and the **158-file** Firebase Hosting boundary passed.
- Dependency structure reported **0 errors** and 5 expected missing-install warnings because release ZIPs intentionally exclude `node_modules`.
- The verified full ZIP contains **742 files**. The patch declares **290 overwrite files plus `PATCH_MANIFEST.json`** and **7 delete paths**.
- Applying the v1.6.75 patch over the supplied v1.6.74 full tree and deleting `DELETE_PATHS.txt` paths reproduced the v1.6.75 full tree exactly (`missing 0 / extra 0 / changed 0`).

# FoxBear QA Report - v1.6.74

## Configured target

- Static and behavioral checks: **429**.
- New regression: `qa/v1674_incident_admission_spark_retention_download_memory_smoke.js`.

## Verification scope

- Callable incident admission with per-UID minute/hour/KST-day budgets, manual-test budget, global UID-churn caps, duplicate-before-budget ordering, emergency control modes, and `maxInstances` ceiling.
- Spark-only Firestore fallback provenance and 30-day TTL validation under Firestore Rules.
- Explicit `stored-no-mail-service` state when a fallback report is stored but Callable delivery is unavailable.
- Download output re-decode memory policy on standard and low-memory/mobile environments.
- Browser automatic-incident day rollover aligned to KST.

## Final result

- Static and behavioral checks: **429/429 passed** in four bounded slices (`108/108`, `108/108`, `108/108`, `105/105`).
- The dedicated v1.6.74 regression verified UID/global admission contracts, duplicate-before-budget ordering, Spark fallback TTL/provenance, stored-without-mail-service status, download re-decode budgets, and KST rollover.
- Source hygiene, version synchronization, Functions syntax, App Check policy, handoff, dependency structure, browser preflight, and the **158-file** Firebase Hosting boundary passed.
- Dependency structure reported **0 errors** and 5 expected missing-install warnings because release ZIPs intentionally exclude `node_modules`.
- The verified full ZIP contains **740 files**. The patch declares **290 overwrite files plus `PATCH_MANIFEST.json`** and **7 delete paths**.
- Applying the v1.6.74 patch over the supplied v1.6.73 full tree and deleting `DELETE_PATHS.txt` paths reproduced the v1.6.74 full tree exactly.
- Real Firebase Console TTL activation, emergency-mode toggling, deployed Functions/SMTP behavior, and physical mobile/WebView long-audio acceptance remain production checks.

# FoxBear QA Report - v1.6.73

## Configured target

- Static and behavioral checks: **428**.
- New regression: `qa/v1673_csp_memory_admission_runtime_config_smoke.js`.

## Verification scope

- Firebase Hosting CSP compatibility of the 404 route-recovery page without `unsafe-inline`.
- Service-worker precache coverage for the new recovery CSS/JavaScript assets.
- Unknown-metadata large-file admission behavior on low-memory and standard devices.
- Exact post-decode PCM/resident-memory rejection before downstream analysis.
- Optional Functions alert sender/recipient environment overrides and validation.
- Source hygiene deletion of tracked Firebase local state and generated QA output.

## Final result

- Static and behavioral checks: **428/428 passed** in four bounded slices (`107/107`, `107/107`, `107/107`, `107/107`).
- The dedicated v1.6.73 regression verified strict Firebase CSP compatibility, versioned recovery assets, service-worker precache coverage, unknown-memory admission, exact post-decode memory rejection, mail routing overrides, and source-hygiene deletions.
- Historical route-recovery/mail regressions were migrated from inline-HTML/direct-constant assumptions to the new external-module/environment-override contracts and passed.
- Source hygiene, version synchronization, Functions syntax, browser preflight coverage, and the **158-file** Firebase Hosting boundary passed.
- The verified full ZIP contains **738 files**. The patch declares **292 overwrite files plus `PATCH_MANIFEST.json`** and **7 delete paths**.
- Real Kakao/WebView long-audio memory behavior and deployed Firebase mail-routing behavior remain external production acceptance checks.

# FoxBear QA Report - v1.6.72

## Configured target

- Static and behavioral checks: **427**.
- New regression: `qa/v1672_ci_hygiene_self_repair_smoke.js`.

## Verification scope

- Exact reproduction of `.firebaserc`, `.firebase/hosting..cache`, and `qa/static-audit.txt` committed in a Git checkout.
- GitHub Actions `ci-safe` cleanup followed by strict tracked-file verification.
- Non-blocking warning annotations for allowlisted generated/project-local paths.
- Continued hard failure and non-deletion for `.env.production` and other secret-like files.
- Explicit strict audit mode remains non-mutating and available.

## Final result

- Static and behavioral checks: **427/427 passed** in four bounded slices (`107/107`, `107/107`, `107/107`, `106/106`).
- The exact three reported paths were removed from a simulated GitHub Actions checkout and the strict follow-up check passed.
- Allowlisted cleanup produced warning annotations and no error annotations.
- `.env.production` remained on disk and failed with an error annotation.
- Version, SRI, handoff, App Check policy, source hygiene, Functions syntax, browser preflight, dependency structure, and the **156-file** Hosting boundary passed.
- Dependency health reported 0 structural errors and 5 expected missing-install warnings.
- The verified full ZIP contains **735 files**. The patch declares **293 files plus `PATCH_MANIFEST.json`** and **7 delete paths**.
- Applying the final patch over v1.6.71 reproduced v1.6.72 exactly (`735/735`, no missing, extra, or changed files).
# FoxBear QA Report - v1.6.71

## Configured target

- Static and behavioral checks: **426**.
- New regression: `qa/v1671_pwa_share_lease_handoff_deploy_policy_smoke.js`.
- New browser E2E: `qa/browser/pwa-share-lease-handoff-playwright.spec.js`.
- New syntax targets: share policy, PWA runtime bridge, and App Check comparison tools.

## Verification scope

- Atomic multi-tab share claim, heartbeat, owner-checked completion, failure release, and stale-claim takeover.
- Quota estimate, active-claim-safe cleanup, one-write retry, database deletion recreation, TTL/count/byte retention.
- Android 12-file, 220 MiB per-file, and 512 MiB batch boundaries.
- Service-worker activation handoff and expired claim recovery.
- Canonical and deployed App Check client/Functions policy comparison.
- PWA bridge module split and delivery artifact reproduction.

## Final result

- Official static and behavioral checks: **426/426 passed**.
- Actual system Chromium passed share success, transient failure/reload retry, two-tab single import, forced IndexedDB deletion/recreation, Android boundary, and service-worker update handoff.
- `src/app.js` is **13,242 lines**, below the 13,300-line structural gate.
- Release metadata, SRI, handoff, App Check policy, source hygiene, browser preflight, Functions syntax, and the **156-file** Hosting boundary passed.
- Dependency health reported 0 structural errors and 5 missing-install warnings.
- Root production audit against the official npm endpoint reported 0 vulnerabilities.
- Functions official audit could not complete because registry DNS resolution returned `EAI_AGAIN`.
- The deployed App Check comparison could not complete before v1.6.71 deployment; the local and mocked deployed-policy gates passed.
- The verified full ZIP contains **733 files**. The patch declares **304 files plus `PATCH_MANIFEST.json`** and **7 delete paths**. Applying it over v1.6.70 reproduced v1.6.71 exactly (`733/733`).

# FoxBear QA Report - v1.6.69

## Configured target

- Static and behavioral checks: **420**.
- New regression: `qa/v1669_ci_app_check_share_target_hardening_smoke.js`.
- New syntax target: `src/boot/pwa-share-target-service.js`.

## Verification scope

- Static-before-browser GitHub Actions dependency ordering.
- Shared Functions App Check policy and non-overridable Callable options.
- Accurate disabled-policy token-observation metadata and administrator diagnostics.
- PWA share-target audio validation, per-file/total quotas, record expiry, bounded retention, and launch-query cleanup.
- Dedicated share-target boot-module delegation and `src/app.js` structural budget.
- Existing audio, export, PWA cache, Firebase, CI hygiene, and delivery regressions.

## Final result

- Official static and behavioral checks: **420/420 passed** in four bounded `105/105` slices.
- CI ordering, App Check policy drift guards, token-observation diagnostics, share payload limits, retention, and query cleanup passed.
- `src/app.js` is 13,251 lines and remains below the 13,300-line structural gate.
- Release metadata, SRI, handoff state, source hygiene, browser preflight, Functions syntax, and the 153-file Hosting boundary passed.
- Dependency health reported 0 errors and 5 expected missing-install warnings because Playwright and Functions packages are not installed in this environment.
- Root production lockfile audit reported 0 vulnerabilities; the Functions online audit could not complete because registry DNS access failed.
- Installed Chromium, real PWA share invocation, and deployed Firebase acceptance remain external.
- The verified full ZIP contains **721 files**.
- The patch contains **288 declared files plus `PATCH_MANIFEST.json`**, with **7 delete paths**.
- Applying the patch over the supplied v1.6.68 full tree reproduced the v1.6.69 source tree exactly (`721/721`, no missing, extra, or changed files).

# FoxBear QA Report - v1.6.68

## Configured target

- Static and behavioral checks: **418**.
- New regression: `qa/v1668_public_shell_cache_integrity_smoke.js`.

## Verification scope

- Current-generation query coverage for local assets in `index.html`, `external-browser.html`, and `design-preview.html`.
- SHA-384 SRI update and validation across all public HTML code assets.
- Explicit no-cache/no-store policy for public root shell and recovery documents.
- Existing audio, export, PWA, Firebase, CI hygiene, and delivery regressions.

## Final result

- Official static and behavioral checks: **418/418 passed** in bounded slices (`105/105`, `105/105`, `105/105`, `103/103`).
- Public HTML cache-generation, SRI, manifest-icon, auxiliary-navigation, and archive-mode `dist/` repair regressions passed.
- Release metadata, handoff state, source hygiene, browser preflight, Functions syntax, and the 152-file Hosting boundary passed.
- Dependency health reported 0 errors and 5 expected missing-install warnings because Playwright and Functions packages are not installed in this environment.
- The verified full ZIP contains **717 files**.
- The patch contains **288 declared files plus `PATCH_MANIFEST.json`**, with **7 delete paths**.
- Applying the patch over the supplied v1.6.67 full tree reproduced the v1.6.68 source tree exactly (`717/717`, no missing, extra, or changed files).
- Installed Chromium and deployed Firebase acceptance remain external.

# FoxBear QA Report - v1.6.67

## Configured target

- Static and behavioral checks: **417**.
- New regression: `qa/v1667_ci_strict_source_hygiene_policy_smoke.js`.

## Final result

- Official static and behavioral checks: **417/417 passed** in bounded slices (`105/105`, `105/105`, `105/105`, `102/102`).
- CI strict mode failed a committed `.firebaserc` fixture without deleting it and emitted a GitHub file annotation plus local remediation commands.
- Local repair mode removed only allowlisted generated/local state and then passed strict validation.
- `.env.production` remained untouched and correctly failed the gate.
- Release metadata, handoff state, dependency metadata, browser preflight, Functions syntax, and the 152-file Hosting boundary passed.
- Dependency health reported 0 errors and 5 expected missing-install warnings because Playwright and Functions packages are not installed in this environment.
- Installed Chromium and deployed Firebase acceptance remain external.
- The verified full ZIP contains **715 files**.
- The patch contains **286 declared files plus `PATCH_MANIFEST.json`**, with **7 delete paths**.
- Applying the patch over the supplied v1.6.66 full tree reproduced the v1.6.67 source tree exactly (`715/715`, no missing, extra, or changed files).

# FoxBear QA Report - v1.6.66

## Configured target

- Static and behavioral checks: 416
- New regression: `qa/v1666_static_gate_source_hygiene_repair_smoke.js`

## Verification scope

- CI-safe cleanup of stale `.firebaserc`, `.firebase/`, `.audit-results/`, and generated QA text output.
- Strict follow-up source hygiene validation after cleanup.
- Secret-like `.env*` files remain blocked and are never auto-deleted.
- GitHub Desktop cleanup command and patch application guidance.

## Final result

- Official configured static and behavioral checks: **416/416 passed** in four bounded slices (`104/104`, `104/104`, `104/104`, `104/104`).
- A stale-file fixture containing `.firebaserc`, `.firebase/hosting..cache`, and `qa/static-audit.txt` was removed before the strict static gate continued.
- Secret-like `.env.production` remained untouched by repair and correctly failed the source hygiene check.
- Source hygiene, release metadata, handoff state, browser fixture preflight, Firebase Functions syntax, and the 152-file Hosting boundary passed.
- Dependency health reported 0 errors and 5 expected missing-install warnings because Playwright and Firebase Functions packages are not installed in this environment.
- The verified full ZIP contains 712 files.
- The patch contains 283 declared source files plus `PATCH_MANIFEST.json`, with 7 delete paths.
- Applying the patch over the supplied v1.6.65 full tree with the three stale generated files present, then running the repair command, reproduced the v1.6.66 source tree exactly (`712/712`, no missing, extra, or changed files).
- Real Playwright/device browser and deployed Firebase acceptance remain external.

# FoxBear QA Report - v1.6.64

## Configured target

- Static and behavioral checks: 414
- New regression: `qa/v1664_github_desktop_delivery_artifact_contract_smoke.js`

## Verification scope

- Full and patch alias naming and one-command delivery generation.
- Git-tracked source hygiene and archive-time exclusion of local/generated/secret-like files.
- Inclusion of patch notes and explicit deletion paths.
- Release-gate ordering and handoff-format contract.

## Final result

- Official configured static and behavioral checks: **414/414 passed** in three bounded slices (`138/138`, `138/138`, `138/138`).
- Source hygiene, release metadata, handoff state, browser fixture preflight, Firebase Functions syntax, and Firebase Hosting payload boundary passed.
- Firebase Hosting staging contains **152 allowlisted files**.
- Dependency health reported 0 errors and 5 expected missing-install warnings because Playwright and Firebase Functions packages are not installed in this audit environment.
- The user-facing full ZIP passed release archive verification.
- The changed-file patch ZIP contains **289 changed/added files** plus `PATCH_MANIFEST.json` and **6 delete paths**.
- Applying the patch over a clean v1.6.63 Git archive and then deleting `DELETE_PATHS.txt` entries reproduced the v1.6.64 source tree exactly.
- Full Playwright/device browser acceptance remains external because browser binaries and installed npm dependencies are unavailable in this environment.

# FoxBear QA Report - v1.6.63

## Configured target

- Static and behavioral checks: 413
- New regression: `qa/v1663_filename_provenance_export_review_smoke.js`

## Verification scope

- Exact imported filename retention and immutable mastering-time source-name provenance.
- Grapheme-safe UTF-8 byte truncation for joined emoji, combining marks, variation selectors, Korean, and Latin text.
- Bulk-summary invalidation when a non-final completed track changes while count and last row remain unchanged.
- Bounded filename review, complete-list clipboard action, collision/sanitization/truncation diagnostics, and no 1,000-row DOM expansion.
- Download-dialog copy feedback, mobile action wrapping, forced-colors visibility, and horizontal-overflow checks at 360, 430, and 1280 px.

## Final result

- Official configured checks: **413/413 passed** in bounded slices (`138/138`, `138/138`, and `137/137`).
- Dedicated v1.6.63 provenance/grapheme/review/layout regression and historical v1.6.60-v1.6.62 download/ZIP regressions passed.
- Release metadata, SRI, browser fixture preflight, Firebase Hosting payload boundary, Python hygiene, and Firebase Functions syntax passed.
- Dependency health reported 0 errors and 5 expected missing-install warnings.
- Firebase Hosting staging contains 152 allowlisted files.
- `src/app.js` remains below the 13,300-line architecture budget at 13,297 lines.
- Chromium DevTools Protocol fixtures were injected with `Page.setDocumentContent` because local/file navigation is blocked by container policy; 360x800, 430x932, and 1280x900 all had viewport-equal scroll width with no horizontal overflow.
- Final release and overwrite archives contain **732 entries each** and pass archive integrity, transient-file, executable-file, symlink, payload-boundary, and handoff verification.
- Full Playwright and real-device acceptance remain external because `@playwright/test` and device browsers are not installed in this environment.

# FoxBear QA Report - v1.6.62

## Configured target

- Static and behavioral checks: 412
- New regression: `qa/v1662_download_filename_preview_controls_smoke.js`

## Verification scope

- Filename preference defaults, selective token removal, title-only mode, reset, and blocked-localStorage session fallback.
- Mastering-time metadata capture and protection against later style/platform drift.
- Same-format, alternate-format, share, sequential-save, and ZIP naming-policy reuse.
- Partial legacy-suffix cleanup, Unicode preservation, duplicate-name preflight, and deterministic ` (2)` handling.
- Download-dialog structure, long-name wrapping, mobile one-column layout, and compatibility without CSS `:has()`.

## Final result

- Official configured checks: **412/412 passed** in bounded slices (`138/138`, `137/137`, and `137/137`).
- Dedicated v1.6.62 preference/preview/collision/storage/layout regression and historical v1.6.60/v1.6.61 ZIP/filename regressions passed.
- Five historical app-size gates initially rejected additional app orchestration; filename workflow logic was extracted to `src/download/file-name-workflow-service.js`, returning `src/app.js` below the 13,300-line architecture budget.
- One historical v1.6.61 source-location assertion was updated to verify delegation through the extracted workflow service rather than requiring policy code inside `app.js`.
- Release metadata, handoff, SRI, browser fixture preflight, Firebase Hosting payload boundary, Python hygiene, and Firebase Functions syntax passed.
- Firebase Hosting staging contains 152 allowlisted files.
- Final release and overwrite archives contain **730 entries each** and pass archive integrity, transient-file, executable-file, symlink, and handoff verification.
- Dependency health reported 0 errors and 5 expected missing-install warnings.
- Actual Playwright screenshots could not run because `@playwright/test` is not installed; direct system Chromium headless capture also failed to settle in this container. Static responsive contracts and browser preflight passed, but real desktop/mobile visual acceptance remains external.

# FoxBear QA Report - v1.6.59

## Configured target

- Static and behavioral checks: 408
- New regression: `qa/v1659_readiness_corp_security_hardening_smoke.js`

## Final result

- Official configured checks: `408/408` passed in bounded slices (`136/136`, `136/136`, and `136/136`).
- Dedicated v1.6.59 public/admin scope, shared-cache, concurrent coalescing, fail-closed authorization, SMTP isolation, and CORP regression passed.
- Historical v1.6.7 and v1.6.8 readiness regressions passed after the schema-v7 contract extension.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload validation, Python hygiene, and Firebase Functions syntax passed.
- Dependency metadata reported 0 errors and 5 expected missing-install warnings.
- Package installation and vulnerability endpoint checks could not complete because the available internal npm mirror omitted locked packages and its audit endpoint returned 404.
- Browser automation could not run because `@playwright/test` and Chromium are unavailable in this environment.
- Firebase Hosting staging contains 150 allowlisted files.
- Final release and overwrite archives contain `722` entries each and pass archive integrity, transient-file, executable-file, symlink, and payload-boundary checks.
- Real Firebase deployment, effective response headers, Google administrator authorization, Secret access, and Gmail SMTP remain production acceptance items.

# FoxBear QA Report - v1.6.58

## Configured target

- Static and behavioral checks: 407
- New regression: `qa/v1658_piano_transient_integrity_smoke.js`

## Final result

- Official configured checks: `407/407` passed in bounded slices (`136/136`, `136/136`, and `135/135`).
- Dedicated synthetic piano transient QA passed: attack/body loss `0.00 dB`, high-difference delta `-0.03 dB`, sample peak `-2.30 dBFS`.
- Engine bench, golden-audio pack, historical quality gates, and performance/quality regression passed.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload validation, and Firebase Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Browser automation could not run because `@playwright/test` and Chromium are unavailable in this environment.
- Final release and overwrite archives contain `720` entries each and pass archive integrity and payload-boundary checks.
- File-specific audible confirmation still requires the user's exact original/mastered pair.

# FoxBear QA Report - v1.6.57

## Configured target

- Static and behavioral checks: 406
- Updated syntax targets: `tools/stage-hosting-payload.js`, `tools/check-hosting-payload.js`
- New regression: `qa/v1657_hosting_payload_boundary_hardening_smoke.js`

## Focus

- Dedicated Firebase Hosting output boundary
- Allowlist-only public file staging
- Direct-deploy preflight enforcement
- Private, hidden, secret-like, executable, and symbolic-link isolation
- Existing playback, download, PWA, security, and incident-operation compatibility

## Final result

- Official configured static and behavioral checks: `406/406` passed.
- Dedicated v1.6.57 Hosting payload regression passed against synthetic private files and the actual project.
- Actual stage contains 150 allowlisted files totaling approximately 4.38 MB.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload validation, and Firebase Functions syntax passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Browser automation could not start because `@playwright/test` and Chromium are unavailable in this environment.
- The aggregate `check:release` wrapper exceeded the sandbox process limit; its static components were executed and passed independently.
- Final release and overwrite archives contain `718` entries each and pass compressed-data integrity and executable-payload checks.
- Real Firebase production deployment remains external verification.

# FoxBear QA Report - v1.6.56

## Configured target

- Static and behavioral checks: 405
- Updated syntax targets: `src/app.js`, `src/audio/playback-transition-service.js`, `src/audio/playback-source-recovery-service.js`, `src/audio/playback-lifecycle-recovery-service.js`, `src/state/track-lifecycle-service.js`
- New regression: `qa/v1656_playback_blob_source_resilience_smoke.js`

## Focus

- Blob URL source recreation from retained File/Blob data
- Deferred retirement of still-owned mastered URLs
- Playback position and intent restoration after source repair
- Stale near-zero volume reconciliation after lifecycle return
- Existing post-master, mobile focus, rapid transport, download, Kakao, and PWA compatibility

## Final result

- Official configured static and behavioral checks: `405/405` passed in bounded slices (`135/135`, `135/135`, and `135/135`).
- Dedicated v1.6.56 source resilience regression passed.
- Historical v1.6.52 post-master readiness, v1.6.53 crossfade settlement, v1.6.54 intent arbitration, and v1.6.55 mobile focus/resume regressions passed.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Browser automation could not start because `@playwright/test` and Chromium are unavailable in this environment.
- Real Android/iOS memory-pressure, long-idle, PWA, and KakaoTalk WebView tests remain external device verification gates.
- Final release and overwrite archives contain `715` entries each and pass compressed-data integrity and executable-payload checks.

# FoxBear QA Report - v1.6.55

## Configured target

- Static and behavioral checks: 403
- Updated syntax targets: `src/app.js`, `src/audio/playback-transition-service.js`, `src/audio/playback-lifecycle-recovery-service.js`
- New regression: `qa/v1655_mobile_playback_focus_resume_smoke.js`

## Focus

- Mobile background playback resume reconciliation
- Stale playing-intent cleanup after blocked autoplay
- Visible audio-focus and route-change pause recovery
- Interrupted Dock crossfade cleanup before lifecycle return
- Existing post-master, rapid transport, download, Kakao, and PWA compatibility

## Final result

- Official configured static and behavioral checks: `403/403` passed in bounded slices (`135/135`, `135/135`, and `133/133`).
- Dedicated v1.6.55 lifecycle regression passed.
- Historical v1.5.80 mobile return, v1.5.82 mastering cancellation, v1.6.52 post-master readiness, v1.6.53 crossfade settlement, and v1.6.54 intent-arbitration regressions passed.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Browser automation could not start because `@playwright/test` and Chromium are unavailable in this environment.
- Real Android/iOS phone-call, wired headset, Bluetooth, PWA return, and KakaoTalk WebView focus transitions remain external device verification gates.
- Final release and overwrite archives contain `712` entries each and pass compressed-data integrity and executable-payload checks.

# FoxBear QA Report - v1.6.54

## Configured target

- Static and behavioral checks: 401
- Updated syntax targets: `src/app.js`, `src/audio/playback-transition-service.js`, `src/audio/playback-link-service.js`
- New regression: `qa/v1654_playback_intent_arbitration_smoke.js`

## Focus

- Rapid Play/Pause last-intent preservation
- Late `play()` completion suppression after a newer pause
- Pending exclusive-preview cancellation
- Background transport and Media Session intent continuity
- Existing post-master readiness and crossfade settlement compatibility

## Final result

- Official configured static and behavioral checks: `401/401` passed in bounded slices (`134/134`, `134/134`, and `133/133`).
- Dedicated v1.6.54 intent-arbitration regression passed.
- Historical v1.5.78 transition race, v1.5.79 preview ownership, v1.5.80 mobile return, v1.6.52 post-master readiness, and v1.6.53 crossfade settlement regressions passed.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Browser automation could not start because `@playwright/test` and Chromium are unavailable in this environment.
- Real Android/iOS rapid transport tapping, background return, Media Session, and KakaoTalk WebView playback remain external device verification gates.
- Final release and overwrite archives contain `709` entries each and pass compressed-data integrity and executable-payload checks.

# FoxBear QA Report - v1.6.53

## Configured target

- Static and behavioral checks: 400
- Updated syntax targets: `src/app.js`, `src/audio/playback-transition-service.js`
- New regression: `qa/v1653_playback_crossfade_settlement_smoke.js`

## Focus

- Non-destructive readiness waiting after a user-gesture `play()`
- Resolved-false Dock crossfade cleanup
- Legacy player and crossfade-class retirement on every terminal path
- Active-source-only fallback after thrown transition errors
- Existing application line-budget preservation

## Final result

- Official configured static and behavioral checks: `400/400` passed in bounded slices (`134/134`, `133/133`, and `133/133`).
- Dedicated v1.6.53 crossfade settlement regression and historical v1.5.78/v1.6.52 playback regressions passed.
- Historical Dock, mobile return, download, PWA, service-worker, security, and incident-operation checks passed.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Browser automation could not start because `@playwright/test` and Chromium are unavailable in this environment.
- Final release and overwrite archives contain `707` entries each and pass compressed-data integrity and executable-payload checks.

# FoxBear QA Report - v1.6.52

## Configured target

- Static and behavioral checks: 399
- Updated syntax targets: `src/app.js`, `src/audio/playback-transition-service.js`
- New syntax target: `src/audio/post-master-playback-recovery-service.js`
- Strengthened regression: `qa/v1578_playback_transition_race_recovery_smoke.js`
- New regression: `qa/v1652_post_master_playback_readiness_smoke.js`

## Focus

- Single-commit Dock player stability at mastering completion
- Active-audio owner routing instead of stale first-child playback
- Mastered Blob preload and delayed media readiness recovery
- Detached-player and ended-media replay recovery
- Audible-volume restoration after cancelled fades and crossfades

## Final result

- Official configured static and behavioral checks: `399/399` passed in bounded slices (`133/133`, `133/133`, and `133/133`).
- Dedicated v1.6.52 playback-readiness regression and the strengthened transition-race regression passed.
- Historical Dock playback, mobile return, preview ownership, download, cancellation, PWA, service-worker, and security regressions passed.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Browser automation could not start because `@playwright/test` and Chromium are unavailable in this environment.
- Real mobile background-return, KakaoTalk WebView, and immediate post-completion tapping remain device verification gates.
- Final release and overwrite archives contain `705` entries each and pass compressed-data integrity and executable-payload checks.

# FoxBear QA Report - v1.6.51

## Configured target

- Static and behavioral checks: 397
- Updated syntax targets: `src/boot/kakao-entry-notice.js`, `src/download/download-service.js`
- Updated regression: `qa/v1650_kakao_center_entry_notice_smoke.js`
- New regression: `qa/v1651_download_conversion_concurrency_smoke.js`

## Focus

- Kakao first-touch input consumption and background-control protection
- Notice singleton, orphan cleanup, and pagehide lifecycle release
- Identical conversion coalescing with progress fan-out
- Independent subscriber cancellation and last-subscriber worker abort
- Source Blob snapshot isolation during master replacement

## Final result

- Official configured static and behavioral checks: `397/397` passed in bounded slices (`133/133`, `132/132`, and `132/132`).
- Dedicated v1.6.51 concurrency regression and the strengthened v1.6.50 Kakao notice regression passed.
- Historical download format, cache, Blob validation, cancellation, worker, PWA, service-worker, and security regressions passed.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution could not start because `@playwright/test` and Chromium are unavailable in this environment.
- Real KakaoTalk Android/iOS first-touch isolation and concurrent request behavior remain external verification gates.
- Final release and overwrite archives contain `702` entries each and pass compressed-data integrity and executable-payload checks.

# FoxBear QA Report - v1.6.50

## Configured target

- Static and behavioral checks: 396
- New syntax target: `src/boot/kakao-entry-notice.js`
- New regression: `qa/v1650_kakao_center_entry_notice_smoke.js`

## Focus

- Kakao-only centered entry notice
- Mastered-file download compatibility warning
- External/default browser and PWA installation guidance
- First-touch/Escape smooth dismissal and eight-second timeout
- Normal browser, standalone PWA, and external-guide suppression

## Final result

- Official configured static and behavioral checks: `396/396` passed in bounded slices (`132/132`, `132/132`, and `132/132`).
- Dedicated v1.6.50 interaction regression and historical Kakao entry, external-browser, PWA, download, toast, service-worker, and security regressions passed.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution could not start because Playwright/Chromium is unavailable in this environment.
- Real KakaoTalk Android/iOS visual size, safe-area placement, touch dismissal, and menu wording remain external verification gates.
- Final release and overwrite archives contain `700` entries each and pass compressed-data integrity and executable-payload checks.

# FoxBear QA Report - v1.6.49

## Configured target

- Static and behavioral checks: 394
- New syntax targets: `src/download/download-service.js`, `src/ui/download-dialog-view.js`
- New regression: `qa/v1649_download_variant_cache_reuse_smoke.js`

## Focus

- One-entry, 64 MB bounded alternate-format download cache
- Repeated download/share reuse without a second decode or encode
- Exact cached file-size reporting and immediate-reuse UI copy
- Source Blob scoped retirement and newest-variant eviction
- Separate MP3-to-MP3 and MP3-to-WAV quality warnings

## Final result

- Official configured static and behavioral checks: `394/394` passed in bounded slices (`130/130`, `130/130`, and `134/134`).
- Dedicated v1.6.49 cache regression and historical download, Blob validation, codec, cancellation, and PCM/ZIP memory regressions passed.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution could not start because Playwright/Chromium is unavailable in this environment.
- Real-device and restricted in-app browser repeated download/share reuse remains an external environment verification gate.
- Final release and overwrite archives contain `696` entries each and pass compressed-data integrity and executable-payload checks.

# FoxBear QA Report - v1.6.48

## Configured target

- Static and behavioral checks: 393
- New syntax targets: `src/download/download-service.js`, `src/ui/download-dialog-view.js`, `src/app.js`
- New regression: `qa/v1648_download_post_master_format_quality_smoke.js`

## Focus

- Download-time MP3/WAV extension selection after mastering
- MP3 bitrate and WAV bit-depth selection with an always-visible control
- Completed-output decode and re-encode fallback after PCM memory release
- Current-format Blob reuse and temporary decoded-buffer release
- MP3-to-WAV quality limitation warning

## Final result

- Official configured static and behavioral checks: `393/393` passed.
- Dedicated v1.6.48 regression and related download menu, size estimate, Blob validation, and PCM/ZIP memory regressions passed.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency metadata: 0 errors and 4 expected missing-install warnings.
- Installed browser execution could not start because Playwright/Chromium is unavailable in this environment.
- Real-device and restricted in-app browser format conversion remains an external environment verification gate.
- Final release and overwrite archives contain `694` entries each and pass compressed-data integrity and executable-payload checks.

# FoxBear QA Report - v1.6.47

## Configured target

- Static and behavioral checks: 392
- New syntax targets: `src/firebase-bootstrap.js`, `src/ui/admin-access-controller.js`, `src/app.js`, `src/boot/runtime-health.js`
- New regression: `qa/v1647_external_host_admin_auth_opaque_error_recovery_smoke.js`

## Focus

- GitHub Pages Google popup authentication without unsupported external-host redirect recovery
- Delayed Google authentication-state settlement after popup completion
- Firebase Hosting secure-origin administrator recovery with bounded session handoff
- Opaque cross-origin `Script error.` isolation from the file-import status UI
- Continued query-free diagnostics, App Check disabled policy, and narrow Trusted Types rules

## Final result

- Official configured checks: `392/392` passed in bounded chunks (`200/200`, `147/147`, and `45/45`).
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax: passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution could not start because Playwright/Chromium is unavailable in this environment.
- Real Firebase production Google login remains an external environment gate.
- Final release and overwrite archives contain `692` entries each, contain no executable payloads, and pass compressed-data integrity checks.

# FoxBear QA Report - v1.6.46

## Configured target

- Static and behavioral checks: 391
- New syntax targets: `src/firebase-bootstrap.js`, `src/ui/admin-access-controller.js`
- New regression: `qa/v1646_google_auth_same_origin_network_recovery_smoke.js`

## Focus

- Firebase Hosting same-origin `authDomain` selection
- `auth/network-request-failed` popup-to-redirect recovery
- Redirect-loop fencing and missing-result diagnostics
- Synchronized auth frame/connection CSP
- Query-free error diagnostics with App Check still disabled

## Final result

- Official configured checks: `391/391` passed in bounded release-gate chunks.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax: passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution could not start because Playwright/Chromium is unavailable in this environment.
- Real Firebase production Google login remains an external environment gate.
- Final release and overwrite archives contain `690` entries each, contain no executable payloads, and pass compressed-data integrity checks.

# FoxBear QA Report - v1.6.45

## Configured target

- Static and behavioral checks: 390
- New syntax target: `tools/check-hosting-payload.js`
- New regression: `qa/v1645_windows_release_gate_spark_hosting_no_app_check_smoke.js`

## Focus

- Windows-safe npm release-gate child execution
- Spark Hosting executable-file exclusion
- Release archive executable rejection
- Explicit no-App-Check runtime and deployment policy
- Google Auth plus `siteAdmins/{UID}` administrator authorization preservation

## Final result

- Official configured checks: `390/390` passed through the Windows-compatible release-gate runner.
- Release metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax: passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution could not start because Playwright/Chromium is unavailable in this environment.
- Real Firebase production Google login remains an external environment gate.
- Final release and overwrite archives contain `688` entries each, contain no `.exe`, `.cmd`, or related executable payloads, and pass compressed-data integrity checks.

# FoxBear QA Report - v1.6.44

## Configured target

- Static and behavioral checks: 389
- New syntax targets: `src/security/trusted-types-bootstrap.js`, `src/firebase-bootstrap.js`
- New regression: `qa/v1644_google_auth_gapi_module_trusted_types_recovery_smoke.js`

## Focus

- Firebase Auth second-stage gapi iframe module TrustedScriptURL compatibility
- Narrow `/_/scs/apps-static/_/js/` allowlist on `apis.google.com`
- Continued rejection of lookalike paths and external origins
- Query-free rejected URL diagnostics
- Spark administrator authentication regression preservation

## Final result

- Official configured checks: `389/389` passed in bounded execution chunks.
- Dedicated v1.6.43 initial-loader and v1.6.44 generated-module Trusted Types regressions: passed.
- Release metadata, SRI, handoff, browser fixture preflight, and Firebase Functions syntax: passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Playwright/Chromium is not installed in this sandbox, so the real Google account chooser remains a production verification gate.
- Engine synthetic safety bench: passed.
- Golden audio: all four fixtures remained at `-14.00 LUFS`, with peaks from `-9.62` to `-5.64 dBTP`.
- Final release and overwrite archives contain `683` entries each and pass compressed-data integrity checks.
- Change scope versus v1.6.43: `261` modified files, `2` added files, `0` deleted files.

# FoxBear QA Report - v1.6.43

## Configured target

- Static and behavioral checks: 388
- New syntax target: `src/security/trusted-types-bootstrap.js`
- New regression: `qa/v1643_google_auth_trusted_types_csp_recovery_smoke.js`

## Focus

- Firebase Auth Google API TrustedScriptURL compatibility
- Narrow default Trusted Types script URL validation
- Document and Firebase Hosting CSP parity
- Firebase authentication iframe/account origin permissions
- Google popup COOP compatibility
- Service-worker precache and stale-cache guidance

## Final result

- Official configured checks: `388/388` passed.
- Dedicated v1.6.43 Trusted Types/CSP regression: passed.
- Static release gate, browser fixture preflight, and Firebase Functions syntax: passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- The command-line Chromium executable did not complete startup in this sandbox, so the real Google account chooser remains a production verification gate.
- Engine balanced fixture: approximately `1.93x` realtime.
- Golden audio: all four fixtures remained at `-14.00 LUFS`, with peaks from `-9.62` to `-5.64 dBTP`.
- Final release and overwrite archives contain `681` entries each and pass compressed-data integrity checks.
- Change scope versus v1.6.42: `262` modified files, `3` added files, `0` deleted files.

# FoxBear QA Report - v1.6.42

## Configured target

- Static and behavioral checks: 386
- New syntax targets: `src/firebase-bootstrap.js`, `src/ui/admin-access-controller.js`
- New regression: `qa/v1642_spark_google_admin_auth_smoke.js`

## Focus

- Spark-plan Google administrator sign-in
- Verified Google provider and email enforcement in Firestore Rules
- One-time administrator UID handoff inside Settings
- Explicit Google sign-out and anonymous-session restoration
- Removal of administrator PIN, Secret Manager, and admin Callable Function dependencies
- Hosting, Firestore Rules, and indexes-only deployment command

## Final result

- Official configured checks: `386/386` passed.
- Static release gate, browser fixture preflight, and Firebase Functions syntax: passed.
- Release metadata, SRI, service-worker cache, and GitHub Desktop handoff: passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution did not start because Playwright and Chromium are unavailable in this environment.
- Real Firebase Google provider enablement, administrator UID registration, and production login remain external gates.
- Repository and both release archives contain no embedded administrator password value.
- Engine balanced fixture: approximately `1.89x` realtime.
- Golden audio: all four fixtures remained at `-14.00 LUFS`, with peaks from `-9.62` to `-5.64 dBTP`.
- Final release and overwrite archives contain `678` entries each and pass compressed-data integrity checks.
- Change scope from the v1.6.42 PIN draft: `262` modified files, `2` added files, `4` deleted files.

# FoxBear QA Report - v1.6.41

## Configured target

- Static and behavioral checks: 386
- New syntax target: `src/ui/admin-access-controller.js`
- New regression: `qa/v1641_admin_secret_pin_session_smoke.js`

## Focus

- Settings-based administrator monitor discovery
- Secret Manager-only PIN ownership
- Callable authentication and fixed-length comparison
- UID and hashed-network lockout policy
- Eight-hour administrator session expiry
- Firestore Rules expiry enforcement
- Optional App Check hard gate
- Administrator UI controller modularization and app line-budget preservation

## Final result

- Official configured checks: `386/386` passed.
- Browser fixture preflight and Firebase Functions syntax: passed.
- Release metadata, SRI, service-worker cache, and GitHub Desktop handoff: passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution did not start because Playwright and Chromium are unavailable in this environment.
- Real Firebase Secret Manager registration, Function deployment, App Check enforcement, and production unlock remain external gates.
- Repository and both release archives contain no embedded administrator PIN literal.
- Engine balanced fixture: approximately `1.95x` realtime.
- Golden audio: all four fixtures remained at `-14.00 LUFS`, with peaks from `-9.62` to `-5.64 dBTP`.
- Final release and overwrite archives contain `678` entries each and pass compressed-data integrity checks.
- Change scope versus v1.6.40: `262` modified files, `3` added files, `0` deleted files.

# FoxBear QA Report - v1.6.40

## Configured target

- Static and behavioral checks: 384
- New regression: `qa/v1640_ui_shell_retry_replacement_settlement_smoke.js`

## Focus

- Multi-candidate critical script and stylesheet evaluation
- Stale failed-node isolation after successful replacement
- Post-window-load replacement pending state
- Automatic critical-resource replacement observation
- Bounded replacement timeout and failure conversion
- Recovery-surface continuity during resource retry

## Final result

- Official configured checks: `384/384` passed.
- Browser fixture preflight and Firebase Functions syntax: passed.
- Release metadata, SRI, service-worker cache, and GitHub Desktop handoff: passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution did not start because Playwright and Chromium are unavailable in this environment.
- Engine balanced fixture: approximately `1.87x` realtime.
- Golden audio: all four fixtures remained at `-14.00 LUFS`, with peaks from `-9.62` to `-5.64 dBTP`.
- Final release and overwrite archives contain `675` entries each and pass compressed-data integrity checks.
- Change scope versus v1.6.39: `257` modified files, `2` added files, `2` deleted bytecode-cache files.

# FoxBear QA Report - v1.6.39

## Configured target

- Static and behavioral checks: 383
- New regressions: `qa/v1639_ui_shell_partial_script_recovery_smoke.js`, `qa/v1639_sw_client_probe_restart_late_report_smoke.js`

## Focus

- Critical script pending-versus-failed classification
- Static UI preservation during partial JavaScript boot failure
- Runtime Health script-degradation reporting and recovery resolution
- Service-worker restart shell-generation recollection
- Terminated-client and expired-probe response isolation

## Final result

- Official configured checks: `383/383` passed in ordered chunks (`96 + 96 + 96 + 95`).
- Browser fixture preflight and Firebase Functions syntax: passed.
- Release metadata, SRI, service-worker cache, and GitHub Desktop handoff: passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution did not start because Playwright and Chromium are unavailable in this environment.
- Engine balanced fixture: approximately `1.81x` realtime.
- Golden audio: all four fixtures remained at `-14.00 LUFS`, with peaks from `-9.62` to `-5.64 dBTP`.
- Final release and overwrite archives contain `673` entries each and pass compressed-data integrity checks.
- Change scope versus v1.6.38: `256` modified files, `3` added files, `0` deleted files.

# FoxBear QA Report - v1.6.38

## Configured target

- Static and behavioral checks: 381
- New regression: `qa/v1638_ui_shell_runtime_health_cache_retirement_smoke.js`

## Focus

- Pending versus failed core stylesheet classification
- Runtime Health and safe-UI notice deduplication
- Safe-UI resolution after resource recovery
- Controlled-client shell generation reporting
- Client-aware retirement of an inactive older retained shell cache

## Final result

- Official configured checks: `381/381` passed in ordered chunks (`96 + 96 + 96 + 93`).
- Browser fixture preflight and Firebase Functions syntax: passed.
- Release metadata, SRI, service-worker cache, and GitHub Desktop handoff: passed.
- Dependency metadata: 0 errors and 5 expected missing-install warnings.
- Installed browser execution did not start because Playwright and Chromium are unavailable in this environment.
- Engine balanced fixture: approximately `2.12x` realtime.
- Golden audio: all four fixtures remained at `-14.00 LUFS`, with peaks from `-9.62` to `-5.64 dBTP`.
- Final release and overwrite archives contain `670` entries each and pass compressed-data integrity checks.
- Change scope versus v1.6.37: `258` modified files, `2` added files, `0` deleted files.

# FoxBear QA Report - v1.6.37

## v1.6.37 UI shell and cross-generation recovery

- New regression: `qa/v1637_ui_shell_cross_generation_recovery_smoke.js`.
- Verifies missing core styles cannot leave `.app-shell` hidden, inert, or zero-opacity.
- Verifies the service worker retains two recent shell generations and resolves stale asset requests only through exact cache-key matches.
- Configured cumulative static/regression target: 380 checks.
- Final configured run: `380/380` passed.
- Browser fixture preflight, Functions syntax, release metadata, SRI, handoff state, dependency metadata, engine bench, and golden-audio regression passed.
- Balanced synthetic mastering measured approximately `1.91x` realtime; all four golden fixtures remained at `-14.00 LUFS` with peaks from `-9.62` to `-5.64 dBTP`.
- Dependency health reported zero errors and five expected missing-install warnings.
- Installed Node Playwright execution remains unavailable until dependencies are installed; real mobile/PWA deployment remains an external gate.
- Final full and overwrite ZIP packages contain `668` entries each and pass compressed-data integrity checks.

# FoxBear QA Report - v1.6.36

## v1.6.36 activation fencing and concurrent resource cleanup

- New regressions: `qa/v1636_sw_activation_generation_bfcache_reconcile_smoke.js` and `qa/v1636_audio_worker_concurrent_cleanup_stress_smoke.js`.
- Verifies two tabs that both initially observe an empty activation lease still produce one `SKIP_WAITING`.
- Verifies stale generation watchdog cleanup cannot remove the newer stored generation.
- Verifies BFCache pageshow reconciles a missed controller change and later duplicate delivery is idempotent.
- Verifies 120 AudioContexts survive explicit close plus pagehide cleanup with one native close per context.
- Verifies 301 Worker jobs across success, failure, and cancellation terminate and leave zero active jobs.
- Configured cumulative static/regression target: 378 checks.
- Final configured run: `378/378` passed through four ordered chunks of the official `qaChecks` array (`95 + 95 + 95 + 93`).
- Browser fixture preflight, Functions syntax, release metadata, SRI, handoff state, dependency metadata, engine bench, and golden-audio regression passed.
- Balanced synthetic mastering measured approximately `1.86x` realtime; all four golden fixtures remained at `-14.00 LUFS` with peaks from `-9.62` to `-5.64 dBTP`.
- Dependency health reported zero errors and five expected missing-install warnings.
- Installed browser execution could not start because Playwright/Chromium is unavailable in this sandbox; real mobile/PWA and production Firebase/App Check/Gmail remain external gates.

# FoxBear QA Report - v1.6.35

## v1.6.35 terminal history, service-worker activation, and resource lifecycle

- New regressions: `qa/v1635_history_terminal_race_sw_activation_lease_smoke.js` and `qa/v1635_resource_lifecycle_stress_smoke.js`.
- Verifies the exact terminal generation remains absorbable only across a 500 ms boundary grace.
- Verifies non-BFCache page unload clears the active transaction and pending generation.
- Verifies two tabs produce only one `SKIP_WAITING`, controller change transfers ownership, and a 12-second timeout releases a stuck lease.
- Verifies replacing download assist with the same Object URL does not revoke the live URL.
- Verifies 200 managed AudioContext create/close cycles leave zero active contexts.
- Configured cumulative static/regression target: 376 checks.
- Final configured checks: `376/376` passed through four ordered chunks of the official `qaChecks` array (`95 + 95 + 95 + 91`).
- Browser fixture preflight, Functions syntax, release metadata, SRI, handoff state, dependency metadata, engine bench, and golden-audio regression passed.
- Balanced synthetic mastering measured approximately `1.87x` realtime; all four golden fixtures remained at `-14.00 LUFS` with peaks from `-9.62` to `-5.64 dBTP`.
- Dependency health reported zero errors and five expected missing-install warnings.
- Installed browser execution could not start because Playwright/Chromium is unavailable in this sandbox; real mobile/PWA and production Firebase/App Check/Gmail remain external gates.
- Full and overwrite ZIP packages contain `661` entries each and pass compressed-data integrity checks.

# FoxBear QA Report - v1.6.34

## v1.6.34 terminal history and service-worker activity lifecycle

- New regression: `qa/v1634_history_hard_stall_sw_activity_lifecycle_smoke.js`.
- Verifies a 30-second hard-stall terminal recovery clears an unchanged sentinel without another Back request.
- Verifies a later dialog receives a fresh generation after neutralization.
- Verifies BFCache pagehide clears heartbeat/channel resources and pageshow restores exactly one heartbeat.
- Verifies repeated service-worker coordination installs one `updatefound` observer per registration.
- Configured cumulative static/regression target: 374 checks.
- Final configured run: `374/374` passed.
- Browser fixture preflight, Functions syntax, release metadata, SRI, handoff state, dependency metadata, engine bench, golden-audio regression, and archive contracts passed.
- Golden audio retained `-14.00 LUFS` across all four fixtures; peaks remained between `-9.62` and `-5.64 dBTP`.
- Synthetic mastering speed regression measured approximately `1.86x` realtime in the final full run.
- Dependency health completed with zero errors and five expected installation warnings because Playwright and Functions runtime packages are not installed in this sandbox.
- Both final ZIP packages contain `658` entries and pass compressed-data integrity checks.
- Installed-browser execution could not start because the sandbox has no usable Playwright/Chromium runtime; real Android/iOS/PWA navigation and production Firebase/App Check/Gmail remain environment-dependent gates.

# FoxBear QA Report - v1.6.33

- New regression: `qa/v1633_overlay_history_watchdog_recovery_smoke.js`.
- Verifies a completed internal history traversal is recovered when `popstate` is omitted.
- Verifies watchdog recovery releases the transaction and allows a fresh sentinel on the next dialog.
- Verifies an unchanged sentinel does not trigger a duplicate programmatic Back.
- Verifies a late exact traversal settles safely after a diagnosed hard stall.
- Verifies delayed generation tracking is bounded by an eight-entry contract.
- Configured cumulative static/regression target: 373 checks.
- Final configured run: `373/373` passed.
- Browser fixture preflight, Functions syntax, release metadata, SRI, handoff state, dependency metadata, engine bench, golden-audio regression, and archive contracts passed.
- Golden audio retained `-14.00 LUFS` across all four fixtures; peaks remained between `-9.62` and `-5.64 dBTP`.
- Synthetic mastering speed regression measured approximately `1.73x` realtime in the final full run.
- Dependency health completed with zero errors and five expected installation warnings because Playwright and Functions runtime packages are not installed in this sandbox.
- Both final ZIP packages contain `656` entries and pass compressed-data integrity checks.
- Installed-browser execution could not start because the sandbox has no usable Playwright/Chromium runtime; real Android/iOS/PWA navigation and production Firebase/App Check/Gmail remain environment-dependent gates.

# FoxBear QA Report - v1.6.32

- New regression: `qa/v1632_overlay_history_generation_bfcache_recovery_smoke.js`.
- Verifies an out-of-order genuine Back is not swallowed while an internal release popstate is delayed.
- Verifies the delayed exact generation is absorbed later without a second exit confirmation.
- Verifies BFCache pageshow settles a release completed while hidden and does not duplicate the exit guard.
- Verifies download, recommendation, settings, and incident dialog history cycles use monotonically increasing generations.
- Configured cumulative static/regression target: 372 checks.
- Final configured run: `372/372` passed.
- Browser fixture preflight, Functions syntax, release metadata, SRI, handoff state, dependency metadata, engine bench, and golden-audio regression passed.
- Golden audio retained `-14.00 LUFS` across all four fixtures; peak values remained between `-9.62` and `-5.64 dBTP`.
- Synthetic mastering engine QA retained approximately `1.90x` realtime in the balanced fixture; the full quality and safety contracts passed.
- Dependency health completed with zero errors and five expected installation warnings because Playwright and Functions runtime packages are not installed in this sandbox.
- Both final ZIP packages contain `654` entries and pass archive-contract and compressed-data integrity checks.
- Installed-browser execution could not start because the sandbox has no usable Playwright/Chromium runtime; real Android/iOS/PWA navigation remains an environment-dependent gate.

# FoxBear QA Report - v1.6.31

- New regression: `qa/v1631_overlay_history_transaction_coalescing_smoke.js`.
- Verifies rapid close/reopen/close requests issue one internal history traversal.
- Verifies an overlay reopened during release receives a new sentinel after popstate settlement.
- Verifies user Back closes the overlay first and only the next Back reaches workspace exit confirmation.
- Verifies navigation and overlay history diagnostics expose bounded classification counters only.
- Configured cumulative static/regression target: 371 checks.
- Final configured run: `371/371` passed.
- Browser fixture preflight, Functions syntax, release metadata, SRI, handoff state, dependency metadata, engine bench, and golden-audio regression passed.
- Golden audio retained `-14.00 LUFS` across all four fixtures; peak values remained between `-9.62` and `-5.64 dBTP`.
- Synthetic mastering speed regression measured approximately `1.88x` to `1.90x` realtime across the final verification runs.
- Dependency health completed with zero errors and five expected installation warnings because Playwright and Functions runtime packages are not installed in this sandbox.
- Both final ZIP packages contain `652` entries and pass archive-contract and compressed-data integrity checks.
- Installed-browser execution could not start because the sandbox has no usable Playwright/Chromium runtime; real Android/iOS/PWA navigation remains an environment-dependent gate.

# FoxBear QA Report - v1.6.30

- New regression: `qa/v1630_overlay_history_release_false_exit_prompt_smoke.js`.
- Verifies the real listener order where the exit guard is registered before the modal popstate listener.
- Verifies a normal dialog close releases its history sentinel without opening the leave confirmation.
- Verifies a genuine Back event with no open overlay is not consumed by the modal controller and still reaches the exit guard.
- Configured cumulative static/regression target: 370 checks.
- Final configured run: `370/370` passed.
- Browser fixture preflight, Functions syntax, release metadata, SRI, handoff state, dependency metadata, engine bench, and golden-audio regression passed.
- Golden audio retained `-14.00 LUFS` across all four fixtures; peak values remained between `-9.62` and `-5.64 dBTP`.
- Synthetic mastering speed regression reported approximately `1.79x` realtime.
- Dependency health completed with zero errors and five expected installation warnings because Playwright and Functions runtime packages are not installed in this sandbox.
- Both final ZIP packages contain `650` entries and pass archive-contract and compressed-data integrity checks.
- Installed-browser execution could not start because the sandbox has no usable Playwright/Chromium runtime; real mobile/PWA navigation and production Firebase/App Check/Gmail remain environment-dependent gates.

# FoxBear QA Report - v1.6.29

- New regression: `qa/v1629_incident_submission_fencing_adaptive_polling_smoke.js`.
- Verifies stable occurrence submission keys and report IDs across delayed recovery windows.
- Verifies lease-generation replacement aborts stale ownership before commit and stale cleanup preserves the replacement generation.
- Verifies active, idle, hidden, and immediate foreground polling schedules.
- Verifies 500-write quota pressure remains bounded and settings control bindings remain idempotent.
- Verifies the two new boot modules are present in the service-worker atomic install graph.
- Configured cumulative static/regression target: 369 checks.
- Final configured run: `369/369` passed.
- Browser fixture preflight, Functions syntax, release metadata, SRI, handoff state, dependency metadata, engine bench, and golden-audio regression passed.
- Golden audio retained `-14.00 LUFS` across all four fixtures; peak values remained between `-9.62` and `-5.64 dBTP`, while peak stress remained at `-1.00 dBTP`.
- Synthetic mastering speed regression reported approximately `1.82x` realtime.
- Dependency health completed with zero errors and five expected installation warnings because Playwright and Functions runtime packages are not installed in this sandbox.
- Both final ZIP packages contain `648` entries and pass archive-contract and compressed-data integrity checks.
- Installed-browser execution could not start because the sandbox has no usable Playwright/Chromium runtime; production Firebase/App Check/Gmail and real Safari/iOS lifecycle behavior remain environment-dependent gates.

# FoxBear QA Report - v1.6.28

- New regression: `qa/v1628_incident_lease_takeover_fallback_ui_smoke.js`.
- Verifies polling-only peer synchronization and a 200-write global-bound pressure case without BroadcastChannel or dispatched storage events.
- Verifies expired crash-lease takeover, immediate BFCache release, lock renewal storage failure abort, and polling cleanup.
- Verifies the isolated diagnostic view renders seven service rows, queue ownership/fallback metadata, and status events.
- Verifies runtime script order, service-worker inclusion, reporter delegation, and handoff requirements.
- Configured cumulative static/regression target: 366 checks.
- Final configured run: `366/366` passed.
- Browser fixture preflight, Functions syntax, release metadata, handoff state, SRI, dependency metadata, engine bench, golden-audio regression, and archive contract checks passed.
- Golden audio retained `-14.00 LUFS` across all four fixtures; peak values remained between `-9.62` and `-5.64 dBTP`.
- Synthetic mastering speed regression reported approximately `1.88x` realtime.
- Dependency health completed with five expected installation warnings because Playwright and Functions runtime packages are not installed in this sandbox.
- Both final ZIP packages contain 644 entries and pass archive-contract and compressed-data integrity checks.
- Installed-browser execution could not start because the sandbox has no usable Playwright/Chromium runtime; production Firebase/App Check/Gmail and real Safari/iOS WebView lifecycle behavior remain environment-dependent gates.

# FoxBear QA Report - v1.6.27

- New regression: `qa/v1627_incident_multitab_queue_ownership_stress_smoke.js`.
- Verifies independent per-tab writes, BroadcastChannel peer synchronization, duplicate merging, and a 60-write global bound stress case.
- Verifies stale snapshot commits preserve reports queued by a peer after the snapshot.
- Verifies exact delivery tombstones permit a later occurrence of the same fingerprint.
- Verifies 50 simultaneous peer ownership attempts cannot start a second flush loop and ownership releases cleanly.
- Verifies legacy queue migration, runtime script order, service-worker inclusion, reporter wiring, and handoff requirements.
- Configured cumulative static/regression target: 364 checks.
- Final configured run: `364/364` passed.
- Browser fixture preflight, Functions syntax, release metadata, handoff state, SRI, dependency metadata, engine bench, golden-audio regression, and archive contract checks passed.
- Golden audio retained `-14.00 LUFS` across all four fixtures; peak values remained between `-9.62` and `-5.64 dBTP`, while peak-stress remained at `-1.00 dBTP`.
- Dependency health completed with five expected installation warnings because Playwright and Functions runtime packages are not installed in this sandbox.
- Both final ZIP packages contain 641 entries and pass archive-contract and compressed-data integrity checks.
- The installed-browser branch of `check:release` could not start because the sandbox has no usable Playwright/Chromium runtime; this was recorded as an environment gate rather than a product-code pass.
- Installed-browser rendering, production Firebase/App Check/Gmail, and real-device multi-tab lifecycle behavior remain environment-dependent gates.

# FoxBear QA Report - v1.6.26

- New regression: `qa/v1626_incident_diagnostics_queue_conflict_safety_smoke.js`.
- Verifies a 50-item enqueue storm retains the newest eight reports within the serialized storage budget.
- Verifies duplicate suppression, malformed and oversized storage recovery, and quota-pressure fallback to the newest persistable entries.
- Verifies conflict-safe flush commits preserve reports added after the active snapshot and remove only successfully delivered fingerprints.
- Verifies Firebase service failure classification precedence and immutable diagnostic UI view models.
- Configured cumulative static/regression target: 362 checks.
- Final configured run: pending final package verification.
- Installed-browser rendering, production Firebase/App Check/Gmail, and real-device network/background behavior remain environment-dependent gates.

# FoxBear QA Report - v1.6.25

- New regression: `qa/v1625_incident_recovery_timeout_abort_stress_smoke.js`.
- Verifies successful service/queue/deployment sequencing, shared AbortSignal delivery, phase-specific timeout codes, and slow-phase diagnostics.
- Verifies a failed run schedules its next retry after active ownership clears instead of losing the retry to the in-flight guard.
- Verifies offline waiting consumes no attempts or timers, hidden surfaces suspend unused retries, and online resume completes recovery.
- Verifies 50 simultaneous run triggers share one Promise and 50 schedule requests retain one timer.
- Verifies disposal aborts active work and prevents retry scheduling.
- Configured cumulative static/regression target: 359 checks.
- Final configured run: `359/359` passed.
- Browser fixture preflight, Functions syntax, release metadata, handoff state, SRI, dependency metadata, and both archive verifiers passed.
- Golden audio retained `-14.00 LUFS` across all four fixtures; peak values remained between `-9.62` and `-5.64 dBTP`.
- Dependency health completed with five expected installation warnings because Playwright and Functions runtime packages are not installed in this sandbox.
- Both ZIP packages contain 634 entries and pass compressed-data integrity checks.
- Installed-browser rendering, production Firebase/App Check/Gmail, and real-device network/background behavior remain environment-dependent gates.

# FoxBear QA Report - v1.6.24

- New regression: `qa/v1624_incident_recovery_sweep_observability_smoke.js`.
- Verifies active-promise sharing, pending reason coalescing, stronger service/deployment option merging, and bounded phase errors.
- Verifies offline attempts skip network work while still publishing queue/history diagnostic snapshots.
- Verifies lifecycle callback errors remain contained and become visible through reporter status and anonymous diagnostics.
- Verifies script order, service-worker inclusion, handoff package requirements, and extracted-module syntax.
- Configured cumulative static/regression target: 357 checks.
- Final configured run: `357/357` passed.
- Browser fixture preflight, Functions syntax, release metadata, handoff state, SRI, and dependency metadata checks passed.
- Dependency health completed with five expected installation warnings because root Playwright and Functions runtime packages are not installed in this sandbox.
- Installed-browser rendering, production Firebase/App Check/Gmail, and real-device long-background behavior remain environment-dependent gates.

# FoxBear QA Report - v1.6.23

- New regression: `qa/v1623_route_decay_lifecycle_handoff_safety_smoke.js`.
- Verifies persisted time decay, stale-evidence prevention, combined time/network decay, and deterministic route timestamps.
- Verifies browser event callback throw/rejection containment and absence of unhandled Promise rejections.
- Verifies synchronized handoff Current release metadata, GitHub Desktop title, 355-check target, and the three-section delivery-rule contract.
- Re-runs targeted route, lifecycle, metadata, SRI, engine, golden-audio, handoff, and archive verification checks.
- Configured cumulative static/regression target: 355 checks.
- Final configured run: `355/355` passed.
- Browser fixture preflight, Functions syntax, release metadata, handoff state, and both archive verifiers passed.
- Full installed-browser execution was not run because the sandbox lacked a valid installed Playwright runtime and browser; production Firebase/App Check/Gmail and real-device background behavior remain environment gates.
- Production Firebase, App Check, Gmail delivery, installed-browser UI, and real-device background behavior remain environment-dependent gates.

# FoxBear QA Report - v1.6.22

- New regression: `qa/v1622_incident_recovery_coalescing_time_decay_smoke.js`.
- Verifies elapsed-time route-score decay and exposed decay timestamp.
- Verifies lifecycle recovery request coalescing, merged reasons, and pending stronger-option handling.
- Re-runs historical incident, Firebase, overlay, download, mastering-engine, golden-audio, SRI, handoff, and package checks.
- Configured cumulative static/regression target: 354 checks.

# FoxBear QA Report - v1.6.21

- New regression: `qa/v1621_incident_lifecycle_network_exploration_smoke.js`.
- Verifies five-minute long-background detection, online recovery duration, debounced connection changes, route-policy observation, and listener cleanup.
- Verifies four alternating route attempts after a network change and confirms attempts are consumed only when Firebase actually starts a route request.
- Verifies lifecycle script order, service-worker caching, reporter recovery-sweep wiring, and local administrator route/queue summaries.
- Re-runs historical incident, Firebase, overlay, download, mastering-engine, golden-audio, SRI, handoff, and package checks.
- Configured cumulative static/regression target: 353 checks.
- Final configured run: `353/353` passed.
- Production Firebase routing, Gmail receipt, App Check enforcement, and real mobile background behavior remain environment-dependent gates.

# FoxBear QA Report - v1.6.20

- New regression: `qa/v1620_incident_background_sync_network_decay_smoke.js`.
- Verifies hidden-page polling, foreground refresh, network-key changes, route-score decay, and stale cooldown reset.
- Configured cumulative static/regression target: 351 checks.
- Production Firebase, App Check, Gmail receipt, and installed-browser gates remain environment-dependent.

# FoxBear QA Report - v1.6.19

- New regression: `qa/v1619_incident_mail_sync_route_scoring_smoke.js`.
- Verifies mail-history synchronization planning, retry timing, route success scoring, cooldown recovery, and module load order.
- Re-runs historical incident, overlay, download, mastering-engine, golden-audio, SRI, handoff, and package checks.
- Configured cumulative static/regression target: 350 checks.
- Installed-browser rendering, production Firebase deployment, App Check, and Gmail receipt remain environment-dependent gates.

# FoxBear QA Report - v1.6.18

- New regression: `qa/v1618_incident_state_adaptive_route_smoke.js`.
- Verifies state-service ownership, module load order, service-worker/handoff inclusion, history limits, corrupt-state recovery, and sensitive-text redaction.
- Verifies the Callable circuit opens only after two transient failures, closes on success, and ignores non-transient permission failures.
- Re-runs historical incident, Firebase, overlay, download, mastering-engine, golden-audio, SRI, handoff, and package checks.
- Configured cumulative static/regression target: 348 checks.
- Installed-browser routing, production Firebase deployment, App Check, and Gmail receipt remain environment-dependent gates.

# FoxBear QA Report - v1.6.17

- New regression: `qa/v1617_incident_transport_metrics_module_split_smoke.js`.
- Verifies support/recovery modules load before the reporter and are included in service-worker and handoff runtime assets.
- Verifies Callable, Hosting rewrite, Firestore, unresolved failure, queue recovery, corruption recovery, and metrics reset contracts.
- Verifies persisted route metrics redact email addresses and long credential-like values and never add audio/file/path fields.
- Re-runs historical overlay, download, incident, Firebase, mastering engine, golden-audio, SRI, handoff, and package checks.
- Configured cumulative static/regression target: 345 checks.
- Installed-browser rendering, production Firebase deployment, and Gmail receipt remain environment-dependent gates.

# FoxBear QA Report - v1.6.16

- New regression: `qa/v1616_same_origin_incident_overlay_navigation_smoke.js`.
- Verifies all four Firebase Hosting incident rewrites, Functions region consistency, authenticated Callable protocol fallback, App Check propagation, and transport disclosure.
- Verifies failure-specific one-line recovery actions and sanitized same-origin diagnostics.
- Verifies nested external parent ownership, parent input suspension, explicit close callbacks, and mobile browser-back top-layer dismissal.
- Re-runs historical modal, download, mobile, export, incident, mastering engine, golden-audio, SRI, handoff, and package checks.
- Configured cumulative static/regression target: 342 checks.
- Installed-browser Back behavior, real-device viewport testing, production Firebase deployment, and Gmail receipt remain environment-dependent gates.

# FoxBear QA Report - v1.6.15

- New regressions: `qa/v1615_nested_overlay_stack_smoke.js` and `qa/v1615_incident_auto_recovery_smoke.js`.
- Verifies conditional popup-on-popup stacking, parent suspension, viewport containment, body scroll ownership, and external overlay registration.
- Verifies offline and opaque endpoint probing, bounded service recovery, online queue retry, manual recovery, and sanitized diagnostic-copy UI.
- Re-runs historical modal focus, download, mobile, export, incident, mastering engine, golden-audio, SRI, handoff, and package checks.
- Configured cumulative static/regression target: 341 checks.
- Installed-browser nested-focus confirmation, real mobile viewport testing, production Firebase deployment, and Gmail receipt remain environment-dependent gates.

# FoxBear QA Report - v1.6.14

- New regressions: `qa/v1614_download_quality_memory_size_position_smoke.js` and `qa/v1614_incident_callable_endpoint_diagnostics_smoke.js`.
- Verifies portalled fixed positioning, visual-viewport four-edge clamp, above/below placement, maximum height, internal scrolling, cleanup, and taller mobile sheet behavior.
- Verifies guarded quality preference persistence and exact/estimated MP3/WAV size calculations.
- Verifies the exact Callable function name, privacy-safe bounded endpoint probe, exact CSP origin, and separate not-deployed/network/internal classifications.
- Re-runs historical download, mobile, export, incident, engine, golden-audio, SRI, handoff, and package checks.
- Configured cumulative static/regression target: 339 checks.
- Installed-browser visual confirmation, real-device touch testing, production Firebase deployment, and Gmail receipt remain environment-dependent gates.

# FoxBear QA Report - v1.6.13

- New regression: `qa/v1613_download_format_context_menu_smoke.js`.
- Verifies only MP3/WAV family controls remain persistently visible while quality choices start hidden.
- Verifies context-menu anchoring, vertical quality choices, current-selection checkmark, and all seven existing output qualities.
- Verifies menu semantics, Arrow Up/Down, Home/End, Escape dismissal, and focus restoration contracts.
- Re-runs historical download, activation-lifecycle, modal-close, export-reliability, mobile-sheet, and browser preflight checks.
- Configured cumulative static/regression target: 337 checks.
- Installed-browser visual confirmation and real-device touch validation remain environment-dependent gates.

# FoxBear QA Report - v1.6.12

- New regression: `qa/v1612_mastering_tone_loudness_fastpath_smoke.js`.
- Covers exact K-weighted integrated/short-term equivalence at 32 kHz, 44.1 kHz, and 48 kHz for mono and stereo inputs.
- Covers fused input inspection/sanitization equivalence for clipped and non-finite samples.
- Covers channel-specialized tone processing, fallback final-measurement reuse, stage telemetry, and output ceiling safety.
- Same-input v1.6.11/v1.6.12 comparisons preserve all output Float32 samples and checked finalizer telemetry.
- Configured cumulative static/regression target: 336 checks.
- Local Node VM 1-second stereo stress comparisons measured approximately 10-21% lower processing time across runs; this is not a browser-device guarantee.
- Installed-browser, real-device thermal, and long-duration multi-track validation remain environment-dependent gates.

# FoxBear QA Report - v1.6.11

- New regression: `qa/v1611_mastering_speed_measurement_reuse_smoke.js`.
- Covers in-place reuse of transferred channel buffers, shared K-weighted loudness results, duplicate True Peak scan removal, valid performance telemetry, and output ceiling safety.
- Same-input v1.6.10/v1.6.11 comparison: zero output-sample differences; final integrated LUFS, final LUFS, final True Peak, limiter reduction, and short-term LUFS unchanged.
- Local Node VM 3-second stereo benchmark median: about 8.34 seconds before and 4.98 seconds after, approximately 40% lower processing time in that harness.
- Historical v1.6.9/v1.6.10 checks now validate build-ID shape without pinning an obsolete release ID.
- Configured cumulative static/regression target: 334 checks.
- Installed-browser, real-device thermal, and long-duration 35-track validation remain environment-dependent gates.

# FoxBear QA Report - v1.6.10

- New regression: `qa/v1610_incident_readiness_contract_csp_cache_hardening_smoke.js`.
- Covers fail-closed missing-check responses, exact CSP origin matching, cache-history deduplication/marking, and corrupt local-storage recovery.
- Configured cumulative static/regression target: 333 checks.
- Browser, Firebase production deployment, Gmail SMTP receipt, and real-device audio validation remain environment-dependent gates.

# FoxBear QA Report - v1.6.9

- Added a bounded three-entry deployment readiness history with cached-result deduplication.
- Added per-stage recovery copy controls without exposing Firebase Secret identifiers or values.
- Added shared incident status events for immediate Settings summary synchronization.
- Added narrow-screen recovery action and readiness history layout coverage.
- Configured static/regression target: 332 checks.

# FoxBear QA Report - v1.6.8

- Added server-side 60-second readiness caching so repeated user checks perform a single SMTP verification.
- Added local readiness persistence with last-check, last-healthy, next-eligible-check, and cached-result metadata.
- Added per-stage recovery guidance for CSP, Functions, Firestore, Gmail Secret, and SMTP failures.
- Added Settings-level incident mail health summary states without exposing Secret values or identifiers.
- Added responsive readiness-card and action sizing coverage for narrow mobile layouts.
- Configured static/regression target: 331 checks.

# FoxBear QA Report - v1.6.7

- Added server-side readiness verification for Functions, Firestore, Gmail Secret validity, and SMTP verify connectivity.
- Added client-side CSP origin verification and a compact per-stage deployment checklist.
- Added delivery-history synchronization so automatic retry completion updates the existing local test entry.
- Added direct retry eligibility behavior using server-provided retry-availability timestamps.
- Added staged batch performance recovery coverage for danger reason, first healthy sample, and stable-normal resume.
- Configured static/regression target: 330 checks.

# FoxBear QA Report - v1.6.6

- Added bounded user-owned mail-test retry with two direct attempts and a 60-second server cooldown.
- Added local history rendering for SMTP attempt count, direct retry count, and automatic retry countdown.
- Verified terminal, delivered, non-failed, automatic, and foreign reports are excluded from the user retry path.
- Added performance-danger batch auto-pause before the next track and stable-normal auto-resume behavior coverage.
- Verified manual resume cannot bypass an active performance-protection pause.
- Configured static/regression target: 329 checks.

# FoxBear QA Report - v1.6.5

- Added incident server reconnection, deploy-command clipboard recovery, and bounded recent mail-test history.
- Added client behavior coverage for the five-entry history cap and clipboard fallback contract.
- Added SMTP classification coverage for invalid Secret, authentication rejection, recipient rejection, rate limiting, and network timeout.
- Verified callable delivery serialization exposes normalized reason, raw provider code, and next retry timestamp.
- Verified incident service metadata schema v3 exposes the Gmail provider and Secret credential mode.
- Configured static/regression target: 328 checks.

# FoxBear QA Report - v1.6.4

- Reproduced the actual mail-test failure path as a missing Firebase Callable origin in `connect-src`.
- Verified the exact regional endpoint is present in both HTML meta CSP and Firebase Hosting CSP.
- Verified the incident deployment command cannot publish Functions without the matching Hosting CSP and Firestore rules.
- Added behavior coverage for not-found, CSP/network, internal, permission, and authentication failure classification.
- Verified service metadata schema v2 reports the canonical callable origin.
- Configured static/regression target: 327 checks.

# FoxBear QA Report - v1.6.3

- Audited repeated health notices, transient state flicker, Settings discoverability, and mobile overlay collisions.
- Removed duplicate decode-activity accounting.
- Added two-sample confirmation for watch and danger plus two-sample recovery.
- Added Settings health level and concise reason rendering.
- Added 30-minute acknowledgement persistence for identical danger conditions while preserving new-condition alerts.
- Added toast-stack height coordination for the non-blocking health notice.
- Configured static/regression target: 326 checks.

# FoxBear QA Report - v1.6.2

- Audited first-run diagnostics, routine activity classification, stale warning lifetime, and settings/popup visual noise.
- Reclassified normal import, decode, mastering, wake-lock, and render activity as informational state.
- Limited active long-task warnings to the last 60 seconds and decode/wake-lock errors to the last 120 seconds.
- Added two-sample danger confirmation and two-sample recovery dismissal for the non-blocking health notice.
- Verified normal health removes the settings badge and leaves the diagnostics panel in a compact state.
- Configured static/regression target: 325 checks.

# FoxBear QA Report - v1.6.1

- Reproduced the persistent startup popup through the legacy `foxbear-perf-diagnostics=on` localStorage value.
- Added one-time migration to `off` and verified normal startup does not construct or display the diagnostics panel.
- Verified explicit `?perf=1` still schedules diagnostic opening after DOM readiness.
- Added consecutive healthy-runtime and minimum-uptime guards for automatic dismissal.
- Verified Settings-opened diagnostics are marked manual and never persist future startup behavior.
- Configured static/regression target: 324 checks.

# FoxBear QA Report - v1.6.0

- Added stage-specific incident mail test diagnostics for authentication, server API, queue persistence, and SMTP acceptance.
- Added deployed service version and App Check monitor-state reporting.
- Added web/server version comparison and stale Functions deployment warnings.
- Added VM behavior coverage for stage state changes and authenticated service-status access.
- Configured static/regression target: 323 checks.

# FoxBear QA Report - v1.5.99

- Simplified the upload status message while retaining the existing picker accept list and runtime decode validation.
- Added callable-first authenticated incident submission and delivery-status lookup.
- Preserved the create-first Firestore compatibility path and improved missing-server-deployment diagnostics.
- Added source and VM regression coverage for the lightweight import message, callable endpoints, authentication boundary, ownership checks, deployment command, and fallback.
- Configured static/regression target: 322 checks.

# FoxBear QA Report - v1.5.98

- Added safe high-level Worker recovery for analysis, mastering, and master-preview jobs.
- Added per-job health classification and targeted stalled-only cancellation.
- Added duplicate-safe retry coordination and excluded export jobs from automatic retry.
- Added 30-track Blob URL, abort-owner, AudioContext, and Worker transfer-accounting stress coverage.
- Configured static/regression target: 321 checks.

# FoxBear QA Report - v1.5.97

- Re-ran the v1.5.96 static and behavior baseline before modification.
- Added targeted and stalled-only cancellation to the common Worker job service.
- Added user-facing Korean recovery guidance, a guarded stalled-Worker cancellation action, and live action status to the diagnostics panel.
- Added a VM behavior regression that completes 30 sequential Worker jobs, verifies bounded recent history, then cancels a synthetic stalled Worker.
- Verified active Worker count, stalled count, and active transfer-byte accounting all return to zero after completion and recovery.
- Configured static/regression target: 318 checks before installed-browser confirmation.

# FoxBear QA Report - v1.5.96

- Centralized opener memory, focus return, Tab cycling, Escape/backdrop dismissal, and layered page scroll locking in the shared modal controller.
- Registered the program information and incident-reporting dialogs with the common modal state machine.
- Added readable browser-memory, audio, Worker, long-task, and retained-PCM cards while keeping raw technical diagnostics in an expandable section.
- Reduced visible diagnostics polling from 1.2 seconds to 2.5 seconds and restored focus to the settings trigger after close.
- Added behavioral regression for nested modal locks and scroll-position restoration.
- Configured static/regression target: 317 checks before installed-browser confirmation.

# FoxBear QA Report - v1.5.95

- Rewrote the version/about dialog as a concise product overview covering smart analysis, quality protection, A/B preview, batch workflow, export support, and local audio privacy.
- Moved incident reporting and memory/performance diagnostics into dedicated settings actions and dialogs.
- Reduced the shared close control to a compact 32px circle with a 10px glyph and added a generic role-dialog backdrop fallback while preserving in-flight action safety.
- Fixed first-use incident mail testing by creating the deterministic Firestore report before any owner-only duplicate read.
- Added single-flight mail testing, ARIA busy state, and actionable permission diagnostics.
- Added regression coverage for settings discoverability, popup dismissal, close geometry, and create-first incident persistence.
- Configured static/regression target: 316 checks before installed-browser confirmation.

# FoxBear QA Report - v1.5.94

- Audited the v1.5.93 decode and Worker lifecycle paths plus release-report handoff persistence.
- Found that AIFF native decode cancellation or timeout could fall through to the synchronous PCM parser.
- Added cancellation, timeout, and channel-sample budget guards before AIFF fallback.
- Added complete timeout/cancel/failure metadata to Worker recent diagnostics.
- Added a permanent three-section reporting contract to HANDOFF, STATUS, and README.
- Configured static/regression target: 315 checks before installed-browser confirmation.

# FoxBear QA Report - v1.5.93

- Re-ran the complete v1.5.92 static/regression baseline: 313/313 PASS before modification.
- Found that the optional external pitch adapter discarded the cancellation signal before calling a WASM engine.
- Added cancellation checks before import, after import, and after engine completion, and forwarded the signal into compatible engines.
- Added Worker transfer-byte, transfer-count, peak concurrency, peak transfer memory, and no-progress stall diagnostics.
- Replaced one-second administrator CSV Blob URL cleanup with the shared resilient download lifecycle and a 60-second fallback.
- Added single-flight export locking and ARIA busy-state behavior.
- Added an OpenAI API opportunity and privacy architecture guide.
- Configured static/regression target: 314 checks before installed-browser confirmation.

# FoxBear QA Report - v1.5.92

- Reproduced the GitHub static gate failure by seeding stale Python bytecode before the historical v1.5.90 hygiene assertion.
- Replaced the brittle assumption that the checkout starts clean with deterministic pre-check and post-check cleanup.
- Added inherited `PYTHONDONTWRITEBYTECODE=1` to every QA child command and retained explicit `-B` on project Python entry points.
- Added a behavioral regression that imports a temporary Python module without creating `__pycache__`.
- Upgraded GitHub cache actions to v5 to remove the Node 20 action-runtime warning.
- Configured static/regression target: 313 checks before installed-browser confirmation.

# FoxBear QA Report - v1.5.91

- Re-ran the complete v1.5.90 static/regression baseline: 311/311 PASS before modification.
- Found that mastering cancellation was checked only after file decode and pitch/BPM conversion, allowing expensive work to continue after track or batch cancellation.
- Found that pitch/BPM used a separate manual Worker lifecycle without shared timeout diagnostics, stale-result identity, or cancellation ownership.
- Found that failed analysis or pitch workers could move large tracks onto blocking main-thread FFT/WSOLA fallback paths.
- Routed analysis and pitch workers through the common job service and added job-scoped progress messages.
- Added large-track fallback guards and direct `subarray()` PCM slicing to reduce UI stalls and temporary memory pressure.
- Fixed shared Worker diagnostics so `{ok:false}` messages are recorded as failed rather than completed and verified error code propagation.
- Guarded pitch progress against cancelled or replaced mastering jobs.
- Added VM regression coverage for cancellation, Worker job identity, failure diagnostics, progress, large-track protection, and source contracts.
- Configured static/regression checks: 312/312 PASS; real Chromium audio timing remains installed-browser verification.

# FoxBear QA Report - v1.5.90

- Re-ran the complete v1.5.89 static/regression baseline: 309/309 PASS before modification.
- Reproduced a retry-integrity gap where a skipped Playwright retry could be interpreted as recovered.
- Added explicit pass/skipped/repeated/missing classification and a fail-closed CLI verifier.
- Added workflow verification after failed-only retry reporting in both Pages deployment paths.
- Added Git-based release-metadata-only diff detection and verified metadata-only package, index, and runtime version changes do not force full Browser QA.
- Verified functional source changes remain browser-impacting after metadata normalization.
- Added 45-day flaky-history expiry and skipped-outcome unresolved tracking.
- Verified nested report directories are created and custom report runs do not leak default artifacts.
- Configured static/regression checks: 311/311 target; real Chromium execution remains the final environment-specific confirmation.

# FoxBear QA Report - v1.5.89

- Added a Runtime Health sentinel phase before heavier Browser release gate specifications.
- Verified sentinel failure prevents the heavy phase from starting, while a healthy sentinel continues with the selected or full remaining suite.
- Expanded changed-file impact mapping for PWA recovery, Runtime Health details, admin operations, quality reports, and comparison waveform paths.
- Added conservative shared-CSS selector extraction and full-suite fallback for missing or unmapped selectors.
- Added issue-ready flaky history output with unresolved cases prioritized above recurring retry recoveries.
- Expanded production fixture contracts for admin operations and quality-recovery diagnostics.
- Configured static/regression checks: 309/309 PASS; real Chromium execution remains GitHub Actions confirmation.

# FoxBear QA Report - v1.5.88

- Added dependency-light Browser QA scope classification before package and Chromium installation.
- Verified documentation/backend/static-only changes skip browser execution, known UI changes select related specs, and unknown/core changes run the complete suite.
- Verified selected specs are passed as spawn arguments without affecting explicit targets or Playwright `--last-failed` retry.
- Added cumulative flaky-history tracking with recurring-recovery thresholds and unresolved latest outcomes.
- Added GitHub cache restore/save integration and release-package exclusion for transient history data.
- Added workflow ordering, artifact, output, archive-hygiene, and history-accumulation regression coverage.
- Configured static/regression checks: 307/307 PASS; actual Chromium scope execution remains GitHub Actions confirmation.

# FoxBear QA Report - v1.5.87

- Primary and failed-only retry Playwright reports are compared by stable spec, title, and project identity.
- Recovered flaky cases, repeated failures, and missing retry results are exported as JSON, Markdown, and GitHub step summary evidence.
- Reporting failures cannot replace the actual Playwright outcome.
- Browser fixture contracts now cover Runtime Health release presentation and PWA wake-lock/service-worker recovery anchors.
- Configured static/regression checks: 304/304 target before final verification.

# FoxBear QA Report - v1.5.86

- Browser source safety and production fixture contracts now run before Chromium installation in both GitHub deployment workflows.
- Shared bulk-mastering and download-sheet fixtures are checked against current markup IDs, UI source tokens, and CSS selectors.
- Failed primary browser runs preserve JSON, server, and last-run evidence before retrying only Playwright's last failed cases.
- Playwright temporary artifacts are isolated under `qa/browser-results/artifacts` so retry cleanup cannot delete durable reports.
- Dependency-light regression coverage validates full-target versus last-failed argument construction, stale contract detection, and evidence preservation.
- Configured static/regression checks: 302/302 PASS after final verification; real Chromium execution remains GitHub CI confirmation.

# FoxBear QA Report - v1.5.85

- Centralized both Trusted Types-sensitive visual fixtures in reusable, serializable DOM builders.
- Added a dependency-light browser preflight that runs before Playwright resolution and reports file, line, rule code, and fix guidance.
- Added root-cause classification for Trusted Types, missing Chromium, navigation timeout, Runtime Health, and viewport overflow failures.
- Verified ten duplicate Trusted Types failures collapse into one diagnostic group while preserving individual details.
- Configured static/regression checks: 299/299 PASS after final verification; real Chromium execution remains installed-environment confirmation.

# FoxBear QA Report - v1.5.84

- Reproduced the release-gate failure as a Trusted Types violation in two visual fixture setup functions rather than a product layout failure.
- Replaced all browser-test `innerHTML` assignments with explicit DOM construction and text-only values.
- Expanded the unsafe HTML sink audit to scan `qa/browser` as well as `src`.
- Added a v1.5.84 regression guard for both affected specifications and their required DOM construction contracts.
- Configured static/regression checks: 295/295 PASS after final verification.
- Real Chromium execution remains the final confirmation for the reported CI gate; local Playwright installation was blocked by an npm registry 503 response.

# FoxBear QA Report - v1.5.83

- Dock transport capture rejects audio owned by another track, preventing old-track time from becoming the new track's restore position.
- Inactive crossfade events resolve the currently active Dock audio before MediaSession metadata and position are updated.
- Worker diagnostics verify active-job registration, progress/ETA updates, cancellation termination, and zero active jobs after settlement.
- Track lifecycle cleanup aborts both mastering and preview controllers and playback-link cleanup removes stale ownership datasets.
- VM regression coverage exercises cross-track transport fencing, stale MediaSession suppression, Worker cleanup, and dual job cancellation.
- Configured static/regression checks: 294/294 PASS after final verification. Real lock-screen MediaSession UI and browser Worker memory reclamation remain installed-device tasks.

# FoxBear QA Report - v1.5.82

- Quality-gate automatic recovery now distinguishes cancellation from a genuine recovery failure and propagates abort ownership to the parent mastering job.
- Cancelled recovery restores the first-render settings and metadata, does not report an operational incident, and cannot commit the first encoded Blob as a completed result.
- Foreground-return playback retries exactly once after a transient interruption only while the same request still owns a connected audio element.
- Superseded pause, source replacement, and detached-player paths cannot trigger the retry.
- VM regression coverage validates cancellation propagation, state rollback, bounded playback retry, and stale-request suppression.
- Configured static/regression checks: 293/293 PASS after final verification. Real mobile screen-lock, call interruption, and Chromium audio timing remain installed-device tasks.

# FoxBear QA Report - v1.5.81

- Master-preview decoding, DSP preparation, finalization, WAV encoding, and Blob URL commit now share one cancellable job owner.
- Settings invalidation, queue clearing, track removal, and resource release abort stale preview work before it can commit detached output.
- Global busy/rendering state is cleared only by the owning job, and locally created stale URLs are revoked before escape.
- Closed or replaced download-assist panels ignore late native share/file-picker rejection results.
- Service-level and DOM-harness regression coverage verifies job supersession, detached tracks, resource release, and stale native-result suppression.
- Configured static/regression checks: 292/292 PASS. Real worker termination, native sheets, and long-session heap reclamation remain installed-browser/device tasks.

# FoxBear QA Report - v1.5.80

- Managed Web Audio recovery now includes WebKit `interrupted` contexts and shares concurrent native resume requests.
- Long screen-lock transport snapshots retain Dock position and play intent for 12 hours while ordinary snapshots still expire quickly.
- MediaSession cleanup removes stale metadata, position, and action handlers; pause and seek actions target the current Dock audio.
- Native share/direct-save controls lock the full action surface and restore focus to the initiating button on return.
- VM regression coverage exercises interrupted resume deduplication, long-lock expiry, stale handler cleanup, and focus-lock source contracts.
- Configured static/regression checks: 290/290 PASS. Real screen lock, calls, share sheets, and file pickers remain installed-device verification tasks.

# FoxBear QA Report - v1.5.79

- Pending preview play completions are isolated by per-audio request ownership and cannot revive detached UI audio.
- Disposal invalidates pending playback requests before spectrum and playback-link resources are released.
- Download assist share/save actions are single-flight and expose synchronized `aria-busy` states.
- Non-BFCache page exit revokes every tracked download Blob URL while persisted BFCache navigation preserves them.
- VM regression coverage exercises delayed play, detached audio, rapid share taps, and Blob URL exit cleanup.
- Configured static/regression checks: 289/289 PASS.
- Real native share sheets, file pickers, Chromium audio timing, and mobile BFCache restoration remain installed-device verification tasks.

# FoxBear QA Report - v1.5.78

- Playback fade cancellation now settles the superseded promise and clears the retained RAF/controller state.
- A cancelled fade-out cannot pause audio after a newer play request has taken ownership.
- A cancelled crossfade cannot execute stale completion cleanup against the current sources.
- VM regression coverage exercises fade replacement, rapid pause/play, and crossfade cancellation without a browser dependency.
- Configured static/regression checks: 288/288 PASS.
- Real Chromium audio timing remains an installed-environment verification task.

# FoxBear QA Report - v1.5.76

- Release metadata synchronization now runs in an isolated staging workspace and commits only after SRI and metadata validation pass.
- Root and Functions lockfile versions are synchronized from `package.json`; dependency health distinguishes lock corruption from packages that are simply not installed yet.
- Regression coverage forces the staged SRI interpreter to fail and verifies protected release files remain byte-for-byte unchanged.
- Static QA includes the v1.5.75 dependency-light Playwright bootstrap guard and the new v1.5.76 release transaction diagnostics. Real Chromium rendering remains an installed-environment verification task.
- Tracked Python bytecode caches were removed; `.gitignore`, archive hygiene, and handoff deletion metadata now prevent them from returning.

# FoxBear QA Report - v1.5.74

- v1.5.74 adds between-track pause/resume, safe current-track skip, pending queue reordering, and a preserved batch completion summary.
- Mobile downloads use a near-full-height bottom sheet with MP3/WAV family selection, family-specific quality choices, and sticky save/share actions.
- Configured static/regression checks: 284/284 PASS in bounded verification; real Chromium rendering and real audio timing remain deployment-environment verification tasks.

# FoxBear QA Report - v1.5.73

- v1.5.73 adds safe multi-track cancellation, failed-track-only retry, per-track and batch ETA, result filters, and desktop/mobile visual layout contracts.
- Cancellation propagates to the active mastering signal, completed outputs remain intact, and not-yet-started tracks settle as cancelled.
- Configured static/regression checks: 282/282 PASS in bounded continuation segments.
- Historical compatibility anchors retained: 183/183 PASS, 182/182 PASS, 178/178 PASS, and 148/148 PASS.
- Playwright-dependent contracts were verified with a temporary static module only; actual Chromium rendering, Firebase deployment, and Gmail delivery remain production verification tasks.

# FoxBear QA Report - v1.5.72

- v1.5.72 changes multi-track analysis completion into a guided next step: the list closes and focus moves to the main `전체 마스터링` action.
- Multi-track mastering suppresses the single-track HUD and keeps current-track progress, completed results, and failures inside the track list.
- Administrator operations add compact mode, non-destructive cleanup of old unconfirmed mail tests, searchable/paged audit history, CSV export, and mobile card details.
- Configured static/regression checks: 281/281 PASS in bounded continuation segments. Actual Chromium rendering, Firebase deployment, and Gmail delivery remain production verification tasks.

# FoxBear QA Report - v1.5.71

- v1.5.71 reorganizes the administrator incident monitor around a prioritized health hero, grouped operations actions, responsive status cards, and clearer tables.
- Mail-test statistics, recent delivery trends, filtered history, and CSV export now share a 7-day, 30-day, 90-day, or all-history period.
- Operations telemetry includes the next verification due time, verification age, and schedule state.
- Configured static/regression checks: 280/280 PASS in bounded continuation segments.
- Actual Chromium rendering, Firebase deployment, and Gmail inbox/spam placement remain production verification tasks.

# FoxBear QA Report - v1.5.70

- v1.5.70 adds automatic mail-test verification alerts, 30-minute receipt-overdue tracking, cause-specific troubleshooting, delivery statistics, searchable history, and CSV export.
- Static regression coverage includes operations-health reasons, administrator UI controls, sanitized CSV generation, version metadata, SRI, service worker, and packaging gates.
- Configured static/regression checks: 279/279 PASS in bounded continuation segments.
- Actual Chromium execution, Firebase scheduled execution, and Gmail inbox/spam placement remain production verification tasks.

# FoxBear QA Report - v1.5.69

- v1.5.69 adds SMTP test-history retention, administrator inbox/spam receipt confirmation, seven-day verification freshness warnings, and one branded HTML mail template.
- Static regression coverage includes Firestore rules, Functions trigger contracts, administrator UI state, sender/subject rules, mail body fallback text, SRI, service-worker metadata, and packaging gates.
- Wake Lock, mastering, export, download, and browser contract protections remain active.
- Configured static/regression checks: 278/278 PASS in bounded continuation segments.
- Actual Chromium execution and real Gmail inbox placement still require the deployment environment.

# FoxBear QA Report - v1.5.67

- v1.5.67 static and regression checks are tracked by the release gate.
- Administrator audit logs, webhook retry/failover, Firestore index probes, paged operations history, and scheduled deployment health verification are included.
- Full browser execution still requires an installed Chromium runtime; static Playwright contracts are verified separately.

# FoxBear QA Report - v1.5.66

- v1.5.66 static and regression checks are tracked by the release gate.
- Administrator action guards, alert testing, deployment verification, and operations history contracts are included.

# QA Report - v1.5.64 Incident Operations Health Self-Diagnostics

- Added a 15-minute server audit for SMTP/Secret readiness, long-undelivered reports, dead-letter accumulation, summary failures, and KST quota reservation leaks.
- Added transition-aware operations alert and recovery email behavior with a 12-hour persistent-issue cooldown.
- Added administrator-readable `incidentOperations/mail` telemetry and exact KST-day incident counting.
- Preserved fenced audit completion, previous mail queue recovery, SRI, service-worker, and package gates.
- Static and regression target: all 273 configured checks PASS in bounded continuation segments.

## v1.5.64 coverage

- Gmail app-password format and live SMTP authentication classification
- healthy/warning/critical operations state evaluation
- long-undelivered and dead-letter thresholds
- daily summary lock/failure and quota reservation leak visibility
- operations alert transition, cooldown, and recovery behavior
- administrator Firestore rule, KST count, and self-diagnostics UI coverage
- release metadata, historical QA document stability, handoff, SRI, and package integrity

# QA Report - v1.5.63 Incident Mail Quota and Summary Recovery

- Incident mail quotas now use KST date buckets instead of UTC dates.
- Quota-limited reports remain retryable and legacy `suppressed-rate-limit` reports are recovered by the watchdog.
- Per-report reservation ownership returns daily capacity after success, failure, duplicate suppression, quota deferral, and missing-report cleanup.
- Daily summaries paginate in 500-report pages, mark 5,000-report truncation, use deterministic Message-IDs, and backfill the previous three KST dates.
- SMTP success requires at least one accepted recipient and the Gmail app password must normalize to exactly 16 characters.
- Static and regression target: all 272 configured checks PASS in bounded continuation segments.

## v1.5.63 coverage

- KST date boundary and next-day retry calculation
- legacy rate-limit migration and retry scheduling
- daily reservation ownership and leak prevention
- summary pagination, truncation disclosure, lease fencing, and backfill schedule
- SMTP accepted-recipient validation and strict Secret format
- release metadata, handoff, SRI, and package integrity

# QA Report - v1.5.62 Incident Delivery Watchdog and Package Gate

- New incident reports begin in an explicit pending delivery queue.
- Status-specific Firestore indexes cover pending work, due retries, and expired delivery leases.
- Lease fencing rejects stale completions, and deterministic SMTP Message-IDs reduce ambiguous duplicate delivery.
- Exhausted reports enter a dead-letter state with authenticated administrator recovery.
- Release and overwrite ZIP entrypoints reject version or handoff drift before packaging.
- Static and regression target: all 270 configured checks PASS in bounded continuation segments.

## v1.5.62 coverage

- pending queue initialization and Firestore rule parity
- pending, failed, sending, and retrying watchdog queries
- lease ID ownership and stale completion fencing
- dead-letter display and administrator forced retry
- deterministic report Message-ID and delivery diagnostics
- required three-section handoff reporting format
- release/overwrite package preflight gates

# QA Report - v1.5.60 Kakao In-App Entry and Adaptive Memory Governor

- KakaoTalk opens the FoxBear studio in-app by default instead of forcing the external-browser landing.
- 404 recovery targets `index.html` directly and carries the legacy in-app bypass marker to prevent cached redirect loops.
- Preflight and observed memory pressure can select Fast processing, lightweight peak work, compact waveform analysis, and early PCM release.
- Existing download recovery, Wake Lock, service worker, quality gate, and export contracts remain required.
- Static and regression target: all 266 configured checks PASS in bounded continuation segments.

## v1.5.60 coverage

- direct Kakao entry without forced redirect
- explicit external-browser guide remains available
- 404-to-index recovery without route loops
- pre-decode and runtime memory governor decisions
- legacy app-size and SRI preservation

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