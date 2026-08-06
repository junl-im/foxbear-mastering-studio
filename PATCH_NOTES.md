# FoxBear v1.6.66 Patch Notes

## 적용 방식

1. GitHub Desktop에서 **Fetch origin**을 실행합니다.
2. `foxbear-mastering-studio-v1.6.66-patch.zip`을 저장소 최상위 폴더에 압축 해제하고 모두 덮어씁니다.
3. GitHub Desktop에서 변경 파일을 커밋하고 **Push origin**을 실행합니다.
4. 이번 버전부터 GitHub Actions 정적 게이트가 알려진 생성 파일을 안전하게 정리한 뒤 엄격한 검사를 다시 실행하므로, v1.6.65에서 발생한 동일 오류는 자동 복구됩니다.
5. 저장소에서도 해당 파일을 영구 삭제하려면 터미널에서 `npm run source:hygiene:repair`를 실행한 뒤 GitHub Desktop에 표시되는 삭제 변경을 한 번 더 커밋합니다.

## 이번 패치 핵심

- `.firebaserc`, `.firebase/`, `.audit-results/`, 생성 QA 텍스트만 자동 정리합니다.
- `.env`, `.env.production` 등 비밀 가능성이 있는 파일은 자동 삭제하지 않고 계속 릴리스 게이트를 실패시킵니다.
- 정리 직후 기존 `source:hygiene` 검사를 다시 실행하므로 게이트 기준을 낮추지 않습니다.
- `APPLY_PATCH_CLEANUP.sh`와 `npm run source:hygiene:repair`를 제공합니다.
- v1.6.65 저장소에 적용하는 변경분 패치입니다. 더 오래된 버전에는 full ZIP을 사용합니다.
- 검증 결과: 416/416 회귀 통과, 전체 ZIP 712개 파일, 패치 283개 선언 파일 + manifest, 삭제 경로 7개, stale-file 포함 v1.6.65 기준 적용 재현 완전 일치.

## 검증 명령

```bash
npm run source:hygiene:repair
npm run source:hygiene
npm run version:check
npm run handoff:check
npm run check:static
npm run check:release
npm run package:delivery
npm run package:verify:full
npm run package:verify:patch
```
