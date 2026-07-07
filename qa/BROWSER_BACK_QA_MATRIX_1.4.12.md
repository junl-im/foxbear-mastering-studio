# Browser / PWA QA Matrix - v1.4.12 Download + Share Reliability

Focus: download/share fallback behavior, especially KakaoTalk in-app browser and mobile WebView style environments.

## Test matrix

| Environment | Download button | Share button | Save help | External browser | Expected result |
| --- | --- | --- | --- | --- | --- |
| KakaoTalk in-app browser Android | Shows share/save-first flow or save help | Uses Web Share when supported; otherwise opens save help | Shows enlarged help sheet with share/open/copy/external options | Android intent attempted, URL copied fallback | User sees clear next steps instead of silent failure |
| KakaoTalk in-app browser iOS | Shows save help if file share is limited | Uses iOS share sheet when supported | Shows enlarged help sheet | Instructs Safari/open-in-browser via copied URL | User can retry in Safari if in-app save fails |
| Chrome Android | Uses anchor download | Uses Web Share if `canShare(files)` passes | Available as fallback | Not primary path | Download starts or share sheet opens |
| Safari iOS | Uses Safari download/share behavior | Uses native share sheet when supported | Available as fallback | URL copy fallback | No clipped dialog content |
| Android PWA | Uses anchor/download manager when available | Uses OS share sheet when supported | Available as fallback | Not primary path | Download/share action remains visible above Dock |
| Desktop Chrome/Edge | Uses anchor download or File System Access where available | Uses Web Share where supported | Large help sheet if needed | Not primary path | Dialog remains centered and fully readable |

## Manual checks

1. Complete a mastering result.
2. Open the download dialog and verify the panel text is not clipped on mobile and desktop.
3. In Kakao or any in-app browser, press the primary button and confirm the app prefers share/save or opens save help instead of only firing a hidden blob download.
4. Press Save Help and confirm the enlarged panel shows: Share/Save, File Open, Address Copy, Guide Copy, and External Browser when restricted.
5. Press Guide Copy and paste it into a note/chat to confirm troubleshooting text is copied.
6. Verify the Dock does not cover the save help sheet.

## Notes

- Client-generated mastered files are Blob objects in memory. Opening an external browser cannot transfer that in-memory file automatically, so the UI warns the user to re-open the page and rerun/download if needed.
- Web Share file support must be feature-detected per file because some browsers expose `navigator.share` but reject audio files.

## Carry-forward regression checks

- beforeunload refresh/close protection should still appear while a meaningful active job or completed output exists.
- popstate/back confirm debounce from v1.4.6 should still prevent stacked back confirmations.
- External analyser coverage from v1.4.5 should still work for preview translation and difference-listen WebAudio paths.
- Dock FFT remains removed; detail-only FFT remains available from the analysis detail screen.
- Performance diagnostics from v1.4.9/v1.4.10 should still open with `?perf=1` or `Ctrl/Command + Alt + P`.


## v1.4.12 cumulative UI/performance carry-forward notes

- External analyser coverage remains part of the QA scope for preview translation and difference-listen WebAudio graphs.
- confirm / popstate / beforeunload behavior remains covered so back confirm debounce does not regress.
- Dock mini FFT was intentionally removed; `#bottomPreviewSpectrum` should not exist in index.html.
- Runtime health does not require `renderMini`; runtime health does not require `renderMini` because FFT is detail-only.
- The detail-only FFT panel remains available from the analysis detail screen.
- Performance diagnostics remains available for lag checks.

- external analyser coverage remains required for FFT tap regression checks.

## v1.4.12 Download diagnostics follow-up

Focus: download/share fallback remains stable after adding diagnostic event history and copyable download diagnostics.

| Environment | Scenario | Expected result |
| --- | --- | --- |
| KakaoTalk Android in-app | Download mastered WAV/MP3 | Opens share/save first when available; otherwise opens the enlarged save assist sheet. |
| KakaoTalk Android in-app | Save assist > Diagnostics copy | Copies JSON with environment, capability, file size/type, and recent download/share events. |
| KakaoTalk Android in-app | Share cancelled | Assist sheet remains usable and diagnostics include `share-failed` or cancelled event metadata. |
| Chrome Android | Download | Anchor download starts normally; diagnostics include `anchor-download-click`. |
| Chrome Android | Save assist | Capability badges show share/download/file-picker support without clipping the panel. |
| iOS Safari | Share | Uses Web Share when file sharing is supported; otherwise opens assist guidance. |
| Desktop Chrome/Edge | Direct save | File picker path records file-picker diagnostics when supported. |
| PWA standalone | Diagnostics copy | Snapshot marks standalone/PWA mode and keeps the panel readable above safe areas. |

Manual note: diagnostics JSON can include a user-agent string. Treat it as support/debug information only and avoid uploading it publicly unless needed.

## v1.4.12 cumulative matrix notes

- Performance diagnostics: open with `?perf=1`, confirm the panel appears, use 복사, and confirm it remains hidden by default otherwise.
- Dock mini FFT: `#bottomPreviewSpectrum` should not exist and runtime health does not require `renderMini`.
- detail-only FFT: detail spectrum should still open when requested.
- Back confirm: confirm/debounce behavior should remain stable after download dialogs and save-help sheets are opened.
