# GitHub Desktop Patch Handoff

FoxBear 패치는 **GitHub Desktop을 기본 Git 클라이언트로 사용하는 흐름**을 기준으로 전달합니다. 명령줄 Git 사용을 전제로 하지 않습니다.

## 작업 결과 보고 규칙

작업 완료 보고는 `진행된 내용`, `배포 파일 2종`, `다음 예상 내용`의 세 구역만 사용합니다. 배포 파일은 전체 릴리스 ZIP과 누적 덮어쓰기 ZIP을 항상 함께 전달합니다.

## v1.5.65 적용 확인

- `functions/index.js`, `firestore.rules`, `src/firebase-bootstrap.js`, `src/ui/admin-incident-monitor-view.js`, `index.html` 변경을 모두 확인합니다.
- 보조 웹훅을 사용할 때만 Firebase Functions 환경에 `FOXBEAR_INCIDENT_ALERT_WEBHOOK_URL`을 설정합니다. 실제 URL은 저장소나 커밋에 넣지 않습니다.
- 배포 후 관리자 오류 화면에서 일괄 복구 버튼, 최근 자동 복구 결과, 24시간 추세가 표시되는지 확인합니다.

## 적용 전

1. GitHub Desktop에서 FoxBear 저장소를 선택합니다.
2. 상단의 `Fetch origin`을 눌러 원격 변경 사항을 먼저 확인합니다.
3. 작업 중인 변경이 보이면 먼저 커밋하거나 보관한 뒤 패치를 적용합니다.
4. 안전하게 검토하려면 `Current Branch`에서 새 패치 브랜치를 만듭니다.

권장 브랜치 이름:

```text
patch/v1.5.46
```

## 누적 덮어쓰기 ZIP 적용

1. ZIP을 임시 폴더에 먼저 풉니다.
2. ZIP 안의 파일과 폴더를 **저장소 루트**로 복사합니다.
3. Windows 또는 macOS의 교체 확인 창에서 기존 파일 교체를 허용합니다.
4. `foxbear-mastering-studio-v...-overwrite` 폴더 자체를 저장소 안에 넣지 않습니다.
5. 저장소 루트에 `package.json`, `playwright.config.js`, `.github`, `src`, `qa`가 나란히 보여야 합니다.

## GitHub Desktop에서 확인

`Changes` 탭에서 다음 파일이 이번 패치에 포함됐는지 확인합니다.

```text
package.json
package-lock.json
playwright.config.js
.github/workflows/pages.yml
.github/workflows/pages-branch-fallback.yml
HANDOFF.md
HANDOFF_PACKAGE.json
```

패치 설명에 삭제 대상이 있을 때는 `HANDOFF_PACKAGE.json`의 `deletePaths`도 확인합니다. 현재 목록이 비어 있으면 추가 삭제 작업은 없습니다.

## 선택적 로컬 사전 검사

GitHub Desktop의 저장소 메뉴에서 터미널 또는 명령 프롬프트를 열 수 있는 환경이라면 다음을 실행합니다.

```bash
npm ci
npm run handoff:check
npm run check
```

명령줄을 사용하지 않는 경우에도 GitHub Actions의 `Run release gate`가 같은 핵심 검사를 수행합니다.

## 커밋과 푸시

1. GitHub Desktop의 변경 목록을 검토합니다.
2. Summary에 패치 메시지를 입력하고 `Commit to ...`를 누릅니다.
3. 새 브랜치라면 `Publish branch`, 기존 원격 브랜치라면 `Push origin`을 누릅니다.
4. GitHub에서 Actions 실행 결과를 확인합니다.
5. 실패하면 생성된 `browser-qa-*` 아티팩트와 로그를 보존합니다.

권장 커밋 메시지:

```text
Apply FoxBear v1.5.27 handoff patch
```

## 실패 시 먼저 볼 것

- GitHub Desktop의 Changes 목록에 `playwright.config.js`가 있었는지
- ZIP 폴더가 저장소 안에 한 단계 중첩되지 않았는지
- `package.json`과 `HANDOFF.md`의 버전이 같은지
- Actions 로그에서 `handoff:check`, 정적 QA, 브라우저 QA 중 어느 단계가 실패했는지
- 실패 아티팩트가 생성됐는지
