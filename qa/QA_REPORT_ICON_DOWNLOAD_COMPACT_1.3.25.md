# QA Report - FoxBear Mastering Studio v1.3.25

## Scope
- PNG app icon replacement
- Compact AI recommendation popup
- Candidate preset labels simplified
- Completed track scroll/focus and download button pulse
- Download format selector popup
- Kakao/in-app browser download assist update
- Compact panel/card spacing overrides
- Mobile pitch default badge width adjustment
- Subscribe nudge label update

## Files changed
- `index.html`
- `src/app.js`
- `assets/css/studio.css`
- `assets/icons/foxbear-music.png`
- `package.json`

## Checks
- `npm run check` passed.
- SRI integrity check passed for `studio.css`, `app.js`, `firebase-bootstrap.js`, and `jszip.min.js`.
- CSS brace balance checked.

## Notes
- KakaoTalk/in-app browsers can still block local Blob downloads at the WebView level. The app now avoids showing a false automatic-download flow in restricted browsers and opens the share/save assist path first.
- FLAC/Opus export was not added because the current build does not include real encoders for those formats.
