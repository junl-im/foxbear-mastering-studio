// FoxBear AI Mastering Studio Pro v1.3.44 - shared core/audio utility module
(function registerFoxBearCoreUtils(global) {
    'use strict';

    const DEFAULT_WAVEFORM_BINS = 96;

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function clamp01(value) {
        return clamp(value, 0, 1);
    }

    function map(value, inMin, inMax, outMin, outMax) {
        return outMin + (Number(value) - inMin) * (outMax - outMin) / (inMax - inMin);
    }

    function dbToAmp(db) {
        return Math.pow(10, db / 20);
    }

    function median(values) {
        if (!Array.isArray(values) || !values.length) return 0;
        const sorted = values.slice().sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    function normalizeWaveformValues(values = [], targetBins = DEFAULT_WAVEFORM_BINS) {
        if (!Array.isArray(values) || !values.length) return [];
        const bins = Math.max(8, Math.round(Number(targetBins) || DEFAULT_WAVEFORM_BINS));
        const out = [];
        for (let i = 0; i < bins; i += 1) {
            const index = Math.min(values.length - 1, Math.floor((i / bins) * values.length));
            out.push(clamp01(Number(values[index]) || 0));
        }
        const max = Math.max(...out, 0.001);
        return out.map(value => clamp01(value / max));
    }

    function sampleMarkersFromValues(values = []) {
        if (!Array.isArray(values) || !values.length) return [];
        return values.map((value, index) => (value >= 0.92 ? index : -1)).filter(index => index >= 0).slice(0, 10);
    }

    function createWaveformOverview(beforeBuffer, afterBuffer, bins = DEFAULT_WAVEFORM_BINS) {
        return {
            original: sampleWaveformOverview(beforeBuffer, bins),
            mastered: sampleWaveformOverview(afterBuffer, bins),
            originalPeaks: samplePeakMarkers(beforeBuffer, bins),
            masteredPeaks: samplePeakMarkers(afterBuffer, bins)
        };
    }

    function sampleWaveformOverview(buffer, bins = DEFAULT_WAVEFORM_BINS) {
        if (!buffer || !buffer.length || typeof buffer.getChannelData !== 'function') return [];
        const length = buffer.length;
        const channels = Math.min(buffer.numberOfChannels || 1, 2);
        const output = [];
        for (let i = 0; i < bins; i += 1) {
            const start = Math.floor((i / bins) * length);
            const end = Math.max(start + 1, Math.floor(((i + 1) / bins) * length));
            let peak = 0;
            for (let ch = 0; ch < channels; ch += 1) {
                const data = buffer.getChannelData(ch);
                for (let index = start; index < end; index += 1) {
                    const value = Math.abs(data[index] || 0);
                    if (value > peak) peak = value;
                }
            }
            output.push(clamp01(peak));
        }
        const max = Math.max(...output, 0.001);
        return output.map(value => clamp01(value / max));
    }

    function samplePeakMarkers(buffer, bins = DEFAULT_WAVEFORM_BINS) {
        const values = sampleWaveformOverview(buffer, bins);
        return sampleMarkersFromValues(values);
    }

    global.FoxBearCoreUtils = Object.freeze({
        clamp,
        clamp01,
        map,
        dbToAmp,
        median,
        normalizeWaveformValues,
        sampleMarkersFromValues,
        createWaveformOverview,
        sampleWaveformOverview,
        samplePeakMarkers
    });
})(typeof window !== 'undefined' ? window : globalThis);
