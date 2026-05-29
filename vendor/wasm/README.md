# Optional WASM Pitch Engine Slot

Place an external high-quality pitch/time-stretch bridge here as `pitch-engine.js`.

It should export:

```js
export async function processPitchSpeed({ sourceBuffer, transform, makeAudioBuffer, qualityMode }) {
  // return an AudioBuffer or null to fall back to the built-in WSOLA Worker
}
```

This repository does not bundle Rubber Band, SoundTouch, or other third-party WASM binaries because licensing and build targets vary. The adapter is ready for them when you decide which engine to ship.
