# v1.6.83 patch notes

## 적용 내역

- v1.6.80 작업 방식 선택창 도입 이후 기존 Playwright 시나리오가 첫 진입 필수 오버레이에 가로막히지 않도록 공용 `navigateToApp()` fixture의 기본 세션 모드를 `expert`로 명시했습니다.
- 실제 첫 진입 선택창 검증은 `navigateToApp(page, { uiMode: false })`로 그대로 실행할 수 있어 제품 동작을 비활성화하지 않습니다.
- E2E 선택 모드를 `window.__FOXBEAR_E2E_UI_MODE__`에 노출해 CI 진단 시 fixture 상태를 확인할 수 있게 했습니다.
- `APPLY_PATCH_CLEANUP.cmd`를 추가하고 `.sh`/`.cmd` 정리 스크립트를 패치 ZIP 필수 파일로 지정했습니다.
- `PATCH_MANIFEST.json`은 계속 `DELETE_PATHS.txt` 삭제 대상으로 유지됩니다.

## 검증 결과

- v1.6.83 전용 회귀: **PASS**.
- 전체 정적·행동 회귀 **438/438 PASS** (`110/110`, `110/110`, `110/110`, `108/108`).
- Version / Functions syntax / App Check / source hygiene / handoff / browser preflight / Hosting 경계 **PASS**.
- Firebase Hosting 공개 경계 **161개 파일**.
- 실제 Playwright 브라우저 실행은 현재 컨테이너에서 의존성 설치/Chromium navigation 정책 제약으로 재현하지 못했으며 GitHub Actions에서 최종 확인해야 합니다.

## GitHub Desktop 적용

- v1.6.82 저장소 루트에 v1.6.83 patch ZIP을 풀어 덮어씁니다.
- **Windows:** `APPLY_PATCH_CLEANUP.cmd`를 실행합니다.
- **macOS/Linux:** `bash APPLY_PATCH_CLEANUP.sh`를 실행합니다.
- GitHub Desktop에서 `PATCH_MANIFEST.json`이 삭제로 표시되는지 확인한 후 코드 변경과 함께 Commit → Push origin 합니다.

# v1.6.82 patch notes

## 적용 내역

- 공용 모달과 작업 방식 선택창의 키보드 포커스 필터를 DOM 계층 기준으로 보강했습니다.
- `tabindex="-1"`, `aria-disabled="true"`, 숨겨진 부모, `inert` 부모, `aria-hidden` 부모 아래의 컨트롤이 Tab/Shift+Tab 순환에 잘못 포함되지 않도록 수정했습니다.
- 작업 방식 선택창은 공용 모달의 동일한 포커스 판정을 우선 재사용하고, 복구 경로에서는 동일 규칙의 로컬 fallback을 사용합니다.
- 해당 경계를 검증하는 v1.6.82 전용 회귀 테스트를 추가했습니다.

## 검증 결과

- v1.6.82 전용 회귀와 v1.6.81 작업공간 회귀: **PASS**.
- 전체 정적·행동 회귀 **437/437 PASS** (`110/110`, `110/110`, `110/110`, `107/107`).
- Version / Functions syntax / App Check / source hygiene / handoff / browser preflight / dependency structure / Hosting 경계를 통과했습니다.
- 최종 ZIP 파일 수와 검증 결과는 패키징 완료 후 반영합니다.

## 다음 예정

- 실제 Kakao/Android/iOS에서 화면 회전, 소프트 키보드, 브라우저 Back과 중첩 모달의 키보드 포커스를 실기기 점검합니다.

## GitHub Desktop 적용

- 패치 ZIP은 **v1.6.81 저장소 루트**에 풀어 모두 덮어쓴 뒤 `DELETE_PATHS.txt`의 경로를 삭제합니다.
- GitHub Desktop에서 수정/추가/삭제를 확인하고 Commit → **Push origin** 합니다.
- 전체 ZIP으로 교체할 때는 기존 `.git` 폴더를 보존합니다.

# v1.6.81 patch notes

## 적용 내역

- AI 마스터링에서 장식용 hero 문구, waveform, knobs를 숨겨 `불러오기 → 작업 대기열 → 분석` 흐름이 실제 작업면처럼 더 컴팩트하게 보이도록 다듬었습니다.
- 모바일 AI 모드에서는 비핵심 command-bar badge를 숨겨 Build, 작업 방식 전환, 설정 버튼의 터치 공간을 확보했습니다.
- 작업 중 다시 여는 작업 방식 선택창을 기존 공용 overlay/history manager에 편입했습니다. 선택적 팝업은 브라우저 Back으로 닫히고, 첫 필수 선택은 history에 넣지 않아 Back으로 우회할 수 없습니다.
- 선택창이 열려 있는 동안 `.app-shell`을 inert 처리하고 닫을 때 이전 상태를 복원합니다.
- 포커스 탐색이 computed style을 확인하도록 보강해 CSS로 숨긴 필수 선택창의 닫기 버튼이 Shift+Tab 순환에 들어가지 않습니다.
- 모바일 선택창의 글자 크기, 닫기/작업 방식 버튼 터치 영역, visual viewport 기반 최대 높이를 보강했습니다.

## 검증 결과

- v1.6.81 전용 접근성/overlay 회귀: **PASS**.
- 전체 정적·행동 회귀 **436/436 PASS** (`109/109`, `109/109`, `109/109`, `109/109`).
- Overlay/history v1.6.15, v1.6.16, v1.6.30~35 회귀 **PASS**.
- Version sync / Functions syntax / App Check policy / source hygiene / handoff / browser preflight / dependency structure / Hosting 경계 통과.
- Firebase Hosting 공개 경계 **161개 파일**.
- 전체 ZIP **756개 파일**, 패치 ZIP **297개 덮어쓰기 파일**, generated manifest 없음, 삭제 경로 **7개**.
- v1.6.80에 패치를 실제 적용한 결과 최종 트리와 **756/756 완전 동일** (`missing 0 / extra 0 / changed 0`)했습니다.

## 다음 예정

- 실제 Kakao/Android/iOS에서 키보드, 주소창, 회전, Back navigation, 긴 queue를 acceptance 합니다.
- 마스터링/다운로드 진행 중 AI ↔ 전문가 모드 반복 전환과 Service Worker generation transition을 장시간 스트레스 점검합니다.

## GitHub Desktop 적용

- 패치 ZIP은 **v1.6.80 저장소 루트**에 풀어 모두 덮어쓴 뒤 `DELETE_PATHS.txt`의 경로를 삭제합니다.
- GitHub Desktop에서 수정/추가/삭제를 확인하고 Commit → **Push origin** 합니다.
- 전체 ZIP으로 교체할 때는 기존 `.git` 폴더를 보존합니다.

# v1.6.80 patch notes

## 적용 내역

- 첫 진입 시 `AI 마스터링` / `전문가 모드` 작업 방식 선택 팝업을 추가했습니다.
- AI 마스터링은 기존 DOM과 상태를 그대로 재사용하면서 메인 작업면을 `불러오기 → 작업 대기열 → 분석` 1열로 단순화합니다.
- 파일열기/폴더열기는 한 줄 2분할을 유지하며, 기존 트랙 카드의 마스터링/다운로드 액션과 하단 Dock은 그대로 사용합니다.
- 전문가 모드는 v1.6.79의 전체 스튜디오 화면을 그대로 유지합니다.
- 상단 `작업 방식` 버튼으로 작업 중 언제든 모드를 바꿀 수 있고 queue/분석/마스터 결과/Dock 재생 상태를 초기화하지 않습니다.
- 첫 선택은 현재 브라우징 세션 동안 기억하며 새 세션에서는 다시 작업 방식을 고르게 합니다.

## 검증 결과

- v1.6.80 전용 작업 방식/레이아웃 회귀: **PASS**.
- 전체 정적·행동 회귀 **435/435 PASS** (`109/109`, `109/109`, `109/109`, `108/108`).
- Version sync / Functions syntax / App Check policy / source hygiene / handoff / browser preflight / Hosting 경계 통과.
- Firebase Hosting 공개 경계 **161개 파일**.
- 전체 ZIP **754개 파일**, 패치 ZIP **296개 덮어쓰기 파일**, generated manifest 없음, 삭제 경로 **7개**.

## 다음 예정

- 카카오/Android/iOS 실기기에서 최초 선택창 높이, 회전, 주소창/키보드 전환을 확인합니다.
- AI 마스터링에서 긴 작업 대기열, 마스터링 중 모드 전환, 다운로드 중 모드 전환을 실제 브라우저로 스트레스 점검합니다.
- Service Worker 업데이트와 모드 전환/재생/Dock 상태가 겹치는 세대 전환을 추가 점검합니다.

## GitHub Desktop 적용

- 패치 ZIP은 **v1.6.79 저장소 루트**에 풀어 모두 덮어쓴 뒤 `DELETE_PATHS.txt`의 경로를 삭제합니다.
- GitHub Desktop에서 수정/추가/삭제를 확인하고 Commit → **Push origin** 합니다.
- 전체 ZIP으로 교체할 때는 기존 `.git` 폴더를 보존합니다.

# v1.6.79 patch notes

## 적용 내역

- GitHub Actions에서 보인 `Source hygiene auto-repair: PATCH_MANIFEST.json` 사례를 재현했습니다. 이 annotation은 `ci-safe`가 legacy generated file을 제거했다는 warning이며 그 자체가 fatal exit는 아닙니다.
- 앞으로 GitHub Desktop 덮어쓰기 패치 ZIP에는 `PATCH_MANIFEST.json`을 넣지 않습니다. 패치를 풀어도 저장소 루트에 generated manifest가 새로 생기지 않습니다.
- `DELETE_PATHS.txt`에는 `PATCH_MANIFEST.json`을 유지해 이전 패치 세대에서 남은 파일을 삭제하도록 했고, strict source hygiene도 이 파일을 명시적으로 금지합니다.
- Git 메타데이터가 있는 패키징 환경에서는 manifest 없이도 patch ZIP 파일 집합이 실제 Git diff와 정확히 일치하는지 검증합니다.
- playback source retirement의 기존 45초 최대 대기값을 실제로 적용합니다. 오래된 paused/ended media reference는 무기한 Blob URL을 붙잡지 못하며, 실제 재생 중인 source는 계속 보호됩니다.

## 다음 예정

- 사용자가 보고한 Static release gate의 실제 fatal check 이름을 GitHub Actions 상세 로그에서 확인하면 해당 경로를 추가로 재현합니다. 이번 패치는 annotation 원인인 generated manifest 재생성을 제거합니다.
- 서비스워커 업데이트와 재생/다운로드가 겹치는 generation crossing, 장시간 background/resume, media element disposal을 계속 스트레스 점검합니다.

## GitHub Desktop 적용

- 패치 ZIP은 **v1.6.78 저장소 루트**에 풀어 모두 덮어쓴 뒤 `DELETE_PATHS.txt`의 경로를 삭제합니다.
- 특히 기존 `PATCH_MANIFEST.json`이 있으면 이번에 삭제 변경으로 잡혀야 합니다.
- GitHub Desktop에서 변경사항을 확인하고 Commit → **Push origin** 합니다.

## 검증 결과

- 정적·행동 회귀 **434/434 통과** (`109/109`, `109/109`, `109/109`, `107/107`).
- Version sync / Functions syntax / App Check policy / source hygiene / handoff / browser preflight / Hosting 경계 통과.
- Firebase Hosting 공개 경계 **159개 파일**.
- 전체 ZIP **750개 파일**, 패치 ZIP **296개 덮어쓰기 파일**, generated manifest 없음, 삭제 경로 **7개**.

# v1.6.78 patch notes

## 적용 내역

- v1.6.77에서 `package.json`/`sw.js`와 `index.html`/404/외부 브라우저/문서 일부가 서로 다른 asset generation을 가질 수 있던 릴리스 동기화 누락을 교정했습니다.
- 전체 ZIP 검증 시 압축을 실제로 풀고 그 안에서 `tools/sync-release-metadata.js --check`를 실행하도록 강화해, 작업 트리만 정상이고 배포 ZIP이 혼합 세대인 상황을 차단합니다.
- GitHub Desktop delivery 생성도 패키징 전/소스 정리 후/전체 ZIP 생성 후 release metadata를 반복 검증하도록 강화했습니다.
- 패치 ZIP에 `index.html`이 포함되면 `package.json`의 product/asset version과 일치하는지 검증합니다.
- 다운로드 저장 도움창이 열린 동안 10분 ObjectURL 타이머가 파일 URL을 먼저 revoke하지 않도록 수명 소유권을 보강하고, BFCache 복귀 시 타이머를 갱신합니다.
- 마스터 출력 무효화 시 재생 중일 수 있는 `masteredUrl`을 즉시 revoke하지 않고 playback source recovery의 retirement 경로를 거쳐 안전하게 회수합니다.
- 과거 릴리스 QA가 현재 build ID를 옛 값으로 고정해 정상 버전업을 막는 역사 테스트 드리프트를 바로잡았습니다.

## 다음 예정

- 실제 모바일/카카오 환경에서 저장 도움창을 장시간 열어둔 뒤 파일 열기/공유가 유지되는지 확인합니다.
- 재생 중 설정 변경 → 출력 무효화 → 재마스터링 동안 Dock 재생 연속성과 retired URL 회수를 실기기에서 확인합니다.
- 장시간 세션에서 playback retired URL, download assist URL, variant cache를 함께 스트레스 테스트합니다.

## GitHub Desktop 적용

- 패치 ZIP은 **v1.6.77 저장소 루트**에 풀어 모두 덮어쓴 뒤 `DELETE_PATHS.txt` 경로가 남아 있으면 삭제합니다.
- GitHub Desktop에서 수정/추가/삭제를 확인하고 Commit → **Push origin** 합니다.
- 전체 ZIP으로 교체할 때는 기존 `.git` 폴더를 보존합니다.

## 검증 결과

- 정적·행동 회귀 **433/433 통과** (`109/109`, `109/109`, `109/109`, `106/106`).
- Version sync / Functions syntax / App Check policy / source hygiene / handoff / browser preflight / Hosting 경계 통과.
- Firebase Hosting 공개 경계 **159개 파일**.
- 전체 ZIP **748개 파일**, 패치 ZIP **295개 덮어쓰기 파일 + `PATCH_MANIFEST.json`**, 삭제 경로 **7개**.
- 전체 ZIP 내부에서도 release metadata 검사를 다시 수행하도록 패키지 검증이 강화되었습니다.

# v1.6.77 patch notes

## 적용 내역

- MP3/WAV 파생 변환 캐시를 곡별 제한뿐 아니라 전체 작업공간 기준으로도 제한합니다. 저메모리/모바일은 64 MiB·2개, 일반 환경은 192 MiB·5개를 넘으면 오래된 변환본부터 제거합니다.
- 캐시 계측은 `WeakRef`를 사용해 계측 자체가 원본 Blob을 붙잡지 않게 했고, 트랙 제거/마스터 출력 무효화 시 해당 파생 캐시를 명시적으로 비웁니다.
- 서로 다른 경미한 복구 오류 3건이 우연히 모였다고 반복 장애로 경고하지 않도록 runtime fault burst 판정을 정밀화했습니다. 동일 오류 3회 또는 전체 6회 수준에서 진단 경고를 올립니다.
- 성능 진단에 다운로드 variant cache 사용량/상한을 포함하고 85% 이상이면 cache-pressure 경고를 표시합니다.
- incident 분/시간/KST 일일 제한의 `retryAfterSeconds`를 실제 다음 버킷 경계까지의 시간으로 계산합니다.
- 모바일 화면 회전 및 BFCache/page restore 후 다운로드 시트의 visual viewport를 다시 동기화하고, 자동 다운로드 실패 안내가 두 번 뜨던 중복 토스트를 제거했습니다.

## 다음 예정

- 실제 카카오/Android/iOS에서 장시간 MP3↔WAV 반복 변환 후 Blob/AudioBuffer/variant cache 사용량을 관찰합니다.
- Firebase 배포 환경에서 admission 제한의 실제 retry 안내와 KST 자정 경계를 확인합니다.
- runtime fault 반복키가 실제 운영 장애 분류에 충분한지 보고 필요한 카테고리만 추가합니다.

## GitHub Desktop 적용

- 패치 ZIP은 **v1.6.76 저장소 루트**에 풀어 모두 덮어쓴 뒤 `DELETE_PATHS.txt`의 경로가 남아 있으면 삭제합니다.
- GitHub Desktop에서 수정/추가/삭제를 확인하고 Commit → **Push origin** 합니다.
- 전체 ZIP으로 교체할 때는 기존 `.git` 폴더를 보존합니다.

## 검증 결과

- 정적·행동 회귀 **432/432 통과** (`108/108` × 4).
- Functions syntax / App Check policy / handoff / browser preflight / dependency structure / Hosting 경계 / version sync 통과.
- Firebase Hosting 공개 경계 **159개 파일**.
- 전체 ZIP **747개 파일**, 패치 ZIP **293개 덮어쓰기 파일 + `PATCH_MANIFEST.json`**, 삭제 경로 **7개**.
- 실제 v1.6.76 전체 트리에 패치를 덮어쓰고 삭제 목록을 적용한 결과가 v1.6.77 전체 트리와 완전히 동일했습니다 (`missing 0 / extra 0 / changed 0`).

# v1.6.75 patch notes

## 적용 내역

- 다운로드/저장 팝업의 데스크톱 최대 높이를 늘리고 모바일 시트를 `98dvh` 범위까지 사용하도록 조정해 세로 공간을 조금 더 확보했습니다.
- 파일 변환/인코딩 진행 카드를 파일명 설정보다 위에 배치하고, 변환 시작 시 진행 영역이 팝업 안에서 자동으로 보이도록 스크롤 보정했습니다.
- 모바일 하단 고정 다운로드 버튼에 진행률이 가려지지 않도록 진행 카드 scroll margin과 시트 bottom scroll padding을 추가했습니다.
- Callable의 `resource-exhausted` 또는 incident emergency `disabled` 응답을 명시적인 admission 거절로 분류해 Firestore direct fallback으로 우회하지 못하게 했습니다.
- 같은 admission 거절을 신규 로컬 retry queue 항목으로 저장하지 않아 rate-limit 상황에서 재시도 큐가 불필요하게 쌓이지 않도록 했습니다.
- same-origin Callable 오류의 `details.reason` / `retryAfterSeconds`를 보존해 브라우저 경로가 달라도 서버 admission 의도를 유지합니다.

## 다음 예정

- 실제 카카오/Android/iOS에서 긴 MP3/WAV 변환 중 팝업 진행률 가시성 및 키보드/주소창 높이 변화 acceptance.
- auth / Firestore / service worker / incident queue / download decode 중 핵심 silent catch만 선별해 저소음 diagnostics counter로 연결.
- Firebase 실배포에서 admission `enabled/degraded/disabled`, TTL 삭제, SMTP 수신, rate-limit UX를 통합 검증.

## GitHub Desktop 적용

- 전체 ZIP은 새 폴더 또는 `.git`만 남긴 기존 작업 폴더에 풀어 교체할 수 있습니다.
- 패치 ZIP은 **v1.6.74 저장소 루트**에 그대로 풀어 모두 덮어쓴 뒤 `DELETE_PATHS.txt` 경로가 남아 있으면 삭제합니다.
- GitHub Desktop에서 수정/추가/삭제를 확인한 뒤 Commit → **Push origin** 순서로 적용합니다.

## 검증 결과

- 정적·행동 회귀 **430/430 통과** (`108/108`, `108/108`, `108/108`, `106/106`).
- Functions syntax / App Check policy / handoff / dependency structure / browser preflight / version sync 통과.
- Firebase Hosting 공개 경계 **158개 파일**.
- 전체 ZIP **742개 파일**, 패치 ZIP **290개 덮어쓰기 파일 + `PATCH_MANIFEST.json`**, 삭제 경로 **7개**.
- 실제 v1.6.74 전체 트리에 패치를 덮어쓰고 삭제 목록을 적용한 결과가 v1.6.75 전체 트리와 완전히 동일했습니다 (`missing 0 / extra 0 / changed 0`).

# v1.6.74 patch notes

## 적용 내역

- `submitIncidentReport`에 deterministic report ID 선중복 확인 후 UID별 1분/1시간/KST 일일 접수 예산을 적용하고, 익명 UID 교체 폭주를 완화하는 전역 1분/1시간 예산을 추가했습니다.
- `incidentMailState/admissionControl.mode`의 `enabled` / `degraded` / `disabled` 서버 비상 제어와 Callable `maxInstances: 4` 상한을 추가했습니다.
- Spark 전용 Firestore fallback 신고는 생성 즉시 `submissionTransport: firestore-fallback`과 약 30일 `expiresAt`을 기록하며, Callable이 없으면 `stored-no-mail-service` 상태로 구분합니다.
- 완성 마스터 Blob을 다른 다운로드 형식으로 다시 디코딩할 때도 초기 import와 동일한 low-memory/standard PCM·상주 메모리 한도를 전달하도록 보강했습니다.
- 브라우저 자동 오류신고의 일일 카운터 기준을 UTC 자정에서 KST 자정으로 통일했습니다.

## 다음 예정

- 실제 Firebase 배포에서 admission `enabled/degraded/disabled` 전환, TTL 삭제, 익명 UID churn 부하를 실환경 검증.
- 핵심 silent catch를 auth / Firestore / service worker / incident queue / download decode 진단 카운터로 선별 연결.
- 카카오/Android/iOS 실기기에서 긴 MP3/AAC/FLAC 재다운로드·포맷변환 메모리 acceptance 수행.

## GitHub Desktop 적용

- 전체 ZIP은 새 폴더 또는 `.git`을 제외하고 비운 기존 작업 폴더에 풀어 교체할 수 있습니다.
- 패치 ZIP은 **v1.6.73 저장소 루트**에 그대로 풀어 모두 덮어쓴 뒤 `DELETE_PATHS.txt`의 경로가 남아 있으면 삭제합니다.
- GitHub Desktop에서 수정/추가/삭제를 확인해 한 번에 Commit 후 **Push origin** 합니다.

## 검증 결과

- 정적·행동 회귀 **429/429 통과** (`108/108`, `108/108`, `108/108`, `105/105`).
- source hygiene / version sync / Functions syntax / App Check policy / handoff / dependency structure / browser preflight / Hosting 경계 검증 통과.
- Firebase Hosting 공개 경계 **158개 파일**.
- 전체 ZIP **740개 파일**, 패치 ZIP **290개 덮어쓰기 파일 + `PATCH_MANIFEST.json`**, 삭제 경로 **7개**.
- 실제 Firebase Console TTL/admission-control 전환 및 SMTP 발송은 배포 후 운영 acceptance 대상입니다.

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
## v1.6.76
- Mobile download progress follows visualViewport and stays unobscured during encoding.
- Added bounded recoverable runtime fault diagnostics for selected silent fallback paths.

