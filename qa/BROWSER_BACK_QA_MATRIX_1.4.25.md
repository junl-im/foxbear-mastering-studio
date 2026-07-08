# FoxBear Browser Back QA Matrix - v1.4.26 Exit Guard Fallback

## Scope

v1.4.26 hardens the browser/PWA back navigation exit guard. The reported issue was: after pressing browser Back and choosing to leave, the FoxBear page sometimes stayed open.

## Expected behavior

| Scenario | Expected result |
| --- | --- |
| Meaningful workspace + Back + cancel/stay | App remains on current screen, guard state is restored. |
| Meaningful workspace + Back + leave with previous history | Audio previews pause, guard listeners are removed, then browser navigates back. |
| Meaningful workspace + Back + leave from direct tab/PWA launch | App attempts `history.go(-1)`, then `window.close()`, then shows a safe exit fallback screen if the browser refuses to close the tab/window. |
| Exit fallback screen visible | User sees “FoxBear 작업 화면을 나갔습니다”, with “뒤로가기 한 번 더” and “작업 화면 다시 열기”. |
| Page actually leaves or hides | Fallback timers are cancelled via `pagehide` / hidden visibility state. |
| Perf diagnostics | `FoxBearSiteGuards.getNavigationExitGuardState()` includes leave attempt/fallback metadata. |

## Manual QA notes

Actual browser tab closing is partly controlled by the browser. Many browsers do not allow a normal web page to close a tab that was not opened by script. v1.4.26 therefore adds a deterministic fallback screen so “나가기” no longer appears to do nothing.

Manual checks recommended:

1. Open app from a normal browser tab, add one track, press Back, confirm leave.
2. Open app in PWA/standalone mode, add one track, press Back, confirm leave.
3. Repeat during bulk import HUD activity.
4. Repeat during mastering progress.
5. Confirm previews pause on leave.
6. Confirm cancel/stay restores the back guard.

## Carry-forward regression coverage

This v1.4.26 matrix intentionally carries forward the older browser-back and stability scopes so legacy smoke tests continue to verify current packages.

### Crossfade / zoom / browser coverage

- KakaoTalk in-app browser: back confirm, upload fallback, and download fallback should remain covered.
- Chrome / Safari / PWA: back confirm should restore the guard when cancelled and should leave/fallback when confirmed.
- Detail waveform zoom remains active with double-tap and pinch interactions.

### Spectrum and FFT stability

- v1.4.26 stability coverage includes confirm debounce and Dock mini FFT cleanup.
- Dock mini FFT / `#bottomPreviewSpectrum` should not exist.
- `#bottomPreviewSpectrum` should not exist in index, app refs, or Dock CSS.
- Dock FFT removal remains intentional; detail FFT remains available only on the detail screen.
- `renderMini` cleanup remains enforced; detail spectrum uses `renderPanel` only.
- FFT external analyser / external analyser coverage remains included for preview translation and difference compare paths.
- v1.4.26 diagnostics include spectrum, performance, render scheduler, import queue, mastering queue, audio decode, navigation guard, and Bulk Import HUD snapshots.

### Download/share fallback carry-forward

- v1.4.26 download checks keep Kakao/Android/iOS/desktop download behavior covered.
- Download diagnostics follow-up remains covered with `진단 복사` and capability badges.
- Download flow polish remains covered: recommended action first, advanced actions collapsed.
- Download action clarity remains covered: `data-download-action`, recommended badge, and share/assist/copy/diagnostics action mapping.
- Download dialog micro hint flow remains covered: first screen stays short, detailed guidance stays behind additional options.
- Download dialog declutter remains covered: initial receipt/checklist hidden until an action happens.

### Bulk import / render / mastering / decode

- v1.4.26 Render Scheduler + Bulk Import UI Throttle remains covered for 35-track imports.
- v1.4.26 Mastering Queue Throttle remains covered for progress render batching and final flush.
- Audio Decode Memory Guard remains covered with diagnostics, ArrayBuffer release, active decode warning, and recent events.
- Bulk Import HUD remains covered for 35곡 import, scrollable row list, 전체 진행률, per-track states, and 스크롤 behavior.
- 35곡 대량 업로드 should show Bulk Import HUD rows, keep decode sequential, and keep the list bounded/scrollable.

### Manual matrix quick list

| Area | Required current behavior |
| --- | --- |
| Exit Guard | confirm opens once, cancel restores guard, leave tries history/back/close/fallback. |
| Dock mini FFT | Dock mini FFT removed; `#bottomPreviewSpectrum` should not exist. |
| Spectrum | external analyser coverage remains available for translated/difference playback. |
| Download | action clarity, flow polish, micro hint, diagnostics follow-up, and declutter remain covered. |
| Import | v1.4.26 Render Scheduler + Bulk Import UI Throttle and Bulk Import HUD cover 35곡 with 스크롤 rows. |
| Mastering | v1.4.26 Mastering Queue Throttle keeps progress renders batched. |
| Decode | Audio Decode Memory Guard tracks active/failure state and releases binary buffers. |

## Exact carry-forward smoke anchors

- Chrome Android: back confirm, download, and import flow are included.
- Safari iOS: back confirm, share/download, and PWA-like leave fallback are included.
- PWA: direct launch leave fallback is included.
- beforeunload and popstate are still installed while meaningful workspace state exists.
- runtime health does not require `renderMini`; detail-only FFT uses `renderPanel`.
- Performance diagnostics remain available through `?perf=1`, localStorage, and keyboard toggle.
- v1.4.26 Download flow polish: recommended action first, compact steps, Advanced actions are hidden behind 추가 옵션.
- Diagnostics copy / 진단 복사 remains available from advanced download actions.
- v1.4.26 Download action clarity: buttons carry `data-download-action` and recommended action metadata.
- v1.4.26 Download dialog micro hint: first-screen hint stays compact and detailed steps stay secondary.
- v1.4.26 Download dialog first-screen declutter: initial receipt/checklist stays hidden until action.
