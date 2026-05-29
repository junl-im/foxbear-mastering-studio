// FoxBear optional external pitch engine adapter.
// Drop a compatible WASM bridge at vendor/wasm/pitch-engine.js exporting processPitchSpeed().
// The app falls back to the built-in WSOLA Worker when no external engine is installed.
export async function processPitchSpeed({ sourceBuffer, transform, makeAudioBuffer, qualityMode }) {
    try {
        const engine = await import('../../vendor/wasm/pitch-engine.js');
        if (engine && typeof engine.processPitchSpeed === 'function') {
            return await engine.processPitchSpeed({ sourceBuffer, transform, makeAudioBuffer, qualityMode });
        }
    } catch (error) {
        // External engine is optional. Return null to trigger built-in fallback.
    }
    return null;
}
