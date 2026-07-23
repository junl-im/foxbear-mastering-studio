# FoxBear AI Mastering Studio Pro v1.5.80

## v1.5.80 모바일 복귀·MediaSession·포커스 복구

- 화면 잠금·통화·앱 전환 뒤 WebKit의 `interrupted` AudioContext를 다시 재개합니다.
- 복귀 이벤트와 재생 제스처가 동시에 들어와도 실제 `resume()`은 한 번만 실행합니다.
- 모바일 백그라운드 전환으로 저장한 Dock 위치와 재생 의도는 최대 12시간 유지합니다.
- 트랙 제거 후 남아 있던 MediaSession 메타데이터와 재생·정지·탐색 핸들러를 정리합니다.
- 네이티브 공유·직접 저장이 끝나면 실행 버튼으로 포커스를 복원하고 작업 중 모든 저장 도움 제어를 잠급니다.
- 구성된 정적·회귀 검사는 290/290 통과했으며 실제 잠금·통화·공유창은 기기 환경에서 최종 확인합니다.

## v1.5.79 미리듣기 요청 소유권 및 다운로드 정리

- 닫힌 미리듣기 UI의 지연된 `play()` 완료가 분리된 오디오를 다시 재생하지 못하도록 요청 세대를 격리합니다.
- 새 재생·정지·크로스페이드가 시작되면 이전 비동기 완료 결과는 현재 오디오 상태를 변경하지 않습니다.
- 저장 도움의 공유/직접 저장은 한 번에 하나만 실행되며 버튼과 패널에 `aria-busy` 상태를 제공합니다.
- 일반 페이지 종료 시 대기 중인 다운로드 Blob URL과 타이머를 일괄 회수하고 BFCache 이동에서는 유지합니다.
- VM 회귀 검사에서 지연 재생, 분리 오디오, 공유 버튼 연타, BFCache 및 페이지 종료 정리를 검증합니다.
- 구성된 정적·회귀 검사는 289/289 통과했습니다. 실제 네이티브 공유창과 파일 선택기는 기기 환경에서 추가 확인합니다.

## v1.5.78 재생 전환 레이스 복구

- 빠르게 재생·정지를 반복해도 취소된 볼륨 페이드 Promise가 영구 대기 상태로 남지 않습니다.
- 새 재생 요청이 들어온 뒤 이전 페이드아웃 완료 로직이 오디오를 뒤늦게 정지시키는 문제를 차단합니다.
- 교차 재생이 새 전환으로 대체되면 오래된 완료 콜백은 이전 소스를 정지하거나 볼륨을 덮어쓰지 않습니다.
- 오디오 요소에 연결된 RAF와 페이드 컨트롤러는 완료·취소 시 즉시 해제됩니다.
- VM 회귀 검사에서 페이드 교체, 빠른 일시정지/재생, 취소된 크로스페이드를 검증합니다.

## v1.5.77 런타임 자원 생명주기 복구

- DOM에서 제거된 오디오의 FFT 이벤트·캡처 스트림·분석 노드·AudioContext를 명시적으로 정리합니다.
- 비교 팝업 타이머와 미리듣기/Dock 오디오 등록을 UI 제거 시 즉시 해제합니다.
- 일반 종료와 BFCache 이동을 분리하고 모바일 visual viewport 변화에 패널 위치를 다시 계산합니다.

## v1.5.76 원자적 릴리스 동기화 및 의존성 진단

- 버전 동기화는 임시 스테이징 복사본에서 SRI와 메타데이터 검증을 모두 통과한 뒤 원본에 반영합니다.
- `npm run version:dry-run`으로 실제 파일을 바꾸지 않고 변경 예정 파일을 확인할 수 있습니다.
- 루트와 Functions의 `package-lock.json` 버전을 함께 동기화합니다.
- `npm run dependencies:check`는 Playwright, Chromium, Functions 패키지 설치 상태와 lockfile 불일치를 구분해 안내합니다.
- 스테이징 중 Python/SRI 실행이 실패해도 원본 릴리스 파일이 부분 수정 상태로 남지 않습니다.
- 추적 중이던 Python `__pycache__`를 제거하고 향후 바이트코드가 Git·패치에 다시 들어오지 않도록 차단합니다.

## v1.5.75 의존성 설치 전 정적 QA 안정화

- Playwright가 아직 설치되지 않아도 브라우저 보조 모듈과 릴리스 정적 검사를 불러올 수 있습니다.
- 실제 브라우저 QA를 시작할 때만 Playwright CLI를 확인하며, 누락 시 `npm ci`와 Chromium 설치 명령을 안내합니다.
- Playwright 설정 파일은 정적 메타데이터 검사에서는 안전한 대체 장치 정의를 사용하고, 실제 설치 환경에서는 공식 장치 프로필을 그대로 사용합니다.

Release metadata:

```text
product: 1.5.78
build: playback-transition-race-recovery
asset generation: 1.5.78-playback-transition-race-recovery
service worker cache: foxbear-shell-v1.5.78-playback-transition-race-recovery
```

## v1.5.74 다중 작업 제어 및 모바일 다운로드

- 현재 곡을 끝낸 뒤 다음 곡 직전에 일시정지하고 계속 진행할 수 있습니다.
- 현재 곡만 건너뛰거나 아직 시작하지 않은 곡의 순서를 위·아래로 변경할 수 있습니다.
- 배치 완료 후 완료·실패·건너뜀·취소·총 소요 시간 요약을 표시합니다.
- 모바일 다운로드 화면은 하단 전체 시트로 열리고 MP3/WAV 선택 후 세부 품질을 고릅니다.
- 다운로드·공유 버튼은 모바일 화면 하단에 고정되어 작은 화면에서도 가려지지 않습니다.


## v1.5.73 다중 마스터링 제어 및 예상 시간

- 진행 중 다중 마스터링을 안전하게 취소할 수 있습니다.
- 성공한 곡은 유지하고 실패 곡만 다시 실행할 수 있습니다.
- 현재 곡 남은 시간, 곡별 완료 예상 시간, 전체 예상 남은 시간을 목록에서 확인합니다.
- 전체·현재 진행·완료·실패·취소·대기 결과 필터를 제공합니다.
- 데스크톱과 모바일 대량 HUD의 화면 넘침·버튼 가림을 브라우저 회귀 계약으로 검사합니다.


## v1.5.72 다중 곡 작업 흐름 및 관리자 UI

- 여러 곡 분석 완료 후 목록 팝업을 자동으로 숨기고 전체 마스터링 버튼으로 이동합니다.
- 여러 곡 마스터링은 단일 HUD 대신 곡 목록에서 현재 진행률과 완료·오류 결과를 표시합니다.
- 관리자 간소화 보기, 미확인 테스트 보존형 정리, 감사 로그 검색·CSV, 모바일 카드 상세 화면을 제공합니다.


## v1.5.70 mail verification operations

- Automatic warnings for untested, stale, failed, and 30-minute receipt-unconfirmed mail tests.
- Administrator statistics, troubleshooting guidance, searchable test history, and CSV export.
- Real Gmail inbox or spam placement still requires explicit administrator confirmation after deployment.


## v1.5.69 핵심 변경

- 실제 메일 테스트 SMTP 접수 이력과 받은편지함·스팸함 실수신 확인 기록
- 7일 미검증 경고와 관리자 테스트 이력 표
- 전체 운영 메일의 공통 AI마스터링 스튜디오 브랜드 템플릿


- 관리자 작업의 시작·거부·완료·실패를 개인정보를 줄인 감사 로그로 기록합니다.
- 기본 보조 웹훅의 일시 오류를 제한 재시도하고 선택형 보조 URL로 장애 전환합니다.
- 배포 상태 검증이 실제 Firestore 복합 인덱스와 최근 운영 점검 상태를 확인합니다.
- 운영 이력은 상태·원인 필터와 페이지 단위 더 보기를 지원합니다.

## v1.5.66 핵심 변경

- 관리자 재전송·일괄 복구·경보 테스트·배포 검증 요청에 서버 실행 임대와 쿨다운을 적용합니다.
- 관리자 화면에서 보조 HTTPS 웹훅을 테스트하고 최근 운영 이력의 원인 코드와 권장 조치를 상세 확인합니다.
- 화면과 Functions 버전이 다르거나 배포 검증이 오래되면 자동 상태 검증을 요청합니다.

## v1.5.64 핵심 변경

- 15분마다 문제 보고 메일 시스템을 자체 점검합니다.
- Gmail 앱 비밀번호 형식과 실제 SMTP 인증·연결 상태를 관리자 화면에 표시합니다.
- 장기 미발송, 최종 실패 누적, 요약 실패, 예약 카운터 정체를 주의/위험으로 분류합니다.
- SMTP가 정상일 때 운영 경보와 복구 메일을 자동 발송합니다.
- 관리자 오늘 오류 수를 한국 시간(KST) 기준 서버 집계로 보정했습니다.

## v1.5.63 핵심 변경

- 문제 보고 메일 한도를 한국 시간 날짜로 계산하고, 한도 초과 신고를 다음 날 자동 이월합니다.
- 중단된 메일 예약 카운터를 신고별 소유권으로 회수해 장시간 발송 정지를 방지합니다.
- 일일 요약을 500건 단위로 집계하고 최근 3일 미발송 요약을 반복 복구합니다.
- SMTP 수신 승인과 Gmail 앱 비밀번호 형식을 서버에서 엄격히 확인합니다.

## v1.5.62 핵심 변경

- 문제 보고 문서를 처음부터 `pending` 메일 큐로 기록하고 상태별 감시 쿼리로 누락 신고를 회수합니다.
- 메일 작업 임대 ID와 완료 fencing을 적용해 만료 작업이 최신 재시도 상태를 덮어쓰지 못하게 했습니다.
- 최대 재시도 실패는 `dead-letter`로 분리하고 관리자 화면에서 강제 재전송할 수 있습니다.
- 전체 릴리스 ZIP과 누적 덮어쓰기 ZIP은 버전·인수인계 검사가 통과해야만 생성됩니다.

## v1.5.60 핵심 변경

- 카카오톡 링크 진입 시 외부 브라우저 안내로 강제 이동하지 않고 FoxBear 작업 화면을 우선 엽니다.
- 잘못된 경로 복구는 프로젝트 루트의 `index.html`로 직접 이동해 404 반복을 방지합니다.
- 카카오 메모리 압력이 높으면 디코딩 전과 처리 단계별로 Fast·경량 피크·압축 파형 경로를 자동 적용합니다.

## Historical patch: v1.5.57 Modal Close Consistency

프로그램 정보, 기능, 미리듣기, 관리자, 다운로드, AI 분석 완료, 저장 도움, 선택 팝업의 우측 상단 닫기 버튼을 동일한 크기·위치·아이콘·포커스 규칙으로 통합했습니다. 동적 팝업은 ESC 닫기와 기존 조작 위치로의 포커스 복귀도 지원합니다.

## Previous patch: v1.5.52 CI Parallel Release Gate

GitHub Actions 정적 QA와 Playwright 브라우저 QA를 병렬 job으로 실행하고, 새 push가 오면 이전 Pages 실행을 취소합니다. Playwright Chromium 다운로드 캐시와 npm 오프라인 우선 설치를 사용해 반복 빌드 대기시간을 줄입니다.


## Historical patch: v1.5.51 CI Runtime Contract Hardening

부팅 필수 모듈, 자산 버전, 서비스워커 캐시 세대가 서로 어긋난 상태로 배포되지 않도록 패키징 전 계약 검사를 강화합니다.

Release metadata:

```text
product: 1.5.49
build: stale-shell-generation-recovery
asset generation: 1.5.49-stale-shell-generation-recovery
service worker cache: foxbear-shell-v1.5.49-stale-shell-generation-recovery
```

## CI and local Git hooks

`npm ci` never installs Git hooks. GitHub Actions uses `npm ci --ignore-scripts`, and the optional local pre-commit hook is enabled only when a developer explicitly runs `npm run hooks:install`.

## Historical patch: v1.5.44 Gesture-Safe Individual Export Queue

여러 파일을 자동으로 연속 다운로드하지 않고, 파일을 미리 검증한 뒤 사용자가 `다음 파일 저장`을 한 번씩 눌러 저장합니다. 일반 Chromium은 직접 저장창, 일반 브라우저는 다운로드, 카카오 등 제한 브라우저는 지원되는 경우 파일 공유창을 사용합니다. 실패 파일은 다시 시도하거나 건너뛸 수 있으며, 큐 작업 중에는 마스터링·ZIP·서비스워커 교체가 차단됩니다.

Release metadata:

```text
product: 1.5.44
build: export-queue-gesture-safety
asset generation: 1.5.44-export-queue-gesture-safety
service worker cache: foxbear-shell-v1.5.44-export-queue-gesture-safety
```

Verification:

```text
static QA target: export queue order, retry/skip/cancel, runtime entry parity
manual browser target: repeated save prompts, multi-download blocking, Web Share, background return
```

## Previous patch: v1.5.27 Device Glyph and SRI Hardening

상단의 `모바일 · PC 호환` 앞에 청록색 데스크톱과 분홍색 스마트폰 라인 아이콘을 유지하고, 헤더 아래 경계선은 제거했습니다. v1.5.26에는 아이콘 HTML이 있어도 관리자 상태 확인 과정에서 `textContent`가 내부 아이콘 요소를 지우는 코드 꼬임이 있었으며, 이번 패치에서 구조를 안전하게 다시 그리도록 수정했습니다.

릴리스 점검 중 v1.5.26 ZIP의 마지막 CSS `<link>`에 `/ integrity=`가 들어간 잘못된 SRI 태그도 발견했습니다. SRI 갱신 도구가 기존 해시만 교체하고 잘못된 슬래시 위치는 복구하지 못했던 문제로, 갱신기와 검증기를 함께 강화했습니다.

Release metadata:

```text
product: 1.5.27
build: device-glyph-sri-hardening
asset generation: 1.5.27-device-glyph-sri-hardening
service worker cache: foxbear-shell-v1.5.27-device-glyph-sri-hardening
```

## Previous patch: v1.5.24 Responsive Preview Control and Visible Dialog Readiness

데스크톱과 모바일의 실제 표시 재생 버튼을 구분하는 반응형 계약은 그대로 유지됩니다.

## Previous patch: v1.5.23 Deterministic Preview Playback Readiness

단일 파일 분석 완료 시 자동 추천 팝업을 해당 E2E 시나리오에서만 격리하는 계약은 유지됩니다. v1.5.24는 그 위에 실제 표시 상태와 반응형 재생 컨트롤 선택을 추가합니다.

## Previous patch: v1.5.22 Header Signature and Uninterrupted Preview Routing

상단의 버전 정보, PC·모바일 호환, DESIGN BY 표시는 카드 테두리를 제거하고 화면에 새겨진 듯한 한 줄 시그니처로 정리했습니다. 설정 버튼은 작은 원형 기어로 축소해 제작자 문구와 소개 글이 아래로 밀리지 않도록 했습니다.

스마트폰·노트북·모노·스튜디오 전환은 더 이상 재생 중인 오디오 요소를 삭제하고 다시 만들지 않습니다. 하나의 `MediaElementSource`에 네 출력 경로를 미리 구성하고 Gain만 120ms 동안 교차 전환하므로 재생 위치와 재생 상태를 유지합니다.

Release metadata:

```text
product: 1.5.22
build: header-preview-routing-polish
asset generation: 1.5.22-header-preview-routing-polish
service worker cache: foxbear-shell-v1.5.22-header-preview-routing-polish
```

## Previous patch: v1.5.21 History and CSP Console Contract Fix

meta CSP 경고 제거와 history sentinel 왕복 검증은 그대로 포함됩니다.

 Idempotent PWA Cache Warm

서비스워커는 현재 릴리스 캐시에 없는 자산만 보충하며, 반복 warm은 추가 fetch 0회를 요구합니다. 일반 브라우저 테스트에서는 자동 전체 warm을 생략하고 서비스워커 전용 경로에서 명시적으로 검증합니다.

## Previous patch: v1.5.19 CI Runtime Isolation and Package Hardening

Firebase 선택 원격 통신 격리, 동일 출처 요청 실패·페이지 예외·콘솔 오류 분리, 로컬 서버 ownership probe, 아카이브 보안 검증은 그대로 포함됩니다.

## Previous patch: v1.5.18 CI Diagnostics and PWA Readiness

v1.5.18의 서비스워커 준비 최적화, Playwright 실패 요약, 정적 서버 로그 보존, 패키지 임시 산출물 차단은 그대로 포함됩니다.

## Previous patch: v1.5.17 Browser Contract Fix

수동 Wake Lock 요청 유지, Trusted Types 기반 서비스워커 등록, 헤더 설정 버튼 순서 수정은 그대로 포함됩니다.

## Previous patch: v1.5.16 E2E Static Server Pipe Deadlock Fix

GitHub Actions에서 첫 브라우저 테스트 몇 개만 통과한 뒤 모든 `page.goto()`가 20초 타임아웃으로 실패하던 문제를 수정했습니다. 로컬 Python 정적 서버의 요청 로그를 파이프로 수집하면서 Playwright를 `spawnSync`로 실행해 Node 이벤트 루프가 멈췄고, 로그 파이프가 가득 차면 서버 자체가 응답을 중단하는 구조가 원인이었습니다.

Playwright 실행을 비동기 자식 프로세스로 전환해 서버 로그를 계속 비우도록 했으며, 실패 시 정적 서버 로그 tail을 출력합니다. 1,800회 연속 요청 회귀 테스트로 일반적인 파이프 버퍼 용량을 넘어선 뒤에도 서버가 정상 응답하는 것을 검증합니다.

Release metadata:

```text
product: 1.5.16
build: e2e-server-pipe-deadlock-fix
asset generation: 1.5.16-e2e-server-pipe-deadlock-fix
service worker cache: foxbear-shell-v1.5.16-e2e-server-pipe-deadlock-fix
```

## Previous patch: v1.5.15 E2E Runtime Classification

Runtime Health의 선택적 Firebase/Firestore 네트워크 오류 분류, Wake Lock 및 서비스워커 E2E 안정화 변경은 그대로 포함됩니다.

## Previous patch: v1.5.12 CI Runtime Readiness and Node 24 Actions

Playwright now waits for the application-owned `FoxBearRuntimeHealth.appReady` state instead of treating creation of the health object as boot completion. Service-worker readiness is bounded and explicit, Wake Lock mocks use a fresh sentinel per request, and CI concurrency is capped at two browser workers. GitHub workflow JavaScript actions now use Node 24-based v6 releases.

Release metadata:

```text
product: 1.5.12
build: ci-runtime-readiness
asset generation: 1.5.12-ci-runtime-readiness
service worker cache: foxbear-shell-v1.5.12-ci-runtime-readiness
```

## Previous patch: v1.5.11 AudioContext Lifecycle and CI Navigation Stability

Web Audio context ownership is centralized through `FoxBearAudioContextManager`. Realtime mastering preview, difference A/B, preview translation, spectrum visualization, and decode operations now expose purpose/state diagnostics and release contexts through a common lifecycle.

The real-browser release gate no longer waits for global `networkidle`. It navigates to `domcontentloaded` and then waits for `FoxBearRuntimeHealth.appReady`, avoiding CI timeouts caused by optional Firebase, service-worker, or other persistent network activity. Failed GitHub Actions runs upload Playwright diagnostics automatically.

Release metadata:

```text
product: 1.5.11
build: audio-context-ci-stability
asset generation: 1.5.11-audio-context-ci-stability
service worker cache: foxbear-shell-v1.5.11-audio-context-ci-stability
```

## Previous patch: v1.5.10 Header Settings Relocation

The Settings trigger remains beside the `DESIGNED BY` card, with a body-level viewport-safe panel and independent Bulk HUD recovery control.

## Previous patch: v1.5.9 Version Display and Cache Recovery

Visible release labels remain synchronized from `FoxBearBuildInfo`, and stale PWA HTML recovery remains active.

## Previous patch: v1.5.8 PCM and ZIP Memory Hardening

Completed masters use `release-after-encode`; ZIP export uses STORE packaging and working-set limits with per-track fallback. Those memory protections remain active in v1.5.9.

## Previous patch: v1.5.6 Export Progress Recovery

Compatibility note: previous maintenance layer `v1.5.5 Update Safety` remains carried forward.

This patch adds a visible ZIP/export progress panel and `src/download/export-progress-view.js`, exposed as `FoxBearExportProgressView`, so large batch exports show readiness, memory warnings, ZIP generation progress, validation success/failure, and a fallback `곡별 다운로드 위치 보기` action. Boot-critical cache keys moved to `h=boot-sri-v156`, Update Safety moved to `h=update-safety-v156`, and the service worker shell cache generation is now `foxbear-shell-v1.5.6-export-progress-recovery`.

Console checks after deployment:

```js
FoxBearExportProgressView.getSnapshot()
FoxBearExportGuard.getReadiness()
FoxBearUpdateSafety.getReport()
```

## Previous patch: v1.5.5 Update Safety

Compatibility note: previous maintenance layer `v1.5.4 Boot SRI Recovery` remains carried forward.

This patch adds `src/boot/update-safety-service.js`, exposed as `FoxBearUpdateSafety`, to inventory local scripts/styles, detect boot cache-bust drift, classify SRI/load-block risk, and provide a copyable recovery plan. Boot-critical assets now use `h=boot-sri-v155`, the service worker shell cache generation is `foxbear-shell-v1.5.5-update-safety`, and service worker cache purge can be requested via `FOXBEAR_PURGE_CACHES` before unregister/reload recovery.

Console checks after deployment:

```js
FoxBearUpdateSafety.getReport()
FoxBearUpdateSafety.getAssetInventory()
FoxBearUpdateSafety.copyReport()
```

## Previous patch: v1.5.4 Boot SRI Recovery

Compatibility note: previous maintenance layer `v1.5.3 Bulk HUD Visibility + Inline Master All` remains carried forward.

This hotfix targets the reported boot-stall case where `src/boot/performance-diagnostics.js` and `src/app.js` can be blocked by stale cached bytes that no longer match the current SRI hash. The boot-critical scripts now use a fresh `h=boot-sri-v154` cache-bust key, the service worker shell cache generation was bumped to `foxbear-shell-v1.5.4-boot-sri-recovery`, and the Runtime Health recovery action now clears broader app/workbox/precache caches while updating and unregistering service workers before a hard reload.

## Previous patch: v1.5.3 Bulk HUD Visibility + Inline Master All

Compatibility note: previous maintenance layer `v1.5.2 Export Guard + Low Memory UX` remains carried forward.

This patch refines the large bulk import/mastering HUD: `접기` is renamed to `숨김`, hidden HUDs can be restored from a small `보이기` button beside the floating settings gear, and the HUD now exposes an inline `전체 마스터링` action that delegates to the existing main full-mastering button. It keeps the existing `1.4.26-wake-lock-state-sync` runtime/cache key for deployment compatibility while documenting the current maintenance layer as `v1.5.3`.

## Export Guard + Low Memory UX additions

- Added `src/download/export-guard-service.js` as the Export Guard layer for ZIP/export readiness checks.
- `downloadZip()` now builds a validated ZIP export plan before compression and validates the generated ZIP Blob before download.
- Added `FoxBearExportGuard.getReadiness()` and `FoxBearExportGuard.getDiagnostics()` for browser-console checks during 35-track export testing.
- Low-memory and large-output conditions now produce user-facing advice before/after batch memory sweeps and before ZIP export.
- The 35-track Playwright deep scenario now inspects Export Guard readiness before export.
- Added `qa/v152_export_guard_low_memory_smoke.js` to lock the new export validation and low-memory UX surface.

## Real Browser Automation additions

- v1.5.1 browser QA remains available through `npm run qa:browser`, `npm run qa:browser:external`, and `npm run qa:browser:deep`.

- Added `playwright.config.js` with desktop Chromium and mobile PWA-style Chromium projects.
- Added `qa/browser/run-browser-e2e.js`, which starts a local static server and then runs Playwright specs.
- Added shared browser helpers in `qa/browser/helpers/foxbear-e2e-helpers.js`, including synthetic WAV fixture generation, Runtime Health assertions, Wake Lock mocks, and service worker snapshots.
- Expanded browser specs for Runtime Health, console errors, PWA back navigation resilience, Wake Lock request/release mocking, service worker update checks, and 35-track import/master/export flow coverage.
- Added `npm run qa:browser`, `npm run qa:browser:external`, `npm run qa:browser:deep`, and `npm run qa:browser:install`.
- Added `qa/v151_real_browser_automation_smoke.js` to keep the browser automation surface checked by the default static QA suite.

## Engine Quality Gate additions

- Upgraded `src/audio/quality-gate-service.js` to QualityGate v2.1 with short-term LUFS checks, limiter overcorrection detection, de-esser overcorrection detection, multiband overcorrection detection, mobile translation correction amount checks, and risk flag summaries.
- Added short-term LUFS telemetry to `src/workers/master-finalizer.worker.js` and the in-app finalizer fallback.
- Extended `createMasterReport()` with `loudness.shortTermBefore`, `loudness.shortTermAfter`, and a 3s/1s short-term LUFS standard note.
- Added `src/audio/reference-profile-service.js` as the 64/96-band log-spectrum profile helper foundation for the next reference-matching upgrade.
- Preserved v1.4.29 memory policy behavior: completed download Blobs remain available while non-selected mastered AudioBuffers are released.
- Added `qa/v150_engine_quality_gate_smoke.js` to lock the new engine QA surface.

## v1.4.29 Memory Stabilization carry-forward

- Upgraded `src/audio/memory-guard-service.js` to v1.4.29 with a large-batch retention policy for completed mastered AudioBuffers.
- Added dynamic memory policy options for large batches, low-memory/mobile environments, selected-track retention, recent-track retention, and mastered-buffer byte budgets.
- Added `FoxBearMemoryGuard.diagnose()` for before/after memory diagnostics and policy sweep reporting from the browser console.
- Added automatic post-batch memory sweep after selected/all-track mastering batches complete.
- Added per-track performance memory metadata: `performanceInfo.masteredBufferBytes` and `performanceInfo.outBlobBytes`.
- Kept completed `outBlob` downloads and mastered URLs while releasing non-selected completed `masteredBuffer` objects according to policy.
- Preserved the v1.4.28 app slim-down orchestration boundaries:
  - `src/audio/import-queue-service.js`
  - `src/audio/mastering-orchestrator-service.js`
  - `src/audio/analysis-cache-service.js`
  - `src/audio/quality-gate-service.js`
  - `src/state/track-lifecycle-service.js`
- Added `qa/v1429_memory_stabilization_smoke.js` to lock the memory policy, diagnostics bridge, and docs.

## Runtime compatibility

The current release metadata is synchronized from `package.json`:

```text
1.5.7
1.5.7-release-foundation
```

Use `npm run version:sync` after a version/build change and `npm run version:check` before release. Cache-only changes use build/asset/revision fields rather than a second semantic product version.

## Memory diagnostics

After a large batch, open the browser console and run:

```js
FoxBearMemoryGuard.getSnapshot()
```

To force a diagnostic sweep and see before/after retention data:

```js
FoxBearMemoryGuard.diagnose()
```

The snapshot now reports retained mastered-buffer count/bytes, Blob bytes, preview Blob bytes, policy budget, low-memory mode, pressure level, released completed buffer count, and the largest retained mastered buffers.

## QA

Install reproducible dependencies and Chromium on a new machine:

```bash
npm ci
npm run qa:browser:install
```

Run fast static QA during development:

```bash
npm run check
```

Run the required release gate before packaging/deploying:

```bash
npm run check:release
```

For an already deployed URL:

```bash
FOXBEAR_E2E_URL=https://example.com npm run qa:browser:external
```

For the longer 35-track master/export path, run:

```bash
npm run qa:browser:deep
```

Playwright is pinned in `devDependencies`; `npm ci` and `package-lock.json` make the test runner reproducible.

## Historical notes

Older v1.4.21-v1.4.26 accumulated notes are preserved in:

```text
docs/history/README_legacy_v1.4.21_to_v1.4.26.md
docs/history/HANDOFF_legacy_v1.4.21_to_v1.4.26.md
docs/history/QA_REPORT_legacy_v1.4.21_to_v1.4.26.md
```

## Current invariant summary

- v1.5.7 detail-only FFT remains active; Dock mini FFT/renderMini stay removed. The decision is recorded in `docs/decisions/0001-dock-fft-removal.md`.
- Performance diagnostics can be opened with `?perf=1` or `Ctrl/Command + Alt + P`, and the diagnostics panel keeps a 복사 action for support reports.
- Download dialog micro hint and first-screen declutter remain active for Kakao/in-app and mobile download flows.
- Bulk Import HUD and Bulk Mastering HUD continuity remain active for 2+ track workflows.

## v1.5.3 Bulk HUD visibility and full-mastering action

- Renamed the large HUD toggle copy from `접기` to `숨김` so it clearly means hiding the whole large HUD.
- Added a small `보이기` restore button next to the floating settings gear; it appears only while a hidden bulk HUD batch is still restorable.
- Added `전체 마스터링` inside the large HUD and wired it to the existing main `#masterAllBtn` flow, with the same disabled/busy behavior.
- Added targeted stale-cache keys for the changed HUD/mobile/app assets and mirrored them in the service worker precache.
- Added `qa/v153_bulk_hud_visibility_masterall_smoke.js` to lock the UX and packaging surface.
