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
