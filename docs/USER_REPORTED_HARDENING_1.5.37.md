# User-reported hardening - v1.5.37

## Findings

1. The Service Worker did not explicitly exclude local object/data URL schemes. Modern browsers often bypass these requests, but relying on implicit behavior is unsafe because the cache strategy assumes network-backed requests.
2. Completed PCM was already governed by a memory policy, so two completed tracks were not normally retained. However, one selected mobile track could still keep a large `AudioBuffer`; mobile and <=4 GB profiles now release it immediately after encoding.
3. Kakao download handling already prefers file sharing and displays an external-browser/save-assist dialog. No toast-only critical path remains; v1.5.37 keeps that flow.
4. Import analysis already used concurrency 1, so 35 `arrayBuffer()` objects were not loaded together. A single 220 MB decode and unrestricted mobile batch selection remained risky, so low-memory limits were added.
5. Waveform progress still queried bars and toggled classes during playback. It now updates CSS custom properties, caches bar references, and batches Dock synchronization through one animation frame.
6. Release metadata already had a package.json source of truth and CI validation. A local pre-commit enforcement path was added. Firebase was genuinely eager because static remote imports delayed module completion; remote SDK loading is now idle/deferred.

## Low-memory import policy

- Maximum tracks: 10
- Maximum file size: 128 MB
- Maximum accepted bytes per selection: 400 MB
- Analysis concurrency: 1
- Inter-track cooldown: 200 ms

## Compatibility note

Desktop browsers may retain one selected completed PCM buffer, capped at 384 MB, to support MP3/WAV re-encoding without remastering. Mobile, coarse-pointer, restricted in-app, and <=4 GB-memory environments retain only the encoded output Blob.
