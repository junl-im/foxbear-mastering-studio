# FoxBear AI Mastering Studio Pro

## Pro v1.3.32 vocal anti-metallic engine tuning update

- Added a vocal-metallic risk guard so vocal-like material no longer triggers high-frequency exciter, clarity boost, and reference-air lift independently.
- Reduced high-frequency exciter drive/wet mix for vocal and sibilant material; very high-risk vocal masters bypass the exciter entirely.
- Added Vocal Metallic Comfort processing after the exciter to smooth 3 kHz throat glare, 5.2-8.2 kHz sibilance, and 10 kHz+ glassiness.
- Made metallic-removal notches less narrow/aggressive on vocal-like material to avoid static notch ringing and phasey robotic tone.
- Added recommendation safeguards so sibilant vocal tracks are less likely to be pushed toward Future Bass/Synthpop/EDM solely because of presence/metallic FFT energy.
- Reference matching now scales down presence/air/brightness boosts when the source already has vocal metallic risk.

## Pro v1.3.31 unified phase-safe spatial budget update

- Width matrix expansion and stereoGroove micro-delay expansion are now evaluated through one shared spatial budget before final rendering.
- `phaseSafe` now actively scales both width and stereoGroove when the source is already wide, low-end mono compatibility is weak, low-side energy is high, or FFT air/presence energy suggests spatial smear risk.
- Realtime preview width uses the same budget function as offline rendering so preview/final width decisions stay closer.
- Mastering detail/report metadata now shows requested vs applied width factor and stereoGroove values.
- Analysis cache DB was bumped to keep spatial-budget decisions aligned with the latest analyzer metadata.

## Pro v1.3.30 4x FIR True Peak + gentle multiband dynamics update

- Final true-peak measurement now uses 4x windowed-sinc FIR oversampling instead of linear interpolation.
- The finalizer and fallback path share the same 4x FIR true-peak metadata so reports identify the oversampling mode clearly.
- Added gentle 3-band dynamic control before loudness normalization to tame excess low-end, low-mid density, and harsh presence/air without over-coloring the master.
- The offline master chain also includes a lightweight multiband glue node so preview-style rendering and finalization feel closer.
- Mastering reports now include multiband reduction details and the true-peak oversampling mode.

## Pro v1.3.29 FFT analyzer update

- New 4096-point FFT analyzer improves genre recommendation, EQ correction, and reference matching accuracy.
- Existing analysis fields remain compatible, with added centroid, rolloff, flatness, flux, spectrum bands, and compact spectrum profiles.
- Phase-safe width guards reduce unnecessary spaciousness when source material is already wide or low-end mono compatibility is weak.
- Analysis cache DB was bumped so older pre-FFT analysis values are not reused.

## Pro v1.3.28 lookahead limiter update

- 최종 마스터 파이널라이저에 품질 모드별 룩어헤드 리미터를 추가했습니다. Fast는 1.5ms, Balanced는 3ms, Max는 5ms 선제 피크 감쇠를 사용합니다.
- 기존처럼 리미터 전에 전체 게인을 먼저 크게 낮추는 흐름을 줄이고, 피크가 다가오기 전에 해당 구간만 시간 가변 게인으로 눌러 펀치 손실을 줄이도록 조정했습니다.
- 브라우저 fallback 파이널라이저도 동일한 룩어헤드 envelope limiter를 사용해 워커 실패 시에도 결과 성향이 크게 달라지지 않게 했습니다.
- 최종 JSON 리포트에 `finalizer.limiterMode`, `lookaheadMs`, `limiterReductionDb`, `preLimiterPeak` 메타 정보를 추가했습니다.

## Pro v1.3.27 K-weighted LUFS loudness update

- 최종 마스터 파이널라이저와 브라우저 fallback의 2-pass 라우드니스 측정을 K-weighting 프리필터 기반으로 변경했습니다.
- 분석 워커의 `loudnessIntegrated`도 K-weighted LUFS 값으로 계산해 트랙 분석, 리포트, 품질 게이트의 기준을 더 일관되게 맞췄습니다.
- EBU R128 방식에 가까운 400ms 블록, 75% overlap, -70 LUFS absolute gate, -10 LU relative gate 흐름을 적용했습니다.
- 마스터링 상세 리포트의 라우드니스 문구를 `K-weighted`로 갱신하고 `LUFS 유사` 표기를 제거했습니다.

## v1.3.20 Mastering Studio Upgrade

- 마스터링 품질 게이트(PASS/CHECK/FAIL)와 JSON export report 저장을 추가했습니다.
- 원본/마스터본을 같은 위치에서 전환하는 A/B 스위치 플레이어와 파형/피크 미니뷰를 추가했습니다.
- WAV 16-bit, MP3 128/256 kbps 출력 옵션을 확장했습니다.
- ZIP 다운로드에 각 트랙별 마스터링 리포트를 자동 포함합니다.

GitHub Pages-ready modular browser mastering studio.


## Pro v1.3.26 admin UID security hotfix

- 클라이언트에 남아 있던 관리자 평문 암호 입력 흐름을 제거했습니다.
- Firebase 익명 Auth UID가 `siteAdmins/{uid}` 문서에 있고 `active: true`인 경우에만 `관리자 통계` 배지가 표시되도록 바꿨습니다.
- `firebase-bootstrap.js`에 `getAdminProfile()`을 추가해 현재 UID의 관리자 활성 상태를 직접 확인합니다.
- 비관리자 브라우저에서는 일반 호환 안내 배지만 유지되고 관리자 통계 트리거로 동작하지 않으며, 방문 통계 조회도 UI 레벨에서 차단됩니다.
- Firebase 설정 문서는 Console에서 `window.FoxBearFirebase?.getUid?.()`로 UID를 확인한 뒤 `siteAdmins/{uid}`를 수동 등록하는 방식으로 갱신했습니다.


## Pro v1.3.19 mastering pro upgrade

- Added mastering style presets: Transparent Clean, Streaming Polish, Club/Loud, Vocal Focus, Podcast/Voice, Warm Analog, Clean Loud.
- Added extended LUFS / peak ceiling choices and detailed before/after mastering report metrics.
- Strengthened MP3 export fallback so failed MP3 encoding is recorded and saved as 24-bit WAV automatically.
- Improved processing-stage messages, friendly failure guidance, DC offset cleanup, default silence trim, and transparent final limiter guard.

## Pro v1.3.18 mastering hotfix

- Firebase Hosting/Chromium의 강한 CSP + Trusted Types 환경에서 마스터링 워커 생성이 막힐 수 있는 경로를 보정했습니다.
- 모든 마스터링/분석/피치/인코딩 워커는 같은 출처의 허용된 경로만 `foxbear` Trusted Types 정책으로 생성합니다.
- 마스터 파이널라이저 워커 생성 실패가 전체 마스터링 실패로 바로 이어지지 않도록 fallback 보호 범위 안으로 이동했습니다.
- 워커 fallback은 단순 피크 가드만 하지 않고, 대략 LUFS 타깃 보정과 True Peak/Sample Peak 가드를 함께 적용합니다.
- MP3 워커의 `lamejs` 로컬 import도 worker-side Trusted Types 정책으로 보호했습니다.
- NaN/Infinity/과도한 샘플 값을 파이널라이즈와 인코딩 직전에 정리하는 오디오 안전 수리 단계를 추가했습니다.
- `npm run check`, SRI 검증, 정적 HTML/CSS 검사, finalizer/WAV worker synthetic harness를 통과했습니다.


## Pro v1.3.18 Firebase Firestore setup patch

- Firebase Web SDK v12.14.0 CDN 모듈 부트스트랩을 추가했습니다.
- Spark 무료 요금제 제약을 반영해 Cloud Storage SDK는 불러오지 않고, 오디오 파일은 기존처럼 브라우저 로컬 처리만 유지합니다.
- Anonymous Auth + Firestore 기반 방문 이벤트 기록을 추가했습니다.
- 숨겨진 통계창은 `siteAdmins/{uid}`에 등록된 관리자 UID에서만 Firestore 원격 통계를 읽도록 구성했습니다.
- Firebase Hosting CSP를 gstatic Firebase SDK와 Auth/Firestore/Remote Config 연결 도메인만 허용하도록 확장했습니다.
- Firebase Hosting 배포 도메인 `foxbear-music.web.app`, `foxbear-music.firebaseapp.com`을 실행 허용 호스트에 추가했습니다.
- Firestore Security Rules, 인덱스 파일, `.firebaserc`, `FIREBASE_SETUP.md`를 추가했습니다.
- GitHub Pages 워크플로가 `vendor/` 폴더도 배포하도록 보정했습니다.


## Pro v1.3.16 selection behavior / CSP final hardening patch

- 트랙 카드 클릭은 이제 작업 패널을 여는 **현재 작업 지정**만 수행하고, 다중 작업 대상 선택은 카드 안의 `작업 선택` 버튼만 수행하도록 분리했습니다.
- 여러 곡을 불러와도 모든 트랙이 자동 선택되지 않도록 바꿨습니다. 첫 곡은 현재 작업으로만 열리고, 선택 목록은 사용자가 버튼으로 직접 지정합니다.
- 트랙 카드를 더블클릭하거나 키보드 Delete/Backspace로 해당 곡의 선택 상태를 해제할 수 있게 했습니다.
- 비선택 트랙은 현재 작업/장르 잠금 상태와 겹쳐도 외곽 테두리가 검정색으로 유지되도록 최종 CSS 오버라이드를 추가했습니다.
- 선택/현재 작업 카드의 hover/active transform을 제거해 클릭 시 흔들림이 생기지 않도록 유지했습니다.
- CSP에 `form-action 'none'`, `require-trusted-types-for 'script'`, `trusted-types foxbear`를 추가하고, DOM XSS sink 사용을 줄이기 위해 `innerHTML` 기반 렌더링을 DOM 생성 방식으로 교체했습니다.
- 로컬 CSS/JS 리소스에 SHA-384 Subresource Integrity 값을 추가했습니다.
- 숨겨진 통계 API 호출은 same-origin 절대 경로만 허용하고, `no-store`, redirect 차단, 5초 타임아웃, 응답 크기 제한, 표시 문자열 길이 제한을 추가했습니다.
- 앱 버전, 캐시 버스터, 패키지 버전을 v1.3.16로 갱신했습니다.

## Pro v1.3.14 CSP/security hardening patch

- JSZip 3.10.1을 CDN에서 제거하고 `vendor/jszip/jszip.min.js` 로컬 파일로 번들링했습니다.
- lamejs 1.2.1 MP3 인코더를 `vendor/lamejs/lame.min.js` 로컬 파일로 번들링하고 MP3 Worker의 `importScripts()` 경로를 같은 출처 파일로 변경했습니다.
- 메인 CSP를 `script-src 'self'`, `style-src 'self'`, `connect-src 'self'`, `worker-src 'self'` 중심으로 강화하고 `unsafe-inline`, 외부 CDN, blob worker 허용을 제거했습니다.
- `object-src 'none'`, `frame-src 'none'`, `script-src-attr 'none'`, `style-src-attr 'none'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`를 추가했습니다.
- referrer policy를 `no-referrer`로 강화했습니다.
- 보호/미끼 화면의 인라인 스타일을 제거하고 외부 CSS 클래스 기반 렌더링으로 바꿨습니다.
- 디자인 미리보기 페이지도 인라인 `<style>`을 `assets/css/design-preview.css`로 분리하고 별도 CSP를 적용했습니다.
- 숨겨진 통계 API 훅은 같은 도메인 URL만 허용하도록 검증을 추가했습니다.
- 앱 버전, 캐시 버스터, 패키지 버전을 v1.3.14로 갱신했습니다.

## Pro v1.3.13 selected track focus / hidden stats patch

- 여러 곡을 불러왔을 때 비선택 트랙 카드의 테두리를 검정 계열로 고정해 선택/비선택 대비를 더 분명하게 조정했습니다.
- 선택된 트랙에 마우스를 올리거나 클릭할 때 발생하던 흔들림을 막기 위해 트랙 카드의 hover/active transform을 제거했습니다.
- `PC · 모바일 호환` 배지는 과거 숨겨진 관리자 트리거였으나, v1.3.26부터는 Firebase `siteAdmins/{uid}` 활성 관리자에게만 `관리자 통계` 배지가 표시됩니다.
- 통계 패널은 오늘 접속, 오늘 고유 방문자, 누적 접속, 유입 사이트를 표시합니다. 정적 GitHub Pages 단독 배포에서는 실제 전체 방문자 IP를 수집할 수 없으므로 기본값은 브라우저 localStorage 기반 로컬 기록이며, 같은 도메인의 `window.FOXBEAR_STATS_ENDPOINT` JSON API를 연결하면 서버 통계로 확장할 수 있습니다.
- 앱 버전, 캐시 버스터, 패키지 버전을 v1.3.13으로 갱신했습니다.

## Pro v1.3.12 requested UI density patch
- 작업 요약 제목과 트랙/완료/총 파일 용량/상태 카드를 하나의 요약 스트립으로 묶어 제목만 따로 떨어져 보이던 테두리 문제를 정리했습니다.
- 요약 4개 카드와 부모 테두리 사이의 내부 여백, 카드 간격, 모바일 글자 크기를 재조정했습니다.
- 작업 요약 제목은 불러오기/버튼형 적용 기능/장르 프리셋처럼 왼쪽 정렬로 고정했습니다.
- 대분류 제목 글자 크기를 다시 낮추고 모바일에서 라벨, 버튼, 카드 수치가 과하게 커지지 않도록 보정했습니다.
- 미리듣기 팝업 제목 위의 영어 배지 `Realtime Preview`를 제거했습니다.
- AI 추천 프리셋 다시 적용/선택 트랙 마스터링/전체 마스터링 버튼 묶음의 부모-자식 테두리 간격과 버튼 밀도를 조정했습니다.
- 상단 아날로그 노브에 매우 느린 회전 애니메이션을 추가하고, 움직임 줄이기 환경에서는 자동으로 멈추도록 했습니다.
- CSS/JS 캐시 버전을 v1.3.12로 올려 배포 후 이전 파일이 남아 보이는 가능성을 줄였습니다.


## Pro v1.3.11 mobile balance follow-up
- 미리듣기 팝업에 현재 곡 정보 줄을 추가했습니다. 곡명, 시간, 용량, 형식, 프리셋을 한 줄로 확인할 수 있습니다.
- 여러 곡을 불러왔을 때 현재 작업 트랙과 선택된 작업 대상 카드의 테두리 색상 차이를 더 분명하게 조정했습니다.
- 작업 요약 4개 카드와 작업 실행 버튼 영역의 여백을 다시 늘려 너무 붙어 보이는 문제를 완화했습니다.
- `파일 업로드/폴더 업로드` 표기를 `파일열기/폴더열기`로 변경했습니다.
- 상단 아날로그 노브를 더 실제 노브처럼 보이도록 눈금, 하이라이트, 포인터, 입체 그림자를 보강했습니다.
- 제작자 네임텍 hover 시 위치가 흔들리지 않도록 transform 효과를 제거했습니다.
- 모바일 제작자 네임텍은 폭을 줄이고 DESIGNED BY는 좌측, 곰같은여우 with AI는 중앙 정렬되도록 보정했습니다.

## Pro v1.3.11 realtime preview / density polish
- 미리듣기 팝업 플레이어를 작업 대기열 프리뷰와 같은 커스텀 플레이어 인터페이스로 통일했습니다.
- 미리듣기 컨트롤을 EQ처럼 위아래형 세로 페이더로 재배치했습니다. PC에서는 한 줄 전체 폭으로, 모바일에서는 5열 x 2줄 컴팩트 페이더로 표시됩니다.
- 실시간 컨트롤 조작 중 전체 화면을 과하게 재렌더링하지 않도록 갱신 범위를 줄였습니다.
- 카드 클릭 시 현재 활성 트랙뿐 아니라 작업 대상 선택 상태에도 반영되도록 개선했습니다. 여러 곡 추가 시 첫 곡만 선택된 것처럼 보이는 문제를 줄였습니다.
- 스마트 추천 패널은 추천 장르, 안전 점수, 저역 모노, 보호 가드 중심으로 축약해 대기열/분석 정보와의 중복을 줄였습니다.
- 상단 구독 버튼을 제거하고, 프로그램 설명 팝업을 기본 기능/도입 기능/음질 보호/예정 기능 중심으로 재정리했습니다.
- 부모/자식 카드 간격을 균형 있게 재조정해 테두리 속 테두리 구조의 공간 낭비를 줄이되 너무 붙지 않게 보정했습니다.
- 마스터링 설정과 마스터링 강도 모바일 글자/퍼센트 정렬을 보정해 줄 밀림을 줄였습니다.

## Pro v1.3.11 reliability / mastering workflow upgrade
- 레퍼런스 트랙 업로드 패널을 추가했습니다. 목표 음원의 저역/저중역/중역/고역, 밝기, 폭, 트랜지언트 성향을 분석해 추천값과 프리셋 레퍼런스 매처에 반영합니다.
- 플랫폼별 저장 프리셋을 추가했습니다: Streaming Safe, YouTube/MV, Apple/Hi-Fi, SNS/Shorts, Loud Demo, Archive Master. 선택 시 출력 포맷, LUFS, 피크 천장, 품질 모드가 함께 맞춰집니다.
- 되돌리기/스냅샷 패널을 추가했습니다. 선택 트랙의 장르, 슬라이더, 피치/BPM, 악기, 출력 목표, 성능 모드를 저장하고 최근 스냅샷으로 복원할 수 있습니다.
- 저역 모노 호환 체크를 분석 엔진과 워커에 추가했습니다. 120Hz 이하 L/R 상관도와 사이드 비율을 점수화해 모바일/클럽/모노 재생 위험을 표시합니다.
- 모바일 성능 모드를 추가했습니다. Auto, Mobile Safe, Quality Lock 중 선택할 수 있으며, 긴 파일/저메모리 환경에서 가장 무거운 피크 검사만 자동 균형화합니다.
- 엔진 안전 점수에 저역 모노 위험을 반영해, 과한 공간감 또는 저역 위상 문제를 더 일찍 감지합니다.
- `npm run check` 범위를 외부 WASM 피치 어댑터까지 확장했습니다.

## Pro v1.3.11 feature popup and readability upgrade
- 버튼형 적용 기능을 기본 화면에서 숨기고, `버튼 보기` 팝업 안에서 한눈에 켜고 끌 수 있도록 개편했습니다. 꺼진 기능은 앞쪽, 켜진 기능은 뒤쪽에 정렬됩니다.
- 모바일에서 기능 버튼 글자와 ON/OFF 배지가 겹치지 않도록 팝업 그리드, 줄바꿈, 글자 크기를 다시 조정했습니다.
- 일반 프로그램에서 많이 쓰는 시스템 UI 계열 글꼴 스택으로 정리해 PC/모바일 가독성을 맞췄습니다.
- 마스터링 설정 영역은 기능 명칭이 더 잘 보이고 설명/선택 텍스트는 과하게 커지지 않도록 보정했습니다.
- 상단 소개 카드 테두리에 느리게 도는 음악적 하이라이트 라이트를 추가했습니다. 움직임 줄이기 설정에서는 애니메이션을 완화합니다.
- 새 UI 구조에서도 CSS/JS 캐시 버전을 v1.3.11로 갱신했습니다.

## Pro v1.3.11 preset/research engine upgrade
- BandLab/LANDR/CloudBounce류 온라인 마스터링 도구의 흐름을 참고해, 빠른 프리셋 선택 + 강도 조절 + A/B 비교 + 레퍼런스 성향 보정 방향을 강화했습니다.
- 장르 프리셋에 `Cinematic / OST`, `Spatial / Wide Mix`, `Tape Warmth`, `Punch / Live Energy` 스타일을 추가했습니다.
- `프리셋 레퍼런스 매처` 엔진을 추가해 선택 프리셋의 목표 저역/저중역/중역/고역 밸런스에 더 가깝게 미세 보정합니다.
- `스테레오 위상 세이프` 엔진을 추가해 넓은 공간감에서도 중앙 보컬과 저역이 흐려지는 것을 줄입니다.
- `청감 피로 가드` 엔진을 추가해 강한 피치/BPM, 고음압, 밝은 곡에서 오래 들으면 피곤한 고역을 더 섬세하게 정리합니다.
- `자동 하이라이트 A/B` 기능을 추가해 분석 시 차이가 잘 들리는 5초 구간을 찾아 A/B 루프 시작점으로 사용합니다.



## Pro v1.3.0 UI/engine refinement
- 버튼형 적용 기능에 `A/B 레벨 매칭`, `5초 A/B 루프`, `분석 캐시 자동정리`를 통합했습니다.
- 모든 주요 클릭 버튼과 팝업 선택 버튼에 짧은 도움말 툴팁을 표시하도록 보강했습니다.
- 상단 구독 CTA를 좌측 버전 배지 라인의 우측 끝으로 이동하고, 우측 하단 구독 알림은 심플한 알림형 버튼으로 유지했습니다.
- PC 상단 미니 웨이브도 모바일처럼 빠르고 눈에 띄게 움직이도록 조정했습니다.
- 모바일 가독성을 위해 버튼형 기능, 팝업 버튼, 힌트 글자 크기와 줄 간격을 보정했습니다.
- 추가 마스터링 시 막힌 느낌을 줄이는 `개방감 리커버리` 엔진을 추가하고, 마스터링 시작 전 프리뷰 오디오를 정지해 리소스 충돌 가능성을 낮췄습니다.
- 분석 캐시 자동정리는 ON일 때 48시간 단위로 오래된 캐시를 정리하고, OFF일 때는 그대로 유지합니다.

## Pro v1.3.0 performance/plugin upgrade
- `5초 A/B 루프 비교` 버튼을 추가해 원본/마스터링을 같은 구간에서 반복 비교하기 쉽게 했습니다.
- `보컬 포커스 플러스`, `실키 에어 밸런서`, `모바일 번역 보정` 플러그인을 버튼형 기능으로 추가했습니다.
- 피치/BPM 극단값 후에도 보컬/리드 대역이 너무 꺼지지 않도록 아주 미세한 보호 EQ를 추가했습니다.
- 워커/폴백 리샘플링을 선형 보간에서 큐빅 보간으로 개선해 피치 변환 질감을 더 부드럽게 했습니다.
- 새츄레이션 중복 연결과 스마트 가드 중복 연산을 정리해 불필요한 처리와 과한 웻 신호 가능성을 줄였습니다.
- JavaScript/Worker 문법 검사와 CSS 균형 검사를 반복 확인했습니다.

## Pro v1.2.8 subscribe/wave/check patch
- 우측 하단 구독 유도 알림은 상단 소개 버튼과 분리해, 작은 알림창에 맞는 심플한 `▶ 구독` 액션 버튼으로 정리했습니다.
- 모바일 상단 좌측 미니 웨이브는 더 빠르고 눈에 띄는 전용 애니메이션으로 조정했습니다. 단, 기기 접근성 설정에서 움직임 줄이기가 켜져 있으면 애니메이션을 과하게 강제하지 않습니다.
- 다운로드 파일명 안전 장치를 추가해 Blob MIME 타입과 확장자가 어긋날 경우 `.mp3`, `.wav`, `.zip` 확장자를 한 번 더 맞춥니다.
- v1.2.8 캐시 버스터를 적용해 GitHub Pages/모바일 브라우저가 이전 CSS/JS를 계속 물고 있는 문제 가능성을 줄였습니다.
- JavaScript/Worker 문법 검사를 두 번 반복하고, CSS 중괄호 균형과 버전 캐시 경로를 함께 점검했습니다.


## Pro v1.2.8 popup/UI refinement

- 장르 프리셋까지 버튼형 팝업 선택 UI로 통일했습니다.
- 모바일에서도 선택 팝업이 화면 하단이 아닌 중앙에 뜨도록 조정했습니다.
- 팝업 오픈 시 페이지 스크롤 위치를 고정/복원해 화면이 살짝 밀리는 현상을 줄였습니다.
- 옵션 팝업은 공간을 더 잘 쓰도록 2열/3열 버튼 그리드로 표시됩니다.
- 좌측 패널 제목을 `컨트롤 콘솔`에서 `불러오기`로 정리했습니다.

## Pro v1.2.3 rhythm/performance refinement

- 박자 감지 엔진을 온셋 기반 다중 후보/그리드 스코어 방식으로 보강했습니다.
- 킥/하이햇/클랩 레이어에 스윙, 미세 휴먼라이즈, 소스 피크/저역/트랜지언트 기반 자동 감쇠를 추가했습니다.
- 악기 레이어 믹싱 루프를 채널 캐시 방식으로 최적화해 긴 파일에서 불필요한 반복 비용을 줄였습니다.
- 마스터링 완료 후 총 처리 시간, 실시간 배율, 가장 무거운 처리 단계를 분석 패널에 표시합니다.
- MP4/MOV 계열은 브라우저가 디코딩 가능한 오디오 트랙일 때 로컬 변환됩니다.

## v1.2 upgrades

- IndexedDB analysis cache for faster repeat loads
- Optional external WASM pitch engine adapter with WSOLA Worker fallback
- A/B level-matched preview mode
- Mastering difference meter and LUFS before/after graph
- Clipping-risk indicator
- Genre preset lock for manual genre corrections
- 24-bit WAV, 32-bit float WAV, and MP3 compatibility output
- 2-pass loudness finalizer and oversampled peak guard

## Run locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Optional external pitch engine

Put a compatible bridge at `vendor/wasm/pitch-engine.js`. If absent, the app uses its built-in WSOLA Worker.


## Pro v1.2
- Queue preview moved above loaded tracks.
- AI humanize mastering chain added: mid warmth, de-esser, high-frequency taming, 16 kHz musical low-pass.
- Track card mastering button restored.
- Auto remaster refresh after completed-track parameter edits.

## Pro v1.2 additional refinements
- AI 티 완화 엔진을 버튼형 기능으로 분리해 필요 시 ON/OFF할 수 있습니다.
- 스마트 과처리 방지를 추가해 고강도 마스터링에서도 밝기, 저역, 피크 과잉을 렌더 직전에 보정합니다.
- 금속성·초고역이 강한 소스는 Clarity/Intensity가 자동으로 살짝 완화되어 멜로디 손상을 줄입니다.


## Pro v1.2 refinements
- 피치/속도 기본값 배지 정리 및 초기화 버튼 제거
- 커스텀 프리뷰 플레이어 버튼을 아이콘형 컨트롤로 정리
- 모바일 플레이 게이지 및 상단 웨이브 반응형 개선
- 보컬 보호 모드 추가: 보컬 중심 곡에서 치찰음과 Exciter를 섬세하게 제어
- 상단 설명 문단 자동 줄바꿈 및 모바일 가독성 개선


## Pro v1.2 advanced engine upgrades

- Phase-coherent WSOLA pitch/BPM worker: stereo channels share one SOLA alignment plan to reduce image smear.
- Low-End Anchor: keeps low frequency energy more centered and stable for mobile playback.
- Melody Preserve Engine: protects vocal/lead/acoustic melody bands from over-exciting and over-compression.
- Transient Refine: softens brittle hi-hat, clap, and click peaks while keeping punch.
- DC-safe 2-pass finalizer with higher max-quality oversampling.


## Pro v1.2 UI stability patch
- 피치/BPM 영역의 퍼센트 표기를 제거하고 모바일에서 영역을 벗어나지 않도록 압축했습니다.
- 버튼형 적용 기능은 모바일에서도 3열을 유지하고 설명 말풍선은 화면 밖으로 나가지 않게 고정 위치로 계산합니다.
- 파일/폴더 업로드는 모바일에서도 2열 고정입니다.
- 모바일 상단 웨이브와 소개 패널 정렬을 안정화했습니다.
- 하단 브라우저 내부 처리 안내는 두 줄 문단으로 분리했습니다.

## Pro v1.2 mastering goal modes
- Added Mastering Goal selector: Melody Preserve, Natural Balance, and Loudness Focus.
- Goal mode automatically tunes target LUFS, true-peak ceiling, quality mode, intensity scaling, warmth, clarity, punch, and metallic removal behavior.
- Melody Preserve protects vocal/lead/acoustic lines with gentler punch and safer high-frequency behavior.
- Natural Balance keeps the recommended default for general release work.
- Loudness Focus increases punch and perceived loudness while adding extra metallic protection when needed.


## Pro v1.2 notes

- Versioning now uses 1.0, 1.1, 1.2 style increments.
- Pitch/BPM controls are stacked one per line for PC and mobile.
- Queue preview is renamed to 미리듣기.
- robots.txt and a host guard are included as deterrents against crawler/code reuse, but public client-side code cannot be fully hidden.

## Pro v1.2.1 cleanup patch
- 작업 실행 영역의 기본 셀렉트 박스를 버튼형 팝업 선택 UI로 개선했습니다. 선택 후 팝업이 자동으로 닫힙니다.
- 작업 실행 제목 옆의 "선택 · 전체 · 다운로드" 문구와 출력/엔진 박스 하단의 긴 버전 설명 문구를 제거했습니다.
- 모바일에서 퍼센트/상태/분석 값이 영역 밖으로 밀리지 않도록 숫자 폭, 줄바꿈, 상세 행 overflow를 보정했습니다.
- 모바일 렌더링 부담을 줄이기 위해 배경 장식, blur, hover transform, will-change 사용을 줄였습니다.
- 서브 클린업, 적응형 공진 스무더, 마이크로 다이내믹 글루를 마스터링 체인에 추가했습니다.


## Pro v1.2.2 rhythm/input/engine patch
- 피치/속도 영역에 박자 변경 버튼형 프리셋을 추가했습니다: 원본, -5%, -10%, +5%, +10%, 하프타임, 더블타임, 커스텀.
- 파일 입력에서 MP4/M4V/MOV 컨테이너를 허용합니다. 브라우저가 지원하는 오디오 트랙이 들어 있는 파일은 마스터링 대상으로 불러올 수 있습니다.
- 악기 추가 영역을 추가했습니다. 킥, 하이햇, 클랩, 킥+하이햇, 킥+하이햇+클랩을 자동 추정 BPM에 맞춰 가볍게 합성합니다.
- 악기 레이어는 렌더 직전 소스에 소량 믹스하고, 마지막 2-pass 파이널라이저와 피크 가드에서 안전하게 정리합니다.
- 마스터링 체인에 스펙트럴 밸런서와 새츄레이션 커브 캐시를 추가해 톤 보정은 더 섬세하게, 반복 렌더 부담은 더 낮췄습니다.
- 파이널라이저의 true-peak 검사 루프를 최적화해 Fast/Balanced 처리 속도를 개선했습니다.

## Pro v1.2.8 download/mobile UI patch
- MP3 output path now uses the bundled lamejs worker first, then WebCodecs, and only falls back to WAV when both MP3 encoders are unavailable.
- Added in-app browser download assist for KakaoTalk/Naver/Instagram/Line style WebViews. If automatic saving is blocked, a persistent help panel opens with a direct file link; supported mobile browsers can also use the native share/save sheet.
- Popup trigger buttons no longer show the extra "선택" text. A small chevron icon indicates popup behavior without taking text space.
- Instrument add UI was rebuilt so the two selects no longer collapse vertically on mobile/narrow columns.
- Creator/subscription text stays visible on mobile. Only the YouTube-style "구독" pill is red; "은 사랑입니다" is shown as smaller regular text.
- Pitch/BPM render output now receives a light transform safety polish: edge fade, DC-offset cleanup, and extra boundary smoothing for extreme pitch/speed settings.


## v1.3.11 Intelligent UI Planning Update

- 상단 소개 영역을 단일 통합 헤더로 개편했습니다. 모바일에서 배지, 버전, 구독 문구가 밀리지 않도록 `DESIGNED BY 곰같은여우 with AI` 정보를 작은 내부 카드로 합쳤습니다.
- 버튼형 적용 기능은 OFF 상태 항목을 앞쪽에, ON 상태 항목을 뒤쪽에 정렬합니다. 꺼진 기능을 먼저 찾고 켤 수 있어 실험 흐름이 더 빠릅니다.
- 기능 추가는 성능을 해치지 않는 것을 원칙으로 합니다. 다음 개발 방향은 무거운 실시간 모델보다 로컬 분석 결과를 재사용하는 지능형 추천, A/B 비교 개선, 안전한 엔진 가드 중심으로 진행합니다.

## v1.3.11 Smart Guard / Safety Upgrade

- Added Smart Performance Guard as a button-style utility feature. It keeps normal quality on PC, but can automatically reduce only the heaviest peak-check mode on older mobile devices or very long files.
- Added Engine Safety Score. The app now estimates over-processing risk from intensity, width, punch, clarity, pitch/BPM extremes, true-peak status, and vocal/phase/low-end protection.
- Upgraded Auto Highlight A/B. After mastering, the highlight point can be selected from an original-vs-mastered pair scan, so A/B loop comparison tends to start at a section where the change is easier to hear.
- Re-master flow now records repeat runs and labels performance guard decisions in the detail panel, making it clearer that repeated mastering is rendered from the original source path rather than blindly stacking output-on-output.
- Preview player visuals and utility feature cards received a small design refresh without adding heavy runtime effects.

## v1.3.16 Selection, download fallback, Firebase-ready security patch

- 트랙 카드 클릭과 작업 대상 선택의 역할을 분리했습니다. 카드 클릭은 현재 작업 트랙만 열고, 실제 배치 마스터링 대상은 `작업 선택` 버튼으로만 지정됩니다.
- 선택하지 않은 트랙은 현재 작업/장르 잠금 상태가 겹쳐도 외곽 테두리를 검정 계열로 고정했습니다. 선택 트랙만 색상 테두리를 사용합니다.
- `선택 트랙 마스터링`은 명시적으로 선택한 곡이 없으면 실행되지 않도록 바꿨습니다.
- 트랙 란 더블클릭, Delete, Backspace로 선택 해제를 유지했습니다.
- `작업 실행` 섹션명을 `마스터링 엔진`으로 바꿔 출력/엔진 설정 구역의 의미를 더 전문적으로 표현했습니다.
- 팝업 닫기 X 버튼을 flex 중앙 정렬로 통일했습니다.
- 카카오톡/인앱 브라우저 다운로드 실패 대응을 보강했습니다. 자동 저장이 막히면 도움창에서 `직접 저장`, `공유/저장`, `파일 열기`, `페이지 주소 복사` 대안을 제공합니다.
- GitHub Pages에서는 meta CSP가 유지되고, Firebase Hosting 배포 시 실제 HTTP 보안 헤더를 적용할 수 있도록 `firebase.json`을 추가했습니다.

## Firebase Hosting option

`firebase.json` includes strict HTTP headers for Firebase Hosting: CSP, Referrer-Policy, X-Content-Type-Options, COOP, CORP, Origin-Agent-Cluster, Permissions-Policy, HSTS, and cache headers. Replace `.firebaserc.example` with your project id before deploying.

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

Firebase Hosting can later be combined with Cloud Functions, Firestore, Storage, and Authentication for real server-side visitor statistics, admin authentication, managed downloads, and protected APIs. The current static app intentionally does not include Firebase SDK calls by default so the CSP can stay strict until the backend design is finalized.
