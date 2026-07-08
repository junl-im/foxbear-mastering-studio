# FoxBear AI Mastering Studio Pro v1.4.18

Current patch: **v1.4.18 Download dialog micro hint**.

## Highlights
- The download popup now shows a shorter first-screen hint for Kakao/in-app and mobile browsers.
- Kakao/in-app users see the practical order first: `공유/저장 → 파일 열기`.
- Diagnostics, `안내 복사`, `진단 복사`, and `체크리스트 복사` remain under `추가 옵션`.
- The flow-step rendering path was cleaned so each step is appended once.
- Dock FFT remains removed; FFT is detail-screen only.

## QA

```bash
npm run check
```

## Release artifacts
- Full release ZIP: `dist/foxbear-mastering-studio-v1.4.18-release.zip`
- Overwrite ZIP: `dist/foxbear-mastering-studio-v1.4.18-overwrite.zip`

## Diagnostics
- Performance diagnostics: open with `?perf=1` or `Ctrl/Command + Alt + P`.
- Download diagnostics: use `추가 옵션 → 진단 복사`.
- User-friendly save order: use `추가 옵션 → 체크리스트 복사`.

## Detail-only FFT
- v1.4.18 keeps FFT detail-only. Dock mini FFT and `renderMini` remain removed.
