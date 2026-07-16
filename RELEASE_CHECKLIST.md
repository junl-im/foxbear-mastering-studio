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

