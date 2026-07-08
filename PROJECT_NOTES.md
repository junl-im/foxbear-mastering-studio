# Project Notes - FoxBear AI Mastering Studio

## v1.4.18 Download dialog micro hint
- v1.4.17 made the recovery checklist compact, but the first dialog could still feel verbose.
- v1.4.18 adds `getDownloadDialogCompactHint()` for a micro first-screen hint.
- The dialog now shows only the most practical next actions first.
- Advanced support actions remain in `추가 옵션` instead of occupying the main screen.
- The dialog flow-step append path was cleaned to avoid duplicate append logic.

## Download/share design direction
- Keep Dock clean.
- Use main download popup for normal export actions.
- Use save-assist popup when downloads are hidden, blocked, or confusing.
- Show micro guidance first; keep diagnostics/checklist copy for support.

## Legacy anchors
- Stage7: compare modal and `waveform-compare-view.js`.
- Stage9: Dock waveform CSS split.
- Stage13: Runtime Health.
- Stage14: Runtime recovery.
- Stage23: playback orchestration.
- Stage27: common waveform control service.
- Stage28: `waveform-control-view.js` extraction.

## Compatibility anchor notes
- Stage8: async mobile Dock safeguards remain supported.
- Stage9.1: cumulative overwrite packaging remains supported.
- Stage10: download service split remains supported.
- Stage11 and Stage11.1: modular renovation and mobile runtime hotfix remain supported.
- Stage12: detail view split remains supported.
- Stage13 / Stage14: Runtime Health and runtime recovery remain supported.
- Stage27: waveform-control-service remains the shared waveform logic module.
- Stage28: unmanaged waveform audit and waveform-control-view.js extraction remain valid.
- Dock mini FFT was removed by design; renderMini removed and detail-only FFT remains.
- Exit Guard remains active for refresh/back protection.
- v1.4.18 performance diagnostics remain available with adaptive refresh and copy support.

## v1.4.18 cumulative compatibility anchors
- stability notes: navigation confirm debounce, FFT lifecycle stabilization, and external analyser coverage remain active.
- Dock FFT removal remains intentional and settings gear alignment remains active.
- Performance diagnostics remain available with adaptive refresh and copy support.
- Packaging polish remains active for version-synced overwrite ZIP names.
- Download/share reliability remains active with a shorter first-screen dialog.
