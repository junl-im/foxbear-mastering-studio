# FoxBear Pro v1.3.17 Firebase QA Report

## Scope

- Firebase Web SDK CDN bootstrap
- Spark plan / no Storage compatibility
- Anonymous Auth + Firestore visitor logging
- Hidden admin stats Firestore read path
- Firebase Hosting CSP and rule files
- Static syntax and SRI validation

## Changes verified statically

- `src/firebase-bootstrap.js` initializes Firebase SDK v12.14.0 from CDN modules.
- Storage SDK is not imported and no audio upload path was added.
- `src/app.js` keeps localStorage stats fallback and attempts Firestore logging only when Firebase bridge is available.
- Hidden stats dialog attempts Firestore stats first, then the existing same-origin API fallback, then local stats.
- `firestore.rules` allows visit creation only for authenticated anonymous users writing their own UID and allows stats reads only for UIDs listed in `siteAdmins/{uid}` with `active: true`.
- Firebase Hosting CSP allows only the Firebase SDK CDN and required Firebase API endpoints.
- Firebase Hosting allowed hosts now include `foxbear-music.web.app` and `foxbear-music.firebaseapp.com`.
- GitHub Pages workflow now copies `vendor/`, preventing JSZip/lamejs static asset omission.

## Command checks

```bash
npm run check
```

Passed:

- `src/firebase-bootstrap.js`
- `src/app.js`
- `src/workers/analysis.worker.js`
- `src/workers/wav-encoder.worker.js`
- `src/workers/mp3-encoder.worker.js`
- `src/workers/master-finalizer.worker.js`
- `src/workers/pitch-wsola.worker.js`
- `src/engines/pitch-engine-adapter.js`

## SRI checks

Validated SHA-384 integrity values in `index.html` for:

- `assets/css/studio.css`
- `vendor/jszip/jszip.min.js`
- `src/firebase-bootstrap.js`
- `src/app.js`

## Manual checks still recommended

- Enable Anonymous Auth in Firebase Console before expecting Firestore writes.
- Create Firestore Database before deploying rules.
- Add your admin UID to `siteAdmins/{uid}` manually after first visit.
- Test the deployed Firebase Hosting URL in a real browser because CDN module import and Firestore requests depend on live CSP headers.
