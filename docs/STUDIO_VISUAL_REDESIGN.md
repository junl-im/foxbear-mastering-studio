# Studio visual redesign · 2026-10-12

The visual system uses graphite surfaces, warm amber for primary mastering actions, and teal for audio identity. Static waveform artwork is decorative, not a live meter. All processing remains local and the DSP chain is unchanged.

## Workspace hierarchy

- Preserve the required AI/Expert choice at each document entry.
- Expert desktop: a control rail and a continuous queue/engine/analysis workspace; remove the mostly empty third column.
- Expert mobile: a single column, with advanced sound tools in a keyboard-accessible native disclosure. Desktop starts expanded; mobile starts collapsed. Manual choices remain intact on resize and mode switches.
- AI: compact brand strip and shared queue/analysis workflow.
- The queue has a single empty-state message. Subscription support sits in normal page flow rather than covering controls.

## Validation

Browser coverage includes 320, 390, 768, 1024 and 1440px panel bounds and overflow, workspace separation, disclosure keyboard operation and retained preset value, required entry selection, import/master/clear, and existing header geometry checks. CI validates the full static and browser release suites. Real phone/device validation remains distinct from browser emulation.

## Readability follow-up · 2026-10-12

A rendered-color audit found header microcopy at about 2.26:1–3.25:1 because older rules retained translucent text. Opaque secondary colors now separate helper text from graphite backgrounds. Panel and control surfaces use different lightness values, borders are clearer, disabled buttons retain readable text, and keyboard focus is more visible. Body helper copy is slightly larger.

A browser regression checks selected chooser, header, setting, disabled action and loaded-track text at a minimum 4.5:1 in desktop and mobile layouts. This is a targeted solid-color contrast check, not a claim of a complete accessibility audit; background artwork and all possible popups need separate review. Real physical phones remain outside browser emulation coverage.

## Signature motion · 2026-10-12

The shared signature trace gently sways on a seven-second CSS transform loop. Axes and labels remain fixed, and the SVG container never moves. Reduced-motion preference disables the trace animation. This is decorative brand artwork, independent of audio processing.
