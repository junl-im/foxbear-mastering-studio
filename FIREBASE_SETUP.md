# FoxBear Firebase 설정 가이드 - v1.6.46

## Spark 무료 요금제 관리자 모니터링

v1.6.42부터 관리자 진입에는 비밀번호, Secret Manager, 관리자 인증 Cloud Function을 사용하지 않습니다. Firebase Google Authentication과 Firestore `siteAdmins/{UID}` 문서를 조합하므로 Spark 무료 요금제에서 배포할 수 있습니다.

### 1. Firebase Authentication 제공업체 활성화

Firebase Console에서 프로젝트 `foxbear-music`을 열고 다음 항목을 활성화합니다.

1. `Authentication → Sign-in method`
2. `Anonymous` 활성화
3. `Google` 활성화
4. Google 지원 이메일로 `mcwoogi@gmail.com` 선택
5. `Authentication → Settings → Authorized domains`에서 실제 배포 도메인을 확인

기본 Firebase Hosting 도메인인 `foxbear-music.web.app`, `foxbear-music.firebaseapp.com`은 일반적으로 자동 등록됩니다. 두 항목이 모두 실제 목록에 있는지 확인하고, 별도 도메인을 사용한다면 해당 도메인도 추가합니다.

### 2. Google OAuth 리디렉션 URI 등록

v1.6.46은 현재 접속한 승인 Firebase Hosting 도메인을 `authDomain`으로 사용합니다. Google Cloud Console에서 `API 및 서비스 → 사용자 인증 정보`를 열고, Firebase Authentication이 사용하는 **OAuth 2.0 클라이언트 ID의 웹 애플리케이션** 항목을 선택합니다. 보통 이름에 `Web client` 또는 `auto created for Google Service`가 포함되어 있습니다.

`승인된 리디렉션 URI`에 다음 두 주소를 모두 추가하고 저장합니다.

```text
https://foxbear-music.firebaseapp.com/__/auth/handler
https://foxbear-music.web.app/__/auth/handler
```

`/__/auth/handler`까지 정확히 포함해야 합니다. 새 OAuth 클라이언트를 임의로 만들기보다 Firebase Google 제공업체가 사용 중인 기존 웹 클라이언트를 수정합니다.

### 3. Spark 전용 배포

프로젝트 최상위 폴더의 터미널에서 실행합니다.

```bat
firebase login
firebase use foxbear-music
npm install
del /f /q cmd.exe 2>nul
npm run check:release
npm run deploy:spark
```

`cmd.exe`는 프로젝트 파일이 아닙니다. 기존 폴더에 남아 있어도 v1.6.45의 Hosting ignore가 업로드에서 제외하지만, 혼동 방지를 위해 삭제합니다. `npm run deploy:spark`는 실행 전 `npm run hosting:check`를 자동 실행합니다.

`deploy:spark`는 Hosting, Firestore Rules, Firestore Indexes만 배포합니다. Cloud Functions나 Secret Manager를 요청하지 않으므로 Blaze 업그레이드가 필요하지 않습니다.

### 4. 관리자 Google UID 등록

1. 배포된 사이트에서 `설정 → 관리자 모니터링`을 엽니다.
2. `Google 계정으로 인증`을 누르고 `mcwoogi@gmail.com`으로 로그인합니다.
3. 최초에는 관리자 문서가 없으므로 접근이 거절되고 Firebase UID가 화면에 표시됩니다.
4. `UID 복사`를 누릅니다.
5. Firebase Console에서 `Firestore Database → 데이터`를 엽니다.
6. 컬렉션 `siteAdmins`를 만들고, 문서 ID에 복사한 UID를 붙여 넣습니다.
7. 다음 필드를 정확한 타입으로 추가합니다.

```text
active       Boolean  true
role         String   admin
email        String   mcwoogi@gmail.com
authProvider String   google.com
```

Firestore Rules는 Google 로그인, 이메일 인증, 문서 UID, 문서 이메일, 인증 제공업체를 모두 확인합니다. 웹 클라이언트는 `siteAdmins` 문서를 생성하거나 수정할 수 없습니다.

### 5. 확인

사이트를 새로고침한 뒤 다시 `설정 → 관리자 모니터링`에서 같은 Google 계정으로 로그인합니다. 등록이 정상이면 관리자 모니터가 열립니다. 관리자 화면의 `관리자 로그아웃`을 누르면 Google 세션이 종료되고 일반 익명 세션으로 자동 전환됩니다.

### 6. 오류별 확인

- `operation-not-allowed`: Authentication에서 Google 제공업체가 꺼져 있습니다.
- `unauthorized-domain`: Authentication의 Authorized domains에 현재 도메인이 없습니다.
- `network-request-failed`: `siteAdmins` 문제가 아니라 Google/Firebase 인증 통신 단계입니다. v1.6.46은 한 번만 동일 출처 redirect 복구를 시도합니다. 계속 실패하면 화면에 표시되는 `host`, `authDomain`, 오류 코드를 확인하고 두 OAuth 리디렉션 URI 등록 여부를 점검합니다.
- `redirect-result-missing` 또는 `redirect-loop-prevented`: OAuth 리디렉션 URI가 빠졌거나 브라우저가 사이트 저장소를 차단한 상태입니다.
- 로그인은 됐지만 UID 등록 안내가 표시됨: `siteAdmins/{UID}` 문서 ID 또는 필드 타입을 확인합니다.
- 권한 없음: 문서의 `email`이 로그인 이메일과 정확히 같고 `authProvider`가 `google.com`인지 확인합니다.

## Blaze 선택 기능

오류 메일 자동 발송 등 `functions/`의 서버 기능은 Blaze 요금제가 필요한 선택 기능입니다. Spark 운영에서는 `npm run deploy:spark`만 사용하고 `npm run deploy:incident`는 실행하지 않습니다.

---

## v1.5.70 mail verification deployment

- Deploy `auditIncidentMailOperations` because mail-test freshness and receipt-overdue alerts are evaluated in the 15-minute scheduled audit.
- No new Secret is required; `FOXBEAR_GMAIL_APP_PASSWORD` remains the required 16-character Google app password.
- After deployment, run the real mail test and explicitly confirm inbox or spam placement in the administrator monitor.

# FoxBear Firebase 설정 가이드 - v1.5.69

오디오 파일과 PCM은 브라우저 안에서만 처리됩니다. Firebase에는 방문 통계와 개인정보를 줄인 문제 진단만 저장됩니다.

## 1. Firebase Console에서 켤 항목

1. 프로젝트 `foxbear-music`
2. Authentication > Sign-in method > Anonymous 활성화
3. Firestore Database 생성
4. Hosting 활성화
5. Cloud Functions 사용 가능 상태 확인
6. Remote Config는 선택 사항

## 2. 자동 문제 메일의 보안 구조

브라우저는 Gmail에 직접 접속하지 않습니다. 익명 인증된 Callable Function `submitIncidentReport`가 `incidentReports`에 제한된 진단 문서를 만들고, Cloud Function `sendIncidentEmail`이 Secret Manager의 비밀번호를 사용해 `mcwoogi@gmail.com`으로 전송합니다. Callable 배포가 지연된 경우에만 클라이언트 Firestore 생성 경로를 호환용으로 사용합니다.

저장하거나 전송하지 않는 항목:

- 오디오/PCM/Blob
- 업로드 파일명
- 전체 로컬 경로
- 이메일 주소, 긴 토큰, URL query의 인증값

## 3. Gmail 앱 비밀번호 등록

Google 계정에서 2단계 인증을 활성화하고 앱 비밀번호를 발급합니다. 앱 비밀번호가 제공되지 않는 계정 유형에서는 다른 SMTP 공급자로 변경해야 합니다.

비밀번호를 코드나 채팅에 붙여 넣지 말고 로컬 Firebase CLI에서만 입력합니다.

```bash
firebase login
firebase use foxbear-music
firebase functions:secrets:set FOXBEAR_GMAIL_APP_PASSWORD
```

## 4. 설치와 배포

```bash
npm install
npm --prefix functions install
npm run check:release
npm run deploy:incident
# 위 명령은 Hosting CSP, Firestore 규칙/인덱스, 오류 신고 Functions를 함께 배포합니다.
# 별도 Hosting 전용 배포가 필요한 경우에만 아래 명령을 사용합니다.
firebase deploy --only hosting
```

## 5. 실제 발송 테스트

1. 배포 사이트를 엽니다.
2. 우측 상단 설정에서 `오류 자동신고`를 엽니다.
3. `자동 신고 켜짐`을 확인합니다.
4. `실제 메일 테스트`를 누릅니다.
5. 화면에 발송 완료가 표시되고 `mcwoogi@gmail.com`에 메일이 도착하는지 확인합니다.
6. Firestore `incidentReports` 문서에서 `delivery.status`가 `emailed`인지 확인합니다.

## 6. Firestore TTL

Firestore TTL 정책에서 다음 두 컬렉션의 `expiresAt` 필드를 등록합니다.

- `incidentReports`: 약 30일 보존
- `incidentMailState`: 약 2일 보존

정책을 켜지 않으면 `expiresAt` 값은 기록되지만 문서는 자동 삭제되지 않습니다.

## 7. Remote Config 선택값

| 키 | 타입 | 기본값 | 용도 |
| --- | --- | --- | --- |
| `foxbear_notice` | string | 빈 문자열 | 사이트 공지 |
| `foxbear_stats_enabled` | boolean | true | 통계 기능 |
| `foxbear_storage_enabled` | boolean | false | 항상 false 취급 |
| `foxbear_incident_reporting_enabled` | boolean | true | 자동 문제 신고 원격 중지 스위치 |
| `foxbear_youtube_url` | string | 채널 URL | 채널 링크 |

## 8. App Check 미사용 정책

이 프로젝트는 Firebase App Check를 사용하지 않습니다. Web App 사이트 키를 추가하지 않고 Firestore 또는 Functions에서 App Check Enforcement를 활성화하지 않습니다. 관리자 권한은 Firebase Google Authentication의 UID·인증된 이메일·`google.com` 제공업체와 Firestore `siteAdmins/{UID}` 문서를 함께 검사합니다.

App Check를 사용하지 않는 대신 Firestore Rules, 관리자 문서의 `active`/`email`/`authProvider`, 최소 권한, 요청 상한과 중복 억제 정책을 유지합니다.

## v1.5.66 운영 작업 및 배포 검증

배포 명령에는 `testIncidentAlertChannelRequest`와 `verifyIncidentDeploymentRequest`가 포함되어야 합니다. 관리자 오류 관리 화면에서 보조 경보 테스트와 배포 상태 검증을 실행할 수 있습니다. 테스트와 검증에는 서버 쿨다운이 적용됩니다.

배포 후 관리자 화면에서 다음을 확인합니다.

- 보조 경보 테스트가 설정된 웹훅에 실제 메시지 1건을 전달하는지
- 배포 검증 결과의 Functions 버전이 화면 버전과 같은지
- SMTP/Secret 상태가 정상인지
- 운영 이력 상세표에 원인 코드와 권장 조치가 표시되는지


## v1.5.67 감사 로그·웹훅 장애 전환·인덱스 검증

선택적으로 기본/보조 웹훅을 Functions 환경 변수에 설정합니다. 두 값 모두 허용된 HTTPS 공급자 주소만 사용합니다.

```bash
cp functions/.env.example functions/.env
# functions/.env에서 아래 두 값을 설정합니다.
# FOXBEAR_INCIDENT_ALERT_WEBHOOK_URL=https://...
# FOXBEAR_INCIDENT_ALERT_WEBHOOK_FALLBACK_URL=https://...
```

로컬 `.env`는 저장소에 커밋하지 않습니다. 운영 배포에서는 현재 Firebase Functions 런타임의 환경 변수 또는 Secret 관리 방식에 맞춰 같은 키를 주입하며, URL을 Firestore 문서에 직접 저장하지 않습니다. 배포 후 관리자 화면의 배포 검증에서 네 복합 인덱스 프로브가 모두 `ok`인지 확인합니다. `incidentAdminAuditLog`, `incidentOperationsHistory`, `incidentOperationsAlerts`에는 `expiresAt` TTL 정책을 설정합니다.


## v1.5.69 실제 메일 실수신 확인

Functions 배포 목록에 `confirmIncidentMailReceiptRequest`를 포함하고 Firestore Rules를 함께 배포합니다. 실제 메일 테스트 후 Gmail 도착 위치를 확인한 관리자만 받은편지함 또는 스팸함 확인 요청을 생성할 수 있습니다. `incidentMailTestHistory`와 `incidentOperations/mailVerification`은 서버가 기록하며 클라이언트 수정은 허용하지 않습니다.

## v1.5.72 추가 배포

- `functions:cleanupIncidentMailTestsRequest`를 Firestore Rules·Indexes와 함께 배포합니다.
- `incidentMailTestCleanupRequests`는 관리자만 생성·조회하고 서버만 결과를 기록합니다.
- 정리 작업은 24시간 이상 지난 미확인 SMTP 접수 기록을 삭제하지 않고 `dismissed` 상태로 보존합니다.
