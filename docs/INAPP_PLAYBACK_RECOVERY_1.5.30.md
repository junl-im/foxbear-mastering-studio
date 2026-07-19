# FoxBear v1.5.30 인앱 재생 복구 분석

## 확인된 핵심 원인

1. 기본 `스튜디오` 재생도 항상 `createMediaElementSource()` 기반 Web Audio 그래프로 우회했습니다. 카카오톡 인앱 브라우저처럼 `AudioContext.resume()` 제약이 강한 환경에서는 재생 UI와 시간은 움직여도 출력이 무음이 될 수 있었습니다.
2. 상세 FFT가 청취 중인 `<audio>` 요소를 다시 `createMediaElementSource()`로 소유하려고 해, 브라우저에 따라 재생 경로가 중복되거나 오디오가 끊길 수 있었습니다.
3. 원본/마스터 소스 교체와 A/B 교차재생이 `requestAnimationFrame`, 메타데이터 대기, `AudioContext.resume()` 대기 뒤에 `play()`를 호출했습니다. 이 시점에는 최초 터치의 사용자 활성화가 사라져 모바일 WebView 자동재생 정책에 차단될 수 있었습니다.
4. 마스터링은 긴 비동기 작업이므로 완료 시점의 자동재생은 최초 버튼 터치와 무관합니다. 완료 직후 자동재생 요청이 차단되면 플레이어가 먹통처럼 보일 수 있었습니다.
5. `pagehide`에서 BFCache 여부와 관계없이 모든 AudioContext를 닫아, 앱 전환이나 뒤로가기 복귀 후 살아 있는 오디오 요소가 이미 닫힌 그래프에 연결된 상태가 될 수 있었습니다.
6. 실시간 마스터링 프리뷰에 번역용 MediaElementSource와 실시간 처리용 MediaElementSource가 동시에 붙을 수 있는 중복 그래프 가능성이 있었습니다.

## 적용한 수정

- 기본 스튜디오 모드는 네이티브 HTMLMediaElement 경로로 유지합니다.
- 카카오톡·네이버·인스타그램·페이스북·LINE 계열 제한적 인앱 브라우저에서는 번역/실시간 Web Audio 경로를 안전하게 스튜디오 모드로 폴백합니다.
- 모든 프리뷰 오디오에 `playsinline`, `webkit-playsinline`, `disableRemotePlayback` 호환 설정을 적용합니다.
- 번역 그래프는 스마트폰/노트북/모노 모드를 사용자가 직접 선택할 때만 지연 생성합니다.
- 원본/마스터 전환, A/B 교차재생, 차이 듣기, 실시간 그래프 재개는 클릭·터치 이벤트가 살아 있는 같은 태스크에서 시작합니다.
- 마스터링 완료 후 강제 자동재생을 제거하고 마스터 소스만 선택한 뒤 다음 사용자 탭으로 안정적으로 재생합니다.
- FFT는 지원 브라우저에서 `captureStream()` 복제 스트림과 `createMediaStreamSource()`를 사용하며, 청취용 미디어 요소를 직접 가로채지 않습니다.
- BFCache의 `pagehide.persisted === true`에서는 AudioContext를 유지하고, 실제로 닫힌 번역 그래프만 복귀 시 재생 위치를 보존해 재구성합니다.
- 실시간 마스터링 프리뷰에서는 번역용 MediaElementSource를 추가하지 않습니다.
- 자산 버전, 서비스워커 캐시, SRI 해시를 v1.5.30으로 갱신해 구버전 캐시 재사용을 방지했습니다.

## 검증 결과

- 전체 정적 QA: `214/214 PASS`
- 릴리스 메타데이터: PASS
- GitHub Desktop handoff 무결성: PASS
- 릴리스/덮어쓰기 ZIP 내부 검증: 패키징 단계에서 수행
- 실제 Chromium E2E: 현재 샌드박스의 localhost 접근이 관리자 정책으로 차단되어 실행 불가 (`net::ERR_BLOCKED_BY_ADMINISTRATOR`)

실기기 최종 확인 권장 조합은 카카오톡 Android 인앱 브라우저, Chrome Android, Samsung Internet, Safari iOS, 홈 화면 PWA입니다. 각 환경에서 원본 재생, 마스터링 완료 후 첫 탭 재생, 원본/마스터 전환, 앱 전환 후 복귀, 화면 잠금 후 복귀를 확인해야 합니다.
