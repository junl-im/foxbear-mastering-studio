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

## 8. 다음 보안 단계

공개 사용자가 늘기 전에 Firebase App Check(reCAPTCHA Enterprise)를 구성하고 Firestore 요청에 강제 적용합니다. 현재도 클라이언트/서버 중복 억제, strict Rules, 일일 상한이 있지만 App Check가 없으면 자동화된 남용 가능성이 남습니다.

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
