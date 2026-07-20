// FoxBear AI Mastering Studio Pro v1.5.41 - shared core/audio utility module
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
        return values.map(value => {
            const normalized = clamp01(Number(value) || 0);
            if (normalized >= 0.985) return 'clip';
            if (normalized >= 0.92) return 'hot';
            return 'ok';
        });
    }

    function getWaveformMarkerForIndex(markers = [], index = 0, total = 1, value = 0) {
        const list = Array.isArray(markers) ? markers : [];
        let marker = '';
        if (list.length) {
            const mappedIndex = list.length === total
                ? index
                : Math.round(index / Math.max(1, total - 1) * Math.max(0, list.length - 1));
            marker = String(list[mappedIndex] || '').toLowerCase();
        }
        if (marker === 'clip' || marker === 'hot' || marker === 'ok') return marker;
        const normalized = clamp01(Number(value) || 0);
        if (normalized >= 0.985) return 'clip';
        if (normalized >= 0.92) return 'hot';
        return 'ok';
    }

    function createWaveformOverview(beforeBuffer, afterBuffer, bins = DEFAULT_WAVEFORM_BINS) {
        const original = sampleWaveformOverview(beforeBuffer, bins);
        const mastered = sampleWaveformOverview(afterBuffer, bins);
        const originalPeaks = samplePeakMarkers(beforeBuffer, bins);
        const masteredPeaks = samplePeakMarkers(afterBuffer, bins);
        return {
            // New canonical names.
            original,
            mastered,
            originalPeaks,
            masteredPeaks,
            // Legacy aliases still used by detail/Dock panels.
            before: original,
            after: mastered,
            peakMarkers: masteredPeaks
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
        getWaveformMarkerForIndex,
        // Backward-compatible alias for accidental lowercase-l typo reports.
        getWaveformMarkerForlndex: getWaveformMarkerForIndex,
        createWaveformOverview,
        sampleWaveformOverview,
        samplePeakMarkers
    });
})(typeof window !== 'undefined' ? window : globalThis);
