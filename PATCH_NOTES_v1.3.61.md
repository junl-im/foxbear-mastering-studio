# FoxBear AI Mastering Studio Pro v1.3.61

## UI Coverage + GitHub Pages Deploy Hotfix

### Fixed
- Repaired the local static validation failure caused by a stale `src/app.js` SRI hash in `index.html`.
- Added a deploy artifact contract check so GitHub Pages deployment fails early during the build job when `index.html`, `manifest.webmanifest`, `sw.js`, `assets`, `src`, or `vendor` are missing.
- Included `manifest.webmanifest` and `sw.js` in the GitHub Pages `_site` artifact. The previous workflow copied the app shell and source assets but left these root PWA/runtime files out.
- Added pre-upload checks that reject symbolic links and hard links in `_site`, matching GitHub Pages artifact requirements.
- Explicitly pinned the uploaded artifact name to `github-pages` and passed `artifact_name: github-pages` to the deploy step.

### Improved
- Grouped feature cards into `마스터링 엔진` and `비교 · 관리 도구` so non-engine controls no longer appear to leak into the engine area.
- Extended dynamic feature card help metadata with `data-help`, `data-tooltip`, `aria-label`, and `title`.
- Added `qa/deploy_pages_artifact_smoke.js` to `npm run check`.

### Validation
- `npm run check`: PASS
- Local `_site` artifact simulation: PASS, 33 files, about 1.6 MB
