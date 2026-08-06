# FoxBear v1.6.72 Patch Notes

## 적용 방식

1. `foxbear-mastering-studio-v1.6.72-patch.zip`을 v1.6.71 저장소 최상위 폴더에 압축 해제하고 모두 덮어씁니다.
2. GitHub Desktop에서 변경 파일을 커밋하고 **Push origin**을 실행합니다.
3. 저장소 자체도 정리하려면 `npm run source:hygiene:repair`를 한 번 실행하고 표시되는 삭제 변경을 추가 커밋합니다.

## 이번 패치 핵심

- 정상 GitHub Pages 워크플로를 `strict`에서 정책 기반 `ci-safe` 소스 위생 모드로 전환했습니다.
- `.firebaserc`, `.firebase/hosting..cache`, `qa/static-audit.txt`가 커밋돼 있어도 Actions의 임시 작업 공간에서만 안전하게 제거한 뒤 엄격 검사를 계속합니다.
- 허용된 정리 항목은 오류가 아니라 GitHub warning annotation으로 표시됩니다.
- `.env.production` 같은 비밀 가능 파일과 허용 목록 밖 파일은 자동 삭제하지 않고 계속 실패합니다.
- 명시적 `strict` 감사 모드는 그대로 남아 있어 저장소를 변경하지 않는 검사를 실행할 수 있습니다.

## 검증 결과

- 정적·행동 회귀: **427/427 통과**.
- 실제 GitHub Actions 환경 변수에서 보고된 세 경로 자동 정리 후 엄격 검사 통과.
- 비밀 가능 파일 자동 삭제 금지 및 오류 annotation 유지.
- Functions 구문, 브라우저 사전 점검, App Check 정책, 버전·SRI·인수인계 검사 통과.
- Firebase Hosting 경계: **156개 파일**.
- 전체 ZIP: **735개 파일**. 패치: **293개 선언 파일 + `PATCH_MANIFEST.json`**, 삭제 경로 7개.
- v1.6.71 기준 실제 적용 재현: **735/735 완전 일치**.

## 검증 명령

```bash
npm run source:hygiene:gate
npm run version:check
npm run handoff:check
npm run check:static
npm run functions:check
npm run qa:browser:preflight
npm run hosting:check
npm run package:delivery
npm run package:verify:full
npm run package:verify:patch
```
