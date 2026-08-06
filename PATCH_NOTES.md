# FoxBear v1.6.70 Patch Notes

## 적용 방식

1. GitHub Desktop에서 **Fetch origin**을 실행합니다.
2. `foxbear-mastering-studio-v1.6.70-patch.zip`을 v1.6.69 저장소 최상위 폴더에 압축 해제하고 모두 덮어씁니다.
3. `npm run source:hygiene:repair`를 실행합니다.
4. GitHub Desktop에서 변경과 삭제를 함께 커밋하고 **Push origin**을 실행합니다.
5. Static release gate와 Browser release gate 결과를 확인합니다.

## 이번 패치 핵심

- PWA 공유 파일을 실제 비동기 가져오기 완료 전에 삭제하거나 성공 처리하지 않습니다.
- 일시적 가져오기 실패 시 공유 기록과 URL을 유지해 새로고침 재시도를 허용합니다.
- IndexedDB 공유 임시 데이터에 24시간·8개·총 768 MiB 복합 제한을 적용합니다.
- 공유 제목·본문·URL 보조 메타데이터 길이를 제한합니다.
- 배포 Functions와 클라이언트의 App Check 정책 버전·모드·사유가 다르면 관리자 진단에서 경고합니다.
- fallback 배포는 정적 검사를 통과한 뒤에만 브라우저 범위를 계산하고 Chromium을 설치합니다.
- 순수 버전 변경은 full/patch 검증 명령 경로 차이 때문에 브라우저 전체 QA로 오인하지 않습니다.
- 오디오 마스터링 엔진과 출력 품질 로직은 변경하지 않습니다.

## 검증 결과

- 정적·행동 회귀: 421/421 통과 (`106/106`, `105/105`, `105/105`, `105/105`).
- Functions 구문, 브라우저 사전 점검, 버전·SRI·인수인계·소스 위생 검사 통과.
- Firebase Hosting 허용 경계: 153개 파일 통과.
- 의존성 구조 오류 0개, 미설치 경고 5개.
- 전체 ZIP: 723개 파일.
- 패치 ZIP: 변경·추가 285개 파일 + `PATCH_MANIFEST.json`, 삭제 경로 7개.
- v1.6.69 기준 실제 적용 재현: 723/723 완전 일치.
- 실제 Chromium/PWA 공유, 저장소 quota 강제 실패, 배포 Firebase 검증은 외부 확인 항목입니다.
- npm 온라인 취약점 감사는 현재 미러 audit endpoint의 HTTP 404로 실행하지 못했습니다.

## 검증 명령

```bash
npm run source:hygiene:repair
npm run source:hygiene
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
