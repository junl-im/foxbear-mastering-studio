# Kakao External Browser Local Flow - v1.5.32

## Decision

FoxBear exits KakaoTalk before the user selects an audio file. `index.html` loads a synchronous user-agent guard before the normal studio modules. KakaoTalk sessions are moved to `external-browser.html`, a lightweight page that attempts the Kakao external-browser scheme and offers Android intent, address-copy, and explicit in-app fallback controls.

## Why this preserves local processing

After Chrome, Samsung Internet, or Safari opens, the user selects the original file there. File decoding, AudioBuffer processing, mastering, MP3/WAV encoding, and Blob download all occur in that browser process. No temporary audio upload is required.

## Browser-boundary limitation

A Blob URL, File object, AudioBuffer, IndexedDB database, or OPFS entry created in KakaoTalk WebView belongs to that WebView/browser storage context. Opening another browser does not transfer those live objects. Therefore external-browser handoff must happen before import. If mastering already completed in Kakao, the user must share/save the completed file first or select the original file again in the external browser.

## Safety

The landing validates `target` against the current origin before launching it. `foxbearInApp=1` is an explicit user bypass and prevents redirect loops. The landing and launcher assets are part of the service-worker shell and overwrite package.
