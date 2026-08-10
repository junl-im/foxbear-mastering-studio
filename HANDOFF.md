# Handoff - v1.6.86

## Current release

- Product version: `1.6.86`
- Build ID: `header-order-mobile-overflow-browser-gate-recovery`
- Asset version: `1.6.86-header-order-mobile-overflow-browser-gate-recovery`
- Service worker cache: `foxbear-shell-v1.6.86-header-order-mobile-overflow-browser-gate-recovery`
- Configured static/regression target: 441 checks.

## Current focus

- Fix the exact v1.6.85 Runtime Health geometry failures without weakening assertions.
- Restore desktop creator/workspace/settings visual order.
- Remove Pixel-class command-bar overlap by hiding only the nonessential creator token at 430px and below.
- Remove and commit the legacy tracked `PATCH_MANIFEST.json` so the source-hygiene warning disappears.
- Verified delivery: 766-file full ZIP; 304-file patch + 7 delete paths; v1.6.85 replay matched exactly.

## Required GitHub Desktop step

1. Extract the **v1.6.86 patch ZIP** into the **v1.6.85 repository root** and replace matching files.
2. Windows: run `APPLY_PATCH_CLEANUP.cmd`. macOS/Linux: run `bash APPLY_PATCH_CLEANUP.sh`.
3. Confirm GitHub Desktop shows **`PATCH_MANIFEST.json` as deleted**. If it is still listed in the repository, do not omit that deletion from the commit.
4. Commit all modified/new/deleted files and **Push origin**.
5. For a clean replacement, preserve `.git` and extract the v1.6.85 full ZIP into the repository folder.

## Verified

- Static and behavioral checks: **440/440 PASS**.
- Version synchronization, Functions syntax, App Check policy, source hygiene, handoff, browser preflight, dependency structure, and Hosting staging: **PASS**.
- Firebase Hosting boundary: **161 allowlisted files**.
- Local Chromium CSS geometry at 1440/430/393/375/320px: no command-left clipping and no row overlap.
- Full Playwright navigation is environment-blocked here; GitHub Actions is the final browser acceptance run.
- Full ZIP: **764 files**. Patch ZIP: **307 overwrite files**, **7 delete paths**, no generated `PATCH_MANIFEST.json`. Replay over v1.6.84 with a simulated legacy manifest reproduced the full tree exactly (`764/764`, missing 0, extra 0, changed 0).

# Handoff - v1.6.79

## Current release

- Product version: `1.6.79`
- Build ID: `manifestless-patch-playback-retirement`
- Asset version: `1.6.79-manifestless-patch-playback-retirement`
- Service worker cache: `foxbear-shell-v1.6.79-manifestless-patch-playback-retirement`
- Configured static/regression target: 434 checks.

## Current focus

- Stop GitHub Desktop overwrite ZIPs from extracting generated `PATCH_MANIFEST.json` into the repository root.
- Keep legacy manifests as deletion-only hygiene cleanup so existing repositories converge to a clean state.
- Enforce the existing 45-second playback retirement ceiling for inactive stale media references while never revoking an actively playing source.
- Preserve archive-level release-generation verification added in v1.6.78.

## Required GitHub Desktop step

1. Extract `foxbear-mastering-studio-v1.6.79-patch.zip` into the **v1.6.78 repository root** and replace matching files.
2. Delete every path listed in `DELETE_PATHS.txt` if it still exists. In particular, delete any legacy root `PATCH_MANIFEST.json`.
3. Review modifications/additions/deletions in GitHub Desktop, commit, and **Push origin**.
4. For a clean replacement, preserve `.git` and extract the v1.6.79 full ZIP into the repository folder.

## Verified

- Static and behavioral checks passed **434/434** (`109/109`, `109/109`, `109/109`, `107/107`).
- Version synchronization, Functions syntax, source hygiene, App Check policy, handoff, browser preflight, dependency structure, and Firebase Hosting staging passed.
- Firebase Hosting boundary: **159 allowlisted files**.
- Full archive: **750 files**. Patch: **296 overwrite files**, no generated patch manifest, with **7 delete paths**.
- Full archive verification reruns the release metadata checker inside the extracted ZIP.


# Handoff - v1.6.67

## Current release

- Product version: `1.6.67`
- Build ID: `ci-strict-hygiene-policy`
- Asset version: `1.6.67-ci-strict-hygiene-policy`
- Service worker cache: `foxbear-shell-v1.6.67-ci-strict-hygiene-policy`
- Configured static/regression target: 417 checks.

## Current focus

- Prevent GitHub Actions from deleting committed source-hygiene violations before validation.
- Keep local extract-overwrite recovery convenient without weakening CI.
- Validate repository hygiene before `npm ci`.
- Produce actionable GitHub annotations and local repair commands.

## Required GitHub Desktop step

After extracting the patch, run `npm run source:hygiene:repair`, then commit every displayed deletion together with the v1.6.67 changes. CI intentionally fails until tracked local/generated files are removed from the repository.

## Verified

- Configured static/regression checks: **417/417 passed** (`105/105`, `105/105`, `105/105`, `102/102`).
- Strict CI mode preserved the offending fixture and failed with a GitHub annotation.
- Local mode repaired only the allowlist; secret-like files remained blocked.
- Metadata, handoff, dependency structure, browser preflight, Functions syntax, and Hosting boundary checks passed.
- Full ZIP contains 715 files; patch ZIP declares 286 files plus its manifest and 7 delete paths.
- Applying the patch over v1.6.66 reproduced the v1.6.67 tree exactly (`715/715`).

# Handoff - v1.6.66

## Current release

- Product version: `1.6.66`
- Build ID: `static-gate-hygiene-repair`
- Asset version: `1.6.66-static-gate-hygiene-repair`
- Service worker cache: `foxbear-shell-v1.6.66-static-gate-hygiene-repair`
- Configured static/regression target: 416 checks.

## Current focus

- Repair the v1.6.65 static release gate failure caused by stale tracked `.firebaserc`, `.firebase/hosting..cache`, and `qa/static-audit.txt`.
- Delete only approved generated/local paths before the strict hygiene check.
- Continue to block `.env*` and other secret-like files without automatic deletion.
- Let GitHub Desktop users run `npm run source:hygiene:repair` to stage real repository deletions.

## Verified

- Configured static/regression checks: **416/416 passed** (`104/104` in each of four bounded slices).
- The exact v1.6.65 CI failure fixture was auto-repaired before the strict release gate continued.
- Source hygiene, metadata, handoff, browser preflight, Functions syntax, and the 152-file Hosting boundary passed.
- The full archive contains 712 files; the patch declares 283 source files plus its manifest and 7 delete paths.
- Applying the patch over v1.6.65 with stale local/generated files present reproduced the v1.6.66 source tree exactly.
- Real Playwright/device browser and deployed Firebase acceptance remain external.

## Apply with GitHub Desktop

1. Fetch origin.
2. Extract `foxbear-mastering-studio-v1.6.66-patch.zip` into the repository root and replace matching files.
3. Commit and push. The CI static gate now repairs the known stale generated paths before validation.
4. To permanently remove those tracked files from the repository, run `npm run source:hygiene:repair`, review the deletions in GitHub Desktop, commit, and push once more.

# Handoff - v1.6.65

## Current release

- Product version: `1.6.65`
- Build ID: `firestore-write-fencing`
- Asset version: `1.6.65-firestore-write-fencing`
- Service worker cache: `foxbear-shell-v1.6.65-firestore-write-fencing`
- Configured static/regression target: 415 checks.

## Current focus

- Use deterministic `UID_YYYY-MM-DD` visit IDs instead of random Firestore IDs.
- Treat existing same-day visit documents as successful deduplication.
- Fence Firestore visit/report creates to IDs derived from authenticated UID and validated payload fields.
- Keep Callable incident IDs canonical and reject mismatched caller input.

## Verified

- Configured static/regression checks: **415/415 passed** (`104/104`, `104/104`, `104/104`, `103/103`).
- Source hygiene, metadata, handoff, browser preflight, Functions syntax, and the 152-file Hosting boundary passed.
- The full archive contains 708 files and passes archive verification.
- The patch manifest contains 281 source files and 7 delete paths.
- Applying the patch over the supplied v1.6.64 full tree reproduced the v1.6.65 source content exactly.
- Real Playwright/device browser and deployed Firebase acceptance remain external.

## Apply with GitHub Desktop

1. Fetch origin.
2. Extract `foxbear-mastering-studio-v1.6.65-patch.zip` into the repository root and replace matching files.
3. Delete paths listed in `DELETE_PATHS.txt` when present.
4. Review changes, commit, and Push origin.
5. Deploy Firestore Rules and Functions together after `npm run check:release` passes.

# Handoff - v1.6.64

## Current release

- Product version: `1.6.64`
- Build ID: `github-desktop-delivery-contract`
- Asset version: `1.6.64-github-desktop-delivery-contract`
- Service worker cache: `foxbear-shell-v1.6.64-github-desktop-delivery-contract`
- Configured static/regression target: 414 checks.

## Current focus

- Generate the exact two user-facing artifacts with `npm run package:delivery`.
- Reject tracked or archived local Firebase state, generated QA output, and secret-like environment files.
- Keep the patch package limited to files changed from the v1.6.63 base and intended for direct extraction over that repository.
- Carry explicit deletion guidance for files that archive extraction cannot remove.

## Verified

- Configured static/regression checks: **414/414 passed**.
- Source hygiene, metadata, handoff, browser preflight, Functions syntax, and 152-file Hosting boundary passed.
- The changed-file patch contains 289 source files and 6 delete paths and reproduces the v1.6.64 tree over the v1.6.63 base.
- Real Playwright/device browser acceptance remains external.

## Apply with GitHub Desktop

1. Fetch origin.
2. Extract `foxbear-mastering-studio-v1.6.64-patch.zip` into the repository root and replace matching files.
3. Delete paths listed in `DELETE_PATHS.txt` when present.
4. Review changes, commit, and Push origin.
5. Run `npm run check:release` before deployment.

# Handoff - v1.6.63

- Build: `download-filename-review-hardening`.
- Input archive SHA-256: `fed0b881d511525762731db133c5b88b2c0bc9dea952162304182fab2f1422f2`.
- Baseline: `main` at `5c3d3349`, continuing the v1.6.60-v1.6.62 temporary-chat delivery state.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Preserve `track.sourceFileName` and `track.outputNameMeta.sourceName`; together they keep the imported and mastering-time title provenance explicit.
- Do not reduce the bulk-summary cache key back to count/last-track only. Every completed track must participate.
- Keep the visible review bounded to 12 rows; the complete final-name manifest belongs in the copy action, not a 1,000-node list.
- Keep grapheme-aware UTF-8 truncation and the 240-byte limit synchronized across direct downloads and ZIP entries.
- Keep collision, sanitization, and truncation diagnostics separate enough for the review UI to explain automatic changes.
- Preserve accessible live copy status, 44 px narrow-screen actions, forced-colors borders, and no CSS `:has()` dependency.
- Preserve `DELIVERY_RULES.md` and the two-ZIP GitHub Desktop workflow.
- Detailed decisions, exception audit, challenge questions, and design checks are in `docs/V1.6.63_FILENAME_PROVENANCE_EXPORT_REVIEW_DESIGN_AUDIT.md`.

## Current release

- Product version: `1.6.63`
- Build ID: `download-filename-review-hardening`
- Asset version: `1.6.63-download-filename-review-hardening`
- Service worker cache: `foxbear-shell-v1.6.63-download-filename-review-hardening`
- Configured static/regression target: 413 checks.
- Dedicated filename provenance, grapheme truncation, summary invalidation, export review, copy, and responsive-layout regression added.
- Final configured checks: `413/413` passed in bounded slices (`138/138`, `138/138`, and `137/137`).
- `src/app.js` remains below the historical 13,300-line architecture budget at 13,297 lines.
- Metadata, SRI, Hosting, browser-preflight, Python hygiene, Functions syntax, and dependency metadata gates passed.
- Chromium CDP fixtures at 360x800, 430x932, and 1280x900 reported no horizontal overflow.
- Final release and overwrite archives contain `732` entries each and pass archive integrity, transient-file, executable-file, symlink, payload-boundary, and handoff verification.

# Handoff - v1.6.62

- Build: `download-filename-preview-controls`.
- Input archive SHA-256: `2fd1b55c83666e1ee65adf11044ca77601711e344593eb7fc24874f1c3de6ab0`.
- Baseline: `main` at `5c3d3349`, continuing the uncommitted v1.6.60/v1.6.61 delivery state supplied in this temporary chat.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Preserve `track.outputNameMeta`: it is the immutable record of the LUFS/style/platform/format that actually created a completed master.
- Do not return to `track.outName`-first download behavior; every save path must rebuild the name through `FoxBearFileNamePolicyService`.
- Filename switches are global and must affect direct, transformed, sequential, share, and ZIP paths consistently.
- Keep runtime-memory preference fallback for environments where localStorage throws or is blocked.
- Keep duplicate names deterministic with ` (2)`, ` (3)` and expose collision count before bulk export.
- Keep filename preview text wrapping and the mobile one-column controls; do not use CSS `:has()` for required state styling.
- Preserve `DELIVERY_RULES.md` and the two-ZIP GitHub Desktop workflow.
- Detailed decisions, exception audit, and challenge checks are in `docs/V1.6.62_DOWNLOAD_FILENAME_PREVIEW_CONTROLS.md`.

## Current release

- Product version: `1.6.62`
- Build ID: `download-filename-preview-controls`
- Asset version: `1.6.62-download-filename-preview-controls`
- Service worker cache: `foxbear-shell-v1.6.62-download-filename-preview-controls`
- Configured static/regression target: 412 checks.
- Dedicated filename preview, token controls, collision preflight, storage fallback, and layout regression added.
- Final configured checks: `412/412` passed in bounded slices (`138/138`, `137/137`, and `137/137`).
- Filename orchestration lives in `src/download/file-name-workflow-service.js`; keep `src/app.js` below the historical 13,300-line budget.
- Metadata, SRI, handoff, Hosting, browser-preflight, Python hygiene, Functions syntax, and dependency metadata gates passed.
- Actual Playwright/system-Chromium visual capture remains unavailable in this container; real-device layout acceptance is still required.
- Final full and overwrite archives contain `730` entries each and pass archive integrity and handoff verification.

# Handoff - v1.6.60

- Build: `bulk-zip-hud-navigation`.
- Input archive SHA-256: `065816dfcce21e1c5ca1935be514268b09410d09b99b2dfda2ce9fc7ddb634ac`.
- Baseline: `main` at `5c3d3349`, product v1.6.59.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- ZIP export must remain a one-archive operation; never route it into `FoxBearExportQueueService`.
- Preserve the worker hard limits of 200 files and 1,500 MB source data.
- Treat working-set pressure as a warning below those hard limits.
- Preserve worker file-count, size, and `.zip` delivery-name validation.
- HUD current-row navigation must re-resolve the latest DOM and record completion only after layout succeeds.
- Preserve `DELIVERY_RULES.md` and the two-ZIP GitHub Desktop workflow.
- Pre-existing local modifications to `.firebaserc`, `.firebase/hosting..cache`, and `qa/static-audit.txt` were not used as release changes and remain excluded from the archives.
- Detailed decisions and external acceptance are in `docs/V1.6.60_BULK_ZIP_HUD_NAVIGATION.md`.

## Current release

- Product version: `1.6.60`
- Build ID: `bulk-zip-hud-navigation`
- Asset version: `1.6.60-bulk-zip-hud-navigation`
- Service worker cache: `foxbear-shell-v1.6.60-bulk-zip-hud-navigation`
- Configured static/regression target: 409 checks.
- Dedicated ZIP single-archive and HUD navigation regression added.
- Final test counts and archive entry counts are recorded after packaging.

# Handoff - v1.6.59

- Build: `readiness-corp-security-hardening`.
- Input archive SHA-256: `742f1381385a826fc7b60fc22822ce5e4e6a84852e337fa127692b4ecbbdc8c3`.
- Baseline: `main` at `25007615`, product v1.6.58.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep COOP `same-origin-allow-popups`; keep CORP `same-origin`.
- Never restore SMTP Secret/connection inspection for anonymous or ordinary authenticated users.
- Full SMTP readiness requires verified `google.com` auth plus an active, non-expired `siteAdmins/{uid}` record.
- Keep readiness cache document IDs fixed to `public` and `admin`; do not return to UID-keyed cooldowns.
- Public restricted rows must remain explicit warnings and must not claim the SMTP path was tested.
- Preserve `DELIVERY_RULES.md` and the two-ZIP GitHub Desktop workflow.
- Detailed audit decisions, exceptions, and 30 challenge checks are in `docs/V1.6.59_READINESS_CORP_SECURITY_HARDENING.md`.

## Current release

- Product version: `1.6.59`
- Build ID: `readiness-corp-security-hardening`
- Asset version: `1.6.59-readiness-corp-security-hardening`
- Service worker cache: `foxbear-shell-v1.6.59-readiness-corp-security-hardening`
- Configured static/regression target: 408 checks.
- Final configured checks: `408/408` passed in bounded slices (`136/136`, `136/136`, and `136/136`).
- Dedicated v1.6.59 and historical readiness regressions passed, including concurrent coalescing and fail-closed administrator lookup.
- Metadata, SRI, handoff, browser fixture preflight, Hosting payload validation, Python hygiene, and Firebase Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings; full install/audit requires a registry containing every locked package.
- Browser automation remains unavailable because `@playwright/test` and Chromium are not installed.
- Final full and overwrite archives contain `722` entries each and pass archive integrity and payload-boundary checks.

# Handoff - v1.6.58

- Build: `piano-transient-integrity`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep the worker finalizer as the single normal lookahead/True-Peak limiter.
- Do not restore pre-finalizer gain above the bounded staging caps.
- Do not restore per-sample near-ceiling `tanh` waveshaping.
- Keep melodic-transient risk scaling on the exciter, metallic notches, tone chain, preview, and limiter release.
- Keep `HIGH_GLARE` in the before/after quality audit and quality gate.
- File-specific confirmation still requires the exact original/mastered audio pair.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.58`
- Build ID: `piano-transient-integrity`
- Asset version: `1.6.58-piano-transient-integrity`
- Service worker cache: `foxbear-shell-v1.6.58-piano-transient-integrity`
- Configured static/regression target: 407 checks.
- Final configured checks: `407/407` passed in bounded slices (`136/136`, `136/136`, and `135/135`).
- Dedicated synthetic piano transient regression and historical engine/golden-audio regressions passed.
- Metadata, SRI, handoff, browser fixture preflight, Hosting payload validation, and Firebase Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Browser automation remains unavailable because `@playwright/test` and Chromium are not installed.
- Final full and overwrite archives contain `720` entries each and pass archive integrity and payload-boundary checks.
- Real original/mastered WAV24 A/B remains an external audio acceptance gate.

# Handoff - v1.6.57

- Build: `firebase-hosting-payload-boundary`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep Firebase Hosting `public` fixed to `dist/hosting`; do not restore repository-root publication.
- Keep the staging allowlist limited to the approved root pages plus `assets/`, `src/`, and `vendor/`.
- Do not weaken hidden-file, secret-like file, executable, or symbolic-link rejection.
- Keep `npm run hosting:check` in the Hosting predeploy hook so direct Firebase CLI deployment is fenced.
- Remove the tracked `.firebase/hosting..cache`; future Firebase CLI state remains local and ignored.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.57`
- Build ID: `firebase-hosting-payload-boundary`
- Asset version: `1.6.57-firebase-hosting-payload-boundary`
- Service worker cache: `foxbear-shell-v1.6.57-firebase-hosting-payload-boundary`
- Configured static/regression target: 406 checks.
- Final configured checks: `406/406` passed.
- Dedicated Hosting allowlist, private-file isolation, and direct-deploy preflight regression passed.
- Actual Hosting stage contains 150 allowlisted files totaling approximately 4.38 MB and no repository metadata, Functions, QA, tools, or docs.
- Metadata, SRI, handoff, browser fixture preflight, Hosting payload validation, and Firebase Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Browser automation could not start because `@playwright/test` and Chromium are unavailable in this environment.
- The aggregate `check:release` wrapper exceeded the sandbox process limit; all static components were executed and passed independently.
- Final full and overwrite archives contain `718` entries each and pass compressed-data integrity and executable-payload checks.
- Real Firebase deployment remains an external production gate.

# Handoff - v1.6.56

- Build: `playback-blob-source-resilience`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep source repair backed by the retained File, mastered Blob, or highlight Blob; never synthesize a new audio payload.
- Preserve playback position and resume only when the latest transport intent is still playing.
- Do not immediately revoke a previous mastered URL while a connected player still owns it.
- Keep recovery attempts bounded and release all deferred URLs when the track is removed.
- Keep the recovery implementation in `src/audio/playback-source-recovery-service.js` so `src/app.js` remains below its historical line budget.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.56`
- Build ID: `playback-blob-source-resilience`
- Asset version: `1.6.56-playback-blob-source-resilience`
- Service worker cache: `foxbear-shell-v1.6.56-playback-blob-source-resilience`
- Configured static/regression target: 405 checks.
- Final configured checks: `405/405` passed in bounded slices (`135/135`, `135/135`, and `135/135`).
- Dedicated source resilience and historical post-master, crossfade, rapid-intent, and mobile-focus regressions passed.
- Metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Browser automation could not start because `@playwright/test` and Chromium are unavailable in this environment.
- Real Android/iOS memory-pressure, long-idle, PWA, and KakaoTalk WebView checks remain external device gates.
- Final full and overwrite archives contain `715` entries each and pass compressed-data integrity and executable-payload checks.

# Handoff - v1.6.52

- Build: `post-master-playback-readiness-recovery`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Do not restore the `master-complete` forced Dock refresh after the 100% render; the committed player must survive the first user tap.
- Resolve playback ownership from the active audio element rather than the first player child during crossfade cleanup.
- Keep mastered/highlight Blob preload, the bounded 2.2-second readiness window, ended-media rewind, and source-error recovery together.
- Preserve transition generation fencing and restore the remembered audible volume when a fade is cancelled.
- Keep the recovery implementation in `src/audio/post-master-playback-recovery-service.js` so `src/app.js` remains within the line-budget contract.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.52`
- Build ID: `post-master-playback-readiness-recovery`
- Asset version: `1.6.52-post-master-playback-readiness-recovery`
- Service worker cache: `foxbear-shell-v1.6.52-post-master-playback-readiness-recovery`
- Configured static/regression target: 399 checks.
- Final configured checks: `399/399` passed in bounded slices (`133/133`, `133/133`, and `133/133`).
- Dedicated post-master playback readiness and strengthened transition-race regressions passed with historical Dock, mobile return, preview ownership, download, PWA, service-worker, and security coverage.
- Metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Browser automation could not start because `@playwright/test` and Chromium are unavailable in this environment.
- Real Android/iOS immediate post-completion tapping, background return, and KakaoTalk WebView playback remain external environment gates.
- Final full and overwrite archives contain `705` entries each and pass compressed-data integrity and executable-payload checks.

# Handoff - v1.6.51

- Build: `stability-concurrency-input-guard`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep the Kakao notice overlay input-blocking until its dismissal pointer finishes; do not restore background click-through.
- Keep duplicate-script singleton and orphan-notice cleanup behavior.
- Keep conversion jobs keyed by exact source Blob, source format, and requested format.
- Do not pass an individual caller signal directly to a shared worker job.
- Abort shared decode/encode only when the final subscriber leaves.
- Preserve source snapshot isolation so a replaced master cannot receive stale variant cache data.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.51`
- Build ID: `stability-concurrency-input-guard`
- Asset version: `1.6.51-stability-concurrency-input-guard`
- Service worker cache: `foxbear-shell-v1.6.51-stability-concurrency-input-guard`
- Configured static/regression target: 397 checks.
- Final configured checks: `397/397` passed in bounded slices (`133/133`, `132/132`, and `132/132`).
- Dedicated Kakao input-safety and shared conversion concurrency regressions passed with historical download, cancellation, cache, PWA, service-worker, and security coverage.
- Metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Playwright/Chromium is not installed in this sandbox; real KakaoTalk Android/iOS gesture and concurrent download verification remains an external environment gate.
- Final full and overwrite archives contain `702` entries each and pass compressed-data integrity and executable-payload checks.

# Handoff - v1.6.50

- Build: `kakao-centered-entry-notice`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep Kakao detection ahead of the notice boot module.
- Keep the warning non-modal and do not prevent the studio from loading underneath it.
- Preserve first-touch/Escape dismissal, the eight-second timeout, and listener/timer cleanup.
- Do not show the notice in normal browsers, standalone PWA mode, or the explicit external-guide redirect.
- Keep the Kakao download warning, external/default browser guidance, and PWA installation message together.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.50`
- Build ID: `kakao-centered-entry-notice`
- Asset version: `1.6.50-kakao-centered-entry-notice`
- Service worker cache: `foxbear-shell-v1.6.50-kakao-centered-entry-notice`
- Configured static/regression target: 396 checks.
- Final configured checks: `396/396` passed in bounded slices (`132/132`, `132/132`, and `132/132`).
- Dedicated Kakao notice regression and historical Kakao/PWA/download/toast/service-worker regressions passed.
- Metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Playwright/Chromium is not installed in this sandbox; real KakaoTalk Android/iOS visual and menu-wording verification remains an external environment gate.
- Final full and overwrite archives contain `700` entries each and pass compressed-data integrity and executable-payload checks.

# Handoff - v1.6.49

- Build: `download-variant-cache-reuse`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep the converted-variant cache bounded to one entry and 64 MB per mastered source.
- Do not cache encoder fallback output under a different requested format.
- Keep cached file names derived at use time rather than stored in the cache.
- Preserve separate MP3-to-MP3 and MP3-to-WAV quality warnings.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.49`
- Build ID: `download-variant-cache-reuse`
- Asset version: `1.6.49-download-variant-cache-reuse`
- Service worker cache: `foxbear-shell-v1.6.49-download-variant-cache-reuse`
- Configured static/regression target: 394 checks.
- Final configured checks: `394/394` passed in bounded slices (`130/130`, `130/130`, and `134/134`).
- Dedicated cache-reuse regression and historical download, Blob validation, codec, cancellation, and memory regressions passed.
- Metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Playwright/Chromium is not installed in this sandbox; real-device repeated download/share verification remains an external environment gate.
- Final full and overwrite archives contain `696` entries each and pass compressed-data integrity and executable-payload checks.

# Handoff - v1.6.48

- Build: `post-master-download-format-quality`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Do not remove the completed-output transcode fallback; it is what keeps alternate formats available after the memory guard releases PCM.
- Keep the current-format Blob reuse path first so no unnecessary decode/encode occurs.
- Keep the MP3-to-WAV quality warning because container conversion does not restore lossy detail.
- Keep the always-visible quality selector and the MP3/WAV context menu synchronized.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.48`
- Build ID: `post-master-download-format-quality`
- Asset version: `1.6.48-post-master-download-format-quality`
- Service worker cache: `foxbear-shell-v1.6.48-post-master-download-format-quality`
- Configured static/regression target: 393 checks.
- Official configured static and behavioral checks: `393/393` passed.
- Dedicated download-format regression and related historical download/memory regressions passed.
- Metadata, SRI, handoff, browser fixture preflight, Hosting payload hygiene, and Firebase Functions syntax passed.
- Dependency health: 0 errors and 4 expected missing-install warnings.
- Playwright/Chromium is not installed in this sandbox; real-device and restricted in-app browser download verification remains an external environment gate.
- Final full and overwrite archives contain `694` entries each and pass package integrity and executable-payload checks.

# Handoff - v1.6.47

- Build: `external-host-admin-auth-opaque-error-recovery`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Treat `jurl-img.github.io` as external hosting: popup first, no `getRedirectResult()` there.
- Keep redirect authentication limited to the two approved Firebase Hosting domains.
- Preserve delayed auth-state reconciliation before external-host fallback.
- Keep the fallback fixed to `https://foxbear-music.web.app`; do not add open-redirect inputs.
- Keep opaque cross-origin `Script error.` events out of the file-import error banner.
- App Check remains intentionally disabled.
- Spark deployments use `npm run deploy:spark`.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.47`
- Build ID: `external-host-admin-auth-opaque-error-recovery`
- Asset version: `1.6.47-external-host-admin-auth-opaque-error-recovery`
- Service worker cache: `foxbear-shell-v1.6.47-external-host-admin-auth-opaque-error-recovery`
- Configured static/regression target: 392 checks.
- Final configured checks: `392/392` passed in three bounded release-gate chunks; metadata, SRI, handoff, browser preflight, Hosting payload hygiene, and Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Playwright/Chromium is not installed in this sandbox; real Firebase production Google login remains an external environment gate.
- Final full and overwrite archives contain `692` entries each, contain no executable payloads, and pass compressed-data integrity checks.

# Handoff - v1.6.46

- Build: `google-auth-same-origin-network-recovery`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- The displayed `auth/network-request-failed` occurs before any `siteAdmins/{UID}` read.
- Keep `authDomain` restricted to the active approved FoxBear Firebase Hosting domain.
- Keep the popup-to-redirect recovery limited to one attempt and preserve redirect-loop fencing.
- Keep auth diagnostics limited to code, origins, online state, and query-free rejected script path.
- App Check remains intentionally disabled.
- Preserve the narrow Firebase Auth gapi Trusted Types allowlist.
- Add both OAuth `/__/auth/handler` URIs documented in `FIREBASE_SETUP.md` before production verification.
- Spark deployments use `npm run deploy:spark`.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.46`
- Build ID: `google-auth-same-origin-network-recovery`
- Asset version: `1.6.46-google-auth-same-origin-network-recovery`
- Service worker cache: `foxbear-shell-v1.6.46-google-auth-same-origin-network-recovery`
- Configured static/regression target: 391 checks.
- Final configured checks: `391/391` passed in bounded release-gate chunks; metadata, SRI, handoff, browser preflight, Hosting payload hygiene, and Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Playwright/Chromium is not installed in this sandbox; real Firebase production Google login remains an external environment gate.
- Final full and overwrite archives contain `690` entries each, contain no executable payloads, and pass compressed-data integrity checks.

# Handoff - v1.6.45

- Build: `windows-release-gate-spark-hosting-no-app-check`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Delete any pre-existing root `cmd.exe`; it is not a project file.
- Keep Spark Hosting executable-file ignore rules and archive rejection guards enabled.
- Run npm child scripts through the active Node/npm CLI entry; do not restore direct `spawnSync('npm.cmd')`.
- App Check is intentionally not used. Do not add a site key, SDK import, token header, enforcement, or reCAPTCHA CSP allowance.
- Administrator access remains Firebase Google Authentication plus an active matching `siteAdmins/{UID}` document.
- Keep the exact Firebase Auth gapi loader and `/_/scs/apps-static/_/js/` Trusted Types allowlist.
- Spark deployments use `npm run deploy:spark`.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.45`
- Build ID: `windows-release-gate-spark-hosting-no-app-check`
- Asset version: `1.6.45-windows-release-gate-spark-hosting-no-app-check`
- Service worker cache: `foxbear-shell-v1.6.45-windows-release-gate-spark-hosting-no-app-check`
- Configured static/regression target: 390 checks.
- Final configured checks: `390/390`; metadata, SRI, handoff, browser preflight, Hosting payload hygiene, and Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Playwright/Chromium is not installed in this sandbox; real Firebase production Google login remains an external environment gate.
- Final full and overwrite archives contain `688` entries each, contain no executable payloads, and pass compressed-data integrity checks.

# Handoff - v1.6.44

- Build: `google-auth-gapi-module-trusted-types-recovery`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep strict Trusted Types enforcement enabled.
- Allow the exact Firebase Auth gapi bootstrap loader and only the generated `/_/scs/apps-static/_/js/` module prefix on `apis.google.com`.
- Do not broaden the default policy to all Google script paths.
- Keep rejected diagnostics query-free.
- Spark deployments continue to use `npm run deploy:spark`.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.44`
- Build ID: `google-auth-gapi-module-trusted-types-recovery`
- Asset version: `1.6.44-google-auth-gapi-module-trusted-types-recovery`
- Service worker cache: `foxbear-shell-v1.6.44-google-auth-gapi-module-trusted-types-recovery`
- Configured static/regression target: 389 checks.
- Final configured checks: `389/389`; metadata, SRI, handoff, browser preflight, and Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Playwright/Chromium is not installed in this sandbox; real Firebase production Google login remains an external environment gate.
- Engine synthetic safety bench passed; four golden fixtures remain at `-14.00 LUFS`.
- Final full and overwrite archives contain `683` entries each and pass compressed-data integrity checks.
- Change scope versus v1.6.43: `261` modified, `2` added, `0` deleted files.

# Handoff - v1.6.43

- Build: `google-auth-trusted-types-csp-recovery`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep strict Trusted Types enforcement enabled.
- Load `src/security/trusted-types-bootstrap.js` before Firebase initialization.
- Keep the default policy allowlist limited to the exact Firebase Auth gapi loader, existing reCAPTCHA loaders, and controlled same-origin script directories.
- Keep the document CSP and Firebase Hosting response CSP synchronized.
- Spark deployments continue to use `npm run deploy:spark`.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.43`
- Build ID: `google-auth-trusted-types-csp-recovery`
- Asset version: `1.6.43-google-auth-trusted-types-csp-recovery`
- Service worker cache: `foxbear-shell-v1.6.43-google-auth-trusted-types-csp-recovery`
- Configured static/regression target: 388 checks.
- Final configured checks: `388/388`; static release gate, browser preflight, and Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Command-line Chromium did not complete startup in this sandbox; real Firebase production Google login remains an external environment gate.
- Engine balanced fixture: approximately `1.93x` realtime; four golden fixtures remain at `-14.00 LUFS`.
- Final full and overwrite archives contain `681` entries each and pass compressed-data integrity checks.
- Change scope versus v1.6.42: `262` modified, `3` added, `0` deleted files.

# Handoff - v1.6.42

- Build: `spark-google-admin-auth`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Administrator access uses Firebase Google Authentication and an active matching `siteAdmins/{UID}` document.
- Do not restore the retired shared PIN, Secret Manager administrator secret, or administrator unlock Callable Function.
- Spark deployments must use `npm run deploy:spark`; Blaze-only incident mail Functions remain optional and separate.
- Keep the verified Google provider/email checks in Firestore Rules together with the Settings entry and UID handoff.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.42`
- Build ID: `spark-google-admin-auth`
- Asset version: `1.6.42-spark-google-admin-auth`
- Service worker cache: `foxbear-shell-v1.6.42-spark-google-admin-auth`
- Configured static/regression target: 386 checks.
- Final configured checks: `386/386`; static release gate, browser preflight, and Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Installed Playwright/Chromium and real Firebase production login remain external environment gates.
- Engine balanced fixture: approximately `1.89x` realtime; four golden fixtures remain at `-14.00 LUFS`.
- Final full and overwrite archives contain `678` entries each and pass compressed-data integrity checks.
- Change scope from the v1.6.42 PIN draft: `262` modified, `2` added, `4` deleted files.

# Handoff - v1.6.40

- Build: `ui-shell-retry-replacement-settlement`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep failed original resources and replacement candidates evaluated together.
- A post-load replacement must remain pending until its own load event or the bounded retry deadline.
- Critical replacement insertion must be observed automatically; callers should not need a manual recovery trigger.
- Keep the recovery surface active while replacement settlement is unresolved.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.40`
- Build ID: `ui-shell-retry-replacement-settlement`
- Asset version: `1.6.40-ui-shell-retry-replacement-settlement`
- Service worker cache: `foxbear-shell-v1.6.40-ui-shell-retry-replacement-settlement`
- Configured static/regression target: 384 checks.
- Final configured checks: `384/384`; browser preflight and Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Installed Playwright/Chromium execution remains an external environment gate.
- Final full and overwrite archives contain `675` entries each and pass archive verification.

# Handoff - v1.6.39

- Build: `ui-shell-partial-script-probe-isolation`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep critical-script failure reporting together with the static UI shell recovery path.
- Probe responses carrying an expired request ID must never repopulate service-worker client state.
- A client that disappears during collection must be removed from the expected probe set before cache retirement is evaluated.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.39`
- Build ID: `ui-shell-partial-script-probe-isolation`
- Asset version: `1.6.39-ui-shell-partial-script-probe-isolation`
- Service worker cache: `foxbear-shell-v1.6.39-ui-shell-partial-script-probe-isolation`
- Configured static/regression target: 383 checks.
- Final configured checks: `383/383`; browser preflight and Functions syntax passed.
- Dependency health: 0 errors and 5 expected missing-install warnings.
- Installed Playwright/Chromium execution remains an external environment gate.
- Final full and overwrite archives contain `673` entries each and pass archive verification.

# Handoff - v1.6.38

- Build: `ui-shell-runtime-health-cache-retirement`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep pending-style classification, Runtime Health notice deduplication, and client shell reporting together.
- Never retire the latest rollback cache, and retain both recent generations when any controlled client does not answer the shell probe.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.38`
- Build ID: `ui-shell-runtime-health-cache-retirement`
- Asset version: `1.6.38-ui-shell-runtime-health-cache-retirement`
- Service worker cache: `foxbear-shell-v1.6.38-ui-shell-runtime-health-cache-retirement`
- Configured static/regression target: 381 checks.
- Final configured checks: `381/381`; browser preflight and Functions syntax passed.
- Installed Playwright/Chromium execution remains an external environment gate.
- Final full and overwrite archives contain `670` entries each and pass archive verification.

# Handoff - v1.6.37

- Build: `ui-shell-cross-generation-recovery`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep exact stale-generation cache matching together with retention of the two newest legacy shells.
- Keep `ui-shell-recovery-service.js` and its fallback CSS loaded before the main UI stack.
- Required result structure remains stored in `DELIVERY_RULES.md`.

## Current release

- Product version: `1.6.37`
- Build ID: `ui-shell-cross-generation-recovery`
- Asset version: `1.6.37-ui-shell-cross-generation-recovery`
- Service worker cache: `foxbear-shell-v1.6.37-ui-shell-cross-generation-recovery`
- Configured static/regression target: 380 checks.
- Final configured checks: `380/380`; browser preflight and Functions syntax passed.

# Handoff - v1.6.36

- Build: `sw-activation-generation-fencing-resource-stress`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Keep activation token and generation checks together with the 80 ms claim settlement.
- Keep BFCache controller reconciliation and duplicate controllerchange suppression together.
- Required result structure remains stored in `DELIVERY_RULES.md`.
- Final configured checks: `378/378`; installed-browser execution remains an external gate.

## Current release

- Product version: `1.6.36`
- Build ID: `sw-activation-generation-fencing-resource-stress`
- Asset version: `1.6.36-sw-activation-generation-fencing-resource-stress`
- Service worker cache: `foxbear-shell-v1.6.36-sw-activation-generation-fencing-resource-stress`
- Configured static/regression target: 378 checks.

# Handoff - v1.6.35

- Build: `history-terminal-race-sw-activation-lease`.
- Apply the overwrite ZIP at repository root or use the full release ZIP.
- Key changes: terminal history boundary grace, non-BFCache release reset, single-owner service-worker activation lease, activation timeout recovery, same-URL download assist preservation, and AudioContext lifecycle stress.
- Required result structure remains stored in `DELIVERY_RULES.md`.

# Handoff - v1.6.34


## v1.6.34 update

- Terminal overlay history hard-stall recovery after 30 seconds without duplicate traversal.
- BFCache-safe service-worker activity heartbeat/channel pause and resume.
- Idempotent service-worker registration observers and expanded anonymous diagnostics.
- Configured cumulative static/behavioral target: 374 checks.

## Mandatory result format

1. 작업한 내역
2. 다운로드 가능한 전체 프로젝트 ZIP과 붙여넣기용 변경분 패치 ZIP
3. 다음 예정 내역

상세 규칙은 `DELIVERY_RULES.md`를 단일 기준으로 사용하며 패키지 검증에서 필수 확인한다.

## Current release

- Product version: `1.6.35`
- Build ID: `history-terminal-race-sw-activation-lease`
- Asset version: `1.6.35-history-terminal-race-sw-activation-lease`
- Service worker cache: `foxbear-shell-v1.6.35-history-terminal-race-sw-activation-lease`
- Configured static/regression target: 376 checks.

## v1.6.33 handoff

- The watchdog may settle only the exact expected base generation after an omitted `popstate`.
- Do not add an automatic second Back while the same sentinel remains current.
- Keep pending delayed generations bounded to eight and expired after 30 seconds.
- Keep watchdog and history diagnostics metadata-only.
- Regression: `node qa/v1633_overlay_history_watchdog_recovery_smoke.js`.
- Installed browser, mobile/PWA navigation, production Firebase/App Check, and real Gmail receipt remain external gates.

# Handoff - v1.6.32

## Mandatory result format

1. 작업한 내역
2. 다운로드 가능한 전체 프로젝트 ZIP과 붙여넣기용 변경분 패치 ZIP
3. 다음 예정 내역

상세 규칙은 `DELIVERY_RULES.md`를 단일 기준으로 사용하며 패키지 검증에서 필수 확인한다.

## Current release

- Product version: `1.6.32`
- Build ID: `overlay-history-generation-bfcache-recovery`
- Asset version: `1.6.32-overlay-history-generation-bfcache-recovery`
- Service worker cache: `foxbear-shell-v1.6.32-overlay-history-generation-bfcache-recovery`
- Configured static/regression target: 372 checks.

## v1.6.32 handoff

- Keep overlay base and sentinel generation markers paired; do not return to a release-wide boolean classifier in modern browsers.
- The exit guard must call `isInternalHistoryReleaseEvent(event)` before deciding that a popstate is programmatic.
- A mismatched generation is a genuine navigation candidate and must continue to the overlay-close or workspace-exit path.
- BFCache reconciliation must not push another exit guard when the current state is already an exit guard or overlay sentinel.
- Legacy pushState-only environments may use the bounded compatibility path, but production browsers should retain generation fencing.
- Regression: `node qa/v1632_overlay_history_generation_bfcache_recovery_smoke.js`.
- Installed Android/iOS/PWA gesture behavior remains an external release gate.

## v1.6.30 handoff

- Keep the exit guard installed before or after the modal listener without changing behavior.
- Internal `history.back()` used to remove an overlay sentinel must never open the workspace exit confirmation.
- A popstate with no open overlay and no release in flight must remain a genuine navigation event.
- Do not restore unconditional `foxbearOverlayHandled` marking at the top of the modal popstate listener.
- Regression: `node qa/v1630_overlay_history_release_false_exit_prompt_smoke.js`.
- Installed Chromium and mobile/PWA real-device navigation remain external release gates.

# Handoff - v1.6.29

## Mandatory result format

1. 작업한 내역
2. 다운로드 가능한 전체 프로젝트 ZIP과 붙여넣기용 변경분 패치 ZIP
3. 다음 예정 내역

상세 규칙은 `DELIVERY_RULES.md`를 단일 기준으로 사용하며 패키지 검증에서 필수 확인한다.

## Current release

- Product version: `1.6.29`
- Build ID: `incident-submission-fencing-adaptive-polling`
- Asset version: `1.6.29-incident-submission-fencing-adaptive-polling`
- Service worker cache: `foxbear-shell-v1.6.29-incident-submission-fencing-adaptive-polling`
- Configured static/regression target: 369 checks.

## v1.6.29 handoff

- Keep stable occurrence identity in `incident-submission-identity-service.js`; delayed recovery must never derive a new report ID from the retry clock.
- Queue delivery may commit only while the original token and lease generation still match. A generation replacement is immediate ownership loss.
- Keep fallback synchronization adaptive: active queues use the fast cadence, empty visible tabs use idle cadence, and hidden tabs use the slow cadence.
- Keep primary settings-control DOM rendering and one-time binding inside `incident-controls-view-service.js`.
- Submission and ownership diagnostics remain metadata-only and must not contain report text, stack traces, audio, filenames, credentials, network identity, or location.
- Regression: `node qa/v1629_incident_submission_fencing_adaptive_polling_smoke.js`.
- Production Firebase/App Check/Gmail, installed Chromium, and Safari/iOS lifecycle behavior remain external release gates.

# Handoff - v1.6.28

## Mandatory result format

1. 작업한 내역
2. 다운로드 가능한 전체 프로젝트 ZIP과 붙여넣기용 변경분 패치 ZIP
3. 다음 예정 내역

상세 규칙은 `DELIVERY_RULES.md`를 단일 기준으로 사용하며 패키지 검증에서 필수 확인한다.

## Current release

- Product version: `1.6.28`
- Build ID: `incident-lease-takeover-fallback-ui-safety`
- Asset version: `1.6.28-incident-lease-takeover-fallback-ui-safety`
- Service worker cache: `foxbear-shell-v1.6.28-incident-lease-takeover-fallback-ui-safety`
- Configured static/regression target: 366 checks.

## v1.6.28 handoff

- Keep crash takeover, lease renewal, lifecycle release, polling fallback, and cross-tab ownership inside `incident-queue-coordination-service.js`.
- A renewal write failure is ownership loss; do not allow delivery to continue after the shared signal aborts.
- BFCache pagehide must release the lease without disposing the queue, and pageshow must reconcile shards and tombstones.
- Keep service diagnostic DOM rendering, queue coordination text, and incident status event dispatch inside `incident-diagnostics-view-service.js`.
- Fallback diagnostics may include counts and synchronization mode only; never report text, tab IDs, audio, filenames, credentials, network identity, or location.
- Regression: `node qa/v1628_incident_lease_takeover_fallback_ui_smoke.js`.
- Production Firebase/App Check/Gmail, installed Chromium, and Safari/iOS WebView lifecycle behavior remain external release gates.

# Handoff - v1.6.27

## Mandatory result format

1. 작업한 내역
2. 다운로드 가능한 전체 프로젝트 ZIP과 붙여넣기용 변경분 패치 ZIP
3. 다음 예정 내역

상세 규칙은 `DELIVERY_RULES.md`를 단일 기준으로 사용하며 패키지 검증에서 필수 확인한다.

## Current release

- Product version: `1.6.27`
- Build ID: `incident-multitab-queue-ownership-safety`
- Asset version: `1.6.27-incident-multitab-queue-ownership-safety`
- Service worker cache: `foxbear-shell-v1.6.27-incident-multitab-queue-ownership-safety`
- Configured static/regression target: 364 checks.

## v1.6.27 handoff

- Keep cross-tab shard discovery, exact delivery tombstones, queue-change broadcasting, and flush ownership inside `src/boot/incident-queue-coordination-service.js`.
- Every tab writes only its own shard. Do not restore one shared read-modify-write queue path.
- Queue recovery must acquire Web Locks or the verified lease fallback before the first network delivery and re-check ownership around every submission.
- Delivered occurrences use fingerprint plus client timestamp; do not replace this with a permanent fingerprint-only tombstone.
- Cross-tab diagnostics remain metadata-only and must never contain report text, stack traces, audio, filenames, credentials, IP, SSID, or location.
- Regression: `node qa/v1627_incident_multitab_queue_ownership_stress_smoke.js`.
- Production Firebase/App Check/Gmail, installed Chromium, and real-device multi-tab lifecycle behavior remain external release gates.

## v1.6.26 handoff

- Keep local report storage, bounds, quota fallback, and conflict-safe flush commits inside `src/boot/incident-local-queue-service.js`.
- Never restore a stale flush snapshot over the current queue; remove only fingerprints confirmed delivered.
- Keep service failure classification and diagnostic row text/tone generation inside `src/boot/incident-service-diagnostics.js`.
- Queue health diagnostics may include counts, byte limits, and error counters only; never include report text, stacks, audio, filenames, tokens, Secrets, or paths.
- Regression: `node qa/v1626_incident_diagnostics_queue_conflict_safety_smoke.js`.
- Production Firebase/App Check/Gmail, installed Chromium, and real-device lifecycle behavior remain external release gates.

## v1.6.25 handoff

- Keep retry timers, retry budget, active task ownership, deadlines, and abort signals inside `src/boot/incident-service-recovery-controller.js`.
- Do not schedule the next retry until the previous active Promise has released ownership.
- Offline waiting and hidden-surface suspension must not consume retry attempts.
- Reporter service, queue, and deployment callbacks must preserve AbortSignal checks before state mutation.
- Timeout, abort, and slow-phase diagnostics remain metadata-only and must not include report contents, audio, filenames, tokens, or paths.
- Regression: `node qa/v1625_incident_recovery_timeout_abort_stress_smoke.js`.
- Production Firebase/App Check/Gmail, installed Chromium, and real-device lifecycle behavior remain external release gates.

# Handoff - v1.6.17

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

`다운로드 파일 2종`에는 반드시 다운로드 가능한 `전체 프로젝트 통파일 ZIP`과 저장소 루트에 그대로 붙여넣어 덮어쓸 수 있는 `변경분 패치 ZIP`을 함께 제공한다. 검증 결과와 제한 사항은 `작업한 내역` 안에 포함한다.

## v1.6.17 current focus

- Incident storage, sanitization, hashing, browser classification, version comparison, and local transport metrics live in `src/boot/incident-support-service.js`.
- Incident failure classification and recovery action policy live in `src/boot/incident-recovery-policy.js`.
- The main reporter records privacy-safe outcomes for Callable, Hosting rewrite, Firestore compatibility, service checks, report submission, and local queue recovery.
- The settings dialog shows route success ratios, fallback success count, recovered queue count, remaining queue count, and the latest metadata-only outcome.
- Metrics are local-only, redact emails/tokens/paths, fail safely on corrupt storage, and can be cleared without deleting queued reports or reporting preferences.
- Regression: `node qa/v1617_incident_transport_metrics_module_split_smoke.js`.
- Configured cumulative static/regression target: 345 checks before installed-browser and production Firebase confirmation.

# Handoff - v1.6.16

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

`다운로드 파일 2종`에는 반드시 다운로드 가능한 `전체 프로젝트 통파일 ZIP`과 저장소 루트에 그대로 붙여넣어 덮어쓸 수 있는 `변경분 패치 ZIP`을 함께 제공한다. 검증 결과와 제한 사항은 `작업한 내역` 안에 포함한다.

## v1.6.16 current focus

- Incident status, submit, delivery-status, and readiness calls have same-origin Firebase Hosting rewrite routes.
- The Firebase Callable SDK remains primary; only network/unavailable failures activate the authenticated Hosting rewrite fallback.
- Same-origin calls preserve the Firebase ID token and App Check token when available and keep the standard Callable `{ data }` protocol envelope.
- Failure-specific one-line recovery buttons route users to retry, automatic recovery, deployment verification, deploy-command copy, diagnostic copy, or mail-test actions.
- External nested overlays identify their parent layer, suspend parent input, restore it after close, and expose explicit close callbacks.
- One browser-history sentinel closes the top blocking overlay on mobile Back; nested parents stay open and receive control again.
- One browser-history sentinel closes the top blocking overlay on mobile Back; nested parents stay open and receive control again.
- Overlay-consumed `popstate` events are marked so the existing unsaved-work exit guard cannot also prompt or navigate on the same Back action.
- Simple hover-only tooltips remain outside the blocking overlay manager by design.
- Regression: `node qa/v1616_same_origin_incident_overlay_navigation_smoke.js`.
- Configured cumulative static/regression target: 342 checks before installed-browser and production Firebase confirmation.

# Handoff - v1.6.15

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

`다운로드 파일 2종`에는 반드시 다운로드 가능한 `전체 프로젝트 통파일 ZIP`과 저장소 루트에 그대로 붙여넣어 덮어쓸 수 있는 `변경분 패치 ZIP`을 함께 제공한다. 검증 결과와 제한 사항은 `작업한 내역` 안에 포함한다.

## v1.6.15 current focus

- Secondary dialogs and floating panels opened from an active popup use a shared fixed overlay stack when nesting is appropriate.
- Parent dialogs remain mounted but inert, child layers stay inside the visual viewport, and focus/scroll ownership returns on close.
- AI recommendation, select popup, download dialog, and download assistance paths use the common layer manager; the existing download quality menu remains a viewport-fixed portal inside that dialog flow.
- Incident endpoint probing separates offline, true network failure, CORS-unreadable reachability, missing deployment, and server-internal failure.
- Transient incident failures receive bounded 5/15/45-second recovery attempts; returning online retries the local anonymous queue.
- Manual recovery and sanitized diagnostic-copy actions do not include audio, filenames, full local paths, or report payloads.
- Regression: `node qa/v1615_nested_overlay_stack_smoke.js` and `node qa/v1615_incident_auto_recovery_smoke.js`.
- Configured cumulative static/regression target: 341 checks before installed-browser and production Firebase confirmation.

# Handoff - v1.6.14

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

`다운로드 파일 2종`에는 반드시 다운로드 가능한 `전체 프로젝트 통파일 ZIP`과 저장소 루트에 그대로 붙여넣어 덮어쓸 수 있는 `변경분 패치 ZIP`을 함께 제공한다. 검증 결과와 제한 사항은 `작업한 내역` 안에 포함한다.

## v1.6.14 current focus

- The MP3/WAV quality menu is a fixed portal outside the scrollable download sheet and is clamped to the active visual viewport.
- The menu automatically opens above or below, uses a viewport-limited maximum height, and scrolls internally on short screens.
- The mobile download sheet is limited to 96dvh and keeps all controls reachable through internal scrolling.
- Valid MP3/WAV quality preferences are remembered and alternate output sizes are estimated without changing the encoder or mastering DSP.
- Incident diagnostics show the exact `getIncidentServiceStatus` function, Functions endpoint, direct reachability, exact CSP result, and App Check mode independently.
- A reachable `functions/internal` error is server-internal; only CSP or direct network evidence becomes `FOXBEAR_INCIDENT_CALLABLE_NETWORK_BLOCKED`.
- Regression: `node qa/v1614_download_quality_memory_size_position_smoke.js` and `node qa/v1614_incident_callable_endpoint_diagnostics_smoke.js`.
- Configured cumulative static/regression target: 339 checks before installed-browser and production Firebase confirmation.

# Handoff - v1.6.13

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

`다운로드 파일 2종`에는 반드시 다운로드 가능한 `전체 프로젝트 통파일 ZIP`과 저장소 루트에 그대로 붙여넣어 덮어쓸 수 있는 `변경분 패치 ZIP`을 함께 제공한다. 검증 결과와 제한 사항은 `작업한 내역` 안에 포함한다.

## v1.6.13 current focus

- The mastered-file download sheet permanently shows only the MP3 and WAV family buttons.
- Clicking either family opens a context-style vertical quality menu anchored to that button.
- MP3 keeps 128/192/256/320 kbps; WAV keeps 16-bit PCM, 24-bit PCM, and 32-bit Float.
- Selection closes the menu, updates the summary, and preserves all existing download/share/recovery actions.
- Keyboard users can open with Arrow Down, move with Arrow keys/Home/End, close with Escape, and return focus to the family button.
- Regression: `node qa/v1613_download_format_context_menu_smoke.js`.
- Configured cumulative static/regression target: 337 checks before installed-browser confirmation.

# Handoff - v1.6.12

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

`다운로드 파일 2종`에는 반드시 다운로드 가능한 `전체 프로젝트 통파일 ZIP`과 저장소 루트에 그대로 붙여넣어 덮어쓸 수 있는 `변경분 패치 ZIP`을 함께 제공한다. 검증 결과와 제한 사항은 `작업한 내역` 안에 포함한다.

## v1.6.12 current focus

- Finalizer tone dynamics use dedicated mono/stereo loops instead of generic channel loops and per-sample scratch objects.
- K-weighted loudness stores one per-sample channel-power value and reuses it for integrated and short-term calculations.
- Input inspection now sanitizes in the same pass; final DC correction and safety sanitization are also fused.
- The main-thread finalizer fallback shares the same final loudness measurement rather than filtering twice.
- Same-input v1.6.11/v1.6.12 comparisons preserve every output Float32 sample and final telemetry checked by the regression harness.
- Configured cumulative static/regression target: 336 checks before installed-browser confirmation.
- Local Node VM 1-second stereo stress comparisons showed roughly 10-21% lower processing time across measured runs; browser/device validation remains required.

## v1.6.11 current focus

- Exact-length channel buffers transferred into the finalizer Worker are processed in place instead of copied again.
- Pre-limiter peak reuses the existing pre-gain True Peak measurement through constant-gain scaling.
- Final integrated and short-term loudness share one K-weighted filter pass.
- The already verified post-safety peak is reused as the final peak instead of running another 4x FIR scan.
- A same-input v1.6.10/v1.6.11 comparison produced zero output-sample differences and identical final LUFS/True Peak metrics.
- Local 3-second stereo synthetic benchmark median improved from about 8.34 seconds to 4.98 seconds; actual browser gains vary by device.
- Historical v1.6.9/v1.6.10 regressions now validate the current build-ID format instead of pinning a previous release ID.
- Regression: `node qa/v1611_mastering_speed_measurement_reuse_smoke.js`.

# Handoff - v1.6.10

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 작업한 내역
2. 다운로드 파일 2종
3. 다음 예정 내역

`다운로드 파일 2종`에는 반드시 다운로드 가능한 `전체 프로젝트 통파일 ZIP`과 저장소 루트에 그대로 붙여넣어 덮어쓸 수 있는 `변경분 패치 ZIP`을 함께 제공한다. 검증 결과와 제한 사항은 `작업한 내역` 안에 포함한다. 과거 문서의 `진행된 내용 / 배포 파일 2종 / 다음 패치 예정 라인업`은 이전 명칭으로만 유지한다.

## v1.6.10 current focus

- Partial or malformed deployment-readiness responses fail closed instead of trusting a top-level `ok: true`.
- Client and server validate every required Functions, Firestore, Gmail Secret, and SMTP check before treating cached readiness as healthy.
- CSP inspection compares normalized origins inside the actual `connect-src` directive and rejects substring lookalikes.
- Local cooldown reuse now updates the existing history row as a cached result without creating a duplicate.
- Corrupt local readiness history entries are filtered instead of breaking the incident settings dialog.
- Regression: `node qa/v1610_incident_readiness_contract_csp_cache_hardening_smoke.js`.
- All future patch reports use only the new persistent three-section contract above.

# Handoff - v1.6.9

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.6.9 current focus

- The latest three deployment readiness results are retained locally with normal/failure transitions and no mail content or Secret identifiers.
- Every failed CSP, Functions, Firestore, Gmail Secret, and SMTP card exposes a privacy-safe recovery copy action.
- Repeated cached checks update the same history entry instead of creating duplicates.
- Incident readiness and enabled-state changes emit a shared event and immediately refresh the Settings summary.
- Regression: `node qa/v1609_incident_readiness_history_recovery_copy_events_smoke.js`.
- All future patch reports continue to use only the persistent three-section contract above.

# Handoff - v1.6.8

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.6.8 current focus

- Deployment readiness checks are cached and rate-limited for 60 seconds so repeated UI actions do not repeatedly authenticate against Gmail SMTP.
- The last successful readiness timestamp remains visible even when a later check reports a problem.
- Every failed readiness card shows the exact recovery location or deploy action without exposing Firebase Secret values or identifiers.
- The Settings entry summarizes incident mail health as normal, needs attention, connected, unchecked, or disabled.
- Regression: `node qa/v1608_incident_readiness_recovery_summary_rate_limit_smoke.js`.
- All future patch reports continue to use only the persistent three-section contract above.

# Handoff - v1.6.7

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.6.7 current focus

- Incident deployment readiness checks web CSP, Callable Functions, Firestore, Gmail Secret format, and SMTP connectivity.
- Pending and failed manual test history synchronizes with server delivery state so automatic retries update in place.
- Direct retry cooldown uses the server-provided available timestamp and displays a live seconds countdown.
- Multi-track mastering HUD shows performance danger cause and stable-normal recovery confirmation progress.
- Regression: `node qa/v1607_incident_readiness_history_sync_performance_hud_smoke.js`.
- All future patch reports continue to use only the persistent three-section contract above.

# Handoff - v1.6.6

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.6.6 current focus

- Mail-test history exposes SMTP attempt count, direct retry usage, and the remaining automatic retry interval.
- `retryOwnIncidentReport` accepts only the authenticated user's non-terminal failed manual tests, with a two-retry limit and 60-second cooldown.
- The client never retries another user's, automatic, delivered, pending, or dead-letter report.
- Confirmed performance danger auto-pauses multi-track mastering before the next track; only stable normal health auto-resumes auto-paused work.
- Regression: `node qa/v1606_mail_retry_safe_batch_autopause_smoke.js`.
- All future patch reports continue to use only the persistent three-section contract above.

# Handoff - v1.6.5

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.6.5 current focus

- Incident settings provides server recheck and deploy-command copy controls.
- The latest five manual mail-test outcomes are stored locally with a user clear action and no audio or filename data.
- SMTP errors distinguish invalid Secret, Gmail authentication, recipient rejection, quota/rate limiting, and network failure.
- Delivery status preserves normalized reason, raw provider code, and the next retry timestamp.
- Incident service metadata schema v3 reports the Gmail provider and Secret credential mode.
- Regression: `node qa/v1605_incident_mail_recovery_history_smoke.js`.
- All future patch reports continue to use only the persistent three-section contract above.

# Handoff - v1.6.4

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.6.4 current focus

- The exact `asia-northeast3` Firebase Callable origin is present in both the HTML meta CSP and Firebase Hosting response CSP.
- `npm run deploy:incident` deploys Hosting, Firestore rules/indexes, and the complete incident Functions stack together so CSP and server functions cannot drift independently.
- Callable transport failures distinguish deployment missing, CSP/network blocking, unavailable SDK, internal Functions failure, authentication failure, and permission denial.
- The incident UI shows the raw diagnostic code plus the callable endpoint and an actionable recovery instruction.
- Incident service metadata schema v2 returns the canonical callable origin for web/server deployment comparison.
- Regression: `node qa/v1604_incident_callable_csp_recovery_smoke.js`.
- All future patch reports continue to use only the persistent three-section contract above.

# Handoff - v1.6.3

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.6.3 current focus

- Ambient watch and danger state requires two consecutive samples before it changes the visible settings indicator.
- Settings shows the current health level and a concise actionable reason without opening the full diagnostics modal.
- Acknowledging the same danger condition suppresses the full notice for 30 minutes across reloads while the settings badge remains visible.
- A different danger condition is not suppressed by the previous acknowledgement.
- The health notice reserves the visible toast stack height to avoid mobile overlap.
- Regression: `node qa/v1603_health_acknowledgement_settings_summary_smoke.js`.
- All future patch reports continue to use only the persistent three-section contract above.

# Handoff - v1.6.2

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.6.2 current focus

- Normal importing, decoding, mastering, render updates, and automatic wake lock are activity states rather than performance warnings.
- Long-task and decode-failure warnings expire after their active diagnostic windows instead of remaining forever.
- Normal health leaves the settings control visually clean; watch/danger uses a small status badge without opening a modal.
- A compact danger notice appears only after two consecutive danger samples and disappears after two recovered samples.
- The full diagnostics panel hides empty recommendations, empty Worker history, and unavailable recovery controls.
- Regression: `node qa/v1602_nonblocking_health_design_polish_smoke.js`.
- All future patch reports continue to use only the persistent three-section contract above.

# Handoff - v1.6.1

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.6.1 current focus

- Memory/performance diagnostics stays hidden during normal startup even if an older release persisted `foxbear-perf-diagnostics=on`.
- Opening diagnostics from Settings or the keyboard is session-only and never persists a future startup popup.
- Explicit diagnostic URLs such as `?perf=1` may auto-open, but close after two healthy runtime samples once boot stabilization is complete.
- User interaction with an automatically opened panel converts it to manual mode and prevents unexpected auto-dismiss.
- Regression: `node qa/v1601_transient_performance_diagnostics_smoke.js`.
- All future patch reports continue to use only the persistent three-section contract above.

# Handoff - v1.6.0

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.6.0 current focus

- Incident mail testing exposes authentication, callable API, queue, and SMTP acceptance as separate stages.
- `getIncidentServiceStatus` reports deployed server version, region, service schema, and App Check monitor state.
- The client warns when the deployed Functions version is older than the web release.
- App Check stays optional/monitor-only until the production key and token flow are verified.
- Regression: `node qa/v1600_incident_mail_pipeline_health_smoke.js`.
- All future patch reports continue to use only the persistent three-section contract above.

# Handoff - v1.5.99

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.5.99 current focus

- The primary upload notice stays lightweight and asks users only to load one or more mastering files; codec validation remains internal.
- Incident creation and delivery-status lookup use authenticated callable Functions first, with the historical create-first Firestore path retained only as a compatibility fallback.
- `npm run deploy:incident` must include `submitIncidentReport` and `getIncidentDeliveryStatus` so stale client rules cannot block the real mail test.
- Regression: `node qa/v1599_import_copy_callable_mail_recovery_smoke.js`.
- All future patch reports continue to use only the persistent three-section contract above.

# Handoff - v1.5.98

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.5.98 current focus

- Stalled Worker cancellation may be followed by a safe high-level retry only for analysis, mastering, and master-preview work that can be rebuilt from the retained track source.
- Raw transferred buffers are never reused; ZIP and general export jobs remain manual to avoid duplicate saves.
- Performance diagnostics lists each active/recent Worker with progress, stage, no-progress age, transfer bytes, and normal/watch/danger health.
- Regression: `node qa/v1598_worker_safe_retry_health_resource_stress_smoke.js`.
- Thirty-track cleanup must revoke 90 track URLs, abort 60 track-owned operations, close 30 AudioContexts, and leave Worker transfer accounting at zero.
- All future patch reports continue to use only the persistent three-section contract above.

# Handoff - v1.5.97

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.5.97 current focus

- `FoxBearWorkerJobService.cancelJob()` cancels one active run or logical job by ID; `cancelStalledJobs()` cancels only jobs beyond the published 15-second no-progress threshold.
- Performance diagnostics enables its recovery button only when cancellable stalled jobs exist and asks for confirmation before discarding in-flight work.
- The primary diagnostic view uses plain-language Korean recommendations; raw warning codes remain available only in the technical log.
- Regression: `node qa/v1597_worker_recovery_guidance_stress_smoke.js`.
- Thirty sequential Worker jobs and a stalled manual recovery must leave active count, stalled count, and active transfer bytes at zero.
- All future patch reports continue to use only the persistent three-section contract above.

# Handoff - v1.5.96

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 제한 사항과 검증 결과는 `진행된 내용` 안에 짧게 포함한다.

## v1.5.96 current focus

- Every primary modal remembers its real opener, traps Tab focus, restores focus on Escape/backdrop/close-button dismissal, and shares one layered mobile scroll lock.
- Program information and incident reporting are registered in the common modal state machine.
- Performance diagnostics uses readable health cards while preserving the raw technical snapshot under an expandable section.
- Performance diagnostics refreshes every 2.5 seconds while visible and returns focus to the settings button.
- Regression: `node qa/v1596_modal_focus_memory_diagnostics_smoke.js`.
- All future patch reports continue to use only the persistent three-section contract above.

## v1.5.95 current focus

- Keep the version/about popup focused on a clear product explanation: smart analysis, quality protection, A/B preview, batch workflow, safe export, and local audio privacy. Incident reporting and memory diagnostics belong in the header settings panel.
- Every popup uses the compact shared close-control geometry and supports Escape plus outside-click dismissal. The modal controller provides a generic role-dialog backdrop fallback unless an in-flight destructive/export action explicitly opts out.
- Incident report creation must happen before duplicate lookup so owner-only Firestore reads never target a missing document.
- Real mail testing is single-flight, exposes `aria-busy`, and gives actionable permission diagnostics.
- Regression: `node qa/v1595_popup_settings_mail_test_recovery_smoke.js`.
- All future patch reports use only the persistent three-section contract above.

# Handoff - v1.5.94

# 필수 결과 보고 형식

앞으로 사용자가 별도 형식을 명시하지 않는 한 모든 패치 결과는 아래 세 구역만 사용한다. 제목과 순서를 유지하고 추가 독립 구역을 만들지 않는다.

1. 진행된 내용
2. 배포 파일 2종
3. 다음 패치 예정 라인업

`배포 파일 2종`에는 반드시 `전체 프로젝트 릴리스 ZIP`과 `누적 덮어쓰기용 패치 ZIP`을 함께 제공한다. 체크섬, 제한 사항, 검증 결과, OpenAI 관련 참고 내용이 필요하면 별도 구역을 만들지 않고 `진행된 내용` 안에 짧게 포함한다.

## v1.5.94 current focus

- AIFF native decode cancellation and timeout must never enter the synchronous PCM fallback.
- Large AIFF fallback workloads above the guarded channel-sample budget must fail with `FOXBEAR_AIFF_FALLBACK_TOO_LARGE` instead of blocking the UI thread.
- Worker recent diagnostics preserve timeout, cancellation, and failure code/reason plus last-progress age.
- Regression: `node qa/v1594_aiff_worker_reporting_contract_smoke.js`.
- All future patch reports must use only the persistent three-section contract defined above.

# Handoff - v1.5.93

## v1.5.93 current focus

- Optional external pitch engines must receive and honor the current `AbortSignal`; cancelled output must never be committed.
- Worker diagnostics preserve transfer count/bytes, peak active transfer bytes, and 15-second no-progress stall classification.
- Administrator CSV exports must use the shared download service when available and must not revoke fallback Blob URLs before 60 seconds.
- Repeated export clicks are single-flight and expose `aria-busy` without re-enabling an empty filtered export.
- OpenAI API keys must remain server-side; the first recommended integration is a read-only structured mastering advisor using existing analysis JSON.
- Regression: `node qa/v1593_external_engine_worker_transfer_admin_export_smoke.js`.
- Report results as progress, release ZIP, overwrite ZIP, and next patch lineup.

# Handoff - v1.5.92

## v1.5.92 current focus

- `qa/run_all_checks.js` must clean Python bytecode before, between, and after configured checks.
- Every QA child process must inherit `PYTHONDONTWRITEBYTECODE=1`.
- Keep explicit `python3 -B` for project Python entry points as a second defense.
- Both Pages workflows use `actions/cache@v5`, `actions/cache/restore@v5`, and `actions/cache/save@v5`.
- Regression: `node qa/v1592_python_bytecode_ci_hygiene_smoke.js`.
- Report results as progress, release ZIP, overwrite ZIP, and next patch lineup.

# Handoff - v1.5.91

## v1.5.91 current focus

- Mastering cancellation must be passed to decode, emergency analysis, pitch/BPM Worker processing, and master-preview conversion.
- Analysis and pitch workers must preserve `__foxbearJobId`, publish progress, and be terminated by the shared Worker job service on timeout or abort.
- Large analysis and pitch workloads must not execute synchronous main-thread fallback after Worker failure or on browsers without Worker support.
- Small-track compatibility fallback remains available, but user cancellation must never enter fallback or display a misleading failure toast.
- Master-preview PCM slicing uses `subarray()` into the destination channel to avoid an extra full segment allocation.
- Regression command: `node qa/v1591_cancellable_audio_pipeline_performance_smoke.js`.
- Static/regression verification: 312/312 PASS; installed Chromium remains the final browser confirmation.

# Handoff - v1.5.90

## v1.5.90 current focus

- Browser failed-only retry is fail-closed: every primary failure must produce a real passing retry result.
- Skipped, repeated, missing, malformed, or unavailable retry evidence blocks the Browser release gate.
- Generated release metadata is separated from functional changes before Browser impact selection.
- Metadata-only version/SRI/cache updates no longer force the complete Browser suite when a smaller mapped scope is sufficient.
- Flaky-history entries expire after 45 days, while current skipped retry outcomes remain unresolved P1 candidates.
- Static/regression target: 311 checks; installed Chromium remains the final end-to-end confirmation.

# Handoff - v1.5.89

## v1.5.89 current focus

- `npm run qa:browser` now runs `runtime-health-playwright.spec.js` first and starts heavier specs only after the sentinel passes.
- `npm run qa:browser:retry` continues to bypass the health-first split and uses Playwright `--last-failed` state directly.
- Shared CSS changes may use selector tokens from the Git diff; any missing or unmapped selector evidence must fall back to the complete suite.
- Impact mapping now covers Runtime Health details, PWA update/recovery, admin operations, quality reports, and comparison waveform code.
- Flaky history writes `qa/browser-results/flaky-issue-report.md` with unresolved cases prioritized over recurring retry recoveries.
- Regression command: `node qa/v1589_browser_health_first_selector_flaky_issues_smoke.js`.
- Static/regression verification: 309/309 PASS before packaging.

# Handoff - v1.5.88

## v1.5.88 current focus

- `node qa/browser/select-browser-scope.js` must remain dependency-light because GitHub Actions runs it before `npm ci` and Chromium installation.
- `skip` is allowed only for documentation, backend-only, packaging-only, and dependency-light static QA changes.
- Known production changes may select related specs; any core, unknown, truncated, or missing change set must fall back to the complete browser suite.
- Selected primary specs travel through `FOXBEAR_BROWSER_SPECS`; Playwright `--last-failed` retry must ignore that list.
- Retry recovery updates `qa/browser-history/flaky-history.json`, which is restored/saved through a branch-scoped Actions cache and excluded from packages.
- Regression command: `node qa/v1588_browser_impact_flaky_history_smoke.js`.
- Static/regression verification: 307/307 PASS before packaging.

# Handoff - v1.5.87

## v1.5.87 current focus

- Browser primary/retry evidence is compared and stored under `qa/browser-results/retry-recovery-summary.*`.
- GitHub Actions shows recovered flaky cases and repeated failures in the Job Summary.
- Runtime Health header and PWA recovery source contracts run in the dependency-light browser preflight.
- Static/regression target: 304 checks before packaging.

# Handoff - v1.5.86
## 필수 결과 보고 형식

앞으로 모든 작업 결과 보고는 아래 **세 구역만** 사용합니다. 사용자가 별도 형식을 요청하지 않는 한 추가 장문 보고, 별도 체크섬 구역, 반복 설명은 넣지 않습니다.

결과 보고 구역은 반드시 `진행된 내용`, `배포 파일 2종`, `다음 예상 내용` 순서로 작성합니다.

1. `진행된 내용`
2. `배포 파일 2종`
3. `다음 예상 내용`

배포 파일은 항상 전체 릴리스 ZIP과 누적 덮어쓰기 ZIP 두 종류를 함께 제공합니다. 확인하지 못한 실제 배포·메일 수신·브라우저 검증은 `진행된 내용`에 사실대로 제한 사항을 적습니다.

## v1.5.86 인수인계

- 브라우저 사전 검사는 `npm run qa:browser:preflight`로 실행하며 위험 sink와 production fixture 계약을 함께 검사합니다.
- GitHub Actions에서는 이 사전 검사를 Chromium 설치 전에 실행해야 합니다.
- 첫 Browser gate 실패 후 `npm run qa:browser:retry`를 실행하면 Playwright `--last-failed` 상태의 실패 케이스만 다시 실행합니다.
- 재실행에는 `qa/browser-results/artifacts/.last-run.json`이 필요하며, 상태가 없을 때 전체 테스트로 자동 대체하지 않습니다.
- 최초 결과는 `results-primary.json`, `static-server-primary.log`, `last-run-primary.json`으로 보존됩니다.
- 회귀 검사는 `node qa/v1586_browser_retry_fixture_contract_smoke.js`로 단독 실행할 수 있습니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.

## v1.5.85 인수인계

- 브라우저 시각 fixture는 `qa/browser/helpers/visual-fixture-builders.js`의 공통 빌더를 사용합니다.
- fixture 빌더는 Playwright `page.evaluate(builder, options)`로 직렬화되므로 모듈 외부 변수에 의존하지 않는 독립 함수여야 합니다.
- `node qa/browser/spec-preflight.js`는 Playwright 설치 전에도 실행되며 HTML 문자열 sink와 문자열 기반 evaluate 호출을 차단합니다.
- `qa/browser/run-browser-e2e.js`는 사전 검사를 Playwright CLI 확인보다 먼저 실행합니다.
- Browser gate 실패 시 `FoxBear likely root causes` 구역에서 그룹 코드·실패 수·수정 지침을 먼저 확인합니다.
- 회귀 검사는 `node qa/v1585_browser_fixture_preflight_diagnostics_smoke.js`로 단독 실행할 수 있습니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.

## v1.5.84 인수인계

- Trusted Types가 강제되는 페이지의 Playwright fixture에서는 `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`를 사용하지 않습니다.
- 대량 마스터링 행은 `document.createElement`와 `textContent`로 만들고 `list.replaceChildren(...rows)`로 한 번에 반영합니다.
- 모바일 다운로드 시트는 family, option, action 영역을 각각 DOM 요소로 만든 뒤 `sheet.append(...)`로 구성합니다.
- `qa/no_html_injection_smoke.js`는 애플리케이션 소스와 `qa/browser`를 함께 검사합니다.
- 회귀 검사는 `node qa/v1584_trusted_types_browser_qa_smoke.js`로 단독 실행할 수 있습니다.
- 실제 실패 확인은 Playwright와 Chromium이 설치된 환경에서 `npm run qa:browser`로 수행합니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.

## v1.5.83 인수인계

- Dock transport 저장 전 mounted audio의 `dataset.trackId`/`dataset.spectrumTrackId`가 대상 트랙과 일치하는지 확인합니다.
- 교차 전환에서 `data-bottom-preview-active="false"`인 이전 오디오 이벤트는 현재 active Dock 오디오로 MediaSession 동기화를 위임합니다.
- `FoxBearWorkerJobService.getDiagnostics()`는 활성 작업과 최근 완료·취소·실패 작업을 반환하며 모든 종료 경로에서 활성 레코드가 제거되어야 합니다.
- `releaseTrackResources()`는 마스터링과 마스터 미리듣기 AbortController를 모두 취소하고 작업 ID를 비웁니다.
- 회귀 검사는 `node qa/v1583_worker_dock_ownership_smoke.js`로 단독 실행할 수 있습니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.

## v1.5.82 인수인계

- 품질 게이트 자동 재렌더의 취소는 일반 복구 실패로 흡수하지 않고 최상위 `masterTrack`과 배치 오케스트레이터까지 전달합니다.
- 취소된 안전 재렌더는 첫 렌더의 설정·품질 리포트·파형·출력 메타데이터를 복원하고 운영 장애 신고를 생성하지 않습니다.
- `FoxBearPlaybackTransitionService`는 복귀 직후의 일시적 `AbortError`만 현재 재생 요청 소유권 아래에서 1회 재시도합니다.
- 새 재생·정지·소스 전환·오디오 제거로 요청 세대가 바뀌면 이전 실패는 재시도하지 않습니다.
- 회귀 검사는 `node qa/v1582_mastering_cancel_playback_resume_smoke.js`, `node qa/v1578_playback_transition_race_recovery_smoke.js`, `node qa/v1554_quality_recovery_profiles_browser_qa_smoke.js`로 단독 실행할 수 있습니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.

## v1.5.81 인수인계

- `FoxBearMasterPreviewJobService`가 하이라이트 생성의 작업 ID, AbortController, 트랙 소유권, 분리 여부를 관리합니다.
- 설정 변경, 큐 초기화, 트랙 제거, 자원 해제는 미리듣기 디코더·파이널라이저·WAV 워커에 같은 취소 신호를 전달합니다.
- 오래된 작업의 `catch/finally`는 현재 전역 busy·렌더링 ID·Dock 자동재생 상태를 변경하지 않아야 합니다.
- 저장 도움 패널이 닫히거나 교체되면 action generation을 증가시켜 늦은 네이티브 실패 토스트와 UI 복원을 무효화합니다.
- 회귀 검사는 `node qa/v1581_master_preview_job_ownership_smoke.js`와 `node qa/v1579_preview_download_ownership_smoke.js`로 단독 실행할 수 있습니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.

## v1.5.80 인수인계

- `FoxBearAudioContextManager.resume()`은 `suspended`뿐 아니라 WebKit `interrupted` 상태도 복구하며 동시 호출은 하나의 Promise를 공유합니다.
- `visibility-hidden` Dock transport는 12시간 lease를 사용하고 일반 전환 snapshot은 60초 안전 lease를 유지합니다.
- `visibilitychange`와 `pageshow`가 연속 발생해도 350ms 내 중복 Dock 복구는 건너뜁니다.
- 활성 트랙이 없으면 MediaSession 메타데이터·위치·액션 핸들러를 모두 지우며 액션 실행 시 현재 오디오를 다시 조회합니다.
- 저장 도움의 네이티브 작업 완료 후 실행 버튼으로 포커스를 되돌리고 작업 중 파일 열기 링크까지 잠급니다.
- 회귀 검사는 `node qa/v1580_mobile_return_media_focus_smoke.js`로 단독 실행할 수 있습니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.

## v1.5.79 인수인계

- 모든 미리듣기 오디오는 요청 세대 번호를 사용하며, UI 제거 시 `cancelPlaybackRequest`로 대기 중인 재생과 페이드를 무효화하고 일시정지합니다.
- 분리된 오디오에서 늦게 완료된 `play()`는 성공으로 처리하지 않고 즉시 정지합니다.
- 저장 도움의 공유/직접 저장 버튼은 단일 실행 잠금과 `aria-busy`를 사용해 연타 중복 호출을 막습니다.
- `pagehide.persisted === false`에서는 등록된 다운로드 Blob URL을 모두 회수하고, BFCache 이동에서는 재사용을 위해 유지합니다.
- 회귀 검사는 `node qa/v1579_preview_download_ownership_smoke.js`로 단독 실행할 수 있습니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.

## v1.5.78 인수인계

- 재생 페이드는 오디오별 컨트롤러를 보유하며 새 전환이 시작되면 이전 RAF를 취소하고 이전 Promise를 `false`로 즉시 종료합니다.
- 취소된 `pauseWithFadeOut`은 후속 `pause()`를 실행하지 않아 새 재생 요청을 뒤늦게 중단하지 않습니다.
- 취소된 `crossfadePair`는 오래된 완료 정리와 `onComplete`를 실행하지 않습니다.
- 회귀 검사는 `node qa/v1578_playback_transition_race_recovery_smoke.js`로 단독 실행할 수 있습니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.

## v1.5.76 인수인계

- `npm run version:sync`는 원본을 직접 순차 수정하지 않고 임시 스테이징 복사본에서 동기화·SRI·검증을 완료한 뒤 변경 파일만 반영합니다.
- `npm run version:dry-run`은 반영 예정 파일 목록을 출력하고 원본을 수정하지 않습니다.
- 루트와 Functions lockfile 버전은 `package.json`의 제품 버전에 맞춰 함께 동기화됩니다.
- `npm run dependencies:check`는 lockfile 계약 오류는 실패로, 미설치 Playwright·Chromium·Functions 패키지는 복구 명령이 필요한 경고로 구분합니다.
- 스테이징 또는 SRI 실행 실패 시 원본 `package.json`, `index.html`, `sw.js` 등은 변경되지 않아야 합니다.
- 실제 Chromium 화면 검증은 Playwright 및 Chromium 설치 환경에서 계속 수행합니다.
- 덮어쓰기 적용 후 `HANDOFF_PACKAGE.json.deletePaths`에 따라 `qa/__pycache__`, `tools/__pycache__`가 남아 있으면 삭제합니다.

## v1.5.74 인수인계

- `다음 곡 전 일시정지`는 현재 곡을 중단하지 않고 현재 곡 완료 후 다음 곡 시작 직전에 대기합니다. `계속 진행`으로 재개합니다.
- `현재 곡 건너뛰기`는 현재 곡의 워커·파이널라이저·인코더 신호만 취소하고 다음 대기 곡으로 이동합니다.
- 대기 곡의 위·아래 버튼은 아직 시작하지 않은 곡 사이에서만 순서를 변경하며 진행 중·완료 곡 앞으로는 이동하지 않습니다.
- 완료 요약은 완료·실패·건너뜀·취소·총 소요 시간·곡당 평균 시간을 표시합니다.
- 모바일 다운로드는 MP3/WAV를 먼저 선택하고 세부 품질을 선택하는 2단계 구조이며 저장·공유 버튼은 하단 고정 영역에 유지합니다.
- 모바일 하단 시트 높이, 안전 영역, 375px/430px 화면 넘침은 배포 후 실제 Chromium 또는 기기에서 최종 확인합니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.

## v1.5.73 인수인계

- 여러 곡 마스터링 중 `다중 작업 취소`를 누르면 현재 곡의 워커·인코더 신호를 안전하게 중단하고 아직 시작하지 않은 곡은 `취소` 결과로 보존합니다.
- 완료된 곡은 유지하며 `실패 곡 다시 실행`은 현재 배치의 실패 곡만 새 배치로 재시도합니다.
- 목록은 현재 곡 남은 시간, 완료 곡 소요 시간, 대기 곡별 완료 예상 시간을 표시하고 전체/현재 진행/완료/실패/취소/대기 필터를 지원합니다.
- 단일 곡 마스터링 HUD는 기존대로 유지하고, 다중 작업 제어는 대량 목록 HUD 안에서만 수행합니다.
- 실제 취소·재시도·ETA 정확도와 데스크톱·모바일 배치는 배포 후 브라우저에서 확인해야 합니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.


## v1.5.72 인수인계

- 2곡 이상 분석이 모두 끝나면 대량 분석 HUD를 자동 숨기고 메인 `전체 마스터링` 버튼 영역으로 스크롤·포커스 이동합니다.
- 여러 곡 마스터링 중에는 단일 처리 HUD를 사용하지 않고 대량 곡 목록에서 현재 곡·단계·진행률·완료·오류를 표시합니다.
- 단일 곡 재마스터링은 과거 대량 배치 소속을 제거하므로 단일 HUD가 정상 표시되어야 합니다.
- `24시간 초과 미확인 정리`는 테스트 기록을 삭제하지 않고 `confirmationStatus=dismissed`와 관리자 처리 시각을 기록합니다.
- `cleanupIncidentMailTestsRequest`, Firestore Rules, Indexes, Hosting을 같은 릴리스로 배포합니다.
- 감사 로그는 검색·상태 필터·커서 추가 조회·CSV 내보내기를 지원하고 모바일에서는 카드형 상세로 표시합니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.


## v1.5.71 인수인계

- 관리자 화면은 `현재 운영 상태 요약 → 복구·검증·수신 확인 작업 → 기간별 메일 통계·추세 → 상세 이력` 순서로 확인합니다.
- 복구, 시스템 검증, 받은편지함·스팸함 수신 확인 작업은 목적별 그룹을 유지하며 핵심 상태 카드는 상단에 우선 배치합니다.
- 메일 테스트 통계와 추세는 최근 7일·30일·90일·전체 범위를 지원하고 검색·CSV 내보내기에도 같은 기간 조건을 적용합니다.
- `nextVerificationDueAt`과 검증 경과일을 서버 상태로 기록하며 예정·임박·기한 초과 상태를 관리자 화면에 표시합니다.
- 모바일·태블릿에서는 카드와 작업 버튼이 겹치지 않아야 하며 추세 막대는 키보드 포커스와 시간·상태 접근성 이름을 유지합니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.


## v1.5.70 인수인계

- 15분 운영 점검은 실제 메일 테스트 미실행, 7일 이상 실수신 미검증, 최근 테스트 실패, SMTP 접수 후 30분 초과 미확인을 경보 원인으로 기록합니다.
- 수신 확인 누락은 마지막 성공적으로 확인된 테스트 이후의 미확인 테스트만 현재 장애로 집계해 오래된 이력이 영구 경고를 만들지 않도록 합니다.
- 관리자 화면은 최근 100건 기준 SMTP 성공률, 실수신 확인률, 받은편지함/스팸함 분포, 30분 초과 미확인 건수를 표시합니다.
- 메일 점검 마법사는 최근 실패 사유에 따라 Gmail 앱 비밀번호, KST 일일 한도, 수신자 거부, Gmail 필터, Functions 로그 점검 순서를 안내합니다.
- 실제 메일 테스트 이력은 제목, Message-ID, 보고서 ID, 테스트 ID, 상태로 검색할 수 있으며 현재 필터 결과만 UTF-8 CSV로 내보냅니다.
- 실제 Gmail 수신 여부는 자동으로 읽을 수 없으므로 받은편지함 또는 스팸함 도착 확인 후 관리자 확인 버튼을 눌러야 합니다.
- 결과 보고는 계속 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역만 사용합니다.


## v1.5.69 인수인계

- 실제 메일 테스트는 SMTP 접수 결과를 `incidentMailTestHistory`에 90일 보존하고 최신 상태를 `incidentOperations/mailVerification`에 기록합니다.
- Gmail에서 메일을 찾은 뒤 관리자 화면의 `받은편지함 수신 확인` 또는 `스팸함 수신 확인`으로 실수신 위치를 기록합니다.
- 실수신 확인이 없거나 마지막 확인 후 7일이 지나면 관리자 화면이 재검증 경고를 표시합니다.
- `confirmIncidentMailReceiptRequest`와 새 Firestore Rules를 Functions·Hosting과 같은 릴리스로 배포해야 합니다.
- 메일 HTML은 공통 브랜드 템플릿을 사용하지만 텍스트 본문도 함께 유지해 클라이언트 호환성을 보장합니다.
- 실제 받은편지함 수신은 배포 후 Gmail에서 직접 확인해야 하며 SMTP `emailed`만으로 최종 수신 완료로 간주하지 않습니다.


## v1.5.68 인수인계

- 모든 SMTP 메일의 표시 발신자명은 `AI마스터링 스튜디오`이며 실제 발송 계정은 Secret과 연결된 Gmail 계정입니다.
- 테스트 메일 제목은 `[AI마스터링 스튜디오][메일 테스트] 실제 발송 확인 · {테스트 ID}` 규칙을 사용합니다.
- 설정의 `실제 메일 테스트`는 오류가 없어도 Firestore→Functions→Gmail SMTP 운영 경로를 실행합니다.
- 화면의 `Gmail SMTP 접수 완료`는 수신자 승인 결과이며 받은편지함·스팸함 도착 위치는 Gmail에서 별도 확인해야 합니다.
- 실제 수신 검증 시 제목, SMTP 접수 시각, Message-ID를 기록하고 Gmail에서 `subject:"[AI마스터링 스튜디오][메일 테스트]"`로 검색합니다.


## v1.5.67 인수인계

- `incidentAdminAuditLog`는 관리자 작업의 시작·거부·완료·실패를 90일 TTL로 기록합니다. 웹훅 URL, Gmail Secret, 신고 원문은 기록하지 않습니다.
- 기본 웹훅은 일시 오류에 제한 재시도하며 실패하면 선택형 `FOXBEAR_INCIDENT_ALERT_WEBHOOK_FALLBACK_URL`로 전환합니다. 두 URL 모두 허용된 HTTPS 공급자 호스트만 사용할 수 있습니다.
- 관리자 운영 이력은 전체/위험/주의/정상 및 주요 원인 필터와 커서 기반 더 보기를 지원합니다.
- 배포 검증은 incidentReports 재시도·최종 실패 인덱스와 incidentOperationsHistory 상태·원인 인덱스를 실제 쿼리로 검사합니다.
- `verifyIncidentPostDeployHealth`를 포함해 Firestore Rules, Indexes, Functions, Hosting을 같은 버전으로 배포해야 합니다.
- 실제 웹훅 장애 전환, SMTP 수신, 인덱스 Enabled 상태는 Firebase 실배포 후 확인해야 합니다.


## v1.5.66 인수인계

- 관리자 단일 재전송은 10초, 일괄 복구는 2분, 보조 경보 테스트는 5분, 배포 검증은 10분 쿨다운을 서버에서 적용합니다.
- `incidentAdminActionState`는 서버 전용 임대 문서이며 클라이언트 읽기·쓰기를 허용하지 않습니다.
- 보조 경보 테스트는 실제 웹훅 메시지 1건을 전송합니다. URL은 문서나 UI에 노출하지 않습니다.
- 운영 이력에는 원인 코드와 권장 조치를 저장하며 관리자 화면에서 최근 48개 표본을 상세 조회합니다.
- 관리자 오류 화면은 `incidentOperations/deployment`가 없거나 24시간 이상 오래됐거나 화면/Functions 버전이 다르면 세션당 한 번 자동 검증을 요청합니다.
- 배포에는 `testIncidentAlertChannelRequest`, `verifyIncidentDeploymentRequest`, Firestore Rules, Hosting을 함께 포함해야 합니다.
- 실제 SMTP 인증·웹훅 수신·브라우저 자동 검증은 Firebase 배포 후 확인해야 합니다.


## v1.5.65 인수인계

- 선택형 HTTPS 웹훅은 Gmail SMTP와 독립된 운영 경보 채널이며 허용된 Slack, Discord, Google Chat, Microsoft Teams 호스트만 사용합니다.
- 관리자 일괄 복구는 한 번에 최대 8건을 처리하고 기존 메일 임대·KST 한도·중복 보호를 그대로 적용합니다.
- 자동·수동 복구 결과는 `incidentOperations/recovery`에 기록하며 최근 운영 상태는 30분 단위로 30일 보존합니다.
- 신규 이력 규칙이 아직 배포되지 않은 상태에서는 관리자 화면이 이력 없이 계속 동작해야 합니다.
- 배포에는 `retryIncidentBatchRequest`, Firestore Rules, Hosting, 선택 시 `FOXBEAR_INCIDENT_ALERT_WEBHOOK_URL` 환경 변수가 포함됩니다.

## v1.5.64 인수인계

- `auditIncidentMailOperations`는 15분마다 실행되며 `incidentOperations/mail`에 메일 운영 상태를 기록합니다.
- SMTP/Secret 점검은 정상 시 최대 6시간 캐시하고, 큐 이상 또는 이전 오류 상태에서는 30분 간격으로 다시 확인합니다.
- Google 앱 비밀번호의 미래 만료 시각은 조회할 수 없습니다. `secret-invalid`, `smtp-auth-failed`, `smtp-connection-failed`, `recipient-rejected` 결과로 실제 사용 가능 여부를 판단합니다.
- 장기 미발송은 `pending` 10분, 실패 재시도 또는 작업 임대 만료 5분 초과 기준입니다. 최종 실패 5건 또는 장기 미발송 3건부터 위험으로 분류합니다.
- SMTP가 정상인 상태에서 주의/위험 전환이 발생하면 운영 경보 메일을 보내며, 동일 상태는 12시간 쿨다운을 적용합니다. 정상 복귀 시 복구 메일을 보냅니다.
- SMTP 자체 장애 중에는 같은 메일 채널로 경보를 보낼 수 없으므로 관리자 오류 화면의 `SMTP/Secret`, `메일 운영`, `장기 미발송` 카드를 확인해야 합니다.
- 관리자 오늘 오류 수는 KST 날짜 범위의 서버 집계입니다. 최근 120건 목록의 UTC 날짜 문자열로 계산하지 않습니다.
- 배포에는 Firestore 규칙·인덱스와 `functions:auditIncidentMailOperations`가 반드시 포함되어야 합니다.
- 실제 예약 실행·SMTP 인증·경보/복구 메일 수신은 Firebase 배포 후 확인해야 합니다.

## v1.5.63 인수인계

- 일일 메일 한도는 `dailyKst_YYYY-MM-DD` 문서로 계산하며, 한도 초과 신고는 다음 KST 자정 5분 후 자동 재시도됩니다.
- v1.5.62의 `suppressed-rate-limit` 신고도 스케줄러가 회수하므로 기존 누락 후보를 별도 삭제하지 않습니다.
- `reservationActive`와 `reservationDayKey`는 예약 카운터 누수를 막는 서버 소유 필드입니다. 클라이언트 생성 스키마에는 추가하지 않습니다.
- 일일 요약은 500건씩 최대 5,000건을 읽고, 추가 데이터가 있으면 제한 사실을 메일에 표시합니다.
- 요약 스케줄은 KST 09/12/15/18/21시에 최근 3일을 확인하며 날짜별 고정 Message-ID를 사용합니다.
- 실제 Gmail 승인·수신은 Firebase Secret과 Functions 배포가 필요하며 로컬 정적 QA만으로 완료 처리하지 않습니다.

## v1.5.62 인수인계

- 신규 신고는 `delivery.status=pending`으로 생성되어 상태별 스케줄러가 직접 회수합니다.
- `leaseId`가 다른 만료 작업의 늦은 완료는 `stale-completion`으로 무시하며, SMTP Message-ID는 보고서별로 고정됩니다.
- 3회 실패한 보고서는 `dead-letter`가 되고 관리자 화면의 `강제 재전송`으로 시도 횟수를 새로 시작합니다.
- Functions 배포에는 `firestore:indexes`가 포함되어야 합니다. 인덱스가 준비되기 전에는 상태별 쿼리가 제한된 fallback으로 동작합니다.
- 두 ZIP 생성 스크립트는 `version:check`와 `handoff:check`에 해당하는 직접 검사를 먼저 수행합니다.
- 로컬 Playwright는 Chromium 실행 파일 부재로 실행되지 않았으므로 GitHub Actions 또는 Chromium 설치 환경에서 브라우저 QA를 완료해야 합니다.


## v1.5.60 인수인계

- 카카오 UA 자체는 더 이상 부팅 차단 사유가 아닙니다. `foxbearGuide=1`일 때만 외부 브라우저 안내 화면으로 이동합니다.
- `404.html`은 카카오에서 `index.html?foxbearInApp=1`로 복구하므로 이전 세대 entry guard가 남아 있어도 루프를 피합니다.
- v1.5.60 메모리 governor는 디코딩 전 예상치와 런타임 관측치를 모두 사용하며, 치명적 품질 실패 계약은 우회하지 않습니다.

## v1.5.59 handoff focus

- 카카오 인앱에서 오류 트랙의 `외부 브라우저 복구`를 누르고 외부 브라우저에서 출력·DSP·피치/BPM·악기 레이어 설정이 복원되는지 확인합니다.
- URL 토큰에 오디오, 파일명, 로컬 경로가 포함되지 않고 20분 이후 토큰이 거부되는지 확인합니다.
- 프로그램 정보의 `진단 화면 열기`에서 곡별 단계 메모리, 예상 피크, 카카오 예산과 압력 비율이 표시되는지 확인합니다.
- 외부 브라우저에서는 보안상 원곡을 다시 선택해야 하며 파일 자체는 전달되지 않습니다.

## v1.5.57 handoff focus

- Open program info, feature, preview, admin, download, AI recommendation, save assist, and enhanced select dialogs.
- Confirm every top-right close control has the same circular geometry, inset, icon weight, hover state, and keyboard focus ring.
- Confirm feature and preview controls no longer drift with header layout.
- Confirm AI, download, and save-assist dialogs close with Escape and restore focus to the previous control.
- Confirm active download conversion keeps its close control disabled until cancellation or completion.

## v1.5.52 handoff focus

- Confirm static and browser release gates run as parallel GitHub Actions jobs.
- Confirm a newer push cancels the older Pages workflow for the same ref.
- Confirm Playwright browser cache is restored and failed browser diagnostics are uploaded only on failure.
- Confirm the build artifact waits for both QA jobs before deployment.

## v1.5.51 handoff focus

- Confirm `runtime-health.js` and `service-worker-recovery-service.js` load exactly once with the current asset generation.
- Confirm `index.html`, runtime config, service worker precache, and release metadata all use v1.5.51.
- Confirm stale v1.5.49 or v1.5.50 local asset generations fail release validation.
- Run the full static suite and the PWA Playwright test in GitHub Actions.
## v1.5.45 handoff focus

- Start `곡별 순차 저장`, pause it, and confirm the current file cannot be delivered until `저장 계속` is pressed.
- Move the app to the background and return; confirm the current file remains selected and no automatic save prompt opens.
- Simulate storage and permission failures and confirm targeted recovery guidance remains visible.
- Complete or cancel the queue and confirm pending service-worker activation is no longer blocked.

```text
product: 1.5.45
build: export-queue-recovery
asset generation: 1.5.45-export-queue-recovery
service worker cache: foxbear-shell-v1.5.45-export-queue-recovery
```


## v1.5.44 handoff focus

- Complete two or more tracks and confirm `곡별 순차 저장` prepares the list without starting automatic downloads.
- Confirm each `다음 파일 저장` click delivers exactly one file and advances only after success.
- Dismiss a file picker and confirm the same file remains retryable; then test skip and queue cancel.
- In Kakao or another restricted browser, confirm the queue uses file sharing only when `navigator.canShare({files})` accepts every queued file.
- Keep the queue active and confirm mastering, ZIP creation, queue clearing, and service-worker activation remain blocked.

```text
product: 1.5.44
build: export-queue-gesture-safety
asset generation: 1.5.44-export-queue-gesture-safety
service worker cache: foxbear-shell-v1.5.44-export-queue-gesture-safety
```

## v1.5.43 handoff focus

- Confirm the ZIP button opens the export progress panel and starts one Worker job.
- Remove the ZIP service script locally and confirm Runtime Health reports the missing module instead of a silent click.
- Run SRI update twice and confirm every local asset tag still has exactly one integrity attribute.
- Create the overwrite ZIP, extract it, and confirm required runtime entry assets are loaded exactly once.
- Create a large ZIP and compare peak memory against v1.5.42; capable browser workers should avoid eager full-file copies.

```text
product: 1.5.43
build: export-pipeline-integrity
asset generation: 1.5.43-export-pipeline-integrity
service worker cache: foxbear-shell-v1.5.43-export-pipeline-integrity
```

## CI install rule

- GitHub Actions must use `npm ci --ignore-scripts`.
- `package.json` must not define `prepare` for Git hook installation.
- Local hooks are optional and installed manually with `npm run hooks:install`.
- The overwrite archive must include `.githooks/pre-commit`, but its absence must still never break `npm ci`.

## v1.5.36 handoff focus

- In Chrome/Edge, select the already-generated format and confirm Share opens from the first click without a permission error.
- Select a different MP3/WAV format and confirm conversion completes, then the save-assist Share button works on the second explicit click.
- Use Direct Save and confirm the file picker opens before any asynchronous validation delay.
- Open and replace the save-assist panel repeatedly, close it, and confirm no stale Blob URL keeps the exit warning active.
- Start mastering on one track while completing a download action on another and confirm the download does not clear the mastering busy state.
- Navigate away and restore with browser back/forward cache, then confirm the exit guard and back confirmation still operate normally.

## Current patch: v1.5.36 Interaction lifecycle hardening

```text
product: 1.5.36
build: interaction-lifecycle-hardening
asset generation: 1.5.36-interaction-lifecycle-hardening
service worker cache: foxbear-shell-v1.5.36-interaction-lifecycle-hardening
```

Verification:

```bash
npm ci
npm run version:check
npm run handoff:check
npm run check
npm run qa:browser
npm run package:all
npm run package:verify:release
npm run package:verify:overwrite
```

## Previous handoff: v1.5.27 device glyph and SRI hardening

v1.5.22 header signature and uninterrupted preview routing

Changes:

- Converts the version/device/designer header cards into compact borderless engraved labels and shrinks the Settings trigger so the top copy does not wrap downward.
- Adds a persistent four-path Web Audio translation graph for studio, phone, laptop, and mono playback.
- Switches translation modes by crossfading gain paths without replacing the active audio element or restarting playback.
- Keeps translation contexts under `FoxBearAudioContextManager` ownership and closes them with the player lifecycle.
- Adds static and simulated routing coverage in `qa/v1522_header_preview_routing_smoke.js`.

```text
product: 1.5.22
build: header-preview-routing-polish
asset generation: 1.5.22-header-preview-routing-polish
service worker cache: foxbear-shell-v1.5.22-header-preview-routing-polish
```

Verification:

```bash
npm ci
npm run version:check
npm run handoff:check
npm run check
npm run qa:browser
npm run package:all
npm run package:verify:release
npm run package:verify:overwrite
```

Expected static result: `204/204 PASS`.

## Previous handoff: v1.5.21 History and CSP Console Contract Fix

The v1.5.21 CSP and history-sentinel fixes remain included.

## Previous handoff: v1.5.20 Idempotent PWA Cache Warm

The v1.5.20 cache warm fetches only missing current-cache assets, reports cache hits, and requires the repeated warm path to perform zero additional fetches.

## Previous handoff: v1.5.19 CI Runtime Isolation and Package Hardening


Changes:

- Playwright replaces optional Firebase CDN modules with deterministic local E2E modules, removing external-network console noise from the core runtime test.
- Same-origin request failures, uncaught page exceptions, and application console errors are asserted separately with their actual values in the failure message.
- The local Python server exposes a unique ownership probe; an occupied port or exited server process now fails before Playwright starts.
- History QA requires both backward and forward navigation and no longer catches and discards navigation failures.
- `version:sync` owns the versioned Release/Overwrite verification script filenames.
- Archive verification rejects symlinks, unsafe ZIP paths, scratch audit text, temporary files, traces, logs, nested ZIPs, and browser-result trees.
- `qa/v1519_ci_runtime_isolation_packaging_smoke.js` protects these contracts.

```text
product: 1.5.19
build: ci-runtime-isolation-package-hardening
asset generation: 1.5.19-ci-runtime-isolation-package-hardening
service worker cache: foxbear-shell-v1.5.19-ci-runtime-isolation-package-hardening
```

Verification:

```bash
npm ci
npm run version:check
npm run handoff:check
npm run check
npm run qa:browser
npm run package:all
npm run package:verify:release
npm run package:verify:overwrite
```

Expected static result: `199/199 PASS`.

## Previous handoff: v1.5.18 CI Diagnostics and PWA Readiness

The v1.5.18 service-worker readiness and concise failure diagnostics remain included.

## Previous handoff: v1.5.17 Browser Contract Fix

The v1.5.17 manual Wake Lock, Trusted Types service-worker registration, and header order corrections remain included.

## Previous handoff: v1.5.16 E2E Static Server Pipe Deadlock Fix


## Maintainer workflow

The project owner applies patches and commits with **GitHub Desktop**. Extract the cumulative overwrite ZIP into a temporary folder, copy its contents into the repository root, review the changed root files, commit, push, and inspect the GitHub Actions release gate.

## Current patch: E2E static-server pipe deadlock fix

The release gate failure was not an application boot defect. `qa/browser/run-browser-e2e.js` started Python's static server with piped stdout/stderr, then launched Playwright with `spawnSync`. While the synchronous child ran, the parent Node event loop could not drain those pipes. After enough HTML/CSS/JS requests, Python blocked while writing access logs, and all later Playwright navigations timed out at `domcontentloaded`.

Changes:

- Playwright now runs through an awaited asynchronous child process.
- The local server's output buffer is bounded to the latest 256 KiB.
- Browser failures print the static server diagnostic tail.
- `qa/v1516_e2e_server_pipe_deadlock_smoke.js` sends 1,800 requests during an asynchronous child run and verifies the final request and a follow-up request succeed.
- The overwrite ZIP is cumulative and includes all v1.5.7-v1.5.16 runtime, QA, workflow, and packaging files.

```text
product: 1.5.16
build: e2e-server-pipe-deadlock-fix
asset generation: 1.5.16-e2e-server-pipe-deadlock-fix
service worker cache: foxbear-shell-v1.5.16-e2e-server-pipe-deadlock-fix
```

Verification:

```bash
npm ci
npm run version:check
npm run handoff:check
npm run check
npm run qa:browser
npm run package:all
```

Expected static result: `196/196 PASS`. Browser PASS must be confirmed in GitHub Actions when Chromium is available.

## Previous handoff: v1.5.13 Handoff Package Integrity

## Root cause of the 188/189 CI failure

The v1.5.12 handoff correctly stated that CI Playwright workers were capped at two, but the cumulative overwrite ZIP did not include `playwright.config.js`. Applying that ZIP therefore delivered `qa/v1512_ci_runtime_readiness_smoke.js` while leaving the repository's v1.5.11 Playwright config unchanged. The smoke test correctly failed because the transferred code and transferred configuration were inconsistent.

This was a delivery-package defect, not an undocumented runtime decision.

### v1.5.13 changes

- `tools/create-overwrite-zip.sh` now copies `playwright.config.js`.
- Every overwrite archive is verified after creation by `tools/verify-overwrite-zip.js`.
- Required root config, both Pages workflows, browser helpers, QA, tools, runtime sources, and assets must exist in the produced ZIP.
- `node_modules`, browser results, test results, and report trees are rejected.
- The CI worker regression test now loads the effective Playwright config with `CI=true` and accepts only 1-2 workers instead of depending on one exact source-code spelling.

```text
product: 1.5.13
build: handoff-package-integrity
asset generation: 1.5.13-handoff-package-integrity
service worker cache: foxbear-shell-v1.5.13-handoff-package-integrity
```

Verification:

```bash
npm ci
npm run version:check
npm run check
npm run package:overwrite
node tools/verify-overwrite-zip.js dist/foxbear-mastering-studio-v1.5.13-overwrite.zip
npm run qa:browser
```

Expected static result: `191/191 PASS`. Browser PASS must be confirmed by GitHub Actions.

## Previous handoff: v1.5.12 CI Runtime Readiness and Node 24 Actions

### v1.5.12 changes

The v1.5.11 browser gate still raced because `waitForRuntimeHealth()` only waited for the Runtime Health object, not for `appReady`. v1.5.12 waits for the application-owned ready state, reports the last health snapshot on timeout, waits explicitly for an active service worker, creates fresh Wake Lock sentinels, and caps CI Playwright workers at two.

GitHub workflow actions were migrated to `actions/checkout@v6`, `actions/setup-node@v6`, and `actions/upload-artifact@v6` for Node 24 runtime compatibility.

```text
product: 1.5.12
build: ci-runtime-readiness
asset generation: 1.5.12-ci-runtime-readiness
service worker cache: foxbear-shell-v1.5.12-ci-runtime-readiness
```

Verification:

```bash
npm ci
npm run version:check
npm run check
npm run qa:browser
```

Expected static result: `189/189 PASS`. Browser PASS must be confirmed by GitHub Actions.

## Previous handoff: v1.5.11 AudioContext Lifecycle and CI Navigation Stability


## What changed

- Web Audio contexts are created and released through `FoxBearAudioContextManager`.
- Realtime preview, difference A/B, translation preview, spectrum, and decode contexts report purpose/state diagnostics and close on owner disposal or page hide.
- Playwright navigation now waits for `domcontentloaded` and then FoxBear Runtime Health instead of waiting for global network idleness.
- Browser navigation has a 20-second ceiling, local proxy bypass values are normalized, and GitHub Actions uploads browser artifacts after failures.

## CI failure fixed

The previous 10-test failure stopped at each `page.goto()` call because `waitUntil: 'networkidle'` could not complete while optional Firebase/PWA traffic remained active. The browser suite now waits for the application-owned readiness signal.

## Verification

```bash
npm ci
npm run version:check
npm run check
npm run qa:browser
```

Expected static result: `188/188 PASS`.

Release metadata:

```text
product: 1.5.11
build: audio-context-ci-stability
asset generation: 1.5.11-audio-context-ci-stability
service worker cache: foxbear-shell-v1.5.11-audio-context-ci-stability
```

## Previous patch: v1.5.10 Header Settings Relocation

The top-right Settings layout and viewport-safe panel positioning remain active.

## Previous patch: v1.5.9 Version Display and Cache Recovery

The runtime-bound version labels, manifest synchronization, navigation no-store recovery, and service-worker generation diagnostics remain active.

## Archived v1.5.9 handoff details
## What changed

- The top version badge and program-info version are synchronized at runtime from generated `FoxBearBuildInfo` by `FoxBearReleasePresentation`.
- PWA manifest description now follows the current product version/build ID.
- Service-worker navigation bypasses the HTTP cache before falling back offline, reducing stale HTML after deployment.
- The page can query the active service worker with `FOXBEAR_GET_RELEASE_INFO` and compare cache/asset generations.
- Update Safety no longer carries a stale v1.5.6 patch ID.
- Release synchronization removes the active cache name from `LEGACY_CACHE_NAMES`.

## Verification

```bash
npm ci
npm run version:check
npm run check
npm run qa:browser
```

Expected static result: `185/185 PASS`.

Deployment console checks:

```js
FoxBearReleasePresentation.getReport()
await FoxBearReleasePresentation.requestServiceWorkerReleaseInfo()
FoxBearUpdateSafety.getReport()
```

## Previous handoff: v1.5.8 PCM and ZIP Memory Hardening


## What changed

- Completed `masteredBuffer` PCM is released by default after encoding and after the track is marked `done`.
- `outBlob`, `masteredUrl`, reports, waveform overview, and download state remain available.
- The download dialog disables formats that would require a released PCM buffer instead of silently serving the wrong/current format.
- ZIP export force-releases PCM before planning, uses JSZip `STORE` with `streamFiles`, and estimates a browser working-set ceiling.
- Unsafe low-memory/mobile ZIP attempts stop before allocation and open the per-track download recovery path.

## Verification

```bash
npm ci
npm run version:check
npm run check
npm run qa:browser
```

Expected static result: `183/183 PASS`.

Manual large-batch checks:

```js
FoxBearMemoryGuard.getSnapshot()
FoxBearExportGuard.getReadiness()
FoxBearExportGuard.getDiagnostics()
```

The expected completed-master snapshot is `masteredBufferCount: 0` unless a future feature explicitly opts into the bounded re-encode cache.

## Previous handoff: v1.5.7 Release Foundation Cleanup

### Current status

Latest product release: `v1.5.7`; build ID `release-foundation-cleanup`; asset generation `1.5.7-release-foundation`; service worker cache `foxbear-shell-v1.5.7-release-foundation`.

Release workflow:

```bash
npm ci
npm run qa:browser:install
npm run check:release
```

Durable rules are in `STATUS.md`; version semantics are in `VERSIONING.md`; release steps are in `RELEASE_CHECKLIST.md`. Dock FFT remains intentionally removed per `docs/decisions/0001-dock-fft-removal.md`.

Compatibility note: previous maintenance layers `v1.5.5 Update Safety`, `v1.5.4 Boot SRI Recovery`, `v1.5.3 Bulk HUD Visibility + Inline Master All`, and `v1.5.2 Export Guard + Low Memory UX` remain carried forward.

The previous Bulk HUD asset/close-button hotfix, Bulk Mastering HUD continuity patch, v1.4.27 release cleanup, v1.4.28 app-slimdown orchestration split, v1.4.29 Memory Stabilization, v1.5.0 Engine Quality Gate, and v1.5.1 browser automation carry-forward are active.


## v1.5.6 export progress recovery

- Added `src/download/export-progress-view.js` and the `FoxBearExportProgressView` browser global.
- Added a visible ZIP/export progress panel under the main action buttons with readiness checklist, progress bar, completion state, and failure state.
- `downloadZip()` now updates the panel during `JSZip.generateAsync()` and surfaces validation failures with `곡별 다운로드 위치 보기`.
- The panel dispatches `foxbear:export-show-track-downloads`, and `src/app.js` focuses the first completed track download action as a safe fallback path.
- Boot-critical scripts now use `h=boot-sri-v156`; `update-safety-service.js` uses `h=update-safety-v156`.
- Service worker cache generation is now `foxbear-shell-v1.5.6-export-progress-recovery`, with v1.5.5 listed as a legacy cache generation.
- Static QA added: `qa/v156_export_progress_recovery_smoke.js`.


## v1.5.5 update safety

- Added `src/boot/update-safety-service.js` and the `FoxBearUpdateSafety` browser global.
- `FoxBearUpdateSafety.getReport()` inventories local assets, verifies boot-critical cache-bust keys, reports SRI/load-block risk from Runtime Health, and returns a recovery plan.
- Boot-critical scripts now use `h=boot-sri-v155`; `update-safety-service.js` uses `h=update-safety-v155`.
- Service worker cache generation is now `foxbear-shell-v1.5.5-update-safety`, with v1.5.4 listed as a legacy cache generation.
- Runtime Health recovery now also sends `FOXBEAR_PURGE_CACHES` to active service workers before unregistering and reloading.
- Service worker script/style fetches with patch-bust keys use network-first no-store handling to reduce stale JS/CSS fallback risk.
- Static QA added: `qa/v155_update_safety_asset_health_smoke.js`.

## v1.5.4 boot SRI recovery

- Added fresh boot cache-bust keys (`h=boot-sri-v154`) to `runtime-health.js`, `performance-diagnostics.js`, and `app.js`.
- Bumped the service worker shell cache generation to `foxbear-shell-v1.5.4-boot-sri-recovery` so stale shell entries cannot satisfy the new boot-critical script URLs.
- Strengthened Runtime Health `캐시 초기화 후 재시도` to clear `foxbear-*`, `workbox-*`, and `precache-*` caches, request service worker update, unregister service workers, and then reload with a fresh URL.
- Added `qa/v154_boot_sri_recovery_smoke.js` to lock boot script SRI/cache-bust alignment.

## v1.5.3 bulk HUD visibility and inline full-mastering action

- The large bulk HUD no longer uses the confusing `접기` copy; the control now says `숨김` and hides the whole current bulk HUD batch.
- A small `보이기` button is created beside the floating settings gear and is only visible when the current bulk HUD batch was hidden but can still be restored.
- The large HUD now includes `전체 마스터링`, delegating to the existing main full-mastering button so behavior stays identical.
- Changed assets use targeted cache-bust keys: `bulk-hud-v153`, `bulk-hud-restore-v153`, and `ui=v153`; the service worker precache mirrors those keys.
- Static QA added: `qa/v153_bulk_hud_visibility_masterall_smoke.js`.

## v1.5.2 export guard and low-memory UX

- `src/download/export-guard-service.js` now owns ZIP/export readiness planning, generated ZIP Blob validation, memory-pressure classification, and export diagnostics.
- `downloadZip()` calls Export Guard before creating the ZIP and validates the generated Blob before triggering download.
- `FoxBearExportGuard.getReadiness()` exposes completed count, output bytes, estimated ZIP bytes, memory pressure, and warnings from the browser console.
- `FoxBearExportGuard.getDiagnostics()` keeps recent ZIP plan/validation events for manual debugging.
- The post-batch memory sweep now warns when pressure remains medium/high so users can choose per-track downloads before a large ZIP export.
- The 35-track Playwright deep scenario now checks Export Guard readiness before clicking ZIP export.

## v1.5.1 browser QA automation

- `playwright.config.js` now defines desktop Chromium and mobile PWA-style Chromium projects.
- `qa/browser/run-browser-e2e.js` starts a local static server before invoking Playwright, so `npm run qa:browser` can be run from the project root.
- `qa/browser/helpers/foxbear-e2e-helpers.js` provides synthetic WAV generation, Runtime Health assertions, Wake Lock mocking, service worker snapshots, and static server utilities.
- `qa/browser/runtime-health-playwright.spec.js` checks browser boot, Runtime Health, resource failures, missing globals/DOM ids, asset version mismatches, runtime errors, and console errors.
- `qa/browser/pwa-back-wakelock-sw-playwright.spec.js` covers PWA back/forward resilience, mocked Wake Lock request/release, and service worker update registration.
- `qa/browser/bulk-35-import-master-export-playwright.spec.js` uploads 35 generated WAV files and verifies Bulk HUD continuity. With `FOXBEAR_E2E_DEEP=1`, it proceeds into full master/export assertions.
- `npm run check` remains the fast static suite, but release sign-off must use `npm run check:release`, which includes the desktop/mobile Playwright gate.

## Key changes in this patch

- `src/audio/quality-gate-service.js` now owns QualityGate v2.1 result evaluation with short-term LUFS, limiter/de-esser overcorrection, multiband overcorrection, mobile translation amount checks, and risk flags.
- `src/workers/master-finalizer.worker.js` and the app fallback now emit `shortTermLufs` telemetry.
- `createMasterReport()` now carries `loudness.shortTermBefore` and `loudness.shortTermAfter` for detail panels and QA diagnostics.
- `src/audio/reference-profile-service.js` provides 64/96-band log-spectrum profile helpers for the upcoming reference-match upgrade.
- `qa/v150_engine_quality_gate_smoke.js` locks the new engine quality gate surface.
- `src/audio/memory-guard-service.js` still owns the v1.4.29 large-batch memory policy.
- `FoxBearMemoryGuard.getSnapshot()` now reports retained mastered-buffer count/bytes, Blob bytes, preview Blob bytes, low-memory mode, pressure level, policy budget, released completed buffer count, and largest retained buffers.
- `FoxBearMemoryGuard.diagnose()` now runs a before/after completed-batch policy sweep for console debugging.
- `src/app.js` now calls a post-batch memory sweep through `afterMasteringBatchMemorySweep()` after selected/all-track mastering batches.
- `finishPerformanceProfile()` records `performanceInfo.masteredBufferBytes` and `performanceInfo.outBlobBytes` for completed masters.
- The policy keeps completed download Blobs but releases non-selected completed `masteredBuffer` objects when the batch is large or low-memory/mobile conditions are detected.
- `qa/v1429_memory_stabilization_smoke.js` locks this behavior.

## QA

Default QA command:

```bash
npm run check
```

Expected result:

```text
182/182 PASS (static suite)
Playwright desktop/mobile suite PASS (release environment)
```

Release browser QA automation:

```bash
npm run qa:browser:install
npm run qa:browser
```

## Console checks for manual 35-track testing

After importing and mastering a large batch, run:

```js
FoxBearMemoryGuard.getSnapshot()
```

Then run:

```js
FoxBearMemoryGuard.diagnose()
```

Expected shape:

```text
masteredBufferCount should stay near the policy max
outBlobBytes should remain available for downloads
releasedCompletedBufferCount should increase after large-batch sweeps
pressure should be normal or medium after the sweep, not high
```

## Next patch candidates

1. Follow-up memory tuning after real-device runs
   - tune buffer byte budgets against PC/iOS/Android results
   - tune Export Guard thresholds against real PC/iOS/Android results
   - add a richer low-memory panel if toast-only warnings are not visible enough

## Carry-forward anchors

Stage7, Stage8, Stage9, Stage9.1, Stage10, Stage11, Stage11.1, Stage12, Stage27, Stage28, Wake Lock state sync, Bulk Import HUD, Bulk Mastering HUD continuity, Bulk HUD asset/close hotfix, v1.4.27 release cleanup, and v1.4.28 app-slimdown orchestration remain active.

- Stage9.1 누적 덮어쓰기 packaging remains active for cumulative overwrite ZIP releases.
- Stage27 다음 대화 인수인계: `src/audio/waveform-control-service.js` remains the shared waveform service boundary.
- Stage28 view extraction: `src/ui/waveform-control-view.js` remains the managed waveform view module.

## Legacy QA compatibility anchors

- v1.4.26 Spectrum update remains carried forward with detail-only FFT behavior.
- v1.4.26 stability entry remains active for spectrum lifecycle and navigation guard diagnostics.
- Dock FFT removal and settings gear alignment remain active; the Dock mini FFT stays removed by design.
- v1.4.26 detail-only FFT remains active; full spectrum rendering belongs in the detail panel only.
- FoxBearPerformanceDiagnostics remains available with collectSnapshot, getSummary, copy, and adaptive summary diagnostics.
- v1.4.26 뒤로가기 / Exit Guard fallback remains active for browser and PWA back navigation.

## v1.5.15 browser QA classification

- GitHub Actions의 선택적 Firebase/Firestore 네트워크 실패는 `runtimeWarnings`로 기록하며 앱 boot 실패로 판정하지 않습니다.
- `runtimeErrors`에는 실제 앱 예외만 남아야 합니다.
- 브라우저 QA가 실패하면 Actions 로그의 `[FoxBear E2E Runtime Health]` JSON을 먼저 확인합니다.
- GitHub Desktop에서 누적 ZIP 적용 후 `package.json`, `package-lock.json`, `src/boot/runtime-health.js`, `qa/browser/` 변경이 모두 표시되는지 확인합니다.
