# FoxBear v1.6.71 Patch Notes

## 적용 방식

1. GitHub Desktop에서 **Fetch origin**을 실행합니다.
2. `foxbear-mastering-studio-v1.6.71-patch.zip`을 v1.6.70 저장소 최상위 폴더에 압축 해제하고 모두 덮어씁니다.
3. `npm run source:hygiene:repair`를 실행합니다.
4. GitHub Desktop에서 변경과 삭제를 함께 커밋하고 **Push origin**을 실행합니다.
5. Static release gate와 Browser release gate 결과를 확인합니다.

## 이번 패치 핵심

- 동일 공유 ID를 여러 탭이 열어도 IndexedDB 원자적 lease를 획득한 탭 하나만 가져옵니다.
- 실제 가져오기 동안 heartbeat로 lease를 갱신하고, 실패 시 재시도 가능하게 claim을 해제하며 성공 시 소유권을 재확인한 뒤 삭제합니다.
- 서비스워커 활성화 전에 만료 claim만 복구하고 활성 공유 기록은 보존한 뒤 handoff 완료 메시지를 브로드캐스트합니다.
- 저장 공간 사전 점검과 `QuotaExceededError` 정리·1회 재시도를 추가하고, 활성 claim은 용량 정리에서도 삭제하지 않습니다.
- Android 공유 경계는 최대 12개, 파일당 220 MiB, 합계 512 MiB로 단일 정책 모듈에서 관리합니다.
- App Check 정책을 공개 JSON·Functions 계약·클라이언트 설정으로 동기화하고 배포 후 비교 게이트를 추가합니다.
- PWA 등록·캐시 워밍·공유 시작 오케스트레이션을 `pwa-runtime-bridge.js`로 분리했습니다.
- 오디오 마스터링 엔진과 출력 품질 로직은 변경하지 않습니다.

## 검증 결과

- 구성된 정적·행동 회귀: **426/426 통과**.
- 실제 시스템 Chromium에서 성공, 실패 후 새로고침 재시도, 두 탭 경합, 강제 IndexedDB 삭제 복구, Android 12개·512 MiB 경계, 서비스워커 claim handoff를 확인했습니다.
- Functions 구문, 브라우저 사전 점검, 버전·SRI·인수인계·App Check 정책·소스 위생 검사 통과.
- Firebase Hosting 허용 경계: **156개 파일** 통과.
- 루트 운영 의존성 공식 npm 감사: 취약점 0개.
- Functions 공식 npm 감사는 DNS `EAI_AGAIN`으로 완료하지 못했습니다.
- 배포 App Check 비교는 v1.6.71 배포 전이라 현재 환경에서 네트워크 검증을 완료하지 못했습니다.
- `src/app.js`: **13,242줄**, 13,300줄 제한 이내.
- 전체 ZIP: **733개 파일**. 패치 ZIP: **304개 선언 파일 + `PATCH_MANIFEST.json`**, 삭제 경로 7개.
- v1.6.70 기준 실제 적용 재현: **733/733 완전 일치**.

## 검증 명령

```bash
npm run source:hygiene:repair
npm run source:hygiene
npm run version:check
npm run appcheck:policy:check
npm run handoff:check
npm run check:static
npm run functions:check
npm run qa:browser:preflight
npm run hosting:check
npm run audit:prod:official
npm run functions:audit:official
npm run package:delivery
npm run package:verify:full
npm run package:verify:patch
```
