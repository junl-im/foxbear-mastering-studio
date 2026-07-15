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
```

Inspect generated ZIP names and run `npm run version:check` once more after any packaging-related edit.

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

