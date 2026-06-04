# FoxBear v1.3.11 QA Report

## Applied fixes
- Preview pop-up now shows a compact selected-song info strip: title, duration, size, type, and preset.
- Preview pop-up keeps the same custom player interface as the work queue preview.
- Realtime preview faders keep Mastering Strength first and include Pitch and BPM controls.
- Realtime fader number inputs hide browser spinner arrows so the value/% area no longer covers the control.
- Mobile preview faders use a fixed 5-column compact grid so the 10 controls form two rows on normal mobile widths.
- Track queue cards have stronger active/selected border distinction and lower emphasis for unselected cards.
- Work summary stat cards, action buttons, output settings, and snapshot/pro tools panels have balanced breathing room again.
- Parent/child border spacing was softened: closer than the original wide layout, but not as compressed as v1.3.9.
- File upload labels changed to `파일열기`; folder upload labels changed to `폴더열기`.
- Program intro copy now breaks lines after the main studio sentence for cleaner readability.
- Hero analog knobs were redrawn with tick marks, deeper shadows, and inner highlights.
- Creator nametag hover transform was removed to prevent subtle shaking.
- Mobile creator nametag width was reduced; `DESIGNED BY` aligns left while `곰같은여우 with AI` stays centered.
- Large section labels remain only slightly larger than normal body text, including Genre Preset.

## Checks performed
- npm run check: passed twice.
- src/app.js syntax: passed.
- all worker syntax checks: passed.
- optional pitch adapter syntax check: passed.
- HTML duplicate ID scan: no duplicates.
- local asset reference scan: no missing local files.
- CSS brace balance: matched.
- ZIP integrity: passed after packaging.

## Runtime note
Audio-device playback and subjective sound-quality checks still require a real browser on desktop/mobile, because this container cannot verify actual speaker output or touch interaction.
