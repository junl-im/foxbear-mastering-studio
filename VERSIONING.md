# Versioning

FoxBear uses one product version and separate deployment identifiers.

- **Product version**: `package.json.version`. It is shown to users and must match `manifest.webmanifest`, the HTML title, `data-build`, Runtime Config, README, HANDOFF, and the newest CHANGELOG entry.
- **Build ID**: `package.json.foxbearRelease.buildId`. It describes the purpose of the deployment without pretending to be another semantic version.
- **Asset version**: `package.json.foxbearRelease.assetVersion`. It is the `?v=` cache generation for local runtime assets.
- **Service worker cache**: `package.json.foxbearRelease.cacheName`. It must equal `foxbear-shell-v<assetVersion>`.
- **Boot/update revisions**: targeted `h=` keys for boot-critical scripts and service worker registration.

`package.json` is the source of truth. After changing release metadata, run:

```bash
npm run version:sync
npm run version:check
```

The sync command updates generated/runtime metadata and SRI values. Do not introduce a second `vX.Y.Z` counter for cache-only changes; use `buildId`, `assetVersion`, or an `h=` revision instead.
