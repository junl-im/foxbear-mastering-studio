# QA Report — v1.3.50 Release Stabilization / Export Reliability

## Scope

- 다운로드/공유 완료 흐름 안정화
- 카카오/인앱 브라우저 fallback 안내 강화
- 완료 트랙 export-ready 패널 추가
- Dock 높이 변화에 따른 Toast/Download Assist/Processing HUD 위치 보강

## Checks

- `showDownloadOptionsDialog()`가 v3 패널, 브라우저 환경 박스, 선택 포맷 요약, 다운로드/공유/저장 도움/주소 복사/외부 브라우저 흐름을 포함하는지 확인했습니다.
- `getDownloadEnvironmentInfo()`가 인앱 브라우저, 파일 공유, 다운로드, File System Access 지원 상태를 하나의 구조로 반환하는지 확인했습니다.
- `createTrackExportReadyPanel()`이 완료된 트랙 카드에 파일 포맷/크기/환경별 안내를 표시하는지 확인했습니다.
- `saveBlobWithPicker()`의 중복 `suggestedName` 키를 정리했습니다.
- `qa/export_reliability_smoke.js`를 추가했습니다.

## Result

PASS — export reliability smoke, SRI, existing runtime/smoke/engine QA checks passed.
