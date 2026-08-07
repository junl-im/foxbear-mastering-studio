# v1.6.73 patch notes

## 적용 내역

- `404.html`의 인라인 style/script를 제거하고 `assets/css/route-recovery.css`, `src/boot/route-recovery.js`로 분리해 Firebase Hosting CSP와 충돌하지 않게 수정.
- 메타데이터 메모리 probe 실패 시 큰 파일을 무조건 통과시키던 흐름을 제한하고, 실제 디코딩 완료 직후 PCM/상주 메모리를 다시 검사하도록 보강.
- Functions 운영 메일 주소를 `FOXBEAR_ALERT_RECIPIENT`, `FOXBEAR_ALERT_SENDER` 환경변수로 덮어쓸 수 있게 추가.
- `.firebaserc`, `.firebase/`, 생성 QA 텍스트, stale `PATCH_MANIFEST.json`을 배포 소스에서 제거.

## 다음 예정

- App Check 비활성 운영 환경에서 anonymous incident submission의 사용자/시간 단위 rate-limit 및 Spark fallback 보존정책 점검.
- 메모리 probe의 압축 포맷별 샘플레이트/채널 불확실성 모델 고도화와 실제 모바일 WebView 장시간 파일 검증.
- 핵심 복구 경로의 silent catch를 runtime diagnostics counter로 연결해 장애 추적성을 높이는 작업.

## GitHub Desktop 적용

- 전체 ZIP: 기존 폴더를 비우거나 별도 폴더에 새로 풀어 교체 가능.
- 패치 ZIP: 저장소 루트에 덮어쓴 뒤 `DELETE_PATHS.txt`에 적힌 경로가 남아 있다면 삭제. GitHub Desktop에서 수정/추가/삭제 파일을 확인 후 커밋.

## 검증 결과

- 정적·행동 회귀 **428/428 통과** (`107/107` × 4).
- source hygiene / version sync / Functions syntax / Hosting 경계 검증 통과.
- Firebase Hosting 공개 경계 **158개 파일**.
- 전체 ZIP **738개 파일**, 패치 ZIP **292개 덮어쓰기 파일 + `PATCH_MANIFEST.json`**, 삭제 경로 7개.
- 실제 카카오 WebView 장시간 음원과 배포된 Firebase 메일 환경변수는 운영 환경에서 최종 확인 예정.

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
