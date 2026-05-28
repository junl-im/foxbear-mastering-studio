# FoxBear AI Mastering Studio Pro v2.0

곰같은여우 with AI를 위한 GitHub 배포형 브라우저 마스터링 콘솔입니다. 단일 HTML의 한계를 넘기 위해 UI, CSS, 엔진 Worker, 인코딩 Worker, GitHub Pages 배포 설정을 분리했습니다.

## 핵심 업그레이드

- 메인 UI와 DSP 앱 로직 분리
- 분석 Worker 추가: 대용량 파일 분석 시 UI 멈춤 감소
- WAV 인코딩 Worker 강화
- 24-bit PCM WAV 출력
- 32-bit Float WAV 출력 옵션 추가
- MP3 192/320 kbps 출력 옵션 추가
- MP3는 브라우저 WebCodecs 네이티브 MP3 인코더가 있을 때 활성화되며, 미지원 환경은 자동으로 24-bit WAV로 대체
- LUFS 유사 라우드니스 표시 추가
- 출력 포맷 선택 UI 추가
- GitHub Pages Actions 배포 설정 포함

## 폴더 구조

```txt
foxbear-github-pro-v2.0/
├─ index.html
├─ assets/
│  ├─ css/studio.css
│  └─ icons/foxbear.svg
├─ src/
│  ├─ app.js
│  └─ workers/
│     ├─ analysis.worker.js
│     ├─ wav-encoder.worker.js
│     └─ mp3-encoder.worker.js
├─ .github/workflows/pages.yml
├─ .nojekyll
├─ package.json
└─ README.md
```

## 로컬 테스트

Worker는 `file://` 직접 실행에서 막힐 수 있으니 로컬 서버로 여세요.

```bash
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080`으로 접속합니다.

## GitHub Pages 배포

1. GitHub Desktop에서 이 폴더를 저장소로 추가합니다.
2. 커밋 메시지 예시: `FoxBear Pro v2.0 DSP worker upgrade`
3. Publish repository를 누릅니다.
4. GitHub Actions가 `.github/workflows/pages.yml`을 통해 Pages 배포를 처리합니다.

## MP3 출력 안내

MP3 인코딩은 브라우저가 WebCodecs 기반 MP3 AudioEncoder를 제공할 때만 실제 MP3로 저장됩니다. 지원하지 않는 브라우저에서는 자동으로 24-bit WAV로 저장되도록 설계했습니다. 안정성 최우선 배포라면 24-bit WAV를 추천하고, 보관용 최고 보존은 32-bit Float WAV를 추천합니다.

## 다음 고성능 후보

- WebAssembly 기반 Rubber Band / SoundTouch 계열 피치·타임 스트레치 엔진 연결
- 2-pass loudness target 렌더링
- 실시간 A/B 레벨 매칭
- 장르별 멀티밴드 컴프레서 추가
- 마스터링 전/후 스펙트럼 비교 뷰
