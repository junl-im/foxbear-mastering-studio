# FoxBear AI Mastering Studio Pro v1.0

GitHub 배포용 모듈형 브라우저 마스터링 콘솔입니다. 기존 단일 HTML 버전을 기반으로 `HTML / CSS / JS / Worker / Assets`를 분리했습니다.

## 구조

```txt
foxbear-github-pro-v1.0/
├─ index.html
├─ assets/
│  ├─ css/studio.css
│  └─ icons/foxbear.svg
├─ src/
│  ├─ app.js
│  └─ workers/wav-encoder.worker.js
├─ .github/workflows/pages.yml
├─ package.json
└─ README.md
```

## Pro v1.0 업그레이드

- 단일 HTML에서 CSS/JS/Worker/아이콘을 분리
- 24-bit PCM WAV 출력으로 16-bit 양자화 손실 감소
- WAV 인코딩을 Web Worker로 오프로드해 대용량 파일 처리 중 UI 멈춤 감소
- 기존 Intensity 50~200%, High-Frequency Exciter, Metallic Removal, True Peak Guard, 장르 추천 보정 로직 유지
- GitHub Pages 배포 준비 완료

## 로컬 실행

보안 정책 때문에 Worker는 `file://`에서 막힐 수 있습니다. 로컬 서버로 실행하세요.

```bash
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080`을 열면 됩니다.

## GitHub Desktop 배포

1. 이 폴더를 GitHub Desktop에 추가합니다.
2. 커밋 메시지 예시: `FoxBear Pro v1.0 modular mastering build`
3. `Publish repository`로 GitHub에 올립니다.
4. GitHub 저장소의 `Settings > Pages`에서 GitHub Actions 또는 branch 배포를 선택합니다.

## 주의

브라우저 기반 피치/BPM 처리는 원리상 완전 무손실을 보장할 수 없습니다. Pro v1.0은 단일 HTML 범위보다 더 나은 구조와 24-bit 출력, Worker 인코딩으로 품질 손실과 UI 병목을 줄이는 방향입니다. 상용 DAW 수준의 타임 스트레칭까지 가려면 다음 단계로 WASM 기반 Rubber Band / SoundTouch 계열 엔진 연결을 권장합니다.
