# FoxBear AI Mastering Studio Pro v1.3.2

GitHub Pages-ready modular browser mastering studio.

## Pro v1.3.2 preset/research engine upgrade
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
- MP3 output path now tries the bundled worker first with lamejs CDN fallback, then WebCodecs, and only falls back to WAV when both MP3 encoders are unavailable.
- Added in-app browser download assist for KakaoTalk/Naver/Instagram/Line style WebViews. If automatic saving is blocked, a persistent help panel opens with a direct file link; supported mobile browsers can also use the native share/save sheet.
- Popup trigger buttons no longer show the extra "선택" text. A small chevron icon indicates popup behavior without taking text space.
- Instrument add UI was rebuilt so the two selects no longer collapse vertically on mobile/narrow columns.
- Creator/subscription text stays visible on mobile. Only the YouTube-style "구독" pill is red; "은 사랑입니다" is shown as smaller regular text.
- Pitch/BPM render output now receives a light transform safety polish: edge fade, DC-offset cleanup, and extra boundary smoothing for extreme pitch/speed settings.


## v1.3.2 Intelligent UI Planning Update

- 상단 소개 영역을 단일 통합 헤더로 개편했습니다. 모바일에서 배지, 버전, 구독 문구가 밀리지 않도록 `DESIGNED BY 곰같은여우 with AI` 정보를 작은 내부 카드로 합쳤습니다.
- 버튼형 적용 기능은 OFF 상태 항목을 앞쪽에, ON 상태 항목을 뒤쪽에 정렬합니다. 꺼진 기능을 먼저 찾고 켤 수 있어 실험 흐름이 더 빠릅니다.
- 기능 추가는 성능을 해치지 않는 것을 원칙으로 합니다. 다음 개발 방향은 무거운 실시간 모델보다 로컬 분석 결과를 재사용하는 지능형 추천, A/B 비교 개선, 안전한 엔진 가드 중심으로 진행합니다.
