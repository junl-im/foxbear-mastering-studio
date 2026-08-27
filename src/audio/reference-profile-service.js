// FoxBear Reference Profile service v1.5.0 - 64/96-band log-spectrum profile helpers
// Compatibility lineage: 1.5.0-reference-profile-64-96
'use strict';

(function attachFoxBearReferenceProfileService(global) {
    const core = global.FoxBearCoreUtils || {};
    const clamp = core.clamp || ((value, min, max) => Math.max(min, Math.min(max, value)));
    const clamp01 = core.clamp01 || (value => clamp(Number(value) || 0, 0, 1));

    const LOW_HZ = 20;
    const HIGH_HZ = 20000;

    function createLogBands(count = 64, lowHz = LOW_HZ, highHz = HIGH_HZ) {
        const bands = [];
        const safeCount = Math.max(8, Math.min(128, Math.round(Number(count) || 64)));
        const low = Math.max(10, Number(lowHz) || LOW_HZ);
        const high = Math.max(low * 2, Number(highHz) || HIGH_HZ);
        const ratio = Math.pow(high / low, 1 / safeCount);
        let from = low;
        for (let i = 0; i < safeCount; i += 1) {
            const to = i === safeCount - 1 ? high : from * ratio;
            bands.push(Object.freeze({ index: i, fromHz: Math.round(from), toHz: Math.round(to), centerHz: Math.round(Math.sqrt(from * to)) }));
            from = to;
        }
        return Object.freeze(bands);
    }

    function normalizeProfile(values, count = 64) {
        const safeCount = Math.max(8, Math.min(128, Math.round(Number(count) || 64)));
        const input = Array.isArray(values) ? values : [];
        const out = new Array(safeCount).fill(0);
        if (!input.length) return out;
        if (input.length === safeCount) {
            for (let i = 0; i < safeCount; i += 1) out[i] = clamp01(input[i]);
        } else for (let i = 0; i < safeCount; i += 1) {
            const pos = input.length === 1 ? 0 : i * (input.length - 1) / Math.max(1, safeCount - 1);
            const left = Math.floor(pos);
            const right = Math.min(input.length - 1, left + 1);
            const mix = pos - left;
            out[i] = clamp01((Number(input[left]) || 0) * (1 - mix) + (Number(input[right]) || 0) * mix);
        }
        const sum = out.reduce((acc, value) => acc + value, 0);
        if (sum > 1e-9) return out.map(value => Number((value / sum).toFixed(6)));
        return out;
    }

    function resampleProfile(profile, count = 64) {
        return normalizeProfile(profile, count);
    }

    function makeProfileFromBands(bands = {}, count = 64) {
        const safeCount = Math.max(8, Math.min(128, Math.round(Number(count) || 64)));
        const out = new Array(safeCount).fill(0);
        const ranges = [
            ['sub', 0.00, 0.10],
            ['bass', 0.10, 0.24],
            ['lowMid', 0.24, 0.43],
            ['mid', 0.43, 0.64],
            ['presence', 0.64, 0.78],
            ['high', 0.78, 0.91],
            ['air', 0.91, 1.00]
        ];
        const fallbackBass = Number(bands.bass ?? bands.bassRatio ?? 0.25);
        const fallbackLowMid = Number(bands.lowMid ?? bands.lowMidRatio ?? 0.22);
        const fallbackMid = Number(bands.mid ?? bands.midRatio ?? 0.28);
        const fallbackHigh = Number(bands.high ?? bands.highRatio ?? 0.25);
        const source = {
            sub: Number(bands.sub ?? fallbackBass * 0.22),
            bass: fallbackBass,
            lowMid: fallbackLowMid,
            mid: fallbackMid,
            presence: Number(bands.presence ?? fallbackHigh * 0.38),
            high: fallbackHigh,
            air: Number(bands.air ?? fallbackHigh * 0.22)
        };
        for (const [key, startRatio, endRatio] of ranges) {
            const start = Math.max(0, Math.floor(startRatio * safeCount));
            const end = Math.max(start + 1, Math.min(safeCount, Math.ceil(endRatio * safeCount)));
            const value = Math.max(0, Number(source[key]) || 0);
            for (let i = start; i < end; i += 1) out[i] += value / Math.max(1, end - start);
        }
        return normalizeProfile(out, safeCount);
    }

    function compareProfiles(current = [], target = [], count = 64) {
        const a = normalizeProfile(current, count);
        const b = normalizeProfile(target, count);
        let abs = 0;
        let signed = 0;
        let maxDelta = 0;
        let maxIndex = 0;
        for (let i = 0; i < a.length; i += 1) {
            const d = a[i] - b[i];
            abs += Math.abs(d);
            signed += d;
            if (Math.abs(d) > Math.abs(maxDelta)) {
                maxDelta = d;
                maxIndex = i;
            }
        }
        return Object.freeze({ count: a.length, distance: Number(abs.toFixed(6)), signed: Number(signed.toFixed(6)), maxDelta: Number(maxDelta.toFixed(6)), maxIndex });
    }


    function finite(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function round(value, digits = 4) {
        const power = 10 ** digits;
        return Math.round(finite(value) * power) / power;
    }

    function normalizedDelta(current, target, span, fallback = 0) {
        const safeSpan = Math.max(1e-6, Math.abs(finite(span, 1)));
        return clamp((finite(target, fallback) - finite(current, fallback)) / safeSpan, -1, 1);
    }

    function buildReferenceMatch2(current = {}, target = {}, options = {}) {
        const count = Math.max(24, Math.min(96, Math.round(finite(options.bandCount, 64))));
        const currentProfile = Array.isArray(current.spectrumProfile64) && current.spectrumProfile64.length >= 8
            ? normalizeProfile(current.spectrumProfile64, count)
            : makeProfileFromBands(current.spectrumBands || current, count);
        const targetProfile = Array.isArray(target.spectrumProfile64) && target.spectrumProfile64.length >= 8
            ? normalizeProfile(target.spectrumProfile64, count)
            : makeProfileFromBands(target.spectrumBands || target, count);
        const profile = compareProfiles(currentProfile, targetProfile, count);
        const bands = createLogBands(count, LOW_HZ, HIGH_HZ);
        const regionDefs = [
            ['sub', 20, 60], ['bass', 60, 180], ['mud', 180, 420], ['body', 420, 1200],
            ['vocal', 1200, 2800], ['presence', 2800, 5000], ['harsh', 4000, 7100],
            ['sibilance', 5600, 10000], ['air', 10000, 20001]
        ];
        const tonalRegions = {};
        for (const [key, fromHz, toHz] of regionDefs) {
            let sum = 0, total = 0;
            for (let i = 0; i < bands.length; i += 1) {
                const hz = finite(bands[i]?.centerHz);
                if (hz < fromHz || hz >= toHz) continue;
                sum += finite(targetProfile[i]) - finite(currentProfile[i]);
                total += 1;
            }
            tonalRegions[key] = round(clamp((sum / Math.max(1, total)) * 42, -0.6, 0.6), 4);
        }
        const tonalMismatch = clamp01(profile.distance * 2.15);
        const dynamics = Object.freeze({
            loudness: round(normalizedDelta(current.loudnessIntegrated ?? current.loudnessHint, target.loudnessIntegrated ?? target.loudnessHint, 8, -18)),
            crest: round(normalizedDelta(current.crest, target.crest, 7, 5)),
            transient: round(normalizedDelta(current.transientDensity, target.transientDensity, 0.5, 0.35))
        });
        const dynamicsMismatch = clamp01((Math.abs(dynamics.loudness) * 0.34) + (Math.abs(dynamics.crest) * 0.33) + (Math.abs(dynamics.transient) * 0.33));
        const stereo = Object.freeze({
            width: round(normalizedDelta(current.stereoWidth, target.stereoWidth, 0.5, 0.35)),
            lowMono: round(normalizedDelta(current.lowMonoScore, target.lowMonoScore, 45, 92)),
            spatialRisk: round(normalizedDelta(current.spatialExcessRisk, target.spatialExcessRisk, 0.6, 0))
        });
        const stereoMismatch = clamp01(Math.abs(stereo.width) * 0.52 + Math.abs(stereo.lowMono) * 0.30 + Math.abs(stereo.spatialRisk) * 0.18);
        const character = Object.freeze({
            brightness: round(normalizedDelta(current.brightness, target.brightness, 0.5, 0.5)),
            metallic: round(normalizedDelta(current.metallicHint, target.metallicHint, 0.5, 0.4)),
            flatness: round(normalizedDelta(current.spectralFlatness, target.spectralFlatness, 0.45, 0.2)),
            centroid: round(normalizedDelta(current.spectralCentroidHz, target.spectralCentroidHz, 6500, 3000))
        });
        const characterMismatch = clamp01(Math.abs(character.brightness) * 0.34 + Math.abs(character.metallic) * 0.30 + Math.abs(character.flatness) * 0.16 + Math.abs(character.centroid) * 0.20);
        const mismatch = clamp01(tonalMismatch * 0.46 + dynamicsMismatch * 0.22 + stereoMismatch * 0.17 + characterMismatch * 0.15);
        const score = Math.round(clamp((1 - mismatch) * 100, 0, 100));
        const confidence = Math.round(clamp(72 + (Array.isArray(current.spectrumProfile64) ? 10 : 0) + (Array.isArray(target.spectrumProfile64) ? 10 : 0) - Math.abs(profile.maxDelta) * 20, 58, 96));
        return Object.freeze({
            version: '2.0-reference-match',
            bandCount: count,
            score,
            mismatch: round(mismatch),
            confidence,
            tonal: Object.freeze({ score: Math.round((1 - tonalMismatch) * 100), mismatch: round(tonalMismatch), regions: Object.freeze(tonalRegions), profile }),
            dynamics: Object.freeze({ score: Math.round((1 - dynamicsMismatch) * 100), mismatch: round(dynamicsMismatch), delta: dynamics }),
            stereo: Object.freeze({ score: Math.round((1 - stereoMismatch) * 100), mismatch: round(stereoMismatch), delta: stereo }),
            character: Object.freeze({ score: Math.round((1 - characterMismatch) * 100), mismatch: round(characterMismatch), delta: character })
        });
    }

    global.FoxBearReferenceProfileService = Object.freeze({
        version: '2.0-reference-match-64-96',
        createLogBands,
        normalizeProfile,
        resampleProfile,
        makeProfileFromBands,
        compareProfiles,
        buildReferenceMatch2
    });
})(window);
