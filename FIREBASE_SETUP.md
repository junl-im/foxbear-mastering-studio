# FoxBear Firebase 설정 가이드 - v1.5.56

오디오 파일과 PCM은 브라우저 안에서만 처리됩니다. Firebase에는 방문 통계와 개인정보를 줄인 문제 진단만 저장됩니다.

## 1. Firebase Console에서 켤 항목

1. 프로젝트 `foxbear-music`
2. Authentication > Sign-in method > Anonymous 활성화
3. Firestore Database 생성
4. Hosting 활성화
5. Cloud Functions와 Cloud Scheduler 사용 가능 상태 확인
6. App Check에서 웹 앱 등록
7. Remote Config는 선택 사항

## 2. 자동 문제 메일의 보안 구조

브라우저는 Gmail에 직접 접속하지 않습니다. `incidentReports`에 제한된 진단 문서를 만들면 Cloud Function이 Secret Manager의 비밀번호를 사용해 `mcwoogi@gmail.com`으로 전송합니다.

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

## 4. App Check 사이트 키 설정

1. Google Cloud에서 reCAPTCHA Enterprise 웹 사이트 키를 생성하고 실제 배포 도메인을 등록합니다.
2. Firebase Console > App Check에서 같은 웹 앱과 키를 연결합니다.
3. `index.html`의 아래 meta 태그 `content`에 공개 사이트 키만 입력합니다.

```html
<meta name="foxbear-app-check-site-key" content="여기에_공개_사이트_키" />
```

사이트 키는 공개 가능한 값입니다. Secret이나 Gmail 앱 비밀번호를 입력하면 안 됩니다.

배포 후 관리자 오류 관리 화면에서 `App Check 보호 중` 상태와 정상 요청 지표를 확인한 다음 Firestore와 Authentication 강제 적용을 단계적으로 활성화합니다. 키가 비어 있으면 앱은 기존 방식으로 동작하며 관리자 화면에 `키 미설정`이 표시됩니다.

## 5. 설치와 배포

```bash
npm install
npm --prefix functions install
npm run check:release
firebase deploy --only firestore:rules,functions:sendIncidentEmail,functions:retryFailedIncidentEmails,functions:retryIncidentEmailRequest,functions:sendDailyIncidentSummary,hosting
```

또는 다음 프로젝트 스크립트를 사용할 수 있습니다.

```bash
npm run deploy:incident
firebase deploy --only hosting
```

## 6. 실제 동작 테스트

1. 배포 사이트를 열고 프로그램 정보에서 `테스트 메일`을 실행합니다.
2. `mcwoogi@gmail.com` 수신 여부와 `incidentReports.delivery.status = emailed`를 확인합니다.
3. 테스트용 SMTP 실패를 발생시켜 10분, 30분, 2시간 간격의 최대 3회 재시도 상태를 확인합니다.
4. 관리자 모니터링 > 오류 관리에서 실패 건의 `지금 재전송`을 실행합니다.
5. 한국 시간 오전 9시에 전날 오류 요약 메일이 한 번 도착하는지 확인합니다.
6. App Check 키 설정 후 관리자 화면에서 보호 상태와 Firebase Console 지표를 확인합니다.

## 7. Firestore TTL

Firestore TTL 정책에서 다음 컬렉션의 `expiresAt` 필드를 등록합니다.

- `incidentReports`: 약 30일 보존
- `incidentMailState`: 약 45일 보존
- `incidentRetryRequests`: 처리 완료 후 약 45일 보존

정책을 켜지 않으면 `expiresAt` 값은 기록되지만 문서는 자동 삭제되지 않습니다.

## 8. Remote Config 선택값

| 키 | 타입 | 기본값 | 용도 |
| --- | --- | --- | --- |
| `foxbear_notice` | string | 빈 문자열 | 사이트 공지 |
| `foxbear_stats_enabled` | boolean | true | 통계 기능 |
| `foxbear_storage_enabled` | boolean | false | 항상 false 취급 |
| `foxbear_incident_reporting_enabled` | boolean | true | 자동 문제 신고 원격 중지 스위치 |
| `foxbear_youtube_url` | string | 채널 URL | 채널 링크 |

## 9. 운영 확인 항목

- `siteAdmins/{uid}.active = true`인 계정만 오류 목록과 수동 재전송을 사용할 수 있습니다.
- SMTP 예약 건수와 실제 성공 건수는 별도로 집계됩니다.
- 최종 실패 건은 자동 재시도하지 않으며 관리자 화면에 표시됩니다.
- 일일 요약과 재시도 스케줄 함수의 Cloud Scheduler 작업이 활성 상태인지 확인합니다.
- App Check 강제 적용 전 정상 사용자 요청이 검증된 트래픽으로 집계되는지 확인합니다.
