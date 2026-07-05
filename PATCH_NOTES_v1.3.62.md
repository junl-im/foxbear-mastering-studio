# FoxBear AI Mastering Studio Pro v1.3.62

## Audio Import Reliability Hotfix

- 파일/폴더 타일의 마우스/터치 클릭은 브라우저 기본 `<label for=fileInput>` 경로를 우선 사용하도록 복구했습니다.
- `showOpenFilePicker()` 실패 후 비동기 fallback이 사용자 활성화 밖에서 차단되는 문제를 피했습니다.
- 파일 선택 직후 선택 개수/등록 상태를 토스트로 표시하고, `handleFiles()`가 등록/무효/제한 결과를 반환하도록 정리했습니다.
- Web Audio `decodeAudioData()`를 Promise/콜백 호환 경로로 보강하고, 실패 시 미디어 엘리먼트 metadata 확인으로 코덱/컨테이너 원인을 더 명확히 표시합니다.
- 코덱 실패 메시지를 확장자별로 안내하여 WAV/MP3/M4A(AAC) 변환 또는 브라우저 변경을 빠르게 판단할 수 있게 했습니다.
- 배포 캐시 키와 SRI 해시를 v1.3.62로 갱신했습니다.
