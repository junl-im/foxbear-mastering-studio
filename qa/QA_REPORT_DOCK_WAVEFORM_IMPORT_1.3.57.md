# QA Report — v1.3.57 Dock Waveform Sync + Broad Audio Import

## Scope
- Dock waveform live playhead alignment with the visible bars.
- Dock/popup waveform touch seek mapping.
- Broadened import accept list for common browser-decodable and mobile-recorded audio containers.

## Checks
- `mapAudioPercentToWaveformVisualPercent()` maps playback percent to the nearest visible waveform bar center.
- `mapWaveformPointerToAudioPercent()` maps touch/click position back to the nearest waveform bin.
- Dock and popup waveform bars now share the same pointer mapping path.
- Pointer/touch seek is bound in addition to click/keyboard seek.
- File input, reference input, File System Access picker, folder traversal, and PWA share target accept lists include expanded audio/container extensions.
- Unsupported codecs still fail safely at decode with a format-specific message.

## Result
PASS — Dock waveform position is tied to the rendered bar geometry, waveform touch seeks play the touched section, and import handling accepts a wider set of audio file extensions while preserving decode fallback messaging.
