// FoxBear Reference Profile service v1.5.0 - 64/96-band log-spectrum profile helpers
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
        if (input.length === safeCount) return input.slice(0, safeCount).map(clamp01);
        for (let i = 0; i < safeCount; i += 1) {
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

    global.FoxBearReferenceProfileService = Object.freeze({
        version: '1.5.0-reference-profile-64-96',
        createLogBands,
        normalizeProfile,
        resampleProfile,
        makeProfileFromBands,
        compareProfiles
    });
})(window);
