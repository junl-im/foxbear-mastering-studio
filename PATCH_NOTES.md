# FoxBear v1.6.65 Patch Notes

## 적용 방식

1. GitHub Desktop에서 **Fetch origin**을 먼저 실행합니다.
2. `foxbear-mastering-studio-v1.6.65-patch.zip`을 저장소 최상위 폴더에 압축 해제합니다.
3. 같은 이름의 파일과 폴더는 모두 덮어씁니다.
4. `DELETE_PATHS.txt`에 적힌 로컬·생성 파일과 적용 확인용 `PATCH_MANIFEST.json`을 삭제합니다.
5. GitHub Desktop에서 변경 파일을 확인한 뒤 커밋하고 **Push origin**을 실행합니다.

## 이번 패치 핵심

- `siteVisits` 문서 ID를 `Firebase UID_날짜` 형식으로 고정해 같은 익명 사용자의 하루 중복 문서 생성을 차단합니다.
- 새로고침 등으로 같은 날 다시 기록되는 방문은 오류가 아니라 중복 제거 성공으로 처리합니다.
- Firestore Rules에서 방문 문서 ID와 신고 문서 ID가 데이터 필드와 정확히 일치해야 생성되도록 제한합니다.
- Callable 신고 API가 제출 키로 계산한 canonical report ID만 허용하고 임의 ID 요청은 거부합니다.
- v1.6.64 저장소에 패치 ZIP을 덮어쓰면 v1.6.65로 갱신됩니다. 더 오래된 버전에는 full ZIP을 사용합니다.
- 검증 결과: 415/415 회귀 통과, 전체 ZIP 708개 파일, 패치 manifest 281개 파일, 삭제 경로 7개, v1.6.64 기준 적용 재현 일치.

## 검증 명령

```bash
npm run source:hygiene
npm run version:check
npm run handoff:check
npm run check:static
npm run functions:check
npm run hosting:check
npm run package:delivery
npm run package:verify:full
npm run package:verify:patch
```
