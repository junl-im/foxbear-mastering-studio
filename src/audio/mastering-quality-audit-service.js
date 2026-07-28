// FoxBear v1.6.20 bounded before/after mastering quality audit.
'use strict';

(function attachFoxBearMasteringQualityAudit(global) {
    const MAX_SAMPLES = 65536;

    function finite(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function ratioDb(after, before) {
        return 20 * Math.log10(Math.max(1e-9, after) / Math.max(1e-9, before));
    }

    function inspect(buffer) {
        if (!buffer || !buffer.length || !buffer.sampleRate || typeof buffer.getChannelData !== 'function') return null;
        const channels = Math.max(1, Math.min(2, Number(buffer.numberOfChannels || 1)));
        const step = Math.max(1, Math.ceil(buffer.length / MAX_SAMPLES));
        const effectiveRate = Math.max(1000, Number(buffer.sampleRate || 44100) / step);
        const lowCutoff = Math.min(180, effectiveRate * 0.18);
        const lowAlpha = clamp(1 - Math.exp(-2 * Math.PI * lowCutoff / effectiveRate), 0.001, 0.72);
        const left = buffer.getChannelData(0);
        const right = channels > 1 ? buffer.getChannelData(1) : left;
        let samples = 0;
        let sumSq = 0;
        let peak = 0;
        let diffSq = 0;
        let lowSq = 0;
        let envelopeMotion = 0;
        let previousL = finite(left[0]);
        let previousR = finite(right[0]);
        let previousEnvelope = (Math.abs(previousL) + Math.abs(previousR)) * 0.5;
        let lowL = previousL;
        let lowR = previousR;
        let sumLR = 0;
        let sumL2 = 0;
        let sumR2 = 0;
        let midSq = 0;
        let sideSq = 0;
        let invalid = 0;

        for (let i = 0; i < buffer.length; i += step) {
            let l = Number(left[i]);
            let r = Number(right[i]);
            if (!Number.isFinite(l) || !Number.isFinite(r)) {
                invalid += 1;
                l = finite(l);
                r = finite(r);
            }
            const mid = (l + r) * 0.5;
            const side = (l - r) * 0.5;
            lowL += lowAlpha * (l - lowL);
            lowR += lowAlpha * (r - lowR);
            const differenceL = l - previousL;
            const differenceR = r - previousR;
            previousL = l;
            previousR = r;
            const envelope = (Math.abs(l) + Math.abs(r)) * 0.5;
            envelopeMotion += Math.abs(envelope - previousEnvelope);
            previousEnvelope = envelope;
            sumSq += (l * l + r * r) * 0.5;
            diffSq += (differenceL * differenceL + differenceR * differenceR) * 0.5;
            lowSq += (lowL * lowL + lowR * lowR) * 0.5;
            peak = Math.max(peak, Math.abs(l), Math.abs(r));
            sumLR += l * r;
            sumL2 += l * l;
            sumR2 += r * r;
            midSq += mid * mid;
            sideSq += side * side;
            samples += 1;
        }

        const rms = Math.sqrt(sumSq / Math.max(1, samples));
        const correlationDenominator = Math.sqrt(Math.max(1e-12, sumL2 * sumR2));
        return Object.freeze({
            samples,
            step,
            invalid,
            peak,
            rms,
            crestDb: 20 * Math.log10(Math.max(1e-9, peak) / Math.max(1e-9, rms)),
            highProxy: Math.sqrt(diffSq / Math.max(1, samples)) / Math.max(1e-9, rms),
            lowProxy: Math.sqrt(lowSq / Math.max(1, samples)) / Math.max(1e-9, rms),
            envelopeMotion: envelopeMotion / Math.max(1, samples) / Math.max(1e-9, rms),
            stereoCorrelation: channels > 1 ? clamp(sumLR / correlationDenominator, -1, 1) : 1,
            sideToMidDb: channels > 1 ? 10 * Math.log10(Math.max(1e-12, sideSq) / Math.max(1e-12, midSq)) : -120
        });
    }

    function compare(beforeBuffer, afterBuffer) {
        const before = inspect(beforeBuffer);
        const after = inspect(afterBuffer);
        if (!before || !after) return null;
        const delta = Object.freeze({
            crestDb: after.crestDb - before.crestDb,
            highProxyDb: ratioDb(after.highProxy, before.highProxy),
            lowProxyDb: ratioDb(after.lowProxy, before.lowProxy),
            envelopeMotionDb: ratioDb(after.envelopeMotion, before.envelopeMotion),
            stereoCorrelation: after.stereoCorrelation - before.stereoCorrelation,
            sideToMidDb: after.sideToMidDb - before.sideToMidDb
        });
        const flags = [];
        if (delta.crestDb < -4.5 || after.rms < before.rms * 0.15) flags.push({ code: 'DYNAMIC_COLLAPSE', severity: (delta.crestDb < -7 || after.rms < before.rms * 0.08) ? 'fail' : 'warn', detail: `Crest ${delta.crestDb.toFixed(1)} dB` });
        if (delta.highProxyDb < -4) flags.push({ code: 'HIGH_LOSS', severity: delta.highProxyDb < -7 ? 'fail' : 'warn', detail: `High ${delta.highProxyDb.toFixed(1)} dB` });
        if (delta.lowProxyDb > 4.5 && delta.envelopeMotionDb > 3.5) {
            const severe = delta.lowProxyDb > 7 || delta.envelopeMotionDb > 6;
            flags.push({ code: 'LOW_PUMPING', severity: severe ? 'fail' : 'warn', detail: `Low ${delta.lowProxyDb.toFixed(1)} dB / motion ${delta.envelopeMotionDb.toFixed(1)} dB` });
        }
        if (after.stereoCorrelation < -0.15 || delta.stereoCorrelation < -0.45 || delta.sideToMidDb > 4) {
            const severe = after.stereoCorrelation < -0.35 || delta.sideToMidDb > 7;
            flags.push({ code: 'PHASE_RISK', severity: severe ? 'fail' : 'warn', detail: `Correlation ${after.stereoCorrelation.toFixed(2)} / Side ${delta.sideToMidDb >= 0 ? '+' : ''}${delta.sideToMidDb.toFixed(1)} dB` });
        }
        if (after.invalid > 0) flags.push({ code: 'INVALID_OUTPUT', severity: 'fail', detail: `${after.invalid} invalid samples` });
        return Object.freeze({ version: 'quality-audit-v1548', before, after, delta, flags: Object.freeze(flags), boundedSamples: MAX_SAMPLES });
    }

    global.FoxBearMasteringQualityAudit = Object.freeze({ MAX_SAMPLES, inspect, compare });
})(window);
