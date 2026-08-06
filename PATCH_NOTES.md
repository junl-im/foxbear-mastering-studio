# FoxBear v1.6.64 Patch Notes

## 적용 방식

1. GitHub Desktop에서 **Fetch origin**을 먼저 실행합니다.
2. `foxbear-mastering-studio-v1.6.64-patch.zip`을 저장소 최상위 폴더에 압축 해제합니다.
3. 같은 이름의 파일과 폴더는 모두 덮어씁니다.
4. `DELETE_PATHS.txt`에 적힌 로컬·생성 파일이 기존 저장소에 남아 있으면 삭제합니다.
5. GitHub Desktop에서 변경 파일을 확인한 뒤 커밋하고 **Push origin**을 실행합니다.

## 이번 패치 핵심

- 전체 프로젝트 ZIP과 덮어쓰기 패치 ZIP을 한 번에 생성하는 `npm run package:delivery`를 추가했습니다.
- 전달 파일명을 `-full.zip`, `-patch.zip`으로 고정했습니다.
- `.git`, `.firebase`, `.audit-results`, 실제 `.firebaserc`, 생성 QA 로그가 전달 패키지에 섞이지 않도록 검사를 강화했습니다.
- Git에 로컬 Firebase 상태나 비밀 환경 파일이 추적되면 릴리스 게이트가 실패하도록 했습니다.
- 패치 ZIP은 v1.6.63 기준 변경 파일만 포함합니다. v1.6.63 저장소 루트에 바로 덮어쓰며, 더 오래된 버전에는 full ZIP을 사용합니다.

## 검증 명령

```bash
npm run source:hygiene
npm run version:check
npm run handoff:check
npm run check:static
npm run package:delivery
npm run package:verify:full
npm run package:verify:patch
```
