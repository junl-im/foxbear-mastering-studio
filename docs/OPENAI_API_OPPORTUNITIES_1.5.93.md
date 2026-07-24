# OpenAI API opportunities for FoxBear v1.5.93

## Recommended first integration: structured mastering advisor

Use the OpenAI Responses API from a Firebase Cloud Function, never directly from browser code. Send the existing FoxBear analysis/report JSON rather than raw PCM by default. Request a strict structured result containing:

- concise mastering diagnosis
- prioritized risks
- suggested setting changes within FoxBear's supported ranges
- confidence and evidence fields
- user-facing explanation in Korean

The server must validate every suggested value before the client can display it. Applying settings should always require explicit user confirmation. Log an internal client request ID and the OpenAI request ID for support diagnostics.

## Recommended second integration: documentation and troubleshooting search

Index README, release notes, QA reports, recovery guides, and Firebase operations documentation in a vector store. File Search can then answer operational questions with retrieved project evidence instead of relying on model memory.

Good targets:

- Browser release gate troubleshooting
- Kakao and iOS recovery steps
- download and PWA recovery
- mastering quality warnings
- incident-mail operations

## Recommended third integration: offline evaluation with Batch API

Use Batch API for non-interactive evaluation of many anonymized analysis reports. This is suitable for nightly or release-time checks where immediate responses are unnecessary.

Examples:

- compare AI explanations against deterministic FoxBear quality gates
- detect inconsistent recommendations across genres
- grade whether suggested settings stay inside allowed ranges
- build release evaluation summaries

## Optional integrations

### Speech-to-text

Transcribe vocal reference tracks or voice memos into lyrics, section notes, and user intent. Uploading raw audio should be opt-in, clearly disclosed, and governed by deletion/retention controls.

### Realtime voice assistant

A low-latency voice control layer could answer questions such as "why did the limiter reduce 3 dB?" or navigate settings hands-free. This is lower priority than the structured advisor because it adds session, microphone, interruption, and mobile lifecycle complexity.

### Background responses and webhooks

Longer album-level reviews can run in the background and notify the Firebase backend on completion. This should be used only for tasks that do not need an immediate UI response.

## Security and privacy requirements

- Keep API keys only in Firebase Functions secrets or another server-side secret manager.
- Never embed an OpenAI API key in `src`, `index.html`, service worker assets, or browser storage.
- Prefer analysis metrics and settings over raw audio uploads.
- Require explicit consent before uploading audio or transcripts.
- Add App Check, authenticated callable functions, per-user quotas, request timeouts, and spend limits.
- Store the minimum necessary response data and provide deletion controls.
- Pin model versions where consistent behavior matters and evaluate changes before release.

## Suggested rollout

1. Read-only structured explanation from existing report JSON.
2. Suggested setting changes with strict validation and explicit apply confirmation.
3. File Search troubleshooting assistant.
4. Batch-based release evaluations.
5. Optional transcription or Realtime voice features after privacy and device QA.
