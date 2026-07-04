# QA Report - FoxBear AI Mastering Studio Pro v1.3.26

## Scope

Admin statistics security hotfix.

## Changes verified

- Removed the client-side admin password constant and password dialog markup.
- Kept the public compatibility badge visible as `PC · 모바일 호환` for normal visitors.
- Shows the `관리자 통계` trigger only when the current Firebase anonymous Auth UID has `siteAdmins/{uid}` with `active: true`; non-admin users keep a passive `PC · 모바일 호환` badge.
- Added `getAdminProfile()` to `src/firebase-bootstrap.js` so the UI can check the current UID's admin profile without listing admin documents.
- Blocked the admin statistics dialog at UI level when the current UID is not an active admin.
- Updated Firebase setup instructions to register the UID from `window.FoxBearFirebase?.getUid?.()` instead of using a local password.
- Updated version strings, cache-busting query strings, and SRI hashes.

## Commands

```bash
npm run check
```

Result: PASS

## Static checks

- legacy numeric code: not found in `index.html`, `src/`, `README.md`, `FIREBASE_SETUP.md`, or `package.json`.
- Legacy admin password identifiers are absent from `index.html` and `src/`.
- SHA-384 SRI verified for `assets/css/studio.css`, `vendor/jszip/jszip.min.js`, `src/firebase-bootstrap.js`, and `src/app.js`.

## Notes

Anonymous Auth UID can change by browser, profile, or private browsing mode. Register the UID for the exact browser/profile that should receive the admin statistics trigger, or migrate to Email/Google Auth later for persistent admin identity.
