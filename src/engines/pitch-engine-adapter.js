// FoxBear optional external pitch engine adapter.
// Drop a compatible WASM bridge at vendor/wasm/pitch-engine.js exporting processPitchSpeed().
// The app falls back to the built-in WSOLA Worker when no external engine is installed.

function makeAbortError(signal, stage = 'external-pitch-cancelled') {
    const reason = signal?.reason;
    if (reason instanceof Error) return reason;
    const error = new Error(String(reason || stage));
    error.name = 'AbortError';
    error.code = 'FOXBEAR_WORKER_JOB_CANCELLED';
    return error;
}

function throwIfAborted(signal, stage) {
    if (signal?.aborted) throw makeAbortError(signal, stage);
}

export async function processPitchSpeed({ sourceBuffer, transform, makeAudioBuffer, qualityMode, signal = null }) {
    throwIfAborted(signal, 'external-pitch-before-import');
    try {
        const engine = await import('../../vendor/wasm/pitch-engine.js');
        throwIfAborted(signal, 'external-pitch-after-import');
        if (engine && typeof engine.processPitchSpeed === 'function') {
            const output = await engine.processPitchSpeed({ sourceBuffer, transform, makeAudioBuffer, qualityMode, signal });
            throwIfAborted(signal, 'external-pitch-after-process');
            return output;
        }
    } catch (error) {
        if (signal?.aborted || error?.name === 'AbortError' || error?.code === 'FOXBEAR_WORKER_JOB_CANCELLED') throw error;
        // External engine is optional. Return null to trigger built-in fallback.
    }
    return null;
}
