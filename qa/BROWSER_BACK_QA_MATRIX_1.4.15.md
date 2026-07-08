# FoxBear v1.4.21 Browser / Download QA Matrix

목표: v1.4.21 다운로드 영수증/상태 안내가 실제 저장 흐름을 방해하지 않고, 카카오/모바일 fallback 이해도를 높이는지 확인한다.

| 환경 | 확인 항목 | 기대 결과 |
| --- | --- | --- |
| KakaoTalk Android 인앱 | 다운로드 팝업 열기 | 추천 버튼은 공유/저장 또는 저장 도움으로 보이고, 영수증 카드에 다음 단계가 표시된다. |
| KakaoTalk Android 인앱 | 공유/저장 취소 | 저장 도움창으로 이어지고 영수증 카드가 fallback 상태를 설명한다. |
| Chrome Android | 다운로드 | 다운로드 버튼 추천, 다운로드 시작 후 브라우저 다운로드 목록 확인. |
| Chrome Android PWA | 저장 도움 | 파일 열기/공유/진단 복사 버튼이 잘리지 않고 터치 가능하다. |
| iOS Safari | 파일 공유 | 공유창 또는 저장 도움이 뜨고 영수증 카드가 다음 단계를 안내한다. |
| Desktop Chrome/Edge | 다운로드 | 기본 다운로드가 시작되고 팝업이 닫혀도 앱 상태가 유지된다. |
| 모든 환경 | 추가 옵션 | 주소 복사/안내 복사/진단 복사가 접힌 상태에서만 표시된다. |
| 모든 환경 | 뒤로가기 | 다운로드 팝업 또는 저장 도움창 표시 중 뒤로가기 guard가 중복 confirm을 띄우지 않는다. |

수동 확인 메모:
- 카카오 인앱에서는 Blob 자동 저장이 제한될 수 있으므로 공유/저장, 파일 열기, 외부 브라우저 안내 순서를 확인한다.
- 외부 브라우저로 이동하면 현재 메모리 Blob이 넘어가지 않을 수 있으므로 안내 문구가 충분히 보이는지 확인한다.

## Cumulative regression anchors retained in v1.4.21

- Safari iOS, Chrome Android, Kakao Android, Desktop Chrome/Edge, Android PWA, and iOS PWA remain in manual coverage.
- FFT external analyser coverage: preview translation and difference listen graphs should still register an external analyser tap.
- v1.4.21 stability / confirm focus: Back confirm debounce should avoid stacked confirm dialogs.
- Dock mini FFT remains intentionally removed; `#bottomPreviewSpectrum` should not exist.
- Dock FFT removal remains intentional and detail-only FFT remains the policy.
- renderMini cleanup remains intentional; `FoxBearSpectrumVisualizer.renderMini` should remain removed.
- Performance diagnostics remain available through `?perf=1`, `FoxBearPerformanceDiagnostics.getSummary()`, and snapshot copy.
- v1.4.21 Download flow polish: recommended flow card should show the current browser path.
- Advanced actions are hidden behind the 추가 옵션 toggle by default.
- Diagnostics copy / 진단 복사 should be available from the download flow for Kakao/mobile support.
- v1.4.21 Download action clarity: visible buttons should expose `data-download-action` metadata.
- v1.4.21 Download receipt polish: the receipt/status card should explain the action result and next steps.
- Packaging overwrite naming should continue following `package.json`.

## Browser navigation guard anchors

- beforeunload should still show the native refresh/close warning where the browser allows it.
- popstate should still run the app-level Back confirm guard.
- runtime health does not require `renderMini`.
