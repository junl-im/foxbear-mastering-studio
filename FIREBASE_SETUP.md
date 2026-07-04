# FoxBear Firebase 초기 설정 가이드

이 빌드는 Firebase Storage를 사용하지 않습니다. 오디오 파일은 계속 브라우저 안에서만 분석/마스터링되고, Firebase에는 방문 통계 이벤트만 저장됩니다.

## 1. Firebase Console에서 켤 항목

1. 프로젝트: `foxbear-music`
2. Authentication > Sign-in method > Anonymous 사용 설정
3. Firestore Database 생성
   - Standard / Native 모드
   - Production mode 권장
   - 위치는 운영 지역에 맞게 선택
4. Hosting 사용 설정
5. Remote Config는 선택 사항입니다.

## 2. 로컬 배포 준비

```bash
npm run check
firebase login
firebase use foxbear-music
firebase deploy --only firestore,hosting
```

Firestore 데이터베이스를 아직 만들지 않았다면 `firebase deploy --only firestore`가 실패할 수 있습니다. Console에서 Firestore Database를 먼저 생성하세요.

## 3. 관리자 UID 등록

1. 배포된 사이트를 한 번 엽니다.
2. 브라우저 개발자 도구 Console에서 다음 값을 확인합니다.

```js
window.FoxBearFirebase?.getUid?.()
```

3. 출력된 Firebase 익명 Auth UID를 복사합니다.
4. Firebase Console > Firestore Database > 데이터에서 다음 문서를 직접 만듭니다.

컬렉션: `siteAdmins`
문서 ID: 방금 복사한 UID
필드:

```json
{
  "active": true,
  "role": "owner"
}
```

이후 사이트를 새로고침하면 관리자 UID로 등록된 브라우저에서만 상단 `관리자 통계` 배지가 표시되고 Firestore 원격 통계를 볼 수 있습니다. 관리자 문서는 클라이언트 코드에서 생성할 수 없고 Firebase Console에서만 수동 생성하도록 Rules가 잠겨 있습니다.

## 4. 저장되는 데이터

컬렉션 `siteVisits`에 다음 수준의 방문 이벤트만 저장됩니다.

- 익명 Auth UID
- 접속 시각
- 날짜 키
- 페이지 경로
- 유입 호스트
- 언어, 화면 크기, User-Agent 일부
- 앱 버전

브라우저 클라이언트만으로는 실제 방문자 IP를 신뢰성 있게 수집할 수 없습니다. 실제 IP 집계가 필요하면 Cloud Functions나 별도 서버 API가 필요한데, 이 부분은 Blaze 요금제가 필요할 수 있습니다.

## 5. Remote Config 선택값

Remote Config를 켜면 다음 키를 추가로 사용할 수 있습니다.

| 키 | 타입 | 기본값 | 용도 |
| --- | --- | --- | --- |
| `foxbear_notice` | string | 빈 문자열 | 향후 사이트 공지 표시용 |
| `foxbear_stats_enabled` | boolean | true | 통계 기능 스위치 |
| `foxbear_storage_enabled` | boolean | false | 현재는 항상 false로 취급 |
| `foxbear_youtube_url` | string | 채널 URL | 채널 링크 원격 변경용 |

## 6. Storage 제외 이유

현재 Firebase Cloud Storage는 Spark 무료 요금제에서 사용할 수 없으므로 이 빌드에서는 Storage SDK를 불러오지 않습니다. `firebaseConfig.storageBucket` 값은 Firebase Console에서 제공되는 기본 설정값으로 남겨두지만, 코드에서 파일 업로드나 다운로드에 사용하지 않습니다.
