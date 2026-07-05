# QA Report — v1.3.56 File/Folder Open Hotfix

## 목적
모바일/PWA/인앱 브라우저 환경에서 `파일열기`, `폴더열기`, `레퍼런스 파일` 버튼이 조용히 실패하는 문제를 줄이고, 배포 시 서비스워커가 이전 앱 shell을 계속 제공하는 문제를 방지한다.

## 수정 범위
- 파일 열기 버튼을 `openUploadPicker('file')` 경로로 통합
- 폴더 열기 버튼을 `openUploadPicker('folder')` 경로로 통합
- File System Access API 지원 환경에서는 `showOpenFilePicker`, `showDirectoryPicker` 우선 사용
- 미지원/차단 환경에서는 기본 `<input type="file">` fallback 사용
- 폴더 선택 미지원 브라우저에서는 여러 파일 선택으로 대체 안내
- `input[type=file].hidden`을 `display:none`이 아닌 off-screen 방식으로 변경해 모바일 programmatic click 안정성 개선
- 서비스워커 HTML/navigation fetch를 network-first로 변경해 업데이트 후 이전 캐시가 계속 뜨는 문제 완화

## 검증
- `node --check src/app.js`
- `node --check sw.js`
- `node qa/file_folder_open_hotfix_smoke.js`
- `npm run check`

## 결과
통과.
