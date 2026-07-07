# FoxBear QA Report - v1.4.12

## Summary

- Version: `1.4.12`
- Runtime asset key: `1.4.12-download-diagnostics`
- Focus: Download/share diagnostics follow-up after Kakao/in-app fallback work
- Result: `npm run check` PASS
- Checks: 131/131 PASS

## Commands run

```bash
npm run sri:update
npm run check
```

## New/updated coverage

- `qa/v1412_download_share_reliability_smoke.js`
- `qa/v1412_download_diagnostics_followup_smoke.js`
- `qa/BROWSER_BACK_QA_MATRIX_1.4.12.md`

## Notes

- Real-device KakaoTalk, Android Chrome, iOS Safari, and PWA download/share tests still require manual verification.
- v1.4.12 adds `진단 복사` so failed download/share paths can produce copyable diagnostics for follow-up tuning.
