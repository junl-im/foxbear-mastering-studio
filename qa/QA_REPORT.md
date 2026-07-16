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
