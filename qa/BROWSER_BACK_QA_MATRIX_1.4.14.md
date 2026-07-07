# v1.4.14 Download action clarity QA matrix

Scope: keep the v1.4.11/v1.4.12 Kakao/mobile download fallbacks and v1.4.13 flow polish, then make the visible buttons match their real actions.

## Core checks

| Environment | Scenario | Expected result |
| --- | --- | --- |
| KakaoTalk Android in-app | Open download popup after mastering | Popup shows a recommended flow card saying Kakao should use 공유/저장 first. The primary button has `data-download-action="share"`. |
| KakaoTalk Android in-app | Tap 추천 공유/저장 | The button opens the file share/save flow first. If sharing fails, the save-help sheet opens. |
| KakaoTalk Android in-app | Tap 저장 도움 | Save-help sheet opens with file open/share/external-browser fallback. |
| KakaoTalk Android in-app | Tap 진단 복사 | Diagnostics JSON is copied without needing to re-encode the selected file. |
| KakaoTalk Android in-app | Tap 추가 옵션 | 주소 복사, 안내 복사, 진단 복사, 외부 브라우저 are revealed only after expanding. Advanced actions are hidden behind 추가 옵션 by default. |
| Chrome Android | Open download popup | Primary flow says normal browsers should download first. Extra options are collapsed by default. |
| iOS Safari | Try file share | Share uses feature detection; if blocked, assist sheet stays readable. |
| Desktop Chrome/Edge | Open download popup | Four primary buttons remain aligned, the recommended button shows a small 추천 badge, and advanced actions collapse/expand without overflow. |
| Installed PWA | Open/close popup repeatedly | body `download-options-open` class is cleaned up when closed. |

## Download-specific checks

- Recommended flow is provided by `FoxBearDownloadService.getRecommendedDownloadFlow()`.
- Runtime health requires `FoxBearDownloadService.getRecommendedDownloadFlow`.
- Main dialog shows `download-options-flow-card` and compact ordered steps.
- Primary/secondary/tertiary buttons use explicit `data-download-action` values.
- The recommended button uses `data-recommended="true"` and `.is-recommended` styling.
- `showDownloadAssist`, `downloadBlob`, `shareDownloadFile`, copy guide, diagnostics copy, and external browser helpers receive app dependencies so toast/state handling remains available.
- Advanced actions are hidden behind `추가 옵션` by default.
- Diagnostics copy remains available after expanding 추가 옵션 and in the save-help sheet.
- Download assist sheet still exposes direct file open/share/external-browser fallbacks.

## Manual notes

External-browser open cannot transfer the in-memory Blob. If Kakao blocks all client-side options, the user may need to reopen in Chrome/Safari and rerun mastering before saving.

## Cumulative QA coverage retained

- Safari iOS: confirm download/share popup, Web Share fallback, refresh/back guard, and file-open fallback.
- Chrome Android: confirm normal download, performance diagnostics, and copied diagnostics JSON.
- Kakao Android: confirm share-first flow, 저장 도움, external browser intent, and diagnostics copy.
- Installed PWA: confirm back confirm debounce, Performance diagnostics, and package cache key.
- Desktop Chrome/Edge: confirm primary buttons align and File System Access direct save remains available when supported.
- FFT external analyser coverage remains active for preview translation and difference compare audio graphs.
- v1.4.14 Dock FFT/back confirm focus remains cumulative from v1.4.6/v1.4.7 stability work.
- Dock FFT removal remains intentional; `#bottomPreviewSpectrum` should not exist.
- renderMini cleanup remains intentional; `renderMini` is removed and FFT is detail-only.
- Performance diagnostics and Packaging polish remain cumulative; `getSummary`, adaptive refresh, and snapshot 복사 stay supported.
- Diagnostics copy remains available from 추가 옵션 and the save-help sheet.

## Regression keyword anchors for cumulative smoke

- beforeunload and popstate guards remain part of back/refresh protection.
- confirm debounce remains active for fast hardware Back presses.
- Dock mini FFT remains removed from the Dock; this is intentional.
- runtime health does not require `renderMini`; detail-only FFT uses `renderPanel`.
- v1.4.14 Download flow polish remains cumulative while v1.4.14 Download action clarity resolves button/action ambiguity.
