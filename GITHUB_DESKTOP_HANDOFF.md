# GitHub Desktop Handoff - v1.6.58

## Apply

1. Fetch origin before applying the overwrite ZIP.
2. Extract the overwrite ZIP into the repository root and replace matching files.
3. Confirm `.firebase/hosting..cache` is deleted, then run the release gates, review changes, commit, and Push origin.
4. Deploy the synchronized v1.6.58 cache generation only after an original/mastered WAV24 spot check.

## Release focus

- Piano and melodic-transient glass-risk analysis
- Risk-scaled high-frequency exciter, metallic notches, tone, preview, and limiter release
- One authoritative worker lookahead/True-Peak limiter in the normal mastering path
- Removal of redundant pre-finalizer drive and near-ceiling non-linear waveshaping
- Positive high-frequency glare detection and quality-gate reporting

## Production verification

- Compare the same 15-30 second piano passage in the original and v1.6.58 WAV24 at matched loudness.
- Keep pitch/BPM changes and added instrument layers disabled for the first comparison.
- Confirm the exported WAV in an external player/DAW, wired headphones, mono, and a phone speaker.
- Verify deployment logs still report the bounded Firebase Hosting payload and that the v1.6.58 service-worker cache is active.

# GitHub Desktop Handoff - v1.6.56

## Apply

1. Fetch origin before applying the overwrite ZIP.
2. Extract the overwrite ZIP into the repository root and replace matching files.
3. Run the release gates, review changes, commit, and Push origin.
4. Run `npm run deploy:spark` so Hosting receives the synchronized cache generation.

## Release focus

- Blob audio source recreation from retained File/Blob data
- Playback position and last-intent preservation
- Deferred previous-master URL retirement
- Near-zero stale volume reconciliation

## Production verification

- Leave mastered playback idle or backgrounded, return, and confirm the next Play action remains effective.
- Re-master while an older mastered source is still playing and confirm it is not interrupted before the player switches.
- Repeat in KakaoTalk, Chrome, Safari, and installed PWA environments.

# GitHub Desktop Handoff - v1.6.52

## Apply

1. Fetch origin before applying the overwrite ZIP.
2. Extract the overwrite ZIP into the repository root and replace matching files.
3. Run the release gates, review changes, commit, and Push origin.
4. Run `npm run deploy:spark` so Hosting receives the same cache generation.

## Release focus

- Kakao notice first-touch input safety and duplicate-execution cleanup
- Shared identical download conversion work
- Independent cancellation for each waiting dialog/action
- Source Blob snapshot isolation during master replacement

## Production verification

- Open FoxBear in KakaoTalk and tap directly above an upload or download control; confirm only the notice closes.
- Reload and confirm only one notice exists and it still auto-closes after eight seconds.
- Start two identical alternate-format requests and verify one conversion serves both.
- Cancel one waiting request and confirm the other completes.

# GitHub Desktop Handoff - v1.6.50

## Apply

1. Fetch origin before applying the overwrite ZIP.
2. Extract the overwrite ZIP into the repository root and replace matching files.
3. Run the release gates, review changes, commit, and Push origin.
4. Run `npm run deploy:spark` so Hosting receives the same cache generation.

## Release focus

- Large centered KakaoTalk in-app compatibility notice
- Mastered-file download warning before long processing begins
- External/default browser and PWA installation guidance
- First-touch/Escape smooth dismissal and eight-second auto-close
- Normal-browser and standalone-PWA suppression

## Production verification

- Open FoxBear from a KakaoTalk chat on Android and iOS.
- Confirm the notice is centered, readable, and above the studio.
- Touch the screen once and confirm the notice slides/fades away.
- Reload without touching and confirm it closes after eight seconds.
- Open the same URL in Chrome/Safari and from an installed PWA and confirm no Kakao notice appears.

# GitHub Desktop Handoff - v1.6.49

## Apply

1. Fetch origin before applying the overwrite ZIP.
2. Extract the overwrite ZIP into the repository root and replace matching files.
3. Run the release gates, review changes, commit, and Push origin.
4. Run `npm run deploy:spark` so Firebase Hosting receives the same release.

## Release focus

- One-entry, 64 MB bounded converted-download cache
- Repeated alternate-format download/share reuse
- Exact cached file-size display and immediate-reuse status
- Correct MP3-to-MP3 versus MP3-to-WAV quality guidance
- Existing post-master MP3/WAV quality selection and completed-output transcode fallback

## Production verification

- Convert a completed WAV master to MP3 320 kbps, close the dialog, and request MP3 320 kbps again.
- Confirm the second request prepares immediately without a new conversion progress cycle.
- Select another alternate format and confirm only the newest converted variant is reused.
- Verify MP3-source warnings separately for MP3 and WAV targets.

# GitHub Desktop Handoff - v1.6.48

## Apply

1. Fetch origin before applying the overwrite ZIP.
2. Extract the overwrite ZIP into the repository root and replace matching files.
3. Run the release gates, review changes, commit, and Push origin.
4. Run `npm run deploy:spark` so the secure Firebase Hosting fallback receives the same release.

## Release focus

- GitHub Pages popup-only Google authentication
- Delayed Firebase auth-state reconciliation after popup network errors
- Fixed Firebase Hosting secure-origin fallback with settings handoff
- Opaque cross-origin `Script error.` isolation
- Existing no-App-Check and `siteAdmins/{UID}` authorization policy

## Production verification

- Keep `jurl-img.github.io`, `foxbear-music.web.app`, and `foxbear-music.firebaseapp.com` in Firebase Authentication Authorized domains.
- Keep only the two Firebase Hosting `/__/auth/handler` URLs in the Google OAuth client.
- Verify administrator login from GitHub Pages and from `foxbear-music.web.app`.
- Confirm that the file-import banner remains normal during and after Google authentication.

# GitHub Desktop Handoff - v1.6.46

## Apply

1. Fetch origin before applying the patch.
2. Extract the overwrite ZIP into the repository root and replace matching files.
3. Run the release gates, review changes, commit, and Push origin.

## Release focus

- Same-origin Firebase Hosting `authDomain` selection
- Popup network failure to single redirect recovery
- Redirect-loop fencing and missing-result diagnostics
- Query-free Google authentication failure reporting
- Existing no-App-Check and `siteAdmins/{UID}` authorization policy

## Production setup after push

- Keep Anonymous and Google Authentication enabled.
- Keep `foxbear-music.web.app` and `foxbear-music.firebaseapp.com` in Authorized domains.
- Add both `/__/auth/handler` URLs from `FIREBASE_SETUP.md` to the Firebase Google OAuth web client.
- Run `npm run check:release`, then `npm run deploy:spark`.
- Clear site data once and retry administrator authentication.

# GitHub Desktop Handoff - v1.6.45

## Apply

1. Fetch origin before applying the patch.
2. Delete a pre-existing repository-root `cmd.exe` if present.
3. Extract the overwrite ZIP into the repository root and replace matching files.
4. Run release gates, review changes, commit, and Push origin.

## Release focus

- Windows-safe release-gate npm execution
- Spark Hosting executable-file exclusion and archive rejection
- Explicit no-App-Check runtime and deployment policy
- Firebase Google administrator authentication with `siteAdmins/{UID}` authorization

## Production setup after push

- Keep Firebase App Check enforcement disabled.
- In Firebase Authentication, enable Anonymous and Google providers.
- Confirm the production domain under Authorized domains.
- Run `npm run check:release`, then `npm run deploy:spark`.
- Create or verify the administrator document exactly as described in `FIREBASE_SETUP.md`.

# GitHub Desktop Handoff - v1.6.44

## Apply

1. Fetch origin before applying the patch.
2. Extract the overwrite ZIP into the repository root and replace matching files.
3. Run release gates, review changes, commit, and Push origin.

## Release focus

- Firebase Auth generated gapi module Trusted Types recovery
- Narrow `apis.google.com/_/scs/apps-static/_/js/` allowlist
- Query-free rejected-path diagnostics
- Spark-compatible Google administrator authentication

# GitHub Desktop Handoff - v1.6.43

## Apply

1. Fetch origin before applying the patch.
2. Extract the overwrite ZIP into the repository root and replace matching files.
3. Review changes, run the release gates, commit, and Push origin.

## Release focus

- Settings-based Firebase Google administrator authentication
- Spark-compatible deployment without administrator Secret Manager or Cloud Functions
- Verified Google provider/email plus active `siteAdmins/{UID}` Firestore authorization
- Visible UID handoff for one-time administrator registration
- Explicit Google logout and anonymous-session restoration
- Mandatory three-section delivery contract in `DELIVERY_RULES.md`
- Final configured checks: `386/386`; dependency metadata errors: `0`; expected missing-install warnings: `5`
- Final verified archive size: `678` entries in both full and overwrite ZIPs

## Production setup after push

- In Firebase Authentication, enable Anonymous and Google providers.
- Run `npm run deploy:spark`.
- Open Settings, sign in with `mcwoogi@gmail.com`, and copy the displayed Firebase UID.
- Create `siteAdmins/{UID}` using the exact fields in `FIREBASE_SETUP.md`.
- Sign in again and verify visit/error monitoring on the production domain.

# GitHub Desktop Handoff - v1.6.40

## Apply

1. Fetch origin before applying the patch.
2. Extract the overwrite ZIP into the repository root and replace matching files.
3. Review changes, run the release gates, commit, and Push origin.

## Release focus

- Replacement-aware critical script and stylesheet settlement
- Bounded post-load retry grace and silent-timeout failure conversion
- Stale failed-node isolation when a new resource loads successfully
- Mandatory three-section delivery contract in `DELIVERY_RULES.md`
- Final configured checks: `384/384`; dependency metadata errors: `0`; expected missing-install warnings: `5`
- Final verified archive size: `675` entries in both full and overwrite ZIPs

# GitHub Desktop Handoff - v1.6.39

## Apply

1. Fetch origin before applying the patch.
2. Extract the overwrite ZIP into the repository root and replace matching files.
3. Review changes, run the release gates, commit, and Push origin.

## Release focus

- Partial critical-script boot recovery and Runtime Health reporting
- Expired service-worker probe response isolation
- Client termination reconciliation and bounded shell-generation retry
- Mandatory three-section delivery contract in `DELIVERY_RULES.md`
- Final configured checks: `383/383`; dependency metadata errors: `0`; expected missing-install warnings: `5`
- Final verified archive size: `673` entries in both full and overwrite ZIPs

# GitHub Desktop Handoff - v1.6.38

## Apply

1. Fetch origin before applying the patch.
2. Extract the overwrite ZIP into the repository root and replace matching files.
3. Review changes, commit, and Push origin.

## Release focus

- UI-shell pending/failure classification and recovery resolution
- Runtime Health recovery-surface deduplication
- Controlled-client generation probes and safe legacy-cache retirement
- Final verified archive size: 670 entries in both full and overwrite ZIPs

# GitHub Desktop Handoff - v1.6.37

- Build ID: `ui-shell-cross-generation-recovery`
- Overwrite the repository root with the v1.6.37 overwrite package, review changes, commit, and push.
- Confirm the UI shell recovery JS/CSS, v1.6.37 regression, and audit document are present.
- Run `npm run check:static`, `npm run handoff:check`, and both package verifiers before deployment.
- Final configured checks: `380/380`; dependency metadata errors: `0`; expected missing-install warnings: `5`.
- Final full and overwrite archives contain `668` entries each.

# GitHub Desktop Handoff - v1.6.36

- Build ID: `sw-activation-generation-fencing-resource-stress`
- Overwrite the repository root with the v1.6.36 overwrite package, review changes, commit, and push.
- Run `npm run check:static`, `npm run handoff:check`, and both package verifiers before deployment.
- Confirm both v1.6.36 regressions and the audit document are present in the archive.
- Final configured checks: `378/378`; dependency metadata errors: `0`; expected missing-install warnings: `5`.

# GitHub Desktop Handoff - v1.6.35

- Build ID: `history-terminal-race-sw-activation-lease`
- Overwrite the repository root with the v1.6.35 overwrite package, review changes, commit, and push.
- Run `npm run check:static`, `npm run handoff:check`, and package verifiers before deployment.
- Final configured checks: 376/376; both archives contain 661 entries.

# GitHub Desktop Handoff - v1.6.34

- Apply the complete v1.6.33 overwrite package or commit the full release package.
- Keep the watchdog generation reconciliation and the no-duplicate-Back hard-stall rule together in `src/ui/modal-controller.js`.
- Run `npm run version:check`, `npm run handoff:check`, `node qa/v1633_overlay_history_watchdog_recovery_smoke.js`, and both package verification commands before publishing.
- Confirm the first `Current release` block in `HANDOFF.md` reports v1.6.33 and 373 configured checks.
- Confirm `DELIVERY_RULES.md`, the v1.6.33 audit document, and the v1.6.33 regression remain in both archives.
- Recommended branch: `patch/v1.6.33`.

# GitHub Desktop Handoff - v1.6.32

- Apply the complete v1.6.32 overwrite package or commit the full release package.
- Run `Fetch origin` before applying the patch and use `Push origin` only after all gates pass.
- Run `npm run version:check`, `npm run handoff:check`, `node qa/v1632_overlay_history_generation_bfcache_recovery_smoke.js`, and both package verification commands before publishing.
- Confirm the first `Current release` block in `HANDOFF.md` reports v1.6.32 and 372 configured checks.
- Confirm `modal-controller.js`, `site-guards.js`, the v1.6.32 audit document, and the v1.6.32 regression remain in both archives.
- Recommended branch: `patch/v1.6.32`.

# GitHub Desktop Handoff - v1.6.29

- Apply the complete v1.6.29 overwrite package or commit the full release package.
- Confirm `incident-submission-identity-service.js` loads before `firebase-bootstrap.js`, and `incident-controls-view-service.js` loads before `incident-reporter.js`.
- Run `npm run version:check`, `npm run handoff:check`, `node qa/v1629_incident_submission_fencing_adaptive_polling_smoke.js`, and both package verification commands before publishing.
- Confirm the first `Current release` block in `HANDOFF.md` reports v1.6.29 and 369 configured checks.
- Confirm both new runtime modules, the v1.6.29 audit document, and the v1.6.29 regression remain in both archives.
- Recommended branch: `patch/v1.6.29`.

# GitHub Desktop Handoff - v1.6.28

- Apply the complete v1.6.28 overwrite package or commit the full release package.
- Confirm `incident-diagnostics-view-service.js` loads after `incident-service-diagnostics.js` and before `incident-reporter.js`.
- Run `npm run version:check`, `npm run handoff:check`, `node qa/v1628_incident_lease_takeover_fallback_ui_smoke.js`, and both package verification commands before publishing.
- Confirm the first `Current release` block in `HANDOFF.md` reports v1.6.28 and 366 configured checks.
- Confirm the new view module, v1.6.28 audit document, and v1.6.28 regression remain in both archives.
- Recommended branch: `patch/v1.6.28`.

# GitHub Desktop Handoff - v1.6.27

- Apply the complete v1.6.27 overwrite package or commit the full release package.
- Confirm `incident-queue-coordination-service.js` loads after `incident-local-queue-service.js` and before `incident-reporter.js`.
- Run `npm run version:check`, `npm run handoff:check`, `node qa/v1627_incident_multitab_queue_ownership_stress_smoke.js`, and both package verification commands before publishing.
- Confirm the first `Current release` block in `HANDOFF.md` reports v1.6.27 and 364 configured checks.
- Confirm the coordination module, v1.6.27 audit document, and v1.6.27 regression remain in both archives.
- Recommended branch: `patch/v1.6.27`.

# GitHub Desktop Handoff - v1.6.26

- Apply the complete v1.6.26 overwrite package or commit the full release package.
- Confirm `incident-local-queue-service.js` and `incident-service-diagnostics.js` load after incident support and before `incident-reporter.js`.
- Run `npm run version:check`, `npm run handoff:check`, `node qa/v1626_incident_diagnostics_queue_conflict_safety_smoke.js`, and both package verification commands before publishing.
- Confirm the first `Current release` block in `HANDOFF.md` reports v1.6.26 and 362 configured checks.
- Confirm both new runtime modules, the v1.6.26 audit document, and the v1.6.26 regression remain in both archives.
- Recommended branch: `patch/v1.6.26`.

# GitHub Desktop Handoff - v1.6.25

- Apply the complete v1.6.25 overwrite package or commit the full release package.
- Confirm `incident-service-recovery-controller.js` loads after the lifecycle recovery sweep and before `incident-reporter.js`.
- Run `npm run version:check`, `npm run handoff:check`, `node qa/v1625_incident_recovery_timeout_abort_stress_smoke.js`, and both package verification commands before publishing.
- Confirm the first `Current release` block in `HANDOFF.md` reports v1.6.25 and 359 configured checks.
- Confirm `DELIVERY_RULES.md`, the v1.6.25 audit document, and the v1.6.25 regression remain in both archives.
- Recommended branch: `patch/v1.6.25`.

# GitHub Desktop Handoff - v1.6.18

- Apply the complete v1.6.18 overwrite package or commit the full release package.
- Confirm `incident-route-policy.js` loads before `firebase-bootstrap.js` and `incident-state-service.js` loads between support and recovery modules.
- Deploy Hosting and Functions together with `npm run deploy:incident`.
- Run `npm run check:static`, `npm run handoff:check`, and both package verification commands before publishing.
- In the incident panel, confirm `적응형 경로` returns to the default order after a successful Callable request.
- Recommended branch: `patch/v1.6.18`.

# GitHub Desktop Handoff - v1.6.16

- Replace the existing project with the v1.6.16 overwrite package or commit the complete release package.
- Deploy Hosting and Functions together because `/api/incident/*` rewrites depend on the matching regional Functions.
- Run `npm run check:static`, `npm run handoff:check`, and both package verification commands before publishing.
- Confirm mobile browser Back closes the top nested dialog and does not leave the page on the first press.
- Confirm the incident panel shows `Hosting same-origin 복구: 사용 중` only when the rewrite path actually handled the request.

# GitHub Desktop Patch Handoff - v1.6.15


## v1.6.34 update

- Terminal overlay history hard-stall recovery after 30 seconds without duplicate traversal.
- BFCache-safe service-worker activity heartbeat/channel pause and resume.
- Idempotent service-worker registration observers and expanded anonymous diagnostics.
- Configured cumulative static/behavioral target: 374 checks.

## 이번 패치 확인

- `src/ui/modal-controller.js`의 중첩 모달 스택, 부모 inert 처리, visualViewport 동기화, 외부 레이어 등록 API를 함께 커밋합니다.
- `src/app.js`, `src/ui/download-dialog-view.js`, `src/download/download-service.js`의 공통 오버레이 등록·해제 경로를 확인합니다.
- `src/firebase-bootstrap.js`, `src/boot/incident-reporter.js`, `index.html`의 오프라인/CORS 판별, 자동 복구, 익명 진단 복사를 함께 반영합니다.
- Firebase 운영 반영 시 `npm run deploy:incident`로 Hosting CSP와 Functions를 같은 릴리스에서 배포합니다.
- 권장 브랜치 이름: `patch/v1.6.15`.

# GitHub Desktop Patch Handoff - v1.6.14

## 이번 패치 확인

- `src/ui/download-dialog-view.js`와 `assets/css/download-dialog.css`의 화면 경계 내 품질 팝업을 확인합니다.
- `src/download/download-service.js`의 예상 용량 계산과 품질 선택 저장을 확인합니다.
- `src/firebase-bootstrap.js`, `src/boot/incident-reporter.js`, `index.html`의 Callable endpoint 진단을 함께 커밋합니다.
- Firebase 운영 반영 시 `npm run deploy:incident`로 Hosting CSP와 Functions를 같은 릴리스에서 배포합니다.
- 권장 브랜치 이름: `patch/v1.6.14`.


## v1.5.74 적용 확인

- 다중 마스터링 목록의 일시정지·계속 진행·현재 곡 건너뛰기·대기열 순서 변경을 확인합니다.
- 모바일 다운로드에서 MP3/WAV 형식 선택 후 세부 품질과 하단 고정 저장 버튼을 확인합니다.
- 전체 릴리스 또는 누적 덮어쓰기 ZIP 적용 후 강력 새로고침으로 서비스워커 세대를 갱신합니다.

## v1.5.74 current focus

- 누적 덮어쓰기 후 여러 곡 마스터링을 시작해 취소, 실패 곡 재시도, ETA, 결과 필터를 확인합니다.
- 취소 후 완료 파일이 유지되는지, 대기 곡이 취소 상태로 남는지 확인합니다.
- 데스크톱과 모바일 폭에서 대량 작업 버튼과 현재 곡 행이 가려지지 않아야 합니다.

## v1.5.70 GitHub Desktop handoff

- Commit the v1.5.70 mail verification alert, troubleshooting, statistics, search, and CSV export changes together.
- Deploy Firestore, Functions, and Hosting from the same commit.
- Complete the production Gmail placement check after deployment.


## v1.5.72 current focus

- Verify that multi-file analysis completion hides the analysis HUD and navigates to `전체 마스터링`.
- Verify that multi-track mastering suppresses the single processing HUD and keeps the active track visible in the batch list.
- Deploy `cleanupIncidentMailTestsRequest` with Firestore rules/indexes and verify preserved `관리자 정리` records.
- Verify compact admin mode, audit search/pagination/CSV, and mobile card layouts.

## v1.5.69 적용 확인

- `functions/index.js`의 `confirmIncidentMailReceiptRequest`와 공통 메일 템플릿 변경을 포함합니다.
- `firestore.rules`의 `incidentMailReceiptConfirmationRequests`, `incidentMailTestHistory` 규칙을 함께 배포합니다.
- 관리자 화면에서 실제 메일 테스트 이력과 받은편지함·스팸함 수신 확인 버튼을 확인합니다.
- 최종 보고 형식은 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용` 세 구역을 유지합니다.

# GitHub Desktop Patch Handoff

FoxBear 패치는 **GitHub Desktop을 기본 Git 클라이언트로 사용하는 흐름**을 기준으로 전달합니다. 명령줄 Git 사용을 전제로 하지 않습니다.

## 작업 결과 보고 규칙

작업 완료 보고는 `작업한 내역`, `다운로드 파일 2종`, `다음 예정 내역`의 세 구역만 사용합니다. `다운로드 파일 2종`에는 전체 프로젝트 통파일 ZIP과 저장소 루트에 붙여넣어 덮어쓰는 누적 패치 ZIP을 항상 함께 전달합니다. 과거 문서의 `진행된 내용 / 배포 파일 2종 / 다음 예상 내용`은 이전 명칭입니다.

## v1.6.17 적용 확인

- `src/boot/incident-support-service.js`와 `src/boot/incident-recovery-policy.js`가 새 파일로 추가됩니다.
- `index.html`, `sw.js`, `HANDOFF_PACKAGE.json`에 두 파일이 포함되어야 합니다.
- 적용 후 오류 자동신고 창에서 `익명 전송 복구 현황` 카드가 보이는지 확인합니다.
- 전체 검사는 `npm run check:static`, 패키지는 `npm run package:all`로 확인합니다.

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

## v1.6.43 verification

- Configured QA: `388/388`
- Archive entries: `681` each
- Engine fixture: approximately `1.93x` realtime
- Golden audio: four fixtures at `-14.00 LUFS`
