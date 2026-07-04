# FoxBear AI Mastering Studio

## Pro v1.3.45 Recommendation Explainability

This static build adds clearer AI recommendation reasoning without changing the mastering render path.

### What changed
- Recommendation popup now shows compact 판단 근거 chips.
- Each recommended/candidate genre includes a short reason and 감점 요인.
- AI mastering card shows the same recommendation signals, cautions, and candidate tooltips.
- Original Selection remains manual-only and explains that it bypasses AI preset application.
- Recommendation objects now carry structured explanation metadata for QA/reporting.
- Updated version, cache busting, SRI, and QA documentation for v1.3.45.

### Verify
```bash
npm run check
```

The check validates syntax, SRI, runtime smoke tests, recommendation popup, shared DSP profile, dock waveform, engine QA bench, strength profile behavior, preview translation controls, module split stage 2, and recommendation explainability.
