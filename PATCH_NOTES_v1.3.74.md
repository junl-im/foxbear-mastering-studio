# v1.3.74 Dock Integrated Waveform Remote

## What changed

- Rebuilt the Dock preview area around an integrated waveform player.
  - Play/pause, waveform seek, current source label, and time display now live in one control.
  - The old separated player seek bar and mini peak view no longer fight for pointer events.
- Changed the Dock compare opener to a compact `큰 비교` button.
  - It opens a large waveform comparison popup for original vs mastered/highlight audio.
- Added large compare audition buttons.
  - `원곡 듣기`, `마스터링 듣기`, and `하이라이트 듣기` switch the Dock player source and start playback.
- Renamed `추천구간 미리듣기` to `하이라이트 듣기`.
- Moved `하이라이트 듣기` into the first Dock action position.
- Renamed the mastering action to `마스터링 시작` and centered it in the action row.
- Added a capture fallback for `버튼 보기` so the button-style feature popup still opens even when other UI layers are active.

## QA

- Added `qa/dock_integrated_waveform_remote_smoke.js`.
- Updated Dock waveform/action tests for the new single-line remote layout.
- `npm run check` passes.
