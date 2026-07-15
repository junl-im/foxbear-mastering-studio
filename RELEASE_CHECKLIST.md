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
